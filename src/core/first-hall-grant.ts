import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import type { FirstHallScrollReviewAction } from './first-hall-scroll-review'
import type { FirstHallScrollReviewState } from './first-hall-scroll-review-state'
import { firstHallScrollReviewBlock } from './first-hall-scroll-review'
import { earlySnapshotsMatch, hallGrantSnapshotKeys, hasHallMode } from './early-snapshots'
import { rejectTransaction, successfulTransaction, submitEarlyTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import { firstHallGrantAt, validFirstHallGrant, type FirstHallGrantState } from './first-hall-grant-state'
import { firstHallGrantScenes } from '../content/first-hall-grant'
export type FirstHallGrantAction = Omit<FirstHallScrollReviewAction, keyof FirstHallScrollReviewState> & FirstHallGrantState & {
  expectedScrollReview: FirstHallScrollReviewState
  expectedTeaching: GameState['earlyTraining']['teaching']
}
export function firstHallGrantBlock(state: GameState): string {
  return firstHallScrollReviewBlock(state) || (state.earlyTraining.firstHallScrollReview.stage === 9 ? '' : '先归档同一借卷翻看与眼前求技。')
}
export function advanceFirstHallGrant(state: GameState, p: EarlyWalkPosition, space: string, action: FirstHallGrantAction): Transaction {
  const fail = rejectTransaction(state), t = state.earlyTraining.firstHallGrant, source = state.earlyTraining.firstHallScrollReview.record
  const scene = firstHallGrantScenes[t.stage]
  if (firstHallGrantBlock(state) || source === 'none' || !scene || !validFirstHallGrant(t) || t.stage && t.record !== source
    || !fieldsMatch(action, t) || !earlySnapshotsMatch(state, action, hallGrantSnapshotKeys)
    || action.actor !== scene.actor || action.operation !== scene.operation || space !== t.location
    || !fieldsMatch(p, action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : { x: t.x, y: t.y }) || hasHallMode(action))
    return fail('按本步人物、原位与认可条件断点继续。')
  const next = structuredClone(state)
  next.earlyTraining.firstHallGrant = firstHallGrantAt(t.stage + 1, source)
  // Actual review, explicit request and the teacher's agreement cover only ledger steps 0–1.
  next.earlyTraining.teaching.stage = Math.max(next.earlyTraining.teaching.stage, 2)
  return successfulTransaction(next, '认可与条件已保存，额前传授与身体训练仍待继续。')
}
export function submitFirstHallGrant(store: GameStore, p: EarlyWalkPosition, space: string, action: FirstHallGrantAction): boolean {
  return submitEarlyTransaction(store, advanceFirstHallGrant, [p, space, action], ['firstHallGrant', 'teaching'])
}
