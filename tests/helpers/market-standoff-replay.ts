import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { braceletsEligible, braceletsStep } from './market-bracelets-replay'
import { advanceEarlyMarketStandoff, standoffPlaces, type MarketStandoffView, type MarketStandoffAction } from '../../src/core/early-market-standoff'
import { marketStandoffScenes } from '../../src/content/early-market-standoff'
export function standoffEligible(input?: GameState): GameState {
  let state = braceletsEligible(input)
  while (state.earlyTraining.marketBracelets.stage < 28) state = braceletsStep(state)
  return state
}
export function standoffInput(state: GameState): MarketStandoffAction {
  const task = state.earlyTraining.marketStandoff, scene = marketStandoffScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'yan', operation: scene?.operation ?? 'archive' }
}
export function standoffView(state: GameState): MarketStandoffView {
  const scene = marketStandoffScenes[state.earlyTraining.marketStandoff.stage]
  return scene.view === 'yan' || scene.view === 'xuner' ? { kind: scene.view, position: standoffPlaces[scene.place] }
    : { kind: 'observer', focus: scene.view, place: scene.place }
}
export function standoffStep(state: GameState): GameState {
  const result = advanceEarlyMarketStandoff(state, standoffView(state), standoffInput(state))
  expect(result.ok, result.message).toBe(true); return parseSave(serializeSave(result.state))
}
