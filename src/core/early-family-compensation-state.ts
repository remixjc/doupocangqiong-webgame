import { stagedFieldsMatch } from './state-guards'
export const EARLY_FAMILY_COMPENSATION_VERSION = '0.39.0'
export interface FamilyCompensationState {
  stage: number
  pill: 'unidentified' | 'described'
  lore: 'unread' | 'reviewed'
  maker: 'unmentioned' | 'guhe'
  objection: 'none' | 'spoken'
  elders: 'quiet' | 'blocking' | 'seated'
  consent: 'unasked' | 'asked' | 'not-given'
  extra: 'unmentioned' | 'offered'
  terms: 'unreviewed' | 'offer-only'
}
export function familyCompensationAt(stage: number): FamilyCompensationState {
  return { stage, pill: stage >= 1 ? 'described' : 'unidentified',
    lore: stage >= 2 ? 'reviewed' : 'unread', maker: stage >= 3 ? 'guhe' : 'unmentioned',
    objection: stage >= 5 ? 'spoken' : 'none',
    elders: stage >= 8 ? 'seated' : stage >= 6 ? 'blocking' : 'quiet',
    consent: stage >= 11 ? 'not-given' : stage >= 10 ? 'asked' : 'unasked',
    extra: stage >= 13 ? 'offered' : 'unmentioned', terms: stage >= 14 ? 'offer-only' : 'unreviewed' }
}
export function validFamilyCompensation(value: Record<string, unknown> | FamilyCompensationState): value is FamilyCompensationState {
  return stagedFieldsMatch(value, 15, familyCompensationAt)
}
