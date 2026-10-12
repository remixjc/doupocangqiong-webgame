import { expect } from 'vitest'
import { blankProgress, initialState, type GameState } from '../../src/core/model'
import { parseSave, serializeSave, validateState } from '../../src/core/save'
import { advanceEarlyFamilyVisit, familyVisitPlaces } from '../../src/core/early-family-visit'
import { familyVisitScenes } from '../../src/content/early-family-visit'
import { advanceEarlyFamilyCompensation } from '../../src/core/early-family-compensation'
import { familyCompensationScenes } from '../../src/content/early-family-compensation'
import { advanceEarlyFamilyContract, familyContractPlaces, type FamilyContractView } from '../../src/core/early-family-contract'
import { familyContractScenes } from '../../src/content/early-family-contract'
import { advanceEarlyMountainRing, mountainRingPlaces } from '../../src/core/early-mountain-ring'
import { mountainRingScenes } from '../../src/content/early-mountain-ring'
import { advanceEarlyApprentice } from '../../src/core/early-apprentice'
import { apprenticeScenes } from '../../src/content/early-apprentice'
import { advanceEarlyMethodDiscussion } from '../../src/core/early-method-discussion'
import { methodDiscussionScenes } from '../../src/content/early-method-discussion'
export function preparationBriefEligible(): GameState {
  const old = JSON.parse(JSON.stringify(initialState()))
  old.schemaVersion = 1; old.contentVersion = '0.1.0'; old.chapter = 2; old.completed = [1, 2]
  old.progress = Object.fromEntries([1, 2].map(id => [id, { ...blankProgress(id), herbs: 3, kills: 3, boss: true, intro: true }]))
  let state = validateState(old)
  for (const scene of familyVisitScenes) {
    const result = advanceEarlyFamilyVisit(state, familyVisitPlaces[scene.place], { ...state.earlyTraining.familyVisit, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  for (const scene of familyCompensationScenes) {
    const result = advanceEarlyFamilyCompensation(state, familyVisitPlaces[scene.place], { ...state.earlyTraining.familyCompensation, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  for (const scene of familyContractScenes) {
    const task = state.earlyTraining.familyContract
    const view: FamilyContractView = task.yan === 'hall' ? { kind: 'yan', position: familyContractPlaces[scene.place] } : { kind: 'observer', place: scene.place }
    const result = advanceEarlyFamilyContract(state, view, { ...task, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  for (const scene of mountainRingScenes) {
    const result = advanceEarlyMountainRing(state, mountainRingPlaces[scene.place], { ...state.earlyTraining.mountainRing, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  for (const scene of apprenticeScenes) {
    const result = advanceEarlyApprentice(state, mountainRingPlaces[scene.place], { ...state.earlyTraining.apprentice, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  for (const scene of methodDiscussionScenes) {
    const result = advanceEarlyMethodDiscussion(state, mountainRingPlaces.stone, { ...state.earlyTraining.methodDiscussion, actor: scene.actor, operation: scene.operation })
    expect(result.ok).toBe(true); state = parseSave(serializeSave(result.state))
  }
  return state
}
