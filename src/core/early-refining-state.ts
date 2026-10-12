import { stagedFieldsMatch } from './state-guards'
export const EARLY_REFINING_VERSION = '0.56.0'
export interface RefiningState {
  stage: number
  core: 'table' | 'teacher'
  water: boolean
  flame: boolean
  primary: 0 | 1 | 3
  cleaned: boolean
  shrunk: boolean
  auxiliary: 0 | 2
  fused: boolean
}
export function refiningAt(stage: number): RefiningState {
  return { stage, core: stage >= 1 ? 'teacher' : 'table', water: stage >= 3, flame: stage >= 4,
    primary: stage >= 6 ? 3 : stage >= 5 ? 1 : 0, cleaned: stage >= 7, shrunk: stage >= 8,
    auxiliary: stage >= 9 ? 2 : 0, fused: stage >= 10 }
}
export function validRefining(value: Record<string, unknown> | RefiningState): value is RefiningState {
  return stagedFieldsMatch(value, 11, refiningAt)
}
export function refiningLiquidMinimum(stage: number): number {
  return stage >= 9 ? 4 : stage >= 6 ? 3 : stage >= 3 ? 2 : stage >= 1 ? 1 : 0
}
