/**
 * dsh-design-studio — standalone loopback preview server.
 *
 * Used when the harness has no `webServer` (headless / CLI profiles): the design
 * folder is served on 127.0.0.1 so a browser — or the headless probe — can open
 * a variant. Read-only, GET/HEAD only, no directory listing, no writes and no
 * traversal: a missing or escaping path is a plain 404.
 *
 * `startPreview({rootDir, log})` → `{url, port, dispose()}`;
 * `closeAllPreviews()` closes every server this plugin started.
 */

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import http from 'node:http'
import { extname, isAbsolute, join, normalize, relative, resolve } from 'node:path'

/** MIME types shared with the panel's file routes. */
export const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
})

/** Static servers started by this plugin (closed on dispose / plugin unload). */
const servers = new Set()

/** The MIME type for a file path. */
export function mimeFor(path) {
  return MIME_TYPES[extname(String(path ?? '')).toLowerCase()] ?? 'application/octet-stream'
}

/**
 * Resolve a URL path inside `root`, or null when it would escape.
 * Decodes exactly once, rejects NUL bytes and `..` segments.
 */
export function safeJoin(root, urlPath) {
  let decoded
  try {
    decoded = decodeURIComponent(String(urlPath ?? '/').split('?')[0].split('#')[0])
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null
  const segments = decoded.replace(/\\/gu, '/').split('/')
  if (segments.includes('..')) return null
  const base = resolve(String(root ?? ''))
  const normalized = normalize(decoded).replace(/^([/\\])+/u, '')
  const target = resolve(base, normalized)
  const rel = relative(base, target)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)) ? target : null
}

/** Serve one request; never throws, never writes. */
async function handle(req, res, root) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' })
      res.end()
      return
    }
    let path = safeJoin(root, req.url || '/')
    if (!path) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('not found')
      return
    }
    let info = await stat(path).catch(() => null)
    if (info?.isDirectory()) {
      // No directory listings: only a folder's index.html can be opened.
      const index = join(path, 'index.html')
      const indexInfo = await stat(index).catch(() => null)
      if (!indexInfo?.isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('not found')
        return
      }
      path = index
      info = indexInfo
    }
    if (!info?.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('not found')
      return
    }
    res.writeHead(200, {
      'content-type': mimeFor(path),
      'content-length': String(info.size),
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    const stream = createReadStream(path)
    stream.on('error', () => {
      try {
        res.destroy()
      } catch {
        /* already gone */
      }
    })
    stream.pipe(res)
  } catch {
    try {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('preview failure')
    } catch {
      /* already gone */
    }
  }
}

/**
 * Start a read-only preview server for one folder on a random loopback port.
 * @param {{rootDir: string, log?: {warn?: Function}}|string} options
 * @returns {Promise<{url: string, port: number, root: string, dispose: () => Promise<void>}>}
 */
export async function startPreview(options) {
  const rootDir = typeof options === 'string' ? options : options?.rootDir
  const log = typeof options === 'object' && options !== null ? options.log : null
  if (typeof rootDir !== 'string' || rootDir.trim().length === 0) {
    throw new Error('startPreview needs a rootDir')
  }
  const root = resolve(rootDir)
  const info = await stat(root).catch(() => null)
  if (!info || !info.isDirectory()) throw new Error(`preview folder does not exist: ${root}`)
  const server = http.createServer((req, res) => {
    void handle(req, res, root)
  })
  server.keepAliveTimeout = 5000
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolvePromise()
    })
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  /** Close the server exactly once. */
  let closing = null
  const dispose = () =>
    closing ??
    (closing = new Promise((resolvePromise) => {
      servers.delete(entry)
      try {
        server.close(() => resolvePromise())
      } catch {
        resolvePromise()
      }
      setTimeout(() => {
        try {
          server.closeAllConnections?.()
        } catch {
          /* older runtimes have no closeAllConnections */
        }
        resolvePromise()
      }, 800).unref?.()
    }))
  const entry = {
    url: `http://127.0.0.1:${port}/`,
    port,
    root,
    dispose,
  }
  servers.add(entry)
  try {
    log?.warn?.('')
  } catch {
    /* logging never breaks a preview */
  }
  return entry
}

/** Close every preview server started by this plugin. */
export async function closeAllPreviews() {
  const all = [...servers]
  await Promise.all(all.map((entry) => entry.dispose().catch(() => {})))
  servers.clear()
}

/** How many preview servers are currently open (diagnostics/tests). */
export function previewCount() {
  return servers.size
}
