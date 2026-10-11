import { describe, expect, it } from 'vitest'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'
import { chapterById } from '../src/content/chapters'
import { eventsForChapter } from '../src/content/events'
import { chapterReady } from '../src/core/rules'

const caveId = 'hidden-cave-treasure'
function caveState() {
  const s = initialState(); s.chapter = 4; s.completed = [1, 2, 3]
  for (const id of s.completed) s.progress[id] = { ...blankProgress(id), herbs: 3, kills: 3, boss: true, events: migrateLegacyEvents(id, true) }
  s.progress[4] = blankProgress(4)
  return s
}
function act(s: ReturnType<typeof caveState>, action: EventAction) { return advanceEvent(s, { ...action, eventId: caveId }) }
function solve(s = caveState()) {
  s = act(s, { type: 'begin' }).state; s = act(s, { type: 'seal', index: 0 }).state
  for (const [step, symbol] of (['leaf', 'moon', 'fire'] as const).entries()) s = act(s, { type: 'rune', symbol, step }).state
  return s
}

describe('C2a 洞穴地图基础', () => {
  it('出生与资源没有碰撞，山径经石室缺口可达洞穴深处', () => {
    const map = mapForChapter(4)
    expect(map.id).toBe('qingshan-hidden-cave')
    const points = [map.spawn, map.camp, map.gate, map.bossSpawn, ...map.herbs, ...map.enemies]
    for (const p of points) expect(mapCollides(map, p)).toBe(false)
    const visited = new Set<string>(), queue = [{ x: 210, y: 630 }]
    visited.add('210,630')
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const next = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${next.x},${next.y}`
      if (next.x < 40 || next.x > 1240 || next.y < 50 || next.y > 760 || visited.has(key) || mapCollides(map, next)) continue
      visited.add(key); queue.push(next)
    }
    for (const p of points) expect(queue.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 15)).toBe(true)
    expect(mapCollides(map, { x: 830, y: 400 })).toBe(false)
    expect(mapCollides(map, { x: 830, y: 300 })).toBe(true)
    expect(mapCollides(map, { x: 830, y: 500 })).toBe(true)
  })
})

describe('C2a 三符机关、宝匣与返程', () => {
  it('乱序免费复位，步数存档保留，过期输入拒绝，宝匣和返程只结算一次', () => {
    let s = caveState(), before = structuredClone(s.inventory)
    expect(act(s, { type: 'rune', symbol: 'leaf', step: 0 }).ok).toBe(false)
    s = act(s, { type: 'begin' }).state
    expect(act(s, { type: 'seal', index: 2 }).ok).toBe(false)
    s = act(s, { type: 'seal', index: 0 }).state
    s = act(s, { type: 'rune', symbol: 'fire', step: 0 }).state
    expect(eventProgress(s)).toMatchObject({ stage: 1, score: 0, attempts: 1 })
    expect(s.inventory).toEqual(before)
    s = act(s, { type: 'rune', symbol: 'leaf', step: 0 }).state
    expect(act(s, { type: 'rune', symbol: 'leaf', step: 0 }).state).toBe(s)
    s = validateState(s)
    expect(eventProgress(s).score).toBe(1)
    for (const [symbol, step] of [['moon', 1], ['fire', 2]] as const) s = act(s, { type: 'rune', symbol, step }).state
    expect(chapterReady(s)).toBe(false)
    s = act(s, { type: 'seal', index: 2 }).state
    expect(s.inventory).toEqual({ ...before, herb: before.herb + 3, crystal: before.crystal + 2, heal: before.heal + 1 })
    s = validateState(s)
    expect(act(s, { type: 'seal', index: 2 }).state).toBe(s)
    s = act(s, { type: 'deliver' }).state
    expect(eventDone(s)).toBe(true); expect(chapterReady(s)).toBe(true)
    expect(act(s, { type: 'deliver' }).state).toBe(s)
    expect(validateState(s)).toEqual(s)
  })
  it('封门真正阻挡走位和闪避；解开后重建场景仍可通行，交互上下文只在机关盘传出', () => {
    let s = caveState(), context: number | undefined
    const world = new CombatWorld(chapterById(4), { state: () => s, camp: () => {}, collect: () => {}, kill: () => {}, heal: () => false, notify: () => {}, storyEvent: (_, index) => { context = index } })
    expect(world.barrierClosed()).toBe(true)
    Object.assign(world.player, { x: 775, y: 400 })
    world.action('dodge', { x: 1, y: 0 })
    for (let i = 0; i < 30; i++) world.step({ x: 1, y: 0 })
    expect(world.player.x).toBeLessThan(794)
    Object.assign(world.player, { x: 730, y: 400 })
    world.action('interact', { x: 0, y: 0 })
    expect(context).toBeUndefined()
    s = act(s, { type: 'begin' }).state
    world.action('interact', { x: 0, y: 0 })
    expect(context).toBe(1)
    Object.assign(world.player, { x: 280, y: 625 })
    world.action('interact', { x: 0, y: 0 })
    expect(context).toBeUndefined()
    s = solve()
    expect(world.barrierClosed()).toBe(false)
    Object.assign(world.player, { x: 775, y: 400 })
    for (let i = 0; i < 60; i++) world.step({ x: 1, y: 0 })
    expect(world.player.x).toBeGreaterThan(900)
    expect(mapCollides(world.collisionMap(), { x: 830, y: 400 })).toBe(false)
    for (const e of eventsForChapter(4)) for (const p of [e.npc, ...e.checkpoints!]) expect(mapCollides(world.map, p)).toBe(false)
  })
  it.each(['0.3.0', '0.3.1'])('旧 %s 未过关补空事件，已过关补完成且不增发宝匣', version => {
    const old = JSON.parse(JSON.stringify(caveState()))
    old.contentVersion = version; old.progress[4].events = {}; old.progress[4].kills = 3
    const loaded = validateState(old)
    expect(eventProgress(loaded).started).toBe(false); expect(loaded.progress[4].kills).toBe(3)
    expect(loaded.inventory).toEqual(old.inventory)
    old.progress[4].boss = true; old.completed.push(4)
    expect(() => validateState(old)).toThrow('条件不完整')
    old.progress[4].herbs = 3
    const passed = validateState(old)
    expect(eventDone(passed)).toBe(true)
    expect(passed.gold).toBe(old.gold); expect(passed.inventory).toEqual(old.inventory)
    expect(act(passed, { type: 'seal', index: 2 }).state).toBe(passed)
  })
  it('当前版本拒绝缺失事件、无效符文计数与未做完寻宝的过关记录', () => {
    const s = caveState(); delete s.progress[4].events[caveId]
    expect(() => validateState(s)).toThrow()
    for (const score of [1, 3]) {
      const bad = solve(); bad.progress[4].events[caveId].score = score
      expect(() => validateState(bad)).toThrow('机关记录')
    }
    const bad = solve(); bad.progress[4].boss = true
    expect(() => validateState(bad)).toThrow('剧情事件不完整')
  })
})
