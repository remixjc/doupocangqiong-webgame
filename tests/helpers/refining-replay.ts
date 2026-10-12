import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { ironEligible, ironStep } from './iron-replay'
import { advanceEarlyRefining, refiningWater, type RefiningAction } from '../../src/core/early-refining'
import { ironPlaces } from '../../src/core/early-iron'
import { marketTradeLedger } from '../../src/core/early-market-trade'
import { refiningScenes } from '../../src/content/early-refining'
export function refiningEligible(input?: GameState): GameState {
  let state = ironEligible(input)
  while (state.earlyTraining.iron.stage < 18) state = ironStep(state)
  return state
}
export function refiningInput(state: GameState): RefiningAction {
  const scene = refiningScenes[state.earlyTraining.refining.stage]
  return { ...state.earlyTraining.refining, expectedLedger: marketTradeLedger(state), expectedIron: { ...state.earlyTraining.iron },
    teacherPosition: { ...ironPlaces.teacher }, actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive' }
}
export function refiningStep(state: GameState): GameState {
  const result = advanceEarlyRefining(state, refiningWater, refiningInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
