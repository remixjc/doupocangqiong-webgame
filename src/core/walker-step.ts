import type { EarlyWalkDirection, EarlyWalkPosition } from './early-walk'

// Callers retain their original invalid-position reset and scene-specific bounds.
export function stepWalker(position: EarlyWalkPosition, direction: EarlyWalkDirection, valid: (next: EarlyWalkPosition) => boolean): EarlyWalkPosition {
  const delta = { up: [0, -20], down: [0, 20], left: [-20, 0], right: [20, 0] }[direction]
  if (!delta) return position
  const next = { x: position.x + delta[0], y: position.y + delta[1] }
  return valid(next) ? next : position
}
