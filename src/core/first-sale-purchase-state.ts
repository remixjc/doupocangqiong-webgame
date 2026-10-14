import { boundedInteger, fieldsMatch, historyRecordMatches } from './state-guards'
import type { EarlyWalkDirection } from './early-walk'
import type { ConsignmentSupplyId, EarlyTrainingState } from './early-training-state'
import { saleReceiptsMask } from './first-sale-departure-state'
export const FIRST_SALE_PURCHASE_VERSION = '0.92.0'
export const salePurchaseItems: readonly ConsignmentSupplyId[] = ['youngPrimary', 'youngAuxiliary', 'woodCore', 'jadeBottle']
export const salePurchaseRoutes: Readonly<Record<number, readonly EarlyWalkDirection[]>> = {
  1: ['left', 'left', 'up', 'up'], 6: ['right', 'right', 'right', 'right'], 9: ['right', 'right', 'down'],
}
export function salePurchaseItem(stage: number): ConsignmentSupplyId | undefined {
  return ({ 3:'youngPrimary', 5:'youngAuxiliary', 8:'woodCore', 11:'jadeBottle' } as const)[stage as 3]
}
export function salePurchaseMask(stage: number): number {
  return (stage >= 4 ? 1 : 0) | (stage >= 6 ? 2 : 0) | (stage >= 9 ? 4 : 0) | (stage >= 12 ? 8 : 0)
}
export interface FirstSalePurchaseState {
  stage: number
  walk: number
  priorStage: number
  priorReceipts: number
  record: 'none' | 'current' | 'recalled'
  location: 'outside' | 'street' | 'pharmacy' | 'core-stall' | 'bottle-stall'
  x: number
  y: number
  teacher: 'ring-voice'
  selected: 'none' | ConsignmentSupplyId
  confirmedReceipts: number
  held: boolean
  archived: boolean
}
export function firstSalePurchaseAt(stage: number, walk = 0, record: FirstSalePurchaseState['record'] = 'current', priorStage = 0, priorReceipts = 0): FirstSalePurchaseState {
  let x = stage >= 10 ? 540 : stage >= 7 ? 460 : stage >= 2 ? 300 : 380
  let y = stage >= 10 ? 410 : stage >= 2 ? 360 : 460
  for (const direction of (salePurchaseRoutes[stage] ?? []).slice(0, walk)) {
    if (direction === 'left') x -= 40
    else if (direction === 'right') x += 40
    else if (direction === 'up') y -= 50
    else y += 50
  }
  return { stage, walk, priorStage, priorReceipts, record: stage ? record : 'none',
    location: stage === 0 ? 'outside' : stage === 1 || stage === 6 || stage === 9 ? 'street'
      : stage < 7 ? 'pharmacy' : stage < 10 ? 'core-stall' : 'bottle-stall',
    x, y, teacher: 'ring-voice', selected: salePurchaseItem(stage) ?? 'none',
    confirmedReceipts: salePurchaseMask(stage), held: stage >= 13, archived: stage >= 14 }
}
export function validFirstSalePurchase(t: Record<string, unknown> | FirstSalePurchaseState): t is FirstSalePurchaseState {
  return boundedInteger(t.stage, 14) && boundedInteger(t.walk, salePurchaseRoutes[t.stage]?.length ?? 0)
    && boundedInteger(t.priorStage, t.stage ? 5 : 0) && (!t.stage || t.priorStage >= 1)
    && boundedInteger(t.priorReceipts, t.stage ? 15 : 0) && (t.priorStage <= 1 || t.priorReceipts === 15)
    && historyRecordMatches(t.record, t.stage)
    && fieldsMatch(t, firstSalePurchaseAt(t.stage, t.walk, t.record as FirstSalePurchaseState['record'], t.priorStage, t.priorReceipts))
}
export function salePurchaseLedgerMatches(t: FirstSalePurchaseState, sale: EarlyTrainingState['consignment']): boolean {
  const required = t.priorReceipts | t.confirmedReceipts, mask = saleReceiptsMask(sale.receipts)
  return !t.stage || sale.stage >= t.priorStage && (mask & required) === required
    && (t.priorStage > 1 || t.archived || mask === required && sale.stage === (required === 15 ? 2 : 1))
}
