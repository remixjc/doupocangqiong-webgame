import { stagedFieldsMatch } from './state-guards'
export const FIRST_HALL_MATCH_VERSION = '0.66.0'
export const FIRST_HALL_RETURN_VERSION = '0.67.0'
export interface FirstHallMatchState {
  stage: number
  identified: boolean
  attacks: boolean
  palm: boolean
  outside: boolean
  applauded: boolean
}
export function firstHallMatchAt(stage: number): FirstHallMatchState {
  return { stage, identified: stage >= 1, attacks: stage >= 4, palm: stage >= 9,
    outside: stage >= 10, applauded: stage >= 11 }
}
export function validFirstHallMatch(t: Record<string, unknown> | FirstHallMatchState): t is FirstHallMatchState {
  return stagedFieldsMatch(t, 20, firstHallMatchAt)
}
export function hallMatchMinimum(stage: number): number {
  return stage >= 11 ? 4 : stage >= 4 ? 3 : 2
}
