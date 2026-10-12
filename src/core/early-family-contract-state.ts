export const EARLY_FAMILY_CONTRACT_VERSION = '0.40.0'
export const EARLY_FAMILY_CONTRACT_ID = 'early-family-contract'
export interface FamilyContractState {
  stage: number
  mood: 'quiet' | 'angry' | 'restrained' | 'calm'
  sword: 'unseen' | 'drawn' | 'departed'
  challenge: 'none' | 'proposed' | 'renewed' | 'pledged'
  decision: 'unspoken' | 'refused'
  paper: 'none' | 'preparing' | 'written' | 'marked' | 'table' | 'nalan'
  declaration: 'unspoken' | 'explained'
  yan: 'hall' | 'left'
  box: 'presented' | 'returned' | 'ring'
  warning: 'none' | 'spoken' | 'glimpse'
  guests: 'visiting' | 'departing' | 'left'
}
export function familyContractAt(stage: number): FamilyContractState {
  return { stage,
    mood: stage >= 4 ? 'calm' : stage >= 3 ? 'restrained' : stage >= 1 ? 'angry' : 'quiet',
    sword: stage >= 32 ? 'departed' : stage >= 2 ? 'drawn' : 'unseen',
    challenge: stage >= 22 ? 'pledged' : stage >= 12 ? 'renewed' : stage >= 7 ? 'proposed' : 'none',
    decision: stage >= 13 ? 'refused' : 'unspoken',
    paper: stage >= 25 ? 'nalan' : stage >= 17 ? 'table' : stage >= 16 ? 'marked'
      : stage >= 15 ? 'written' : stage >= 14 ? 'preparing' : 'none',
    declaration: stage >= 18 ? 'explained' : 'unspoken',
    yan: stage >= 24 ? 'left' : 'hall',
    box: stage >= 29 ? 'ring' : stage >= 28 ? 'returned' : 'presented',
    warning: stage >= 31 ? 'glimpse' : stage >= 30 ? 'spoken' : 'none',
    guests: stage >= 32 ? 'left' : stage >= 27 ? 'departing' : 'visiting' }
}
export function validFamilyContract(value: Record<string, unknown> | FamilyContractState): value is FamilyContractState {
  if (typeof value.stage !== 'number' || !Number.isSafeInteger(value.stage) || value.stage < 0 || value.stage > 33) return false
  const expected = familyContractAt(value.stage)
  return (Object.keys(expected) as (keyof FamilyContractState)[]).every(key => value[key] === expected[key])
}
