import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstHallAftermathEligible, firstHallAftermathStep } from './first-hall-aftermath-replay'
import { firstHallApproachInput } from './first-hall-approach-replay'
import { advanceFirstHallAfternoon, type FirstHallAfternoonAction } from '../../src/core/first-hall-afternoon'
import { afternoonRoute } from '../../src/core/first-hall-afternoon-state'
import { firstHallAfternoonScenes } from '../../src/content/first-hall-afternoon'
export function firstHallAfternoonEligible(input?: GameState): GameState {
  let state = firstHallAftermathEligible(input)
  while (state.earlyTraining.firstHallApproach.stage < 57) state = firstHallAftermathStep(state)
  return state
}
export function firstHallAfternoonInput(state: GameState): FirstHallAfternoonAction {
  const t = state.earlyTraining, task = t.firstHallAfternoon, route = afternoonRoute(task.stage)
  return { ...firstHallApproachInput(state), ...task, expectedApproach: { ...t.firstHallApproach }, actor: 'yan',
    operation: route && task.walk < 6 ? `move-${route[task.walk]}` : firstHallAfternoonScenes[task.stage]?.operation ?? 'archive' }
}
export function firstHallAfternoonStep(state: GameState): GameState {
  const task = state.earlyTraining.firstHallAfternoon
  const result = advanceFirstHallAfternoon(state, { x: task.x, y: task.y }, task.location, firstHallAfternoonInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
