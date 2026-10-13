import { submitEarlyTransaction } from './early-result'
import { hasHallMode } from './early-snapshots'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { firstHallTeacherBlock, type FirstHallTeacherAction } from './first-hall-teacher'
import type { FirstHallTeacherState } from './first-hall-teacher-state'
import { earlySnapshotsMatch, hallScrollReviewSnapshotKeys } from './early-snapshots'
import { rejectTransaction, successfulTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import { firstHallScrollReviewAt, scrollReviewRoute, validFirstHallScrollReview, type FirstHallScrollReviewState } from './first-hall-scroll-review-state'
import { firstHallScrollReviewScenes } from '../content/first-hall-scroll-review'
export type FirstHallScrollReviewAction = Omit<FirstHallTeacherAction, keyof FirstHallTeacherState> & FirstHallScrollReviewState & {
  expectedTeacher: FirstHallTeacherState
}
export function firstHallScrollReviewBlock(state: GameState): string {
  return firstHallTeacherBlock(state) || (state.earlyTraining.firstHallTeacher.stage === 7 ? '' : '先归档房中现身与有限问答。')
}
export function advanceFirstHallScrollReview(state: GameState, p: EarlyWalkPosition, space: string, action: FirstHallScrollReviewAction): Transaction {
  const fail = rejectTransaction(state), t = state.earlyTraining.firstHallScrollReview, source = state.earlyTraining.firstHallTeacher.record
  const scene = firstHallScrollReviewScenes[t.stage], moving = t.stage === 0 && t.walk < 3
  if (firstHallScrollReviewBlock(state) || source === 'none' || !scene || !validFirstHallScrollReview(t)
    || (t.stage || t.walk) && t.record !== source || !fieldsMatch(action, t)
    || !earlySnapshotsMatch(state, action, hallScrollReviewSnapshotKeys) || space !== t.location
    || action.actor !== (moving ? 'teacher' : scene.actor)
    || !fieldsMatch(p, action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : { x: t.x, y: t.y })
    || action.operation !== (moving ? `move-${scrollReviewRoute[t.walk]}` : scene.operation)
    || hasHallMode(action))
    return fail('按本步人物、各自位置与同一借卷断点继续。')
  const next = structuredClone(state)
  next.earlyTraining.firstHallScrollReview = firstHallScrollReviewAt(moving ? t.stage : t.stage + 1, moving ? t.walk + 1 : 0, source)
  return successfulTransaction(next, '老师位置与同卷求技步骤已保存。')
}
export function submitFirstHallScrollReview(store: GameStore, p: EarlyWalkPosition, space: string, action: FirstHallScrollReviewAction): boolean {
  return submitEarlyTransaction(store, advanceFirstHallScrollReview, [p, space, action], 'firstHallScrollReview')
}
