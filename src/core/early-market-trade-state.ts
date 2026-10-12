import { boundedInteger, fieldsMatch } from './state-guards'
export const EARLY_MARKET_TRADE_VERSION = '0.53.0'
export interface MarketTradeState {
  stage: number
  quote: number
  bundle: 'none' | 'selected' | 'offered' | 'agreed' | 'purchased'
  settlement: 'none' | 'new-order' | 'existing-order'
  left: boolean
}
export function marketTradeMinimum(stage: number): number { return stage >= 13 ? 4 : stage >= 10 ? 3 : stage ? 2 : 0 }
export function marketTradeAt(stage: number, settlement: MarketTradeState['settlement'] = 'none'): MarketTradeState {
  return { stage, quote: stage >= 8 ? 470 : stage >= 5 ? 500 : 0,
    bundle: stage >= 13 ? 'purchased' : stage >= 12 ? 'agreed' : stage >= 10 ? 'offered' : stage >= 9 ? 'selected' : 'none',
    settlement, left: stage >= 14 }
}
export function validMarketTrade(value: Record<string, unknown> | MarketTradeState): value is MarketTradeState {
  return boundedInteger(value.stage, 17) && (value.stage < 13 ? value.settlement === 'none'
    : value.settlement === 'new-order' || value.settlement === 'existing-order')
    && fieldsMatch(value, marketTradeAt(value.stage, value.settlement as MarketTradeState['settlement']))
}
