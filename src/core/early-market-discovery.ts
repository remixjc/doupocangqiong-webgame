import { fieldsMatch } from './state-guards'
import { earlyHistoryBlock } from './early-history-block'
import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import { type Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { cityPositionValid } from './early-city-pharmacy'
import { marketDiscoveryAt, validMarketDiscovery, type MarketDiscoveryState } from './early-market-discovery-state'
import { marketDiscoveryScenes } from '../content/early-market-discovery'
export const marketDiscoveryPlace = { x: 620, y: 230 }
export function discoveryNear(p: EarlyWalkPosition): boolean {
  return cityPositionValid(p) && Math.hypot(p.x - marketDiscoveryPlace.x, p.y - marketDiscoveryPlace.y) <= 38
}
export function earlyMarketDiscoveryBlock(state: GameState): string {
  const blocked = earlyHistoryBlock(state)
  if (blocked) return blocked
  return state.earlyTraining.marketStandoff.stage === 34 ? '' : '先完成围堵与非战斗离场归档。'
}
export type MarketDiscoveryAction = MarketDiscoveryState & {
  actor: typeof marketDiscoveryScenes[number]['actor']
  operation: typeof marketDiscoveryScenes[number]['operation'] | 'claim-core' | 'claim-iron' | 'learn' | 'pay'
}
export function advanceEarlyMarketDiscovery(state: GameState, position: EarlyWalkPosition, action: MarketDiscoveryAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = earlyMarketDiscoveryBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.marketDiscovery, scene = marketDiscoveryScenes[task.stage]
  if (!validMarketDiscovery(task) || !fieldsMatch(action, task))
    return fail('发现与心中建议记录已经变化，请按当前断点继续。')
  if (!scene) return fail('发现与心中购买建议已经归档。')
  if (!discoveryNear(position)) return fail('先由本人走近前方摊位。')
  if (action.operation === 'claim-core') return fail('发现绿核不等于成交，任务袋不增加材料。')
  if (action.operation === 'claim-iron') return fail('看到铁片或听建议没有转移物权，已有附物收据保留。')
  if (action.operation === 'learn') return fail('老师只建议买下，没有解释或传授斗技。')
  if (action.operation === 'pay') return fail('尚未询价、议价或卖家同意，不能提前付款。')
  if (scene.actor !== action.actor || scene.operation !== action.operation) return fail('人物或操作次序不符。')
  const next = structuredClone(state)
  next.earlyTraining.marketDiscovery = marketDiscoveryAt(task.stage + 1)
  return { state: next, ok: true, message: task.stage === 9 ? '发现与建议已归档，实际成交待续。' : '这一步已保存。' }
}
export function submitEarlyMarketDiscovery(store: GameStore, position: EarlyWalkPosition, action: MarketDiscoveryAction): boolean {
  const result = advanceEarlyMarketDiscovery(store.getSnapshot().state, position, action)
  return commitEarlyResult(store, result, 'marketDiscovery')
}
