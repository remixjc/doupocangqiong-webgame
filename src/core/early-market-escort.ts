import { nearWalkPoint } from './walker-step'
import { submitEarlyTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import { rejectTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import { earlyHistoryBlock } from './early-history-block'
import type { GameState } from './model'
import type { GameStore } from './store'
import { type Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { cityPositionValid } from './early-city-pharmacy'
import { marketEscortAt, marketEscortObserver, validMarketEscort, type MarketEscortState } from './early-market-escort-state'
import { marketEscortScenes } from '../content/early-market-escort'
export const marketEscortPlaces = {
  alley: { x: 140, y: 310, label: '南坊巷道' }, gate: { x: 260, y: 310, label: '两门卫的入口' },
  inside: { x: 420, y: 310, label: '坊市入口内侧' }, captain: { x: 540, y: 310, label: '队长所在街口' },
  crowd: { x: 540, y: 230, label: '深入人群' }, patrol: { x: 260, y: 230, label: '巡卫街道' },
  inner: { x: 580, y: 130, label: '深处摊位通路' },
} as const
export function marketEscortNear(p: EarlyWalkPosition, place: keyof typeof marketEscortPlaces): boolean {
  const target = marketEscortPlaces[place]
  return cityPositionValid(p) && nearWalkPoint(p, target, 38)
}
export function earlyMarketEscortBlock(state: GameState): string {
  const blocked = earlyHistoryBlock(state)
  if (blocked) return blocked
  return state.earlyTraining.cityPharmacy.stage === 15 ? '' : '先完成实际同行与两药采购归档。'
}
export type MarketEscortView = { kind: 'yan'; position: EarlyWalkPosition } | { kind: 'observer'; place: keyof typeof marketEscortPlaces }
export type MarketEscortAction = MarketEscortState & {
  actor: typeof marketEscortScenes[number]['actor']
  operation: typeof marketEscortScenes[number]['operation'] | 'absorb-core' | 'collect-tax' | 'recruit' | 'claim-rank' | 'claim-core'
}
export function advanceEarlyMarketEscort(state: GameState, view: MarketEscortView, action: MarketEscortAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = earlyMarketEscortBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.marketEscort, scene = marketEscortScenes[task.stage]
  if (!validMarketEscort(task) || !fieldsMatch(action, task))
    return fail('护卫记录已经变化，请按当前断点继续。')
  if (!scene) return fail('入坊与护卫安排已归档。')
  if (marketEscortObserver(task.stage) ? view.kind !== 'observer' || view.place !== scene.place
    : view.kind !== 'yan' || !marketEscortNear(view.position, scene.place))
    return fail(marketEscortObserver(task.stage) ? '先选择当前护卫事件的旁观焦点。' : `本人先走近${marketEscortPlaces[scene.place].label}。`)
  if (action.operation === 'absorb-core') return fail('魔核不能直接吸收；本次仍在寻核。')
  if (action.operation === 'collect-tax') return fail('坊市税费是秩序背景，本人不会领取摊主税金。')
  if (action.operation === 'recruit') return fail('跟随者执行家族巡卫任务，不加入可用队伍。')
  if (action.operation === 'claim-rank') return fail('他人的徽记与同行对白不授本人境界。')
  if (action.operation === 'claim-core') return fail('护卫安排不交魔核，实际采购另段继续。')
  if (scene.actor !== action.actor || scene.operation !== action.operation) return fail('人物或操作次序不符。')
  const next = structuredClone(state)
  next.earlyTraining.marketEscort = marketEscortAt(task.stage + 1)
  return successfulTransaction(next, task.stage === 23 ? '入坊与护卫安排归档，继续寻找木核。' : '这一步已保存。')
}
export function submitEarlyMarketEscort(store: GameStore, view: MarketEscortView, action: MarketEscortAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyMarketEscort, [view, action], 'marketEscort')
}
