import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { discoveryEligible, discoveryStep } from './market-discovery-replay'
import { marketDiscoveryPlace } from '../../src/core/early-market-discovery'
import { advanceEarlyMarketTrade, marketTradeExit, marketTradeLedger, type MarketTradeAction } from '../../src/core/early-market-trade'
import { marketTradeScenes } from '../../src/content/early-market-trade'
export function tradeEligible(input?: GameState): GameState {
  let state = discoveryEligible(input)
  while (state.earlyTraining.marketDiscovery.stage < 10) state = discoveryStep(state)
  return state
}
export function tradeInput(state: GameState): MarketTradeAction {
  const task = state.earlyTraining.marketTrade, scene = marketTradeScenes[task.stage]
  return { ...task, expectedLedger: marketTradeLedger(state), actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive' }
}
export function tradeStep(state: GameState): GameState {
  const result = advanceEarlyMarketTrade(state, state.earlyTraining.marketTrade.stage < 13 ? marketDiscoveryPlace : marketTradeExit, tradeInput(state))
  expect(result.ok, result.message).toBe(true); return parseSave(serializeSave(result.state))
}
