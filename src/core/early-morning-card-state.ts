export const EARLY_MORNING_CARD_VERSION = '0.46.0'
export interface MorningCardState {
  stage: number
  meditation: 'none' | 'reviewed' | 'ended'
  sense: 'unobserved' | 'felt'
  call: 'none' | 'heard'
  savings: 'unreviewed' | 'taken'
  yan: 'room' | 'outside'
  card: 'xuner' | 'offered' | 'yan'
  capacity: 'unknown' | 'noted'
  funds: 'pending' | 'credited' | 'existing'
  exchange: 'none' | 'yan-spoken' | 'answered'
}
export function morningCardAt(stage: number, funds: MorningCardState['funds'] = 'pending'): MorningCardState {
  return { stage, meditation: stage >= 2 ? 'ended' : stage >= 1 ? 'reviewed' : 'none',
    sense: stage >= 3 ? 'felt' : 'unobserved', call: stage >= 5 ? 'heard' : 'none',
    savings: stage >= 6 ? 'taken' : 'unreviewed', yan: stage >= 7 ? 'outside' : 'room',
    card: stage >= 9 ? 'yan' : stage >= 8 ? 'offered' : 'xuner', capacity: stage >= 10 ? 'noted' : 'unknown',
    funds: stage >= 9 ? funds : 'pending', exchange: stage >= 12 ? 'answered' : stage >= 11 ? 'yan-spoken' : 'none' }
}
export function validMorningCard(value: Record<string, unknown> | MorningCardState): value is MorningCardState {
  if (typeof value.stage !== 'number' || !Number.isSafeInteger(value.stage) || value.stage < 0 || value.stage > 14
    || (value.stage < 9 ? value.funds !== 'pending' : !['credited', 'existing'].includes(String(value.funds)))) return false
  const expected = morningCardAt(value.stage, value.funds as MorningCardState['funds'])
  return (Object.keys(expected) as (keyof MorningCardState)[]).every(key => value[key] === expected[key])
}
