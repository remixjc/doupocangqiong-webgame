import type { GameState } from './model'
import type { GameStore } from './store'
import type { EarlyWalkPosition } from './early-walk'
import type { FirstSaleDepartureAction } from './first-sale-departure'
import type { FirstSaleDepartureState } from './first-sale-departure-state'
import { firstSaleDepartureBlock } from './first-sale-departure'
import { saleDepartureSource, saleReceiptsMask } from './first-sale-departure-state'
import { firstSalePurchaseAt, salePurchaseRoutes, salePurchaseItem, salePurchaseLedgerMatches, validFirstSalePurchase, type FirstSalePurchaseState } from './first-sale-purchase-state'
import { firstSalePurchaseScenes } from '../content/first-sale-purchase'
import { earlySnapshotsMatch, salePurchaseSnapshotKeys, hasHallMode } from './early-snapshots'
import { fieldsMatch } from './state-guards'
import { consignmentSupplies, type ConsignmentSupplyId } from './early-training-state'
import { rejectTransaction, successfulTransaction, submitEarlyTransaction } from './early-result'
export type FirstSalePurchaseAction = Omit<FirstSaleDepartureAction, keyof FirstSaleDepartureState> & FirstSalePurchaseState
  & { expectedSaleDeparture: FirstSaleDepartureState; item?: ConsignmentSupplyId; price?: number }
export function firstSalePurchaseBlock(state: GameState, position: EarlyWalkPosition): string {
  return firstSaleDepartureBlock(state, position)
    || (state.earlyTraining.firstSaleDeparture.stage !== 7 ? '先独立归档拿物与正常离房，再到店采购。' : '')
}
export function advanceFirstSalePurchase(state: GameState, entrance: EarlyWalkPosition, p: EarlyWalkPosition, space: string, action: FirstSalePurchaseAction) {
  const fail = rejectTransaction(state), t = state.earlyTraining.firstSalePurchase, scene = firstSalePurchaseScenes[t.stage]
  const sale = state.earlyTraining.consignment, expected = action.expectedConsignment
  const prior = t.stage ? t.priorStage : sale.stage, receipts = t.stage ? t.priorReceipts : saleReceiptsMask(sale.receipts)
  const source = saleDepartureSource(state.earlyTraining.firstSaleDeparture.record, prior, receipts)
  const direction = salePurchaseRoutes[t.stage]?.[t.walk], item = salePurchaseItem(t.stage)
  if (firstSalePurchaseBlock(state, entrance) || !scene || !validFirstSalePurchase(t) || !salePurchaseLedgerMatches(t,sale)
    || t.stage > 0 && t.record !== source
    || !fieldsMatch(action, t) || !earlySnapshotsMatch(state, action, salePurchaseSnapshotKeys) || hasHallMode(action)
    || !expected || !expected.receipts || !expected.supplies
    || !fieldsMatch(expected, { stage:sale.stage, funds:sale.funds, spent:sale.spent, product:sale.product, owner:sale.owner })
    || !fieldsMatch(expected.receipts, sale.receipts) || !fieldsMatch(expected.supplies, sale.supplies)
    || action.actor !== 'yan' || action.operation !== (direction ? `move-${direction}` : scene.operation)
    || space !== t.location || !fieldsMatch(p, { x:t.x, y:t.y })
    || (item ? action.item !== item || action.price !== consignmentSupplies[item].price : action.item !== undefined || action.price !== undefined))
    return fail('按本人、店位、正确物资及原报价继续，旧账保持。')
  const next = structuredClone(state)
  next.earlyTraining.firstSalePurchase = firstSalePurchaseAt(direction ? t.stage : t.stage + 1, direction ? t.walk + 1 : 0, source, prior, receipts)
  if (item && !sale.receipts[item]) {
    if (sale.stage !== 1 || sale.funds - sale.spent < consignmentSupplies[item].price) return fail('原采购账无法完成这一笔，资金与收据保留。')
    const updated = next.earlyTraining.consignment
    updated.spent += consignmentSupplies[item].price; updated.receipts[item] = true; updated.supplies[item] = 1
    if (Object.values(updated.receipts).every(Boolean)) updated.stage = 2
  }
  return successfulTransaction(next, '到店与同单采购断点已保存，既有收据不重扣。')
}
export function submitFirstSalePurchase(store: GameStore, entrance: EarlyWalkPosition, p: EarlyWalkPosition, space: string, action: FirstSalePurchaseAction): boolean {
  return submitEarlyTransaction(store, advanceFirstSalePurchase, [entrance, p, space, action], ['firstSalePurchase','consignment'])
}
