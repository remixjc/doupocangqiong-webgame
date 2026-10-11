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
  if (blocked) return { state, ok: false, message: blocked }
  const task = state.earlyTraining.consignment
  if (action.stage !== task.stage || action.spent !== task.spent || task.stage === 5)
    return { state, ok: false, message: '寄售准备记录已变化，请按当前步骤继续。' }
  const expected = ['plan', 'buy', 'deliver', 'refine', 'bottle'][task.stage]
  const expectedStation = task.stage === 0 ? 'plan' : task.stage === 1 ? 'pharmacy' : 'alley'
  if (action.operation !== expected || station !== expectedStation)
    return { state, ok: false, message: '请到当前寄售准备对应的地点，按步骤继续。' }
  if (action.operation === 'buy') {
    const supply = Object.hasOwn(consignmentSupplies, action.item) ? consignmentSupplies[action.item] : undefined
    if (!supply || action.price !== supply.price || task.receipts[action.item] || task.funds - task.spent < supply.price)
      return { state, ok: false, message: '订单或报价已变化，寄售物资与余额保留。' }
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
  return { state: next, ok: true, message: updated.stage === 5
    ? '待售药液已装瓶，由萧炎保管；鉴定与寄售入场尚待继续。' : '寄售准备已记下，和旧自用药液及行囊金币分开。' }
}
export function submitEarlyConsignment(store: GameStore, position: EarlyWalkPosition, station: ConsignmentStation, action: ConsignmentAction): boolean {
  const result = advanceEarlyConsignment(store.getSnapshot().state, position, station, action)
  if (result.ok) store.update(state => { state.earlyTraining = result.state.earlyTraining })
  store.notify(result.message)
  return result.ok
}
