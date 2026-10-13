import { rejectTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition, EarlyWalkDirection } from './early-walk'
import { earlyQiPavilionBlock } from './early-qi-pavilion'
import { qiBarrierAt, validQiBarrier, type QiBarrierState } from './early-training-state'
import { qiBarrierScenes } from '../content/early-qi-barrier'

export const QI_BARRIER_ID = 'early-qi-pavilion-barrier'
export const qiPaths = [100, 220, 360, 500, 620] as const
export const qiBarrierPlaces = {
  fire: { x: 100, y: 360, label: '火属性通道入口' },
  path: { x: 360, y: 300, label: '第三支路入口' },
  room37: { x: 360, y: 250, label: '转角 · 三十七号' },
  room43: { x: 360, y: 140, label: '四十三号门牌' },
  barrier: { x: 380, y: 140, label: '红幕 · 门障探查' },
  stance: { x: 360, y: 180, label: '退步准备点' },
  inside: { x: 460, y: 140, label: '四十三号室内' },
} as const
export const qiRoomGate = { x: 400, y: 102, width: 8, height: 92 }
export function validQiBarrierPosition(position: EarlyWalkPosition, stage: number): boolean {
  if (!Number.isSafeInteger(stage) || stage < 0 || stage > 10 || !Number.isFinite(position.x) || !Number.isFinite(position.y)
    || position.x < 40 || position.x > 680 || position.y < 80 || position.y > 380) return false
  const corridor = position.y >= 330 || qiPaths.some(x => Math.abs(position.x - x) <= 34)
  const room = position.x >= 390 && position.x <= 520 && position.y >= 114 && position.y <= 182
  if (!corridor && !room) return false
  if (stage < 7 && (position.x >= 390 && position.x <= 520 && position.y >= 90 && position.y <= 210)) return false
  return true
}
export function moveQiBarrierWalker(position: EarlyWalkPosition, direction: EarlyWalkDirection, stage: number): EarlyWalkPosition {
  if (!validQiBarrierPosition(position, stage)) return { ...qiBarrierPlaces.fire }
  const delta = { up: [0, -20], down: [0, 20], left: [-20, 0], right: [20, 0] }[direction]
  if (!delta) return position
  const next = { x: position.x + delta[0], y: position.y + delta[1] }
  return validQiBarrierPosition(next, stage) ? next : position
}
export function nearQiBarrierPlace(position: EarlyWalkPosition, place: keyof typeof qiBarrierPlaces, stage: number): boolean {
  const target = qiBarrierPlaces[place]
  return validQiBarrierPosition(position, stage) && Math.hypot(position.x - target.x, position.y - target.y) <= 28
}
export function nearQiPath(position: EarlyWalkPosition, path: number, stage: number): boolean {
  return Number.isSafeInteger(path) && path >= 1 && path <= 5 && validQiBarrierPosition(position, stage)
    && Math.hypot(position.x - qiPaths[path - 1], position.y - 300) <= 28
}
export function earlyQiBarrierBlock(state: GameState): string {
  return earlyQiPavilionBlock(state)
    || (state.earlyTraining.qiPavilionEntry.stage !== 12 ? '先归档属性测定与实际入阁，再接火通道和门障。' : '')
}
export function qiBarrierOperation(task: QiBarrierState) {
  return task.stage === 6 ? (['settle', 'gather', 'blast'] as const)[task.beats] : qiBarrierScenes[task.stage]?.operation ?? 'archive'
}
export type QiBarrierAction = QiBarrierState & {
  actor: typeof qiBarrierScenes[number]['actor']
  operation: typeof qiBarrierScenes[number]['operation'] | 'gather' | 'blast' | 'stop' | 'take-scroll'
  marker?: number
  chosenPath?: number
}
export function advanceEarlyQiBarrier(state: GameState, position: EarlyWalkPosition, action: QiBarrierAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = earlyQiBarrierBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.qiPavilionBarrier, scene = qiBarrierScenes[task.stage]
  if (!scene || !validQiBarrier(task) || !fieldsMatch(action, task))
    return fail('门障记录已变化，请按当前步骤继续。')
  if (action.actor !== scene.actor || !validQiBarrierPosition(position, task.stage)) return fail('当前人物或位置无效。')
  const next = structuredClone(state), updated = next.earlyTraining.qiPavilionBarrier
  const retry = (message: string): Transaction => {
    if (task.attempts >= 1_000_000) return fail('免费重试记录已达上限。')
    updated.beats = 0; updated.attempts++
    return { state: next, ok: true, message }
  }
  if (task.stage === 6 && action.operation === 'stop') return retry('免费停下本轮，红幕和已确认路线保留。')
  if (task.stage === 1 && action.operation === 'path') {
    if (action.marker !== undefined || !nearQiPath(position, action.chosenPath ?? 0, task.stage)) return fail('先实际走近所选支路入口。')
    if (action.chosenPath !== 3) return retry('不是父亲提示的第三路；免费返回辨路，尚未取得物品。')
  } else {
    if (action.chosenPath !== undefined || !nearQiBarrierPlace(position, scene.place, task.stage)) return fail(`请先走近${qiBarrierPlaces[scene.place].label}。`)
    if (action.operation !== qiBarrierOperation(task)) return fail('请按当前动作继续；不能提前出击或取得卷轴。')
  }
  if (task.stage === 6) {
    if (typeof action.marker !== 'number' || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1) return fail('破幕时机无效。')
    if (action.marker < .35 || action.marker > .65) return retry('动作尚未连贯，免费重新稳身；红幕完整，物资未扣。')
    updated.beats++
    if (updated.beats < 3) return { state: next, ok: true, message: '本轮动作已记，红幕尚未破。' }
  } else if (action.marker !== undefined) return fail('当前步骤不使用破幕时机。')
  updated.stage++
  Object.assign(updated, qiBarrierAt(updated.stage))
  return { state: next, ok: true, message: updated.stage >= 7 ? '本次红幕已破，收势与入室按序保存；取卷仍待独立操作。' : '火路与门障步骤已保存，不发物品或奖励。' }
}
export function submitEarlyQiBarrier(store: GameStore, position: EarlyWalkPosition, action: QiBarrierAction): boolean {
  const result = advanceEarlyQiBarrier(store.getSnapshot().state, position, action)
  return commitEarlyResult(store, result, 'qiPavilionBarrier')
}
