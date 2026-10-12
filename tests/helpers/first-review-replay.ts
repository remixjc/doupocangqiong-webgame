import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { advanceFirstTraining } from '../../src/core/first-training'
import { firstReviewScenes } from '../../src/content/first-review'
import { firstTrainingInput, firstTrainingEligible, firstTrainingStep } from './first-training-replay'
import { parseSave, serializeSave } from '../../src/core/save'
export function firstReviewEligible(input?: GameState): GameState {
  let state = firstTrainingEligible(input)
  while (state.earlyTraining.firstTraining.stage < 10) state = firstTrainingStep(state)
  return state
}
export function firstReviewInput(state: GameState) {
  const scene = firstReviewScenes[state.earlyTraining.firstTraining.stage - 10]
  return { ...firstTrainingInput(state), actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'review-archive' }
}
export function firstReviewStep(state: GameState): GameState {
  const result = advanceFirstTraining(state, { x: 160, y: 370 }, firstReviewInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
