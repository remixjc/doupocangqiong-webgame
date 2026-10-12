import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstHallReturnEligible, firstHallReturnStep } from './first-hall-return-replay'
import { advanceFirstHallTalk, type FirstHallTalkAction } from '../../src/core/first-hall-talk'
import { hallReadingPlaces } from '../../src/core/first-hall-reading'
import { earlySnapshots } from '../../src/core/early-snapshots'
import { firstHallTalkScenes } from '../../src/content/first-hall-talk'

export function firstHallTalkEligible(input?: GameState): GameState {
  let state = firstHallReturnEligible(input)
  while (state.earlyTraining.firstHallMatch.stage < 20) state = firstHallReturnStep(state)
  return state
}
export function firstHallTalkInput(state: GameState): FirstHallTalkAction {
  const t = state.earlyTraining, scene = firstHallTalkScenes[t.firstHallTalk.stage]
  return { ...t.firstHallTalk, expectedReading: { ...t.firstHallReading }, expectedMatch: { ...t.firstHallMatch },
    ...earlySnapshots(state, ['Entry', 'Meeting', 'Departure', 'Technique', 'Training', 'Iron', 'Ledger', 'Practice', 'Recovery', 'Hall']),
    actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive' }
}
export function firstHallTalkStep(state: GameState): GameState {
  const result = advanceFirstHallTalk(state, hallReadingPlaces.shelf, 'hall', firstHallTalkInput(state))
  expect(result.ok, result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
