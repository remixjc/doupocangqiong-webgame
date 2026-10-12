import { stagedFieldsMatch } from './state-guards'
export const EARLY_PREPARATION_BRIEF_VERSION = '0.44.0'
export interface PreparationBriefState {
  stage: number
  training: 'none' | 'refocused' | 'gradual' | 'foundation-confirmed'
  oral: 'unasked' | 'asked' | 'unsuitable'
  mild: 'unasked' | 'asked' | 'proposed'
  main: 0 | 3
  auxiliary: 0 | 2
  woodCore: 0 | 1
  secrecy: 'unmentioned' | 'requested'
  elder: 'outside' | 'in-ring'
  ring: 'floating' | 'worn'
  funding: 'unmentioned' | 'concerned' | 'self-arranged' | 'borrowing-planned'
  visitor: 'unseen' | 'purple-figure'
}
export function preparationBriefAt(stage: number): PreparationBriefState {
  return { stage, training: stage >= 5 ? 'foundation-confirmed' : stage >= 3 ? 'gradual' : stage >= 1 ? 'refocused' : 'none',
    oral: stage >= 7 ? 'unsuitable' : stage >= 6 ? 'asked' : 'unasked',
    mild: stage >= 9 ? 'proposed' : stage >= 8 ? 'asked' : 'unasked',
    main: stage >= 10 ? 3 : 0, auxiliary: stage >= 11 ? 2 : 0, woodCore: stage >= 12 ? 1 : 0,
    secrecy: stage >= 13 ? 'requested' : 'unmentioned', elder: stage >= 14 ? 'in-ring' : 'outside',
    ring: stage >= 15 ? 'worn' : 'floating',
    funding: stage >= 18 ? 'borrowing-planned' : stage >= 17 ? 'self-arranged' : stage >= 16 ? 'concerned' : 'unmentioned',
    visitor: stage >= 19 ? 'purple-figure' : 'unseen' }
}
export function validPreparationBrief(value: Record<string, unknown> | PreparationBriefState): value is PreparationBriefState {
  return stagedFieldsMatch(value, 20, preparationBriefAt)
}
