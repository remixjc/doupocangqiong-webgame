import type { GameState } from './model'
import { isVisible, type Transaction } from './rules'

export function earlyTrainingBlock(state: GameState): string {
  if (!isVisible(state, 2)) return '重修往事超出当前剧透范围。'
  if (!state.completed.includes(2)) return '完成第2章首通结算后，可回顾拜师后的重修准备。'
  return ''
}
export function beginEarlyTraining(state: GameState): Transaction {
  const blocked = earlyTrainingBlock(state)
  if (blocked) return { state, ok: false, message: blocked }
  if (state.earlyTraining.started) return { state, ok: false, message: '重修准备单已经记下。' }
  const next = structuredClone(state)
  next.earlyTraining.started = true
  return { state: next, ok: true, message: '重修准备单已记下。材料和资金仍需另行取得。' }
}
