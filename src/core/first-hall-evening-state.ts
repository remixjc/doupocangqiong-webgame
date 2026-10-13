import { boundedInteger, fieldsMatch } from './state-guards'
import type { EarlyWalkDirection } from './early-walk'
export const FIRST_HALL_EVENING_VERSION = '0.78.0'
const nightRoute: readonly EarlyWalkDirection[] = ['down', 'down', 'left', 'left', 'down', 'down']
export function eveningRoute(stage: number): readonly EarlyWalkDirection[] | undefined {
  return stage === 0 ? nightRoute : stage === 4 ? ['right', 'right'] : undefined
}
export interface FirstHallEveningState {
  stage: number
  walk: number
  location: 'mountain' | 'path' | 'courtyard' | 'room'
  x: number
  y: number
  xuner: 'following' | 'departed'
  xunerX: number
  xunerY: number
  door: 'unobserved' | 'open' | 'closed'
  tired: boolean
  scroll: 'held' | 'table'
  tea: boolean
  remark: boolean
  record: 'none' | 'current' | 'recalled'
}
export function firstHallEveningAt(stage: number, walk = 0, record: FirstHallEveningState['record'] = 'current'): FirstHallEveningState {
  let x = stage >= 1 ? 220 : 300, y = stage >= 3 ? 270 : stage >= 1 ? 310 : 150
  if (stage >= 5) x = 300
  for (const direction of eveningRoute(stage)?.slice(0, walk) ?? []) {
    x += direction === 'right' ? 40 : direction === 'left' ? -40 : 0
    y += direction === 'down' ? 40 : direction === 'up' ? -40 : 0
  }
  return { stage, walk, location: stage >= 3 ? 'room' : stage >= 1 || walk === 6 ? 'courtyard' : walk ? 'path' : 'mountain',
    x, y, xuner: stage >= 2 ? 'departed' : 'following', xunerX: stage >= 2 ? 245 : x + 25, xunerY: stage >= 2 ? 280 : y - 30,
    door: stage >= 4 ? 'closed' : stage >= 1 ? 'open' : 'unobserved', tired: stage >= 5,
    scroll: stage >= 6 ? 'table' : 'held', tea: stage >= 7, remark: stage >= 8, record: stage || walk ? record : 'none' }
}
export function validFirstHallEvening(t: Record<string, unknown> | FirstHallEveningState): t is FirstHallEveningState {
  return boundedInteger(t.stage, 9) && boundedInteger(t.walk, eveningRoute(t.stage)?.length ?? 0)
    && (t.stage || t.walk ? t.record === 'current' || t.record === 'recalled' : t.record === 'none')
    && fieldsMatch(t, firstHallEveningAt(t.stage, t.walk, t.record as FirstHallEveningState['record']))
}
