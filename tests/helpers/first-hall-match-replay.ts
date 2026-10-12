import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstHallReadingEligible, firstHallReadingInput, firstHallReadingStep } from './first-hall-reading-replay'
import { advanceFirstHallMatch, type FirstHallMatchAction } from '../../src/core/first-hall-match'
import { hallReadingPlaces } from '../../src/core/first-hall-reading'
import { firstHallMatchScenes } from '../../src/content/first-hall-match'
export function firstHallMatchEligible(input?: GameState): GameState {
  let state = firstHallReadingEligible(input)
  while (state.earlyTraining.firstHallReading.stage < 8) state = firstHallReadingStep(state)
  return state
}
export function firstHallMatchInput(state: GameState): FirstHallMatchAction {
  const scene = firstHallMatchScenes[state.earlyTraining.firstHallMatch.stage]
  return { ...firstHallReadingInput(state), expectedMatch: { ...state.earlyTraining.firstHallMatch },
    actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive' }
}
export function firstHallMatchStep(state: GameState): GameState {
  const result = advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', firstHallMatchInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
