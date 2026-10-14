import type { GameState } from './model'
import { marketTradeLedger } from './early-market-trade'
import { fieldsMatch } from './state-guards'

const fields = { Teaching: 'teaching', ScrollReview: 'firstHallScrollReview', Teacher: 'firstHallTeacher', Evening: 'firstHallEvening', Afternoon: 'firstHallAfternoon', Approach: 'firstHallApproach', Talk: 'firstHallTalk', Reading: 'firstHallReading', Match: 'firstHallMatch', Entry: 'firstHallEntry', Meeting: 'firstRoadMeeting', Departure: 'firstDeparture',
  Technique: 'firstTechnique', Training: 'firstTraining', Iron: 'iron', Practice: 'practice',
  Recovery: 'recovery', Hall: 'hall' } as const
export const hallSnapshotKeys = ['Entry', 'Meeting', 'Departure', 'Technique', 'Training', 'Iron', 'Ledger', 'Practice', 'Recovery', 'Hall'] as const
export const hallTalkSnapshotKeys = [...hallSnapshotKeys, 'Reading', 'Match'] as const
export const hallApproachSnapshotKeys = [...hallTalkSnapshotKeys, 'Talk'] as const
export const hallAfternoonSnapshotKeys = [...hallApproachSnapshotKeys, 'Approach'] as const
export const hallEveningSnapshotKeys = [...hallAfternoonSnapshotKeys, 'Afternoon'] as const
export const hallTeacherSnapshotKeys = [...hallEveningSnapshotKeys, 'Evening'] as const
export const hallScrollReviewSnapshotKeys = [...hallTeacherSnapshotKeys, 'Teacher'] as const
export const hallGrantSnapshotKeys = [...hallScrollReviewSnapshotKeys, 'ScrollReview', 'Teaching'] as const
export function hasHallMode(action: object): boolean {
  const candidate = action as Record<string, unknown>
  return ['continuation', 'conflict', 'threat', 'exitResponse', 'checkout', 'leaving', 'aftermath'].some(key => candidate[key])
}
type SnapshotKey = keyof typeof fields | 'Ledger'
type Snapshots = { [K in keyof typeof fields as `expected${K}`]: GameState['earlyTraining'][typeof fields[K]] }
  & { expectedLedger: ReturnType<typeof marketTradeLedger> }
function value(state: GameState, key: SnapshotKey) {
  return key === 'Ledger' ? marketTradeLedger(state) : state.earlyTraining[fields[key]]
}
export function earlySnapshots<K extends SnapshotKey>(state: GameState, keys: readonly K[]): Pick<Snapshots, `expected${K}`> {
  return Object.fromEntries(keys.map(key => [`expected${key}`, { ...value(state, key) }])) as Pick<Snapshots, `expected${K}`>
}
export function earlySnapshotsMatch(state: GameState, action: object, keys: readonly SnapshotKey[]): boolean {
  const candidate = action as Record<string, object | undefined>
  return keys.every(key => !!candidate[`expected${key}`] && fieldsMatch(candidate[`expected${key}`]!, value(state, key)))
}
