import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { firstHallGrantBlock, type FirstHallGrantAction } from './first-hall-grant'
import type { FirstHallGrantState } from './first-hall-grant-state'
import { earlySnapshotsMatch, hallTransmissionSnapshotKeys, hasHallMode } from './early-snapshots'
import { rejectTransaction, successfulTransaction, submitEarlyTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import { firstHallTransmissionAt, validFirstHallTransmission, transmissionRoute, type FirstHallTransmissionState } from './first-hall-transmission-state'
import { firstHallTransmissionScenes } from '../content/first-hall-transmission'
export type FirstHallTransmissionAction = Omit<FirstHallGrantAction, keyof FirstHallGrantState> & FirstHallTransmissionState & {
  expectedGrant: FirstHallGrantState
}
export function firstHallTransmissionBlock(state: GameState): string {
  return firstHallGrantBlock(state) || (state.earlyTraining.firstHallGrant.stage === 7 ? '' : '先归档老师认可与使用条件。')
}
export function advanceFirstHallTransmission(state: GameState, p: EarlyWalkPosition, space: string, action: FirstHallTransmissionAction): Transaction {
  const fail = rejectTransaction(state), t = state.earlyTraining.firstHallTransmission, source = state.earlyTraining.firstHallGrant.record
  const scene = firstHallTransmissionScenes[t.stage], moving = t.stage === 1 && t.walk < 2
  if (firstHallTransmissionBlock(state) || source === 'none' || !scene || !validFirstHallTransmission(t)
    || t.stage && t.record !== source || !fieldsMatch(action, t)
    || !earlySnapshotsMatch(state, action, hallTransmissionSnapshotKeys) || space !== t.location
    || action.actor !== (moving ? 'teacher' : scene.actor)
    || !fieldsMatch(p, action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : { x: t.x, y: t.y })
    || action.operation !== (moving ? `move-${transmissionRoute[t.walk]}` : scene.operation) || hasHallMode(action))
    return fail('先依人物与独立路步完成本次额前传授。')
  const next = structuredClone(state)
  next.earlyTraining.firstHallTransmission = firstHallTransmissionAt(moving ? t.stage : t.stage + 1, moving ? t.walk + 1 : 0, source)
  // Only actual information receipt covers the old compressed knowledge step.
  if (next.earlyTraining.firstHallTransmission.received)
    next.earlyTraining.teaching.stage = Math.max(next.earlyTraining.teaching.stage, 3)
  return successfulTransaction(next, '本次传授断点已保存，知识与身体合格、实际使用分别记录。')
}
export function submitFirstHallTransmission(store: GameStore, p: EarlyWalkPosition, space: string, action: FirstHallTransmissionAction): boolean {
  return submitEarlyTransaction(store, advanceFirstHallTransmission, [p, space, action], ['firstHallTransmission', 'teaching'])
}
