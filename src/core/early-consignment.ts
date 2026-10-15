import { submitEarlyTransaction } from './early-result'
import { failedTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import { earlyRecoveryBlock } from './early-recovery'
import type { EarlyWalkPosition } from './early-walk'
import { CONSIGNMENT_FUNDS, consignmentSupplies, type ConsignmentSupplyId } from './early-training-state'

export type ConsignmentStation = 'plan' | 'pharmacy' | 'alley'
export type ConsignmentAction = { stage: number; spent: number } & (
  { operation: 'plan' | 'deliver' | 'refine' | 'bottle' } | { operation: 'buy'; item: ConsignmentSupplyId; price: number })
export function earlyConsignmentBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyRecoveryBlock(state, position)
    || (state.earlyTraining.recovery.stage !== 7 ? '先记下恢复与五段故事结果，再筹备首次寄售。' : '')
}
export function advanceEarlyConsignment(state: GameState, position: EarlyWalkPosition, station: ConsignmentStation, action: ConsignmentAction): Transaction {
  const blocked = earlyConsignmentBlock(state, position)
  if (blocked) return failedTransaction(state, blocked)
  const task = state.earlyTraining.consignment
  if (state.earlyTraining.firstSalePlan.stage > 0 && state.earlyTraining.firstSalePlan.stage < 21)
    return failedTransaction(state, '先按床边完整问答听到同意并归档，再接续采购。')
  if (state.earlyTraining.firstSaleDeparture.stage > 0 && state.earlyTraining.firstSaleAlley.stage !== 14)
    return failedTransaction(state, '已开始独立拿物离房；街巷采购与隐巷炼制须沿后续细分接续。')
  if (action.stage !== task.stage || action.spent !== task.spent || task.stage === 5)
    return failedTransaction(state, '寄售准备记录已变化，请按当前步骤继续。')
  const expected = ['plan', 'buy', 'deliver', 'refine', 'bottle'][task.stage]
  const expectedStation = task.stage === 0 ? 'plan' : task.stage === 1 ? 'pharmacy' : 'alley'
  if (action.operation !== expected || station !== expectedStation)
    return failedTransaction(state, '请到当前寄售准备对应的地点，按步骤继续。')
  if (action.operation === 'buy') {
    const supply = Object.hasOwn(consignmentSupplies, action.item) ? consignmentSupplies[action.item] : undefined
    if (!supply || action.price !== supply.price || task.receipts[action.item] || task.funds - task.spent < supply.price)
      return failedTransaction(state, '订单或报价已变化，寄售物资与余额保留。')
  }
  const next = structuredClone(state), updated = next.earlyTraining.consignment
  if (action.operation === 'plan') { updated.stage = 1; updated.funds = CONSIGNMENT_FUNDS }
  else if (action.operation === 'buy') {
    updated.spent += action.price; updated.receipts[action.item] = true; updated.supplies[action.item] = 1
    if (Object.values(updated.receipts).every(Boolean)) updated.stage = 2
  } else if (action.operation === 'deliver') {
    updated.supplies.youngPrimary = 0; updated.supplies.youngAuxiliary = 0; updated.supplies.woodCore = 0; updated.stage = 3
  } else if (action.operation === 'refine') { updated.product = 'mixture'; updated.stage = 4 }
  else if (action.operation === 'bottle') { updated.supplies.jadeBottle = 0; updated.product = 'sealed'; updated.owner = 'xiaoyan'; updated.stage = 5 }
  return successfulTransaction(next, updated.stage === 5
    ? '待售药液已装瓶，由萧炎保管；鉴定与寄售入场尚待继续。' : '寄售准备已记下，和旧自用药液及行囊金币分开。')
}
export function submitEarlyConsignment(store: GameStore, position: EarlyWalkPosition, station: ConsignmentStation, action: ConsignmentAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyConsignment, [position, station, action])
}
