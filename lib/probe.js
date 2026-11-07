/**
 * dsh-design-studio — headless probe: screenshots + computed-style metrics.
 *
 * One isolated browser context carries the whole probe. For every requested
 * width the page is resized, navigated, settled (load event + quiet network +
 * `document.fonts.ready` + a short idle), scroll-warmed so lazy content and
 * observers run, frozen (animations finished, videos paused), photographed as a
 * full-page PNG (capped by `LIMITS.maxPageHeight`) and finally read by one
 * self-contained in-page script that returns the bounded metrics object of
 * CONTRACT §7. Nothing but visitor-visible geometry, text and computed styles is
 * read; page sources are never inspected.
 *
 * Deck mode: when `screens` is requested and the page contains
 * `[data-screen-label]` (fallback `.screen`), the viewport becomes 1920×1080 and
 * every screen is scrolled into view, photographed (one file per screen) and
 * measured on its own.
 *
 * Public API (CONTRACT §3):
 *   probeDesign({ pool, url, widths, kind, dir, screens, log, signal, onProgress })
 *   captureSlidePngs({ pool, url, signal, log })   // buffers for lib/pptx.js exports
 *   captureViewportPngs({ pool, url, viewports, signal, log })
 *
 * Errors carry `error.code`: `no_browser` | `timeout` | `navigation` | `cancelled`.
 */

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { KIND_VIEWPORTS, LIMITS, heightForWidth, normalizeViewports } from './config.js'
import { ensureDir, messageOf, nowIso } from './util.js'

/** Maximum screenshots a single deck capture keeps. */
const MAX_SCREENS = 60

/** Scroll through the document so lazy images, fonts and observers run, then return to the top. */
export const WARM_SCRIPT = String.raw`(async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const height = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)
  const step = Math.max(320, Math.round(window.innerHeight * 0.85))
  for (let y = 0; y < height && y < 24000; y += step) {
    window.scrollTo(0, y)
    await sleep(50)
  }
  window.scrollTo(0, 0)
  await sleep(120)
  try { await document.fonts.ready } catch (error) { /* fonts.ready is optional */ }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  return { height, width: Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0) }
})()`

/** Freeze animations and media before the screenshot so captures are deterministic. */
export const FREEZE_SCRIPT = String.raw`(() => {
  try {
    const style = document.createElement('style')
    style.setAttribute('data-ds-freeze', '1')
    style.textContent = '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;caret-color:transparent!important;scroll-behavior:auto!important}'
    ;(document.head || document.documentElement).appendChild(style)
    for (const video of document.querySelectorAll('video')) {
      try { video.pause(); if (Number.isFinite(video.duration)) video.currentTime = 0 } catch (error) { /* media is optional */ }
    }
    const animations = document.getAnimations ? document.getAnimations({ subtree: true }) : []
    for (const animation of animations) {
      try { animation.finish() } catch (error) { try { animation.pause() } catch (inner) { /* ignore */ } }
    }
  } catch (error) { /* freezing is best effort */ }
})()`

/**
 * The in-page metrics collector (CONTRACT §7). It is a function expression so
 * `Runtime.evaluate` can call it with a bounded options object:
 * `({ minBodyPx, scopeIndex, maxElements, maxText })`.
 *
 * Everything is bounded and deduped; the result is a plain JSON value.
 */
export const METRICS_SOURCE = String.raw`(opts) => {
  const MAX_ELEMENTS = Math.max(200, Math.min(8000, Number(opts && opts.maxElements) || 6000))
  const MAX_TEXT = Math.max(500, Math.min(20000, Number(opts && opts.maxText) || 4000))
  const MAX_TEXT_NODES = 120
  const MAX_CONTRAST = 40
  const MAX_LIST = 40
  const minBodyPx = Math.max(8, Number(opts && opts.minBodyPx) || 16)
  const scopeIndex = opts && Number.isInteger(opts.scopeIndex) ? opts.scopeIndex : -1
  const screens = Array.from(document.querySelectorAll('[data-screen-label], .screen'))
  const scopeEl = scopeIndex >= 0 && screens[scopeIndex] ? screens[scopeIndex] : null
  const scopeRoot = scopeEl || document.documentElement
  const clampNum = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
  const round = (n, d) => { const f = Math.pow(10, d === undefined ? 1 : d); return Math.round(n * f) / f }
  const px = (value) => { const n = parseFloat(String(value === null || value === undefined ? '' : value)); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0 }
  const parseColor = (value) => {
    if (typeof value !== 'string') return null
    const text = value.trim().toLowerCase()
    if (!text || text === 'transparent') return null
    if (text.charAt(0) === '#') {
      let hex = text.slice(1)
      if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
      if (hex.length === 8) hex = hex.slice(0, 6)
      if (!/^[0-9a-f]{6}$/.test(hex)) return null
      return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: 1 }
    }
    const fn = /^rgba?\(([^)]+)\)$/.exec(text)
    if (!fn) return null
    const parts = fn[1].split(/[,/\s]+/).filter(Boolean).map(Number)
    if (parts.length < 3 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1]) || !Number.isFinite(parts[2])) return null
    const alpha = parts.length > 3 && Number.isFinite(parts[3]) ? clampNum(parts[3], 0, 1) : 1
    return { r: clampNum(Math.round(parts[0]), 0, 255), g: clampNum(Math.round(parts[1]), 0, 255), b: clampNum(Math.round(parts[2]), 0, 255), a: alpha }
  }
  const hexOf = (c) => {
    const h = (n) => clampNum(Math.round(n), 0, 255).toString(16).padStart(2, '0')
    return '#' + h(c.r) + h(c.g) + h(c.b)
  }
  const over = (fg, bg) => {
    if (!fg) return bg
    const a = fg.a
    if (a >= 1) return { r: fg.r, g: fg.g, b: fg.b, a: 1 }
    return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }
  }
  const lum = (c) => {
    const channel = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b)
  }
  const contrastOf = (fg, bg) => { const l1 = lum(fg) + 0.05; const l2 = lum(bg) + 0.05; return l1 > l2 ? l1 / l2 : l2 / l1 }
  const WHITE = { r: 255, g: 255, b: 255, a: 1 }
  const bgCache = new Map()
  const backgroundOf = (element) => {
    if (!element || element === document.documentElement) return { color: WHITE, img: false }
    if (bgCache.has(element)) return bgCache.get(element)
    const chain = []
    let node = element
    let unknown = false
    let guard = 0
    while (node && node.nodeType === 1 && guard < 24) {
      guard += 1
      const style = getComputedStyle(node)
      const image = style.backgroundImage
      if (image && image !== 'none' && (image.indexOf('url(') >= 0 || image.indexOf('gradient(') >= 0)) unknown = true
      const color = parseColor(style.backgroundColor)
      if (color && color.a > 0) chain.push(color)
      if (color && color.a >= 1) break
      node = node.parentElement
    }
    let base = WHITE
    for (let i = chain.length - 1; i >= 0; i -= 1) base = over(chain[i], base)
    const result = { color: base, img: unknown }
    if (bgCache.size < 4000) bgCache.set(element, result)
    return result
  }
  const escapeId = (value) => {
    if (window.CSS && typeof CSS.escape === 'function') return CSS.escape(String(value))
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&')
  }
  const isUnique = (selector) => { try { return document.querySelectorAll(selector).length === 1 } catch (error) { return false } }
  const selectorOf = (element) => {
    if (!element || element.nodeType !== 1) return ''
    const id = element.id ? String(element.id).slice(0, 80) : ''
    if (id) { const asId = '#' + escapeId(id); if (isUnique(asId)) return asId }
    const parts = []
    let node = element
    let depth = 0
    while (node && node.nodeType === 1 && node !== document.documentElement && depth < 8) {
      depth += 1
      let part = node.tagName.toLowerCase()
      const nodeId = node.id ? String(node.id).slice(0, 80) : ''
      if (nodeId) {
        part += '#' + escapeId(nodeId)
      } else {
        const classes = String(node.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 6)
        let uniqueClass = ''
        for (const name of classes) {
          try { if (document.querySelectorAll('.' + escapeId(name)).length === 1) { uniqueClass = name; break } } catch (error) { /* ignore */ }
        }
        if (uniqueClass) {
          part += '.' + escapeId(uniqueClass)
        } else if (node.parentElement) {
          let index = 1
          let same = 0
          for (let sibling = node.parentElement.firstElementChild; sibling; sibling = sibling.nextElementSibling) {
            if (sibling.tagName === node.tagName) {
              same += 1
              if (sibling === node) index = same
            }
          }
          if (same > 1) part += ':nth-of-type(' + index + ')'
        }
      }
      parts.unshift(part)
      const candidate = parts.join(' > ')
      if (isUnique(candidate)) return candidate
      if (nodeId) break
      node = node.parentElement
    }
    return parts.join(' > ') || element.tagName.toLowerCase()
  }
  const visible = (element) => {
    if (!element || element.nodeType !== 1) return false
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false
    if (px(style.opacity) === 0) return false
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }
  const textOf = (element) => String((element && (element.innerText || element.textContent)) || '').replace(/\s+/g, ' ').trim()
  const primaryFamily = (stack) => {
    const first = String(stack || '').split(',')[0].trim().replace(/^["']|["']$/g, '')
    return first.replace(/^_+/, '').split('_')[0] || first
  }
  const bump = (map, key, amount) => {
    if (key === '' || key === null || key === undefined) return
    map.set(key, (map.get(key) || 0) + (amount === undefined ? 1 : amount))
  }
  const topEntries = (map, limit) => Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)

  const counts = {
    total: 0,
    headings: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
    buttons: 0, links: 0, images: 0, imagesWithoutAlt: 0, imagesMissingAltAttr: 0,
    forms: 0, inputs: 0, inputsWithoutLabel: 0, landmarks: 0, sections: 0,
    svgs: 0, videos: 0, iframes: 0, unnamedControls: 0, focusable: 0,
  }
  const colorCounts = new Map()
  const bgCounts = new Map()
  const fgCounts = new Map()
  const fontMap = new Map()
  const sizeCounts = new Map()
  const lineHeightCounts = new Map()
  const spacingCounts = new Map()
  const radiusCounts = new Map()
  const gradients = []
  const fixed = []
  const overflowOffenders = []
  const headingsOrder = []
  const headingsEvidence = []
  const duplicateIdMap = new Map()
  const imagesMissingAlt = []
  const unnamedControls = []
  const unlabeledInputs = []
  let leftAccentCards = 0
  let leftAccentSelector = ''

  const idSeen = new Map()
  const markId = (element) => {
    const id = element.id ? String(element.id) : ''
    if (!id) return
    idSeen.set(id, (idSeen.get(id) || 0) + 1)
  }

  const scopeElements = Array.from(scopeRoot.querySelectorAll('*')).slice(0, MAX_ELEMENTS)
  const elementList = []
  for (const element of scopeElements) {
    if (!visible(element)) continue
    const tag = element.tagName.toLowerCase()
    if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'template' || tag === 'link' || tag === 'meta' || tag === 'title') continue
    counts.total += 1
    markId(element)
    const style = getComputedStyle(element)
    const color = parseColor(style.color)
    const background = backgroundOf(element)
    if (background.color) { const key = hexOf(background.color); bump(bgCounts, key); bump(colorCounts, key) }
    if (color && color.a > 0) { const key = hexOf(color); bump(fgCounts, key); bump(colorCounts, key) }
    const family = primaryFamily(style.fontFamily)
    const sizePx = px(style.fontSize)
    if (sizePx > 0) bump(sizeCounts, round(sizePx))
    const lineHeight = style.lineHeight === 'normal' ? 0 : px(style.lineHeight)
    if (lineHeight > 0 && lineHeight <= 200) bump(lineHeightCounts, round(lineHeight))
    if (family) {
      const entry = fontMap.get(family) || { count: 0, weights: new Set(), sizes: new Set() }
      entry.count += 1
      const weight = parseInt(style.fontWeight, 10)
      if (Number.isFinite(weight)) entry.weights.add(weight)
      if (sizePx > 0) entry.sizes.add(round(sizePx))
      fontMap.set(family, entry)
    }
    const gaps = [style.marginTop, style.marginRight, style.marginBottom, style.marginLeft, style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft, style.rowGap, style.columnGap]
    for (const raw of gaps) {
      const value = px(raw)
      if (value > 0 && value <= 240) bump(spacingCounts, round(value))
    }
    const radii = [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius]
    let radius = 0
    for (const raw of radii) radius = Math.max(radius, px(raw))
    if (radius > 0) bump(radiusCounts, round(radius))
    const box = element.getBoundingClientRect()
    const backgroundImage = String(style.backgroundImage || '')
    if (backgroundImage.indexOf('gradient(') >= 0 && gradients.length < 20) {
      gradients.push({ selector: selectorOf(element), value: backgroundImage.slice(0, 200), area: Math.round(box.width * box.height) })
    }
    if ((style.position === 'fixed' || style.position === 'sticky') && fixed.length < 10) {
      if (box.height > 0) fixed.push({ selector: selectorOf(element), height: Math.round(box.height), position: style.position })
    }
    const borderLeft = px(style.borderLeftWidth)
    const borderOther = px(style.borderTopWidth) + px(style.borderRightWidth) + px(style.borderBottomWidth)
    if (borderLeft >= 3 && borderOther === 0 && radius >= 4) {
      leftAccentCards += 1
      if (!leftAccentSelector) leftAccentSelector = selectorOf(element)
    }
    const rect = box
    if (!scopeEl && rect.width > 0 && rect.right > window.innerWidth + 4) {
      if (overflowOffenders.length < 10) overflowOffenders.push({ selector: selectorOf(element), width: Math.round(rect.width) })
    }
    elementList.push({ element: element, tag: tag, style: style })
  }

  for (const tagName of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
    const list = Array.from(scopeRoot.querySelectorAll(tagName))
    let seen = 0
    for (const heading of list) {
      if (!visible(heading)) continue
      counts.headings[tagName] += 1
      if (seen < 30) {
        const style = getComputedStyle(heading)
        const sizePx = px(style.fontSize)
        if (headingsEvidence.length < MAX_LIST) {
          headingsEvidence.push({
            tag: tagName,
            size: sizePx,
            family: primaryFamily(style.fontFamily),
            weight: parseInt(style.fontWeight, 10) || 400,
            text: textOf(heading).slice(0, 100),
            selector: selectorOf(heading),
          })
        }
        if (headingsOrder.length < 100) headingsOrder.push(tagName)
      }
      seen += 1
    }
  }
  const countVisible = (selector, limit) => {
    let total = 0
    let list
    try { list = Array.from(scopeRoot.querySelectorAll(selector)) } catch (error) { return 0 }
    for (const element of list) {
      if (visible(element)) total += 1
      if (total >= limit) break
    }
    return total
  }
  const images = Array.from(scopeRoot.querySelectorAll('img'))
  for (const image of images) {
    if (!visible(image)) continue
    counts.images += 1
    if (!image.hasAttribute('alt')) {
      counts.imagesMissingAltAttr += 1
      if (imagesMissingAlt.length < 10) imagesMissingAlt.push({ selector: selectorOf(image), src: String(image.getAttribute('src') || '').slice(0, 120) })
    }
    if (!String(image.getAttribute('alt') || '').trim()) counts.imagesWithoutAlt += 1
  }
  counts.buttons = countVisible('button, [role="button"], input[type="button"], input[type="submit"]', 400)
  counts.links = countVisible('a[href]', 400)
  counts.forms = countVisible('form', 100)
  counts.svgs = countVisible('svg', 400)
  counts.videos = countVisible('video', 50)
  counts.iframes = countVisible('iframe', 50)
  counts.sections = countVisible('section', 200)
  counts.landmarks = countVisible('header, nav, main, footer, aside, form, [role="banner"], [role="navigation"], [role="main"], [role="contentinfo"], [role="complementary"], [role="search"]', 200)
  counts.focusable = countVisible('a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])', 500)

  const fields = Array.from(scopeRoot.querySelectorAll('input:not([type="hidden"]), select, textarea'))
  for (const field of fields) {
    if (!visible(field)) continue
    counts.inputs += 1
    let label = String(field.getAttribute('aria-label') || '').trim()
    if (!label) {
      const labelledBy = String(field.getAttribute('aria-labelledby') || '').trim()
      if (labelledBy) {
        try { label = labelledBy.split(/\s+/).map((id) => textOf(document.getElementById(id))).filter(Boolean).join(' ') } catch (error) { label = '' }
      }
    }
    if (!label && field.id) {
      try { label = textOf(document.querySelector('label[for="' + CSS.escape(field.id) + '"]')) } catch (error) { label = '' }
    }
    if (!label) {
      const wrapper = field.closest ? field.closest('label') : null
      if (wrapper) label = textOf(wrapper)
    }
    if (!String(field.getAttribute('title') || '').trim() && !String(field.getAttribute('placeholder') || '').trim()) { /* title/placeholder is not a label */ }
    if (!label) {
      counts.inputsWithoutLabel += 1
      if (unlabeledInputs.length < 10) unlabeledInputs.push({ selector: selectorOf(field), type: String(field.getAttribute('type') || field.tagName.toLowerCase()).slice(0, 20), placeholder: String(field.getAttribute('placeholder') || '').slice(0, 60) })
    }
  }
  const controls = Array.from(scopeRoot.querySelectorAll('button, a[href], input[type="submit"], input[type="button"]'))
  for (const control of controls) {
    if (!visible(control)) continue
    const name = String(control.getAttribute('aria-label') || control.getAttribute('title') || textOf(control) || (control.tagName === 'INPUT' ? control.value : '') || '').trim()
    if (!name) {
      counts.unnamedControls += 1
      if (unnamedControls.length < 10) unnamedControls.push({ selector: selectorOf(control), tag: control.tagName.toLowerCase(), text: String(control.getAttribute('value') || '').slice(0, 60) })
    }
  }

  const tapTargets = []
  for (const control of controls) {
    if (!visible(control)) continue
    const rect = control.getBoundingClientRect()
    if ((rect.width < 44 || rect.height < 44) && tapTargets.length < 30) {
      tapTargets.push({ selector: selectorOf(control), width: Math.round(rect.width), height: Math.round(rect.height), text: (String(control.getAttribute('aria-label') || '') || textOf(control)).slice(0, 60) })
    }
  }

  const textNodeMap = new Map()
  let animatedCount = 0
  try { animatedCount = Math.min(999, (document.getAnimations ? document.getAnimations({ subtree: true }) : []).length) } catch (error) { animatedCount = 0 }

  const addTextNode = (element, text) => {
    if (!text || textNodeMap.size >= 400) return
    const style = getComputedStyle(element)
    const color = parseColor(style.color)
    if (!color || color.a === 0) return
    const background = backgroundOf(element)
    if (background.img) return
    const sizePx = px(style.fontSize)
    if (!(sizePx > 0)) return
    const weight = parseInt(style.fontWeight, 10) || 400
    const lineHeight = style.lineHeight === 'normal' ? 0 : px(style.lineHeight)
    const letterSpacing = px(style.letterSpacing)
    const family = primaryFamily(style.fontFamily)
    const align = String(style.textAlign || 'start')
    const key = [sizePx, weight, hexOf(color), hexOf(background.color), round(lineHeight), round(letterSpacing), family, align].join('|')
    const entry = {
      px: sizePx,
      weight: weight,
      contrast: round(contrastOf(color, background.color), 2),
      color: hexOf(color),
      bg: hexOf(background.color),
      text: text.slice(0, 80),
      selector: selectorOf(element),
      tag: element.tagName.toLowerCase(),
      lh: lineHeight,
      ls: round(letterSpacing, 2),
      family: family,
      align: align,
      chars: text.length,
    }
    const previous = textNodeMap.get(key)
    if (!previous || entry.chars > previous.chars) textNodeMap.set(key, entry)
  }

  // Headings first so type rules always see the real heading styles.
  for (const heading of Array.from(scopeRoot.querySelectorAll('h1, h2, h3, h4, h5, h6')).slice(0, 40)) {
    if (!visible(heading)) continue
    addTextNode(heading, textOf(heading).slice(0, 160))
  }
  try {
    const walker = document.createTreeWalker(scopeRoot, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const value = node.nodeValue
        if (!value || !value.trim()) return NodeFilter.FILTER_REJECT
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        const tag = parent.tagName.toLowerCase()
        if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'template' || tag === 'title' || tag === 'svg' || tag === 'path') return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    let node = walker.nextNode()
    let guard = 0
    while (node && guard < 20000) {
      guard += 1
      const parent = node.parentElement
      if (parent && visible(parent)) addTextNode(parent, String(node.nodeValue || '').replace(/\s+/g, ' ').trim())
      node = walker.nextNode()
    }
  } catch (error) { /* text sampling is best effort */ }

  const textNodes = Array.from(textNodeMap.values()).slice(0, MAX_TEXT_NODES)
  const largeText = (node) => node.px >= 24 || (node.px >= 18.66 && node.weight >= 700)
  const contrast = []
  const smallText = []
  for (const node of textNodes) {
    const large = largeText(node)
    if ((large && node.contrast < 3) || (!large && node.contrast < 4.5)) {
      if (contrast.length < MAX_CONTRAST) contrast.push({ selector: node.selector, fg: node.color, bg: node.bg, ratio: node.contrast, large: large, text: node.text })
    }
    if (node.px < minBodyPx && node.chars >= 6 && smallText.length < 20) smallText.push({ selector: node.selector, px: node.px, text: node.text })
  }
  contrast.sort((a, b) => a.ratio - b.ratio)

  const container = scopeEl || document.querySelector('main') || document.body || document.documentElement
  let sectionsRoot = container
  for (let depth = 0; depth < 3; depth += 1) {
    const children = sectionsRoot && sectionsRoot.children ? Array.from(sectionsRoot.children).filter((child) => {
      const tag = child.tagName.toLowerCase()
      return tag !== 'script' && tag !== 'style' && tag !== 'noscript' && tag !== 'template'
    }) : []
    if (children.length === 1 && children[0].getBoundingClientRect().height > 200) sectionsRoot = children[0]
    else break
  }
  const sections = []
  if (sectionsRoot && sectionsRoot.children) {
    let index = 0
    for (const child of Array.from(sectionsRoot.children)) {
      if (sections.length >= MAX_LIST) break
      const tag = child.tagName.toLowerCase()
      if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'template') continue
      if (!visible(child)) continue
      const style = getComputedStyle(child)
      const rect = child.getBoundingClientRect()
      if (rect.height < 20) continue
      index += 1
      sections.push({
        index: index,
        tag: tag,
        className: String(child.getAttribute('class') || '').slice(0, 80),
        height: Math.round(rect.height),
        paddingTop: px(style.paddingTop),
        textLength: textOf(child).length,
      })
    }
  }

  const duplicateIds = []
  for (const [id, countTimes] of idSeen.entries()) {
    if (countTimes > 1 && duplicateIds.length < 10) duplicateIds.push({ id: id.slice(0, 60), count: countTimes })
  }
  if (duplicateIds.length > 0) {
    counts.duplicateIds = duplicateIds.length
    if (duplicateIdMap.size === 0) { /* duplicate ids are reported through evidence */ }
  }

  const PLACEHOLDER_HOSTS = /(via\.placeholder\.com|placehold\.co|placeholder\.com|picsum\.photos|source\.unsplash\.com|loremflickr|lorempixel|placekitten|dummyimage\.com)/i
  const slopHits = []
  const placeholderImages = []
  for (const image of images) {
    const source = String(image.getAttribute('src') || '') + ' ' + String(image.getAttribute('srcset') || '')
    if (PLACEHOLDER_HOSTS.test(source) && placeholderImages.length < 5) placeholderImages.push({ selector: selectorOf(image), src: source.slice(0, 120) })
  }
  for (const item of placeholderImages) slopHits.push({ code: 'placeholder-host', selector: item.selector, detail: item.src })
  if (leftAccentCards > 0) slopHits.push({ code: 'left-accent-cards', selector: leftAccentSelector, detail: String(leftAccentCards) })

  const rawText = String((scopeRoot.innerText !== undefined ? scopeRoot.innerText : scopeRoot.textContent) || '')
  const collapsed = rawText.replace(/\s+/g, ' ').trim()
  const textLength = collapsed.length
  const textSample = collapsed.slice(0, MAX_TEXT)
  const emojiPattern = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}]/gu
  const emojiMatches = textSample.match(emojiPattern)
  const emojiCount = emojiMatches ? emojiMatches.length : 0
  if (emojiCount > 0) slopHits.push({ code: 'emoji', selector: '', detail: String(emojiCount) })
  if (/lorem ipsum|dolor sit amet/i.test(textSample)) slopHits.push({ code: 'lorem', selector: '', detail: 'lorem ipsum' })
  const fakeNameMatch = /(john doe|jane doe|acme (corp|inc|co)\b|globex|initech|umbrella (corp|inc)\b|foo ?bar|example\.com)/i.exec(textSample)
  if (fakeNameMatch) slopHits.push({ code: 'fake-name', selector: '', detail: fakeNameMatch[0].slice(0, 60) })

  // Icon-card wall: many identical icon boxes in one container.
  let iconWall = 0
  for (const wrapper of Array.from(scopeRoot.querySelectorAll('section, ul, ol, div')).slice(0, 400)) {
    const kids = Array.from(wrapper.children)
    if (kids.length < 9 || kids.length > 15) continue
    let withIcon = 0
    let heights = []
    let narrow = true
    for (const kid of kids) {
      if (kid.querySelector('svg, img') && textOf(kid).length <= 120) withIcon += 1
      const rect = kid.getBoundingClientRect()
      heights.push(rect.height)
      if (rect.width > 480) narrow = false
    }
    if (withIcon >= 9 && narrow) {
      const minHeight = Math.min.apply(null, heights)
      const maxHeight = Math.max.apply(null, heights)
      if (minHeight > 40 && maxHeight > 0 && minHeight / maxHeight > 0.75) { iconWall = kids.length; break }
    }
  }
  if (iconWall > 8) slopHits.push({ code: 'icon-card-wall', selector: '', detail: String(iconWall) })

  // Cookie-cutter landing skeleton: hero with h1, a row of exactly three feature cards, a CTA, a footer.
  const hasFooter = Boolean(scopeRoot.querySelector('footer')) || sections.some((section) => section.tag === 'footer')
  const hasCta = Array.from(scopeRoot.querySelectorAll('a, button')).some((element) => /(get started|start free|sign up|try|buy|subscribe|开始|免费|试用|购买|订阅)/i.test(textOf(element)) && textOf(element).length <= 40)
  const hasHero = Boolean(scopeRoot.querySelector('h1'))
  let hasThreeCards = false
  for (const section of sections) {
    if (section.height < 160) continue
    const sectionElement = Array.from(sectionsRoot.children)[section.index - 1]
    if (!sectionElement) continue
    const kids = Array.from(sectionElement.children).filter((kid) => kid.getBoundingClientRect().height >= 100)
    if (kids.length === 3) { hasThreeCards = true; break }
  }
  if (hasHero && hasThreeCards && hasCta && hasFooter) slopHits.push({ code: 'cookie-cutter', selector: '', detail: 'hero+3cards+cta+footer' })

  // Horizontal overflow of the root (page-level only).
  let horizontal = false
  if (!scopeEl) horizontal = document.documentElement.scrollWidth > window.innerWidth + 2
  else horizontal = scopeRoot.scrollWidth > scopeRoot.clientWidth + 2

  const breakpoints = new Set()
  try {
    const visit = (rules, depth) => {
      if (!rules || depth > 4) return
      for (let i = 0; i < rules.length && i < 2500; i += 1) {
        const rule = rules[i]
        const media = rule && rule.media ? String(rule.media.mediaText || '') : ''
        if (media) {
          const pattern = /(min|max)-width\s*:\s*([\d.]+)px/g
          let match = pattern.exec(media)
          while (match) {
            const width = Math.round(Number(match[2]))
            if (width > 0 && width <= 4000) breakpoints.add(width)
            match = pattern.exec(media)
          }
        }
        if (rule && rule.cssRules) visit(rule.cssRules, depth + 1)
      }
    }
    for (const sheet of Array.from(document.styleSheets).slice(0, 30)) {
      try { visit(sheet.cssRules, 0) } catch (error) { /* cross-origin sheets are skipped */ }
    }
  } catch (error) { /* stylesheet inspection is best effort */ }

  const tokens = {
    colors: topEntries(colorCounts, 24).map((entry) => [String(entry[0]), entry[1]]),
    fonts: topEntries(new Map(Array.from(fontMap.entries()).map((entry) => [entry[0], entry[1].count])), 8).map((entry) => [String(entry[0]), entry[1]]),
    sizes: topEntries(sizeCounts, 24).map((entry) => [Number(entry[0]), entry[1]]),
    radii: topEntries(radiusCounts, 16).map((entry) => [Number(entry[0]), entry[1]]),
    spacings: topEntries(spacingCounts, 20).map((entry) => [Number(entry[0]), entry[1]]),
  }

  return {
    ok: true,
    url: String(location.href),
    title: String(document.title || '').slice(0, 200),
    lang: String(document.documentElement.lang || '').slice(0, 20),
    metaViewport: String((document.querySelector('meta[name="viewport"]') || {}).content || '').slice(0, 200),
    scope: scopeEl ? { index: scopeIndex, label: String(scopeEl.getAttribute('data-screen-label') || '').slice(0, 80) } : null,
    textSample: textSample,
    textLength: textLength,
    colors: topEntries(colorCounts, 24).map((entry) => ({ value: String(entry[0]), count: entry[1] })),
    backgrounds: topEntries(bgCounts, 16).map((entry) => ({ value: String(entry[0]), count: entry[1] })),
    textColors: topEntries(fgCounts, 16).map((entry) => ({ value: String(entry[0]), count: entry[1] })),
    fonts: topEntries(fontMap, 8).map((entry) => ({
      family: String(entry[0]),
      weights: Array.from(entry[1].weights).sort((a, b) => a - b).slice(0, 6),
      sizes: Array.from(entry[1].sizes).sort((a, b) => a - b).slice(0, 8),
      count: entry[1].count,
    })),
    sizes: topEntries(sizeCounts, 24).map((entry) => Number(entry[0])),
    lineHeights: topEntries(lineHeightCounts, 20).map((entry) => Number(entry[0])),
    spacings: topEntries(spacingCounts, 20).map((entry) => Number(entry[0])),
    radii: topEntries(radiusCounts, 16).map((entry) => Number(entry[0])),
    elements: counts,
    textNodes: textNodes,
    smallText: smallText,
    tapTargets: tapTargets,
    contrast: contrast,
    overflow: { horizontal: horizontal, offenders: overflowOffenders },
    headingsOrder: headingsOrder,
    focusableCount: counts.focusable,
    animatedCount: animatedCount,
    gradients: gradients,
    fixed: fixed,
    slopHits: slopHits.slice(0, 20),
    tokenUsage: tokens,
    sections: sections,
    breakpoints: Array.from(breakpoints).sort((a, b) => a - b).slice(0, 24),
    evidence: {
      unnamedControls: unnamedControls,
      unlabeledInputs: unlabeledInputs,
      duplicateIds: duplicateIds,
      imagesMissingAlt: imagesMissingAlt,
      fixed: fixed,
      headings: headingsEvidence,
      leftAccentCards: leftAccentCards,
    },
    render: {
      consoleErrors: 0,
      failedRequests: 0,
      docWidth: Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0),
      docHeight: Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0),
    },
  }
}`

/** Build an Error carrying a machine-readable `code`. */
function fail(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

/** Throw a `cancelled` error when the abort signal fired. */
function abortIfNeeded(signal) {
  if (signal && signal.aborted === true) throw fail('cancelled', 'the probe was cancelled')
}

/** Wait for a short wall-clock delay, respecting cancellation between ticks. */
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (signal && signal.aborted === true) reject(fail('cancelled', 'the probe was cancelled'))
      else resolve()
    }, ms)
    if (typeof timer.unref === 'function') timer.unref()
  })
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
    throw fail('failed', String(reason).split('\n')[0].slice(0, 300))
  }
  return response && response.result ? response.result.value : undefined
}

/** Apply one viewport to the page. */
async function applyViewport(page, width, height) {
  await page.session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
    screenWidth: width,
    screenHeight: height,
  })
  await page.session
    .send('Emulation.setTouchEmulationEnabled', { enabled: width < 768, maxTouchPoints: width < 768 ? 5 : 1 })
    .catch(() => {})
  await page.session
    .send('Emulation.setEmulatedMedia', {
      media: 'screen',
      features: [
        { name: 'prefers-color-scheme', value: 'light' },
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ],
    })
    .catch(() => {})
  await page.session.send('Emulation.setScrollbarsHidden', { hidden: true }).catch(() => {})
}

/** Navigate, wait for the load event and settle the network. */
async function navigate(page, url, signal) {
  abortIfNeeded(signal)
  page.resetNetwork()
  const loaded = page.session.waitForEvent('Page.loadEventFired', { timeout: LIMITS.settleTimeoutMs }).catch(() => null)
  let navigation
  try {
    navigation = await page.session.send('Page.navigate', { url })
  } catch (error) {
    throw fail('navigation', 'could not open ' + url + ': ' + messageOf(error))
  }
  if (navigation && navigation.errorText) throw fail('navigation', 'could not open ' + url + ': ' + navigation.errorText)
  const timedOut = new Promise((resolve) => {
    const timer = setTimeout(() => resolve('timeout'), LIMITS.settleTimeoutMs)
    if (typeof timer.unref === 'function') timer.unref()
  })
  const outcome = await Promise.race([loaded.then((value) => (value === null ? 'timeout' : 'loaded')), timedOut])
  if (outcome !== 'loaded') throw fail('timeout', 'the page did not finish loading within ' + LIMITS.settleTimeoutMs + ' ms')
  await page.waitForNetworkIdle({ quietMs: LIMITS.networkQuietMs, timeoutMs: Math.min(15000, LIMITS.settleTimeoutMs) })
}

/** Fonts + two frames + a short idle after the network is quiet. */
async function settle(page, signal) {
  abortIfNeeded(signal)
  await page.waitForNetworkIdle({ quietMs: LIMITS.networkQuietMs, timeoutMs: Math.min(15000, LIMITS.settleTimeoutMs) })
  await evaluate(page, 'Promise.resolve(document.fonts && document.fonts.ready ? document.fonts.ready : true)', { awaitPromise: true }).catch(() => {})
  await evaluate(page, 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))', { awaitPromise: true }).catch(() => {})
  await sleep(120, signal)
}

/** Scroll-warm lazy content, then freeze animations. */
async function warmAndFreeze(page, signal) {
  abortIfNeeded(signal)
  await evaluate(page, WARM_SCRIPT, { awaitPromise: true }).catch(() => null)
  await page.waitForNetworkIdle({ quietMs: LIMITS.networkQuietMs, timeoutMs: 6000 }).catch(() => {})
  abortIfNeeded(signal)
  await evaluate(page, FREEZE_SCRIPT).catch(() => null)
  await evaluate(page, 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))', { awaitPromise: true }).catch(() => {})
}

/** Measure the document (capped so a hostile page cannot request a giant image). */
async function measureDocument(page) {
  const size = await evaluate(page, '(() => ({ width: Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0), height: Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0) }))()').catch(() => null)
  return { width: Math.max(1, Math.round((size && size.width) || 0)), height: Math.max(1, Math.round((size && size.height) || 0)) }
}

/** Full-page screenshot bounded by the capture limits. */
async function captureFullPage(page, { width, viewportHeight, log }) {
  const documentSize = await measureDocument(page)
  const docWidth = Math.max(width, documentSize.width)
  const docHeight = Math.max(viewportHeight, documentSize.height)
  const clipWidth = Math.min(LIMITS.maxPageWidth, docWidth)
  const clipHeight = Math.min(LIMITS.maxPageHeight, docHeight)
  const params = { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { x: 0, y: 0, width: clipWidth, height: clipHeight, scale: 1 } }
  try {
    const shot = await page.session.send('Page.captureScreenshot', params)
    if (!shot || !shot.data) throw new Error('the browser returned no image data')
    return { data: Buffer.from(shot.data, 'base64'), width: clipWidth, height: clipHeight, docWidth, docHeight, fullPage: true }
  } catch (error) {
    log('the full-page screenshot failed at ' + width + ' px (' + messageOf(error) + '); the visible area was captured instead')
    const fallback = await page.session.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
    return { data: Buffer.from(fallback.data, 'base64'), width, height: viewportHeight, docWidth, docHeight, fullPage: false }
  }
}

/** Collect the §7 metrics object in the page. */
async function collectMetrics(page, options) {
  const expression = '(' + METRICS_SOURCE + ')(' + JSON.stringify(options) + ')'
  const value = await evaluate(page, expression)
  if (!value || value.ok !== true) throw fail('failed', 'the page returned no readable structure')
  return value
}

/** Convert one failed-request row from the page tracker into the health shape. */
function toFailedRequest(row) {
  return {
    url: String(row && row.url ? row.url : '').slice(0, 300),
    status: Number(row && row.status ? row.status : 0),
    error: String((row && (row.errorText || row.reason)) || (row && row.status ? 'HTTP ' + row.status : 'request failed')).slice(0, 200),
  }
}

/** Detect deck screens (labels first, `.screen` fallback). */
async function detectScreens(page) {
  const list = await evaluate(page, `(() => {
    const elements = Array.from(document.querySelectorAll('[data-screen-label], .screen')).slice(0, ${MAX_SCREENS})
    return elements.map((element, index) => {
      const rect = element.getBoundingClientRect()
      return {
        index: index,
        label: String(element.getAttribute('data-screen-label') || '').slice(0, 80),
        top: Math.round(rect.top + window.scrollY),
        left: Math.round(rect.left + window.scrollX),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }
    }).filter((entry) => entry.width > 0 && entry.height > 0)
  })()`).catch(() => [])
  return Array.isArray(list) ? list : []
}

/**
 * Photograph every deck screen (and optionally measure it).
 * @param {object} page an initialized BrowserPage
 * @param {{dir?: string, log?: Function, signal?: AbortSignal, onProgress?: Function, withMetrics?: boolean}} options
 */
async function captureScreenBuffers(page, options = {}) {
  const dir = typeof options.dir === 'string' && options.dir.length > 0 ? options.dir : ''
  const log = typeof options.log === 'function' ? options.log : () => {}
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {}
  const withMetrics = options.withMetrics === true
  const infos = await detectScreens(page)
  const screens = []
  for (const info of infos) {
    abortIfNeeded(options.signal)
    const position = screens.length + 1
    onProgress({ phase: 'screen', index: position, total: infos.length, message: '截取第 ' + position + '/' + infos.length + ' 页' })
    await evaluate(page, 'window.scrollTo(0, ' + Math.max(0, info.top) + ')').catch(() => {})
    await evaluate(page, 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))', { awaitPromise: true }).catch(() => {})
    const width = Math.max(1, Math.min(1920, info.width || 1920))
    const height = Math.max(1, Math.min(1080, info.height || 1080))
    let data
    try {
      const shot = await page.session.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: true,
        clip: { x: Math.max(0, info.left), y: Math.max(0, info.top), width, height, scale: 1 },
      })
      if (!shot || !shot.data) throw new Error('empty image')
      data = Buffer.from(shot.data, 'base64')
    } catch (error) {
      log('screen ' + position + ' could not be captured: ' + messageOf(error))
      continue
    }
    const name = 'screen-' + String(position).padStart(2, '0') + '.png'
    if (dir) await writeFile(join(dir, name), data)
    const record = {
      label: String(info.label || 'screen ' + position).slice(0, 80),
      index: position,
      screenshot: name,
      width,
      height,
      png: data,
    }
    if (withMetrics) {
      const metrics = await collectMetrics(page, { minBodyPx: 24, scopeIndex: info.index, maxElements: 6000, maxText: 4000 })
      metrics.render = {
        consoleErrors: 0,
        failedRequests: 0,
        docWidth: Math.max(1, Math.round(metrics.render && metrics.render.docWidth ? metrics.render.docWidth : width)),
        docHeight: Math.max(1, Math.round(metrics.render && metrics.render.docHeight ? metrics.render.docHeight : height)),
      }
      record.metrics = metrics
    }
    screens.push(record)
  }
  return screens
}

/** Wire the page health listener; returns the unsubscribe function and the accumulators. */
function trackHealth(page) {
  const consoleErrors = []
  const failedRequests = []
  const seenErrors = new Set()
  const seenFailures = new Set()
  const unsubscribe = page.onEvent((event) => {
    const method = event.method
    const params = event.params || {}
    if (method === 'Runtime.consoleAPICalled' && (params.type === 'error' || params.type === 'assert')) {
      const text = (params.args || [])
        .map((argument) => (typeof argument.value === 'string' ? argument.value : argument.description || argument.type || ''))
        .filter(Boolean)
        .join(' ')
        .slice(0, 300)
      if (text && !seenErrors.has(text)) {
        seenErrors.add(text)
        const frame = params.stackTrace && params.stackTrace.callFrames && params.stackTrace.callFrames[0] ? params.stackTrace.callFrames[0] : null
        consoleErrors.push({ text: text, url: String(frame && frame.url ? frame.url : '').slice(0, 300), line: Number(frame && frame.lineNumber ? frame.lineNumber : 0) })
      }
    } else if (method === 'Runtime.exceptionThrown') {
      const details = params.exceptionDetails || {}
      const text = String((details.exception && details.exception.description) || details.text || 'uncaught exception').split('\n')[0].slice(0, 300)
      if (text && !seenErrors.has(text)) {
        seenErrors.add(text)
        consoleErrors.push({ text: text, url: String(details.url || '').slice(0, 300), line: Number(details.lineNumber || 0) })
      }
    } else if (method === 'Network.responseReceived') {
      const response = params.response || {}
      if ((response.status || 0) >= 400) {
        const key = String(response.url || '') + '|' + response.status
        if (!seenFailures.has(key)) {
          seenFailures.add(key)
          failedRequests.push({ url: String(response.url || '').slice(0, 300), status: Number(response.status || 0), error: 'HTTP ' + response.status })
        }
      }
    } else if (method === 'Network.loadingFailed' && params.canceled !== true) {
      const key = String(params.requestId || '') + '|' + String(params.errorText || '')
      if (!seenFailures.has(key)) {
        seenFailures.add(key)
        failedRequests.push({ url: '', status: 0, error: String(params.errorText || 'request failed').slice(0, 200) })
      }
    }
  })
  return { consoleErrors: consoleErrors, failedRequests: failedRequests, unsubscribe: unsubscribe }
}

/** Merge tracker failures into the health report. */
function mergeFailures(health, page) {
  const tracker = page && page.network && Array.isArray(page.network.failed) ? page.network.failed : []
  const seen = new Set(health.failedRequests.map((row) => row.url + '|' + row.status + '|' + row.error))
  for (const row of tracker) {
    const converted = toFailedRequest(row)
    const key = converted.url + '|' + converted.status + '|' + converted.error
    if (seen.has(key)) continue
    seen.add(key)
    health.failedRequests.push(converted)
  }
}

/** Apply the fill values that only the probe knows to one metrics object. */
function fillRender(metrics, health, page) {
  if (!metrics || typeof metrics !== 'object') return metrics
  const render = metrics.render || {}
  metrics.render = {
    consoleErrors: health.consoleErrors.length,
    failedRequests: health.failedRequests.length,
    docWidth: Math.max(0, Math.round(render.docWidth || 0)),
    docHeight: Math.max(0, Math.round(render.docHeight || 0)),
  }
  return metrics
}

/**
 * Probe one design URL.
 * @param {object} input
 * @param {import('./browser.js').BrowserPool} input.pool
 * @param {string} input.url absolute http(s)/file preview URL
 * @param {number[]} [input.widths]
 * @param {'web'|'mobile'|'deck'|'poster'|'doc'} [input.kind]
 * @param {string} input.dir directory that receives the screenshots
 * @param {boolean} [input.screens] capture deck screens when present
 * @param {{warn?: Function}} [input.log]
 * @param {AbortSignal} [input.signal]
 * @param {Function} [input.onProgress]
 * @returns {Promise<object>} CONTRACT §3 probe result
 */
export async function probeDesign(input = {}) {
  const started = Date.now()
  const pool = input.pool
  const url = typeof input.url === 'string' ? input.url : ''
  const kind = typeof input.kind === 'string' && KIND_VIEWPORTS[input.kind] ? input.kind : 'web'
  const dir = typeof input.dir === 'string' && input.dir.length > 0 ? input.dir : ''
  const screensRequested = input.screens === true
  const log = typeof input.log === 'function' ? input.log : () => {}
  const onProgress = typeof input.onProgress === 'function' ? input.onProgress : () => {}
  const signal = input.signal
  if (!pool || typeof pool.withPage !== 'function') throw fail('no_browser', 'no browser pool is available to probe the design')
  if (url.length === 0) throw fail('navigation', 'the design has no preview URL to probe')
  if (dir.length === 0) {
    const error = new Error('probeDesign needs a directory for its screenshots')
    error.code = 'invalid_input'
    throw error
  }

  await ensureDir(dir)
  const widths = normalizeViewports(Array.isArray(input.widths) && input.widths.length > 0 ? input.widths : undefined, kind)
  const pages = []
  let screens = []
  let usedScreens = false
  const health = { consoleErrors: [], failedRequests: [], pageErrors: [], screenshotsFailed: 0 }
  const allErrors = []
  const seenErrors = new Set()
  const mergeConsole = (list) => {
    for (const row of list) {
      const key = row.text
      if (seenErrors.has(key)) continue
      seenErrors.add(key)
      allErrors.push(row)
    }
  }

  abortIfNeeded(signal)
  await pool.withPage(async (page) => {
    const tracker = trackHealth(page)
    try {
      const detectionWidth = kind === 'deck' ? 1920 : widths[0]
      const detectionHeight = heightForWidth(detectionWidth)
      onProgress({ phase: 'navigation', width: detectionWidth, message: '打开设计预览' })
      await applyViewport(page, detectionWidth, detectionHeight)
      await navigate(page, url, signal)
      await settle(page, signal)
      await warmAndFreeze(page, signal)

      let deckScreens = []
      if (screensRequested) {
        deckScreens = await detectScreens(page)
        if (deckScreens.length === 0) {
          log('no [data-screen-label] screens were found; capturing regular viewports instead')
        }
      }
      if (deckScreens.length > 0) {
        usedScreens = true
        await applyViewport(page, 1920, 1080)
        await settle(page, signal)
        await warmAndFreeze(page, signal)
        screens = await captureScreenBuffers(page, {
          dir: dir,
          log: log,
          signal: signal,
          withMetrics: true,
          onProgress: onProgress,
        })
        health.screenshotsFailed += Math.max(0, deckScreens.length - screens.length)
      } else {
        for (const width of widths) {
          abortIfNeeded(signal)
          const pageStarted = Date.now()
          const height = heightForWidth(width)
          onProgress({ phase: 'viewport', width: width, message: '捕获 ' + width + ' px' })
          await applyViewport(page, width, height)
          await navigate(page, url, signal)
          await settle(page, signal)
          await warmAndFreeze(page, signal)
          const shot = await captureFullPage(page, { width: width, viewportHeight: height, log: log })
          if (!shot.fullPage) health.screenshotsFailed += 1
          const screenshot = 'capture-' + width + '.png'
          await writeFile(join(dir, screenshot), shot.data)
          const minBodyPx = kind === 'deck' ? 24 : kind === 'mobile' || width <= 480 ? 14 : 16
          onProgress({ phase: 'metrics', width: width, message: '读取 ' + width + ' px 样式' })
          const metrics = await collectMetrics(page, { minBodyPx: minBodyPx, scopeIndex: -1, maxElements: 6000, maxText: 4000 })
          mergeFailures(health, page)
          mergeConsole(tracker.consoleErrors)
          fillRender(metrics, health, page)
          pages.push({
            width: width,
            height: height,
            screenshot: screenshot,
            metrics: metrics,
            docWidth: shot.docWidth,
            docHeight: shot.docHeight,
            fullPage: shot.fullPage,
            durationMs: Date.now() - pageStarted,
          })
        }
      }
      mergeFailures(health, page)
      mergeConsole(tracker.consoleErrors)
    } finally {
      try {
        tracker.unsubscribe()
      } catch {
        /* already gone */
      }
    }
  })

  // Re-fill render counts after all pages were merged.
  for (const page of pages) fillRender(page.metrics, health, null)
  for (const screen of screens) if (screen.metrics) fillRender(screen.metrics, health, null)
  if (pages.length === 0 && screens.length === 0) throw fail('failed', 'the probe produced neither pages nor screens')
  health.consoleErrors = allErrors.slice(0, 40)
  health.failedRequests = health.failedRequests.slice(0, 40)
  health.screenshotsFailed = Number(health.screenshotsFailed) || 0

  return {
    ok: true,
    url: url,
    capturedAt: nowIso(),
    durationMs: Date.now() - started,
    pages: pages,
    screens: screens,
    health: health,
    screenshotsFailed: health.screenshotsFailed,
  }
}

/**
 * Photograph deck screens as in-memory PNG buffers (used by the PPTX exporter).
 * @param {{pool: object, url: string, signal?: AbortSignal, log?: Function}} input
 * @returns {Promise<{found: boolean, screens: Array<{label: string, index: number, width: number, height: number, png: Buffer}>}>}
 */
export async function captureSlidePngs(input = {}) {
  const pool = input.pool
  const url = typeof input.url === 'string' ? input.url : ''
  const log = typeof input.log === 'function' ? input.log : () => {}
  if (!pool || typeof pool.withPage !== 'function') throw fail('no_browser', 'no browser pool is available')
  if (!url) throw fail('navigation', 'no preview URL was given')
  let result = { found: false, screens: [] }
  await pool.withPage(async (page) => {
    await applyViewport(page, 1920, 1080)
    await navigate(page, url, input.signal)
    await settle(page, input.signal)
    await warmAndFreeze(page, input.signal)
    const infos = await detectScreens(page)
    if (infos.length === 0) return
    result.found = true
    const captures = await captureScreenBuffers(page, { log: log, signal: input.signal, withMetrics: false })
    result.screens = captures
  })
  return result
}

/**
 * Photograph each requested viewport as an in-memory PNG buffer (used by the PPTX exporter).
 * @param {{pool: object, url: string, viewports: number[], signal?: AbortSignal, log?: Function}} input
 * @returns {Promise<Array<{width: number, height: number, png: Buffer}>>}
 */
export async function captureViewportPngs(input = {}) {
  const pool = input.pool
  const url = typeof input.url === 'string' ? input.url : ''
  const log = typeof input.log === 'function' ? input.log : () => {}
  if (!pool || typeof pool.withPage !== 'function') throw fail('no_browser', 'no browser pool is available')
  if (!url) throw fail('navigation', 'no preview URL was given')
  const widths = normalizeViewports(Array.isArray(input.viewports) ? input.viewports : undefined, input.kind || 'web')
  const out = []
  await pool.withPage(async (page) => {
    for (const width of widths) {
      abortIfNeeded(input.signal)
      const height = heightForWidth(width)
      await applyViewport(page, width, height)
      await navigate(page, url, input.signal)
      await settle(page, input.signal)
      await warmAndFreeze(page, input.signal)
      const shot = await captureFullPage(page, { width: width, viewportHeight: height, log: log })
      out.push({ width: shot.width, height: shot.height, png: shot.data })
    }
  })
  return out
}
