import { initialState, blankProgress, type Action, type Runtime, type Snapshot, type GameState } from './model'
import { canEnter, chapterReady, finishChapter, playerStats } from './rules'

function emptyRuntime(s: GameState): Runtime {
  const stats = playerStats(s)
  return { hp: stats.maxHp, maxHp: stats.maxHp, qi: stats.maxQi, maxQi: stats.maxQi, stamina: 100,
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
  onChange: ((s: GameState) => void) | null = null
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
    this.update(s => { s.chapter = id; s.progress[id] ??= blankProgress() })
    return true
  }
  introSeen() { this.update(s => { s.progress[s.chapter].intro = true }) }
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
}
export const gameStore = new GameStore()
