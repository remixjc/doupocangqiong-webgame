import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { earlyKeChallengeBlock } from './early-ke-challenge'
import { validForestPosition } from './early-forest-strike'
import { eighthTrainingAt, validEighthTraining, type EighthTrainingState } from './early-training-state'
import { eighthTrainingScenes } from '../content/early-eighth-training'
export { moveForestWalker as moveEighthWalker } from './early-forest-strike'
export const eighthPlaces = {
  fork: { x: 100, y: 300, label: '分路 · 回应' },
  door: { x: 220, y: 300, label: '房门 · 回房与归档' },
  basin: { x: 380, y: 300, label: '木盆 · 修斗气' },
  bed: { x: 540, y: 300, label: '灯下 · 时段与休息' },
  city: { x: 220, y: 120, label: '城中 · 次日同行' },
  mountain: { x: 520, y: 120, label: '山间 · 同行与练技' },
} as const
export function eighthTrainingBeats(stage: number): number { return stage === 7 || stage === 12 ? 2 : stage === 8 ? 3 : 0 }
export function eighthTrainingOperation(task: EighthTrainingState): EighthTrainingAction['operation'] {
  return task.stage === 7 && task.beats === 1 ? 'push' : eighthTrainingScenes[task.stage]?.operation ?? 'archive'
}
export type EighthTrainingAction = EighthTrainingState & {
  operation: typeof eighthTrainingScenes[number]['operation'] | 'push' | 'stop'; marker?: number
}
export function earlyEighthTrainingBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyKeChallengeBlock(state, position)
    || (state.earlyTraining.keChallenge.stage !== 12 ? '先归档预测后的应战与邀请，再接续同行和礼前训练。' : '')
}
export function nearEighthPlace(position: EarlyWalkPosition, place: keyof typeof eighthPlaces): boolean {
  const target = eighthPlaces[place]
  return validForestPosition(position) && Math.hypot(position.x - target.x, position.y - target.y) <= 45
}
export function advanceEarlyEighthTraining(state: GameState, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: EighthTrainingAction): Transaction {
  const blocked = earlyEighthTrainingBlock(state, entryPosition)
  if (blocked) return { state, ok: false, message: blocked }
  const task = state.earlyTraining.eighthTraining, scene = eighthTrainingScenes[task.stage]
  if (!scene || !validEighthTraining(task) || (Object.keys(task) as (keyof EighthTrainingState)[]).some(key => task[key] !== action[key]))
    return { state, ok: false, message: '礼前训练记录已变化，请依当前阶段继续。' }
  if (!validForestPosition(position)) return { state, ok: false, message: '同行或训练位置无效。' }
  const target = eighthTrainingBeats(task.stage), expected = eighthTrainingOperation(task)
  if (action.operation !== 'stop' && !nearEighthPlace(position, scene.place))
    return { state, ok: false, message: `先走近${eighthPlaces[scene.place].label}。` }
  if (!target && (action.operation !== expected || action.marker !== undefined)
    || target && ![expected, 'pull', 'push', 'breathe', 'night-breath', 'stop'].includes(action.operation))
    return { state, ok: false, message: '当前步骤不符，不能提前签同行或八段。' }
  if (target && (action.operation === 'stop' ? action.marker !== undefined
    : typeof action.marker !== 'number' || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1))
    return { state, ok: false, message: '训练时机无效，记录未改变。' }
  const next = structuredClone(state), updated = next.earlyTraining.eighthTraining
  if (target && (action.operation === 'stop' || action.operation !== expected || action.marker! < .35 || action.marker! > .65)) {
    if (task.attempts >= 1_000_000) return { state, ok: false, message: '重试记录已到上限。' }
    updated.beats = 0; updated.attempts++
    return { state: next, ok: true, message: '本轮免费重开，同行、既有钱账与药液历史保留。' }
  }
  if (!target || ++updated.beats === target) {
    updated.stage++; updated.beats = 0
    Object.assign(updated, eighthTrainingAt(updated.stage))
  }
  return { state: next, ok: true, message: updated.stage === 14 ? '故事八段已感知，尚待归档；正式验碑仍未进行。' : '同行或训练步骤已保存。' }
}
export function submitEarlyEighthTraining(store: GameStore, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: EighthTrainingAction): boolean {
  const result = advanceEarlyEighthTraining(store.getSnapshot().state, entryPosition, position, action)
  if (result.ok) store.update(state => { state.earlyTraining = result.state.earlyTraining })
  store.notify(result.message)
  return result.ok
}
