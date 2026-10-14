import { walkPointOverlaps, nearWalkPoint } from './walker-step'
import { submitEarlyTransaction } from './early-result'
import { stepWalker } from './walker-step'
import { failedTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition, EarlyWalkDirection } from './early-walk'
import { earlyQiPavilionBlock } from './early-qi-pavilion-block'
export { earlyQiPavilionBlock } from './early-qi-pavilion-block'
import { qiPavilionEntryAt, validQiPavilionEntry, type QiPavilionEntryState } from './early-training-state'
import { qiPavilionEntryScenes } from '../content/early-qi-pavilion'

export const QI_PAVILION_ENTRY_ID = 'early-qi-pavilion-entry'
export const qiPavilionPlaces = {
  forecourt: { x: 180, y: 350, label: '阁前集合' },
  father: { x: 360, y: 310, label: '萧战 · 规则与许可' },
  crystal: { x: 500, y: 290, label: '水晶球 · 属性测定' },
  door: { x: 360, y: 230, label: '门前 · 守卫与药老评述' },
  inside: { x: 360, y: 100, label: '阁内入口 · 择卷待续' },
} as const
export const qiPavilionWalls = [{ x: 0, y: 170, width: 310, height: 20 }, { x: 410, y: 170, width: 310, height: 20 }] as const
export const qiPavilionGate = { x: 310, y: 170, width: 100, height: 20 }
export function validQiPavilionPosition(position: EarlyWalkPosition, stage: number): boolean {
  const radius = 12, obstacles = stage < 9 ? [...qiPavilionWalls, qiPavilionGate] : qiPavilionWalls
  return Number.isSafeInteger(stage) && stage >= 0 && stage <= 12
    && Number.isFinite(position.x) && Number.isFinite(position.y)
    && position.x >= radius && position.x <= 720 - radius && position.y >= radius && position.y <= 420 - radius
    && !(stage < 9 && position.y < 170)
    && !obstacles.some(rect => walkPointOverlaps(position, rect, radius))
}
export function moveQiPavilionWalker(position: EarlyWalkPosition, direction: EarlyWalkDirection, stage: number): EarlyWalkPosition {
  if (!validQiPavilionPosition(position, stage)) return { ...qiPavilionPlaces.forecourt }
  return stepWalker(position, direction, next => validQiPavilionPosition(next, stage))
}
export function nearQiPavilionPlace(position: EarlyWalkPosition, place: keyof typeof qiPavilionPlaces, stage: number): boolean {
  const target = qiPavilionPlaces[place]
  return validQiPavilionPosition(position, stage) && nearWalkPoint(position, target, 38)
}
export type QiPavilionEntryAction = QiPavilionEntryState & {
  actor: typeof qiPavilionEntryScenes[number]['actor']
  operation: typeof qiPavilionEntryScenes[number]['operation'] | 'take-scroll' | 'take-crystal'
}
export function advanceEarlyQiPavilionEntry(state: GameState, position: EarlyWalkPosition, action: QiPavilionEntryAction): Transaction {
  const blocked = earlyQiPavilionBlock(state)
  if (blocked) return failedTransaction(state, blocked)
  const task = state.earlyTraining.qiPavilionEntry, scene = qiPavilionEntryScenes[task.stage]
  if (!scene || !validQiPavilionEntry(task) || !fieldsMatch(action, task))
    return failedTransaction(state, '入阁记录已变化，请按当前步骤继续。')
  if (action.actor !== scene.actor || action.operation !== scene.operation)
    return failedTransaction(state, '当前人物或步骤不符；入阁测定不发卷轴或水晶物品。')
  if (!nearQiPavilionPlace(position, scene.place, task.stage))
    return failedTransaction(state, `请先走近${qiPavilionPlaces[scene.place].label}。`)
  const next = structuredClone(state), stage = task.stage + 1
  next.earlyTraining.qiPavilionEntry = { stage, ...qiPavilionEntryAt(stage) }
  return successfulTransaction(next, '属性与入阁步骤已保存，主线与已结算奖励保留。')
}
export function submitEarlyQiPavilionEntry(store: GameStore, position: EarlyWalkPosition, action: QiPavilionEntryAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyQiPavilionEntry, [position, action], 'qiPavilionEntry')
}
