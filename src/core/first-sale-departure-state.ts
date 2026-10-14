import { boundedInteger, fieldsMatch, historyRecordMatches } from './state-guards'
import type { EarlyWalkDirection } from './early-walk'
export const FIRST_SALE_DEPARTURE_VERSION = '0.91.0'
export const saleDepartureRoute: readonly EarlyWalkDirection[] = ['right', 'right', 'down', 'down', 'down']
export interface FirstSaleDepartureState {
  stage: number
  walk: number
  priorStage: number
  priorReceipts: number
  record: 'none' | 'current' | 'recalled'
  location: 'room' | 'outside'
  x: number
  y: number
  teacher: 'ring-voice'
  standing: boolean
  ringHeld: boolean
  purseHeld: boolean
  doorOpen: boolean
  archived: boolean
}
export function saleReceiptsMask(receipts: Record<string, boolean>): number {
  return ['youngPrimary', 'youngAuxiliary', 'woodCore', 'jadeBottle']
    .reduce((mask, key, index) => mask | (receipts[key] ? 1 << index : 0), 0)
}
export function saleDepartureSource(plan: string, priorStage: number, priorReceipts: number): 'current' | 'recalled' {
  return plan === 'recalled' || priorStage > 1 || priorReceipts > 0 ? 'recalled' : 'current'
}
export function firstSaleDepartureAt(stage: number, walk = 0, record: FirstSaleDepartureState['record'] = 'current', priorStage = 0, priorReceipts = 0): FirstSaleDepartureState {
  const steps = stage >= 4 ? 5 : walk
  return { stage, walk, priorStage, priorReceipts, record: stage ? record : 'none',
    location: stage >= 6 ? 'outside' : 'room',
    x: 300 + Math.min(steps, 2) * 40, y: stage >= 6 ? 460 : 270 + Math.max(0, steps - 2) * 50,
    teacher: 'ring-voice', standing: stage >= 1, ringHeld: stage >= 2, purseHeld: stage >= 3,
    doorOpen: stage >= 5, archived: stage >= 7 }
}
export function validFirstSaleDeparture(t: Record<string, unknown> | FirstSaleDepartureState): t is FirstSaleDepartureState {
  return boundedInteger(t.stage, 7) && boundedInteger(t.walk, t.stage === 3 ? 5 : 0)
    && boundedInteger(t.priorStage, t.stage ? 5 : 0) && (!t.stage || t.priorStage >= 1)
    && boundedInteger(t.priorReceipts, t.stage ? 15 : 0) && (t.priorStage <= 1 || t.priorReceipts === 15)
    && historyRecordMatches(t.record, t.stage)
    && fieldsMatch(t, firstSaleDepartureAt(t.stage, t.walk, t.record as FirstSaleDepartureState['record'], t.priorStage, t.priorReceipts))
}
