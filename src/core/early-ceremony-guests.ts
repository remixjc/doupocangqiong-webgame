import { fieldsMatch } from './state-guards'
import { commitEarlyResult } from './early-result'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition, EarlyWalkDirection } from './early-walk'
import { validForestPosition, moveForestWalker } from './early-forest-strike'
import { earlyEighthTrainingBlock } from './early-eighth-training'
import { ceremonyGuestsAt, validCeremonyGuests, type CeremonyGuestsState } from './early-training-state'
import { ceremonyGuestScenes } from '../content/early-ceremony-guests'
export const ceremonyGuestPlaces = {
  gate: { x: 100, y: 320, label: '场口 · 入场与归档' },
  shade: { x: 240, y: 280, label: '树荫 · 同行与冲突中止' },
  reception: { x: 520, y: 300, label: '接待处 · 父亲介绍' },
} as const
export const ceremonyPlatform = { x: 300, y: 80, width: 360, height: 140 }
export function validCeremonyGuestPosition(position: EarlyWalkPosition): boolean {
  return validForestPosition(position) && !(position.x > ceremonyPlatform.x - 12 && position.x < ceremonyPlatform.x + ceremonyPlatform.width + 12
    && position.y > ceremonyPlatform.y - 12 && position.y < ceremonyPlatform.y + ceremonyPlatform.height + 12)
}
export function moveCeremonyGuestWalker(position: EarlyWalkPosition, direction: EarlyWalkDirection): EarlyWalkPosition {
  if (!validCeremonyGuestPosition(position)) return { ...ceremonyGuestPlaces.gate }
  const next = moveForestWalker(position, direction)
  return validCeremonyGuestPosition(next) ? next : position
}
export function nearCeremonyGuestPlace(position: EarlyWalkPosition, place: keyof typeof ceremonyGuestPlaces): boolean {
  const target = ceremonyGuestPlaces[place]
  return validCeremonyGuestPosition(position) && Math.hypot(position.x - target.x, position.y - target.y) <= 45
}
export type CeremonyGuestAction = CeremonyGuestsState & { operation: typeof ceremonyGuestScenes[number]['operation'] }
export function earlyCeremonyGuestsBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyEighthTrainingBlock(state, position)
    || (state.earlyTraining.eighthTraining.stage !== 15 ? '先归档同行与礼前训练，再前往正式礼宾客场地。' : '')
}
export function advanceEarlyCeremonyGuests(state: GameState, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: CeremonyGuestAction): Transaction {
  const blocked = earlyCeremonyGuestsBlock(state, entryPosition)
  if (blocked) return { state, ok: false, message: blocked }
  const task = state.earlyTraining.ceremonyGuests, scene = ceremonyGuestScenes[task.stage]
  if (!scene || !validCeremonyGuests(task) || !fieldsMatch(action, task))
    return { state, ok: false, message: '宾客与收剑记录已变化，请依当前步骤继续。' }
  if (action.operation !== scene.operation || !nearCeremonyGuestPlace(position, scene.place))
    return { state, ok: false, message: `先走近${ceremonyGuestPlaces[scene.place].label}，完成当前观察。` }
  const next = structuredClone(state), updated = next.earlyTraining.ceremonyGuests
  updated.stage++; Object.assign(updated, ceremonyGuestsAt(updated.stage))
  return { state: next, ok: true, message: updated.stage === 7 ? '萧玉已收剑，没有发生战斗；待听后续回应。' : '宾客与冲突中止步骤已保存。' }
}
export function submitEarlyCeremonyGuests(store: GameStore, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: CeremonyGuestAction): boolean {
  const result = advanceEarlyCeremonyGuests(store.getSnapshot().state, entryPosition, position, action)
  return commitEarlyResult(store, result)
}
