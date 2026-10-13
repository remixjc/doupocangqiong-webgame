import { rejectTransaction } from './early-result'
import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { firstHallReadingBlock, hallReadingNear, hallReadingSnapshotMatches, type FirstHallReadingAction } from './first-hall-reading'
import { fieldsMatch } from './state-guards'
import { firstHallMatchAt, hallMatchMinimum, validFirstHallMatch, type FirstHallMatchState } from './first-hall-match-state'
import { firstHallMatchScene } from '../content/first-hall-match'
export type FirstHallMatchAction = Omit<FirstHallReadingAction, 'actor'> & { actor: 'yan' | 'spectator'; expectedMatch: FirstHallMatchState; continuation?: boolean }
export function firstHallMatchBlock(state: GameState, continuation = false): string {
  return firstHallReadingBlock(state) || (state.earlyTraining.firstHallReading.stage === 8 ? '' : '先归档东侧同一第一卷阅读。')
    || (continuation && state.earlyTraining.firstHallMatch.stage < 12 ? '先归档西侧比赛旁观。' : '')
}
export function advanceFirstHallMatch(state: GameState, p: EarlyWalkPosition, space: 'hall' | 'outside', action: FirstHallMatchAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = firstHallMatchBlock(state, action.continuation === true)
  if (blocked) return fail(blocked)
  const t = state.earlyTraining, task = t.firstHallMatch, scene = firstHallMatchScene(task.stage, action.continuation === true)
  if (!validFirstHallMatch(task) || !action.expectedMatch || !fieldsMatch(action.expectedMatch, task)
    || !fieldsMatch(action, t.firstHallReading) || !hallReadingSnapshotMatches(state, action))
    return fail('旁观、阅读或旧卷账已变化，请按当前断点继续。')
  if (!scene) return fail('比赛旁观已归档，走向东架待接续。')
  if (!hallReadingNear(p, space)) return fail('本人须仍靠东侧书架阅读。')
  if (action.actor !== scene.actor || action.operation !== scene.operation)
    return fail('请明确选择当前人物或旁观焦点，依现场顺序记录。')
  const next = structuredClone(state), history = firstHallMatchAt(task.stage + 1)
  next.earlyTraining.firstHallMatch = history
  const minimum = hallMatchMinimum(history.stage)
  if (t.hall.stage < minimum) next.earlyTraining.hall = { stage: minimum, scroll: 'reading-first' }
  return { state: next, ok: true, message: '本人东架位置保持，旁观断点与必要旧卷账已保存。' }
}
export function submitFirstHallMatch(store: GameStore, p: EarlyWalkPosition, space: 'hall' | 'outside', action: FirstHallMatchAction): boolean {
  const result = advanceFirstHallMatch(store.getSnapshot().state, p, space, action)
  return commitEarlyResult(store, result, ['firstHallMatch', 'hall'])
}
