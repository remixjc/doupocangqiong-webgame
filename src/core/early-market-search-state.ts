import { boundedInteger, fieldsMatch } from './state-guards'
export const EARLY_MARKET_SEARCH_VERSION = '0.49.0'
export interface MarketSearchState {
  stage: number
  promise: boolean
  bracelet: 'stall' | 'xuner-viewing' | 'returned'
  stranger: 'unseen' | 'heard' | 'seen'
}
export function marketSearchAt(stage: number): MarketSearchState {
  return { stage, promise: stage >= 1, bracelet: stage >= 13 ? 'returned' : stage >= 10 ? 'xuner-viewing' : 'stall',
    stranger: stage >= 19 ? 'seen' : stage >= 16 ? 'heard' : 'unseen' }
}
export function validMarketSearch(value: Record<string, unknown> | MarketSearchState): value is MarketSearchState {
  if (!boundedInteger(value.stage, 20)) return false
  const expected = marketSearchAt(value.stage)
  return fieldsMatch(value, expected)
}
