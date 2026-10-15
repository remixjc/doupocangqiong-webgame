import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const artifact = 'docs/qa/story-coverage-0931.json'
const digest = text => createHash('sha256').update(text).digest('hex')
const load = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'))
const groups = [
  [1, 3, 'early-journey'], [4, 6, 'mountain-certification'],
  [7, 9, 'desert-tournament'], [10, 13, 'duel-academy'],
  [14, 17, 'academy-alliance'], [18, 19, 'thunder-lineage'],
  [20, 20, 'dan-realm'], [21, 22, 'star-rescue'], [23, 24, 'tomb-bodhi'],
  [25, 25, 'pure-lotus'], [26, 26, 'coalition-defense'],
  [27, 27, 'vault-origin'], [28, 28, 'finale'],
]

export function verifyHistoricalChapter(chapter, events, proof) {
  const id = chapter.id
  const record = id <= 3
    ? proof.checkpoints?.find(row => row.chapter === id)
    : proof.records?.find(row => row.key === String(id).padStart(2, '0'))
  assert(record, `Chapter ${id}: missing historical first-clear checkpoint`)
  if (id > 3) assert.deepEqual(record.completed, Array.from({ length: id }, (_, i) => i + 1),
    `Chapter ${id}: historical completed ledger must be contiguous`)
  const progress = id <= 3 ? record.progress[id] : record.progress
  assert.equal(progress?.boss, true, `Chapter ${id}: challenge not completed in historical checkpoint`)
  assert.equal(progress?.intro, true, `Chapter ${id}: opening not read in historical checkpoint`)
  for (const event of events.filter(item => !item.optional)) {
    const saved = progress.events[event.id]
    assert.equal(saved?.started, true, `Chapter ${id}: ${event.id} not started in historical checkpoint`)
    assert.equal(saved?.stage, event.stages.length - 1,
      `Chapter ${id}: ${event.id} has no matching completed historical checkpoint; review new content separately`)
  }
  assert.match(record.fileSha256, /^[a-f0-9]{64}$/)
  assert.match(record.stateSha256, /^[a-f0-9]{64}$/)
  return { checkpoint: record.key ?? record.chapter, nativeFileSHA256: record.fileSha256,
    historicalStateSHA256: record.stateSha256 }
}

async function contentInputs(directory) {
  const result = []
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) result.push(...await contentInputs(path))
    else if (entry.name.endsWith('.ts')) result.push({
      file: relative(root, path).replaceAll('\\', '/'),
      // Git line-ending conversion must not make the same source differ in CI.
      sha256: digest((await readFile(path, 'utf8')).replaceAll('\r\n', '\n')),
    })
  }
  return result
}

export async function auditStoryCoverage() {
  const server = await createServer({ root, configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  try {
    const { chapters } = await server.ssrLoadModule('/src/content/chapters.ts')
    const { eventsForChapter } = await server.ssrLoadModule('/src/content/events.ts')
    const { mapForChapter, finalPhaseMaps } = await server.ssrLoadModule('/src/content/maps.ts')
    const { bondLines, bondEvents } = await server.ssrLoadModule('/src/content/bonds.ts')
    assert.deepEqual(chapters.map(chapter => chapter.id), Array.from({ length: 28 }, (_, i) => i + 1))
    const maps = chapters.map(chapter => mapForChapter(chapter.id).id)
    assert.equal(new Set(maps).size, 28, 'Every chapter must retain its own map ID')
    const rows = []
    for (const chapter of chapters) {
      const events = eventsForChapter(chapter.id)
      assert(chapter.opening.length && chapter.opening.every(line => line.text.trim()))
      assert(chapter.closing.length && chapter.closing.every(line => line.text.trim()))
      assert(chapter.boss && chapter.reward > 0)
      assert(events.some(event => !event.optional), `Chapter ${chapter.id}: missing required interaction`)
      assert.equal(new Set(events.map(event => event.id)).size, events.length)
      for (const event of events) {
        assert(event.stages.length > 1 && event.stages.every(text => text.trim()))
        for (const dependency of event.requires ?? []) {
          assert(events.some(other => other.id === dependency), `Chapter ${chapter.id}: missing ${dependency}`)
        }
      }
      const group = groups.find(([start, end]) => chapter.id >= start && chapter.id <= end)
      const file = `docs/qa/c11-normal-${group[2]}.json`
      const proof = await load(file)
      const checkpoint = verifyHistoricalChapter(chapter, events, proof)
      rows.push({
        id: chapter.id, title: chapter.title, map: maps[chapter.id - 1],
        openingLines: chapter.opening.length, closingLines: chapter.closing.length,
        objectives: chapter.objectives, challenge: chapter.boss, firstClearReward: chapter.reward,
        adaptationNote: chapter.trialNote,
        events: events.map(event => ({ id: event.id, kind: event.kind, title: event.title,
          optional: Boolean(event.optional), stages: event.stages.length, requires: event.requires ?? [] })),
        historicalDesktopEvidence: { file, date: proof.date, version: proof.version,
          sha256: digest((await readFile(resolve(root, file), 'utf8')).replaceAll('\r\n', '\n')), ...checkpoint },
        sourceReview: 'open: see docs/剧情来源与改编.csv; no precise Chinese/anime mapping certified by this audit',
      })
    }
    const work = await load('docs/qa/closure-work-items.json')
    assert.equal(new Set(work.items.map(item => item.id)).size, work.items.length)
    for (const item of work.items) {
      assert(item.acceptance && item.nextAction && item.reference)
      await readFile(resolve(root, item.reference))
      for (const dependency of item.dependsOn) assert(work.items.some(row => row.id === dependency),
        `${item.id}: unknown dependency ${dependency}`)
    }
    return {
      format: 1, auditDate: '2026-10-15', version: (await load('package.json')).version,
      scope: '28-chapter condensed playable route; original-source fidelity, character packages and lifecycle gates remain separately open',
      method: 'Read actual repository exports and cross-check required event completion against existing public native-download evidence. No browser run or original-source verification performed by this script.',
      limits: ['Historical browser evidence is version 0.37.5, not a new current-version 28-chapter browser playthrough.',
        'File digests identify published historical records; this public check does not read private native originals.',
        'Optional bond pages are counted as implemented definitions, not all completed by the ordinary journey.',
        'Chinese novel chapter numbers, anime episodes, devices, licensing and deployment are not certified.'],
      inputs: await contentInputs(resolve(root, 'src/content')),
      summary: { chapters: rows.length, distinctMaps: new Set(maps).size,
        requiredEvents: rows.flatMap(row => row.events).filter(event => !event.optional).length,
        optionalEvents: rows.flatMap(row => row.events).filter(event => event.optional).length,
        bondLines: bondLines.length, bondPages: bondEvents.length,
        finalPhaseMaps: finalPhaseMaps.map(map => map.id),
        openWorkPackages: work.items.filter(item => item.status !== 'closed').length },
      workRegisterSHA256: digest((await readFile(resolve(root, 'docs/qa/closure-work-items.json'), 'utf8')).replaceAll('\r\n', '\n')),
      chapters: rows,
    }
  } finally { await server.close() }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await auditStoryCoverage()
    if (process.argv.includes('--write')) {
      await writeFile(resolve(root, artifact), JSON.stringify(report, null, 2) + '\n')
    } else {
      assert.deepEqual(await load(artifact), report,
        'Story coverage snapshot is stale. Review actual coverage and open gates, then run pnpm story:audit:write.')
    }
    console.log('Story coverage verified:', report.summary)
  } catch (error) { console.error(error); process.exitCode = 1 }
}
