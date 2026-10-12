import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstHallExitResponseEligible, firstHallExitResponseStep } from './first-hall-exit-response-replay'
import { firstHallApproachInput } from './first-hall-approach-replay'
import { advanceFirstHallApproach, firstHallExitResponsePosition } from '../../src/core/first-hall-approach'
import { firstHallCheckoutScenes } from '../../src/content/first-hall-approach'
export function firstHallCheckoutEligible(input?: GameState): GameState {
  let state = firstHallExitResponseEligible(input)
  while (state.earlyTraining.firstHallApproach.stage < 46) state = firstHallExitResponseStep(state)
  return state
}
export function firstHallCheckoutInput(state: GameState) {
  const scene = firstHallCheckoutScenes[state.earlyTraining.firstHallApproach.stage - 46]
  return { ...firstHallApproachInput(state), checkout: true, actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive-checkout' }
}
export function firstHallCheckoutStep(state: GameState): GameState {
  const result = advanceFirstHallApproach(state, firstHallExitResponsePosition(state.earlyTraining.firstHallApproach), 'hall', firstHallCheckoutInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
