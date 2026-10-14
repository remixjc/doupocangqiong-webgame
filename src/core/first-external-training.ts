import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import type { FirstHallBodyAction } from './first-hall-body'
import type { FirstHallBodyState } from './first-hall-body-state'
import { firstHallBodyBlock } from './first-hall-body'
import { firstExternalTrainingAt, validFirstExternalTraining, type FirstExternalTrainingState } from './first-external-training-state'
import { firstExternalTrainingScenes } from '../content/first-external-training'
import { earlySnapshotsMatch, externalTrainingSnapshotKeys, hasHallMode } from './early-snapshots'
import { fieldsMatch } from './state-guards'
import { rejectTransaction, submitEarlyTransaction, successfulTransaction } from './early-result'
export type FirstExternalTrainingAction = Omit<FirstHallBodyAction, keyof FirstHallBodyState> & FirstExternalTrainingState & {
  expectedBody: FirstHallBodyState
  expectedSupervision: GameState['earlyTraining']['supervision']
  marker?: number
}
export function firstExternalTrainingBlock(state: GameState): string {
  return firstHallBodyBlock(state) || (state.earlyTraining.firstHallBody.stage === 7 ? '' : '先归档身体限制与增强问答。')
}
export function advanceFirstExternalTraining(state: GameState, p: EarlyWalkPosition, space: string, action: FirstExternalTrainingAction): Transaction {
  const fail = rejectTransaction(state), t = state.earlyTraining.firstExternalTraining, scene = firstExternalTrainingScenes[t.stage]
  const body = state.earlyTraining.firstHallBody, prior = t.stage ? t.priorCompleted : state.earlyTraining.supervision.stage === 2
  const source = body.record === 'recalled' || prior ? 'recalled' : 'current'
  if (firstExternalTrainingBlock(state) || body.record === 'none' || !scene || !validFirstExternalTraining(t)
    || t.stage > 0 && t.record !== source || t.priorCompleted && state.earlyTraining.supervision.stage !== 2
    || !fieldsMatch(action, t) || !earlySnapshotsMatch(state, action, externalTrainingSnapshotKeys)
    || action.actor !== scene.actor || action.operation !== scene.operation || space !== t.location || hasHallMode(action)
    || !fieldsMatch(p, action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : { x: t.x, y: t.y }))
    return fail('按当前人物、山后独立位置与受击断点继续。')
  let missed = false
  if (scene.operation === 'steady') {
    if (typeof action.marker !== 'number' || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1)
      return fail('站稳标记无效，原断点保持。')
    missed = action.marker < .35 || action.marker > .65
    if (missed && t.attempts === 1_000_000) return fail('免费重试记录已到上限。')
  }
  const next = structuredClone(state)
  next.earlyTraining.firstExternalTraining = firstExternalTrainingAt(t.stage + (missed ? 0 : 1),
    t.attempts + (missed ? 1 : 0), source, prior)
  return successfulTransaction(next, missed ? '姿态尚未稳住，可免费再试；旧账和物资保持。' : '本次受击现场已保存，整轮限度与恢复另续。')
}
export function submitFirstExternalTraining(store: GameStore, p: EarlyWalkPosition, space: string, action: FirstExternalTrainingAction): boolean {
  return submitEarlyTransaction(store, advanceFirstExternalTraining, [p, space, action], 'firstExternalTraining')
}
