import type { GameState } from './model'

export interface AutoSaveStatus {
  phase: 'idle' | 'loaded' | 'saving' | 'saved' | 'error'
  pending: number
  savedAt?: number
  error?: string
}

export class AutoSaveQueue {
  private tail = Promise.resolve()
  private pending = 0
  private latest?: GameState
  private savedAt?: number
  private error?: string
  constructor(private write: (state: GameState) => Promise<void>, private publish: (status: AutoSaveStatus) => void) {}

  loaded() { this.publish({ phase: 'loaded', pending: 0 }) }

  enqueue(state: GameState) {
    // Preserve the state at this event even if callers subsequently mutate their state.
    const snapshot = structuredClone(state)
    this.latest = snapshot
    this.pending++
    this.publish({ phase: 'saving', pending: this.pending, savedAt: this.savedAt })
    this.tail = this.tail.then(() => this.write(snapshot)).then(() => {
      this.pending--; this.error = undefined; this.savedAt = Date.now()
      this.publish({ phase: this.pending ? 'saving' : 'saved', pending: this.pending, savedAt: this.savedAt })
    }, failure => {
      this.pending--; this.error = failure instanceof Error ? failure.message : String(failure)
      this.publish({ phase: this.pending ? 'saving' : 'error', pending: this.pending, savedAt: this.savedAt, error: this.error })
    })
  }

  retry() {
    if (this.pending || !this.error || !this.latest) return
    this.enqueue(this.latest)
  }

  async flush(): Promise<boolean> {
    while (this.pending) await this.tail
    return !this.error
  }
}
