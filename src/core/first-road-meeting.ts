import { submitEarlyTransaction } from './early-result'
import { successfulTransaction } from './early-result'
import { rejectTransaction } from './early-result'
import { earlySnapshotsMatch } from './early-snapshots'
import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition, EarlyWalkDirection } from './early-walk'
import { earlyHistoryBlock } from './early-history-block'
import { cityPositionValid, moveCityWalker } from './early-city-pharmacy'
import { marketTradeLedger } from './early-market-trade'
import { fieldsMatch } from './state-guards'
import { firstRoadMeetingAt, validFirstRoadMeeting, type FirstRoadMeetingState } from './first-road-meeting-state'
import { firstRoadMeetingScenes } from '../content/first-road-meeting'
export const roadMeetingPlaces = { start: { x: 140, y: 310 }, turn: { x: 240, y: 250 }, pass: { x: 340, y: 250 }, end: { x: 440, y: 250 } }
export function roadMeetingPositionValid(p: EarlyWalkPosition): boolean {
  return cityPositionValid(p) && p.x >= 100 && p.x <= 480 && p.y >= 230 && p.y <= 310
}
export function moveRoadMeetingWalker(p: EarlyWalkPosition, direction: EarlyWalkDirection): EarlyWalkPosition {
  if (!roadMeetingPositionValid(p)) return p
  const next = moveCityWalker(p, direction)
  return roadMeetingPositionValid(next) ? next : p
}
export function roadMeetingNear(p: EarlyWalkPosition, stage: number): boolean {
  const scene = firstRoadMeetingScenes[stage]
  return !!scene && roadMeetingPositionValid(p) && fieldsMatch(p, roadMeetingPlaces[scene.place])
}
export function firstRoadMeetingBlock(state: GameState): string {
  return earlyHistoryBlock(state) || (state.earlyTraining.firstDeparture.stage === 9 ? '' : '先完成本人出门与石路归档。')
}
export type FirstRoadMeetingAction = FirstRoadMeetingState & {
  expectedDeparture: GameState['earlyTraining']['firstDeparture']
  expectedTechnique: GameState['earlyTraining']['firstTechnique']
  expectedTraining: GameState['earlyTraining']['firstTraining']
  expectedIron: GameState['earlyTraining']['iron']
  expectedLedger: ReturnType<typeof marketTradeLedger>
  expectedPractice: GameState['earlyTraining']['practice']
  expectedRecovery: GameState['earlyTraining']['recovery']
  expectedHall: GameState['earlyTraining']['hall']
  actor: 'yan' | 'mei'
  operation: string
}
export function advanceFirstRoadMeeting(state: GameState, p: EarlyWalkPosition, action: FirstRoadMeetingAction): Transaction {
  const fail = rejectTransaction(state)
  const blocked = firstRoadMeetingBlock(state)
  if (blocked) return fail(blocked)
  const t = state.earlyTraining, task = t.firstRoadMeeting, scene = firstRoadMeetingScenes[task.stage]
  if (!validFirstRoadMeeting(task) || !fieldsMatch(action, task)
    || !earlySnapshotsMatch(state, action, ['Departure', 'Technique', 'Training', 'Iron', 'Ledger', 'Practice', 'Recovery', 'Hall']))
    return fail('路口断点或旧修炼与借卷账已变化，请按当前记录继续。')
  if (!scene) return fail('路口会面已归档，实际入堂待接续。')
  if (!roadMeetingNear(p, task.stage)) return fail('本人先实际走到本步路口或离开位置。')
  if (action.actor !== scene.actor || action.operation !== scene.operation)
    return fail('按当前人物依次记录路口对话；不代签入堂、战斗或关系奖励。')
  const next = structuredClone(state)
  next.earlyTraining.firstRoadMeeting = firstRoadMeetingAt(task.stage + 1)
  return successfulTransaction(next, '路口会面断点已保存，旧奖励与借卷账保持。')
}
export function submitFirstRoadMeeting(store: GameStore, p: EarlyWalkPosition, action: FirstRoadMeetingAction): boolean {
  return submitEarlyTransaction(store, advanceFirstRoadMeeting, [p, action], 'firstRoadMeeting')
}
