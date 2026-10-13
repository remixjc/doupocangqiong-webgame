import { submitEarlyTransaction } from './early-result'
import { failedTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition, EarlyWalkDirection } from './early-walk'
import { earlyCeremonialTestBlock, ceremonialPlaces, validCeremonialPosition, moveCeremonialWalker } from './early-ceremonial-test'
import { validNingFirst, type NingFirstState } from './early-training-state'
import { ningFirstScenes } from '../content/early-ning-first'
export const ningPlaces = { waiting: ceremonialPlaces.waiting,
  arena: { x: 440, y: 160, label: '台中 · 萧宁首轮交锋' }, stairs: { x: 440, y: 240, label: '阶梯 · 待裁定' } } as const
export function moveNingWalker(position: EarlyWalkPosition, direction: EarlyWalkDirection): EarlyWalkPosition {
  return moveCeremonialWalker(position, direction, 2)
}
export function nearNingPlace(position: EarlyWalkPosition, place: keyof typeof ningPlaces): boolean {
  const target = ningPlaces[place]
  return validCeremonialPosition(position, 2) && Math.hypot(position.x - target.x, position.y - target.y) <= 38
}
export function ningFirstOperation(task: NingFirstState): NingFirstAction['operation'] {
  return task.stage === 6 ? task.beats === 1 ? 'pull' : 'push' : ningFirstScenes[task.stage]?.operation ?? 'withdraw'
}
export type NingFirstAction = NingFirstState & {
  actor: typeof ningFirstScenes[number]['actor'];
  operation: typeof ningFirstScenes[number]['operation'] | 'pull' | 'octane' | 'stop'; marker?: number
}
export function earlyNingFirstBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyCeremonialTestBlock(state, position)
    || (state.earlyTraining.ceremonialTest.stage !== 13 ? '先归档正式仪式与八段复测，再接萧宁挑战。' : '')
}
export function advanceEarlyNingFirst(state: GameState, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: NingFirstAction): Transaction {
  const blocked = earlyNingFirstBlock(state, entryPosition)
  if (blocked) return failedTransaction(state, blocked)
  const task = state.earlyTraining.ningFirst, scene = ningFirstScenes[task.stage]
  if (!scene || !validNingFirst(task) || !fieldsMatch(action, task))
    return failedTransaction(state, '萧宁首轮记录已变化，请依当前阶段继续。')
  if (!validCeremonialPosition(position, 2) || action.actor !== scene.actor)
    return failedTransaction(state, '本人的交锋或场边观察身份/位置无效。')
  if (action.operation !== 'stop' && !nearNingPlace(position, scene.place))
    return failedTransaction(state, `先走近${ningPlaces[scene.place].label}。`)
  const next = structuredClone(state), updated = next.earlyTraining.ningFirst
  if (task.stage === 6) {
    if (!['push', 'pull', 'octane', 'stop'].includes(action.operation) || (action.operation === 'stop' ? action.marker !== undefined
      : typeof action.marker !== 'number' || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1))
      return failedTransaction(state, '首轮动作或时机无效，记录未改变。')
    if (action.operation === 'stop' || action.operation !== ningFirstOperation(task) || action.marker! < .35 || action.marker! > .65) {
      if (task.attempts >= 1_000_000) return failedTransaction(state, '重试记录已到上限。')
      updated.stage = 5; updated.beats = 0; updated.attempts++
      return successfulTransaction(next, '首轮免费重开；萧宁药物尚未使用，玩家钱账、药液和奖励不变。')
    }
    updated.beats++
    if (updated.beats === 3) { updated.stage = 7; updated.verdict = 'pending' }
  } else {
    if (action.operation !== scene.operation || action.marker !== undefined) return failedTransaction(state, '当前首轮步骤不符，不能跳过裁判或交锋。')
    updated.stage++
    if (updated.stage === 2) updated.pill = 'ning-held'
  }
  return successfulTransaction(next, updated.stage >= 7 ? '首轮倒地已记，仍待裁判；尚未形成最终胜利。' : '正式礼挑战的首轮步骤已保存。')
}
export function submitEarlyNingFirst(store: GameStore, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: NingFirstAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyNingFirst, [entryPosition, position, action])
}
