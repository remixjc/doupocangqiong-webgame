import { stagedFieldsMatch } from './state-guards'

export const FIRST_HALL_APPROACH_VERSION = '0.69.0'
export const FIRST_HALL_FIRST_RETURN_VERSION = '0.70.0'
export interface FirstHallApproachState {
  stage: number
  clothes: boolean
  ning: 'west' | 'aisle' | 'east'
  memorized: boolean
  first: 'open' | 'rolled' | 'returned'
  returnRecord: 'none' | 'current' | 'recalled'
}
export function firstHallApproachAt(stage: number, returnRecord: FirstHallApproachState['returnRecord'] = 'none'): FirstHallApproachState {
  return { stage, clothes: stage >= 7, ning: stage >= 9 ? 'east' : stage >= 8 ? 'aisle' : 'west',
    memorized: stage >= 11, first: stage >= 18 ? 'returned' : stage >= 13 ? 'rolled' : 'open', returnRecord }
}
export function validFirstHallApproach(t: Record<string, unknown> | FirstHallApproachState): t is FirstHallApproachState {
  return ((t.stage as number) >= 18 ? t.returnRecord === 'current' || t.returnRecord === 'recalled' : t.returnRecord === 'none')
    && stagedFieldsMatch(t, 19, stage => firstHallApproachAt(stage, t.returnRecord as FirstHallApproachState['returnRecord']))
}
