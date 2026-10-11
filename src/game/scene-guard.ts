/** One fatal failure per scene instance; future ticks cannot run a damaged world. */
export class SceneGuard {
  private stopped = false
  constructor(private suspend: () => void, private report: (error: unknown) => void) {}
  run(operation: () => void) {
    if (this.stopped) return
    try { operation() } catch (error) {
      this.stopped = true
      try { this.suspend() } catch { /* React teardown still receives the original failure. */ }
      this.report(error)
    }
  }
  dispose() { this.stopped = true }
}
