import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const reviewPath = resolve(root, 'config/production-license-review.json')
const sha = data => createHash('sha256').update(data).digest('hex')
const text = async path => (await readFile(path, 'utf8')).replaceAll('\r\n', '\n')
const local = path => relative(root, path).split(sep).join('/')
const ordered = rows => rows.sort((a, b) => a.path.localeCompare(b.path, 'en'))

export function assertReviewed(actual, reviewed) {
  assert.deepEqual(actual, reviewed,
    'Production license inputs changed. Review actual sources/attributions before running licenses:review.')
}

// Keep entire license blocks, including the ISC notice embedded inside Earcut.
// Also preserve origin-only comments; a package MIT label cannot verify the
// independent origin or historical terms of every adapted algorithm.
export function extractAttributions(source) {
  const blocks = [...source.matchAll(/\/\*[\s\S]*?\*\//g)]
    .map(match => match[0]).filter(block => /\bcopyright\b|\blicense\b|WTFPL/i.test(block))
  const origins = source.split('\n').filter(line =>
    /(?:Adapted from|Based on code by|From https?:|palette by|Function based on)/i.test(line))
  return [...new Set([...blocks, ...origins])]
}

async function packageAt(path) {
  let directory = dirname(path)
  while (directory !== dirname(directory)) {
    try {
      const pkg = JSON.parse(await text(resolve(directory, 'package.json')))
      if (pkg.name && pkg.version) return { directory, pkg }
    } catch (error) { if (error.code !== 'ENOENT') throw error }
    directory = dirname(directory)
  }
  throw new Error(`Cannot identify package owning ${path}`)
}

async function walk(directory) {
  const rows = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`Unexpected asset link: ${path}`)
    if (entry.isDirectory()) rows.push(...await walk(path))
    else if (entry.isFile()) rows.push(path)
    else throw new Error(`Unsupported asset: ${path}`)
  }
  return rows
}

export async function createLicenseInventory(ids) {
  const pkg = JSON.parse(await text(resolve(root, 'package.json')))
  const packages = new Map(), modules = new Map(), inlineGraphics = new Set()
  let virtualModuleCount = 0
  for (const id of ids) {
    if (id.includes('\0') || id.startsWith('rolldown:')) { virtualModuleCount++; continue }
    const path = id.split('?')[0]
    let info
    try { info = await stat(path) } catch {
      throw new Error(`Unclassified production module: ${id}`)
    }
    if (!info.isFile()) throw new Error(`Production module is not a file: ${id}`)
    if (!path.replaceAll('\\', '/').includes('/node_modules/')) {
      if (/\.[jt]sx$/.test(path) && /<svg\b/.test(await text(path))) inlineGraphics.add(local(path))
      continue
    }
    const owner = await packageAt(path), key = `${owner.pkg.name}@${owner.pkg.version}`
    packages.set(key, owner)
    const source = await text(path)
    const modulePath = `${owner.pkg.name}/${relative(owner.directory, path).split(sep).join('/')}`
    if (modules.has(modulePath)) assert.deepEqual(modules.get(modulePath).sha256, sha(source))
    modules.set(modulePath, { path: modulePath, sha256: sha(source),
      attributions: extractAttributions(source) })
  }
  assert(!modules.has('phaser/src/polyfills/requestVideoFrame.js'),
    'Unused video polyfill has unresolved historical provenance; do not bundle it.')
  assert(!modules.has('phaser/src/gameobjects/video/Video.js'),
    'Video is outside the reviewed game scope; review its callback and asset dependencies first.')
  const req = createRequire(resolve(root, 'package.json'))
  // The runtime decoder is extracted locally, while the pinned package is used
  // by the build transform. Include both this derivation and helper generators.
  for (const name of ['lz-string', 'vite', 'rolldown']) {
    const owner = await packageAt(req.resolve(`${name}/package.json`))
    packages.set(`${name}@${owner.pkg.version}`, owner)
  }
  const dependencies = []
  for (const [key, owner] of [...packages].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    const licenses = []
    for (const entry of await readdir(owner.directory)) {
      if (!/^licen[cs]e(?:\.|$)|^notice(?:\.|$)/i.test(entry)) continue
      const path = resolve(owner.directory, entry)
      if (!(await stat(path)).isFile()) continue
      const content = await text(path)
      licenses.push({ path: `${owner.pkg.name}/${entry}`, sha256: sha(content), text: content })
    }
    assert(licenses.length, `Missing actual license text for ${key}`)
    const sources = ordered([...modules.values()].filter(row => row.path.startsWith(`${owner.pkg.name}/`)))
    dependencies.push({ name: owner.pkg.name, version: owner.pkg.version, license: owner.pkg.license,
      role: sources.length ? 'production source graph' : owner.pkg.name === 'lz-string'
        ? 'build encoder and locally extracted runtime decoder' : 'build helper generator (conservative notice)',
      graphModules: sources.length, graphSHA256: sha(JSON.stringify(sources)), licenses })
  }
  const resources = []
  for (const path of await walk(resolve(root, 'public'))) {
    // Notices are generated below, rather than treated as an original picture.
    if (path.endsWith('third-party-notices.txt')) continue
    const data = await text(path)
    resources.push({ path: local(path), bytes: Buffer.byteLength(data), sha256: sha(data),
      origin: path.endsWith('.svg') ? 'project-declared program/vector drawing; source in repository'
        : 'UNREVIEWED: classify this new public resource before release' })
    assert(path.endsWith('.svg'), `Unreviewed public asset: ${local(path)}`)
  }
  const programResources = [
    ['src/game/draw-actor.ts', 'program actor drawing'],
    ['src/game/actor-motion.ts', 'program motion'],
    ['src/game/AdventureScene.ts', 'program scenes, maps and effects'],
    ['src/game/audio.ts', 'Web Audio synthesized effects; no recording'],
    ['src/ui/EarlyWalk.tsx', 'inline original route SVG'],
    ['src/ui/MountainWalkMap.tsx', 'inline original mountain SVG'],
    ['src/ui/MarketWalker.tsx', 'inline original market SVG'],
    ['src/ui/styles.css', 'system font stack and local landscape reference'],
    ['src/content/lz-base64.js', 'derived lz-string decoder; package MIT and historical WTFPL header retained'],
  ]
  for (const [path, origin] of programResources) resources.push({ path, origin, sha256: sha(await text(resolve(root, path))) })
  for (const path of [...inlineGraphics].sort()) {
    if (!resources.some(row => row.path === path)) resources.push({ path,
      origin: 'project inline SVG drawing; source ownership/derivative-work permission not certified',
      sha256: sha(await text(resolve(root, path))) })
  }
  const review = {
    format: 1, directDependencies: pkg.dependencies,
    dependencies: dependencies.map(({ licenses, ...row }) => ({
      ...row, licenses: licenses.map(({ text: _text, ...license }) => license),
    })),
    resources: ordered(resources),
  }
  return { format: 1, version: pkg.version,
    method: 'Conservative parsed production module graph, before tree shaking; hashes normalize CRLF to LF. Counts do not claim byte contribution or runtime use. Virtual bundler modules counted separately.',
    rightsBoundary: 'Software and asset inventory only. Original-work adaptation permission and project source release license remain unconfirmed (L02). Origin-only adapted-algorithm comments retain upstream package declarations; independent historical grants are not certified.',
    virtualModuleCount, dependencies, modules: ordered([...modules.values()]), resources: ordered(resources), review }
}

export function renderNotices(report) {
  const out = [`Third-party notices for doupocangqiong-webgame ${report.version}`,
    report.method, report.rightsBoundary]
  for (const item of report.dependencies) {
    out.push(`\n=== ${item.name} ${item.version} (${item.license}) ===\n${item.role}`)
    for (const license of item.licenses) out.push(`${license.path}\n${license.text}`)
  }
  const groups = new Map()
  for (const module of report.modules) for (const attribution of module.attributions) {
    if (!groups.has(attribution)) groups.set(attribution, [])
    groups.get(attribution).push(module.path)
  }
  out.push('\n=== Preserved embedded package attributions (conservative source graph) ===')
  for (const [attribution, paths] of groups) out.push(`${paths.join('\n')}\n${attribution}`)
  out.push('\n=== Locally extracted lz-string historical header ===',
    '// Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>',
    '// This work is free. You can redistribute it and/or modify it',
    '// under the terms of the WTFPL, Version 2',
    '// For more information see LICENSE.txt or http://www.wtfpl.net/',
    '// For more information, the home page:',
    '// http://pieroxy.net/blog/pages/lz-string/testing.html',
    '// LZ-based compression algorithm, version 1.4.5')
  // Preserve wording and attribution; remove upstream Markdown line-end spaces
  // only in the plain-text display copy. Inventory retains original LF text.
  return out.join('\n\n').replace(/[ \t]+$/gm, '') + '\n'
}

export function productionLicensesPlugin() {
  return {
    name: 'production-license-inventory', apply: 'build',
    async generateBundle() {
      const report = await createLicenseInventory([...this.getModuleIds()])
      if (process.env.DOUPO_REVIEW_LICENSES === '1') {
        await writeFile(reviewPath, JSON.stringify(report.review, null, 2) + '\n')
        await writeFile(resolve(root, 'public/third-party-notices.txt'), renderNotices(report))
      } else {
        assertReviewed(report.review, JSON.parse(await text(reviewPath)))
        assert.equal(await text(resolve(root, 'public/third-party-notices.txt')), renderNotices(report),
          'Published notices are stale or missing embedded notices; review license inputs.')
      }
      this.emitFile({ type: 'asset', fileName: 'production-license-inventory.json',
        source: JSON.stringify(report, null, 2) + '\n' })
      // Vite copies public/ before generateBundle. Always emit the verified text.
      this.emitFile({ type: 'asset', fileName: 'third-party-notices.txt', source: renderNotices(report) })
    },
  }
}
