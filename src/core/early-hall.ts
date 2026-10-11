import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import { earlyGrowthBlock } from './early-growth'
import { nearbyEarlyWalkPlace, type EarlyWalkPosition, type EarlyWalkDirection } from './early-walk'

export const earlyHallStart = { x: 360, y: 370 }
export const earlyHallObstacles = [
  { x: 55, y: 45, width: 230, height: 45 },
  { x: 55, y: 215, width: 65, height: 65 },
  { x: 625, y: 245, width: 40, height: 60 },
]
export const earlyHallPlaces = [
  { id: 'shelves', label: '西区 · 藏卷书架', x: 170, y: 130,
    text: '族内斗技藏卷在西侧收存。此处先查看书架，卷册仍由斗技堂保管，尚未办理借阅。' },
  { id: 'practice', label: '东区 · 练习场', x: 540, y: 170,
    text: '东侧供族人切磋与练习。萧炎可在场边观察；本次到访尚未记录人物切磋，也没有玩家胜负。' },
  { id: 'registry', label: '堂口 · 登记处', x: 360, y: 310,
    text: '借卷离堂需要登记。当前只辨认位置，没有借卷、归还或药老正式传技记录。' },
] as const

export function earlyHallPositionValid(position: EarlyWalkPosition): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y)
    && position.x >= 12 && position.x <= 708 && position.y >= 12 && position.y <= 408
    && !earlyHallObstacles.some(rect => position.x > rect.x - 12 && position.x < rect.x + rect.width + 12
      && position.y > rect.y - 12 && position.y < rect.y + rect.height + 12)
}
export function moveEarlyHall(position: EarlyWalkPosition, direction: EarlyWalkDirection): EarlyWalkPosition {
  if (!earlyHallPositionValid(position)) return { ...earlyHallStart }
  const delta = { up: [0, -20], down: [0, 20], left: [-20, 0], right: [20, 0] }[direction]
  if (!delta) return position
  const next = { x: position.x + delta[0], y: position.y + delta[1] }
  return earlyHallPositionValid(next) ? next : position
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
  if (blocked) return { state, ok: false, message: blocked }
  if (state.earlyTraining.hall.stage > 0)
    return { state, ok: true, message: '再次来到斗技堂，卷册与传技记录保持。' }
  const next = structuredClone(state)
  next.earlyTraining.hall.stage = 1
  return { state: next, ok: true, message: '斗技堂到访已记下，可以查看两区和登记处。' }
}
export function submitEarlyHallEntry(store: GameStore, position: EarlyWalkPosition): boolean {
  const before = store.getSnapshot().state
  const result = enterEarlyHall(before, position)
  if (result.ok && result.state !== before) store.update(state => { state.earlyTraining = result.state.earlyTraining })
  store.notify(result.message)
  return result.ok
}
