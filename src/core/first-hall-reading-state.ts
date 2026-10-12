import { fieldsMatch, boundedInteger } from './state-guards'
export const FIRST_HALL_READING_VERSION = '0.65.0'
export type ReadingRecord = 'none' | 'current' | 'recalled'
export interface FirstHallReadingState {
  stage: number
  shelf: boolean
  picked: boolean
  opened: boolean
  grade: boolean
  leaned: boolean
  method: boolean
  glanced: boolean
  record: ReadingRecord
}
export function firstHallReadingAt(stage: number, record: ReadingRecord = 'none'): FirstHallReadingState {
  return { stage, shelf: stage >= 1, picked: stage >= 2, opened: stage >= 3, grade: stage >= 4,
    leaned: stage >= 5, method: stage >= 6, glanced: stage >= 7, record }
}
export function validFirstHallReading(task: Record<string, unknown> | FirstHallReadingState): task is FirstHallReadingState {
  return boundedInteger(task.stage, 8)
    && (task.stage < 2 ? task.record === 'none' : task.record === 'current' || task.record === 'recalled')
    && fieldsMatch(task, firstHallReadingAt(task.stage, task.record as ReadingRecord))
}
