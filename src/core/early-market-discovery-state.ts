import { boundedInteger, fieldsMatch } from './state-guards'
export const EARLY_MARKET_DISCOVERY_VERSION = '0.52.0'
export interface MarketDiscoveryState {
  stage: number
  core: 'unseen' | 'seen'
  feeling: boolean
  iron: 'unseen' | 'noticed' | 'examined'
  advice: boolean
}
export function marketDiscoveryAt(stage: number): MarketDiscoveryState {
  return { stage, core: stage >= 2 ? 'seen' : 'unseen', feeling: stage >= 4,
    iron: stage >= 7 ? 'examined' : stage >= 6 ? 'noticed' : 'unseen', advice: stage >= 8 }
}
export function validMarketDiscovery(value: Record<string, unknown> | MarketDiscoveryState): value is MarketDiscoveryState {
  return boundedInteger(value.stage, 10) && fieldsMatch(value, marketDiscoveryAt(value.stage))
}
