import { boundedInteger, fieldsMatch, historyRecordMatches } from './state-guards'
export const FIRST_HALL_TEACHER_VERSION = '0.79.0'
export interface FirstHallTeacherState {
  stage: number
  location: 'room'
  x: number
  y: number
  door: 'closed'
  tired: true
  scroll: 'table'
  teacher: 'unseen' | 'voice' | 'appeared'
  teacherX: number
  teacherY: number
  looked: boolean
  recognized: boolean
  asked: boolean
  background: 'unknown' | 'limited'
  stopped: boolean
  record: 'none' | 'current' | 'recalled'
}
export function firstHallTeacherAt(stage: number, record: FirstHallTeacherState['record'] = 'current'): FirstHallTeacherState {
  return { stage, location: 'room', x: 300, y: 270, door: 'closed', tired: true, scroll: 'table',
    teacher: stage >= 2 ? 'appeared' : stage ? 'voice' : 'unseen', teacherX: 260, teacherY: 190,
    looked: stage >= 2, recognized: stage >= 3, asked: stage >= 4, background: stage >= 5 ? 'limited' : 'unknown',
    stopped: stage >= 6, record: stage ? record : 'none' }
}
export function validFirstHallTeacher(t: Record<string, unknown> | FirstHallTeacherState): t is FirstHallTeacherState {
  return boundedInteger(t.stage, 7) && historyRecordMatches(t.record, t.stage)
    && fieldsMatch(t, firstHallTeacherAt(t.stage, t.record as FirstHallTeacherState['record']))
}
