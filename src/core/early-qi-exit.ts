import { fieldsMatch } from './state-guards'
import { stepWalker, nearWalkPoint, walkPointOverlaps } from './walker-step'
import { earlyQiPavilionBlock } from './early-qi-pavilion-block'
import { qiExitAt, validQiExit, type QiExitState } from './early-qi-exit-state'
import { qiExitScenes } from '../content/early-qi-exit'
import { failedTransaction, successfulTransaction, submitEarlyTransaction } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { EarlyWalkPosition, EarlyWalkDirection } from './early-walk'
import type { Transaction } from './rules'

export const qiExitPlaces = {
  queue: { x: 180, y: 230, label: '出口队尾' },
  desk: { x: 340, y: 230, label: '萧旱登记处' },
  side: { x: 420, y: 230, label: '门旁等候' },
  outside: { x: 360, y: 90, label: '阁外 · 仍在萧家' },
  father: { x: 500, y: 90, label: '萧战 · 阁外问答' },
} as const
export const qiExitWalls = [{ x: 0, y: 130, width: 310, height: 20 }, { x: 410, y: 130, width: 310, height: 20 }]
export function qiExitStart(stage: number): EarlyWalkPosition {
  return stage >= 9 ? { ...qiExitPlaces.outside } : { x: 180, y: 330 }
}
export function validQiExitPosition(p: EarlyWalkPosition, stage: number): boolean {
  return Number.isInteger(stage) && stage >= 0 && stage <= 13 && Number.isFinite(p.x) && Number.isFinite(p.y)
    && p.x >= 12 && p.x <= 708 && p.y >= 12 && p.y <= 408
    && (stage >= 8 || p.y >= 162)
    && !qiExitWalls.some(wall => walkPointOverlaps(p, wall, 12))
}
export function moveQiExitWalker(p: EarlyWalkPosition, direction: EarlyWalkDirection, stage: number): EarlyWalkPosition {
  return validQiExitPosition(p, stage) ? stepWalker(p, direction, next => validQiExitPosition(next, stage)) : qiExitStart(stage)
}
export function nearQiExitPlace(p: EarlyWalkPosition, place: keyof typeof qiExitPlaces, stage: number): boolean {
  return validQiExitPosition(p, stage) && nearWalkPoint(p, qiExitPlaces[place], 28)
}
export function earlyQiExitBlock(state: GameState): string {
  return earlyQiPavilionBlock(state)
    || (state.earlyTraining.qiPavilionAid.stage !== 10 ? '先归档同行、独自援助与阁内会合，再到出口登记。' : '')
}
export type QiExitAction = QiExitState & {
  actor: typeof qiExitScenes[number]['actor']
  operation: typeof qiExitScenes[number]['operation'] | 'take-support' | 'leave-clan' | 'learn'
}
export function advanceEarlyQiExit(state: GameState, position: EarlyWalkPosition, action: QiExitAction): Transaction {
  const fail = (message: string) => failedTransaction(state, message), blocked = earlyQiExitBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.qiPavilionExit, scene = qiExitScenes[task.stage]
  if (!scene || !validQiExit(task) || !fieldsMatch(action, task)) return fail('登记离阁记录已变化，请按当前步骤继续。')
  if (action.actor !== scene.actor || action.operation !== scene.operation) return fail('当前人物或操作不符；不领取支持卷、不越出家族、不提前修炼。')
  if (!nearQiExitPlace(position, scene.place, task.stage)) return fail(`请先实际走近${qiExitPlaces[scene.place].label}。`)
  const next = structuredClone(state)
  next.earlyTraining.qiPavilionExit = qiExitAt(task.stage + 1)
  return successfulTransaction(next, '登记离阁步骤已保存，原卷保管、旧历史与已结算奖励保持。')
}
export function submitEarlyQiExit(store: GameStore, position: EarlyWalkPosition, action: QiExitAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyQiExit, [position, action], 'qiPavilionExit')
}
