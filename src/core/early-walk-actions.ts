import { submitEarlyTransaction } from './early-result'
import { rejectTransaction } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import { advanceEarlyTraining, beginEarlyTraining, earlyTrainingBlock, type EarlyTrainingAction } from './early-training'
import { nearbyEarlyWalkPlace, type EarlyWalkPosition } from './early-walk'

export type EarlyWalkAction = { type: 'begin' } | EarlyTrainingAction
export function advanceEarlyWalk(state: GameState, position: EarlyWalkPosition, action: EarlyWalkAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = earlyTrainingBlock(state)
  if (blocked) return fail(blocked)
  const destination = ['begin', 'liquid', 'practice'].includes(action.type) ? 'teacher' : action.type === 'borrow' ? 'xuner'
    : action.type === 'market' ? 'market' : action.type === 'purchase'
      ? action.item === 'woodCore' ? 'market' : ['bluegrass', 'boneflower'].includes(action.item) ? 'pharmacy' : undefined
      : undefined
  if (!destination) return fail('此项操作不属于当前地点。')
  if (nearbyEarlyWalkPlace(position)?.id !== destination) return fail('走近对应的准备地点，再进行这一步。')
  return action.type === 'begin' ? beginEarlyTraining(state) : advanceEarlyTraining(state, action)
}
export function submitEarlyWalk(store: GameStore, position: EarlyWalkPosition, action: EarlyWalkAction): boolean {
  // Read the current snapshot at click time; a rendered order can already be stale.
  return submitEarlyTransaction(store, advanceEarlyWalk, [position, action])
}
