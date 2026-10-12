import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { firstHallTalkBlock, type FirstHallTalkAction } from './first-hall-talk'
import type { FirstHallTalkState } from './first-hall-talk-state'
import { hallReadingNear, hallReadingSnapshotMatches } from './first-hall-reading'
import { fieldsMatch } from './state-guards'
import { firstHallApproachAt, validFirstHallApproach, type FirstHallApproachState } from './first-hall-approach-state'
import { firstHallApproachScene } from '../content/first-hall-approach'
import { commitEarlyResult } from './early-result'

export type FirstHallApproachAction = Omit<FirstHallTalkAction, keyof FirstHallTalkState | 'actor'> & FirstHallApproachState & {
  actor: 'yan' | 'ning' | 'bystander' | 'xuner'
  expectedTalk: FirstHallTalkState
  continuation?: boolean
  conflict?: boolean
}
export function firstHallApproachBlock(state: GameState, continuation = false, conflict = false): string {
  return firstHallTalkBlock(state) || (state.earlyTraining.firstHallTalk.stage === 20 ? '' : '先归档东架会面与半月问答。')
    || (continuation && state.earlyTraining.firstHallApproach.stage < 14 ? '先归档实际靠近与同卷收起。' : '')
    || (conflict && state.earlyTraining.firstHallApproach.stage < 19 ? '先归档同一第一卷实际归架。' : '')
}
export function advanceFirstHallApproach(state: GameState, p: EarlyWalkPosition, space: 'hall' | 'outside', action: FirstHallApproachAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = firstHallApproachBlock(state, action.continuation, action.conflict)
  if (blocked) return fail(blocked)
  const t = state.earlyTraining, task = t.firstHallApproach, scene = firstHallApproachScene(task.stage, action.continuation, action.conflict)
  if (!validFirstHallApproach(task) || !fieldsMatch(action, task)
    || !action.expectedTalk || !fieldsMatch(action.expectedTalk, t.firstHallTalk)
    || !action.expectedReading || !fieldsMatch(action.expectedReading, t.firstHallReading)
    || !action.expectedMatch || !fieldsMatch(action.expectedMatch, t.firstHallMatch)
    || !hallReadingSnapshotMatches(state, action)) return fail('靠近、问答或旧卷账已变化，请按当前断点继续。')
  if (!scene) return fail('靠近与收卷已归档，归架和第二卷待续。')
  if (!hallReadingNear(p, space)) return fail('本人保持堂内东架，萧宁独立走近。')
  if (action.actor !== scene.actor || action.operation !== scene.operation)
    return fail('明确选择当前人物，依次记录整衣、靠近与收卷。')
  const next = structuredClone(state)
  next.earlyTraining.firstHallApproach = firstHallApproachAt(task.stage + 1,
    task.stage === 17 ? t.hall.stage >= 6 ? 'recalled' : 'current' : task.returnRecord,
    task.stage === 27 ? t.hall.stage >= 7 ? 'recalled' : 'current' : task.secondRecord)
  if (task.stage === 17 && t.hall.stage < 6) next.earlyTraining.hall = { stage: 6, scroll: 'none' }
  if (task.stage === 27 && t.hall.stage < 7) next.earlyTraining.hall = { stage: 7, scroll: 'selected-second' }
  return { state: next, ok: true, message: action.conflict ? '交锋断点已存，本人两卷与她的临时卷分存。' : action.continuation ? '同卷交涉已存，现有卷账与奖励保持。' : '靠近断点已存，第一卷尚未归架，技能与奖励保持。' }
}
export function submitFirstHallApproach(store: GameStore, p: EarlyWalkPosition, space: 'hall' | 'outside', action: FirstHallApproachAction): boolean {
  return commitEarlyResult(store, advanceFirstHallApproach(store.getSnapshot().state, p, space, action), ['firstHallApproach', 'hall'])
}
