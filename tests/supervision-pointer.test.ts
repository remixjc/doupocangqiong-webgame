import { describe, expect, it } from 'vitest'
import { startSupervisionPointer } from '../src/ui/supervision-pointer'
import { pulseMarker } from '../src/core/events'

function environment(hidden = false) {
  const windowTarget = new EventTarget(), documentTarget = Object.assign(new EventTarget(), { hidden })
  let sequence = 0
  const callbacks = new Map<number, FrameRequestCallback>(), cancelled: number[] = []
  return { windowTarget, documentTarget, callbacks, cancelled, now: () => 100,
    requestFrame: (callback: FrameRequestCallback) => { callbacks.set(++sequence, callback); return sequence },
    cancelFrame: (id: number) => { cancelled.push(id); callbacks.delete(id) },
    tick: (now: number) => { const [id, callback] = [...callbacks][0]; callbacks.delete(id); callback(now) } }
}
describe('后山督练指针生命周期', () => {
  it('长帧夹持50ms、负delta不推进，失焦暂停且焦点回来不自动开练', () => {
    const env = environment(), markers: number[] = []; let pauses = 0
    const cleanup = startSupervisionPointer(env, marker => markers.push(marker), () => pauses++)
    env.tick(1100); expect(markers).toEqual([pulseMarker(935)])
    env.tick(1090); expect(markers).toEqual([pulseMarker(935), pulseMarker(935)])
    const late = [...env.callbacks.values()][0]
    env.windowTarget.dispatchEvent(new Event('blur'))
    expect(pauses).toBe(1); expect(env.callbacks.size).toBe(0)
    env.windowTarget.dispatchEvent(new Event('focus')); late(1200)
    expect(env.callbacks.size).toBe(0); expect(markers.length).toBe(2)
    cleanup(); env.windowTarget.dispatchEvent(new Event('blur')); expect(pauses).toBe(1)
  })
  it('hidden即停，清理与晚到帧均不产生输入，需新实例明确恢复', () => {
    const env = environment(); let markers = 0, pauses = 0
    const cleanup = startSupervisionPointer(env, () => markers++, () => pauses++)
    env.documentTarget.hidden = true
    env.documentTarget.dispatchEvent(new Event('visibilitychange'))
    expect(pauses).toBe(1); expect(env.callbacks.size).toBe(0)
    env.documentTarget.hidden = false; env.documentTarget.dispatchEvent(new Event('visibilitychange'))
    expect(env.callbacks.size).toBe(0); cleanup()
    const resumed = startSupervisionPointer(env, () => markers++, () => pauses++)
    const late = [...env.callbacks.values()][0]; env.tick(150); expect(markers).toBe(1)
    resumed(); late(200); expect(markers).toBe(1)
    env.windowTarget.dispatchEvent(new Event('blur')); expect(pauses).toBe(1)
    const hidden = environment(true)
    startSupervisionPointer(hidden, () => markers++, () => pauses++)()
    expect(hidden.callbacks.size).toBe(0); expect(pauses).toBe(2)
  })
})
