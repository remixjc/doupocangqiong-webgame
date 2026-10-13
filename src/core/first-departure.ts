import { successfulTransaction } from './early-result'
import { rejectTransaction } from './early-result'
import { earlySnapshotsMatch } from './early-snapshots'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition, EarlyWalkDirection } from './early-walk'
import { earlyHistoryBlock } from './early-history-block'
import { fieldsMatch } from './state-guards'
import { ironNear } from './early-iron'
import { cityPositionValid, moveCityWalker } from './early-city-pharmacy'
import { marketTradeLedger } from './early-market-trade'
import { firstDepartureAt, validFirstDeparture, type FirstDepartureState } from './first-departure-state'
import { firstDepartureScenes } from '../content/first-departure'
import { commitEarlyResult } from './early-result'
export const departurePlaces = { bed: { x: 140, y: 370 }, door: { x: 300, y: 370 }, yardDoor: { x: 300, y: 310 }, path: { x: 140, y: 310 } }
export type DepartureSpace = 'room' | 'outside'
export function departurePositionValid(p: EarlyWalkPosition, space: DepartureSpace): boolean {
  return space === 'room' ? ironNear(p, 0) : space === 'outside' && cityPositionValid(p) && p.x >= 100 && p.x <= 320 && p.y >= 230 && p.y <= 310
}
export function moveDepartureWalker(p: EarlyWalkPosition, space: DepartureSpace, direction: EarlyWalkDirection): EarlyWalkPosition {
  if (!departurePositionValid(p, space)) return p
  const next = moveCityWalker(p, direction)
  return departurePositionValid(next, space) ? next : p
}
export function departureNear(p: EarlyWalkPosition, space: DepartureSpace, stage: number): boolean {
  const scene = firstDepartureScenes[stage]
  return !!scene && scene.space === space && departurePositionValid(p, space) && fieldsMatch(p, departurePlaces[scene.place])
}
export function firstDepartureBlock(state: GameState): string {
  return earlyHistoryBlock(state) || (state.earlyTraining.firstTechnique.stage === 19 ? '' : '先完成有限瓷瓶试招归档。')
}
export type FirstDepartureAction = FirstDepartureState & {
  expectedTechnique: GameState['earlyTraining']['firstTechnique']
  expectedTraining: GameState['earlyTraining']['firstTraining']
  expectedIron: GameState['earlyTraining']['iron']
  expectedLedger: ReturnType<typeof marketTradeLedger>
  expectedPractice: GameState['earlyTraining']['practice']
  expectedRecovery: GameState['earlyTraining']['recovery']
  actor: 'yan' | 'ring'
  operation: string
}
export function advanceFirstDeparture(state: GameState, p: EarlyWalkPosition, space: DepartureSpace, action: FirstDepartureAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = firstDepartureBlock(state)
  if (blocked) return fail(blocked)
  const t = state.earlyTraining, task = t.firstDeparture, scene = firstDepartureScenes[task.stage]
  if (!validFirstDeparture(task) || !fieldsMatch(action, task)
    || !earlySnapshotsMatch(state, action, ['Technique', 'Training', 'Iron', 'Ledger', 'Practice', 'Recovery']))
    return fail('出门断点或旧修炼账已变化，请按当前记录继续。')
  if (!scene) return fail('出门与石路已归档，路口会面待接续。')
  if (!departureNear(p, space, task.stage)) return fail('先由本人走到本步地点；房内与室外不能互相代签。')
  if (action.actor !== scene.actor || action.operation !== scene.operation)
    return fail('本人依次起身、看戒、跨门、关门和入石路；不授技、发物或提前会面。')
  const next = structuredClone(state)
  next.earlyTraining.firstDeparture = firstDepartureAt(task.stage + 1)
  return successfulTransaction(next, '本人出门断点已保存，旧奖励与试招结果保持。')
}
export function submitFirstDeparture(store: GameStore, p: EarlyWalkPosition, space: DepartureSpace, action: FirstDepartureAction): boolean {
  return commitEarlyResult(store, advanceFirstDeparture(store.getSnapshot().state, p, space, action), 'firstDeparture')
}
