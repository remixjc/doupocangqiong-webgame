import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import { earlySupervisionBlock } from './early-supervision'
import type { EarlyWalkPosition } from './early-walk'
import { recoveryEnergyAt, type EarlyTrainingState } from './early-training-state'
import { earlyRecoveryScenes } from '../content/early-recovery'

export type EarlyRecoveryStation = typeof earlyRecoveryScenes[number]['station']
export type EarlyRecoveryAction = { step: number; energy: EarlyTrainingState['recovery']['energy'];
  operation: typeof earlyRecoveryScenes[number]['operation']; marker?: number }
export function earlyRecoveryBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlySupervisionBlock(state, position)
    || (state.earlyTraining.supervision.stage !== 2 ? '先在后山完成本轮督练，再回房恢复。' : '')
}
export function advanceEarlyRecovery(state: GameState, position: EarlyWalkPosition, station: EarlyRecoveryStation, action: EarlyRecoveryAction): Transaction {
  const blocked = earlyRecoveryBlock(state, position)
  if (blocked) return { state, ok: false, message: blocked }
  const task = state.earlyTraining.recovery, scene = earlyRecoveryScenes[task.stage]
  if (!scene || action.step !== task.stage || action.energy !== task.energy || action.operation !== scene.operation)
    return { state, ok: false, message: '恢复记录已变化，请按当前步骤继续。' }
  if (station !== scene.station) return { state, ok: false, message: '请到当前恢复步骤对应的房间位置。' }
  if (scene.operation === 'breathe' || scene.operation === 'rest') {
    if (typeof action.marker !== 'number' || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1)
      return { state, ok: false, message: '调息输入无效，药力与步骤保留。' }
    if (action.marker < .35 || action.marker > .65)
      return { state, ok: false, message: '先稳住呼吸，再免费尝试；药力与步骤保留。' }
  }
  const next = structuredClone(state), updated = next.earlyTraining.recovery
  updated.stage++; updated.energy = recoveryEnergyAt(updated.stage)
  updated.period = updated.stage >= 6 ? 'reviewed' : 'unreviewed'
  updated.result = updated.stage === 7 ? 'fifth-duan' : 'none'
  return { state: next, ok: true, message: updated.stage === 7
    ? '恢复、持续时段回顾与五段故事结果已记下。后续修炼另筹材料。'
    : '这一段恢复已记下，已有容器和准备收据保留。' }
}
export function submitEarlyRecovery(store: GameStore, position: EarlyWalkPosition, station: EarlyRecoveryStation, action: EarlyRecoveryAction): boolean {
  const result = advanceEarlyRecovery(store.getSnapshot().state, position, station, action)
  return commitEarlyResult(store, result)
}
