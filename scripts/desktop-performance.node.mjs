import { test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { verifyRelease } from './verify-release.mjs'
import { summarizeIntervals } from './desktop-performance.mjs'
import { createPerformanceServer } from './serve-desktop-performance.mjs'
import { reviewDesktopSample } from './review-desktop-performance.mjs'
test('real interval statistics retain stalls and use nearest-rank percentiles', () => {
  const input = [10, 10, 20, 40, 100, 0, -1, NaN, Infinity]
  const copy = [...input]
  assert.deepEqual(summarizeIntervals(input), { count: 5, durationMs: 180,
    callbacksPerSecond: 5000 / 180, p50Ms: 20, p95Ms: 100, p99Ms: 100, maxMs: 100,
    over20Ms: 2, over33Ms: 2, over50Ms: 1 })
  assert.deepEqual(input, copy)
  assert.deepEqual(summarizeIntervals([]), { count: 0 })
})
test('native sample review rejects altered frame summaries, raw values and missing evidence', () => {
  const source = { format: 1, identity: { gitSha: 'a'.repeat(40) }, elapsedMs: 10000, startedAt: 100,
    started: '2026-10-15T00:00:00.000Z', ended: '2026-10-15T00:00:10.000Z', requestedSeconds: 10,
    snapshots: [{ elapsedMs: 0, canvases: 1, domNodes: 100, heap: null },
      { elapsedMs: 10000, canvases: 0, domNodes: 20, heap: null }], errors: [], longTasks: [],
    visibilityEvents: [], longTasksSupported: true,
    rawIntervalsMs: { scene: [10, 20, 80] }, intervals: { scene: summarizeIntervals([10, 20, 80]) } }
  const result = reviewDesktopSample(source)
  assert.equal(result.intervals.scene.maxMs, 80)
  for (const mutate of [
    report => { report.intervals.scene.p95Ms = 10 },
    report => { report.rawIntervalsMs.scene.push(-1) },
    report => { delete report.rawIntervalsMs },
    report => { report.snapshots[1].elapsedMs = -1 },
    report => { report.errors.push('real browser error') },
  ]) {
    const invalid = structuredClone(source); mutate(invalid)
    assert.throws(() => reviewDesktopSample(invalid))
  }
})
test('QA server serves verified production bytes and only explicit read-only QA routes', async () => {
  const server = await createPerformanceServer(resolve('dist'))
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const origin = `http://127.0.0.1:${server.address().port}`
  try {
    const identity = await fetch(origin + '/__qa/identity').then(response => response.json())
    const expected = await verifyRelease(resolve('dist'))
    const { probeFiles, ...actualRelease } = identity
    assert.deepEqual(actualRelease, expected)
    assert.equal(probeFiles.length, 3)
    assert(probeFiles.every(file => /^[a-f0-9]{64}$/.test(file.sha256) && file.bytes > 0))
    const game = await fetch(origin + '/')
    assert.equal(game.status, 200); assert.match(await game.text(), /<div id="root"/)
    const page = await fetch(origin + '/__qa/')
    assert.equal(page.headers.get('cache-control'), 'no-store')
    assert.match(await page.text(), /iframe title="待测游戏"/)
    const script = await fetch(origin + '/__qa/probe.mjs')
    assert.match(script.headers.get('content-type'), /javascript/)
    assert.match(await script.text(), /requestAnimationFrame/)
    for (const path of ['/package.json', '/.git/config', '/%2e%2e%5cpackage.json', '/%00', '/__qa/missing']) {
      assert.equal((await fetch(origin + path)).status, 404, path)
    }
    assert.equal((await fetch(origin + '/', { method: 'POST', body: 'no writes' })).status, 405)
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
})
