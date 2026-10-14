import LZString from 'lz-string'
import { createHash } from 'node:crypto'
import { encodeSceneWords, decodeSceneWords } from '../src/content/scene-radix85.js'

// Parse the limited array-of-literals format without evaluating source code.
// Reject unknown syntax rather than rewriting arbitrary expressions.
export function readLiteralRows(source, start) {
  let at = start
  const fail = () => { throw new Error(`Unsupported scene literal at ${at}`) }
  function space() {
    while (at < source.length) {
      if (/\s/.test(source[at])) { at++; continue }
      if (source.startsWith('//', at)) { const end = source.indexOf('\n', at + 2); at = end < 0 ? source.length : end; continue }
      if (source.startsWith('/*', at)) {
        const end = source.indexOf('*/', at + 2)
        if (end < 0) fail()
        at = end + 2; continue
      }
      break
    }
  }
  function string() {
    const quote = source[at++]
    let result = ''
    while (at < source.length) {
      const char = source[at++]
      if (char === quote) return result
      if (char === '\n' || char === '\r') fail()
      if (char !== '\\') { result += char; continue }
      const escape = source[at++], short = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v' }
      if (escape in short) result += short[escape]
      else if (['\\', '"', "'", '/'].includes(escape)) result += escape
      else if (escape === 'u' || escape === 'x') {
        const length = escape === 'u' ? 4 : 2, digits = source.slice(at, at + length)
        if (!new RegExp(`^[0-9a-fA-F]{${length}}$`).test(digits)) fail()
        result += String.fromCharCode(parseInt(digits, 16)); at += length
      } else fail()
    }
    fail()
  }
  function value() {
    space()
    if (source[at] === '"' || source[at] === "'") return string()
    if (source[at] === '[') {
      const values = []; at++; space()
      if (source[at] === ']') { at++; return values }
      while (at < source.length) {
        values.push(value()); space()
        if (source[at] === ']') { at++; return values }
        if (source[at++] !== ',') fail()
        space()
        if (source[at] === ']') { at++; return values }
      }
      fail()
    }
    const primitive = /^(true|false|-?(?:0|[1-9]\d*)(?:\.\d+)?)(?=[\s,\]])/.exec(source.slice(at))
    if (!primitive) fail()
    at += primitive[0].length
    const parsed = JSON.parse(primitive[0])
    if (typeof parsed === 'number' && (!Number.isFinite(parsed) || Object.is(parsed, -0))) fail()
    return parsed
  }
  const rows = value()
  if (!Array.isArray(rows) || rows.some(row => !Array.isArray(row)
    || row.some(v => typeof v !== 'string' && typeof v !== 'boolean' && typeof v !== 'number'))) fail()
  return { rows, end: at }
}

export function packSceneRows(source, id) {
  if (!/\/src\/content\/[^/]+\.ts$/.test(id.replaceAll('\\', '/')) || !source.includes('defineSceneRows(')) return null
  const calls = [...source.matchAll(/\bdefineSceneRows\((?:[A-Za-z]\w*|\[[^\]\n]*\](?: as const)?),\s*(?=\[)/g)]
  if (!calls.length) return null
  const edits = [], reports = []
  for (const call of calls) {
    const start = call.index + call[0].length, { rows, end } = readLiteralRows(source, start)
    const json = JSON.stringify(rows), compressed = LZString.compress(json)
    const encoded = encodeSceneWords(compressed.split('').map(char => char.charCodeAt(0)))
    const restored = decodeSceneWords(encoded).map(word => String.fromCharCode(word)).join('')
    if (LZString.decompress(restored) !== json) throw new Error(`Scene roundtrip failed: ${id}`)
    const replacement = `decodeSceneRows85(${JSON.stringify(encoded)})`
    const bytes = Buffer.byteLength(source.slice(start, end)), packedBytes = Buffer.byteLength(replacement)
    // Keep small literals and guarantee a material per-module saving.
    if (bytes - packedBytes < 300) continue
    edits.push({ start, end, replacement })
    reports.push({ rows: rows.length, bytes, packedBytes, sha256: createHash('sha256').update(json).digest('hex') })
  }
  if (!edits.length) return null
  let code = source
  for (const { start, end, replacement } of edits.reverse()) code = code.slice(0, start) + replacement + code.slice(end)
  return { code: "import { decodeSceneRows85 } from './decode-scene-rows'\n" + code, reports }
}

export function packedSceneRowsPlugin() {
  const modules = new Map()
  return {
    name: 'pack-owned-scene-literal-rows',
    apply: 'build',
    enforce: 'pre',
    buildStart() { modules.clear() },
    transform(code, id) {
      const packed = packSceneRows(code, id)
      if (!packed) return null
      modules.set(id.replaceAll('\\', '/').split('/src/')[1], packed.reports)
      return { code: packed.code, map: null }
    },
    generateBundle() {
      if (!modules.size) this.error('No scene rows were packed')
      this.emitFile({ type: 'asset', fileName: 'scene-row-pack-report.json',
        source: JSON.stringify({ encoding: 'lz-string-1.5.0-words-radix85', modules: Object.fromEntries([...modules].sort()) }, null, 2) + '\n' })
    },
  }
}
