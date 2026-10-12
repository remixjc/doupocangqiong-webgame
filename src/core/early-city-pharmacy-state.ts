export const EARLY_CITY_PHARMACY_VERSION = '0.47.0'
export interface CityPharmacyState {
  stage: number
  location: 'clan' | 'city' | 'pharmacy'
  outing: 'walking' | 'noticed' | 'left' | 'stalls'
  primarySpec: 'unknown' | '20-year'
  auxiliarySpec: 'unknown' | '5-year'
  primaryOrder: 'pending' | 'new' | 'existing'
  auxiliaryOrder: 'pending' | 'new' | 'existing'
  review: 'none' | 'herbs-only'
}
export function cityPharmacyAt(stage: number, primary: CityPharmacyState['primaryOrder'] = 'pending', auxiliary: CityPharmacyState['auxiliaryOrder'] = 'pending'): CityPharmacyState {
  return { stage, location: stage >= 8 ? 'pharmacy' : stage >= 4 ? 'city' : 'clan',
    outing: stage >= 6 ? 'stalls' : stage >= 4 ? 'left' : stage >= 2 ? 'noticed' : 'walking',
    primarySpec: stage >= 9 ? '20-year' : 'unknown', auxiliarySpec: stage >= 10 ? '5-year' : 'unknown',
    primaryOrder: stage >= 11 ? primary : 'pending', auxiliaryOrder: stage >= 12 ? auxiliary : 'pending',
    review: stage >= 13 ? 'herbs-only' : 'none' }
}
export function validCityPharmacy(value: Record<string, unknown> | CityPharmacyState): value is CityPharmacyState {
  if (typeof value.stage !== 'number' || !Number.isSafeInteger(value.stage) || value.stage < 0 || value.stage > 15
    || (value.stage < 11 ? value.primaryOrder !== 'pending' : !['new', 'existing'].includes(String(value.primaryOrder)))
    || (value.stage < 12 ? value.auxiliaryOrder !== 'pending' : !['new', 'existing'].includes(String(value.auxiliaryOrder)))) return false
  const expected = cityPharmacyAt(value.stage, value.primaryOrder as CityPharmacyState['primaryOrder'], value.auxiliaryOrder as CityPharmacyState['auxiliaryOrder'])
  return (Object.keys(expected) as (keyof CityPharmacyState)[]).every(key => value[key] === expected[key])
}
