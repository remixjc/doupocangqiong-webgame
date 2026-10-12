import { boundedInteger, fieldsMatch } from './state-guards'
export const EARLY_MOUNTAIN_RING_VERSION = '0.41.0'
export const EARLY_MOUNTAIN_RING_ID = 'early-mountain-ring'
export interface MountainRingState {
  stage: number
  ascent: 'below' | 'climbing' | 'top'
  voice: 'silent' | 'heard' | 'searched' | 'hinted' | 'located'
  speaker: 'unasked' | 'asked'
  identity: 'unknown' | 'asked' | 'withheld'
  qi: 'unknown' | 'hinted' | 'asked' | 'admitted'
  ring: 'worn' | 'thrown' | 'floating'
  elder: 'unseen' | 'visible'
  mood: 'burdened' | 'firm' | 'angry' | 'regretful' | 'restrained' | 'hopeful'
  future: 'unasked' | 'asked'
}
export function mountainRingAt(stage: number): MountainRingState {
  return { stage,
    ascent: stage >= 2 ? 'top' : stage >= 1 ? 'climbing' : 'below',
    voice: stage >= 7 ? 'located' : stage >= 6 ? 'hinted' : stage >= 5 ? 'searched' : stage >= 4 ? 'heard' : 'silent',
    speaker: stage >= 8 ? 'asked' : 'unasked',
    identity: stage >= 10 ? 'withheld' : stage >= 9 ? 'asked' : 'unknown',
    qi: stage >= 12 ? 'admitted' : stage >= 11 ? 'asked' : stage >= 10 ? 'hinted' : 'unknown',
    ring: stage >= 16 ? 'floating' : stage >= 13 ? 'thrown' : 'worn',
    elder: stage >= 16 ? 'visible' : 'unseen',
    mood: stage >= 19 ? 'hopeful' : stage >= 17 ? 'restrained' : stage >= 14 ? 'regretful'
      : stage >= 13 ? 'angry' : stage >= 3 ? 'firm' : 'burdened',
    future: stage >= 20 ? 'asked' : 'unasked' }
}
export function validMountainRing(value: Record<string, unknown> | MountainRingState): value is MountainRingState {
  if (!boundedInteger(value.stage, 21)) return false
  const expected = mountainRingAt(value.stage)
  return fieldsMatch(value, expected)
}
