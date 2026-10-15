import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const req = createRequire(import.meta.url)
const vite = resolve(req.resolve('vite/package.json'), '../bin/vite.js')
console.log('Regenerating reviewed inventory and full notices from actual installed sources. Inspect the diff before committing.')
const result = spawnSync(process.execPath, [vite, 'build'], {
  stdio: 'inherit', env: { ...process.env, DOUPO_REVIEW_LICENSES: '1' },
})
process.exitCode = result.status ?? 1
