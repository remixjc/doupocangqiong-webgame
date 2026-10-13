import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { advanceFirstHallScrollReview, type FirstHallScrollReviewAction } from '../../src/core/first-hall-scroll-review'
import { earlySnapshots, hallScrollReviewSnapshotKeys } from '../../src/core/early-snapshots'
import { firstHallScrollReviewScenes } from '../../src/content/first-hall-scroll-review'
import { scrollReviewRoute } from '../../src/core/first-hall-scroll-review-state'
import { firstHallTeacherEligible, firstHallTeacherStep } from './first-hall-teacher-replay'
export function firstHallScrollReviewEligible(input?: GameState): GameState {
  let state = firstHallTeacherEligible(input)
  while (state.earlyTraining.firstHallTeacher.stage < 7) state = firstHallTeacherStep(state)
  return state
}
export function firstHallScrollReviewInput(state: GameState): FirstHallScrollReviewAction {
  const t = state.earlyTraining.firstHallScrollReview, moving = t.stage === 0 && t.walk < 3, scene = firstHallScrollReviewScenes[t.stage]
  return { ...t, ...earlySnapshots(state, hallScrollReviewSnapshotKeys), actor: moving ? 'teacher' : scene?.actor ?? 'yan',
    operation: moving ? `move-${scrollReviewRoute[t.walk]}` : scene?.operation ?? 'archive' }
}
export function firstHallScrollReviewStep(state: GameState): GameState {
  const t = state.earlyTraining.firstHallScrollReview, action = firstHallScrollReviewInput(state)
  const p = action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t
  const result = advanceFirstHallScrollReview(state, p, t.location, action)
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
