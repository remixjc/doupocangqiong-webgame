export class FixedClock {
  private accumulator = 0
  reset() { this.accumulator = 0 }
  advance(frameMs: number, tick: () => void) {
    this.accumulator += Math.max(0, Math.min(frameMs, 100)) / 1000
    while (this.accumulator + 1e-9 >= 1 / 60) {
      tick()
      this.accumulator = Math.max(0, this.accumulator - 1 / 60)
    }
  }
}
