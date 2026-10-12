import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { refiningAt, refiningLiquidMinimum, type RefiningState } from '../src/core/early-refining-state'
import { ironAt } from '../src/core/early-iron-state'
import { advanceEarlyRefining, refiningNear, refiningStart, refiningWater, submitEarlyRefining, type RefiningAction } from '../src/core/early-refining'
import { ironPlaces } from '../src/core/early-iron'
import { refiningEligible, refiningInput, refiningStep } from './helpers/refining-replay'
import { morningEligible } from './helpers/morning-card-replay'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { advanceEarlyTraining } from '../src/core/early-training'
import { GameStore } from '../src/core/store'
import { earlyRefiningSaveSummary, savePreviewSummary } from '../src/core/save-preview'
import EarlyRefining from '../src/ui/EarlyRefining'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
describe('C1g-4e1 清水/白焰/三主药/两辅药及同一耗材账', () => {
  it('11断点全部存档槽及上一备份，原物资单次联动，其他全state保持', async () => {
    let state = refiningEligible(); const before = structuredClone(state)
    await saveSlot(0, state)
    while (state.earlyTraining.refining.stage < 11) {
      const prior = state; state = refiningStep(state)
      await saveSlot(0, state); for (const slot of [1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(prior)
      const stage = state.earlyTraining.refining.stage, liquid = refiningLiquidMinimum(stage)
      expect(state.earlyTraining.liquid).toEqual({ stage: liquid, water: liquid >= 2, ready: false })
      expect(state.earlyTraining.supplies).toEqual({ bluegrass: liquid >= 3 ? 0 : 3, boneflower: liquid >= 4 ? 0 : 2, woodCore: 1 })
      const same = structuredClone(state)
      for (const key of ['refining', 'liquid', 'supplies'] as const) Object.assign(same.earlyTraining, { [key]: before.earlyTraining[key] })
      expect(same).toEqual(before)
    }
  })
  it('0.55.1尚存/已备水/部分消耗/已耗液恢复迁移不补物或倒退', () => {
    const fresh = refiningEligible(), partial = structuredClone(fresh)
    for (const operation of ['identify', 'water', 'primary'] as const) {
      const result = advanceEarlyTraining(partial, { type: 'liquid', step: partial.earlyTraining.liquid.stage, operation, expectedSpent: 110 })
      expect(result.ok).toBe(true); Object.assign(partial, result.state)
    }
    const consumed = refiningEligible(replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true))
    for (const input of [fresh, partial, consumed]) {
      const old = JSON.parse(JSON.stringify(input)); old.contentVersion = '0.55.1'; delete old.earlyTraining.refining
      let state = validateState(old); expect(state).toEqual(input)
      while (state.earlyTraining.refining.stage < 11) state = refiningStep(state)
      expect(state.earlyTraining.liquid.stage).toBe(Math.max(input.earlyTraining.liquid.stage, 4))
      const same = structuredClone(state); same.earlyTraining.refining = input.earlyTraining.refining
      if (input === consumed) expect(same).toEqual(input)
      expect(state.earlyTraining.recovery).toEqual(input.earlyTraining.recovery)
      expect(state.earlyTraining.practice).toEqual(input.earlyTraining.practice)
    }
    expect(consumed.earlyTraining.supplies.woodCore).toBe(0)
  })
  it('完整历史/旧账/铁片快照，老师独立坐标/本人盛水近距，演员与错误零改', () => {
    let state = refiningEligible()
    while (state.earlyTraining.refining.stage < 11) {
      const task = state.earlyTraining.refining, input = refiningInput(state)
      for (const key of Object.keys(task) as (keyof RefiningState)[])
        expect(advanceEarlyRefining(state, refiningWater, { ...input, [key]: 'stale' } as RefiningAction).state).toBe(state)
      for (const key of Object.keys(input.expectedLedger))
        expect(advanceEarlyRefining(state, refiningWater, { ...input, expectedLedger: { ...input.expectedLedger, [key]: 'stale' } } as RefiningAction).state).toBe(state)
      for (const key of Object.keys(input.expectedIron))
        expect(advanceEarlyRefining(state, refiningWater, { ...input, expectedIron: { ...input.expectedIron, [key]: 'stale' } } as RefiningAction).state).toBe(state)
      for (const operation of ['restore', 'drink', 'finish'] as const)
        expect(advanceEarlyRefining(state, refiningWater, { ...input, operation }).state).toBe(state)
      expect(advanceEarlyRefining(state, refiningWater, { ...input, actor: input.actor === 'teacher' ? 'yan' : 'teacher' }).state).toBe(state)
      expect(advanceEarlyRefining(state, refiningWater, { ...input, teacherPosition: refiningWater }).state).toBe(state)
      for (const yan of [{ x: NaN, y: 370 }, { x: 220, y: 440 }, { x: 380, y: 100 }])
        expect(advanceEarlyRefining(state, yan, input).state).toBe(state)
      if (task.stage === 2) expect(advanceEarlyRefining(state, refiningStart(2), input).state).toBe(state)
      state = refiningStep(state); expect(advanceEarlyRefining(state, refiningWater, input).state).toBe(state)
    }
  })
  it('所有派生/缺字段/铁片前置/旧液下限非法拒绝，白焰不提前，主药第一株独存', () => {
    let state = refiningEligible()
    expect(() => validateState({ ...state, earlyTraining: { ...state.earlyTraining, refining: undefined } })).toThrow()
    for (;;) {
      const t = state.earlyTraining.refining
      expect(t).toEqual(refiningAt(t.stage))
      for (const key of Object.keys(t) as (keyof RefiningState)[]) {
        const bad = structuredClone(state); (bad.earlyTraining.refining as unknown as Record<string, unknown>)[key] = 'invalid'
        expect(() => validateState(bad)).toThrow()
      }
      if (t.stage > 0) { const bad = structuredClone(state); bad.earlyTraining.iron = ironAt(17); expect(() => validateState(bad)).toThrow() }
      if (t.stage === 5) { expect(t.primary).toBe(1); expect(state.earlyTraining.supplies.bluegrass).toBe(3) }
      if (t.stage === 11) break
      state = refiningStep(state)
    }
    const bad = structuredClone(state); bad.earlyTraining.liquid.stage = 3; bad.earlyTraining.supplies.boneflower = 2
    expect(() => validateState(bad)).toThrow()
    expect(state.earlyTraining.liquid.ready).toBe(false)
  })
  it('默认本人/教师步骤重选，水与白焰按阈值显示，防剧透封存', () => {
    let state = refiningEligible()
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={state} />)).toContain('接续清水与主辅药调制')
    for (;;) {
      const t = state.earlyTraining.refining, html = renderToStaticMarkup(<EarlyRefining state={state} onBack={() => {}} />)
      expect(html.includes('老师掌中白焰，尚未熄灭')).toBe(t.flame)
      expect(html.includes('当时已备清水，尚未入药')).toBe(t.water)
      if (t.stage === 11) break
      state = refiningStep(state)
    }
    expect(refiningNear(refiningWater, 2)).toBe(true); expect(refiningNear(ironPlaces.table, 2)).toBe(false)
    const limited = structuredClone(state); limited.settings.spoiler = 'anime'; limited.settings.animeLimit = 1
    expect(renderToStaticMarkup(<EarlyRefining state={limited} onBack={() => {}} />)).not.toMatch(/白焰|魔核|主药|清水|老师/)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={limited} />)).not.toContain('接续清水与主辅药调制')
    expect(savePreviewSummary(state, limited.settings)).not.toContain('主辅药调制')
    expect(earlyRefiningSaveSummary(state, limited.settings)).toContain('封存')
    expect(advanceEarlyRefining(limited, refiningWater, refiningInput(limited)).state).toBe(limited)
  })
  it('主药消耗和历史一次写入，双击/旧入口并发拒绝保持runtime', async () => {
    let state = refiningEligible(); while (state.earlyTraining.refining.stage < 5) state = refiningStep(state)
    const input = refiningInput(state); let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.refining.primary).toBe(3); expect(saved.earlyTraining.liquid.stage).toBe(3)
      expect(saved.earlyTraining.supplies.bluegrass).toBe(0)
    } })
    await store.initialize(); const runtime = store.getSnapshot().runtime
    expect(submitEarlyRefining(store, refiningWater, input)).toBe(true)
    expect(submitEarlyRefining(store, refiningWater, input)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const old = advanceEarlyTraining(state, { type: 'liquid', step: 2, operation: 'primary', expectedSpent: 110 })
    expect(old.ok).toBe(true)
    expect(advanceEarlyRefining(old.state, refiningWater, input).state).toBe(old.state)
  })
})
