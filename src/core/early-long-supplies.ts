import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { earlyXunerVisitBlock } from './early-xuner-visit'
import { longSupplyPlaceAt } from './early-training-state'
import { longSupplyScenes } from '../content/early-long-supplies'

export type LongSupplyStation = typeof longSupplyScenes[number]['station']
export type LongSupplyItem = 'herbs' | 'cores'
export type LongSupplyAction = { step: number; herbs: GameState['earlyTraining']['longSupplies']['herbs']; cores: GameState['earlyTraining']['longSupplies']['cores'];
  operation: typeof longSupplyScenes[number]['operation']; item?: LongSupplyItem }
export function earlyLongSuppliesBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyXunerVisitBlock(state, position)
    || (state.earlyTraining.xunerVisit.stage !== 7 ? '先归档薰儿来访，再回看此前已购的长期物资。' : '')
}
export function advanceEarlyLongSupplies(state: GameState, position: EarlyWalkPosition, station: LongSupplyStation, action: LongSupplyAction): Transaction {
  const blocked = earlyLongSuppliesBlock(state, position)
  if (blocked) return { state, ok: false, message: blocked }
  const task = state.earlyTraining.longSupplies, scene = longSupplyScenes[task.stage]
  if (!scene || action.step !== scene.step || action.operation !== scene.operation
    || action.herbs !== task.herbs || action.cores !== task.cores
    || task.herbs !== longSupplyPlaceAt(task.stage, 'herbs') || task.cores !== longSupplyPlaceAt(task.stage, 'cores'))
    return { state, ok: false, message: '物资批次或保管位置已变化，请按当前步骤继续。' }
  if (station !== scene.station) return { state, ok: false, message: '请到当前物资归档对应的位置。' }
  const expectedItem = task.stage === 1 ? 'herbs' : task.stage === 2 ? 'cores' : undefined
  if (action.item !== expectedItem) return { state, ok: false, message: expectedItem === 'herbs' ? '药材格只接收这批药材包。'
    : expectedItem === 'cores' ? '魔核格只接收这批魔核包。' : '当前步骤不是分拣，请核对物资归档。' }
  const next = structuredClone(state), nextStage = task.stage + 1
  next.earlyTraining.longSupplies = { stage: nextStage, herbs: longSupplyPlaceAt(nextStage, 'herbs'), cores: longSupplyPlaceAt(nextStage, 'cores') }
  return { state: next, ok: true, message: nextStage === 5 ? '同一批两包已移入房柜，分拣格没有副本；原有钱账和药液保留。' : '这一步物资回溯已记下。' }
}
export function submitEarlyLongSupplies(store: GameStore, position: EarlyWalkPosition, station: LongSupplyStation, action: LongSupplyAction): boolean {
  const result = advanceEarlyLongSupplies(store.getSnapshot().state, position, station, action)
  if (result.ok) store.update(state => { state.earlyTraining = result.state.earlyTraining })
  store.notify(result.message)
  return result.ok
}
