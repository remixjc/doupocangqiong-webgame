import { submitEarlyTransaction } from './early-result'
import { failedTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import { fieldsMatch } from './state-guards'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition, EarlyWalkDirection } from './early-walk'
import { validForestPosition, moveForestWalker } from './early-forest-strike'
import { ceremonyPlatform, earlyCeremonyGuestsBlock } from './early-ceremony-guests'
import { ceremonialTestAt, validCeremonialTest, type CeremonialTestState } from './early-training-state'
import { ceremonialTestScenes } from '../content/early-ceremonial-test'
export const ceremonialPlaces = {
  waiting: { x: 240, y: 280, label: '台下 · 候礼与反应' },
  rite: { x: 440, y: 160, label: '台中 · 站定候礼' },
  monument: { x: 580, y: 160, label: '正式黑碑 · 二长老验碑' },
} as const
export const ceremonialRails = [
  { x: 300, y: 80, width: 360, height: 8 },
  { x: 300, y: 80, width: 8, height: 140 },
  { x: 652, y: 80, width: 8, height: 140 },
  { x: 300, y: 212, width: 98, height: 8 },
  { x: 482, y: 212, width: 178, height: 8 },
] as const
function overlaps(position: EarlyWalkPosition, rect: { x: number; y: number; width: number; height: number }): boolean {
  return position.x > rect.x - 12 && position.x < rect.x + rect.width + 12
    && position.y > rect.y - 12 && position.y < rect.y + rect.height + 12
}
export function validCeremonialPosition(position: EarlyWalkPosition, stage: number): boolean {
  return validForestPosition(position) && !ceremonialRails.some(rect => overlaps(position, rect))
    && !(stage < 2 && overlaps(position, ceremonyPlatform))
}
export function moveCeremonialWalker(position: EarlyWalkPosition, direction: EarlyWalkDirection, stage: number): EarlyWalkPosition {
  if (!validCeremonialPosition(position, stage)) return { ...ceremonialPlaces.waiting }
  const next = moveForestWalker(position, direction)
  return validCeremonialPosition(next, stage) ? next : position
}
export function nearCeremonialPlace(position: EarlyWalkPosition, place: keyof typeof ceremonialPlaces, stage: number): boolean {
  const target = ceremonialPlaces[place]
  return validCeremonialPosition(position, stage) && Math.hypot(position.x - target.x, position.y - target.y) <= 38
}
export type CeremonialTestAction = CeremonialTestState & {
  actor: typeof ceremonialTestScenes[number]['actor']; operation: typeof ceremonialTestScenes[number]['operation']
}
export function earlyCeremonialTestBlock(state: GameState, position: EarlyWalkPosition): string {
  return earlyCeremonyGuestsBlock(state, position)
    || (state.earlyTraining.ceremonyGuests.stage !== 12 ? '先归档宾客与收剑中止，再接正式仪式与石碑复测。' : '')
}
export function advanceEarlyCeremonialTest(state: GameState, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: CeremonialTestAction): Transaction {
  const blocked = earlyCeremonialTestBlock(state, entryPosition)
  if (blocked) return failedTransaction(state, blocked)
  const task = state.earlyTraining.ceremonialTest, scene = ceremonialTestScenes[task.stage]
  if (!scene || !validCeremonialTest(task) || !fieldsMatch(action, task))
    return failedTransaction(state, '正式仪式记录已变化，请依当前阶段继续。')
  if (action.actor !== scene.actor || action.operation !== scene.operation || !nearCeremonialPlace(position, scene.place, task.stage))
    return failedTransaction(state, `先走近${ceremonialPlaces[scene.place].label}，依当前本人动作或观察步骤继续。`)
  const next = structuredClone(state), updated = next.earlyTraining.ceremonialTest
  updated.stage++; Object.assign(updated, ceremonialTestAt(updated.stage))
  return successfulTransaction(next, updated.stage === 9 ? '本次正式石碑八段已记，继续观察反应；尚无挑战裁定。' : '正式仪式与复测步骤已保存。')
}
export function submitEarlyCeremonialTest(store: GameStore, entryPosition: EarlyWalkPosition, position: EarlyWalkPosition, action: CeremonialTestAction): boolean {
  return submitEarlyTransaction(store, advanceEarlyCeremonialTest, [entryPosition, position, action])
}
