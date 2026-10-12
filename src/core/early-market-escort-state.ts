export const EARLY_MARKET_ESCORT_VERSION = '0.48.0'
export interface MarketEscortState {
  stage: number
  entered: boolean
  captain: 'unknown' | 'introduced'
  following: 0 | 3
  patrol: boolean
}
export function marketEscortAt(stage: number): MarketEscortState {
  return { stage, entered: stage >= 5, captain: stage >= 9 ? 'introduced' : 'unknown',
    following: stage >= 16 ? 3 : 0, patrol: stage >= 18 }
}
export function validMarketEscort(value: Record<string, unknown> | MarketEscortState): value is MarketEscortState {
  if (typeof value.stage !== 'number' || !Number.isSafeInteger(value.stage) || value.stage < 0 || value.stage > 24) return false
  const expected = marketEscortAt(value.stage)
  return (Object.keys(expected) as (keyof MarketEscortState)[]).every(key => value[key] === expected[key])
}
export const marketEscortObserver = (stage: number): boolean => stage >= 13 && stage < 18
