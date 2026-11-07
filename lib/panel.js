/**
 * dsh-design-studio — Host half of the panel (CONTRACT §4).
 *
 * Loopback, same-origin JSON routes for the Client panel, plus three binary /
 * HTML routes that an <iframe>, <img> or <a> can request without headers:
 *   GET /preview/:id/v/:variant   → design HTML + <base href> + canvas bridge
 *   GET /preview/:id/*            → design assets (loopback only)
 *   GET /api/projects/:id/file    → one project file (allow-listed extensions)
 *
 * Defence, mirroring the proven site-rebuild panel:
 *   - registered through the optional `webServer` service (a headless profile
 *     still activates the tools);
 *   - API requests need this plugin's header, a loopback Host and, when present,
 *     a matching loopback Origin;
 *   - binary/iframe routes need a loopback Host only and stay read-only;
 *   - file reads resolve inside the project root (traversal → 404);
 *   - JSON bodies are capped; every response is JSON `{ok}` or a structured
 *     failure with an HTTP status mapped from its code.
 */

import { createReadStream } from 'node:fs'
import { extname } from 'node:path'
import { injectBridge } from './bridge.js'
import { LIMITS, PLUGIN_NAME, REQUEST_HEADER, ROUTE_PREFIX } from './config.js'
import { isPlainObject, messageOf } from './util.js'

/** Methods the route table understands. */
const GET = 'GET'
const POST = 'POST'

/** File extensions the panel may serve through the `file` route. */
export const FILE_EXTENSIONS = Object.freeze([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.json',
  '.md',
  '.txt',
  '.html',
  '.css',
  '.js',
  '.svg',
  '.zip',
  '.pdf',
  '.pptx',
])

/** The route table. `route` is the dispatch key; patterns are anchored. */
export const ROUTES = Object.freeze([
  { route: 'state', methods: [GET], pattern: /^\/dsh-design-studio\/api\/state$/u },
  { route: 'intake-questions', methods: [GET], pattern: /^\/dsh-design-studio\/api\/intake\/questions$/u },
  { route: 'projects', methods: [GET, POST], pattern: /^\/dsh-design-studio\/api\/projects$/u },
  { route: 'project', methods: [GET], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)$/u },
  { route: 'brief', methods: [POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/brief$/u },
  { route: 'intake', methods: [POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/intake$/u },
  { route: 'delete', methods: [POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/delete$/u },
  { route: 'rename', methods: [POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/rename$/u },
  { route: 'system', methods: [GET, POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/system$/u },
  { route: 'context', methods: [POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/context$/u },
  { route: 'variants', methods: [GET], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/variants$/u },
  { route: 'save', methods: [POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/save$/u },
  { route: 'check', methods: [POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/check$/u },
  { route: 'job', methods: [GET], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/job$/u },
  { route: 'checks', methods: [GET], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/checks$/u },
  { route: 'check-round', methods: [GET], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/check\/([^/]+)$/u },
  { route: 'export', methods: [POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/export$/u },
  { route: 'exports', methods: [GET], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/exports$/u },
  { route: 'comments-resolve', methods: [POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/comments\/resolve$/u },
  { route: 'comments', methods: [GET, POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/comments$/u },
  { route: 'tweak', methods: [GET, POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/tweak$/u },
  { route: 'versions-restore', methods: [POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/versions\/restore$/u },
  { route: 'versions', methods: [GET, POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/versions$/u },
  { route: 'preview', methods: [POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/preview$/u },
  { route: 'reveal', methods: [POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/reveal$/u },
  { route: 'scaffold', methods: [POST], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/scaffold$/u },
  { route: 'file', methods: [GET], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/file$/u },
  { route: 'export-file', methods: [GET], pattern: /^\/dsh-design-studio\/api\/projects\/([^/]+)\/export-file$/u },
  { route: 'diagnostics', methods: [GET], pattern: /^\/dsh-design-studio\/api\/diagnostics$/u },
  { route: 'preview-html', methods: [GET], pattern: /^\/dsh-design-studio\/preview\/([^/]+)\/v\/([^/]+)$/u },
  { route: 'preview-asset', methods: [GET], pattern: /^\/dsh-design-studio\/preview\/([^/]+)\/(.+)$/u },
])

/** Routes served to iframes/img/a: loopback Host only, never the plugin header. */
const LOOPBACK_ONLY = new Set(['file', 'export-file', 'preview-html', 'preview-asset'])

/** Map a failure code to an HTTP status. */
export function statusForCode(code) {
  switch (code) {
    case 'invalid_input':
      return 400
    case 'forbidden':
      return 403
    case 'not_found':
      return 404
    case 'method_not_allowed':
    case 'method':
      return 405
    case 'busy':
    case 'conflict':
      return 409
    case 'too_large':
      return 413
    case 'no_browser':
    case 'no_preview':
    case 'not_ready':
      return 503
    case 'timeout':
      return 504
    default:
      return 500
  }
}

/** Derive the server origin, tolerating stub servers in tests. */
export function serverOrigin(webServer) {
  try {
    const origin = webServer?.getOrigin?.()
    if (typeof origin === 'string' && origin.length > 0) return origin.replace(/\/+$/u, '')
  } catch {
    /* not bound yet */
  }
  const port = Number(webServer?.port)
  if (Number.isFinite(port) && port > 0) return `http://127.0.0.1:${port}`
  return ''
}

/** True when both URLs are loopback on the same protocol and port. */
function sameLoopbackOrigin(a, b) {
  try {
    const first = new URL(a)
    const second = new URL(b)
    const loopback = new Set(['127.0.0.1', 'localhost', '[::1]', '::1'])
    return first.protocol === second.protocol && first.port === second.port && loopback.has(first.hostname) && loopback.has(second.hostname)
  } catch {
    return false
  }
}

/** The Host header names a loopback authority. */
export function checkLoopbackHost(req) {
  const headers = isPlainObject(req?.headers) ? req.headers : {}
  const host = typeof headers.host === 'string' ? headers.host : ''
  if (host.length === 0) return false
  const hostname = host.replace(/:\d+$/u, '').toLowerCase()
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]' || hostname === '::1'
}

/** The same-origin + plugin-header + loopback-Host gate for API calls. */
export function checkRequestGate(webServer, req) {
  const headers = isPlainObject(req?.headers) ? req.headers : {}
  const marker = headers[REQUEST_HEADER]
  const hasMarker = marker === '1' || (Array.isArray(marker) && marker.includes('1'))
  if (!hasMarker) return { ok: false, reason: `missing ${REQUEST_HEADER}: 1 header` }
  if (!checkLoopbackHost(req)) return { ok: false, reason: 'non-loopback Host header' }
  const origin = headers.origin
  if (origin !== undefined) {
    if (typeof origin !== 'string' || origin.length === 0) return { ok: false, reason: 'invalid Origin header' }
    const expected = serverOrigin(webServer)
    if (!expected) return { ok: true }
    if (origin !== expected && !sameLoopbackOrigin(origin, expected)) return { ok: false, reason: 'Origin does not match this server' }
  }
  return { ok: true }
}

/** Register the panel routes through the optional webServer service. */
export function registerPanel({ ctx, service, log } = {}) {
  if (!ctx || typeof ctx.inject !== 'function') return null
  const warn = (message) => {
    try {
      log?.warn?.(message)
    } catch {
      /* logging never breaks registration */
    }
  }
  try {
    return ctx.inject(['webServer'], (webCtx) => {
      const webServer = webCtx?.webServer
      if (!webServer || typeof webServer.register !== 'function') return null
      const register = () => {
        try {
          service.setWebServer?.(webServer)
        } catch {
          /* preview URLs fall back to loopback */
        }
        return webServer.register({
          kind: 'prefix',
          path: ROUTE_PREFIX,
          handler: (req, res) => {
            void handleRequest(webCtx, service, req, res)
          },
        })
      }
      let dispose = null
      try {
        dispose = typeof webCtx?.effect === 'function' ? webCtx.effect(register, 'dsh-design-studio: panel routes') : register()
      } catch (error) {
        warn(`could not register the panel routes: ${messageOf(error)}`)
        return null
      }
      return () => {
        try {
          if (typeof dispose === 'function') dispose()
        } catch {
          /* disposal never throws */
        }
        try {
          service.setWebServer?.(null)
        } catch {
          /* ignore */
        }
      }
    })
  } catch (error) {
    warn(`could not attach the panel to the web server: ${messageOf(error)}`)
    return null
  }
}

/** Match one route descriptor, decoding its params. */
export function matchRoute(pathname) {
  for (const descriptor of ROUTES) {
    const match = descriptor.pattern.exec(String(pathname ?? ''))
    if (!match) continue
    const params = match.slice(1).map((value) => {
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    })
    return { descriptor, params }
  }
  return null
}

/** Inject `<base href>` so relative assets resolve under the preview route. */
export function injectBaseHref(html, href) {
  if (typeof html !== 'string' || html.trim().length === 0) return html
  const safeHref = String(href ?? '').replace(/"/gu, '&quot;')
  const tag = `<base href="${safeHref}">`
  if (/<base[\s>]/iu.test(html)) return html
  const head = /<head[^>]*>/iu.exec(html)
  if (head) return html.slice(0, head.index + head[0].length) + tag + html.slice(head.index + head[0].length)
  const closingHead = /<\/head\s*>/iu.exec(html)
  if (closingHead) return html.slice(0, closingHead.index) + tag + html.slice(closingHead.index)
  const doctype = /<!doctype[^>]*>/iu.exec(html)
  if (doctype) return html.slice(0, doctype.index + doctype[0].length) + tag + html.slice(doctype.index + doctype[0].length)
  return tag + html
}

/** Handle one HTTP request; never throws. */
export async function handleRequest(webCtx, service, req, res) {
  try {
    let url
    try {
      url = new URL(String(req?.url ?? '/'), 'http://localhost')
    } catch {
      sendJson(res, 400, { ok: false, code: 'invalid_input', error: 'invalid request URL' })
      return
    }
    const match = matchRoute(url.pathname)
    if (!match) {
      sendJson(res, 404, { ok: false, code: 'not_found', error: 'unknown route' })
      return
    }
    const descriptor = match.descriptor
    const method = String(req?.method ?? 'GET').toUpperCase()
    const methodAllowed = descriptor.methods.includes(method) || (method === 'HEAD' && descriptor.methods.includes(GET))

    if (LOOPBACK_ONLY.has(descriptor.route)) {
      if (!checkLoopbackHost(req)) {
        sendJson(res, 403, { ok: false, code: 'forbidden', error: 'loopback request required' })
        return
      }
      if (!methodAllowed) {
        sendJson(res, 405, { ok: false, code: 'method_not_allowed', error: `${method} is not allowed on this route` }, { allow: 'GET, HEAD' })
        return
      }
      if (descriptor.route === 'file' || descriptor.route === 'export-file') {
        await serveProjectFile(res, service, match.params[0], url.searchParams.get('path'), { headOnly: method === 'HEAD', attachment: descriptor.route === 'export-file' })
        return
      }
      if (descriptor.route === 'preview-html') {
        await servePreviewHtml(res, service, webCtx, match.params[0], match.params[1], method === 'HEAD')
        return
      }
      await servePreviewAsset(res, service, match.params[0], match.params[1], method === 'HEAD')
      return
    }

    const gate = checkRequestGate(webCtx?.webServer ?? null, req)
    if (!gate.ok) {
      sendJson(res, 403, { ok: false, code: 'forbidden', error: `same-origin ${PLUGIN_NAME} request required: ${gate.reason}` })
      return
    }
    if (!methodAllowed) {
      sendJson(res, 405, { ok: false, code: 'method_not_allowed', error: `method ${method} is not allowed` }, { allow: descriptor.methods.join(', ') })
      return
    }
    const body = method === 'POST' ? await readJsonBody(req) : {}
    const result = await dispatch({ service, match, url, body, method })
    if (!isPlainObject(result) || result.ok !== true) {
      const code = isPlainObject(result) ? result.code ?? 'failed' : 'failed'
      sendJson(res, statusForCode(code), isPlainObject(result) ? result : { ok: false, code, error: 'empty handler result' })
      return
    }
    sendJson(res, 200, result)
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : 'failed'
    try {
      sendJson(res, statusForCode(code), { ok: false, code, error: messageOf(error), repair: error?.repair })
    } catch {
      /* response already gone */
    }
  }
}

/** Execute one route. Throws structured service failures. */
export async function dispatch({ service, match, url, body, method }) {
  const { descriptor, params } = match
  const projectId = params[0]
  const input = isPlainObject(body) ? body : {}
  switch (descriptor.route) {
    case 'state':
      return { ok: true, data: { ...(await service.overview()), projects: await service.listProjects() } }
    case 'intake-questions': {
      const bank = await service.intakeQuestions()
      return { ok: true, groups: bank.groups, questions: bank.questions }
    }
    case 'projects':
      if (method === 'POST') return { ok: true, project: await service.createProject(projectInput(input)) }
      return { ok: true, projects: await service.listProjects() }
    case 'project':
      return { ok: true, data: await service.projectDetail(projectId) }
    case 'brief':
      return { ok: true, brief: await service.updateBrief(projectId, input.brief) }
    case 'intake': {
      const saved = await service.saveIntake(projectId, input.intake, { source: 'wizard' })
      return { ok: true, intake: saved.intake, filled: saved.filled, missing: saved.missing }
    }
    case 'delete': {
      const removed = await service.deleteProject(projectId)
      return { ok: true, removed: removed.removed === true }
    }
    case 'rename':
      return { ok: true, project: await service.renameProject(projectId, input.name) }
    case 'system':
      if (method === 'POST') return { ok: true, ...(await service.setSystem(projectId, { tokens: input.tokens, doc: input.doc, source: input.source })) }
      return { ok: true, ...(await service.getSystem(projectId)) }
    case 'context':
      return { ok: true, ...(await service.importContext(projectId, { kind: input.kind, value: input.value, note: input.note, adoptSystem: input.adoptSystem === true })) }
    case 'variants':
      return { ok: true, variants: await service.listVariants(projectId) }
    case 'save': {
      const saved = await service.saveVariant(projectId, { variant: input.variant, html: input.html })
      return { ok: true, file: saved.file, bytes: saved.bytes }
    }
    case 'check':
      return { ok: true, job: service.startCheck(projectId, { variant: input.variant, widths: Array.isArray(input.widths) ? input.widths : undefined }) }
    case 'job':
      return { ok: true, job: service.jobs.latestFor(projectId) }
    case 'checks':
      return { ok: true, checks: await service.listChecks(projectId) }
    case 'check-round':
      return { ok: true, check: await service.checkRound(projectId, params[1]) }
    case 'export':
      return { ok: true, ...(await service.exportDesign(projectId, { kind: input.kind, variant: input.variant })) }
    case 'exports':
      return { ok: true, exports: await service.listExports(projectId) }
    case 'comments':
      if (method === 'POST') {
        return {
          ok: true,
          comment: await service.addComment(projectId, {
            variant: input.variant,
            selector: input.selector,
            note: input.note,
            rect: input.rect,
            element: input.element,
          }),
        }
      }
      return { ok: true, comments: await service.listComments(projectId) }
    case 'comments-resolve':
      return { ok: true, comment: await service.resolveComment(projectId, { id: input.id, reply: input.reply }) }
    case 'tweak':
      if (method === 'POST') {
        const patched = await service.patchTweak(projectId, { file: input.file, key: input.key, value: input.value })
        return { ok: true, file: patched.file, tweaks: patched.tweaks, changed: patched.changed === true }
      }
      return { ok: true, ...(await service.readTweak(projectId, url.searchParams.get('file') ?? undefined)) }
    case 'versions':
      if (method === 'POST') return { ok: true, version: await service.saveVersion(projectId, input.label) }
      return { ok: true, versions: await service.listVersions(projectId) }
    case 'versions-restore':
      return { ok: true, restored: await service.restoreVersion(projectId, input.id) }
    case 'preview':
      return { ok: true, ...(await service.preview(projectId, input.variant)) }
    case 'reveal':
      return { ok: true, ...(await service.openFolder(projectId)) }
    case 'scaffold':
      return { ok: true, ...(await service.scaffold(projectId, { id: input.id, target: input.target })) }
    case 'diagnostics':
      return { ok: true, data: await service.diagnostics() }
    default:
      return { ok: false, code: 'not_found', error: 'unknown route' }
  }
}

/** The POST /api/projects input shape. */
function projectInput(body) {
  const input = isPlainObject(body) ? body : {}
  return {
    name: typeof input.name === 'string' ? input.name : '',
    kind: typeof input.kind === 'string' ? input.kind : '',
    brief: isPlainObject(input.brief) || typeof input.brief === 'string' ? input.brief : {},
    viewports: Array.isArray(input.viewports) ? input.viewports : undefined,
    scaffold: input.scaffold !== false,
    system: isPlainObject(input.system) ? input.system : undefined,
    intake: isPlainObject(input.intake) ? input.intake : undefined,
  }
}

/** Serve the design HTML with the base href and the canvas bridge injected. */
async function servePreviewHtml(res, service, webCtx, projectId, variant, headOnly) {
  if (!isValidVariant(variant)) {
    sendJson(res, 404, { ok: false, code: 'not_found', error: 'not a design variant' })
    return
  }
  const store = service?.store
  let html = null
  try {
    html = await store?.readText?.(projectId, `design/${variant}.html`, null)
  } catch {
    html = null
  }
  if (typeof html !== 'string') {
    sendJson(res, 404, { ok: false, code: 'not_found', error: `design/${variant}.html does not exist` })
    return
  }
  const origin = serverOrigin(webCtx?.webServer ?? null)
  const withBase = injectBaseHref(html, `${ROUTE_PREFIX}/preview/${encodeURIComponent(projectId)}/`)
  const document = injectBridge(withBase, { projectId, variant, origin })
  const payload = Buffer.from(document, 'utf8')
  writeBinary(res, 200, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': String(payload.length),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(headOnly ? undefined : payload)
}

/** Serve one design asset (assets/*.png, fonts, css) for the preview document. */
async function servePreviewAsset(res, service, projectId, relative, headOnly) {
  const store = service?.store
  let designDir = ''
  try {
    designDir = store?.projectPaths?.(projectId)?.design ?? ''
  } catch {
    designDir = ''
  }
  if (designDir.length === 0) {
    sendJson(res, 404, { ok: false, code: 'not_found', error: 'project not found' })
    return
  }
  // Only the design folder's own files are previewable; reject traversal here
  // as well as inside the store so the route never reaches an outside path.
  if (typeof relative !== 'string' || relative.length === 0 || relative.split('/').includes('..') || relative.includes('\0')) {
    sendJson(res, 404, { ok: false, code: 'not_found', error: 'file not found' })
    return
  }
  const info = await store.statFile(projectId, `design/${relative}`)
  if (!info || info.size > LIMITS.maxImageBytes) {
    sendJson(res, 404, { ok: false, code: 'not_found', error: 'file not found' })
    return
  }
  const type = mimeOf(info.path)
  writeBinary(res, 200, {
    'content-type': type,
    'content-length': String(info.size),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  if (headOnly) {
    res.end()
    return
  }
  await streamFile(res, info.path)
}

/** Stream one project file (`file` / `export-file` routes). */
async function serveProjectFile(res, service, projectId, relative, { headOnly = false, attachment = false } = {}) {
  if (typeof relative !== 'string' || relative.length === 0) {
    sendJson(res, 400, { ok: false, code: 'invalid_input', error: 'path is required' })
    return
  }
  const extension = extname(relative).toLowerCase()
  if (!FILE_EXTENSIONS.includes(extension)) {
    sendJson(res, 400, { ok: false, code: 'invalid_input', error: `file type is not served: ${extension || '(none)'}` })
    return
  }
  const store = service?.store
  let info = null
  try {
    info = await store?.statFile?.(projectId, relative)
  } catch {
    info = null
  }
  if (!info || info.size > LIMITS.maxImageBytes) {
    sendJson(res, 404, { ok: false, code: 'not_found', error: 'file not found' })
    return
  }
  const headers = {
    'content-type': mimeOf(info.path),
    'content-length': String(info.size),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  }
  if (attachment) headers['content-disposition'] = `attachment; filename="${fileNameOf(info.path)}"`
  writeBinary(res, 200, headers)
  if (headOnly) {
    res.end()
    return
  }
  await streamFile(res, info.path)
}

/** Write binary headers (never throws when the response is gone). */
function writeBinary(res, status, headers) {
  try {
    if (!res || res.headersSent || res.writableEnded) return
    res.writeHead(status, headers)
  } catch {
    /* dead responses are fine */
  }
}

/** Stream a file body, tolerating a vanished response. */
async function streamFile(res, path) {
  try {
    if (res.headersSent && res.writableEnded) return
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
      res.end()
    } catch {
      /* already gone */
    }
  }
}

/** The MIME type for a file path (kept local so the panel has no extra import). */
function mimeOf(path) {
  const extension = extname(String(path ?? '')).toLowerCase()
  const table = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  }
  return table[extension] ?? 'application/octet-stream'
}

/** The basename of a path, safe for a Content-Disposition filename. */
function fileNameOf(path) {
  const base = String(path ?? '').replace(/\\/gu, '/').split('/').pop() ?? 'download'
  return base.replace(/["\r\n]/gu, '_')
}

/** True when the value is a safe variant file stem. */
function isValidVariant(value) {
  return typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/u.test(value)
}

/** Read a bounded JSON body. */
export async function readJsonBody(req, maxBytes = LIMITS.maxBodyBytes) {
  const chunks = []
  let total = 0
  if (req && typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      total += buffer.length
      if (total > maxBytes) {
        const error = new Error(`request body exceeds ${maxBytes} bytes`)
        error.code = 'too_large'
        throw error
      }
      chunks.push(buffer)
    }
  }
  if (total === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text.length === 0) return {}
  try {
    return JSON.parse(text)
  } catch {
    const error = new Error('request body must be valid JSON')
    error.code = 'invalid_input'
    throw error
  }
}

/** Send one JSON response (never throws into the handler). */
export function sendJson(res, status, value, extraHeaders) {
  try {
    if (!res || res.headersSent || res.writableEnded) return
    const payload = JSON.stringify(value === undefined ? {} : value)
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'content-length': String(Buffer.byteLength(payload, 'utf8')),
      ...(isPlainObject(extraHeaders) ? extraHeaders : {}),
    })
    res.end(payload)
  } catch {
    /* dead responses are fine */
  }
}
