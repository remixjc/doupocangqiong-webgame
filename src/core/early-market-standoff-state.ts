import { boundedInteger, fieldsMatch } from './state-guards'
export const EARLY_MARKET_STANDOFF_VERSION = '0.51.0'
export interface MarketStandoffState {
  stage: number
  ring: 'none' | 'closed' | 'withdrawn'
  called: boolean
  guards: 'absent' | 'approaching' | 'surrounding' | 'left'
  challenge: 'none' | 'proposed' | 'refused'
  opponent: 'present' | 'withdrawing' | 'paused' | 'left'
  chase: 'none' | 'intended' | 'stopped'
  walkedDeep: boolean
}
export function marketStandoffAt(stage: number): MarketStandoffState {
  return { stage, ring: stage >= 21 ? 'withdrawn' : stage >= 2 ? 'closed' : 'none', called: stage >= 4,
    guards: stage >= 28 ? 'left' : stage >= 6 ? 'surrounding' : stage >= 5 ? 'approaching' : 'absent',
    challenge: stage >= 14 ? 'refused' : stage >= 11 ? 'proposed' : 'none',
    opponent: stage >= 21 ? 'left' : stage >= 20 ? 'paused' : stage >= 19 ? 'withdrawing' : 'present',
    chase: stage >= 23 ? 'stopped' : stage >= 22 ? 'intended' : 'none', walkedDeep: stage >= 33 }
}
export function validMarketStandoff(value: Record<string, unknown> | MarketStandoffState): value is MarketStandoffState {
  return boundedInteger(value.stage, 34) && fieldsMatch(value, marketStandoffAt(value.stage))
}
