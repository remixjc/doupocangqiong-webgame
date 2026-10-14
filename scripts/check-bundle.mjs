import { readFile, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

export function initialAssets(manifest) {
  const entries = Object.entries(manifest).filter(([, item]) => item.isEntry)
  if (entries.length !== 1) throw new Error('Expected one application entry in build manifest')
  const visited = new Set(), files = new Set()
  function visit(key) {
    if (visited.has(key)) return
    const item = manifest[key]
    if (!item) throw new Error(`Missing static import in manifest: ${key}`)
    visited.add(key); files.add(item.file)
    for (const css of item.css ?? []) files.add(css)
    for (const imported of item.imports ?? []) visit(imported)
  }
  visit(entries[0][0])
  return files
}
export function budgetFailures(report, budgets) {
  const failures = Object.entries(budgets).filter(([key, limit]) => !Number.isFinite(report[key]) || report[key] > limit)
    .map(([key, limit]) => `${key}: ${report[key]} > ${limit}`)
  if (!report.engineLazy) failures.push('Phaser must remain outside the initial static dependency graph')
  return failures
}
export function deferredAssetFailures(manifest, paths) {
  const initial = initialAssets(manifest)
  return paths.flatMap(path => {
    const item = manifest[path]
    if (!item || !item.file?.endsWith('.js')) return [`Missing deferred module in manifest: ${path}`]
    return initial.has(item.file) ? [`Module must remain outside the initial static dependency graph: ${path}`] : []
  })
}
async function main() {
  const root = fileURLToPath(new URL('../', import.meta.url)), dist = resolve(root, 'dist')
  const manifest = JSON.parse(await readFile(resolve(dist, '.vite/manifest.json'), 'utf8'))
  const budgets = JSON.parse(await readFile(resolve(root, 'config/bundle-budgets.json'), 'utf8'))
  const { version } = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
  const initial = initialAssets(manifest)
  const names = new Set(Object.values(manifest).flatMap(item => [item.file, ...(item.css ?? [])]))
  const files = await Promise.all([...names].map(async file => {
    const path = resolve(dist, file)
    if (!path.startsWith(dist + sep)) throw new Error('Manifest asset is outside dist')
    const data = await readFile(path)
    return { file, bytes: data.length, gzip: gzipSync(data).length, initial: initial.has(file) }
  }))
  const sum = (items, key) => items.reduce((total, item) => total + item[key], 0)
  const js = files.filter(item => item.file.endsWith('.js'))
  const engine = js.filter(item => /\/phaser-/.test(item.file))
  if (!engine.length) throw new Error('Expected a separately named Phaser engine chunk')
  const report = { version, initialJsBytes: sum(js.filter(item => item.initial), 'bytes'),
    initialJsGzipBytes: sum(js.filter(item => item.initial), 'gzip'), totalJsBytes: sum(js, 'bytes'),
    engineGzipBytes: sum(engine, 'gzip'), engineLazy: engine.every(item => !item.initial), files }
  await writeFile(resolve(dist, 'bundle-report.json'), JSON.stringify(report, null, 2) + '\n')
  const failures = [...budgetFailures(report, budgets),
    ...deferredAssetFailures(manifest, ['src/ui/Panels.tsx', 'src/ui/GameView.tsx', 'src/ui/SavesPanel.tsx',
      'src/ui/TouchControls.tsx', 'src/ui/RouteControls.tsx'])]
  if (failures.length) throw new Error(`Bundle budget exceeded:\n${failures.join('\n')}`)
  console.log(`Bundle check: entry ${report.initialJsBytes} bytes / gzip ${report.initialJsGzipBytes}; engine gzip ${report.engineGzipBytes}; total JS ${report.totalJsBytes}; engine lazy=${report.engineLazy}`)
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
