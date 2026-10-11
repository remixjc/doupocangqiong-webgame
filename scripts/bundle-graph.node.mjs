import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, copyFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { budgetFailures, initialAssets, deferredAssetFailures } from './check-bundle.mjs'
import { createReleaseManifest } from './write-release-manifest.mjs'

test('static dependency walk includes shared CSS and cycles but excludes dynamic engine', () => {
  const manifest = {
    entry: { isEntry: true, file: 'assets/entry.js', imports: ['shared'], dynamicImports: ['game'], css: ['assets/entry.css'] },
    shared: { file: 'assets/shared.js', imports: ['entry'], css: ['assets/shared.css'] },
    game: { file: 'assets/game.js', imports: ['engine'] },
    engine: { file: 'assets/phaser-engine.js' },
  }
  assert.deepEqual([...initialAssets(manifest)].sort(), ['assets/entry.css', 'assets/entry.js', 'assets/shared.css', 'assets/shared.js'])
})
test('engine becoming an initial import fails even within byte budgets', () => {
  assert.deepEqual(budgetFailures({ initialJsBytes: 99, engineLazy: false }, { initialJsBytes: 100 }),
    ['Phaser must remain outside the initial static dependency graph'])
  assert.equal(budgetFailures({ initialJsBytes: 101, engineLazy: true }, { initialJsBytes: 100 }).length, 1)
  assert.equal(budgetFailures({ initialJsBytes: NaN, engineLazy: true }, { initialJsBytes: 100 }).length, 1)
})
test('missing entry and missing static chunks are rejected instead of undercounted', () => {
  assert.throws(() => initialAssets({}), /one application entry/)
  assert.throws(() => initialAssets({ entry: { isEntry: true, file: 'entry.js', imports: ['missing'] } }), /Missing static import/)
})
test('optional panel must have its own deferred JS entry even when byte budgets pass', () => {
  const manifest = {
    entry: { isEntry: true, file: 'entry.js', imports: ['shared'], dynamicImports: ['panel'] },
    shared: { file: 'shared.js' },
    panel: { file: 'panel.js', imports: ['shared'] },
  }
  assert.deepEqual(deferredAssetFailures(manifest, ['panel']), [])
  assert.match(deferredAssetFailures(manifest, ['missing'])[0], /Missing deferred module/)
  assert.match(deferredAssetFailures({ ...manifest, panel: { file: 'panel.css' } }, ['panel'])[0], /Missing deferred module/)
  const eager = { ...manifest, entry: { ...manifest.entry, imports: ['shared', 'panel'] } }
  assert.match(deferredAssetFailures(eager, ['panel'])[0], /outside the initial/)
})
test('release manifest binds package, bundle and migration contract', () => {
  const manifest = createReleaseManifest(
    { version: '0.37.1' },
    { version: '0.37.1', engineLazy: true, initialJsBytes: 12, initialJsGzipBytes: 4, totalJsBytes: 30, engineGzipBytes: 9 },
    'a'.repeat(40),
  )
  assert.equal(manifest.schemaVersion, 3)
  assert.equal(manifest.contentVersion, '0.37.1')
  assert.equal(manifest.engineLazy, true)
  assert.equal(manifest.gitSha, 'a'.repeat(40))
  assert.equal(manifest.migration.olderSaves.includes('schema 1/2'), true)
  assert.throws(() => createReleaseManifest({ version: '0.37.2' }, { version: '0.37.1', engineLazy: true }, 'unknown'), /does not match/)
  assert.throws(() => createReleaseManifest({ version: '0.37.1' }, { version: '0.37.1', engineLazy: false }, 'unknown'), /lazy Phaser/)
})
test('release manifest module imports without package or dist and only its CLI reads build output', () => {
  const directory = mkdtempSync(join(tmpdir(), 'doupo-manifest-import-'))
  try {
    const script = join(directory, 'write-release-manifest.mjs')
    copyFileSync(new URL('./write-release-manifest.mjs', import.meta.url), script)
    const imported = spawnSync(process.execPath, ['--input-type=module', '-e',
      `import { createReleaseManifest } from ${JSON.stringify(pathToFileURL(script).href)}; if (typeof createReleaseManifest !== 'function') process.exit(2)`],
    { cwd: directory, encoding: 'utf8' })
    assert.equal(imported.status, 0, imported.stderr)
    assert.equal(imported.stdout, '')
    assert.equal(existsSync(join(directory, 'dist')), false)
    const invoked = spawnSync(process.execPath, [script], { cwd: directory, encoding: 'utf8' })
    assert.equal(invoked.status, 1)
    assert.match(invoked.stderr, /ENOENT/)
  } finally {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()))
    rmSync(directory, { recursive: true, force: true })
  }
})
