import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventsForChapter, mindTargets } from '../src/content/events'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter, registerBossVictory } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

const [vault, origin] = eventsForChapter(27)
function state() {
  const s = initialState(); s.chapter = 27; s.completed = Array.from({ length: 26 }, (_, i) => i + 1); s.flame = 'pure'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: n >= 18 ? 4 : 3, kills: n >= 23 ? 5 : n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 || n === 20 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[27] = blankProgress(27); s.progress[27].events[vault.id] = migrateLegacyEvents(27, true)[vault.id]
  return s
}
const act = (s: ReturnType<typeof state>, action: EventAction) => advanceEvent(s, { ...action, eventId: origin.id }).state
const progress = (s: ReturnType<typeof state>) => eventProgress(s, 27, origin.id)
function ready() {
  let s = act(act(state(), { type: 'begin' }), { type: 'test' })
  for (const [index, marker] of mindTargets(origin).entries()) s = act(s, { type: 'pulse', stage: index + 1, marker })
  return s
}
describe('C9b-2 本源传承凝定', () => {
  it('洞府路线报告前置，E只开本源心念台，不自动推进或代替评分', () => {
    const s = state(); s.progress[27] = blankProgress(27); expect(act(s, { type: 'begin' })).toBe(s)
    let begun = act(state(), { type: 'begin' }), opened: number | undefined
    expect(act(begun, { type: 'deliver' })).toBe(begun)
    const w = new CombatWorld(chapterById(27), { state: () => begun, collect: () => {}, kill: () => {}, camp: () => {}, heal: () => false,
      notify: () => {}, storyEvent: (_id, checkpoint) => { opened = checkpoint }, eventAction: action => { begun = act(begun, action) } })
    Object.assign(w.player, origin.checkpoints![0]); w.action('interact', { x: 0, y: 0 })
    expect(opened).toBe(0); expect(progress(begun)).toMatchObject({ stage: 0, score: 0 }); expect(w.enemies).toHaveLength(0)
  })
  it('本源用35/65/85%目标，部分成绩保存，过期/非法输入拒绝，失败免费重试', () => {
    let s = act(act(state(), { type: 'begin' }), { type: 'test' })
    const before = structuredClone(s); expect(mindTargets(origin)).toEqual([.35, .65, .85])
    s = act(s, { type: 'pulse', marker: .35, stage: 1 }); expect(progress(s).score).toBe(100); s = validateState(s)
    expect(act(s, { type: 'pulse', marker: .35, stage: 1 })).toBe(s)
    for (const marker of [NaN, Infinity, -.1, 1.1]) expect(act(s, { type: 'pulse', marker, stage: 2 })).toBe(s)
    s = act(act(s, { type: 'pulse', marker: 0, stage: 2 }), { type: 'pulse', marker: 0, stage: 3 })
    expect(progress(s)).toMatchObject({ stage: 0, score: 0, attempts: 1 })
    s = act(s, { type: 'test' })
    for (const [index, marker] of mindTargets(origin).entries()) s = act(s, { type: 'pulse', marker, stage: index + 1 })
    expect(progress(s)).toMatchObject({ stage: 4, score: 300, attempts: 2 })
    expect(s.inventory).toEqual(before.inventory); expect(s.gold).toBe(before.gold); expect(s.xp).toBe(before.xp)
  })
  it('报告一次150积累，审核无传承投影，正式首通一次且异火保持', () => {
    let s = ready(), before = structuredClone(s); expect(chapterReady(s)).toBe(false)
    s = act(s, { type: 'deliver' }); expect(act(s, { type: 'deliver' })).toBe(s); expect(eventDone(s)).toBe(true)
    expect(s.xp).toBe(before.xp + 150); expect(s.flame).toBe('pure'); expect(s.gold).toBe(before.gold); expect(s.inventory).toEqual(before.inventory)
    const w = new CombatWorld(chapterById(27), { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
      notify: () => {}, kill: boss => { if (boss) s = registerBossVictory(s) } })
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 }); expect(w.enemies).toHaveLength(0)
    const done = finishChapter(s); expect(done.gold).toBe(before.gold + chapterById(27).reward); expect(done.flame).toBe('pure')
    expect(finishChapter(done)).toBe(done); expect(validateState(done)).toEqual(done)
  })
  it('当前成绩和前置造假拒绝，所有药草与两事件点至少相距100', () => {
    for (const [stage, score, attempts] of [[1, 1, 0], [2, 101, 0], [3, 201, 0], [4, 209, 1], [5, 300, 0]]) {
      const s = ready(); Object.assign(progress(s), { stage, score, attempts }); expect(() => validateState(s)).toThrow('传承心念')
    }
    const s = ready(); s.progress[27].events[vault.id] = blankProgress(27).events[vault.id]
    expect(() => validateState(s)).toThrow('前置')
    const map = new CombatWorld(chapterById(27), { state: () => state(), collect: () => {}, kill: () => {}, camp: () => {}, heal: () => false, notify: () => {} }).map
    for (const herb of map.herbs) expect(eventsForChapter(27).flatMap(e => [e.npc, ...e.checkpoints!])
      .every(p => Math.hypot(p.x - herb.x, p.y - herb.y) >= 100)).toBe(true)
  })
  it('0.11.2旧零目标完成档补本源不补奖励，未通关保留路线报告而本源待接', () => {
    const old = state(); old.contentVersion = '0.11.2'; delete old.progress[27].events[origin.id]
    const pending = validateState(old); expect(eventDone(pending, 27, vault.id)).toBe(true); expect(progress(pending).started).toBe(false)
    old.progress[27].boss = true; old.completed.push(27)
    const migrated = validateState(old); expect(eventDone(migrated)).toBe(true)
    expect(migrated.gold).toBe(old.gold); expect(migrated.xp).toBe(old.xp); expect(migrated.inventory).toEqual(old.inventory)
  })
})
