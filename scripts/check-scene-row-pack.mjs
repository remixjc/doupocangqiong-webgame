import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import LZString from 'lz-string'
import { packSceneRows } from './pack-scene-rows.mjs'
import { decodeSceneWords } from '../src/content/scene-radix85.js'

export async function verifyPackedSceneRows(directory = 'dist') {
  const report = JSON.parse(await fs.readFile(resolve(directory, 'scene-row-pack-report.json'), 'utf8'))
  assert.equal(report.encoding, 'lz-string-1.5.0-words-radix85')
  const assets = await Promise.all((await fs.readdir(resolve(directory, 'assets')))
    .filter(name => name.endsWith('.js')).map(async name => [name, await fs.readFile(resolve(directory, 'assets', name), 'utf8')]))
  const expected = {}, matches = []
  let rowCount = 0
  for (const name of (await fs.readdir('src/content')).filter(name => name.endsWith('.ts'))) {
    const file = `src/content/${name}`, source = await fs.readFile(file, 'utf8'), packed = packSceneRows(source, resolve(file))
    if (!packed) continue
    expected[`content/${name}`] = packed.reports
    const payloads = [...packed.code.matchAll(/decodeSceneRows85\("([^"]+)"\)/g)]
    assert.equal(payloads.length, packed.reports.length, file)
    for (const [i, match] of payloads.entries()) {
      const text = LZString.decompress(decodeSceneWords(match[1]).map(word => String.fromCharCode(word)).join('')), rows = JSON.parse(text)
      assert.equal(createHash('sha256').update(text).digest('hex'), packed.reports[i].sha256, file)
      assert.equal(rows.length, packed.reports[i].rows, file)
      // Check the actual emitted literal, not just the pre-minification transformation.
      const chunks = assets.filter(([, code]) => ['"', "'", '`'].some(quote => code.includes(quote + match[1] + quote)))
      assert(chunks.length >= 1, `Packed scene payload missing from production JS: ${file}:${i}`)
      matches.push({ file, rows: rows.length, chunks: chunks.map(([name]) => name) })
      rowCount += rows.length
    }
  }
  assert.deepEqual(report.modules, expected, 'Production scene report does not match current complete content')
  assert(matches.length > 0, 'No packed production scene payloads')
  return { modules: Object.keys(expected).length, payloads: matches.length, rows: rowCount, matches }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyPackedSceneRows().then(result => console.log(`Scene pack verified: ${result.modules} complete modules / ${result.payloads} payloads / ${result.rows} rows`))
    .catch(error => { console.error(error); process.exitCode = 1 })
}
