import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function courtyard() {
  const s = initialState(); s.chapter = 10; s.completed = Array.from({ length: 9 }, (_, n) => n + 1)
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: 3, kills: 3, brews: n === 6 ? 1 : n === 9 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[10] = blankProgress(10); s.settings.difficulty = 'story'; s.armorUpgrade = 20
  return s
}
function setup(prepared = true) {
  let s = courtyard()
  if (prepared) {
    s = advanceEvent(s, { type: 'begin' }).state
    for (const index of [0, 1]) s = advanceEvent(s, { type: 'seal', index }).state
  }
  const cb = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false, notify: () => {},
    kill: (boss: boolean) => { if (boss && chapterReady(s)) s.progress[10].boss = true } }
  const w = new CombatWorld(chapterById(10), cb)
  Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
  return { s, w, reload: () => new CombatWorld(chapterById(10), { ...cb, state: () => validateState(s) }) }
}
function tick(w: CombatWorld, n: number) { for (let i = 0; i < n; i++) w.step({ x: 0, y: 0 }) }
function reachPhase(w: CombatWorld, phase: number) {
  const e = w.enemies[0]
  for (let n = 0; n < 1200 && e.hp > 0 && e.duel!.phase < phase; n++) {
    Object.assign(w.player, { x: e.x + 50, y: e.y })
    w.action('attack', { x: 0, y: 0, aim: e }); w.step({ x: 0, y: 0 })
  }
  expect(e.duel!.phase).toBe(phase); expect(e.hp).toBeGreaterThan(0)
}

describe('C4b 云岚决斗', () => {
  it('赴约路线必须按序完成才生成独立决斗AI，重复开启只有一位对手', () => {
    const early = setup(false)
    expect(early.w.enemies).toHaveLength(0); expect(chapterReady(early.s)).toBe(false)
    let s = advanceEvent(courtyard(), { type: 'begin' }).state
    expect(advanceEvent(s, { type: 'seal', index: 1 }).state).toBe(s)
    s = advanceEvent(s, { type: 'seal', index: 0 }).state
    expect(eventProgress(validateState(s)).stage).toBe(1)
    const { w } = setup()
    w.action('interact', { x: 0, y: 0 })
    expect(w.enemies).toHaveLength(1); expect(w.enemies[0].duel?.phase).toBe(1)
  })
  it('突进锁定三处线路预警，玩家移动不改变已锁定目标；实际突进受场地边界限制', () => {
    const { w } = setup(), e = w.enemies[0]
    tick(w, 120)
    expect(e.duel?.move).toBe('thrust'); expect(e.windup).toBeGreaterThan(0)
    expect(e.radius).toBe(54); expect(e.secondary).toHaveLength(2)
    const locked = structuredClone(e.target)
    for (let n = 0; n < 10; n++) w.step({ x: -1, y: 1 })
    expect(e.target).toEqual(locked)
    tick(w, 100)
    expect(e.x).toBeCloseTo(locked.x); expect(e.y).toBeCloseTo(locked.y)
    const a = w.map.duelArena!
    for (let n = 0; n < 120; n++) w.step({ x: -1, y: -1 })
    expect(w.player.x).toBeGreaterThanOrEqual(a.x + 22); expect(w.player.y).toBeGreaterThanOrEqual(a.y + 22)
    expect(mapCollides(w.map, e)).toBe(false)
  })
  it.each([2, 3])('通过真实攻击降到第%i阶段后，招式组出现不同预警', phase => {
    const { w } = setup(), e = w.enemies[0]
    reachPhase(w, phase)
    const moves = new Set<string>()
    for (let n = 0; n < 1600; n++) {
      w.step({ x: 0, y: 0 })
      if (e.windup > 0) {
        moves.add(e.duel!.move)
        if (e.duel!.move === 'fan') { expect(e.radius).toBe(68); expect(e.secondary).toHaveLength(2) }
        if (e.duel!.move === 'cyclone') { expect(e.radius).toBe(185); expect(e.secondary).toHaveLength(0) }
      }
    }
    expect(moves.has('fan')).toBe(true); expect(moves.has('thrust')).toBe(true)
    expect(moves.has('cyclone')).toBe(phase === 3)
  })
  it('收招时真实普攻伤害提高，决斗运行态刷新清空并保留赴约进度', () => {
    const t = setup(), e = t.w.enemies[0]
    Object.assign(t.w.player, { x: e.x + 50, y: e.y })
    let hp = e.hp; t.w.action('attack', { x: 0, y: 0, aim: e })
    const regular = hp - e.hp
    for (let n = 0; n < 300 && !(e.duel!.recovery > 0 && e.duel!.dashTime <= 0); n++) t.w.step({ x: 0, y: 0 })
    expect(t.w.runtime().duel?.recovery).toBe(true)
    Object.assign(t.w.player, { x: e.x + 50, y: e.y })
    hp = e.hp; t.w.action('attack', { x: 0, y: 0, aim: e })
    expect(hp - e.hp).toBeGreaterThan(regular)
    expect(t.reload().enemies).toHaveLength(0); expect(eventDone(t.s)).toBe(true)
    expect(t.s.progress[10].boss).toBe(false)
  })
  it('真实战斗获胜才允许首通，奖励一次且不生成新异火', () => {
    const { w, s } = setup(), e = w.enemies[0]
    expect(finishChapter(s)).toBe(s)
    for (let n = 0; n < 3000 && e.hp > 0 && w.player.hp > 0; n++) {
      Object.assign(w.player, { x: e.x + 50, y: e.y })
      w.action('attack', { x: 0, y: 0, aim: e }); w.action('strike', { x: 0, y: 0, aim: e })
      w.step({ x: 0, y: 0 })
    }
    expect(e.hp).toBe(0); expect(s.progress[10].boss).toBe(true); expect(w.runtime().duel).toBeUndefined()
    const next = finishChapter(s)
    expect(next.gold).toBe(s.gold + chapterById(10).reward); expect(next.flame).toBe(s.flame)
    expect(finishChapter(next)).toBe(next); expect(validateState(next)).toEqual(next)
  })
  it('旧已过关按旧目标迁移不补新奖，未过关保留计数，新版缺事件拒绝', () => {
    const old = JSON.parse(JSON.stringify(courtyard())); old.contentVersion = '0.6.0'; old.progress[10].events = {}
    old.progress[10].herbs = 2; old.progress[10].kills = 3
    const pending = validateState(old)
    expect(pending.progress[10].herbs).toBe(2); expect(eventProgress(pending).started).toBe(false)
    old.progress[10].boss = true; old.completed.push(10)
    expect(() => validateState(old)).toThrow('条件不完整')
    old.progress[10].herbs = 3
    const done = validateState(old)
    expect(eventDone(done)).toBe(true); expect(done.gold).toBe(old.gold); expect(done.inventory).toEqual(old.inventory)
    const bad = courtyard(); bad.progress[10].events = {}; expect(() => validateState(bad)).toThrow()
  })
  it('赴约节点和场地无障碍，所有交互点可达', () => {
    const map = mapForChapter(10), e = eventForChapter(10)!
    const points = [map.spawn, map.camp, map.gate, map.bossSpawn, ...map.herbs, e.npc, ...e.checkpoints!]
    const queue = [{ x: 210, y: 630 }], visited = new Set(['210,630'])
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const p = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${p.x},${p.y}`
      if (p.x < 40 || p.x > 1240 || p.y < 50 || p.y > 760 || visited.has(key) || mapCollides(map, p)) continue
      visited.add(key); queue.push(p)
    }
    for (const p of points) expect(queue.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 15)).toBe(true)
  })
})
