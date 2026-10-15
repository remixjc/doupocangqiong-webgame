import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { summarizeIntervals } from './desktop-performance.mjs'

/** Validate a completed native QA export, recomputing every frame statistic. */
export function reviewDesktopSample(report) {
  assert.equal(report.format, 1)
  assert.match(report.identity.gitSha, /^[a-f0-9]{40}$/)
  assert(Number.isFinite(report.elapsedMs) && report.elapsedMs > 0)
  assert(Number.isFinite(report.startedAt) && report.startedAt >= 0)
  assert(Number.isFinite(Date.parse(report.started)) && Number.isFinite(Date.parse(report.ended)))
  assert(Math.abs(Date.parse(report.ended) - Date.parse(report.started) - report.elapsedMs) < 1000)
  assert(report.requestedSeconds >= 10 && report.requestedSeconds <= 600)
  assert(report.elapsedMs <= 660000, 'outside supported measurement window')
  assert(Array.isArray(report.snapshots) && report.snapshots.length >= 2)
  assert.deepEqual(report.errors, [], 'recorded browser error requires investigation')
  let prior = -1
  for (const row of report.snapshots) {
    assert(Number.isFinite(row.elapsedMs) && row.elapsedMs >= prior && row.elapsedMs <= report.elapsedMs + 10)
    assert(Number.isSafeInteger(row.canvases) && row.canvases >= 0)
    assert(Number.isSafeInteger(row.domNodes) && row.domNodes > 0)
    if (row.heap) assert(row.heap.used >= 0 && row.heap.total >= row.heap.used)
    prior = row.elapsedMs
  }
  assert(report.rawIntervalsMs && Object.keys(report.rawIntervalsMs).length > 0, 'raw intervals required')
  assert.deepEqual(Object.keys(report.rawIntervalsMs).sort(), Object.keys(report.intervals).sort())
  for (const [phase, intervals] of Object.entries(report.rawIntervalsMs)) {
    assert(['scene', 'unfocused-scene', 'menu', 'no-scene'].includes(phase))
    assert(Array.isArray(intervals) && intervals.length <= 200000)
    assert(intervals.every(value => Number.isFinite(value) && value > 0))
    assert.deepEqual(summarizeIntervals(intervals), report.intervals[phase], `changed summary: ${phase}`)
  }
  const heaps = report.snapshots.flatMap(row => row.heap ? [row.heap.used] : [])
  const tasks = report.longTasks
  assert(Array.isArray(tasks) && tasks.every(task => Number.isFinite(task.startTime) && task.duration >= 50))
  return { identity: report.identity, elapsedMs: report.elapsedMs, snapshots: report.snapshots.length,
    intervals: report.intervals, longTasks: { supported: report.longTasksSupported, count: tasks.length,
      totalMs: tasks.reduce((total, task) => total + task.duration, 0),
      maxMs: tasks.reduce((max, task) => Math.max(max, task.duration), 0) },
    canvases: { min: Math.min(...report.snapshots.map(row => row.canvases)),
      max: Math.max(...report.snapshots.map(row => row.canvases)) },
    heap: heaps.length ? { firstBytes: heaps[0], lastBytes: heaps.at(-1), minBytes: Math.min(...heaps), maxBytes: Math.max(...heaps),
      interpretation: 'coarse/shared browser heap; does not establish retained heap or absence of leaks' } : null,
    visibilityEvents: report.visibilityEvents.length, errors: report.errors,
    interpretation: 'Real rAF callback intervals; not GPU presentation FPS, combat benchmark or device certification.' }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/review-desktop-performance.mjs NATIVE_EXPORT.json')
  const report = JSON.parse(await readFile(process.argv[2], 'utf8'))
  console.log(JSON.stringify(reviewDesktopSample(report), null, 2))
}
