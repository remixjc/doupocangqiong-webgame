import { failedTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import { earlyGrowthBlock } from './early-growth'
import { nearbyEarlyWalkPlace, type EarlyWalkPosition } from './early-walk'
import { earlyTeachingScenes } from '../content/early-teaching'

export type EarlyTeachingStation = 'table' | 'teacher'
export type EarlyTeachingAction = { step: number; operation: typeof earlyTeachingScenes[number]['operation'] }
export function earlyTeachingBlock(state: GameState): string {
  return earlyGrowthBlock(state)
    || (state.earlyTraining.hall.stage !== 9 || state.earlyTraining.hall.scroll !== 'borrowed-second'
      ? '先完成斗技堂借阅登记和离堂回房，再请老师正式传技。' : '')
}
export function earlyTeachingRoomBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyTeachingBlock(state)
    || (nearbyEarlyWalkPlace(position)?.id !== 'teacher' ? '先走近药老处，再回房请老师传技。' : '')
}
export function advanceEarlyTeaching(state: GameState, position: EarlyWalkPosition, station: EarlyTeachingStation, action: EarlyTeachingAction): Transaction {
  const blocked = earlyTeachingRoomBlock(state, position)
  if (blocked) return failedTransaction(state, blocked)
  const scene = earlyTeachingScenes[state.earlyTraining.teaching.stage]
  if (!scene || action.step !== scene.step || action.operation !== scene.operation)
    return failedTransaction(state, '老师传技记录已变化，请按当前步骤继续。')
  if (station !== scene.station) return failedTransaction(state, '先到当前步骤对应的房间位置。')
  const next = structuredClone(state)
  next.earlyTraining.teaching.stage++
  return successfulTransaction(next, scene.step === 4 ? '正式传技已归档，知识与身体要求已记下；后续监督训练另行继续。' : '传技这一步已记下，主线战斗能力保持。')
}
export function submitEarlyTeaching(store: GameStore, position: EarlyWalkPosition, station: EarlyTeachingStation, action: EarlyTeachingAction): boolean {
  const result = advanceEarlyTeaching(store.getSnapshot().state, position, station, action)
  return commitEarlyResult(store, result)
}
