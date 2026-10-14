import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { advanceFirstSaleDeparture, type FirstSaleDepartureAction } from '../../src/core/first-sale-departure'
import { saleDepartureRoute } from '../../src/core/first-sale-departure-state'
import { firstSaleDepartureScenes } from '../../src/content/first-sale-departure'
import { earlySnapshots, saleDepartureSnapshotKeys } from '../../src/core/early-snapshots'
import { firstSalePlanEligible, firstSalePlanStep, recoveryEntrance } from './first-sale-plan-replay'
export { recoveryEntrance }
export function firstSaleDepartureEligible(): GameState {
  let state = firstSalePlanEligible()
  while (state.earlyTraining.firstSalePlan.stage < 21) state = firstSalePlanStep(state)
  return state
}
export function firstSaleDepartureInput(state: GameState): FirstSaleDepartureAction {
  const t = state.earlyTraining.firstSaleDeparture, scene = firstSaleDepartureScenes[t.stage]
  const direction = t.stage === 3 && t.walk < 5 ? saleDepartureRoute[t.walk] : undefined
  return { ...t, ...earlySnapshots(state, saleDepartureSnapshotKeys),
    expectedConsignment: structuredClone(state.earlyTraining.consignment), actor: 'yan',
    operation: direction ? `move-${direction}` : scene?.operation ?? 'finish' }
}
export function firstSaleDepartureStep(state: GameState): GameState {
  const t = state.earlyTraining.firstSaleDeparture
  const result = advanceFirstSaleDeparture(state, recoveryEntrance, t, t.location, firstSaleDepartureInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
