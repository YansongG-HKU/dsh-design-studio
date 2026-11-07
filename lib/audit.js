/**
 * dsh-design-studio — design quality audit (pure deterministic rule engine).
 *
 * Turns the probe's metrics (CONTRACT §7) into findings and a 0–100 score.
 * Five categories carry the judgment layer of the claude-design skill:
 *   a11y   — contrast, alt text, labels, heading order, tap targets, overflow
 *   type   — font families / display-font slop, body size, line-height, hierarchy
 *   layout — 4px rhythm, section height, fixed overlays, empty pages, overflow
 *   system — adherence to the project's design tokens (compareToSystem)
 *   slop   — purple/blue gradients, emoji walls, lorem ipsum, fake names/logos,
 *            placeholder hosts, left-accent cards, cookie-cutter landing pages,
 *            unsourced stats, icon-card walls
 *
 * Scoring (frozen): critical −30, high −15, medium −7, low −3, at most 10
 * findings per category (worst first); category score = max(0, 100 − deduction);
 * overall = weighted mean (with a token system: a11y .30, type .15, layout .20,
 * system .20, slop .15; without: a11y .35, type .20, layout .20, slop .25).
 * Grade: ≥90 A, ≥80 B, ≥70 C, ≥60 D, else F. `pass = score >= 90`.
 * Deck decks are scored per screen and averaged; `mobile` kind uses mobile
 * thresholds at every width; slides use a 24px minimum text size and skip the
 * tap-target rule.
 *
 * Every rule prefers precision over recall: it only fires on evidence the probe
 * can actually prove, and every finding carries a concrete fix sentence.
 *
 * Public API (CONTRACT §3): auditDesign({pages, screens, system, kind, viewports, health}),
 * GRADE_BANDS, auditFileFindings(html, {kind}).
 */

import { compareToSystem, normalizeTokens, tokenUsage } from './tokens.js'
import { isPlainObject } from './util.js'

/** Grade bands, highest first. */
export const GRADE_BANDS = Object.freeze([
  Object.freeze({ grade: 'A', min: 90, label: '可交付' }),
  Object.freeze({ grade: 'B', min: 80, label: '接近' }),
  Object.freeze({ grade: 'C', min: 70, label: '需返工' }),
  Object.freeze({ grade: 'D', min: 60, label: '问题明显' }),
  Object.freeze({ grade: 'F', min: 0, label: '不合格' }),
])

/** Human labels used by the panel. */
const CATEGORY_LABELS = Object.freeze({
  a11y: '无障碍与可用性',
  type: '排版',
  layout: '布局与节奏',
  system: '设计系统一致性',
  slop: 'AI 味',
})

/** Weights when the project carries a token system (CONTRACT §7). */
const WEIGHTS_WITH_SYSTEM = Object.freeze({ a11y: 0.3, type: 0.15, layout: 0.2, system: 0.2, slop: 0.15 })
/** Weights when there is no token system: system is redistributed. */
const WEIGHTS_NO_SYSTEM = Object.freeze({ a11y: 0.35, type: 0.2, layout: 0.2, slop: 0.25 })
/** Category display order. */
const CATEGORY_ORDER = Object.freeze(['a11y', 'type', 'layout', 'system', 'slop'])
/** Deduction per severity. */
const DEDUCTIONS = Object.freeze({ critical: 30, high: 15, medium: 7, low: 3 })
/** Worst-first order for the per-category cap. */
const SEVERITY_RANK = Object.freeze({ critical: 0, high: 1, medium: 2, low: 3 })
/** At most this many findings per category reach the score. */
const MAX_FINDINGS_PER_CATEGORY = 10
/** Viewport findings are capped for the panel payload. */
const MAX_VIEWPORT_FINDINGS = 30
/** 4px rhythm. */
const GRID = 4
/** Default minimum body text size per context. */
const MIN_BODY = Object.freeze({ desktop: 16, mobile: 14, deck: 24 })
/** Allowed radii when the design has no token system. */
const RADIUS_TOKENS = new Set([0, 4, 8, 12, 16, 24, 999])
/** Font families the slop list forbids as the display face. */
const DISPLAY_FONT_BLACKLIST = Object.freeze(['inter', 'roboto', 'arial', 'helvetica', 'system-ui', 'poppins', 'blinkmacsystemfont'])
/** Generic CSS families that do not count as a chosen typeface. */
const GENERIC_FAMILIES = new Set(['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui', '-apple-system', 'ui-monospace', 'ui-sans-serif', 'ui-serif', 'ui-rounded', 'inherit', 'initial', 'unset'])
/** Fake-name / fake-company markers. */
const FAKE_NAME_PATTERN = /\b(john doe|jane doe|acme (?:corp|inc|co)\b|globex|initech|umbrella (?:corp|inc)\b|foo ?bar|example\.com|sarah j\b)/iu
/** Placeholder image host markers. */
const PLACEHOLDER_HOSTS = /(via\.placeholder\.com|placehold\.co|placeholder\.com|picsum\.photos|source\.unsplash\.com|loremflickr|lorempixel|placekitten|dummyimage\.com)/iu
/** Unsourced statistics markers. */
const STAT_PATTERN = /(?:\b\d{1,3}(?:,\d{3})+\+?|\b\d+(?:\.\d+)?\s*%|\b\d+(?:\.\d+)?x\b)/gu
/** Citation words that excuse a statistic. */
const CITATION_PATTERN = /(source|来源|引用|研究|报告|according to|survey|cited|统计|数据来自|官方数据|样本)/iu
/** Marketing language that turns statistics into a claim to verify. */
const MARKETING_PATTERN = /(get started|sign up|try free|start free|subscribe|contact us|learn more|免费|立即|立刻|试用|订阅|联系我们|开始使用|了解更多)/iu
/** Emoji ranges used for the emoji-wall rule. */
const EMOJI_PATTERN = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}]/gu

/* -------------------------------------------------------------------------- */
/* small pure helpers                                                         */
/* -------------------------------------------------------------------------- */

/** Round to one decimal. */
function round1(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.round(number * 10) / 10
}

/** A finite number or the fallback. */
function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

/** Grade for a 0–100 score. */
function gradeOf(score) {
  const value = finite(score, 0)
  for (const band of GRADE_BANDS) {
    if (value >= band.min) return band.grade
  }
  return 'F'
}

/** True when a value is one of the five project kinds. */
function kindOf(value) {
  return ['web', 'mobile', 'deck', 'poster', 'doc'].includes(value) ? value : 'web'
}

/** Normalise the pages argument: valid metrics only, widest first. */
function normalizePages(value) {
  const list = Array.isArray(value) ? value : []
  const pages = []
  for (const page of list) {
    if (!isPlainObject(page) || !isPlainObject(page.metrics)) continue
    const width = Math.round(finite(page.width, 0))
    if (width < 240 || width > 3840) continue
    pages.push({
      width,
      height: Math.round(finite(page.height, Math.max(480, Math.round(width * 0.62)))),
      metrics: page.metrics,
      screenshot: typeof page.screenshot === 'string' ? page.screenshot : '',
    })
  }
  pages.sort((a, b) => b.width - a.width)
  return pages
}

/** Normalise the screens argument. */
function normalizeScreens(value) {
  const list = Array.isArray(value) ? value : []
  const screens = []
  for (const screen of list) {
    if (!isPlainObject(screen) || !isPlainObject(screen.metrics)) continue
    screens.push({
      label: typeof screen.label === 'string' && screen.label.trim().length > 0 ? screen.label.trim().slice(0, 80) : '第 ' + (screens.length + 1) + ' 页',
      index: Math.round(finite(screen.index, screens.length + 1)),
      metrics: screen.metrics,
      screenshot: typeof screen.screenshot === 'string' ? screen.screenshot : '',
    })
    if (screens.length >= 60) break
  }
  return screens
}

/** The token set of a project system record, or null. */
function systemTokensOf(system) {
  if (!isPlainObject(system)) return null
  const raw = isPlainObject(system.tokens) ? system.tokens : isPlainObject(system.color) || isPlainObject(system.font) ? system : null
  if (!raw) return null
  const tokens = normalizeTokens(raw)
  const hasData =
    Object.values(tokens.color).some((entry) => (Array.isArray(entry) ? entry.length > 0 : typeof entry === 'string' && entry.length > 0)) ||
    Object.values(tokens.font).some((font) => font.family.length > 0) ||
    tokens.size.scale.length > 0 ||
    tokens.space.scale.length > 0 ||
    tokens.radius.scale.length > 0
  return hasData ? tokens : null
}

/** Thresholds for one page/screen of a given project kind. */
function thresholdsFor(kind, width) {
  if (kind === 'deck') return { deck: true, mobile: false, minBody: MIN_BODY.deck, minTap: 0 }
  const mobile = kind === 'mobile' || finite(width, 0) <= 480
  return { deck: false, mobile, minBody: mobile ? MIN_BODY.mobile : MIN_BODY.desktop, minTap: mobile ? 44 : 0 }
}

/** Normalise one hex-ish colour into `{r,g,b}` or null. */
function rgbOf(value) {
  if (isPlainObject(value) && Number.isFinite(value.r)) return value
  const text = String(value ?? '').trim()
  if (/^#[0-9a-f]{3}$/iu.test(text)) {
    const hex = text.slice(1)
    return { r: parseInt(hex[0] + hex[0], 16), g: parseInt(hex[1] + hex[1], 16), b: parseInt(hex[2] + hex[2], 16) }
  }
  if (/^#[0-9a-f]{6}$/iu.test(text)) {
    return { r: parseInt(text.slice(1, 3), 16), g: parseInt(text.slice(3, 5), 16), b: parseInt(text.slice(5, 7), 16) }
  }
  const match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/iu.exec(text)
  if (match) return { r: Math.round(Number(match[1])), g: Math.round(Number(match[2])), b: Math.round(Number(match[3])) }
  return null
}

/** HSL of an rgb colour: `{h: 0..360, s: 0..1, l: 0..1}`. */
function hslOf(rgb) {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: 0, s: 0, l: lightness }
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let hue
  if (max === r) hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60
  else if (max === g) hue = ((b - r) / delta + 2) * 60
  else hue = ((r - g) / delta + 4) * 60
  return { h: Math.round(hue), s: saturation, l: lightness }
}

/** The AI-slop gradient signature: purple / blue-violet / magenta saturation. */
function isSlopGradient(value) {
  const text = String(value ?? '')
  if (!/gradient\(/iu.test(text)) return false
  const colors = []
  const pattern = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/giu
  let match = pattern.exec(text)
  while (match) {
    const rgb = rgbOf(match[0])
    if (rgb) colors.push(rgb)
    match = pattern.exec(text)
    if (colors.length >= 8) break
  }
  if (colors.length < 2) return false
  for (const rgb of colors) {
    const hsl = hslOf(rgb)
    if (hsl.s < 0.3) continue
    if (hsl.h >= 240 && hsl.h <= 345 && hsl.l >= 0.18 && hsl.l <= 0.88) return true
    if (hsl.h >= 200 && hsl.h < 240 && hsl.s >= 0.55 && hsl.l >= 0.25 && hsl.l <= 0.8) return true
  }
  return false
}

/** True when a family is on the display-font blacklist (Inter Tight included). */
function isBlacklistedDisplay(family) {
  const name = String(family ?? '').trim().toLowerCase().replace(/^["']|["']$/gu, '')
  if (name.length === 0) return false
  for (const blocked of DISPLAY_FONT_BLACKLIST) {
    if (name === blocked) return true
    if ((blocked === 'inter' || blocked === 'roboto' || blocked === 'poppins') && name.startsWith(blocked + ' ')) return true
  }
  return false
}

/** Font families that appear in heading text or at display sizes. */
function displayFamiliesOf(metrics) {
  const families = new Set()
  const evidence = isPlainObject(metrics.evidence) ? metrics.evidence : {}
  for (const heading of Array.isArray(evidence.headings) ? evidence.headings : []) {
    if (heading && /^h[1-3]$/u.test(String(heading.tag ?? ''))) {
      const family = String(heading.family ?? '').trim()
      if (family) families.add(family)
    }
  }
  for (const node of Array.isArray(metrics.textNodes) ? metrics.textNodes : []) {
    if (node && /^h[1-3]$/u.test(String(node.tag ?? '')) && typeof node.family === 'string') families.add(node.family.trim())
  }
  for (const font of Array.isArray(metrics.fonts) ? metrics.fonts : []) {
    if (!font || typeof font.family !== 'string') continue
    const sizes = Array.isArray(font.sizes) ? font.sizes.map(Number) : []
    if (sizes.some((size) => Number.isFinite(size) && size >= 28)) families.add(font.family.trim())
  }
  families.delete('')
  return [...families]
}

/** Heading rows (`{tag, size, family, weight}`) from the probe evidence. */
function headingsOf(metrics) {
  const evidence = isPlainObject(metrics.evidence) ? metrics.evidence : {}
  const rows = []
  for (const heading of Array.isArray(evidence.headings) ? evidence.headings : []) {
    if (!heading) continue
    const tag = String(heading.tag ?? '').toLowerCase()
    if (!/^h[1-6]$/u.test(tag)) continue
    rows.push({ tag, size: finite(heading.size, 0), family: String(heading.family ?? ''), weight: finite(heading.weight, 400), selector: String(heading.selector ?? ''), text: String(heading.text ?? '').slice(0, 80) })
    if (rows.length >= 60) break
  }
  if (rows.length > 0) return rows
  for (const node of Array.isArray(metrics.textNodes) ? metrics.textNodes : []) {
    if (!node) continue
    const tag = String(node.tag ?? '').toLowerCase()
    if (!/^h[1-6]$/u.test(tag)) continue
    rows.push({ tag, size: finite(node.px, 0), family: String(node.family ?? ''), weight: finite(node.weight, 400), selector: String(node.selector ?? ''), text: String(node.text ?? '').slice(0, 80) })
    if (rows.length >= 60) break
  }
  return rows
}

/** Median of a numeric array. */
function median(values) {
  const list = values.map(Number).filter((value) => Number.isFinite(value)).sort((a, b) => a - b)
  if (list.length === 0) return 0
  const middle = Math.floor(list.length / 2)
  return list.length % 2 === 0 ? (list[middle - 1] + list[middle]) / 2 : list[middle]
}

/** Median weighted by text characters. */
function weightedMedian(entries) {
  const list = entries
    .filter((entry) => Number.isFinite(entry.px) && entry.px > 0 && entry.weight > 0)
    .sort((a, b) => a.px - b.px)
  const total = list.reduce((sum, entry) => sum + entry.weight, 0)
  if (total <= 0) return 0
  let accumulated = 0
  for (const entry of list) {
    accumulated += entry.weight
    if (accumulated >= total / 2) return entry.px
  }
  return list[list.length - 1].px
}

/** Concatenated visible text of a metrics object (bounded). */
function textOfMetrics(metrics) {
  if (typeof metrics.textSample === 'string' && metrics.textSample.length > 0) return metrics.textSample.slice(0, 12000)
  const parts = []
  for (const node of Array.isArray(metrics.textNodes) ? metrics.textNodes : []) {
    if (node && typeof node.text === 'string' && node.text.length > 0) parts.push(node.text)
    if (parts.length >= 120) break
  }
  return parts.join(' ').slice(0, 12000)
}

/** Count emojis in a text. */
function countEmoji(text) {
  const matches = String(text ?? '').match(EMOJI_PATTERN)
  return matches ? matches.length : 0
}

/** Format a ratio for messages. */
function ratioText(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) + ':1' : '?'
}

/* -------------------------------------------------------------------------- */
/* category rules                                                             */
/* -------------------------------------------------------------------------- */

/** Shared helper that appends one internal finding. */
function makeRecorder(findings) {
  return (category, code, severity, message, fix, extra = {}) => {
    const finding = { category, code, severity, message, fix }
    if (typeof extra.selector === 'string' && extra.selector.length > 0) finding.selector = extra.selector.slice(0, 240)
    if (extra.value !== undefined && extra.value !== null) finding.value = extra.value
    if (typeof extra.detail === 'string' && extra.detail.length > 0) finding.detail = extra.detail.slice(0, 600)
    findings.push(finding)
  }
}

/** a11y rules (CONTRACT §7). */
function a11yRules(scope) {
  const { record, metrics, elements, usage, tone, textSample } = scope
  const evidence = isPlainObject(metrics.evidence) ? metrics.evidence : {}

  // Language + document title.
  if (String(metrics.lang ?? '').trim().length === 0) {
    record('a11y', 'a11y.lang', 'high', '页面根元素缺少 lang 属性，读屏器无法判断语言。', '在 <html> 上写 lang="zh-CN"（或多语言时写对应语言代码）。')
  }
  if (String(metrics.title ?? '').trim().length === 0) {
    record('a11y', 'a11y.title', 'medium', '页面没有 <title>，窗口标签和读屏器都没有可用名称。', '在 <head> 里补一个描述页面任务的 <title>。')
  }

  // Contrast: prefer the probe's measured pairs, fall back to text nodes.
  const pairs = []
  const measured = Array.isArray(metrics.contrast) ? metrics.contrast : []
  for (const pair of measured) {
    if (!pair) continue
    const ratio = finite(pair.ratio, 0)
    if (ratio <= 0) continue
    const large = pair.large === true
    if ((large && ratio < 3) || (!large && ratio < 4.5)) pairs.push({ ratio, large, selector: String(pair.selector ?? ''), fg: pair.fg, bg: pair.bg, text: pair.text })
  }
  if (pairs.length === 0) {
    for (const node of Array.isArray(metrics.textNodes) ? metrics.textNodes : []) {
      if (!node) continue
      const ratio = finite(node.contrast, 0)
      if (ratio <= 0) continue
      const px = finite(node.px, 0)
      const weight = finite(node.weight, 400)
      const large = px >= 24 || (px >= 18.66 && weight >= 700)
      if ((large && ratio < 3) || (!large && ratio < 4.5)) pairs.push({ ratio, large, selector: String(node.selector ?? ''), fg: node.color, bg: node.bg, text: node.text })
    }
  }
  if (pairs.length > 0) {
    pairs.sort((a, b) => a.ratio - b.ratio)
    const worst = pairs[0]
    const worstRatio = round1(worst.ratio * 100) / 100
    const severity = worst.ratio < 3 ? 'critical' : 'high'
    const offenders = pairs
      .slice(0, 3)
      .map((pair) => (pair.selector ? pair.selector + ' ' : '') + ratioText(pair.ratio))
      .join('；')
    record('a11y', 'a11y.contrast', severity, pairs.length + ' 处文字对比度不足（最低 ' + ratioText(worst.ratio) + '）。', '调深文字色或调亮背景色：正文 ≥ 4.5:1，大字（≥24px 或 18.66px 粗体）≥ 3:1。', {
      selector: worst.selector,
      value: worstRatio,
      detail: offenders,
    })
  }
  void textSample

  // Images without alt text.
  const missingAltList = Array.isArray(evidence.imagesMissingAlt) ? evidence.imagesMissingAlt : []
  const missingAttr = Math.max(missingAltList.length, finite(elements.imagesMissingAltAttr, 0))
  const images = finite(elements.images, 0)
  const withoutAlt = finite(elements.imagesWithoutAlt, 0)
  if (missingAttr > 0) {
    record('a11y', 'a11y.images_alt', 'high', missingAttr + ' 个 <img> 完全没有 alt 属性。', '给内容图写一句 alt；纯装饰图写 alt="" 让读屏器跳过。', {
      selector: missingAltList[0]?.selector,
      value: missingAttr,
      detail: missingAltList.slice(0, 3).map((item) => String(item?.selector ?? '')).filter(Boolean).join('；'),
    })
  } else if (withoutAlt >= 2 && images > 0 && withoutAlt / images > 0.2) {
    record('a11y', 'a11y.images_alt', 'medium', withoutAlt + '/' + images + ' 张图片的 alt 为空。', '确认这些图片是装饰性的；如果是内容图，补写 alt 文本。', { value: withoutAlt + '/' + images })
  }

  // Controls without an accessible name.
  const unnamedList = Array.isArray(evidence.unnamedControls) ? evidence.unnamedControls : []
  const unnamed = Math.max(unnamedList.length, finite(elements.unnamedControls, 0))
  if (unnamed > 0) {
    record('a11y', 'a11y.unnamed_controls', unnamed >= 2 ? 'high' : 'medium', unnamed + ' 个按钮/链接没有可访问名称。', '给控件补 aria-label 或可见文字，图标按钮必须有 aria-label。', {
      selector: unnamedList[0]?.selector,
      value: unnamed,
    })
  }

  // Unlabelled form fields.
  const unlabeledList = Array.isArray(evidence.unlabeledInputs) ? evidence.unlabeledInputs : []
  const unlabeled = Math.max(unlabeledList.length, finite(elements.inputsWithoutLabel, 0))
  if (unlabeled > 0) {
    const placeholderOnly = unlabeledList.length > 0 && unlabeledList.every((item) => String(item?.placeholder ?? '').trim().length > 0)
    record('a11y', 'a11y.input_labels', placeholderOnly ? 'medium' : 'high', unlabeled + ' 个输入控件没有关联 label。', '用 <label for> 或 aria-label 给每个输入框命名，placeholder 不能代替 label。', {
      selector: unlabeledList[0]?.selector,
      value: unlabeled,
    })
  }

  // Heading order.
  const order = (Array.isArray(metrics.headingsOrder) ? metrics.headingsOrder : []).map((tag) => String(tag ?? '').toLowerCase()).filter((tag) => /^h[1-6]$/u.test(tag))
  if (order.length > 0) {
    const levelOf = (tag) => Number(tag.slice(1))
    const h1Count = order.filter((tag) => tag === 'h1').length
    // A deck has one h1 across the whole deck; each slide may legitimately start at h2.
    if (!tone.deck && h1Count === 0) {
      record('a11y', 'a11y.heading_h1', 'medium', '页面有 ' + order.length + ' 个标题，却没有 h1。', '把页面主标题设为 h1，其余层级按 h2/h3 递进。', { value: order.slice(0, 4).join(' → ') })
    } else if (!tone.deck && h1Count > 1) {
      record('a11y', 'a11y.heading_multiple_h1', 'low', '页面有 ' + h1Count + ' 个 h1。', '只保留一个 h1 作为页面主标题，其余降为 h2。', { value: h1Count })
    }
    let previous = levelOf(order[0])
    for (let index = 1; index < order.length; index += 1) {
      const level = levelOf(order[index])
      if (level - previous > 1) {
        record('a11y', 'a11y.heading_skip', 'medium', '标题层级从 h' + previous + ' 跳到 h' + level + '，跳过了中间层级。', '按顺序补一层 h' + (previous + 1) + '，或把该标题降一级，保持层级连续。', {
          value: 'h' + previous + ' → h' + level,
        })
        break
      }
      previous = level
    }
  }

  // Tap targets (mobile widths only; slides never).
  if (tone.mobile && !tone.deck) {
    const targets = Array.isArray(metrics.tapTargets) ? metrics.tapTargets : []
    const small = targets.filter((target) => target && (finite(target.width, 0) < 44 || finite(target.height, 0) < 44))
    if (small.length > 0) {
      const worst = small.slice().sort((a, b) => finite(a.width, 0) * finite(a.height, 0) - finite(b.width, 0) * finite(b.height, 0))[0]
      record('a11y', 'a11y.tap_targets', 'medium', small.length + ' 个可点区域的触控尺寸小于 44×44。', '给这些控件补足内边距，让可点区域至少 44×44（视觉尺寸可以更小）。', {
        selector: worst?.selector,
        value: worst ? Math.round(finite(worst.width, 0)) + '×' + Math.round(finite(worst.height, 0)) : small.length,
      })
    }
  }

  // Horizontal overflow: critical on mobile, handled in layout on desktop.
  if (tone.mobile && metrics.overflow && metrics.overflow.horizontal === true) {
    const offenders = Array.isArray(metrics.overflow.offenders) ? metrics.overflow.offenders : []
    record('a11y', 'a11y.overflow', 'critical', '手机宽度下页面出现横向溢出，需要左右拖动。', '把超宽元素改成 max-width:100%、图片加 max-width:100%、栅格在窄屏收成一列。', {
      selector: offenders[0]?.selector,
      value: offenders.length > 0 ? Math.round(finite(offenders[0]?.width, 0)) : 'overflow',
    })
  }

  // Very small text is an accessibility problem on its own.
  const tinyThreshold = tone.deck ? 16 : tone.mobile ? 11 : 12
  const tiny = (Array.isArray(metrics.textNodes) ? metrics.textNodes : []).filter((node) => node && finite(node.px, 0) > 0 && finite(node.px, 0) < tinyThreshold && finite(node.chars, 0) >= 6)
  if (tiny.length >= 2) {
    record('a11y', 'a11y.tiny_text', 'medium', tiny.length + ' 处文字小于 ' + tinyThreshold + 'px。', '把正文/标签字号提到 ' + tone.minBody + 'px 以上，极小的说明文字也要 ≥ ' + tinyThreshold + 'px。', {
      selector: tiny[0]?.selector,
      value: Math.round(finite(tiny[0]?.px, 0)),
    })
  }

  // Duplicate ids break label/aria references.
  const duplicateIds = Array.isArray(evidence.duplicateIds) ? evidence.duplicateIds : []
  if (duplicateIds.length > 0) {
    record('a11y', 'a11y.duplicate_ids', 'low', duplicateIds.length + ' 个 id 在页面里重复出现。', '把重复的 id 改成唯一值，label/aria 引用才能正确指向。', {
      value: String(duplicateIds[0]?.id ?? ''),
      detail: duplicateIds.slice(0, 3).map((item) => String(item?.id ?? '')).filter(Boolean).join('、'),
    })
  }

  // Token adherence is reported by the system category; usage is kept here for parity.
  void usage
}

/** type rules (CONTRACT §7). */
function typeRules(scope) {
  const { record, metrics, usage, tone } = scope
  const families = usage.fonts.filter((row) => finite(row[1], 0) >= 2 && !GENERIC_FAMILIES.has(String(row[0]).trim().toLowerCase())).map((row) => String(row[0]))
  if (families.length > 3) {
    record('type', 'type.font_families', 'medium', '页面用了 ' + families.length + ' 个字体家族。', '收敛到 2 个家族（一个 display + 一个 body），最多再加一个 mono 点缀。', {
      value: families.length,
      detail: families.slice(0, 6).join('、'),
    })
  }

  // Blacklisted display fonts.
  const displayFamilies = displayFamiliesOf(metrics)
  const headings = headingsOf(metrics)
  const blocked = displayFamilies.filter(isBlacklistedDisplay)
  if (blocked.length > 0) {
    const family = blocked[0]
    const heading = headings.find((row) => row.family === family) || headings[0]
    record('type', 'type.display_font', 'high', '标题字体使用了 ' + family + '——AI 生成页面最常见的"安全牌"。', '换成有特征的 display 字体（编辑类 serif、或品牌自定义无衬线），并给它写 fallback 栈。', {
      selector: heading?.selector,
      value: family,
      detail: blocked.length > 1 ? blocked.slice(0, 4).join('、') : '',
    })
  }

  // Body text size (weighted by characters, so labels do not drag the median down).
  const nodes = Array.isArray(metrics.textNodes) ? metrics.textNodes : []
  const bodyEntries = []
  for (const node of nodes) {
    if (!node) continue
    const tag = String(node.tag ?? '').toLowerCase()
    if (/^h[1-6]$/u.test(tag)) continue
    const px = finite(node.px, 0)
    const chars = finite(node.chars, 0)
    if (px < 8 || chars < 8) continue
    bodyEntries.push({ px, weight: chars })
  }
  if (bodyEntries.length >= 2) {
    const bodySize = weightedMedian(bodyEntries)
    if (bodySize > 0 && bodySize < tone.minBody) {
      record('type', 'type.body_size', 'medium', '正文主字号约 ' + Math.round(bodySize) + 'px，低于' + (tone.deck ? '幻灯片 24px' : tone.mobile ? '手机 14px' : '桌面 16px') + '的下限。', '把正文基准字号提到 ' + tone.minBody + 'px，标题按比例尺放大，不要用缩小正文来塞内容。', {
        value: Math.round(bodySize),
      })
    }
  }

  // Too many distinct sizes.
  const sizes = usage.sizes.map((row) => Number(row[0])).filter((value) => Number.isFinite(value))
  if (sizes.length > 10) {
    record('type', 'type.size_count', 'low', '页面出现 ' + sizes.length + ' 种不同字号。', '用一条模块化比例尺（如 12/14/16/20/24/32/44/64），不要为每个组件发明字号。', { value: sizes.length })
  }

  // Line height below 1.2 on readable body text.
  const lineHeightOffenders = []
  for (const node of nodes) {
    if (!node) continue
    const px = finite(node.px, 0)
    const chars = finite(node.chars, 0)
    const lineHeight = finite(node.lh, 0)
    if (px < 11 || px > 20 || chars < 20 || lineHeight <= 0) continue
    if (lineHeight / px < 1.2) lineHeightOffenders.push({ selector: String(node.selector ?? ''), ratio: lineHeight / px, px })
  }
  if (lineHeightOffenders.length >= 2) {
    record('type', 'type.line_height', 'medium', lineHeightOffenders.length + ' 处正文行高小于 1.2，读起来挤。', '正文行高用 1.5–1.7，小标题 1.2–1.35，大标题 1.0–1.15。', {
      selector: lineHeightOffenders[0].selector,
      value: Math.round(lineHeightOffenders[0].ratio * 100) / 100,
    })
  }

  // Heading scale must descend.
  const sizesByTag = new Map()
  for (const heading of headings) {
    if (!sizesByTag.has(heading.tag)) sizesByTag.set(heading.tag, [])
    sizesByTag.get(heading.tag).push(heading.size)
  }
  const medianOf = (tag) => (sizesByTag.has(tag) ? median(sizesByTag.get(tag)) : 0)
  const h1 = medianOf('h1')
  const h2 = medianOf('h2')
  const h3 = medianOf('h3')
  if (h1 > 0 && h2 > 0 && h1 <= h2) {
    record('type', 'type.heading_scale', 'medium', 'h1 (' + Math.round(h1) + 'px) 不大于 h2 (' + Math.round(h2) + 'px)，层级不成立。', '让字号随标题层级递减：h1 > h2 > h3，间距也同步收紧。', { value: Math.round(h1) + ' ≤ ' + Math.round(h2) })
  } else if (h2 > 0 && h3 > 0 && h2 <= h3) {
    record('type', 'type.heading_scale', 'medium', 'h2 (' + Math.round(h2) + 'px) 不大于 h3 (' + Math.round(h3) + 'px)，层级不成立。', '让字号随标题层级递减：h2 > h3，并保持字重差异。', { value: Math.round(h2) + ' ≤ ' + Math.round(h3) })
  }

  // Negative tracking on small text.
  const trackingOffenders = []
  for (const node of nodes) {
    if (!node) continue
    const px = finite(node.px, 0)
    const spacing = finite(node.ls, 0)
    if (px <= 0 || px > 18 || spacing >= 0) continue
    if (spacing < -0.02 * px) trackingOffenders.push({ selector: String(node.selector ?? ''), value: spacing })
  }
  if (trackingOffenders.length >= 2) {
    record('type', 'type.letter_spacing', 'low', trackingOffenders.length + ' 处小字号使用了过紧的字距。', '小字保持 0 字距；负字距只留给 ≥24px 的大标题（-0.02em ~ -0.03em）。', {
      selector: trackingOffenders[0].selector,
      value: trackingOffenders[0].value,
    })
  }

  // Centered long paragraphs.
  const centered = nodes.filter((node) => node && String(node.tag ?? '').toLowerCase() === 'p' && String(node.align ?? '') === 'center' && finite(node.chars, 0) > 80)
  if (centered.length > 0) {
    record('type', 'type.centered_paragraphs', 'low', centered.length + ' 段长度超过 80 字的正文被居中。', '长段落左对齐（中英都是），只有 ≤2 行的标题适合居中。', { selector: String(centered[0].selector ?? '') })
  }
}

/** layout rules (CONTRACT §7). */
function layoutRules(scope) {
  const { record, metrics, usage, tone, context } = scope
  const evidence = isPlainObject(metrics.evidence) ? metrics.evidence : {}

  // 4px rhythm.
  const spacings = usage.spacings
  const spacingTotal = spacings.reduce((sum, row) => sum + finite(row[1], 0), 0)
  if (spacingTotal >= 8) {
    let off = 0
    for (const row of spacings) {
      const value = Math.round(finite(row[0], 0))
      if (value > 0 && value % GRID !== 0) off += finite(row[1], 0)
    }
    const share = off / spacingTotal
    if (share > 0.3) {
      record('layout', 'layout.spacing_grid', 'medium', Math.round(share * 100) + '% 的间距值不在 4px 栅格上。', '把所有 margin/padding/gap 收敛到 4 的倍数（4/8/12/16/24/32/48/64），用 space token 而不是拍数字。', {
        value: Math.round(share * 100),
      })
    }
    if (spacings.length > 12) {
      record('layout', 'layout.spacing_count', 'low', '页面出现 ' + spacings.length + ' 种不同间距。', '定义 4–6 档 space token，其他值从 token 派生。', { value: spacings.length })
    }
  }

  // Horizontal overflow on desktop / slides (mobile reports it in a11y).
  if (!tone.mobile && metrics.overflow && metrics.overflow.horizontal === true) {
    const offenders = Array.isArray(metrics.overflow.offenders) ? metrics.overflow.offenders : []
    record('layout', 'layout.overflow', 'high', '页面内容横向溢出容器（' + (tone.deck ? '幻灯片画布' : '桌面宽度') + '）。', '检查超宽容器/图片/长英文单词，用 max-width:100%、min-width:0 和换行策略修掉溢出。', {
      selector: offenders[0]?.selector,
      value: offenders.length > 0 ? Math.round(finite(offenders[0]?.width, 0)) : 'overflow',
    })
  }

  // Flattened section rhythm on a content page.
  const sections = Array.isArray(metrics.sections) ? metrics.sections : []
  const textLength = finite(metrics.textLength, 0)
  if (!tone.deck && textLength >= 200 && sections.length >= 2) {
    const heights = sections.map((section) => finite(section?.height, 0)).filter((height) => height > 0)
    const sectionMedian = median(heights)
    if (sectionMedian > 0 && sectionMedian < 120) {
      record('layout', 'layout.section_height', 'low', '内容区块中位高度只有 ' + Math.round(sectionMedian) + 'px，节奏被压扁。', '给区块留出 64–120px 的上下呼吸空间，重要的区块留白更多。', { value: Math.round(sectionMedian) })
    }
  }

  // Radius family (only judged without a token system; with one, `system` checks it).
  if (!context.hasSystem) {
    const radii = usage.radii
    const total = radii.reduce((sum, row) => sum + finite(row[1], 0), 0)
    if (total > 2) {
      let off = 0
      for (const row of radii) {
        const value = Math.round(finite(row[0], 0))
        const normalised = value >= 100 ? 999 : value
        if (!RADIUS_TOKENS.has(normalised)) off += finite(row[1], 0)
      }
      const share = off / total
      if (share > 0.3) {
        record('layout', 'layout.radii', 'low', Math.round(share * 100) + '% 的圆角不在常见半径族里。', '统一一套圆角 token（0/4/8/12/16/24/999），同一层级用同一个值。', { value: Math.round(share * 100) })
      }
    }
  }

  // Empty page.
  const documentHeight = finite(metrics.render?.docHeight, finite(metrics.page?.docHeight, 0))
  if (documentHeight > 0 && documentHeight < 400) {
    record('layout', 'layout.empty', 'high', '页面高度只有 ' + Math.round(documentHeight) + 'px，几乎是空页。', '补齐设计内容并确认所有区块渲染成功（检查控制台与网络失败）。', { value: Math.round(documentHeight) })
  }

  // Fixed / sticky overlays eating the viewport.
  const fixed = Array.isArray(evidence.fixed) ? evidence.fixed : Array.isArray(metrics.fixed) ? metrics.fixed : []
  if (!tone.deck) {
    const limit = 0.2 * finite(scope.pageHeight, 900)
    const oversized = fixed.filter((item) => item && finite(item.height, 0) > limit && finite(item.height, 0) > 0)
    if (oversized.length > 0) {
      record('layout', 'layout.fixed_overlay', 'medium', '固定定位元素高 ' + Math.round(finite(oversized[0].height, 0)) + 'px，超过视口的 20%。', '收窄固定头部/浮层高度，或改成随内容滚动的普通区块。', {
        selector: String(oversized[0].selector ?? ''),
        value: Math.round(finite(oversized[0].height, 0)),
      })
    }
  }
}

/** system rules (CONTRACT §7, only with tokens). */
function systemRules(scope) {
  const { record, metrics, context } = scope
  if (!context.hasSystem) return
  const usage = tokenUsage(metrics)
  const comparison = compareToSystem(usage, context.tokens)
  if (!comparison.checked) return

  const totalOf = (name) => usage[name].reduce((sum, row) => sum + finite(row[1], 0), 0)
  const offRatio = (name) => {
    const total = totalOf(name)
    const off = comparison.violations[name].reduce((sum, row) => sum + finite(row.count, 0), 0)
    return total > 0 ? off / total : 0
  }
  const describe = (rows, render) => rows.slice(0, 3).map(render).join('；')

  if (comparison.violations.colors.length > 0) {
    const share = offRatio('colors')
    record('system', 'system.colors', share > 0.4 ? 'high' : 'medium', Math.round(share * 100) + '% 的用色不在设计系统色板内。', '回到系统色板：新颜色先用已有色的明度/饱和度变体解决，确实需要时再扩展 token。', {
      value: comparison.violations.colors[0].value,
      detail: describe(comparison.violations.colors, (row) => row.value + '×' + row.count + '（最近 ' + (row.nearest ?? '?') + '）'),
    })
  }
  if (comparison.violations.fonts.length > 0) {
    record('system', 'system.fonts', 'high', '字体不在设计系统内：' + comparison.violations.fonts[0].value + '。', '使用系统声明的 display/body/mono 字体；fallback 栈也只能引用系统字体。', {
      value: comparison.violations.fonts[0].value,
      detail: describe(comparison.violations.fonts, (row) => row.value + '×' + row.count),
    })
  }
  if (comparison.violations.sizes.length > 0) {
    record('system', 'system.sizes', 'medium', '字号偏离系统比例尺（最近值差 ' + comparison.violations.sizes[0].distance + 'px）。', '把字号吸附到 size.scale 的值上，避免为单个组件发明字号。', {
      value: comparison.violations.sizes[0].value,
      detail: describe(comparison.violations.sizes, (row) => row.value + 'px×' + row.count + '（最近 ' + row.nearest + 'px）'),
    })
  }
  if (comparison.violations.radii.length > 0) {
    record('system', 'system.radii', 'low', '圆角偏离系统半径族。', '使用 radius.scale 里的圆角；嵌套时内层半径小于外层。', {
      value: comparison.violations.radii[0].value,
      detail: describe(comparison.violations.radii, (row) => row.value + 'px×' + row.count + '（最近 ' + row.nearest + 'px）'),
    })
  }
  if (comparison.violations.spacings.length > 0) {
    record('system', 'system.spacings', 'medium', '间距偏离系统间距刻度。', '使用 space.scale 里的间距值，保持 4px 节奏与系统一致。', {
      value: comparison.violations.spacings[0].value,
      detail: describe(comparison.violations.spacings, (row) => row.value + 'px×' + row.count + '（最近 ' + row.nearest + 'px）'),
    })
  }
}

/** slop rules (CONTRACT §7). */
function slopRules(scope) {
  const { record, metrics, page } = scope
  const textSample = scope.textSample
  const hits = Array.isArray(metrics.slopHits) ? metrics.slopHits : []
  const hitOf = (code) => hits.filter((hit) => hit && hit.code === code)

  // Purple / blue / magenta gradient backgrounds.
  const gradients = Array.isArray(metrics.gradients) ? metrics.gradients : []
  const viewportArea = Math.max(1, finite(page.width, 1440) * finite(page.height, 900))
  const slopGradients = gradients.filter((gradient) => gradient && isSlopGradient(gradient.value))
  if (slopGradients.length > 0) {
    const gradient = slopGradients[0]
    const area = finite(gradient.area, 0)
    const selector = String(gradient.selector ?? '')
    const large = (area > 0 && area / viewportArea >= 0.2) || /(hero|banner|cover|jumbotron|masthead|body|html|main|header|cta)/iu.test(selector)
    record('slop', 'slop.gradient', large ? 'critical' : 'medium', large ? '大面积紫/蓝/粉渐变背景，是最典型的 AI slop 视觉。' : '紫/蓝/粉渐变出现在局部元素上。', '换成纯色或同色系低饱和背景；需要渐变时在相邻色相内做小幅过渡（如 oklch 同色系），不要做 135° 紫蓝渐变。', {
      selector,
      value: String(gradient.value ?? '').slice(0, 120),
      detail: slopGradients.length + ' 处渐变命中紫/蓝/粉带',
    })
  }

  // Emoji wall.
  let emoji = countEmoji(textSample)
  if (emoji === 0) {
    const hit = hitOf('emoji')[0]
    if (hit) emoji = Math.round(finite(hit.detail, 0))
  }
  if (emoji > 6) {
    record('slop', 'slop.emoji', 'medium', '可见文字里有 ' + emoji + ' 个 emoji，形成 emoji 墙。', '除非品牌明确使用 emoji，否则全部删掉，用排版和色彩制造重点。', { value: emoji })
  }

  // Lorem ipsum.
  if (/lorem ipsum|dolor sit amet/iu.test(textSample)) {
    record('slop', 'slop.lorem', 'high', '页面里出现 lorem ipsum 占位文案。', '换成真实文案或明确的"[待补文案]"占位，不要留拉丁占位文。', { value: 'lorem ipsum' })
  }

  // Fake names / companies.
  const fake = FAKE_NAME_PATTERN.exec(textSample)
  if (fake) {
    record('slop', 'slop.fake_names', 'medium', '页面出现虚构人名/公司名（' + fake[0] + '）。', '用真实可核验的署名/客户名；没有就删掉这段社交证明。', { value: fake[0].slice(0, 60) })
  }

  // Placeholder image hosts.
  const placeholderHits = hitOf('placeholder-host')
  if (placeholderHits.length > 0) {
    record('slop', 'slop.placeholder_hosts', 'medium', placeholderHits.length + ' 张图片来自 placeholder 服务。', '换成真实图片，或用灰框 + 尺寸标注的显式占位组件（而不是随机图 API）。', {
      selector: String(placeholderHits[0].selector ?? ''),
      value: String(placeholderHits[0].detail ?? '').slice(0, 120),
    })
  }

  // Rounded card + colored left accent.
  const accentHit = hitOf('left-accent-cards')[0]
  const accentCount = accentHit ? Math.round(finite(accentHit.detail, 0)) : 0
  if (accentCount >= 2) {
    record('slop', 'slop.left_accent_cards', 'medium', accentCount + ' 个圆角卡片带 4px 左侧彩色 accent 边框。', '去掉左侧色条；用背景层级、留白或标题字重区分卡片，不要用 Notion 式左色条。', {
      selector: String(accentHit?.selector ?? ''),
      value: accentCount,
    })
  }

  // Cookie-cutter landing skeleton.
  const cookie = hitOf('cookie-cutter')[0]
  if (cookie) {
    record('slop', 'slop.cookie_cutter', 'low', '页面是 hero → 3 张功能卡 → CTA → 页脚的万能套子。', '先问"这页承担什么任务"，按内容反推结构（不等分栅格、编辑式版式、单栏叙事等）。', { value: String(cookie.detail ?? 'hero+3cards+cta+footer').slice(0, 80) })
  }

  // Unsourced statistics on a marketing page.
  if (textSample.length > 0 && MARKETING_PATTERN.test(textSample) && !CITATION_PATTERN.test(textSample)) {
    STAT_PATTERN.lastIndex = 0
    const stat = STAT_PATTERN.exec(textSample)
    if (stat) {
      record('slop', 'slop.unsourced_stats', 'low', '营销文案里出现无法核验的统计数字（' + stat[0] + '），且全文没有来源。', '只保留真实可核验的数字，并在附近写明来源；没有来源就不要用数字。', { value: stat[0].slice(0, 40) })
    }
  }

  // Icon-card wall.
  const iconWall = hitOf('icon-card-wall')[0]
  const iconCount = iconWall ? Math.round(finite(iconWall.detail, 0)) : 0
  if (iconCount > 8) {
    record('slop', 'slop.icon_card_wall', 'low', iconCount + ' 张尺寸相同的图标卡片排成一面墙。', '只在 icon 有真实语义区分时保留；否则删掉装饰 icon，用纯文字或大小不等的 bento 布局。', { value: iconCount })
  }
}

/* -------------------------------------------------------------------------- */
/* scoring                                                                    */
/* -------------------------------------------------------------------------- */

/** Turn a finding list into scored categories for one weights map. */
function scoreCategories(findings, weights) {
  const categories = []
  for (const id of CATEGORY_ORDER) {
    const weight = weights[id]
    if (!Number.isFinite(weight)) continue
    const rows = findings.filter((finding) => finding.category === id)
    rows.sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))
    const capped = rows.slice(0, MAX_FINDINGS_PER_CATEGORY)
    let deduction = 0
    for (const finding of capped) deduction += DEDUCTIONS[finding.severity] ?? 0
    categories.push({
      id,
      label: CATEGORY_LABELS[id] ?? id,
      score: Math.max(0, 100 - deduction),
      weight,
      findings: capped.map(publicFinding),
    })
  }
  return categories
}

/** Weighted mean of category scores. */
function weightedScore(categories) {
  let score = 0
  let totalWeight = 0
  for (const category of categories) {
    score += category.score * category.weight
    totalWeight += category.weight
  }
  return totalWeight > 0 ? round1(score / totalWeight) : 0
}

/** Public finding shape: drop the internal category field. */
function publicFinding(finding) {
  const out = { code: finding.code, severity: finding.severity, message: finding.message, fix: finding.fix }
  if (finding.selector) out.selector = finding.selector
  if (finding.value !== undefined && finding.value !== null) out.value = finding.value
  if (finding.detail) out.detail = finding.detail
  return out
}

/** De-duplicate findings across viewports / screens (worst severity wins). */
function mergeFindings(findings) {
  const merged = new Map()
  for (const finding of findings) {
    const key = finding.code + '|' + (finding.selector || '')
    const previous = merged.get(key)
    if (!previous) {
      merged.set(key, finding)
      continue
    }
    if ((SEVERITY_RANK[finding.severity] ?? 9) < (SEVERITY_RANK[previous.severity] ?? 9)) {
      merged.set(key, finding)
    }
  }
  return [...merged.values()]
}

/** Count reported findings by severity. */
function countSeverities(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const finding of findings) {
    if (Object.hasOwn(counts, finding.severity)) counts[finding.severity] += 1
  }
  return counts
}

/** The zero-evidence result. */
function emptyResult(weights) {
  const categories = []
  for (const id of CATEGORY_ORDER) {
    if (!Number.isFinite(weights[id])) continue
    categories.push({ id, label: CATEGORY_LABELS[id] ?? id, score: 0, weight: weights[id], findings: [] })
  }
  return {
    score: 0,
    grade: 'F',
    pass: false,
    categories,
    viewports: [],
    counts: { critical: 0, high: 0, medium: 0, low: 0 },
    screens: [],
  }
}

/** Audit one page: all rule categories over its metrics. */
function analyzePage(page, context) {
  const findings = []
  const metrics = page.metrics
  const elements = isPlainObject(metrics.elements) ? metrics.elements : {}
  const usage = tokenUsage(metrics)
  const tone = thresholdsFor(context.kind, page.width)
  const textSample = textOfMetrics(metrics)
  const scope = {
    record: makeRecorder(findings),
    page,
    pageHeight: page.height,
    metrics,
    elements,
    usage,
    tone,
    context,
    textSample,
  }
  a11yRules(scope)
  typeRules(scope)
  layoutRules(scope)
  systemRules(scope)
  slopRules(scope)
  return findings
}

/** Audit a normal page set (one score per width + an aggregate). */
function auditPages(pages, context, weights) {
  const perPage = pages.map((page) => ({ page, findings: analyzePage(page, context) }))
  const viewports = perPage.map(({ page, findings }) => {
    const categories = scoreCategories(findings, weights)
    const rows = findings.slice().sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))
    return {
      width: page.width,
      score: weightedScore(categories),
      findings: rows.slice(0, MAX_VIEWPORT_FINDINGS).map(publicFinding),
    }
  })
  const merged = mergeFindings(perPage.flatMap((entry) => entry.findings))
  const categories = scoreCategories(merged, weights)
  const score = weightedScore(categories)
  const reported = categories.flatMap((category) => category.findings)
  return {
    score,
    grade: gradeOf(score),
    pass: score >= 90,
    categories,
    viewports,
    counts: countSeverities(reported),
    screens: [],
  }
}

/** Audit deck screens: each screen scored separately, then averaged. */
function auditScreens(screens, context, weights) {
  const deckContext = { ...context, kind: 'deck' }
  const perScreen = screens.map((screen) => {
    const page = { width: 1920, height: 1080, metrics: screen.metrics }
    const findings = analyzePage(page, deckContext)
    const categories = scoreCategories(findings, weights)
    return { screen, findings, categories, score: weightedScore(categories) }
  })

  const categoryIds = CATEGORY_ORDER.filter((id) => Number.isFinite(weights[id]))
  const categories = categoryIds.map((id) => {
    const scores = perScreen.map((entry) => entry.categories.find((category) => category.id === id)?.score ?? 100)
    const findings = mergeFindings(perScreen.flatMap((entry) => entry.findings.filter((finding) => finding.category === id)))
    findings.sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))
    return {
      id,
      label: CATEGORY_LABELS[id] ?? id,
      score: round1(scores.reduce((sum, value) => sum + value, 0) / Math.max(1, scores.length)),
      weight: weights[id],
      findings: findings.slice(0, MAX_FINDINGS_PER_CATEGORY).map(publicFinding),
    }
  })
  const screenResults = perScreen.map((entry) => ({
    label: entry.screen.label,
    score: entry.score,
    findings: entry.findings
      .slice()
      .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))
      .slice(0, MAX_VIEWPORT_FINDINGS)
      .map(publicFinding),
  }))
  const score = round1(screenResults.reduce((sum, row) => sum + row.score, 0) / Math.max(1, screenResults.length))
  const reported = categories.flatMap((category) => category.findings)
  return {
    score,
    grade: gradeOf(score),
    pass: score >= 90,
    categories,
    viewports: [],
    counts: countSeverities(reported),
    screens: screenResults,
  }
}

/* -------------------------------------------------------------------------- */
/* public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Audit one design probe result.
 *
 * @param {object} input
 * @param {Array<{width: number, height: number, metrics: object, screenshot?: string}>} [input.pages]
 * @param {Array<{label: string, metrics: object, screenshot?: string}>} [input.screens]
 * @param {object|null} [input.system] token set or a project `system` record (`{tokens}`)
 * @param {'web'|'mobile'|'deck'|'poster'|'doc'} [input.kind]
 * @param {number[]} [input.viewports] informational only
 * @param {object} [input.health] informational only
 * @returns {{score: number, grade: string, pass: boolean, categories: object[], viewports: object[], counts: object, screens: object[]}}
 */
export function auditDesign(input = {}) {
  const kind = kindOf(input.kind)
  const pages = normalizePages(input.pages)
  const screens = normalizeScreens(input.screens)
  const tokens = systemTokensOf(input.system)
  const hasSystem = tokens !== null
  const weights = hasSystem ? WEIGHTS_WITH_SYSTEM : WEIGHTS_NO_SYSTEM
  const context = { kind, tokens, hasSystem }
  if (screens.length > 0) return auditScreens(screens, context, weights)
  if (pages.length === 0) return emptyResult(weights)
  return auditPages(pages, context, weights)
}

/**
 * Fast source-level slop scan (no browser). Useful for pre-checks and as a
 * fallback when the browser is unavailable; returns plain findings.
 * @param {string} html design HTML source
 * @param {{kind?: string}} [options]
 * @returns {object[]} finding rows `{code, severity, message, fix, selector?, value?}`
 */
export function auditFileFindings(html, options = {}) {
  const source = typeof html === 'string' ? html : ''
  const findings = []
  const record = makeRecorder(findings)
  if (source.length === 0) return []
  const kind = kindOf(options.kind)
  const scope = { record, textSample: source.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ').slice(0, 12000) }

  if (/linear-gradient/iu.test(source)) {
    const gradientMatch = /(?:linear|radial)-gradient\([^;{}]{0,200}/iu.exec(source)
    if (gradientMatch && isSlopGradient(gradientMatch[0])) {
      scope.record('slop', 'slop.gradient', 'high', '源码里出现紫/蓝/粉渐变背景。', '换成纯色或同色系低饱和背景。', { selector: '', value: gradientMatch[0].slice(0, 120) })
    }
  }
  const familyMatch = /font-family\s*:\s*([^;{}]+)/giu
  let family = familyMatch.exec(source)
  while (family) {
    const stack = family[1].trim()
    const first = stack.split(',')[0].trim().replace(/^["']|["']$/gu, '')
    if (isBlacklistedDisplay(first)) {
      scope.record('type', 'type.display_font', 'high', '源码声明的字体 ' + first + ' 属于 AI slop 黑名单。', '换一个有特征的 display 字体并写 fallback 栈。', { value: first })
      break
    }
    family = familyMatch.exec(source)
  }
  if (/lorem ipsum|dolor sit amet/iu.test(source)) scope.record('slop', 'slop.lorem', 'high', '源码包含 lorem ipsum。', '换成真实文案或显式占位。', {})
  if (countEmoji(scope.textSample) > 6) scope.record('slop', 'slop.emoji', 'medium', '源码包含超过 6 个 emoji。', '删掉 emoji 装饰，用排版制造重点。', {})
  const placeholder = PLACEHOLDER_HOSTS.exec(source)
  if (placeholder) scope.record('slop', 'slop.placeholder_hosts', 'medium', '源码引用 placeholder 图床（' + placeholder[0] + '）。', '换成真实图片或显式占位组件。', { value: placeholder[0] })
  const fake = FAKE_NAME_PATTERN.exec(scope.textSample)
  if (fake) scope.record('slop', 'slop.fake_names', 'medium', '源码包含虚构人名/公司名（' + fake[0] + '）。', '删除或换成真实信息。', { value: fake[0] })
  if (kind === 'deck' && !/data-screen-label/iu.test(source)) {
    scope.record('layout', 'layout.deck_labels', 'medium', '幻灯片没有 data-screen-label，导出与定位会退化。', '给每个 .screen 加 data-screen-label="01 标题"。', {})
  }
  if (!/<html[^>]*\slang=/iu.test(source)) scope.record('a11y', 'a11y.lang', 'high', '源码 <html> 缺少 lang。', '补 lang="zh-CN"。', {})
  if (!/<title>[^<]*\S[^<]*<\/title>/iu.test(source)) scope.record('a11y', 'a11y.title', 'medium', '源码缺少 <title>。', '补一个描述页面任务的 title。', {})
  return findings.map(publicFinding)
}
