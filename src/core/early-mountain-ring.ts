import { rejectTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import { earlyHistoryBlock } from './early-history-block'
import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import { type Transaction } from './rules'
import type { EarlyWalkDirection, EarlyWalkPosition } from './early-walk'
import { mountainRingAt, validMountainRing, type MountainRingState } from './early-mountain-ring-state'
import { mountainRingScenes } from '../content/early-mountain-ring'

export const mountainRingPlaces = {
  path: { x: 120, y: 330, label: '安全山径' },
  stone: { x: 300, y: 110, label: '山顶青石' },
  ridge: { x: 540, y: 110, label: '安全崖侧' },
} as const
export const mountainRingStart = { x: 80, y: 330 }
export const mountainRingObstacles = [
  { x: 100, y: 60, width: 90, height: 90 },
  { x: 380, y: 200, width: 100, height: 70 },
  { x: 630, y: 0, width: 90, height: 420 },
]
export function mountainRingPositionValid(position: EarlyWalkPosition): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y) && position.x >= 12 && position.x <= 708
    && position.y >= 12 && position.y <= 408 && !mountainRingObstacles.some(rect =>
      position.x > rect.x - 12 && position.x < rect.x + rect.width + 12 && position.y > rect.y - 12 && position.y < rect.y + rect.height + 12)
}
export function moveMountainRingWalker(position: EarlyWalkPosition, direction: EarlyWalkDirection): EarlyWalkPosition {
  if (!mountainRingPositionValid(position)) return { ...mountainRingStart }
  const delta = { up: [0, -20], down: [0, 20], left: [-20, 0], right: [20, 0] }[direction]
  if (!delta) return position
  const next = { x: position.x + delta[0], y: position.y + delta[1] }
  return mountainRingPositionValid(next) ? next : position
}
export function mountainRingNear(position: EarlyWalkPosition, place: keyof typeof mountainRingPlaces): boolean {
  const target = mountainRingPlaces[place]
  return !!target && mountainRingPositionValid(position) && Math.hypot(position.x - target.x, position.y - target.y) <= 38
}
export function earlyMountainRingBlock(state: GameState): string {
  const blocked = earlyHistoryBlock(state)
  if (blocked) return blocked
  return state.earlyTraining.familyContract.stage === 33 ? '' : '先完成文书与双方离厅，再独自走上后山。'
}
export type MountainRingAction = MountainRingState & {
  actor: typeof mountainRingScenes[number]['actor']
  operation: typeof mountainRingScenes[number]['operation'] | 'claim-cause' | 'wear-now' | 'claim-promise' | 'claim-recovery'
}
export function advanceEarlyMountainRing(state: GameState, position: EarlyWalkPosition, action: MountainRingAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = earlyMountainRingBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.mountainRing
  if (!validMountainRing(task) || !fieldsMatch(action, task))
    return fail('后山与古戒记录已变化，请按当前步骤继续。')
  const scene = mountainRingScenes[task.stage]
  if (!scene) return fail('后山前段已归档，不重复记录或领取奖励。')
  if (!mountainRingNear(position, scene.place)) return fail(`请先走近${mountainRingPlaces[scene.place].label}。`)
  if (action.operation === 'claim-cause') return fail('声音、定位、询问与承认分别记录，不能跳过当前步骤直接签原因。')
  if (action.operation === 'wear-now') return fail('本段不登记重新佩戴；同一古戒返回后仍浮空，正式返戒另行接续。')
  if (action.operation === 'claim-promise') return fail('本人只是询问今后取气边界；老人的承诺和拜师尚待后续答复。')
  if (action.operation === 'claim-recovery') return fail('得知流失原因不补满当前资源、授境界或重发奖励。')
  if (action.actor !== scene.actor || action.operation !== scene.operation) return fail('人物或操作次序不符，请按当前提示继续。')
  const next = structuredClone(state); next.earlyTraining.mountainRing = mountainRingAt(task.stage + 1)
  return { state: next, ok: true, message: task.stage === 20
    ? '后山与古戒前段已归档；承诺、援助谈判与本人拜师待续。'
    : '后山这一步已保存；主线资源、装备与已结算奖励保留。' }
}
export function submitEarlyMountainRing(store: GameStore, position: EarlyWalkPosition, action: MountainRingAction): boolean {
  const result = advanceEarlyMountainRing(store.getSnapshot().state, position, action)
  return commitEarlyResult(store, result, 'mountainRing')
}
