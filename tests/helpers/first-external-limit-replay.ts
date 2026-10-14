import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { advanceFirstExternalLimit, type FirstExternalLimitAction } from '../../src/core/first-external-limit'
import { earlySnapshots, externalLimitSnapshotKeys } from '../../src/core/early-snapshots'
import { firstExternalLimitScenes } from '../../src/content/first-external-limit'
import { firstExternalTrainingEligible, firstExternalTrainingStep } from './first-external-training-replay'
export function firstExternalLimitEligible(input?: GameState): GameState {
  let state = firstExternalTrainingEligible(input)
  while (state.earlyTraining.firstExternalTraining.stage < 10) state = firstExternalTrainingStep(state)
  return state
}
export function firstExternalLimitInput(state: GameState): FirstExternalLimitAction {
  const t = state.earlyTraining.firstExternalLimit, scene = firstExternalLimitScenes[t.stage]
  return { ...t, ...earlySnapshots(state, externalLimitSnapshotKeys),
    actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive' }
}
export function firstExternalLimitStep(state: GameState): GameState {
  const t = state.earlyTraining.firstExternalLimit, action = firstExternalLimitInput(state)
  const result = advanceFirstExternalLimit(state, action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t, t.location, action)
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
