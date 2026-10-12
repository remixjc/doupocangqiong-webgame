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
  threat?: boolean
  exitResponse?: boolean
}
export const hallExitResponsePlaces = { east: { x: 400, y: 250 }, aisle: { x: 320, y: 280 }, entrance: { x: 140, y: 310 } }
export function firstHallExitResponsePosition(task: FirstHallApproachState): EarlyWalkPosition {
  return hallExitResponsePlaces[task.yan]
}
export function firstHallApproachBlock(state: GameState, continuation = false, conflict = false, threat = false, exitResponse = false): string {
  return firstHallTalkBlock(state) || (state.earlyTraining.firstHallTalk.stage === 20 ? '' : '先归档东架会面与半月问答。')
    || (continuation && state.earlyTraining.firstHallApproach.stage < 14 ? '先归档实际靠近与同卷收起。' : '')
    || (conflict && state.earlyTraining.firstHallApproach.stage < 19 ? '先归档同一第一卷实际归架。' : '')
    || (threat && state.earlyTraining.firstHallApproach.stage < 31 ? '先归档交锋与本人第二卷。' : '')
    || (exitResponse && state.earlyTraining.firstHallApproach.stage < 40 ? '先归档来年成人礼威胁与本人观察。' : '')
}
export function advanceFirstHallApproach(state: GameState, p: EarlyWalkPosition, space: 'hall' | 'outside', action: FirstHallApproachAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = firstHallApproachBlock(state, action.continuation, action.conflict, action.threat, action.exitResponse)
  if (blocked) return fail(blocked)
  const t = state.earlyTraining, task = t.firstHallApproach, scene = firstHallApproachScene(task.stage, action.continuation, action.conflict, action.threat, action.exitResponse)
  if (action.exitResponse && (action.continuation || action.conflict || action.threat)) return fail('按独立堂内移步断点继续。')
  if (!validFirstHallApproach(task) || !fieldsMatch(action, task)
    || !action.expectedTalk || !fieldsMatch(action.expectedTalk, t.firstHallTalk)
    || !action.expectedReading || !fieldsMatch(action.expectedReading, t.firstHallReading)
    || !action.expectedMatch || !fieldsMatch(action.expectedMatch, t.firstHallMatch)
    || !hallReadingSnapshotMatches(state, action)) return fail('靠近、问答或旧卷账已变化，请按当前断点继续。')
  if (!scene) return fail('本段已归档，后续动作另存。')
  if (action.exitResponse ? space !== 'hall' || !fieldsMatch(p, firstHallExitResponsePosition(task)) : !hallReadingNear(p, space))
    return fail('按本人已存堂内位置继续，未跨门离堂。')
  if (action.actor !== scene.actor || action.operation !== scene.operation)
    return fail('选择本步人物与动作，卷轴和旧账保持。')
  const next = structuredClone(state)
  next.earlyTraining.firstHallApproach = firstHallApproachAt(task.stage + 1,
    task.stage === 17 ? t.hall.stage >= 6 ? 'recalled' : 'current' : task.returnRecord,
    task.stage === 27 ? t.hall.stage >= 7 ? 'recalled' : 'current' : task.secondRecord)
  if (task.stage === 17 && t.hall.stage < 6) next.earlyTraining.hall = { stage: 6, scroll: 'none' }
  if (task.stage === 27 && t.hall.stage < 7) next.earlyTraining.hall = { stage: 7, scroll: 'selected-second' }
  return { state: next, ok: true, message: action.exitResponse ? '堂内位置与回应已存，同卷未登记或离堂。' : action.threat ? '威胁与观察已存，未登记或离堂。' : action.conflict ? '交锋断点已存，本人两卷与她的临时卷分存。' : action.continuation ? '同卷交涉已存，现有卷账与奖励保持。' : '靠近断点已存，第一卷尚未归架，技能与奖励保持。' }
}
export function submitFirstHallApproach(store: GameStore, p: EarlyWalkPosition, space: 'hall' | 'outside', action: FirstHallApproachAction): boolean {
  return commitEarlyResult(store, advanceFirstHallApproach(store.getSnapshot().state, p, space, action), ['firstHallApproach', 'hall'])
}
