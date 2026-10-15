import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { collectReleaseFiles, validateReleaseFiles, requiresLicenseInventory } from './release-files.mjs'

export function createReleaseManifest(pkg, report, gitSha, files) {
  if (report.version !== pkg.version) throw new Error(`Bundle version ${report.version} does not match package ${pkg.version}`)
  if (!report.engineLazy) throw new Error('Release candidate requires a lazy Phaser engine')
  validateReleaseFiles(files, requiresLicenseInventory(pkg.version))
  return {
    artifactFormat: 1,
    game: 'doupocangqiong-webgame',
    version: pkg.version,
    gitSha,
    schemaVersion: 3,
    contentVersion: pkg.version,
    engineLazy: true,
    bundle: {
      initialJsBytes: report.initialJsBytes,
      initialJsGzipBytes: report.initialJsGzipBytes,
      totalJsBytes: report.totalJsBytes,
      engineGzipBytes: report.engineGzipBytes,
    },
    migration: {
      olderSaves: 'schema 1/2 自动迁移到 schema 3；新内容按 introducedVersion 补空记录',
      newerSaves: '较新版本存档拒绝载入并保留原文件',
    },
    files,
  }
}

function revision() {
  if (process.env.GITHUB_SHA && /^[0-9a-f]{40}$/i.test(process.env.GITHUB_SHA)) return process.env.GITHUB_SHA
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() } catch { return 'unknown' }
}

async function main() {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
  const report = JSON.parse(await readFile(resolve(root, 'dist/bundle-report.json'), 'utf8'))
  const manifest = createReleaseManifest(pkg, report, revision(), await collectReleaseFiles(resolve(root, 'dist')))
  await writeFile(resolve(root, 'dist/release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Release manifest: ${manifest.version} @ ${manifest.gitSha}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
