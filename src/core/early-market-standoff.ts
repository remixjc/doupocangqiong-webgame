import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import { isVisible, type Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { cityPositionValid } from './early-city-pharmacy'
import { marketStandoffAt, validMarketStandoff, type MarketStandoffState } from './early-market-standoff-state'
import { marketStandoffScenes } from '../content/early-market-standoff'
export const standoffPlaces = {
  street: { x: 220, y: 310, label: '围堵街角' }, exit: { x: 80, y: 310, label: '来人撤走处' }, deep: { x: 540, y: 310, label: '更深的摊位' },
} as const
export type StandoffFocus = typeof marketStandoffScenes[number]['view']
export const standoffNames: Record<StandoffFocus, string> = { yan: '萧炎', xuner: '薰儿', opponent: '来人', underlings: '随从', crowd: '围观人群', guards: '队长与护卫', captain: '队长' }
export function standoffNear(p: EarlyWalkPosition, place: keyof typeof standoffPlaces): boolean {
  const target = standoffPlaces[place]
  return cityPositionValid(p) && Math.hypot(p.x - target.x, p.y - target.y) <= 38
}
export function earlyMarketStandoffBlock(state: GameState): string {
  if (!isVisible(state, 2)) return '这段往事超出当前剧透范围。'
  if (!state.completed.includes(2)) return '完成第2章首通后，可回补这段往事。'
  return state.earlyTraining.marketBracelets.stage === 28 ? '' : '先完成让路与两条手链归档。'
}
export type MarketStandoffView = { kind: 'yan' | 'xuner'; position: EarlyWalkPosition }
  | { kind: 'observer'; focus: Exclude<StandoffFocus, 'yan' | 'xuner'>; place: keyof typeof standoffPlaces }
export type MarketStandoffAction = MarketStandoffState & {
  actor: typeof marketStandoffScenes[number]['actor']
  operation: typeof marketStandoffScenes[number]['operation'] | 'fight' | 'loot' | 'recruit' | 'claim-core'
}
export function advanceEarlyMarketStandoff(state: GameState, view: MarketStandoffView, action: MarketStandoffAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = earlyMarketStandoffBlock(state)
  if (blocked) return fail(blocked)
  const task = state.earlyTraining.marketStandoff, scene = marketStandoffScenes[task.stage]
  if (!validMarketStandoff(task) || (Object.keys(task) as (keyof MarketStandoffState)[]).some(key => task[key] !== action[key]))
    return fail('围堵与离场记录已经变化，请按当前断点继续。')
  if (!scene) return fail('围堵与非战斗离场已经归档。')
  const observer = scene.view !== 'yan' && scene.view !== 'xuner'
  if (observer ? view.kind !== 'observer' || view.focus !== scene.view || view.place !== scene.place
    : view.kind === 'observer' || view.kind !== scene.view || !standoffNear(view.position, scene.place))
    return fail('请先明确选择本步人物或旁观焦点，并由本人走近所需地点。')
  if (action.operation === 'fight') return fail('本人拒绝这次单挑，这里没有交战。')
  if (action.operation === 'loot') return fail('来人离场没有击杀或战利品，章节奖励保持。')
  if (action.operation === 'recruit') return fail('护卫完成职责后离开，不加入伙伴队伍。')
  if (action.operation === 'claim-core') return fail('只是继续寻核，尚未发现或成交。')
  if (scene.actor !== action.actor || scene.operation !== action.operation) return fail('人物或操作次序不符。')
  const next = structuredClone(state)
  next.earlyTraining.marketStandoff = marketStandoffAt(task.stage + 1)
  return { state: next, ok: true, message: task.stage === 33 ? '非战斗离场已归档，发现与成交待续。' : '这一步已保存。' }
}
export function submitEarlyMarketStandoff(store: GameStore, view: MarketStandoffView, action: MarketStandoffAction): boolean {
  const result = advanceEarlyMarketStandoff(store.getSnapshot().state, view, action)
  return commitEarlyResult(store, result, 'marketStandoff')
}
