import { stagedFieldsMatch } from './state-guards'
export const FIRST_DEPARTURE_VERSION = '0.62.0'
export interface FirstDepartureState {
  stage: number
  risen: boolean
  ringStill: boolean
  outside: boolean
  sunlight: boolean
  closed: boolean
  path: boolean
  willows: boolean
}
export function firstDepartureAt(stage: number): FirstDepartureState {
  return { stage, risen: stage >= 1, ringStill: stage >= 2, outside: stage >= 4,
    sunlight: stage >= 5, closed: stage >= 6, path: stage >= 7, willows: stage >= 8 }
}
export function validFirstDeparture(task: Record<string, unknown> | FirstDepartureState): task is FirstDepartureState {
  return stagedFieldsMatch(task, 9, firstDepartureAt)
}
