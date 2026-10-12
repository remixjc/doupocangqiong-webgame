import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { tradeEligible, tradeStep } from './market-trade-replay'
import { advanceEarlyMarketReturn, marketReturnPlaces, type MarketReturnAction } from '../../src/core/early-market-return'
import { marketTradeLedger } from '../../src/core/early-market-trade'
import { marketReturnScenes } from '../../src/content/early-market-return'
export function returnEligible(input?: GameState): GameState {
  let state = tradeEligible(input)
  while (state.earlyTraining.marketTrade.stage < 17) state = tradeStep(state)
  return state
}
export function returnInput(state: GameState): MarketReturnAction {
  const task = state.earlyTraining.marketReturn, scene = marketReturnScenes[task.stage]
  return { ...task, expectedLedger: marketTradeLedger(state), actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive' }
}
export function returnStep(state: GameState): GameState {
  const scene = marketReturnScenes[state.earlyTraining.marketReturn.stage]
  const result = advanceEarlyMarketReturn(state, marketReturnPlaces[scene.place], returnInput(state))
  expect(result.ok, result.message).toBe(true); return parseSave(serializeSave(result.state))
}
