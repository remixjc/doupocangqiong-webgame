import { summarizeIntervals } from '/__qa/statistics.mjs'
const $ = id => document.getElementById(id)
const iframe = document.querySelector('iframe')
const identity = await fetch('/__qa/identity').then(response => response.json())
let active = false, report, frame, poll, finishTimer, observer, prior
const groups = new Map()
const phase = () => {
  const doc = iframe.contentDocument
  if (document.hidden || doc.hidden) return 'hidden'
  if (!doc.querySelector('canvas')) return 'no-scene'
  if (doc.querySelector('[role=dialog]')) return 'menu'
  if (!doc.hasFocus()) return 'unfocused-scene'
  return 'scene'
}
function snapshot() {
  const doc = iframe.contentDocument, win = iframe.contentWindow, memory = win.performance.memory
  return { elapsedMs: performance.now() - report.startedAt, phase: phase(),
    canvases: doc.querySelectorAll('canvas').length, domNodes: doc.getElementsByTagName('*').length,
    chapter: doc.querySelector('[aria-label="本章历练目标"] h2')?.textContent ?? null,
    iframeWidth: iframe.clientWidth, iframeHeight: iframe.clientHeight,
    heap: memory ? { used: memory.usedJSHeapSize, total: memory.totalJSHeapSize, limit: memory.jsHeapSizeLimit } : null }
}
function draw() {
  report.intervals = Object.fromEntries([...groups].map(([key, values]) => [key, summarizeIntervals(values)]))
  $('result').textContent = JSON.stringify({ identity, ...report }, null, 2)
}
function sampleFrame(now) {
  if (!active) return
  const current = phase()
  if (prior?.phase !== current)
    report.transitions.push({ elapsedMs: performance.now() - report.startedAt, phase: current })
  if (prior && prior.phase === current && current !== 'hidden') {
    const values = groups.get(current) ?? []
    values.push(now - prior.time); groups.set(current, values)
  }
  prior = { time: now, phase: current }
  frame = iframe.contentWindow.requestAnimationFrame(sampleFrame)
}
function stop() {
  if (!active) return
  active = false
  iframe.contentWindow.cancelAnimationFrame(frame)
  clearInterval(poll); clearTimeout(finishTimer); observer?.disconnect()
  report.snapshots.push(snapshot())
  report.ended = new Date().toISOString(); report.elapsedMs = performance.now() - report.startedAt
  draw()
  $('start').disabled = false; $('stop').disabled = true; $('export').disabled = false
  $('status').textContent = `采样结束 · ${(report.elapsedMs / 1000).toFixed(1)}秒 · ${report.snapshots.length}个实测快照`
}
$('start').disabled = false
$('status').textContent = `${identity.version} @ ${identity.gitSha} · 请在游戏中正常准备场景后开始`
$('start').onclick = () => {
  const seconds = Number($('seconds').value)
  if (!Number.isFinite(seconds) || seconds < 10 || seconds > 600) return
  groups.clear(); prior = undefined
  report = { format: 1, started: new Date().toISOString(), startedAt: performance.now(),
    requestedSeconds: seconds, environmentNote: $('environment').value,
    browser: { userAgent: navigator.userAgent, platform: navigator.platform, hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemoryGiB: navigator.deviceMemory ?? null, devicePixelRatio, screen: { width: screen.width, height: screen.height } },
    snapshots: [], transitions: [], visibilityEvents: [], longTasks: [], longTasksSupported: false, errors: [],
    limits: ['rAF callback timing, not GPU presentation FPS', 'DOM canvas counts do not prove listener or GPU resource release',
      'Heap is optional, coarse and potentially shared; no forced GC or retained-object analysis',
      'QA observer adds overhead; menus, hidden and no-scene phases are separate', 'Not real mobile or human Beta'] }
  const win = iframe.contentWindow
  if (win.PerformanceObserver?.supportedEntryTypes.includes('longtask')) {
    observer = new win.PerformanceObserver(list => {
      for (const entry of list.getEntries()) report.longTasks.push({ startTime: entry.startTime, duration: entry.duration })
    })
    observer.observe({ type: 'longtask' }); report.longTasksSupported = true
  }
  active = true
  report.snapshots.push(snapshot())
  poll = setInterval(() => {
    const row = snapshot(); report.snapshots.push(row)
    $('status').textContent = `采样中 ${(row.elapsedMs / 1000).toFixed(1)}秒 · ${row.phase} · 画布${row.canvases}`
    draw()
  }, 1000)
  frame = win.requestAnimationFrame(sampleFrame)
  finishTimer = setTimeout(stop, seconds * 1000)
  $('start').disabled = true; $('stop').disabled = false; $('export').disabled = true
}
$('stop').onclick = stop
$('export').onclick = () => {
  const blob = new Blob([JSON.stringify({ identity, ...report, rawIntervalsMs: Object.fromEntries(groups) }, null, 2) + '\n'], { type: 'application/json' })
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = `desktop-performance-${Date.now()}.json`; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
iframe.addEventListener('load', () => {
  if (active) { report.errors.push('iframe navigated during sampling'); stop() }
  iframe.contentWindow.addEventListener('error', event => {
    if (active) report.errors.push(String(event.message))
  })
  iframe.contentWindow.addEventListener('unhandledrejection', event => {
    if (active) report.errors.push(String(event.reason))
  })
  iframe.contentDocument.addEventListener('visibilitychange', resetVisibility)
})
function resetVisibility() {
  if (!active) return
  prior = undefined
  report.visibilityEvents.push({ elapsedMs: performance.now() - report.startedAt,
    parentHidden: document.hidden, iframeHidden: iframe.contentDocument.hidden })
}
document.addEventListener('visibilitychange', resetVisibility)
window.addEventListener('pagehide', stop)
