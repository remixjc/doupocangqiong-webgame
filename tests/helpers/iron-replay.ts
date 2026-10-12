import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { returnEligible, returnStep } from './market-return-replay'
import { advanceEarlyIron, ironPlaces, type IronAction } from '../../src/core/early-iron'
import { marketTradeLedger } from '../../src/core/early-market-trade'
import { ironScenes } from '../../src/content/early-iron'
export function ironEligible(input?: GameState): GameState {
  let state = returnEligible(input)
  while (state.earlyTraining.marketReturn.stage < 9) state = returnStep(state)
  return state
}
export function ironInput(state: GameState): IronAction {
  const scene = ironScenes[state.earlyTraining.iron.stage]
  return { ...state.earlyTraining.iron, expectedLedger: marketTradeLedger(state),
    expectedReturn: { ...state.earlyTraining.marketReturn }, actor: scene?.actor ?? 'yan',
    teacherPosition: { ...ironPlaces.teacher }, operation: scene?.operation ?? 'archive' }
}
export function ironStep(state: GameState): GameState {
  const stage = state.earlyTraining.iron.stage
  const result = advanceEarlyIron(state, stage === 12 ? ironPlaces.table : ironPlaces.teacher, ironInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
