import { submitEarlyTransaction } from './early-result'
import { hallWalkTransaction } from './hall-walk-transaction'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { firstHallApproachBlock, type FirstHallApproachAction } from './first-hall-approach'
import type { FirstHallApproachState } from './first-hall-approach-state'
import { hallAfternoonSnapshotKeys } from './early-snapshots'
import { afternoonRoute, firstHallAfternoonAt, validFirstHallAfternoon, type FirstHallAfternoonState } from './first-hall-afternoon-state'
import { firstHallAfternoonScenes } from '../content/first-hall-afternoon'
export type FirstHallAfternoonAction = Omit<FirstHallApproachAction, keyof FirstHallApproachState | 'actor'> & FirstHallAfternoonState & {
  expectedApproach: FirstHallApproachState
  actor: 'yan' | 'xuner'
}
export function firstHallAfternoonBlock(state: GameState): string {
  return firstHallApproachBlock(state) || (state.earlyTraining.firstHallApproach.stage === 57 ? '' : '先归档实际离堂与萧宁独立反应。')
}
export function advanceFirstHallAfternoon(state: GameState, p: EarlyWalkPosition, space: FirstHallAfternoonState['location'], action: FirstHallAfternoonAction): Transaction {
  return hallWalkTransaction(state, p, space, action, { key: 'firstHallAfternoon', block: firstHallAfternoonBlock(state),
    source: state.earlyTraining.firstHallApproach.exitRecord, valid: task => validFirstHallAfternoon(task),
    route: afternoonRoute, scenes: firstHallAfternoonScenes, snapshots: hallAfternoonSnapshotKeys, derive: firstHallAfternoonAt,
    failure: '按本人已存位置、人物与午后断点继续。', saved: '午后位置与时段已保存。' })
}
export function submitFirstHallAfternoon(store: GameStore, p: EarlyWalkPosition, space: FirstHallAfternoonState['location'], action: FirstHallAfternoonAction): boolean {
  return submitEarlyTransaction(store, advanceFirstHallAfternoon, [p, space, action], 'firstHallAfternoon')
}
