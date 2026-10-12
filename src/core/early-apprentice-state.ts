export const EARLY_APPRENTICE_VERSION = '0.42.0'
export const EARLY_APPRENTICE_ID = 'early-apprentice'
export interface ApprenticeState {
  stage: number
  promise: 'unheard' | 'permission-required'
  desire: 'none' | 'invited' | 'independent'
  years: 0 | 1
  target: 0 | 7
  aid: 'none' | 'requested' | 'conditional' | 'negotiating' | 'sincerity' | 'agreed'
  alchemy: 'none' | 'offered' | 'eligibility-asked' | 'qualified'
  teacher: 'unknown' | 'asked' | 'confirmed'
  rank: 'unasked' | 'asked' | 'unspecified'
  choice: 'unspoken' | 'willing'
  rite: 'none' | 'requested' | 'questioned' | 'required' | 'bowed'
  name: 'unknown' | 'yaolao'
}
export function apprenticeAt(stage: number): ApprenticeState {
  return { stage, promise: stage >= 1 ? 'permission-required' : 'unheard',
    desire: stage >= 3 ? 'independent' : stage >= 2 ? 'invited' : 'none',
    years: stage >= 4 ? 1 : 0, target: stage >= 4 ? 7 : 0,
    aid: stage >= 11 ? 'agreed' : stage >= 10 ? 'sincerity' : stage >= 9 ? 'negotiating'
      : stage >= 8 ? 'conditional' : stage >= 6 ? 'requested' : 'none',
    alchemy: stage >= 14 ? 'qualified' : stage >= 13 ? 'eligibility-asked' : stage >= 12 ? 'offered' : 'none',
    teacher: stage >= 16 ? 'confirmed' : stage >= 15 ? 'asked' : 'unknown',
    rank: stage >= 18 ? 'unspecified' : stage >= 17 ? 'asked' : 'unasked',
    choice: stage >= 19 ? 'willing' : 'unspoken',
    rite: stage >= 23 ? 'bowed' : stage >= 22 ? 'required' : stage >= 21 ? 'questioned' : stage >= 20 ? 'requested' : 'none',
    name: stage >= 24 ? 'yaolao' : 'unknown' }
}
export function validApprentice(value: Record<string, unknown> | ApprenticeState): value is ApprenticeState {
  if (typeof value.stage !== 'number' || !Number.isSafeInteger(value.stage) || value.stage < 0 || value.stage > 25) return false
  const expected = apprenticeAt(value.stage)
  return (Object.keys(expected) as (keyof ApprenticeState)[]).every(key => value[key] === expected[key])
}
