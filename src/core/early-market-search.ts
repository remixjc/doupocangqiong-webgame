import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import { isVisible, type Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { cityPositionValid } from './early-city-pharmacy'
import { marketSearchAt, validMarketSearch, type MarketSearchState } from './early-market-search-state'
import { marketSearchScenes } from '../content/early-market-search'
export const marketSearchPlaces = {
  together: { x: 580, y: 130, label: '承诺时的通路' }, ahead: { x: 620, y: 230, label: '前方会合处' },
  deep: { x: 540, y: 310, label: '深处寻核摊位' }, bracelet: { x: 220, y: 230, label: '普通手链摊' },
  voice: { x: 220, y: 310, label: '招呼传来的街角' },
} as const
export function marketSearchNear(p: EarlyWalkPosition, place: keyof typeof marketSearchPlaces): boolean {
  const target = marketSearchPlaces[place]
  return cityPositionValid(p) && Math.hypot(p.x - target.x, p.y - target.y) <= 38
}
export function earlyMarketSearchBlock(state: GameState): string {
  if (!isVisible(state, 2)) return '这段往事超出当前剧透范围。'
  if (!state.completed.includes(2)) return '完成第2章首通后，可回补这段往事。'
  return state.earlyTraining.marketEscort.stage === 24 ? '' : '先完成入坊与护卫安排归档。'
}
export type MarketSearchView = { kind: 'yan' | 'xuner'; position: EarlyWalkPosition }
export type MarketSearchAction = MarketSearchState & {
  actor: typeof marketSearchScenes[number]['actor']
  operation: typeof marketSearchScenes[number]['operation'] | 'claim-gift' | 'claim-core' | 'refund-loan' | 'reveal-name'
}
export function advanceEarlyMarketSearch(state: GameState, view: MarketSearchView, action: MarketSearchAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = earlyMarketSearchBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.marketSearch, scene = marketSearchScenes[task.stage]
  if (!validMarketSearch(task) || (Object.keys(task) as (keyof MarketSearchState)[]).some(key => task[key] !== action[key]))
    return fail('寻核与手链记录已经变化，请按当前断点继续。')
  if (!scene) return fail('寻核与放回手链已经归档。')
  if (view.kind !== scene.view || !marketSearchNear(view.position, scene.place)) return fail(`先由${scene.view === 'yan' ? '萧炎' : '薰儿'}走近${marketSearchPlaces[scene.place].label}。`)
  if (action.operation === 'claim-gift') return fail('查看普通手链没有购买或送礼，原有礼物进度保留。')
  if (action.operation === 'claim-core') return fail('这条普通手链没有木核，寻核尚未成交。')
  if (action.operation === 'refund-loan') return fail('此时不买手链不会撤销此前借资或已经支付的订单。')
  if (action.operation === 'reveal-name') return fail('这里只看到华衣来人，姓名要到下一段对话才揭出。')
  if (scene.actor !== action.actor || scene.operation !== action.operation) return fail('人物或操作次序不符。')
  const next = structuredClone(state)
  next.earlyTraining.marketSearch = marketSearchAt(task.stage + 1)
  return { state: next, ok: true, message: task.stage === 19 ? '寻核与放回手链归档，前方交谈待续。' : '这一步已保存。' }
}
export function submitEarlyMarketSearch(store: GameStore, view: MarketSearchView, action: MarketSearchAction): boolean {
  const result = advanceEarlyMarketSearch(store.getSnapshot().state, view, action)
  return commitEarlyResult(store, result, 'marketSearch')
}
