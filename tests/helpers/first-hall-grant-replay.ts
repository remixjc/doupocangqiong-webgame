import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { advanceFirstHallGrant, type FirstHallGrantAction } from '../../src/core/first-hall-grant'
import { earlySnapshots, hallGrantSnapshotKeys } from '../../src/core/early-snapshots'
import { firstHallGrantScenes } from '../../src/content/first-hall-grant'
import { firstHallScrollReviewEligible, firstHallScrollReviewStep } from './first-hall-scroll-review-replay'
export function firstHallGrantEligible(input?: GameState): GameState {
  let state = firstHallScrollReviewEligible(input)
  while (state.earlyTraining.firstHallScrollReview.stage < 9) state = firstHallScrollReviewStep(state)
  return state
}
export function firstHallGrantInput(state: GameState): FirstHallGrantAction {
  const t = state.earlyTraining.firstHallGrant, scene = firstHallGrantScenes[t.stage]
  return { ...t, ...earlySnapshots(state, hallGrantSnapshotKeys), actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive' }
}
export function firstHallGrantStep(state: GameState): GameState {
  const t = state.earlyTraining.firstHallGrant, action = firstHallGrantInput(state)
  const p = action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t
  const result = advanceFirstHallGrant(state, p, t.location, action)
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
