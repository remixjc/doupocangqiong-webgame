import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstHallTalkEligible, firstHallTalkStep } from './first-hall-talk-replay'
import { advanceFirstHallApproach, type FirstHallApproachAction } from '../../src/core/first-hall-approach'
import { hallReadingPlaces } from '../../src/core/first-hall-reading'
import { earlySnapshots } from '../../src/core/early-snapshots'
import { firstHallApproachScenes } from '../../src/content/first-hall-approach'

export function firstHallApproachEligible(input?: GameState): GameState {
  let state = firstHallTalkEligible(input)
  while (state.earlyTraining.firstHallTalk.stage < 20) state = firstHallTalkStep(state)
  return state
}
export function firstHallApproachInput(state: GameState): FirstHallApproachAction {
  const t = state.earlyTraining, scene = firstHallApproachScenes[t.firstHallApproach.stage]
  return { ...t.firstHallApproach, expectedTalk: { ...t.firstHallTalk },
    expectedReading: { ...t.firstHallReading }, expectedMatch: { ...t.firstHallMatch },
    ...earlySnapshots(state, ['Entry', 'Meeting', 'Departure', 'Technique', 'Training', 'Iron', 'Ledger', 'Practice', 'Recovery', 'Hall']),
    actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive' }
}
export function firstHallApproachStep(state: GameState): GameState {
  const result = advanceFirstHallApproach(state, hallReadingPlaces.shelf, 'hall', firstHallApproachInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
