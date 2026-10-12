import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { beginEarlyTraining } from '../../src/core/early-training'
import { morningEligible, morningStep } from './morning-card-replay'
import { advanceEarlyCityPharmacy, cityPharmacyPlaces } from '../../src/core/early-city-pharmacy'
import { cityPharmacyScenes } from '../../src/content/early-city-pharmacy'
import { advanceEarlyMarketEscort, marketEscortPlaces, type MarketEscortAction, type MarketEscortView } from '../../src/core/early-market-escort'
import { marketEscortObserver } from '../../src/core/early-market-escort-state'
import { marketEscortScenes } from '../../src/content/early-market-escort'
export function escortEligible(input = morningEligible()): GameState {
  let state = input.earlyTraining.started ? input : beginEarlyTraining(input).state
  while (state.earlyTraining.morningCard.stage < 14) state = morningStep(state)
  while (state.earlyTraining.cityPharmacy.stage < 15) {
    const ledger = state.earlyTraining, task = ledger.cityPharmacy, scene = cityPharmacyScenes[task.stage]
    const result = advanceEarlyCityPharmacy(state, cityPharmacyPlaces[scene.place], { ...task, actor: scene.actor, operation: scene.operation,
      expectedStarted: ledger.started, expectedBorrowed: ledger.purse.borrowed, expectedSpent: ledger.purse.spent,
      expectedLiquid: ledger.liquid.stage, expectedPrimary: ledger.receipts.bluegrass, expectedAuxiliary: ledger.receipts.boneflower, expectedCore: ledger.receipts.woodCore })
    expect(result.ok, result.message).toBe(true); state = parseSave(serializeSave(result.state))
  }
  return state
}
export function escortInput(state: GameState): MarketEscortAction {
  const task = state.earlyTraining.marketEscort, scene = marketEscortScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'observer', operation: scene?.operation ?? 'archive' }
}
export function escortView(state: GameState): MarketEscortView {
  const task = state.earlyTraining.marketEscort, place = marketEscortScenes[task.stage]?.place ?? 'inner'
  return marketEscortObserver(task.stage) ? { kind: 'observer', place } : { kind: 'yan', position: marketEscortPlaces[place] }
}
export function escortStep(state: GameState): GameState {
  const result = advanceEarlyMarketEscort(state, escortView(state), escortInput(state))
  expect(result.ok, result.message).toBe(true); return parseSave(serializeSave(result.state))
}
