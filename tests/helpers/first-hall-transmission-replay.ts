import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { advanceFirstHallTransmission, type FirstHallTransmissionAction } from '../../src/core/first-hall-transmission'
import { earlySnapshots, hallTransmissionSnapshotKeys } from '../../src/core/early-snapshots'
import { transmissionRoute } from '../../src/core/first-hall-transmission-state'
import { firstHallTransmissionScenes } from '../../src/content/first-hall-transmission'
import { firstHallGrantEligible, firstHallGrantStep } from './first-hall-grant-replay'
export function firstHallTransmissionEligible(input?: GameState): GameState {
  let state = firstHallGrantEligible(input)
  while (state.earlyTraining.firstHallGrant.stage < 7) state = firstHallGrantStep(state)
  return state
}
export function firstHallTransmissionInput(state: GameState): FirstHallTransmissionAction {
  const t = state.earlyTraining.firstHallTransmission, scene = firstHallTransmissionScenes[t.stage], moving = t.stage === 1 && t.walk < 2
  return { ...t, ...earlySnapshots(state, hallTransmissionSnapshotKeys),
    actor: moving ? 'teacher' : scene?.actor ?? 'yan',
    operation: moving ? `move-${transmissionRoute[t.walk]}` : scene?.operation ?? 'archive' }
}
export function firstHallTransmissionStep(state: GameState): GameState {
  const t = state.earlyTraining.firstHallTransmission, action = firstHallTransmissionInput(state)
  const p = action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t
  const result = advanceFirstHallTransmission(state, p, t.location, action)
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
