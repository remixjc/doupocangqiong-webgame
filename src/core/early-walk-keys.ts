import type { EarlyWalkDirection } from './early-walk'
// Shared immutable lookup; each scene retains its own focus, visibility and action guards.
export const earlyWalkDirections: Readonly<Record<string, EarlyWalkDirection>> = Object.freeze({
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
})
