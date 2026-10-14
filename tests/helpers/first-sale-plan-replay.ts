import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { advanceFirstSalePlan, type FirstSalePlanAction } from '../../src/core/first-sale-plan'
import { salePlanRoute } from '../../src/core/first-sale-plan-state'
import { firstSalePlanScenes } from '../../src/content/first-sale-plan'
import { earlySnapshots, salePlanSnapshotKeys } from '../../src/core/early-snapshots'
import { firstAwakeningEligible, firstAwakeningStep, recoveryEntrance } from './first-awakening-replay'
export { recoveryEntrance }
export function firstSalePlanEligible(): GameState {
  let state = firstAwakeningEligible()
  while (state.earlyTraining.firstAwakening.stage < 11) state = firstAwakeningStep(state)
  return state
}
export function firstSalePlanInput(state: GameState): FirstSalePlanAction {
  const t = state.earlyTraining.firstSalePlan, scene = firstSalePlanScenes[t.stage]
  const direction = t.stage === 1 && t.walk < 5 ? salePlanRoute[t.walk] : undefined
  return { ...t, ...earlySnapshots(state, salePlanSnapshotKeys),
    expectedConsignment: structuredClone(state.earlyTraining.consignment),
    actor: direction ? 'yan' : scene?.actor ?? 'yan',
    operation: direction ? `move-${direction}` : scene?.operation ?? 'finish' }
}
export function firstSalePlanStep(state: GameState): GameState {
  const t = state.earlyTraining.firstSalePlan
  const result = advanceFirstSalePlan(state, recoveryEntrance, t, t.location, firstSalePlanInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
