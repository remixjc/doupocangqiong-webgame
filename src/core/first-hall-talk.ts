import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { firstHallMatchBlock, type FirstHallMatchAction } from './first-hall-match'
import { hallReadingNear, hallReadingSnapshotMatches } from './first-hall-reading'
import type { FirstHallReadingState } from './first-hall-reading-state'
import { fieldsMatch } from './state-guards'
import { firstHallTalkAt, hallTalkMinimum, validFirstHallTalk, type FirstHallTalkState } from './first-hall-talk-state'
import { firstHallTalkScenes } from '../content/first-hall-talk'

export type FirstHallTalkAction = Omit<FirstHallMatchAction, keyof FirstHallReadingState | 'actor' | 'continuation'> & FirstHallTalkState & {
  actor: 'yan' | 'xuner' | 'bystander'
  expectedReading: GameState['earlyTraining']['firstHallReading']
}
export function firstHallTalkBlock(state: GameState): string {
  return firstHallMatchBlock(state, true) || (state.earlyTraining.firstHallMatch.stage === 20 ? '' : '先归档赛后实际返回与走到东架。')
}
export function advanceFirstHallTalk(state: GameState, p: EarlyWalkPosition, space: 'hall' | 'outside', action: FirstHallTalkAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = firstHallTalkBlock(state)
  if (blocked) return fail(blocked)
  const t = state.earlyTraining, task = t.firstHallTalk, scene = firstHallTalkScenes[task.stage]
  if (!validFirstHallTalk(task) || !fieldsMatch(action, task)
    || !action.expectedReading || !fieldsMatch(action.expectedReading, t.firstHallReading)
    || !action.expectedMatch || !fieldsMatch(action.expectedMatch, t.firstHallMatch)
    || !hallReadingSnapshotMatches(state, action))
    return fail('会面、阅读或旧材料与卷账已变化，请按当前断点继续。')
  if (!scene) return fail('东架会面已归档，对方靠近与两卷交涉待续。')
  if (!hallReadingNear(p, space)) return fail('本人保持堂内东架位置，不能由西场代签会面。')
  if (action.actor !== scene.actor || action.operation !== scene.operation)
    return fail('请明确选择本步人物，按会面次序继续。')
  const next = structuredClone(state), history = firstHallTalkAt(task.stage + 1)
  next.earlyTraining.firstHallTalk = history
  const minimum = hallTalkMinimum(history.stage)
  if (t.hall.stage < minimum) next.earlyTraining.hall = { stage: minimum, scroll: 'reading-first' }
  return { state: next, ok: true, message: '东架问答与必要旧卷账已保存；临时卷、借资和奖励保持。' }
}
export function submitFirstHallTalk(store: GameStore, p: EarlyWalkPosition, space: 'hall' | 'outside', action: FirstHallTalkAction): boolean {
  const result = advanceFirstHallTalk(store.getSnapshot().state, p, space, action)
  if (result.ok) store.update(state => {
    state.earlyTraining.firstHallTalk = result.state.earlyTraining.firstHallTalk
    state.earlyTraining.hall = result.state.earlyTraining.hall
  })
  store.notify(result.message)
  return result.ok
}
