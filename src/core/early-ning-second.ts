import { submitEarlyTransaction } from './early-result'
import { failedTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { earlyNingFirstBlock, nearNingPlace } from './early-ning-first'
import { validCeremonialPosition } from './early-ceremonial-test'
import { validNingSecond, type NingSecondState } from './early-training-state'
import { ningSecondScenes } from '../content/early-ning-second'
export function ningSecondOperation(task: NingSecondState): NingSecondAction['operation'] {
  return task.stage === 4 && task.beats === 1 ? 'strike' : ningSecondScenes[task.stage]?.operation ?? 'withdraw'
}
export type NingSecondAction = NingSecondState & {
  actor: typeof ningSecondScenes[number]['actor']
  operation: typeof ningSecondScenes[number]['operation'] | 'strike' | 'push' | 'pull' | 'stop'
  marker?: number
}
export function earlyNingSecondBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyNingFirstBlock(state, position)
    || (state.earlyTraining.ningFirst.stage !== 10 ? '先记录首轮倒地与台边待宣布，再接突变。' : '')
}
export function advanceEarlyNingSecond(state: GameState, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: NingSecondAction): Transaction {
  const blocked = earlyNingSecondBlock(state, entryPosition)
  if (blocked) return failedTransaction(state, blocked)
  const task = state.earlyTraining.ningSecond, scene = ningSecondScenes[task.stage]
  if (!scene || !validNingSecond(task) || !fieldsMatch(action, task))
    return failedTransaction(state, '再攻记录已变化，请依当前阶段继续。')
  if (!validCeremonialPosition(position, 2) || action.actor !== scene.actor)
    return failedTransaction(state, '迎击或场边观察身份/位置无效。')
  if (action.operation !== 'stop' && !nearNingPlace(position, scene.place))
    return failedTransaction(state, '先走近当前再攻步骤的地点。')
  const next = structuredClone(state), updated = next.earlyTraining.ningSecond
  if (task.stage === 4) {
    if (!['octane', 'strike', 'push', 'pull', 'stop'].includes(action.operation) || (action.operation === 'stop' ? action.marker !== undefined
      : typeof action.marker !== 'number' || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1))
      return failedTransaction(state, '迎击动作或时机无效，记录未改变。')
    if (action.operation === 'stop' || action.operation !== ningSecondOperation(task) || action.marker! < .35 || action.marker! > .65) {
      if (task.attempts >= 1_000_000) return failedTransaction(state, '迎击重试已到上限。')
      updated.stage = 3; updated.beats = 0; updated.contact = 'none'; updated.attempts++
      return successfulTransaction(next, '迎击免费重新准备；违规用药与叫停记录保留。')
    }
    updated.beats++
    updated.contact = updated.beats === 1 ? 'met' : 'out'
    if (updated.beats === 2) updated.stage = 5
  } else {
    if (action.operation !== scene.operation || action.marker !== undefined)
      return failedTransaction(state, '当前再攻步骤不符，不能跳过叫停或正式裁定。')
    updated.stage++
    if (updated.stage === 1) updated.pill = 'used'
    if (updated.stage === 2) updated.ignored = true
  }
  return successfulTransaction(next, updated.contact === 'out' ? '追加拳击后出场已记，最终裁定仍待续。' : '违规再攻与迎击步骤已保存。')
}
export function submitEarlyNingSecond(store: GameStore, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: NingSecondAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyNingSecond, [entryPosition, position, action])
}
