import { rejectTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import { earlyQiPavilionBlock } from './early-qi-pavilion-block'
import { qiPavilionScrollAt, validQiPavilionScroll, type QiPavilionScrollState } from './early-training-state'
import { qiScrollScenes } from '../content/early-qi-scroll'

export type QiScrollOperation = typeof qiScrollScenes[number]['operation']
export type QiScrollAction = QiPavilionScrollState & { operation: QiScrollOperation }

export function earlyQiScrollBlock(state: GameState): string {
  return earlyQiPavilionBlock(state)
    || (state.earlyTraining.qiPavilionBarrier.stage !== 10 ? '先完成火通道、红幕门障与实际入室，再处理卷轴保管。' : '')
}

export function advanceEarlyQiScroll(state: GameState, action: QiScrollAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = earlyQiScrollBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.qiPavilionScroll
  if (!validQiPavilionScroll(task) || !fieldsMatch(action, task))
    return fail('卷轴保管记录已变化，请按当前步骤继续。')
  const expected = qiScrollScenes[task.stage]
  if (!expected || action.operation !== expected.operation) return fail('请按卷轴保管步骤继续。')
  const next = structuredClone(state)
  const updated = next.earlyTraining.qiPavilionScroll
  updated.stage++
  Object.assign(updated, qiPavilionScrollAt(updated.stage))
  return { state: next, ok: true, message: updated.stage === 6 ? '家族卷已保管归档；登记与离阁结果待后续确认。' : '卷轴保管步骤已保存，不改变焚诀、技能或奖励。' }
}

export function submitEarlyQiScroll(store: GameStore, action: QiScrollAction): boolean {
  const result = advanceEarlyQiScroll(store.getSnapshot().state, action)
  return commitEarlyResult(store, result, 'qiPavilionScroll')
}
