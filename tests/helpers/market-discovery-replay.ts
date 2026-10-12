import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { standoffEligible, standoffStep } from './market-standoff-replay'
import { advanceEarlyMarketDiscovery, marketDiscoveryPlace, type MarketDiscoveryAction } from '../../src/core/early-market-discovery'
import { marketDiscoveryScenes } from '../../src/content/early-market-discovery'
export function discoveryEligible(input?: GameState): GameState {
  let state = standoffEligible(input)
  while (state.earlyTraining.marketStandoff.stage < 34) state = standoffStep(state)
  return state
}
export function discoveryInput(state: GameState): MarketDiscoveryAction {
  const task = state.earlyTraining.marketDiscovery, scene = marketDiscoveryScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive' }
}
export function discoveryStep(state: GameState): GameState {
  const result = advanceEarlyMarketDiscovery(state, marketDiscoveryPlace, discoveryInput(state))
  expect(result.ok, result.message).toBe(true); return parseSave(serializeSave(result.state))
}
