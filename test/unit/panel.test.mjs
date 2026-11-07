/**
 * Unit tests for lib/panel.js — route matching, the same-origin gate, preview
 * injection, file serving and dispatch with a fake service.
 * Run: node --test test/unit/panel.test.mjs
 */

import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import { test } from 'node:test'
import {
  FILE_EXTENSIONS,
  ROUTES,
  checkLoopbackHost,
  checkRequestGate,
  dispatch,
  handleRequest,
  injectBaseHref,
  matchRoute,
  readJsonBody,
  registerPanel,
  serverOrigin,
  statusForCode,
} from '../../lib/panel.js'

const ORIGIN = 'http://127.0.0.1:60809'
const HOST = '127.0.0.1:60809'

/** A response double that captures status, headers and body. */
function makeRes() {
  const chunks = []
  const res = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
      callback()
    },
  })
  res.statusCode = 0
  res.headers = {}
  res.headersSent = false
  res.writeHead = function writeHead(status, headers = {}) {
    this.statusCode = status
    this.headers = { ...headers }
    this.headersSent = true
    return this
  }
  const originalEnd = res.end.bind(res)
  res.end = function end(chunk, _encoding) {
    if (chunk !== undefined && chunk !== null && typeof chunk !== 'function') {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
    }
    return originalEnd()
  }
  res.text = () => Buffer.concat(chunks).toString('utf8')
  res.json = () => JSON.parse(res.text())
  res.bytes = () => Buffer.concat(chunks)
  return res
}

/** A request double that can stream a JSON body. */
function makeReq({ method = 'GET', url = '/dsh-design-studio/api/state', headers = {}, body } = {}) {
  const req = { method, url, headers: { host: HOST, ...headers } }
  if (body !== undefined) {
    req[Symbol.asyncIterator] = async function* iterator() {
      yield Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))
    }
  }
  return req
}

/** A fake service for dispatch/route tests. */
function fakeService(overrides = {}) {
  const calls = []
  const files = new Map()
  const html = '<!DOCTYPE html><html><head><title>设计</title></head><body><h1>数据运营平台</h1></body></html>'
  const base = {
    calls,
    files,
    store: {
      projectPaths(id) {
        return { root: `C:/projects/${id}`, design: `C:/projects/${id}/design` }
      },
      async readText(id, rel, fallback) {
        if (rel === 'design/a.html') return html
        return fallback
      },
      async statFile(id, rel) {
        return files.get(rel) ?? null
      },
    },
    async overview() {
      return { version: '1.3.1', dataDir: '/data', browser: { available: true }, counts: { projects: 1, checked: 0, ready: 0 } }
    },
    async intakeQuestions() {
      return {
        groups: [{ id: 'start', title: '开始：做什么', questions: [{ id: 'kind', label: '类型', type: 'single', options: ['web'], required: true, allowSkip: false, hint: 'hint' }] }],
        questions: [{ id: 'kind', label: '类型', type: 'single', options: ['web'], required: true, allowSkip: false, hint: 'hint', group: 'start' }],
      }
    },
    async saveIntake(id, patch, options) {
      calls.push(['saveIntake', id, patch, options])
      return { intake: { goal: '', audience: '', ...patch, source: options?.source ?? '' }, filled: ['goal'], missing: ['audience'], score: 20 }
    },
    async listProjects() {
      return [{ id: 'dsg-x', name: '运营仪表盘', kind: 'web', status: 'draft', bestScore: null, variants: 1, comments: 0 }]
    },
    async createProject(input) {
      calls.push(['createProject', input])
      return { id: 'dsg-new', name: input.name, kind: input.kind, viewports: [1440, 768, 375] }
    },
    async updateBrief(id, brief) {
      calls.push(['updateBrief', id, brief])
      return { goal: '', audience: '', layout: '', content: '', constraints: '', ...brief }
    },
    async projectDetail(id) {
      return { project: { id, name: '运营仪表盘' }, variants: [{ id: 'a' }], system: {}, comments: [], checks: [], latestCheck: null, versions: [], exports: [], job: null, browser: { available: true } }
    },
    async deleteProject(id) {
      calls.push(['deleteProject', id])
      return { id, removed: true }
    },
    async renameProject(id, name) {
      calls.push(['renameProject', id, name])
      return { id, name }
    },
    async getSystem(id) {
      return { system: { name: '品牌' }, tokens: { name: '品牌' }, doc: '# doc' }
    },
    async setSystem(id, input) {
      calls.push(['setSystem', id, input])
      return { system: { name: '品牌' }, tokens: input.tokens ?? null, doc: input.doc ?? '' }
    },
    async importContext(id, input) {
      calls.push(['importContext', id, input])
      return { evidence: { id: 'ev-1', kind: input.kind }, tokens: null, system: null }
    },
    async listVariants() {
      return [{ id: 'a', label: '规范版' }]
    },
    async saveVariant(id, input) {
      calls.push(['saveVariant', id, input])
      return { file: 'design/a.html', bytes: 12, history: 1 }
    },
    startCheck(id, options) {
      calls.push(['startCheck', id, options])
      return { id: 'job-1', status: 'running', progress: 'probing' }
    },
    jobs: { latestFor: () => ({ id: 'job-1', status: 'done', progress: 'done' }) },
    async listChecks() {
      return [{ round: 1, score: 91 }]
    },
    async checkRound(id, round) {
      return { round: Number(round), score: 91, grade: 'A' }
    },
    async exportDesign(id, input) {
      calls.push(['exportDesign', id, input])
      return { export: { kind: input.kind, file: 'exports/x.zip', bytes: 10, url: 'http://x/export-file' } }
    },
    async listExports() {
      return [{ kind: 'zip', file: 'exports/x.zip' }]
    },
    async listComments() {
      return [{ id: 'c-1', note: '标题太大' }]
    },
    async addComment(id, input) {
      calls.push(['addComment', id, input])
      return { id: 'c-2', ...input }
    },
    async resolveComment(id, input) {
      calls.push(['resolveComment', id, input])
      return { id: input.id, resolvedAt: 'now' }
    },
    async readTweak(id, file) {
      calls.push(['readTweak', id, file])
      return { file: `design/${file ?? 'a.html'}`, tweaks: { primaryColor: '#b4552f' } }
    },
    async patchTweak(id, input) {
      calls.push(['patchTweak', id, input])
      return { file: `design/${input.file}`, tweaks: { primaryColor: input.value }, changed: true }
    },
    async listVersions() {
      return [{ id: 'v-1' }]
    },
    async saveVersion(id, label) {
      calls.push(['saveVersion', id, label])
      return { id: 'v-2', label }
    },
    async restoreVersion(id, versionId) {
      calls.push(['restoreVersion', id, versionId])
      return { restored: versionId, files: 3 }
    },
    async preview(id, variant) {
      calls.push(['preview', id, variant])
      return { url: 'http://127.0.0.1:60809/dsh-design-studio/preview/x/v/a', origin: ORIGIN, variant: variant ?? 'a', sameOrigin: true }
    },
    async openFolder(id) {
      calls.push(['openFolder', id])
      return { opened: true, path: `C:/projects/${id}` }
    },
    async scaffold(id, input) {
      calls.push(['scaffold', id, input])
      return { file: 'design/tweaks.html', bytes: 20 }
    },
    async diagnostics() {
      return { version: '1.3.1', errors: [] }
    },
  }
  return { ...base, ...overrides }
}

/** Call the real request handler as the webServer would. */
async function call(service, { method = 'GET', url, headers = {}, body, webServer = { getOrigin: () => ORIGIN } } = {}) {
  const req = makeReq({ method, url, headers, body })
  const res = makeRes()
  await handleRequest({ webServer }, service, req, res)
  // File routes pipe a stream, so wait for the response to finish before reading.
  if (!res.writableEnded) {
    await new Promise((resolve) => {
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        resolve()
      }
      res.once('finish', done)
      res.once('close', done)
      setTimeout(done, 3000).unref?.()
    })
  }
  return res
}

/** The plugin API headers (same-origin panel call). */
function apiHeaders(extra = {}) {
  return { 'x-dsh-design-studio': '1', origin: ORIGIN, host: HOST, ...extra }
}

test('the route table matches every frozen route', () => {
  assert.ok(ROUTES.length >= 25)
  const cases = [
    ['/dsh-design-studio/api/state', 'state', []],
    ['/dsh-design-studio/api/intake/questions', 'intake-questions', []],
    ['/dsh-design-studio/api/projects', 'projects', []],
    ['/dsh-design-studio/api/projects/dsg-x', 'project', ['dsg-x']],
    ['/dsh-design-studio/api/projects/dsg-x/brief', 'brief', ['dsg-x']],
    ['/dsh-design-studio/api/projects/dsg-x/intake', 'intake', ['dsg-x']],
    ['/dsh-design-studio/api/projects/dsg-x/save', 'save', ['dsg-x']],
    ['/dsh-design-studio/api/projects/dsg-x/check', 'check', ['dsg-x']],
    ['/dsh-design-studio/api/projects/dsg-x/check/3', 'check-round', ['dsg-x', '3']],
    ['/dsh-design-studio/api/projects/dsg-x/comments/resolve', 'comments-resolve', ['dsg-x']],
    ['/dsh-design-studio/api/projects/dsg-x/comments', 'comments', ['dsg-x']],
    ['/dsh-design-studio/api/projects/dsg-x/versions/restore', 'versions-restore', ['dsg-x']],
    ['/dsh-design-studio/api/projects/dsg-x/versions', 'versions', ['dsg-x']],
    ['/dsh-design-studio/api/projects/dsg-x/file', 'file', ['dsg-x']],
    ['/dsh-design-studio/api/projects/dsg-x/export-file', 'export-file', ['dsg-x']],
    ['/dsh-design-studio/api/diagnostics', 'diagnostics', []],
    ['/dsh-design-studio/preview/dsg-x/v/a', 'preview-html', ['dsg-x', 'a']],
    ['/dsh-design-studio/preview/dsg-x/assets/logo.png', 'preview-asset', ['dsg-x', 'assets/logo.png']],
  ]
  for (const [path, route, params] of cases) {
    const match = matchRoute(path)
    assert.ok(match, `should match ${path}`)
    assert.equal(match.descriptor.route, route, path)
    assert.deepEqual(match.params, params, path)
  }
  assert.equal(matchRoute('/dsh-design-studio/api/nope'), null)
  assert.equal(matchRoute('/other/api/state'), null)
})

test('statusForCode maps the frozen error codes', () => {
  assert.equal(statusForCode('invalid_input'), 400)
  assert.equal(statusForCode('forbidden'), 403)
  assert.equal(statusForCode('not_found'), 404)
  assert.equal(statusForCode('method_not_allowed'), 405)
  assert.equal(statusForCode('busy'), 409)
  assert.equal(statusForCode('too_large'), 413)
  assert.equal(statusForCode('no_browser'), 503)
  assert.equal(statusForCode('no_preview'), 503)
  assert.equal(statusForCode('not_ready'), 503)
  assert.equal(statusForCode('timeout'), 504)
  assert.equal(statusForCode('failed'), 500)
  assert.equal(statusForCode('cancelled'), 500)
})

test('the API gate requires the plugin header, a loopback host and a matching origin', () => {
  assert.equal(checkRequestGate({ getOrigin: () => ORIGIN }, { headers: { host: HOST, origin: ORIGIN } }).ok, false)
  assert.equal(checkRequestGate({ getOrigin: () => ORIGIN }, { headers: { host: HOST, origin: ORIGIN, 'x-dsh-design-studio': '1' } }).ok, true)
  assert.equal(checkRequestGate({ getOrigin: () => ORIGIN }, { headers: { host: 'evil.com', origin: ORIGIN, 'x-dsh-design-studio': '1' } }).ok, false)
  assert.equal(checkRequestGate({ getOrigin: () => ORIGIN }, { headers: { host: HOST, origin: 'http://evil.com', 'x-dsh-design-studio': '1' } }).ok, false)
  assert.equal(checkRequestGate({ getOrigin: () => ORIGIN }, { headers: { host: HOST, origin: 'http://localhost:60809', 'x-dsh-design-studio': '1' } }).ok, true)
  assert.equal(checkLoopbackHost({ headers: { host: HOST } }), true)
  assert.equal(checkLoopbackHost({ headers: { host: '[::1]:60809' } }), true)
  assert.equal(checkLoopbackHost({ headers: { host: '10.0.0.2:60809' } }), false)
  assert.equal(checkLoopbackHost({ headers: {} }), false)
})

test('an API request without the plugin header is a 403', async () => {
  const service = fakeService()
  const res = await call(service, { url: '/dsh-design-studio/api/state' })
  assert.equal(res.statusCode, 403)
  assert.equal(res.json().code, 'forbidden')
})

test('an API request with a foreign origin is a 403', async () => {
  const service = fakeService()
  const res = await call(service, { url: '/dsh-design-studio/api/state', headers: apiHeaders({ origin: 'http://evil.com' }) })
  assert.equal(res.statusCode, 403)
})

test('unknown routes 404 and wrong methods 405', async () => {
  const service = fakeService()
  const unknown = await call(service, { url: '/dsh-design-studio/api/nope', headers: apiHeaders() })
  assert.equal(unknown.statusCode, 404)
  assert.equal(unknown.json().code, 'not_found')

  const wrongMethod = await call(service, { method: 'POST', url: '/dsh-design-studio/api/state', headers: apiHeaders(), body: {} })
  assert.equal(wrongMethod.statusCode, 405)
  assert.equal(wrongMethod.headers.allow, 'GET')
})

test('dispatch serves the state, project and variants payloads', async () => {
  const service = fakeService()
  const state = await call(service, { url: '/dsh-design-studio/api/state', headers: apiHeaders() })
  assert.equal(state.statusCode, 200)
  const stateBody = state.json()
  assert.equal(stateBody.ok, true)
  assert.equal(stateBody.data.version, '1.3.1')
  assert.equal(stateBody.data.projects.length, 1)

  const created = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects', headers: apiHeaders(), body: { name: '新设计', kind: 'web', brief: { goal: 'x' } } })
  assert.equal(created.statusCode, 200)
  assert.equal(created.json().project.id, 'dsg-new')

  const detail = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x', headers: apiHeaders() })
  assert.equal(detail.json().data.project.id, 'dsg-x')

  const variants = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/variants', headers: apiHeaders() })
  assert.equal(variants.json().variants[0].id, 'a')

  const saved = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects/dsg-x/save', headers: apiHeaders(), body: { variant: 'a', html: '<html></html>' } })
  assert.equal(saved.json().ok, true)
  assert.equal(saved.json().file, 'design/a.html')
  assert.equal(saved.json().history, undefined)

  const check = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects/dsg-x/check', headers: apiHeaders(), body: { variant: 'all' } })
  assert.equal(check.json().job.id, 'job-1')

  const job = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/job', headers: apiHeaders() })
  assert.equal(job.json().job.status, 'done')

  const round = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/check/3', headers: apiHeaders() })
  assert.equal(round.json().check.round, 3)
})

test('dispatch covers system, context, comments, tweaks, versions, exports and reveal', async () => {
  const service = fakeService()
  const system = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/system', headers: apiHeaders() })
  assert.equal(system.json().system.name, '品牌')

  const setSystem = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects/dsg-x/system', headers: apiHeaders(), body: { tokens: { name: '品牌' } } })
  assert.equal(setSystem.json().tokens.name, '品牌')

  const context = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects/dsg-x/context', headers: apiHeaders(), body: { kind: 'text', value: 'note' } })
  assert.equal(context.json().evidence.kind, 'text')

  const comment = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects/dsg-x/comments', headers: apiHeaders(), body: { variant: 'a', selector: '#hero', note: '太大' } })
  assert.equal(comment.json().comment.id, 'c-2')
  const comments = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/comments', headers: apiHeaders() })
  assert.equal(comments.json().comments.length, 1)
  const resolved = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects/dsg-x/comments/resolve', headers: apiHeaders(), body: { id: 'c-1', reply: '好了' } })
  assert.equal(resolved.json().comment.resolvedAt, 'now')

  const tweak = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/tweak?file=a.html', headers: apiHeaders() })
  assert.equal(tweak.json().tweaks.primaryColor, '#b4552f')
  const patched = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects/dsg-x/tweak', headers: apiHeaders(), body: { file: 'a.html', key: 'primaryColor', value: '#8a3d20' } })
  assert.equal(patched.json().tweaks.primaryColor, '#8a3d20')

  const version = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects/dsg-x/versions', headers: apiHeaders(), body: { label: '基线' } })
  assert.equal(version.json().version.id, 'v-2')
  const versions = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/versions', headers: apiHeaders() })
  assert.equal(versions.json().versions.length, 1)
  const restored = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects/dsg-x/versions/restore', headers: apiHeaders(), body: { id: 'v-1' } })
  assert.equal(restored.json().restored.restored, 'v-1')

  const exported = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects/dsg-x/export', headers: apiHeaders(), body: { kind: 'zip' } })
  assert.equal(exported.json().export.file, 'exports/x.zip')
  const exports = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/exports', headers: apiHeaders() })
  assert.equal(exports.json().exports.length, 1)

  const preview = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects/dsg-x/preview', headers: apiHeaders(), body: { variant: 'a' } })
  assert.equal(preview.json().sameOrigin, true)
  const reveal = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects/dsg-x/reveal', headers: apiHeaders(), body: {} })
  assert.equal(reveal.json().opened, true)
  const scaffold = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects/dsg-x/scaffold', headers: apiHeaders(), body: { id: 'tweaks' } })
  assert.equal(scaffold.json().file, 'design/tweaks.html')
  const diagnostics = await call(service, { url: '/dsh-design-studio/api/diagnostics', headers: apiHeaders() })
  assert.equal(diagnostics.json().data.version, '1.3.1')
})

test('POST /brief saves the requirements brief over the same-origin gate', async () => {
  const service = fakeService()
  const res = await call(service, {
    method: 'POST',
    url: '/dsh-design-studio/api/projects/dsg-x/brief',
    headers: apiHeaders(),
    body: { brief: { goal: '做一个运营仪表盘', audience: '运营团队' } },
  })
  assert.equal(res.statusCode, 200)
  assert.equal(res.json().ok, true)
  assert.equal(res.json().brief.goal, '做一个运营仪表盘')
  assert.equal(res.json().brief.constraints, '')
  const callRow = service.calls.find((entry) => entry[0] === 'updateBrief')
  assert.equal(callRow[1], 'dsg-x')

  // The route obeys the same gate as its siblings: no header → 403.
  const gated = await call(service, {
    method: 'POST',
    url: '/dsh-design-studio/api/projects/dsg-x/brief',
    body: { brief: { goal: 'x' } },
  })
  assert.equal(gated.statusCode, 403)

  // Validation failures map to 400 with the repair hint intact.
  const failing = fakeService({
    async updateBrief() {
      const error = new Error('brief must be an object')
      error.code = 'invalid_input'
      error.repair = { action: 'fix-brief', label: 'Fix the brief', detail: 'Pass a brief object.' }
      throw error
    },
  })
  const bad = await call(failing, {
    method: 'POST',
    url: '/dsh-design-studio/api/projects/dsg-x/brief',
    headers: apiHeaders(),
    body: { brief: 'not an object' },
  })
  assert.equal(bad.statusCode, 400)
  assert.equal(bad.json().code, 'invalid_input')
  assert.equal(bad.json().repair.action, 'fix-brief')
})

test('intake routes expose the question bank and save wizard answers', async () => {
  const service = fakeService()
  const questions = await call(service, { url: '/dsh-design-studio/api/intake/questions', headers: apiHeaders() })
  assert.equal(questions.statusCode, 200)
  const bank = questions.json()
  assert.equal(bank.ok, true)
  assert.equal(bank.groups.length, 1)
  assert.equal(bank.groups[0].questions[0].id, 'kind')
  assert.equal(bank.questions[0].group, 'start')
  const gated = await call(service, { url: '/dsh-design-studio/api/intake/questions' })
  assert.equal(gated.statusCode, 403)

  const saved = await call(service, {
    method: 'POST',
    url: '/dsh-design-studio/api/projects/dsg-x/intake',
    headers: apiHeaders(),
    body: { intake: { goal: '做一个运营落地页', audience: '潜在客户' } },
  })
  assert.equal(saved.statusCode, 200)
  assert.equal(saved.json().intake.goal, '做一个运营落地页')
  assert.equal(saved.json().intake.source, 'wizard')
  assert.deepEqual(saved.json().filled, ['goal'])
  assert.deepEqual(saved.json().missing, ['audience'])
  const callRow = service.calls.find((entry) => entry[0] === 'saveIntake')
  assert.equal(callRow[1], 'dsg-x')
  assert.equal(callRow[3].source, 'wizard')

  // Unknown project → 404, malformed intake → 400 mapping.
  const missing = fakeService({
    async saveIntake() {
      const error = new Error('project "dsg-nope" does not exist')
      error.code = 'not_found'
      throw error
    },
  })
  const notFound = await call(missing, {
    method: 'POST',
    url: '/dsh-design-studio/api/projects/dsg-nope/intake',
    headers: apiHeaders(),
    body: { intake: { goal: 'x' } },
  })
  assert.equal(notFound.statusCode, 404)
  assert.equal(notFound.json().code, 'not_found')

  const invalid = fakeService({
    async saveIntake() {
      const error = new Error('intake must be an object')
      error.code = 'invalid_input'
      error.repair = { action: 'fix-intake', label: 'Fix the intake', detail: 'Pass an intake object.' }
      throw error
    },
  })
  const bad = await call(invalid, {
    method: 'POST',
    url: '/dsh-design-studio/api/projects/dsg-x/intake',
    headers: apiHeaders(),
    body: { intake: 'nope' },
  })
  assert.equal(bad.statusCode, 400)
  assert.equal(bad.json().code, 'invalid_input')
  assert.equal(bad.json().repair.action, 'fix-intake')
})

test('POST /api/projects forwards an optional intake to createProject', async () => {
  const service = fakeService()
  const res = await call(service, {
    method: 'POST',
    url: '/dsh-design-studio/api/projects',
    headers: apiHeaders(),
    body: { name: '向导项目', intake: { goal: '做一个落地页', kind: 'web' } },
  })
  assert.equal(res.statusCode, 200)
  const callRow = service.calls.find((entry) => entry[0] === 'createProject')
  assert.equal(callRow[1].intake.goal, '做一个落地页')
  assert.equal(callRow[1].intake.kind, 'web')
  // No intake in the request → createProject receives undefined (backwards compatible).
  await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects', headers: apiHeaders(), body: { name: '无 intake' } })
  const second = service.calls.filter((entry) => entry[0] === 'createProject')[1]
  assert.equal(second[1].intake, undefined)
})

test('service failures are mapped to HTTP statuses with structured errors', async () => {
  const cases = [
    ['invalid_input', 400],
    ['not_found', 404],
    ['busy', 409],
    ['too_large', 413],
    ['no_browser', 503],
    ['timeout', 504],
    ['failed', 500],
  ]
  for (const [code, status] of cases) {
    const service = fakeService({
      async listVariants() {
        const error = new Error(`boom-${code}`)
        error.code = code
        error.repair = { action: 'retry', label: 'Retry', detail: 'again' }
        throw error
      },
    })
    const res = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/variants', headers: apiHeaders() })
    assert.equal(res.statusCode, status, code)
    const body = res.json()
    assert.equal(body.ok, false)
    assert.equal(body.code, code)
    assert.equal(body.repair.action, 'retry')
  }
})

test('a malformed JSON body is a 400 and the body cap is a 413', async () => {
  const service = fakeService()
  const bad = await call(service, { method: 'POST', url: '/dsh-design-studio/api/projects/dsg-x/save', headers: apiHeaders(), body: '{not json' })
  assert.equal(bad.statusCode, 400)
  assert.equal(bad.json().code, 'invalid_input')

  const req = makeReq({ method: 'POST', headers: apiHeaders() })
  req[Symbol.asyncIterator] = async function* iterator() {
    yield Buffer.alloc(32, 0x61)
  }
  await assert.rejects(readJsonBody(req, 8), (error) => error.code === 'too_large')
})

test('the preview HTML route injects the bridge and base href (loopback only)', async () => {
  const service = fakeService()
  const res = await call(service, { url: '/dsh-design-studio/preview/dsg-x/v/a' })
  assert.equal(res.statusCode, 200)
  assert.match(res.headers['content-type'], /text\/html/u)
  const html = res.text()
  assert.match(html, /data-ds-bridge/u)
  assert.match(html, /<base href="\/dsh-design-studio\/preview\/dsg-x\/">/u)
  assert.match(html, /<h1>数据运营平台<\/h1>/u)
  assert.ok(html.indexOf('<base') < html.indexOf('data-ds-bridge'))

  const missing = await call(service, { url: '/dsh-design-studio/preview/dsg-x/v/zzz' })
  assert.equal(missing.statusCode, 404)

  const foreign = await call(service, { url: '/dsh-design-studio/preview/dsg-x/v/a', headers: { host: 'evil.com' } })
  assert.equal(foreign.statusCode, 403)
})

test('injectBaseHref is idempotent and works without a head', () => {
  const withHead = injectBaseHref('<html><head><title>x</title></head><body></body></html>', '/p/')
  assert.equal(withHead, '<html><head><base href="/p/"><title>x</title></head><body></body></html>')
  assert.equal(injectBaseHref(withHead, '/other/'), withHead)
  const noHead = injectBaseHref('<!DOCTYPE html><html><body>x</body></html>', '/p/')
  assert.match(noHead, /<!DOCTYPE html><base href="\/p\/">/u)
})

test('preview assets resolve inside design/ and reject traversal', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'dsg-panel-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const assetPath = join(dir, 'logo.png')
  await writeFile(assetPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  const service = fakeService()
  service.store.statFile = async (_id, rel) => (rel === 'design/assets/logo.png' ? { path: assetPath, size: 4, mtime: 'now' } : null)

  const ok = await call(service, { url: '/dsh-design-studio/preview/dsg-x/assets/logo.png' })
  assert.equal(ok.statusCode, 200)
  assert.equal(ok.headers['content-type'], 'image/png')
  assert.equal(ok.bytes().length, 4)

  const traversal = await call(service, { url: '/dsh-design-studio/preview/dsg-x/..%2F..%2Fsecret.png' })
  assert.equal(traversal.statusCode, 404)
})

test('the file route serves allow-listed files and forces attachments for exports', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'dsg-panel-file-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const filePath = join(dir, 'capture-1440.png')
  await writeFile(filePath, Buffer.from('png-bytes'))
  const service = fakeService()
  service.store.statFile = async (_id, rel) => (rel === 'checks/round-1/a/capture-1440.png' ? { path: filePath, size: 9, mtime: 'now' } : null)

  const ok = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/file?path=checks/round-1/a/capture-1440.png' })
  assert.equal(ok.statusCode, 200)
  assert.equal(ok.headers['content-type'], 'image/png')
  assert.equal(ok.text(), 'png-bytes')

  const asFile = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/file?path=checks/round-1/a/capture-1440.png' })
  assert.equal(asFile.headers['content-disposition'], undefined)

  const missingHeader = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/file?path=checks/round-1/a/capture-1440.png', headers: { host: 'evil.com' } })
  assert.equal(missingHeader.statusCode, 403)

  const traversal = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/file?path=../../secret.png' })
  assert.equal(traversal.statusCode, 404)

  const disallowed = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/file?path=run.exe' })
  assert.equal(disallowed.statusCode, 400)
  assert.ok(FILE_EXTENSIONS.includes('.png'))
})

test('the export-file route sends content-disposition: attachment', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'dsg-panel-export-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const filePath = join(dir, 'design-dsg-x-a-zip.zip')
  await writeFile(filePath, Buffer.from('PK'))
  const service = fakeService()
  service.store.statFile = async (_id, rel) => (rel === 'exports/design-dsg-x-a-zip.zip' ? { path: filePath, size: 2, mtime: 'now' } : null)

  const res = await call(service, { url: '/dsh-design-studio/api/projects/dsg-x/export-file?path=exports/design-dsg-x-a-zip.zip' })
  assert.equal(res.statusCode, 200)
  assert.match(String(res.headers['content-disposition']), /^attachment; filename="design-dsg-x-a-zip\.zip"$/u)
  assert.equal(res.headers['content-type'], 'application/zip')
})

test('registerPanel registers the prefix and wires the web server origin', () => {
  const service = { setWebServer: (value) => service.__webServer = value }
  const registered = []
  const webCtx = {
    webServer: {
      register: (options) => {
        registered.push(options)
        return () => {
          registered.push({ disposed: true })
        }
      },
    },
    effect(callback) {
      return callback()
    },
  }
  const ctx = {
    inject(services, callback) {
      assert.deepEqual(services, ['webServer'])
      return callback(webCtx)
    },
  }
  const dispose = registerPanel({ ctx, service, log: { warn() {} } })
  assert.equal(typeof dispose, 'function')
  assert.equal(registered.length, 1)
  assert.equal(registered[0].kind, 'prefix')
  assert.equal(registered[0].path, '/dsh-design-studio')
  assert.equal(service.__webServer, webCtx.webServer)
  dispose()
  assert.equal(service.__webServer, null)
})

test('registerPanel is inert without ctx.inject or a webServer', () => {
  assert.equal(registerPanel({}), null)
  const ctx = { inject: (_services, callback) => callback({}) }
  assert.equal(registerPanel({ ctx, service: {} }), null)
})

test('serverOrigin derives the origin from getOrigin or a port', () => {
  assert.equal(serverOrigin({ getOrigin: () => 'http://127.0.0.1:60809/' }), 'http://127.0.0.1:60809')
  assert.equal(serverOrigin({ port: 6001 }), 'http://127.0.0.1:6001')
  assert.equal(serverOrigin(null), '')
})
