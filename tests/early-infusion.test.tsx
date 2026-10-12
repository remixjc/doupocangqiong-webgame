import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, serializeSave, validateState } from '../src/core/save'
import { refiningAt, refiningLiquidMinimum } from '../src/core/early-refining-state'
import { advanceEarlyRefining, refiningWater, submitEarlyRefining } from '../src/core/early-refining'
import { ironPlaces } from '../src/core/early-iron'
import { refiningEligible, refiningInput, refiningStep } from './helpers/refining-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { GameStore } from '../src/core/store'
import { earlyRefiningSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import EarlyRefining from '../src/ui/EarlyRefining'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
function ready(input = refiningEligible()) {
  while (input.earlyTraining.refining.stage < 11) input = refiningStep(input)
  return input
}
describe('C1g-4e2 魔核炼化/熄焰/否决口服/入水/期限', () => {
  it('后半11断点与全部槽、上一备份；原木核和药液只核销一次', async () => {
    let state = ready(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.refining.stage < 22) {
      const previous = state; state = refiningStep(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(previous)
      const task = state.earlyTraining.refining
      expect(state.earlyTraining.liquid).toEqual({ stage: refiningLiquidMinimum(task.stage), water: true, ready: task.stage >= 18 })
      expect(state.earlyTraining.supplies).toEqual({ bluegrass: 0, boneflower: 0, woodCore: 0 })
      const same = structuredClone(state)
      for (const key of ['refining', 'liquid', 'supplies'] as const) Object.assign(same.earlyTraining, { [key]: before.earlyTraining[key] })
      expect(same).toEqual(before)
      expect(task.flame).toBe(task.stage < 14)
      const html = renderToStaticMarkup(<EarlyRefining continuation state={state} onBack={() => {}} />)
      expect(html.includes('老师掌中白焰，尚未熄灭')).toBe(task.flame)
      expect(html.includes('当时药团已入清水')).toBe(task.stage >= 18)
    }
    expect(advanceEarlyRefining(state, refiningWater, refiningInput(state)).state).toBe(state)
    // The first half remains an archived historical view after continuation.
    expect(renderToStaticMarkup(<EarlyRefining state={state} onBack={() => {}} />)).toContain('主辅药调制已归档。')
  })
  it('真实版本迁移：旧11保留、不假补后半；已耗液与恢复spent不回退', () => {
    const fresh = ready(), consumed = ready(refiningEligible(replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true)))
    expect(consumed.earlyTraining.recovery.energy).toBe('spent')
    for (const input of [fresh, consumed]) {
      const raw = structuredClone(input); raw.contentVersion = '0.56.2'
      let state = validateState(raw); expect(state).toEqual(input)
      while (state.earlyTraining.refining.stage < 22) state = refiningStep(state)
      const same = structuredClone(state); same.earlyTraining.refining = input.earlyTraining.refining
      if (input === consumed) expect(same).toEqual(input)
      expect(state.earlyTraining.recovery).toEqual(input.earlyTraining.recovery)
      expect(state.earlyTraining.practice).toEqual(input.earlyTraining.practice)
    }
    const bad = refiningStep(fresh); bad.contentVersion = '0.56.2'
    expect(() => validateState(bad)).toThrow('魔核入水')
  })
  it('每步完整快照/老师位置/演员/错序防重；口服、后台提升和补货零写', () => {
    let state = ready()
    while (state.earlyTraining.refining.stage < 22) {
      const input = refiningInput(state)
      for (const key of Object.keys(state.earlyTraining.refining))
        expect(advanceEarlyRefining(state, refiningWater, { ...input, [key]: 'stale' }).state).toBe(state)
      for (const key of Object.keys(input.expectedLedger))
        expect(advanceEarlyRefining(state, refiningWater, { ...input, expectedLedger: { ...input.expectedLedger, [key]: 'stale' } }).state).toBe(state)
      expect(advanceEarlyRefining(state, refiningWater, { ...input, expectedIron: { ...input.expectedIron, stage: 17 } }).state).toBe(state)
      for (const operation of ['restore', 'drink', 'wait', 'finish'] as const)
        expect(advanceEarlyRefining(state, refiningWater, { ...input, operation }).state).toBe(state)
      expect(advanceEarlyRefining(state, refiningWater, { ...input, actor: input.actor === 'teacher' ? 'yan' : 'teacher' }).state).toBe(state)
      expect(advanceEarlyRefining(state, refiningWater, { ...input, teacherPosition: refiningWater }).state).toBe(state)
      for (const position of [{ x: NaN, y: 370 }, { x: 220, y: 440 }, { x: 380, y: 100 }])
        expect(advanceEarlyRefining(state, position, input).state).toBe(state)
      if (state.earlyTraining.refining.stage === 17)
        expect(advanceEarlyRefining(state, ironPlaces.table, input).state).toBe(state)
      state = refiningStep(state); expect(advanceEarlyRefining(state, refiningWater, input).state).toBe(state)
    }
  })
  it('所有后半派生字段/旧液下限严格，入水不签恢复或境界', () => {
    let state = ready()
    while (state.earlyTraining.refining.stage < 22) {
      state = refiningStep(state)
      for (const key of Object.keys(state.earlyTraining.refining)) {
        const bad = structuredClone(state); Object.assign(bad.earlyTraining.refining, { [key]: 'bad' })
        expect(() => validateState(bad)).toThrow()
      }
      expect(parseSave(serializeSave(state)).earlyTraining.refining).toEqual(refiningAt(state.earlyTraining.refining.stage))
      const bad = structuredClone(state); bad.earlyTraining.liquid.stage = refiningLiquidMinimum(state.earlyTraining.refining.stage) - 1
      expect(() => validateState(bad)).toThrow()
      expect(state.earlyTraining.recovery.result).toBe('none')
    }
  })
  it('第2章、防剧透与前半归档门槛；摘要不泄漏后半与实际入水', () => {
    const fresh = refiningEligible()
    expect(renderToStaticMarkup(<EarlyRefining continuation state={fresh} onBack={() => {}} />)).toContain('先完成清水与主辅药归档')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={fresh} />)).not.toContain('接续魔核炼化与入水')
    let state = ready()
    while (state.earlyTraining.refining.stage < 22) state = refiningStep(state)
    expect(earlyRefiningSaveSummary(state, state.settings)).toContain('期限已归档')
    const hidden = structuredClone(state); hidden.settings.spoiler = 'anime'; hidden.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyRefining continuation state={hidden} onBack={() => {}} />)).not.toMatch(/白焰|魔核|药团|清水|老师/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={hidden} />)).not.toContain('接续魔核炼化与入水')
    expect(savePreviewSummary(state, hidden.settings)).not.toContain('魔核入水')
    expect(advanceEarlyRefining(hidden, refiningWater, refiningInput(hidden)).state).toBe(hidden)
  })
  it('实际入水与历史同次写；旧入口已入水并发和双击不重复', async () => {
    let state = ready(); while (state.earlyTraining.refining.stage < 17) state = refiningStep(state)
    const input = refiningInput(state); let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.refining.core).toBe('water'); expect(saved.earlyTraining.liquid.ready).toBe(true)
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyRefining(store, refiningWater, input)).toBe(true)
    expect(submitEarlyRefining(store, refiningWater, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const old = structuredClone(state); old.earlyTraining.liquid = { stage: 6, water: true, ready: true }
    expect(advanceEarlyRefining(old, refiningWater, input).state).toBe(old)
  })
})
