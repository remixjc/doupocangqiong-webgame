import { readFile, readdir, lstat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, sep } from 'node:path'

export const requiredReleaseFiles = ['index.html', '.vite/manifest.json', 'bundle-report.json',
  'engine-module-report.json', 'third-party-notices.txt']

export function requiresLicenseInventory(version) {
  const [major, minor, patch] = version.split('.').map(Number)
  return major > 0 || minor > 93 || (minor === 93 && patch >= 3)
}

export function validateReleaseFiles(files, requireLicenseInventory = false) {
  if (!Array.isArray(files) || !files.length) throw new Error('Release inventory must contain files')
  const seen = new Set()
  for (const item of files) {
    const file = item?.file
    if (typeof file !== 'string' || /[\\:\0]/.test(file)
      || file.split('/').some(part => !part || part === '.' || part === '..')
      || file === 'release-manifest.json') throw new Error(`Invalid release file path: ${file}`)
    if (seen.has(file)) throw new Error(`Duplicate release file: ${file}`)
    if (!Number.isSafeInteger(item.bytes) || item.bytes < 0 || !/^[a-f0-9]{64}$/.test(item.sha256))
      throw new Error(`Invalid release file fingerprint: ${file}`)
    seen.add(file)
  }
  for (const file of requiredReleaseFiles) if (!seen.has(file)) throw new Error(`Missing required release file: ${file}`)
  if (requireLicenseInventory && !seen.has('production-license-inventory.json'))
    throw new Error('Missing required release file: production-license-inventory.json')
}

export async function collectReleaseFiles(directory) {
  const root = resolve(directory), files = []
  if (!(await lstat(root)).isDirectory()) throw new Error('Release directory must be a real directory')
  async function visit(relative = '') {
    const entries = await readdir(resolve(root, relative), { withFileTypes: true })
    for (const entry of entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const file = relative ? `${relative}/${entry.name}` : entry.name
      const path = resolve(root, file)
      if (!path.startsWith(root + sep)) throw new Error(`Release file is outside directory: ${file}`)
      if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not allowed in release: ${file}`)
      if (entry.isDirectory()) await visit(file)
      else if (entry.isFile()) {
        if (file === 'release-manifest.json') continue
        const data = await readFile(path)
        files.push({ file, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') })
      } else throw new Error(`Unsupported release entry: ${file}`)
    }
  }
  await visit()
  files.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0)
  validateReleaseFiles(files)
  return files
}
