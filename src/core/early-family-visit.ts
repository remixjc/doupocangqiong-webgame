import { rejectTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import { isVisible, type Transaction } from './rules'
import type { EarlyWalkDirection, EarlyWalkPosition } from './early-walk'
import { familyVisitAt, validFamilyVisit, type FamilyVisitState } from './early-family-visit-state'
import { familyVisitScenes } from '../content/early-family-visit'

export const familyVisitPlaces = {
  room: { x: 100, y: 330, label: '清晨房中' },
  attendant: { x: 180, y: 330, label: '传话门前' },
  entrance: { x: 270, y: 270, label: '接待厅门口' },
  father: { x: 550, y: 100, label: '父亲与长老席' },
  seats: { x: 350, y: 170, label: '族人席间' },
  xuner: { x: 350, y: 310, label: '薰儿与书' },
  guests: { x: 610, y: 270, label: '来客席' },
} as const
export const familyVisitWalls = [
  { x: 240, y: 20, width: 10, height: 210 },
  { x: 240, y: 310, width: 10, height: 90 },
  { x: 240, y: 360, width: 440, height: 10 },
  { x: 440, y: 200, width: 80, height: 50 },
]
export function familyVisitPositionValid(position: EarlyWalkPosition): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y)
    && position.x >= 12 && position.x <= 708 && position.y >= 12 && position.y <= 408
    && !familyVisitWalls.some(wall => position.x > wall.x - 12 && position.x < wall.x + wall.width + 12
      && position.y > wall.y - 12 && position.y < wall.y + wall.height + 12)
}
export function moveFamilyVisitWalker(position: EarlyWalkPosition, direction: EarlyWalkDirection): EarlyWalkPosition {
  if (!familyVisitPositionValid(position)) return { ...familyVisitPlaces.room }
  const delta = { up: [0, -20], down: [0, 20], left: [-20, 0], right: [20, 0] }[direction]
  if (!delta) return position
  const next = { x: position.x + delta[0], y: position.y + delta[1] }
  return familyVisitPositionValid(next) ? next : position
}
export function nearFamilyVisitPlace(position: EarlyWalkPosition, place: keyof typeof familyVisitPlaces): boolean {
  const target = familyVisitPlaces[place]
  return familyVisitPositionValid(position) && Math.hypot(position.x - target.x, position.y - target.y) <= 38
}
export function earlyFamilyVisitBlock(state: GameState): string {
  if (!isVisible(state, 2)) return '这段往事超出当前剧透范围。'
  return state.completed.includes(2) ? '' : '完成第2章首通后，可回到拜师之前的家族来访。'
}
export type FamilyVisitAction = FamilyVisitState & {
  actor: typeof familyVisitScenes[number]['actor']
  operation: typeof familyVisitScenes[number]['operation'] | 'take-box' | 'accept-for-father'
}
export function advanceEarlyFamilyVisit(state: GameState, position: EarlyWalkPosition, action: FamilyVisitAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = earlyFamilyVisitBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.familyVisit
  if (!validFamilyVisit(task) || !fieldsMatch(action, task))
    return fail('来访记录已变化，请按当前场景继续。')
  const scene = familyVisitScenes[task.stage]
  if (!scene) return fail('来访前半程已归档，不重复记账。')
  if (!nearFamilyVisitPlace(position, scene.place)) return fail(`请先走近${familyVisitPlaces[scene.place].label}。`)
  if (action.operation === 'take-box') return fail('玉匣仍在来客手中；观察补偿不等于收取丹药。')
  if (action.operation === 'accept-for-father') return fail('不能替父亲答应；先听完公开请求与双方反应。')
  if (action.actor !== scene.actor || action.operation !== scene.operation) return fail('人物或操作次序不符，请按当前提示继续。')
  const next = structuredClone(state)
  next.earlyTraining.familyVisit = familyVisitAt(task.stage + 1)
  return { state: next, ok: true, message: task.stage === 16
    ? '来访前半程已归档，补偿尚未答复、文书与立约待续。'
    : '来访这一步已保存；不改变主线能力、行囊或已结算奖励。' }
}
export function submitEarlyFamilyVisit(store: GameStore, position: EarlyWalkPosition, action: FamilyVisitAction): boolean {
  const result = advanceEarlyFamilyVisit(store.getSnapshot().state, position, action)
  return commitEarlyResult(store, result, 'familyVisit')
}
