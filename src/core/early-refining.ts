import type { GameState } from './model'
import type { GameStore } from './store'
import type { EarlyWalkPosition } from './early-walk'
import { isVisible, type Transaction } from './rules'
import { ironNear, ironPlaces } from './early-iron'
import { marketTradeLedger } from './early-market-trade'
import { advanceEarlyTraining, type EarlyTrainingAction } from './early-training'
import { fieldsMatch } from './state-guards'
import { refiningAt, refiningLiquidMinimum, validRefining, type RefiningState } from './early-refining-state'
import { refiningScenes } from '../content/early-refining'
export const refiningWater = { x: 120, y: 370 }
export function refiningStart(stage: number): EarlyWalkPosition {
  return stage >= 3 ? refiningWater : ironPlaces.table
}
export function refiningNear(yan: EarlyWalkPosition, stage: number): boolean {
  return ironNear(yan, 0) && (stage !== 2 || Math.hypot(yan.x - refiningWater.x, yan.y - refiningWater.y) <= 38)
}
export function earlyRefiningBlock(state: GameState): string {
  if (!isVisible(state, 2)) return '这段往事超出当前剧透范围。'
  if (!state.completed.includes(2)) return '完成第2章首通后，可回补这段往事。'
  return state.earlyTraining.iron.stage === 18 ? '' : '先完成铁片辨认与限制归档。'
}
export type RefiningAction = RefiningState & {
  expectedLedger: ReturnType<typeof marketTradeLedger>
  expectedIron: GameState['earlyTraining']['iron']
  teacherPosition: EarlyWalkPosition
  actor: typeof refiningScenes[number]['actor']
  operation: typeof refiningScenes[number]['operation'] | 'restore' | 'drink' | 'finish'
}
export function advanceEarlyRefining(state: GameState, yan: EarlyWalkPosition, action: RefiningAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = earlyRefiningBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.refining, scene = refiningScenes[task.stage]
  if (!validRefining(task) || !fieldsMatch(action, task) || !action.expectedLedger
    || !fieldsMatch(action.expectedLedger, marketTradeLedger(state)) || !action.expectedIron
    || !fieldsMatch(action.expectedIron, state.earlyTraining.iron)) return fail('调制历史或原材料账已变化，请按当前断点继续。')
  if (!scene) return fail('清水与主辅药处理已归档。')
  if (!action.teacherPosition || !fieldsMatch(action.teacherPosition, ironPlaces.teacher)) return fail('老师必须在房中自己的位置。')
  if (!refiningNear(yan, task.stage)) return fail('先由本人走到盛水处备水。')
  if (action.operation === 'restore') return fail('旧耗材与药液不能重新领取，手中魔核只是当时历史。')
  if (action.operation === 'drink') return fail('这份调制不是口服；此刻尚未入水。')
  if (action.operation === 'finish') return fail('主辅药融合不等于魔核炼化、熄焰或入水完成。')
  if (scene.actor !== action.actor || scene.operation !== action.operation) return fail('请明确选择本步人物并按次序操作。')
  let next = structuredClone(state)
  const minimum = refiningLiquidMinimum(task.stage + 1)
  const operations = ['identify', 'water', 'primary', 'auxiliary', 'core', 'dilute'] as const
  while (next.earlyTraining.liquid.stage < minimum) {
    const step = next.earlyTraining.liquid.stage
    const input: EarlyTrainingAction = { type: 'liquid', step, operation: operations[step], expectedSpent: next.earlyTraining.purse.spent }
    const result = advanceEarlyTraining(next, input)
    if (!result.ok) return fail(result.message)
    next = result.state
  }
  next.earlyTraining.refining = refiningAt(task.stage + 1)
  return { state: next, ok: true, message: '调制断点与同一耗材账已保存，旧完成记录保持。' }
}
export function submitEarlyRefining(store: GameStore, yan: EarlyWalkPosition, action: RefiningAction): boolean {
  const result = advanceEarlyRefining(store.getSnapshot().state, yan, action)
  if (result.ok) store.update(state => { state.earlyTraining = result.state.earlyTraining })
  store.notify(result.message); return result.ok
}
