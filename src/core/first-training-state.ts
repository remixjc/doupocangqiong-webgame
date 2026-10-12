import { boundedInteger, fieldsMatch } from './state-guards'
export const FIRST_TRAINING_VERSION = '0.58.0'
export const FIRST_REVIEW_VERSION = '0.59.0'
export interface FirstTrainingState {
  stage: number
  beats: number
  attempts: number
  seated: boolean
  light: 'warm' | 'fading'
  forecast: 'none' | 'two-months'
  period: 'none' | 'half-month'
  result: 'none' | 'fourth-duan'
  teacherReaction: boolean
  pale: boolean
  dressed: boolean
}
export function firstTrainingAt(stage: number, beats = stage >= 3 ? 3 : 0, attempts = 0): FirstTrainingState {
  return { stage, beats, attempts, seated: stage >= 1 && stage <= 6,
    light: stage >= 6 ? 'fading' : 'warm', forecast: stage >= 9 ? 'two-months' : 'none',
    period: stage >= 11 ? 'half-month' : 'none', result: stage >= 12 ? 'fourth-duan' : 'none',
    teacherReaction: stage >= 13, pale: stage >= 14, dressed: stage >= 16 }
}
export function validFirstTraining(task: Record<string, unknown> | FirstTrainingState): task is FirstTrainingState {
  return boundedInteger(task.stage, 17) && boundedInteger(task.beats, 3)
    && boundedInteger(task.attempts, task.stage < 2 ? 0 : 1_000_000)
    && (task.stage < 2 ? task.beats === 0 : task.stage === 2 ? task.beats < 3 : task.beats === 3)
    && fieldsMatch(task, firstTrainingAt(task.stage, task.beats, task.attempts))
}
