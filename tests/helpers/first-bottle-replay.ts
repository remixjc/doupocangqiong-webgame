import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstTechniqueEligible, firstTechniqueInput, firstTechniqueStep } from './first-technique-replay'
import { advanceFirstTechnique, firstTechniqueBed } from '../../src/core/first-technique'
import { firstBottleScenes } from '../../src/content/first-bottle'
export function firstBottleEligible(input?: GameState): GameState {
  let state = firstTechniqueEligible(input)
  while (state.earlyTraining.firstTechnique.stage < 9) state = firstTechniqueStep(state)
  return state
}
export function firstBottleInput(state: GameState, marker = .5) {
  const task = state.earlyTraining.firstTechnique
  return { ...firstTechniqueInput(state), operation: firstBottleScenes[task.stage - 9]?.operation ?? 'bottle-archive',
    marker: task.stage === 11 ? marker : undefined }
}
export function firstBottleStep(state: GameState, marker = .5): GameState {
  const result = advanceFirstTechnique(state, firstTechniqueBed, firstBottleInput(state, marker))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
