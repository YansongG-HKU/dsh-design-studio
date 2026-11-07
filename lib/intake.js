/**
 * dsh-design-studio — the intake question bank and normalisation (FLOW §2.3/§2.4).
 *
 * The 6-step "开始 / 提问" wizard and the agent's `design_intake` tool share one
 * canonical question set. Answers land in `project.intake` (all fields optional,
 * backwards compatible: projects without an intake keep working).
 *
 * This module is pure: no I/O, no host imports beyond config/util. It exports
 *   - INTAKE_QUESTIONS     six groups of panel/agent questions
 *   - intakeQuestionList() flat question list
 *   - normalizeIntake()    type-limits, trims, dedupes, drops unknown keys
 *   - mergeIntake()        incremental merges (missing keys keep old values)
 *   - intakeSummary()      human/agent-readable text for DESIGN.md + prompts
 *   - intakeCompleteness() 0-100 plus filled/missing question ids
 */

import { EXPORT_KINDS, KINDS } from './config.js'
import { isPlainObject, truncateUtf8 } from './util.js'

/** Longest accepted text field (characters). */
export const INTAKE_TEXT_MAX = 2000
/** Longest accepted list (items). */
export const INTAKE_LIST_MAX = 12
/** Longest accepted list item (characters). */
export const INTAKE_ITEM_MAX = 500

/** Canonical context sources (data model §2.3). */
export const INTAKE_CONTEXT_SOURCES = Object.freeze(['existing-design-system', 'url', 'repo', 'screenshots', 'none'])
/** Canonical variation dimensions. */
export const INTAKE_DIMENSIONS = Object.freeze(['visual', 'interaction', 'layout', 'copy', 'motion'])
/** Canonical tweak families. */
export const INTAKE_TWEAKS = Object.freeze(['color', 'type', 'spacing', 'copy', 'layout', 'toggle'])
/** Responsive targets. */
export const INTAKE_RESPONSIVE = Object.freeze(['desktop', 'tablet', 'mobile'])
/** Where an intake answer came from. */
export const INTAKE_SOURCES = Object.freeze(['wizard', 'agent', 'mixed'])
/** Deliverable formats. */
export const INTAKE_DELIVERABLES = Object.freeze([...EXPORT_KINDS])
/** Success criteria suggestions. */
export const INTAKE_SUCCESS = Object.freeze(['check>=90', 'no-overflow', 'a11y-aa', 'print-ready', 'matches-brand'])
/** Variation range labels. */
export const INTAKE_RANGES = Object.freeze(['基础→进阶', '规则→前卫', '保守→实验'])
/** Every persisted intake key, in canonical order. */
export const INTAKE_KEYS = Object.freeze([
  'kind',
  'goal',
  'audience',
  'contextSources',
  'references',
  'brandConstraints',
  'variations',
  'tweaks',
  'contentMust',
  'contentAvoid',
  'deliverables',
  'responsive',
  'success',
  'openQuestions',
  'completedAt',
  'source',
])

/** Six wizard steps; `field` maps a question onto the persisted intake shape. */
const GROUP_DEFS = [
  {
    id: 'start',
    title: '开始：做什么',
    questions: [
      {
        id: 'kind',
        field: 'kind',
        label: '要做什么类型的设计？',
        type: 'single',
        options: [...KINDS],
        required: true,
        allowSkip: false,
        hint: '网页 = 落地页/官网/仪表盘；移动端 = App 屏；演示稿 = deck；海报；一页文档。',
      },
      {
        id: 'goal',
        field: 'goal',
        label: '一句话说清目标：做成什么样算成功？',
        type: 'text',
        required: true,
        allowSkip: false,
        hint: '例：让潜在客户在 30 秒内看懂产品价值并预约演示。',
      },
    ],
  },
  {
    id: 'audience',
    title: '给谁看 / 在哪用',
    questions: [
      {
        id: 'audience',
        field: 'audience',
        label: '给谁看？在什么场景、什么设备上用？语气要怎样？',
        type: 'text',
        required: true,
        allowSkip: false,
        hint: '例：B2B 运营负责人，桌面端为主，语气克制专业。',
      },
    ],
  },
  {
    id: 'context',
    title: '语境从哪来',
    questions: [
      {
        id: 'contextSources',
        field: 'contextSources',
        label: '有哪些现成的语境可以给我？',
        type: 'multi',
        options: [...INTAKE_CONTEXT_SOURCES],
        required: true,
        allowSkip: false,
        hint: 'existing-design-system 已有设计系统；url 参考网站；repo 代码仓库；screenshots 截图；none 暂时没有。',
      },
      {
        id: 'references',
        field: 'references',
        label: '参考链接 / 文件路径（每行一个，可留空）',
        type: 'text',
        required: false,
        allowSkip: true,
        hint: '例：https://example.com/pricing',
      },
      {
        id: 'brandConstraints',
        field: 'brandConstraints',
        label: '品牌约束：色板、字体、禁用元素',
        type: 'text',
        required: false,
        allowSkip: true,
        hint: '例：主色 #b4552f，衬线标题，禁止紫色渐变与 emoji。',
      },
    ],
  },
  {
    id: 'variations',
    title: '变体与探索',
    questions: [
      {
        id: 'variationsCount',
        field: 'variations.count',
        label: '要几档变体？',
        type: 'single',
        options: ['2', '3', '4'],
        required: true,
        allowSkip: true,
        hint: '默认 3 档：规范 / 进阶 / 前卫。',
      },
      {
        id: 'variationDimensions',
        field: 'variations.dimensions',
        label: '希望在哪些维度探索变体？',
        type: 'multi',
        options: [...INTAKE_DIMENSIONS],
        required: true,
        allowSkip: true,
        hint: 'visual 视觉；interaction 交互；layout 布局；copy 文案；motion 动效。',
      },
      {
        id: 'variationRange',
        field: 'variations.range',
        label: '变体跨度：从规矩到前卫的哪一档？',
        type: 'single',
        options: [...INTAKE_RANGES],
        required: false,
        allowSkip: true,
        hint: '默认 基础→进阶。',
      },
    ],
  },
  {
    id: 'tweaks',
    title: 'Tweaks 与内容',
    questions: [
      {
        id: 'tweaks',
        field: 'tweaks',
        label: '希望哪些参数可以实时调（Tweaks）？',
        type: 'multi',
        options: [...INTAKE_TWEAKS],
        required: false,
        allowSkip: true,
        hint: 'color 颜色；type 字体；spacing 间距；copy 文案；layout 布局变体；toggle 开关。',
      },
      {
        id: 'contentMust',
        field: 'contentMust',
        label: '必须出现的内容 / 真实数据',
        type: 'text',
        required: false,
        allowSkip: true,
        hint: '例：价格三档、客户 Logo、真实指标数据。',
      },
      {
        id: 'contentAvoid',
        field: 'contentAvoid',
        label: '不要出现的内容 / 禁用项',
        type: 'text',
        required: false,
        allowSkip: true,
        hint: '例：不要假客户评价、不要 lorem ipsum、不要轮播。',
      },
      {
        id: 'openQuestions',
        field: 'openQuestions',
        label: '还有哪些想让我先追问的点？',
        type: 'text',
        required: false,
        allowSkip: true,
        hint: '例：目标市场待定、预算未定。',
      },
    ],
  },
  {
    id: 'delivery',
    title: '交付与成功标准',
    questions: [
      {
        id: 'deliverables',
        field: 'deliverables',
        label: '要哪些交付格式？',
        type: 'multi',
        options: [...INTAKE_DELIVERABLES],
        required: true,
        allowSkip: true,
        hint: 'html / zip / pdf / png / pptx。',
      },
      {
        id: 'responsive',
        field: 'responsive',
        label: '需要覆盖哪些尺寸？',
        type: 'multi',
        options: [...INTAKE_RESPONSIVE],
        required: false,
        allowSkip: true,
        hint: 'desktop 桌面；tablet 平板；mobile 手机。',
      },
      {
        id: 'success',
        field: 'success',
        label: '验收标准是什么？',
        type: 'multi',
        options: [...INTAKE_SUCCESS],
        required: false,
        allowSkip: true,
        hint: '默认质检 ≥90。',
      },
    ],
  },
]

/** Public question shape shared by the panel route and the agent tool. */
function publicQuestion(question) {
  return {
    id: question.id,
    label: question.label,
    type: question.type,
    options: Array.isArray(question.options) ? [...question.options] : [],
    required: question.required === true,
    allowSkip: question.allowSkip === true,
    hint: question.hint ?? '',
  }
}

/** The six question groups (frozen public shape). */
export const INTAKE_QUESTIONS = Object.freeze(
  GROUP_DEFS.map((group) =>
    Object.freeze({
      id: group.id,
      title: group.title,
      questions: Object.freeze(group.questions.map((question) => Object.freeze(publicQuestion(question)))),
    }),
  ),
)

/** question id → intake field path. */
const FIELD_BY_QUESTION = new Map(GROUP_DEFS.flatMap((group) => group.questions.map((question) => [question.id, question.field])))

/** Flat question list for the agent/tool and the panel chips. */
export function intakeQuestionList() {
  return INTAKE_QUESTIONS.flatMap((group) => group.questions.map((question) => ({ ...question, group: group.id })))
}

/** Trim one text value to the intake budget. */
function text(value, max = INTAKE_TEXT_MAX) {
  if (typeof value !== 'string') return ''
  return truncateUtf8(value.trim(), max).text
}

/** Split a string answer into list items (newlines/commas/semicolons). */
function splitList(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split(/[\n,，;；]+/u)
  return []
}

/** One deduped, limited list of trimmed strings. */
function stringList(value, max = INTAKE_LIST_MAX, itemMax = INTAKE_ITEM_MAX) {
  const out = []
  const seen = new Set()
  for (const item of splitList(value)) {
    if (typeof item !== 'string') continue
    const clean = truncateUtf8(item.trim(), itemMax).text
    if (clean.length === 0 || seen.has(clean)) continue
    seen.add(clean)
    out.push(clean)
    if (out.length >= max) break
  }
  return out
}

/** One deduped, limited list restricted to a canonical option set. */
function optionList(value, allowed, max = INTAKE_LIST_MAX) {
  const set = new Set(allowed)
  const out = []
  const seen = new Set()
  for (const item of stringList(value, max * 2)) {
    const key = item.toLowerCase()
    if (!set.has(key) || seen.has(key)) continue
    seen.add(key)
    out.push(key)
    if (out.length >= max) break
  }
  return out
}

/** 2–4 variants, default 3. */
function variationCount(value) {
  const count = Number(value)
  if (!Number.isFinite(count)) return 3
  const rounded = Math.round(count)
  return rounded >= 2 && rounded <= 4 ? rounded : 3
}

/** A valid ISO timestamp string, else ''. */
function isoOrEmpty(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return ''
  const time = Date.parse(value)
  if (Number.isNaN(time)) return ''
  return new Date(time).toISOString()
}

/** True when `value` can stand for one question answer. */
function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return Number.isFinite(value) && value > 0
  return value !== null && value !== undefined
}

/** Read one dotted path from the intake object. */
function readPath(intake, field) {
  return String(field ?? '')
    .split('.')
    .reduce((value, key) => (value !== null && typeof value === 'object' ? value[key] : undefined), intake)
}

/**
 * Normalise arbitrary intake input into the persisted shape.
 * Never throws: unknown keys are dropped, wrong types fall back to defaults.
 * @param {unknown} input
 */
export function normalizeIntake(input) {
  const raw = isPlainObject(input) ? input : {}
  const variations = isPlainObject(raw.variations) ? raw.variations : {}
  const countSource = Object.prototype.hasOwnProperty.call(variations, 'count') ? variations.count : raw.variationsCount
  const dimensionsSource = Object.prototype.hasOwnProperty.call(variations, 'dimensions') ? variations.dimensions : raw.variationDimensions
  const rangeSource = Object.prototype.hasOwnProperty.call(variations, 'range') ? variations.range : raw.variationRange
  const kind = typeof raw.kind === 'string' ? raw.kind.trim().toLowerCase() : ''
  return {
    kind: KINDS.includes(kind) ? kind : '',
    goal: text(raw.goal),
    audience: text(raw.audience),
    contextSources: optionList(raw.contextSources, INTAKE_CONTEXT_SOURCES),
    references: stringList(raw.references, INTAKE_LIST_MAX),
    brandConstraints: text(raw.brandConstraints),
    variations: {
      count: variationCount(countSource),
      dimensions: optionList(dimensionsSource, INTAKE_DIMENSIONS),
      range: text(rangeSource, 200),
    },
    tweaks: optionList(raw.tweaks, INTAKE_TWEAKS),
    contentMust: text(raw.contentMust),
    contentAvoid: text(raw.contentAvoid),
    deliverables: optionList(raw.deliverables, INTAKE_DELIVERABLES),
    responsive: optionList(raw.responsive, INTAKE_RESPONSIVE),
    success: stringList(raw.success, INTAKE_LIST_MAX, 200),
    openQuestions: stringList(raw.openQuestions, INTAKE_LIST_MAX),
    completedAt: isoOrEmpty(raw.completedAt),
    source: INTAKE_SOURCES.includes(raw.source) ? raw.source : '',
  }
}

/**
 * Incremental merge: keys present in `patch` replace the current value (arrays
 * replace wholesale), absent keys keep the old answer. `variations` merges per
 * sub-field; `variationsCount` / `variationDimensions` / `variationRange` are
 * accepted as aliases for the nested shape.
 * @param {unknown} current
 * @param {unknown} patch
 */
export function mergeIntake(current, patch) {
  const base = normalizeIntake(current)
  const raw = isPlainObject(patch) ? patch : {}
  const normalized = normalizeIntake(raw)
  const merged = { ...base, variations: { ...base.variations } }
  for (const key of INTAKE_KEYS) {
    if (key === 'variations') continue
    if (Object.prototype.hasOwnProperty.call(raw, key)) merged[key] = normalized[key]
  }
  const patchVariations = isPlainObject(raw.variations) ? raw.variations : {}
  const variationsProvided =
    Object.prototype.hasOwnProperty.call(raw, 'variations') ||
    Object.prototype.hasOwnProperty.call(raw, 'variationsCount') ||
    Object.prototype.hasOwnProperty.call(raw, 'variationDimensions') ||
    Object.prototype.hasOwnProperty.call(raw, 'variationRange')
  if (variationsProvided) {
    merged.variations = {
      count: Object.prototype.hasOwnProperty.call(patchVariations, 'count') || Object.prototype.hasOwnProperty.call(raw, 'variationsCount') ? normalized.variations.count : base.variations.count,
      dimensions: Object.prototype.hasOwnProperty.call(patchVariations, 'dimensions') || Object.prototype.hasOwnProperty.call(raw, 'variationDimensions') ? normalized.variations.dimensions : base.variations.dimensions,
      range: Object.prototype.hasOwnProperty.call(patchVariations, 'range') || Object.prototype.hasOwnProperty.call(raw, 'variationRange') ? normalized.variations.range : base.variations.range,
    }
  }
  return merged
}

/**
 * Which questions are answered, weighted (required questions count double).
 * @returns {{score:number, filled:string[], missing:string[]}}
 */
export function intakeCompleteness(input) {
  const intake = normalizeIntake(input)
  const filled = []
  const missing = []
  let totalWeight = 0
  let filledWeight = 0
  for (const question of INTAKE_QUESTIONS.flatMap((group) => group.questions)) {
    const weight = question.required ? 2 : 1
    totalWeight += weight
    const field = FIELD_BY_QUESTION.get(question.id)
    if (hasValue(readPath(intake, field))) {
      filled.push(question.id)
      filledWeight += weight
    } else {
      missing.push(question.id)
    }
  }
  const score = totalWeight > 0 ? Math.round((filledWeight / totalWeight) * 100) : 0
  return { score, filled, missing }
}

/** List formatting for summaries. */
function listText(list) {
  return Array.isArray(list) ? list.join('、') : ''
}

/**
 * Plain-text intake summary used by DESIGN.md and the handoff prompt.
 * Empty answers are omitted; the completeness line always closes the block.
 * @param {unknown} input
 * @returns {string}
 */
export function intakeSummary(input) {
  const intake = normalizeIntake(input)
  const lines = []
  if (intake.kind) lines.push(`- 类型：${intake.kind}`)
  if (intake.goal) lines.push(`- 目标：${intake.goal}`)
  if (intake.audience) lines.push(`- 受众/场景：${intake.audience}`)
  if (intake.contextSources.length > 0) lines.push(`- 语境来源：${listText(intake.contextSources)}`)
  if (intake.references.length > 0) lines.push(`- 参考：${listText(intake.references)}`)
  if (intake.brandConstraints) lines.push(`- 品牌约束：${intake.brandConstraints}`)
  const variations = intake.variations
  const variationParts = [`${variations.count} 档`]
  if (variations.dimensions.length > 0) variationParts.push(listText(variations.dimensions))
  if (variations.range) variationParts.push(variations.range)
  lines.push(`- 变体：${variationParts.join(' · ')}`)
  if (intake.tweaks.length > 0) lines.push(`- Tweaks：${listText(intake.tweaks)}`)
  if (intake.contentMust) lines.push(`- 必须内容：${intake.contentMust}`)
  if (intake.contentAvoid) lines.push(`- 避免内容：${intake.contentAvoid}`)
  if (intake.deliverables.length > 0) lines.push(`- 交付格式：${listText(intake.deliverables)}`)
  if (intake.responsive.length > 0) lines.push(`- 响应式：${listText(intake.responsive)}`)
  if (intake.success.length > 0) lines.push(`- 验收标准：${listText(intake.success)}`)
  if (intake.openQuestions.length > 0) lines.push(`- 待追问：${listText(intake.openQuestions)}`)
  const completeness = intakeCompleteness(intake)
  lines.push(`- 完整度：${completeness.score}%${completeness.missing.length > 0 ? `（缺失：${completeness.missing.join(', ')}）` : ''}`)
  return truncateUtf8(lines.join('\n'), 4000).text
}
