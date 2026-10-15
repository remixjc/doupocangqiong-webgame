import { summarizeIntervals, longTaskWithinSample } from '/__qa/statistics.mjs'
const $ = id => document.getElementById(id)
const iframe = document.querySelector('iframe')
const identity = await fetch('/__qa/identity').then(response => response.json())
let active = false, report, frame, poll, finishTimer, observer, animationObserver, prior
const groups = new Map()
function collectLongTasks(entries) {
  for (const entry of entries) report.longTasks.push({
    startTime: entry.startTime, duration: entry.duration, name: entry.name,
    attribution: [...entry.attribution].map(item => ({
      name: item.name, containerType: item.containerType, containerSrc: item.containerSrc,
      containerId: item.containerId, containerName: item.containerName,
    })),
  })
}
function collectAnimationFrames(entries) {
  for (const entry of entries) report.longAnimationFrames.push({
    startTime: entry.startTime, duration: entry.duration, blockingDuration: entry.blockingDuration,
    renderStart: entry.renderStart, styleAndLayoutStart: entry.styleAndLayoutStart,
    firstUIEventTimestamp: entry.firstUIEventTimestamp,
    scripts: [...entry.scripts].map(script => ({
      startTime: script.startTime, duration: script.duration, executionStart: script.executionStart,
      forcedStyleAndLayoutDuration: script.forcedStyleAndLayoutDuration,
      pauseDuration: script.pauseDuration, invoker: script.invoker, invokerType: script.invokerType,
      sourceURL: script.sourceURL, sourceFunctionName: script.sourceFunctionName,
      sourceCharPosition: script.sourceCharPosition, windowAttribution: script.windowAttribution,
    })),
  })
}
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
  clearInterval(poll); clearTimeout(finishTimer)
  // disconnect() discards pending entries. Drain before detaching the observer.
  if (observer) { collectLongTasks(observer.takeRecords()); observer.disconnect(); observer = undefined }
  if (animationObserver) {
    collectAnimationFrames(animationObserver.takeRecords()); animationObserver.disconnect(); animationObserver = undefined
  }
  report.snapshots.push(snapshot())
  report.ended = new Date().toISOString(); report.elapsedMs = performance.now() - report.startedAt
  report.longTasks = report.longTasks.flatMap(task => {
    const row = longTaskWithinSample(task, report.clock, report.startedAt, report.elapsedMs)
    return row ? [row] : []
  })
  report.longAnimationFrames = report.longAnimationFrames.flatMap(entry => {
    const row = longTaskWithinSample(entry, { ...report.clock, iframeTimeOrigin: report.animationFrameTimeOrigin },
      report.startedAt, report.elapsedMs)
    return row ? [row] : []
  })
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
  report = { format: 3, started: new Date().toISOString(), startedAt: performance.now(),
    clock: { parentTimeOrigin: performance.timeOrigin, iframeTimeOrigin: iframe.contentWindow.performance.timeOrigin },
    animationFrameTimeOrigin: performance.timeOrigin,
    requestedSeconds: seconds, environmentNote: $('environment').value,
    browser: { userAgent: navigator.userAgent, platform: navigator.platform, hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemoryGiB: navigator.deviceMemory ?? null, devicePixelRatio, screen: { width: screen.width, height: screen.height } },
    snapshots: [], transitions: [], visibilityEvents: [], longTasks: [], longTasksSupported: false,
    longAnimationFrames: [], longAnimationFramesSupported: false, errors: [],
    limits: ['rAF callback timing, not GPU presentation FPS', 'DOM canvas counts do not prove listener or GPU resource release',
      'Heap is optional, coarse and potentially shared; no forced GC or retained-object analysis',
      'QA observer adds overhead; menus, hidden and no-scene phases are separate',
      'Long Task attribution identifies browsing contexts, not JavaScript call stacks or GPU work',
      'Long Animation Frame script entry points are partial browser attribution, not full stacks; durations are not additive with Long Tasks',
      'Animation frames observe the same-origin root including QA parent overhead; script windowAttribution distinguishes child/parent',
      'Only queued/delivered entries are available at stop; the task executing stop can be reported later',
      'Not real mobile or human Beta'] }
  const win = iframe.contentWindow
  if (win.PerformanceObserver?.supportedEntryTypes.includes('longtask')) {
    observer = new win.PerformanceObserver(list => collectLongTasks(list.getEntries()))
    observer.observe({ type: 'longtask' }); report.longTasksSupported = true
  }
  // LoAF belongs to the same-origin root document, including its child frames.
  if (window.PerformanceObserver?.supportedEntryTypes.includes('long-animation-frame')) {
    animationObserver = new window.PerformanceObserver(list => collectAnimationFrames(list.getEntries()))
    animationObserver.observe({ type: 'long-animation-frame' }); report.longAnimationFramesSupported = true
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
