import type { GameState } from './model'
import { isVisible, type Transaction } from './rules'
import { EARLY_LOAN, earlySupplies, type EarlySupplyId } from './early-training-state'

export function earlyTrainingBlock(state: GameState): string {
  if (!isVisible(state, 2)) return '重修往事超出当前剧透范围。'
  if (!state.completed.includes(2)) return '完成第2章首通结算后，可回顾拜师后的重修准备。'
  return ''
}
export type EarlyTrainingAction =
  | { type: 'borrow'; expectedSpent: number }
  | { type: 'purchase'; item: EarlySupplyId; price: number; expectedSpent: number }

export function advanceEarlyTraining(state: GameState, action: EarlyTrainingAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = earlyTrainingBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining
  if (!task.started) return fail('先记下重修准备。')
  if (action.expectedSpent !== task.purse.spent) return fail('采购记录已变化，请按当前清单重新操作。')
  const next = structuredClone(state)
  if (action.type === 'borrow') {
    if (task.purse.borrowed !== 0) return fail('借资已经记账，不能重复领取。')
    next.earlyTraining.purse.borrowed = EARLY_LOAN
    return { state: next, ok: true, message: '薰儿借出的采购资金已单独记账。' }
  }
  if (action.type !== 'purchase' || !Object.hasOwn(earlySupplies, action.item)) return fail('采购项目无效。')
  const item = earlySupplies[action.item]
  if (task.receipts[action.item]) return fail('该项材料已购入，无需再次付账。')
  if (action.price !== item.price) return fail('报价已失效，未扣除采购资金。')
  if (action.item === 'woodCore' && (!task.receipts.bluegrass || !task.receipts.boneflower))
    return fail('先在药铺买齐两种药草，再去坊市寻找指定魔核。')
  if (task.purse.borrowed - task.purse.spent < item.price) return fail('采购资金不足，先向薰儿借资。')
  next.earlyTraining.purse.spent += item.price
  next.earlyTraining.supplies[action.item] = item.quantity
  next.earlyTraining.receipts[action.item] = true
  return { state: next, ok: true, message: `${item.label}已由药铺或摊主交付，任务袋与货款同步记账。` }
}
export function beginEarlyTraining(state: GameState): Transaction {
  const blocked = earlyTrainingBlock(state)
  if (blocked) return { state, ok: false, message: blocked }
  if (state.earlyTraining.started) return { state, ok: false, message: '重修准备单已经记下。' }
  const next = structuredClone(state)
  next.earlyTraining.started = true
  return { state: next, ok: true, message: '重修准备单已记下。材料和资金仍需另行取得。' }
}
