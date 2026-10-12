import type { GameState } from './model'
import { marketTradeLedger } from './early-market-trade'
import { fieldsMatch } from './state-guards'

const fields = { Entry: 'firstHallEntry', Meeting: 'firstRoadMeeting', Departure: 'firstDeparture',
  Technique: 'firstTechnique', Training: 'firstTraining', Iron: 'iron', Practice: 'practice',
  Recovery: 'recovery', Hall: 'hall' } as const
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
