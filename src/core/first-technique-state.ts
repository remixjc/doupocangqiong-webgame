import { stagedFieldsMatch } from './state-guards'

export const FIRST_TECHNIQUE_VERSION = '0.60.0'
export interface FirstTechniqueState {
  stage: number
  iron: 'pillow' | 'hands'
  clean: boolean
  period: 'none' | 'rest-study'
  guidance: boolean
  eyes: 'open' | 'closed'
  sensed: boolean
  claw: boolean
}
export function firstTechniqueAt(stage: number): FirstTechniqueState {
  return { stage, iron: stage >= 1 ? 'hands' : 'pillow', clean: stage >= 2,
    period: stage >= 3 ? 'rest-study' : 'none', guidance: stage >= 4,
    eyes: stage >= 5 && stage < 7 ? 'closed' : 'open', sensed: stage >= 6, claw: stage >= 8 }
}
export function validFirstTechnique(task: Record<string, unknown> | FirstTechniqueState): task is FirstTechniqueState {
  return stagedFieldsMatch(task, 9, firstTechniqueAt)
}
