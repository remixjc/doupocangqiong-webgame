import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { earlySettlementBlock } from './early-settlement'
import { consignmentOwnerAt } from './early-training-state'
import { fatherGiftScenes } from '../content/early-father-gift'

export type FatherGiftStation = typeof fatherGiftScenes[number]['station']
export type FatherGiftAction = { step: number; owner: GameState['earlyTraining']['consignment']['owner']; operation: typeof fatherGiftScenes[number]['operation'] }
export function earlyFatherGiftBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlySettlementBlock(state, position)
    || (state.earlyTraining.settlement.stage !== 7 ? '先办完寄售手续并离场，再回房接续父亲来访。' : '')
}
export function advanceEarlyFatherGift(state: GameState, position: EarlyWalkPosition, station: FatherGiftStation, action: FatherGiftAction): Transaction {
  const blocked = earlyFatherGiftBlock(state, position)
  if (blocked) return { state, ok: false, message: blocked }
  const task = state.earlyTraining.fatherGift, scene = fatherGiftScenes[task.stage]
  if (!scene || action.step !== scene.step || action.operation !== scene.operation
    || action.owner !== state.earlyTraining.consignment.owner || action.owner !== consignmentOwnerAt(8, task.stage))
    return { state, ok: false, message: '父子来访或同瓶保管记录已变化，请按当前步骤继续。' }
  if (station !== scene.station) return { state, ok: false, message: '请到当前父子来访对应的位置。' }
  const next = structuredClone(state)
  next.earlyTraining.fatherGift.stage++
  next.earlyTraining.consignment.owner = consignmentOwnerAt(8, next.earlyTraining.fatherGift.stage)
  return { state: next, ok: true, message: next.earlyTraining.fatherGift.stage === 4
    ? '萧炎已接过父亲赠回的同一瓶；资金、材料与自用耗尽记录保留。'
    : '本步父子来访已记录，同瓶保管沿原来的来源继续。' }
}
export function submitEarlyFatherGift(store: GameStore, position: EarlyWalkPosition, station: FatherGiftStation, action: FatherGiftAction): boolean {
  const result = advanceEarlyFatherGift(store.getSnapshot().state, position, station, action)
  return commitEarlyResult(store, result)
}
