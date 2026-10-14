import { nearWalkPoint } from './walker-step'
import { submitEarlyTransaction } from './early-result'
import { failedTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { earlyPreliminaryBlock, preliminaryPlaces, validPreliminaryPosition } from './early-preliminary'
import { validKeChallenge, type KeChallengeState } from './early-training-state'
import { keChallengeScenes } from '../content/early-ke-challenge'
export const keChallengePlaces = { waiting: preliminaryPlaces.waiting, arena: { ...preliminaryPlaces.monument, label: '场中 · 侧避与低阶反击' },
  gate: preliminaryPlaces.gate, fork: { ...preliminaryPlaces.door, label: '分路 · 次日邀请' } } as const
export type KeChallengeAction = KeChallengeState & {
  operation: typeof keChallengeScenes[number]['operation'] | 'evade-right' | 'low-palm' | 'octane-blast' | 'stop'; marker?: number
}
export function earlyKeChallengeBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyPreliminaryBlock(state, position)
    || (state.earlyTraining.preliminary.stage !== 16 ? '先归档一月前预测，再接续萧克六段挑战。' : '')
}
export function nearKeChallengePlace(position: EarlyWalkPosition, place: keyof typeof keChallengePlaces): boolean {
  const target = keChallengePlaces[place]
  return validPreliminaryPosition(position) && nearWalkPoint(position, target, 45)
}
export function advanceEarlyKeChallenge(state: GameState, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: KeChallengeAction): Transaction {
  const blocked = earlyKeChallengeBlock(state, entryPosition)
  if (blocked) return failedTransaction(state, blocked)
  const task = state.earlyTraining.keChallenge, scene = keChallengeScenes[task.stage]
  if (!scene || !validKeChallenge(task) || !fieldsMatch(action, task))
    return failedTransaction(state, '萧克挑战记录已变化，请依当前阶段继续。')
  if (!validPreliminaryPosition(position)) return failedTransaction(state, '应战位置无效。')
  const next = structuredClone(state), updated = next.earlyTraining.keChallenge
  if (task.stage === 3) {
    if (action.operation !== 'stop' && !nearKeChallengePlace(position, 'arena'))
      return failedTransaction(state, '先回到场中，继续侧避与低阶反击。')
    if (!['evade-left', 'evade-right', 'low-palm', 'octane-blast', 'stop'].includes(action.operation))
      return failedTransaction(state, '现在是应战动作阶段，不能跳到宣布。')
    if (action.operation === 'stop' ? action.marker !== undefined
      : typeof action.marker !== 'number' || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1)
      return failedTransaction(state, '应战时机无效，记录未改变。')
    if (action.operation === 'stop' || action.operation !== (task.beats === 0 ? 'evade-left' : 'low-palm')
      || action.marker! < .35 || action.marker! > .65) {
      if (task.attempts >= 1_000_000) return failedTransaction(state, '重试记录已到上限。')
      updated.stage = 2; updated.beats = 0; updated.attempts++
      return successfulTransaction(next, '本轮免费重开，回到准备侧避；没有扣除丹药、材料或主线奖励。')
    }
    updated.beats++
    if (updated.beats === 2) { updated.stage = 4; updated.verdict = 'pending' }
  } else {
    if (action.operation !== scene.operation || action.marker !== undefined || !nearKeChallengePlace(position, scene.place))
      return failedTransaction(state, `先走近${keChallengePlaces[scene.place].label}，按当前步骤继续。`)
    updated.stage++
    if (updated.stage === 5) updated.verdict = 'xiaoyan'
    if (updated.stage === 11) updated.invitation = 'offered'
  }
  return successfulTransaction(next, updated.stage === 4 ? '萧克已倒地，等待父亲宣布；尚未归档本次挑战。'
    : updated.stage === 5 ? '父亲宣布萧克落败，本次往事胜负已确认。' : '应战与离场步骤已保存。')
}
export function submitEarlyKeChallenge(store: GameStore, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: KeChallengeAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyKeChallenge, [entryPosition, position, action])
}
