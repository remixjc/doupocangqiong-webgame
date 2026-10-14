import { boundedInteger, fieldsMatch } from './state-guards'
export const FIRST_AWAKENING_VERSION = '0.89.0'
export interface FirstAwakeningState {
  stage: number
  priorStage: number
  record: 'none' | 'current' | 'recalled'
  location: 'room'
  x: number
  y: number
  stretched: boolean
  invigorated: boolean
  exited: boolean
  looked: boolean
  clear: boolean
  spent: boolean
  eyes: 'open' | 'closed'
  sensed: boolean
  result: 'none' | 'fifth-duan'
  legacyReviewed: boolean
  archived: boolean
}
export function firstAwakeningAt(stage: number, record: FirstAwakeningState['record'] = 'current', priorStage = 0): FirstAwakeningState {
  return { stage, priorStage, record: stage ? record : 'none', location: 'room',
    x: stage >= 3 ? 180 : 120, y: 370, stretched: stage >= 1, invigorated: stage >= 2,
    exited: stage >= 3, looked: stage >= 4, clear: stage >= 5, spent: stage >= 6,
    eyes: stage >= 7 && stage < 9 ? 'closed' : 'open', sensed: stage >= 8,
    result: stage >= 9 ? 'fifth-duan' : 'none', legacyReviewed: stage >= 10, archived: stage >= 11 }
}
export function firstAwakeningMinimum(stage: number): number {
  return stage >= 10 ? 7 : stage >= 6 ? 5 : 3
}
export function validFirstAwakening(t: Record<string, unknown> | FirstAwakeningState): t is FirstAwakeningState {
  return boundedInteger(t.stage, 11) && boundedInteger(t.priorStage, t.stage ? 7 : 0)
    && (!t.stage || t.priorStage >= 3)
    && (t.stage ? t.record === 'current' || t.record === 'recalled' : t.record === 'none')
    && fieldsMatch(t, firstAwakeningAt(t.stage, t.record as FirstAwakeningState['record'], t.priorStage))
}
