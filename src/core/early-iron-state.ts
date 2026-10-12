import { stagedFieldsMatch } from './state-guards'
export const EARLY_IRON_VERSION = '0.55.0'
export interface IronState {
  stage: number
  owner: 'bag' | 'yan' | 'teacher' | 'table'
  technique: boolean
  perception: boolean
  tier: boolean
  risk: boolean
  wish: boolean
  limit: boolean
}
export function ironAt(stage: number): IronState {
  return { stage, owner: stage < 2 || stage >= 17 ? 'bag' : stage < 5 || stage >= 13 ? 'yan' : stage < 12 ? 'teacher' : 'table',
    technique: stage >= 6, perception: stage >= 7, tier: stage >= 9, risk: stage >= 11, wish: stage >= 14, limit: stage >= 15 }
}
export function validIron(value: Record<string, unknown> | IronState): value is IronState {
  return stagedFieldsMatch(value, 18, ironAt)
}
