import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstHallConflictEligible, firstHallConflictStep } from './first-hall-conflict-replay'
import { firstHallApproachInput } from './first-hall-approach-replay'
import { advanceFirstHallApproach } from '../../src/core/first-hall-approach'
import { firstHallThreatScenes } from '../../src/content/first-hall-approach'
import { hallReadingPlaces } from '../../src/core/first-hall-reading'

export function firstHallThreatEligible(input?: GameState): GameState {
  let state = firstHallConflictEligible(input)
  while (state.earlyTraining.firstHallApproach.stage < 31) state = firstHallConflictStep(state)
  return state
}
export function firstHallThreatInput(state: GameState) {
  const scene = firstHallThreatScenes[state.earlyTraining.firstHallApproach.stage - 31]
  return { ...firstHallApproachInput(state), threat: true, actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive-threat' }
}
export function firstHallThreatStep(state: GameState): GameState {
  const result = advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', firstHallThreatInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
