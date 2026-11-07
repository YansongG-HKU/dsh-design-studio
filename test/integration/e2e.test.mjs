/**
 * dsh-design-studio — end-to-end integration test.
 *
 * Drives the real service with the real store, browser pool, probe, audit and
 * export engine against a local fixture design set (no install needed):
 * create → save variants → check (real headless Chrome) → comments → tweak →
 * versions → exports (html/zip/pdf/png/pptx) → delete.
 *
 * Skips (with a message) when no Chromium-family browser is available.
 * Run with: node --test test/integration/e2e.test.mjs
 */

import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { BrowserPool } from '../../lib/browser.js'
import { resolveConfig } from '../../lib/config.js'
import { createService } from '../../lib/service.js'
import { createStore } from '../../lib/store.js'

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const fixtures = join(root, 'test', 'fixtures', 'e2e')

/** Poll a job until it settles. */
async function settle(service, job, timeoutMs = 180000) {
  const started = Date.now()
  for (;;) {
    const current = service.jobs.get(job.id) ?? job
    if (current.status === 'done') return current
    if (current.status === 'failed' || current.status === 'cancelled') {
      throw new Error(`job ${job.id} ${current.status}: ${current.error ?? ''}`)
    }
    if (Date.now() - started > timeoutMs) throw new Error(`job ${job.id} timed out`)
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}

/** True when a buffer starts with a signature. */
function startsWith(buffer, text) {
  return buffer.subarray(0, text.length).toString('latin1') === text
}

test('design studio end to end: project, check, comments, tweaks, versions, exports', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-design-studio-e2e-'))
  const store = createStore({ dir })
  await store.init()
  const pool = new BrowserPool({})
  const status = await pool.status()
  if (!status.available) {
    t.skip('no Chromium-family browser available; end-to-end check skipped')
    await pool.dispose().catch(() => {})
    await rm(dir, { recursive: true, force: true }).catch(() => {})
    return
  }

  const service = createService({ store, pool, config: resolveConfig({}), log: { warn: (message) => t.diagnostic?.(String(message)) } })
  try {
    const good = await readFile(join(fixtures, 'good.html'), 'utf8')
    const flawed = await readFile(join(fixtures, 'flawed.html'), 'utf8')

    const project = await service.createProject({
      name: 'e2e 值班台',
      kind: 'web',
      scaffold: false,
      brief: { goal: '验证设计台全链路', audience: '插件验收', layout: '', content: '', constraints: '' },
    })
    assert.match(project.id, /^dsg-/u)
    t.diagnostic?.(`project ${project.id}`)

    await service.saveVariant(project.id, { variant: 'a', html: good })
    await service.saveVariant(project.id, { variant: 'b', html: flawed })
    const variants = await service.listVariants(project.id)
    assert.deepEqual(variants.map((row) => row.id).sort(), ['a', 'b'])

    // Real headless check of both variants.
    const job = await service.startCheck(project.id, { variant: 'all', widths: [1440, 768, 375] })
    const settled = await settle(service, job)
    assert.equal(settled.status, 'done')
    const check = await service.checkRound(project.id, 1)
    assert.ok(check && Array.isArray(check.variants) && check.variants.length === 2, 'check must score both variants')
    const byVariant = Object.fromEntries(check.variants.map((row) => [row.variant, row]))
    assert.ok(Number.isFinite(byVariant.a.score) && Number.isFinite(byVariant.b.score))
    t.diagnostic?.(`scores: a=${byVariant.a.score} b=${byVariant.b.score}`)
    assert.ok(byVariant.a.score > byVariant.b.score, 'the clean variant must outscore the flawed one')
    const flawedFindings = Array.isArray(byVariant.b.findings) ? byVariant.b.findings : []
    const goodFindings = Array.isArray(byVariant.a.findings) ? byVariant.a.findings : []
    assert.ok(flawedFindings.length > goodFindings.length, 'the flawed variant must produce more findings')
    assert.ok(flawedFindings.some((finding) => ['critical', 'high'].includes(finding.severity)), 'the flawed variant must produce a critical/high finding')

    // Screenshots exist and are real PNG files.
    const screenshots = (check.variants ?? []).flatMap((row) => row.screenshots ?? [])
    assert.ok(screenshots.length >= 2, 'check must save screenshots')
    for (const shot of screenshots.slice(0, 2)) {
      const info = await store.statFile(project.id, shot.path)
      assert.ok(info && info.size > 1024, `screenshot ${shot.path} must exist`)
      const bytes = await store.readFile(project.id, shot.path)
      assert.ok(startsWith(Buffer.from(bytes), '\u0089PNG') || Buffer.from(bytes).subarray(1, 4).toString() === 'PNG')
    }

    // Inline comments: add, list, resolve.
    const comment = await service.addComment(project.id, {
      variant: 'a',
      selector: 'h1',
      note: '标题再收一点字距',
      rect: { x: 40, y: 40, width: 400, height: 80 },
      element: { tag: 'h1', id: '', classes: [], text: '潮位、窗口与交接' },
    })
    const comments = await service.listComments(project.id)
    const commentRows = Array.isArray(comments) ? comments : comments.comments
    const pendingOf = (value) => (Array.isArray(value) ? value.filter((row) => !row.resolvedAt).length : value.pending)
    assert.ok(commentRows.some((row) => row.id === comment.id))
    assert.equal(pendingOf(comments), 1)
    await service.resolveComment(project.id, { id: comment.id, reply: '已调整' })
    const after = await service.listComments(project.id)
    assert.equal(pendingOf(after), 0)

    // Tweaks: read the EDITMODE block and patch one key.
    const tweaks = await service.readTweak(project.id, 'a.html')
    assert.equal(tweaks.tweaks.accentColor, '#a8401c')
    const patched = await service.patchTweak(project.id, { file: 'a.html', key: 'accentColor', value: '#225544' })
    assert.equal(patched.tweaks.accentColor, '#225544')
    const reread = await service.readTweak(project.id, 'a.html')
    assert.equal(reread.tweaks.accentColor, '#225544')

    // Versions: save, list, change the file, restore.
    const version = await service.saveVersion(project.id, '改色前')
    assert.ok(version.id)
    const changed = good.replace('在一块屏上完成。', '被改过的文案。')
    assert.notEqual(changed, good, 'fixture rewrite must change the source')
    await service.saveVariant(project.id, { variant: 'a', html: changed })
    const restored = await service.restoreVersion(project.id, version.id)
    assert.ok(restored)
    const restoredHtml = await store.readText(project.id, 'design/a.html', '')
    assert.ok(restoredHtml.includes('在一块屏上完成。'), 'restore must bring back the saved version')
    assert.ok(!restoredHtml.includes('被改过的文案。'), 'restore must replace the edited copy')

    // Exports through the real engine.
    for (const kind of ['html', 'zip', 'pdf', 'png', 'pptx']) {
      const result = await service.exportDesign(project.id, { kind, variant: 'a' })
      const record = result && result.export ? result.export : result
      assert.ok(record && record.file, `export ${kind} must return a file`)
      const filePath = store.projectPaths(project.id).root + '/' + record.file
      const info = await stat(filePath)
      assert.ok(info.size > 512, `export ${kind} must be non-empty (${info.size})`)
      const bytes = await readFile(filePath)
      if (kind === 'zip' || kind === 'pptx') assert.ok(startsWith(bytes, 'PK'), `${kind} must be a zip`)
      if (kind === 'pdf') assert.ok(startsWith(bytes, '%PDF'), 'pdf must have a PDF header')
      if (kind === 'png') assert.equal(bytes.subarray(1, 4).toString(), 'PNG', 'png must have a PNG header')
      t.diagnostic?.(`export ${kind}: ${info.size} bytes`)
    }

    // Preview URL serves the design.
    const preview = await service.preview(project.id, 'a')
    assert.ok(preview.url, 'preview url must exist')
    const response = await fetch(preview.url)
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.ok(html.includes('潮位'), 'preview must serve the saved file')

    // Delete.
    await service.deleteProject(project.id)
    const projects = await service.listProjects()
    assert.ok(!projects.some((row) => row.id === project.id))
  } finally {
    await service.dispose().catch(() => {})
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
})
