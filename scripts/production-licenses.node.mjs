import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { assertReviewed, createLicenseInventory, extractAttributions, renderNotices } from './production-licenses.mjs'

test('actual old Phaser video polyfill is rejected by the production graph guard', async () => {
  const req = createRequire(import.meta.url)
  await assert.rejects(createLicenseInventory([req.resolve('phaser/src/polyfills/requestVideoFrame.js')]),
    /unresolved historical provenance/)
})

test('inventory rejects an added dependency, changed version, notice or module graph', () => {
  const reviewed = { dependencies: [{ name: 'engine', version: '1', graphSHA256: 'old',
    licenses: [{ sha256: 'notice' }] }], resources: [{ path: 'a.svg', sha256: 'old' }] }
  assertReviewed(structuredClone(reviewed), reviewed)
  for (const mutate of [
    row => row.dependencies.push({ name: 'unreviewed' }),
    row => row.dependencies[0].version = '2',
    row => row.dependencies[0].graphSHA256 = 'new',
    row => row.dependencies[0].licenses[0].sha256 = 'new',
    row => row.resources[0].sha256 = 'new',
  ]) {
    const actual = structuredClone(reviewed); mutate(actual)
    assert.throws(() => assertReviewed(actual, reviewed), /license inputs changed/)
  }
})

test('embedded ISC and origin-only credits survive beneath an outer MIT header', () => {
  const source = '/** @copyright Phaser @license MIT License */\n'
    + '/* ISC License\nCopyright Mapbox\nPermission to use */\n'
    + '// Adapted from [gl-matrix] by toji\nfunction actualCode() {}'
  const blocks = extractAttributions(source)
  assert.equal(blocks.length, 3)
  assert(blocks[1].includes('Copyright Mapbox'))
  const notices = renderNotices({ version: '1.0.0', method: 'fixture', rightsBoundary: 'unconfirmed',
    dependencies: [{ name: 'engine', version: '1', license: 'MIT', role: 'source graph',
      licenses: [{ path: 'engine/LICENSE', text: 'Full MIT text' }] }],
    modules: [{ path: 'engine/earcut.js', attributions: blocks }] })
  for (const expected of ['1.0.0', 'Full MIT text', 'Copyright Mapbox', 'Adapted from [gl-matrix]', 'WTFPL'])
    assert(notices.includes(expected), expected)
  assert(!notices.includes('function actualCode'))
})
