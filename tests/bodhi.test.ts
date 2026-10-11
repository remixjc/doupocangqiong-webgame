import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { mapForChapter } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter, registerBossVictory } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function bodhiState() {
  const s = initialState(); s.chapter = 24; s.completed = Array.from({ length: 23 }, (_, i) => i + 1); s.flame = 'star'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: n >= 18 ? 4 : 3, kills: n >= 23 ? 5 : n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 || n === 20 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[24] = blankProgress(24)
  return s
}
const act = (s: ReturnType<typeof bodhiState>, a: EventAction) => advanceEvent(s, a)
function begin() { return act(act(bodhiState(), { type: 'begin' }).state, { type: 'seal', index: 0 }).state }
describe('C8b 菩提三境观心', () => {
  it('先读碑記才能观心，普通E/乱序/旧步骤不能替代选择', () => {
    let s = act(bodhiState(), { type: 'begin' }).state
    expect(act(s, { type: 'reflect', choice: 'observe', stage: 1 }).state).toBe(s)
    s = act(s, { type: 'seal', index: 0 }).state
    expect(act(s, { type: 'seal', index: 1 }).state).toBe(s)
    expect(act(s, { type: 'reflect', choice: 'endure', stage: 3 }).state).toBe(s)
    s = act(s, { type: 'reflect', choice: 'observe', stage: 1 }).state
    expect(act(s, { type: 'reflect', choice: 'observe', stage: 1 }).state).toBe(s)
    expect(eventProgress(s)).toMatchObject({ stage: 2, score: 1, attempts: 1 })
  })
  it('三境每个错误都有原因，免费重选当前境且已识破记录保留', () => {
    let s = begin(), before = structuredClone(s), attempts = 0
    const e = eventForChapter(24)!
    for (let stage = 1; stage <= 3; stage++) {
      for (const option of e.reflections![stage - 1].options.filter(o => o.choice !== e.reflections![stage - 1].answer)) {
        const result = act(s, { type: 'reflect', choice: option.choice, stage }); s = result.state; attempts++
        expect(result.ok).toBe(true); expect(result.message).toContain('免费重选')
        expect(eventProgress(s)).toMatchObject({ stage, score: stage - 1, attempts }); expect(validateState(s)).toEqual(s)
      }
      s = act(s, { type: 'reflect', choice: e.reflections![stage - 1].answer, stage }).state; attempts++
      expect(eventProgress(s)).toMatchObject({ stage: stage + 1, score: stage, attempts })
      s = validateState(s)
    }
    expect(s.inventory).toEqual(before.inventory); expect(s.gold).toBe(before.gold); expect(s.xp).toBe(before.xp)
  })
  it('不在本境不能通过E打开选择，当前境仅打开面板不自动答题', () => {
    let s = begin(), opened: number | undefined
    const e = eventForChapter(24)!, w = new CombatWorld(chapterById(24), { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
      notify: () => {}, kill: () => {}, storyEvent: (_id, index) => { opened = index }, eventAction: a => { s = act(s, a).state } })
    Object.assign(w.player, e.checkpoints![2]); w.action('interact', { x: 0, y: 0 }); expect(opened).toBeUndefined()
    Object.assign(w.player, e.checkpoints![1]); w.action('interact', { x: 0, y: 0 }); expect(opened).toBe(1)
    expect(eventProgress(s)).toMatchObject({ stage: 1, score: 0, attempts: 0 }); expect(w.enemies).toHaveLength(0)
  })
  it('提前报告无效，完成报告100积累一次，审核无首领与首通不重复', () => {
    let s = begin(), before = structuredClone(s)
    expect(act(s, { type: 'deliver' }).state).toBe(s)
    for (const [i, reflection] of eventForChapter(24)!.reflections!.entries())
      s = act(s, { type: 'reflect', choice: reflection.answer, stage: i + 1 }).state
    expect(chapterReady(s)).toBe(false)
    s = act(s, { type: 'deliver' }).state; expect(eventDone(s)).toBe(true)
    expect(act(s, { type: 'deliver' }).state).toBe(s); expect(s.xp).toBe(before.xp + 100)
    expect(s.gold).toBe(before.gold); expect(s.inventory).toEqual(before.inventory); expect(s.flame).toBe('star')
    const w = new CombatWorld(chapterById(24), { state: () => s, collect: () => {}, camp: () => {}, heal: () => false, notify: () => {},
      kill: boss => { if (boss) s = registerBossVictory(s) } })
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 }); expect(w.enemies).toHaveLength(0)
    const done = finishChapter(s); expect(done.gold).toBe(before.gold + chapterById(24).reward)
    expect(done.flame).toBe('star'); expect(finishChapter(done)).toBe(done); expect(validateState(done)).toEqual(done)
  })
  it('伪造片段数或少记选择次数拒绝导入，普通药草不被交互点挡住', () => {
    for (const [stage, score, attempts] of [[0, 0, 1], [1, 1, 1], [2, 0, 1], [3, 2, 1], [4, 2, 3], [5, 3, 2]]) {
      const s = begin(); Object.assign(eventProgress(s), { stage, score, attempts })
      expect(() => validateState(s)).toThrow('菩提观心')
    }
    const e = eventForChapter(24)!, map = mapForChapter(24)
    for (const herb of map.herbs) expect([e.npc, ...e.checkpoints!].every(p => Math.hypot(p.x - herb.x, p.y - herb.y) >= 100)).toBe(true)
  })
  it.each([1, 2, 3])('schema%i旧4草5战完成档补观心不补奖励，未完成保留待接', schema => {
    const old = JSON.parse(JSON.stringify(bodhiState()))
    old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.10.2'
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    } else old.progress[24].events = {}
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.progress[24].boss = true; old.completed.push(24); old.progress[24].herbs = 4; old.progress[24].kills = 4
    expect(() => validateState(old)).toThrow('条件不完整'); old.progress[24].kills = 5
    const done = validateState(old); expect(eventDone(done)).toBe(true); expect(eventProgress(done)).toMatchObject({ stage: 5, score: 3, attempts: 3 })
    expect(done.gold).toBe(old.gold); expect(done.xp).toBe(old.xp); expect(done.inventory).toEqual(old.inventory)
  })
})
