import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyTrainingState } from './early-training-state'

export function rejectTransaction(state: Transaction['state']): (message: string) => Transaction {
  return message => ({ state, ok: false, message })
}

export function successfulTransaction(state: Transaction['state'], message: string): Transaction {
  return { state, ok: true, message }
}

export function failedTransaction(state: Transaction['state'], message: string): Transaction {
  return { state, ok: false, message }
}

// Preserve one atomic write, the original write scope, and notification order.
export function commitEarlyResult(store: GameStore, result: Transaction, key?: keyof EarlyTrainingState | readonly (keyof EarlyTrainingState)[]): boolean {
  if (result.ok) store.update(state => {
    if (key) for (const field of typeof key === 'string' ? [key] : key)
      Object.assign(state.earlyTraining, { [field]: result.state.earlyTraining[field] })
    else state.earlyTraining = result.state.earlyTraining
  })
  store.notify(result.message)
  return result.ok
}

export function submitEarlyTransaction<Args extends unknown[]>(store: GameStore, advance: (state: Transaction['state'], ...args: Args) => Transaction, args: Args, key?: keyof EarlyTrainingState | readonly (keyof EarlyTrainingState)[]): boolean {
  return commitEarlyResult(store, advance(store.getSnapshot().state, ...args), key)
}
