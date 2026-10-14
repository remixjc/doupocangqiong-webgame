import { boundedInteger, fieldsMatch } from './state-guards'
export const FIRST_EXTERNAL_TRAINING_VERSION = '0.84.0'
export interface FirstExternalTrainingState {
  stage: number
  attempts: number
  priorCompleted: boolean
  record: 'none' | 'current' | 'recalled'
  location: 'grove'
  x: number
  y: number
  teacherX: number
  teacherY: number
  period: 'unobserved' | 'half-month-background'
  stance: 'unobserved' | 'feet-grounded'
  teacher: 'unseen' | 'seated-on-rock'
  steady: boolean
  shoulderHit: boolean
  reaction: 'unobserved' | 'pain-near-stumble'
  qi: 'unobserved' | 'flow-cool'
  eased: boolean
  requestedAgain: boolean
}
export function firstExternalTrainingAt(stage: number, attempts = 0,
  record: FirstExternalTrainingState['record'] = 'current', priorCompleted = false): FirstExternalTrainingState {
  return { stage, attempts, priorCompleted, record: stage ? record : 'none', location: 'grove',
    x: 300, y: 270, teacherX: 240, teacherY: 170,
    period: stage >= 1 ? 'half-month-background' : 'unobserved',
    stance: stage >= 2 ? 'feet-grounded' : 'unobserved',
    teacher: stage >= 3 ? 'seated-on-rock' : 'unseen', steady: stage >= 4,
    shoulderHit: stage >= 5, reaction: stage >= 6 ? 'pain-near-stumble' : 'unobserved',
    qi: stage >= 7 ? 'flow-cool' : 'unobserved', eased: stage >= 8, requestedAgain: stage >= 9 }
}
export function validFirstExternalTraining(t: Record<string, unknown> | FirstExternalTrainingState): t is FirstExternalTrainingState {
  return boundedInteger(t.stage, 10) && boundedInteger(t.attempts, t.stage >= 3 ? 1_000_000 : 0)
    && typeof t.priorCompleted === 'boolean' && (t.stage > 0 || !t.priorCompleted)
    && (t.stage ? t.record === 'current' || t.record === 'recalled' : t.record === 'none')
    && fieldsMatch(t, firstExternalTrainingAt(t.stage, t.attempts, t.record as FirstExternalTrainingState['record'], t.priorCompleted))
}
