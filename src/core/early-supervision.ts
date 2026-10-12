import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import { earlyTeachingRoomBlock } from './early-teaching'
import type { EarlyWalkPosition } from './early-walk'

export type EarlySupervisionAction = { stage: number; pulses: number; attempts: number;
  operation: 'begin' | 'brace' | 'stop'; marker?: number }
export function earlySupervisionBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyTeachingRoomBlock(state, position)
    || (state.earlyTraining.teaching.stage !== 5 ? '先记下老师正式传授与身体基础要求，再去后山接受督练。' : '')
}
export function advanceEarlySupervision(state: GameState, position: EarlyWalkPosition, action: EarlySupervisionAction): Transaction {
  const blocked = earlySupervisionBlock(state, position)
  if (blocked) return { state, ok: false, message: blocked }
  const task = state.earlyTraining.supervision
  if (action.stage !== task.stage || action.pulses !== task.pulses || action.attempts !== task.attempts || task.stage === 2)
    return { state, ok: false, message: '本轮督练记录已变化，请按当前提示继续。' }
  if (action.operation === 'begin' && task.stage === 0) {
    const next = structuredClone(state); next.earlyTraining.supervision.stage = 1
    return { state: next, ok: true, message: '本轮督练开始，可以随时停练；没有材料费用。' }
  }
  if (task.stage !== 1 || !['brace', 'stop'].includes(action.operation))
    return { state, ok: false, message: '当前督练操作次序无效。' }
  if (action.operation === 'brace' && (typeof action.marker !== 'number' || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1))
    return { state, ok: false, message: '承接输入无效，督练记录未改变。' }
  const stop = action.operation === 'stop' || action.marker! < .35 || action.marker! > .65
  if (stop && task.attempts >= 1_000_000) return { state, ok: false, message: '重试记录已达到上限。' }
  const next = structuredClone(state), updated = next.earlyTraining.supervision
  if (stop) { updated.stage = 0; updated.pulses = 0; updated.attempts++ }
  else { updated.pulses++; if (updated.pulses === 4) updated.stage = 2 }
  return { state: next, ok: true, message: stop
    ? action.operation === 'stop' ? '本轮已停下，可以免费重新开练。' : '姿态未稳住，本轮停下；可免费重试，物资保留。'
    : updated.stage === 2 ? '这一轮督练已记下。回房恢复与后续成长另行继续。' : '承接已记下，留意当前负荷与老师的提醒。' }
}
export function submitEarlySupervision(store: GameStore, position: EarlyWalkPosition, action: EarlySupervisionAction): boolean {
  const result = advanceEarlySupervision(store.getSnapshot().state, position, action)
  return commitEarlyResult(store, result)
}
