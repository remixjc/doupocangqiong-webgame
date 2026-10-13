import { successfulTransaction } from './early-result'
import type { GameState } from './model'
import type { Transaction } from './rules'
import type { EarlyWalkDirection, EarlyWalkPosition } from './early-walk'
import { earlySnapshotsMatch } from './early-snapshots'
import { fieldsMatch } from './state-guards'
type HallWalk = GameState['earlyTraining']['firstHallAfternoon'] | GameState['earlyTraining']['firstHallEvening']
export function hallWalkTransaction<T extends HallWalk>(state: GameState, position: EarlyWalkPosition, space: T['location'], action: object, spec: {
  key: 'firstHallAfternoon' | 'firstHallEvening'
  block: string
  source: HallWalk['record']
  valid: (task: Record<string, unknown>) => boolean
  route: (stage: number) => readonly EarlyWalkDirection[] | undefined
  scenes: readonly { operation: string }[]
  snapshots: Parameters<typeof earlySnapshotsMatch>[2]
  derive: (stage: number, walk: number, record: HallWalk['record']) => T
  failure: string
  saved: string
}): Transaction {
  const fail = (): Transaction => ({ state, ok: false, message: spec.failure })
  if (spec.block) return fail()
  const task = state.earlyTraining[spec.key], route = spec.route(task.stage), scene = spec.scenes[task.stage], candidate = action as Record<string, unknown>
  if (!spec.valid(task as unknown as Record<string, unknown>) || (task.stage > 0 || task.walk > 0) && task.record !== spec.source
    || !fieldsMatch(action, task) || candidate.actor !== 'yan'
    || ['continuation', 'conflict', 'threat', 'exitResponse', 'checkout', 'leaving', 'aftermath'].some(key => candidate[key])
    || !earlySnapshotsMatch(state, action, spec.snapshots) || !fieldsMatch(position, { x: task.x, y: task.y }) || space !== task.location || !scene) return fail()
  const moving = route && task.walk < route.length
  if (candidate.operation !== (moving ? `move-${route[task.walk]}` : scene.operation)) return fail()
  const next = structuredClone(state)
  Object.assign(next.earlyTraining, { [spec.key]: spec.derive(moving ? task.stage : task.stage + 1, moving ? task.walk + 1 : 0,
    task.record === 'none' ? spec.source === 'recalled' ? 'recalled' : 'current' : task.record) })
  return successfulTransaction(next, spec.saved)
}
