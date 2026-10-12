import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import { isVisible, type Transaction } from './rules'
import { earlyTrainingBlock } from './early-training'

export function earlyGrowthBlock(state: GameState): string {
  return earlyTrainingBlock(state)
    || (!isVisible(state, 3) ? '后续修炼时日超出当前剧透范围。' : '')
    || (state.earlyTraining.practice.phase !== 4 ? '先记下初期斗技尝试，再翻阅后续修炼时日。' : '')
}
export function advanceEarlyGrowth(state: GameState, step: number): Transaction {
  const blocked = earlyGrowthBlock(state)
  if (blocked) return { state, ok: false, message: blocked }
  if (!Number.isSafeInteger(step) || step !== state.earlyTraining.growth.stage || step >= 3)
    return { state, ok: false, message: '这段修炼过渡已翻阅，或当前页已变化。' }
  const next = structuredClone(state)
  next.earlyTraining.growth.stage++
  return { state: next, ok: true, message: step === 2 ? '修炼时日已翻阅，可以回舆图查看后续旅程。' : '这页过渡已记下，可关闭后继续翻阅。' }
}
export function submitEarlyGrowth(store: GameStore, step: number): boolean {
  const result = advanceEarlyGrowth(store.getSnapshot().state, step)
  return commitEarlyResult(store, result)
}
