import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { advanceFirstHallTeacher, type FirstHallTeacherAction } from '../../src/core/first-hall-teacher'
import { earlySnapshots, hallTeacherSnapshotKeys } from '../../src/core/early-snapshots'
import { firstHallTeacherScenes } from '../../src/content/first-hall-teacher'
import { firstHallEveningEligible, firstHallEveningStep } from './first-hall-evening-replay'
export function firstHallTeacherEligible(input?: GameState): GameState {
  let state = firstHallEveningEligible(input)
  while (state.earlyTraining.firstHallEvening.stage < 9) state = firstHallEveningStep(state)
  return state
}
export function firstHallTeacherInput(state: GameState): FirstHallTeacherAction {
  const t = state.earlyTraining.firstHallTeacher, scene = firstHallTeacherScenes[t.stage]
  return { ...t, ...earlySnapshots(state, hallTeacherSnapshotKeys), actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive' }
}
export function firstHallTeacherStep(state: GameState): GameState {
  const t = state.earlyTraining.firstHallTeacher, result = advanceFirstHallTeacher(state, t, t.location, firstHallTeacherInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
