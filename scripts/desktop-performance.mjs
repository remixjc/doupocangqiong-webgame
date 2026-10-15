/** Measurements from real browser callbacks; never advances game time. */
export function summarizeIntervals(intervals) {
  const sorted = intervals.filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b)
  if (!sorted.length) return { count: 0 }
  const durationMs = sorted.reduce((total, value) => total + value, 0)
  const percentile = fraction => sorted[Math.ceil(sorted.length * fraction) - 1]
  return { count: sorted.length, durationMs, callbacksPerSecond: sorted.length * 1000 / durationMs,
    p50Ms: percentile(.5), p95Ms: percentile(.95), p99Ms: percentile(.99), maxMs: sorted.at(-1),
    over20Ms: sorted.filter(value => value > 20).length,
    over33Ms: sorted.filter(value => value > 1000 / 30).length,
    over50Ms: sorted.filter(value => value > 50).length }
}
