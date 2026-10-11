import { test } from 'node:test'
import assert from 'node:assert/strict'
import { budgetFailures, initialAssets } from './check-bundle.mjs'

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
