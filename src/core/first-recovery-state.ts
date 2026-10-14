import { boundedInteger, fieldsMatch } from './state-guards'
export const FIRST_RECOVERY_VERSION = '0.88.0'
export interface FirstRecoveryState {
  stage: number
  walk: number
  priorStage: number
  record: 'none' | 'current' | 'recalled'
  location: 'courtyard' | 'room'
  x: number
  y: number
  robe: 'on' | 'off'
  entered: boolean
  cool: boolean
  eyes: 'open' | 'closed'
  breath: boolean
  asleep: boolean
  repaired: boolean
  pale: boolean
  awake: boolean
}
export function firstRecoveryAt(stage: number, walk = 0, record: FirstRecoveryState['record'] = 'current', priorStage = 0): FirstRecoveryState {
  return { stage, walk, priorStage, record: stage ? record : 'none', location: stage ? 'room' : 'courtyard',
    x: stage >= 4 ? 120 : stage >= 2 ? 140 : 300 - walk * 40, y: 370,
    robe: stage >= 3 ? 'off' : 'on', entered: stage >= 4, cool: stage >= 5,
    eyes: stage >= 6 && stage < 11 ? 'closed' : 'open', breath: stage >= 7,
    asleep: stage >= 8 && stage < 11, repaired: stage >= 9, pale: stage >= 10, awake: stage >= 11 }
}
export function firstRecoveryMinimum(stage: number): number {
  return stage >= 10 ? 3 : stage >= 4 ? 2 : stage >= 1 ? 1 : 0
}
export function validFirstRecovery(t: Record<string, unknown> | FirstRecoveryState): t is FirstRecoveryState {
  return boundedInteger(t.stage, 11) && boundedInteger(t.walk, t.stage === 1 ? 4 : 0)
    && boundedInteger(t.priorStage, t.stage ? 7 : 0)
    && (t.stage ? t.record === 'current' || t.record === 'recalled' : t.record === 'none')
    && fieldsMatch(t, firstRecoveryAt(t.stage, t.walk, t.record as FirstRecoveryState['record'], t.priorStage))
}
