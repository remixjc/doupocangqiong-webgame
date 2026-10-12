import { stagedFieldsMatch } from './state-guards'
export const EARLY_MOUNTAIN_VISITOR_VERSION = '0.45.0'
export interface MountainVisitorState {
  stage: number
  identity: 'unknown' | 'xuner'
  confidence: 'unrecorded' | 'noticed'
  meeting: 'distant' | 'near'
  apology: 'unspoken' | 'spoken' | 'answered'
  funds: 'unasked' | 'asked' | 'counterasked' | 'shortage' | 'offered' | 'adequate'
  purpleCard: 'hidden' | 'displayed' | 'stowed'
  cardKnowledge: 'unknown' | 'noted'
  repayment: 'unmentioned' | 'promised' | 'waived'
  invitation: 'none' | 'tomorrow'
  yan: 'hill' | 'descending' | 'left'
  xuner: 'meeting' | 'after-departure' | 'reflected'
}
export function mountainVisitorAt(stage: number): MountainVisitorState {
  return { stage, identity: stage >= 1 ? 'xuner' : 'unknown', confidence: stage >= 2 ? 'noticed' : 'unrecorded',
    meeting: stage >= 6 ? 'near' : 'distant',
    apology: stage >= 9 ? 'answered' : stage >= 8 ? 'spoken' : 'unspoken',
    funds: stage >= 16 ? 'adequate' : stage >= 13 ? 'offered' : stage >= 12 ? 'shortage'
      : stage >= 11 ? 'counterasked' : stage >= 10 ? 'asked' : 'unasked',
    purpleCard: stage >= 19 ? 'stowed' : stage >= 14 ? 'displayed' : 'hidden',
    cardKnowledge: stage >= 15 ? 'noted' : 'unknown',
    repayment: stage >= 18 ? 'waived' : stage >= 17 ? 'promised' : 'unmentioned',
    invitation: stage >= 20 ? 'tomorrow' : 'none',
    yan: stage >= 23 ? 'left' : stage >= 22 ? 'descending' : 'hill',
    xuner: stage >= 25 ? 'reflected' : stage >= 24 ? 'after-departure' : 'meeting' }
}
export function validMountainVisitor(value: Record<string, unknown> | MountainVisitorState): value is MountainVisitorState {
  return stagedFieldsMatch(value, 26, mountainVisitorAt)
}
