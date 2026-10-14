import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import LZString from 'lz-string'
import { createServer } from 'vite'
import { packSceneRows, readLiteralRows } from './pack-scene-rows.mjs'

const contentId = '/project/src/content/example.ts'
const longText = '清晨山后，站稳、观察、各自操作；不是自动结算。\n'.repeat(30)
const literal = JSON.stringify([['yan', 3, true, longText]])
const shared = `export const scenes = defineSceneRows(actorSceneKeys, ${literal} as const)`
function payloads(code) { return [...code.matchAll(/decodeSceneRows\("([A-Za-z0-9+/=]+)"\)/g)].map(m => m[1]) }

test('literal parser preserves Unicode, escapes, primitives, comments and trailing commas', () => {
  const source = String.raw` [ /* 开场 */ ['萧炎', "quote\"\\", '\u4e91\x41\n\t\b\f\r\v', 0, -2.5, true, false,], // 注
  [], ] suffix`
  const result = readLiteralRows(source, 0)
  assert.deepEqual(result.rows, [['萧炎', 'quote"\\', '云A\n\t\b\f\r\v', 0, -2.5, true, false], []])
  assert.equal(source.slice(result.end), ' suffix')
})
test('unknown, executable, truncated, nested or lossy literals fail closed', () => {
  for (const source of ['[[foo()]]', '[[null]]', '[[undefined]]', '[[1e999]]', '[[NaN]]',
    '[[Infinity]]', '[[1+2]]', '[[[1]]]', '[["a\nb"]]', '[["a]', '[/* unclosed',
    '[[true],', String.raw`[['\q']]`, '[[-0]]', `[[${'9'.repeat(400)}]]`]) {
    assert.throws(() => readLiteralRows(source, 0), /Unsupported scene literal/, source)
  }
})
test('pack shared and inline keys without changing surrounding code or row order', () => {
  const inline = `export const more = defineSceneRows(['a', 'b'] as const, ${JSON.stringify([[false, longText]])} as const)`
  const packed = packSceneRows(shared + '\n' + inline, contentId)
  assert(packed)
  assert.equal(packed.reports.length, 2)
  assert.equal(packed.code.split("import { decodeSceneRows }").length, 2)
  assert.deepEqual(payloads(packed.code).map(p => JSON.parse(LZString.decompressFromBase64(p))),
    [JSON.parse(literal), [[false, longText]]])
  let restored = packed.code.replace("import { decodeSceneRows } from './decode-scene-rows'\n", '')
  for (const [payload, rows] of payloads(packed.code).map((p, i) => [p, [literal, JSON.stringify([[false, longText]])][i]])) {
    restored = restored.replace(`decodeSceneRows("${payload}")`, rows)
  }
  assert.equal(restored, shared + '\n' + inline)
})
test('small rows, unrelated modules and expression rows are not silently packed', () => {
  assert.equal(packSceneRows(shared, '/project/src/core/example.ts'), null)
  assert.equal(packSceneRows('export const foo = 1', contentId), null)
  assert.equal(packSceneRows("defineSceneRows(keys, [['small']])", contentId), null)
  assert.throws(() => packSceneRows('defineSceneRows(keys, [[run()]])', contentId), /Unsupported/)
  assert(packSceneRows(shared, 'C:\\project\\src\\content\\example.ts'))
})
test('every actual packed content export equals the original complete module', async () => {
  const plain = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  const packed = await createServer({ configFile: false, plugins: [{
    name: 'exercise-production-row-transform-in-ssr', enforce: 'pre',
    transform(code, id) { const result = packSceneRows(code, id); return result ? { code: result.code, map: null } : null },
  }], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  let modules = 0, rows = 0
  try {
    for (const name of (await fs.readdir('src/content')).filter(n => n.endsWith('.ts'))) {
      const file = `src/content/${name}`, source = await fs.readFile(file, 'utf8')
      const result = packSceneRows(source, resolve(file))
      if (!result) continue
      const actual = await packed.ssrLoadModule('/' + file), expected = await plain.ssrLoadModule('/' + file)
      assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), file)
      for (const key of Object.keys(expected)) {
        if (typeof expected[key] === 'function') {
          assert.equal(actual[key].toString(), expected[key].toString(), `${file}:${key} source`)
          assert(['auctionBidAt', 'firstHallApproachScene', 'firstHallMatchScene'].includes(key),
            `Uncompared function export: ${file}:${key}`)
          for (let stage = -1; stage <= 80; stage++) for (let flags = 0; flags < 128; flags++) {
            const args = [stage, ...Array.from({ length: 7 }, (_, i) => Boolean(flags & (1 << i)))]
            assert.deepEqual(actual[key](...args), expected[key](...args), `${file}:${key}:${args}`)
          }
        } else assert.deepEqual(actual[key], expected[key], `${file}:${key}`)
      }
      modules++; rows += result.reports.reduce((n, r) => n + r.rows, 0)
    }
    assert(modules >= 40 && rows >= 500, `Expected extensive owned content; got ${modules} modules / ${rows} rows`)
  } finally { await plain.close(); await packed.close() }
})
