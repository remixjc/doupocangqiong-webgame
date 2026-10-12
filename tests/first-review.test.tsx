import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { firstTrainingAt } from '../src/core/first-training-state'
import { advanceFirstTraining, submitFirstTraining } from '../src/core/first-training'
import { ironPlaces } from '../src/core/early-iron'
import { firstReviewEligible, firstReviewInput, firstReviewStep } from './helpers/first-review-replay'
import { firstTrainingEligible } from './helpers/first-training-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { firstTrainingSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import FirstTraining from '../src/ui/FirstTraining'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
const position = { x: 160, y: 370 }
describe('C1h-1a2 半月回顾与实际四段', () => {
  it('七个断点跨自动/三手动/上一备份；只增加回顾历史，不改旧奖励/恢复/境界', async () => {
    let state = firstReviewEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.firstTraining.stage < 17) {
      const previous = state; state = firstReviewStep(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const records = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(records.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(records.find(s => s.slot === -1)!.text)).toEqual(previous)
      const same = structuredClone(state); same.earlyTraining.firstTraining = before.earlyTraining.firstTraining
      expect(same).toEqual(before)
      const task = state.earlyTraining.firstTraining
      expect(task).toEqual(firstTrainingAt(task.stage))
      const html = renderToStaticMarkup(<FirstTraining continuation state={state} onBack={() => {}} />)
      expect(html.includes('回望处')).toBe(task.stage === 13)
      expect(html.includes('当时绿意变淡')).toBe(task.pale)
      expect(html.includes('衣着已整理')).toBe(task.dressed)
      const old = renderToStaticMarkup(<FirstTraining state={state} onBack={() => {}} />)
      expect(old).toContain('持续调息已归档。')
      expect(old).not.toContain('回顾此前半月修炼')
    }
    expect(state.earlyTraining.firstTraining.forecast).toBe('two-months')
    expect(state.earlyTraining.firstTraining.result).toBe('fourth-duan')
    expect(firstTrainingSaveSummary(state, state.settings)).toContain('五段仍是预计')
    expect(advanceFirstTraining(state, position, firstReviewInput(state)).state).toBe(state)
  })
  it('0.58.1只补新增回顾字段未参与，当前轮10保持；旧spent与五段绝不倒退', () => {
    const old = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true)
    for (const input of [firstReviewEligible(), firstReviewEligible(old)]) {
      const raw = structuredClone(input); raw.contentVersion = '0.58.1'
      for (const key of ['period', 'teacherReaction', 'pale', 'dressed']) delete (raw.earlyTraining.firstTraining as unknown as Record<string, unknown>)[key]
      let state = validateState(raw); expect(state).toEqual(input)
      while (state.earlyTraining.firstTraining.stage < 17) state = firstReviewStep(state)
      const same = structuredClone(state); same.earlyTraining.firstTraining = input.earlyTraining.firstTraining
      expect(same).toEqual(input)
      expect(state.earlyTraining.recovery).toEqual(input.earlyTraining.recovery)
    }
    const bad = firstReviewStep(firstReviewEligible()); bad.contentVersion = '0.58.1'
    expect(() => validateState(bad)).toThrow('半月回顾')
  })
  it('演员/回望近位/所有快照字段/乱序与重复全拒绝；四段仅在独立断点落账', () => {
    let state = firstReviewEligible()
    while (state.earlyTraining.firstTraining.stage < 17) {
      const input = firstReviewInput(state)
      for (const key of Object.keys(state.earlyTraining.firstTraining))
        expect(advanceFirstTraining(state, position, { ...input, [key]: 'stale' }).state).toBe(state)
      for (const field of ['expectedLedger', 'expectedRefining', 'expectedPractice', 'expectedRecovery'] as const)
        for (const key of Object.keys(input[field]))
          expect(advanceFirstTraining(state, position, { ...input, [field]: { ...input[field], [key]: 'stale' } }).state).toBe(state)
      expect(advanceFirstTraining(state, position, { ...input, actor: input.actor === 'yan' ? 'teacher' : 'yan' }).state).toBe(state)
      expect(advanceFirstTraining(state, position, { ...input, teacherPosition: position }).state).toBe(state)
      expect(advanceFirstTraining(state, { x: NaN, y: 370 }, input).state).toBe(state)
      expect(advanceFirstTraining(state, { x: 260, y: 440 }, input).state).toBe(state)
      if (state.earlyTraining.firstTraining.stage === 13)
        expect(advanceFirstTraining(state, ironPlaces.table, input).state).toBe(state)
      for (const operation of ['wait', 'restore', 'fifth', 'learn', 'repay', 'drink'])
        expect(advanceFirstTraining(state, position, { ...input, operation }).state).toBe(state)
      if (state.earlyTraining.firstTraining.stage !== 11)
        expect(advanceFirstTraining(state, position, { ...input, operation: 'fourth' }).state).toBe(state)
      expect(advanceFirstTraining(state, position, { ...input, marker: .5 }).state).toBe(state)
      state = firstReviewStep(state)
      expect(advanceFirstTraining(state, position, input).state).toBe(state)
      for (const key of ['period', 'result', 'teacherReaction', 'pale', 'dressed']) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.firstTraining, { [key]: 'bad' })
        expect(() => validateState(bad)).toThrow()
      }
    }
  })
  it('第2章/当前轮归档与剧透门槛；缺回顾字段和伪造提前四段拒绝', () => {
    const fresh = firstTrainingEligible(), ready = firstReviewEligible()
    expect(renderToStaticMarkup(<FirstTraining continuation state={fresh} onBack={() => {}} />)).toContain('先完成当前一轮归档')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={fresh} />)).not.toContain('接续半月回顾与当时四段')
    const bad = structuredClone(ready); bad.earlyTraining.firstTraining.result = 'fourth-duan'
    expect(() => validateState(bad)).toThrow()
    delete (bad.earlyTraining.firstTraining as Partial<typeof bad.earlyTraining.firstTraining>).period
    expect(() => validateState(bad)).toThrow()
    const hidden = structuredClone(ready); hidden.settings.spoiler = 'anime'; hidden.settings.animeLimit = 1
    expect(renderToStaticMarkup(<FirstTraining continuation state={hidden} onBack={() => {}} />)).not.toMatch(/半月|四段|药色/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={hidden} />)).not.toContain('接续半月回顾')
    expect(savePreviewSummary(ready, hidden.settings)).not.toMatch(/半月|四段|五段/)
    expect(advanceFirstTraining(hidden, position, firstReviewInput(hidden)).state).toBe(hidden)
  })
  it('实际四段与回顾只一次原子保存；旧药液变化并发拒绝，runtime保留', async () => {
    const state = firstReviewStep(firstReviewEligible()), input = firstReviewInput(state); let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.firstTraining.result).toBe('fourth-duan')
      expect(saved.earlyTraining.recovery).toEqual(state.earlyTraining.recovery)
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitFirstTraining(store, position, input)).toBe(true)
    expect(submitFirstTraining(store, position, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1)
    expect(store.getSnapshot().runtime).toBe(runtime)
    const changed = structuredClone(state); changed.earlyTraining.recovery.energy = 'spent'
    expect(advanceFirstTraining(changed, position, input).state).toBe(changed)
  })
})
