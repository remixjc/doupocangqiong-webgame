import { afterEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import AdventureScene from '../src/game/AdventureScene'
import { gameStore } from '../src/core/store'
import { initialState } from '../src/core/model'
import { stopAudio } from '../src/game/audio'

// Only the Phaser display/input facade is replaced. The actual AdventureScene
// registers and disposes its real keyboard/focus handlers and CombatWorld.
vi.mock('phaser', async () => {
  const { EventEmitter } = await import('node:events')
  return { default: { Scene: class {
    events = new EventEmitter()
    input = new EventEmitter()
    add = {
      graphics: () => ({}),
      text: () => {
        const text = { setOrigin: () => text, setDepth: () => text, setVisible: () => text }
        return text
      },
    }
  } } }
})
vi.mock('../src/game/audio', () => ({ stopAudio: vi.fn(), unlockAudio: vi.fn(), playSound: vi.fn() }))

class TrackedTarget extends EventTarget {
  handlers = new Map<string, Set<EventListenerOrEventListenerObject>>()
  override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    super.addEventListener(type, listener, options)
    if (listener) {
      const set = this.handlers.get(type) ?? new Set()
      set.add(listener); this.handlers.set(type, set)
    }
  }
  override removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
    super.removeEventListener(type, listener, options)
    if (listener) this.handlers.get(type)?.delete(listener)
  }
  count() { return [...this.handlers.values()].reduce((sum, handlers) => sum + handlers.size, 0) }
}

function prepare(failure = vi.fn()) {
  const windowTarget = new TrackedTarget()
  const documentTarget = Object.assign(new TrackedTarget(), { hidden: false })
  vi.stubGlobal('window', windowTarget)
  vi.stubGlobal('document', documentTarget)
  vi.stubGlobal('Element', class {})
  gameStore.replace(initialState())
  gameStore.paused = false
  const scene = new AdventureScene(failure)
  // Static illustration needs a renderer and is outside this listener test.
  const drawing = vi.spyOn(scene as unknown as { syncEnvironment: () => void }, 'syncEnvironment').mockImplementation(() => {})
  scene.create()
  const facade = scene as unknown as {
    events: EventEmitter; input: EventEmitter
    updateWorld: () => void; heldKeys: Set<string>; aim?: unknown; floats: unknown[]
  }
  const key = (type: string, value: string) => {
    windowTarget.dispatchEvent(Object.assign(new Event(type), {
      key: value, repeat: false, ctrlKey: false, altKey: false, metaKey: false,
    }))
  }
  return { scene, facade, windowTarget, documentTarget, drawing, failure, key }
}

afterEach(() => {
  vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks()
  gameStore.actions.length = 0; gameStore.move = { x: 0, y: 0 }; gameStore.paused = true
})

describe('actual AdventureScene input disposal (renderer facade, not browser/GPU evidence)', () => {
  it.each(['shutdown', 'destroy'])('%s removes exact handlers; later events/ticks cannot revive disposed input', event => {
    const { scene, facade, windowTarget, documentTarget, key, failure } = prepare()
    expect(windowTarget.count()).toBe(5)
    expect(documentTarget.count()).toBe(1)
    expect(facade.input.listenerCount('pointerdown')).toBe(1)
    key('keydown', 'j'); key('keydown', 'd')
    expect(gameStore.actions).toEqual(['attack'])
    expect(facade.heldKeys.has('d')).toBe(true)
    gameStore.move = { x: 1, y: -1 }; gameStore.travel('camp')
    facade.events.emit(event)
    expect(windowTarget.count()).toBe(0)
    expect(documentTarget.count()).toBe(0)
    expect(facade.input.listenerCount('pointerdown')).toBe(0)
    expect(facade.events.listenerCount('shutdown')).toBe(0)
    expect(facade.events.listenerCount('destroy')).toBe(0)
    expect(gameStore.actions).toEqual([])
    expect(gameStore.move).toEqual({ x: 0, y: 0 })
    expect(gameStore.travelTarget).toBeUndefined()
    expect(facade.heldKeys.size).toBe(0)
    expect(facade.floats).toEqual([])
    const stops = vi.mocked(stopAudio).mock.calls.length
    facade.events.emit('shutdown'); facade.events.emit('destroy')
    key('keydown', 'j')
    windowTarget.dispatchEvent(new Event('blur'))
    documentTarget.dispatchEvent(new Event('visibilitychange'))
    const tick = vi.spyOn(facade, 'updateWorld')
    scene.update(0, 16)
    expect(tick).not.toHaveBeenCalled()
    expect(gameStore.actions).toEqual([])
    expect(vi.mocked(stopAudio).mock.calls.length).toBe(stops)
    expect(failure).not.toHaveBeenCalled()
  })

  it('fatal update runs the same cleanup once, preserves the original error and blocks later work', () => {
    const { scene, facade, windowTarget, documentTarget, failure } = prepare()
    const error = new Error('deliberate renderer facade failure')
    const tick = vi.spyOn(facade, 'updateWorld').mockImplementation(() => { throw error })
    scene.update(0, 16); scene.update(16, 16)
    expect(tick).toHaveBeenCalledTimes(1)
    expect(failure).toHaveBeenCalledExactlyOnceWith(error)
    expect(windowTarget.count()).toBe(0); expect(documentTarget.count()).toBe(0)
    expect(facade.input.listenerCount('pointerdown')).toBe(0)
    expect(gameStore.paused).toBe(true)
    facade.events.emit('destroy')
    expect(failure).toHaveBeenCalledTimes(1)
  })
})
