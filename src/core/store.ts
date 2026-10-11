import { initialState, blankProgress, type Action, type Runtime, type Snapshot, type GameState } from './model'
import { canEnter, registerBossVictory, rankPracticeReward, trainFireEnergy, finishChapter, playerStats } from './rules'
import { buy, craft, upgrade } from './rules'
import type { ItemId } from './model'
import { AutoSaveSession } from './save-session'
import { advanceEvent, type EventAction } from './events'
import { mapForChapter } from '../content/maps'
import { AutoSaveQueue } from './autosave'

function emptyRuntime(s: GameState): Runtime {
  const stats = playerStats(s)
  const spawn = mapForChapter(s.chapter).spawn
  return { difficulty: s.settings.difficulty, x: spawn.x, y: spawn.y, hp: stats.maxHp, maxHp: stats.maxHp, qi: stats.maxQi, maxQi: stats.maxQi, stamina: 100,
    cooldowns: { strike: 0, wave: 0, lotus: 0, dodge: 0, heal: 0, support: 0 },
    prompt: '', near: '', bossHp: 0, bossMaxHp: 0, bossName: '', dead: false }
}
export class GameStore {
  private snapshot: Snapshot = { state: initialState(), runtime: emptyRuntime(initialState()), notice: '', autosave: { phase: 'idle', pending: 0 } }
  private listeners = new Set<() => void>()
  readonly actions: Action[] = []
  move = { x: 0, y: 0 }
  paused = true
  onInteract: (() => void) | null = null
  onStoryEvent: ((id: string, checkpoint?: number) => void) | null = null
  onChange: ((s: GameState) => void) | null = null
  private initialization: Promise<void> | null = null
  private saves: AutoSaveQueue
  constructor(private persistence: { load: (slot: number) => Promise<GameState | null>; write: (state: GameState) => Promise<void> } = new AutoSaveSession()) {
    this.saves = new AutoSaveQueue(state => persistence.write(state), autosave => { this.snapshot = { ...this.snapshot, autosave }; this.publish() })
  }
  initialize(): Promise<void> {
    if (!this.initialization) this.initialization = (async () => {
      try {
        const saved = await this.persistence.load(0)
        if (saved) { this.replace(saved); this.saves.loaded() }
      } catch (error) {
        try {
          const recovery = await this.persistence.load(-1)
          if (recovery) { this.replace(recovery); this.saves.loaded(); this.notify('自动存档异常，已恢复上一份备份。') }
          else this.notify((error as Error).message)
        } catch { this.notify((error as Error).message) }
      }
      this.onChange = state => {
        // Runtime-only frames never enter the ordered persistent write queue.
        this.saves.enqueue(state)
      }
    })()
    return this.initialization
  }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  getSnapshot = () => this.snapshot
  waitForAutosave = () => this.saves.flush()
  retryAutosave = () => this.saves.retry()
  async loadSavedSlot(slot: number): Promise<boolean> {
    await this.saves.flush()
    const state = await this.persistence.load(slot)
    if (!state) return false
    this.replace(state)
    return true
  }
  private publish() { for (const listener of this.listeners) listener() }
  notify(text: string) { this.snapshot = { ...this.snapshot, notice: text }; this.publish() }
  replace(state: GameState) {
    this.snapshot = { ...this.snapshot, state, runtime: emptyRuntime(state), notice: '' }
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
      const next = registerBossVictory(this.snapshot.state)
      if (next !== this.snapshot.state) {
        this.update(s => { Object.assign(s, next) })
        this.notify(`章节挑战已完成${next.chapter === 14 ? ' · 首胜火能+3' : ''} · 返回营地结算`)
      }
    } else this.update(s => {
      s.progress[s.chapter].kills++
      s.totalKills++
      s.gold += 8 + s.chapter * 2
      s.xp += 10
      s.inventory.crystal++
    })
  }
  rankPractice() {
    const result = rankPracticeReward(this.snapshot.state)
    if (result.ok) this.update(s => { Object.assign(s, result.state) })
    this.notify(result.message)
  }
  fireTraining() {
    const result = trainFireEnergy(this.snapshot.state)
    if (result.ok) this.update(s => { Object.assign(s, result.state) })
    this.notify(result.message)
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
