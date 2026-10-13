import { submitEarlyTransaction } from './early-result'
import { stepWalker } from './walker-step'
import { successfulTransaction } from './early-result'
import { rejectTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import { earlyQiPavilionBlock } from './early-qi-pavilion'
import { qiPavilionAidAt, validQiPavilionAid, type QiPavilionAidState } from './early-training-state'
import { qiAidScenes } from '../content/early-qi-aid'
import type { EarlyWalkPosition, EarlyWalkDirection } from './early-walk'

export const qiAidPlaces = {
  fire: { x: 100, y: 320, label: '火通道 · 四十三号房外' },
  room: { x: 180, y: 140, label: '薰儿自选卷小房' },
  clock: { x: 500, y: 140, label: '其他通道 · 看时间' },
  wind: { x: 540, y: 320, label: '萧媚风属性房门' },
  pass: { x: 640, y: 360, label: '薰儿等候处 · 阁内' },
} as const
export function validQiAidPosition(position: EarlyWalkPosition): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y) && position.x >= 60 && position.x <= 660
    && position.y >= 100 && position.y <= 380 && !(position.x >= 260 && position.x <= 440 && position.y >= 220 && position.y <= 320)
}
export function moveQiAidWalker(position: EarlyWalkPosition, direction: EarlyWalkDirection): EarlyWalkPosition {
  if (!validQiAidPosition(position)) return { ...qiAidPlaces.fire }
  return stepWalker(position, direction, validQiAidPosition)
}
export function nearQiAidPlace(position: EarlyWalkPosition, place: keyof typeof qiAidPlaces): boolean {
  return validQiAidPosition(position) && Math.hypot(position.x - qiAidPlaces[place].x, position.y - qiAidPlaces[place].y) <= 28
}
export function qiAidOperation(task: QiPavilionAidState) {
  return task.stage === 6 && task.beats === 1 ? 'solo-kick' : qiAidScenes[task.stage]?.operation ?? 'archive'
}
export type QiAidAction = QiPavilionAidState & { actor: typeof qiAidScenes[number]['actor']; operation: typeof qiAidScenes[number]['operation'] | 'solo-kick' | 'group-attack' | 'take-scroll' | 'stop'; marker?: number }
export function earlyQiAidBlock(state: GameState): string {
  return earlyQiPavilionBlock(state)
    || (state.earlyTraining.qiPavilionExchange.stage !== 8 ? '先归档双卷交接细节，再接续薰儿同行与风属性门障。' : '')
}
export function advanceEarlyQiAid(state: GameState, position: EarlyWalkPosition, action: QiAidAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = earlyQiAidBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.qiPavilionAid
  if (!validQiPavilionAid(task) || !fieldsMatch(action, task))
    return fail('功法阁援助记录已变化，请按当前步骤继续。')
  const scene = qiAidScenes[task.stage]
  if (!scene || action.actor !== scene.actor || !validQiAidPosition(position)) return fail('当前人物或位置无效。')
  const next = structuredClone(state)
  const updated = next.earlyTraining.qiPavilionAid
  const retry = (message: string): Transaction => {
    if (task.attempts >= 1_000_000) return fail('免费重试次数已达上限。')
    updated.beats = 0; updated.attempts++
    return successfulTransaction(next, message)
  }
  if (task.stage === 6 && action.operation === 'stop') return retry('免费停下本轮，回返和薰儿卷轴保管保持。')
  if (!nearQiAidPlace(position, scene.place)) return fail(`先实际走近${qiAidPlaces[scene.place].label}。`)
  if (action.operation === 'group-attack') return fail('多人同攻会增强防御；本次须独自出手，门障未破。')
  if (action.operation !== qiAidOperation(task)) return fail('请按当前动作继续；不能取第二卷或提前破障。')
  if (task.stage === 6) {
    if (typeof action.marker !== 'number' || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1) return fail('出手时机无效。')
    if (action.marker < .35 || action.marker > .65) return retry('动作未连贯，免费重来；门障完整，未取卷。')
    updated.beats++
    if (updated.beats < 2) return successfulTransaction(next, '独自站定已保存，尚未踢破门障。')
  } else if (action.marker !== undefined) return fail('本步骤不使用出手时机。')
  updated.stage++
  Object.assign(updated, qiPavilionAidAt(updated.stage))
  return successfulTransaction(next, updated.stage === 10 ? '同行与独自援助已归档，正式登记与离阁待续。' : '同行与援助步骤已保存，不发第二卷或关系奖励。')
}
export function submitEarlyQiAid(store: GameStore, position: EarlyWalkPosition, action: QiAidAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyQiAid, [position, action], 'qiPavilionAid')
}
