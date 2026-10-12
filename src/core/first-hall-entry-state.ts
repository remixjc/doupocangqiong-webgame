import { stagedFieldsMatch } from './state-guards'
export const FIRST_HALL_ENTRY_VERSION = '0.64.0'
export interface FirstHallEntryState {
  stage: number
  turned: boolean
  plaque: boolean
  noise: boolean
  entered: boolean
  cheers: boolean
  layout: boolean
  fieldLook: boolean
  girl: boolean
}
export function firstHallEntryAt(stage: number): FirstHallEntryState {
  return { stage, turned: stage >= 1, plaque: stage >= 2, noise: stage >= 3,
    entered: stage >= 4, cheers: stage >= 5, layout: stage >= 6, fieldLook: stage >= 7, girl: stage >= 8 }
}
export function validFirstHallEntry(task: Record<string, unknown> | FirstHallEntryState): task is FirstHallEntryState {
  return stagedFieldsMatch(task, 9, firstHallEntryAt)
}
