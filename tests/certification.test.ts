import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { certificationTargets, eventForChapter } from '../src/content/events'
import { mapCollides, mapForChapter } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

const id = 'black-rock-certification'
function guild() {
  const s = initialState(); s.chapter = 6; s.completed = [1, 2, 3, 4, 5]
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: 3, kills: 3, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[6] = blankProgress(6); s.inventory.herb = 0; s.inventory.crystal = 0; s.gold = 0
  return s
}
function act(s: ReturnType<typeof guild>, action: EventAction) { return advanceEvent(s, { ...action, eventId: id }) }
function start() {
  let s = act(guild(), { type: 'begin' }).state
  s = act(s, { type: 'seal', index: 0 }).state
  return act(s, { type: 'test' }).state
}
function pass() {
  let s = start()
  for (const [step, marker] of certificationTargets.entries()) s = act(s, { type: 'pulse', marker, stage: step + 2 }).state
  return s
}

describe('C2c 公会控火认证', () => {
  it('必须先接取和读丹方，零材料零金币仍能免费考核和失败重试', () => {
    let s = guild(), before = structuredClone(s)
    expect(act(s, { type: 'test' }).ok).toBe(false)
    s = act(s, { type: 'begin' }).state
    expect(act(s, { type: 'test' }).ok).toBe(false)
    s = act(s, { type: 'seal', index: 0 }).state
    s = act(s, { type: 'test' }).state
    for (const stage of [2, 3, 4]) s = act(s, { type: 'pulse', marker: 0, stage }).state
    expect(eventProgress(s)).toMatchObject({ stage: 1, score: 0, attempts: 1 })
    expect(s.inventory).toEqual(before.inventory); expect(s.gold).toBe(0); expect(s.xp).toBe(before.xp)
    expect(act(validateState(s), { type: 'test' }).ok).toBe(true)
  })
  it('三段目标不同，过期输入拒绝，已锁定分数刷新保留', () => {
    let s = start()
    s = act(s, { type: 'pulse', marker: .35, stage: 2 }).state
    expect(eventProgress(s)).toMatchObject({ score: 100, stage: 3 })
    expect(act(s, { type: 'pulse', marker: .35, stage: 2 }).state).toBe(s)
    s = validateState(s)
    s = act(s, { type: 'pulse', marker: .6, stage: 3 }).state
    s = act(s, { type: 'pulse', marker: .5, stage: 4 }).state
    expect(eventProgress(s)).toMatchObject({ score: 300, stage: 5, attempts: 1 })
    expect(eventDone(s)).toBe(false)
  })
  it('登记一次奖励40金币与50积累，不生产丹药或增加普通炼药次数；审核不生成首领', () => {
    let s = pass(), before = structuredClone(s)
    s = act(s, { type: 'deliver' }).state
    expect(s.gold - before.gold).toBe(40); expect(s.xp - before.xp).toBe(50)
    expect(s.inventory).toEqual(before.inventory); expect(s.totalBrews).toBe(before.totalBrews); expect(s.progress[6].brews).toBe(0)
    expect(act(s, { type: 'deliver' }).state).toBe(s)
    s = validateState(s)
    const world = new CombatWorld(chapterById(6), { state: () => s, collect: () => {}, camp: () => {}, heal: () => false, notify: () => {},
      kill: boss => { if (boss && chapterReady(s)) s.progress[6].boss = true } })
    expect(world.enemies).toHaveLength(0)
    Object.assign(world.player, world.map.gate); world.action('interact', { x: 0, y: 0 })
    expect(s.progress[6].boss).toBe(true); expect(world.enemies).toHaveLength(0)
    expect(validateState(s)).toEqual(s)
  })
  it('未登记不能通过审核，药炉须先接取且传出药炉上下文', () => {
    let s = guild(), target: number | undefined = -1
    const world = new CombatWorld(chapterById(6), { state: () => s, collect: () => {}, camp: () => {}, kill: () => {}, heal: () => false, notify: () => {},
      storyEvent: (_, checkpoint) => { target = checkpoint } })
    Object.assign(world.player, eventForChapter(6)!.checkpoints![1]); world.action('interact', { x: 0, y: 0 })
    expect(target).toBe(-1)
    s = start(); world.action('interact', { x: 0, y: 0 }); expect(target).toBe(1)
    Object.assign(world.player, world.map.gate); world.action('interact', { x: 0, y: 0 })
    expect(s.progress[6].boss).toBe(false)
    Object.assign(world.player, eventForChapter(6)!.npc); world.action('interact', { x: 0, y: 0 })
    expect(target).toBeUndefined()
  })
  it.each([1, 2, 3])('schema %i旧第六章迁移保留已炼丹药及首通，旧目标缺失拒绝', schema => {
    const old = JSON.parse(JSON.stringify(guild())); old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.4.0'
    old.inventory.heal = 11; old.totalBrews = 4
    for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (Number(key) === 6) p.events = {}
      if (schema <= 2) { p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }; delete p.events }
    }
    const pending = validateState(old)
    expect(eventProgress(pending).started).toBe(false); expect(pending.inventory.heal).toBe(11)
    old.progress[6].boss = true; old.progress[6].herbs = 3; old.progress[6].kills = 3
    expect(() => validateState(old)).toThrow('条件不完整')
    old.progress[6].brews = 1; old.completed.push(6)
    const done = validateState(old)
    expect(eventDone(done)).toBe(true); expect(done.gold).toBe(old.gold); expect(done.inventory).toEqual(old.inventory)
  })
  it('拒绝非法认证记录和当前版本缺失事件，公会所有节点无碰撞且可达', () => {
    const s = pass()
    for (const score of [209, 301]) { const bad = structuredClone(s); bad.progress[6].events[id].score = score; expect(() => validateState(bad)).toThrow() }
    delete s.progress[6].events[id]; expect(() => validateState(s)).toThrow()
    const map = mapForChapter(6), e = eventForChapter(6)!
    const points = [map.spawn, map.camp, map.gate, e.npc, ...e.checkpoints!]
    for (const point of points) expect(mapCollides(map, point)).toBe(false)
    const queue = [{ x: 210, y: 630 }], visited = new Set(['210,630'])
    for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const p = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${p.x},${p.y}`
      if (p.x < 40 || p.x > 1240 || p.y < 50 || p.y > 760 || visited.has(key) || mapCollides(map, p)) continue
      visited.add(key); queue.push(p)
    }
    for (const p of points) expect(queue.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 15)).toBe(true)
  })
})
