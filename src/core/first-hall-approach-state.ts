import { stagedFieldsMatch } from './state-guards'

export const FIRST_HALL_APPROACH_VERSION = '0.69.0'
export interface FirstHallApproachState {
  stage: number
  clothes: boolean
  ning: 'west' | 'aisle' | 'east'
  memorized: boolean
  first: 'open' | 'rolled'
}
export function firstHallApproachAt(stage: number): FirstHallApproachState {
  return { stage, clothes: stage >= 7, ning: stage >= 9 ? 'east' : stage >= 8 ? 'aisle' : 'west',
    memorized: stage >= 11, first: stage >= 13 ? 'rolled' : 'open' }
}
export function validFirstHallApproach(t: Record<string, unknown> | FirstHallApproachState): t is FirstHallApproachState {
  return stagedFieldsMatch(t, 14, firstHallApproachAt)
}
