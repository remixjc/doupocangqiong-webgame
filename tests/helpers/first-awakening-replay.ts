import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { advanceFirstAwakening, type FirstAwakeningAction } from '../../src/core/first-awakening'
import { firstAwakeningScenes } from '../../src/content/first-awakening'
import { earlySnapshots, awakeningSnapshotKeys } from '../../src/core/early-snapshots'
import { firstRecoveryEligible, firstRecoveryStep, recoveryEntrance } from './first-recovery-replay'
export { recoveryEntrance }
export function firstAwakeningEligible(input?: GameState): GameState {
  let state = firstRecoveryEligible(input)
  while (state.earlyTraining.firstRecovery.stage < 11) state = firstRecoveryStep(state)
  return state
}
export function firstAwakeningInput(state: GameState): FirstAwakeningAction {
  const t = state.earlyTraining.firstAwakening
  return { ...t, ...earlySnapshots(state, awakeningSnapshotKeys), actor: 'yan',
    operation: firstAwakeningScenes[t.stage]?.operation ?? 'finish' }
}
export function firstAwakeningStep(state: GameState): GameState {
  const t = state.earlyTraining.firstAwakening
  const result = advanceFirstAwakening(state, recoveryEntrance, t, t.location, firstAwakeningInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
