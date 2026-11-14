/**
 * dsh-design-studio — orchestration service (CONTRACT §3 lib/service.js).
 *
 * The single source of truth behind both the agent tools and the panel:
 *   createProject / saveVariant   durable projects and design HTML
 *   startCheck                    probe → audit → checks/round-N/check.json
 *   exportDesign                  html / zip / pdf / png / pptx
 *   comments / tweaks / versions  canvas collaboration state
 *
 * Long operations run through the in-process job runner so the panel can poll
 * while the agent tools await the same job. Every dependency that touches the
 * outside world (browser probe, audit rules, exporters, token scanner,
 * scaffolds, loopback preview server) is injectable through `deps`, which keeps
 * unit tests hermetic and lets the Lead swap implementations without touching
 * this file. Structured failures are Error objects carrying `code` + `repair`.
 */

import { spawn } from 'node:child_process'
import { cp, readFile, readdir, rm, stat } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { auditDesign as realAuditDesign } from './audit.js'
import {
  DEFAULT_WIDTHS,
  EXPORT_KINDS,
  KINDS,
  LIMITS,
  ROUTE_PREFIX,
  SCHEMA_VERSION,
  normalizeViewports,
} from './config.js'
import { exportDesign as realExportDesign } from './export.js'
import { createJobs } from './jobs.js'
import * as scaffoldModule from './scaffolds.js'
import * as tokenModule from './tokens.js'
import { probeDesign as realProbeDesign } from './probe.js'
import * as previewModule from './preview.js'
import {
  INTAKE_QUESTIONS,
  intakeCompleteness,
  intakeQuestionList,
  intakeSummary,
  mergeIntake,
  normalizeIntake,
} from './intake.js'
import {
  byteLength,
  ensureDir,
  escapeHtml,
  isPlainObject,
  messageOf,
  newProjectId,
  nowIso,
  slugify,
  toInt,
  truncateUtf8,
  uniqueId,
} from './util.js'

/** The plugin version reported by overview/diagnostics. */
export const SERVICE_VERSION = '1.3.2'

/** Failure codes the panel/tools understand (CONTRACT §3). */
export const FAILURE_CODES = Object.freeze([
  'invalid_input',
  'not_found',
  'busy',
  'no_browser',
  'no_preview',
  'too_large',
  'not_ready',
  'failed',
  'cancelled',
])

/** Variant file stems: letters/digits/underscore/dash, 1-32 chars. */
const VARIANT_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/u

/** A budget for one panel-save history entry per file (CONTRACT §2). */
const HISTORY_PER_FILE = 20

/** A result budget for comments / context records kept per project. */
const CONTEXT_LIMIT = 100

/** Build a structured service failure. */
export function fail(code, message, repair) {
  const error = new Error(message)
  error.code = code
  if (repair) error.repair = repair
  return error
}

/** The repair object tools echo back to the agent and the panel shows. */
export function repair(action, label, detail) {
  return { action, label, detail }
}

/** Throw a `cancelled` failure when the job signal fired. */
function throwIfAborted(signal) {
  if (signal?.aborted) throw fail('cancelled', 'job cancelled', repair('retry', 'Run it again', 'The job was cancelled or timed out.'))
}

/** Map a score to the frozen grade bands (§7). */
export function gradeForScore(score) {
  const value = Number(score)
  if (!Number.isFinite(value)) return 'F'
  if (value >= 90) return 'A'
  if (value >= 80) return 'B'
  if (value >= 70) return 'C'
  if (value >= 60) return 'D'
  return 'F'
}

/** The default labels of the three graded variants. */
const DEFAULT_VARIANT_LABELS = Object.freeze({ a: '规范版', b: '进阶版', c: '前卫版' })

/** Starter file used when the scaffold library has nothing for a kind yet. */
function fallbackVariantHtml(project) {
  const title = escapeHtml(project.name || 'Design')
  const goal = escapeHtml(project.brief?.goal || 'Describe the design goal in the brief.')
  return String.raw`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root { --ink:#1a1a1a; --muted:#6b6b66; --bg:#faf9f6; --surface:#ffffff; --accent:#b4552f; --border:#e4e2db; --radius:12px; --font-size:16px; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font: var(--font-size)/1.6 "Inter Tight", system-ui, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 96px 24px; }
  h1 { font-size: 44px; line-height: 1.1; margin: 0 0 16px; letter-spacing: -0.02em; }
  p { color: var(--muted); max-width: 46ch; }
</style>
</head>
<body>
<main>
  <h1>${title}</h1>
  <p>${goal}</p>
</main>
<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{"accentColor":"#b4552f","fontSize":16,"radius":12,"dark":false}/*EDITMODE-END*/;
window.__dsApplyTweaks = function (edits) {
  var root = document.documentElement;
  if (edits.accentColor) root.style.setProperty('--accent', edits.accentColor);
  if (edits.fontSize) root.style.setProperty('--font-size', edits.fontSize + 'px');
  if (edits.radius !== undefined) root.style.setProperty('--radius', edits.radius + 'px');
  document.body.classList.toggle('dark', edits.dark === true);
};
</script>
</body>
</html>`
}

/** A one-page DESIGN.md seeded into every new project. */
function designDocFor(project) {
  const brief = project.brief ?? {}
  const intake = normalizeIntake(project.intake)
  const completeness = intakeCompleteness(intake)
  const summary = intakeSummary(intake)
  const intakeBody = summary.trim().length > 0 ? summary : `- 尚未填写；新/含糊需求先按 design_intake 的问题清单提问。\n- 完整度：${completeness.score}%`
  const missingLine = completeness.missing.length > 0 ? `\n待补问：${completeness.missing.join(', ')}\n` : ''
  return `# ${project.name} — design system

## Brief
- Kind: ${project.kind}
- Goal: ${brief.goal || '(fill in the design goal)'}
- Audience: ${brief.audience || '(who is this for)'}
- Layout: ${brief.layout || '(sections and rhythm)'}
- Content: ${brief.content || '(real copy, not lorem ipsum)'}
- Constraints: ${brief.constraints || '(brand, tokens, responsive rules)'}

## Intake（需求访谈）
${intakeBody}
${missingLine}
## Hard rules
- Real typography: one display face and one text face, no blacklisted defaults (Inter/Roboto/Arial/Helvetica/Poppins/system-ui) as display.
- 4/8 px spacing rhythm; one type scale; one accent colour family.
- No purple/blue gradient backgrounds, no emoji walls, no fake testimonials or logos, no lorem ipsum.
- Every viewport must be usable; touch targets at least 44x44 px; contrast at least 4.5:1 for body text.
- Keep the /*EDITMODE-BEGIN*/ TWEAK block when the scaffold provides it and implement window.__dsApplyTweaks.
- Write three graded variants under design/: a = spec, b = advanced, c = avant-garde.
`
}

/** True when DESIGN.md still looks like the generated document (safe to refresh). */
function isGeneratedDesignDoc(text) {
  return typeof text === 'string' && /^# .+ — design system/mu.test(text)
}

/** Map a project kind onto its default scaffold id. */
export function scaffoldIdForKind(kind) {
  switch (kind) {
    case 'mobile':
      return 'ios'
    case 'deck':
      return 'deck'
    case 'poster':
      return 'poster'
    case 'doc':
      return 'doc'
    default:
      return 'browser'
  }
}

/** Normalise a variant input (`a`, `a.html`, `A.HTML`) to its stem, or null. */
export function normalizeVariantId(value) {
  if (typeof value !== 'string') return null
  const stem = value.trim().replace(/\.html?$/iu, '')
  return VARIANT_PATTERN.test(stem) ? stem : null
}

/** Parse the TWEAK_DEFAULTS JSON block out of an HTML file (CONTRACT §6). */
export function parseTweakBlock(html) {
  const source = typeof html === 'string' ? html : ''
  const begin = '/*EDITMODE-BEGIN*/'
  const end = '/*EDITMODE-END*/'
  const startIndex = source.indexOf(begin)
  if (startIndex < 0) return { found: false, tweaks: {}, startIndex: -1, endIndex: -1, json: '' }
  const endIndex = source.indexOf(end, startIndex + begin.length)
  if (endIndex < 0) return { found: false, tweaks: {}, startIndex, endIndex: -1, json: '' }
  const json = source.slice(startIndex + begin.length, endIndex).trim()
  if (json.length === 0) return { found: true, tweaks: {}, startIndex, endIndex, json: '' }
  let parsed
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    throw fail(
      'invalid_input',
      `the TWEAK block is not valid JSON: ${messageOf(error)}`,
      repair('fix-tweak-json', 'Fix the TWEAK block', 'Between /*EDITMODE-BEGIN*/ and /*EDITMODE-END*/ keep one JSON object such as {"primaryColor":"#b4552f","fontSize":16}.'),
    )
  }
  if (!isPlainObject(parsed)) {
    throw fail(
      'invalid_input',
      'the TWEAK block must be one JSON object',
      repair('fix-tweak-json', 'Fix the TWEAK block', 'Example: {"primaryColor":"#b4552f","fontSize":16,"radius":8,"dark":false}'),
    )
  }
  return { found: true, tweaks: parsed, startIndex, endIndex, json }
}

/** Replace the TWEAK block substring, keeping key order and appending new keys. */
export function replaceTweakBlock(html, startIndex, endIndex, tweaks) {
  const begin = '/*EDITMODE-BEGIN*/'
  const end = '/*EDITMODE-END*/'
  const source = typeof html === 'string' ? html : ''
  const json = JSON.stringify(tweaks)
  return source.slice(0, startIndex) + begin + json + end + source.slice(endIndex + end.length)
}

/** Normalise a comment rect into the frozen `{x,y,w,h}` shape. */
function normalizeRect(value) {
  const rect = isPlainObject(value) ? value : {}
  const number = (key, fallback = 0) => {
    const n = Number(rect[key])
    return Number.isFinite(n) ? Math.round(n) : fallback
  }
  return { x: number('x'), y: number('y'), w: number('w', number('width')), h: number('h', number('height')) }
}

/** Normalise a comment element descriptor. */
function normalizeElement(value) {
  if (!isPlainObject(value)) return null
  const text = typeof value.text === 'string' ? value.text.slice(0, 200) : ''
  return {
    tag: typeof value.tag === 'string' ? value.tag.slice(0, 32) : '',
    id: typeof value.id === 'string' ? value.id.slice(0, 120) : '',
    classes: Array.isArray(value.classes) ? value.classes.filter((item) => typeof item === 'string').slice(0, 8).map((item) => item.slice(0, 80)) : [],
    text,
  }
}

/**
 * The five brief fields, in canonical order (UX-MAP §5.2).
 * `content` keeps the larger createProject budget; updateBrief caps every field.
 */
export const BRIEF_FIELDS = Object.freeze(['goal', 'audience', 'layout', 'content', 'constraints'])

/** Per-field byte/character cap for `service.updateBrief`. */
export const BRIEF_FIELD_MAX = 2000

/**
 * Merge a brief patch over the current brief.
 * Unknown keys are dropped, provided fields must be strings (trimmed + capped),
 * missing fields keep their current value. Throws `invalid_input` with a repair.
 */
export function mergeBriefPatch(existing, patch) {
  if (!isPlainObject(patch)) {
    throw fail(
      'invalid_input',
      'brief must be an object',
      repair('fix-brief', 'Pass a brief object', 'Example: {"goal":"做一个运营仪表盘","audience":"运营团队","layout":"","content":"","constraints":""}'),
    )
  }
  const source = isPlainObject(existing) ? existing : {}
  const merged = {}
  for (const field of BRIEF_FIELDS) merged[field] = typeof source[field] === 'string' ? source[field] : ''
  for (const key of Object.keys(patch)) {
    if (!BRIEF_FIELDS.includes(key)) continue
    const value = patch[key]
    if (typeof value !== 'string') {
      throw fail(
        'invalid_input',
        `brief.${key} must be a string`,
        repair('fix-brief', `Fix brief.${key}`, 'Every brief field (goal, audience, layout, content, constraints) must be a string.'),
      )
    }
    merged[key] = truncateUtf8(value.trim(), BRIEF_FIELD_MAX).text
  }
  return merged
}

/** Bound one audit category for check.json. */
function boundCategories(categories) {
  if (!Array.isArray(categories)) return []
  return categories.slice(0, 12).map((category) => ({
    id: String(category?.id ?? ''),
    label: String(category?.label ?? category?.id ?? ''),
    score: Number.isFinite(Number(category?.score)) ? Math.round(Number(category.score)) : 0,
    weight: Number.isFinite(Number(category?.weight)) ? Number(category.weight) : 0,
    findings: Array.isArray(category?.findings)
      ? category.findings.slice(0, 20).map((finding) => ({
          code: String(finding?.code ?? ''),
          severity: ['critical', 'high', 'medium', 'low'].includes(finding?.severity) ? finding.severity : 'low',
          message: truncateUtf8(String(finding?.message ?? ''), 400).text,
          fix: truncateUtf8(String(finding?.fix ?? ''), 400).text,
          ...(finding?.selector ? { selector: truncateUtf8(String(finding.selector), 300).text } : {}),
          ...(finding?.value !== undefined ? { value: finding.value } : {}),
          ...(finding?.detail !== undefined ? { detail: truncateUtf8(String(finding.detail), 300).text } : {}),
        }))
      : [],
  }))
}

/** Bound one audit viewport row for check.json. */
function boundViewports(rows) {
  if (!Array.isArray(rows)) return []
  return rows.slice(0, 8).map((row) => ({
    width: toInt(row?.width, 0),
    score: Number.isFinite(Number(row?.score)) ? Math.round(Number(row.score)) : 0,
    findings: Array.isArray(row?.findings)
      ? row.findings.slice(0, 20).map((finding) => ({
          code: String(finding?.code ?? ''),
          severity: String(finding?.severity ?? 'low'),
          message: truncateUtf8(String(finding?.message ?? ''), 300).text,
          fix: truncateUtf8(String(finding?.fix ?? ''), 300).text,
        }))
      : [],
  }))
}

/** Bound probe health for check.json. */
function boundHealth(health) {
  const source = isPlainObject(health) ? health : {}
  const list = (rows) =>
    (Array.isArray(rows) ? rows : []).slice(0, 20).map((row) => ({
      text: truncateUtf8(String(row?.text ?? row?.url ?? ''), 300).text,
      url: truncateUtf8(String(row?.url ?? ''), 300).text,
      ...(row?.status !== undefined ? { status: row.status } : {}),
      ...(row?.line !== undefined ? { line: row.line } : {}),
    }))
  return { consoleErrors: list(source.consoleErrors), failedRequests: list(source.failedRequests) }
}

/** Aggregate audit counts across variants. */
function addCounts(target, counts) {
  const source = isPlainObject(counts) ? counts : {}
  for (const key of ['critical', 'high', 'medium', 'low']) target[key] += toInt(source[key], 0)
  return target
}

/** Flatten category findings into one labelled list (bounded). */
function flattenFindings(categories) {
  const out = []
  for (const category of Array.isArray(categories) ? categories : []) {
    for (const finding of Array.isArray(category.findings) ? category.findings : []) {
      out.push({ category: category.id, ...finding })
    }
  }
  return out.slice(0, 120)
}

/** Collect the screenshot (and noise) paths for one variant from a probe result. */
async function screenshotsFor(store, projectId, probe, roundRel, variantId) {
  const pages = Array.isArray(probe?.pages) ? probe.pages : []
  const rows = []
  for (const page of pages) {
    if (!page || typeof page.screenshot !== 'string') continue
    const width = toInt(page.width, 0)
    const row = { width, path: `${roundRel}/${variantId}/${page.screenshot}` }
    let noise = typeof page.noise === 'string' ? page.noise : ''
    if (noise.length === 0) {
      const candidate = `noise-${width}.png`
      const info = await store.statFile(projectId, `${roundRel}/${variantId}/${candidate}`)
      if (info) noise = candidate
    }
    if (noise.length > 0) row.noise = `${roundRel}/${variantId}/${noise}`
    rows.push(row)
  }
  return rows
}

/** Merge probe screens with the audit's per-screen rows. */
function screensFor(probe, audit, roundRel, variantId) {
  const screens = []
  const auditScreens = Array.isArray(audit?.screens) ? audit.screens : []
  for (const [index, screen] of (Array.isArray(probe?.screens) ? probe.screens : []).entries()) {
    const auditRow = auditScreens[index] ?? {}
    screens.push({
      label: String(screen?.label ?? auditRow?.label ?? `screen ${index + 1}`),
      index: toInt(screen?.index, index + 1),
      ...(typeof screen?.screenshot === 'string' ? { path: `${roundRel}/${variantId}/${screen.screenshot}` } : {}),
      score: Number.isFinite(Number(auditRow?.score)) ? Math.round(Number(auditRow.score)) : null,
      findings: Array.isArray(auditRow?.findings) ? auditRow.findings.slice(0, 10) : [],
    })
  }
  return screens
}

/** Resolve the origin of an optional webServer-like object. */
function originOf(webServer) {
  try {
    const origin = webServer?.getOrigin?.()
    if (typeof origin === 'string' && origin.length > 0) return origin.replace(/\/+$/u, '')
  } catch {
    /* not bound yet */
  }
  const port = Number(webServer?.port)
  if (Number.isFinite(port) && port > 0) return `http://127.0.0.1:${port}`
  return ''
}

/** Copy a folder if it exists; returns false when the source is missing. */
async function copyTreeIfExists(source, destination) {
  let info = null
  try {
    info = await stat(source)
  } catch {
    return false
  }
  if (!info.isDirectory()) return false
  await rm(destination, { recursive: true, force: true })
  await cp(source, destination, { recursive: true, force: true })
  return true
}

/** Count files under a folder (bounded), for version records. */
async function countFiles(dir, budget = 2000) {
  let total = 0
  let entries = []
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    if (total >= budget) break
    if (entry.isDirectory()) total += await countFiles(join(dir, entry.name), budget - total)
    else total += 1
  }
  return total
}

/**
 * Create the service.
 * @param {{
 *   store: object,
 *   pool: object,
 *   config?: object,
 *   log?: {warn?: Function, info?: Function},
 *   deps?: {probeDesign?: Function, auditDesign?: Function, exportDesign?: Function, tokens?: object, scaffolds?: object, preview?: object},
 * }} options
 */
export function createService({ store, pool, config, log, deps } = {}) {
  if (!store || typeof store.readProject !== 'function') throw new Error('the service needs a project store')
  const overrides = isPlainObject(deps) ? deps : {}
  const D = {
    probeDesign: typeof overrides.probeDesign === 'function' ? overrides.probeDesign : realProbeDesign,
    auditDesign: typeof overrides.auditDesign === 'function' ? overrides.auditDesign : realAuditDesign,
    exportDesign: typeof overrides.exportDesign === 'function' ? overrides.exportDesign : realExportDesign,
    tokens: isPlainObject(overrides.tokens) ? overrides.tokens : tokenModule,
    scaffolds: isPlainObject(overrides.scaffolds) ? overrides.scaffolds : scaffoldModule,
    preview: isPlainObject(overrides.preview)
      ? overrides.preview
      : { startPreview: previewModule.startPreview, closeAllPreviews: previewModule.closeAllPreviews },
  }
  const jobs = createJobs({ log })
  /** Loopback preview servers started as a fallback (projectId → server). */
  const previews = new Map()
  let webServer = null

  const warn = (message) => {
    try {
      log?.warn?.(message)
    } catch {
      /* logging never breaks a service call */
    }
  }

  /** Read a project or throw `not_found`/`invalid_input`. */
  async function mustGet(projectId) {
    if (typeof projectId !== 'string' || projectId.trim().length === 0) {
      throw fail('invalid_input', 'projectId is required', repair('list-projects', 'List projects', 'Call design_projects with action="list" to see ids.'))
    }
    const project = await store.readProject(projectId.trim())
    if (!project) {
      throw fail('not_found', `project ${JSON.stringify(projectId)} does not exist`, repair('list-projects', 'Use an existing project id', 'Call design_projects with action="list" to see ids.'))
    }
    return project
  }

  /** The latest per-variant scores from the last check summary. */
  function variantScores(project) {
    const scores = new Map()
    const checks = Array.isArray(project.checks) ? project.checks : []
    const last = checks.length > 0 ? checks[checks.length - 1] : null
    for (const row of Array.isArray(last?.variants) ? last.variants : []) {
      if (row && typeof row.variant === 'string') scores.set(row.variant, Number.isFinite(Number(row.score)) ? Math.round(Number(row.score)) : null)
    }
    return scores
  }

  /** Every design variant of one project, sorted by file name. */
  async function listVariantsInternal(project) {
    const rows = await store.listDir(project.id, 'design')
    const scores = variantScores(project)
    const labels = isPlainObject(project.variantLabels) ? project.variantLabels : DEFAULT_VARIANT_LABELS
    const variants = []
    for (const row of rows) {
      if (!/\.html$/iu.test(row.name)) continue
      const id = row.name.replace(/\.html$/iu, '')
      if (!VARIANT_PATTERN.test(id)) continue
      variants.push({
        id,
        file: `design/${row.name}`,
        label: typeof labels[id] === 'string' && labels[id].length > 0 ? labels[id] : id.toUpperCase(),
        bytes: row.size,
        mtime: row.mtime,
        selected: false,
        score: scores.get(id) ?? null,
      })
    }
    return variants
  }

  /** Resolve the requested variant (or the first one), throwing `not_found`. */
  async function resolveVariant(project, variant) {
    const variants = await listVariantsInternal(project)
    if (variants.length === 0) {
      throw fail(
        'not_found',
        'this project has no design HTML yet',
        repair('write-variant', 'Write design/a.html', `Write the first variant to ${store.projectPaths(project.id).design}${process.platform === 'win32' ? '\\' : '/'}a.html, or call design_start with scaffold enabled.`),
      )
    }
    if (variant === undefined || variant === null || variant === '') return { variant: variants[0], variants }
    const id = normalizeVariantId(variant)
    if (!id) throw fail('invalid_input', `not a variant id: ${JSON.stringify(variant)}`, repair('choose-variant', 'Use a variant id', `Available: ${variants.map((item) => item.id).join(', ')}`))
    const found = variants.find((item) => item.id === id)
    if (!found) {
      throw fail('not_found', `variant ${JSON.stringify(id)} does not exist`, repair('choose-variant', 'Use an existing variant', `Available: ${variants.map((item) => item.id).join(', ')}`))
    }
    return { variant: found, variants }
  }

  /** Next check round: one past the newest record or round folder. */
  async function nextRoundFor(project) {
    let max = 0
    for (const row of Array.isArray(project.checks) ? project.checks : []) {
      const round = toInt(row?.round, 0)
      if (round > max) max = round
    }
    try {
      const entries = await readdir(store.projectPaths(project.id).checks, { withFileTypes: true })
      for (const entry of entries) {
        const match = /^round-(\d+)$/u.exec(entry.name)
        if (match && entry.isDirectory()) max = Math.max(max, toInt(match[1], 0))
      }
    } catch {
      /* checks folder may not exist yet */
    }
    return max + 1
  }

  /** Browser availability for the panel (never throws). */
  async function browserStatus() {
    try {
      const status = await pool?.status?.()
      if (isPlainObject(status)) {
        return { available: status.available === true, product: String(status.product ?? ''), path: String(status.path ?? '') }
      }
    } catch (error) {
      warn(`browser status failed: ${messageOf(error)}`)
    }
    return { available: false, product: '', path: '' }
  }

  /** Append one entry to the project's bounded panel-save history. */
  function pushHistory(project, entry) {
    const history = Array.isArray(project.history) ? project.history : []
    history.push(entry)
    let kept = history
    if (kept.length > LIMITS.maxHistory) kept = kept.slice(kept.length - LIMITS.maxHistory)
    const perFile = new Map()
    const pruned = []
    const newestFirst = [...kept].reverse()
    const survivors = []
    for (const row of newestFirst) {
      const file = String(row?.file ?? '')
      const count = perFile.get(file) ?? 0
      if (count >= HISTORY_PER_FILE) {
        pruned.push(row)
        continue
      }
      perFile.set(file, count + 1)
      survivors.push(row)
    }
    project.history = survivors.reverse()
    return pruned
  }

  /** Delete snapshot files that fell out of the history record (best effort). */
  async function cleanupHistory(projectId, rows) {
    for (const row of rows) {
      if (row && typeof row.snapshot === 'string') await store.deleteFile(projectId, row.snapshot).catch(() => {})
    }
  }

  /** The URL of an export file: panel download URL when a web server exists. */
  function exportUrl(projectId, file) {
    const origin = originOf(webServer)
    if (origin) return `${origin}${ROUTE_PREFIX}/api/projects/${encodeURIComponent(projectId)}/export-file?path=${encodeURIComponent(file)}`
    return join(store.projectPaths(projectId).root, file)
  }

  /**
   * Refresh the generated DESIGN.md after an intake/brief change, but never
   * overwrite a hand-edited document (the generated file starts with the standard
   * `# <name> — design system` header).
   */
  async function refreshDesignDoc(projectId) {
    const project = await store.readProject(projectId)
    if (!project) return
    let current = null
    try {
      current = await store.readText(projectId, 'system/DESIGN.md', null)
    } catch {
      current = null
    }
    if (current !== null && !isGeneratedDesignDoc(current)) return
    await store.writeFile(projectId, 'system/DESIGN.md', designDocFor(project))
  }

  /** Merge and persist an intake patch (FLOW §2.4). */
  async function saveIntakePatch(project, patch, options = {}) {
    if (!isPlainObject(patch)) {
      throw fail(
        'invalid_input',
        'intake must be an object',
        repair('fix-intake', 'Pass an intake object', 'Use design_intake (or GET /api/intake/questions) for the field list; example: {"goal":"做一个落地页","audience":"潜在客户"}'),
      )
    }
    const current = normalizeIntake(project.intake)
    const merged = mergeIntake(current, patch)
    const requested = [options.source, patch.source].find((value) => value === 'wizard' || value === 'agent' || value === 'mixed')
    if (requested) {
      merged.source = current.source && current.source !== requested ? 'mixed' : requested
    } else if (!merged.source) {
      merged.source = 'agent'
    }
    const completeness = intakeCompleteness(merged)
    if (!merged.completedAt && completeness.score >= 80) merged.completedAt = nowIso()
    await store.updateProject(project.id, (row) => {
      row.intake = merged
    })
    await refreshDesignDoc(project.id).catch(() => {})
    return { intake: merged, filled: completeness.filled, missing: completeness.missing, score: completeness.score }
  }

  /** The internal check implementation (runs inside the job). */
  async function runCheck({ projectId, variant, widths, signal, progress }) {
    throwIfAborted(signal)
    const project = await mustGet(projectId)
    const all = await listVariantsInternal(project)
    if (all.length === 0) {
      throw fail('not_found', 'this project has no design HTML to check', repair('write-variant', 'Write design/a.html', `Write a self-contained HTML design into ${store.projectPaths(projectId).design} and run the check again.`))
    }
    let targets
    if (variant === undefined || variant === null || variant === '' || variant === 'all') {
      targets = all
    } else {
      const id = normalizeVariantId(variant)
      const found = id ? all.find((item) => item.id === id) : null
      if (!found) throw fail('not_found', `variant ${JSON.stringify(variant)} does not exist`, repair('choose-variant', 'Use an existing variant', `Available: ${all.map((item) => item.id).join(', ')}`))
      targets = [found]
    }
    const widthList = normalizeViewports(Array.isArray(widths) && widths.length > 0 ? widths : project.viewports, project.kind)
    const systemTokens = await store.readJson(projectId, 'system/tokens.json', null)
    const round = await nextRoundFor(project)
    const roundRel = `checks/round-${round}`
    const checksDir = store.projectPaths(projectId).checks
    const startedAt = Date.now()
    const variantRows = []
    const totals = { critical: 0, high: 0, medium: 0, low: 0 }

    for (const target of targets) {
      throwIfAborted(signal)
      progress(`probe ${target.id} · ${widthList.join('/')} px`)
      const previewInfo = await service.preview(projectId, target.id)
      const dirAbs = join(checksDir, `round-${round}`, target.id)
      await ensureDir(dirAbs)
      const probe = await D.probeDesign({
        pool,
        url: previewInfo.url,
        widths: widthList,
        kind: project.kind,
        dir: dirAbs,
        screens: project.kind === 'deck',
        log: (message) => warn(String(message ?? '')),
        signal,
        onProgress: (value) => progress(value),
      })
      throwIfAborted(signal)
      if (!probe || probe.ok !== true) {
        throw fail('failed', `the probe returned no result for variant ${target.id}`, repair('retry', 'Run the check again', 'If it keeps failing, open the project preview in a browser and run design_projects action="get" for diagnostics.'))
      }
      progress(`audit ${target.id}`)
      const audit = await D.auditDesign({
        pages: Array.isArray(probe.pages) ? probe.pages : [],
        screens: Array.isArray(probe.screens) ? probe.screens : [],
        system: systemTokens,
        kind: project.kind,
        viewports: widthList,
        health: probe.health ?? {},
      })
      if (!audit || !Number.isFinite(Number(audit.score))) {
        throw fail('failed', `the audit returned no score for variant ${target.id}`, repair('retry', 'Run the check again', 'The audit module must return a numeric score.'))
      }
      const score = Math.max(0, Math.min(100, Math.round(Number(audit.score))))
      const counts = isPlainObject(audit.counts) ? audit.counts : {}
      addCounts(totals, counts)
      const categories = boundCategories(audit.categories)
      const viewports = boundViewports(audit.viewports)
      variantRows.push({
        variant: target.id,
        file: target.file,
        score,
        grade: typeof audit.grade === 'string' ? audit.grade : gradeForScore(score),
        pass: audit.pass === true || score >= 90,
        categories,
        viewports,
        findings: flattenFindings(categories),
        counts: {
          critical: toInt(counts.critical, 0),
          high: toInt(counts.high, 0),
          medium: toInt(counts.medium, 0),
          low: toInt(counts.low, 0),
        },
        screenshots: await screenshotsFor(store, projectId, probe, roundRel, target.id),
        screens: screensFor(probe, audit, roundRel, target.id),
        health: boundHealth(probe.health),
        capturedAt: typeof probe.capturedAt === 'string' ? probe.capturedAt : nowIso(),
      })
    }

    const combined = variantRows.length > 0 ? Math.round(variantRows.reduce((sum, row) => sum + row.score, 0) / variantRows.length) : 0
    const issues = totals.critical + totals.high + totals.medium + totals.low
    const durationMs = Date.now() - startedAt
    const record = {
      round,
      at: nowIso(),
      projectId,
      variant: variant === undefined || variant === null || variant === '' ? 'all' : String(variant),
      requestedWidths: widthList,
      score: combined,
      grade: gradeForScore(combined),
      pass: combined >= 90,
      durationMs,
      counts: { ...totals },
      issues,
      variants: variantRows,
    }
    await store.writeJson(projectId, `${roundRel}/check.json`, record)

    const best = Math.max(toInt(project.bestScore, 0), combined)
    await store.updateProject(projectId, (current) => {
      const checks = Array.isArray(current.checks) ? current.checks : []
      checks.push({
        round,
        at: record.at,
        score: combined,
        grade: record.grade,
        variants: variantRows.map((row) => ({ variant: row.variant, score: row.score, grade: row.grade })),
        issues,
      })
      current.checks = checks.length > LIMITS.maxChecks ? checks.slice(checks.length - LIMITS.maxChecks) : checks
      current.bestScore = best
      current.status = best >= 90 ? 'ready' : 'checked'
    })
    progress(`done · ${combined} ${record.grade}`)
    return {
      round,
      score: combined,
      grade: record.grade,
      pass: record.pass,
      variants: variantRows.map((row) => ({
        variant: row.variant,
        score: row.score,
        grade: row.grade,
        counts: row.counts,
        screenshots: row.screenshots.length,
      })),
      counts: record.counts,
      issues,
      durationMs,
      dir: roundRel,
    }
  }

  /** The internal export implementation (writes under exports/ then records it). */
  async function runExport({ projectId, kind, variant }) {
    const project = await mustGet(projectId)
    const exportKind = typeof kind === 'string' ? kind.trim().toLowerCase() : ''
    if (!EXPORT_KINDS.includes(exportKind)) {
      throw fail('invalid_input', `unsupported export kind: ${JSON.stringify(kind)}`, repair('choose-export', 'Use html, zip, pdf, png or pptx', 'Example: {"projectId":"…","kind":"zip","variant":"a"}'))
    }
    const { variant: target } = await resolveVariant(project, variant ?? '')
    const previewInfo = await service.preview(projectId, target.id)
    const paths = store.projectPaths(projectId)
    const result = await D.exportDesign({
      project,
      projectPaths: paths,
      variant: target.id,
      kind: exportKind,
      pool,
      previewUrl: previewInfo.url,
      viewports: project.viewports,
      log,
    })
    if (!isPlainObject(result) || typeof result.file !== 'string' || result.file.length === 0) {
      throw fail('failed', 'the exporter returned no file', repair('retry', 'Try the export again', 'The export module must return {file, bytes, mime}.'))
    }
    const file = result.file.replace(/\\/gu, '/')
    const bytes = Number(result.bytes)
    const record = { kind: exportKind, at: nowIso(), file, bytes: Number.isFinite(bytes) && bytes >= 0 ? bytes : 0 }
    await store.updateProject(projectId, (current) => {
      const exports = Array.isArray(current.exports) ? current.exports : []
      exports.push(record)
      current.exports = exports.slice(-100)
    })
    return { export: { ...record, url: exportUrl(projectId, file) } }
  }

  /** The service object. */
  const service = {
    store,
    jobs,

    /** Ensure the store root exists. */
    async init() {
      await store.init()
      return service
    },

    /** Attach the optional webServer so preview URLs stay same-origin. */
    setWebServer(next) {
      webServer = next ?? null
      return service
    },

    /** The current webServer origin ('' when headless). */
    origin() {
      return originOf(webServer)
    },

    /** Pointers to every folder of one project (absolute paths). */
    paths(projectId) {
      return store.projectPaths(projectId)
    },

    /** High-level state for the panel header. */
    async overview() {
      const projects = await store.listProjects()
      let checked = 0
      let ready = 0
      for (const project of projects) {
        const rounds = Array.isArray(project.checks) ? project.checks.length : 0
        if (rounds > 0 || project.status === 'checked' || project.status === 'ready') checked += 1
        if (project.status === 'ready' || (Number.isFinite(Number(project.bestScore)) && Number(project.bestScore) >= 90)) ready += 1
      }
      return {
        version: SERVICE_VERSION,
        dataDir: store.dataDir,
        browser: await browserStatus(),
        counts: { projects: projects.length, checked, ready },
      }
    },

    /** Light rows for the project list. */
    async listProjects() {
      const projects = await store.listProjects()
      const rows = []
      for (const project of projects) {
        const variants = await listVariantsInternal(project)
        const checks = Array.isArray(project.checks) ? project.checks : []
        const last = checks.length > 0 ? checks[checks.length - 1] : null
        rows.push({
          id: project.id,
          name: project.name,
          kind: project.kind,
          status: project.status,
          bestScore: Number.isFinite(Number(project.bestScore)) ? Math.round(Number(project.bestScore)) : null,
          lastScore: Number.isFinite(Number(last?.score)) ? Math.round(Number(last.score)) : null,
          updatedAt: project.updatedAt,
          variants: variants.length,
          variantIds: variants.map((item) => item.id),
          comments: Array.isArray(project.comments) ? project.comments.length : 0,
          intake: intakeCompleteness(project.intake),
        })
      }
      return rows
    },

    /** Create a project, seed DESIGN.md and optionally design/a.html. */
    async createProject(input) {
      const raw = isPlainObject(input) ? input : {}
      const intake = normalizeIntake(raw.intake)
      if (raw.intake !== undefined && !isPlainObject(raw.intake)) {
        throw fail('invalid_input', 'intake must be an object', repair('fix-intake', 'Pass an intake object', 'Use design_intake (or GET /api/intake/questions) for the field list, then pass the answers as {"intake":{…}}.'))
      }
      const requestedKind = typeof raw.kind === 'string' && raw.kind.length > 0 ? raw.kind : intake.kind || 'web'
      const kind = requestedKind
      if (!KINDS.includes(kind)) {
        throw fail('invalid_input', `unsupported project kind: ${JSON.stringify(raw.kind)}`, repair('choose-kind', 'Use web, mobile, deck, poster or doc', `Supported kinds: ${KINDS.join(', ')}`))
      }
      const projects = await store.listProjects()
      if (projects.length >= LIMITS.maxProjects) {
        throw fail('too_large', `the store already holds ${LIMITS.maxProjects} projects`, repair('delete-project', 'Delete a project first', 'Call design_projects with action="delete" for a project you no longer need.'))
      }
      const brief = isPlainObject(raw.brief)
        ? {
            goal: truncateUtf8(String(raw.brief.goal ?? ''), 2000).text,
            audience: truncateUtf8(String(raw.brief.audience ?? ''), 2000).text,
            layout: truncateUtf8(String(raw.brief.layout ?? ''), 2000).text,
            content: truncateUtf8(String(raw.brief.content ?? ''), 4000).text,
            constraints: truncateUtf8(String(raw.brief.constraints ?? ''), 2000).text,
          }
        : { goal: typeof raw.brief === 'string' ? truncateUtf8(raw.brief, 4000).text : '', audience: '', layout: '', content: '', constraints: '' }
      // A wizard intake also feeds the brief when the caller did not fill it.
      if (!brief.goal && intake.goal) brief.goal = intake.goal
      if (!brief.audience && intake.audience) brief.audience = intake.audience
      if (!brief.constraints && intake.brandConstraints) brief.constraints = intake.brandConstraints
      if (!brief.content && intake.contentMust) brief.content = intake.contentMust
      const completeness = intakeCompleteness(intake)
      if (!intake.completedAt && completeness.score >= 80) intake.completedAt = nowIso()
      const id = newProjectId()
      const at = nowIso()
      const name = typeof raw.name === 'string' && raw.name.trim().length > 0 ? truncateUtf8(raw.name.trim(), 240).text : '未命名设计'
      const project = {
        schemaVersion: SCHEMA_VERSION,
        id,
        name,
        kind,
        brief,
        intake,
        viewports: normalizeViewports(raw.viewports, kind),
        createdAt: at,
        updatedAt: at,
        status: 'draft',
        system: null,
        context: [],
        checks: [],
        bestScore: null,
        variantLabels: { ...DEFAULT_VARIANT_LABELS },
        comments: [],
        versions: [],
        exports: [],
        history: [],
      }
      const created = await store.createProject(project)
      await store.writeFile(id, 'system/DESIGN.md', designDocFor(project))
      if (raw.scaffold !== false) {
        const scaffoldId = scaffoldIdForKind(kind)
        let content = null
        try {
          content = typeof D.scaffolds.scaffoldContent === 'function' ? D.scaffolds.scaffoldContent(scaffoldId) : null
        } catch (error) {
          warn(`scaffold ${scaffoldId} failed: ${messageOf(error)}`)
        }
        if (typeof content !== 'string' || content.trim().length === 0) content = fallbackVariantHtml(project)
        await store.writeFile(id, 'design/a.html', content)
      }
      if (isPlainObject(raw.system)) {
        try {
          await service.setSystem(id, raw.system)
        } catch (error) {
          warn(`could not import the project system: ${messageOf(error)}`)
        }
      }
      return store.readProject(id) ?? created
    },

    /** Validate and persist the five brief fields (UX-MAP §5.2/§6). */
    async updateBrief(projectId, brief) {
      await mustGet(projectId)
      const updated = await store.updateProject(projectId, (project) => {
        project.brief = mergeBriefPatch(project.brief, brief)
      })
      return updated.brief
    },

    /** Merge and persist intake answers (FLOW §2.3/§2.4). */
    async saveIntake(projectId, patch, options = {}) {
      const project = await mustGet(projectId)
      return saveIntakePatch(project, patch, isPlainObject(options) ? options : {})
    },

    /** The canonical intake question bank shared by the wizard and the agent. */
    intakeQuestions() {
      return { groups: INTAKE_QUESTIONS, questions: intakeQuestionList() }
    },

    /** Everything the workspace needs for one project. */
    async projectDetail(projectId) {
      const project = await mustGet(projectId)
      const variants = await listVariantsInternal(project)
      const system = await service.getSystem(projectId)
      const comments = Array.isArray(project.comments) ? project.comments : []
      const checks = Array.isArray(project.checks) ? project.checks : []
      return {
        project,
        variants,
        system,
        comments,
        checks,
        latestCheck: checks.length > 0 ? checks[checks.length - 1] : null,
        versions: Array.isArray(project.versions) ? project.versions : [],
        exports: Array.isArray(project.exports) ? project.exports : [],
        job: jobs.latestFor(projectId) ?? null,
        browser: await browserStatus(),
      }
    },

    /** Rename one project. */
    async renameProject(projectId, name) {
      await mustGet(projectId)
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw fail('invalid_input', 'name is required', repair('retry', 'Pass a name', 'Example: {"name":"运营仪表盘"}'))
      }
      const updated = await store.updateProject(projectId, (project) => {
        project.name = truncateUtf8(name.trim(), 240).text
      })
      return updated
    },

    /** Delete a project, its jobs and any loopback preview. */
    async deleteProject(projectId) {
      await mustGet(projectId)
      const running = jobs.runningIdFor(projectId)
      if (running) jobs.cancel(running)
      const previewEntry = previews.get(projectId)
      if (previewEntry) {
        previews.delete(projectId)
        await disposePreviewEntry(previewEntry)
      }
      const removed = await store.deleteProject(projectId)
      if (!removed) throw fail('not_found', `project ${JSON.stringify(projectId)} does not exist`, repair('list-projects', 'List projects', 'Call design_projects with action="list".'))
      return { id: projectId, removed: true }
    },

    /** Read the design system meta + tokens + DESIGN.md. */
    async getSystem(projectId) {
      const project = await mustGet(projectId)
      return {
        system: project.system ?? null,
        tokens: await store.readJson(projectId, 'system/tokens.json', null),
        doc: await store.readText(projectId, 'system/DESIGN.md', ''),
      }
    },

    /** Write tokens and/or DESIGN.md and update project.system. */
    async setSystem(projectId, input) {
      const project = await mustGet(projectId)
      const raw = isPlainObject(input) ? input : {}
      if (raw.tokens === undefined && raw.doc === undefined) {
        throw fail('invalid_input', 'tokens or doc is required', repair('retry', 'Pass tokens and/or doc', 'Example: {"projectId":"…","tokens":{"name":"品牌","color":{"ink":"#1a1a1a"}}}'))
      }
      let tokens = null
      if (raw.tokens !== undefined && raw.tokens !== null) {
        let candidate = raw.tokens
        if (typeof candidate === 'string') {
          try {
            candidate = JSON.parse(candidate)
          } catch (error) {
            throw fail('invalid_input', `tokens is not valid JSON: ${messageOf(error)}`, repair('fix-tokens', 'Fix the tokens JSON', 'Pass one JSON object with name/color/font/size/space/radius/layout keys.'))
          }
        }
        if (!isPlainObject(candidate)) {
          throw fail('invalid_input', 'tokens must be an object', repair('fix-tokens', 'Fix the tokens JSON', 'Example: {"name":"品牌","color":{"ink":"#1a1a1a"}}'))
        }
        tokens = typeof D.tokens.normalizeTokens === 'function' ? D.tokens.normalizeTokens(candidate) : candidate
        if (!isPlainObject(tokens)) {
          throw fail('invalid_input', 'the token normaliser returned no object', repair('retry', 'Try again', 'Pass a plain JSON object as tokens.'))
        }
        await store.writeJson(projectId, 'system/tokens.json', tokens)
      }
      let doc = null
      if (typeof raw.doc === 'string') {
        doc = truncateUtf8(raw.doc, 256 * 1024).text
        await store.writeFile(projectId, 'system/DESIGN.md', doc)
      }
      const source = isPlainObject(raw.source)
        ? {
            kind: ['manual', 'url', 'repo', 'image', 'preset'].includes(raw.source.kind) ? raw.source.kind : 'manual',
            ref: typeof raw.source.ref === 'string' ? truncateUtf8(raw.source.ref, 1000).text : '',
            at: nowIso(),
          }
        : { kind: 'manual', ref: '', at: nowIso() }
      const meta = {
        name: typeof tokens?.name === 'string' && tokens.name.length > 0 ? truncateUtf8(tokens.name, 120).text : typeof project.system?.name === 'string' ? project.system.name : 'design-system',
        source,
        tokensPath: 'system/tokens.json',
        docPath: 'system/DESIGN.md',
        updatedAt: nowIso(),
      }
      await store.updateProject(projectId, (current) => {
        current.system = meta
      })
      return {
        system: meta,
        tokens: tokens ?? (await store.readJson(projectId, 'system/tokens.json', null)),
        doc: doc ?? (await store.readText(projectId, 'system/DESIGN.md', '')),
      }
    },

    /** Import context from a URL, a repo path, an image or a note. */
    async importContext(projectId, input) {
      const project = await mustGet(projectId)
      const raw = isPlainObject(input) ? input : {}
      const kind = typeof raw.kind === 'string' ? raw.kind : ''
      if (!['url', 'path', 'image', 'text'].includes(kind)) {
        throw fail('invalid_input', `unsupported context kind: ${JSON.stringify(raw.kind)}`, repair('choose-context', 'Use url, path, image or text', 'Example: {"projectId":"…","kind":"url","value":"https://example.com"}'))
      }
      const value = typeof raw.value === 'string' ? raw.value.trim() : ''
      if (value.length === 0) {
        throw fail('invalid_input', 'value is required', repair('retry', 'Pass a value', 'url → an http(s) URL; path → an absolute folder; image → an absolute PNG/JPEG or a data: URL; text → the note.'))
      }
      const note = typeof raw.note === 'string' ? truncateUtf8(raw.note, 500).text : ''
      const evidenceFiles = []
      let tokens = null
      let summary = ''
      if (kind === 'url') {
        let parsed = null
        try {
          parsed = new URL(value)
        } catch {
          throw fail('invalid_input', `not a valid URL: ${JSON.stringify(value)}`, repair('fix-url', 'Pass an http(s) URL', 'Example: {"kind":"url","value":"https://example.com/pricing"}'))
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw fail('invalid_input', 'only http(s) URLs can be imported', repair('fix-url', 'Use an http(s) URL', 'Example: {"kind":"url","value":"https://example.com"}'))
        }
        if (typeof D.tokens.tokensFromUrl !== 'function') throw fail('not_ready', 'token extraction from a URL is unavailable', repair('retry', 'Try again later', 'The design-token scanner is not ready.'))
        tokens = await D.tokens.tokensFromUrl({ pool, url: parsed.toString() })
        summary = `URL ${parsed.toString()} → ${tokenSummary(tokens)}`
      } else if (kind === 'path') {
        if (typeof D.tokens.scanRepo !== 'function') throw fail('not_ready', 'repository scanning is unavailable', repair('retry', 'Try again later', 'The design-token scanner is not ready.'))
        const scanned = await D.tokens.scanRepo(value, { maxFiles: LIMITS.maxRepoFiles })
        tokens = scanned?.tokens ?? scanned ?? null
        for (const file of Array.isArray(scanned?.files) ? scanned.files.slice(0, 40) : []) {
          evidenceFiles.push(typeof file === 'string' ? file : String(file?.path ?? ''))
        }
        summary = `Repo ${value} → ${tokenSummary(tokens)}`
      } else if (kind === 'image') {
        const image = await readImageInput(projectId, value)
        if (typeof D.tokens.tokensFromImageBuffer !== 'function') throw fail('not_ready', 'image palette extraction is unavailable', repair('retry', 'Try again later', 'The design-token scanner is not ready.'))
        tokens = await D.tokens.tokensFromImageBuffer(image.buffer)
        evidenceFiles.push(image.file)
        summary = `Image ${image.file} → ${tokenSummary(tokens)}`
      } else {
        summary = note.length > 0 ? note : value
        summary = `Note: ${truncateUtf8(summary, 600).text}`
      }
      const record = {
        id: uniqueId('ev'),
        kind,
        ref: truncateUtf8(value, 2000).text,
        at: nowIso(),
        note,
        summary: truncateUtf8(summary, 600).text,
        files: evidenceFiles.filter((file) => file.length > 0),
      }
      const evidence = await store.readJson(projectId, 'context/evidence.json', [])
      const rows = Array.isArray(evidence) ? evidence : []
      rows.push(record)
      const bounded = rows.slice(-CONTEXT_LIMIT)
      await store.writeJson(projectId, 'context/evidence.json', bounded)
      await store.updateProject(projectId, (current) => {
        const context = Array.isArray(current.context) ? current.context : []
        context.push(record)
        current.context = context.slice(-CONTEXT_LIMIT)
      })
      let system = null
      if (tokens && raw.adoptSystem === true) {
        const adopted = await service.setSystem(projectId, {
          tokens,
          source: { kind: kind === 'url' ? 'url' : kind === 'path' ? 'repo' : kind === 'image' ? 'image' : 'manual', ref: value },
        })
        system = adopted.system
      }
      return { evidence: record, tokens, system }
    },

    /** Every design variant of one project. */
    async listVariants(projectId) {
      const project = await mustGet(projectId)
      return listVariantsInternal(project)
    },

    /** Save one design HTML file, snapshotting the previous content first. */
    async saveVariant(projectId, input) {
      const project = await mustGet(projectId)
      const raw = isPlainObject(input) ? input : {}
      const variant = normalizeVariantId(raw.variant)
      if (!variant) {
        throw fail('invalid_input', `not a variant id: ${JSON.stringify(raw.variant)}`, repair('choose-variant', 'Use a letter or short name', 'Example: {"variant":"a","html":"<!DOCTYPE html>…"}'))
      }
      if (typeof raw.html !== 'string' || raw.html.trim().length === 0) {
        throw fail('invalid_input', 'html is required', repair('retry', 'Pass the full HTML document', 'Example: {"variant":"a","html":"<!DOCTYPE html><html>…"}'))
      }
      const bytes = byteLength(raw.html)
      if (bytes > LIMITS.maxDesignBytes) {
        throw fail('too_large', `the design file is ${bytes} bytes (max ${LIMITS.maxDesignBytes})`, repair('shrink', 'Shrink the design file', 'Inline assets must stay under 4 MiB; move large images into design/assets/ and reference them by relative path.'))
      }
      const rel = `design/${variant}.html`
      const previous = await store.readText(projectId, rel, null)
      let snapshot = null
      if (typeof previous === 'string' && previous !== raw.html) {
        const stamp = new Date().toISOString().replace(/[-:.TZ]/gu, '').slice(0, 14)
        const snapshotRel = `history/${variant}-${stamp}-${uniqueId('h')}.html`
        await store.writeFile(projectId, snapshotRel, previous)
        snapshot = { file: rel, at: nowIso(), snapshot: snapshotRel }
      }
      await store.writeFile(projectId, rel, raw.html)
      let pruned = []
      await store.updateProject(projectId, (current) => {
        if (snapshot) pruned = pushHistory(current, snapshot)
        current.status = 'designed'
      })
      await cleanupHistory(projectId, pruned)
      return { file: rel, bytes, history: snapshot ? 1 : 0 }
    },

    /** Start a quality-check job for one variant or all of them. */
    startCheck(projectId, options = {}) {
      const spec = isPlainObject(options) ? options : {}
      const variant = spec.variant === undefined || spec.variant === null ? 'all' : spec.variant
      const widths = Array.isArray(spec.widths) ? spec.widths : undefined
      return jobs.start(
        { projectId: String(projectId ?? ''), kind: 'check', label: '设计质检', timeoutMs: LIMITS.jobTimeoutMs },
        async ({ signal, progress }) => runCheck({ projectId, variant, widths, signal, progress }),
      )
    },

    /** The newest check summary row, or null. */
    async latestCheck(projectId) {
      const project = await mustGet(projectId)
      const checks = Array.isArray(project.checks) ? project.checks : []
      return checks.length > 0 ? checks[checks.length - 1] : null
    },

    /** Every check summary row, oldest first. */
    async listChecks(projectId) {
      const project = await mustGet(projectId)
      return Array.isArray(project.checks) ? project.checks : []
    },

    /** One full check record from `checks/round-N/check.json`. */
    async checkRound(projectId, round) {
      await mustGet(projectId)
      const n = toInt(round, 0)
      if (n < 1 || n > 100000) {
        throw fail('invalid_input', `not a check round: ${JSON.stringify(round)}`, repair('choose-round', 'Pass the round number', 'Read the round numbers from design_projects action="get".'))
      }
      const check = await store.readJson(projectId, `checks/round-${n}/check.json`, null)
      if (!check) {
        throw fail('not_found', `check round ${n} does not exist`, repair('run-check', 'Run a check first', 'Call design_check to produce a new round.'))
      }
      return check
    },

    /** Export one variant and record the produced file. */
    async exportDesign(projectId, input) {
      const raw = isPlainObject(input) ? input : {}
      const kind = typeof raw.kind === 'string' ? raw.kind : String(raw.kind ?? '')
      if (kind.length === 0) {
        throw fail('invalid_input', 'kind is required', repair('choose-export', 'Choose an export format', 'Use one of: html, zip, pdf, png, pptx'))
      }
      const result = await runExport({ projectId, kind, variant: raw.variant })
      return result
    },

    /** Every recorded export. */
    async listExports(projectId) {
      const project = await mustGet(projectId)
      return Array.isArray(project.exports) ? project.exports : []
    },

    /** Add one inline comment and mirror it to comments.json. */
    async addComment(projectId, input) {
      const project = await mustGet(projectId)
      const raw = isPlainObject(input) ? input : {}
      const variant = normalizeVariantId(raw.variant)
      if (!variant) {
        throw fail('invalid_input', `not a variant id: ${JSON.stringify(raw.variant)}`, repair('choose-variant', 'Pass the variant the comment belongs to', 'Example: {"variant":"a","selector":"#hero","note":"标题太大"}'))
      }
      const variants = await listVariantsInternal(project)
      if (!variants.some((item) => item.id === variant)) {
        throw fail('not_found', `variant ${JSON.stringify(variant)} does not exist`, repair('choose-variant', 'Use an existing variant', `Available: ${variants.map((item) => item.id).join(', ')}`))
      }
      const selector = typeof raw.selector === 'string' ? truncateUtf8(raw.selector.trim(), 500).text : ''
      const note = typeof raw.note === 'string' ? truncateUtf8(raw.note.trim(), 2000).text : ''
      if (selector.length === 0 || note.length === 0) {
        throw fail('invalid_input', 'selector and note are required', repair('retry', 'Pass the element selector and the note', 'Example: {"variant":"a","selector":"#hero h1","note":"这里太挤了"}'))
      }
      const comments = Array.isArray(project.comments) ? project.comments : []
      if (comments.length >= LIMITS.maxComments) {
        throw fail('too_large', `this project already has ${LIMITS.maxComments} comments`, repair('resolve-comments', 'Resolve old comments', 'Resolve comments you no longer need, then add this one.'))
      }
      const comment = {
        id: uniqueId('c'),
        variant,
        selector,
        note,
        rect: normalizeRect(raw.rect),
        element: normalizeElement(raw.element),
        createdAt: nowIso(),
        resolvedAt: null,
        reply: '',
      }
      await store.updateProject(projectId, (current) => {
        const rows = Array.isArray(current.comments) ? current.comments : []
        rows.push(comment)
        current.comments = rows.slice(-LIMITS.maxComments)
      })
      await store.writeJson(projectId, 'comments.json', (await store.readProject(projectId))?.comments ?? [])
      return comment
    },

    /** Every comment of one project. */
    async listComments(projectId) {
      const project = await mustGet(projectId)
      if (Array.isArray(project.comments)) return project.comments
      const fallback = await store.readJson(projectId, 'comments.json', [])
      return Array.isArray(fallback) ? fallback : []
    },

    /** Mark one comment resolved and optionally reply. */
    async resolveComment(projectId, input) {
      const project = await mustGet(projectId)
      const raw = isPlainObject(input) ? input : {}
      const commentId = typeof raw.id === 'string' ? raw.id.trim() : ''
      if (commentId.length === 0) {
        throw fail('invalid_input', 'comment id is required', repair('list-comments', 'List the comments', 'Call design_comments with action="list" to see ids.'))
      }
      const reply = typeof raw.reply === 'string' ? truncateUtf8(raw.reply.trim(), 2000).text : ''
      let resolved = null
      await store.updateProject(projectId, (current) => {
        const rows = Array.isArray(current.comments) ? current.comments : []
        const comment = rows.find((row) => row.id === commentId)
        if (!comment) throw fail('not_found', `comment ${JSON.stringify(commentId)} does not exist`, repair('list-comments', 'List the comments', 'Call design_comments with action="list" to see ids.'))
        if (!comment.resolvedAt) comment.resolvedAt = nowIso()
        if (reply.length > 0) comment.reply = reply
        resolved = comment
      })
      await store.writeJson(projectId, 'comments.json', (await store.readProject(projectId))?.comments ?? [])
      return resolved
    },

    /** Read the TWEAK_DEFAULTS block of one design file. */
    async readTweak(projectId, file) {
      await mustGet(projectId)
      const target = tweakTarget(file)
      const html = await store.readText(projectId, `design/${target.name}`, null)
      if (html === null) {
        throw fail('not_found', `design/${target.name} does not exist`, repair('save-variant', 'Write that design file first', 'Call design_check or open the project in the panel to create it.'))
      }
      const parsed = parseTweakBlock(html)
      return { file: `design/${target.name}`, tweaks: parsed.tweaks }
    },

    /** Patch one key of the TWEAK_DEFAULTS block, keeping key order. */
    async patchTweak(projectId, input) {
      const project = await mustGet(projectId)
      const raw = isPlainObject(input) ? input : {}
      const target = tweakTarget(raw.file)
      const key = typeof raw.key === 'string' ? raw.key.trim() : ''
      if (key.length === 0 || key.length > 64) {
        throw fail('invalid_input', 'key is required', repair('retry', 'Pass the tweak key', 'Example: {"file":"a.html","key":"primaryColor","value":"#b4552f"}'))
      }
      if (raw.value === undefined) {
        throw fail('invalid_input', 'value is required', repair('retry', 'Pass the new value', 'Allowed values: string, number, boolean or null.'))
      }
      if (isPlainObject(raw.value) || Array.isArray(raw.value)) {
        throw fail('invalid_input', 'value must be a string, number, boolean or null', repair('retry', 'Pass a scalar value', 'Example: {"key":"radius","value":12}'))
      }
      const html = await store.readText(projectId, `design/${target.name}`, null)
      if (html === null) {
        throw fail('not_found', `design/${target.name} does not exist`, repair('save-variant', 'Write that design file first', 'Save the variant before tweaking it.'))
      }
      const parsed = parseTweakBlock(html)
      if (!parsed.found) {
        throw fail('invalid_input', 'this file has no TWEAK block', repair('add-tweak-block', 'Add the EDITMODE block', 'Wrap one JSON object in /*EDITMODE-BEGIN*/ … /*EDITMODE-END*/; the scaffold in design_start already provides it.'))
      }
      const tweaks = {}
      for (const existing of Object.keys(parsed.tweaks)) tweaks[existing] = parsed.tweaks[existing]
      const changed = Object.prototype.hasOwnProperty.call(tweaks, key) ? tweaks[key] !== raw.value : true
      tweaks[key] = raw.value
      const next = replaceTweakBlock(html, parsed.startIndex, parsed.endIndex, tweaks)
      await store.writeFile(projectId, `design/${target.name}`, next)
      await store.updateProject(projectId, (current) => {
        current.status = 'designed'
      })
      return { file: `design/${target.name}`, tweaks, changed }
    },

    /** Snapshot design/ + system/ as a labeled version. */
    async saveVersion(projectId, label) {
      const project = await mustGet(projectId)
      const versions = Array.isArray(project.versions) ? project.versions : []
      let next = 1
      for (const row of versions) {
        const match = /^v-(\d+)$/u.exec(String(row?.id ?? ''))
        if (match) next = Math.max(next, toInt(match[1], 0) + 1)
      }
      const id = `v-${next}`
      const paths = store.projectPaths(projectId)
      const targetDir = join(paths.versions, id)
      await ensureDir(targetDir)
      const designCopied = await copyTreeIfExists(paths.design, join(targetDir, 'design'))
      const systemCopied = await copyTreeIfExists(paths.system, join(targetDir, 'system'))
      if (!designCopied && !systemCopied) {
        throw fail('not_ready', 'there is nothing to snapshot yet', repair('save-variant', 'Write a design first', 'Save design/a.html, then snapshot a version.'))
      }
      const files = (await countFiles(targetDir)) || 0
      const version = {
        id,
        label: typeof label === 'string' && label.trim().length > 0 ? truncateUtf8(label.trim(), 160).text : `版本 ${next}`,
        at: nowIso(),
        files,
      }
      let pruned = []
      await store.updateProject(projectId, (current) => {
        const rows = Array.isArray(current.versions) ? current.versions : []
        rows.push(version)
        pruned = rows.length > LIMITS.maxVersions ? rows.slice(0, rows.length - LIMITS.maxVersions) : []
        current.versions = rows.slice(-LIMITS.maxVersions)
      })
      for (const row of pruned) {
        if (row && typeof row.id === 'string') await rm(join(paths.versions, row.id), { recursive: true, force: true }).catch(() => {})
      }
      return version;
    },

    /** Every version record. */
    async listVersions(projectId) {
      const project = await mustGet(projectId)
      return Array.isArray(project.versions) ? project.versions : []
    },

    /** Restore design/ + system/ from one snapshot. */
    async restoreVersion(projectId, versionId) {
      const project = await mustGet(projectId)
      const id = typeof versionId === 'string' ? versionId.trim() : ''
      if (!/^v-\d+$/u.test(id)) {
        throw fail('invalid_input', `not a version id: ${JSON.stringify(versionId)}`, repair('list-versions', 'List versions first', 'Call design_projects with action="versions" to see ids.'))
      }
      const versions = Array.isArray(project.versions) ? project.versions : []
      const version = versions.find((row) => row.id === id)
      if (!version) {
        throw fail('not_found', `version ${JSON.stringify(id)} does not exist`, repair('list-versions', 'Use an existing version', `Available: ${versions.map((row) => row.id).join(', ') || 'none yet'}`))
      }
      const paths = store.projectPaths(projectId)
      const sourceDir = join(paths.versions, id)
      let sourceInfo = null
      try {
        sourceInfo = await stat(sourceDir)
      } catch {
        sourceInfo = null
      }
      if (!sourceInfo || !sourceInfo.isDirectory()) {
        throw fail('not_found', `version ${id} files are missing`, repair('snapshot', 'Save a new version', 'The snapshot folder was deleted; save a new version before changing the design.'))
      }
      const designRestored = await copyTreeIfExists(join(sourceDir, 'design'), paths.design)
      const systemRestored = await copyTreeIfExists(join(sourceDir, 'system'), paths.system)
      if (!designRestored && !systemRestored) {
        throw fail('not_ready', `version ${id} has no files to restore`, repair('snapshot', 'Save a new version', 'The snapshot has no design/ or system/ folder.'))
      }
      await store.updateProject(projectId, (current) => {
        current.status = 'designed'
      })
      return { restored: id, files: version.files, design: designRestored, system: systemRestored }
    },

    /** Same-origin preview URL of one variant (panel or loopback fallback). */
    async preview(projectId, variant) {
      const project = await mustGet(projectId)
      const { variant: target } = await resolveVariant(project, variant)
      const origin = originOf(webServer)
      if (origin) {
        return {
          url: `${origin}${ROUTE_PREFIX}/preview/${encodeURIComponent(projectId)}/v/${encodeURIComponent(target.id)}`,
          origin,
          variant: target.id,
          sameOrigin: true,
        }
      }
      const existing = previews.get(projectId)
      if (existing) {
        return { url: `${existing.url}${target.id}.html`, origin: existing.origin, variant: target.id, sameOrigin: false }
      }
      if (typeof D.preview?.startPreview !== 'function') {
        throw fail('no_preview', 'no preview server is available', repair('open-browser', 'Open the design file directly', `Open ${join(store.projectPaths(projectId).design, `${target.id}.html`)} in a browser.`))
      }
      try {
        const server = await D.preview.startPreview({ rootDir: store.projectPaths(projectId).design, log })
        if (!server || typeof server.url !== 'string') throw new Error('the preview server returned no URL')
        const entry = {
          url: server.url.endsWith('/') ? server.url : `${server.url}/`,
          origin: originOf({ port: server.port }),
          port: server.port,
          server,
        }
        previews.set(projectId, entry)
        return { url: `${entry.url}${target.id}.html`, origin: entry.origin, variant: target.id, sameOrigin: false }
      } catch (error) {
        throw fail('no_preview', `could not start a loopback preview: ${messageOf(error)}`, repair('open-browser', 'Open the design file directly', `Open ${join(store.projectPaths(projectId).design, `${target.id}.html`)} in a browser, or start the plugin with a web server for the panel.`))
      }
    },

    /** Reveal the project folder in the OS file manager (never throws). */
    async openFolder(projectId) {
      let root = ''
      try {
        await mustGet(projectId)
        root = store.projectPaths(projectId).root
      } catch (error) {
        return { opened: false, reason: messageOf(error) }
      }
      const [command, args] =
        process.platform === 'win32' ? ['explorer.exe', [root]] : process.platform === 'darwin' ? ['open', [root]] : ['xdg-open', [root]]
      try {
        const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: false })
        child.on('error', (error) => warn(`could not open the project folder: ${messageOf(error)}`))
        child.unref()
        return { opened: true, path: root }
      } catch (error) {
        return { opened: false, reason: messageOf(error), path: root }
      }
    },

    /** Write one scaffold into design/ and report its project-relative file. */
    async scaffold(projectId, input) {
      await mustGet(projectId)
      const raw = isPlainObject(input) ? input : {}
      const scaffoldId = typeof raw.id === 'string' ? raw.id.trim() : ''
      if (scaffoldId.length === 0) {
        throw fail('invalid_input', 'scaffold id is required', repair('choose-scaffold', 'Choose a scaffold id', 'Ids: browser, ios, android, macos, deck, canvas, tweaks, anim, poster, doc'))
      }
      const file = typeof raw.target === 'string' && raw.target.trim().length > 0 ? raw.target.trim() : `${scaffoldId}.html`
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,80}\.html$/u.test(file)) {
        throw fail('invalid_input', `target must be a plain .html file name: ${JSON.stringify(file)}`, repair('retry', 'Pass a file name such as "tweaks.html"', 'Subfolders are not allowed for scaffolds.'))
      }
      if (typeof D.scaffolds.writeScaffold !== 'function') {
        throw fail('not_ready', 'the scaffold library is unavailable', repair('retry', 'Try again later', 'The scaffold library is not loaded.'))
      }
      const designDir = store.projectPaths(projectId).design
      const written = await D.scaffolds.writeScaffold({ designDir, id: scaffoldId, file })
      const bytes = Number.isFinite(Number(written?.bytes)) ? Math.round(Number(written.bytes)) : 0
      return { file: `design/${file}`, bytes }
    },

    /** Diagnostics for the panel (never throws). */
    async diagnostics() {
      const browser = await browserStatus()
      let projects = []
      try {
        projects = await store.listProjects()
      } catch (error) {
        warn(`could not list projects for diagnostics: ${messageOf(error)}`)
      }
      let rounds = 0
      let lastScore = null
      for (const project of projects) {
        rounds += Array.isArray(project.checks) ? project.checks.length : 0
        if (Number.isFinite(Number(project.bestScore))) lastScore = Math.max(lastScore ?? 0, Math.round(Number(project.bestScore)))
      }
      return {
        version: SERVICE_VERSION,
        dataDir: store.dataDir,
        browser,
        checks: { rounds, projects: projects.length, best: lastScore },
        jobs: Array.isArray(projects) ? projects.slice(0, 3).map((project) => jobs.latestFor(project.id)).filter(Boolean) : [],
        config: { viewports: DEFAULT_WIDTHS, maxDesignBytes: LIMITS.maxDesignBytes, maxBodyBytes: LIMITS.maxBodyBytes },
        platform: process.platform,
        node: process.version,
        errors: [],
      }
    },

    /** Cancel one job by id (panel/tool convenience). */
    cancelJob(jobId) {
      return jobs.cancel(jobId)
    },

    /** Stop jobs and loopback preview servers; the browser pool is closed by index.js. */
    async dispose() {
      jobs.dispose()
      const entries = [...previews.values()]
      previews.clear()
      for (const entry of entries) await disposePreviewEntry(entry)
      try {
        await D.preview?.closeAllPreviews?.()
      } catch (error) {
        warn(`closing preview servers failed: ${messageOf(error)}`)
      }
    },
  }

  /** Dispose one loopback preview server regardless of its API shape. */
  async function disposePreviewEntry(entry) {
    try {
      if (typeof entry?.server?.dispose === 'function') await entry.server.dispose()
      else if (typeof entry?.server?.close === 'function') await entry.server.close()
    } catch (error) {
      warn(`closing a preview server failed: ${messageOf(error)}`)
    }
  }

  /** Read an image input: a data: URL or an absolute file path. */
  async function readImageInput(projectId, value) {
    const maxBytes = LIMITS.maxImageBytes
    if (value.startsWith('data:')) {
      const match = /^data:([^;,]*)(;base64)?,([\s\S]*)$/u.exec(value)
      if (!match) throw fail('invalid_input', 'the data URL is malformed', repair('retry', 'Pass a base64 data: URL or an absolute image path', 'Example: data:image/png;base64,iVBOR…'))
      const mime = match[1] || 'image/png'
      if (!/^image\/(png|jpeg|jpg|webp)$/u.test(mime)) {
        throw fail('invalid_input', `unsupported image type: ${mime}`, repair('retry', 'Use PNG, JPEG or WebP', 'Convert the image first, then import it.'))
      }
      const base64 = match[3].replace(/\s+/gu, '')
      const buffer = Buffer.from(base64, 'base64')
      if (buffer.length === 0) throw fail('invalid_input', 'the image data URL is empty', repair('retry', 'Pass real image bytes', 'Example: data:image/png;base64,iVBOR…'))
      if (buffer.length > maxBytes) throw fail('too_large', `the image is ${buffer.length} bytes (max ${maxBytes})`, repair('shrink', 'Shrink the image', 'Resize the reference under 24 MiB.'))
      const extension = mime === 'image/jpeg' || mime === 'image/jpg' ? 'jpg' : mime.replace('image/', '')
      const rel = `context/${slugify(`image-${Date.now()}`, 'image')}.${extension}`
      await store.writeFile(projectId, rel, buffer)
      return { buffer, file: rel }
    }
    if (!isAbsolute(value)) {
      throw fail('invalid_input', 'image must be a data: URL or an absolute path', repair('retry', 'Pass a data: URL or absolute path', 'Relative paths are ambiguous; pass the absolute path of a PNG/JPEG/WebP.'))
    }
    let buffer
    try {
      buffer = await readFile(value)
    } catch (error) {
      throw fail('invalid_input', `could not read the image: ${messageOf(error)}`, repair('retry', 'Check the image path', 'Pass an absolute path to a readable PNG/JPEG/WebP file.'))
    }
    if (buffer.length > maxBytes) throw fail('too_large', `the image is ${buffer.length} bytes (max ${maxBytes})`, repair('shrink', 'Shrink the image', 'Resize the reference under 24 MiB.'))
    const base = value.replace(/\\/gu, '/').split('/').pop() ?? 'image'
    const extension = (/\.(png|jpe?g|webp)$/iu.exec(base)?.[1] ?? 'png').toLowerCase().replace('jpeg', 'jpg')
    const rel = `context/${slugify(base.slice(0, 60), 'image')}.${extension}`
    await store.writeFile(projectId, rel, buffer)
    return { buffer, file: rel }
  }

  return service
}

/** Resolve a tweak target argument (`a.html`, `a`) to `{name, stem}`. */
function tweakTarget(file) {
  const raw = typeof file === 'string' && file.trim().length > 0 ? file.trim() : 'a.html'
  const normalized = raw.replace(/\\/gu, '/')
  if (normalized.includes('/') || normalized.startsWith('.')) {
    throw fail('invalid_input', `not a design file name: ${JSON.stringify(file)}`, repair('retry', 'Pass just the file name', 'Example: {"file":"a.html"}'))
  }
  const stem = normalizeVariantId(normalized)
  if (!stem) {
    throw fail('invalid_input', `not a design file name: ${JSON.stringify(file)}`, repair('retry', 'Pass just the file name', 'Example: {"file":"a.html"}'))
  }
  return { name: `${stem}.html`, stem }
}

/** One-line summary of a token set for context evidence. */
function tokenSummary(tokens) {
  if (!isPlainObject(tokens)) return 'no tokens'
  const colors = isPlainObject(tokens.color) ? Object.keys(tokens.color).length : 0
  const fonts = isPlainObject(tokens.font) ? Object.keys(tokens.font).length : 0
  const sizes = Array.isArray(tokens.size?.scale) ? tokens.size.scale.length : 0
  return `${colors} colours, ${fonts} font roles, ${sizes} type sizes${typeof tokens.name === 'string' && tokens.name.length > 0 ? ` (${tokens.name})` : ''}`
}
