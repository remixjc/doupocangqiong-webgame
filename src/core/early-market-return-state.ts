import { boundedInteger, fieldsMatch } from './state-guards'
export const EARLY_MARKET_RETURN_VERSION = '0.54.0'
export interface MarketReturnState {
  stage: number
  departed: boolean
  home: boolean
  parted: boolean
  room: boolean
  locked: boolean
  teacher: boolean
  materials: boolean
  asked: boolean
}
export function marketReturnAt(stage: number): MarketReturnState {
  return { stage, departed: stage >= 1, home: stage >= 2, parted: stage >= 3, room: stage >= 4,
    locked: stage >= 5, teacher: stage >= 6, materials: stage >= 7, asked: stage >= 8 }
}
export function validMarketReturn(value: Record<string, unknown> | MarketReturnState): value is MarketReturnState {
  return boundedInteger(value.stage, 9) && fieldsMatch(value, marketReturnAt(value.stage))
}
