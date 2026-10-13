import { successfulTransaction } from './early-result'
import { rejectTransaction } from './early-result'
import { earlySnapshotsMatch } from './early-snapshots'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import { earlyHistoryBlock } from './early-history-block'
import { roadMeetingPositionValid } from './first-road-meeting'
import { fieldsMatch } from './state-guards'
import { marketTradeLedger } from './early-market-trade'
import { commitEarlyResult } from './early-result'
import { firstHallEntryAt, validFirstHallEntry, type FirstHallEntryState } from './first-hall-entry-state'
import { firstHallEntryScenes } from '../content/first-hall-entry'
export const hallEntryPlaces = { start: { x: 140, y: 310 }, turn: { x: 240, y: 250 }, door: { x: 340, y: 250 }, entry: { x: 140, y: 310 } }
export type HallEntrySpace = 'outside' | 'hall'
export { moveRoadMeetingWalker as moveHallEntryWalker, roadMeetingPositionValid as hallEntryPositionValid } from './first-road-meeting'
export function hallEntryNear(p: EarlyWalkPosition, space: HallEntrySpace, stage: number): boolean {
  const scene = firstHallEntryScenes[stage]
  return !!scene && scene.space === space && roadMeetingPositionValid(p) && fieldsMatch(p, hallEntryPlaces[scene.place])
}
export function firstHallEntryBlock(state: GameState): string {
  return earlyHistoryBlock(state) || (state.earlyTraining.firstRoadMeeting.stage === 12 ? '' : '先完成路口会面与双方分路归档。')
}
export type FirstHallEntryAction = FirstHallEntryState & {
  expectedMeeting: GameState['earlyTraining']['firstRoadMeeting']
  expectedDeparture: GameState['earlyTraining']['firstDeparture']
  expectedTechnique: GameState['earlyTraining']['firstTechnique']
  expectedTraining: GameState['earlyTraining']['firstTraining']
  expectedIron: GameState['earlyTraining']['iron']
  expectedLedger: ReturnType<typeof marketTradeLedger>
  expectedPractice: GameState['earlyTraining']['practice']
  expectedRecovery: GameState['earlyTraining']['recovery']
  expectedHall: GameState['earlyTraining']['hall']
  actor: 'yan' | 'bystander'
  operation: string
}
export function advanceFirstHallEntry(state: GameState, p: EarlyWalkPosition, space: HallEntrySpace, action: FirstHallEntryAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = firstHallEntryBlock(state)
  if (blocked) return fail(blocked)
  const t = state.earlyTraining, task = t.firstHallEntry, scene = firstHallEntryScenes[task.stage]
  if (!validFirstHallEntry(task) || !fieldsMatch(action, task)
    || !earlySnapshotsMatch(state, action, ['Meeting', 'Departure', 'Technique', 'Training', 'Iron', 'Ledger', 'Practice', 'Recovery', 'Hall']))
    return fail('入堂断点或旧修炼与借卷账已变化，请按当前记录继续。')
  if (!scene) return fail('实际入堂已归档，东侧取卷与阅读待接续。')
  if (!hallEntryNear(p, space, task.stage)) return fail('本人先实际走到本步门外或堂内位置。')
  if (action.actor !== 'yan' || action.operation !== scene.operation)
    return fail('按本人所见依次入堂；不代签取卷、授技或切磋胜负。')
  const next = structuredClone(state)
  next.earlyTraining.firstHallEntry = firstHallEntryAt(task.stage + 1)
  return successfulTransaction(next, '实际入堂断点已保存，旧奖励与卷轴保管保持。')
}
export function submitFirstHallEntry(store: GameStore, p: EarlyWalkPosition, space: HallEntrySpace, action: FirstHallEntryAction): boolean {
  return commitEarlyResult(store, advanceFirstHallEntry(store.getSnapshot().state, p, space, action), 'firstHallEntry')
}
