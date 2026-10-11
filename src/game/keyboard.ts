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
