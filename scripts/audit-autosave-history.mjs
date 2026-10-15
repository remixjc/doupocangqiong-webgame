// Historical-source experiment, using a fresh process-local fake IndexedDB.
// It never accesses the user's browser database or rewrites downloaded saves.
import 'fake-indexeddb/auto'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
const root = fileURLToPath(new URL('../', import.meta.url))
const base = '221b0fac7f77c505b7d7b3f96dff9f759bcf1f3c'
const hash = data => createHash('sha256').update(data.replaceAll('\r\n', '\n')).digest('hex')
const paths = ['package.json', ...execFileSync('git', ['ls-tree', '-r', '--name-only', base, 'src'],
  { encoding: 'utf8', cwd: root }).trim().split('\n')]
const sources = new Map(paths.map(path => [path, execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8', cwd: root })]))
assert.equal(JSON.parse(sources.get('package.json')).version, '0.7.1')
const server = await createServer({ root, configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom', plugins: [{ name: 'actual-historical-071', enforce: 'pre',
    load(id) { return [...sources].find(([path]) => id.replaceAll('\\', '/').endsWith(`/${path}`))?.[1] } }] })
try {
  const { gameStore: firstStore } = await server.ssrLoadModule('/src/core/store.ts')
  // The historical class is intentionally not exported. Its real singleton's
  // constructor creates a second genuine historical instance without edits.
  const GameStore = firstStore.constructor
  const { listSlots, parseSave, saveSlot } = await server.ssrLoadModule('/src/core/save.ts')
  const { initialState } = await server.ssrLoadModule('/src/core/model.ts')
  const seed = initialState()
  await saveSlot(0, seed)
  const a = new GameStore(), b = new GameStore()
  await a.initialize(); await b.initialize()
  const read = async () => parseSave((await listSlots()).find(row => row.slot === 0).text)
  a.collect(); a.collect()
  const afterA = await read()
  assert.equal(afterA.inventory.herb, seed.inventory.herb + 2)
  b.introSeen()
  const afterB = await read()
  assert.equal(afterB.inventory.herb, seed.inventory.herb)
  assert.equal(afterB.progress[1].intro, true)
  assert.equal(b.getSnapshot().state.inventory.herb, seed.inventory.herb)
  const evidence = {
    date: '2026-10-15', item: 'E01', status: 'open', historicalVersion: '0.7.1', historicalSHA: base,
    method: 'Execute actual historical GameStore/save/model and their imports under Vite SSR with fresh process-local fake-indexeddb. Legal ordinary store actions; no browser or native original mutation.',
    sourceInputs: ['package.json', 'src/core/store.ts', 'src/core/save.ts', 'src/ui/App.tsx', 'src/ui/Panels.tsx']
      .map(path => ({ path, sha256: hash(sources.get(path)) })),
    experiment: { seedHerbs: seed.inventory.herb, afterSessionACollectsTwice: afterA.inventory.herb,
      afterStaleSessionBReadsIntro: afterB.inventory.herb, sessionBIntroPersisted: afterB.progress[1].intro,
      reproducedStaleSessionOverwrite: true },
    interpretation: 'Confirms a known vulnerability of the actual old implementation. It DOES NOT identify the unique cause of the original C5b refresh incident.',
    notEstablished: ['Original incident active tab count, pending transaction timing, oncomplete/abort/error and raw before/after save texts are unavailable in the cited incident record.',
      'Immediate asynchronous writes alone do not prove transaction completion was reordered.',
      'A refresh before durable commit, stale other page, explicit load/recovery and other causes cannot be distinguished retrospectively.'],
    currentProtection: ['AutoSaveQueue snapshots and serializes writes, exposes pending/saved/error and flush.',
      'AutoSaveSession compares original automatic text atomically; stale sessions cannot silently overwrite.',
      'Current save-conflicts/autosave tests and current chapter-13 browser checkpoints are separate evidence; they do not retroactively identify the incident.'],
    nextEvidence: ['If a new rollback occurs, preserve origin/version, both native JSON exports and displayed checkpoint, all open game tabs, save status/time, error and explicit load actions before retrying.',
      'Record a repeatable action/timing sequence and compare it against the actual affected version before attributing or closing E01.'],
  }
  if (process.argv.includes('--write'))
    await fs.writeFile(resolve(root, 'docs/qa/c11-autosave-history-0933.json'), JSON.stringify(evidence, null, 2) + '\n')
  else console.log(JSON.stringify(evidence, null, 2))
  console.log(evidence.experiment)
} finally { await server.close() }
