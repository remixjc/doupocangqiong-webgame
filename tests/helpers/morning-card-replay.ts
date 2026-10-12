import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { preparationBriefEligible } from './mountain-discussion-replay'
import { advanceEarlyPreparationBrief } from '../../src/core/early-preparation-brief'
import { preparationBriefScenes } from '../../src/content/early-preparation-brief'
import { mountainRingPlaces } from '../../src/core/early-mountain-ring'
import { advanceEarlyMountainVisitor, type MountainVisitorView } from '../../src/core/early-mountain-visitor'
import { mountainVisitorScenes } from '../../src/content/early-mountain-visitor'
import { morningCardScenes } from '../../src/content/early-morning-card'
import { morningCardPlaces, advanceEarlyMorningCard, type MorningCardAction } from '../../src/core/early-morning-card'
export function morningEligible(): GameState {
  let state = preparationBriefEligible()
  for (const scene of preparationBriefScenes) {
    const result = advanceEarlyPreparationBrief(state, mountainRingPlaces[scene.place], { ...state.earlyTraining.preparationBrief, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  for (const scene of mountainVisitorScenes) {
    const task = state.earlyTraining.mountainVisitor
    const view: MountainVisitorView = task.yan === 'left' ? { kind: 'observer', place: scene.place } : { kind: 'yan', position: mountainRingPlaces[scene.place] }
    const result = advanceEarlyMountainVisitor(state, view, { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  return state
}
export function morningInput(state: GameState): MorningCardAction {
  const ledger = state.earlyTraining, task = ledger.morningCard, scene = morningCardScenes[task.stage]
  return { ...task, actor: scene?.actor ?? 'observer', operation: scene?.operation ?? 'archive',
    expectedStarted: ledger.started, expectedBorrowed: ledger.purse.borrowed, expectedSpent: ledger.purse.spent }
}
export function morningStep(state: GameState): GameState {
  const scene = morningCardScenes[state.earlyTraining.morningCard.stage]
  const result = advanceEarlyMorningCard(state, morningCardPlaces[scene.place], morningInput(state))
  expect(result.ok, result.message).toBe(true); return parseSave(serializeSave(result.state))
}
