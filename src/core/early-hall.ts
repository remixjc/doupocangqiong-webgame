import { submitEarlyTransaction } from './early-result'
import { stepWalker } from './walker-step'
import { failedTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import { earlyGrowthBlock } from './early-growth'
import { nearbyEarlyWalkPlace, type EarlyWalkPosition, type EarlyWalkDirection } from './early-walk'
import { earlyHallScenes } from '../content/early-hall'

export const earlyHallStart = { x: 360, y: 370 }
export const earlyHallObstacles = [
  { x: 435, y: 45, width: 230, height: 45 },
  { x: 55, y: 215, width: 65, height: 65 },
  { x: 625, y: 245, width: 40, height: 60 },
]
export const earlyHallPlaces = [
  { id: 'shelves', label: '东区 · 藏卷书架', x: 550, y: 130,
    text: '族内斗技藏卷在东侧收存。阅读和选卷是不同步骤；离堂前还需登记。' },
  { id: 'practice', label: '西区 · 练习场', x: 180, y: 170,
    text: '西侧供族人切磋与练习。萧炎在场边观察薰儿与萧宁，没有玩家战斗胜负。' },
  { id: 'registry', label: '堂口 · 登记处', x: 360, y: 310,
    text: '借卷离堂需要登记。卷册保管记录与药老正式传技分别记录，不重复发放战斗技能。' },
] as const

export function earlyHallPositionValid(position: EarlyWalkPosition): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y)
    && position.x >= 12 && position.x <= 708 && position.y >= 12 && position.y <= 408
    && !earlyHallObstacles.some(rect => position.x > rect.x - 12 && position.x < rect.x + rect.width + 12
      && position.y > rect.y - 12 && position.y < rect.y + rect.height + 12)
}
export function moveEarlyHall(position: EarlyWalkPosition, direction: EarlyWalkDirection): EarlyWalkPosition {
  if (!earlyHallPositionValid(position)) return { ...earlyHallStart }
  return stepWalker(position, direction, earlyHallPositionValid)
}
export function nearbyEarlyHallPlace(position: EarlyWalkPosition) {
  if (!earlyHallPositionValid(position)) return undefined
  return earlyHallPlaces.find(place => Math.hypot(place.x - position.x, place.y - position.y) <= 48)
}
export function earlyHallBlock(state: GameState): string {
  return earlyGrowthBlock(state)
}
export function enterEarlyHall(state: GameState, position: EarlyWalkPosition): Transaction {
  const blocked = earlyHallBlock(state)
    || (nearbyEarlyWalkPlace(position)?.id !== 'teacher' ? '先回药老处，再接续前往斗技堂的往事。' : '')
  if (blocked) return failedTransaction(state, blocked)
  if (state.earlyTraining.hall.stage > 0)
    return { state, ok: true, message: '再次来到斗技堂，卷册与传技记录保持。' }
  const next = structuredClone(state)
  next.earlyTraining.hall.stage = 1
  return successfulTransaction(next, '斗技堂到访已记下，可以查看两区和登记处。')
}
export function submitEarlyHallEntry(store: GameStore, position: EarlyWalkPosition): boolean {
  const before = store.getSnapshot().state
  const result = enterEarlyHall(before, position)
  if (result.ok && result.state !== before) store.update(state => { state.earlyTraining = result.state.earlyTraining })
  store.notify(result.message)
  return result.ok
}

export type EarlyHallAction = { step: number; operation: typeof earlyHallScenes[number]['operation'] }
export function advanceEarlyHall(state: GameState, position: EarlyWalkPosition, action: EarlyHallAction): Transaction {
  const blocked = earlyHallBlock(state)
  if (blocked) return failedTransaction(state, blocked)
  const scene = earlyHallScenes.find(scene => scene.stage === state.earlyTraining.hall.stage)
  if (!scene || action.step !== scene.stage || action.operation !== scene.operation)
    return failedTransaction(state, '堂内记录已变化，请按当前步骤继续。')
  if (nearbyEarlyHallPlace(position)?.id !== scene.place)
    return failedTransaction(state, '先走近这一步对应的堂内地点。')
  const next = structuredClone(state)
  const hall = next.earlyTraining.hall
  hall.stage++
  if (action.operation === 'read') hall.scroll = 'reading-first'
  if (action.operation === 'return') hall.scroll = 'none'
  if (action.operation === 'select') hall.scroll = 'selected-second'
  if (action.operation === 'register') hall.scroll = 'borrowed-second'
  return successfulTransaction(next, scene.stage === 8 ? '离堂与回房已记录，借卷由萧炎保管；老师传技另行继续。' : '堂内这一步已记下，可继续或稍后回来。')
}
export function submitEarlyHall(store: GameStore, position: EarlyWalkPosition, action: EarlyHallAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyHall, [position, action])
}
