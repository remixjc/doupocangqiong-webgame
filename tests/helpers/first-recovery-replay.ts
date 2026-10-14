import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { advanceFirstRecovery, type FirstRecoveryAction } from '../../src/core/first-recovery'
import { firstRecoveryScenes } from '../../src/content/first-recovery'
import { earlySnapshots, externalLimitSnapshotKeys } from '../../src/core/early-snapshots'
import { firstExternalLimitEligible, firstExternalLimitStep } from './first-external-limit-replay'
export const recoveryEntrance = { x: 575, y: 310 }
export function firstRecoveryEligible(input?: GameState): GameState {
  let state = firstExternalLimitEligible(input)
  while (state.earlyTraining.firstExternalLimit.stage < 8) state = firstExternalLimitStep(state)
  return state
}
export function firstRecoveryInput(state: GameState): FirstRecoveryAction {
  const t = state.earlyTraining.firstRecovery, scene = firstRecoveryScenes[t.stage]
  return { ...t, ...earlySnapshots(state, externalLimitSnapshotKeys), actor: 'yan',
    operation: t.stage === 1 && t.walk < 4 ? 'move-left' : scene?.operation ?? 'finish' }
}
export function firstRecoveryStep(state: GameState): GameState {
  const t = state.earlyTraining.firstRecovery
  const result = advanceFirstRecovery(state, recoveryEntrance, t, t.location, firstRecoveryInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
