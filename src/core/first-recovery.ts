import type { GameState } from './model'
import type { GameStore } from './store'
import type { EarlyWalkPosition } from './early-walk'
import { earlyRecoveryBlock } from './early-recovery'
import { firstRecoveryAt, firstRecoveryMinimum, validFirstRecovery, type FirstRecoveryState } from './first-recovery-state'
import { firstRecoveryScenes } from '../content/first-recovery'
import { earlySnapshotsMatch, externalLimitSnapshotKeys, hasHallMode } from './early-snapshots'
import type { FirstExternalLimitAction } from './first-external-limit'
import type { FirstExternalLimitState } from './first-external-limit-state'
import { fieldsMatch } from './state-guards'
import { recoveryEnergyAt } from './early-training-state'
import { rejectTransaction, successfulTransaction, submitEarlyTransaction } from './early-result'
export type FirstRecoveryAction = Omit<FirstExternalLimitAction, keyof FirstExternalLimitState> & FirstRecoveryState
export function firstRecoveryBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyRecoveryBlock(state, position)
    || (state.earlyTraining.firstExternalLimit.stage !== 8 ? '先归档限度与离林，再回房细分恢复。' : '')
}
export function advanceFirstRecovery(state: GameState, entrance: EarlyWalkPosition, p: EarlyWalkPosition, space: string, action: FirstRecoveryAction) {
  const fail = rejectTransaction(state), t = state.earlyTraining.firstRecovery, scene = firstRecoveryScenes[t.stage]
  const prior = t.stage ? t.priorStage : state.earlyTraining.recovery.stage
  const source = prior > 0 || state.earlyTraining.firstExternalLimit.record === 'recalled' ? 'recalled' : 'current'
  const moving = t.stage === 1 && t.walk < 4
  if (firstRecoveryBlock(state, entrance) || !scene || !validFirstRecovery(t)
    || t.stage > 0 && t.record !== source
    || !fieldsMatch(action, t) || !earlySnapshotsMatch(state, action, externalLimitSnapshotKeys)
    || action.actor !== 'yan' || action.operation !== (moving ? 'move-left' : scene.operation)
    || space !== t.location || !fieldsMatch(p, { x: t.x, y: t.y }) || hasHallMode(action))
    return fail('按本人、原房位置与同液恢复断点继续。')
  const next = structuredClone(state)
  const updated = firstRecoveryAt(moving ? t.stage : t.stage + 1, moving ? t.walk + 1 : 0, source, prior)
  next.earlyTraining.firstRecovery = updated
  const recovery = next.earlyTraining.recovery, minimum = firstRecoveryMinimum(updated.stage)
  if (recovery.stage < minimum) {
    recovery.stage = minimum
    recovery.energy = recoveryEnergyAt(minimum)
  }
  return successfulTransaction(next, '同液恢复断点已保存，醒后耗尽与五段另续。')
}
export function submitFirstRecovery(store: GameStore, entrance: EarlyWalkPosition, p: EarlyWalkPosition, space: string, action: FirstRecoveryAction): boolean {
  return submitEarlyTransaction(store, advanceFirstRecovery, [entrance, p, space, action], ['firstRecovery', 'recovery'])
}
