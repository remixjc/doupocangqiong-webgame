import { pulseMarker } from '../core/events'

export interface HeatMotionClock {
  now: () => number
  hidden: () => boolean
  schedule: (tick: () => void) => unknown
  cancel: (handle: unknown) => void
  watchVisibility?: (listener: () => void) => () => void
  watchBlur?: (listener: () => void) => () => void
}

export interface HeatMotionControl {
  pause: () => void
  resume: () => boolean
  isPaused: () => boolean
  stop: () => void
}

// Only unsubmitted UI input lives here. Scores and rewards still use the event transaction.
export function startHeatMotion(
  update: (marker: number) => void,
  options: { speed?: number; alchemyPeriod?: number; onPause?: () => void } = {},
  clock: HeatMotionClock = {
    now: () => performance.now(),
    hidden: () => document.hidden,
    schedule: tick => window.setInterval(tick, 30),
    cancel: handle => window.clearInterval(handle as number),
    watchVisibility: listener => {
      document.addEventListener('visibilitychange', listener)
      return () => document.removeEventListener('visibilitychange', listener)
    },
    watchBlur: listener => {
      window.addEventListener('blur', listener)
      return () => window.removeEventListener('blur', listener)
    },
  },
): HeatMotionControl {
  let last = clock.now(), elapsed = 0, active = true, paused = false
  let timer: unknown, generation = 0
  const cancelTimer = () => {
    generation++
    if (timer !== undefined) { clock.cancel(timer); timer = undefined }
  }
  const pause = () => {
    if (!active || paused) return
    paused = true; cancelTimer(); options.onPause?.()
  }
  const tick = () => {
    if (!active || paused) return
    if (clock.hidden()) { pause(); return }
    const now = clock.now()
    elapsed += Math.max(0, now - last)
    update(options.alchemyPeriod
      ? (Math.sin(elapsed / options.alchemyPeriod) + 1) / 2
      : pulseMarker(elapsed * (options.speed ?? 1)))
    last = now
  }
  const startTimer = () => {
    const current = ++generation
    timer = clock.schedule(() => { if (current === generation) tick() })
  }
  const unwatch = clock.watchVisibility?.(() => { if (clock.hidden()) pause() })
  const unblur = clock.watchBlur?.(pause)
  if (clock.hidden()) pause()
  else startTimer()
  return {
    pause,
    resume: () => {
      if (!active || !paused || clock.hidden()) return false
      paused = false; last = clock.now(); startTimer()
      return true
    },
    isPaused: () => paused,
    stop: () => {
      if (!active) return
      active = false; cancelTimer(); unwatch?.(); unblur?.()
    },
  }
}
