import { nearWalkPoint } from './walker-step'
import { submitEarlyTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import { rejectTransaction } from './early-result'
import { earlyHistoryBlock } from './early-history-block'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { EarlyWalkPosition } from './early-walk'
import { type Transaction } from './rules'
import { cityPositionValid } from './early-city-pharmacy'
import { marketTradeLedger } from './early-market-trade'
import { fieldsMatch } from './state-guards'
import { ironAt, validIron, type IronState } from './early-iron-state'
import { ironScenes } from '../content/early-iron'
export const ironPlaces = { room: { x: 140, y: 370 }, teacher: { x: 220, y: 370 }, table: { x: 260, y: 370 } }
export function ironStart(stage: number): EarlyWalkPosition {
  return stage >= 13 ? ironPlaces.table : stage >= 5 ? { x: 200, y: 370 } : ironPlaces.room
}
export function ironNear(yan: EarlyWalkPosition, stage: number): boolean {
  if (!cityPositionValid(yan)) return false
  const target = stage === 4 ? ironPlaces.teacher : stage === 12 ? ironPlaces.table : undefined
  return target ? nearWalkPoint(yan, target, 38)
    : yan.y >= 330 && yan.x >= 100 && yan.x <= 300
}
export function earlyIronBlock(state: GameState): string {
  const blocked = earlyHistoryBlock(state)
  if (blocked) return blocked
  return state.earlyTraining.marketReturn.stage === 9 ? '' : '先完成回族与房中准备归档。'
}
export type IronAction = IronState & {
  expectedLedger: ReturnType<typeof marketTradeLedger>
  expectedReturn: GameState['earlyTraining']['marketReturn']
  actor: typeof ironScenes[number]['actor']
  teacherPosition: EarlyWalkPosition
  operation: typeof ironScenes[number]['operation'] | 'learn' | 'duplicate' | 'refine'
}
export function advanceEarlyIron(state: GameState, yan: EarlyWalkPosition, action: IronAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = earlyIronBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.iron, scene = ironScenes[task.stage]
  if (!validIron(task) || !fieldsMatch(action, task) || !action.expectedLedger
    || !fieldsMatch(action.expectedLedger, marketTradeLedger(state)) || !action.expectedReturn
    || !fieldsMatch(action.expectedReturn, state.earlyTraining.marketReturn)) return fail('辨认历史或原准备账已变化，请按当前断点继续。')
  if (!scene) return fail('铁片辨认与限制已归档。')
  if (!action.teacherPosition || !fieldsMatch(action.teacherPosition, ironPlaces.teacher)) return fail('老师必须在房中自己的位置，不能借本人位置代签。')
  if (!ironNear(yan, task.stage)) return fail(task.stage === 4 ? '先由本人把铁片带到老师身边。' : '先由本人走到当前房中地点。')
  if (action.operation === 'learn') return fail('知道名称或表达意愿不等于学会斗技。')
  if (action.operation === 'duplicate') return fail('历史交接没有发放第二片铁片或恢复已耗材料。')
  if (action.operation === 'refine') return fail('辨认铁片没有进行药液炼化。')
  if (scene.actor !== action.actor || scene.operation !== action.operation) return fail('请明确选择本步人物，并按当前操作继续。')
  const next = structuredClone(state)
  next.earlyTraining.iron = ironAt(task.stage + 1)
  return successfulTransaction(next, '铁片历史已保存，原任务袋与修炼结果保持。')
}
export function submitEarlyIron(store: GameStore, yan: EarlyWalkPosition, action: IronAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyIron, [yan, action], 'iron')
}
