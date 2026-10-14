import type { GameState } from './model'
import type { GameStore } from './store'
import type { EarlyWalkPosition } from './early-walk'
import { firstRecoveryBlock, type FirstRecoveryAction } from './first-recovery'
import type { FirstRecoveryState } from './first-recovery-state'
import { firstAwakeningAt, firstAwakeningMinimum, validFirstAwakening, type FirstAwakeningState } from './first-awakening-state'
import { firstAwakeningScenes } from '../content/first-awakening'
import { earlySnapshotsMatch, awakeningSnapshotKeys, hasHallMode } from './early-snapshots'
import { fieldsMatch } from './state-guards'
import { recoveryEnergyAt } from './early-training-state'
import { rejectTransaction, successfulTransaction, submitEarlyTransaction } from './early-result'
export type FirstAwakeningAction = Omit<FirstRecoveryAction, keyof FirstRecoveryState> & FirstAwakeningState & { expectedFirstRecovery: FirstRecoveryState }
export function firstAwakeningBlock(state: GameState, position: EarlyWalkPosition): string {
  return firstRecoveryBlock(state, position)
    || (state.earlyTraining.firstRecovery.stage !== 11 ? '先沿同液恢复逐步醒来，再记醒后动作。' : '')
}
export function advanceFirstAwakening(state: GameState, entrance: EarlyWalkPosition, p: EarlyWalkPosition, space: string, action: FirstAwakeningAction) {
  const fail = rejectTransaction(state), t = state.earlyTraining.firstAwakening, scene = firstAwakeningScenes[t.stage]
  const prior = t.stage ? t.priorStage : state.earlyTraining.recovery.stage
  const source = prior > 3 || state.earlyTraining.firstRecovery.record === 'recalled' ? 'recalled' : 'current'
  if (firstAwakeningBlock(state, entrance) || !scene || !validFirstAwakening(t)
    || t.stage > 0 && t.record !== source
    || !fieldsMatch(action, t) || !earlySnapshotsMatch(state, action, awakeningSnapshotKeys)
    || action.actor !== 'yan' || action.operation !== scene.operation
    || space !== t.location || !fieldsMatch(p, { x: t.x, y: t.y }) || hasHallMode(action))
    return fail('按本人、同一房间位置与醒后断点继续。')
  const next = structuredClone(state), updated = firstAwakeningAt(t.stage + 1, source, prior)
  next.earlyTraining.firstAwakening = updated
  const recovery = next.earlyTraining.recovery, minimum = firstAwakeningMinimum(updated.stage)
  if (recovery.stage < minimum) {
    recovery.stage = minimum
    recovery.energy = recoveryEnergyAt(minimum)
    recovery.period = minimum >= 6 ? 'reviewed' : 'unreviewed'
    recovery.result = minimum === 7 ? 'fifth-duan' : 'none'
  }
  return successfulTransaction(next, '醒后断点已保存，原物资与主线奖励保持。')
}
export function submitFirstAwakening(store: GameStore, entrance: EarlyWalkPosition, p: EarlyWalkPosition, space: string, action: FirstAwakeningAction): boolean {
  return submitEarlyTransaction(store, advanceFirstAwakening, [entrance, p, space, action], ['firstAwakening', 'recovery'])
}
