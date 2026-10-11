export interface EarlyTrainingState {
  started: boolean
  purse: { own: number; borrowed: number; spent: number }
  supplies: { bluegrass: number; boneflower: number; woodCore: number }
}
export const EARLY_TRAINING_VERSION = '0.15.0'
export const EARLY_TRAINING_ID = 'early-training-supplies'
export function blankEarlyTraining(): EarlyTrainingState {
  return { started: false, purse: { own: 0, borrowed: 0, spent: 0 },
    supplies: { bluegrass: 0, boneflower: 0, woodCore: 0 } }
}
export function parseEarlyTraining(value: unknown, completed: number[]): EarlyTrainingState {
  const invalid = () => { throw new Error('重修往事的任务记录无效。') }
  const object = (input: unknown): Record<string, unknown> => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid()
    return input as Record<string, unknown>
  }
  const data = object(value), purse = object(data.purse), supplies = object(data.supplies)
  if (typeof data.started !== 'boolean' || (data.started && !completed.includes(2))) return invalid()
  // Only the preparation record is open in C1c-1; no material or funds can exist.
  for (const key of ['own', 'borrowed', 'spent']) if (purse[key] !== 0) return invalid()
  for (const key of ['bluegrass', 'boneflower', 'woodCore']) if (supplies[key] !== 0) return invalid()
  return { ...blankEarlyTraining(), started: data.started }
}
