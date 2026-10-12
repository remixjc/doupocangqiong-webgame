import { fieldsMatch } from './state-guards'
import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import { earlyQiScrollBlock } from './early-qi-scroll'
import { qiPavilionExchangeAt, validQiPavilionExchange, type QiPavilionExchangeState } from './early-training-state'
import { qiExchangeScenes } from '../content/early-qi-exchange'

export type QiExchangeAction = QiPavilionExchangeState & { actor: 'xiaoyan' | 'xuner'; operation: typeof qiExchangeScenes[number]['operation'] | 'take-support' | 'extra-family' }
export function earlyQiExchangeBlock(state: GameState): string {
  return earlyQiScrollBlock(state) || (state.earlyTraining.qiPavilionScroll.stage !== 6 ? '先归档简略保管记录，再回看双卷交接。' : '')
}
export function advanceEarlyQiExchange(state: GameState, action: QiExchangeAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = earlyQiExchangeBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.qiPavilionExchange, scene = qiExchangeScenes[task.stage]
  if (!scene || !validQiPavilionExchange(task) || !fieldsMatch(action, task))
    return fail('双卷交接记录已变化，请按当前步骤继续。')
  if (action.actor !== scene.actor || action.operation !== scene.operation) return fail('请由当前人物按顺序操作；不能领取支持卷或复制家族卷。')
  const next = structuredClone(state), updated = next.earlyTraining.qiPavilionExchange
  updated.stage++
  Object.assign(updated, qiPavilionExchangeAt(updated.stage))
  return { state: next, ok: true, message: '双卷交接已保存；支持卷仍属薰儿，没有新功法或奖励。' }
}
export function submitEarlyQiExchange(store: GameStore, action: QiExchangeAction): boolean {
  const result = advanceEarlyQiExchange(store.getSnapshot().state, action)
  return commitEarlyResult(store, result, 'qiPavilionExchange')
}
