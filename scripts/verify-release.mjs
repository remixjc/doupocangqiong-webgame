import { readFile, lstat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectReleaseFiles, validateReleaseFiles, requiresLicenseInventory } from './release-files.mjs'

export async function verifyRelease(directory, expectedSha) {
  const root = resolve(directory), manifestPath = resolve(root, 'release-manifest.json')
  if (!(await lstat(manifestPath)).isFile()) throw new Error('Release manifest must be a real file')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.artifactFormat !== 1 || manifest.game !== 'doupocangqiong-webgame'
    || manifest.schemaVersion !== 3 || manifest.contentVersion !== manifest.version
    || !/^\d+\.\d+\.\d+$/.test(manifest.version) || !/^[a-f0-9]{40}$/i.test(manifest.gitSha)
    || manifest.engineLazy !== true) throw new Error('Invalid release manifest identity or migration format')
  if (expectedSha !== undefined && (!/^[a-f0-9]{40}$/i.test(expectedSha)
    || manifest.gitSha.toLowerCase() !== expectedSha.toLowerCase())) throw new Error('Release commit does not match expected SHA')
  validateReleaseFiles(manifest.files, requiresLicenseInventory(manifest.version))
  const actual = await collectReleaseFiles(root), actualMap = new Map(actual.map(item => [item.file, item]))
  for (const item of manifest.files) {
    const current = actualMap.get(item.file)
    if (!current) throw new Error(`Missing release file: ${item.file}`)
    if (current.bytes !== item.bytes || current.sha256 !== item.sha256) throw new Error(`Release file changed: ${item.file}`)
    actualMap.delete(item.file)
  }
  if (actualMap.size) throw new Error(`Unexpected release file: ${actualMap.keys().next().value}`)
  const report = JSON.parse(await readFile(resolve(root, 'bundle-report.json'), 'utf8'))
  if (report.version !== manifest.version || report.engineLazy !== true) throw new Error('Release bundle identity does not match')
  for (const key of ['initialJsBytes', 'initialJsGzipBytes', 'totalJsBytes', 'engineGzipBytes']) {
    if (!Number.isSafeInteger(manifest.bundle?.[key]) || manifest.bundle[key] < 0 || manifest.bundle[key] !== report[key])
      throw new Error(`Release bundle metric does not match: ${key}`)
  }
  return { version: manifest.version, gitSha: manifest.gitSha, files: actual.length,
    bytes: actual.reduce((total, item) => total + item.bytes, 0) }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2] ?? fileURLToPath(new URL('../dist', import.meta.url))
  verifyRelease(directory, process.argv[3]).then(result => {
    console.log(`Release verified: ${result.version} @ ${result.gitSha}; ${result.files} files / ${result.bytes} bytes`)
  }).catch(error => { console.error(error.message); process.exitCode = 1 })
}
