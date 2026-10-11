import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { eventForChapter } from '../src/content/events'
import { mapForChapter } from '../src/content/maps'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter, registerBossVictory } from '../src/core/rules'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

function mirrorsState() {
  const s = initialState(); s.chapter = 25; s.completed = Array.from({ length: 24 }, (_, i) => i + 1); s.flame = 'star'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: n >= 18 ? 4 : 3, kills: n >= 23 ? 5 : n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 || n === 20 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[25] = blankProgress(25)
  return s
}
const act = (s: ReturnType<typeof mirrorsState>, a: EventAction) => advanceEvent(s, a)
function begin() { return act(act(mirrorsState(), { type: 'begin' }).state, { type: 'seal', index: 0 }).state }
describe('C8c-1 妖火三镜辨识', () => {
  it('引路牌前置、乱序和已完成选择不能推进，E不能代答', () => {
    let s = act(mirrorsState(), { type: 'begin' }).state
    expect(act(s, { type: 'reflect', choice: 'observe', stage: 1 }).state).toBe(s)
    s = act(s, { type: 'seal', index: 0 }).state
    expect(act(s, { type: 'seal', index: 1 }).state).toBe(s)
    expect(act(s, { type: 'reflect', choice: 'endure', stage: 3 }).state).toBe(s)
    let opened: number | undefined
    const e = eventForChapter(25)!, w = new CombatWorld(chapterById(25), { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
      notify: () => {}, kill: () => {}, storyEvent: (_id, index) => { opened = index }, eventAction: a => { s = act(s, a).state } })
    Object.assign(w.player, e.checkpoints![2]); w.action('interact', { x: 0, y: 0 }); expect(opened).toBeUndefined()
    Object.assign(w.player, e.checkpoints![1]); w.action('interact', { x: 0, y: 0 }); expect(opened).toBe(1)
    expect(eventProgress(s).score).toBe(0)
    s = act(s, { type: 'reflect', choice: 'observe', stage: 1 }).state
    expect(act(s, { type: 'reflect', choice: 'observe', stage: 1 }).state).toBe(s)
  })
  it('每镜错误给出具体原因并免费重选，部分成绩和行囊隔离保存', () => {
    let s = begin(), attempts = 0
    const before = structuredClone(s), e = eventForChapter(25)!
    for (let stage = 1; stage <= 3; stage++) {
      const reflection = e.reflections![stage - 1]
      for (const option of reflection.options.filter(o => o.choice !== reflection.answer)) {
        const result = act(s, { type: 'reflect', choice: option.choice, stage }); s = result.state; attempts++
        expect(result.message).toBe(option.response); expect(result.message).toContain('免费重选')
        expect(eventProgress(s)).toMatchObject({ stage, score: stage - 1, attempts }); expect(validateState(s)).toEqual(s)
      }
      s = act(s, { type: 'reflect', choice: reflection.answer, stage }).state; attempts++
      s = validateState(s); expect(eventProgress(s)).toMatchObject({ stage: stage + 1, score: stage, attempts })
    }
    expect(act(s, { type: 'deliver' }).state.inventory).toEqual(before.inventory)
    s = act(s, { type: 'deliver' }).state
    expect(eventDone(s)).toBe(true); expect(s.gold).toBe(before.gold); expect(s.xp).toBe(before.xp)
    expect(s.flame).toBe('star'); expect(chapterReady(s)).toBe(true); expect(finishChapter(s)).toBe(s)
    expect(act(s, { type: 'deliver' }).state).toBe(s)
    const bossPassed = registerBossVictory(s), done = finishChapter(bossPassed)
    expect(done.flame).toBe('pure'); expect(done.gold).toBe(before.gold + chapterById(25).reward)
    expect(finishChapter(done)).toBe(done); expect(validateState(done)).toEqual(done)
  })
  it('伪造辨识数和选择次数拒绝导入，交互点不会挡住草药', () => {
    for (const [stage, score, attempts] of [[0, 0, 1], [1, 1, 1], [2, 0, 1], [3, 2, 1], [4, 2, 3], [5, 3, 2]]) {
      const s = begin(); Object.assign(eventProgress(s), { stage, score, attempts })
      expect(() => validateState(s)).toThrow('妖火')
    }
    const e = eventForChapter(25)!
    for (const herb of mapForChapter(25).herbs)
      expect([e.npc, ...e.checkpoints!].every(p => Math.hypot(p.x - herb.x, p.y - herb.y) >= 100)).toBe(true)
  })
  it.each([1, 2, 3])('schema%i旧完成档按4草5战检查，补事件无奖励', schema => {
    const old = JSON.parse(JSON.stringify(mirrorsState()))
    old.schemaVersion = schema; old.contentVersion = schema === 1 ? '0.1.0' : schema === 2 ? '0.2.0' : '0.10.3'
    if (schema < 3) for (const [key, p] of Object.entries(old.progress) as [string, Record<string, unknown>][]) {
      if (schema === 2) p.event = Number(key) <= 3 ? (p.events as Record<string, unknown>)[eventForChapter(Number(key))!.id] : { started: false, stage: 0, quote: 0 }
      delete p.events
    } else old.progress[25].events = {}
    expect(eventProgress(validateState(old)).started).toBe(false)
    old.progress[25].boss = true; old.completed.push(25); old.flame = 'pure'; old.progress[25].herbs = 4; old.progress[25].kills = 4
    expect(() => validateState(old)).toThrow('条件不完整'); old.progress[25].kills = 5
    const done = validateState(old); expect(eventDone(done)).toBe(true)
    expect(done.gold).toBe(old.gold); expect(done.xp).toBe(old.xp); expect(done.inventory).toEqual(old.inventory)
  })
})
