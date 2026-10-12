import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { parseSave, serializeSave } from '../../src/core/save'
import { firstHallApproachEligible, firstHallApproachInput, firstHallApproachStep } from './first-hall-approach-replay'
import { advanceFirstHallApproach } from '../../src/core/first-hall-approach'
import { firstHallFirstReturnScenes } from '../../src/content/first-hall-approach'
import { hallReadingPlaces } from '../../src/core/first-hall-reading'

export function firstHallFirstReturnEligible(input?: GameState): GameState {
  let state=firstHallApproachEligible(input)
  while(state.earlyTraining.firstHallApproach.stage<14)state=firstHallApproachStep(state)
  return state
}
export function firstHallFirstReturnInput(state: GameState) {
  const scene=firstHallFirstReturnScenes[state.earlyTraining.firstHallApproach.stage-14]
  return {...firstHallApproachInput(state),continuation:true,actor:scene?.actor??'yan',operation:scene?.operation??'archive-return'}
}
export function firstHallFirstReturnStep(state: GameState): GameState {
  const result=advanceFirstHallApproach(state,hallReadingPlaces.shelf,'hall',firstHallFirstReturnInput(state))
  expect(result.ok,result.message).toBe(true)
  return parseSave(serializeSave(result.state))
}
