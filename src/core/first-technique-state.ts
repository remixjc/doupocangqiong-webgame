import { boundedInteger, fieldsMatch } from './state-guards'

export const FIRST_TECHNIQUE_VERSION = '0.60.0'
export const FIRST_BOTTLE_VERSION = '0.61.0'
export interface FirstTechniqueState {
  stage: number
  iron: 'pillow' | 'hands'
  clean: boolean
  period: 'none' | 'rest-study'
  guidance: boolean
  eyes: 'open' | 'closed'
  sensed: boolean
  claw: boolean
  beats: number
  attempts: number
  bottle: 'unobserved' | 'intact' | 'turning' | 'fallen' | 'fragments'
  limited: boolean
  insufficient: boolean
  needed: 0 | 7
  seekLow: boolean
}
export function firstTechniqueAt(stage: number, beats = stage >= 12 ? 2 : 0, attempts = 0): FirstTechniqueState {
  return { stage, iron: stage >= 1 ? 'hands' : 'pillow', clean: stage >= 2,
    period: stage >= 3 ? 'rest-study' : 'none', guidance: stage >= 4,
    eyes: stage >= 5 && stage < 7 ? 'closed' : 'open', sensed: stage >= 6, claw: stage >= 8 && stage < 18,
    beats, attempts, bottle: stage >= 14 ? 'fragments' : stage === 13 ? 'fallen' : stage === 12 ? 'turning' : stage >= 10 ? 'intact' : 'unobserved',
    limited: stage >= 11, insufficient: stage >= 15, needed: stage >= 16 ? 7 : 0, seekLow: stage >= 17 }
}
export function validFirstTechnique(task: Record<string, unknown> | FirstTechniqueState): task is FirstTechniqueState {
  return boundedInteger(task.stage, 19) && boundedInteger(task.beats, 2)
    && boundedInteger(task.attempts, task.stage < 11 ? 0 : 1_000_000)
    && (task.stage < 11 ? task.beats === 0 : task.stage === 11 ? task.beats < 2 : task.beats === 2)
    && fieldsMatch(task, firstTechniqueAt(task.stage, task.beats, task.attempts))
}
