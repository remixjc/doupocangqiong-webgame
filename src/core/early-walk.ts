import { stepWalker } from './walker-step'
export interface EarlyWalkPosition { x: number; y: number }
export type EarlyWalkDirection = 'up' | 'down' | 'left' | 'right'
export const earlyWalkSize = { width: 720, height: 420 }
export const earlyWalkStart: EarlyWalkPosition = { x: 360, y: 370 }
export const earlyWalkObstacles = [
  { x: 60, y: 45, width: 180, height: 80 },
  { x: 490, y: 45, width: 170, height: 80 },
  { x: 316, y: 185, width: 88, height: 48 },
]
export const earlyWalkPlaces = [
  { id: 'xuner', label: '薰儿 · 准备院落', x: 150, y: 310,
    text: '向薰儿筹措采购资金。资金专用于准备单，和主线行囊金币分开记账。' },
  { id: 'pharmacy', label: '药铺 · 两种药草', x: 150, y: 150,
    text: '准备三株主药草和两株辅药草，再去坊市寻找指定魔核。普通行囊材料不能替代。' },
  { id: 'market', label: '坊市 · 魔核摊位', x: 575, y: 150,
    text: '寻找一阶木属性魔核，回顾护卫介入和黑铁片附物。魔核与附物来自同一次采购。' },
  { id: 'teacher', label: '药老 · 盛水容器', x: 575, y: 310,
    text: '萧炎准备容器和水，药老处理材料并调制药液。准备齐备后再做初期调息与斗技尝试。' },
] as const

export function earlyWalkPositionValid(position: EarlyWalkPosition): boolean {
  const radius = 12
  return Number.isFinite(position.x) && Number.isFinite(position.y)
    && position.x >= radius && position.x <= earlyWalkSize.width - radius
    && position.y >= radius && position.y <= earlyWalkSize.height - radius
    && !earlyWalkObstacles.some(rect => position.x > rect.x - radius && position.x < rect.x + rect.width + radius
      && position.y > rect.y - radius && position.y < rect.y + rect.height + radius)
}
export function moveEarlyWalker(position: EarlyWalkPosition, direction: EarlyWalkDirection): EarlyWalkPosition {
  if (!earlyWalkPositionValid(position)) return { ...earlyWalkStart }
  return stepWalker(position, direction, earlyWalkPositionValid)
}
export function nearbyEarlyWalkPlace(position: EarlyWalkPosition) {
  if (!earlyWalkPositionValid(position)) return undefined
  return earlyWalkPlaces.find(place => Math.hypot(place.x - position.x, place.y - position.y) <= 48)
}
