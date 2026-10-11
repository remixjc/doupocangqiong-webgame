import { pulseMarker } from '../core/events'

export interface HeatMotionClock {
  now: () => number
  hidden: () => boolean
  schedule: (tick: () => void) => unknown
  cancel: (handle: unknown) => void
  watchVisibility?: (listener: () => void) => () => void
}

// Only unsubmitted UI input lives here. Scores and rewards still use the event transaction.
export function startHeatMotion(
  update: (marker: number) => void,
  options: { speed?: number; alchemyPeriod?: number } = {},
  clock: HeatMotionClock = {
    now: () => performance.now(),
    hidden: () => document.hidden,
    schedule: tick => window.setInterval(tick, 30),
    cancel: handle => window.clearInterval(handle as number),
    watchVisibility: listener => {
      document.addEventListener('visibilitychange', listener)
      return () => document.removeEventListener('visibilitychange', listener)
    },
  },
) {
  let last = clock.now(), elapsed = 0, active = true
  const unwatch = clock.watchVisibility?.(() => { last = clock.now() })
  const timer = clock.schedule(() => {
    if (!active) return
    const now = clock.now()
    if (!clock.hidden()) {
      elapsed += Math.max(0, now - last)
      update(options.alchemyPeriod
        ? (Math.sin(elapsed / options.alchemyPeriod) + 1) / 2
        : pulseMarker(elapsed * (options.speed ?? 1)))
    }
    last = now
  })
  return () => {
    if (!active) return
    active = false
    clock.cancel(timer)
    unwatch?.()
  }
}
