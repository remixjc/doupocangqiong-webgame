import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { advanceFirstTraining, type FirstTrainingAction } from '../../src/core/first-training'
import { firstTrainingScenes } from '../../src/content/first-training'
import { ironPlaces } from '../../src/core/early-iron'
import { refiningWater } from '../../src/core/early-refining'
import { marketTradeLedger } from '../../src/core/early-market-trade'
import { refiningEligible, refiningStep } from './refining-replay'
export function firstTrainingEligible(input?: GameState): GameState {
  let state = refiningEligible(input)
  while (state.earlyTraining.refining.stage < 22) state = refiningStep(state)
  return state
}
export function firstTrainingInput(state: GameState, marker = .5): FirstTrainingAction {
  const t = state.earlyTraining, task = t.firstTraining
  return { ...task, expectedLedger: marketTradeLedger(state), expectedRefining: { ...t.refining },
    expectedPractice: { ...t.practice }, expectedRecovery: { ...t.recovery }, teacherPosition: { ...ironPlaces.teacher },
    actor: 'yan', operation: firstTrainingScenes[task.stage]?.operation ?? 'archive', marker: task.stage === 2 ? marker : undefined }
}
export function firstTrainingPosition(state: GameState) {
  return state.earlyTraining.firstTraining.stage <= 6 ? refiningWater : { x: 160, y: 370 }
}
export function firstTrainingStep(state: GameState, marker = .5): GameState {
  const result = advanceFirstTraining(state, firstTrainingPosition(state), firstTrainingInput(state, marker))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
