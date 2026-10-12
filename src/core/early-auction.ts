import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { earlyAppraisalBlock } from './early-appraisal'
import { auctionScenes } from '../content/early-auction'

export type AuctionStation = typeof auctionScenes[number]['station']
export type AuctionAction = { step: number; owner: GameState['earlyTraining']['consignment']['owner']; operation: typeof auctionScenes[number]['operation'] }
export function earlyAuctionBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyAppraisalBlock(state, position)
    || (state.earlyTraining.appraisal.stage !== 8 || state.earlyTraining.appraisal.card !== 'black-entry'
      ? '先完成谷尼鉴定并凭黑卡进入第一拍卖室。' : '')
}
export function advanceEarlyAuction(state: GameState, position: EarlyWalkPosition, station: AuctionStation, action: AuctionAction): Transaction {
  const blocked = earlyAuctionBlock(state, position)
  if (blocked) return { state, ok: false, message: blocked }
  const task = state.earlyTraining.auction, scene = auctionScenes[task.stage]
  if (!scene || scene.step !== action.step || scene.operation !== action.operation
    || action.owner !== 'auction' || state.earlyTraining.consignment.owner !== action.owner)
    return { state, ok: false, message: '拍卖或同瓶保管记录已变化，请按当前步骤继续。' }
  if (station !== scene.station) return { state, ok: false, message: '请到当前拍卖步骤对应的位置观察。' }
  const next = structuredClone(state)
  next.earlyTraining.auction.stage++
  return { state: next, ok: true, message: next.earlyTraining.auction.stage === 6
    ? '雅妃已敲槌：同瓶成交归萧战，款项尚待结算，药液仍由拍卖方保管。'
    : '拍卖观察已记录；身份、主线金币与同瓶保管保留。' }
}
export function submitEarlyAuction(store: GameStore, position: EarlyWalkPosition, station: AuctionStation, action: AuctionAction): boolean {
  const result = advanceEarlyAuction(store.getSnapshot().state, position, station, action)
  return commitEarlyResult(store, result)
}
