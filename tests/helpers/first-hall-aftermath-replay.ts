import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstHallLeavingEligible, firstHallLeavingStep } from './first-hall-leaving-replay'
import { firstHallApproachInput } from './first-hall-approach-replay'
import { advanceFirstHallApproach, firstHallExitResponsePosition } from '../../src/core/first-hall-approach'
import { firstHallAftermathScenes } from '../../src/content/first-hall-approach'
export function firstHallAftermathEligible(input?: GameState): GameState {
  let state = firstHallLeavingEligible(input)
  while (state.earlyTraining.firstHallApproach.stage < 53) state = firstHallLeavingStep(state)
  return state
}
export function firstHallAftermathInput(state: GameState) {
  const scene = firstHallAftermathScenes[state.earlyTraining.firstHallApproach.stage - 53]
  return { ...firstHallApproachInput(state), aftermath: true, actor: scene?.actor ?? 'bystander', operation: scene?.operation ?? 'archive-aftermath' }
}
export function firstHallAftermathStep(state: GameState): GameState {
  const result = advanceFirstHallApproach(state, firstHallExitResponsePosition(state.earlyTraining.firstHallApproach), 'outside', firstHallAftermathInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
