import { stagedFieldsMatch } from './state-guards'
export const EARLY_MARKET_BRACELETS_VERSION = '0.50.0'
export interface MarketBraceletsState {
  stage: number
  identity: 'anonymous' | 'named'
  blocked: boolean
  expensive: 'unoffered' | 'offered' | 'retained'
  green: 'unshown' | 'shown' | 'received' | 'worn'
  thanked: boolean
  badge: boolean
}
export function marketBraceletsAt(stage: number): MarketBraceletsState {
  return { stage, identity: stage >= 3 ? 'named' : 'anonymous', blocked: stage >= 2,
    expensive: stage >= 13 ? 'retained' : stage >= 6 ? 'offered' : 'unoffered',
    green: stage >= 21 ? 'worn' : stage >= 20 ? 'received' : stage >= 17 ? 'shown' : 'unshown',
    thanked: stage >= 22, badge: stage >= 24 }
}
// The short and detailed accounts share one irreversible gift record.
// Each lower bound is reached only after the corresponding visible action.
export function braceletMinimum(stage: number): number {
  return stage >= 28 ? 6 : stage >= 20 ? 5 : stage >= 17 ? 4 : stage >= 13 ? 3 : stage >= 7 ? 2 : stage >= 1 ? 1 : 0
}
export function validMarketBracelets(value: Record<string, unknown> | MarketBraceletsState): value is MarketBraceletsState {
  return stagedFieldsMatch(value, 28, marketBraceletsAt)
}
