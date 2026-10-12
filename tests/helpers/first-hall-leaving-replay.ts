import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstHallCheckoutEligible, firstHallCheckoutStep } from './first-hall-checkout-replay'
import { firstHallApproachInput } from './first-hall-approach-replay'
import { advanceFirstHallApproach, firstHallExitResponsePosition } from '../../src/core/first-hall-approach'
import { firstHallLeavingScenes } from '../../src/content/first-hall-approach'
export function firstHallLeavingEligible(input?: GameState): GameState {
  let state = firstHallCheckoutEligible(input)
  while (state.earlyTraining.firstHallApproach.stage < 49) state = firstHallCheckoutStep(state)
  return state
}
export function firstHallLeavingInput(state: GameState) {
  const scene = firstHallLeavingScenes[state.earlyTraining.firstHallApproach.stage - 49]
  return { ...firstHallApproachInput(state), leaving: true, actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive-leaving' }
}
export function firstHallLeavingStep(state: GameState): GameState {
  const task = state.earlyTraining.firstHallApproach
  const result = advanceFirstHallApproach(state, firstHallExitResponsePosition(task), task.yan === 'outside' ? 'outside' : 'hall', firstHallLeavingInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
