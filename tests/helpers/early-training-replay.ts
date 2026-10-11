import { expect } from 'vitest'
import type { GameState } from '../../src/core/model'
import { advanceEarlyTraining, beginEarlyTraining, type EarlyTrainingAction } from '../../src/core/early-training'
import { earlySupplies } from '../../src/core/early-training-state'
import { earlyLiquidScenes } from '../../src/content/early-liquid'
import { parseSave, serializeSave } from '../../src/core/save'
import { pulseMarker } from '../../src/core/events'

// Normal panel transactions only; no progress/material edits or save injection.
export function replayEarlyTraining(input: GameState, failFirstBreath = false, onCheckpoint?: (state: GameState) => void): GameState {
  let state = input
  const act = (action: EarlyTrainingAction) => {
    const input = action.type === 'practice' ? { ...action, attempts: state.earlyTraining.practice.attempts } : action
    const result = advanceEarlyTraining(state, input)
    expect(result.ok, result.message).toBe(true)
    state = parseSave(serializeSave(result.state))
    onCheckpoint?.(state)
  }
  const started = beginEarlyTraining(state); expect(started.ok).toBe(true)
  state = parseSave(serializeSave(started.state))
  onCheckpoint?.(state)
  act({ type: 'borrow', expectedSpent: 0 })
  for (const item of ['boneflower', 'bluegrass', 'woodCore'] as const)
    act({ type: 'purchase', item, price: earlySupplies[item].price, expectedSpent: state.earlyTraining.purse.spent })
  for (let step = 0; step < 4; step++) act({ type: 'market', step, expectedSpent: 110 })
  for (let step = 0; step < 6; step++) act({ type: 'liquid', step, operation: earlyLiquidScenes[step].operation, expectedSpent: 110 })
  act({ type: 'practice', operation: 'begin', phase: 0, pulse: 0, expectedSpent: 110 })
  if (failFirstBreath) for (let pulse = 0; pulse < 3; pulse++)
    act({ type: 'practice', operation: 'pulse', phase: 1, pulse, marker: pulseMarker(0), expectedSpent: 110 })
  for (let pulse = 0; pulse < 3; pulse++)
    act({ type: 'practice', operation: 'pulse', phase: 1, pulse, marker: pulseMarker(900), expectedSpent: 110 })
  act({ type: 'practice', operation: 'attempt', phase: 2, pulse: 3, expectedSpent: 110 })
  act({ type: 'practice', operation: 'finish', phase: 3, pulse: 3, expectedSpent: 110 })
  expect(state.earlyTraining.practice.phase).toBe(4)
  return state
}
