import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter, tournamentRounds } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

const id = 'capital-three-round-tournament'
function capital() {
  const s = initialState(); s.chapter = 9; s.completed = [1, 2, 3, 4, 5, 6, 7, 8]; s.flame = 'lotus'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: 3, kills: 3, brews: n === 6 ? 1 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[9] = blankProgress(9); s.inventory.herb = 0; s.inventory.crystal = 0; s.gold = 0
  return s
}
function act(s: ReturnType<typeof capital>, action: EventAction) { return advanceEvent(s, { ...action, eventId: id }) }
function register() { return act(act(capital(), { type: 'begin' }).state, { type: 'seal', index: 0 }).state }
function round(s: ReturnType<typeof capital>, n: number, good = true) {
  s = act(s, { type: 'test' }).state
  for (const [i, marker] of tournamentRounds[n].targets.entries()) s = act(s, { type: 'pulse', marker: good ? marker : marker > .5 ? 0 : 1, stage: n * 4 + 2 + i }).state
  return s
}
function pass() { let s = register(); for (let n = 0; n < 3; n++) s = round(s, n); return s }

describe('C4a 帝都三轮大会', () => {
  it('先报名和读赛程，零材料和金币可失败重试，之前通过的轮次保持', () => {
    let s = capital()
    expect(act(s, { type: 'test' }).state).toBe(s)
    s = act(s, { type: 'begin' }).state; expect(act(s, { type: 'test' }).state).toBe(s)
    s = register(); const inventory = structuredClone(s.inventory)
    s = round(s, 0); s = round(s, 1, false)
    expect(eventProgress(s)).toMatchObject({ stage: 5, score: 0, attempts: 2, roundScores: [300] })
    expect(s.inventory).toEqual(inventory); expect(s.gold).toBe(0)
    s = round(validateState(s), 1)
    expect(eventProgress(s)).toMatchObject({ stage: 9, roundScores: [300, 300] })
  })
  it('部分轮次和已锁定分数刷新保留，过期或非法指针不再计分', () => {
    let s = round(register(), 0)
    s = act(s, { type: 'test' }).state
    s = act(s, { type: 'pulse', marker: .65, stage: 6 }).state
    expect(act(s, { type: 'pulse', marker: .65, stage: 6 }).state).toBe(s)
    for (const marker of [NaN, Infinity, -.1, 1.1]) expect(act(s, { type: 'pulse', marker, stage: 7 }).state).toBe(s)
    s = validateState(s)
    expect(eventProgress(s)).toMatchObject({ stage: 7, score: 100, roundScores: [300] })
    s = act(s, { type: 'pulse', marker: .4, stage: 7 }).state
    s = act(s, { type: 'pulse', marker: .7, stage: 8 }).state
    expect(eventProgress(s)).toMatchObject({ stage: 9, score: 0, roundScores: [300, 300] })
  })
  it('三轮各独立计分，提前登记拒绝，登记和首通分别一次且不增发普通丹药', () => {
    let s = register(); expect(act(s, { type: 'deliver' }).state).toBe(s)
    s = pass(); const before = structuredClone(s)
    expect(eventDone(s)).toBe(false); expect(chapterReady(s)).toBe(false)
    s = act(s, { type: 'deliver' }).state
    expect(eventProgress(s)).toMatchObject({ stage: 14, roundScores: [300, 300, 300], attempts: 3 })
    expect(s.gold).toBe(60); expect(s.xp - before.xp).toBe(80)
    expect(s.inventory).toEqual(before.inventory); expect(s.totalBrews).toBe(before.totalBrews); expect(s.progress[9].brews).toBe(0)
    expect(act(s, { type: 'deliver' }).state).toBe(s)
    expect(finishChapter(s)).toBe(s)
    const world = new CombatWorld(chapterById(9), { state: () => s, collect: () => {}, camp: () => {}, heal: () => false, notify: () => {},
      kill: boss => { if (boss && chapterReady(s)) s.progress[9].boss = true } })
    expect(world.enemies).toHaveLength(0)
    Object.assign(world.player, world.map.gate); world.action('interact', { x: 0, y: 0 })
    const next = finishChapter(s)
    expect(next.gold).toBe(60 + chapterById(9).reward); expect(next.flame).toBe('lotus')
    expect(finishChapter(next)).toBe(next); expect(validateState(next)).toEqual(next)
  })
  it('不同赛炉传出不同上下文，未完成事件无法领奖', () => {
    const s = register(), contexts: number[] = []
    const w = new CombatWorld(chapterById(9), { state: () => s, collect: () => {}, camp: () => {}, kill: () => {}, heal: () => false, notify: () => {},
      storyEvent: (_, point) => { if (point !== undefined) contexts.push(point) } })
    for (const [n, point] of eventForChapter(9)!.checkpoints!.entries()) if (n > 0) { Object.assign(w.player, point); w.action('interact', { x: 0, y: 0 }) }
    expect(contexts).toEqual([1, 2, 3])
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
    expect(s.progress[9].boss).toBe(false)
  })
  it.each([1, 2, 3])('schema%i旧第九章按旧3草3战2炉校验且不补登记奖', schema => {
    const old = JSON.parse(JSON.stringify(capital())); old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.5.2'
    old.progress[9].events = {}; old.progress[9].herbs = 3; old.progress[9].kills = 3; old.progress[9].brews = 1
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    }
    expect(validateState(old).progress[9].brews).toBe(1)
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.completed.push(9); old.progress[9].boss = true
    expect(() => validateState(old)).toThrow('条件不完整')
    old.progress[9].brews = 2
    const done = validateState(old)
    expect(eventDone(done)).toBe(true); expect(eventProgress(done).roundScores).toEqual([300, 300, 300])
    expect(done.inventory).toEqual(old.inventory); expect(done.gold).toBe(old.gold); expect(validateState(done)).toEqual(done)
  })
  it('拒绝分轮数量、低分、尝试次数、当前分数伪造与当前版缺事件', () => {
    const s = pass()
    for (const change of [{ roundScores: [300] }, { roundScores: [300, 209, 300] }, { roundScores: [301, 300, 300] }, { attempts: 2 }, { score: 1 }]) {
      const bad = structuredClone(s); Object.assign(bad.progress[9].events[id], change)
      expect(() => validateState(bad)).toThrow()
    }
    const partial = act(register(), { type: 'test' }).state
    delete partial.progress[9].events[id].roundScores; expect(() => validateState(partial)).toThrow()
    delete s.progress[9].events[id]; expect(() => validateState(s)).toThrow()
    const other = capital(); other.progress[1].events['yao-training'].roundScores = []
    expect(() => validateState(other)).toThrow()
  })
  it('地图资源和各赛炉无碰撞且从出生可达', () => {
    const map = mapForChapter(9), e = eventForChapter(9)!
    const points = [map.spawn, map.camp, map.gate, ...map.herbs, e.npc, ...e.checkpoints!]
    const queue = [{ x: 210, y: 630 }], visited = new Set(['210,630'])
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const p = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${p.x},${p.y}`
      if (p.x < 40 || p.x > 1240 || p.y < 50 || p.y > 760 || visited.has(key) || mapCollides(map, p)) continue
      visited.add(key); queue.push(p)
    }
    for (const p of points) expect(queue.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 15)).toBe(true)
  })
})
