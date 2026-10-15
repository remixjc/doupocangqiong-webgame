import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { collectReleaseFiles, validateReleaseFiles } from './release-files.mjs'
import { createReleaseManifest } from './write-release-manifest.mjs'
import { verifyRelease } from './verify-release.mjs'

const revision = 'a'.repeat(40)
async function fixture(run) {
  const directory = await mkdtemp(join(tmpdir(), 'doupo-release-check-'))
  try {
    await mkdir(join(directory, '.vite')); await mkdir(join(directory, 'assets'))
    const report = { version: '0.37.1', engineLazy: true, initialJsBytes: 12,
      initialJsGzipBytes: 4, totalJsBytes: 30, engineGzipBytes: 9 }
    for (const [file, content] of Object.entries({
      'index.html': '<script src="./assets/entry.js"></script>',
      '.vite/manifest.json': '{}', 'engine-module-report.json': '{}',
      'bundle-report.json': JSON.stringify(report), 'third-party-notices.txt': 'License fixture',
      'assets/entry.js': 'export const game = 1',
    })) await writeFile(join(directory, file), content)
    const manifest = createReleaseManifest({ version: report.version }, report, revision, await collectReleaseFiles(directory))
    await writeFile(join(directory, 'release-manifest.json'), JSON.stringify(manifest))
    await run(directory, manifest)
  } finally {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()))
    await rm(directory, { recursive: true, force: true })
  }
}

test('release verifies independently of source checkout and does not write any files', async () => {
  await fixture(async (directory, manifest) => {
    const before = await readFile(join(directory, 'release-manifest.json'), 'utf8')
    const result = await verifyRelease(directory, revision.toUpperCase())
    assert.equal(result.files, manifest.files.length)
    assert.equal(result.bytes, manifest.files.reduce((sum, item) => sum + item.bytes, 0))
    assert.equal(await readFile(join(directory, 'release-manifest.json'), 'utf8'), before)
    assert.deepEqual(await collectReleaseFiles(directory), manifest.files)
    await assert.rejects(verifyRelease(directory, 'b'.repeat(40)), /expected SHA/)
  })
})

test('license inventory is mandatory for new releases while historical format-1 packages still verify', async () => {
  await fixture(async (directory, manifest) => {
    assert(!(manifest.files.some(row => row.file === 'production-license-inventory.json')))
    await verifyRelease(directory, revision)
    const report = JSON.parse(await readFile(join(directory, 'bundle-report.json'), 'utf8'))
    report.version = '0.93.3'
    assert.throws(() => createReleaseManifest({ version: report.version }, report, revision, manifest.files),
      /Missing required release file: production-license-inventory/)
    await writeFile(join(directory, 'bundle-report.json'), JSON.stringify(report))
    // A rehashed new manifest must also fail independent verification.
    await writeFile(join(directory, 'release-manifest.json'), JSON.stringify({ ...manifest,
      version: report.version, contentVersion: report.version, files: await collectReleaseFiles(directory) }))
    await assert.rejects(verifyRelease(directory), /Missing required release file: production-license-inventory/)
    await writeFile(join(directory, 'production-license-inventory.json'), '{"review":"fixture"}')
    const current = createReleaseManifest({ version: report.version }, report, revision, await collectReleaseFiles(directory))
    await writeFile(join(directory, 'release-manifest.json'), JSON.stringify(current))
    await verifyRelease(directory, revision)
  })
})

test('release rejects missing, changed and extra files without repairing the package', async () => {
  await fixture(async directory => {
    const asset = join(directory, 'assets/entry.js'), original = await readFile(asset)
    await writeFile(asset, original.toString().replace('1', '2'))
    await assert.rejects(verifyRelease(directory), /Release file changed: assets\/entry.js/)
    assert.equal(await readFile(asset, 'utf8'), original.toString().replace('1', '2'))
    await rm(asset)
    await assert.rejects(verifyRelease(directory), /Missing release file: assets\/entry.js/)
    await writeFile(asset, original); await writeFile(join(directory, 'extra.txt'), 'untracked')
    await assert.rejects(verifyRelease(directory), /Unexpected release file: extra.txt/)
  })
})

test('release rejects traversal, duplicate paths, malformed hashes and omitted mandatory artifacts', async () => {
  await fixture(async (_directory, manifest) => {
    for (const file of ['../secret', '/tmp/secret', 'assets\\secret', 'C:/secret', './index.html',
      'assets//entry.js', 'release-manifest.json', 'assets/\0secret']) {
      assert.throws(() => validateReleaseFiles([...manifest.files, { file, bytes: 1, sha256: 'a'.repeat(64) }]), /Invalid release file path/)
    }
    assert.throws(() => validateReleaseFiles([...manifest.files, manifest.files[0]]), /Duplicate/)
    assert.throws(() => validateReleaseFiles([{ ...manifest.files[0], sha256: 'invalid' }]), /fingerprint/)
    assert.throws(() => validateReleaseFiles(manifest.files.filter(item => item.file !== 'third-party-notices.txt')), /Missing required/)
  })
})

test('release rejects metadata drift even when a newly written inventory hashes the changed report', async () => {
  await fixture(async (directory, manifest) => {
    const path = join(directory, 'release-manifest.json')
    for (const mutation of [{ artifactFormat: 2 }, { schemaVersion: 4 }, { contentVersion: '0.38.0' },
      { game: 'other' }, { gitSha: 'unknown' }, { engineLazy: false }]) {
      await writeFile(path, JSON.stringify({ ...manifest, ...mutation }))
      await assert.rejects(verifyRelease(directory), /Invalid release manifest/)
    }
    const reportPath = join(directory, 'bundle-report.json')
    const report = JSON.parse(await readFile(reportPath, 'utf8'))
    await writeFile(reportPath, JSON.stringify({ ...report, initialJsBytes: 13 }))
    await writeFile(path, JSON.stringify({ ...manifest, files: await collectReleaseFiles(directory) }))
    await assert.rejects(verifyRelease(directory), /metric does not match/)
  })
})

test('release rejects symbolic links to prevent fingerprints from reading outside the package', async () => {
  await fixture(async directory => {
    // A directory junction is available on Windows without symlink developer privileges.
    await symlink(join(directory, 'assets'), join(directory, 'linked-assets'), 'junction')
    await assert.rejects(collectReleaseFiles(directory), /Symbolic links are not allowed/)
  })
})
