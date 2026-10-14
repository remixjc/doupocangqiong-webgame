import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { advanceFirstHallBody, type FirstHallBodyAction } from '../../src/core/first-hall-body'
import { earlySnapshots, hallBodySnapshotKeys } from '../../src/core/early-snapshots'
import { firstHallBodyScenes } from '../../src/content/first-hall-body'
import { firstHallTransmissionEligible, firstHallTransmissionStep } from './first-hall-transmission-replay'
export function firstHallBodyEligible(input?: GameState): GameState {
  let state = firstHallTransmissionEligible(input)
  while (state.earlyTraining.firstHallTransmission.stage < 6) state = firstHallTransmissionStep(state)
  return state
}
export function firstHallBodyInput(state: GameState): FirstHallBodyAction {
  const t = state.earlyTraining.firstHallBody, scene = firstHallBodyScenes[t.stage]
  return { ...t, ...earlySnapshots(state, hallBodySnapshotKeys), actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive' }
}
export function firstHallBodyStep(state: GameState): GameState {
  const t = state.earlyTraining.firstHallBody, action = firstHallBodyInput(state)
  const p = action.actor === 'teacher' ? { x: t.teacherX, y: t.teacherY } : t
  const result = advanceFirstHallBody(state, p, t.location, action)
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
