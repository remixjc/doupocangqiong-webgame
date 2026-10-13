import { submitEarlyTransaction } from './early-result'
import { failedTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { earlyForestStrikeBlock } from './early-forest-strike'
import { seventhEnergyAt, validSeventhRoom, type SeventhRoomState } from './early-training-state'
import { seventhRoomScenes } from '../content/early-seventh-room'

export type SeventhStation = typeof seventhRoomScenes[number]['station']
export type SeventhAction = SeventhRoomState & { operation: typeof seventhRoomScenes[number]['operation']; marker?: number }
export function earlySeventhRoomBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyForestStrikeBlock(state, position)
    || (state.earlyTraining.forestStrike.stage !== 7 ? '先归档林中成功练技与下山，再回房接续七段。' : '')
}
export function advanceEarlySeventhRoom(state: GameState, position: EarlyWalkPosition, station: SeventhStation, action: SeventhAction): Transaction {
  const blocked = earlySeventhRoomBlock(state, position)
  if (blocked) return failedTransaction(state, blocked)
  const task = state.earlyTraining.seventhRoom, scene = seventhRoomScenes[task.stage]
  if (!scene || !validSeventhRoom(task) || !fieldsMatch(action, task))
    return failedTransaction(state, '本次房中记录已变化，请按当前步骤继续。')
  if (station !== scene.station || action.operation !== scene.operation)
    return failedTransaction(state, '请到当前步骤的位置，依房中次序继续。')
  const next = structuredClone(state), updated = next.earlyTraining.seventhRoom
  if (task.stage === 1 || task.stage === 4) {
    if (typeof action.marker !== 'number' || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1)
      return failedTransaction(state, '调息时机无效，药液记录未改变。')
    if (action.marker < .35 || action.marker > .65) {
      if (task.attempts >= 1_000_000) return failedTransaction(state, '重试记录已到上限。')
      updated.beats = 0; updated.attempts++
      return successfulTransaction(next, '重新收心，免费重试；本次补液次数、容器状态和钱账保留。')
    }
    updated.beats++
    if (updated.beats === (task.stage === 1 ? 2 : 3)) updated.stage++
  } else {
    if (action.marker !== undefined) return failedTransaction(state, '当前步骤不接受调息时机。')
    updated.stage++
    if (updated.stage === 4) { updated.drops = 1; updated.beats = 0 }
    if (updated.stage === 6) updated.period = 'reviewed'
    if (updated.stage === 7) updated.result = 'seventh-duan'
  }
  updated.energy = seventhEnergyAt(updated.stage)
  return successfulTransaction(next, action.operation === 'refill' ? '药老从古戒补的一滴已入本次容器，不再重复补入。'
    : updated.stage === 7 ? '本轮故事七段已记录；主线人物、奖励和既有药液保持原记录。' : '本次房中步骤已保存。')
}
export function submitEarlySeventhRoom(store: GameStore, position: EarlyWalkPosition, station: SeventhStation, action: SeventhAction): boolean {
  return submitEarlyTransaction(store, advanceEarlySeventhRoom, [position, station, action])
}
