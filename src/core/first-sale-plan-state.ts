import { boundedInteger, fieldsMatch, historyRecordMatches } from './state-guards'
import type { EarlyWalkDirection } from './early-walk'
export const FIRST_SALE_PLAN_VERSION = '0.90.0'
export const salePlanRoute: readonly EarlyWalkDirection[] = ['right', 'right', 'right', 'up', 'up']
export interface FirstSalePlanState {
  stage: number
  walk: number
  priorStage: number
  record: 'none' | 'current' | 'recalled'
  location: 'room'
  x: number
  y: number
  teacher: 'ring-voice'
  period: 'unreviewed' | 'half-plus-month-half'
  prediction: 'unheard' | 'conditional-seven'
  seated: boolean
  balance: number
  youngAsked: boolean
  tailoredHeard: boolean
  lowRequested: boolean
  delayHeard: boolean
  borrowingHeard: boolean
  girlDeclined: boolean
  fatherDeclined: boolean
  othersAsked: boolean
  explanation: number
  understood: boolean
  proposed: boolean
  agreed: boolean
  archived: boolean
}
export function firstSalePlanAt(stage: number, walk = 0, record: FirstSalePlanState['record'] = 'current', priorStage = 0): FirstSalePlanState {
  const steps = stage >= 2 ? 5 : walk
  return { stage, walk, priorStage, record: stage ? record : 'none', location: 'room',
    x: 180 + Math.min(steps, 3) * 40, y: 370 - Math.max(0, steps - 3) * 50, teacher: 'ring-voice',
    period: stage ? 'half-plus-month-half' : 'unreviewed', prediction: stage ? 'conditional-seven' : 'unheard',
    seated: stage >= 3, balance: stage >= 4 ? 900 : 0, youngAsked: stage >= 5, tailoredHeard: stage >= 6,
    lowRequested: stage >= 7, delayHeard: stage >= 8, borrowingHeard: stage >= 9,
    girlDeclined: stage >= 10, fatherDeclined: stage >= 11, othersAsked: stage >= 12,
    explanation: Math.min(5, Math.max(0, stage - 12)), understood: stage >= 18, proposed: stage >= 19,
    agreed: stage >= 20, archived: stage >= 21 }
}
export function validFirstSalePlan(t: Record<string, unknown> | FirstSalePlanState): t is FirstSalePlanState {
  return boundedInteger(t.stage, 21) && boundedInteger(t.walk, t.stage === 1 ? 5 : 0)
    && boundedInteger(t.priorStage, t.stage ? 5 : 0) && historyRecordMatches(t.record, t.stage)
    && fieldsMatch(t, firstSalePlanAt(t.stage, t.walk, t.record as FirstSalePlanState['record'], t.priorStage))
}
