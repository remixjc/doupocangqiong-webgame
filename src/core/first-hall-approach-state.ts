import { stagedFieldsMatch } from './state-guards'

export const FIRST_HALL_APPROACH_VERSION = '0.69.0'
export const FIRST_HALL_FIRST_RETURN_VERSION = '0.70.0'
export const FIRST_HALL_CONFLICT_VERSION = '0.71.0'
export const FIRST_HALL_THREAT_VERSION = '0.72.0'
export const FIRST_HALL_EXIT_RESPONSE_VERSION = '0.73.0'
export interface FirstHallApproachState {
  stage: number
  clothes: boolean
  ning: 'west' | 'aisle' | 'east'
  memorized: boolean
  first: 'open' | 'rolled' | 'returned'
  returnRecord: 'none' | 'current' | 'recalled'
  ownPlaced: boolean
  secondRecord: 'none' | 'current' | 'recalled'
  threatHeard: boolean
  yan: 'east' | 'aisle' | 'entrance'
}
export function firstHallApproachAt(stage: number, returnRecord: FirstHallApproachState['returnRecord'] = 'none',
  secondRecord: FirstHallApproachState['secondRecord'] = 'none'): FirstHallApproachState {
  return { stage, clothes: stage >= 7, ning: stage >= 9 ? 'east' : stage >= 8 ? 'aisle' : 'west',
    memorized: stage >= 11, first: stage >= 18 ? 'returned' : stage >= 13 ? 'rolled' : 'open', returnRecord,
    ownPlaced: stage >= 25, secondRecord, threatHeard: stage >= 37,
    yan: stage >= 43 ? 'entrance' : stage >= 41 ? 'aisle' : 'east' }
}
export function validFirstHallApproach(t: Record<string, unknown> | FirstHallApproachState): t is FirstHallApproachState {
  return ((t.stage as number) >= 18 ? t.returnRecord === 'current' || t.returnRecord === 'recalled' : t.returnRecord === 'none')
    && ((t.stage as number) >= 28 ? t.secondRecord === 'current' || t.secondRecord === 'recalled' : t.secondRecord === 'none')
    && stagedFieldsMatch(t, 46, stage => firstHallApproachAt(stage, t.returnRecord as FirstHallApproachState['returnRecord'], t.secondRecord as FirstHallApproachState['secondRecord']))
}
