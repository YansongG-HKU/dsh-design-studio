/**
 * dsh-design-studio — Host plugin entry.
 *
 * Owns the project store under `<DSH_HOME>/design-studio`, one shared headless
 * browser pool, the probe/audit/export orchestration, ten `design_*` tools, one
 * short system-prompt section, and the loopback panel routes.
 *
 * Nothing here patches the harness or another plugin. A headless profile still
 * gets the tools; a profile without a browser gets clear errors instead of a
 * broken activation.
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import { BrowserPool, findBrowser } from './lib/browser.js'
import { resolveConfig } from './lib/config.js'
import { registerPanel } from './lib/panel.js'
import { createService } from './lib/service.js'
import { createStore } from './lib/store.js'
import { createTools } from './lib/tools.js'
import { messageOf } from './lib/util.js'

/** `tools` is required; the web panel is optional. */
export const inject = ['tools']

/** Package / loader row name. */
export const name = 'dsh-design-studio'

/** The short prompt section that makes the workflow discoverable. */
const PROMPT_SECTION = [
  'Design studio (设计台) is installed. For any visual design task — landing page, dashboard, mobile app screen,',
  'slide deck, poster, one-page doc — use the native workflow instead of guessing.',
  'Start: a new or vague design request needs context before pixels. Call design_intake to get the canonical question list,',
  'then ask the user up to 8 of the missing questions (what exactly, audience, design system / UI kit / repo / Figma / screenshots,',
  'variants wanted and which dimensions, tweaks to explore, visuals-vs-interaction preference, deliverable formats, success criteria),',
  'and persist the answers with design_intake({projectId, answers}). If the user already supplied everything, skip the questions.',
  'Never start from scratch: designs must grow from a real design system, brand tokens, references or existing repo; if none exists,',
  'say which visual DNA assumption you are using and confirm it. Show a placeholder early, then refine.',
  'Then design_start (project + brief + intake) → design_context (real design tokens, screenshots and references from a URL, repo, image or note)',
  '→ write three graded variants as self-contained HTML under the project design/ folder (A spec, B advanced, C avant-garde)',
  '→ design_check (real headless browser: accessibility, contrast, typography, spacing, design-system adherence, AI-slop, responsive)',
  '→ fix the findings and check again until the score is at least 90 → design_export (html / zip / pdf / png / pptx).',
  'Change structure through chat, visual details through inline comments and the canvas inspector / TWEAKS block; never pile up v2.html files.',
  'Finish with a minimal summary: only caveats and next steps.',
  'Never ship generic AI-slop: real typography, 4/8 spacing rhythm, no purple-blue gradients, no emoji walls, no fake testimonials,',
  'logos or statistics. Keep the TWEAKS edit-mode block when the scaffold provides it; report the score you actually measured.',
  'The Design Studio (设计台) sidebar panel shows the same projects, canvas, inline comments, checks, design system and exports,',
  'and the user can edit and comment on the canvas there — read design_comments when the user leaves inline comments.',
].join(' ')

/** Resolve the plugin's data directory. */
function resolveDataDir(config) {
  if (typeof config?.dataDir === 'string' && config.dataDir.trim().length > 0) return config.dataDir.trim()
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'design-studio')
}

/** A logger that never throws. */
function createLog(ctx) {
  const write = (level, message) => {
    try {
      const logger = ctx?.logger
      if (typeof logger?.[level] === 'function') logger[level](`[dsh-design-studio] ${message}`)
    } catch {
      /* logging never breaks activation */
    }
  }
  return {
    info: (message) => write('info', message),
    warn: (message) => write('warn', message),
  }
}

/**
 * Plugin activation.
 * @param {object} ctx Cordis context with `tools`
 * @param {unknown} rowConfig loader row config
 */
export function apply(ctx, rowConfig) {
  const log = createLog(ctx)
  const config = resolveConfig(rowConfig)
  const dataDir = resolveDataDir(config)
  let store
  let pool
  let service
  let panelDispose = null
  let disposed = false

  try {
    store = createStore({ dir: dataDir, log })
    pool = new BrowserPool({ browserPath: config.browserPath, blockedHosts: config.blockedHosts, log })
    service = createService({ store, pool, config, log })
    // Create the store root in the background; calls await ensureDir lazily.
    void store.init().catch((error) => log.warn(`could not create the data directory: ${messageOf(error)}`))
  } catch (error) {
    log.warn(`could not initialise the plugin; staying inert: ${messageOf(error)}`)
    return () => {}
  }

  // Agent tools.
  let registered = 0
  try {
    for (const definition of createTools({ service, config, log })) {
      try {
        ctx.effect(() => ctx.tools.register(definition), `dsh-design-studio: ${definition.name}`)
        registered += 1
      } catch (error) {
        log.warn(`could not register ${definition.name}: ${messageOf(error)}`)
      }
    }
  } catch (error) {
    log.warn(`could not build the tool definitions: ${messageOf(error)}`)
  }

  // Discoverability prompt section (small, passive).
  try {
    if (typeof ctx.systemPrompt?.section === 'function') {
      ctx.effect(
        () =>
          ctx.systemPrompt.section({
            name: 'dsh-design-studio',
            order: 9170,
            interpolate: false,
            text: () => PROMPT_SECTION,
          }),
        'dsh-design-studio: prompt section',
      )
    }
  } catch (error) {
    log.warn(`could not register the prompt section: ${messageOf(error)}`)
  }

  // Panel routes (optional: headless profiles have no web server).
  try {
    panelDispose = registerPanel({ ctx, service, log })
  } catch (error) {
    log.warn(`could not register the panel routes: ${messageOf(error)}`)
  }

  const browser = findBrowser(config.browserPath)
  log.info(
    browser.path
      ? `active: ${registered} tools, panel /dsh-design-studio, browser ${browser.path}, data ${dataDir}`
      : `active without a browser: ${registered} tools; design_check will report that Chrome or Edge is required`,
  )

  return () => {
    if (disposed) return
    disposed = true
    try {
      panelDispose?.()
    } catch {
      /* best effort */
    }
    void service
      ?.dispose()
      .catch((error) => log.warn(`service disposal failed: ${messageOf(error)}`))
      .then(() => pool?.dispose().catch((error) => log.warn(`browser disposal failed: ${messageOf(error)}`)))
  }
}
