/**
 * probe smoke check — run against a live demo page.
 *
 *   node test/fixtures/probe-smoke.mjs [url] [kind]
 *
 * Launches the real browser through lib/browser.js, probes one URL at two
 * widths (and, for decks, every `[data-screen-label]` screen), then prints the
 * captured files and a digest of the metrics so a broken CDP path is obvious.
 * Not part of `npm test`; it is the manual verification used during the build.
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BrowserPool } from '../../lib/browser.js'
import { probeDesign } from '../../lib/probe.js'

const url = process.argv[2] || 'http://127.0.0.1:8099/a.html'
const kind = process.argv[3] || 'web'
const widths = kind === 'deck' ? [1920] : kind === 'mobile' ? [390, 375] : [1440, 375]

function digest(metrics) {
  return {
    title: metrics.title,
    lang: metrics.lang,
    textLength: metrics.textLength,
    colors: metrics.colors.length,
    fonts: metrics.fonts.length,
    sizes: metrics.sizes.slice(0, 8),
    elements: metrics.elements,
    textNodes: metrics.textNodes.length,
    contrast: metrics.contrast.length,
    smallText: metrics.smallText.length,
    tapTargets: metrics.tapTargets.length,
    headingsOrder: metrics.headingsOrder.slice(0, 8),
    overflow: metrics.overflow.horizontal,
    sections: metrics.sections.length,
    slopHits: metrics.slopHits.map((hit) => hit.code + ':' + hit.detail),
    tokenColors: metrics.tokenUsage.colors.slice(0, 5),
    tokenFonts: metrics.tokenUsage.fonts.slice(0, 4),
    docHeight: metrics.render.docHeight,
  }
}

const dir = await mkdtemp(join(tmpdir(), 'ds-probe-smoke-'))
const pool = new BrowserPool({ log: { warn: (message) => console.log('[warn]', message), info: () => {} } })
const started = Date.now()
try {
  console.log('probe', { url, kind, widths, dir })
  const result = await probeDesign({ pool, url, widths, kind, dir, screens: kind === 'deck' })
  console.log('durationMs', result.durationMs, 'wall', Date.now() - started)
  console.log('health', JSON.stringify(result.health))
  for (const page of result.pages) {
    const file = join(dir, page.screenshot)
    const info = await stat(file)
    const head = (await readFile(file)).subarray(0, 8)
    console.log('page', page.width, 'screenshot', page.screenshot, 'bytes', info.size, 'pngSignature', head.subarray(0, 4).toString('hex') === '89504e47')
    console.log('  metrics:', JSON.stringify(digest(page.metrics)))
  }
  for (const screen of result.screens) {
    const info = await stat(join(dir, screen.screenshot))
    console.log('screen', screen.index, JSON.stringify(screen.label), screen.screenshot, 'bytes', info.size, 'textLength', screen.metrics.textLength)
  }
  console.log('files', (await readdir(dir)).sort().join(', '))
  const hash = createHash('sha256').update(JSON.stringify(result.pages.map((page) => digest(page.metrics)))).digest('hex').slice(0, 16)
  console.log('metricsDigest', hash)
  console.log('SMOKE OK')
} catch (error) {
  console.error('SMOKE FAILED', error && error.code, error && error.message)
  console.error(error && error.stack)
  process.exitCode = 1
} finally {
  await pool.dispose()
}
