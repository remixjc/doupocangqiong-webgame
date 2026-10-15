import { test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { runInNewContext } from 'node:vm'
import { verifyRelease } from './verify-release.mjs'
import { summarizeIntervals, longTaskWithinSample } from './desktop-performance.mjs'
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
    report => { report.longTasks.push({ startTime: 100, duration: Infinity }) },
    report => { report.longTasks.push({ startTime: -1, duration: 60 }) },
    report => { report.longTasksSupported = false; report.longTasks.push({ startTime: 100, duration: 60 }) },
  ]) {
    const invalid = structuredClone(source); mutate(invalid)
    assert.throws(() => reviewDesktopSample(invalid))
  }
})
test('iframe Long Tasks align distinct time origins and retain only window overlap', () => {
  const clock = { parentTimeOrigin: 100000, iframeTimeOrigin: 102000 }
  const raw = { startTime: 900, duration: 160, name: 'self', attribution: [] }
  assert.deepEqual(longTaskWithinSample(raw, clock, 3000, 1000),
    { ...raw, elapsedStartMs: -100, overlapMs: 60 })
  assert.deepEqual(longTaskWithinSample({ ...raw, startTime: 1950 }, clock, 3000, 1000),
    { ...raw, startTime: 1950, elapsedStartMs: 950, overlapMs: 50 })
  for (const startTime of [800, 2000])
    assert.equal(longTaskWithinSample({ ...raw, startTime }, clock, 3000, 1000), null)
})
test('format 2 review recomputes task attribution timing; legacy native samples remain readable', async () => {
  const legacy = JSON.parse(await readFile(resolve('docs/qa/c11-desktop-performance-0933-steady.json'), 'utf8'))
  const legacyCopy = structuredClone(legacy)
  assert.equal(reviewDesktopSample(legacy).snapshots, 182)
  assert.deepEqual(legacy, legacyCopy, 'review is read-only')
  const report = structuredClone(legacy)
  report.format = 2
  report.clock = { parentTimeOrigin: 100000, iframeTimeOrigin: 102000 }
  const attribution = [{ name: 'unknown', containerType: 'iframe', containerSrc: '/',
    containerId: '', containerName: '' }]
  report.longTasks = [longTaskWithinSample({ startTime: report.startedAt - 2050,
    duration: 150, name: 'self', attribution }, report.clock, report.startedAt, report.elapsedMs)]
  const reviewed = reviewDesktopSample(report)
  assert.equal(reviewed.longTasks.withinWindowMs, 100)
  assert.deepEqual(reviewed.longTasks.browsingContexts, { self: 1 })
  for (const mutate of [
    row => { row.clock.iframeTimeOrigin += 10 },
    row => { row.longTasks[0].elapsedStartMs += 10 },
    row => { row.longTasks[0].overlapMs += 10 },
    row => { row.longTasks[0].startTime += row.elapsedMs + 1000 },
    row => { row.longTasks[0].attribution[0].containerSrc = null },
  ]) {
    const invalid = structuredClone(report); mutate(invalid)
    assert.throws(() => reviewDesktopSample(invalid))
  }
})
test('actual QA stop drains pending Long Tasks before disconnect, excludes outside entries and resets next run', async () => {
  const source = await readFile(resolve('qa/desktop-performance.mjs'), 'utf8')
  const buttons = new Map()
  const element = id => {
    if (!buttons.has(id)) buttons.set(id, { value: id === 'seconds' ? '10' : '', textContent: '' })
    return buttons.get(id)
  }
  const order = [], observers = []
  let now = 10000
  class Observer {
    static supportedEntryTypes = ['longtask']
    pending = []
    constructor(callback) { this.callback = callback; observers.push(this) }
    observe() {}
    takeRecords() { order.push('takeRecords'); const rows = this.pending; this.pending = []; return rows }
    disconnect() { order.push('disconnect'); this.pending = [] }
  }
  const doc = { hidden: false, hasFocus: () => true, querySelector: selector => selector === 'canvas' ? {} : null,
    querySelectorAll: () => [{}], getElementsByTagName: () => Array(100), addEventListener() {} }
  const iframe = { contentDocument: doc, clientWidth: 1280, clientHeight: 820, addEventListener() {},
    contentWindow: { performance: { timeOrigin: 100500 }, PerformanceObserver: Observer,
      requestAnimationFrame: () => 1, cancelAnimationFrame() {} } }
  const sandbox = { summarizeIntervals, longTaskWithinSample, Map, Date, navigator: {},
    performance: { timeOrigin: 100000, now: () => now }, devicePixelRatio: 1, screen: {},
    document: { hidden: false, getElementById: element, querySelector: () => iframe, addEventListener() {} },
    window: { addEventListener() {} }, fetch: async () => ({ json: async () => ({ gitSha: 'a'.repeat(40) }) }),
    setTimeout: () => 1, setInterval: () => 1, clearTimeout() {}, clearInterval() {} }
  await runInNewContext(`(async () => { ${source.replace(/^import .*\n/, '')} })()`, sandbox)
  element('start').onclick()
  const entry = { startTime: 9510, duration: 70, name: 'self', attribution: [{
    name: 'unknown', containerType: 'window', containerSrc: '', containerId: '', containerName: '',
  }] }
  observers[0].pending.push({ ...entry, startTime: 0 }, entry)
  now += 50
  element('stop').onclick()
  const result = JSON.parse(element('result').textContent)
  assert.deepEqual(order, ['takeRecords', 'disconnect'])
  assert.equal(result.format, 2)
  assert.equal(result.longTasks.length, 1, 'pending task must survive stop; unrelated earlier task must not')
  assert.equal(result.longTasks[0].elapsedStartMs, 10)
  assert.equal(result.longTasks[0].overlapMs, 40)
  assert.equal(result.longTasks[0].attribution[0].containerType, 'window')
  element('stop').onclick()
  assert.deepEqual(order, ['takeRecords', 'disconnect'], 'stop is idempotent')
  now += 100
  element('start').onclick()
  now += 50
  element('stop').onclick()
  assert.deepEqual(JSON.parse(element('result').textContent).longTasks, [])
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
test('QA identity pins every served production byte across a concurrent rebuild', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'btth-desktop-snapshot-'))
  let server
  try {
    await cp(resolve('dist'), directory, { recursive: true })
    const before = await readFile(resolve(directory, 'index.html'))
    const manifestBytes = await readFile(resolve(directory, 'release-manifest.json'))
    const manifest = JSON.parse(manifestBytes)
    const js = manifest.files.find(row => row.file.endsWith('.js')).file
    const jsBefore = await readFile(resolve(directory, js))
    server = await createPerformanceServer(directory)
    server.listen(0, '127.0.0.1'); await once(server, 'listening')
    const origin = `http://127.0.0.1:${server.address().port}`
    // A successful startup is not enough: requests after these changes used to
    // serve new/corrupt bytes under the old verified SHA, and expose new files.
    await writeFile(resolve(directory, 'index.html'), 'later build')
    await writeFile(resolve(directory, js), 'later javascript')
    await writeFile(resolve(directory, 'release-manifest.json'), '{}')
    await writeFile(resolve(directory, 'unlisted.txt'), 'not verified')
    for (const [path, expected] of [
      ['/', before], ['/index.html', before], ['/' + js, jsBefore], ['/release-manifest.json', manifestBytes],
    ]) {
      const response = await fetch(origin + path)
      assert.equal(response.status, 200)
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected, path)
    }
    assert.equal((await fetch(origin + '/unlisted.txt')).status, 404)
    assert.equal((await fetch(origin + '/__qa/identity').then(response => response.json())).gitSha, manifest.gitSha)
    await assert.rejects(createPerformanceServer(directory))
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
    await rm(directory, { recursive: true, force: true })
  }
})
