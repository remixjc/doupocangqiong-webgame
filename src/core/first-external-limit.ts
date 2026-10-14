import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { firstExternalTrainingBlock } from './first-external-training'
import { firstExternalLimitAt, validFirstExternalLimit, type FirstExternalLimitState } from './first-external-limit-state'
import { firstExternalLimitScenes } from '../content/first-external-limit'
import { earlySnapshotsMatch, externalLimitSnapshotKeys, hasHallMode } from './early-snapshots'
import { fieldsMatch } from './state-guards'
import { rejectTransaction, submitEarlyTransaction, successfulTransaction } from './early-result'
export type FirstExternalLimitAction = FirstExternalLimitState & {
  actor: 'yan' | 'teacher'
  operation: string
  expectedBody: GameState['earlyTraining']['firstHallBody']
  expectedSupervision: GameState['earlyTraining']['supervision']
  expectedExternalTraining: GameState['earlyTraining']['firstExternalTraining']
}
export function firstExternalLimitBlock(state: GameState): string {
  return firstExternalTrainingBlock(state)
    || (state.earlyTraining.firstExternalTraining.stage === 10 ? '' : '先记录本次山后受击与反应。')
}
export function advanceFirstExternalLimit(state: GameState, p: EarlyWalkPosition, space: string, action: FirstExternalLimitAction): Transaction {
  const fail = rejectTransaction(state), t = state.earlyTraining.firstExternalLimit, scene = firstExternalLimitScenes[t.stage]
  const prior = t.stage ? t.priorCompleted : state.earlyTraining.supervision.stage === 2
  const source = state.earlyTraining.firstExternalTraining.record === 'recalled' || prior ? 'recalled' : 'current'
  if (firstExternalLimitBlock(state) || !scene || !validFirstExternalLimit(t)
    || t.stage > 0 && t.record !== source
    || !fieldsMatch(action, t) || !earlySnapshotsMatch(state, action, externalLimitSnapshotKeys)
    || action.actor !== scene.actor || action.operation !== scene.operation || space !== t.location
    || hasHallMode(action) || !fieldsMatch(p, action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : { x: t.x, y: t.y }))
    return fail('按当前人物、山后位置与限度断点继续。')
  const next = structuredClone(state), limit = next.earlyTraining.firstExternalLimit
  next.earlyTraining.firstExternalLimit = firstExternalLimitAt(t.stage + 1, t.attempts, source, prior)
  if (limit.stage === 7 && next.earlyTraining.supervision.stage !== 2)
    next.earlyTraining.supervision = { ...next.earlyTraining.supervision, stage: 2, pulses: 4 }
  return successfulTransaction(next, '限度与离林记录已保存，回房恢复另续。')
}
export function submitFirstExternalLimit(store: GameStore, p: EarlyWalkPosition, space: string, action: FirstExternalLimitAction): boolean {
  return submitEarlyTransaction(store, advanceFirstExternalLimit, [p, space, action], ['firstExternalLimit', 'supervision'])
}
