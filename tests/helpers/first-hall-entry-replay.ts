import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstRoadMeetingEligible, firstRoadMeetingStep } from './first-road-meeting-replay'
import { advanceFirstHallEntry, hallEntryPlaces, type FirstHallEntryAction } from '../../src/core/first-hall-entry'
import { firstHallEntryScenes } from '../../src/content/first-hall-entry'
import { marketTradeLedger } from '../../src/core/early-market-trade'
export function firstHallEntryEligible(input?: GameState): GameState {
  let state = firstRoadMeetingEligible(input)
  while (state.earlyTraining.firstRoadMeeting.stage < 12) state = firstRoadMeetingStep(state)
  return state
}
export function firstHallEntryInput(state: GameState): FirstHallEntryAction {
  const t = state.earlyTraining
  return { ...t.firstHallEntry, expectedMeeting: { ...t.firstRoadMeeting }, expectedDeparture: { ...t.firstDeparture },
    expectedTechnique: { ...t.firstTechnique }, expectedTraining: { ...t.firstTraining }, expectedIron: { ...t.iron },
    expectedLedger: marketTradeLedger(state), expectedPractice: { ...t.practice }, expectedRecovery: { ...t.recovery }, expectedHall: { ...t.hall },
    actor: 'yan', operation: firstHallEntryScenes[t.firstHallEntry.stage]?.operation ?? 'archive' }
}
export function firstHallEntryStep(state: GameState): GameState {
  const scene = firstHallEntryScenes[state.earlyTraining.firstHallEntry.stage]
  const result = advanceFirstHallEntry(state, hallEntryPlaces[scene.place], scene.space, firstHallEntryInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
