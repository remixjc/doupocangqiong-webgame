import type { EarlyWalkDirection, EarlyWalkPosition } from './early-walk'

// Callers retain their original invalid-position reset and scene-specific bounds.
export function stepWalker(position: EarlyWalkPosition, direction: EarlyWalkDirection, valid: (next: EarlyWalkPosition) => boolean): EarlyWalkPosition {
  const delta = { up: [0, -20], down: [0, 20], left: [-20, 0], right: [20, 0] }[direction]
  if (!delta) return position
  const next = { x: position.x + delta[0], y: position.y + delta[1] }
  return valid(next) ? next : position
}

export function nearWalkPoint(position: EarlyWalkPosition, target: EarlyWalkPosition, radius: number): boolean {
  return Math.hypot(position.x - target.x, position.y - target.y) <= radius
}

export function walkPointOverlaps(position: EarlyWalkPosition, rect: { x: number; y: number; width: number; height: number }, radius: number): boolean {
  return position.x > rect.x - radius && position.x < rect.x + rect.width + radius
    && position.y > rect.y - radius && position.y < rect.y + rect.height + radius
}
