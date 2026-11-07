/**
 * Unit tests for lib/audit.js — the deterministic CONTRACT §7 rule engine.
 *
 * Run: node --test test/unit/audit.test.mjs
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { GRADE_BANDS, auditDesign, auditFileFindings } from '../../lib/audit.js'

/** A page that should score 100: real typography, 4px rhythm, clean a11y. */
function baseMetrics() {
  const textNodes = [
    {
      px: 16,
      weight: 400,
      contrast: 7.2,
      color: '#1a1a1a',
      bg: '#faf9f6',
      text: '这是一段正文说明文字，长度足够参与统计。',
      selector: 'main p',
      tag: 'p',
      lh: 26,
      ls: 0,
      family: 'Fraunces',
      align: 'start',
      chars: 20,
    },
    {
      px: 44,
      weight: 600,
      contrast: 7.2,
      color: '#1a1a1a',
      bg: '#faf9f6',
      text: '主标题',
      selector: 'main h1',
      tag: 'h1',
      lh: 48,
      ls: -0.9,
      family: 'Fraunces',
      align: 'start',
      chars: 3,
    },
  ]
  return {
    title: '测试页',
    lang: 'zh-CN',
    metaViewport: 'width=device-width, initial-scale=1',
    textSample: '这是一段真实的说明文字，用于验证排版与间距节奏。',
    textLength: 30,
    colors: [{ value: '#faf9f6', count: 10 }, { value: '#1a1a1a', count: 10 }, { value: '#b4552f', count: 3 }],
    backgrounds: [{ value: '#faf9f6', count: 10 }],
    textColors: [{ value: '#1a1a1a', count: 10 }],
    fonts: [{ family: 'Fraunces', weights: [400, 600], sizes: [16, 44], count: 10 }],
    sizes: [16, 20, 44],
    lineHeights: [26, 48],
    spacings: [8, 16, 24, 32],
    radii: [8, 12],
    elements: {
      total: 40,
      headings: { h1: 1, h2: 2, h3: 1, h4: 0, h5: 0, h6: 0 },
      buttons: 2,
      links: 4,
      images: 2,
      imagesWithoutAlt: 0,
      imagesMissingAltAttr: 0,
      forms: 1,
      inputs: 2,
      inputsWithoutLabel: 0,
      landmarks: 3,
      sections: 3,
      svgs: 2,
      videos: 0,
      iframes: 0,
      unnamedControls: 0,
      focusable: 6,
    },
    textNodes,
    smallText: [],
    tapTargets: [],
    contrast: [],
    overflow: { horizontal: false, offenders: [] },
    headingsOrder: ['h1', 'h2', 'h2', 'h3'],
    focusableCount: 6,
    animatedCount: 0,
    gradients: [],
    slopHits: [],
    tokenUsage: {
      colors: [['#faf9f6', 10], ['#1a1a1a', 10], ['#b4552f', 3]],
      fonts: [['Fraunces', 10]],
      sizes: [[16, 6], [20, 2], [44, 1]],
      radii: [[8, 3], [12, 2]],
      spacings: [[8, 4], [16, 6], [24, 3], [32, 2]],
    },
    sections: [
      { index: 1, tag: 'header', className: '', height: 80, paddingTop: 24 },
      { index: 2, tag: 'main', className: '', height: 600, paddingTop: 96 },
      { index: 3, tag: 'footer', className: '', height: 120, paddingTop: 48 },
    ],
    breakpoints: [768],
    render: { consoleErrors: 0, failedRequests: 0, docWidth: 1440, docHeight: 2000 },
    evidence: {
      unnamedControls: [],
      unlabeledInputs: [],
      duplicateIds: [],
      imagesMissingAlt: [],
      fixed: [],
      headings: [{ tag: 'h1', size: 44, family: 'Fraunces', weight: 600, text: '主标题', selector: 'main h1' }],
      leftAccentCards: 0,
    },
  }
}

function page(metrics, width = 1440, height = 900) {
  return { width, height, metrics, screenshot: 'capture-' + width + '.png' }
}

function codes(result) {
  return result.categories.flatMap((category) => category.findings.map((finding) => finding.code))
}

function categoryOf(result, id) {
  return result.categories.find((category) => category.id === id)
}

test('GRADE_BANDS is frozen and descending', () => {
  assert.ok(Object.isFrozen(GRADE_BANDS))
  assert.deepEqual(GRADE_BANDS.map((band) => band.grade), ['A', 'B', 'C', 'D', 'F'])
  for (let index = 1; index < GRADE_BANDS.length; index += 1) {
    assert.ok(GRADE_BANDS[index].min < GRADE_BANDS[index - 1].min)
  }
})

test('a clean page scores 100 / A / pass', () => {
  const result = auditDesign({ pages: [page(baseMetrics())], kind: 'web' })
  assert.equal(result.score, 100)
  assert.equal(result.grade, 'A')
  assert.equal(result.pass, true)
  assert.deepEqual(result.counts, { critical: 0, high: 0, medium: 0, low: 0 })
  assert.deepEqual(codes(result), [])
  assert.equal(result.categories.length, 4)
  assert.equal(result.viewports.length, 1)
  assert.equal(result.viewports[0].width, 1440)
  assert.equal(result.viewports[0].score, 100)
})

test('no evidence yields a zero result, and no system category adds system weights only with tokens', () => {
  const empty = auditDesign({})
  assert.equal(empty.score, 0)
  assert.equal(empty.grade, 'F')
  assert.equal(empty.pass, false)
  assert.deepEqual(empty.viewports, [])
  const noSystem = auditDesign({ pages: [page(baseMetrics())] })
  assert.deepEqual(noSystem.categories.map((category) => category.id), ['a11y', 'type', 'layout', 'slop'])
  const weightSum = noSystem.categories.reduce((sum, category) => sum + category.weight, 0)
  assert.ok(Math.abs(weightSum - 1) < 1e-9)
})

test('critical contrast costs 30 and is reported with a selector and fix', () => {
  const metrics = baseMetrics()
  metrics.contrast = [{ selector: 'p.meta', fg: '#aaaaaa', bg: '#ffffff', ratio: 2.1, large: false, text: '说明' }]
  const result = auditDesign({ pages: [page(metrics)] })
  const a11y = categoryOf(result, 'a11y')
  assert.equal(a11y.score, 70)
  const finding = a11y.findings[0]
  assert.equal(finding.code, 'a11y.contrast')
  assert.equal(finding.severity, 'critical')
  assert.equal(finding.selector, 'p.meta')
  assert.equal(typeof finding.fix, 'string')
  assert.ok(finding.fix.length > 8)
  assert.equal(result.score, 89.5)
  assert.equal(result.grade, 'B')
  assert.equal(result.pass, false)
})

test('low contrast below 4.5 but above 3 is high, large text uses the 3:1 threshold', () => {
  const metrics = baseMetrics()
  metrics.contrast = [
    { selector: 'p.body', fg: '#767676', bg: '#ffffff', ratio: 4.1, large: false },
    { selector: 'h1.title', fg: '#949494', bg: '#ffffff', ratio: 2.9, large: true },
  ]
  const result = auditDesign({ pages: [page(metrics)] })
  const finding = categoryOf(result, 'a11y').findings.find((row) => row.code === 'a11y.contrast')
  assert.ok(finding)
  assert.equal(finding.severity, 'critical')
})

test('missing lang and title are flagged in a11y', () => {
  const metrics = baseMetrics()
  metrics.lang = ''
  metrics.title = ''
  const result = auditDesign({ pages: [page(metrics)] })
  const found = codes(result)
  assert.ok(found.includes('a11y.lang'))
  assert.ok(found.includes('a11y.title'))
})

test('one empty-alt decorative image is not flagged, a missing alt attribute is', () => {
  const decorative = baseMetrics()
  decorative.elements.images = 1
  decorative.elements.imagesWithoutAlt = 1
  const result = auditDesign({ pages: [page(decorative)] })
  assert.equal(codes(result).includes('a11y.images_alt'), false)

  const broken = baseMetrics()
  broken.elements.images = 3
  broken.elements.imagesWithoutAlt = 3
  broken.elements.imagesMissingAltAttr = 3
  broken.evidence.imagesMissingAlt = [{ selector: 'img.hero', src: 'hero.png' }]
  const brokenResult = auditDesign({ pages: [page(broken)] })
  const finding = categoryOf(brokenResult, 'a11y').findings.find((row) => row.code === 'a11y.images_alt')
  assert.ok(finding)
  assert.equal(finding.severity, 'high')
  assert.equal(finding.selector, 'img.hero')
})

test('unnamed controls and unlabelled inputs are reported', () => {
  const metrics = baseMetrics()
  metrics.elements.unnamedControls = 2
  metrics.evidence.unnamedControls = [{ selector: 'button.icon', tag: 'button', text: '' }, { selector: 'a.social', tag: 'a', text: '' }]
  metrics.elements.inputsWithoutLabel = 1
  metrics.evidence.unlabeledInputs = [{ selector: 'input.email', type: 'email', placeholder: 'you@example.com' }]
  const result = auditDesign({ pages: [page(metrics)] })
  const found = categoryOf(result, 'a11y').findings
  assert.equal(found.find((row) => row.code === 'a11y.unnamed_controls').severity, 'high')
  assert.equal(found.find((row) => row.code === 'a11y.input_labels').severity, 'medium')
})

test('heading order skips and missing h1 are detected', () => {
  const skip = baseMetrics()
  skip.headingsOrder = ['h1', 'h3']
  const skipResult = auditDesign({ pages: [page(skip)] })
  assert.ok(codes(skipResult).includes('a11y.heading_skip'))

  const noH1 = baseMetrics()
  noH1.headingsOrder = ['h2', 'h3']
  const noH1Result = auditDesign({ pages: [page(noH1)] })
  assert.ok(codes(noH1Result).includes('a11y.heading_h1'))
})

test('tap targets are only judged at mobile widths', () => {
  const metrics = baseMetrics()
  metrics.tapTargets = [{ selector: 'a.icon', width: 32, height: 32, text: '' }]
  const mobile = auditDesign({ pages: [page(metrics, 375, 812)] })
  assert.ok(codes(mobile).includes('a11y.tap_targets'))
  const desktop = auditDesign({ pages: [page(metrics, 1440, 900)] })
  assert.equal(codes(desktop).includes('a11y.tap_targets'), false)
})

test('horizontal overflow is critical in a11y on mobile and high in layout on desktop', () => {
  const metrics = baseMetrics()
  metrics.overflow = { horizontal: true, offenders: [{ selector: 'div.wide', width: 900 }] }
  const mobile = auditDesign({ pages: [page(metrics, 375, 812)] })
  const mobileFinding = categoryOf(mobile, 'a11y').findings.find((row) => row.code === 'a11y.overflow')
  assert.equal(mobileFinding.severity, 'critical')
  assert.equal(mobileFinding.selector, 'div.wide')
  const desktop = auditDesign({ pages: [page(metrics, 1440, 900)] })
  assert.equal(categoryOf(desktop, 'layout').findings.some((row) => row.code === 'layout.overflow'), true)
  assert.equal(categoryOf(desktop, 'a11y').findings.some((row) => row.code === 'a11y.overflow'), false)
})

test('display font blacklist, family count and body size are typed findings', () => {
  const metrics = baseMetrics()
  metrics.fonts = [{ family: 'Inter Tight', weights: [400, 700], sizes: [16, 44], count: 12 }]
  metrics.evidence.headings = [{ tag: 'h1', size: 44, family: 'Inter Tight', weight: 700, text: '标题', selector: 'main h1' }]
  metrics.textNodes = [
    { px: 13, weight: 400, contrast: 7, color: '#333333', bg: '#ffffff', text: '正文偏小需要被识别出来。', selector: 'main p', tag: 'p', lh: 18, ls: 0, family: 'Inter Tight', align: 'start', chars: 14 },
    { px: 13, weight: 400, contrast: 7, color: '#333333', bg: '#ffffff', text: '第二段偏小正文说明文字。', selector: 'main p:nth-of-type(2)', tag: 'p', lh: 18, ls: 0, family: 'Inter Tight', align: 'start', chars: 12 },
  ]
  const result = auditDesign({ pages: [page(metrics)] })
  const type = categoryOf(result, 'type')
  assert.ok(type.findings.some((row) => row.code === 'type.display_font'))
  assert.ok(type.findings.some((row) => row.code === 'type.body_size'))
  assert.equal(type.findings.find((row) => row.code === 'type.display_font').severity, 'high')
})

test('more than three font families and too many sizes are type findings', () => {
  const metrics = baseMetrics()
  metrics.tokenUsage.fonts = [['Fraunces', 9], ['Inter Tight', 4], ['JetBrains Mono', 3], ['Cormorant', 2], ['monospace', 6]]
  metrics.tokenUsage.sizes = Array.from({ length: 12 }, (_, index) => [10 + index, 1])
  const result = auditDesign({ pages: [page(metrics)] })
  const type = categoryOf(result, 'type')
  assert.equal(type.findings.find((row) => row.code === 'type.font_families').severity, 'medium')
  assert.ok(type.findings.some((row) => row.code === 'type.size_count'))
})

test('layout: off-grid spacing, too many spacings, flat sections, odd radii, empty page, fixed overlay', () => {
  const metrics = baseMetrics()
  metrics.tokenUsage.spacings = [[7, 6], [13, 5], [16, 4], [8, 3], [9, 2], [11, 2], [15, 2], [21, 2], [23, 1], [27, 1], [31, 1], [33, 1], [37, 1]]
  metrics.spacings = metrics.tokenUsage.spacings.map((row) => row[0])
  metrics.textLength = 800
  metrics.sections = [
    { index: 1, tag: 'header', className: '', height: 80, paddingTop: 16 },
    { index: 2, tag: 'section', className: '', height: 90, paddingTop: 16 },
    { index: 3, tag: 'section', className: '', height: 100, paddingTop: 16 },
  ]
  metrics.tokenUsage.radii = [[6, 3], [10, 3], [14, 2], [8, 1]]
  metrics.radii = [6, 10, 14, 8]
  metrics.render.docHeight = 300
  metrics.evidence.fixed = [{ selector: 'header.sticky', height: 320, position: 'fixed' }]
  const result = auditDesign({ pages: [page(metrics)] })
  const layout = categoryOf(result, 'layout')
  const found = layout.findings.map((row) => row.code)
  assert.ok(found.includes('layout.spacing_grid'))
  assert.ok(found.includes('layout.spacing_count'))
  assert.ok(found.includes('layout.section_height'))
  assert.ok(found.includes('layout.radii'))
  assert.ok(found.includes('layout.empty'))
  assert.ok(found.includes('layout.fixed_overlay'))
})

test('slop: purple gradient is critical on a hero, warm gradients are ignored', () => {
  const purple = baseMetrics()
  purple.gradients = [{ selector: 'section.hero', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', area: 900000 }]
  const purpleResult = auditDesign({ pages: [page(purple)] })
  const finding = categoryOf(purpleResult, 'slop').findings.find((row) => row.code === 'slop.gradient')
  assert.equal(finding.severity, 'critical')

  const warm = baseMetrics()
  warm.gradients = [{ selector: 'section.hero', value: 'linear-gradient(135deg, #a8401c 0%, #d97a4a 100%)', area: 900000 }]
  const warmResult = auditDesign({ pages: [page(warm)] })
  assert.equal(codes(warmResult).includes('slop.gradient'), false)
})

test('slop: emoji wall, lorem ipsum, fake names, placeholder hosts, left-accent cards, cookie cutter, icon wall, unsourced stats', () => {
  const metrics = baseMetrics()
  metrics.textSample = '🚀✨🔥💡📊🎯😀 立刻注册，已经有 10,000+ 团队在使用。'
  metrics.slopHits = [
    { code: 'placeholder-host', selector: 'img.card', detail: 'https://placehold.co/600x400' },
    { code: 'left-accent-cards', selector: '.card', detail: '3' },
    { code: 'cookie-cutter', selector: '', detail: 'hero+3cards+cta+footer' },
    { code: 'icon-card-wall', selector: '', detail: '12' },
  ]
  const result = auditDesign({ pages: [page(metrics)] })
  const found = codes(result)
  assert.ok(found.includes('slop.emoji'))
  assert.ok(found.includes('slop.placeholder_hosts'))
  assert.ok(found.includes('slop.left_accent_cards'))
  assert.ok(found.includes('slop.cookie_cutter'))
  assert.ok(found.includes('slop.icon_card_wall'))
  assert.ok(found.includes('slop.unsourced_stats'))

  const lorem = baseMetrics()
  lorem.textSample = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
  assert.ok(codes(auditDesign({ pages: [page(lorem)] })).includes('slop.lorem'))

  const fake = baseMetrics()
  fake.textSample = 'John Doe, CEO at Acme Corp — 这是占位证言。'
  assert.ok(codes(auditDesign({ pages: [page(fake)] })).includes('slop.fake_names'))
})

test('findings are de-duplicated across viewports but each viewport keeps its own score', () => {
  const desktop = baseMetrics()
  const mobile = baseMetrics()
  desktop.contrast = [{ selector: 'p.meta', fg: '#aaaaaa', bg: '#ffffff', ratio: 2.1, large: false }]
  mobile.contrast = [{ selector: 'p.meta', fg: '#aaaaaa', bg: '#ffffff', ratio: 2.2, large: false }]
  const result = auditDesign({ pages: [page(desktop, 1440, 900), page(mobile, 375, 812)] })
  const contrastFindings = categoryOf(result, 'a11y').findings.filter((row) => row.code === 'a11y.contrast')
  assert.equal(contrastFindings.length, 1)
  assert.equal(result.viewports.length, 2)
  assert.equal(result.viewports[0].width, 1440)
  assert.equal(result.viewports[1].width, 375)
  assert.equal(result.viewports[0].findings.filter((row) => row.code === 'a11y.contrast').length, 1)
})

test('a token system adds the system category and reports off-palette / off-scale usage', () => {
  const metrics = baseMetrics()
  metrics.tokenUsage = {
    colors: [['#ff00aa', 8], ['#1a1a1a', 4]],
    fonts: [['Fraunces', 10]],
    sizes: [[16, 4], [23, 3]],
    radii: [[8, 3]],
    spacings: [[16, 3]],
  }
  const system = {
    tokens: {
      color: { bg: '#faf9f6', ink: '#1a1a1a', accent: '#b4552f' },
      font: { display: { family: 'Fraunces' }, body: { family: 'Fraunces' } },
      size: { scale: [16, 20, 44] },
      space: { scale: [8, 16, 24, 32] },
      radius: { scale: [8, 12] },
    },
  }
  const result = auditDesign({ pages: [page(metrics)], system })
  assert.deepEqual(result.categories.map((category) => category.id), ['a11y', 'type', 'layout', 'system', 'slop'])
  const systemCategory = categoryOf(result, 'system')
  assert.ok(systemCategory.score < 100)
  assert.ok(systemCategory.findings.some((row) => row.code === 'system.colors'))
  assert.ok(systemCategory.findings.some((row) => row.code === 'system.sizes'))
})

test('a system with matching usage leaves the system category at 100', () => {
  const system = {
    tokens: {
      color: { bg: '#faf9f6', ink: '#1a1a1a', accent: '#b4552f' },
      font: { body: { family: 'Fraunces', stack: '"Fraunces", Georgia, serif' } },
      size: { scale: [16, 20, 44] },
      space: { scale: [8, 16, 24, 32] },
      radius: { scale: [8, 12] },
    },
  }
  const result = auditDesign({ pages: [page(baseMetrics())], system })
  assert.equal(categoryOf(result, 'system').score, 100)
  assert.equal(result.score, 100)
})

test('deck screens are scored per screen and averaged, without tap-target rules', () => {
  const clean = baseMetrics()
  clean.tapTargets = [{ selector: 'a.icon', width: 20, height: 20, text: '' }]
  const bad = baseMetrics()
  bad.contrast = [{ selector: 'p.meta', fg: '#aaaaaa', bg: '#ffffff', ratio: 2, large: false }]
  bad.headingsOrder = ['h2', 'h3']
  const result = auditDesign({
    kind: 'deck',
    screens: [
      { label: '01 封面', index: 1, metrics: clean, screenshot: 'screen-01.png' },
      { label: '02 数据', index: 2, metrics: bad, screenshot: 'screen-02.png' },
    ],
  })
  assert.equal(result.screens.length, 2)
  assert.equal(result.screens[0].label, '01 封面')
  assert.equal(result.screens[0].score, 100)
  assert.equal(result.screens[1].score, 89.5)
  assert.equal(result.score, 94.8)
  assert.equal(result.grade, 'A')
  assert.equal(result.viewports.length, 0)
  assert.equal(result.categories.find((category) => category.id === 'a11y').score, 85)
  assert.equal(result.screens[0].findings.some((row) => row.code === 'a11y.tap_targets'), false)
  assert.equal(result.screens[1].findings.some((row) => row.code === 'a11y.heading_h1'), false)
})

test('deck uses the 24px slide text threshold', () => {
  const metrics = baseMetrics()
  metrics.textNodes = [
    { px: 18, weight: 400, contrast: 7, color: '#111111', bg: '#ffffff', text: '幻灯片正文偏小，需要被识别出来。', selector: '.screen p', tag: 'p', lh: 26, ls: 0, family: 'Fraunces', align: 'start', chars: 18 },
    { px: 18, weight: 400, contrast: 7, color: '#111111', bg: '#ffffff', text: '第二段同样偏小的正文说明。', selector: '.screen p:nth-of-type(2)', tag: 'p', lh: 26, ls: 0, family: 'Fraunces', align: 'start', chars: 14 },
    { px: 18, weight: 400, contrast: 7, color: '#111111', bg: '#ffffff', text: '第三段偏小正文。', selector: '.screen p:nth-of-type(3)', tag: 'p', lh: 26, ls: 0, family: 'Fraunces', align: 'start', chars: 10 },
  ]
  metrics.fonts = [{ family: 'Fraunces', weights: [400], sizes: [18, 64], count: 6 }]
  const result = auditDesign({ kind: 'deck', screens: [{ label: '01', metrics }] })
  const bodySize = categoryOf(result, 'type').findings.find((row) => row.code === 'type.body_size')
  assert.ok(bodySize)
  assert.equal(bodySize.value, 18)
})

test('mobile kind applies mobile body-size and tiny-text thresholds at every width', () => {
  const metrics = baseMetrics()
  metrics.textNodes = [
    { px: 15, weight: 400, contrast: 7, color: '#111111', bg: '#ffffff', text: '手机端正文说明文字，应该按 14px 下限判断。', selector: 'main p', tag: 'p', lh: 24, ls: 0, family: 'Fraunces', align: 'start', chars: 20 },
    { px: 15, weight: 400, contrast: 7, color: '#111111', bg: '#ffffff', text: '第二段手机端正文说明文字。', selector: 'main p:nth-of-type(2)', tag: 'p', lh: 24, ls: 0, family: 'Fraunces', align: 'start', chars: 14 },
    { px: 10, weight: 400, contrast: 7, color: '#111111', bg: '#ffffff', text: '极小说明文字', selector: '.tiny', tag: 'span', lh: 14, ls: 0, family: 'Fraunces', align: 'start', chars: 6 },
    { px: 10, weight: 400, contrast: 7, color: '#111111', bg: '#ffffff', text: '另一段极小文字', selector: '.tiny-2', tag: 'span', lh: 14, ls: 0, family: 'Fraunces', align: 'start', chars: 8 },
  ]
  const result = auditDesign({ pages: [page(metrics, 390, 844)], kind: 'mobile' })
  const found = codes(result)
  assert.equal(found.includes('type.body_size'), false)
  assert.ok(found.includes('a11y.tiny_text'))
})

test('severity deduction is capped at ten findings per category', () => {
  const metrics = baseMetrics()
  // Two criticals (contrast + mobile overflow) plus one medium: 30 + 30 + 7 = 67.
  metrics.contrast = [{ selector: 'p.meta', fg: '#aaaaaa', bg: '#ffffff', ratio: 1.8, large: false }]
  metrics.overflow = { horizontal: true, offenders: [{ selector: '.wide', width: 999 }] }
  metrics.elements.duplicateIds = 2
  metrics.evidence.duplicateIds = [{ id: 'row', count: 2 }]
  const result = auditDesign({ pages: [page(metrics, 375, 812)] })
  const a11y = categoryOf(result, 'a11y')
  assert.equal(a11y.score, 100 - 30 - 30 - 3)
  assert.ok(a11y.findings.length <= 10)
})

test('auditFileFindings scans source for the obvious slop patterns', () => {
  const html = `<!DOCTYPE html><html><head><title>x</title><style>
    .hero { background: linear-gradient(135deg, #667eea, #764ba2); }
    h1 { font-family: 'Inter', sans-serif; }
  </style></head><body><p>Lorem ipsum dolor sit amet.</p><div>🚀✨🔥💡📊🎯😀</div></body></html>`
  const findings = auditFileFindings(html, { kind: 'web' })
  const found = findings.map((finding) => finding.code)
  assert.ok(found.includes('slop.gradient'))
  assert.ok(found.includes('type.display_font'))
  assert.ok(found.includes('slop.lorem'))
  assert.ok(found.includes('slop.emoji'))
  assert.ok(found.includes('a11y.lang'))
  for (const finding of findings) {
    assert.equal(typeof finding.message, 'string')
    assert.equal(typeof finding.fix, 'string')
  }
})

test('audit is deterministic for the same input', () => {
  const metrics = baseMetrics()
  metrics.contrast = [{ selector: 'p', fg: '#999999', bg: '#ffffff', ratio: 3.4, large: false }]
  const first = auditDesign({ pages: [page(metrics)] })
  const second = auditDesign({ pages: [page(baseMetrics())] })
  const third = auditDesign({ pages: [page(metrics)] })
  assert.deepEqual(first, third)
  assert.notDeepEqual(first, second)
})
