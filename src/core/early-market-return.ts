import { submitEarlyTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import { rejectTransaction } from './early-result'
import { earlyHistoryBlock } from './early-history-block'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { EarlyWalkPosition } from './early-walk'
import { type Transaction } from './rules'
import { cityPositionValid } from './early-city-pharmacy'
import { marketTradeExit, marketTradeLedger } from './early-market-trade'
import { marketReturnAt, validMarketReturn, type MarketReturnState } from './early-market-return-state'
import { fieldsMatch } from './state-guards'
import { marketReturnScenes } from '../content/early-market-return'
export const marketReturnPlaces = { gate: { x: 300, y: 310 }, clan: { x: 140, y: 310 }, room: { x: 140, y: 370 } }
export function marketReturnStart(stage: number): EarlyWalkPosition {
  return stage >= 4 ? marketReturnPlaces.room : stage >= 2 ? marketReturnPlaces.clan : stage ? marketReturnPlaces.gate : marketTradeExit
}
export function returnNear(position: EarlyWalkPosition, stage: number): boolean {
  const scene = marketReturnScenes[stage], target = scene && marketReturnPlaces[scene.place]
  return !!target && cityPositionValid(position) && Math.hypot(position.x - target.x, position.y - target.y) <= 38
}
export function earlyMarketReturnBlock(state: GameState): string {
  const blocked = earlyHistoryBlock(state)
  if (blocked) return blocked
  return state.earlyTraining.marketTrade.stage === 17 ? '' : '先完成询价与唯一成交离摊归档。'
}
export type MarketReturnAction = MarketReturnState & {
  expectedLedger: ReturnType<typeof marketTradeLedger>
  actor: typeof marketReturnScenes[number]['actor']
  operation: typeof marketReturnScenes[number]['operation'] | 'restore' | 'learn' | 'refine'
}
export function advanceEarlyMarketReturn(state: GameState, position: EarlyWalkPosition, action: MarketReturnAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = earlyMarketReturnBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.marketReturn, scene = marketReturnScenes[task.stage]
  if (!validMarketReturn(task) || !fieldsMatch(action, task) || !action.expectedLedger
    || !fieldsMatch(action.expectedLedger, marketTradeLedger(state))) return fail('回族历史或原采购账已变化，请按当前断点继续。')
  if (!scene) return fail('回族与房中准备已经归档。')
  if (!returnNear(position, task.stage)) return fail('先由本步人物实际走到当前地点。')
  if (action.operation === 'restore') return fail('摆出当时材料只补历史，不能恢复后来已用药材或药液。')
  if (action.operation === 'learn') return fail('老师还未解释铁片，不能凭锁门或摆材料学会斗技。')
  if (action.operation === 'refine') return fail('材料摆上桌与询问没有进行炼化。')
  if (scene.actor !== action.actor || scene.operation !== action.operation) return fail('人物或操作次序不符。')
  const next = structuredClone(state)
  next.earlyTraining.marketReturn = marketReturnAt(task.stage + 1)
  return successfulTransaction(next, '这一步回族与房中历史已保存，原账和材料保持。')
}
export function submitEarlyMarketReturn(store: GameStore, position: EarlyWalkPosition, action: MarketReturnAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyMarketReturn, [position, action], 'marketReturn')
}
