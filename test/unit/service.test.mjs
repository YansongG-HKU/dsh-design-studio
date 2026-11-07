/**
 * Unit tests for lib/service.js — orchestration with injected fake deps.
 * A real store writes into a throwaway folder; probe/audit/export/tokens/
 * scaffolds/preview are fakes, so no browser and no network are needed.
 * Run: node --test test/unit/service.test.mjs
 */

import assert from 'node:assert/strict'
import { readFile, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createStore } from '../../lib/store.js'
import { createService } from '../../lib/service.js'

/** A design file with the frozen TWEAKS block. */
const DESIGN_HTML = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>测试设计</title></head>
<body><h1>数据运营平台</h1><p>真实文案，不是占位符。</p>
<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{"primaryColor":"#b4552f","fontSize":16,"radius":8,"dark":false}/*EDITMODE-END*/;
window.__dsApplyTweaks = function (edits) {};
</script></body></html>`

/** Poll a job until it settles. */
async function waitJob(service, job, timeoutMs = 8000) {
  const started = Date.now()
  for (;;) {
    const current = service.jobs.get(job.id)
    if (!current) throw new Error(`job ${job.id} vanished`)
    if (current.status !== 'running') return current
    if (Date.now() - started > timeoutMs) throw new Error(`job ${job.id} did not settle`)
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

/** Deterministic fake dependencies; `state` records what was called. */
function fakeDeps(state) {
  return {
    probeDesign: async ({ url, widths, dir }) => {
      state.probes += 1
      state.probeCalls.push({ url, widths: [...widths] })
      const pages = []
      for (const width of widths) {
        const file = `capture-${width}.png`
        await writeFile(join(dir, file), 'fake-png')
        pages.push({ width, height: 900, screenshot: file, metrics: {} })
      }
      return {
        ok: true,
        url,
        capturedAt: new Date().toISOString(),
        durationMs: 3,
        pages,
        screens: [],
        health: { consoleErrors: [], failedRequests: [] },
      }
    },
    auditDesign: ({ viewports }) => {
      state.audits += 1
      return {
        score: 91,
        grade: 'A',
        pass: true,
        categories: [
          {
            id: 'a11y',
            label: '无障碍',
            score: 95,
            weight: 0.35,
            findings: [
              { code: 'contrast', severity: 'medium', message: '正文对比度不足', fix: '把正文颜色加深到 4.5:1 以上', selector: 'p' },
              { code: 'alt', severity: 'low', message: '缺少替代文本', fix: '给图标补 aria-label' },
            ],
          },
        ],
        viewports: (Array.isArray(viewports) ? viewports : []).map((width) => ({ width, score: 90, findings: [] })),
        counts: { critical: 0, high: 0, medium: 1, low: 1 },
        screens: [],
      }
    },
    exportDesign: async ({ variant, kind, projectPaths }) => {
      state.exports += 1
      const file = `exports/design-${variant}-${kind}.txt`
      await writeFile(join(projectPaths.exports, `design-${variant}-${kind}.txt`), 'exported')
      return { file, bytes: 8, mime: 'text/plain' }
    },
    tokens: {
      normalizeTokens: (raw) => ({
        name: typeof raw.name === 'string' ? raw.name : 'design-system',
        color: raw.color ?? {},
        font: raw.font ?? {},
        size: raw.size ?? { scale: [] },
        space: raw.space ?? { scale: [] },
        radius: raw.radius ?? { scale: [] },
        layout: raw.layout ?? {},
        notes: raw.notes ?? '',
      }),
      tokensFromUrl: async () => ({ name: 'URL 系统', color: { ink: '#111111' } }),
      scanRepo: async () => ({ tokens: { name: 'Repo 系统', color: { ink: '#222222' } }, files: ['src/styles.css', 'tailwind.config.js'] }),
      tokensFromImageBuffer: async () => ({ name: '图片调色板', palette: [{ hex: '#112233', ratio: 0.6 }] }),
      emptyTokens: () => ({ name: 'empty' }),
    },
    scaffolds: {
      scaffoldContent: (id) => `<!DOCTYPE html><html><body><h1>${id} scaffold</h1></body></html>`,
      writeScaffold: async ({ designDir, id, file }) => {
        const content = `<!DOCTYPE html><html><body>${id}</body></html>`
        await writeFile(join(designDir, file), content)
        return { file, bytes: Buffer.byteLength(content) }
      },
    },
    preview: {
      startPreview: async ({ rootDir }) => {
        state.previewStarts += 1
        const info = await stat(rootDir)
        assert.equal(info.isDirectory(), true)
        return {
          url: 'http://127.0.0.1:45678/',
          port: 45678,
          dispose: async () => {
            state.previewDisposed += 1
          },
        }
      },
      closeAllPreviews: async () => {},
    },
  }
}

/** Build a service on a throwaway store, with deterministic fakes. */
async function makeService(t, overrides = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'dsg-service-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const store = createStore({ dir })
  const state = { probes: 0, audits: 0, exports: 0, previewStarts: 0, previewDisposed: 0, probeCalls: [] }
  const deps = { ...fakeDeps(state), ...overrides }
  const service = createService({
    store,
    pool: { status: async () => ({ available: true, product: 'Chrome/123', path: '' }) },
    config: {},
    log: { warn() {} },
    deps,
  })
  await service.init()
  return { dir, store, service, state }
}

/** Create a small project with design/a.html in place. */
async function makeProject(service, extra = {}) {
  const project = await service.createProject({ name: '运营仪表盘', kind: 'web', scaffold: false, ...extra })
  await service.saveVariant(project.id, { variant: 'a', html: DESIGN_HTML })
  return project
}

test('createProject seeds folders, DESIGN.md and the kind scaffold', async (t) => {
  const { service, store } = await makeService(t)
  const project = await service.createProject({
    name: '运营仪表盘',
    kind: 'web',
    brief: { goal: '打磨数据产品', audience: '运营团队' },
    viewports: [1200, 800],
  })
  assert.equal(project.kind, 'web')
  assert.deepEqual(project.viewports, [1200, 800])
  assert.equal(project.status, 'draft')
  assert.equal(project.schemaVersion, 1)
  assert.match((await store.readText(project.id, 'design/a.html')) ?? '', /browser scaffold/u)
  assert.match((await store.readText(project.id, 'system/DESIGN.md')) ?? '', /运营仪表盘/u)

  const detail = await service.projectDetail(project.id)
  assert.equal(detail.variants.length, 1)
  assert.equal(detail.variants[0].id, 'a')
  assert.equal(detail.variants[0].file, 'design/a.html')
  assert.equal(detail.variants[0].label, '规范版')
  assert.equal(detail.latestCheck, null)
  assert.equal(detail.browser.available, true)

  const overview = await service.overview()
  assert.equal(overview.counts.projects, 1)
  assert.equal(overview.counts.checked, 0)
  assert.equal(overview.version, '1.3.0')

  const rows = await service.listProjects()
  assert.equal(rows.length, 1)
  assert.equal(rows[0].variants, 1)
  assert.deepEqual(rows[0].variantIds, ['a'])

  await assert.rejects(service.createProject({ kind: 'hologram' }), (error) => error.code === 'invalid_input')
})

test('updateBrief validates, caps and persists the five brief fields', async (t) => {
  const { service, store } = await makeService(t)
  const project = await service.createProject({ name: '需求项目', brief: { goal: '旧目标' } })

  const updated = await service.updateBrief(project.id, {
    goal: '  做一个运营仪表盘  ',
    audience: '运营团队',
    layout: '左栏导航 + 数据卡片',
    content: '真实文案，不是占位符',
    constraints: '品牌暖色',
    ignored: 'dropped',
  })
  assert.equal(updated.goal, '做一个运营仪表盘')
  assert.deepEqual(Object.keys(updated), ['goal', 'audience', 'layout', 'content', 'constraints'])
  assert.equal(updated.ignored, undefined, 'unknown keys are dropped')
  const stored = await store.readProject(project.id)
  assert.deepEqual(stored.brief, updated)
  assert.ok(new Date(stored.updatedAt).getTime() >= new Date(project.updatedAt).getTime())

  // Partial updates keep the other fields.
  const partial = await service.updateBrief(project.id, { constraints: '深色主题' })
  assert.equal(partial.constraints, '深色主题')
  assert.equal(partial.goal, '做一个运营仪表盘')

  // Every field is capped at 2000 characters.
  const capped = await service.updateBrief(project.id, { goal: 'x'.repeat(3000) })
  assert.equal(capped.goal.length, 2000)

  // Non-object input and non-string fields are typed failures with a repair.
  for (const bad of [null, 'not an object', 42, ['goal']]) {
    await assert.rejects(service.updateBrief(project.id, bad), (error) => error.code === 'invalid_input' && typeof error.repair?.action === 'string')
  }
  await assert.rejects(service.updateBrief(project.id, { goal: 42 }), (error) => error.code === 'invalid_input')
  await assert.rejects(service.updateBrief('dsg-missing', { goal: 'x' }), (error) => error.code === 'not_found')
})

test('createProject accepts an intake, derives the kind and writes the DESIGN.md intake section', async (t) => {
  const { service, store } = await makeService(t)
  const intake = {
    kind: 'deck',
    goal: '三页产品发布演示稿',
    audience: '媒体与潜在客户',
    contextSources: ['existing-design-system', 'screenshots'],
    variations: { count: 4, dimensions: ['visual', 'motion'], range: '基础→进阶' },
    tweaks: ['color', 'copy'],
    deliverables: ['pdf', 'pptx'],
    responsive: ['desktop'],
    success: ['check>=90'],
    source: 'wizard',
  }
  const project = await service.createProject({ name: '发布 deck', intake })
  assert.equal(project.kind, 'deck', 'kind falls back to intake.kind')
  assert.equal(project.intake.goal, '三页产品发布演示稿')
  assert.equal(project.intake.source, 'wizard')
  assert.deepEqual(project.intake.variations, { count: 4, dimensions: ['visual', 'motion'], range: '基础→进阶' })
  assert.equal(typeof project.intake.completedAt, 'string', 'complete intake gets a completedAt stamp')
  assert.equal(project.brief.goal, '三页产品发布演示稿', 'an empty brief inherits the intake goal')
  const doc = await store.readText(project.id, 'system/DESIGN.md')
  assert.match(doc, /## Intake（需求访谈）/u)
  assert.match(doc, /三页产品发布演示稿/u)
  assert.match(doc, /变体：4 档/u)

  // A non-object intake is a typed failure; an omitted intake still works.
  await assert.rejects(service.createProject({ intake: 'nope' }), (error) => error.code === 'invalid_input')
  const plain = await service.createProject({ name: '无 intake', scaffold: false })
  assert.equal(plain.intake.goal, '')
  assert.match(await store.readText(plain.id, 'system/DESIGN.md'), /## Intake（需求访谈）/u)
})

test('saveIntake merges partial answers, tracks the source and refreshes DESIGN.md', async (t) => {
  const { service, store } = await makeService(t)
  const project = await service.createProject({ name: 'intake 项目', scaffold: false })

  const first = await service.saveIntake(
    project.id,
    { goal: '做一个运营落地页', audience: '潜在客户', contextSources: ['url'] },
    { source: 'wizard' },
  )
  assert.equal(first.intake.goal, '做一个运营落地页')
  assert.equal(first.intake.source, 'wizard')
  assert.ok(first.filled.includes('goal'))
  assert.ok(first.missing.includes('deliverables'))
  assert.ok(Number.isFinite(first.score))
  const stored = await store.readProject(project.id)
  assert.deepEqual(stored.intake, first.intake)
  assert.match(await store.readText(project.id, 'system/DESIGN.md'), /做一个运营落地页/u)

  // Agent follow-up: missing keys keep their wizard answers, source becomes mixed.
  const second = await service.saveIntake(project.id, { tweaks: ['color'], variations: { count: 2 } }, { source: 'agent' })
  assert.equal(second.intake.goal, '做一个运营落地页')
  assert.deepEqual(second.intake.tweaks, ['color'])
  assert.equal(second.intake.variations.count, 2)
  assert.equal(second.intake.source, 'mixed')
  const rows = await service.listProjects()
  assert.ok(rows.find((row) => row.id === project.id).intake.score >= first.score - 20)

  // A hand-edited DESIGN.md is never overwritten by an intake save.
  await store.writeFile(project.id, 'system/DESIGN.md', '# custom doc\n\nkeep me')
  await service.saveIntake(project.id, { contentMust: '真实价格' })
  assert.equal(await store.readText(project.id, 'system/DESIGN.md'), '# custom doc\n\nkeep me')

  for (const bad of [null, 'not an object', 42, ['x']]) {
    await assert.rejects(service.saveIntake(project.id, bad), (error) => error.code === 'invalid_input' && typeof error.repair?.action === 'string')
  }
  await assert.rejects(service.saveIntake('dsg-missing', { goal: 'x' }), (error) => error.code === 'not_found')
  const bank = service.intakeQuestions()
  assert.equal(bank.groups.length, 6)
  assert.ok(bank.questions.length >= 10)
})

test('saveVariant writes atomically, snapshots history and marks designed', async (t) => {
  const { service, store } = await makeService(t)
  const project = await makeProject(service)
  const second = DESIGN_HTML.replace('数据运营平台', '数据运营平台 v2')
  const saved = await service.saveVariant(project.id, { variant: 'a', html: second })
  assert.equal(saved.file, 'design/a.html')
  assert.equal(saved.history, 1)

  const detail = await service.projectDetail(project.id)
  assert.equal(detail.project.status, 'designed')
  assert.equal(detail.project.history.length, 1)
  const snapshot = detail.project.history[0]
  assert.equal(snapshot.file, 'design/a.html')
  assert.match(snapshot.snapshot, /^history\/a-/u)
  assert.equal(await store.readText(project.id, snapshot.snapshot), DESIGN_HTML)
  assert.equal(await store.readText(project.id, 'design/a.html'), second)

  // Saving identical content does not grow the history.
  const same = await service.saveVariant(project.id, { variant: 'a', html: second })
  assert.equal(same.history, 0)
  assert.equal((await service.projectDetail(project.id)).project.history.length, 1)

  await assert.rejects(service.saveVariant(project.id, { variant: '../x', html: '<html></html>' }), (error) => error.code === 'invalid_input')
  await assert.rejects(service.saveVariant(project.id, { variant: 'a', html: '' }), (error) => error.code === 'invalid_input')
})

test('startCheck probes, audits, writes check.json and updates project state', async (t) => {
  const { service, store, state } = await makeService(t)
  const project = await makeProject(service)
  const job = service.startCheck(project.id, { variant: 'all' })
  assert.equal(job.status, 'running')
  const settled = await waitJob(service, job)
  assert.equal(settled.status, 'done', settled.error ?? 'no error')
  assert.equal(settled.result.round, 1)
  assert.equal(settled.result.score, 91)
  assert.equal(state.probes, 1)
  assert.equal(state.audits, 1)

  const check = await service.checkRound(project.id, 1)
  assert.equal(check.projectId, project.id)
  assert.equal(check.round, 1)
  assert.equal(check.variant, 'all')
  assert.equal(check.score, 91)
  assert.equal(check.grade, 'A')
  assert.equal(check.pass, true)
  assert.equal(check.variants.length, 1)
  const variant = check.variants[0]
  assert.equal(variant.variant, 'a')
  assert.equal(variant.score, 91)
  assert.equal(variant.categories[0].id, 'a11y')
  assert.equal(variant.findings.length, 2)
  assert.equal(variant.screenshots.length, 3)
  assert.equal(variant.screenshots[0].path, 'checks/round-1/a/capture-1440.png')
  assert.ok(await store.statFile(project.id, variant.screenshots[0].path))
  assert.deepEqual(check.counts, { critical: 0, high: 0, medium: 1, low: 1 })

  const detail = await service.projectDetail(project.id)
  assert.equal(detail.project.status, 'ready')
  assert.equal(detail.project.bestScore, 91)
  assert.equal(detail.latestCheck.round, 1)
  assert.equal(detail.checks.length, 1)
  assert.equal(detail.latestCheck.variants[0].score, 91)
  assert.equal((await service.listChecks(project.id)).length, 1)

  // A second check uses a fresh round folder and keeps the summary history.
  const again = await waitJob(service, service.startCheck(project.id, { variant: 'a', widths: [768] }))
  assert.equal(again.status, 'done')
  assert.equal(again.result.round, 2)
  assert.deepEqual(again.result.variants.map((row) => row.variant), ['a'])
  const second = await service.checkRound(project.id, 2)
  assert.deepEqual(second.requestedWidths, [768])
  assert.equal((await service.listChecks(project.id)).length, 2)
})

test('startCheck with several variants averages the round score', async (t) => {
  const { service } = await makeService(t)
  const project = await makeProject(service)
  await service.saveVariant(project.id, { variant: 'b', html: DESIGN_HTML })
  const settled = await waitJob(service, service.startCheck(project.id))
  assert.equal(settled.status, 'done')
  const check = await service.checkRound(project.id, settled.result.round)
  assert.deepEqual(
    check.variants.map((row) => row.variant),
    ['a', 'b'],
  )
  assert.equal(check.score, 91)
})

test('a probe without a browser fails the job with no_browser', async (t) => {
  const { service } = await makeService(t, {
    probeDesign: async () => {
      const error = new Error('no Chrome or Edge found; set DESIGN_STUDIO_BROWSER')
      error.code = 'no_browser'
      throw error
    },
  })
  const project = await makeProject(service)
  const settled = await waitJob(service, service.startCheck(project.id))
  assert.equal(settled.status, 'failed')
  assert.equal(settled.code, 'no_browser')
  assert.match(settled.error, /no Chrome or Edge/u)
  const detail = await service.projectDetail(project.id)
  assert.equal(detail.project.checks.length, 0)
  assert.equal(detail.project.status, 'designed')
})

test('check refuses a project without design files', async (t) => {
  const { service } = await makeService(t)
  const project = await service.createProject({ name: '空项目', scaffold: false })
  const settled = await waitJob(service, service.startCheck(project.id))
  assert.equal(settled.status, 'failed')
  assert.equal(settled.code, 'not_found')
})

test('comments round-trip, persist and resolve', async (t) => {
  const { service, store } = await makeService(t)
  const project = await makeProject(service)
  const comment = await service.addComment(project.id, {
    variant: 'a',
    selector: '#hero > h1',
    note: '标题太大，收一点',
    rect: { x: 10, y: 20, width: 300, height: 48 },
    element: { tag: 'h1', id: 'hero', classes: ['title'], text: '数据运营平台' },
  })
  assert.match(comment.id, /^c-/u)
  assert.equal(comment.rect.w, 300)
  assert.equal(comment.element.classes[0], 'title')
  assert.equal((await service.listComments(project.id)).length, 1)
  const persisted = JSON.parse(await readFile(join(store.projectPaths(project.id).root, 'comments.json'), 'utf8'))
  assert.equal(persisted.length, 1)

  const resolved = await service.resolveComment(project.id, { id: comment.id, reply: '已调整' })
  assert.equal(resolved.reply, '已调整')
  assert.equal(typeof resolved.resolvedAt, 'string')
  assert.equal((await service.listComments(project.id))[0].resolvedAt, resolved.resolvedAt)

  await assert.rejects(service.addComment(project.id, { variant: 'a', selector: '', note: 'x' }), (error) => error.code === 'invalid_input')
  await assert.rejects(service.resolveComment(project.id, { id: 'c-missing' }), (error) => error.code === 'not_found')
})

test('tweaks read, patch with key order, and report missing blocks', async (t) => {
  const { service, store } = await makeService(t)
  const project = await makeProject(service)

  const initial = await service.readTweak(project.id, 'a.html')
  assert.equal(initial.file, 'design/a.html')
  assert.equal(initial.tweaks.primaryColor, '#b4552f')
  assert.equal(initial.tweaks.fontSize, 16)

  const patched = await service.patchTweak(project.id, { file: 'a.html', key: 'primaryColor', value: '#8a3d20' })
  assert.equal(patched.changed, true)
  assert.equal(patched.tweaks.primaryColor, '#8a3d20')
  const appended = await service.patchTweak(project.id, { file: 'a.html', key: 'shadow', value: 'soft' })
  assert.deepEqual(Object.keys(appended.tweaks), ['primaryColor', 'fontSize', 'radius', 'dark', 'shadow'])

  const html = await store.readText(project.id, 'design/a.html')
  assert.match(html, /"primaryColor":"#8a3d20"/u)
  assert.match(html, /"shadow":"soft"/u)

  // A file without the block reads as {} but cannot be patched.
  await service.saveVariant(project.id, { variant: 'b', html: '<!DOCTYPE html><html><body>plain</body></html>' })
  assert.deepEqual((await service.readTweak(project.id, 'b.html')).tweaks, {})
  await assert.rejects(service.patchTweak(project.id, { file: 'b.html', key: 'radius', value: 4 }), (error) => error.code === 'invalid_input')

  // Broken JSON is an invalid_input with a repair hint.
  await service.saveVariant(project.id, { variant: 'c', html: '<html><script>const X = /*EDITMODE-BEGIN*/{oops}/*EDITMODE-END*/;</script></html>' })
  await assert.rejects(service.readTweak(project.id, 'c.html'), (error) => error.code === 'invalid_input' && typeof error.repair?.action === 'string')

  await assert.rejects(service.patchTweak(project.id, { file: 'a.html', key: 'radius', value: { nested: true } }), (error) => error.code === 'invalid_input')
})

test('versions snapshot and restore design files', async (t) => {
  const { service, store } = await makeService(t)
  const project = await makeProject(service)
  const version = await service.saveVersion(project.id, '基线')
  assert.equal(version.id, 'v-1')
  assert.equal(version.label, '基线')
  assert.ok(version.files > 0)
  const snapshotFile = join(store.projectPaths(project.id).root, 'versions', 'v-1', 'design', 'a.html')
  assert.match(await readFile(snapshotFile, 'utf8'), /数据运营平台/u)
  assert.equal((await service.listVersions(project.id)).length, 1)

  await service.saveVariant(project.id, { variant: 'a', html: DESIGN_HTML.replace('数据运营平台', '改版后的平台') })
  const restored = await service.restoreVersion(project.id, 'v-1')
  assert.equal(restored.restored, 'v-1')
  assert.match(await store.readText(project.id, 'design/a.html'), /数据运营平台/u)

  await assert.rejects(service.restoreVersion(project.id, 'nope'), (error) => error.code === 'invalid_input')
  await assert.rejects(service.restoreVersion(project.id, 'v-9'), (error) => error.code === 'not_found')
})

test('export records the file and returns a panel download URL', async (t) => {
  const { service, state } = await makeService(t)
  const project = await makeProject(service)
  const result = await service.exportDesign(project.id, { kind: 'html', variant: 'a' })
  assert.equal(state.exports, 1)
  assert.match(result.export.file, /^exports\//u)
  assert.equal(result.export.kind, 'html')
  assert.equal(result.export.bytes, 8)
  assert.equal(typeof result.export.url, 'string')
  const detail = await service.projectDetail(project.id)
  assert.equal(detail.exports.length, 1)
  assert.equal((await service.listExports(project.id))[0].file, result.export.file)
  await assert.rejects(service.exportDesign(project.id, { kind: 'gif' }), (error) => error.code === 'invalid_input')
  await assert.rejects(service.exportDesign(project.id, {}), (error) => error.code === 'invalid_input')
})

test('preview falls back to a loopback server and is reused', async (t) => {
  const { service, state } = await makeService(t)
  const project = await makeProject(service)
  const preview = await service.preview(project.id)
  assert.equal(preview.variant, 'a')
  assert.equal(preview.url, 'http://127.0.0.1:45678/a.html')
  assert.equal(preview.origin, 'http://127.0.0.1:45678')
  assert.equal(preview.sameOrigin, false)
  await service.preview(project.id, 'a')
  assert.equal(state.previewStarts, 1)
  await service.preview(project.id)
  assert.equal(state.previewStarts, 1)

  // A webServer origin switches to the frozen panel preview route.
  service.setWebServer({ getOrigin: () => 'http://127.0.0.1:60809' })
  const same = await service.preview(project.id)
  assert.equal(same.sameOrigin, true)
  assert.equal(same.origin, 'http://127.0.0.1:60809')
  assert.match(same.url, /^http:\/\/127\.0\.0\.1:60809\/dsh-design-studio\/preview\/[^/]+\/v\/a$/u)
})

test('importContext supports text, url, path and image with adoptSystem', async (t) => {
  const { service, store } = await makeService(t)
  const project = await makeProject(service)

  const note = await service.importContext(project.id, { kind: 'text', value: '参考 Linear 的深色侧边栏，标题用衬线字体', note: '给 agent 的提示' })
  assert.equal(note.evidence.kind, 'text')
  assert.equal(note.tokens, null)

  const url = await service.importContext(project.id, { kind: 'url', value: 'https://example.com/pricing', adoptSystem: true })
  assert.equal(url.tokens.name, 'URL 系统')
  assert.equal(url.system.source.kind, 'url')
  const system = await service.getSystem(project.id)
  assert.equal(system.tokens.name, 'URL 系统')
  assert.equal(system.system.tokensPath, 'system/tokens.json')

  const repo = await service.importContext(project.id, { kind: 'path', value: 'C:/work/brand-site' })
  assert.equal(repo.tokens.name, 'Repo 系统')
  assert.deepEqual(repo.evidence.files, ['src/styles.css', 'tailwind.config.js'])

  const image = await service.importContext(project.id, {
    kind: 'image',
    value: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  })
  assert.equal(image.tokens.name, '图片调色板')
  assert.equal(image.evidence.files.length, 1)
  assert.ok(await store.statFile(project.id, image.evidence.files[0]))

  const evidence = await store.readJson(project.id, 'context/evidence.json', [])
  assert.equal(evidence.length, 4)
  await assert.rejects(service.importContext(project.id, { kind: 'video', value: 'x' }), (error) => error.code === 'invalid_input')
})

test('system get/set, rename and delete', async (t) => {
  const { service } = await makeService(t)
  const project = await makeProject(service)

  const empty = await service.getSystem(project.id)
  assert.equal(empty.system, null)
  assert.match(empty.doc, /设计系统|design system/u)

  const written = await service.setSystem(project.id, {
    tokens: { name: '品牌系统', color: { ink: '#1a1a1a' } },
    doc: '# 品牌系统\n\n正文 16px。',
    source: { kind: 'preset', ref: 'warm-editorial' },
  })
  assert.equal(written.tokens.name, '品牌系统')
  assert.equal(written.system.source.kind, 'preset')
  const read = await service.getSystem(project.id)
  assert.equal(read.tokens.color.ink, '#1a1a1a')
  assert.match(read.doc, /品牌系统/u)

  const renamed = await service.renameProject(project.id, '运营仪表盘 2')
  assert.equal(renamed.name, '运营仪表盘 2')
  await assert.rejects(service.renameProject(project.id, ''), (error) => error.code === 'invalid_input')

  await assert.rejects(service.getSystem('dsg-missing'), (error) => error.code === 'not_found')
  const removed = await service.deleteProject(project.id)
  assert.equal(removed.removed, true)
  assert.equal(await service.store.readProject(project.id), null)
})

test('deleteProject closes a loopback preview and cancels jobs', async (t) => {
  const { service, state } = await makeService(t)
  const project = await makeProject(service)
  await service.preview(project.id)
  assert.equal(state.previewStarts, 1)
  await service.deleteProject(project.id)
  assert.equal(state.previewDisposed, 1)
})

test('scaffold writes a new variant and openFolder never throws on a missing project', async (t) => {
  const { service } = await makeService(t)
  const project = await makeProject(service)
  const written = await service.scaffold(project.id, { id: 'tweaks', target: 'b.html' })
  assert.equal(written.file, 'design/b.html')
  assert.ok(written.bytes > 0)
  const variants = await service.listVariants(project.id)
  assert.deepEqual(
    variants.map((row) => row.id),
    ['a', 'b'],
  )
  await assert.rejects(service.scaffold(project.id, { id: 'tweaks', target: '../evil.html' }), (error) => error.code === 'invalid_input')

  const folder = await service.openFolder('dsg-does-not-exist')
  assert.equal(folder.opened, false)
  assert.equal(typeof folder.reason, 'string')
})

test('diagnostics reports store, browser and checks', async (t) => {
  const { service, dir } = await makeService(t)
  const project = await makeProject(service)
  await waitJob(service, service.startCheck(project.id))
  const diagnostics = await service.diagnostics()
  assert.equal(diagnostics.version, '1.3.0')
  assert.equal(diagnostics.dataDir, dir)
  assert.equal(diagnostics.browser.available, true)
  assert.ok(diagnostics.checks.rounds >= 1)
  assert.ok(Array.isArray(diagnostics.errors))
})
