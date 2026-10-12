import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstReviewEligible, firstReviewStep } from './first-review-replay'
import { firstTechniqueScenes } from '../../src/content/first-technique'
import { firstTechniqueBed, advanceFirstTechnique, type FirstTechniqueAction } from '../../src/core/first-technique'
import { ironPlaces } from '../../src/core/early-iron'
import { marketTradeLedger } from '../../src/core/early-market-trade'
export function firstTechniqueEligible(input?: GameState): GameState {
  let state = firstReviewEligible(input)
  while (state.earlyTraining.firstTraining.stage < 17) state = firstReviewStep(state)
  return state
}
export function firstTechniqueInput(state: GameState): FirstTechniqueAction {
  const t = state.earlyTraining
  return { ...t.firstTechnique, expectedTraining: { ...t.firstTraining }, expectedIron: { ...t.iron },
    expectedLedger: marketTradeLedger(state), expectedPractice: { ...t.practice }, expectedRecovery: { ...t.recovery },
    teacherPosition: { ...ironPlaces.teacher }, actor: 'yan', operation: firstTechniqueScenes[t.firstTechnique.stage]?.operation ?? 'archive' }
}
export function firstTechniqueStep(state: GameState): GameState {
  const result = advanceFirstTechnique(state, firstTechniqueBed, firstTechniqueInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
