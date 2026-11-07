/**
 * dsh-design-studio — constants, limits, and configuration resolution.
 *
 * Everything the engine can tune lives here so the tools, the panel, the probe
 * and the audits agree on one budget. No host files are ever read.
 */

/** Package / loader row / panel key. */
export const PLUGIN_NAME = 'dsh-design-studio'
/** Route prefix owned by the Host half (also the Client fetch base). */
export const ROUTE_PREFIX = '/dsh-design-studio'
/** Request header that marks a call as coming from this plugin's page code. */
export const REQUEST_HEADER = 'x-dsh-design-studio'
/** Persisted project schema version. */
export const SCHEMA_VERSION = 1
/** Design projects discovered under `<dataDir>/projects`. */
export const DEFAULT_WIDTHS = Object.freeze([1440, 768, 375])
/** Viewport heights paired with widths (desktop, tablet, phone, slide, poster, A4). */
export const VIEWPORT_HEIGHTS = Object.freeze({
  1440: 900,
  1280: 832,
  1024: 768,
  768: 900,
  430: 932,
  390: 844,
  375: 812,
  1920: 1080,
  1080: 1080,
  794: 1123,
})
/** Default viewports per project kind. */
export const KIND_VIEWPORTS = Object.freeze({
  web: Object.freeze([1440, 768, 375]),
  mobile: Object.freeze([390, 375]),
  deck: Object.freeze([1920]),
  poster: Object.freeze([1080]),
  doc: Object.freeze([794]),
})
/** Supported project kinds. */
export const KINDS = Object.freeze(['web', 'mobile', 'deck', 'poster', 'doc'])
/** Supported export kinds. */
export const EXPORT_KINDS = Object.freeze(['html', 'zip', 'pdf', 'png', 'pptx'])
/** Supported scaffold ids (kept in sync with lib/scaffolds.js). */
export const SCAFFOLD_IDS = Object.freeze(['browser', 'ios', 'android', 'macos', 'deck', 'canvas', 'tweaks', 'anim', 'poster', 'doc'])

/** Hard limits shared by the engine, the routes and the tools. */
export const LIMITS = Object.freeze({
  /** Longest page height captured, in CSS px (memory guard). */
  maxPageHeight: 12000,
  /** Longest page width captured, in CSS px. */
  maxPageWidth: 2560,
  /** Bytes of one design HTML file accepted from the panel. */
  maxDesignBytes: 4 * 1024 * 1024,
  /** Nodes kept in a probe's element sample. */
  maxSampleNodes: 6000,
  /** Text kept from one page, in characters. */
  maxTextChars: 30000,
  /** Bytes per context evidence record. */
  maxEvidenceBytes: 256 * 1024,
  /** Bytes of a tool's returned prompt content. */
  toolContentBytes: 64 * 1024,
  /** JSON request bodies from the panel. */
  maxBodyBytes: 8 * 1024 * 1024,
  /** Image / export bytes served by the panel (one file). */
  maxImageBytes: 24 * 1024 * 1024,
  /** Exported file cap. */
  maxExportBytes: 64 * 1024 * 1024,
  /** Projects kept in the store before creation is refused. */
  maxProjects: 200,
  /** Checks kept per project (oldest pruned). */
  maxChecks: 30,
  /** Inline comments kept per project. */
  maxComments: 200,
  /** Panel-save history snapshots kept per project. */
  maxHistory: 40,
  /** Explicit versions kept per project. */
  maxVersions: 40,
  /** Browser idle time before the process is released. */
  browserIdleMs: 90 * 1000,
  /** Wall-clock limit for one check job. */
  jobTimeoutMs: 180 * 1000,
  /** Navigation settle limit. */
  settleTimeoutMs: 20000,
  /** Quiet network window that counts as settled. */
  networkQuietMs: 220,
  /** Longest a single CDP command may take. */
  cdpTimeoutMs: 30000,
  /** Files scanned when importing tokens from a repository. */
  maxRepoFiles: 400,
})

/** Analytics/tracker hosts blocked during capture so pages settle and checks stay stable. */
export const DEFAULT_BLOCKED_HOSTS = Object.freeze([
  'google-analytics.com',
  'googletagmanager.com',
  'googletagservices.com',
  'doubleclick.net',
  'facebook.net',
  'facebook.com',
  'hotjar.com',
  'hotjar.io',
  'segment.io',
  'segment.com',
  'mixpanel.com',
  'amplitude.com',
  'fullstory.com',
  'clarity.ms',
  'sentry.io',
  'bugsnag.com',
  'intercom.io',
  'intercomcdn.com',
  'drift.com',
])

/** What a fresh plugin instance records when no config is supplied. */
export const DEFAULT_CONFIG = Object.freeze({
  dataDir: '',
  browserPath: '',
  blockedHosts: DEFAULT_BLOCKED_HOSTS,
  openStates: false,
  viewports: DEFAULT_WIDTHS,
})

/** A supported viewport width stays inside sane browser bounds. */
function validWidth(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const w = Math.round(n)
  return w >= 240 && w <= 3840 ? w : null
}

/** Normalise a viewports argument: de-duplicated, descending, 1-4 entries. */
export function normalizeViewports(value, kind = 'web') {
  const fallback = KIND_VIEWPORTS[kind] ?? DEFAULT_WIDTHS
  const source = Array.isArray(value) ? value : value === undefined || value === null ? fallback : [value]
  const seen = new Set()
  const out = []
  for (const item of source) {
    const w = validWidth(item)
    if (w === null || seen.has(w)) continue
    seen.add(w)
    out.push(w)
  }
  if (out.length === 0) return [...fallback]
  out.sort((a, b) => b - a)
  return out.slice(0, 4)
}

/** Viewport height for a width: the default pair, else a 16:10-ish height. */
export function heightForWidth(width) {
  return VIEWPORT_HEIGHTS[width] ?? Math.max(480, Math.round(width * 0.62))
}

/** Resolve the loader row's config into the engine's budget. Never throws. */
export function resolveConfig(raw) {
  const config = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const browserPath = typeof config.browserPath === 'string' ? config.browserPath.trim() : ''
  return {
    dataDir: typeof config.dataDir === 'string' ? config.dataDir.trim() : '',
    browserPath,
    blockedHosts: Array.isArray(config.blockedHosts)
      ? config.blockedHosts.filter((host) => typeof host === 'string' && host.trim().length > 0).map((host) => host.trim())
      : [...DEFAULT_BLOCKED_HOSTS],
    openStates: config.openStates === true,
    viewports: normalizeViewports(config.viewports),
  }
}
