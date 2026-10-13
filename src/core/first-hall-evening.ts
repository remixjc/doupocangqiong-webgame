import { submitEarlyTransaction } from './early-result'
import { hallWalkTransaction } from './hall-walk-transaction'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { firstHallAfternoonBlock, type FirstHallAfternoonAction } from './first-hall-afternoon'
import type { FirstHallAfternoonState } from './first-hall-afternoon-state'
import { hallEveningSnapshotKeys } from './early-snapshots'
import { eveningRoute, firstHallEveningAt, validFirstHallEvening, type FirstHallEveningState } from './first-hall-evening-state'
import { firstHallEveningScenes } from '../content/first-hall-evening'
export type FirstHallEveningAction = Omit<FirstHallAfternoonAction, keyof FirstHallAfternoonState> & FirstHallEveningState & {
  expectedAfternoon: FirstHallAfternoonState
}
export function firstHallEveningBlock(state: GameState): string {
  return firstHallAfternoonBlock(state) || (state.earlyTraining.firstHallAfternoon.stage === 10 ? '' : '先走完整个午后与天黑。')
}
export function advanceFirstHallEvening(state: GameState, p: EarlyWalkPosition, space: FirstHallEveningState['location'], action: FirstHallEveningAction): Transaction {
  return hallWalkTransaction(state, p, space, action, { key: 'firstHallEvening', block: firstHallEveningBlock(state),
    source: state.earlyTraining.firstHallAfternoon.record, valid: task => validFirstHallEvening(task),
    route: eveningRoute, scenes: firstHallEveningScenes, snapshots: hallEveningSnapshotKeys, derive: firstHallEveningAt,
    failure: '按本人夜间位置与回房断点继续。', saved: '夜间位置与同卷已保存。' })
}
export function submitFirstHallEvening(store: GameStore, p: EarlyWalkPosition, space: FirstHallEveningState['location'], action: FirstHallEveningAction): boolean {
  return submitEarlyTransaction(store, advanceFirstHallEvening, [p, space, action], 'firstHallEvening')
}
