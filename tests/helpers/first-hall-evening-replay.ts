import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstHallAfternoonEligible, firstHallAfternoonStep } from './first-hall-afternoon-replay'
import { advanceFirstHallEvening, type FirstHallEveningAction } from '../../src/core/first-hall-evening'
import { earlySnapshots, hallEveningSnapshotKeys } from '../../src/core/early-snapshots'
import { eveningRoute } from '../../src/core/first-hall-evening-state'
import { firstHallEveningScenes } from '../../src/content/first-hall-evening'
export function firstHallEveningEligible(input?: GameState): GameState {
  let state = firstHallAfternoonEligible(input)
  while (state.earlyTraining.firstHallAfternoon.stage < 10) state = firstHallAfternoonStep(state)
  return state
}
export function firstHallEveningInput(state: GameState): FirstHallEveningAction {
  const task = state.earlyTraining.firstHallEvening, route = eveningRoute(task.stage)
  return { ...task, ...earlySnapshots(state, hallEveningSnapshotKeys), actor: 'yan',
    operation: route && task.walk < route.length ? `move-${route[task.walk]}` : firstHallEveningScenes[task.stage]?.operation ?? 'archive' }
}
export function firstHallEveningStep(state: GameState): GameState {
  const task = state.earlyTraining.firstHallEvening
  const result = advanceFirstHallEvening(state, task, task.location, firstHallEveningInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
