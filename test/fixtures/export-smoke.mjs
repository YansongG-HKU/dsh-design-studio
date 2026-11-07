/**
 * export smoke check — drives the real exporter against the fixture pages.
 *
 *   node test/fixtures/export-smoke.mjs
 *
 * Starts a loopback static server for `test/fixtures`, builds a throwaway
 * project directory, then exports html / zip / png / pdf (clean fixture) and
 * pptx (deck fixture), asserting signatures and archive contents. Not part of
 * `npm test`; it is the manual acceptance check used during the build.
 */

import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BrowserPool } from '../../lib/browser.js'
import { exportDesign } from '../../lib/export.js'
import { pngSize } from '../../lib/png.js'
import { readZip } from './zip-reader.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const fixturesDir = resolve(here)
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' }

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)
    const target = resolve(join(fixturesDir, pathname === '/' ? '/clean.html' : pathname))
    if (!target.startsWith(fixturesDir)) {
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
await new Promise((done) => server.listen(0, '127.0.0.1', done))
const origin = 'http://127.0.0.1:' + server.address().port

function check(condition, message) {
  if (!condition) throw new Error('ASSERTION FAILED: ' + message)
}

async function buildProject(root, { html, kind, viewports }) {
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
  await writeFile(join(projectPaths.system, 'tokens.json'), JSON.stringify({
    name: '潮汐观测',
    color: { bg: '#f4efe4', surface: '#fbf8f0', ink: '#171a1c', muted: '#555b52', accent: '#a8401c', border: '#d8d0be' },
    font: { display: { family: 'Iowan Old Style', stack: '"Iowan Old Style", Georgia, serif' }, body: { family: 'Corbel', stack: '"Corbel", sans-serif' } },
    size: { scale: [14, 17, 21, 32, 64] },
    space: { scale: [4, 8, 16, 24, 32, 48, 64, 96] },
    radius: { scale: [4, 8] },
    layout: { maxWidth: 1200, gutter: 120, breakpoints: [768] },
  }, null, 2), 'utf8')
  await writeFile(join(projectPaths.system, 'DESIGN.md'), '# 设计系统\n\n暖纸色 + 陶土红强调色。\n', 'utf8')
  return {
    project: {
      schemaVersion: 1,
      id: 'dsg-20261108-010203-ab12',
      name: '潮汐观测 · 沿海气象站',
      kind,
      brief: { goal: '介绍沿海气象站的观测方法', audience: '公众', layout: '编辑式单栏 + 侧栏', content: '观测记录', constraints: '零外部依赖' },
      viewports,
      createdAt: '2026-11-08T01:00:00.000Z',
      updatedAt: '2026-11-08T01:00:00.000Z',
      status: 'checked',
      bestScore: 95,
      system: { name: '潮汐观测', tokensPath: 'system/tokens.json', docPath: 'system/DESIGN.md' },
      variantLabels: { a: '规范版' },
    },
    projectPaths,
  }
}

const pool = new BrowserPool({ log: { warn: (message) => console.log('[browser]', message) } })
const roots = []
const started = Date.now()
try {
  const cleanHtml = await readFile(join(fixturesDir, 'clean.html'), 'utf8')
  const deckHtml = await readFile(join(fixturesDir, 'deck.html'), 'utf8')

  const webRoot = await mkdtemp(join(tmpdir(), 'ds-export-web-'))
  roots.push(webRoot)
  const web = await buildProject(webRoot, { html: cleanHtml, kind: 'web', viewports: [1440, 375] })
  const previewUrl = origin + '/clean.html'
  const log = (message) => console.log('  ·', message)

  // HTML ---------------------------------------------------------------------
  const html = await exportDesign({ ...web, kind: 'html', pool, previewUrl, log })
  check(html.file.startsWith('exports/design-dsg-'), 'html file path shape')
  const htmlBytes = await readFile(join(web.projectPaths.root, html.file))
  check(htmlBytes.toString('utf8').startsWith('<!DOCTYPE html>'), 'html signature')
  check(htmlBytes.toString('utf8') === cleanHtml, 'html is a verbatim copy')
  console.log('html', html.bytes, 'bytes ->', html.file)

  // ZIP ----------------------------------------------------------------------
  const zip = await exportDesign({ ...web, kind: 'zip', pool, previewUrl, log })
  const zipBuffer = await readFile(join(web.projectPaths.root, zip.file))
  check(zipBuffer.subarray(0, 2).toString('latin1') === 'PK', 'zip signature')
  const archive = readZip(zipBuffer)
  const names = archive.entries.map((entry) => entry.name)
  for (const required of ['design/a.html', 'system/tokens.json', 'system/DESIGN.md', 'project.json', 'README.txt']) {
    check(names.includes(required), 'zip contains ' + required)
  }
  const summary = JSON.parse(archive.entries.find((entry) => entry.name === 'project.json').content.toString('utf8'))
  check(summary.id === web.project.id && summary.variant === 'a', 'project.json summary')
  check(archive.entries.find((entry) => entry.name === 'README.txt').content.toString('utf8').includes('潮汐观测'), 'README names the project')
  check(archive.entries.find((entry) => entry.name === 'design/a.html').content.toString('utf8') === cleanHtml, 'zip design copy')
  console.log('zip', zip.bytes, 'bytes,', archive.count, 'entries ->', zip.file)

  // PNG ----------------------------------------------------------------------
  const png = await exportDesign({ ...web, kind: 'png', pool, previewUrl, log })
  const pngBuffer = await readFile(join(web.projectPaths.root, png.file))
  check(pngBuffer.subarray(0, 4).toString('hex') === '89504e47', 'png signature')
  const size = pngSize(pngBuffer)
  check(size && size.width === 1440, 'png width is the first viewport (got ' + JSON.stringify(size) + ')')
  check(png.bytes > 20000, 'png has real content (' + png.bytes + ' bytes)')
  console.log('png', png.bytes, 'bytes,', size.width + '×' + size.height, '->', png.file)

  // PDF ----------------------------------------------------------------------
  const pdf = await exportDesign({ ...web, kind: 'pdf', pool, previewUrl, log })
  const pdfBuffer = await readFile(join(web.projectPaths.root, pdf.file))
  check(pdfBuffer.subarray(0, 4).toString('latin1') === '%PDF', 'pdf signature')
  check(pdf.bytes > 5000, 'pdf has real content (' + pdf.bytes + ' bytes)')
  const pageCount = (pdfBuffer.toString('latin1').match(/\/Type\s*\/Page[^s]/gu) ?? []).length
  check(pageCount >= 1, 'pdf declares at least one page')
  console.log('pdf', pdf.bytes, 'bytes ->', pdf.file)

  // PPTX from deck screens ---------------------------------------------------
  const deckRoot = await mkdtemp(join(tmpdir(), 'ds-export-deck-'))
  roots.push(deckRoot)
  const deck = await buildProject(deckRoot, { html: deckHtml, kind: 'deck', viewports: [1920] })
  const deckPptx = await exportDesign({ ...deck, kind: 'pptx', pool, previewUrl: origin + '/deck.html', viewports: [1920], log })
  const pptxBuffer = await readFile(join(deck.projectPaths.root, deckPptx.file))
  check(pptxBuffer.subarray(0, 2).toString('latin1') === 'PK', 'pptx signature')
  const deckArchive = readZip(pptxBuffer)
  check(deckPptx.slides === 3, 'pptx has 3 slides (got ' + deckPptx.slides + ')')
  check(deckArchive.entries.filter((entry) => entry.name.startsWith('ppt/media/')).length === 3, 'pptx has 3 media parts')
  check(deckArchive.entries.some((entry) => entry.name === 'ppt/slides/slide3.xml'), 'pptx has slide3')
  console.log('pptx', deckPptx.bytes, 'bytes,', deckPptx.slides, 'slides ->', deckPptx.file)

  // PPTX per-viewport fallback ----------------------------------------------
  const fallbackPptx = await exportDesign({ ...web, kind: 'pptx', pool, previewUrl, viewports: [1440, 375], log })
  check(fallbackPptx.slides === 2, 'pptx viewport fallback should make 2 slides (got ' + fallbackPptx.slides + ')')
  console.log('pptx fallback', fallbackPptx.bytes, 'bytes,', fallbackPptx.slides, 'slides ->', fallbackPptx.file)

  // Error shapes -------------------------------------------------------------
  const expectCode = async (label, action, code) => {
    try {
      await action()
      throw new Error(label + ' should have failed')
    } catch (error) {
      check(error.code === code, label + ': expected code ' + code + ', got ' + error.code + ' (' + error.message + ')')
      console.log('error', label, '->', error.code)
    }
  }
  await expectCode('missing variant', () => exportDesign({ ...web, kind: 'html', variant: 'zzz', pool, previewUrl }), 'not_found')
  await expectCode('png without browser', () => exportDesign({ ...web, kind: 'png', variant: 'a', previewUrl }), 'no_browser')
  await expectCode('pdf without preview', () => exportDesign({ ...web, kind: 'pdf', variant: 'a', pool }), 'no_preview')
  await expectCode('bad kind', () => exportDesign({ ...web, kind: 'docx', pool, previewUrl }), 'invalid_input')

  console.log('\nEXPORT SMOKE OK in', Date.now() - started, 'ms')
} catch (error) {
  console.error('\nEXPORT SMOKE FAILED:', error && error.code, error && error.message)
  console.error(error && error.stack)
  process.exitCode = 1
} finally {
  await pool.dispose().catch(() => {})
  server.close()
  for (const root of roots) await rm(root, { recursive: true, force: true }).catch(() => {})
}
