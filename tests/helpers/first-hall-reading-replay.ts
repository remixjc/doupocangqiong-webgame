import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstHallEntryEligible, firstHallEntryInput, firstHallEntryStep } from './first-hall-entry-replay'
import { advanceFirstHallReading, hallReadingPlaces, type FirstHallReadingAction } from '../../src/core/first-hall-reading'
import { firstHallReadingScenes } from '../../src/content/first-hall-reading'
export function firstHallReadingEligible(input?: GameState): GameState {
  let state = firstHallEntryEligible(input)
  while (state.earlyTraining.firstHallEntry.stage < 9) state = firstHallEntryStep(state)
  return state
}
export function firstHallReadingInput(state: GameState): FirstHallReadingAction {
  return { ...firstHallEntryInput(state), ...state.earlyTraining.firstHallReading,
    expectedEntry: { ...state.earlyTraining.firstHallEntry },
    operation: firstHallReadingScenes[state.earlyTraining.firstHallReading.stage]?.operation ?? 'archive' }
}
export function firstHallReadingStep(state: GameState): GameState {
  const result = advanceFirstHallReading(state, hallReadingPlaces.shelf, 'hall', firstHallReadingInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
