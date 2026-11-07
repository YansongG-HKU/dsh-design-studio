/**
 * Unit tests for lib/tokens.js — normalisation, CSS/Tailwind/repo extraction,
 * image palette decoding, usage normalisation and system comparison.
 *
 * Run: node --test test/unit/tokens.test.mjs
 */

import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { encodePng } from '../../lib/png.js'
import {
  compareToSystem,
  emptyTokens,
  normalizeTokens,
  scanRepo,
  tokenUsage,
  tokensFromCssText,
  tokensFromFiles,
  tokensFromImageBuffer,
} from '../../lib/tokens.js'

test('emptyTokens returns a fresh frozen-shape token object', () => {
  const first = emptyTokens()
  const second = emptyTokens()
  assert.equal(first.name, '')
  assert.deepEqual(first.color, { bg: '', surface: '', ink: '', muted: '', accent: '', border: '', extra: [] })
  assert.deepEqual(first.font.display, { family: '', stack: '', weights: [] })
  assert.deepEqual(first.size.scale, [])
  assert.deepEqual(first.layout, { maxWidth: 0, gutter: 0, breakpoints: [] })
  first.color.extra.push('#ffffff')
  assert.deepEqual(second.color.extra, [])
})

test('normalizeTokens fills defaults and drops unknown keys', () => {
  const tokens = normalizeTokens(null)
  assert.equal(tokens.source.kind, 'manual')
  assert.deepEqual(tokens.font.mono.weights, [])
  const withJunk = normalizeTokens({ name: '  品牌  ', bogus: 1, color: { bg: '#FFF', ink: 'rgb(26, 26, 26)', accent: 'not-a-color' } })
  assert.equal(withJunk.name, '品牌')
  assert.equal(withJunk.color.bg, '#ffffff')
  assert.equal(withJunk.color.ink, '#1a1a1a')
  assert.equal(withJunk.color.accent, '')
  assert.equal(Object.hasOwn(withJunk, 'bogus'), false)
})

test('normalizeTokens bounds scales, weights and layout', () => {
  const tokens = normalizeTokens({
    size: { scale: [64, 12, 64, 8, 999, 16] },
    space: { scale: [24, 4, 24, -8, 800] },
    radius: { scale: [999, 0, 8, 8, 2000] },
    layout: { maxWidth: 99999, gutter: 500, breakpoints: [1200, 640, 640, 9000] },
    font: { body: { family: 'Inter Tight', stack: '  "Inter Tight", sans-serif  ', weights: [400, 450, 600, 1200, 600] } },
  })
  assert.deepEqual(tokens.size.scale, [8, 12, 16, 64])
  assert.deepEqual(tokens.space.scale, [4, 24])
  assert.deepEqual(tokens.radius.scale, [0, 8, 999])
  assert.deepEqual(tokens.layout.breakpoints, [640, 1200])
  assert.equal(tokens.layout.maxWidth, 4000)
  assert.equal(tokens.layout.gutter, 200)
  assert.deepEqual(tokens.font.body.weights, [400, 500, 600])
  assert.equal(tokens.font.body.family, 'Inter Tight')
})

test('normalizeTokens unwraps a {tokens} wrapper and validates source', () => {
  const tokens = normalizeTokens({ tokens: { name: 'wrapped', color: { bg: '#faf9f6' }, source: { kind: 'url', ref: 'https://example.com', at: '2026-01-01T00:00:00.000Z' } } })
  assert.equal(tokens.name, 'wrapped')
  assert.equal(tokens.color.bg, '#faf9f6')
  assert.equal(tokens.source.kind, 'url')
  assert.equal(tokens.source.ref, 'https://example.com')
  assert.equal(tokens.source.at, '2026-01-01T00:00:00.000Z')
  assert.equal(normalizeTokens({ source: { kind: 'nonsense' } }).source.kind, 'manual')
})

test('tokensFromCssText reads custom properties into roles', () => {
  const css = `
    :root {
      --color-bg: #faf9f6;
      --color-surface: #ffffff;
      --color-ink: #1a1a1a;
      --color-muted: #6b6b66;
      --color-accent: #b4552f;
      --color-border: #e4e2db;
      --font-display: "Fraunces", Georgia, serif;
      --font-body: "Inter Tight", system-ui, sans-serif;
      --font-mono: "JetBrains Mono", ui-monospace, monospace;
      --space-4: 4px;
      --space-8: 8px;
      --space-16: 16px;
      --radius-sm: 4px;
      --radius-md: 8px;
      --font-size-body: 16px;
      --font-size-title: 44px;
    }
    h1 { font-size: 44px; line-height: 1.1; }
    @media (max-width: 900px) { h1 { font-size: 32px; } }
  `
  const tokens = tokensFromCssText(css)
  assert.equal(tokens.color.bg, '#faf9f6')
  assert.equal(tokens.color.surface, '#ffffff')
  assert.equal(tokens.color.ink, '#1a1a1a')
  assert.equal(tokens.color.muted, '#6b6b66')
  assert.equal(tokens.color.accent, '#b4552f')
  assert.equal(tokens.color.border, '#e4e2db')
  assert.equal(tokens.font.display.family, 'Fraunces')
  assert.equal(tokens.font.body.family, 'Inter Tight')
  assert.equal(tokens.font.mono.family, 'JetBrains Mono')
  assert.deepEqual(tokens.size.scale, [16, 32, 44])
  assert.ok(tokens.space.scale.includes(4) && tokens.space.scale.includes(8) && tokens.space.scale.includes(16))
  assert.ok(tokens.radius.scale.includes(4) && tokens.radius.scale.includes(8))
  assert.ok(tokens.layout.breakpoints.includes(900))
  assert.equal(tokens.source.kind, 'manual')
})

test('tokensFromCssText derives palette roles from selector context when no tokens exist', () => {
  const tokens = tokensFromCssText(`
    body { background: #fbf8f0; color: #16181a; }
    .accent { color: #a8401c; background-color: #a8401c; }
    .card { background: #fffdf7; border: 1px solid #d8d0be; }
    .tag { color: #7a6a52; }
  `)
  assert.equal(tokens.color.bg, '#fbf8f0')
  assert.equal(tokens.color.ink, '#16181a')
  assert.equal(tokens.color.accent, '#a8401c')
  assert.equal(tokens.color.surface, '#fffdf7')
  assert.equal(tokens.color.border, '#d8d0be')
  assert.ok(tokens.color.extra.includes('#7a6a52'))
})

test('tokensFromCssText returns the empty schema for junk input', () => {
  const empty = tokensFromCssText(null)
  assert.deepEqual(empty.size.scale, [])
  assert.deepEqual(empty.color.extra, [])
})

test('tokensFromFiles merges Tailwind config values', () => {
  const tailwind = `export default {
    theme: {
      colors: {
        background: '#faf9f6',
        ink: '#1a1a1a',
        muted: '#6b6b66',
        accent: '#b4552f',
        border: '#e4e2db',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter Tight', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: { sm: '0.875rem', base: '1rem', xl: '1.375rem' },
      spacing: { 4: '16px', 8: '32px' },
      borderRadius: { md: '8px', lg: '12px' },
      screens: { md: '768px', xl: '1200px' },
    },
  }`
  const tokens = tokensFromFiles([{ path: 'tailwind.config.js', text: tailwind }])
  assert.equal(tokens.color.bg, '#faf9f6')
  assert.equal(tokens.color.ink, '#1a1a1a')
  assert.equal(tokens.color.accent, '#b4552f')
  assert.equal(tokens.font.display.family, 'Fraunces')
  assert.equal(tokens.font.mono.family, 'JetBrains Mono')
  assert.ok(tokens.size.scale.includes(14) && tokens.size.scale.includes(16) && tokens.size.scale.includes(22))
  assert.ok(tokens.space.scale.includes(16) && tokens.space.scale.includes(32))
  assert.ok(tokens.radius.scale.includes(8) && tokens.radius.scale.includes(12))
  assert.ok(tokens.layout.breakpoints.includes(768) && tokens.layout.breakpoints.includes(1200))
  assert.equal(tokens.source.kind, 'repo')
})

test('tokensFromFiles reads <style> blocks from HTML', () => {
  const html = `<!DOCTYPE html><html><head><title>x</title><style>:root { --color-bg: #f3eee3; --color-ink: #171a1c; --color-accent: #a8401c; }</style></head><body></body></html>`
  const tokens = tokensFromFiles([{ path: 'index.html', text: html }])
  assert.equal(tokens.color.bg, '#f3eee3')
  assert.equal(tokens.color.ink, '#171a1c')
  assert.equal(tokens.color.accent, '#a8401c')
})

test('scanRepo walks bounded sources and skips vendor folders', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ds-tokens-scan-'))
  try {
    await mkdir(join(root, 'src'), { recursive: true })
    await mkdir(join(root, 'node_modules', 'dep'), { recursive: true })
    await writeFile(join(root, 'src', 'theme.css'), ':root { --color-bg: #faf9f6; --color-ink: #202020; --space-8: 8px; }', 'utf8')
    await writeFile(join(root, 'tailwind.config.js'), "export default { theme: { colors: { accent: '#b4552f' } } }", 'utf8')
    await writeFile(join(root, 'node_modules', 'dep', 'index.css'), ':root { --color-bg: #ff00ff; }', 'utf8')
    await writeFile(join(root, 'src', 'ignored.txt'), 'not scanned', 'utf8')
    await writeFile(join(root, 'src', 'huge.css'), ':root { --color-bg: #123456; }' + ' '.repeat(300 * 1024), 'utf8')
    const result = await scanRepo(root, { maxFiles: 20 })
    assert.equal(result.tokens.color.bg, '#faf9f6')
    assert.equal(result.tokens.color.ink, '#202020')
    assert.equal(result.tokens.color.accent, '#b4552f')
    assert.ok(result.files.includes('src/theme.css'))
    assert.ok(result.files.includes('tailwind.config.js'))
    assert.equal(result.files.some((file) => file.includes('node_modules')), false)
    assert.equal(result.files.some((file) => file.includes('huge.css')), false)
    assert.equal(result.files.some((file) => file.includes('ignored.txt')), false)
    assert.ok(result.scanned >= 2)
    assert.deepEqual(result.errors, [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('scanRepo never throws on a missing directory', async () => {
  const result = await scanRepo(join(tmpdir(), 'ds-tokens-does-not-exist-xyz'))
  assert.deepEqual(result.files, [])
  assert.ok(result.errors.length > 0)
})

test('tokensFromImageBuffer returns a ranked palette from a PNG', () => {
  const width = 8
  const height = 8
  const rgba = new Uint8Array(width * height * 4)
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4
    if (index < 32) {
      rgba[offset] = 255
      rgba[offset + 3] = 255
    } else {
      rgba[offset + 2] = 255
      rgba[offset + 3] = 255
    }
  }
  const png = encodePng(rgba, width, height)
  const result = tokensFromImageBuffer(png)
  assert.equal(result.width, width)
  assert.equal(result.height, height)
  assert.equal(result.format, 'png')
  assert.equal(result.palette.length, 2)
  assert.equal(result.palette[0].hex, '#ff0000')
  assert.equal(result.palette[1].hex, '#0000ff')
  assert.ok(Math.abs(result.palette[0].ratio - 0.5) < 0.001)
})

test('tokensFromImageBuffer rejects unsupported and invalid images', () => {
  assert.throws(() => tokensFromImageBuffer(Buffer.from('not an image at all')), (error) => error.code === 'unsupported_image')
  const jpeg = Buffer.alloc(32)
  jpeg[0] = 0xff
  jpeg[1] = 0xd8
  jpeg[2] = 0xff
  jpeg[3] = 0xe0
  assert.throws(() => tokensFromImageBuffer(jpeg), (error) => error.code === 'unsupported_image' && error.format === 'jpeg')
})

test('tokenUsage normalises the probe metrics shape', () => {
  const usage = tokenUsage({
    tokenUsage: {
      colors: [['#1A1A1A', 10], ['#faf9f6', 3]],
      fonts: [['Fraunces', 4]],
      sizes: [[16, 9], [12.5, 2]],
      radii: [[8, 5]],
      spacings: [[16, 7]],
    },
    colors: [{ value: '#ffffff', count: 1 }],
  })
  assert.deepEqual(usage.colors, [['#1a1a1a', 10], ['#faf9f6', 3]])
  assert.deepEqual(usage.fonts, [['Fraunces', 4]])
  assert.deepEqual(usage.sizes, [[16, 9], [12.5, 2]])
  assert.deepEqual(usage.radii, [[8, 5]])
  assert.deepEqual(usage.spacings, [[16, 7]])
})

test('tokenUsage falls back to colours/fonts/sizes arrays', () => {
  const usage = tokenUsage({
    colors: [{ value: '#ff0000', count: 2 }, { value: '#00ff00', count: 1 }],
    fonts: [{ family: 'Georgia', count: 3 }],
    sizes: [14, 14, 18],
  })
  assert.deepEqual(usage.colors, [['#ff0000', 2], ['#00ff00', 1]])
  assert.deepEqual(usage.fonts, [['Georgia', 3]])
  assert.deepEqual(usage.sizes, [[14, 2], [18, 1]])
  assert.deepEqual(usage.radii, [])
})

test('compareToSystem passes near-equal colours, fonts and ±1px scales', () => {
  const tokens = normalizeTokens({
    color: { bg: '#faf9f6', ink: '#1a1a1a', accent: '#b4552f' },
    font: { display: { family: 'Fraunces', stack: '"Fraunces", Georgia, serif', weights: [400] }, body: { family: 'Inter Tight', stack: '"Inter Tight", sans-serif' } },
    size: { scale: [12, 16, 24, 32] },
    space: { scale: [4, 8, 16, 24] },
    radius: { scale: [0, 8, 12, 999] },
  })
  const usage = {
    colors: [['#faf9f6', 20], ['#ffffff', 4], ['#1a1a1a', 12], ['#b4552f', 3]],
    fonts: [['fraunces', 6], ['Inter Tight', 9]],
    sizes: [[16, 10], [25, 3]],
    spacings: [[17, 4], [8, 6]],
    radii: [[9, 4], [999, 2]],
  }
  const result = compareToSystem(usage, tokens)
  assert.equal(result.checked, true)
  assert.equal(result.score, 100)
  assert.deepEqual(result.violations.colors, [])
  assert.deepEqual(result.violations.fonts, [])
  assert.deepEqual(result.violations.sizes, [])
  assert.deepEqual(result.violations.spacings, [])
})

test('compareToSystem reports off-palette colours, fonts and off-scale values', () => {
  const tokens = normalizeTokens({
    color: { bg: '#faf9f6', ink: '#1a1a1a', accent: '#b4552f' },
    font: { display: { family: 'Fraunces', stack: '"Fraunces", Georgia, serif' } },
    size: { scale: [12, 16, 24] },
    space: { scale: [8, 16] },
    radius: { scale: [4, 8] },
  })
  const usage = {
    colors: [['#ff00aa', 10], ['#1a1a1a', 2]],
    fonts: [['Fraunces', 4], ['Comic Sans MS', 2]],
    sizes: [[20, 5], [16, 3]],
    spacings: [[11, 4]],
    radii: [[40, 3]],
  }
  const result = compareToSystem(usage, tokens)
  assert.equal(result.checked, true)
  assert.ok(result.score < 100)
  assert.equal(result.violations.colors[0].value, '#ff00aa')
  assert.ok(result.violations.colors[0].distance > 12)
  assert.equal(result.violations.fonts[0].value, 'Comic Sans MS')
  assert.equal(result.violations.sizes[0].value, 20)
  assert.equal(result.violations.spacings[0].value, 11)
  assert.equal(result.violations.radii[0].value, 40)
  assert.ok(result.dimensions.colors < 100)
})

test('compareToSystem is unchecked when the system or the usage carries no data', () => {
  const noSystem = compareToSystem({ colors: [['#ff0000', 5]] }, {})
  assert.equal(noSystem.checked, false)
  assert.equal(noSystem.score, 100)
  const noUsage = compareToSystem({}, normalizeTokens({ color: { bg: '#ffffff' } }))
  assert.equal(noUsage.checked, false)
})
