/**
 * Unit tests for lib/tools.js — the ten agent-facing tools with a fake service.
 * Run: node --test test/unit/tools.test.mjs
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTools } from '../../lib/tools.js'

/** The ten frozen tool names (CONTRACT §3/§8). */
const TOOL_NAMES = [
  'design_start',
  'design_intake',
  'design_context',
  'design_system',
  'design_scaffold',
  'design_check',
  'design_tweak',
  'design_comments',
  'design_export',
  'design_projects',
  'design_serve',
]

/** A check record in the frozen service shape. */
function checkFixture() {
  return {
    round: 1,
    at: '2026-11-08T01:02:03.000Z',
    projectId: 'dsg-20261108-010203-ab12',
    variant: 'all',
    requestedWidths: [1440, 768],
    score: 91,
    grade: 'A',
    pass: true,
    durationMs: 1234,
    counts: { critical: 0, high: 1, medium: 1, low: 0 },
    issues: 2,
    variants: [
      {
        variant: 'a',
        file: 'design/a.html',
        score: 91,
        grade: 'A',
        pass: true,
        categories: [
          {
            id: 'a11y',
            label: '无障碍',
            score: 88,
            weight: 0.35,
            findings: [{ code: 'contrast', severity: 'high', message: '对比度不足', fix: '加深正文颜色', selector: 'p' }],
          },
        ],
        viewports: [
          { width: 1440, score: 92, findings: [] },
          { width: 768, score: 90, findings: [] },
        ],
        findings: [{ category: 'a11y', code: 'contrast', severity: 'high', message: '对比度不足', fix: '加深正文颜色', selector: 'p' }],
        screenshots: [
          { width: 1440, path: 'checks/round-1/a/capture-1440.png' },
          { width: 768, path: 'checks/round-1/a/capture-768.png' },
        ],
        screens: [],
        health: { consoleErrors: [], failedRequests: [] },
      },
    ],
  }
}

/**
 * A fake service. `jobs.get` walks through the given sequence of job snapshots.
 */
function fakeService(overrides = {}) {
  const state = { calls: [], jobReads: 0 }
  let jobSequence = [{ id: 'job-1', status: 'done', result: { round: 1, score: 91 } }]
  const base = {
    state,
    setJobSequence(sequence) {
      jobSequence = sequence
      state.jobReads = 0
    },
    jobs: {
      get(id) {
        state.jobReads += 1
        const index = Math.min(state.jobReads - 1, jobSequence.length - 1)
        const snapshot = jobSequence[index]
        return snapshot ? { id, ...snapshot } : null
      },
    },
    async createProject(input) {
      state.calls.push(['createProject', input])
      return { id: 'dsg-20261108-010203-ab12', name: input.name || '未命名设计', kind: input.kind || 'web', viewports: [1440, 768, 375] }
    },
    async intakeQuestions() {
      return {
        groups: [{ id: 'start', title: '开始：做什么', questions: [{ id: 'kind', label: '类型', type: 'single', options: ['web'], required: true, allowSkip: false, hint: 'hint' }] }],
        questions: [{ id: 'kind', label: '类型', type: 'single', options: ['web'], required: true, allowSkip: false, hint: 'hint', group: 'start' }],
      }
    },
    async saveIntake(id, patch, options) {
      state.calls.push(['saveIntake', id, patch, options])
      return { intake: { goal: '', audience: '', ...patch, source: options?.source ?? '' }, filled: ['goal'], missing: ['audience'], score: 30 }
    },
    async updateBrief(id, brief) {
      state.calls.push(['updateBrief', id, brief])
      return { goal: '', audience: '', layout: '', content: '', constraints: '', ...brief }
    },
    async projectDetail(id) {
      state.calls.push(['projectDetail', id])
      return {
        project: {
          id,
          name: '运营仪表盘',
          kind: 'web',
          status: 'designed',
          brief: { goal: '打磨数据产品' },
          intake: { goal: '打磨数据产品', audience: '运营团队', variations: { count: 3, dimensions: ['visual'] } },
          viewports: [1440, 768, 375],
          bestScore: 91,
        },
        variants: [
          { id: 'a', file: 'design/a.html', label: '规范版', bytes: 1200, score: 91 },
          { id: 'b', file: 'design/b.html', label: '进阶版', bytes: 1200, score: null },
        ],
        system: { system: { name: '品牌', tokensPath: 'system/tokens.json' }, tokens: { name: '品牌' }, doc: '# doc' },
        checks: [{ round: 1, score: 91, grade: 'A' }],
        latestCheck: { round: 1, score: 91, grade: 'A', variants: [{ variant: 'a', score: 91, grade: 'A' }], issues: 2 },
        versions: [{ id: 'v-1', label: '基线', files: 3, at: '2026-11-08T01:00:00.000Z' }],
        exports: [{ kind: 'zip', file: 'exports/x.zip', bytes: 10, at: '2026-11-08T01:00:00.000Z' }],
        job: null,
        browser: { available: true, product: 'Chrome', path: '' },
      }
    },
    async listVariants() {
      return [{ id: 'a', file: 'design/a.html', label: '规范版', bytes: 1, mtime: '', selected: false, score: 91 }]
    },
    async importContext(id, input) {
      state.calls.push(['importContext', id, input])
      return {
        evidence: { id: 'ev-1', kind: input.kind, ref: input.value, at: '2026-11-08T01:00:00.000Z', note: input.note ?? '', summary: `summary ${input.kind}`, files: ['context/x.png'] },
        tokens: { name: 'URL 系统', color: { ink: '#111111' }, font: { body: {} }, size: { scale: [12, 16] }, space: { scale: [4, 8] }, radius: { scale: [8] } },
        system: input.adoptSystem ? { name: 'URL 系统', source: { kind: 'url' }, updatedAt: '2026-11-08T01:00:00.000Z' } : null,
      }
    },
    async getSystem() {
      return { system: { name: '品牌', tokensPath: 'system/tokens.json' }, tokens: { name: '品牌', color: { ink: '#111111' } }, doc: '# 品牌系统' }
    },
    async setSystem(id, input) {
      state.calls.push(['setSystem', id, input])
      return { system: { name: '品牌', source: { kind: 'manual' }, updatedAt: '2026-11-08T01:00:00.000Z' }, tokens: { name: '品牌', color: { ink: '#111111' } }, doc: input.doc ?? '# 品牌系统' }
    },
    startCheck(id, options) {
      state.calls.push(['startCheck', id, options])
      return { id: 'job-1', status: 'running' }
    },
    async checkRound(id, round) {
      state.calls.push(['checkRound', id, round])
      return checkFixture()
    },
    async latestCheck() {
      return { round: 1, score: 91, grade: 'A' }
    },
    async listChecks() {
      return [{ round: 1, score: 91, grade: 'A' }]
    },
    async readTweak(id, file) {
      state.calls.push(['readTweak', id, file])
      return { file: `design/${file || 'a.html'}`, tweaks: { primaryColor: '#b4552f', fontSize: 16 } }
    },
    async patchTweak(id, input) {
      state.calls.push(['patchTweak', id, input])
      return { file: `design/${input.file || 'a.html'}`, tweaks: { primaryColor: '#8a3d20', fontSize: 16 }, changed: true }
    },
    async listComments() {
      return [
        { id: 'c-1', variant: 'a', selector: '#hero', note: '标题太大', element: { tag: 'h1' }, rect: { x: 0, y: 0, w: 100, h: 20 }, createdAt: '2026-11-08T01:00:00.000Z', resolvedAt: null, reply: '' },
      ]
    },
    async resolveComment(id, input) {
      state.calls.push(['resolveComment', id, input])
      return { id: input.id, resolvedAt: '2026-11-08T02:00:00.000Z', reply: input.reply ?? '' }
    },
    async exportDesign(id, input) {
      state.calls.push(['exportDesign', id, input])
      return { export: { kind: input.kind, at: '2026-11-08T01:00:00.000Z', file: 'exports/design-dsg-x.zip', bytes: 2048, url: 'http://127.0.0.1:60809/dsh-design-studio/api/projects/dsg-x/export-file?path=exports%2Fdesign-dsg-x.zip' } }
    },
    async listExports() {
      return []
    },
    async listProjects() {
      return [{ id: 'dsg-20261108-010203-ab12', name: '运营仪表盘', kind: 'web', status: 'ready', bestScore: 91, updatedAt: '2026-11-08T01:00:00.000Z', variants: 2, variantIds: ['a', 'b'], comments: 1 }]
    },
    async deleteProject(id) {
      state.calls.push(['deleteProject', id])
      return { id, removed: true }
    },
    async saveVersion(id, label) {
      state.calls.push(['saveVersion', id, label])
      return { id: 'v-2', label: label ?? '版本 2', at: '2026-11-08T01:00:00.000Z', files: 3 }
    },
    async listVersions() {
      return [{ id: 'v-1', label: '基线', files: 3 }]
    },
    async restoreVersion(id, versionId) {
      state.calls.push(['restoreVersion', id, versionId])
      return { restored: versionId, files: 3, design: true, system: true }
    },
    async scaffold(id, input) {
      state.calls.push(['scaffold', id, input])
      return { file: `design/${input.target ?? 'browser.html'}`, bytes: 128 }
    },
    async preview(id, variant) {
      state.calls.push(['preview', id, variant])
      return { url: 'http://127.0.0.1:45678/a.html', origin: 'http://127.0.0.1:45678', variant: variant ?? 'a', sameOrigin: false }
    },
    paths(id) {
      return { root: `C:/projects/${id}`, design: `C:/projects/${id}/design` }
    },
  }
  return { ...base, ...overrides }
}

/** Build the tools once per fake service. */
function buildTools(service) {
  const tools = createTools({ service, log: { warn() {} } })
  const byName = new Map(tools.map((tool) => [tool.name, tool]))
  return {
    tools,
    get(name) {
      const tool = byName.get(name)
      if (!tool) throw new Error(`no tool ${name}`)
      return tool
    },
  }
}

test('exposes exactly the ten frozen tools with bounded descriptions and params', () => {
  const service = fakeService()
  const { tools } = buildTools(service)
  assert.equal(tools.length, 11)
  assert.deepEqual(tools.map((tool) => tool.name).sort(), [...TOOL_NAMES].sort())
  for (const tool of tools) {
    assert.equal(typeof tool.description, 'string', `${tool.name} description`)
    assert.ok(tool.description.length > 200, `${tool.name} description is too short`)
    assert.ok(tool.description.length <= 1200, `${tool.name} description is too long (${tool.description.length})`)
    assert.equal(tool.parameters.type, 'object', `${tool.name} parameters.type`)
    assert.equal(tool.parameters.additionalProperties, false, `${tool.name} additionalProperties`)
    assert.equal(typeof tool.parameters.properties, 'object', `${tool.name} properties`)
    assert.ok(tool.parameters.properties && Object.keys(tool.parameters.properties).length > 0)
    assert.equal(typeof tool.output.render, 'function')
    assert.equal(typeof tool.execute, 'function')
    assert.equal(typeof tool.isConcurrencySafe, 'function')
    assert.equal(typeof tool.isConcurrencySafe(), 'boolean')
    assert.ok(Number.isFinite(tool.timeoutMs) && tool.timeoutMs > 0, `${tool.name} timeoutMs`)
    for (const [name, schema] of Object.entries(tool.parameters.properties)) {
      assert.equal(typeof schema, 'object', `${tool.name}.${name} schema`)
      assert.ok(typeof schema.description === 'string' && schema.description.length > 0, `${tool.name}.${name} description`)
    }
  }
  const big = { ok: true, blob: 'x'.repeat(200000) }
  const rendered = tools[0].output.render({}, big)
  assert.equal(Array.isArray(rendered), true)
  assert.equal(rendered[0].type, 'text')
  assert.ok(Buffer.byteLength(rendered[0].text, 'utf8') <= 64 * 1024 + 100)
})

test('design_start creates a project and returns the dir, variants and next step', async () => {
  const service = fakeService()
  const { get } = buildTools(service)
  const result = await get('design_start').execute({ name: '运营仪表盘', kind: 'web', brief: { goal: '打磨数据产品' }, viewports: [1440, 768] })
  assert.equal(result.ok, true)
  assert.equal(result.projectId, 'dsg-20261108-010203-ab12')
  assert.equal(result.kind, 'web')
  assert.equal(result.dir, 'C:/projects/dsg-20261108-010203-ab12')
  assert.deepEqual(result.variants.map((row) => row.id), ['a', 'b'])
  assert.match(result.next, /design\/a\.html/u)
  const call = service.state.calls.find((entry) => entry[0] === 'createProject')
  assert.equal(call[1].scaffold, true)
})

test('design_start turns a service failure into a structured failure', async () => {
  const service = fakeService({
    createProject: async () => {
      const error = new Error('the store already holds 200 projects')
      error.code = 'too_large'
      error.repair = { action: 'delete-project', label: 'Delete a project first', detail: 'Use design_projects action="delete".' }
      throw error
    },
  })
  const { get } = buildTools(service)
  const result = await get('design_start').execute({ name: 'x' })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'too_large')
  assert.equal(result.repair.action, 'delete-project')
})

test('design_start forwards intake and advertises the intake flow', async () => {
  const captured = {}
  const service = fakeService({
    async createProject(input) {
      captured.input = input
      return { id: 'dsg-intake', name: input.name, kind: input.kind ?? input.intake?.kind ?? 'web', viewports: [1440, 768, 375], intake: input.intake }
    },
  })
  const { get } = buildTools(service)
  const tool = get('design_start')
  assert.match(tool.description, /design_intake/u)
  assert.match(tool.description, /ask_user_question/u)
  const intakeParam = tool.parameters.properties.intake
  assert.ok(intakeParam, 'design_start exposes an intake parameter')
  assert.equal(intakeParam.type, 'object')
  const result = await tool.execute({
    name: '向导项目',
    intake: { goal: '做一个落地页', audience: '潜在客户', contextSources: ['url'], variations: { count: 3, dimensions: ['visual'] }, deliverables: ['html'], success: ['check>=90'] },
  })
  assert.equal(result.ok, true)
  assert.equal(captured.input.intake.goal, '做一个落地页')
  assert.equal(captured.input.intake.contextSources[0], 'url')
  assert.ok(Number.isFinite(result.intakeScore) && result.intakeScore > 0, 'intakeScore reports completeness')
})

test('design_intake without a project returns the question set for ask_user_question', async () => {
  const service = fakeService()
  const { get } = buildTools(service)
  const result = await get('design_intake').execute({})
  assert.equal(result.ok, true)
  assert.equal(result.groups.length, 1)
  assert.equal(result.questions.length, 1)
  assert.equal(result.questions[0].group, 'start')
  assert.match(result.howTo, /ask_user_question/u)
  assert.equal(service.state.calls.some((entry) => entry[0] === 'saveIntake'), false, 'no project → nothing is saved')
})

test('design_intake with projectId saves answers and reports what is missing', async () => {
  const service = fakeService()
  const { get } = buildTools(service)
  const result = await get('design_intake').execute({ projectId: 'dsg-x', answers: { goal: '做一个落地页' } })
  assert.equal(result.ok, true)
  assert.equal(result.projectId, 'dsg-x')
  assert.equal(result.intake.goal, '做一个落地页')
  assert.equal(result.intake.source, 'agent')
  assert.deepEqual(result.filled, ['goal'])
  assert.deepEqual(result.missing, ['audience'])
  assert.equal(result.score, 30)
  assert.match(result.next, /missing fields/u)
  const callRow = service.state.calls.find((entry) => entry[0] === 'saveIntake')
  assert.equal(callRow[3].source, 'agent')
})

test('design_intake validates its arguments and surfaces save failures', async () => {
  const service = fakeService()
  const { get } = buildTools(service)
  const noAnswers = await get('design_intake').execute({ projectId: 'dsg-x' })
  assert.equal(noAnswers.ok, false)
  assert.equal(noAnswers.code, 'invalid_input')
  assert.equal(noAnswers.repair.action, 'fix-intake')

  const failing = fakeService({
    async saveIntake() {
      const error = new Error('intake must be an object')
      error.code = 'invalid_input'
      error.repair = { action: 'fix-intake', label: 'Fix the intake', detail: 'Pass an intake object.' }
      throw error
    },
  })
  const failed = await buildTools(failing).get('design_intake').execute({ projectId: 'dsg-x', answers: { goal: 42 } })
  assert.equal(failed.ok, false)
  assert.equal(failed.code, 'invalid_input')
  assert.equal(failed.repair.action, 'fix-intake')
})

test('design_context imports context and reports tokens', async () => {
  const service = fakeService()
  const { get } = buildTools(service)
  const result = await get('design_context').execute({ projectId: 'dsg-x', kind: 'url', value: 'https://example.com', adoptSystem: true })
  assert.equal(result.ok, true)
  assert.equal(result.evidence.kind, 'url')
  assert.equal(result.tokens.colors, 1)
  assert.equal(result.adoptedSystem, true)
  const missing = await get('design_context').execute({ kind: 'url', value: 'https://example.com' })
  assert.equal(missing.ok, false)
  assert.equal(missing.code, 'invalid_input')
})

test('design_system gets, sets and rejects unknown actions', async () => {
  const service = fakeService()
  const { get } = buildTools(service)
  const got = await get('design_system').execute({ projectId: 'dsg-x' })
  assert.equal(got.ok, true)
  assert.equal(got.tokens.name, '品牌')
  assert.match(got.doc, /品牌系统/u)
  const set = await get('design_system').execute({ projectId: 'dsg-x', action: 'set', tokens: { name: '品牌' }, doc: '# 新文档' })
  assert.equal(set.ok, true)
  assert.equal(set.system.source.kind, 'manual')
  const bad = await get('design_system').execute({ projectId: 'dsg-x', action: 'wipe' })
  assert.equal(bad.ok, false)
  assert.equal(bad.code, 'invalid_input')
})

test('design_scaffold writes a scaffold into the project design folder', async () => {
  const service = fakeService()
  const { get } = buildTools(service)
  const written = await get('design_scaffold').execute({ projectId: 'dsg-x', id: 'tweaks', target: 'b.html' })
  assert.equal(written.ok, true)
  assert.equal(written.file, 'design/b.html')
  assert.ok(written.bytes > 0)
  const call = service.state.calls.find((entry) => entry[0] === 'scaffold')
  assert.equal(call[2].id, 'tweaks')

  // Content-only mode returns either HTML (when a scaffold library is loaded)
  // or a structured not_ready failure (before content-display lands).
  const content = await get('design_scaffold').execute({ id: 'browser' })
  if (content.ok) {
    assert.equal(typeof content.html, 'string')
    assert.ok(content.html.length > 0)
  } else {
    assert.equal(content.code, 'not_ready')
    assert.equal(typeof content.repair.action, 'string')
  }
  const bad = await get('design_scaffold').execute({})
  assert.equal(bad.ok, false)
  assert.equal(bad.code, 'invalid_input')
})

test('design_check waits for the job and returns scores, categories and screenshots', async () => {
  const service = fakeService()
  service.setJobSequence([{ status: 'running', progress: 'probing' }, { status: 'done', result: { round: 1, score: 91 } }])
  const { get } = buildTools(service)
  const result = await get('design_check').execute({ projectId: 'dsg-x', variant: 'all' })
  assert.equal(result.ok, true)
  assert.equal(result.round, 1)
  assert.equal(result.score, 91)
  assert.equal(result.grade, 'A')
  assert.equal(result.pass, true)
  assert.equal(result.variants.length, 1)
  assert.equal(result.variants[0].categories[0].id, 'a11y')
  assert.equal(result.variants[0].screenshots[0].path, 'checks/round-1/a/capture-1440.png')
  assert.match(result.variants[0].screenshots[0].file, /checks\/round-1\/a\/capture-1440\.png$/u)
  assert.equal(result.topIssues[0].severity, 'high')
  assert.match(result.next, /design_check/u)
  assert.ok(result.issueCount >= 1)
})

test('design_check reports a no_browser job failure with a repair hint', async () => {
  const service = fakeService()
  service.setJobSequence([{ status: 'failed', code: 'no_browser', error: 'no Chrome or Edge found' }])
  const { get } = buildTools(service)
  const result = await get('design_check').execute({ projectId: 'dsg-x' })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'no_browser')
  assert.match(result.error, /no Chrome or Edge/u)
  assert.equal(result.repair.action, 'install-browser')
})

test('design_tweak gets, sets and validates the action', async () => {
  const service = fakeService()
  const { get } = buildTools(service)
  const got = await get('design_tweak').execute({ projectId: 'dsg-x', file: 'a.html' })
  assert.equal(got.ok, true)
  assert.equal(got.tweaks.primaryColor, '#b4552f')
  const set = await get('design_tweak').execute({ projectId: 'dsg-x', action: 'set', key: 'primaryColor', value: '#8a3d20' })
  assert.equal(set.ok, true)
  assert.equal(set.changed, true)
  const noKey = await get('design_tweak').execute({ projectId: 'dsg-x', action: 'set', value: 12 })
  assert.equal(noKey.ok, false)
  assert.equal(noKey.code, 'invalid_input')
  const bad = await get('design_tweak').execute({ projectId: 'dsg-x', action: 'nuke' })
  assert.equal(bad.ok, false)
  assert.equal(bad.code, 'invalid_input')
})

test('design_comments lists, resolves and validates ids', async () => {
  const service = fakeService()
  const { get } = buildTools(service)
  const listed = await get('design_comments').execute({ projectId: 'dsg-x' })
  assert.equal(listed.ok, true)
  assert.equal(listed.total, 1)
  assert.equal(listed.open, 1)
  const resolved = await get('design_comments').execute({ projectId: 'dsg-x', action: 'resolve', commentId: 'c-1', reply: '已修' })
  assert.equal(resolved.ok, true)
  assert.equal(resolved.comment.reply, '已修')
  const missing = await get('design_comments').execute({ projectId: 'dsg-x', action: 'resolve' })
  assert.equal(missing.ok, false)
  assert.equal(missing.code, 'invalid_input')
})

test('design_export returns the file and a download url', async () => {
  const service = fakeService()
  const { get } = buildTools(service)
  const result = await get('design_export').execute({ projectId: 'dsg-x', kind: 'zip', variant: 'a' })
  assert.equal(result.ok, true)
  assert.equal(result.kind, 'zip')
  assert.match(result.file, /^exports\//u)
  assert.ok(result.bytes > 0)
  assert.match(result.url, /export-file/u)
  const missing = await get('design_export').execute({ projectId: 'dsg-x' })
  assert.equal(missing.ok, false)
  assert.equal(missing.code, 'invalid_input')
})

test('design_export surfaces an exporter failure', async () => {
  const service = fakeService({
    exportDesign: async () => {
      const error = new Error('a headless browser is required for pdf export')
      error.code = 'no_browser'
      throw error
    },
  })
  const { get } = buildTools(service)
  const result = await get('design_export').execute({ projectId: 'dsg-x', kind: 'pdf' })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'no_browser')
  assert.equal(result.repair.action, 'install-browser')
})

test('design_projects supports every action', async () => {
  const service = fakeService()
  const { get } = buildTools(service)
  const tool = get('design_projects')

  const list = await tool.execute({ action: 'list' })
  assert.equal(list.ok, true)
  assert.equal(list.projects.length, 1)
  assert.equal(list.projects[0].bestScore, 91)

  const got = await tool.execute({ action: 'get', projectId: 'dsg-x' })
  assert.equal(got.ok, true)
  assert.equal(got.project.intake.goal, '打磨数据产品')
  assert.equal(got.project.variants.length, 2)
  assert.equal(got.project.latestCheck.score, 91)
  assert.match(got.project.dir, /dsg-x/u)

  const deleted = await tool.execute({ action: 'delete', projectId: 'dsg-x' })
  assert.equal(deleted.removed, true)

  const saved = await tool.execute({ action: 'save-version', projectId: 'dsg-x', label: '交付前' })
  assert.equal(saved.version.id, 'v-2')
  assert.equal(saved.version.label, '交付前')

  const versions = await tool.execute({ action: 'versions', projectId: 'dsg-x' })
  assert.equal(versions.versions.length, 1)

  const restored = await tool.execute({ action: 'restore', projectId: 'dsg-x', versionId: 'v-1' })
  assert.equal(restored.restored.restored, 'v-1')

  const briefed = await tool.execute({ action: 'set-brief', projectId: 'dsg-x', brief: { goal: '做一个运营仪表盘', audience: '运营团队' } })
  assert.equal(briefed.ok, true)
  assert.equal(briefed.brief.goal, '做一个运营仪表盘')
  assert.equal(briefed.brief.audience, '运营团队')
  const briefCall = service.state.calls.find((entry) => entry[0] === 'updateBrief')
  assert.equal(briefCall[1], 'dsg-x')

  const noBrief = await tool.execute({ action: 'set-brief', projectId: 'dsg-x' })
  assert.equal(noBrief.code, 'invalid_input')
  const noRestore = await tool.execute({ action: 'restore', projectId: 'dsg-x' })
  assert.equal(noRestore.code, 'invalid_input')
  const noProject = await tool.execute({ action: 'get' })
  assert.equal(noProject.code, 'invalid_input')
  const unknown = await tool.execute({ action: 'explode', projectId: 'dsg-x' })
  assert.equal(unknown.code, 'invalid_input')

  // The tool schema advertises set-brief and its five fields.
  const briefSchema = tool.parameters.properties.brief
  assert.ok(briefSchema)
  assert.deepEqual(Object.keys(briefSchema.properties).sort(), ['audience', 'constraints', 'content', 'goal', 'layout'])
  assert.ok(tool.parameters.properties.action.enum.includes('set-brief'))
  assert.match(tool.description, /set-brief/u)
})

test('design_projects set-brief surfaces brief validation failures', async () => {
  const service = fakeService({
    async updateBrief() {
      const error = new Error('brief.goal must be a string')
      error.code = 'invalid_input'
      error.repair = { action: 'fix-brief', label: 'Fix brief.goal', detail: 'Every brief field must be a string.' }
      throw error
    },
  })
  const result = await buildTools(service).get('design_projects').execute({ action: 'set-brief', projectId: 'dsg-x', brief: { goal: 42 } })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'invalid_input')
  assert.match(result.error, /brief\.goal/u)
  assert.equal(result.repair.action, 'fix-brief')
})

test('design_serve returns the preview url and sameOrigin flag', async () => {
  const service = fakeService()
  const { get } = buildTools(service)
  const result = await get('design_serve').execute({ projectId: 'dsg-x' })
  assert.equal(result.ok, true)
  assert.match(result.url, /^http:\/\/127\.0\.0\.1:45678\/a\.html$/u)
  assert.equal(result.sameOrigin, false)

  const failing = fakeService({
    preview: async () => {
      const error = new Error('no preview server available')
      error.code = 'no_preview'
      throw error
    },
  })
  const failed = await buildTools(failing).get('design_serve').execute({ projectId: 'dsg-x' })
  assert.equal(failed.ok, false)
  assert.equal(failed.code, 'no_preview')
  assert.equal(failed.repair.action, 'open-browser')
})

test('unexpected errors never reach the model', async () => {
  const service = fakeService({
    listComments: async () => {
      throw new TypeError('boom')
    },
  })
  const { get } = buildTools(service)
  const result = await get('design_comments').execute({ projectId: 'dsg-x' })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'failed')
  assert.match(result.error, /boom/u)
  assert.equal(typeof result.repair.action, 'string')
})

test('tool arguments are tolerated when missing or not an object', async () => {
  const service = fakeService()
  const { get } = buildTools(service)
  const result = await get('design_check').execute(undefined)
  assert.equal(result.ok, false)
  assert.equal(result.code, 'invalid_input')
})
