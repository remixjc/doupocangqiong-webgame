import { boundedInteger, fieldsMatch } from './state-guards'
import type { EarlyWalkDirection } from './early-walk'
export const FIRST_HALL_AFTERNOON_VERSION = '0.77.0'
export const afternoonRoutes: readonly (readonly EarlyWalkDirection[])[] = [
  ['right', 'right', 'up', 'up', 'right', 'right'],
  ['up', 'up', 'left', 'left', 'up', 'up'],
  ['right', 'right', 'down', 'down', 'right', 'right'],
]
export interface FirstHallAfternoonState {
  stage: number
  walk: number
  location: 'outside' | 'mountain'
  period: 'early' | 'middle' | 'late' | 'twilight' | 'dark'
  legs: number
  reviewed: boolean
  record: 'none' | 'current' | 'recalled'
  x: number
  y: number
  xunerX: number
  xunerY: number
}
export function afternoonRoute(stage: number) {
  return stage === 0 || stage === 2 || stage === 4 ? afternoonRoutes[stage / 2] : undefined
}
export function firstHallAfternoonAt(stage: number, walk = 0, record: FirstHallAfternoonState['record'] = 'current'): FirstHallAfternoonState {
  let x = 60, y = 310
  const legs = Math.min(3, Math.floor((stage + 1) / 2))
  const steps = afternoonRoutes.slice(0, legs).flat().concat(afternoonRoute(stage)?.slice(0, walk) ?? [])
  for (const direction of steps) {
    x += direction === 'right' ? 40 : direction === 'left' ? -40 : 0
    y += direction === 'down' ? 40 : direction === 'up' ? -40 : 0
  }
  return { stage, walk, location: stage || walk ? 'mountain' : 'outside',
    period: stage >= 8 ? 'dark' : stage >= 6 ? 'twilight' : stage >= 4 ? 'late' : stage >= 2 ? 'middle' : 'early',
    legs, reviewed: stage >= 9, record: stage || walk ? record : 'none', x, y, xunerX: x + 25, xunerY: y - 30 }
}
export function validFirstHallAfternoon(task: Record<string, unknown> | FirstHallAfternoonState): task is FirstHallAfternoonState {
  return boundedInteger(task.stage, 10) && boundedInteger(task.walk, afternoonRoute(task.stage) ? 6 : 0)
    && (task.stage || task.walk ? task.record === 'current' || task.record === 'recalled' : task.record === 'none')
    && fieldsMatch(task, firstHallAfternoonAt(task.stage, task.walk, task.record as FirstHallAfternoonState['record']))
}
