import type { GameState } from './model'
import type { GameStore } from './store'
import type { Transaction } from './rules'
import type { EarlyWalkPosition } from './early-walk'
import type { FirstHallEntryAction } from './first-hall-entry'
import { firstHallEntryBlock, hallEntryPlaces, hallEntryPositionValid } from './first-hall-entry'
import type { FirstHallEntryState } from './first-hall-entry-state'
import { fieldsMatch } from './state-guards'
import { earlySnapshotsMatch } from './early-snapshots'
import { firstHallReadingAt, validFirstHallReading, type FirstHallReadingState } from './first-hall-reading-state'
import { firstHallReadingScenes } from '../content/first-hall-reading'
export const hallReadingPlaces = { start: hallEntryPlaces.entry, shelf: { x: 400, y: 250 } }
export function firstHallReadingBlock(state: GameState): string {
  return firstHallEntryBlock(state) || (state.earlyTraining.firstHallEntry.stage === 9 ? '' : '先完成本人实际入堂与东西分区归档。')
}
export type FirstHallReadingAction = FirstHallReadingState & Omit<FirstHallEntryAction, keyof FirstHallEntryState> & {
  expectedEntry: FirstHallEntryState
}
export function hallReadingNear(p: EarlyWalkPosition, space: 'hall' | 'outside'): boolean {
  return space === 'hall' && hallEntryPositionValid(p) && fieldsMatch(p, hallReadingPlaces.shelf)
}
export function hallReadingSnapshotMatches(state: GameState, action: Omit<FirstHallReadingAction, 'actor'>): boolean {
  return earlySnapshotsMatch(state, action, ['Entry', 'Meeting', 'Departure', 'Technique', 'Training', 'Iron', 'Ledger', 'Practice', 'Recovery', 'Hall'])
}
export function advanceFirstHallReading(state: GameState, p: EarlyWalkPosition, space: 'hall' | 'outside', action: FirstHallReadingAction): Transaction {
  const fail = (message: string): Transaction => ({ state, ok: false, message })
  const blocked = firstHallReadingBlock(state)
  if (blocked) return fail(blocked)
  const t = state.earlyTraining, task = t.firstHallReading, scene = firstHallReadingScenes[task.stage]
  if (!validFirstHallReading(task) || !fieldsMatch(action, task)
    || !hallReadingSnapshotMatches(state, action))
    return fail('阅读断点或旧材料、修炼与卷轴账已变化，请按当前记录继续。')
  if (!scene) return fail('东侧第一卷阅读已归档，西侧比赛与交涉待接续。')
  if (!hallReadingNear(p, space)) return fail('本人先实际走到堂内东侧书架前。')
  if (action.actor !== 'yan' || action.operation !== scene.operation)
    return fail('由本人依次取同一卷并阅读，不代签授技、第二卷或本人胜利。')
  const next = structuredClone(state)
  const record = task.stage === 1 ? (t.hall.stage >= 6 ? 'recalled' : 'current') : task.record
  next.earlyTraining.firstHallReading = firstHallReadingAt(task.stage + 1, record)
  if (task.stage === 1 && t.hall.stage < 2) next.earlyTraining.hall = { stage: 2, scroll: 'reading-first' }
  return { state: next, ok: true, message: '东侧阅读断点已保存，同一卷保管单调衔接。' }
}
export function submitFirstHallReading(store: GameStore, p: EarlyWalkPosition, space: 'hall' | 'outside', action: FirstHallReadingAction): boolean {
  const result = advanceFirstHallReading(store.getSnapshot().state, p, space, action)
  if (result.ok) store.update(state => {
    state.earlyTraining.firstHallReading = result.state.earlyTraining.firstHallReading
    state.earlyTraining.hall = result.state.earlyTraining.hall
  })
  store.notify(result.message)
  return result.ok
}
