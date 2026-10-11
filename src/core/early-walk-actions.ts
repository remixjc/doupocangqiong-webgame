import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import { advanceEarlyTraining, beginEarlyTraining, earlyTrainingBlock, type EarlyTrainingAction } from './early-training'
import { nearbyEarlyWalkPlace, type EarlyWalkPosition } from './early-walk'

export type EarlyWalkAction = { type: 'begin' } | Extract<EarlyTrainingAction, { type: 'borrow' | 'purchase' | 'market' }>
export function advanceEarlyWalk(state: GameState, position: EarlyWalkPosition, action: EarlyWalkAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = earlyTrainingBlock(state)
  if (blocked) return fail(blocked)
  const destination = action.type === 'begin' ? 'teacher' : action.type === 'borrow' ? 'xuner'
    : action.type === 'market' ? 'market' : action.type === 'purchase'
      ? action.item === 'woodCore' ? 'market' : ['bluegrass', 'boneflower'].includes(action.item) ? 'pharmacy' : undefined
      : undefined
  if (!destination) return fail('此项操作不属于当前地点。')
  if (nearbyEarlyWalkPlace(position)?.id !== destination) return fail('走近对应的准备地点，再进行这一步。')
  return action.type === 'begin' ? beginEarlyTraining(state) : advanceEarlyTraining(state, action)
}
export function submitEarlyWalk(store: GameStore, position: EarlyWalkPosition, action: EarlyWalkAction): boolean {
  // Read the current snapshot at click time; a rendered order can already be stale.
  const result = advanceEarlyWalk(store.getSnapshot().state, position, action)
  if (result.ok) store.update(state => { state.earlyTraining = result.state.earlyTraining })
  store.notify(result.message)
  return result.ok
}
