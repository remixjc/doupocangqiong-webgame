import { boundedInteger, fieldsMatch, historyRecordMatches } from './state-guards'
export const FIRST_HALL_GRANT_VERSION = '0.81.0'
export interface FirstHallGrantState {
  stage: number
  location: 'room'
  x: number
  y: number
  teacherX: number
  teacherY: number
  approved: boolean
  curious: boolean
  weakPalm: boolean
  needed: number
  askedTier: boolean
  tier: 'unheard' | 'xuan-high'
  provenance: 'unheard' | 'alchemy-request'
  gapUnderstood: boolean
  record: 'none' | 'current' | 'recalled'
}
export function firstHallGrantAt(stage: number, record: FirstHallGrantState['record'] = 'current'): FirstHallGrantState {
  return { stage, location: 'room', x: 300, y: 270, teacherX: 340, teacherY: 230,
    approved: stage >= 1, curious: stage >= 2, weakPalm: stage >= 3, needed: stage >= 3 ? 5 : 0,
    askedTier: stage >= 4, tier: stage >= 5 ? 'xuan-high' : 'unheard',
    provenance: stage >= 5 ? 'alchemy-request' : 'unheard', gapUnderstood: stage >= 6, record: stage ? record : 'none' }
}
export function validFirstHallGrant(t: Record<string, unknown> | FirstHallGrantState): t is FirstHallGrantState {
  return boundedInteger(t.stage, 7) && historyRecordMatches(t.record, t.stage)
    && fieldsMatch(t, firstHallGrantAt(t.stage, t.record as FirstHallGrantState['record']))
}
