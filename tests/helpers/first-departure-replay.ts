import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstBottleEligible, firstBottleStep } from './first-bottle-replay'
import { departurePlaces, advanceFirstDeparture, type FirstDepartureAction } from '../../src/core/first-departure'
import { firstDepartureScenes } from '../../src/content/first-departure'
import { marketTradeLedger } from '../../src/core/early-market-trade'
export function firstDepartureEligible(input?: GameState): GameState {
  let state = firstBottleEligible(input)
  while (state.earlyTraining.firstTechnique.stage < 19) state = firstBottleStep(state)
  return state
}
export function firstDepartureInput(state: GameState): FirstDepartureAction {
  const t = state.earlyTraining
  return { ...t.firstDeparture, expectedTechnique: { ...t.firstTechnique }, expectedTraining: { ...t.firstTraining },
    expectedIron: { ...t.iron }, expectedLedger: marketTradeLedger(state), expectedPractice: { ...t.practice }, expectedRecovery: { ...t.recovery },
    actor: 'yan', operation: firstDepartureScenes[t.firstDeparture.stage]?.operation ?? 'archive' }
}
export function firstDepartureStep(state: GameState): GameState {
  const scene = firstDepartureScenes[state.earlyTraining.firstDeparture.stage]
  const result = advanceFirstDeparture(state, departurePlaces[scene.place], scene.space, firstDepartureInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
