import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import { earlyTrainingBlock, type EarlyTrainingAction } from './early-training'
import { advanceEarlyWalk } from './early-walk-actions'
import { nearbyEarlyWalkPlace, type EarlyWalkPosition } from './early-walk'

export type EarlyRoomStation = 'materials' | 'water' | 'teacher'
type LiquidAction = Extract<EarlyTrainingAction, { type: 'liquid' }>

export function earlyRoomBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyTrainingBlock(state)
    || (nearbyEarlyWalkPlace(position)?.id !== 'teacher' ? '先走近药老，再进入调制室。' : '')
    || (state.earlyTraining.market.stage !== 4 ? '先备齐材料，带回黑铁片，再进入调制室。' : '')
}
export function earlyRoomPresentation(state: GameState) {
  const { liquid, supplies } = state.earlyTraining
  return {
    station: (liquid.stage === 1 ? 'water' : 'teacher') as EarlyRoomStation,
    water: liquid.ready ? '药液已加入清水' : liquid.water ? '清水已备好' : '容器尚未盛水',
    mixture: ['尚未开始提炼', '尚未开始提炼', '尚未开始提炼', '主药已经提炼',
      '两种药草已融合', '三种材料已炼化', '药液已入水'][liquid.stage],
    flame: liquid.stage >= 2 && liquid.stage <= 4,
    supplies,
  }
}
export function advanceEarlyRoom(state: GameState, position: EarlyWalkPosition, station: EarlyRoomStation, action: LiquidAction): Transaction {
  const blocked = earlyRoomBlock(state, position)
  if (blocked) return { state, ok: false, message: blocked }
  if (station !== earlyRoomPresentation(state).station)
    return { state, ok: false, message: '请到当前操作对应的位置，材料盘只供核对。' }
  return advanceEarlyWalk(state, position, action)
}
export function submitEarlyRoom(store: GameStore, position: EarlyWalkPosition, station: EarlyRoomStation, action: LiquidAction): boolean {
  const result = advanceEarlyRoom(store.getSnapshot().state, position, station, action)
  if (result.ok) store.update(state => { state.earlyTraining = result.state.earlyTraining })
  store.notify(result.message)
  return result.ok
}
