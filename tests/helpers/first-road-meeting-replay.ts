import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstDepartureEligible, firstDepartureStep } from './first-departure-replay'
import { advanceFirstRoadMeeting, roadMeetingPlaces, type FirstRoadMeetingAction } from '../../src/core/first-road-meeting'
import { firstRoadMeetingScenes } from '../../src/content/first-road-meeting'
import { marketTradeLedger } from '../../src/core/early-market-trade'
export function firstRoadMeetingEligible(input?: GameState): GameState {
  let state = firstDepartureEligible(input)
  while (state.earlyTraining.firstDeparture.stage < 9) state = firstDepartureStep(state)
  return state
}
export function firstRoadMeetingInput(state: GameState): FirstRoadMeetingAction {
  const t = state.earlyTraining, scene = firstRoadMeetingScenes[t.firstRoadMeeting.stage]
  return { ...t.firstRoadMeeting, expectedDeparture: { ...t.firstDeparture }, expectedTechnique: { ...t.firstTechnique },
    expectedTraining: { ...t.firstTraining }, expectedIron: { ...t.iron }, expectedLedger: marketTradeLedger(state),
    expectedPractice: { ...t.practice }, expectedRecovery: { ...t.recovery }, expectedHall: { ...t.hall },
    actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive' }
}
export function firstRoadMeetingStep(state: GameState): GameState {
  const scene = firstRoadMeetingScenes[state.earlyTraining.firstRoadMeeting.stage]
  const result = advanceFirstRoadMeeting(state, roadMeetingPlaces[scene.place], firstRoadMeetingInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
