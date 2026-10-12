import type { KeyboardEvent } from 'react'
import type { EarlyWalkDirection } from '../core/early-walk'
import { earlyWalkDirections } from '../core/early-walk-keys'

// Scene-specific hidden/actor/position/training guards remain with their callbacks.
export function walkKey(event: KeyboardEvent<SVGSVGElement>, move: (direction: EarlyWalkDirection) => void, interact?: () => void) {
  if (event.ctrlKey || event.altKey || event.metaKey) return
  const value = event.key.length === 1 ? event.key.toLowerCase() : event.key
  const direction = earlyWalkDirections[value]
  if (direction) { event.preventDefault(); move(direction) }
  else if (value === 'e' && interact) { event.preventDefault(); interact() }
}
