import { submitEarlyTransaction } from './early-result'
import { failedTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import { earlySupervisionBlock } from './early-supervision'
import { firstExternalLimitBlock } from './first-external-limit'
import { isVisible } from './rules'
import { nearbyEarlyWalkPlace, type EarlyWalkPosition } from './early-walk'
import { recoveryEnergyAt, type EarlyTrainingState } from './early-training-state'
import { earlyRecoveryScenes } from '../content/early-recovery'

export type EarlyRecoveryStation = typeof earlyRecoveryScenes[number]['station']
export type EarlyRecoveryAction = { step: number; energy: EarlyTrainingState['recovery']['energy'];
  operation: typeof earlyRecoveryScenes[number]['operation']; marker?: number }
export function earlyRecoveryBlock(state: GameState, position: EarlyWalkPosition): string {
  // Detailed training never fabricates completion of the older practice ledger.
  return (state.earlyTraining.firstExternalLimit.stage === 8
    ? firstExternalLimitBlock(state)
      || (!isVisible(state, 3) ? '后续恢复超出当前剧透范围。' : '')
      || (nearbyEarlyWalkPlace(position)?.id !== 'teacher' ? '先走近原有盛水容器，再回房恢复。' : '')
    : earlySupervisionBlock(state, position))
    || (state.earlyTraining.firstExternalLimit.stage > 0 && state.earlyTraining.firstExternalLimit.stage < 8
      ? '先完成山后限度说明与离林，再回房恢复。' : '')
    || (state.earlyTraining.supervision.stage !== 2 ? '先在后山完成本轮督练，再回房恢复。' : '')
}
export function advanceEarlyRecovery(state: GameState, position: EarlyWalkPosition, station: EarlyRecoveryStation, action: EarlyRecoveryAction): Transaction {
  const blocked = earlyRecoveryBlock(state, position)
  if (blocked) return failedTransaction(state, blocked)
  const task = state.earlyTraining.recovery, scene = earlyRecoveryScenes[task.stage]
  if (!scene || action.step !== task.stage || action.energy !== task.energy || action.operation !== scene.operation)
    return failedTransaction(state, '恢复记录已变化，请按当前步骤继续。')
  if (station !== scene.station) return failedTransaction(state, '请到当前恢复步骤对应的房间位置。')
  if (scene.operation === 'breathe' || scene.operation === 'rest') {
    if (typeof action.marker !== 'number' || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1)
      return failedTransaction(state, '调息输入无效，药力与步骤保留。')
    if (action.marker < .35 || action.marker > .65)
      return failedTransaction(state, '先稳住呼吸，再免费尝试；药力与步骤保留。')
  }
  const next = structuredClone(state), updated = next.earlyTraining.recovery
  updated.stage++; updated.energy = recoveryEnergyAt(updated.stage)
  updated.period = updated.stage >= 6 ? 'reviewed' : 'unreviewed'
  updated.result = updated.stage === 7 ? 'fifth-duan' : 'none'
  return successfulTransaction(next, updated.stage === 7
    ? '恢复、持续时段回顾与五段故事结果已记下。后续修炼另筹材料。'
    : '这一段恢复已记下，已有容器和准备收据保留。')
}
export function submitEarlyRecovery(store: GameStore, position: EarlyWalkPosition, station: EarlyRecoveryStation, action: EarlyRecoveryAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyRecovery, [position, station, action])
}
