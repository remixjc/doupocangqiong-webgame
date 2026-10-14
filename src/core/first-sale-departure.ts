import type { GameState } from './model'
import type { GameStore } from './store'
import type { EarlyWalkPosition } from './early-walk'
import type { FirstSalePlanAction } from './first-sale-plan'
import type { FirstSalePlanState } from './first-sale-plan-state'
import { firstSalePlanBlock } from './first-sale-plan'
import { firstSaleDepartureAt, saleDepartureRoute, saleDepartureSource, saleReceiptsMask, validFirstSaleDeparture, type FirstSaleDepartureState } from './first-sale-departure-state'
import { firstSaleDepartureScenes } from '../content/first-sale-departure'
import { earlySnapshotsMatch, saleDepartureSnapshotKeys, hasHallMode } from './early-snapshots'
import { fieldsMatch } from './state-guards'
import { rejectTransaction, successfulTransaction, submitEarlyTransaction } from './early-result'
export type FirstSaleDepartureAction = Omit<FirstSalePlanAction, keyof FirstSalePlanState>
  & FirstSaleDepartureState & { expectedSalePlan: FirstSalePlanState }
export function firstSaleDepartureBlock(state: GameState, position: EarlyWalkPosition): string {
  return firstSalePlanBlock(state, position)
    || (state.earlyTraining.firstSalePlan.stage !== 21 ? '先归档床边完整方案与老师同意，再拿物离房。' : '')
}
export function advanceFirstSaleDeparture(state: GameState, entrance: EarlyWalkPosition, p: EarlyWalkPosition, space: string, action: FirstSaleDepartureAction) {
  const fail = rejectTransaction(state), t = state.earlyTraining.firstSaleDeparture, scene = firstSaleDepartureScenes[t.stage]
  const sale = state.earlyTraining.consignment, expected = action.expectedConsignment
  const prior = t.stage ? t.priorStage : sale.stage, receipts = t.stage ? t.priorReceipts : saleReceiptsMask(sale.receipts)
  const source = saleDepartureSource(state.earlyTraining.firstSalePlan.record, prior, receipts)
  const direction = t.stage === 3 && t.walk < 5 ? saleDepartureRoute[t.walk] : undefined
  if (firstSaleDepartureBlock(state, entrance) || !scene || !validFirstSaleDeparture(t)
    || t.stage > 0 && (t.record !== source || sale.stage < prior || (saleReceiptsMask(sale.receipts) & receipts) !== receipts)
    || !fieldsMatch(action, t) || !earlySnapshotsMatch(state, action, saleDepartureSnapshotKeys) || hasHallMode(action)
    || !expected || !expected.receipts || !expected.supplies
    || !fieldsMatch(expected, { stage: sale.stage, funds: sale.funds, spent: sale.spent, product: sale.product, owner: sale.owner })
    || !fieldsMatch(expected.receipts, sale.receipts) || !fieldsMatch(expected.supplies, sale.supplies)
    || action.actor !== 'yan' || action.operation !== (direction ? `move-${direction}` : scene.operation)
    || space !== t.location || !fieldsMatch(p, { x: t.x, y: t.y }))
    return fail('按本人、原房门槛位置和已保存的拿物断点继续。')
  const next = structuredClone(state)
  next.earlyTraining.firstSaleDeparture = firstSaleDepartureAt(direction ? t.stage : t.stage + 1, direction ? t.walk + 1 : 0, source, prior, receipts)
  return successfulTransaction(next, '拿物离房断点已保存，旧专款、物资与奖励保持。')
}
export function submitFirstSaleDeparture(store: GameStore, entrance: EarlyWalkPosition, p: EarlyWalkPosition, space: string, action: FirstSaleDepartureAction): boolean {
  return submitEarlyTransaction(store, advanceFirstSaleDeparture, [entrance, p, space, action], 'firstSaleDeparture')
}
