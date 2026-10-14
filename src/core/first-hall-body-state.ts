import { boundedInteger, fieldsMatch, historyRecordMatches } from './state-guards'
export const FIRST_HALL_BODY_VERSION = '0.83.0'
export interface FirstHallBodyState {
  stage: number
  location: 'room'
  x: number
  y: number
  teacherX: number
  teacherY: number
  hoped: boolean
  restricted: boolean
  askedImprove: boolean
  growthExplained: boolean
  askedStimulus: boolean
  stimulus: 'unheard' | 'beatings'
  record: 'none' | 'current' | 'recalled'
}
export function firstHallBodyAt(stage: number, record: FirstHallBodyState['record'] = 'current'): FirstHallBodyState {
  return { stage, location: 'room', x: 300, y: 270, teacherX: 300, teacherY: 250,
    hoped: stage >= 1, restricted: stage >= 2, askedImprove: stage >= 3, growthExplained: stage >= 4,
    askedStimulus: stage >= 5, stimulus: stage >= 6 ? 'beatings' : 'unheard', record: stage ? record : 'none' }
}
export function validFirstHallBody(t: Record<string, unknown> | FirstHallBodyState): t is FirstHallBodyState {
  return boundedInteger(t.stage, 7) && historyRecordMatches(t.record, t.stage)
    && fieldsMatch(t, firstHallBodyAt(t.stage, t.record as FirstHallBodyState['record']))
}
