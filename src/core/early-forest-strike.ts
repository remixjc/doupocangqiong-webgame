import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition, EarlyWalkDirection } from './early-walk'
import { earlyLongSuppliesBlock } from './early-long-supplies'
import { validForestStrike } from './early-training-state'
import { forestStrikeScenes } from '../content/early-forest-strike'

export const forestPlaces = {
  stone: { x: 160, y: 220, label: '青石 · 回顾与休息' },
  tree: { x: 440, y: 160, label: '练技树 · 稳身与肘击' },
  trail: { x: 620, y: 300, label: '山径 · 下山' },
} as const
export const forestStart = { x: 160, y: 300 }
export function validForestPosition(position: EarlyWalkPosition): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y)
    && position.x >= 40 && position.x <= 680 && position.y >= 80 && position.y <= 340
}
export function nearForestPlace(position: EarlyWalkPosition, place: keyof typeof forestPlaces): boolean {
  const target = forestPlaces[place]
  return validForestPosition(position) && Math.hypot(position.x - target.x, position.y - target.y) <= 45
}
export function moveForestWalker(position: EarlyWalkPosition, direction: EarlyWalkDirection): EarlyWalkPosition {
  if (!validForestPosition(position)) return { ...forestStart }
  return { x: Math.max(40, Math.min(680, position.x + (direction === 'left' ? -20 : direction === 'right' ? 20 : 0))),
    y: Math.max(80, Math.min(340, position.y + (direction === 'up' ? -20 : direction === 'down' ? 20 : 0))) }
}
export type ForestStrikeAction = { stage: number; beats: number; attempts: number;
  operation: typeof forestStrikeScenes[number]['operation'] | 'gather' | 'strike' | 'stop'; marker?: number }
export function earlyForestStrikeBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyLongSuppliesBlock(state, position)
    || (state.earlyTraining.longSupplies.stage !== 6 ? '先归档另购长期物资，再接续林中首次成功练技。' : '')
}
export function advanceEarlyForestStrike(state: GameState, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: ForestStrikeAction): Transaction {
  const blocked = earlyForestStrikeBlock(state, entryPosition)
  if (blocked) return { state, ok: false, message: blocked }
  const task = state.earlyTraining.forestStrike, scene = forestStrikeScenes[task.stage]
  if (!scene || !validForestStrike(task) || action.stage !== task.stage || action.beats !== task.beats || action.attempts !== task.attempts)
    return { state, ok: false, message: '林中练技记录已变化，请依当前步骤继续。' }
  if (!validForestPosition(position)) return { state, ok: false, message: '林中位置无效，练技记录未改变。' }
  const next = structuredClone(state), updated = next.earlyTraining.forestStrike
  if (task.stage === 2 && action.operation === 'stop') {
    if (task.attempts >= 1_000_000) return { state, ok: false, message: '重试记录已到上限。' }
    updated.stage = 1; updated.beats = 0; updated.attempts++
    return { state: next, ok: true, message: '本轮免费停练；六段回顾、物资和树木原状保留。' }
  }
  if (!nearForestPlace(position, scene.place)) return { state, ok: false, message: `先走近${forestPlaces[scene.place].label}。` }
  if (task.stage === 2) {
    if (action.operation !== (['steady', 'gather', 'strike'] as const)[task.beats])
      return { state, ok: false, message: '请依稳身、凝气、肘击的次序练习。' }
    if (typeof action.marker !== 'number' || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1)
      return { state, ok: false, message: '练技时机无效，记录未改变。' }
    if (action.marker < .35 || action.marker > .65) {
      if (task.attempts >= 1_000_000) return { state, ok: false, message: '重试记录已到上限。' }
      updated.beats = 0; updated.attempts++
      return { state: next, ok: true, message: '动作尚未连贯，重新稳身；没有扣钱或材料，树仍完好。' }
    }
    updated.beats++
    if (updated.beats === 3) { updated.stage = 3; updated.tree = 'fallen' }
  } else {
    if (action.operation !== scene.operation || action.marker !== undefined)
      return { state, ok: false, message: '当前不是这个练技操作。' }
    updated.stage++
    if (updated.stage === 1) updated.result = 'sixth-duan'
  }
  return { state: next, ok: true, message: updated.stage === 3
    ? '首次成功肘击已记下，同一棵树倒下；当前耗尽，先退至青石休息。'
    : '林中练技步骤已记录；主线技能、奖励与药液保留。' }
}
export function submitEarlyForestStrike(store: GameStore, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: ForestStrikeAction): boolean {
  const result = advanceEarlyForestStrike(store.getSnapshot().state, entryPosition, position, action)
  if (result.ok) store.update(state => { state.earlyTraining = result.state.earlyTraining })
  store.notify(result.message)
  return result.ok
}
