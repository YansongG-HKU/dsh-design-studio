/**
 * dsh-design-studio — real-browser e2e for the v1.3 wizard → handoff flow.
 *
 * What is exercised, all against production code:
 *  1. The shipped `client.js` is loaded in a real headless Chrome page through the
 *     same ModuleLoader stub the unit tests use; the harness fixture drives a real
 *     6-step wizard with the REAL `__test__` helpers (wizardReduce / validation /
 *     answersToBrief / answersToIntake / buildStartPrompt / handoffPlan).
 *  2. The question bank comes from the real `GET /dsh-design-studio/api/intake/questions`
 *     panel route, mounted through `registerPanel` on one ephemeral loopback server
 *     with a fake webServer service.
 *  3. Finish POSTs the real `POST /api/projects` route, then copies the prompt to a
 *     clipboard recorder and records `layout.selectPanel(null)`.
 *  4. The test "pastes" the prompt back, parses the project id, writes the clean
 *     fixture to design/a|b|c.html and runs a LIVE `service.startCheck` asserting
 *     96 / A for all three variants.
 *
 * Skips when no Chromium-family browser is available.
 * Run with: node --test test/integration/wizard-handoff.test.mjs
 */

import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { BrowserPool } from '../../lib/browser.js'
import { resolveConfig } from '../../lib/config.js'
import { registerPanel } from '../../lib/panel.js'
import { createService } from '../../lib/service.js'
import { createStore } from '../../lib/store.js'

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const fixtures = join(root, 'test', 'fixtures', 'e2e')

const HANDOFF_TOAST = '需求已复制，在对话输入框 Ctrl+V 粘贴发送'
const PROJECT_ID = /dsg-\d{8}-\d{6}-[a-z0-9]+/u

/** Poll a check job until it settles (same cadence as test/integration/e2e.test.mjs). */
async function settle(service, job, timeoutMs = 150000) {
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

/** Evaluate one expression in the page and return its JSON value. */
async function evaluate(page, expression, options = {}) {
  const response = await page.session.send('Runtime.evaluate', {
    expression,
    awaitPromise: options.awaitPromise === true,
    returnByValue: true,
  })
  if (response && response.exceptionDetails) {
    const details = response.exceptionDetails
    const reason = details.exception && details.exception.description ? details.exception.description : details.text || 'evaluate failed'
    throw new Error(String(reason).split('\n')[0].slice(0, 400))
  }
  return response && response.result ? response.result.value : undefined
}

/** Navigate and settle the page. */
async function openPage(page, url, timeoutMs = 20000) {
  const loaded = page.session.waitForEvent('Page.loadEventFired', { timeout: timeoutMs }).catch(() => null)
  const navigation = await page.session.send('Page.navigate', { url })
  if (navigation && navigation.errorText) throw new Error(`could not open ${url}: ${navigation.errorText}`)
  await loaded
  await page.waitForNetworkIdle({ quietMs: 150, timeoutMs }).catch(() => {})
}

/** Poll a page expression until it returns a truthy value. */
async function pollPage(page, expression, timeoutMs = 20000, intervalMs = 150) {
  const started = Date.now()
  for (;;) {
    const value = await evaluate(page, expression)
    if (value) return value
    if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for: ${expression.slice(0, 160)}`)
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

/** Click one DOM element through a real evaluate + HTMLElement.click(). */
async function click(page, selector) {
  const clicked = await evaluate(
    page,
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true })()`,
  )
  if (!clicked) throw new Error(`click target missing: ${selector}`)
  await new Promise((resolve) => setTimeout(resolve, 60))
}

/** Focus a field and type through CDP Input.insertText (falls back to a value set). */
async function typeInto(page, selector, text) {
  const focused = await evaluate(
    page,
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.focus(); return true })()`,
  )
  if (!focused) throw new Error(`text target missing: ${selector}`)
  await page.session.send('Input.insertText', { text })
  await new Promise((resolve) => setTimeout(resolve, 80))
  let via = 'insertText'
  let value = await evaluate(page, `(document.querySelector(${JSON.stringify(selector)}) || {}).value || ''`)
  if (!String(value || '').includes(text)) {
    via = 'value-setter'
    // Headless fallback: set the value the way a user would and fire input.
    await evaluate(
      page,
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; const setter = Object.getOwnPropertyDescriptor(proto, 'value').set; setter.call(el, ${JSON.stringify(text)}); el.dispatchEvent(new Event('input', { bubbles: true })); return true })()`,
    )
    await new Promise((resolve) => setTimeout(resolve, 80))
    value = await evaluate(page, `(document.querySelector(${JSON.stringify(selector)}) || {}).value || ''`)
  }
  return { value, via }
}

/** Read the wizard state exposed by the harness. */
async function readState(page) {
  const raw = await evaluate(page, 'window.__WIZARD_STATE__ ? window.__WIZARD_STATE__() : ""')
  if (!raw) throw new Error('window.__WIZARD_STATE__ is not available')
  return JSON.parse(raw)
}

test('v1.3 wizard → handoff → live design_check returns 96 / A', { timeout: 180000 }, async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-design-studio-wizard-'))
  const store = createStore({ dir })
  await store.init()
  const pool = new BrowserPool({})
  const status = await pool.status()
  if (!status.available) {
    t.skip('no Chromium-family browser available; wizard e2e skipped')
    await pool.dispose().catch(() => {})
    await rm(dir, { recursive: true, force: true }).catch(() => {})
    return
  }

  const service = createService({ store, pool, config: resolveConfig({}), log: { warn: (message) => t.diagnostic?.(String(message)) } })
  const [clientSource, harnessSource, good] = await Promise.all([
    readFile(join(root, 'client.js'), 'utf8'),
    readFile(join(fixtures, 'wizard-harness.html'), 'utf8'),
    readFile(join(fixtures, 'good.html'), 'utf8'),
  ])
  assert.ok(clientSource.includes('__test__:'), 'the shipped client bundle must expose __test__')
  assert.ok(clientSource.includes('fallbackIntakeGroups'), 'the shipped client must expose the wizard helpers')

  const registrations = []
  let panelHandler = null
  let origin = ''
  const server = createServer((req, res) => {
    void (async () => {
      try {
        const url = new URL(req.url || '/', 'http://127.0.0.1')
        if (url.pathname === '/client.js') {
          res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' })
          res.end(clientSource)
          return
        }
        if (url.pathname === '/harness.html') {
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
          res.end(harnessSource)
          return
        }
        if (url.pathname === '/favicon.ico') {
          res.writeHead(204)
          res.end()
          return
        }
        if (url.pathname === '/dsh-design-studio' || url.pathname.startsWith('/dsh-design-studio/')) {
          if (!panelHandler) {
            res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' })
            res.end('panel routes are not registered')
            return
          }
          await panelHandler(req, res)
          return
        }
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('not found')
      } catch (error) {
        try {
          res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
          res.end('harness server error')
        } catch {
          /* the response may already be gone */
        }
        t.diagnostic?.(`harness server error: ${error && error.message ? error.message : error}`)
      }
    })()
  })

  let disposePanel = null
  let pastedProjectId = ''
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    assert.ok(port > 0, 'the harness server must listen on an ephemeral port')
    origin = `http://127.0.0.1:${port}`
    const webServer = {
      port,
      getOrigin() {
        return origin
      },
      register(spec) {
        registrations.push(spec)
        panelHandler = spec && typeof spec.handler === 'function' ? spec.handler : null
        return () => {
          panelHandler = null
        }
      },
    }
    disposePanel = registerPanel({
      ctx: { inject: (deps, fn) => fn({ webServer }) },
      service,
      log: { warn: (message) => t.diagnostic?.(String(message)) },
    })
    assert.ok(panelHandler, 'registerPanel must mount the /dsh-design-studio prefix handler')
    assert.equal(registrations.length, 1)
    assert.equal(registrations[0].kind, 'prefix')
    assert.equal(registrations[0].path, '/dsh-design-studio')

    await pool.withPage(async (page) => {
      await openPage(page, `${origin}/harness.html`)
      const ready = await pollPage(page, "window.__READY__ === true ? 'ready' : ''", 20000).catch(async (error) => {
        const failure = await evaluate(page, 'window.__READY_ERROR__ || ""').catch(() => '')
        throw new Error(`wizard harness did not become ready: ${error.message}${failure ? ' — ' + failure : ''}`)
      })
      assert.equal(ready, 'ready')

      let state = await readState(page)
      assert.equal(state.total, 6, 'the real question bank must expose six groups')
      assert.equal(state.source, 'host', 'the harness must fetch the real /api/intake/questions bank')
      assert.equal(state.step, 1)
      t.diagnostic?.(`wizard bank: ${state.title} (${state.total} steps, source=${state.source})`)

      // Step 1 — 做什么: kind chip + goal text.
      await click(page, '[data-q="kind"][data-v="web"]')
      const goalInput = await typeInto(page, '[data-text="goal"]', '为小型港口值班室做一个落地页：三栏指标 + 交接摘要，让换班时一条链接带走上下文。')
      assert.ok(String(goalInput.value).includes('港口'), 'the goal input must receive the typed text')
      t.diagnostic?.(`goal typed via ${goalInput.via}`)
      state = await readState(page)
      assert.equal(state.answers.kind, 'web')
      await click(page, '#next')
      state = await readState(page)
      assert.equal(state.step, 2)

      // Step 2 — 受众.
      const audienceInput = await typeInto(page, '[data-text="audience"]', 'B2B 港口运营负责人 · 桌面为主 · 语气克制专业')
      assert.ok(String(audienceInput.value).includes('B2B'))
      await click(page, '#next')
      state = await readState(page)
      assert.equal(state.step, 3)

      // Step 3 — 语境: answer required contextSources, deliberately leave optional references empty.
      await click(page, '[data-q="contextSources"][data-v="existing-design-system"]')
      state = await readState(page)
      assert.ok(Array.isArray(state.answers.contextSources) && state.answers.contextSources.includes('existing-design-system'))
      await click(page, '#next')
      state = await readState(page)
      assert.equal(state.step, 4)

      // Step 4 — 变体: count + two dimensions; optional span left alone.
      await click(page, '[data-q="variationsCount"][data-v="3"]')
      await click(page, '[data-q="variationDimensions"][data-v="visual"]')
      await click(page, '[data-q="variationDimensions"][data-v="layout"]')
      await click(page, '[data-q="variationRange"][data-v="规则→前卫"]')
      state = await readState(page)
      assert.equal(state.answers.variationsCount, '3')
      assert.deepEqual(state.answers.variationDimensions, ['visual', 'layout'])
      await click(page, '#next')
      state = await readState(page)
      assert.equal(state.step, 5)

      // Step 5 — Tweaks: pick one option, optional content fields stay empty.
      await click(page, '[data-q="tweaks"][data-v="color"]')
      state = await readState(page)
      assert.ok(Array.isArray(state.answers.tweaks) && state.answers.tweaks.includes('color'))
      await click(page, '#next')
      state = await readState(page)
      assert.equal(state.step, 6)

      // Step 6 — 交付: delegate the required deliverables question instead of answering it,
      // so the handoff prompt must ask Claude a follow-up question.
      await click(page, '[data-delegate="deliverables"]')
      state = await readState(page)
      assert.ok(state.delegated.includes('deliverables'), 'the delegated question must be recorded')
      await click(page, '[data-q="success"][data-v="check>=90"]')
      await click(page, '#next') // sixth Next click: clamped on the last step
      await click(page, '#finish')
      const handoff = await pollPage(page, 'window.__WIZARD__ && window.__WIZARD__.finished ? window.__WIZARD__ : null', 20000)
      assert.ok(handoff && handoff.finished, 'the wizard must finish and expose the handoff record')

      // Prompt + handoff contract.
      assert.equal(typeof handoff.prompt, 'string')
      assert.equal(handoff.prompt, handoff.clipboard, 'the clipboard recorder must receive the exact prompt')
      assert.ok(handoff.prompt.includes('已确认信息'), 'the prompt must list the confirmed intake')
      assert.ok(handoff.prompt.includes('请先追问以下未确认项'), 'the prompt must ask for the delegated follow-up')
      assert.ok(handoff.prompt.includes('请按设计台流程执行'), 'the prompt must carry the studio workflow instruction')
      assert.match(handoff.prompt, PROJECT_ID, 'the prompt must contain the created project id')
      assert.ok(Array.isArray(handoff.openQuestions) && handoff.openQuestions.length >= 1 && handoff.openQuestions.length <= 8)
      assert.equal(handoff.plan.ok, true)
      assert.equal(handoff.plan.switchPanel, true)
      assert.deepEqual(handoff.layoutCalls, [null], 'HandoffToClaude must call layout.selectPanel(null)')
      assert.equal(handoff.toast, HANDOFF_TOAST)

      const projectId = (handoff.prompt.match(PROJECT_ID) || [])[0]
      assert.ok(projectId, 'the project id must be parseable from the prompt')
      pastedProjectId = projectId
      t.diagnostic?.(`wizard created ${projectId} · openQuestions=${handoff.openQuestions.length}`)

      // The real panel POST must have persisted the brief + intake.
      const detail = await service.projectDetail(projectId)
      assert.equal(detail.project.name, 'e2e 港口值班台')
      assert.ok(String(detail.project.brief.goal).includes('港口'), 'the brief goal must be persisted')
      assert.ok(String(detail.project.brief.audience).includes('B2B'), 'the brief audience must be persisted')
      const intake = detail.project.intake || {}
      assert.ok(String(intake.goal || '').includes('港口'), 'intake.goal must be persisted')
      assert.ok(String(intake.audience || '').includes('B2B'), 'intake.audience must be persisted')
      assert.equal(intake.variations && intake.variations.count, 3)
      assert.ok(Array.isArray(intake.variations.dimensions) && intake.variations.dimensions.includes('visual') && intake.variations.dimensions.includes('layout'))
      assert.equal(intake.variations.range, 'balanced', 'the host bank variationRange label must persist as the canonical range')
      assert.equal(intake.source, 'wizard')
      assert.ok(String(intake.completedAt || '').length > 0, 'intake.completedAt must be stamped')
      assert.ok(Array.isArray(intake.openQuestions) && intake.openQuestions.length === handoff.openQuestions.length)
    })

    // "Paste" the prompt back: the id was parsed from the captured prompt above.
    assert.match(pastedProjectId, PROJECT_ID)
    const projects = await service.listProjects()
    assert.equal(projects.length, 1, 'exactly one project must have been created by the wizard')
    assert.equal(projects[0].id, pastedProjectId)
    t.diagnostic?.(`pasted prompt project ${pastedProjectId}; saving good.html to a/b/c`)

    for (const variant of ['a', 'b', 'c']) {
      await service.saveVariant(pastedProjectId, { variant, html: good })
    }
    const variants = await service.listVariants(pastedProjectId)
    assert.deepEqual(variants.map((row) => row.id).sort(), ['a', 'b', 'c'])

    // Live headless Chrome check: the clean fixture must score 96 / A on every variant.
    const job = await service.startCheck(pastedProjectId, { variant: 'all', widths: [1440, 768, 375] })
    const settled = await settle(service, job)
    assert.equal(settled.status, 'done', `check job failed: ${settled.error ?? ''}`)
    const round = settled.result && settled.result.round ? settled.result.round : 1
    const check = await service.checkRound(pastedProjectId, round)
    assert.ok(check && Array.isArray(check.variants) && check.variants.length === 3, 'the check must score all three variants')
    const byVariant = Object.fromEntries(check.variants.map((row) => [row.variant, row]))
    for (const variant of ['a', 'b', 'c']) {
      const row = byVariant[variant]
      assert.ok(row, `variant ${variant} must appear in the check`)
      assert.equal(row.score, 96, `variant ${variant} must score 96 (got ${row.score})`)
      assert.equal(row.grade, 'A', `variant ${variant} must grade A (got ${row.grade})`)
      t.diagnostic?.(`check ${variant}: ${row.score} ${row.grade}`)
    }
  } finally {
    try {
      if (typeof disposePanel === 'function') disposePanel()
    } catch {
      /* disposal is best effort */
    }
    try {
      await new Promise((resolve) => server.close(resolve))
    } catch {
      /* already closed */
    }
    await service.dispose().catch(() => {})
    await pool.dispose().catch(() => {})
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
})
