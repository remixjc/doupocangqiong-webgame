import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstHallMatchEligible, firstHallMatchInput, firstHallMatchStep } from './first-hall-match-replay'
import { advanceFirstHallMatch } from '../../src/core/first-hall-match'
import { hallReadingPlaces } from '../../src/core/first-hall-reading'
export function firstHallReturnEligible(input?: GameState): GameState {
  let state = firstHallMatchEligible(input)
  while (state.earlyTraining.firstHallMatch.stage < 12) state = firstHallMatchStep(state)
  return state
}
export function firstHallReturnStep(state: GameState): GameState {
  const result = advanceFirstHallMatch(state, hallReadingPlaces.shelf, 'hall', { ...firstHallMatchInput(state), continuation: true })
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
