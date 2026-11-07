/**
 * dsh-design-studio — small shared helpers.
 *
 * Pure functions plus atomic file writes; every host module imports from here so
 * the unit tests exercise the same code paths. No third-party imports.
 */

import { createHash, randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/** A one-line message from any thrown value. */
export function messageOf(error) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

/** True for a plain (non-array, non-null) object. */
export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Clamp a number into [min, max], returning the fallback for non-finite input. */
export function clamp(value, min, max, fallback = min) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** Round to an integer deterministically. */
export function toInt(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : fallback
}

/** ISO timestamp for persisted records. */
export function nowIso() {
  return new Date().toISOString()
}

/** A short, filesystem-safe id segment from arbitrary text. */
export function slugify(text, fallback = 'design') {
  const slug = String(text ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 48)
  return slug.length > 0 ? slug : fallback
}

/** A project id: `dsg-<yyyymmdd-hhmmss>-<4 hex>`. */
export function newProjectId(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const stamp =
    String(date.getUTCFullYear()) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    '-' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  return `dsg-${stamp}-${randomBytes(2).toString('hex')}`
}

/** A short unique id such as `c-<ms>-<4hex>` for comments and jobs. */
export function uniqueId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`
}

/** FNV-1a 32-bit hex digest of a string (fast, stable, non-cryptographic). */
export function hashText(text) {
  let hash = 0x811c9dc5
  const source = String(text ?? '')
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** SHA-256 hex digest of a string or Buffer. */
export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

/** UTF-8 byte length. */
export function byteLength(value) {
  return Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value ?? null), 'utf8')
}

/** Cut a string to a UTF-8 byte budget without splitting a code point. */
export function truncateUtf8(text, maxBytes) {
  const source = typeof text === 'string' ? text : String(text ?? '')
  if (Buffer.byteLength(source, 'utf8') <= maxBytes) return { text: source, truncated: false }
  let lo = 0
  let hi = source.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (Buffer.byteLength(source.slice(0, mid), 'utf8') <= maxBytes) lo = mid
    else hi = mid - 1
  }
  return { text: source.slice(0, lo), truncated: true }
}

/** Ensure a directory exists. */
export async function ensureDir(path) {
  await mkdir(path, { recursive: true })
  return path
}

/** Remove a directory recursively (missing is fine). */
export async function rmDir(path) {
  await rm(path, { recursive: true, force: true })
}

/** Read and parse a JSON file, or return the fallback when missing/broken. */
export async function readJsonFile(path, fallback = null) {
  try {
    const text = await readFile(path, 'utf8')
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

/** JSON with sorted keys, for stable fingerprints and diffs. */
export function stableJson(value) {
  return JSON.stringify(sortKeys(value))
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (isPlainObject(value)) {
    const out = {}
    for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key])
    return out
  }
  return value
}

/**
 * Write a file atomically: a temp file beside the target, then a rename.
 * Concurrent writers of the same target are serialised by the caller's lock.
 */
export async function writeFileAtomic(path, data) {
  await ensureDir(dirname(path))
  const temp = join(dirname(path), `.${process.pid}-${Date.now()}-${randomBytes(3).toString('hex')}.tmp`)
  await writeFile(temp, data)
  try {
    await rename(temp, path)
  } catch (error) {
    await rm(temp, { force: true }).catch(() => {})
    throw error
  }
}

/** Write JSON atomically (2-space indented, trailing newline). */
export async function writeJsonAtomic(path, value) {
  await writeFileAtomic(path, JSON.stringify(value, null, 2) + '\n')
}

/** Resolve whether a path exists. */
export function pathExists(path) {
  return existsSync(path)
}

/** First non-empty string among the arguments, else ''. */
export function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return ''
}

/** Human byte label used in notes. */
export function formatBytes(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return '0 B'
  if (n < 1024) return `${Math.round(n)} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** Escape text for safe insertion into HTML text/attribute contexts. */
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;')
}

/** The CSS named colours the colour parser understands (small, common set). */
const NAMED_COLOURS = {
  transparent: [0, 0, 0, 0],
  black: [0, 0, 0, 1],
  white: [255, 255, 255, 1],
  red: [255, 0, 0, 1],
  green: [0, 128, 0, 1],
  blue: [0, 0, 255, 1],
  yellow: [255, 255, 0, 1],
  orange: [255, 165, 0, 1],
  purple: [128, 0, 128, 1],
  pink: [255, 192, 203, 1],
  gray: [128, 128, 128, 1],
  grey: [128, 128, 128, 1],
  silver: [192, 192, 192, 1],
  navy: [0, 0, 128, 1],
  teal: [0, 128, 128, 1],
  maroon: [128, 0, 0, 1],
  olive: [128, 128, 0, 1],
  lime: [0, 255, 0, 1],
  aqua: [0, 255, 255, 1],
  cyan: [0, 255, 255, 1],
  fuchsia: [255, 0, 255, 1],
  magenta: [255, 0, 255, 1],
  brown: [165, 42, 42, 1],
  beige: [245, 245, 220, 1],
  ivory: [255, 255, 240, 1],
  gold: [255, 215, 0, 1],
}

/**
 * Parse a CSS colour into `{r,g,b,a}` (0–255, alpha 0–1).
 * Supports #rgb/#rgba/#rrggbb/#rrggbbaa, rgb()/rgba(), the common named colours,
 * and `hsl()`. Returns null for anything else (gradients, var(), currentColor).
 */
export function rgbaOf(value) {
  if (typeof value !== 'string') return null
  const text = value.trim().toLowerCase()
  if (text.length === 0) return null
  if (text === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  if (Object.prototype.hasOwnProperty.call(NAMED_COLOURS, text)) {
    const [r, g, b, a] = NAMED_COLOURS[text]
    return { r, g, b, a }
  }
  if (text.startsWith('#')) {
    const hex = text.slice(1)
    if (hex.length === 3 || hex.length === 4) {
      const channels = [...hex].map((ch) => parseInt(ch + ch, 16))
      if (channels.some((n) => Number.isNaN(n))) return null
      return { r: channels[0], g: channels[1], b: channels[2], a: channels[3] === undefined ? 1 : channels[3] / 255 }
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
      if ([r, g, b].some((n) => Number.isNaN(n))) return null
      return { r, g, b, a }
    }
    return null
  }
  const fn = /^(rgba?|hsla?)\(\s*([^)]+)\)$/u.exec(text)
  if (!fn) return null
  const parts = fn[2].split(/[,/\s]+/u).filter((part) => part.length > 0)
  if (parts.length < 3) return null
  if (fn[1].startsWith('rgb')) {
    const channels = parts.slice(0, 3).map((part) => {
      const n = parseFloat(part)
      return part.endsWith('%') ? Math.round((n / 100) * 255) : Math.round(n)
    })
    if (channels.some((n) => !Number.isFinite(n))) return null
    const alphaRaw = parts[3]
    const alpha = alphaRaw === undefined ? 1 : alphaRaw.endsWith('%') ? parseFloat(alphaRaw) / 100 : parseFloat(alphaRaw)
    return { r: clamp(channels[0], 0, 255), g: clamp(channels[1], 0, 255), b: clamp(channels[2], 0, 255), a: Number.isFinite(alpha) ? clamp(alpha, 0, 1) : 1 }
  }
  const h = ((parseFloat(parts[0]) % 360) + 360) % 360
  const s = clamp(parseFloat(parts[1]) / 100, 0, 1, 0)
  const l = clamp(parseFloat(parts[2]) / 100, 0, 1, 0)
  const alphaRaw = parts[3]
  const alpha = alphaRaw === undefined ? 1 : alphaRaw.endsWith('%') ? parseFloat(alphaRaw) / 100 : parseFloat(alphaRaw)
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let rgb
  if (h < 60) rgb = [c, x, 0]
  else if (h < 120) rgb = [x, c, 0]
  else if (h < 180) rgb = [0, c, x]
  else if (h < 240) rgb = [0, x, c]
  else if (h < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
    a: Number.isFinite(alpha) ? clamp(alpha, 0, 1) : 1,
  }
}

/** WCAG relative luminance of an opaque colour. */
function luminance({ r, g, b }) {
  const channel = (n) => {
    const v = n / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * WCAG contrast ratio between two colours, compositing the foreground over the
 * background when the foreground has alpha. Returns null for unparseable input.
 */
export function contrastRatio(foreground, background) {
  const fg = typeof foreground === 'string' ? rgbaOf(foreground) : foreground
  const bg = typeof background === 'string' ? rgbaOf(background) : background
  if (!fg || !bg) return null
  const alpha = Number.isFinite(fg.a) ? fg.a : 1
  const composed = {
    r: fg.r * alpha + bg.r * (1 - alpha),
    g: fg.g * alpha + bg.g * (1 - alpha),
    b: fg.b * alpha + bg.b * (1 - alpha),
  }
  const l1 = luminance(composed) + 0.05
  const l2 = luminance(bg) + 0.05
  return l1 > l2 ? l1 / l2 : l2 / l1
}

/** Convert `{r,g,b}` to lowercase `#rrggbb`. */
export function hexOf({ r, g, b }) {
  const channel = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${channel(r)}${channel(g)}${channel(b)}`
}
