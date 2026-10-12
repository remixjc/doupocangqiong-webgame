import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listSlots, parseSave, saveSlot, validateState } from '../src/core/save'
import { advanceFirstHallApproach, submitFirstHallApproach } from '../src/core/first-hall-approach'
import { firstHallCheckoutEligible, firstHallCheckoutInput, firstHallCheckoutStep } from './helpers/first-hall-checkout-replay'
import { firstHallExitResponseInput } from './helpers/first-hall-exit-response-replay'
import { firstHallApproachAt } from '../src/core/first-hall-approach-state'
import { GameStore } from '../src/core/store'
import { savePreviewSummary } from '../src/core/save-preview'
import { replayEarlyTraining } from './helpers/early-training-replay'
import { morningEligible } from './helpers/morning-card-replay'
import FirstHallApproach from '../src/ui/FirstHallApproach'
import EarlyTrainingPanel from '../src/ui/EarlyTrainingPanel'
import type { GameState } from '../src/core/model'
const position = { x: 140, y: 310 }

describe('C1h-3c2b 管理者同卷借阅，尚未跨门', () => {
  let base: GameState
  beforeAll(() => { base = firstHallCheckoutEligible() })
  it('三步四槽备份；48同事务登记hall8，仅历史和必要卷账变化', async () => {
    let state = structuredClone(base); await saveSlot(0, state)
    while (state.earlyTraining.firstHallApproach.stage < 49) {
      const previous = state, action = firstHallCheckoutInput(state); state = firstHallCheckoutStep(state)
      const registered = state.earlyTraining.firstHallApproach.stage >= 48
      expect(state.earlyTraining.firstHallApproach.checkoutRecord).toBe(registered ? 'current' : 'none')
      expect(state.earlyTraining.hall).toEqual(registered ? { stage: 8, scroll: 'borrowed-second' } : base.earlyTraining.hall)
      const same = structuredClone(state); same.earlyTraining.firstHallApproach = base.earlyTraining.firstHallApproach; same.earlyTraining.hall = base.earlyTraining.hall
      expect(same).toEqual(base)
      expect(advanceFirstHallApproach(state, position, 'hall', action).state).toBe(state)
      for (const slot of [0, 1, 2, 3]) await saveSlot(slot, state)
      const slots = await listSlots()
      for (const slot of [0, 1, 2, 3]) expect(parseSave(slots.find(s => s.slot === slot)!.text)).toEqual(state)
      expect(parseSave(slots.find(s => s.slot === -1)!.text)).toEqual(previous)
      const html = renderToStaticMarkup(<FirstHallApproach checkout state={state} onBack={() => {}} />)
      expect(html).toContain('translate(140 310)')
      expect(html).toContain('本人另取的同一第二卷'); expect(html).toContain('薰儿自己的临时卷已放下')
      expect(html).toContain('同一第一卷实际放回书架')
    }
    expect(renderToStaticMarkup(<FirstHallApproach exitResponse state={state} onBack={() => {}} />)).toContain('堂内移步与来年回应 6/6')
    expect(advanceFirstHallApproach(state, position, 'hall', firstHallExitResponseInput(state)).state).toBe(state)
  })
  it('旧46只补none；旧47+、当前缺派生、提前8/9或登记后仍7拒绝', () => {
    const old = structuredClone(base) as unknown as { contentVersion: string; earlyTraining: { firstHallApproach: Record<string, unknown> } }
    old.contentVersion = '0.73.0'; delete old.earlyTraining.firstHallApproach.checkoutRecord
    expect(validateState(old)).toEqual(base)
    const forged = firstHallCheckoutStep(base); forged.contentVersion = '0.73.0'
    expect(() => validateState(forged)).toThrow('管理者登记')
    old.contentVersion = base.contentVersion; expect(() => validateState(old)).toThrow()
    for (const stage of [46, 47, 48, 49]) {
      const state = structuredClone(base)
      state.earlyTraining.firstHallApproach = firstHallApproachAt(stage, 'current', 'current', stage >= 48 ? 'current' : 'none')
      state.earlyTraining.hall = stage >= 48 ? { stage: 8, scroll: 'borrowed-second' } : base.earlyTraining.hall
      expect(validateState(state)).toEqual(state)
      const bad = structuredClone(state); bad.earlyTraining.firstHallApproach.checkoutRecord = stage >= 48 ? 'none' : 'current'
      expect(() => validateState(bad)).toThrow()
      const exit = structuredClone(state); exit.earlyTraining.hall = { stage: 9, scroll: 'borrowed-second' }; expect(() => validateState(exit)).toThrow()
      const mismatch = structuredClone(state); mismatch.earlyTraining.hall = stage >= 48 ? { stage: 7, scroll: 'selected-second' } : { stage: 8, scroll: 'borrowed-second' }
      expect(() => validateState(mismatch)).toThrow()
    }
  })
  it('前置、十三快照、坐标人物和独立分支严格；跨门战斗还款冒签拒绝', () => {
    const incomplete = structuredClone(base); incomplete.earlyTraining.firstHallApproach = firstHallApproachAt(45, 'current', 'current')
    expect(advanceFirstHallApproach(incomplete, position, 'hall', firstHallCheckoutInput(incomplete)).state).toBe(incomplete)
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={incomplete} />)).not.toContain('接续同卷管理者登记')
    let state = structuredClone(base)
    while (state.earlyTraining.firstHallApproach.stage < 49) {
      const action = firstHallCheckoutInput(state)
      for (const field of ['expectedTalk', 'expectedReading', 'expectedMatch', 'expectedEntry', 'expectedMeeting', 'expectedDeparture', 'expectedTechnique', 'expectedTraining', 'expectedIron', 'expectedLedger', 'expectedPractice', 'expectedRecovery', 'expectedHall'] as const) {
        expect(advanceFirstHallApproach(state, position, 'hall', { ...action, [field]: undefined }).state).toBe(state)
        for (const key of Object.keys(action[field])) expect(advanceFirstHallApproach(state, position, 'hall', { ...action, [field]: { ...action[field], [key]: 'stale' } }).state).toBe(state)
      }
      for (const operation of ['leave', 'win', 'repay', 'return', 'second', 'learn']) expect(advanceFirstHallApproach(state, position, 'hall', { ...action, operation }).state).toBe(state)
      for (const flag of ['exitResponse', 'threat', 'conflict', 'continuation'] as const) expect(advanceFirstHallApproach(state, position, 'hall', { ...action, [flag]: true }).state).toBe(state)
      expect(advanceFirstHallApproach(state, { x: 400, y: 250 }, 'hall', action).state).toBe(state)
      expect(advanceFirstHallApproach(state, position, 'outside', action).state).toBe(state)
      expect(advanceFirstHallApproach(state, position, 'hall', { ...action, actor: 'ning' }).state).toBe(state)
      state = firstHallCheckoutStep(state)
    }
  })
  it('旧高借阅显式recalled不回退；原子写一次/重复拒绝/防剧透', async () => {
    const legacy = replayEarlyTraining(morningEligible(), false, undefined, true, true, true, true, true, true, true)
    let higher = firstHallCheckoutEligible(legacy), before = structuredClone(higher)
    while (higher.earlyTraining.firstHallApproach.stage < 49) higher = firstHallCheckoutStep(higher)
    expect(higher.earlyTraining.firstHallApproach.checkoutRecord).toBe('recalled')
    higher.earlyTraining.firstHallApproach = before.earlyTraining.firstHallApproach; expect(higher).toEqual(before)
    const state = firstHallCheckoutStep(base); let writes = 0
    const store = new GameStore({ load: async () => state, write: async saved => {
      writes++; expect(saved.earlyTraining.firstHallApproach.checkoutRecord).toBe('current')
      expect(saved.earlyTraining.hall).toEqual({ stage: 8, scroll: 'borrowed-second' }); expect(validateState(saved)).toEqual(saved)
    } })
    await store.initialize(); const action = firstHallCheckoutInput(state), runtime = store.getSnapshot().runtime
    expect(submitFirstHallApproach(store, position, 'hall', action)).toBe(true)
    expect(submitFirstHallApproach(store, position, 'hall', action)).toBe(false)
    expect(await store.waitForAutosave()).toBe(true); expect(writes).toBe(1); expect(store.getSnapshot().runtime).toBe(runtime)
    const hidden = { ...base.settings, spoiler: 'anime' as const, animeLimit: 1 }, sealed = { ...base, settings: hidden }
    expect(advanceFirstHallApproach(sealed, position, 'hall', firstHallCheckoutInput(sealed)).state).toBe(sealed)
    expect(savePreviewSummary(firstHallCheckoutStep(base), hidden)).not.toContain('同卷登记')
    expect(renderToStaticMarkup(<EarlyTrainingPanel state={sealed} />)).not.toContain('接续同卷管理者登记')
  })
})
