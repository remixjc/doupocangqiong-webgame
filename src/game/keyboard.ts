export interface KeyIntent {
  key: string; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean
}
export type KeySurface = 'scene' | 'field' | 'control'

/** Native button activation wins over gameplay Space; other shortcuts remain available. */
export function acceptsGameplayKey(event: KeyIntent, surface: KeySurface, paused: boolean, hidden: boolean) {
  if (paused || hidden || event.ctrlKey || event.altKey || event.metaKey || surface === 'field') return false
  return !(surface === 'control' && [' ', 'Spacebar', 'Enter'].includes(event.key))
}
export function keyboardSurface(target: Pick<Element, 'closest'> | null): KeySurface {
  if (target?.closest('input,select,textarea,[contenteditable]:not([contenteditable="false"])')) return 'field'
  if (target?.closest('button,a[href],[role="button"]')) return 'control'
  return 'scene'
}
