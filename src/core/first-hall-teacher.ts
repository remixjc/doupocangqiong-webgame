import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { firstHallEveningBlock, type FirstHallEveningAction } from './first-hall-evening'
import type { FirstHallEveningState } from './first-hall-evening-state'
import { earlySnapshotsMatch, hallTeacherSnapshotKeys } from './early-snapshots'
import { commitEarlyResult, rejectTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import { firstHallTeacherAt, validFirstHallTeacher, type FirstHallTeacherState } from './first-hall-teacher-state'
import { firstHallTeacherScenes } from '../content/first-hall-teacher'
export type FirstHallTeacherAction = Omit<FirstHallEveningAction, keyof FirstHallEveningState | 'actor'> & FirstHallTeacherState & {
  actor: 'yan' | 'teacher'
  expectedEvening: FirstHallEveningState
}
export function firstHallTeacherBlock(state: GameState): string {
  return firstHallEveningBlock(state) || (state.earlyTraining.firstHallEvening.stage === 9 ? '' : '先归档实际回房、关门与同卷放桌。')
}
export function advanceFirstHallTeacher(state: GameState, p: EarlyWalkPosition, space: string, action: FirstHallTeacherAction): Transaction {
  const fail = rejectTransaction(state), task = state.earlyTraining.firstHallTeacher, source = state.earlyTraining.firstHallEvening.record
  const scene = firstHallTeacherScenes[task.stage]
  if (firstHallTeacherBlock(state) || source === 'none' || !scene || !validFirstHallTeacher(task) || task.stage > 0 && task.record !== source
    || !fieldsMatch(action, task) || !earlySnapshotsMatch(state, action, hallTeacherSnapshotKeys)
    || !fieldsMatch(p, { x: task.x, y: task.y }) || space !== task.location
    || action.actor !== scene.actor || action.operation !== scene.operation
    || ['continuation', 'conflict', 'threat', 'exitResponse', 'checkout', 'leaving', 'aftermath'].some(key => (action as unknown as Record<string, unknown>)[key]))
    return fail('按房中本人位置、当前人物与有限问答断点继续。')
  const next = structuredClone(state)
  next.earlyTraining.firstHallTeacher = firstHallTeacherAt(task.stage + 1, source === 'recalled' ? 'recalled' : 'current')
  return { state: next, ok: true, message: '房中现身与有限答复已保存。' }
}
export function submitFirstHallTeacher(store: GameStore, p: EarlyWalkPosition, space: string, action: FirstHallTeacherAction): boolean {
  return commitEarlyResult(store, advanceFirstHallTeacher(store.getSnapshot().state, p, space, action), 'firstHallTeacher')
}
