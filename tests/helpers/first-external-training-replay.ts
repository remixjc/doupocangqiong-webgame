import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { advanceFirstExternalTraining, type FirstExternalTrainingAction } from '../../src/core/first-external-training'
import { earlySnapshots, externalTrainingSnapshotKeys } from '../../src/core/early-snapshots'
import { firstExternalTrainingScenes } from '../../src/content/first-external-training'
import { firstHallBodyEligible, firstHallBodyStep } from './first-hall-body-replay'
export function firstExternalTrainingEligible(input?: GameState): GameState {
  let state = firstHallBodyEligible(input)
  while (state.earlyTraining.firstHallBody.stage < 7) state = firstHallBodyStep(state)
  return state
}
export function firstExternalTrainingInput(state: GameState): FirstExternalTrainingAction {
  const t = state.earlyTraining.firstExternalTraining, scene = firstExternalTrainingScenes[t.stage]
  return { ...t, ...earlySnapshots(state, externalTrainingSnapshotKeys),
    actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive', marker: .5 }
}
export function firstExternalTrainingStep(state: GameState): GameState {
  const t = state.earlyTraining.firstExternalTraining, action = firstExternalTrainingInput(state)
  const result = advanceFirstExternalTraining(state, action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t, t.location, action)
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
