import { createServer } from 'node:http'
import { readFile, realpath, stat } from 'node:fs/promises'
import { resolve, relative, extname, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyRelease } from './verify-release.mjs'
import { createHash } from 'node:crypto'

const scriptRoot = fileURLToPath(new URL('.', import.meta.url))
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' }
export async function createPerformanceServer(directory) {
  const root = await realpath(directory)
  const release = await verifyRelease(root)
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
      let file
      if (probes.has(path)) {
        const asset = probes.get(path)
        response.setHeader('Content-Type', asset.type)
        response.end(asset.bytes); return
      } else if (path === '/__qa/identity') {
        response.setHeader('Content-Type', mime['.json'])
        response.end(JSON.stringify(identity)); return
      } else {
        if (path.includes('\0') || path.includes('\\')) throw new Error('Invalid path')
        file = await realpath(resolve(root, '.' + (path === '/' ? '/index.html' : path)))
        const within = relative(root, file)
        if (within.startsWith('..') || isAbsolute(within)) throw new Error('Outside release')
      }
      if (!(await stat(file)).isFile()) throw new Error('Not a file')
      response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream')
      response.end(await readFile(file))
    } catch { response.writeHead(404); response.end('Not found') }
  })
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 4195)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local port')
  const server = await createPerformanceServer(resolve(scriptRoot, '../dist'))
  server.listen(port, '127.0.0.1', () => console.log(`Desktop QA: http://127.0.0.1:${port}/__qa/`))
}
