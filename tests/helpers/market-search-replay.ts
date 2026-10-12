import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { escortEligible, escortStep } from './market-escort-replay'
import { advanceEarlyMarketSearch, marketSearchPlaces, type MarketSearchAction } from '../../src/core/early-market-search'
import { marketSearchScenes } from '../../src/content/early-market-search'
export function searchEligible(input?: GameState): GameState {
  let state = escortEligible(input)
  while (state.earlyTraining.marketEscort.stage < 24) state = escortStep(state)
  return state
}
export function searchInput(state: GameState): MarketSearchAction {
  const task = state.earlyTraining.marketSearch, scene = marketSearchScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'observer', operation: scene?.operation ?? 'archive' }
}
export function searchStep(state: GameState): GameState {
  const scene = marketSearchScenes[state.earlyTraining.marketSearch.stage]
  const result = advanceEarlyMarketSearch(state, { kind: scene.view, position: marketSearchPlaces[scene.place] }, searchInput(state))
  expect(result.ok, result.message).toBe(true); return parseSave(serializeSave(result.state))
}
