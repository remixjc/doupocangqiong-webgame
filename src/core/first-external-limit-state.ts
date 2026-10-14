import { boundedInteger, fieldsMatch, historyRecordMatches } from './state-guards'
export const FIRST_EXTERNAL_LIMIT_VERSION = '0.85.0'
export interface FirstExternalLimitState {
  stage: number
  attempts: number
  priorCompleted: boolean
  record: 'none' | 'current' | 'recalled'
  location: 'grove'
  x: number
  y: number
  teacherX: number
  teacherY: number
  fallen: boolean
  asked: boolean
  countExplained: boolean
  regained: boolean
  clothesTaken: boolean
  dressed: boolean
  ringReturned: boolean
  left: boolean
}
export function firstExternalLimitAt(stage: number, attempts = 0,
  record: FirstExternalLimitState['record'] = 'current', priorCompleted = false): FirstExternalLimitState {
  return { stage, attempts, priorCompleted, record: stage ? record : 'none', location: 'grove',
    x: 300, y: 270, teacherX: 240, teacherY: 170,
    fallen: stage >= 1, asked: stage >= 2, countExplained: stage >= 3, regained: stage >= 4,
    clothesTaken: stage >= 5, dressed: stage >= 6, ringReturned: stage >= 7, left: stage >= 8 }
}
export function validFirstExternalLimit(t: Record<string, unknown> | FirstExternalLimitState): t is FirstExternalLimitState {
  return boundedInteger(t.stage, 8) && boundedInteger(t.attempts, 1_000_000)
    && typeof t.priorCompleted === 'boolean'
    && historyRecordMatches(t.record, t.stage)
    && fieldsMatch(t, firstExternalLimitAt(t.stage, t.attempts, t.record as FirstExternalLimitState['record'], t.priorCompleted))
}
