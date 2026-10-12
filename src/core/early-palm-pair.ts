import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { earlySeventhRoomBlock } from './early-seventh-room'
import { palmPairAt, validPalmPair, type PalmPairState } from './early-training-state'
import { palmPairScenes } from '../content/early-palm-pair'
export type PalmPairStation = typeof palmPairScenes[number]['station']
export type PalmPairAction = PalmPairState & { operation: typeof palmPairScenes[number]['operation']; marker?: number }
export function earlyPalmPairBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlySeventhRoomBlock(state, position)
    || (state.earlyTraining.seventhRoom.stage !== 8 ? '先归档房中七段，再试吸掌与吹火掌配合。' : '')
}
export function advanceEarlyPalmPair(state: GameState, position: EarlyWalkPosition, station: PalmPairStation, action: PalmPairAction): Transaction {
  const blocked = earlyPalmPairBlock(state, position)
  if (blocked) return { state, ok: false, message: blocked }
  const task = state.earlyTraining.palmPair, scene = palmPairScenes[task.stage]
  if (!scene || !validPalmPair(task) || (Object.keys(task) as (keyof PalmPairState)[]).some(key => action[key] !== task[key]))
    return { state, ok: false, message: '吸推记录或练习瓶已变化，请按当前步骤继续。' }
  if (station !== scene.station || action.operation !== scene.operation)
    return { state, ok: false, message: '请到这一步的位置，先吸再推，求教与初练另做。' }
  const next = structuredClone(state), updated = next.earlyTraining.palmPair
  if (task.stage === 5 || task.stage === 8) {
    if (typeof action.marker !== 'number' || !Number.isFinite(action.marker) || action.marker < 0 || action.marker > 1)
      return { state, ok: false, message: '切换时机无效，练习瓶记录未改变。' }
    if (action.marker < .35 || action.marker > .65) {
      if (task.attempts >= 1_000_000) return { state, ok: false, message: '重试记录已到上限。' }
      updated.attempts++
      if (task.stage === 5) updated.beats = 0
      else { updated.stage = 7; updated.second = 'intact' }
      return { state: next, ok: true, message: task.stage === 5 ? '基础动作重新练习，不扣材料或恢复碎片。'
        : '第二只本轮归位，免费重新吸近；第一只碎片与老师初练记录保留。' }
    }
    if (task.stage === 5) { updated.beats++; if (updated.beats === 2) updated.stage = 6 }
    else updated.stage = 9
  } else {
    if (action.marker !== undefined) return { state, ok: false, message: '当前步骤不接受切换时机。' }
    updated.stage++
  }
  Object.assign(updated, palmPairAt(updated.stage))
  return { state: next, ok: true, message: updated.stage === 4 ? '第一只已成碎片；尚未学习吹火掌。'
    : updated.stage === 9 ? '第二只已成细末，两只练习瓶各自有唯一结果，售品原瓶保留。' : '吸推练习步骤已保存。' }
}
export function submitEarlyPalmPair(store: GameStore, position: EarlyWalkPosition, station: PalmPairStation, action: PalmPairAction): boolean {
  const result = advanceEarlyPalmPair(store.getSnapshot().state, position, station, action)
  return commitEarlyResult(store, result)
}
