import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { Transaction } from './rules'
import { earlyTrainingBlock } from './early-training'
import { nearbyEarlyWalkPlace, type EarlyWalkPosition } from './early-walk'
import { earlyBraceletScenes } from '../content/early-bracelet'
import type { GameStore } from './store'

export interface EarlyBraceletAction { stage: number; operation: typeof earlyBraceletScenes[number]['operation'] }
export function advanceEarlyBracelet(state: GameState, position: EarlyWalkPosition, action: EarlyBraceletAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = earlyTrainingBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining
  if (!task.started || !task.receipts.bluegrass || !task.receipts.boneflower) return fail('先按准备单买齐两种药草，再来坊市回顾。')
  if (nearbyEarlyWalkPlace(position)?.id !== 'market') return fail('先走近坊市摊位，再回顾这段往事。')
  const current = task.bracelet
  if (action.stage !== current.stage || !earlyBraceletScenes[current.stage]
    || action.operation !== earlyBraceletScenes[current.stage].operation) return fail('手链这一段已变化或结束，请按当前提示继续。')
  const next = structuredClone(state)
  next.earlyTraining.bracelet.stage++
  if (next.earlyTraining.bracelet.stage === 5) next.earlyTraining.bracelet.gift = 'xuner'
  return { state: next, ok: true, message: action.operation === 'finish' ? '手链往事已记下，已有采购记录保留。' : '这段往事已保存，可稍后继续。' }
}
export function submitEarlyBracelet(store: GameStore, position: EarlyWalkPosition, action: EarlyBraceletAction): boolean {
  const result = advanceEarlyBracelet(store.getSnapshot().state, position, action)
  return commitEarlyResult(store, result)
}
