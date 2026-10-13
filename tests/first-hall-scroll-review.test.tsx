import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GameState } from '../src/core/model'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallScrollReview, submitFirstHallScrollReview } from '../src/core/first-hall-scroll-review'
import { hallScrollReviewSnapshotKeys } from '../src/core/early-snapshots'
import { firstHallScrollReviewEligible, firstHallScrollReviewInput, firstHallScrollReviewStep } from './helpers/first-hall-scroll-review-replay'
import { firstHallTeacherEligible } from './helpers/first-hall-teacher-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import FirstHallScrollReview from '../src/ui/FirstHallScrollReview'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('同一借卷翻看与明确求技', () => {
  let base: GameState, states: GameState[]
  beforeAll(() => {
    base = firstHallScrollReviewEligible(); states = [base]
    while (states.at(-1)!.earlyTraining.firstHallScrollReview.stage < 9) states.push(firstHallScrollReviewStep(states.at(-1)!))
  })
  it('老师三个独立路步与九动作，每一步四槽与上一自动档整档恢复；本人和同卷不动', async () => {
    expect(states).toHaveLength(13); await saveSlot(0, base)
    for (let i = 1; i < states.length; i++) {
      const state = states[i], t = state.earlyTraining.firstHallScrollReview, same = structuredClone(state)
      same.earlyTraining.firstHallScrollReview = base.earlyTraining.firstHallScrollReview; expect(same).toEqual(base)
      expect([t.x, t.y]).toEqual([300, 270]); expect(t.scroll).toBe('table')
      expect([t.teacherX, t.teacherY]).toEqual(i === 1 ? [300, 190] : i === 2 ? [340, 190] : [340, 230])
      expect(t.stage).toBe(i <= 3 ? 0 : i - 3); expect(t.walk).toBe(i <= 3 ? i : 0)
      for (const [field, threshold] of Object.entries({ approached: 1, opened: 2, assessed: 3, explained: 4, understood: 5, requested: 6, futureCondition: 7, insisted: 8 }))
        expect(t[field as keyof typeof t]).toBe(t.stage >= threshold)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(states[i - 1])
      const html = renderToStaticMarkup(<FirstHallScrollReview state={state} onBack={() => {}} />)
      expect(html).toContain('translate(300 270)'); expect(html).toContain('x="320" y="255"')
      expect(html).toContain(`translate(${t.teacherX} ${t.teacherY})`); expect(html).toContain('本人房门closed')
      expect(html).not.toContain('夜间薰儿位置')
    }
  })
  it('旧0.79仅补空；首路步也有版本门槛，所有字段与来源严格派生', () => {
    for (const version of ['0.79.0', '0.79.1']) {
      const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: Record<string, unknown> }
      old.contentVersion = version; delete old.earlyTraining.firstHallScrollReview
      expect(validateState(old)).toEqual(base)
      for (const state of states.slice(1)) expect(() => validateState({ ...state, contentVersion: version })).toThrow('同卷翻看求技')
    }
    for (const state of states) {
      expect(validateState(state)).toEqual(state)
      for (const field of Object.keys(state.earlyTraining.firstHallScrollReview)) {
        const bad = structuredClone(state) as unknown as { earlyTraining: { firstHallScrollReview: Record<string, unknown> } }
        delete bad.earlyTraining.firstHallScrollReview[field]; expect(() => validateState(bad)).toThrow()
        bad.earlyTraining.firstHallScrollReview[field] = 'wrong'; expect(() => validateState(bad)).toThrow()
      }
    }
    const bad = structuredClone(states[1]); bad.earlyTraining.firstHallScrollReview.record = 'recalled'
    expect(() => validateState(bad)).toThrow()
    bad.earlyTraining.firstHallScrollReview.record = 'current'; bad.earlyTraining.firstHallTeacher.stage = 6
    expect(() => validateState(bad)).toThrow()
  })
  it('17整旧快照、任务字段、各自坐标、空间、人物、方向与操作拒绝跳步和并发旧请求', () => {
    expect(hallScrollReviewSnapshotKeys).toHaveLength(17)
    for (const state of states) {
      const t = state.earlyTraining.firstHallScrollReview, action = firstHallScrollReviewInput(state)
      const p = action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t
      const reject = (input: typeof action, position = p, space = 'room') => expect(advanceFirstHallScrollReview(state, position, space, input).state).toBe(state)
      for (const label of hallScrollReviewSnapshotKeys) {
        const field = `expected${label}` as keyof typeof action, snapshot = action[field] as Record<string, unknown>
        reject({ ...action, [field]: undefined })
        for (const key of Object.keys(snapshot)) reject({ ...action, [field]: { ...snapshot, [key]: 'stale' } })
      }
      for (const key of Object.keys(t)) reject({ ...action, [key]: 'stale' })
      for (const flag of ['leaving', 'checkout', 'exitResponse', 'threat', 'conflict', 'continuation', 'aftermath'] as const) reject({ ...action, [flag]: true })
      for (const operation of ['move-right', 'move-down', 'move-left', 'move-up', 'arrive', 'flip', 'assess', 'explain', 'understand', 'request', 'condition', 'insist', 'archive', 'learn', 'use', 'repay', 'take-scroll', 'clan'])
        if (operation !== action.operation) reject({ ...action, operation })
      reject({ ...action, actor: action.actor === 'yan' ? 'teacher' : 'yan' })
      reject(action, { x: p.x + 1, y: p.y }); reject(action, p, 'courtyard')
      // The other person's valid coordinates cannot stand in for this actor.
      reject(action, action.actor === 'teacher' ? t : { x: t.teacherX, y: t.teacherY })
    }
    for (let i = 1; i < states.length; i++) {
      const action = firstHallScrollReviewInput(states[i - 1]), t = states[i].earlyTraining.firstHallScrollReview
      expect(advanceFirstHallScrollReview(states[i], action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t, 'room', action).state).toBe(states[i])
    }
    const unfinished = firstHallTeacherEligible(), t = unfinished.earlyTraining.firstHallScrollReview
    expect(advanceFirstHallScrollReview(unfinished, { x: t.teacherX, y: t.teacherY }, 'room', firstHallScrollReviewInput(unfinished)).state).toBe(unfinished)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={unfinished} />)).not.toContain('接续同卷翻看与求技')
    const noSource = structuredClone(base); noSource.earlyTraining.firstHallTeacher.record = 'none'
    expect(advanceFirstHallScrollReview(noSource, { x: 260, y: 190 }, 'room', firstHallScrollReviewInput(noSource)).state).toBe(noSource)
  })
  it('旧更高教学仅回顾，未赠技/升级/奖品；原四段与五段条件不得混签', () => {
    const old = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true, true)
    let state = firstHallScrollReviewEligible(old); const original = structuredClone(state)
    while (state.earlyTraining.firstHallScrollReview.stage < 9) {
      state = firstHallScrollReviewStep(state); expect(state.earlyTraining.firstHallScrollReview.record).toBe('recalled')
    }
    const html = renderToStaticMarkup(<FirstHallScrollReview state={state} onBack={() => {}} />)
    expect(html).toContain('详细历史回顾')
    for (const forbidden of ['古族', '古元', '族长', '陀舍', '八极崩已学']) expect(html).not.toContain(forbidden)
    state.earlyTraining.firstHallScrollReview = original.earlyTraining.firstHallScrollReview; expect(state).toEqual(original)
    expect(states.at(-1)!.earlyTraining.teaching).toEqual(base.earlyTraining.teaching)
    expect(states.at(-1)!.earlyTraining.practice).toEqual(base.earlyTraining.practice)
  })
  it('单字段单次写入，首路步并发仅成功一次；chapter1入口和摘要封存', async () => {
    let writes = 0
    const store = new GameStore({ load: async () => base, write: async saved => { writes++; expect(validateState(saved)).toEqual(saved) } })
    await store.initialize(); const runtime = store.getSnapshot().runtime, action = firstHallScrollReviewInput(base)
    expect(submitFirstHallScrollReview(store, { x: 260, y: 190 }, 'room', action)).toBe(true)
    expect(submitFirstHallScrollReview(store, { x: 260, y: 190 }, 'room', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const hidden = { ...base.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...base, settings: hidden }
    expect(advanceFirstHallScrollReview(sealed, { x: 260, y: 190 }, 'room', action).state).toBe(sealed)
    expect(savePreviewSummary(states.at(-1)!, hidden)).not.toContain('同卷求技')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续同卷翻看与求技')
  })
})
