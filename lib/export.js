/**
 * dsh-design-studio — export pipeline: HTML / ZIP / PNG / PDF / PPTX.
 *
 * `exportDesign` is the only door between the studio and the outside world:
 * it reads the project's design files (and optional token system), drives the
 * shared headless browser for raster/print/deck exports, and writes one file
 * under `projectPaths.exports` named
 * `design-<projectId>-<variant>-<kind>.<ext>` (CONTRACT §3).
 *
 *   html — the selected variant file copied verbatim (designs are self-contained)
 *   zip  — design/** + system/** + trimmed project.json + README.txt
 *   png  — full-page screenshot of the preview at the first viewport
 *   pdf  — CDP `Page.printToPDF` (printBackground + preferCSSPageSize, paper
 *          sized to the design column so nothing is clipped)
 *   pptx — one 16:9 slide per deck screen when the preview has
 *          `[data-screen-label]`, else one slide per requested viewport
 *
 * Every buffer is bounded by `LIMITS.maxExportBytes`; a missing browser raises
 * `code:"no_browser"`, a missing preview `code:"no_preview"`.
 *
 * Public API (CONTRACT §3): exportDesign({project, projectPaths, variant, kind, pool, previewUrl, viewports, log}).
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { EXPORT_KINDS, LIMITS, heightForWidth, normalizeViewports } from './config.js'
import { createPptx } from './pptx.js'
import { captureSlidePngs, captureViewportPngs } from './probe.js'
import { createZip } from './zip.js'
import { ensureDir, isPlainObject, messageOf, nowIso } from './util.js'

/** Extension per export kind. */
const EXTENSION = Object.freeze({ html: 'html', zip: 'zip', pdf: 'pdf', png: 'png', pptx: 'pptx' })
/** MIME per export kind. */
const MIME = Object.freeze({
  html: 'text/html; charset=utf-8',
  zip: 'application/zip',
  pdf: 'application/pdf',
  png: 'image/png',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
})
/** Bounded asset walk for the ZIP export. */
const ZIP_LIMITS = Object.freeze({ maxFiles: 400, maxFileBytes: 8 * 1024 * 1024, maxTotalBytes: 48 * 1024 * 1024, maxDepth: 6 })
/** Print paper cap in inches (avoid a hostile page producing a 10 m document). */
const MAX_PAPER_INCHES = 240

/** Build a typed error, optionally with a repair hint. */
function fail(code, message, repair) {
  const error = new Error(message)
  error.code = code
  if (repair && typeof repair === 'object') error.repair = repair
  return error
}

/** A one-line logger that never throws. */
function loggerOf(log) {
  if (typeof log === 'function') return (message) => { try { log(message) } catch { /* logging must not break an export */ } }
  return (message) => {
    try {
      log?.warn?.(message)
    } catch {
      /* logging must not break an export */
    }
  }
}

/** Sanitise one filename segment. */
function segment(text, fallback) {
  const clean = String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gu, '-')
    .replace(/^[-.]+|[-.]+$/gu, '')
    .slice(0, 60)
  return clean.length > 0 ? clean : fallback
}

/** Sanitise a variant id for reading a design file. */
function variantArgument(value) {
  if (value === undefined || value === null || value === '') return ''
  const text = String(value).trim()
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(text)) throw fail('invalid_input', 'variant 名称不合法：' + text.slice(0, 80))
  return text
}

/** Abort-aware delay. */
function abortCheck(signal) {
  if (signal && signal.aborted === true) {
    const error = new Error('the export was cancelled')
    error.code = 'cancelled'
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/* design files                                                               */
/* -------------------------------------------------------------------------- */

/** List the HTML variants of a project, sorted by name. */
async function listDesignFiles(designDir) {
  let entries
  try {
    entries = await readdir(designDir, { withFileTypes: true })
  } catch (error) {
    throw fail('not_found', '找不到项目的 design 目录：' + designDir, {
      action: 'recreate',
      label: '重新选择变体',
      detail: messageOf(error),
    })
  }
  return entries
    .filter((entry) => entry.isFile() && /\.html?$/iu.test(entry.name))
    .map((entry) => ({ name: entry.name, path: join(designDir, entry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 60)
}

/** Read the requested variant (or the first one) from the design directory. */
async function readDesignFile(designDir, variant) {
  const files = await listDesignFiles(designDir)
  if (files.length === 0) {
    throw fail('not_found', '项目的 design 目录里还没有 HTML 设计稿', {
      action: 'design',
      label: '先生成设计稿',
      detail: 'design/ 下需要至少一个 .html 文件',
    })
  }
  let chosen = files[0]
  if (variant.length > 0) {
    const wanted = (variant.toLowerCase().endsWith('.html') || variant.toLowerCase().endsWith('.htm') ? variant : variant + '.html').toLowerCase()
    const found = files.find((entry) => entry.name.toLowerCase() === wanted)
    if (!found) {
      throw fail('not_found', '变体 ' + variant + ' 不存在；可用变体：' + files.map((entry) => basename(entry.name, '.html')).join(', '), {
        action: 'choose',
        label: '换一个变体',
        detail: '可用变体：' + files.map((entry) => basename(entry.name, '.html')).join(', '),
      })
    }
    chosen = found
  }
  const buffer = await readFile(chosen.path)
  if (buffer.length === 0) throw fail('failed', '设计文件是空的：' + chosen.name)
  return { variant: basename(chosen.name, '.html').replace(/\.htm$/iu, ''), buffer, file: chosen.name }
}

/* -------------------------------------------------------------------------- */
/* zip contents                                                               */
/* -------------------------------------------------------------------------- */

/** Recursively collect regular files below a directory (bounded). */
async function collectFiles(rootDir, prefix, state, depth = 0) {
  if (depth > ZIP_LIMITS.maxDepth) return []
  let entries
  try {
    entries = await readdir(rootDir, { withFileTypes: true })
  } catch {
    return []
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))
  const out = []
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue
    const full = join(rootDir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await collectFiles(full, prefix + '/' + entry.name, state, depth + 1)))
      continue
    }
    if (!entry.isFile()) continue
    let info
    try {
      info = await stat(full)
    } catch {
      continue
    }
    if (info.size === 0) continue
    if (info.size > ZIP_LIMITS.maxFileBytes) throw fail('too_large', '导出打包时遇到超过 8 MB 的资源：' + entry.name)
    if (state.files + 1 > ZIP_LIMITS.maxFiles) throw fail('too_large', '导出打包的文件数超过 ' + ZIP_LIMITS.maxFiles + ' 个')
    if (state.bytes + info.size > ZIP_LIMITS.maxTotalBytes) throw fail('too_large', '导出打包的总字节数超过 48 MB')
    state.files += 1
    state.bytes += info.size
    out.push({ name: prefix + '/' + entry.name, path: full })
  }
  return out
}

/** Build the project summary written into the ZIP. */
function projectSummaryOf(project, variant, kind) {
  const brief = isPlainObject(project.brief) ? project.brief : {}
  return {
    schemaVersion: 1,
    id: project.id ?? '',
    name: project.name ?? '',
    kind: project.kind ?? kind,
    variant,
    brief: { goal: brief.goal ?? '', audience: brief.audience ?? '', layout: brief.layout ?? '', content: brief.content ?? '', constraints: brief.constraints ?? '' },
    viewports: Array.isArray(project.viewports) ? project.viewports : [],
    status: project.status ?? 'draft',
    bestScore: project.bestScore ?? null,
    system: project.system ?? null,
    variantLabels: isPlainObject(project.variantLabels) ? project.variantLabels : {},
    exportedAt: nowIso(),
    exportKind: 'zip',
  }
}

/** Build the human README written into the ZIP. */
function readmeOf(project, variant, files) {
  const label = isPlainObject(project.variantLabels) && typeof project.variantLabels[variant] === 'string' ? project.variantLabels[variant] : variant.toUpperCase()
  const lines = []
  lines.push('# ' + String(project.name ?? '设计稿') + ' — 设计导出')
  lines.push('')
  lines.push('- 项目 ID：' + String(project.id ?? ''))
  lines.push('- 类型：' + String(project.kind ?? 'web'))
  lines.push('- 变体：' + variant + '（' + label + '）')
  lines.push('- 导出时间：' + nowIso())
  lines.push('')
  lines.push('## 目录')
  lines.push('')
  lines.push('- `design/`：可直接打开的 HTML 设计稿与本地资源')
  lines.push('- `system/`：设计系统快照（`tokens.json`、`DESIGN.md`），没有设计系统时为空')
  lines.push('- `project.json`：项目摘要（brief / 视口 / 状态 / 评分）')
  lines.push('')
  lines.push('## 打开方式')
  lines.push('')
  lines.push('双击 `design/' + variant + '.html` 即可在浏览器里查看；设计稿是零外部依赖的自包含页面。')
  lines.push('')
  lines.push('## 设计系统')
  lines.push('')
  if (project.system && typeof project.system === 'object') {
    lines.push('- 已随包附带设计系统快照，颜色 / 字体 / 字号 / 间距 / 圆角可复用。')
    lines.push('- 代理或开发者接手时，先读 `system/tokens.json`，再改样式。')
  } else {
    lines.push('- 该项目还没有设计系统；页面里的值可以直接作为起点，但建议先固化 tokens。')
  }
  lines.push('')
  lines.push('## 文件')
  lines.push('')
  for (const name of files.slice(0, 60)) lines.push('- ' + name)
  if (files.length > 60) lines.push('- …以及另外 ' + (files.length - 60) + ' 个文件')
  lines.push('')
  lines.push('## 注意')
  lines.push('')
  lines.push('- 设计稿引用的本机字体在没有安装的机器上会回退到 CSS fallback 栈。')
  lines.push('- 如需重新质检或继续编辑，在 DeepSeek Harness 的「设计台」面板打开该项目。')
  return lines.join('\n') + '\n'
}

/** Build the complete ZIP export for one variant. */
async function buildZip({ project, projectPaths, design, log }) {
  const files = []
  const designState = { files: 0, bytes: 0 }
  const designEntries = await collectFiles(projectPaths.design, 'design', designState)
  for (const entry of designEntries) {
    const buffer = await readFile(entry.path).catch(() => null)
    if (buffer) files.push({ name: entry.name, buffer })
  }
  // The chosen variant is always present even if the walk skipped it.
  if (!files.some((entry) => entry.name === 'design/' + design.file)) {
    files.unshift({ name: 'design/' + design.file, buffer: design.buffer })
  }
  const systemDir = projectPaths.system
  if (typeof systemDir === 'string' && systemDir.length > 0) {
    const state = { files: 0, bytes: 0 }
    const systemFiles = await collectFiles(systemDir, 'system', state)
    for (const extra of systemFiles) {
      const buffer = await readFile(extra.path).catch(() => null)
      if (buffer) files.push({ name: extra.name, buffer })
    }
  }
  const entries = files.map((file) => ({ name: file.name, data: file.buffer }))
  entries.push({ name: 'project.json', data: JSON.stringify(projectSummaryOf(project, design.variant, project.kind ?? 'web'), null, 2) + '\n' })
  entries.push({ name: 'README.txt', data: readmeOf(project, design.variant, files.map((file) => file.name)) })
  log('已打包 ' + files.length + ' 个设计/系统文件')
  return createZip(entries)
}

/* -------------------------------------------------------------------------- */
/* browser-backed exports                                                     */
/* -------------------------------------------------------------------------- */

/** Evaluate one expression in a page. */
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

/** Navigate one page and settle fonts + network before a capture. */
async function openAndSettle(page, url) {
  page.resetNetwork()
  const loaded = page.session.waitForEvent('Page.loadEventFired', { timeout: LIMITS.settleTimeoutMs }).catch(() => null)
  let navigation
  try {
    navigation = await page.session.send('Page.navigate', { url })
  } catch (error) {
    throw fail('navigation', '无法打开预览页：' + messageOf(error))
  }
  if (navigation?.errorText) throw fail('navigation', '无法打开预览页：' + navigation.errorText)
  const loadedOk = await Promise.race([
    loaded.then((value) => value !== null),
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), LIMITS.settleTimeoutMs)
      if (typeof timer.unref === 'function') timer.unref()
    }),
  ])
  if (!loadedOk) throw fail('timeout', '预览页在 ' + LIMITS.settleTimeoutMs + ' ms 内没有加载完成')
  await page.waitForNetworkIdle({ quietMs: LIMITS.networkQuietMs, timeoutMs: Math.min(15000, LIMITS.settleTimeoutMs) })
  await evaluateInPage(page, 'Promise.resolve(document.fonts && document.fonts.ready ? document.fonts.ready : true)', { awaitPromise: true }).catch(() => {})
  await evaluateInPage(page, 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))', { awaitPromise: true }).catch(() => {})
}

/** Render the preview to a PDF sized to the design column. */
async function capturePdf({ pool, url, width, log }) {
  const height = heightForWidth(width) || 900
  let pdf = null
  await pool.withPage(async (page) => {
    await page.session.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768, screenWidth: width, screenHeight: height }).catch(() => {})
    await openAndSettle(page, url)
    const size = await evaluateInPage(page, '(() => ({ width: Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0), height: Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0) }))()').catch(() => null)
    const documentWidth = Math.min(LIMITS.maxPageWidth, Math.max(width, Math.round((size && size.width) || width)))
    const documentHeight = Math.max(height, Math.round((size && size.height) || height))
    const paperWidth = Math.min(MAX_PAPER_INCHES, Math.max(1, documentWidth / 96))
    const paperHeight = Math.min(MAX_PAPER_INCHES, Math.max(1, documentHeight / 96))
    const result = await page.session.send('Page.printToPDF', {
      landscape: false,
      displayHeaderFooter: false,
      printBackground: true,
      preferCSSPageSize: true,
      paperWidth: Math.round(paperWidth * 1000) / 1000,
      paperHeight: Math.round(paperHeight * 1000) / 1000,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      scale: 1,
      transferMode: 'ReturnAsBase64',
    })
    if (!result || typeof result.data !== 'string' || result.data.length === 0) throw fail('failed', '浏览器没有返回 PDF 数据')
    pdf = Buffer.from(result.data, 'base64')
    log('已生成 PDF（' + Math.round(paperWidth * 96) + '×' + Math.round(paperHeight * 96) + ' px 版面）')
  })
  if (!pdf) throw fail('failed', 'PDF 导出没有产生数据')
  return pdf
}

/* -------------------------------------------------------------------------- */
/* public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Export one project variant.
 * @param {object} input
 * @param {object} input.project project record
 * @param {object} input.projectPaths store paths (`design`, `system`, `exports`, `root`)
 * @param {string} [input.variant] variant id (defaults to the first design file)
 * @param {'html'|'zip'|'pdf'|'png'|'pptx'} input.kind
 * @param {object} [input.pool] BrowserPool (required for png/pdf/pptx)
 * @param {string} [input.previewUrl] same-origin preview URL (required for png/pdf/pptx)
 * @param {number[]} [input.viewports]
 * @param {Function|{warn?: Function}} [input.log]
 * @param {AbortSignal} [input.signal]
 * @returns {Promise<{file: string, bytes: number, mime: string, slides?: number}>}
 */
export async function exportDesign(input = {}) {
  const project = isPlainObject(input.project) ? input.project : {}
  const projectPaths = isPlainObject(input.projectPaths) ? input.projectPaths : {}
  const kind = String(input.kind ?? '').trim().toLowerCase()
  const log = loggerOf(input.log)
  if (!EXPORT_KINDS.includes(kind)) throw fail('invalid_input', '不支持的导出类型：' + (kind || '(空)'))
  const exportsDir = typeof projectPaths.exports === 'string' && projectPaths.exports.length > 0 ? projectPaths.exports : ''
  const designDir = typeof projectPaths.design === 'string' && projectPaths.design.length > 0 ? projectPaths.design : projectPaths.root ? join(projectPaths.root, 'design') : ''
  if (exportsDir.length === 0) throw fail('invalid_input', 'projectPaths.exports 缺失，无法写导出文件')
  if (designDir.length === 0) throw fail('invalid_input', 'projectPaths.design 缺失，无法读取设计稿')
  const variantRequest = variantArgument(input.variant)
  const design = await readDesignFile(designDir, variantRequest)
  abortCheck(input.signal)

  const projectId = segment(project.id ?? 'project', 'project')
  const variantSlug = segment(design.variant, 'a')
  const fileName = 'design-' + projectId + '-' + variantSlug + '-' + kind + '.' + EXTENSION[kind]
  const previewUrl = typeof input.previewUrl === 'string' ? input.previewUrl.trim() : ''
  const viewports = normalizeViewports(Array.isArray(input.viewports) && input.viewports.length > 0 ? input.viewports : project.viewports, project.kind ?? 'web')
  const pool = input.pool
  let data = null
  let slides = 0

  if (kind === 'html') {
    data = design.buffer
  } else if (kind === 'zip') {
    data = await buildZip({ project, projectPaths: { ...projectPaths, design: designDir }, design, log })
  } else if (kind === 'png') {
    if (previewUrl.length === 0) throw fail('no_preview', '导出 PNG 需要可访问的预览地址', { action: 'serve', label: '先打开预览', detail: 'POST /preview 生成预览 URL' })
    if (!pool || typeof pool.withPage !== 'function') throw fail('no_browser', '导出 PNG 需要无头浏览器，但没有可用的浏览器池')
    log('正在截取 ' + viewports[0] + ' px 整页截图')
    const captures = await captureViewportPngs({ pool, url: previewUrl, viewports: [viewports[0]], kind: project.kind ?? 'web', signal: input.signal, log })
    if (!captures || captures.length === 0 || !captures[0].png) throw fail('failed', '整页截图没有产生图片')
    data = captures[0].png
  } else if (kind === 'pdf') {
    if (previewUrl.length === 0) throw fail('no_preview', '导出 PDF 需要可访问的预览地址', { action: 'serve', label: '先打开预览', detail: 'POST /preview 生成预览 URL' })
    if (!pool || typeof pool.withPage !== 'function') throw fail('no_browser', '导出 PDF 需要无头浏览器，但没有可用的浏览器池')
    data = await capturePdf({ pool, url: previewUrl, width: viewports[0], log })
  } else if (kind === 'pptx') {
    if (previewUrl.length === 0) throw fail('no_preview', '导出 PPTX 需要可访问的预览地址', { action: 'serve', label: '先打开预览', detail: 'POST /preview 生成预览 URL' })
    if (!pool || typeof pool.withPage !== 'function') throw fail('no_browser', '导出 PPTX 需要无头浏览器，但没有可用的浏览器池')
    log('正在截取幻灯片画面')
    const screenCapture = await captureSlidePngs({ pool, url: previewUrl, signal: input.signal, log })
    let slideImages = []
    if (screenCapture && screenCapture.found && screenCapture.screens.length > 0) {
      slideImages = screenCapture.screens.map((screen) => ({ png: screen.png, width: screen.width, height: screen.height }))
    } else {
      log('预览页没有幻灯片区，改用每个视口一页')
      const captures = await captureViewportPngs({ pool, url: previewUrl, viewports, kind: project.kind ?? 'web', signal: input.signal, log })
      slideImages = captures.map((capture) => ({ png: capture.png, width: capture.width, height: capture.height }))
    }
    if (slideImages.length === 0) throw fail('failed', 'PPTX 导出没有可用的页面画面')
    const title = String(project.name ?? '设计稿') + ' · ' + design.variant.toUpperCase()
    data = createPptx({ slides: slideImages, title })
    slides = slideImages.length
  }

  abortCheck(input.signal)
  if (!data || data.length === 0) throw fail('failed', '导出没有产生文件内容')
  if (data.length > LIMITS.maxExportBytes) throw fail('too_large', '导出文件 ' + data.length + ' 字节，超过 ' + LIMITS.maxExportBytes + ' 字节上限')
  await ensureDir(exportsDir)
  await writeFile(join(exportsDir, fileName), data)
  log('已写入 exports/' + fileName + '（' + data.length + ' 字节）')
  const result = { file: 'exports/' + fileName, bytes: data.length, mime: MIME[kind] }
  if (kind === 'pptx') result.slides = slides
  return result
}
