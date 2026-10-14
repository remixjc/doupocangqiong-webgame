import { nearWalkPoint } from './walker-step'
import { submitEarlyTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import { rejectTransaction } from './early-result'
import { earlyHistoryBlock } from './early-history-block'
import type { GameState } from './model'
import type { GameStore } from './store'
import { type Transaction } from './rules'
import { advanceEarlyTraining } from './early-training'
import type { EarlyWalkPosition } from './early-walk'
import { cityPositionValid } from './early-city-pharmacy'
import { discoveryNear } from './early-market-discovery'
import { fieldsMatch } from './state-guards'
import { marketTradeAt, marketTradeMinimum, validMarketTrade, type MarketTradeState } from './early-market-trade-state'
import { marketTradeScenes } from '../content/early-market-trade'
export const marketTradeExit = { x: 540, y: 310 }
export function tradeNear(position: EarlyWalkPosition, stage: number): boolean {
  return stage < 13 ? discoveryNear(position)
    : cityPositionValid(position) && nearWalkPoint(position, marketTradeExit, 38)
}
export function earlyMarketTradeBlock(state: GameState): string {
  const blocked = earlyHistoryBlock(state)
  if (blocked) return blocked
  return state.earlyTraining.marketDiscovery.stage === 10 ? '' : '先完成摊位发现与心中建议归档。'
}
export function marketTradeLedger(state: GameState) {
  const t = state.earlyTraining
  return { started: t.started, ...t.purse,
    grassReceipt: t.receipts.bluegrass, flowerReceipt: t.receipts.boneflower, coreReceipt: t.receipts.woodCore,
    ...t.supplies, marketStage: t.market.stage, blackIron: t.market.blackIron,
    liquidStage: t.liquid.stage, water: t.liquid.water, ready: t.liquid.ready }
}
export type MarketTradeAction = MarketTradeState & {
  expectedLedger: ReturnType<typeof marketTradeLedger>
  actor: typeof marketTradeScenes[number]['actor']
  operation: typeof marketTradeScenes[number]['operation'] | 'extra-charge' | 'duplicate' | 'learn' | 'early-pay'
}
export function advanceEarlyMarketTrade(state: GameState, position: EarlyWalkPosition, action: MarketTradeAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = earlyMarketTradeBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.marketTrade, scene = marketTradeScenes[task.stage]
  if (!validMarketTrade(task) || !fieldsMatch(action, task) || !action.expectedLedger
    || !fieldsMatch(action.expectedLedger, marketTradeLedger(state))) return fail('交涉或采购账本已变化，请按当前断点继续。')
  if (!scene) return fail('询价与唯一成交已归档。')
  if (!tradeNear(position, task.stage)) return fail(task.stage < 13 ? '先由本人走近摊位。' : '先由本人带薰儿走到离摊标记。')
  if (action.operation === 'extra-charge') return fail('500与470仅为交涉报价，不能额外扣到折算账。')
  if (action.operation === 'duplicate') return fail('已购或已耗的唯一订单不能重复扣款、补核或补附物。')
  if (action.operation === 'learn') return fail('成交没有解释或传授铁片斗技。')
  if (action.operation === 'early-pay') return fail('必须先询价、议价并等卖家明确同意。')
  if (scene.actor !== action.actor || scene.operation !== action.operation) return fail('人物或操作次序不符。')
  let next = structuredClone(state), settlement = task.settlement
  if (task.stage === 12) {
    settlement = state.earlyTraining.receipts.woodCore ? 'existing-order' : 'new-order'
    if (settlement === 'new-order') {
      const result = advanceEarlyTraining(state, { type: 'purchase', item: 'woodCore', price: 60, expectedSpent: state.earlyTraining.purse.spent })
      if (!result.ok) return result
      next = result.state
    }
  }
  next.earlyTraining.marketTrade = marketTradeAt(task.stage + 1, settlement)
  next.earlyTraining.market.stage = Math.max(next.earlyTraining.market.stage, marketTradeMinimum(task.stage + 1))
  if (task.stage === 12) next.earlyTraining.market.blackIron = 1
  return successfulTransaction(next, task.stage === 12 ? settlement === 'new-order'
    ? '唯一订单折算60已扣，魔核和黑铁片同次交付。' : '已有订单仅补历史，未扣款或补发材料。' : '这一步已保存。')
}
export function submitEarlyMarketTrade(store: GameStore, position: EarlyWalkPosition, action: MarketTradeAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyMarketTrade, [position, action])
}
