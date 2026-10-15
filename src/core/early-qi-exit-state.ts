import { stagedFieldsMatch } from './state-guards'

export const EARLY_QI_EXIT_VERSION = '0.94.0'
export interface QiExitState {
  stage: number
  family: 'xiaoyan' | 'elder'
  registered: boolean
  rules: boolean
  xuner: 'held' | 'elder' | 'registered'
  exited: boolean
  father: boolean
  assured: boolean
}
export function qiExitAt(stage: number): QiExitState {
  return { stage, family: stage === 3 ? 'elder' : 'xiaoyan', registered: stage >= 4, rules: stage >= 5,
    xuner: stage >= 8 ? 'registered' : stage === 7 ? 'elder' : 'held', exited: stage >= 9,
    father: stage >= 10, assured: stage >= 12 }
}
export function validQiExit(task: Record<string, unknown> | QiExitState): task is QiExitState {
  return stagedFieldsMatch(task, 13, qiExitAt)
}
