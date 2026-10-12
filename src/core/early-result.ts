import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyTrainingState } from './early-training-state'

// Preserve one atomic write, the original write scope, and notification order.
export function commitEarlyResult(store: GameStore, result: Transaction, key?: keyof EarlyTrainingState): boolean {
  if (result.ok) store.update(state => {
    if (key) Object.assign(state.earlyTraining, { [key]: result.state.earlyTraining[key] })
    else state.earlyTraining = result.state.earlyTraining
  })
  store.notify(result.message)
  return result.ok
}
