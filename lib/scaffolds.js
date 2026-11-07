/**
 * dsh-design-studio — starter scaffolds (CONTRACT §3).
 *
 * Ten complete, self-contained HTML starter designs. Each one is a single file
 * with inline styles and scripts, zero external requests, original copy and a
 * clean-room visual direction. Every page also carries the Claude edit-mode
 * Tweaks block (CONTRACT §6) so live tweaking works the moment the page is opened
 * in the Design Studio canvas:
 *
 *   <script>const TWEAK_DEFAULTS = /_*EDITMODE-BEGIN*_/ { ... } /_*EDITMODE-END*_/;</script>
 *   window.__dsApplyTweaks = (edits) => { ... }
 *   listener registered BEFORE announcing {type:"__edit_mode_available"}
 *
 * The HTML lives in one module per scaffold under `./scaffolds/` so this registry
 * stays readable. Pure Node ESM, no third-party imports, no file I/O at import
 * time beyond the writes `writeScaffold` performs on request.
 */

import { mkdir, stat } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import android from './scaffolds/android.js'
import anim from './scaffolds/anim.js'
import browser from './scaffolds/browser.js'
import canvas from './scaffolds/canvas.js'
import deck from './scaffolds/deck.js'
import doc from './scaffolds/doc.js'
import ios from './scaffolds/ios.js'
import macos from './scaffolds/macos.js'
import poster from './scaffolds/poster.js'
import tweaks from './scaffolds/tweaks.js'
import { writeFileAtomic } from './util.js'

/** Scaffold id → HTML content. Frozen so callers cannot mutate the registry. */
const CONTENT = Object.freeze({
  browser,
  ios,
  android,
  macos,
  deck,
  canvas,
  tweaks,
  anim,
  poster,
  doc,
})

/**
 * Registry rows. `kind` matches a project kind from CONTRACT §2; `bytes` is the
 * real UTF-8 byte length of the scaffold HTML (Buffer.byteLength).
 */
const META = Object.freeze([
  {
    id: 'browser',
    label: '网页 · 编辑式落地页',
    kind: 'web',
    description: '编辑式期刊落地页：报头、导语、目录与订阅条，响应 1440 / 768 / 375 三档视口。',
  },
  {
    id: 'ios',
    label: 'iOS 应用屏 · 393×852',
    kind: 'mobile',
    description: 'iPhone 安全区与 44px 触控目标的潮汐记录 App 屏，含真实状态栏与 Home Indicator。',
  },
  {
    id: 'android',
    label: 'Android 应用屏 · 412×915',
    kind: 'mobile',
    description: 'Material 3 色调角色的植物养护 App 屏：任务勾选会实时更新进度环。',
  },
  {
    id: 'macos',
    label: 'macOS 应用窗口',
    kind: 'web',
    description: '桌面字体样张管理器窗口：红绿灯、侧栏、样张纸面与元数据表，深浅两套主题。',
  },
  {
    id: 'deck',
    label: '幻灯片舞台 · 16:9',
    kind: 'deck',
    description: '6 屏提案演示：data-screen-label、键盘翻页、localStorage 位置恢复、每屏一页的打印样式。',
  },
  {
    id: 'canvas',
    label: '多方案画布',
    kind: 'web',
    description: '三档首屏方向并排对比的看板，顶部标签可单独筛选 A 规范 / B 进阶 / C 前卫。',
  },
  {
    id: 'tweaks',
    label: 'Tweaks 调参样板',
    kind: 'web',
    description: '阅读卡 + 实时控件面板：字号、行高、圆角、行宽、主题与标题体全部即时生效。',
  },
  {
    id: 'anim',
    label: '动效时间轴',
    kind: 'web',
    description: '1920×1080 舞台的 sprite 时间轴：requestAnimationFrame 播放、拖拽与位置保存。',
  },
  {
    id: 'poster',
    label: 'A3 海报',
    kind: 'poster',
    description: '潮间带植物图鉴海报：@page A3、单色网点图版、套准标记与印刷专色。',
  },
  {
    id: 'doc',
    label: 'A4 单页文档',
    kind: 'doc',
    description: '双栏方法备忘录：@page A4、表格与编号步骤，屏幕与打印同为单页。',
  },
])

/**
 * The public scaffold registry.
 * @type {ReadonlyArray<{id: string, label: string, kind: string, description: string, bytes: number}>}
 */
export const SCAFFOLDS = Object.freeze(
  META.map((entry) =>
    Object.freeze({
      id: entry.id,
      label: entry.label,
      kind: entry.kind,
      description: entry.description,
      bytes: Buffer.byteLength(CONTENT[entry.id], 'utf8'),
    }),
  ),
)

/** Default scaffold id per project kind (used when a project is seeded). */
export const DEFAULT_SCAFFOLD_BY_KIND = Object.freeze({
  web: 'browser',
  mobile: 'ios',
  deck: 'deck',
  poster: 'poster',
  doc: 'doc',
})

/** All scaffold ids, in registry order. */
export const SCAFFOLD_IDS = Object.freeze(SCAFFOLDS.map((entry) => entry.id))

/** A typed plugin error with the CONTRACT §3 repair object. */
function scaffoldError(code, message, repair) {
  const error = new Error(message)
  error.code = code
  if (repair) error.repair = repair
  return error
}

/**
 * Return the HTML for one scaffold id (or `null` for an unknown id).
 * @param {string} id scaffold id, e.g. `'deck'`
 * @returns {string|null}
 */
export function scaffoldContent(id) {
  if (typeof id !== 'string') return null
  const key = id.trim()
  return Object.prototype.hasOwnProperty.call(CONTENT, key) ? CONTENT[key] : null
}

/** Metadata for one scaffold id, or `null`. */
export function scaffoldMeta(id) {
  if (typeof id !== 'string') return null
  const key = id.trim()
  return SCAFFOLDS.find((entry) => entry.id === key) ?? null
}

/** Default scaffold id for a project kind. Unknown kinds fall back to `browser`. */
export function scaffoldForKind(kind) {
  return DEFAULT_SCAFFOLD_BY_KIND[kind] ?? DEFAULT_SCAFFOLD_BY_KIND.web
}

/** True when a path exists (any file type). */
async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/** Normalise a relative file name to POSIX separators for return values. */
function toPosix(path) {
  return String(path).split(sep).join('/')
}

/**
 * Write one scaffold into a project's design directory.
 *
 * - Creates `designDir` (and any parent of the target file) when missing.
 * - Refuses to overwrite an existing file unless `force: true`.
 * - Confines the target inside `designDir`; absolute paths and `..` are rejected.
 * - Writes atomically (temp file + rename via lib/util.js).
 *
 * @param {object} input
 * @param {string} input.designDir absolute (or cwd-relative) design directory
 * @param {string} input.id scaffold id
 * @param {string} [input.file] target file name inside designDir (default `<id>.html`)
 * @param {boolean} [input.force] overwrite an existing file
 * @returns {Promise<{file: string, path: string, designFile: string, bytes: number}>}
 *   `file` is relative to designDir, `path` is absolute, `designFile` is relative
 *   to the designDir's parent (e.g. `design/a.html`, matching the project layout).
 * @throws {Error & {code: string, repair?: object}} typed `not_found` / `invalid_input`
 */
export async function writeScaffold(input) {
  const options = input !== null && typeof input === 'object' ? input : {}
  const id = typeof options.id === 'string' ? options.id.trim() : ''
  const content = scaffoldContent(id)
  if (content === null) {
    throw scaffoldError('not_found', `unknown scaffold id: ${id || '(missing)'}`, {
      action: 'list_scaffolds',
      label: '选择一个模板',
      detail: `可用模板：${SCAFFOLD_IDS.join(', ')}`,
    })
  }
  if (typeof options.designDir !== 'string' || options.designDir.trim() === '') {
    throw scaffoldError('invalid_input', 'designDir is required', {
      action: 'provide_design_dir',
      label: '提供设计目录',
      detail: 'writeScaffold 需要项目 design/ 目录的绝对路径。',
    })
  }

  const base = resolve(options.designDir.trim())
  const requested =
    typeof options.file === 'string' && options.file.trim() !== '' ? options.file.trim() : `${id}.html`
  if (isAbsolute(requested)) {
    throw scaffoldError('invalid_input', `file must be relative to designDir: ${requested}`, {
      action: 'use_relative_file',
      label: '改用相对文件名',
      detail: '例如 a.html 或 variants/a.html。',
    })
  }
  const target = resolve(base, requested)
  const rel = relative(base, target)
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw scaffoldError('invalid_input', `file escapes designDir: ${requested}`, {
      action: 'use_relative_file',
      label: '改用目录内的文件名',
      detail: '目标必须位于 design/ 目录内部，不能使用 .. 或绝对路径。',
    })
  }

  const file = toPosix(rel)
  if (!options.force && (await exists(target))) {
    throw scaffoldError('invalid_input', `file already exists: ${file}`, {
      action: 'retry_with_force',
      label: '覆盖或换一个文件名',
      detail: `如需覆盖 ${file}，传 force:true；否则指定另一个目标文件。`,
    })
  }

  await mkdir(dirname(target), { recursive: true })
  await writeFileAtomic(target, content)
  return {
    file,
    path: target,
    designFile: toPosix(relative(dirname(base), target)),
    bytes: Buffer.byteLength(content, 'utf8'),
  }
}
