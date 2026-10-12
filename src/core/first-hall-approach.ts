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
  checkout?: boolean
  leaving?: boolean
  aftermath?: boolean
}
export const hallExitResponsePlaces = { east: { x: 400, y: 250 }, aisle: { x: 320, y: 280 }, entrance: { x: 140, y: 310 }, outside: { x: 60, y: 310 } }
export function firstHallExitResponsePosition(task: FirstHallApproachState): EarlyWalkPosition {
  return hallExitResponsePlaces[task.yan]
}
export function firstHallApproachBlock(state: GameState, continuation = false, conflict = false, threat = false, exitResponse = false, checkout = false, leaving = false, aftermath = false): string {
  return firstHallTalkBlock(state) || (state.earlyTraining.firstHallTalk.stage === 20 ? '' : '先归档东架会面与半月问答。')
    || (continuation && state.earlyTraining.firstHallApproach.stage < 14 ? '先归档实际靠近与同卷收起。' : '')
    || (conflict && state.earlyTraining.firstHallApproach.stage < 19 ? '先归档同一第一卷实际归架。' : '')
    || (threat && state.earlyTraining.firstHallApproach.stage < 31 ? '先归档交锋与本人第二卷。' : '')
    || (exitResponse && state.earlyTraining.firstHallApproach.stage < 40 ? '先归档来年成人礼威胁与本人观察。' : '')
    || (checkout && state.earlyTraining.firstHallApproach.stage < 46 ? '先归档堂内移步与来年回应。' : '')
    || (leaving && state.earlyTraining.firstHallApproach.stage < 49 ? '先归档同卷管理者登记。' : '')
    || (aftermath && state.earlyTraining.firstHallApproach.stage < 53 ? '先归档两人实际跨门。' : '')
}
export function advanceFirstHallApproach(state: GameState, p: EarlyWalkPosition, space: 'hall' | 'outside', action: FirstHallApproachAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = firstHallApproachBlock(state, action.continuation, action.conflict, action.threat, action.exitResponse, action.checkout, action.leaving, action.aftermath)
  if (blocked) return fail(blocked)
  const t = state.earlyTraining, task = t.firstHallApproach, scene = firstHallApproachScene(task.stage, action.continuation, action.conflict, action.threat, action.exitResponse, action.checkout, action.leaving, action.aftermath)
  if (action.aftermath && (action.continuation || action.conflict || action.threat || action.exitResponse || action.checkout || action.leaving)) return fail('按独立堂内反应断点继续。')
  if (action.leaving && (action.continuation || action.conflict || action.threat || action.exitResponse || action.checkout)) return fail('按独立同行跨门断点继续。')
  if (action.exitResponse && (action.continuation || action.conflict || action.threat)) return fail('按独立堂内移步断点继续。')
  if (action.checkout && (action.continuation || action.conflict || action.threat || action.exitResponse)) return fail('按独立同卷登记断点继续。')
  if (!validFirstHallApproach(task) || !fieldsMatch(action, task)
    || !action.expectedTalk || !fieldsMatch(action.expectedTalk, t.firstHallTalk)
    || !action.expectedReading || !fieldsMatch(action.expectedReading, t.firstHallReading)
    || !action.expectedMatch || !fieldsMatch(action.expectedMatch, t.firstHallMatch)
    || !hallReadingSnapshotMatches(state, action)) return fail('靠近、问答或旧卷账已变化，请按当前断点继续。')
  if (!scene) return fail('本段已归档，后续动作另存。')
  if (action.exitResponse || action.checkout || action.leaving || action.aftermath ? space !== ((action.leaving || action.aftermath) && task.yan === 'outside' ? 'outside' : 'hall') || !fieldsMatch(p, firstHallExitResponsePosition(task)) : !hallReadingNear(p, space))
    return fail('按本人已存位置与空间继续。')
  if (action.actor !== scene.actor || action.operation !== scene.operation)
    return fail('选择本步人物与动作，卷轴和旧账保持。')
  const next = structuredClone(state)
  next.earlyTraining.firstHallApproach = firstHallApproachAt(task.stage + 1,
    task.stage === 17 ? t.hall.stage >= 6 ? 'recalled' : 'current' : task.returnRecord,
    task.stage === 27 ? t.hall.stage >= 7 ? 'recalled' : 'current' : task.secondRecord,
    task.stage === 47 ? t.hall.stage >= 8 ? 'recalled' : 'current' : task.checkoutRecord,
    task.stage === 51 ? t.hall.stage >= 9 ? 'recalled' : 'current' : task.exitRecord)
  if (task.stage === 17 && t.hall.stage < 6) next.earlyTraining.hall = { stage: 6, scroll: 'none' }
  if (task.stage === 27 && t.hall.stage < 7) next.earlyTraining.hall = { stage: 7, scroll: 'selected-second' }
  if (task.stage === 47 && t.hall.stage < 8) next.earlyTraining.hall = { stage: 8, scroll: 'borrowed-second' }
  if (task.stage === 51 && t.hall.stage < 9) next.earlyTraining.hall = { stage: 9, scroll: 'borrowed-second' }
  return { state: next, ok: true, message: action.aftermath ? '萧宁独立反应已存。' : action.leaving ? '离堂断点已存。' : action.checkout ? '同卷登记断点已存，尚未同行离堂。' : action.exitResponse ? '堂内位置与回应已存，同卷未登记或离堂。' : action.threat ? '威胁与观察已存，未登记或离堂。' : action.conflict ? '交锋断点已存，本人两卷与她的临时卷分存。' : action.continuation ? '同卷交涉已存，现有卷账与奖励保持。' : '靠近断点已存，第一卷尚未归架，技能与奖励保持。' }
}
export function submitFirstHallApproach(store: GameStore, p: EarlyWalkPosition, space: 'hall' | 'outside', action: FirstHallApproachAction): boolean {
  return commitEarlyResult(store, advanceFirstHallApproach(store.getSnapshot().state, p, space, action), ['firstHallApproach', 'hall'])
}
