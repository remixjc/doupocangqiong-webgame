import { boundedInteger, fieldsMatch } from './state-guards'
import type { EarlyWalkDirection } from './early-walk'
export const FIRST_HALL_TRANSMISSION_VERSION = '0.82.0'
export const transmissionRoute: readonly EarlyWalkDirection[] = ['left', 'down']
export interface FirstHallTransmissionState {
  stage: number
  walk: number
  location: 'room'
  x: number
  y: number
  teacherX: number
  teacherY: number
  focused: boolean
  eyesClosed: boolean
  touched: boolean
  received: boolean
  recovered: boolean
  description: 'unread' | 'close-eight-forces'
  record: 'none' | 'current' | 'recalled'
}
export function firstHallTransmissionAt(stage: number, walk = 0, record: FirstHallTransmissionState['record'] = 'current'): FirstHallTransmissionState {
  const steps = stage >= 2 ? 2 : walk
  return { stage, walk, location: 'room', x: 300, y: 270,
    teacherX: steps ? 300 : 340, teacherY: steps === 2 ? 250 : 230,
    focused: stage >= 1, eyesClosed: stage >= 1 && stage < 4,
    touched: stage >= 2, received: stage >= 3, recovered: stage >= 4,
    description: stage >= 5 ? 'close-eight-forces' : 'unread',
    record: stage ? record : 'none' }
}
export function validFirstHallTransmission(t: Record<string, unknown> | FirstHallTransmissionState): t is FirstHallTransmissionState {
  return boundedInteger(t.stage, 6) && boundedInteger(t.walk, t.stage === 1 ? 2 : 0)
    && (t.stage ? t.record === 'current' || t.record === 'recalled' : t.record === 'none')
    && fieldsMatch(t, firstHallTransmissionAt(t.stage, t.walk, t.record as FirstHallTransmissionState['record']))
}
