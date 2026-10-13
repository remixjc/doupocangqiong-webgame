import { successfulTransaction } from './early-result'
import { rejectTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import { earlyHistoryBlock } from './early-history-block'
import type { GameState } from './model'
import type { GameStore } from './store'
import { type Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { marketSearchNear } from './early-market-search'
import { braceletMinimum, marketBraceletsAt, validMarketBracelets, type MarketBraceletsState } from './early-market-bracelets-state'
import { marketBraceletsScenes } from '../content/early-market-bracelets'
export function earlyMarketBraceletsBlock(state: GameState): string {
  const blocked = earlyHistoryBlock(state)
  if (blocked) return blocked
  return state.earlyTraining.marketSearch.stage === 20 ? '' : '先完成寻核与放回手链归档。'
}
export type MarketBraceletsView = { kind: 'yan' | 'xuner'; position: EarlyWalkPosition }
export type MarketBraceletsAction = MarketBraceletsState & {
  expectedBracelet: number
  expectedGift: 'none' | 'xuner'
  actor: typeof marketBraceletsScenes[number]['actor']
  operation: typeof marketBraceletsScenes[number]['operation'] | 'take-blue' | 'claim-core' | 'pay-extra' | 'claim-rank'
}
export function advanceEarlyMarketBracelets(state: GameState, view: MarketBraceletsView, action: MarketBraceletsAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = earlyMarketBraceletsBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.marketBracelets, gift = state.earlyTraining.bracelet, scene = marketBraceletsScenes[task.stage]
  if (!validMarketBracelets(task) || !fieldsMatch(action, task)
    || action.expectedBracelet !== gift.stage || action.expectedGift !== gift.gift)
    return fail('两条手链或已有赠礼记录已经变化，请按当前断点继续。')
  if (!scene) return fail('让路与两条手链已经归档。')
  if (view.kind !== scene.view || !marketSearchNear(view.position, 'voice')) return fail('先由本步人物走近拦路街角。')
  if (action.operation === 'take-blue') return fail('蓝金手链未交付，仍在加列奥手中。')
  if (action.operation === 'claim-core') return fail('考虑拆核不等于得到木核，任务袋保持。')
  if (action.operation === 'pay-extra') return fail('比较价钱不产生订单，普通手链只有同一份赠礼记录。')
  if (action.operation === 'claim-rank') return fail('来人的徽记不会授予本人境界或战斗奖励。')
  if (scene.actor !== action.actor || scene.operation !== action.operation) return fail('人物或操作次序不符。')
  const next = structuredClone(state), stage = task.stage + 1
  next.earlyTraining.marketBracelets = marketBraceletsAt(stage)
  next.earlyTraining.bracelet.stage = Math.max(gift.stage, braceletMinimum(stage))
  next.earlyTraining.bracelet.gift = next.earlyTraining.bracelet.stage >= 5 ? 'xuner' : 'none'
  return successfulTransaction(next, stage === 28 ? '两条手链分别归档，围堵待续。' : '这一步与同一赠礼记录已保存。')
}
export function submitEarlyMarketBracelets(store: GameStore, view: MarketBraceletsView, action: MarketBraceletsAction): boolean {
  const result = advanceEarlyMarketBracelets(store.getSnapshot().state, view, action)
  if (result.ok) store.update(state => {
    state.earlyTraining.marketBracelets = result.state.earlyTraining.marketBracelets
    state.earlyTraining.bracelet = result.state.earlyTraining.bracelet
  })
  store.notify(result.message); return result.ok
}
