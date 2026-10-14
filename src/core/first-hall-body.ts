import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { firstHallTransmissionBlock, type FirstHallTransmissionAction } from './first-hall-transmission'
import type { FirstHallTransmissionState } from './first-hall-transmission-state'
import { earlySnapshotsMatch, hallBodySnapshotKeys, hasHallMode } from './early-snapshots'
import { rejectTransaction, successfulTransaction, submitEarlyTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import { firstHallBodyAt, validFirstHallBody, type FirstHallBodyState } from './first-hall-body-state'
import { firstHallBodyScenes } from '../content/first-hall-body'
export type FirstHallBodyAction = Omit<FirstHallTransmissionAction, keyof FirstHallTransmissionState> & FirstHallBodyState & {
  expectedTransmission: FirstHallTransmissionState
}
export function firstHallBodyBlock(state: GameState): string {
  return firstHallTransmissionBlock(state) || (state.earlyTraining.firstHallTransmission.stage === 6 ? '' : '先归档额前传授与知识说明。')
}
export function advanceFirstHallBody(state: GameState, p: EarlyWalkPosition, space: string, action: FirstHallBodyAction): Transaction {
  const fail = rejectTransaction(state), t = state.earlyTraining.firstHallBody, source = state.earlyTraining.firstHallTransmission.record
  const scene = firstHallBodyScenes[t.stage]
  if (firstHallBodyBlock(state) || source === 'none' || !scene || !validFirstHallBody(t) || t.stage && t.record !== source
    || !fieldsMatch(action, t) || !earlySnapshotsMatch(state, action, hallBodySnapshotKeys)
    || action.actor !== scene.actor || action.operation !== scene.operation || space !== t.location
    || !fieldsMatch(p, action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : { x: t.x, y: t.y }) || hasHallMode(action))
    return fail('按本步人物、房中原位与身体问答断点继续。')
  const next = structuredClone(state), body = firstHallBodyAt(t.stage + 1, source)
  next.earlyTraining.firstHallBody = body
  // The compressed ledger records explanations, never qualification or actual training.
  if (body.restricted) next.earlyTraining.teaching.stage = Math.max(next.earlyTraining.teaching.stage, body.stage === 7 ? 5 : 4)
  return successfulTransaction(next, '身体问答已保存，实际训练与使用另续。')
}
export function submitFirstHallBody(store: GameStore, p: EarlyWalkPosition, space: string, action: FirstHallBodyAction): boolean {
  return submitEarlyTransaction(store, advanceFirstHallBody, [p, space, action], ['firstHallBody', 'teaching'])
}
