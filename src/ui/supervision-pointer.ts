import { pulseMarker } from '../core/events'
import { bindFocusLifecycle } from '../game/focus'

export interface SupervisionPointerEnvironment {
  windowTarget: EventTarget
  documentTarget: EventTarget & { readonly hidden: boolean }
  now: () => number
  requestFrame: (callback: FrameRequestCallback) => number
  cancelFrame: (id: number) => void
}
/** Stop on blur/background. Resuming requires a new explicit UI action. */
export function startSupervisionPointer(env: SupervisionPointerEnvironment, onMarker: (marker: number) => void, onPause: () => void) {
  let active = true, previous = env.now(), elapsed = 0, frame = 0
  const release = () => {
    if (!active) return
    active = false; env.cancelFrame(frame); onPause()
  }
  const unbind = bindFocusLifecycle(env.windowTarget, env.documentTarget, release, () => {})
  const tick = (now: number) => {
    if (!active) return
    if (env.documentTarget.hidden) { release(); return }
    elapsed += Math.max(0, Math.min(50, now - previous)); previous = now
    onMarker(pulseMarker(900 + elapsed * .7))
    frame = env.requestFrame(tick)
  }
  if (env.documentTarget.hidden) release()
  else frame = env.requestFrame(tick)
  return () => { active = false; env.cancelFrame(frame); unbind() }
}
