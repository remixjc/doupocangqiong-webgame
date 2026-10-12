import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstHallThreatEligible, firstHallThreatStep } from './first-hall-threat-replay'
import { firstHallApproachInput } from './first-hall-approach-replay'
import { advanceFirstHallApproach, firstHallExitResponsePosition } from '../../src/core/first-hall-approach'
import { firstHallExitResponseScenes } from '../../src/content/first-hall-approach'

export function firstHallExitResponseEligible(input?: GameState): GameState {
  let state = firstHallThreatEligible(input)
  while (state.earlyTraining.firstHallApproach.stage < 40) state = firstHallThreatStep(state)
  return state
}
export function firstHallExitResponseInput(state: GameState) {
  const scene = firstHallExitResponseScenes[state.earlyTraining.firstHallApproach.stage - 40]
  return { ...firstHallApproachInput(state), exitResponse: true, actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive-exit-response' }
}
export function firstHallExitResponseStep(state: GameState): GameState {
  const result = advanceFirstHallApproach(state, firstHallExitResponsePosition(state.earlyTraining.firstHallApproach), 'hall', firstHallExitResponseInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
