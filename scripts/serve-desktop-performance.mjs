import { createServer } from 'node:http'
import { readFile, realpath } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyRelease } from './verify-release.mjs'
import { createHash } from 'node:crypto'

const scriptRoot = fileURLToPath(new URL('.', import.meta.url))
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' }
export async function createPerformanceServer(directory) {
  const root = await realpath(directory)
  const manifestBytes = await readFile(resolve(root, 'release-manifest.json'))
  const release = await verifyRelease(root)
  if (!manifestBytes.equals(await readFile(resolve(root, 'release-manifest.json'))))
    throw new Error('Release manifest changed while verifying')
  const manifest = JSON.parse(manifestBytes)
  // A later build must not change the game behind this server's fixed identity.
  // Cache only listed files, checking the exact bytes retained for every response.
  const production = new Map(await Promise.all(manifest.files.map(async item => {
    const bytes = await readFile(resolve(root, item.file))
    if (bytes.length !== item.bytes || createHash('sha256').update(bytes).digest('hex') !== item.sha256)
      throw new Error(`Release file changed while taking snapshot: ${item.file}`)
    return ['/' + item.file, { bytes, type: mime[extname(item.file)] ?? 'application/octet-stream' }]
  })))
  production.set('/release-manifest.json', { bytes: manifestBytes, type: mime['.json'] })
  const probeFiles = [
    ['/__qa/', resolve(scriptRoot, '../qa/desktop-performance.html')],
    ['/__qa/probe.mjs', resolve(scriptRoot, '../qa/desktop-performance.mjs')],
    ['/__qa/statistics.mjs', resolve(scriptRoot, 'desktop-performance.mjs')],
  ]
  const probes = new Map(await Promise.all(probeFiles.map(async ([url, file]) => {
    const bytes = await readFile(file)
    return [url, { bytes, type: mime[extname(file)], sha256: createHash('sha256').update(bytes).digest('hex') }]
  })))
  const identity = { ...release, probeFiles: [...probes].map(([url, value]) =>
    ({ url, bytes: value.bytes.length, sha256: value.sha256 })) }
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    if (request.method !== 'GET') { response.writeHead(405); response.end(); return }
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      if (probes.has(path)) {
        const asset = probes.get(path)
        response.setHeader('Content-Type', asset.type)
        response.end(asset.bytes); return
      } else if (path === '/__qa/identity') {
        response.setHeader('Content-Type', mime['.json'])
        response.end(JSON.stringify(identity)); return
      } else {
        if (path.includes('\0') || path.includes('\\')) throw new Error('Invalid path')
        const asset = production.get(path === '/' ? '/index.html' : path)
        if (!asset) throw new Error('Not in release snapshot')
        response.setHeader('Content-Type', asset.type)
        response.end(asset.bytes)
      }
    } catch { response.writeHead(404); response.end('Not found') }
  })
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 4195)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local port')
  const server = await createPerformanceServer(resolve(scriptRoot, '../dist'))
  server.listen(port, '127.0.0.1', () => console.log(`Desktop QA: http://127.0.0.1:${port}/__qa/`))
}
