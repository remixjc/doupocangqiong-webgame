import { boundedInteger, fieldsMatch } from './state-guards'
import type { EarlyWalkDirection } from './early-walk'
export const FIRST_HALL_SCROLL_REVIEW_VERSION = '0.80.0'
export const scrollReviewRoute: readonly EarlyWalkDirection[] = ['right', 'right', 'down']
export interface FirstHallScrollReviewState {
  stage: number
  walk: number
  location: 'room'
  x: number
  y: number
  teacherX: number
  teacherY: number
  scroll: 'table'
  approached: boolean
  opened: boolean
  assessed: boolean
  explained: boolean
  understood: boolean
  requested: boolean
  futureCondition: boolean
  insisted: boolean
  record: 'none' | 'current' | 'recalled'
}
export function firstHallScrollReviewAt(stage: number, walk = 0, record: FirstHallScrollReviewState['record'] = 'current'): FirstHallScrollReviewState {
  const steps = stage ? 3 : walk
  return { stage, walk, location: 'room', x: 300, y: 270, teacherX: 260 + Math.min(steps, 2) * 40, teacherY: steps === 3 ? 230 : 190,
    scroll: 'table', approached: stage >= 1, opened: stage >= 2, assessed: stage >= 3, explained: stage >= 4,
    understood: stage >= 5, requested: stage >= 6, futureCondition: stage >= 7, insisted: stage >= 8,
    record: stage || walk ? record : 'none' }
}
export function validFirstHallScrollReview(t: Record<string, unknown> | FirstHallScrollReviewState): t is FirstHallScrollReviewState {
  return boundedInteger(t.stage, 9) && boundedInteger(t.walk, t.stage ? 0 : 3)
    && (t.stage || t.walk ? t.record === 'current' || t.record === 'recalled' : t.record === 'none')
    && fieldsMatch(t, firstHallScrollReviewAt(t.stage, t.walk, t.record as FirstHallScrollReviewState['record']))
}
