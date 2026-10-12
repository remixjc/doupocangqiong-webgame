import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { searchEligible, searchStep } from './market-search-replay'
import { marketSearchPlaces } from '../../src/core/early-market-search'
import { advanceEarlyMarketBracelets, type MarketBraceletsAction } from '../../src/core/early-market-bracelets'
import { marketBraceletsScenes } from '../../src/content/early-market-bracelets'
export function braceletsEligible(input?: GameState): GameState {
  let state = searchEligible(input)
  while (state.earlyTraining.marketSearch.stage < 20) state = searchStep(state)
  return state
}
export function braceletsInput(state: GameState): MarketBraceletsAction {
  const task = state.earlyTraining.marketBracelets, scene = marketBraceletsScenes[task.stage], gift = state.earlyTraining.bracelet
  return { ...task, expectedBracelet: gift.stage, expectedGift: gift.gift, actor: scene?.actor ?? 'observer', operation: scene?.operation ?? 'archive' }
}
export function braceletsStep(state: GameState): GameState {
  const scene = marketBraceletsScenes[state.earlyTraining.marketBracelets.stage]
  const result = advanceEarlyMarketBracelets(state, { kind: scene.view, position: marketSearchPlaces.voice }, braceletsInput(state))
  expect(result.ok, result.message).toBe(true); return parseSave(serializeSave(result.state))
}
