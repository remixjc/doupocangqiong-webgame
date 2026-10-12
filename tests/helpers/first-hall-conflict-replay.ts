import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstHallFirstReturnEligible, firstHallFirstReturnStep } from './first-hall-first-return-replay'
import { firstHallApproachInput } from './first-hall-approach-replay'
import { advanceFirstHallApproach } from '../../src/core/first-hall-approach'
import { firstHallConflictScenes } from '../../src/content/first-hall-approach'
import { hallReadingPlaces } from '../../src/core/first-hall-reading'

export function firstHallConflictEligible(input?: GameState): GameState {
  let state = firstHallFirstReturnEligible(input)
  while (state.earlyTraining.firstHallApproach.stage < 19) state = firstHallFirstReturnStep(state)
  return state
}
export function firstHallConflictInput(state: GameState) {
  const scene = firstHallConflictScenes[state.earlyTraining.firstHallApproach.stage - 19]
  return { ...firstHallApproachInput(state), conflict: true, actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive-conflict' }
}
export function firstHallConflictStep(state: GameState): GameState {
  const result = advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', firstHallConflictInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
