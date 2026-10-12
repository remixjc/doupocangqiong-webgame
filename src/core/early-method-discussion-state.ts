import { boundedInteger, fieldsMatch } from './state-guards'
export const EARLY_METHOD_DISCUSSION_VERSION = '0.43.0'
export interface MethodDiscussionState {
  stage: number
  foundation: 'unexplained' | 'explained'
  alchemy: 'unasked' | 'asked' | 'prerequisites'
  sky: 'unasked' | 'requested' | 'refused'
  offer: 'none' | 'future-method'
  grade: 'unknown' | 'asked' | 'low-huang'
  evolution: 'unasked' | 'asked' | 'claimed' | 'doubted' | 'answered'
  uniqueness: 'unasked' | 'asked' | 'claimed'
  confirmation: 'unasked' | 'asked' | 'reaffirmed'
  teacherTrial: 'unasked' | 'asked' | 'untried'
  otherTrial: 'unasked' | 'asked' | 'untried'
  basis: 'unasked' | 'asked' | 'method-text'
  viewing: 'unasked' | 'requested' | 'deferred'
}
export function methodDiscussionAt(stage: number): MethodDiscussionState {
  return { stage, foundation: stage >= 2 ? 'explained' : 'unexplained',
    alchemy: stage >= 4 ? 'prerequisites' : stage >= 3 ? 'asked' : 'unasked',
    sky: stage >= 6 ? 'refused' : stage >= 5 ? 'requested' : 'unasked',
    offer: stage >= 8 ? 'future-method' : 'none',
    grade: stage >= 10 ? 'low-huang' : stage >= 9 ? 'asked' : 'unknown',
    evolution: stage >= 15 ? 'answered' : stage >= 14 ? 'doubted' : stage >= 13 ? 'claimed' : stage >= 12 ? 'asked' : 'unasked',
    uniqueness: stage >= 17 ? 'claimed' : stage >= 16 ? 'asked' : 'unasked',
    confirmation: stage >= 19 ? 'reaffirmed' : stage >= 18 ? 'asked' : 'unasked',
    teacherTrial: stage >= 21 ? 'untried' : stage >= 20 ? 'asked' : 'unasked',
    otherTrial: stage >= 23 ? 'untried' : stage >= 22 ? 'asked' : 'unasked',
    basis: stage >= 25 ? 'method-text' : stage >= 24 ? 'asked' : 'unasked',
    viewing: stage >= 27 ? 'deferred' : stage >= 26 ? 'requested' : 'unasked' }
}
export function validMethodDiscussion(value: Record<string, unknown> | MethodDiscussionState): value is MethodDiscussionState {
  if (!boundedInteger(value.stage, 28)) return false
  const expected = methodDiscussionAt(value.stage)
  return fieldsMatch(value, expected)
}
