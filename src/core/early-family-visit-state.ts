import { boundedInteger, fieldsMatch } from './state-guards'
export const EARLY_FAMILY_VISIT_VERSION = '0.38.0'
export const EARLY_FAMILY_VISIT_ID = 'early-family-visit'

export interface FamilyVisitState {
  stage: number
  seat: 'unseen' | 'missing' | 'shared'
  emblem: 'unseen' | 'cloud-sword'
  identity: 'unknown' | 'nalan'
  request: 'unspoken' | 'spoken'
  pressure: 'quiet' | 'raised' | 'withdrawn'
  box: 'unseen' | 'presented'
}
export function familyVisitAt(stage: number): FamilyVisitState {
  return {
    stage,
    seat: stage >= 8 ? 'shared' : stage >= 5 ? 'missing' : 'unseen',
    emblem: stage >= 10 ? 'cloud-sword' : 'unseen',
    identity: stage >= 11 ? 'nalan' : 'unknown',
    request: stage >= 13 ? 'spoken' : 'unspoken',
    pressure: stage >= 15 ? 'withdrawn' : stage >= 14 ? 'raised' : 'quiet',
    box: stage >= 16 ? 'presented' : 'unseen',
  }
}
export function validFamilyVisit(value: Record<string, unknown> | FamilyVisitState): value is FamilyVisitState {
  if (!boundedInteger(value.stage, 17)) return false
  const expected = familyVisitAt(value.stage)
  return fieldsMatch(value, expected)
}
