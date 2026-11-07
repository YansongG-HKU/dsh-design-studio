/**
 * dsh-design-studio — design tokens: normalise, extract, measure, compare.
 *
 * A design system enters the studio through one of five doors (manual JSON, a
 * CSS/JS codebase, a live URL, an image, a preset). Every door ends in the same
 * frozen token schema (CONTRACT §3), so the audit, the panel and the agent can
 * reason about one shape no matter where the evidence came from.
 *
 * The extraction functions are heuristic on purpose: they scan CSS-like text and
 * classify custom properties / literals into roles (bg, surface, ink, muted,
 * accent, border; display/body/mono fonts; size/space/radius scales). When a role
 * cannot be proven the field stays empty instead of being invented, and
 * `compareToSystem` only checks dimensions that actually carry data.
 *
 * Public API (CONTRACT §3):
 *   normalizeTokens(raw), emptyTokens()
 *   tokensFromCssText(cssText), tokensFromFiles(files), scanRepo(rootDir, {maxFiles})
 *   tokensFromUrl({pool, url}), tokensFromImageBuffer(buffer), tokensFromImageFile({pool, path})
 *   tokenUsage(metrics), compareToSystem(usage, tokens)
 *
 * Pure Node, no third-party imports.
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, isAbsolute, join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { LIMITS, heightForWidth } from './config.js'
import { decodePng, pngSize } from './png.js'
import { hexOf, isPlainObject, messageOf, nowIso, rgbaOf } from './util.js'

/** File extensions the repository scanner reads (CONTRACT §3). */
const SCAN_EXTENSIONS = new Set(['.css', '.scss', '.sass', '.less', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.mts', '.cts', '.html', '.htm'])
/** Directory names the scanner never descends into. */
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'vendor', '.next', '.nuxt', 'coverage', '.turbo', '.cache'])
/** Per-file text budget for the scanner (256 KiB). */
const MAX_SCAN_FILE_BYTES = 256 * 1024
/** Total text budget for one repository scan (6 MiB). */
const MAX_SCAN_TOTAL_BYTES = 6 * 1024 * 1024
/** Deepest directory level the scanner walks. */
const MAX_SCAN_DEPTH = 8
/** Colour roles in display order. */
const COLOR_ROLES = Object.freeze(['bg', 'surface', 'ink', 'muted', 'accent', 'border'])
/** Font roles in display order. */
const FONT_ROLES = Object.freeze(['display', 'body', 'mono'])
/** Values at or above this radius are treated as the pill token. */
const PILL_RADIUS = 100
/** Tolerance used by compareToSystem (px). */
const PX_TOLERANCE = 1
/** RGB euclidean distance tolerance for "near-equal" colours. */
const COLOR_TOLERANCE = 12
/** Bound on violation rows returned. */
const MAX_VIOLATIONS = 20

/**
 * A fresh token object with the frozen field order and empty values.
 * @returns {object}
 */
export function emptyTokens() {
  return {
    name: '',
    source: { kind: 'manual', ref: '', at: '' },
    color: { bg: '', surface: '', ink: '', muted: '', accent: '', border: '', extra: [] },
    font: {
      display: { family: '', stack: '', weights: [] },
      body: { family: '', stack: '', weights: [] },
      mono: { family: '', stack: '', weights: [] },
    },
    size: { scale: [] },
    space: { scale: [] },
    radius: { scale: [] },
    layout: { maxWidth: 0, gutter: 0, breakpoints: [] },
    notes: '',
  }
}

/* -------------------------------------------------------------------------- */
/* normalisation                                                              */
/* -------------------------------------------------------------------------- */

/** Trim, collapse whitespace and cap a string. */
function cleanString(value, maxLength) {
  if (typeof value !== 'string') return ''
  const text = value.replace(/\s+/gu, ' ').trim()
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

/** Clamp a numeric token value; non-finite input yields the fallback. */
function cleanNumber(value, min, max, fallback = 0) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number * 100) / 100))
}

/** Normalise a CSS colour to lowercase `#rrggbb`, or '' when unparseable. */
function cleanColor(value) {
  if (typeof value !== 'string') return ''
  const rgba = rgbaOf(value)
  if (!rgba) return ''
  if (rgba.a === 0) return ''
  return hexOf(rgba)
}

/** Normalise a numeric scale: finite, clamped, de-duplicated, ascending, bounded. */
function cleanScale(value, min, max, limit = 20) {
  const source = Array.isArray(value) ? value : []
  const seen = new Set()
  const out = []
  for (const item of source) {
    const number = Number(item)
    if (!Number.isFinite(number)) continue
    const rounded = Math.round(number * 100) / 100
    if (rounded < min || rounded > max || seen.has(rounded)) continue
    seen.add(rounded)
    out.push(rounded)
    if (out.length >= limit * 2) break
  }
  out.sort((a, b) => a - b)
  return out.slice(0, limit)
}

/** Normalise a font weight list (100..900, step 100). */
function cleanWeights(value) {
  const source = Array.isArray(value) ? value : []
  const seen = new Set()
  const out = []
  for (const item of source) {
    const number = Math.round(Number(item) / 100) * 100
    if (!Number.isFinite(number) || number < 100 || number > 900 || seen.has(number)) continue
    seen.add(number)
    out.push(number)
  }
  out.sort((a, b) => a - b)
  return out.slice(0, 6)
}

/** First family of a CSS font stack, cleaned. */
function primaryFamily(stack) {
  const first = String(stack ?? '').split(',')[0].trim().replace(/^["']|["']$/gu, '')
  return first.replace(/^_+/u, '').split('_')[0] || first
}

/** Normalise one font role. */
function cleanFont(raw) {
  const font = isPlainObject(raw) ? raw : {}
  let stack = cleanString(font.stack, 160)
  let family = cleanString(font.family, 80)
  if (!stack && family) stack = family
  if (!family && stack) family = primaryFamily(stack)
  return { family, stack, weights: cleanWeights(font.weights) }
}

/**
 * Normalise arbitrary token input into the frozen token schema.
 * Accepts a partial object; unknown keys are dropped and every value is bounded.
 * A wrapper object `{ tokens: {...} }` is unwrapped defensively.
 * @param {unknown} raw
 * @returns {object}
 */
export function normalizeTokens(raw) {
  let input = isPlainObject(raw) ? raw : {}
  if (isPlainObject(input.tokens) && !isPlainObject(input.color) && !isPlainObject(input.font) && !isPlainObject(input.size)) {
    input = input.tokens
  }
  const tokens = emptyTokens()
  tokens.name = cleanString(input.name, 60)

  const source = isPlainObject(input.source) ? input.source : {}
  const kinds = new Set(['manual', 'url', 'repo', 'image', 'preset'])
  tokens.source = {
    kind: kinds.has(source.kind) ? source.kind : 'manual',
    ref: cleanString(source.ref, 300),
    at: typeof source.at === 'string' && source.at.length <= 40 ? source.at.trim() : '',
  }

  const color = isPlainObject(input.color) ? input.color : {}
  for (const role of COLOR_ROLES) tokens.color[role] = cleanColor(color[role])
  const extra = Array.isArray(color.extra) ? color.extra : []
  const extraSeen = new Set()
  for (const item of extra) {
    const hex = cleanColor(item)
    if (!hex || extraSeen.has(hex) || tokens.color[extra] === hex) continue
    extraSeen.add(hex)
    tokens.color.extra.push(hex)
    if (tokens.color.extra.length >= 12) break
  }

  const font = isPlainObject(input.font) ? input.font : {}
  for (const role of FONT_ROLES) tokens.font[role] = cleanFont(font[role])

  tokens.size.scale = cleanScale(isPlainObject(input.size) ? input.size.scale : [], 6, 240, 20)
  tokens.space.scale = cleanScale(isPlainObject(input.space) ? input.space.scale : [], 0, 400, 20)
  tokens.radius.scale = cleanScale(isPlainObject(input.radius) ? input.radius.scale : [], 0, 999, 16)

  const layout = isPlainObject(input.layout) ? input.layout : {}
  tokens.layout = {
    maxWidth: cleanNumber(layout.maxWidth, 0, 4000, 0),
    gutter: cleanNumber(layout.gutter, 0, 200, 0),
    breakpoints: cleanScale(layout.breakpoints, 0, 3840, 8),
  }
  tokens.notes = cleanString(input.notes, 600)
  return tokens
}

/* -------------------------------------------------------------------------- */
/* CSS-like analysis                                                          */
/* -------------------------------------------------------------------------- */

/** Create one empty analysis accumulator. */
function emptyAnalysis() {
  const roles = {}
  for (const role of COLOR_ROLES) roles[role] = new Map()
  return {
    colors: new Map(),
    roles,
    fonts: { display: new Map(), body: new Map(), mono: new Map(), all: new Map() },
    sizes: new Map(),
    spaces: new Map(),
    radii: new Map(),
    breakpoints: new Set(),
    maxWidths: new Map(),
    gutters: new Map(),
  }
}

/** Merge `from` into `to` in place. */
function mergeAnalysis(to, from) {
  const addMap = (target, source) => {
    for (const [key, count] of source.entries()) target.set(key, (target.get(key) ?? 0) + count)
  }
  addMap(to.colors, from.colors)
  for (const role of COLOR_ROLES) addMap(to.roles[role], from.roles[role])
  for (const role of Object.keys(to.fonts)) addMap(to.fonts[role], from.fonts[role])
  addMap(to.sizes, from.sizes)
  addMap(to.spaces, from.spaces)
  addMap(to.radii, from.radii)
  addMap(to.maxWidths, from.maxWidths)
  addMap(to.gutters, from.gutters)
  for (const value of from.breakpoints) to.breakpoints.add(value)
  return to
}

/** Increment a counter map. */
function bump(map, key, amount = 1) {
  if (key === '' || key === null || key === undefined) return
  map.set(key, (map.get(key) ?? 0) + amount)
}

/** Classify a custom-property name into a colour role ('' = none). */
function colorRoleForName(name) {
  const text = name.toLowerCase().replace(/^--/u, '')
  if (/(^|[-_])(bg|background|canvas|page|paper)([-_]|$)/u.test(text)) return 'bg'
  if (/(surface|card|elevated|panel|sheet)/u.test(text)) return 'surface'
  if (/(^|[-_])(ink|text|foreground|fg|content|body)([-_]|$)/u.test(text)) return 'ink'
  if (/(muted|secondary|subtle|dim|quiet|tertiary|placeholder)/u.test(text)) return 'muted'
  if (/(accent|primary|brand|link|action|highlight|focus)/u.test(text)) return 'accent'
  if (/(border|line|rule|divider|stroke|outline|edge)/u.test(text)) return 'border'
  if (/(color|colour|tint|swatch|palette)/u.test(text)) return 'extra'
  return ''
}

/** Classify a custom-property name into a font role ('' = none). */
function fontRoleForName(name) {
  const text = name.toLowerCase().replace(/^--/u, '')
  if (!/(font|typeface|family|stack)/u.test(text)) return ''
  if (/(mono|code)/u.test(text)) return 'mono'
  if (/(display|heading|title|hero|serif)/u.test(text)) return 'display'
  if (/(body|base|text|sans|paragraph)/u.test(text)) return 'body'
  return ''
}

/** Classify a custom-property name into a scale role ('' = none). */
function scaleRoleForName(name) {
  const text = name.toLowerCase().replace(/^--/u, '')
  if (/(radius|rounded|corner)/u.test(text)) return 'radii'
  if (/(space|spacing|gap|pad|margin|gutter|inset)/u.test(text)) return 'spaces'
  if (/(^|[-_])(size|font-size|text-size|type|step|scale)([-_]|$)/u.test(text)) return 'sizes'
  return ''
}

/** Relative luminance of an `{r,g,b}` colour (0..1). */
function luminanceOf(rgb) {
  const channel = (value) => {
    const v = value / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

/** HSL saturation-ish score (0..1) used to pick an accent from literals. */
function chromaOf(rgb) {
  const max = Math.max(rgb.r, rgb.g, rgb.b)
  const min = Math.min(rgb.r, rgb.g, rgb.b)
  if (max === 0) return 0
  return (max - min) / max
}

/**
 * Derive colour roles from a literal frequency map when no role evidence exists
 * at all. Heuristic: lightest = bg, darkest = ink, most chromatic = accent,
 * a light low-chroma value = border. Runs only when every role is empty, so it
 * can never overwrite a named token.
 */
function deriveColorRoles(analysis) {
  if (COLOR_ROLES.some((role) => analysis.roles[role].size > 0)) return
  const ranked = [...analysis.colors.entries()]
    .map(([hex, count]) => ({ hex, count, rgb: rgbaOf(hex) }))
    .filter((entry) => entry.rgb !== null)
    .sort((a, b) => b.count - a.count || a.hex.localeCompare(b.hex))
    .slice(0, 12)
  if (ranked.length === 0) return
  const byLuminance = [...ranked].sort((a, b) => luminanceOf(b.rgb) - luminanceOf(a.rgb))
  if (analysis.roles.bg.size === 0 && byLuminance.length > 0) bump(analysis.roles.bg, byLuminance[0].hex, byLuminance[0].count)
  if (analysis.roles.ink.size === 0 && byLuminance.length > 1) bump(analysis.roles.ink, byLuminance[byLuminance.length - 1].hex, byLuminance[byLuminance.length - 1].count)
  if (analysis.roles.accent.size === 0) {
    const chromatic = [...ranked].filter((entry) => chromaOf(entry.rgb) >= 0.25 && luminanceOf(entry.rgb) > 0.05 && luminanceOf(entry.rgb) < 0.85)
    const pick = chromatic.sort((a, b) => chromaOf(b.rgb) - chromaOf(a.rgb) || b.count - a.count)[0]
    if (pick) bump(analysis.roles.accent, pick.hex, pick.count)
  }
  if (analysis.roles.muted.size === 0 && byLuminance.length > 2) {
    const middle = byLuminance[byLuminance.length - 2]
    if (middle && middle.hex !== byLuminance[0].hex && middle.hex !== byLuminance[byLuminance.length - 1].hex) bump(analysis.roles.muted, middle.hex, middle.count)
  }
  if (analysis.roles.surface.size === 0 && byLuminance.length > 1) {
    const bgLum = luminanceOf(byLuminance[0].rgb)
    const near = byLuminance.find((entry, index) => index > 0 && entry.hex !== byLuminance[0].hex && Math.abs(luminanceOf(entry.rgb) - bgLum) < 0.12)
    if (near) bump(analysis.roles.surface, near.hex, near.count)
  }
  if (analysis.roles.border.size === 0) {
    const line = ranked.find((entry) => chromaOf(entry.rgb) < 0.14 && luminanceOf(entry.rgb) > 0.55 && luminanceOf(entry.rgb) < 0.95)
    if (line && line.hex !== byLuminance[0].hex) bump(analysis.roles.border, line.hex, line.count)
  }
}

/** Scan CSS-like text into an analysis accumulator. */
function analyzeCssText(cssText) {
  const analysis = emptyAnalysis()
  if (typeof cssText !== 'string' || cssText.length === 0) return analysis
  const text = cssText.length > 512 * 1024 ? cssText.slice(0, 512 * 1024) : cssText

  // 1. Custom properties: the strongest evidence for a real design system.
  const customPattern = /(--[a-z0-9_-]+)\s*:\s*([^;{}]+);/giu
  let custom = customPattern.exec(text)
  let guard = 0
  while (custom && guard < 4000) {
    guard += 1
    const name = custom[1]
    const value = custom[2].trim()
    const role = colorRoleForName(name)
    const hex = role ? cleanColor(value) : ''
    if (hex) {
      if (role === 'extra') bump(analysis.colors, hex)
      else bump(analysis.roles[role], hex)
      bump(analysis.colors, hex, 1)
    }
    const fontRole = fontRoleForName(name)
    if (fontRole && /^[^:]*[a-z]/iu.test(value) && !/^[-\d.]/u.test(value)) {
      const stack = value.replace(/[;!].*$/u, '').trim()
      if (stack && stack.length <= 160) bump(analysis.fonts[fontRole], stack)
      if (stack) bump(analysis.fonts.all, stack)
    }
    const scaleRole = scaleRoleForName(name)
    if (scaleRole) {
      const numbers = value.match(/-?\d+(?:\.\d+)?/gu)
      if (numbers) {
        for (const raw of numbers) {
          const number = Number(raw)
          if (!Number.isFinite(number)) continue
          if (scaleRole === 'radii' && number >= 0 && number <= 999) bump(analysis.radii, String(Math.round(number)))
          else if (scaleRole === 'spaces' && number > 0 && number <= 400) bump(analysis.spaces, String(Math.round(number)))
          else if (scaleRole === 'sizes' && number >= 6 && number <= 240) bump(analysis.sizes, String(Math.round(number)))
        }
      }
    }
    custom = customPattern.exec(text)
  }

  // 2. Colour literals anywhere (also covers CSS-in-JS strings).
  const colorPattern = /#(?:[0-9a-f]{3,8})\b|rgba?\([^)]*\)|hsla?\([^)]*\)/giu
  let colorMatch = colorPattern.exec(text)
  let colorGuard = 0
  while (colorMatch && colorGuard < 12000) {
    colorGuard += 1
    const hex = cleanColor(colorMatch[0])
    if (hex) bump(analysis.colors, hex)
    colorMatch = colorPattern.exec(text)
  }

  // 3. Declaration blocks: font-family / font-size / spacing / radius.
  const blockPattern = /([^{}]{0,240})\{([^{}]*)\}/gu
  let block = blockPattern.exec(text)
  let blockGuard = 0
  while (block && blockGuard < 4000) {
    blockGuard += 1
    const selector = block[1].toLowerCase().slice(0, 240)
    const body = block[2]
    const selectorRole = /(^|[,\s])(body|html|:root)\b/u.test(selector)
      ? 'page'
      : /(surface|card|panel|sheet|elevated)/u.test(selector)
        ? 'surface'
        : /(accent|primary|brand|button|btn|link|cta|action)/u.test(selector)
          ? 'accent'
          : /(muted|secondary|subtle|caption|meta)/u.test(selector)
            ? 'muted'
            : /(border|rule|divider|line)/u.test(selector)
              ? 'border'
              : ''
    const backgroundDeclaration = /(?:^|[;\s])background(?:-color)?\s*:\s*([^;!}]+)/iu.exec(body)
    if (backgroundDeclaration) {
      for (const match of backgroundDeclaration[1].matchAll(/#(?:[0-9a-f]{3,8})\b|rgba?\([^)]*\)|hsla?\([^)]*\)/giu)) {
        const hex = cleanColor(match[0])
        if (!hex) continue
        bump(analysis.colors, hex)
        if (selectorRole === 'page') bump(analysis.roles.bg, hex)
        else if (selectorRole === 'surface') bump(analysis.roles.surface, hex)
        else if (selectorRole === 'accent') bump(analysis.roles.accent, hex)
        else if (selectorRole === 'muted') bump(analysis.roles.muted, hex)
        else if (selectorRole === 'border') bump(analysis.roles.border, hex)
      }
    }
    const textDeclaration = /(?:^|[;\s])color\s*:\s*([^;!}]+)/iu.exec(body)
    if (textDeclaration) {
      for (const match of textDeclaration[1].matchAll(/#(?:[0-9a-f]{3,8})\b|rgba?\([^)]*\)|hsla?\([^)]*\)/giu)) {
        const hex = cleanColor(match[0])
        if (!hex) continue
        bump(analysis.colors, hex)
        if (selectorRole === 'page') bump(analysis.roles.ink, hex)
        else if (selectorRole === 'accent') bump(analysis.roles.accent, hex)
        else if (selectorRole === 'muted') bump(analysis.roles.muted, hex)
      }
    }
    const borderDeclaration = /(?:^|[;\s])border(?:-color|-top|-right|-bottom|-left)?\s*:\s*([^;!}]+)/iu.exec(body)
    if (borderDeclaration) {
      for (const match of borderDeclaration[1].matchAll(/#(?:[0-9a-f]{3,8})\b|rgba?\([^)]*\)/giu)) {
        const hex = cleanColor(match[0])
        if (hex) {
          bump(analysis.colors, hex)
          bump(analysis.roles.border, hex)
        }
      }
    }
    const familyMatch = /font-family\s*:\s*([^;!}]+)/iu.exec(body)
    if (familyMatch) {
      const stack = familyMatch[1].trim().slice(0, 160)
      bump(analysis.fonts.all, stack)
      if (/h1|h2|h3|heading|title|display|hero|masthead/u.test(selector)) bump(analysis.fonts.display, stack)
      else if (/mono|code|pre\b/u.test(selector)) bump(analysis.fonts.mono, stack)
      else if (/body|html|:root|\bp\b|\.text|\.copy|\.prose/u.test(selector)) bump(analysis.fonts.body, stack)
      if (/mono|courier|consolas|menlo|jetbrains|cascadia|monospace/u.test(stack.toLowerCase())) bump(analysis.fonts.mono, stack)
    }
    const sizePattern = /font-size\s*:\s*([^;!}]+)/giu
    let sizeMatch = sizePattern.exec(body)
    while (sizeMatch) {
      for (const value of sizeMatch[1].matchAll(/(-?\d+(?:\.\d+)?)(px|rem|em|pt)?/gu)) {
        let number = Number(value[1])
        if (!Number.isFinite(number)) continue
        const unit = value[2] || 'px'
        if (unit === 'rem' || unit === 'em') number *= 16
        else if (unit === 'pt') number *= 4 / 3
        number = Math.round(number)
        if (number >= 6 && number <= 240) bump(analysis.sizes, String(number))
      }
      sizeMatch = sizePattern.exec(body)
    }
    const radiusPattern = /border-radius\s*:\s*([^;!}]+)/giu
    let radiusMatch = radiusPattern.exec(body)
    while (radiusMatch) {
      for (const value of radiusMatch[1].matchAll(/(-?\d+(?:\.\d+)?)(px|rem|em|%)?/gu)) {
        let number = Number(value[1])
        if (!Number.isFinite(number)) continue
        const unit = value[2] || ''
        if (unit === 'rem' || unit === 'em') number *= 16
        if (unit === '%' || number >= PILL_RADIUS) number = 999
        number = Math.round(number)
        if (number >= 0 && number <= 999) bump(analysis.radii, String(number))
      }
      radiusMatch = radiusPattern.exec(body)
    }
    const spacePattern = /(padding|margin|gap|row-gap|column-gap)\s*:\s*([^;!}]+)/giu
    let spaceMatch = spacePattern.exec(body)
    while (spaceMatch) {
      const isGutter = /padding/u.test(spaceMatch[1].toLowerCase()) && /gutter|container|wrapper|page|main/u.test(selector)
      for (const value of spaceMatch[2].matchAll(/(-?\d+(?:\.\d+)?)(px|rem|em)?/gu)) {
        let number = Number(value[1])
        if (!Number.isFinite(number)) continue
        const unit = value[2] || 'px'
        if (unit === 'rem' || unit === 'em') number *= 16
        number = Math.round(number)
        if (number > 0 && number <= 400) bump(analysis.spaces, String(number))
        if (isGutter && number > 0 && number <= 200) bump(analysis.gutters, String(number))
      }
      spaceMatch = spacePattern.exec(body)
    }
    const widthMatch = /(max-width|width)\s*:\s*([^;!}]+)/iu.exec(body)
    if (widthMatch && /container|wrapper|page|main|shell|content/u.test(selector)) {
      const pxValue = /(\d+(?:\.\d+)?)px/u.exec(widthMatch[2])
      if (pxValue) bump(analysis.maxWidths, String(Math.round(Number(pxValue[1]))))
    }
    block = blockPattern.exec(text)
  }

  // 4. Breakpoints from media queries.
  const mediaPattern = /@media[^{]*\{/giu
  let mediaMatch = mediaPattern.exec(text)
  let mediaGuard = 0
  while (mediaMatch && mediaGuard < 2000) {
    mediaGuard += 1
    const widths = /(?:min|max)-width\s*:\s*(\d+(?:\.\d+)?)px/giu
    let widthMatch = widths.exec(mediaMatch[0])
    while (widthMatch) {
      const width = Math.round(Number(widthMatch[1]))
      if (width > 0 && width <= 3840) analysis.breakpoints.add(width)
      widthMatch = widths.exec(mediaMatch[0])
    }
    mediaMatch = mediaPattern.exec(text)
  }

  deriveColorRoles(analysis)
  return analysis
}

/** Quote-aware list of the font stacks in a JS/Tailwind value. */
function stacksInValue(value) {
  const stacks = []
  const pattern = /(['"])([^'"]+)\1/gu
  let match = pattern.exec(value)
  while (match) {
    const stack = match[2].trim()
    if (stack.length > 0 && stack.length <= 160) stacks.push(stack)
    match = pattern.exec(value)
  }
  return stacks
}

/** Extract one `key: { ... }` object body from a config file (one level deep). */
function objectBodyFor(text, key) {
  const pattern = new RegExp(key + '\\s*:\\s*\\{', 'i')
  const match = pattern.exec(text)
  if (!match) return ''
  let depth = 1
  let index = match.index + match[0].length
  const start = index
  while (index < text.length && depth > 0) {
    const char = text[index]
    if (char === '{') depth += 1
    else if (char === '}') depth -= 1
    index += 1
  }
  return depth === 0 ? text.slice(start, index - 1) : text.slice(start)
}

/** Parse numeric px/rem values out of a tailwind scale entry. */
function tailwindNumbers(value) {
  const out = []
  for (const match of value.matchAll(/(-?\d+(?:\.\d+)?)(px|rem|em)?/gu)) {
    let number = Number(match[1])
    if (!Number.isFinite(number)) continue
    const unit = match[2] || ''
    if (unit === 'rem' || unit === 'em') number *= 16
    number = Math.round(number * 100) / 100
    out.push(number)
  }
  return out
}

/** Analyse a `tailwind.config.{js,ts,cjs,mjs}` file into the shared accumulator. */
function analyzeTailwind(text) {
  const analysis = emptyAnalysis()
  if (typeof text !== 'string' || text.length === 0) return analysis

  const colorsBody = objectBodyFor(text, 'colors')
  if (colorsBody) {
    const entry = /([a-zA-Z][\w-]*)\s*:\s*(['"])(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))\2/gu
    let match = entry.exec(colorsBody)
    while (match) {
      const key = match[1].toLowerCase()
      const hex = cleanColor(match[3])
      if (hex) {
        bump(analysis.colors, hex)
        if (/(bg|background|surface|paper|canvas)/u.test(key)) bump(analysis.roles.bg, hex)
        else if (/(ink|text|foreground|fg)/u.test(key)) bump(analysis.roles.ink, hex)
        else if (/(muted|secondary|subtle)/u.test(key)) bump(analysis.roles.muted, hex)
        else if (/(accent|primary|brand|link)/u.test(key)) bump(analysis.roles.accent, hex)
        else if (/(border|line|rule|divider)/u.test(key)) bump(analysis.roles.border, hex)
        else bump(analysis.colors, hex)
      }
      match = entry.exec(colorsBody)
    }
  }

  const fontBody = objectBodyFor(text, 'fontFamily')
  if (fontBody) {
    const entry = /([a-zA-Z][\w-]*)\s*:\s*(\[[^\]]*\]|['"][^'"]*['"])/gu
    let match = entry.exec(fontBody)
    while (match) {
      const key = match[1].toLowerCase()
      const stacks = stacksInValue(match[2])
      for (const stack of stacks) {
        bump(analysis.fonts.all, stack)
        if (/mono|code/u.test(key)) bump(analysis.fonts.mono, stack)
        else if (/(display|heading|title|serif|hero)/u.test(key)) bump(analysis.fonts.display, stack)
        else if (/(body|base|sans|text)/u.test(key)) bump(analysis.fonts.body, stack)
      }
      match = entry.exec(fontBody)
    }
  }

  const sizeBody = objectBodyFor(text, 'fontSize')
  if (sizeBody) {
    const entry = /([a-zA-Z][\w-]*)\s*:\s*(\[[^[]*|['"][^'"]*['"])/gu
    let match = entry.exec(sizeBody)
    while (match) {
      for (const number of tailwindNumbers(match[2])) {
        if (number >= 6 && number <= 240) bump(analysis.sizes, String(Math.round(number)))
      }
      match = entry.exec(sizeBody)
    }
  }

  const spaceBody = objectBodyFor(text, 'spacing')
  if (spaceBody) {
    const entry = /([a-zA-Z0-9][\w-]*)\s*:\s*(['"]?[^,}]+)/gu
    let match = entry.exec(spaceBody)
    while (match) {
      for (const number of tailwindNumbers(match[2])) {
        if (number > 0 && number <= 400) bump(analysis.spaces, String(Math.round(number)))
      }
      match = entry.exec(spaceBody)
    }
  }

  const radiusBody = objectBodyFor(text, 'borderRadius')
  if (radiusBody) {
    const entry = /([a-zA-Z0-9][\w-]*)\s*:\s*(['"]?[^,}]+)/gu
    let match = entry.exec(radiusBody)
    while (match) {
      for (const number of tailwindNumbers(match[2])) {
        if (number >= 0 && number <= 999) bump(analysis.radii, String(Math.round(number)))
      }
      match = entry.exec(radiusBody)
    }
  }

  const screensBody = objectBodyFor(text, 'screens')
  if (screensBody) {
    const widths = /(\d+(?:\.\d+)?)px/gu
    let match = widths.exec(screensBody)
    while (match) {
      const width = Math.round(Number(match[1]))
      if (width > 0 && width <= 3840) analysis.breakpoints.add(width)
      match = widths.exec(screensBody)
    }
  }

  // Palette literals too, so a config that only lists raw colours still yields a palette.
  const colorPattern = /#(?:[0-9a-f]{3,8})\b|rgba?\([^)]*\)/giu
  let colorMatch = colorPattern.exec(text)
  let guard = 0
  while (colorMatch && guard < 4000) {
    guard += 1
    const hex = cleanColor(colorMatch[0])
    if (hex) bump(analysis.colors, hex)
    colorMatch = colorPattern.exec(text)
  }
  deriveColorRoles(analysis)
  return analysis
}

/** Top key of a counter map ('' when empty). */
function topKey(map) {
  let best = ''
  let bestCount = -1
  for (const [key, count] of map.entries()) {
    if (count > bestCount || (count === bestCount && key < best)) {
      best = key
      bestCount = count
    }
  }
  return best
}

/** Build a token object out of one merged analysis. */
function buildTokens(analysis, { name = '', source = {} } = {}) {
  const tokens = emptyTokens()
  tokens.name = cleanString(name, 60)
  tokens.source = {
    kind: source.kind ?? 'manual',
    ref: cleanString(source.ref, 300),
    at: typeof source.at === 'string' ? source.at : '',
  }

  const colorSeen = new Set()
  for (const role of COLOR_ROLES) {
    const hex = topKey(analysis.roles[role])
    if (hex) {
      tokens.color[role] = hex
      colorSeen.add(hex)
    }
  }
  const extras = [...analysis.colors.entries()]
    .map(([hex, count]) => ({ hex, count, rgb: rgbaOf(hex) }))
    .filter((entry) => entry.rgb && !colorSeen.has(entry.hex))
    .sort((a, b) => b.count - a.count || a.hex.localeCompare(b.hex))
    .slice(0, 12)
  tokens.color.extra = extras.map((entry) => entry.hex)

  for (const role of FONT_ROLES) {
    const stack = topKey(analysis.fonts[role])
    if (stack) tokens.font[role] = { family: primaryFamily(stack), stack: cleanString(stack, 160), weights: [] }
  }
  if (!tokens.font.body.family) {
    const stack = topKey(analysis.fonts.all)
    if (stack) tokens.font.body = { family: primaryFamily(stack), stack: cleanString(stack, 160), weights: [] }
  }
  if (!tokens.font.display.family && tokens.font.body.family) {
    const displayStack = [...analysis.fonts.display.entries()].sort((a, b) => b[1] - a[1])[0]
    if (displayStack) tokens.font.display = { family: primaryFamily(displayStack[0]), stack: cleanString(displayStack[0], 160), weights: [] }
  }
  if (!tokens.font.mono.family) {
    const monoStack = [...analysis.fonts.mono.entries()].sort((a, b) => b[1] - a[1])[0]
    if (monoStack) tokens.font.mono = { family: primaryFamily(monoStack[0]), stack: cleanString(monoStack[0], 160), weights: [] }
  }

  const sizes = [...analysis.sizes.keys()].map(Number).filter((n) => Number.isFinite(n) && n >= 6 && n <= 240).sort((a, b) => a - b)
  tokens.size.scale = cleanScale(sizes, 6, 240, 20)
  const spaces = [...analysis.spaces.keys()].map(Number).filter((n) => Number.isFinite(n) && n > 0 && n <= 400).sort((a, b) => a - b)
  tokens.space.scale = cleanScale(spaces, 0, 400, 20)
  const radii = [...analysis.radii.keys()].map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n <= 999).sort((a, b) => a - b)
  tokens.radius.scale = cleanScale(radii, 0, 999, 16)
  tokens.layout.breakpoints = cleanScale([...analysis.breakpoints], 0, 3840, 8)
  tokens.layout.maxWidth = cleanNumber(topKey(analysis.maxWidths), 0, 4000, 0)
  tokens.layout.gutter = cleanNumber(topKey(analysis.gutters), 0, 200, 0)
  return tokens
}

/* -------------------------------------------------------------------------- */
/* tokensFromCssText / tokensFromFiles                                        */
/* -------------------------------------------------------------------------- */

/**
 * Extract tokens from one CSS (or CSS-like) text.
 * @param {string} cssText
 * @returns {object} normalised tokens
 */
export function tokensFromCssText(cssText) {
  const analysis = analyzeCssText(typeof cssText === 'string' ? cssText : '')
  return buildTokens(analysis, { source: { kind: 'manual', ref: 'css', at: '' } })
}

/** Extract `<style>` blocks from an HTML document. */
function styleBlocksOf(html) {
  const blocks = []
  const pattern = /<style[^>]*>([\s\S]*?)<\/style>/giu
  let match = pattern.exec(html)
  while (match) {
    blocks.push(match[1])
    match = pattern.exec(html)
    if (blocks.length >= 40) break
  }
  return blocks.join('\n')
}

/**
 * Extract tokens from a list of `{ path, text }` files.
 * @param {Array<{path: string, text: string}>} files
 * @returns {object} normalised tokens
 */
export function tokensFromFiles(files) {
  const list = Array.isArray(files) ? files : []
  const merged = emptyAnalysis()
  const labels = []
  for (const file of list.slice(0, 400)) {
    if (!file || typeof file.text !== 'string') continue
    const path = typeof file.path === 'string' ? file.path : ''
    const name = basename(path || 'style').toLowerCase()
    const extension = name.includes('.') ? '.' + name.split('.').pop() : ''
    labels.push(path ? basename(path) : 'inline')
    let analysis = null
    if (name.startsWith('tailwind.config.')) analysis = analyzeTailwind(file.text)
    else if (extension === '.html' || extension === '.htm') analysis = analyzeCssText(styleBlocksOf(file.text))
    else if (['.css', '.scss', '.sass', '.less'].includes(extension)) analysis = analyzeCssText(file.text)
    else if (['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.mts', '.cts'].includes(extension)) analysis = analyzeCssText(file.text)
    if (analysis) mergeAnalysis(merged, analysis)
    if (labels.length >= 5) break
  }
  const ref = labels.length > 0 ? labels.join(', ').slice(0, 300) : 'files'
  return buildTokens(merged, { source: { kind: 'repo', ref, at: '' } })
}

/* -------------------------------------------------------------------------- */
/* scanRepo                                                                   */
/* -------------------------------------------------------------------------- */

/** Whether a directory entry should be skipped. */
function shouldSkipDirectory(name) {
  return name.startsWith('.') && name !== '.' || SKIPPED_DIRECTORIES.has(name)
}

/** Walk a repository (bounded) and return candidate files sorted by path. */
async function collectScanCandidates(rootDir, maxFiles) {
  const candidates = []
  const queue = [{ dir: rootDir, depth: 0 }]
  let visited = 0
  while (queue.length > 0 && visited < 6000 && candidates.length < maxFiles * 4) {
    const current = queue.shift()
    visited += 1
    let entries
    try {
      entries = await readdir(current.dir, { withFileTypes: true })
    } catch {
      continue
    }
    entries.sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const full = join(current.dir, entry.name)
      if (entry.isDirectory()) {
        if (shouldSkipDirectory(entry.name) || current.depth >= MAX_SCAN_DEPTH) continue
        queue.push({ dir: full, depth: current.depth + 1 })
        continue
      }
      if (!entry.isFile()) continue
      const lower = entry.name.toLowerCase()
      const extension = lower.includes('.') ? '.' + lower.split('.').pop() : ''
      const isTailwind = lower.startsWith('tailwind.config.')
      if (!isTailwind && !SCAN_EXTENSIONS.has(extension)) continue
      if (candidates.length >= maxFiles * 4) break
      candidates.push(full)
    }
  }
  candidates.sort((a, b) => a.localeCompare(b))
  return candidates
}

/**
 * Scan a repository or folder for design tokens.
 * Never throws: unreadable roots and files are reported in `errors`.
 * @param {string} rootDir
 * @param {{maxFiles?: number}} [options]
 * @returns {Promise<{tokens: object, files: string[], scanned: number, bytes: number, errors: string[], truncated: boolean}>}
 */
export async function scanRepo(rootDir, options = {}) {
  const maxFiles = Math.max(1, Math.min(LIMITS.maxRepoFiles, Number(options.maxFiles) || LIMITS.maxRepoFiles))
  const errors = []
  const absoluteRoot = typeof rootDir === 'string' && rootDir.trim().length > 0 ? rootDir.trim() : ''
  if (absoluteRoot.length === 0) {
    return { tokens: emptyTokens(), files: [], scanned: 0, bytes: 0, errors: ['no directory was given'], truncated: false }
  }
  let info = null
  try {
    info = await stat(absoluteRoot)
  } catch (error) {
    return { tokens: emptyTokens(), files: [], scanned: 0, bytes: 0, errors: ['the directory cannot be read: ' + messageOf(error)], truncated: false }
  }
  if (!info.isDirectory()) {
    return { tokens: emptyTokens(), files: [], scanned: 0, bytes: 0, errors: ['the path is not a directory'], truncated: false }
  }

  const candidates = await collectScanCandidates(absoluteRoot, maxFiles)
  const files = []
  const records = []
  let bytes = 0
  for (const path of candidates) {
    if (records.length >= maxFiles) break
    if (bytes >= MAX_SCAN_TOTAL_BYTES) break
    let fileInfo
    try {
      fileInfo = await stat(path)
    } catch {
      continue
    }
    if (!fileInfo.isFile() || fileInfo.size > MAX_SCAN_FILE_BYTES || fileInfo.size === 0) continue
    let text
    try {
      text = await readFile(path, 'utf8')
    } catch (error) {
      errors.push(basename(path) + ': ' + messageOf(error))
      continue
    }
    bytes += Buffer.byteLength(text, 'utf8')
    records.push({ path, text })
    files.push(relative(absoluteRoot, path).split(sep).join('/'))
  }

  const tokens = tokensFromFiles(records)
  if (tokens.source) tokens.source = { kind: 'repo', ref: cleanString(absoluteRoot, 300), at: nowIso() }
  return {
    tokens,
    files: files.slice(0, maxFiles),
    scanned: files.length,
    bytes,
    errors: errors.slice(0, 10),
    truncated: files.length >= maxFiles || bytes >= MAX_SCAN_TOTAL_BYTES,
  }
}

/* -------------------------------------------------------------------------- */
/* tokensFromUrl                                                              */
/* -------------------------------------------------------------------------- */

/** The in-page token extraction script (self-contained, side-effect free). */
const TOKEN_EXTRACT_SOURCE = String.raw`(() => {
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
    return { r: Math.round(parts[0]), g: Math.round(parts[1]), b: Math.round(parts[2]), a: parts.length > 3 && Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3])) : 1 }
  }
  const hexOf = (c) => { const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'); return '#' + h(c.r) + h(c.g) + h(c.b) }
  const visible = (element) => {
    if (!element || element.nodeType !== 1) return false
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }
  const primary = (stack) => { const first = String(stack || '').split(',')[0].trim().replace(/^["']|["']$/g, ''); return first || '' }
  const bump = (map, key, amount) => { if (!key) return; map[key] = (map[key] || 0) + (amount === undefined ? 1 : amount) }
  const bgCounts = {}
  const fgCounts = {}
  const borderCounts = {}
  const allColors = {}
  const fontMap = {}
  const sizes = {}
  const spaces = {}
  const radii = {}
  const custom = {}
  try {
    const rootStyle = getComputedStyle(document.documentElement)
    for (let i = 0; i < rootStyle.length && i < 400; i += 1) {
      const name = rootStyle[i]
      if (name.charAt(0) === '-' && name.charAt(1) === '-') custom[name] = String(rootStyle.getPropertyValue(name)).trim().slice(0, 120)
    }
  } catch (error) { /* custom properties are optional */ }
  const elements = Array.from(document.querySelectorAll('*')).slice(0, 4000)
  let total = 0
  for (const element of elements) {
    if (!visible(element)) continue
    total += 1
    const tag = element.tagName.toLowerCase()
    if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'template' || tag === 'title' || tag === 'meta' || tag === 'link') continue
    const style = getComputedStyle(element)
    const bg = parseColor(style.backgroundColor)
    if (bg && bg.a > 0) { const hex = hexOf(bg); bump(bgCounts, hex); bump(allColors, hex) }
    const fg = parseColor(style.color)
    if (fg && fg.a > 0) { const hex = hexOf(fg); bump(fgCounts, hex); bump(allColors, hex) }
    const border = parseColor(style.borderTopColor)
    const borderWidth = px(style.borderTopWidth)
    if (border && border.a > 0 && borderWidth > 0) { const hex = hexOf(border); bump(borderCounts, hex); bump(allColors, hex) }
    const family = primary(style.fontFamily)
    if (family) {
      const entry = fontMap[family] || { count: 0, heading: 0, weights: {}, sizes: {}, mono: /mono|courier|consolas|menlo|jetbrains|cascadia|code/i.test(family) }
      entry.count += 1
      if (/^h[1-3]$/.test(tag)) entry.heading += 1
      const weight = parseInt(style.fontWeight, 10)
      if (Number.isFinite(weight)) entry.weights[weight] = true
      const sizePx = px(style.fontSize)
      if (sizePx > 0) entry.sizes[sizePx] = true
      fontMap[family] = entry
    }
    const sizePx = px(style.fontSize)
    if (sizePx >= 6 && sizePx <= 240) bump(sizes, String(Math.round(sizePx)))
    for (const raw of [style.marginTop, style.paddingTop, style.paddingLeft, style.rowGap, style.columnGap]) {
      const value = px(raw)
      if (value > 0 && value <= 400) bump(spaces, String(Math.round(value)))
    }
    const radius = Math.max(px(style.borderTopLeftRadius), px(style.borderTopRightRadius), px(style.borderBottomLeftRadius), px(style.borderBottomRightRadius))
    if (radius > 0) bump(radii, String(Math.round(radius >= 100 ? 999 : radius)))
  }
  const ranked = Object.keys(bgCounts).map((hex) => ({ hex: hex, count: bgCounts[hex] })).sort((a, b) => b.count - a.count)
  const textRanked = Object.keys(fgCounts).map((hex) => ({ hex: hex, count: fgCounts[hex] })).sort((a, b) => b.count - a.count)
  const borderRanked = Object.keys(borderCounts).map((hex) => ({ hex: hex, count: borderCounts[hex] })).sort((a, b) => b.count - a.count)
  const familyRanked = Object.keys(fontMap).map((family) => ({ family: family, count: fontMap[family].count, heading: fontMap[family].heading, mono: fontMap[family].mono, sizes: Object.keys(fontMap[family].sizes).map(Number).sort((a, b) => a - b), weights: Object.keys(fontMap[family].weights).map(Number).sort((a, b) => a - b) })).sort((a, b) => b.count - a.count)
  const bodyBg = document.body ? getComputedStyle(document.body).backgroundColor : ''
  const bodyColor = document.body ? getComputedStyle(document.body).color : ''
  const bodyFont = document.body ? getComputedStyle(document.body).fontFamily : ''
  const bodyBgParsed = parseColor(bodyBg)
  const bodyColorParsed = parseColor(bodyColor)
  const bgHex = bodyBgParsed ? hexOf(bodyBgParsed) : (ranked.length > 0 ? ranked[0].hex : '')
  const inkHex = bodyColorParsed ? hexOf(bodyColorParsed) : (textRanked.length > 0 ? textRanked[0].hex : '')
  const brightnessOf = (hex) => { const color = parseColor(hex); return color ? color.r * 0.299 + color.g * 0.587 + color.b * 0.114 : 0 }
  const surfacePick = ranked.find((entry) => entry.hex !== bgHex && brightnessOf(entry.hex) > 140) || ranked.find((entry) => entry.hex !== bgHex) || null
  const mutedPick = textRanked.find((entry) => entry.hex !== inkHex) || null
  let maxWidth = 0
  for (const selector of ['main', '.container', '[class*="container"]', '[class*="wrapper"]', 'body > div']) {
    const node = document.querySelector(selector)
    if (!node) continue
    const width = Math.round(node.getBoundingClientRect().width)
    if (width > maxWidth && width <= 4000) maxWidth = width
  }
  let gutter = 0
  if (document.body) gutter = Math.round(px(getComputedStyle(document.body).paddingLeft))
  const breakpoints = {}
  try {
    const visit = (rules, depth) => {
      if (!rules || depth > 4) return
      for (let i = 0; i < rules.length && i < 2500; i += 1) {
        const rule = rules[i]
        const media = rule && rule.media ? String(rule.media.mediaText || '') : ''
        const pattern = /(min|max)-width\s*:\s*(\d+(?:\.\d+)?)px/g
        let match = pattern.exec(media)
        while (match) { const width = Math.round(Number(match[2])); if (width > 0 && width <= 3840) breakpoints[width] = true; match = pattern.exec(media) }
        if (rule && rule.cssRules) visit(rule.cssRules, depth + 1)
      }
    }
    for (const sheet of Array.from(document.styleSheets).slice(0, 30)) { try { visit(sheet.cssRules, 0) } catch (error) { /* cross-origin */ } }
  } catch (error) { /* stylesheet inspection is best effort */ }
  return {
    title: String(document.title || '').slice(0, 200),
    lang: String(document.documentElement.lang || '').slice(0, 20),
    elements: total,
    colors: {
      bg: bgHex,
      surface: surfacePick ? surfacePick.hex : '',
      ink: inkHex,
      muted: mutedPick ? mutedPick.hex : '',
      border: borderRanked.length > 0 ? borderRanked[0].hex : '',
      accent: '',
      extra: Object.keys(allColors).sort((a, b) => (allColors[b] || 0) - (allColors[a] || 0)).slice(0, 10),
    },
    fonts: familyRanked.slice(0, 8),
    bodyFont: primary(bodyFont),
    sizes: Object.keys(sizes).map(Number).sort((a, b) => (sizes[b] || 0) - (sizes[a] || 0)).slice(0, 16),
    spaces: Object.keys(spaces).map(Number).sort((a, b) => (spaces[b] || 0) - (spaces[a] || 0)).slice(0, 16),
    radii: Object.keys(radii).map(Number).sort((a, b) => (radii[b] || 0) - (radii[a] || 0)).slice(0, 10),
    maxWidth: maxWidth,
    gutter: gutter,
    breakpoints: Object.keys(breakpoints).map(Number).sort((a, b) => a - b).slice(0, 12),
    custom: custom,
  }
})()`

/** Pick the accent colour from extracted colour data (highest chroma, not bg/ink). */
function pickAccentFromUrl(data) {
  const candidates = Array.isArray(data?.colors?.extra) ? data.colors.extra : []
  let best = ''
  let bestScore = -1
  for (const hex of candidates) {
    const rgb = rgbaOf(hex)
    if (!rgb) continue
    const max = Math.max(rgb.r, rgb.g, rgb.b)
    const min = Math.min(rgb.r, rgb.g, rgb.b)
    const chroma = max === 0 ? 0 : (max - min) / max
    const lum = luminanceOf(rgb)
    if (chroma < 0.25 || lum < 0.02 || lum > 0.9) continue
    const score = chroma * 100 + (max - min)
    if (score > bestScore) {
      bestScore = score
      best = hex
    }
  }
  return best
}

/** Normalise one `tokensFromUrl` extraction into the frozen schema. */
function buildTokensFromUrlData(data, url) {
  const tokens = emptyTokens()
  tokens.name = cleanString(data?.title || '', 60)
  tokens.source = { kind: 'url', ref: cleanString(url, 300), at: nowIso() }
  const colors = data?.colors ?? {}
  tokens.color.bg = cleanColor(colors.bg)
  tokens.color.surface = cleanColor(colors.surface)
  tokens.color.ink = cleanColor(colors.ink)
  tokens.color.muted = cleanColor(colors.muted)
  tokens.color.border = cleanColor(colors.border)
  tokens.color.accent = cleanColor(colors.accent) || pickAccentFromUrl(data)
  const seen = new Set([tokens.color.bg, tokens.color.surface, tokens.color.ink, tokens.color.muted, tokens.color.border, tokens.color.accent].filter(Boolean))
  for (const hex of Array.isArray(colors.extra) ? colors.extra : []) {
    const clean = cleanColor(hex)
    if (!clean || seen.has(clean)) continue
    seen.add(clean)
    tokens.color.extra.push(clean)
    if (tokens.color.extra.length >= 12) break
  }
  const fonts = Array.isArray(data?.fonts) ? data.fonts : []
  const toFont = (entry) => ({ family: cleanString(entry?.family || '', 80), stack: cleanString(entry?.family || '', 160), weights: cleanWeights(entry?.weights) })
  const displayEntry = fonts.filter((entry) => entry && entry.heading > 0).sort((a, b) => (b.heading || 0) - (a.heading || 0))[0] || fonts[0]
  const bodyEntry = fonts.filter((entry) => entry && !entry.mono).sort((a, b) => (b.count || 0) - (a.count || 0))[0] || fonts[0]
  const monoEntry = fonts.find((entry) => entry && entry.mono)
  if (displayEntry) tokens.font.display = toFont(displayEntry)
  if (bodyEntry) tokens.font.body = toFont(bodyEntry)
  if (monoEntry) tokens.font.mono = toFont(monoEntry)
  tokens.size.scale = cleanScale(Array.isArray(data?.sizes) ? data.sizes : [], 6, 240, 20)
  tokens.space.scale = cleanScale(Array.isArray(data?.spaces) ? data.spaces : [], 0, 400, 20)
  tokens.radius.scale = cleanScale(Array.isArray(data?.radii) ? data.radii : [], 0, 999, 16)
  tokens.layout.breakpoints = cleanScale(Array.isArray(data?.breakpoints) ? data.breakpoints : [], 0, 3840, 8)
  tokens.layout.maxWidth = cleanNumber(data?.maxWidth, 0, 4000, 0)
  tokens.layout.gutter = cleanNumber(data?.gutter, 0, 200, 0)
  const custom = isPlainObject(data?.custom) ? Object.keys(data.custom).length : 0
  tokens.notes = custom > 0 ? '从页面计算样式提取，' + custom + ' 个自定义属性可用。' : ''
  return tokens
}

/** Evaluate one expression in a page, throwing a typed error on page exceptions. */
async function evaluateInPage(page, expression, options = {}) {
  const response = await page.session.send('Runtime.evaluate', { expression, awaitPromise: options.awaitPromise === true, returnByValue: true })
  if (response?.exceptionDetails) {
    const reason = response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'the page script failed'
    const error = new Error(String(reason).split('\n')[0].slice(0, 300))
    error.code = 'failed'
    throw error
  }
  return response?.result?.value
}

/** Navigate one page and settle it enough to read computed styles. */
async function openForTokens(page, url) {
  const width = 1440
  const height = heightForWidth(width)
  await page.session.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false, screenWidth: width, screenHeight: height }).catch(() => {})
  page.resetNetwork()
  const loaded = page.session.waitForEvent('Page.loadEventFired', { timeout: LIMITS.settleTimeoutMs }).catch(() => null)
  let navigation
  try {
    navigation = await page.session.send('Page.navigate', { url })
  } catch (error) {
    const failure = new Error('could not open ' + url + ': ' + messageOf(error))
    failure.code = 'navigation'
    throw failure
  }
  if (navigation?.errorText) {
    const failure = new Error('could not open ' + url + ': ' + navigation.errorText)
    failure.code = 'navigation'
    throw failure
  }
  const loadedOk = await Promise.race([
    loaded.then((value) => value !== null),
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), LIMITS.settleTimeoutMs)
      if (typeof timer.unref === 'function') timer.unref()
    }),
  ])
  if (!loadedOk) {
    const failure = new Error('the page did not finish loading within ' + LIMITS.settleTimeoutMs + ' ms')
    failure.code = 'timeout'
    throw failure
  }
  await page.waitForNetworkIdle({ quietMs: LIMITS.networkQuietMs, timeoutMs: Math.min(15000, LIMITS.settleTimeoutMs) })
  await evaluateInPage(page, 'Promise.resolve(document.fonts && document.fonts.ready ? document.fonts.ready : true)', { awaitPromise: true }).catch(() => {})
}

/**
 * Extract design tokens from a live URL's computed styles.
 * @param {{pool: object, url: string}} input
 * @returns {Promise<object>} normalised tokens
 */
export async function tokensFromUrl(input = {}) {
  const pool = input.pool
  const url = typeof input.url === 'string' ? input.url.trim() : ''
  if (!pool || typeof pool.withPage !== 'function') {
    const error = new Error('no browser pool is available to read the URL')
    error.code = 'no_browser'
    throw error
  }
  if (url.length === 0) {
    const error = new Error('no URL was given')
    error.code = 'navigation'
    throw error
  }
  let data = null
  await pool.withPage(async (page) => {
    await openForTokens(page, url)
    data = await evaluateInPage(page, TOKEN_EXTRACT_SOURCE)
  })
  if (!data || typeof data !== 'object') {
    const error = new Error('the page returned no readable styles')
    error.code = 'failed'
    throw error
  }
  return buildTokensFromUrlData(data, url)
}

/* -------------------------------------------------------------------------- */
/* image palette                                                              */
/* -------------------------------------------------------------------------- */

/** Detect an image format from its magic bytes. */
function imageFormatOf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return ''
  if (buffer.readUInt32BE(0) === 0x89504e47) return 'png'
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg'
  if (buffer.toString('latin1', 0, 3) === 'GIF') return 'gif'
  if (buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') return 'webp'
  return ''
}

/** Deterministic top palette from decoded RGBA pixels. */
function paletteFromRgba(rgba, width, height) {
  const pixels = width * height
  if (pixels <= 0) return []
  const target = 160000
  const step = Math.max(1, Math.floor(pixels / target))
  const buckets = new Map()
  let sampled = 0
  for (let index = 0; index < pixels; index += step) {
    const offset = index * 4
    const alpha = rgba[offset + 3]
    if (alpha < 24) continue
    const r = rgba[offset]
    const g = rgba[offset + 1]
    const b = rgba[offset + 2]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 }
    bucket.r += r
    bucket.g += g
    bucket.b += b
    bucket.count += 1
    buckets.set(key, bucket)
    sampled += 1
  }
  if (sampled === 0) return []
  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((bucket) => ({
      hex: hexOf({ r: bucket.r / bucket.count, g: bucket.g / bucket.count, b: bucket.b / bucket.count }),
      ratio: Math.round((bucket.count / sampled) * 10000) / 10000,
    }))
}

/**
 * Decode a PNG buffer into its dominant palette.
 * JPEG/WebP/GIF need the browser path (`tokensFromImageFile`) because pure Node
 * cannot decode them without a third-party dependency.
 * @param {Buffer|Uint8Array} buffer
 * @returns {{palette: Array<{hex: string, ratio: number}>, width: number, height: number, format: string}}
 */
export function tokensFromImageBuffer(buffer) {
  const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer ?? [])
  const format = imageFormatOf(data)
  if (format === '') {
    const error = new Error('the image is not a PNG, JPEG, WebP or GIF')
    error.code = 'unsupported_image'
    throw error
  }
  if (format !== 'png') {
    const error = new Error('only PNG buffers can be decoded without a browser; use tokensFromImageFile({pool, path}) for ' + format.toUpperCase())
    error.code = 'unsupported_image'
    error.format = format
    throw error
  }
  const size = pngSize(data)
  if (size && size.width * size.height > 60 * 1000 * 1000) {
    const error = new Error('the image is too large to decode (' + size.width + '×' + size.height + ')')
    error.code = 'too_large'
    throw error
  }
  let decoded
  try {
    decoded = decodePng(data)
  } catch (error) {
    const failure = new Error('the PNG could not be decoded: ' + messageOf(error))
    failure.code = 'unsupported_image'
    throw failure
  }
  return { palette: paletteFromRgba(decoded.rgba, decoded.width, decoded.height), width: decoded.width, height: decoded.height, format: 'png' }
}

/**
 * Read the dominant palette of any browser-renderable image file.
 * PNG decodes in-process; every other format is rendered by the browser and the
 * resulting PNG screenshot is decoded with the same codec.
 * @param {{pool: object, path: string}} input
 * @returns {Promise<{palette: Array<{hex: string, ratio: number}>, width: number, height: number, format: string}>}
 */
export async function tokensFromImageFile(input = {}) {
  const filePath = typeof input.path === 'string' ? input.path.trim() : ''
  if (filePath.length === 0 || !isAbsolute(filePath)) {
    const error = new Error('an absolute image path is required')
    error.code = 'invalid_input'
    throw error
  }
  let data
  try {
    const info = await stat(filePath)
    if (!info.isFile()) {
      const error = new Error('the path is not a file')
      error.code = 'not_found'
      throw error
    }
    if (info.size > LIMITS.maxImageBytes) {
      const error = new Error('the image is larger than the ' + LIMITS.maxImageBytes + ' byte limit')
      error.code = 'too_large'
      throw error
    }
    data = await readFile(filePath)
  } catch (error) {
    if (error && error.code) throw error
    const failure = new Error('the image could not be read: ' + messageOf(error))
    failure.code = 'not_found'
    throw failure
  }
  const format = imageFormatOf(data)
  if (format === 'png') return { ...tokensFromImageBuffer(data), file: filePath }
  const pool = input.pool
  if (!pool || typeof pool.withPage !== 'function') {
    const error = new Error('a browser pool is required to read ' + (format || 'this') + ' images')
    error.code = 'no_browser'
    throw error
  }
  let rendered = null
  await pool.withPage(async (page) => {
    await page.session.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false, screenWidth: 1280, screenHeight: 960 }).catch(() => {})
    page.resetNetwork()
    const loaded = page.session.waitForEvent('Page.loadEventFired', { timeout: LIMITS.settleTimeoutMs }).catch(() => null)
    let navigation
    try {
      navigation = await page.session.send('Page.navigate', { url: pathToFileURL(filePath).href })
    } catch (error) {
      const failure = new Error('the image could not be opened: ' + messageOf(error))
      failure.code = 'navigation'
      throw failure
    }
    if (navigation?.errorText) {
      const failure = new Error('the image could not be opened: ' + navigation.errorText)
      failure.code = 'navigation'
      throw failure
    }
    await loaded
    await page.waitForNetworkIdle({ quietMs: LIMITS.networkQuietMs, timeoutMs: 6000 }).catch(() => {})
    const rect = await evaluateInPage(page, '(() => { const image = document.images && document.images[0]; if (!image) return null; const box = image.getBoundingClientRect(); return { x: Math.max(0, Math.round(box.x)), y: Math.max(0, Math.round(box.y)), width: Math.max(1, Math.round(box.width)), height: Math.max(1, Math.round(box.height)), naturalWidth: image.naturalWidth || 0, naturalHeight: image.naturalHeight || 0 } })()').catch(() => null)
    if (!rect) {
      const error = new Error('the browser did not render the image')
      error.code = 'failed'
      throw error
    }
    const clip = { x: rect.x, y: rect.y, width: Math.min(1920, rect.width), height: Math.min(1080, rect.height), scale: 1 }
    const shot = await page.session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: clip })
    const png = Buffer.from(shot.data, 'base64')
    const decoded = decodePng(png)
    rendered = {
      palette: paletteFromRgba(decoded.rgba, decoded.width, decoded.height),
      width: rect.naturalWidth || decoded.width,
      height: rect.naturalHeight || decoded.height,
      format: format || 'rendered',
      file: filePath,
    }
  })
  if (!rendered) {
    const error = new Error('the image palette could not be read')
    error.code = 'failed'
    throw error
  }
  return rendered
}

/* -------------------------------------------------------------------------- */
/* tokenUsage / compareToSystem                                               */
/* -------------------------------------------------------------------------- */

/** Coerce a `[value, count]` pair list into sorted, de-duplicated pairs. */
function pairsFrom(value, options = {}) {
  const list = Array.isArray(value) ? value : []
  const merged = new Map()
  for (const row of list) {
    if (!Array.isArray(row) || row.length < 2) continue
    const count = Number(row[1])
    if (!Number.isFinite(count) || count <= 0) continue
    let key = row[0]
    if (options.numeric) {
      key = Number(key)
      if (!Number.isFinite(key)) continue
      key = Math.round(key * 100) / 100
    } else if (options.hex) {
      key = cleanColor(String(key))
      if (!key) continue
    } else {
      key = cleanString(String(key), 80)
      if (!key) continue
    }
    merged.set(key, (merged.get(key) ?? 0) + count)
  }
  const limit = Math.max(1, Number(options.limit) || 24)
  return [...merged.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, limit)
}

/** Convert a `[{value, count}]` list into pairs. */
function pairsFromValues(list) {
  const pairs = []
  for (const row of Array.isArray(list) ? list : []) {
    if (!row) continue
    const count = Number(row.count)
    if (!Number.isFinite(count) || count <= 0) continue
    if (typeof row.value === 'string') pairs.push([row.value, count])
    else if (typeof row.value === 'number') pairs.push([row.value, count])
    else if (typeof row.family === 'string') pairs.push([row.family, count])
  }
  return pairs
}

/**
 * Normalise the usage evidence of one probe metrics object.
 * @param {object} metrics CONTRACT §7 metrics
 * @returns {{colors: Array<[string, number]>, fonts: Array<[string, number]>, sizes: Array<[number, number]>, radii: Array<[number, number]>, spacings: Array<[number, number]>}}
 */
export function tokenUsage(metrics) {
  const empty = { colors: [], fonts: [], sizes: [], radii: [], spacings: [] }
  if (!isPlainObject(metrics)) return empty
  const usage = isPlainObject(metrics.tokenUsage) ? metrics.tokenUsage : {}
  const colors = pairsFrom(usage.colors, { hex: true, limit: 24 })
  const fonts = pairsFrom(usage.fonts, { limit: 12 })
  const sizes = pairsFrom(usage.sizes, { numeric: true, limit: 24 })
  const radii = pairsFrom(usage.radii, { numeric: true, limit: 16 })
  const spacings = pairsFrom(usage.spacings, { numeric: true, limit: 20 })

  if (colors.length === 0) {
    const merged = new Map()
    for (const list of [metrics.colors, metrics.textColors, metrics.backgrounds]) {
      for (const row of Array.isArray(list) ? list : []) {
        const hex = cleanColor(String(row?.value ?? ''))
        const count = Number(row?.count)
        if (!hex || !Number.isFinite(count) || count <= 0) continue
        merged.set(hex, (merged.get(hex) ?? 0) + count)
      }
    }
    colors.push(...[...merged.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24))
  }
  if (fonts.length === 0) {
    fonts.push(...pairsFrom(pairsFromValues(metrics.fonts), { limit: 12 }))
  }
  if (sizes.length === 0) {
    const source = Array.isArray(metrics.sizes) ? metrics.sizes : []
    const merged = new Map()
    for (const item of source) {
      const number = Number(item)
      if (!Number.isFinite(number)) continue
      merged.set(Math.round(number * 100) / 100, (merged.get(Math.round(number * 100) / 100) ?? 0) + 1)
    }
    sizes.push(...[...merged.entries()].sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0])).slice(0, 24))
  }
  if (radii.length === 0) {
    const source = Array.isArray(metrics.radii) ? metrics.radii : []
    const merged = new Map()
    for (const item of source) {
      const number = Number(item)
      if (!Number.isFinite(number)) continue
      merged.set(Math.round(number * 100) / 100, (merged.get(Math.round(number * 100) / 100) ?? 0) + 1)
    }
    radii.push(...[...merged.entries()].slice(0, 16))
  }
  if (spacings.length === 0) {
    const source = Array.isArray(metrics.spacings) ? metrics.spacings : []
    const merged = new Map()
    for (const item of source) {
      const number = Number(item)
      if (!Number.isFinite(number)) continue
      merged.set(Math.round(number * 100) / 100, (merged.get(Math.round(number * 100) / 100) ?? 0) + 1)
    }
    spacings.push(...[...merged.entries()].slice(0, 20))
  }
  return { colors, fonts, sizes, radii, spacings }
}

/** All colour values a token set allows, as `{value, rgb}` entries. */
function paletteOf(tokens) {
  const values = []
  for (const role of COLOR_ROLES) {
    const value = tokens.color[role]
    if (!value) continue
    const rgb = rgbaOf(value)
    if (rgb) values.push({ value, rgb })
  }
  for (const value of tokens.color.extra) {
    const rgb = rgbaOf(value)
    if (rgb) values.push({ value, rgb })
  }
  return values
}

/** All names a font stack declares, lowercased. */
function familiesOf(stack) {
  return String(stack ?? '')
    .split(',')
    .map((part) => part.trim().replace(/^["']|["']$/gu, '').toLowerCase())
    .filter((part) => part.length > 0)
}

/** Family names declared anywhere in the token set. */
function systemFamilies(tokens) {
  const families = new Set()
  for (const role of FONT_ROLES) {
    const font = tokens.font[role]
    if (font.family) families.add(font.family.trim().toLowerCase())
    for (const family of familiesOf(font.stack)) families.add(family)
  }
  return families
}

/** Score one dimension from an off/total count. */
function dimensionScore(offCount, totalCount) {
  if (totalCount <= 0) return null
  return Math.max(0, Math.min(100, Math.round((1 - offCount / totalCount) * 1000) / 10))
}

/**
 * Compare measured usage against a token system.
 * @param {object} usage `tokenUsage(metrics)`
 * @param {object} tokens normalised tokens (or raw; normalised here)
 * @returns {{score: number, violations: {colors: object[], fonts: object[], sizes: object[], radii: object[], spacings: object[]}, checked: boolean, dimensions: object}}
 */
export function compareToSystem(usage, tokens) {
  const result = {
    score: 100,
    violations: { colors: [], fonts: [], sizes: [], radii: [], spacings: [] },
    checked: false,
    dimensions: {},
  }
  const normalised = normalizeTokens(tokens)
  const measured = isPlainObject(usage) ? usage : {}
  const palette = paletteOf(normalised)
  const families = systemFamilies(normalised)

  const considered = []
  // Colours ------------------------------------------------------------------
  const colorTotal = Array.isArray(measured.colors) ? measured.colors.reduce((sum, row) => sum + (Number(row[1]) || 0), 0) : 0
  if (palette.length > 0 && colorTotal > 0) {
    let off = 0
    for (const [value, count] of measured.colors) {
      const rgb = rgbaOf(String(value))
      if (!rgb) continue
      let nearest = null
      let distance = Infinity
      for (const candidate of palette) {
        const dr = rgb.r - candidate.rgb.r
        const dg = rgb.g - candidate.rgb.g
        const db = rgb.b - candidate.rgb.b
        const current = Math.sqrt(dr * dr + dg * dg + db * db)
        if (current < distance) {
          distance = current
          nearest = candidate.value
        }
      }
      const allowed = distance <= COLOR_TOLERANCE
      if (!allowed) {
        off += count
        result.violations.colors.push({ value: cleanColor(String(value)), count, nearest, distance: Math.round(distance * 10) / 10 })
      }
    }
    result.violations.colors.sort((a, b) => b.count - a.count).splice(MAX_VIOLATIONS)
    result.dimensions.colors = dimensionScore(off, colorTotal)
    considered.push('colors')
  }

  // Fonts --------------------------------------------------------------------
  const fontTotal = Array.isArray(measured.fonts) ? measured.fonts.reduce((sum, row) => sum + (Number(row[1]) || 0), 0) : 0
  if (families.size > 0 && fontTotal > 0) {
    let off = 0
    for (const [family, count] of measured.fonts) {
      const name = String(family).trim().toLowerCase()
      if (name.length === 0) continue
      if (families.has(name)) continue
      off += count
      result.violations.fonts.push({ value: String(family), count, system: [...families].slice(0, 6) })
    }
    result.violations.fonts.sort((a, b) => b.count - a.count).splice(MAX_VIOLATIONS)
    result.dimensions.fonts = dimensionScore(off, fontTotal)
    considered.push('fonts')
  }

  // Scales -------------------------------------------------------------------
  const compareScale = (name, scale, tolerance, pillAware) => {
    const list = Array.isArray(measured[name]) ? measured[name] : []
    const total = list.reduce((sum, row) => sum + (Number(row[1]) || 0), 0)
    if (!Array.isArray(scale) || scale.length === 0 || total <= 0) return
    let off = 0
    for (const [value, count] of list) {
      const number = Number(value)
      if (!Number.isFinite(number)) continue
      let nearest = null
      let distance = Infinity
      for (const candidate of scale) {
        const current = Math.abs(number - Number(candidate))
        if (current < distance) {
          distance = current
          nearest = Number(candidate)
        }
      }
      const pill = pillAware === true && number >= PILL_RADIUS && scale.some((candidate) => Number(candidate) >= PILL_RADIUS)
      if (pill || distance <= tolerance) continue
      off += count
      result.violations[name].push({ value: number, count, nearest, distance: Math.round(distance * 100) / 100 })
    }
    result.violations[name].sort((a, b) => b.count - a.count).splice(MAX_VIOLATIONS)
    result.dimensions[name] = dimensionScore(off, total)
    considered.push(name)
  }
  compareScale('sizes', normalised.size.scale, PX_TOLERANCE, true)
  compareScale('radii', normalised.radius.scale, PX_TOLERANCE, true)
  compareScale('spacings', normalised.space.scale, PX_TOLERANCE, false)

  if (considered.length === 0) return result
  const weights = { colors: 0.35, fonts: 0.25, sizes: 0.2, radii: 0.1, spacings: 0.1 }
  let score = 0
  let weightSum = 0
  for (const name of considered) {
    const dimension = result.dimensions[name]
    if (dimension === null || dimension === undefined) continue
    score += dimension * weights[name]
    weightSum += weights[name]
  }
  result.score = weightSum > 0 ? Math.round((score / weightSum) * 10) / 10 : 100
  result.checked = true
  return result
}
