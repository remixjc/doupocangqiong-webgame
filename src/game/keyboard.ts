export interface KeyIntent {
  key: string; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean
}
export type KeySurface = 'scene' | 'field' | 'control' | 'reading'

/** Native button activation wins over gameplay Space; other shortcuts remain available. */
export function acceptsGameplayKey(event: KeyIntent, surface: KeySurface, paused: boolean, hidden: boolean) {
  if (paused || hidden || event.ctrlKey || event.altKey || event.metaKey || surface === 'field' || surface === 'reading') return false
  return !(surface === 'control' && [' ', 'Spacebar', 'Enter'].includes(event.key))
}
export function keyboardSurface(target: Pick<Element, 'closest'> | null): KeySurface {
  if (target?.closest('[data-game-input="reading"]')) return 'reading'
  if (target?.closest('input,select,textarea,[contenteditable]:not([contenteditable="false"])')) return 'field'
  if (target?.closest('button,a[href],[role="button"]')) return 'control'
  return 'scene'
}

/** Leave queued and held gameplay input behind when focus enters a native reading/input surface. */
export function bindKeyboardFocusBoundary(target: EventTarget, inspect: (event: Event) => KeySurface, release: () => void) {
  const focus = (event: Event) => {
    const surface = inspect(event)
    if (surface === 'field' || surface === 'reading') release()
  }
  target.addEventListener('focusin', focus)
  let disposed = false
  return () => {
    if (disposed) return
    disposed = true
    target.removeEventListener('focusin', focus)
  }
}

/** A released movement tap survives until one physics step; held keys still move continuously. */
export class BufferedMovement {
  private pending = new Set<string>()
  record(key: string) {
    const direction = ({ w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down',
      a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' } as Record<string, string>)[key.toLowerCase()]
    if (direction) this.pending.add(direction)
  }
  read(held: ReadonlySet<string>) {
    const active = (direction: string, letter: string, arrow: string) => this.pending.has(direction) || held.has(letter) || held.has(arrow)
    return { x: Number(active('right', 'd', 'arrowright')) - Number(active('left', 'a', 'arrowleft')),
      y: Number(active('down', 's', 'arrowdown')) - Number(active('up', 'w', 'arrowup')) }
  }
  clear() { this.pending.clear() }
}
