import { describe, expect, it } from 'vitest'
import { chapterById } from '../src/content/chapters'
import { heritageTargets, findEvent } from '../src/content/events'
import { advanceEvent, eventDone, eventProgress, migrateLegacyEvents, type EventAction } from '../src/core/events'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, finishChapter, registerBossVictory } from '../src/core/rules'
import { teacherSupport } from '../src/core/companions'
import { validateState } from '../src/core/save'
import { CombatWorld } from '../src/game/combat'

const id = 'heaven-tomb-clan-inheritance'
function state() {
  const s = initialState(); s.chapter = 23; s.completed = Array.from({ length: 22 }, (_, i) => i + 1); s.flame = 'star'
  for (const n of s.completed) s.progress[n] = { ...blankProgress(n), herbs: n >= 18 ? 4 : 3, kills: n >= 12 ? 4 : 3,
    brews: n === 6 ? 1 : n === 9 || n === 20 ? 2 : 0, boss: true, events: migrateLegacyEvents(n, true) }
  s.progress[23] = blankProgress(23)
  s.progress[23].events['heaven-tomb-timed-layers'] = migrateLegacyEvents(23, true)['heaven-tomb-timed-layers']
  return s
}
const act = (s: ReturnType<typeof state>, a: EventAction) => advanceEvent(s, { ...a, eventId: id }).state
const progress = (s: ReturnType<typeof state>) => eventProgress(s, 23, id)
function ready() {
  let s = act(act(state(), { type: 'begin' }), { type: 'test' })
  for (let i = 0; i < 3; i++) s = act(s, { type: 'pulse', marker: heritageTargets[i], stage: i + 1 })
  return s
}
describe('C8a-3 族史传承心念与离墓', () => {
  it('探索报告之前不能接取，普通机关E不能替代心念测试', () => {
    const s = state(); s.progress[23] = blankProgress(23)
    expect(act(s, { type: 'begin' })).toBe(s)
    const begun = act(state(), { type: 'begin' })
    expect(act(begun, { type: 'seal', index: 0 })).toBe(begun)
    expect(act(begun, { type: 'deliver' })).toBe(begun)
    expect(chapterReady(begun)).toBe(false)
  })
  it('三步部分成绩可保存且过期/重复/非有限输入无效；失败免费重试', () => {
    let s = act(act(state(), { type: 'begin' }), { type: 'test' }), before = structuredClone(s)
    s = act(s, { type: 'pulse', marker: .25, stage: 1 })
    expect(progress(s)).toMatchObject({ stage: 2, score: 100 }); expect(validateState(s)).toEqual(s)
    expect(act(s, { type: 'pulse', marker: .25, stage: 1 })).toBe(s)
    for (const marker of [NaN, Infinity, -.1, 1.1]) expect(act(s, { type: 'pulse', marker, stage: 2 })).toBe(s)
    s = act(s, { type: 'pulse', marker: 0, stage: 2 }); s = act(s, { type: 'pulse', marker: 0, stage: 3 })
    expect(progress(s)).toMatchObject({ stage: 0, score: 0, attempts: 1 })
    s = act(s, { type: 'test' })
    for (let i = 0; i < 3; i++) s = act(s, { type: 'pulse', marker: heritageTargets[i], stage: i + 1 })
    expect(progress(s)).toMatchObject({ stage: 4, score: 300, attempts: 2 })
    expect(validateState(s)).toEqual(s); expect(s.gold).toBe(before.gold); expect(s.inventory).toEqual(before.inventory)
  })
  it('祭台只打开交互面板，单纯E不会启动或推进心念', () => {
    let s = act(state(), { type: 'begin' }), checkpoint: number | undefined
    const w = new CombatWorld(chapterById(23), { state: () => s, collect: () => {}, kill: () => {}, camp: () => {}, heal: () => false,
      notify: () => {}, storyEvent: (_id, index) => { checkpoint = index }, eventAction: a => { s = advanceEvent(s, a).state } })
    Object.assign(w.player, findEvent(23, id)!.checkpoints![0]); w.action('interact', { x: 0, y: 0 })
    expect(checkpoint).toBe(0); expect(progress(s)).toMatchObject({ stage: 0, score: 0 })
    expect(w.enemies).toHaveLength(0)
  })
  it('报告一次120积累，离墓只审核不生成首领，首通幂等且支援保持归队', () => {
    let s = ready(), before = structuredClone(s)
    expect(chapterReady(s)).toBe(false); s = act(s, { type: 'deliver' }); expect(act(s, { type: 'deliver' })).toBe(s)
    expect(eventDone(s)).toBe(true); expect(s.xp).toBe(before.xp + 120)
    expect(s.inventory).toEqual(before.inventory); expect(s.flame).toBe('star'); expect(s.gold).toBe(before.gold)
    const w = new CombatWorld(chapterById(23), { state: () => s, collect: () => {}, camp: () => {}, heal: () => false,
      notify: () => {}, kill: boss => { if (boss) s = registerBossVictory(s) } })
    Object.assign(w.player, w.map.gate); w.action('interact', { x: 0, y: 0 })
    expect(s.progress[23].boss).toBe(true); expect(w.enemies).toHaveLength(0)
    const done = finishChapter(s); expect(done.gold).toBe(before.gold + chapterById(23).reward)
    expect(done.flame).toBe('star'); expect(teacherSupport(done).status).toBe('returned')
    expect(finishChapter(done)).toBe(done); expect(validateState(done)).toEqual(done)
  })
  it('伪造部分成绩、未尝试却通过及缺失探索前置拒绝导入', () => {
    for (const [stage, score, attempts] of [[1, 1, 0], [2, 101, 0], [3, 201, 0], [4, 209, 1], [5, 300, 0]]) {
      const s = ready(); Object.assign(progress(s), { stage, score, attempts })
      expect(() => validateState(s)).toThrow('传承心念')
    }
    const s = ready(); s.progress[23].events['heaven-tomb-timed-layers'] = blankProgress(23).events['heaven-tomb-timed-layers']
    expect(() => validateState(s)).toThrow('前置')
  })
  it('0.10.1旧通关可补传承且不补奖励，未通关保留探索报告而传承待接', () => {
    const old = state(); old.contentVersion = '0.10.1'; delete old.progress[23].events[id]
    const pending = validateState(old)
    expect(eventDone(pending, 23, 'heaven-tomb-timed-layers')).toBe(true); expect(progress(pending).started).toBe(false)
    old.progress[23].boss = true; old.completed.push(23)
    const done = validateState(old); expect(progress(done)).toMatchObject({ stage: 5, score: 300, attempts: 1 })
    expect(done.gold).toBe(old.gold); expect(done.xp).toBe(old.xp); expect(done.inventory).toEqual(old.inventory)
  })
})
