/**
 * Integration test — real Chrome/Edge drives probe → audit → export.
 *
 * A loopback `node:http` server serves the fixture pages from `test/fixtures`
 * (clean design, deliberately flawed design, three-screen deck). The test then:
 *   1. finds the browser and proves `BrowserPool.status()` reports it,
 *   2. probes the clean design at 1440 + 375 and checks screenshot files,
 *   3. audits clean vs flawed metrics (score, grade, categories, slop finding),
 *   4. exports HTML / ZIP / PNG / PDF and checks their signatures and archive,
 *   5. runs the deck fixture (data-screen-label) and exports a PPTX.
 *
 * When no Chrome/Edge exists the browser tests are skipped with a note and the
 * run stays green (exit 0). No network beyond 127.0.0.1.
 *
 * Run: node --test test/integration/browser.test.mjs
 */

import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { auditDesign } from '../../lib/audit.js'
import { BrowserPool, findBrowser } from '../../lib/browser.js'
import { exportDesign } from '../../lib/export.js'
import { pngSize } from '../../lib/png.js'
import { probeDesign } from '../../lib/probe.js'
import { readZip } from '../fixtures/zip-reader.mjs'

const FIXTURES = resolve(fileURLToPath(new URL('../fixtures', import.meta.url)))
const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
})

/** Start the fixture server on an ephemeral loopback port. */
function startFixtureServer() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname)
      const target = resolve(join(FIXTURES, pathname === '/' ? '/clean.html' : pathname))
      if (!target.startsWith(FIXTURES)) {
        response.writeHead(403)
        response.end('forbidden')
        return
      }
      const body = await readFile(target)
      response.writeHead(200, { 'content-type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' })
      response.end(body)
    } catch {
      response.writeHead(404)
      response.end('not found')
    }
  })
  return new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolvePromise(server))
  })
}

/** A temporary project directory shaped like the store's paths. */
async function createProject(root, { id = 'dsg-20261108-010203-ab12', name = '集成测试项目', kind = 'web', html, viewports }) {
  const projectPaths = {
    root,
    design: join(root, 'design'),
    system: join(root, 'system'),
    exports: join(root, 'exports'),
    checks: join(root, 'checks'),
    context: join(root, 'context'),
  }
  await mkdir(projectPaths.design, { recursive: true })
  await mkdir(projectPaths.system, { recursive: true })
  await mkdir(projectPaths.exports, { recursive: true })
  await writeFile(join(projectPaths.design, 'a.html'), html, 'utf8')
  await writeFile(join(projectPaths.system, 'DESIGN.md'), '# 设计系统\n\n暖纸色 + 陶土红。\n', 'utf8')
  const tokens = {
    name: '潮汐观测',
    color: { bg: '#f4efe4', surface: '#fbf8f0', ink: '#171a1c', muted: '#555b52', accent: '#a8401c', border: '#d8d0be' },
    font: {
      display: { family: 'Iowan Old Style', stack: '"Iowan Old Style", Georgia, serif', weights: [400, 600] },
      body: { family: 'Corbel', stack: '"Corbel", "Segoe UI", sans-serif', weights: [400] },
    },
    size: { scale: [14, 17, 21, 32, 64] },
    space: { scale: [4, 8, 16, 24, 32, 48, 64, 96] },
    radius: { scale: [4, 8] },
    layout: { maxWidth: 1200, gutter: 120, breakpoints: [768] },
  }
  await writeFile(join(projectPaths.system, 'tokens.json'), JSON.stringify(tokens, null, 2), 'utf8')
  const project = {
    schemaVersion: 1,
    id,
    name,
    kind,
    brief: { goal: '验证设计台的采集、质检与导出链路', audience: '开发者', layout: '编辑式', content: '潮汐记录', constraints: '零外部依赖' },
    viewports,
    createdAt: '2026-11-08T01:00:00.000Z',
    updatedAt: '2026-11-08T01:00:00.000Z',
    status: 'checked',
    bestScore: 95,
    system: { name: '潮汐观测', tokensPath: 'system/tokens.json', docPath: 'system/DESIGN.md' },
    variantLabels: { a: '规范版' },
  }
  return { project, projectPaths, tokens }
}

const browser = findBrowser()
const hasBrowser = typeof browser.path === 'string' && browser.path.length > 0

let server = null
let origin = ''
let pool = null
const tempRoots = []
let cleanProbe = null
let flawedProbe = null
let deckProbe = null
let cleanProject = null
let deckProject = null

before(async () => {
  server = await startFixtureServer()
  origin = 'http://127.0.0.1:' + server.address().port
  if (hasBrowser) pool = new BrowserPool({ log: { warn: (message) => console.log('[browser]', message) } })
  if (hasBrowser) {
    const cleanRoot = await mkdtemp(join(tmpdir(), 'ds-it-clean-'))
    tempRoots.push(cleanRoot)
    cleanProject = await createProject(cleanRoot, { html: await readFile(join(FIXTURES, 'clean.html'), 'utf8'), viewports: [1440, 375] })
    const deckRoot = await mkdtemp(join(tmpdir(), 'ds-it-deck-'))
    tempRoots.push(deckRoot)
    deckProject = await createProject(deckRoot, { id: 'dsg-20261108-010204-cd34', name: '集成测试演示稿', kind: 'deck', html: await readFile(join(FIXTURES, 'deck.html'), 'utf8'), viewports: [1920] })
  }
})

after(async () => {
  await pool?.dispose().catch(() => {})
  if (server) await new Promise((resolvePromise) => server.close(() => resolvePromise()))
  for (const root of tempRoots) await rm(root, { recursive: true, force: true }).catch(() => {})
})

test('findBrowser reports a usable executable, or the run is skipped', (t) => {
  if (!hasBrowser) {
    t.diagnostic('no Chrome/Edge executable found: set DESIGN_STUDIO_BROWSER or install a Chromium browser; browser tests will be skipped')
    assert.deepEqual(Array.isArray(browser.tried) ? browser.tried.length >= 0 : true, true)
    return
  }
  assert.equal(typeof browser.path, 'string')
  const executable = browser.path.split(/[\\/]/u).pop().toLowerCase()
  assert.match(executable, /chrome|chromium|msedge|^edge$/u)
  t.diagnostic('browser: ' + browser.path + ' (source: ' + browser.source + ')')
})

test('pool.status() never throws and reports availability + product', { skip: hasBrowser ? false : 'no Chrome/Edge installed', timeout: 120000 }, async () => {
  const before = await pool.status()
  assert.equal(before.available, true)
  assert.equal(typeof before.path, 'string')
  assert.equal(typeof before.product, 'string')
  const refreshed = await pool.status({ refresh: true })
  assert.match(refreshed.product, /(Chrome|HeadlessChrome|Edg)\//u)
  assert.equal(refreshed.running, true)
  console.log('[integration] browser product:', refreshed.product)
})

test('probe captures screenshots and sane §7 metrics at two widths', { skip: hasBrowser ? false : 'no Chrome/Edge installed', timeout: 120000 }, async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'ds-it-probe-'))
  tempRoots.push(dir)
  cleanProbe = await probeDesign({ pool, url: origin + '/clean.html', widths: [1440, 375], kind: 'web', dir })
  assert.equal(cleanProbe.ok, true)
  assert.equal(cleanProbe.pages.length, 2)
  assert.deepEqual(cleanProbe.pages.map((page) => page.width), [1440, 375])
  assert.equal(cleanProbe.screens.length, 0)
  for (const page of cleanProbe.pages) {
    const file = join(dir, page.screenshot)
    const info = await stat(file)
    const bytes = await readFile(file)
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'screenshot is a PNG')
    assert.ok(info.size > 5000, 'screenshot has content (' + info.size + ' bytes)')
    const size = pngSize(bytes)
    assert.ok(size.width >= 300 && size.height >= 300, 'screenshot is not tiny')
    const metrics = page.metrics
    assert.equal(metrics.lang, 'zh-CN')
    assert.ok(metrics.title.includes('潮汐观测'))
    assert.ok(metrics.elements.total > 10, 'elements sampled')
    assert.ok(metrics.tokenUsage.colors.length >= 2, 'colour usage extracted')
    assert.ok(metrics.tokenUsage.fonts.length >= 1, 'font usage extracted')
    assert.ok(Array.isArray(metrics.textNodes) && metrics.textNodes.length > 0, 'text nodes sampled')
    assert.ok(metrics.sections.length >= 2, 'sections measured')
    assert.ok(metrics.render.docHeight > 400, 'page has real height')
    assert.equal(metrics.headingsOrder[0], 'h1')
  }
  assert.ok(cleanProbe.health.consoleErrors.length <= 40)
  t.diagnostic('probe duration: ' + cleanProbe.durationMs + ' ms')
  console.log('[integration] probe clean:', cleanProbe.durationMs + ' ms, pages:', cleanProbe.pages.map((page) => page.width + '×' + page.height).join(', '))
})

test('probe of the flawed fixture exposes console/network health without crashing', { skip: hasBrowser ? false : 'no Chrome/Edge installed', timeout: 120000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ds-it-flawed-'))
  tempRoots.push(dir)
  flawedProbe = await probeDesign({ pool, url: origin + '/flawed.html', widths: [1440], kind: 'web', dir })
  assert.equal(flawedProbe.pages.length, 1)
  const metrics = flawedProbe.pages[0].metrics
  assert.ok(metrics.gradients.length >= 1, 'the purple hero gradient was detected')
  assert.ok(metrics.contrast.length >= 1, 'low-contrast text was detected')
  assert.ok(metrics.slopHits.some((hit) => hit.code === 'emoji' || hit.code === 'lorem' || hit.code === 'fake-name'), 'in-page slop was detected')
  assert.ok(Array.isArray(flawedProbe.health.failedRequests), 'health carries failed requests')
})

test('audit turns metrics into a score, grade, categories and findings', { skip: hasBrowser ? false : 'no Chrome/Edge installed', timeout: 60000 }, () => {
  assert.ok(cleanProbe && flawedProbe, 'probe results are available')
  const clean = auditDesign({ pages: cleanProbe.pages, screens: cleanProbe.screens, kind: 'web', system: cleanProject?.tokens ?? null })
  const flawed = auditDesign({ pages: flawedProbe.pages, screens: flawedProbe.screens, kind: 'web' })
  for (const result of [clean, flawed]) {
    assert.ok(Number.isFinite(result.score) && result.score >= 0 && result.score <= 100)
    assert.ok(['A', 'B', 'C', 'D', 'F'].includes(result.grade))
    assert.equal(typeof result.pass, 'boolean')
    assert.ok(Array.isArray(result.categories) && result.categories.length >= 4)
    assert.ok(Array.isArray(result.viewports))
    for (const category of result.categories) {
      assert.equal(typeof category.score, 'number')
      assert.equal(typeof category.weight, 'number')
      assert.ok(Array.isArray(category.findings))
      for (const finding of category.findings) {
        assert.equal(typeof finding.code, 'string')
        assert.ok(['critical', 'high', 'medium', 'low'].includes(finding.severity))
        assert.equal(typeof finding.message, 'string')
        assert.equal(typeof finding.fix, 'string')
      }
    }
  }
  assert.equal(clean.categories.length, 5, 'the token system adds the system category')
  assert.ok(clean.score >= 85, 'the clean fixture scores well (got ' + clean.score + ')')
  assert.ok(flawed.score < 80, 'the flawed fixture scores badly (got ' + flawed.score + ')')
  assert.ok(flawed.score < clean.score)
  assert.equal(flawed.pass, false)
  const slop = flawed.categories.find((category) => category.id === 'slop')
  assert.ok(slop.findings.some((finding) => finding.code === 'slop.gradient' && finding.severity === 'critical'), 'purple gradient is a critical slop finding')
  const a11y = flawed.categories.find((category) => category.id === 'a11y')
  assert.ok(a11y.findings.length > 0, 'flawed fixture has accessibility findings')
  console.log('[integration] audit clean:', clean.score, clean.grade, '| flawed:', flawed.score, flawed.grade, '| flawed codes:', flawed.categories.flatMap((category) => category.findings.map((finding) => finding.code)).join(','))
})

test('export html/zip/png/pdf from the clean project', { skip: hasBrowser ? false : 'no Chrome/Edge installed', timeout: 120000 }, async () => {
  const previewUrl = origin + '/clean.html'
  const html = await exportDesign({ ...cleanProject, kind: 'html', pool, previewUrl })
  assert.match(html.file, /^exports\/design-dsg-[a-z0-9-]+-a-html\.html$/u)
  const htmlBytes = await readFile(join(cleanProject.projectPaths.root, html.file))
  assert.ok(htmlBytes.toString('utf8').startsWith('<!DOCTYPE html>'))
  assert.equal(htmlBytes.length, html.bytes)

  const zip = await exportDesign({ ...cleanProject, kind: 'zip', pool, previewUrl })
  const zipBytes = await readFile(join(cleanProject.projectPaths.root, zip.file))
  assert.equal(zipBytes.subarray(0, 2).toString('latin1'), 'PK')
  const archive = readZip(zipBytes)
  const names = archive.entries.map((entry) => entry.name)
  for (const required of ['design/a.html', 'system/tokens.json', 'system/DESIGN.md', 'project.json', 'README.txt']) {
    assert.ok(names.includes(required), 'zip contains ' + required)
  }
  const summary = JSON.parse(archive.entries.find((entry) => entry.name === 'project.json').content.toString('utf8'))
  assert.equal(summary.id, cleanProject.project.id)

  const png = await exportDesign({ ...cleanProject, kind: 'png', pool, previewUrl })
  assert.match(png.file, /-png\.png$/u)
  const pngBytes = await readFile(join(cleanProject.projectPaths.root, png.file))
  assert.equal(pngBytes.subarray(0, 4).toString('hex'), '89504e47')
  const pngInfo = pngSize(pngBytes)
  assert.equal(pngInfo.width, 1440)
  assert.ok(png.bytes > 20000)

  const pdf = await exportDesign({ ...cleanProject, kind: 'pdf', pool, previewUrl })
  assert.match(pdf.file, /-pdf\.pdf$/u)
  const pdfBytes = await readFile(join(cleanProject.projectPaths.root, pdf.file))
  assert.equal(pdfBytes.subarray(0, 5).toString('latin1'), '%PDF-')
  assert.equal(pdf.mime, 'application/pdf')
  assert.ok(pdf.bytes > 5000)
  console.log('[integration] exports html/zip/png/pdf bytes:', [html.bytes, zip.bytes, png.bytes, pdf.bytes].join('/'))
})

test('deck screens are captured and exported to a PPTX', { skip: hasBrowser ? false : 'no Chrome/Edge installed', timeout: 120000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ds-it-deck-screens-'))
  tempRoots.push(dir)
  deckProbe = await probeDesign({ pool, url: origin + '/deck.html', widths: [1920], kind: 'deck', dir, screens: true })
  assert.equal(deckProbe.screens.length, 3)
  assert.deepEqual(deckProbe.screens.map((screen) => screen.index), [1, 2, 3])
  assert.match(deckProbe.screens[0].label, /^01/u)
  for (const screen of deckProbe.screens) {
    const bytes = await readFile(join(dir, screen.screenshot))
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.ok(bytes.length > 5000)
    assert.ok(screen.metrics.textLength > 0)
    assert.equal(screen.metrics.lang, 'zh-CN')
  }
  const deckAudit = auditDesign({ pages: deckProbe.pages, screens: deckProbe.screens, kind: 'deck' })
  assert.equal(deckAudit.screens.length, 3)
  assert.ok(deckAudit.score >= 90, 'the deck fixture scores well (got ' + deckAudit.score + ')')
  assert.equal(deckAudit.viewports.length, 0)

  const pptx = await exportDesign({ ...deckProject, kind: 'pptx', pool, previewUrl: origin + '/deck.html', viewports: [1920] })
  assert.match(pptx.file, /-pptx\.pptx$/u)
  const pptxBytes = await readFile(join(deckProject.projectPaths.root, pptx.file))
  assert.equal(pptxBytes.subarray(0, 2).toString('latin1'), 'PK')
  const archive = readZip(pptxBytes)
  assert.equal(pptx.slides, 3)
  assert.equal(archive.entries.filter((entry) => entry.name.startsWith('ppt/media/')).length, 3)
  assert.ok(archive.entries.some((entry) => entry.name === 'ppt/slides/slide3.xml'))
  assert.ok(pptx.bytes > 10000)
  console.log('[integration] deck screens:', deckProbe.screens.map((screen) => screen.label).join(' | '), '| deck score:', deckAudit.score, '| pptx:', pptx.bytes, 'bytes')
})

test('export fails with typed codes instead of throwing unknown errors', { skip: hasBrowser ? false : 'no Chrome/Edge installed', timeout: 60000 }, async () => {
  await assert.rejects(() => exportDesign({ ...cleanProject, kind: 'html', variant: 'nope' }), (error) => error.code === 'not_found')
  await assert.rejects(() => exportDesign({ ...cleanProject, kind: 'png', variant: 'a' }), (error) => error.code === 'no_preview')
  await assert.rejects(() => exportDesign({ ...cleanProject, kind: 'bogus' }), (error) => error.code === 'invalid_input')
})
