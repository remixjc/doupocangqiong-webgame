import { initialState, blankProgress, type Action, type Runtime, type Snapshot, type GameState } from './model'
import { canEnter, chapterReady, finishChapter, playerStats } from './rules'
import { buy, craft, upgrade } from './rules'
import type { ItemId } from './model'
import { loadSlot, saveSlot } from './save'
import { advanceEvent, type EventAction } from './events'
import { mapForChapter } from '../content/maps'

function emptyRuntime(s: GameState): Runtime {
  const stats = playerStats(s)
  const spawn = mapForChapter(s.chapter).spawn
  return { x: spawn.x, y: spawn.y, hp: stats.maxHp, maxHp: stats.maxHp, qi: stats.maxQi, maxQi: stats.maxQi, stamina: 100,
    cooldowns: { strike: 0, wave: 0, lotus: 0, dodge: 0, heal: 0, support: 0 },
    prompt: '', near: '', bossHp: 0, bossMaxHp: 0, bossName: '', dead: false }
}
class GameStore {
  private snapshot: Snapshot = { state: initialState(), runtime: emptyRuntime(initialState()), notice: '' }
  private listeners = new Set<() => void>()
  readonly actions: Action[] = []
  move = { x: 0, y: 0 }
  paused = true
  onInteract: (() => void) | null = null
  onStoryEvent: ((id: string, checkpoint?: number) => void) | null = null
  onChange: ((s: GameState) => void) | null = null
  private initialization: Promise<void> | null = null
  initialize(): Promise<void> {
    if (!this.initialization) this.initialization = (async () => {
      try {
        const saved = await loadSlot(0)
        if (saved) this.replace(saved)
      } catch (error) {
        try {
          const recovery = await loadSlot(-1)
          if (recovery) { this.replace(recovery); this.notify('自动存档异常，已恢复上一份备份。') }
          else this.notify((error as Error).message)
        } catch { this.notify((error as Error).message) }
      }
      this.onChange = state => {
        // Persistent events are infrequent; start each write immediately.
        // Frame-by-frame runtime updates never enter this path.
        void saveSlot(0, state).catch(e => this.notify(e.message))
      }
    })()
    return this.initialization
  }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  getSnapshot = () => this.snapshot
  private publish() { for (const listener of this.listeners) listener() }
  notify(text: string) { this.snapshot = { ...this.snapshot, notice: text }; this.publish() }
  replace(state: GameState) {
    this.snapshot = { state, runtime: emptyRuntime(state), notice: '' }
    this.actions.length = 0
    this.move = { x: 0, y: 0 }
    this.publish()
    this.onChange?.(state)
  }
  update(fn: (s: GameState) => void) {
    const state = structuredClone(this.snapshot.state)
    fn(state)
    this.snapshot = { ...this.snapshot, state }
    this.publish()
    this.onChange?.(state)
  }
  runtime(runtime: Runtime) { this.snapshot = { ...this.snapshot, runtime }; this.publish() }
  action(action: Action) { if (!this.paused) this.actions.push(action) }
  newGame() { this.replace(initialState()) }
  enter(id: number): boolean {
    if (!canEnter(this.snapshot.state, id)) return false
    this.update(s => { s.chapter = id; s.progress[id] ??= blankProgress(id) })
    return true
  }
  introSeen() { this.update(s => { s.progress[s.chapter].intro = true }) }
  event(action: EventAction) {
    const result = advanceEvent(this.snapshot.state, action)
    if (result.ok) {
      // Preserve combat runtime; an NPC conversation does not heal or teleport.
      this.snapshot = { ...this.snapshot, state: result.state }
      this.publish()
      this.onChange?.(result.state)
    }
    this.notify(result.message)
    return result.ok
  }
  collect() {
    this.update(s => { s.inventory.herb++; s.progress[s.chapter].herbs++ })
    this.notify('采得灵草 ×1')
  }
  kill(boss = false) {
    if (boss) {
      if (chapterReady(this.snapshot.state)) {
        this.update(s => { s.progress[s.chapter].boss = true })
        this.notify('章节挑战已完成 · 返回营地结算')
      }
    } else this.update(s => {
      s.progress[s.chapter].kills++
      s.totalKills++
      s.gold += 8 + s.chapter * 2
      s.xp += 10
      s.inventory.crystal++
    })
  }
  finish(): boolean {
    const next = finishChapter(this.snapshot.state)
    if (next === this.snapshot.state) return false
    this.replace(next)
    return true
  }
  craft(id: string, quality: number) {
    const result = craft(this.snapshot.state, id, quality)
    if (result.ok) this.replace(result.state)
    this.notify(result.message)
    return result.ok
  }
  buy(item: ItemId, quantity = 1) {
    const result = buy(this.snapshot.state, item, quantity)
    if (result.ok) this.replace(result.state)
    this.notify(result.message)
  }
  upgrade(kind: 'attack' | 'armor') {
    const result = upgrade(this.snapshot.state, kind)
    if (result.ok) this.replace(result.state)
    this.notify(result.message)
  }
}
export const gameStore = new GameStore()
