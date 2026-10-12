import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { firstHallTalkBlock, type FirstHallTalkAction } from './first-hall-talk'
import type { FirstHallTalkState } from './first-hall-talk-state'
import { hallReadingNear, hallReadingSnapshotMatches } from './first-hall-reading'
import { fieldsMatch } from './state-guards'
import { firstHallApproachAt, validFirstHallApproach, type FirstHallApproachState } from './first-hall-approach-state'
import { firstHallApproachScenes } from '../content/first-hall-approach'
import { commitEarlyResult } from './early-result'

export type FirstHallApproachAction = Omit<FirstHallTalkAction, keyof FirstHallTalkState | 'actor'> & FirstHallApproachState & {
  actor: 'yan' | 'ning' | 'bystander'
  expectedTalk: FirstHallTalkState
}
export function firstHallApproachBlock(state: GameState): string {
  return firstHallTalkBlock(state) || (state.earlyTraining.firstHallTalk.stage === 20 ? '' : '先归档东架会面与半月问答。')
}
export function advanceFirstHallApproach(state: GameState, p: EarlyWalkPosition, space: 'hall' | 'outside', action: FirstHallApproachAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = firstHallApproachBlock(state)
  if (blocked) return fail(blocked)
  const t = state.earlyTraining, task = t.firstHallApproach, scene = firstHallApproachScenes[task.stage]
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
  next.earlyTraining.firstHallApproach = firstHallApproachAt(task.stage + 1)
  return { state: next, ok: true, message: '靠近断点已存，第一卷尚未归架，技能与奖励保持。' }
}
export function submitFirstHallApproach(store: GameStore, p: EarlyWalkPosition, space: 'hall' | 'outside', action: FirstHallApproachAction): boolean {
  return commitEarlyResult(store, advanceFirstHallApproach(store.getSnapshot().state, p, space, action), 'firstHallApproach')
}
