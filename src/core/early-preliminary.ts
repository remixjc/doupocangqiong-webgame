import { nearWalkPoint } from './walker-step'
import { submitEarlyTransaction } from './early-result'
import { failedTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkDirection, EarlyWalkPosition } from './early-walk'
import { earlyPalmPairBlock } from './early-palm-pair'
import { preliminaryAt, validPreliminary, type PreliminaryState } from './early-training-state'
import { preliminaryScenes } from '../content/early-preliminary'

export const preliminaryPlaces = {
  door: { x: 100, y: 360, label: '房门 · 薰儿同行' },
  gate: { x: 240, y: 300, label: '场口 · 入场' },
  waiting: { x: 380, y: 300, label: '候测区 · 点名与宣告' },
  monument: { x: 580, y: 180, label: '黑碑 · 本人触碑' },
} as const
export const preliminaryStart = { x: 100, y: 360 }
export const preliminaryObstacles = [
  { x: 40, y: 40, width: 250, height: 120 },
  { x: 450, y: 270, width: 70, height: 90 },
  { x: 80, y: 230, width: 100, height: 50 },
] as const
export function validPreliminaryPosition(position: EarlyWalkPosition): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y)
    && position.x >= 40 && position.x <= 680 && position.y >= 40 && position.y <= 380
    && !preliminaryObstacles.some(rect => position.x >= rect.x - 12 && position.x <= rect.x + rect.width + 12
      && position.y >= rect.y - 12 && position.y <= rect.y + rect.height + 12)
}
export function nearPreliminaryPlace(position: EarlyWalkPosition, place: keyof typeof preliminaryPlaces): boolean {
  const target = preliminaryPlaces[place]
  return validPreliminaryPosition(position) && nearWalkPoint(position, target, 45)
}
export function movePreliminaryWalker(position: EarlyWalkPosition, direction: EarlyWalkDirection): EarlyWalkPosition {
  if (!validPreliminaryPosition(position)) return { ...preliminaryStart }
  const next = { x: position.x + (direction === 'left' ? -20 : direction === 'right' ? 20 : 0),
    y: position.y + (direction === 'up' ? -20 : direction === 'down' ? 20 : 0) }
  return validPreliminaryPosition(next) ? next : position
}
export type PreliminaryAction = PreliminaryState & {
  actor: typeof preliminaryScenes[number]['actor']; operation: typeof preliminaryScenes[number]['operation']
}
export function earlyPreliminaryBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyPalmPairBlock(state, position)
    || (state.earlyTraining.palmPair.stage !== 10 ? '先归档两瓶试验，再接续一月前预测。' : '')
}
export function advanceEarlyPreliminary(state: GameState, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: PreliminaryAction): Transaction {
  const blocked = earlyPreliminaryBlock(state, entryPosition)
  if (blocked) return failedTransaction(state, blocked)
  const task = state.earlyTraining.preliminary, scene = preliminaryScenes[task.stage]
  if (!scene || !validPreliminary(task) || !fieldsMatch(action, task))
    return failedTransaction(state, '预测记录已变化，请依当前名簿和步骤继续。')
  if (scene.actor !== action.actor || scene.operation !== action.operation)
    return failedTransaction(state, '当前点名与被测人物不符，三份结果未改变。')
  if (!nearPreliminaryPlace(position, scene.place))
    return failedTransaction(state, `先走近${preliminaryPlaces[scene.place].label}。`)
  const next = structuredClone(state)
  next.earlyTraining.preliminary = { stage: task.stage + 1, ...preliminaryAt(task.stage + 1) }
  return successfulTransaction(next, task.stage === 10 ? '本人触碑已记七段；还需高台反应、测试员宣读与结束归档。'
    : task.stage === 15 ? '预测已归档，三人结果分别保留；后续挑战尚待接续。' : '预测步骤已保存。')
}
export function submitEarlyPreliminary(store: GameStore, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: PreliminaryAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyPreliminary, [entryPosition, position, action])
}
