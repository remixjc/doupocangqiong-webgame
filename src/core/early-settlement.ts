import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { earlyAuctionBlock } from './early-auction'
import { settlementScenes, FIRST_SALE_NET } from '../content/early-settlement'

export type SettlementStation = typeof settlementScenes[number]['station']
export type SettlementAction = { step: number; net: number; vip: boolean; owner: GameState['earlyTraining']['consignment']['owner']; operation: typeof settlementScenes[number]['operation'] }
export function earlySettlementBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyAuctionBlock(state, position)
    || (state.earlyTraining.auction.stage !== 7 ? '先完成首次药液拍卖及下一拍品介绍，再接续寄售手续。' : '')
}
export function advanceEarlySettlement(state: GameState, position: EarlyWalkPosition, station: SettlementStation, action: SettlementAction): Transaction {
  const blocked = earlySettlementBlock(state, position)
  if (blocked) return { state, ok: false, message: blocked }
  const task = state.earlyTraining.settlement, scene = settlementScenes[task.stage]
  if (!scene || action.step !== scene.step || action.operation !== scene.operation || action.net !== task.net || action.vip !== task.vip
    || action.owner !== 'auction' || state.earlyTraining.consignment.owner !== action.owner)
    return { state, ok: false, message: '寄售手续或款项记录已变化，请按当前步骤继续。' }
  if (station !== scene.station) return { state, ok: false, message: '请到当前寄售手续对应的位置。' }
  const next = structuredClone(state), updated = next.earlyTraining.settlement
  updated.stage++; updated.vip = updated.stage >= 4
  updated.net = updated.stage >= 6 ? FIRST_SALE_NET : 0
  return { state: next, ok: true, message: updated.stage === 6
    ? '已接过储款卡，独立净款39200只记一次；主线金币和同瓶保管保留。'
    : '本步寄售手续已保存，凭据与收款按步骤分别记录。' }
}
export function submitEarlySettlement(store: GameStore, position: EarlyWalkPosition, station: SettlementStation, action: SettlementAction): boolean {
  const result = advanceEarlySettlement(store.getSnapshot().state, position, station, action)
  return commitEarlyResult(store, result)
}
