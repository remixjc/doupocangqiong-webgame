import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function mountain() {
  const s = initialState(); s.chapter = 11; s.completed = Array.from({ length: 10 }, (_, n) => n + 1); s.flame = 'lotus'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: 3, kills: 3, brews: n === 6 ? 1 : n === 9 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[11] = blankProgress(11); s.settings.difficulty = 'story'
  return s
}
function setup() {
  let s = advanceEvent(mountain(), { type: 'begin' }).state
  s = advanceEvent(s, { type: 'seal', index: 0 }).state
  let kills = 0
  const cb = { state: () => s, collect: () => {}, camp: () => {}, heal: () => false, notify: () => {},
    kill: (boss: boolean) => { if (boss && chapterReady(s)) { s.progress[11].boss = true; kills++ } },
    eventAction: (action: EventAction) => { s = advanceEvent(s, action).state } }
  return { world: new CombatWorld(chapterById(11), cb), state: () => s, kills: () => kills,
    reload: () => { s = validateState(s); return new CombatWorld(chapterById(11), cb) } }
}
function tick(w: CombatWorld, n: number) { for (let i = 0; i < n; i++) w.step({ x: 0, y: 0 }) }
function clearFirst(t: ReturnType<typeof setup>) {
  Object.assign(t.world.player, eventForChapter(11)!.checkpoints![1]); tick(t.world, 362)
  expect(eventProgress(t.state()).stage).toBe(2)
}

describe('C4c 云岚追击与安全退路', () => {
  it('未接前哨不能推进；乱序掩体和提前出口拒绝，无材料消耗', () => {
    const s = mountain(), inventory = structuredClone(s.inventory)
    expect(advanceEvent(s, { type: 'evade', stage: 1 }).state).toBe(s)
    const t = setup(), w = t.world
    Object.assign(w.player, eventForChapter(11)!.checkpoints![2]); tick(w, 400)
    expect(eventProgress(t.state()).stage).toBe(1); expect(w.escapeRun?.elapsed).toBe(0)
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
    expect(t.state().progress[11].boss).toBe(false); expect(t.kills()).toBe(0)
    expect(t.state().inventory).toEqual(inventory)
  })
  it('掩体范围内计时、区外暂停；E不能替代实际六秒历练', () => {
    const t = setup(), w = t.world
    Object.assign(w.player, eventForChapter(11)!.checkpoints![1])
    w.action('interact', { x: 0, y: 0 }); expect(eventProgress(t.state()).stage).toBe(1)
    tick(w, 180); expect(w.escapeRun?.elapsed).toBeCloseTo(3)
    Object.assign(w.player, eventForChapter(11)!.checkpoints![0]); tick(w, 60)
    expect(w.escapeRun?.elapsed).toBeCloseTo(3); expect(w.runtime().escape?.sheltered).toBe(false)
    Object.assign(w.player, eventForChapter(11)!.checkpoints![1]); tick(w, 182)
    expect(eventProgress(t.state()).stage).toBe(2)
    expect(advanceEvent(t.state(), { type: 'evade', stage: 1 }).state).toBe(t.state())
  })
  it('追击预警造成实际伤害，倒下不能推进，重建回最近安全点', () => {
    const t = setup(), w = t.world, inventory = structuredClone(t.state().inventory)
    tick(w, 1); expect(w.escapeRun?.warnings).toHaveLength(1)
    expect(w.escapeRun?.warnings[0]).toMatchObject({ radius: 80, time: 1 })
    tick(w, 2500)
    expect(w.player.hp).toBe(0); expect(eventProgress(t.state()).stage).toBe(1)
    const fresh = t.reload()
    expect(fresh.player).toMatchObject(eventForChapter(11)!.checkpoints![0])
    expect(fresh.escapeRun?.elapsed).toBe(0); expect(fresh.player.hp).toBe(fresh.runtime().maxHp)
    expect(t.state().inventory).toEqual(inventory)
  })
  it('通过第一点后刷新从第一掩体继续，第二段双预警，当前计时重新开始', () => {
    const t = setup(); clearFirst(t)
    let w = t.reload()
    expect(w.player).toMatchObject(eventForChapter(11)!.checkpoints![1])
    tick(w, 1); expect(w.escapeRun?.warnings).toHaveLength(2)
    expect(w.escapeRun?.warnings[0]).toMatchObject({ radius: 65, time: .9 })
    Object.assign(w.player, eventForChapter(11)!.checkpoints![2]); tick(w, 180)
    expect(w.escapeRun?.elapsed).toBeCloseTo(3)
    w = t.reload()
    expect(eventProgress(t.state()).stage).toBe(2); expect(w.escapeRun?.elapsed).toBe(0)
    expect(w.player).toMatchObject(eventForChapter(11)!.checkpoints![1])
  })
  it('两点实际历练和出口才完成，不击杀追兵且首通奖励只发一次', () => {
    const t = setup(); clearFirst(t)
    Object.assign(t.world.player, eventForChapter(11)!.checkpoints![2]); tick(t.world, 362)
    expect(eventProgress(t.state()).stage).toBe(3); expect(eventDone(t.state())).toBe(false)
    const w = t.reload()
    expect(w.player).toMatchObject(eventForChapter(11)!.checkpoints![2]); expect(w.escapeRun).toBeUndefined()
    expect(w.enemies).toHaveLength(0)
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
    expect(eventDone(t.state())).toBe(true); expect(t.kills()).toBe(1); expect(t.state().totalKills).toBe(0)
    const before = t.state(); w.action('interact', { x: 0, y: 0 }); expect(t.kills()).toBe(1)
    const next = finishChapter(before)
    expect(next.gold).toBe(before.gold + chapterById(11).reward); expect(next.flame).toBe('lotus')
    expect(finishChapter(next)).toBe(next); expect(validateState(next)).toEqual(next)
  })
  it.each([1, 2, 3])('schema%i旧第十一章校验旧目标，保留奖励，未过关补退路任务', schema => {
    const old = JSON.parse(JSON.stringify(mountain())); old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.6.1'
    old.progress[11].events = {}; old.progress[11].herbs = 3; old.progress[11].kills = 2
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    }
    const pending = validateState(old)
    expect(eventProgress(pending).started).toBe(false); expect(pending.progress[11].kills).toBe(2)
    old.completed.push(11); old.progress[11].boss = true
    expect(() => validateState(old)).toThrow('条件不完整')
    old.progress[11].kills = 3
    const done = validateState(old)
    expect(eventDone(done)).toBe(true); expect(done.inventory).toEqual(old.inventory); expect(done.gold).toBe(old.gold)
    const bad = mountain(); bad.progress[11].events = {}; expect(() => validateState(bad)).toThrow()
  })
  it('山口可通行，掩体和出口都可从出生抵达', () => {
    const map = mapForChapter(11), e = eventForChapter(11)!
    const points = [map.spawn, map.camp, map.gate, ...map.herbs, e.npc, ...e.checkpoints!]
    const queue = [{ x: 210, y: 630 }], visited = new Set(['210,630'])
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const p = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${p.x},${p.y}`
      if (p.x < 40 || p.x > 1240 || p.y < 50 || p.y > 760 || visited.has(key) || mapCollides(map, p)) continue
      visited.add(key); queue.push(p)
    }
    for (const p of points) expect(queue.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 15)).toBe(true)
    expect(mapCollides(map, { x: 750, y: 400 })).toBe(false)
    expect(mapCollides(map, { x: 750, y: 200 })).toBe(true)
  })
})
