import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { firstHallApproachBlock, type FirstHallApproachAction } from './first-hall-approach'
import type { FirstHallApproachState } from './first-hall-approach-state'
import { earlySnapshotsMatch, hallAfternoonSnapshotKeys } from './early-snapshots'
import { fieldsMatch } from './state-guards'
import { commitEarlyResult } from './early-result'
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
  const fail = (): Transaction => ({ state, ok: false, message: '按本人已存位置、人物与午后断点继续。' })
  if (firstHallAfternoonBlock(state)) return fail()
  const t = state.earlyTraining, task = t.firstHallAfternoon, route = afternoonRoute(task.stage), scene = firstHallAfternoonScenes[task.stage]
  if (!validFirstHallAfternoon(task) || (task.stage > 0 || task.walk > 0) && task.record !== t.firstHallApproach.exitRecord
    || !fieldsMatch(action, task) || action.actor !== 'yan'
    || ['continuation', 'conflict', 'threat', 'exitResponse', 'checkout', 'leaving', 'aftermath'].some(key => (action as unknown as Record<string, unknown>)[key])
    || !earlySnapshotsMatch(state, action, hallAfternoonSnapshotKeys) || !fieldsMatch(p, { x: task.x, y: task.y }) || space !== task.location || !scene) return fail()
  const moving = route && task.walk < route.length
  if (action.operation !== (moving ? `move-${route[task.walk]}` : scene.operation)) return fail()
  const next = structuredClone(state)
  next.earlyTraining.firstHallAfternoon = firstHallAfternoonAt(moving ? task.stage : task.stage + 1, moving ? task.walk + 1 : 0,
    task.record === 'none' ? t.firstHallApproach.exitRecord === 'recalled' ? 'recalled' : 'current' : task.record)
  return { state: next, ok: true, message: '午后位置与时段已保存。' }
}
export function submitFirstHallAfternoon(store: GameStore, p: EarlyWalkPosition, space: FirstHallAfternoonState['location'], action: FirstHallAfternoonAction): boolean {
  return commitEarlyResult(store, advanceFirstHallAfternoon(store.getSnapshot().state, p, space, action), 'firstHallAfternoon')
}
