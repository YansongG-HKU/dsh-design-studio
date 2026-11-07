/**
 * dsh-design-studio — the ten agent-facing tools (CONTRACT §3/§8).
 *
 * Workflow: design_start → design_context → write design/a.html,b,c →
 * design_check (repeat until ≥ 90) → design_export. Comments, tweaks, versions
 * and the design system are reachable from the same tools so everything the
 * panel can do is also one tool call away.
 *
 * Every tool validates its own arguments, never throws into the model, keeps
 * returned content inside LIMITS.toolContentBytes, and reports failures as
 * `{ok:false, code, error, repair:{action,label,detail}}` so the agent can
 * recover without guessing. Descriptions follow "when to use → what happens →
 * what to do next" and stay outcome-first.
 */

import { EXPORT_KINDS, KIND_VIEWPORTS, KINDS, LIMITS, SCAFFOLD_IDS } from './config.js'
import { intakeCompleteness } from './intake.js'
import { scaffoldContent } from './scaffolds.js'
import { isPlainObject, messageOf, truncateUtf8 } from './util.js'

/** Tool output presenter: one bounded JSON text block. */
const OUTPUT = {
  schema: { type: 'object', additionalProperties: true },
  render: (_args, value) => {
    const text = JSON.stringify(value ?? null)
    const bounded = truncateUtf8(text, LIMITS.toolContentBytes)
    return [{ type: 'text', text: bounded.truncated ? `${bounded.text}\n… output truncated` : bounded.text }]
  },
}

/** Structured repair hint. */
function repair(action, label, detail) {
  return { action, label, detail }
}

/** A structured failure value. */
function failure(code, error, hint) {
  return { ok: false, code, error, repair: hint }
}

/** A plain error carrying a contract failure code. */
function codedError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

/** Poll the job runner until the job settles (or the wait budget expires). */
function awaitJob(service, jobId, timeoutMs = LIMITS.jobTimeoutMs + 20000) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const timer = setInterval(() => {
      let job
      try {
        job = service.jobs.get(jobId)
      } catch (error) {
        clearInterval(timer)
        reject(error)
        return
      }
      if (!job) {
        clearInterval(timer)
        reject(codedError('failed', `job ${jobId} vanished before it settled`))
        return
      }
      if (job.status === 'done') {
        clearInterval(timer)
        resolve(job)
        return
      }
      if (job.status === 'failed' || job.status === 'cancelled') {
        clearInterval(timer)
        reject(codedError(job.code ?? (job.status === 'cancelled' ? 'cancelled' : 'failed'), job.error ?? `job ${jobId} ${job.status}`))
        return
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer)
        reject(codedError('timeout', `the job did not finish within ${Math.round(timeoutMs / 1000)} s`))
      }
    }, 300)
  })
}

/** Map a failure code to a concrete recovery hint. */
function repairForCode(code, detail) {
  switch (code) {
    case 'no_browser':
      return repair('install-browser', 'Install Chrome or Edge', 'Set the DESIGN_STUDIO_BROWSER environment variable to a Chrome/Edge executable (or install one), then run the check again.')
    case 'busy':
      return repair('wait', 'Wait for the running job', 'This project already has a running job; poll design_projects with action="get" until its job finishes, then retry.')
    case 'not_found':
      return repair('list-projects', 'Check the id', detail ?? 'Call design_projects with action="list" to see the project ids and available variants.')
    case 'no_preview':
      return repair('open-browser', 'Open the design file directly', 'The preview could not start; open design/<variant>.html from the project folder, or use the panel.')
    case 'timeout':
      return repair('retry', 'Retry', 'Close other heavy browser tabs and run the action again; a check normally takes 10–40 s.')
    case 'too_large':
      return repair('shrink', 'Shrink the file', 'Design HTML must stay under 4 MiB; move large images into design/assets/ and reference them by relative path.')
    case 'cancelled':
      return repair('retry', 'Retry', 'The job was cancelled; run it again when ready.')
    case 'not_ready':
      return repair('retry', 'Wait and retry', 'A required module is still loading; retry once the plugin has finished activating.')
    case 'invalid_input':
      return repair('fix-input', 'Fix the arguments', detail ?? 'Re-read the parameter descriptions and pass valid values.')
    default:
      return repair('retry', 'Retry', 'Inspect the project state with design_projects action="get"; if it keeps failing, open the panel diagnostics.')
  }
}

/** Treat a variant argument as a string (defaults are handled per tool). */
function variantArg(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

/** A bounded token summary for tool output (never the full token object). */
function tokenSummary(tokens) {
  if (!isPlainObject(tokens)) return null
  const color = isPlainObject(tokens.color) ? Object.keys(tokens.color).length : 0
  const font = isPlainObject(tokens.font) ? Object.keys(tokens.font) : []
  const sizes = Array.isArray(tokens.size?.scale) ? tokens.size.scale.length : 0
  const spacing = Array.isArray(tokens.space?.scale) ? tokens.space.scale.length : 0
  const radii = Array.isArray(tokens.radius?.scale) ? tokens.radius.scale.length : 0
  return {
    name: typeof tokens.name === 'string' ? tokens.name : '',
    colors: color,
    fontRoles: font,
    sizes,
    spacing,
    radii,
    notes: typeof tokens.notes === 'string' ? truncateUtf8(tokens.notes, 800).text : '',
  }
}

/** Compact one check record for the model (bounded findings and paths). */
function summarizeCheck(check, projectDir) {
  const variants = Array.isArray(check?.variants) ? check.variants : []
  const topIssues = []
  for (const row of variants) {
    for (const finding of Array.isArray(row.findings) ? row.findings : []) {
      topIssues.push({
        variant: row.variant,
        category: finding.category ?? '',
        severity: finding.severity,
        code: finding.code,
        message: finding.message,
        fix: finding.fix,
        ...(finding.selector ? { selector: finding.selector } : {}),
      })
    }
    for (const category of Array.isArray(row.categories) ? row.categories : []) {
      for (const finding of Array.isArray(category.findings) ? category.findings : []) {
        if (Array.isArray(row.findings) && row.findings.length > 0) continue
        topIssues.push({ variant: row.variant, category: category.id, severity: finding.severity, code: finding.code, message: finding.message, fix: finding.fix, ...(finding.selector ? { selector: finding.selector } : {}) })
      }
    }
  }
  const severityRank = { critical: 0, high: 1, medium: 2, low: 3 }
  topIssues.sort((a, b) => (severityRank[a.severity] ?? 4) - (severityRank[b.severity] ?? 4))
  return {
    round: check?.round ?? null,
    score: check?.score ?? null,
    grade: check?.grade ?? null,
    pass: check?.pass === true,
    durationMs: check?.durationMs ?? 0,
    counts: isPlainObject(check?.counts) ? check.counts : { critical: 0, high: 0, medium: 0, low: 0 },
    variants: variants.map((row) => ({
      variant: row.variant,
      score: row.score,
      grade: row.grade,
      pass: row.pass === true,
      categories: (Array.isArray(row.categories) ? row.categories : []).map((category) => ({
        id: category.id,
        label: category.label,
        score: category.score,
        weight: category.weight,
        findings: (Array.isArray(category.findings) ? category.findings : []).slice(0, 6).map((finding) => ({
          severity: finding.severity,
          code: finding.code,
          message: finding.message,
          fix: finding.fix,
          ...(finding.selector ? { selector: finding.selector } : {}),
        })),
      })),
      viewports: (Array.isArray(row.viewports) ? row.viewports : []).map((viewport) => ({ width: viewport.width, score: viewport.score, findings: Array.isArray(viewport.findings) ? viewport.findings.length : 0 })),
      screenshots: (Array.isArray(row.screenshots) ? row.screenshots : []).map((shot) => ({
        width: shot.width,
        path: shot.path,
        ...(shot.noise ? { noise: shot.noise } : {}),
        ...(projectDir ? { file: `${projectDir}/${shot.path}` } : {}),
      })),
      screens: Array.isArray(row.screens) ? row.screens.map((screen) => ({ label: screen.label, index: screen.index, score: screen.score ?? null })) : [],
      health: row.health ?? { consoleErrors: [], failedRequests: [] },
    })),
    topIssues: topIssues.slice(0, 12),
    issueCount: topIssues.length,
  }
}

/**
 * Build the tool definitions.
 * @param {{service: object, config?: object, log?: {warn?: Function}}} options
 */
export function createTools({ service, config, log } = {}) {
  if (!service || typeof service !== 'object') throw new Error('createTools needs the service')
  const tools = []
  const warn = (message) => {
    try {
      log?.warn?.(message)
    } catch {
      /* logging never breaks a tool */
    }
  }

  /** Wrap a handler so unexpected errors become structured failures. */
  const guarded = (name, handler) => async (args) => {
    try {
      return await handler(isPlainObject(args) ? args : {})
    } catch (error) {
      warn(`tool ${name} failed: ${messageOf(error)}`)
      const code = typeof error?.code === 'string' ? error.code : 'failed'
      return failure(code, messageOf(error), isPlainObject(error?.repair) ? error.repair : repairForCode(code))
    }
  }

  /** The absolute project root when the service exposes it. */
  const projectDir = (projectId) => {
    try {
      if (typeof service.paths === 'function') return service.paths(projectId).root
    } catch {
      /* fall through */
    }
    return ''
  }

  tools.push({
    name: 'design_start',
    description: [
      'Create a design project and seed it: brief, a one-page DESIGN.md, and one starter HTML variant under the project design/ folder.',
      'New or ambiguous requests: ask first with design_intake (6 canonical groups, ≤8 key questions via ask_user_question), then pass the collected answers as intake.',
      'Use this first for any landing page, dashboard, mobile screen, slide deck, poster or one-page doc.',
      'Returns projectId, the absolute project dir where the variants are written (design/a.html, b.html, c.html), the variant list and next steps.',
      'Pass name, kind (web|mobile|deck|poster|doc), a structured brief (goal, audience, layout, content, constraints), optional viewports and scaffold:false to start with no starter file.',
      'Next: import real context with design_context, write three graded variants (A spec, B advanced, C avant-garde), then design_check until the score is at least 90.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name shown in the panel (defaults to 未命名设计).' },
        kind: { type: 'string', enum: [...KINDS], description: 'Design kind; decides default viewports and the starter scaffold (default web).' },
        brief: {
          type: 'object',
          description: 'Structured brief: goal, audience, layout, content and constraints. Real copy only — never lorem ipsum.',
          additionalProperties: false,
          properties: {
            goal: { type: 'string', description: 'What the design must achieve, in one or two sentences.' },
            audience: { type: 'string', description: 'Who uses it and in what context.' },
            layout: { type: 'string', description: 'Sections, hierarchy and rhythm the design should have.' },
            content: { type: 'string', description: 'Real copy and data to use (never lorem ipsum).' },
            constraints: { type: 'string', description: 'Brand, tokens, responsive rules, accessibility constraints.' },
          },
        },
        viewports: { type: 'array', items: { type: 'integer' }, description: 'Viewport widths to design and check, e.g. [1440,768,375]. Defaults per kind.' },
        scaffold: { type: 'boolean', description: 'false starts with an empty design folder; default true seeds design/a.html.' },
        intake: {
          type: 'object',
          additionalProperties: true,
          description: 'Intake answers collected with design_intake: kind, goal, audience, contextSources, references, brandConstraints, variations{count,dimensions,range}, tweaks, contentMust, contentAvoid, deliverables, responsive, success, openQuestions. Partial answers are fine; missing fields stay as follow-up questions.',
        },
      },
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: 60000,
    isConcurrencySafe: () => false,
    execute: guarded('design_start', async (args) => {
      const project = await service.createProject({
        name: args.name,
        kind: args.kind,
        brief: args.brief,
        viewports: Array.isArray(args.viewports) ? args.viewports : undefined,
        scaffold: args.scaffold !== false,
        intake: isPlainObject(args.intake) ? args.intake : undefined,
      })
      const detail = await service.projectDetail(project.id)
      const variants = (detail.variants ?? []).map((variant) => ({ id: variant.id, file: variant.file, label: variant.label, bytes: variant.bytes }))
      const root = projectDir(project.id)
      const designDir = `${root}/design`
      return {
        ok: true,
        projectId: project.id,
        dir: root,
        designDir,
        kind: project.kind,
        viewports: project.viewports,
        variants,
        intakeScore: intakeCompleteness(project.intake).score,
        next: `Write three graded variants as self-contained HTML: ${designDir}/a.html (spec), ${designDir}/b.html (advanced), ${designDir}/c.html (avant-garde). Keep the TWEAK block, use real typography and the 4/8 spacing rhythm, then call design_check({projectId:"${project.id}"}).`,
      }
    }),
  })

  tools.push({
    name: 'design_intake',
    description: [
      'Ask the few questions that make a design good before starting: the canonical 6-group intake (what / who / context / variations / tweaks+content / delivery).',
      'Without projectId it returns the question set to ask through ask_user_question — ask the ≤8 most relevant questions for a new or ambiguous request, then pass the answers into design_start({intake}) or call this tool again with projectId to save them.',
      'With projectId + answers it merges the answers into project.intake (partial updates keep earlier answers) and returns the saved intake, the filled/missing question ids and the suggested next step.',
      'Skip it only when the user already supplied goal, audience, context, variations, tweaks, delivery and success criteria.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Existing project id; when omitted the question set is returned instead of saving.' },
        answers: {
          type: 'object',
          additionalProperties: true,
          description: 'Intake answers keyed by question id or intake field: kind, goal, audience, contextSources, references, brandConstraints, variations{count,dimensions,range}, tweaks, contentMust, contentAvoid, deliverables, responsive, success, openQuestions.',
        },
      },
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: 60000,
    isConcurrencySafe: () => false,
    execute: guarded('design_intake', async (args) => {
      const projectId = String(args.projectId ?? '').trim()
      if (projectId.length === 0) {
        const bank = await service.intakeQuestions()
        return {
          ok: true,
          groups: bank.groups,
          questions: bank.questions,
          howTo: 'Ask up to 8 of these with ask_user_question (question label + options), then call design_start({intake}) with the answers, or design_intake({projectId, answers}) for an existing project.',
          next: 'After the answers are saved or passed to design_start, continue with design_context and write the three graded variants.',
        }
      }
      if (!isPlainObject(args.answers)) {
        return failure(
          'invalid_input',
          'answers is required when projectId is given',
          repair('fix-intake', 'Pass the collected answers', 'Example: {"projectId":"…","answers":{"goal":"做一个落地页","audience":"潜在客户"}}. Omit projectId to get the question list first.'),
        )
      }
      const saved = await service.saveIntake(projectId, args.answers, { source: 'agent' })
      return {
        ok: true,
        projectId,
        intake: saved.intake,
        filled: saved.filled,
        missing: saved.missing,
        score: saved.score,
        next:
          saved.missing.length > 0
            ? `Ask the user only about the missing fields (${saved.missing.slice(0, 6).join(', ')}), save them with design_intake again, then call design_start({intake}).`
            : 'The intake is complete enough. Create the project with design_start({intake}) and continue with design_context.',
      }
    }),
  })

  tools.push({
    name: 'design_context',
    description: [
      'Import real design context into a project: tokens, palette and reference evidence from a URL, a local repo path, an image or a written note.',
      'Use it before designing so the variants inherit the user\'s real design system instead of guessed colours and fonts.',
      'url → computed tokens from a live page; path → CSS/Tailwind/a11y scan of a folder; image → palette from a PNG/JPEG/WebP (data: URL or absolute path); text → a note kept with the project.',
      'adoptSystem:true also writes the proposed tokens as the project design system, which design_check then audits against.',
      'Returns the evidence record, the proposed token summary and whether a system was adopted. Next: write the variants and run design_check.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project id returned by design_start.' },
        kind: { type: 'string', enum: ['url', 'path', 'image', 'text'], description: 'Where the context comes from.' },
        value: { type: 'string', description: 'http(s) URL for url; absolute folder for path; absolute image path or data: URL for image; the note for text.' },
        note: { type: 'string', description: 'Optional note stored with the evidence.' },
        adoptSystem: { type: 'boolean', description: 'true writes the proposed tokens as the project design system.' },
      },
      required: ['projectId', 'kind', 'value'],
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: 90000,
    isConcurrencySafe: () => false,
    execute: guarded('design_context', async (args) => {
      const projectId = String(args.projectId ?? '').trim()
      if (projectId.length === 0) return failure('invalid_input', 'projectId is required', repairForCode('invalid_input', 'Start with design_start or list ids with design_projects action="list".'))
      const result = await service.importContext(projectId, {
        kind: args.kind,
        value: args.value,
        note: args.note,
        adoptSystem: args.adoptSystem === true,
      })
      return {
        ok: true,
        projectId,
        evidence: {
          id: result.evidence?.id,
          kind: result.evidence?.kind,
          summary: result.evidence?.summary,
          files: result.evidence?.files ?? [],
          at: result.evidence?.at,
        },
        tokens: tokenSummary(result.tokens),
        adoptedSystem: Boolean(result.system),
        system: result.system ? { name: result.system.name, source: result.system.source?.kind, updatedAt: result.system.updatedAt } : null,
        next: args.adoptSystem === true
          ? 'Real tokens are installed. Write the variants so colours, fonts, sizes and spacing come from the system, then run design_check.'
          : 'Write the variants using the proposed tokens, then run design_check. Set adoptSystem:true next time to write the tokens into the system automatically.',
      }
    }),
  })

  tools.push({
    name: 'design_system',
    description: [
      'Read or write the project design system: the tokens JSON (colour/font/size/space/radius/layout) and the one-page DESIGN.md the agent must follow.',
      'action:"get" returns the current system; action:"set" accepts tokens (a full token object or its JSON string) and/or doc.',
      'Writing tokens makes design_check audit system adherence against them, so set this before writing variants whenever the user supplied a design system or brand.',
      'Returns the system meta plus the tokens and the DESIGN.md (bounded).',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project id returned by design_start.' },
        action: { type: 'string', enum: ['get', 'set'], description: 'get (default) or set.' },
        tokens: { type: 'object', additionalProperties: true, description: 'Full token object: {name, color, font, size:{scale}, space:{scale}, radius:{scale}, layout, notes}.' },
        doc: { type: 'string', description: 'One-page DESIGN.md text (rules, scales, constraints) for action:"set".' },
        source: {
          type: 'object',
          additionalProperties: false,
          properties: {
            kind: { type: 'string', enum: ['manual', 'url', 'repo', 'image', 'preset'], description: 'Where the system came from.' },
            ref: { type: 'string', description: 'URL, path or preset id that produced the tokens.' },
          },
          description: 'Optional provenance for the system.',
        },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: 60000,
    isConcurrencySafe: () => false,
    execute: guarded('design_system', async (args) => {
      const projectId = String(args.projectId ?? '').trim()
      if (projectId.length === 0) return failure('invalid_input', 'projectId is required', repairForCode('invalid_input', 'Start with design_start.'))
      const action = typeof args.action === 'string' && args.action.length > 0 ? args.action : 'get'
      if (action === 'get') {
        const system = await service.getSystem(projectId)
        return {
          ok: true,
          projectId,
          system: system.system,
          tokens: system.tokens,
          doc: truncateUtf8(system.doc ?? '', 16000).text,
          next: system.tokens ? 'Follow these tokens when writing the variants, then run design_check.' : 'No design system yet. Pass tokens and/or doc with action:"set", or import context from a URL/repo with design_context.',
        }
      }
      if (action === 'set') {
        const written = await service.setSystem(projectId, { tokens: args.tokens, doc: args.doc, source: args.source })
        return {
          ok: true,
          projectId,
          system: written.system,
          tokens: tokenSummary(written.tokens),
          doc: truncateUtf8(written.doc ?? '', 16000).text,
          next: 'The design system is installed and design_check will audit adherence. Keep the variants inside these scales and colours.',
        }
      }
      return failure('invalid_input', `unknown action ${JSON.stringify(action)}`, repairForCode('invalid_input', 'Use action:"get" or action:"set".'))
    }),
  })

  tools.push({
    name: 'design_scaffold',
    description: [
      'Return and/or write one starter scaffold: browser, ios, android, macos, deck, canvas, tweaks, anim, poster or doc.',
      'With projectId + write it is written into the project design/ folder (target file name optional, defaults to <id>.html) and shows up as a new variant.',
      'Without a project, or with write:false, it returns the scaffold HTML (bounded) as a starting point to adapt.',
      'Scaffolds are complete self-contained HTML, include the TWEAKS edit-mode block and follow the anti-AI-slop rules.',
      'Next: adapt the scaffold into the graded variant and run design_check.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project id; when given and write is not false, the scaffold is written into design/.' },
        id: { type: 'string', enum: [...SCAFFOLD_IDS], description: 'Scaffold id to use.' },
        target: { type: 'string', description: 'File name inside design/ (defaults to <id>.html).' },
        write: { type: 'boolean', description: 'false returns the HTML only; default writes when projectId is given.' },
      },
      required: ['id'],
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: 60000,
    isConcurrencySafe: () => false,
    execute: guarded('design_scaffold', async (args) => {
      const projectId = String(args.projectId ?? '').trim()
      const scaffoldId = typeof args.id === 'string' ? args.id.trim() : ''
      if (scaffoldId.length === 0) {
        return failure('invalid_input', 'id is required', repair('choose-scaffold', 'Choose a scaffold id', `Ids: ${SCAFFOLD_IDS.join(', ')}`))
      }
      if (projectId.length > 0 && args.write !== false) {
        const written = await service.scaffold(projectId, { id: scaffoldId, target: args.target })
        return {
          ok: true,
          projectId,
          scaffold: scaffoldId,
          file: written.file,
          bytes: written.bytes,
          next: `Adapt ${written.file} into one of the graded variants, then run design_check({projectId:"${projectId}"}).`,
        }
      }
      const content = scaffoldContent(scaffoldId)
      if (typeof content !== 'string' || content.length === 0) {
        return failure(
          'not_ready',
          `the ${scaffoldId} scaffold is not available yet`,
          repair('write-scaffold', 'Write it into a project instead', 'Pass projectId and omit write:false to write the scaffold into the project design/ folder, or retry after the plugin finishes loading.'),
        )
      }
      const bounded = truncateUtf8(content, LIMITS.toolContentBytes)
      return {
        ok: true,
        scaffold: scaffoldId,
        bytes: Buffer.byteLength(content, 'utf8'),
        truncated: bounded.truncated,
        html: bounded.text,
        next: 'Adapt the HTML into a graded variant and write it into design/, then run design_check.',
      }
    }),
  })

  tools.push({
    name: 'design_check',
    description: [
      'Check the designs with a real headless browser: capture every requested viewport, then audit accessibility, contrast, typography, spacing, design-system adherence, AI-slop patterns and responsive behaviour.',
      'Use it after each design round; the call waits for the job (usually 10–40 s) and writes checks/round-N/check.json plus screenshots.',
      'variant:"all" (default) checks every design/*.html; widths overrides the project viewports.',
      'Returns score 0–100, grade A–F, per-category scores, the highest-severity issues with concrete fixes, per-variant rows and screenshot paths.',
      'Target 90 or better: fix the top findings, save the designs again, then run design_check.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project id returned by design_start.' },
        variant: { type: 'string', description: 'Variant id to check, or "all" (default) for every design/*.html.' },
        widths: { type: 'array', items: { type: 'integer' }, description: 'Viewport widths to capture, e.g. [1440,768,375]; defaults to the project viewports.' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: LIMITS.jobTimeoutMs + 30000,
    isConcurrencySafe: () => false,
    execute: guarded('design_check', async (args) => {
      const projectId = String(args.projectId ?? '').trim()
      if (projectId.length === 0) return failure('invalid_input', 'projectId is required', repairForCode('invalid_input', 'Start with design_start or list ids with design_projects action="list".'))
      const job = service.startCheck(projectId, {
        variant: variantArg(args.variant) ?? 'all',
        widths: Array.isArray(args.widths) ? args.widths : undefined,
      })
      const settled = await awaitJob(service, job.id)
      const round = settled?.result?.round ?? (await service.latestCheck(projectId))?.round
      if (!round) return failure('failed', 'the check finished without a round number', repairForCode('failed'))
      const check = await service.checkRound(projectId, round)
      const summary = summarizeCheck(check, projectDir(projectId))
      const next = (summary.score ?? 0) >= 90
        ? `The design passes at ${summary.score}/100 (${summary.grade}). Report the score and the remaining findings, then export with design_export({projectId:"${projectId}",kind:"zip"}); re-run design_check after any further change.`
        : `Score ${summary.score}/100 (${summary.grade}). Fix the highest-severity findings first (${summary.topIssues.slice(0, 3).map((issue) => issue.code).join(', ') || 'see categories'}), save the designs again, then call design_check again.`
      return {
        ok: true,
        projectId,
        round,
        score: summary.score,
        grade: summary.grade,
        pass: summary.pass,
        durationMs: summary.durationMs,
        counts: summary.counts,
        variants: summary.variants,
        topIssues: summary.topIssues,
        issueCount: summary.issueCount,
        next,
        hint: 'The panel shows the same round with screenshots and the full fix list.',
      }
    }),
  })

  tools.push({
    name: 'design_tweak',
    description: [
      'Read or patch the Tweaks block of one design file — the /*EDITMODE-BEGIN*/ JSON object the scaffold provides.',
      'action:"get" returns every tweak key/value; action:"set" patches one key (string, number, boolean or null), keeping key order and appending new keys.',
      'Use it when the user asks to change one tweakable value or to inspect what the panel Tweaks tab exposes. The file must already contain the TWEAK block.',
      'Returns the file, the full tweaks object and whether the value changed. The panel applies values live; run design_check if the change is significant.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project id returned by design_start.' },
        file: { type: 'string', description: 'Design file name to tweak (default a.html).' },
        action: { type: 'string', enum: ['get', 'set'], description: 'get (default) or set.' },
        key: { type: 'string', description: 'Tweak key to patch, e.g. primaryColor.' },
        value: { type: ['string', 'number', 'boolean', 'null'], description: 'New value for action:"set".' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: 60000,
    isConcurrencySafe: () => false,
    execute: guarded('design_tweak', async (args) => {
      const projectId = String(args.projectId ?? '').trim()
      if (projectId.length === 0) return failure('invalid_input', 'projectId is required', repairForCode('invalid_input', 'Start with design_start.'))
      const file = typeof args.file === 'string' && args.file.trim().length > 0 ? args.file.trim() : 'a.html'
      const action = typeof args.action === 'string' && args.action.length > 0 ? args.action : 'get'
      if (action === 'get') {
        const tweaks = await service.readTweak(projectId, file)
        return { ok: true, projectId, file: tweaks.file, tweaks: tweaks.tweaks, next: 'Patch one value with action:"set", or open the panel Tweaks tab to adjust them live.' }
      }
      if (action === 'set') {
        if (typeof args.key !== 'string' || args.key.trim().length === 0) {
          return failure('invalid_input', 'key is required for action:"set"', repair('fix-input', 'Pass the tweak key', 'Example: {"projectId":"…","action":"set","file":"a.html","key":"primaryColor","value":"#b4552f"}'))
        }
        const patched = await service.patchTweak(projectId, { file, key: args.key.trim(), value: args.value })
        return {
          ok: true,
          projectId,
          file: patched.file,
          changed: patched.changed === true,
          tweaks: patched.tweaks,
          next: 'The design file is patched; run design_check if the change affects layout, colour or type.',
        }
      }
      return failure('invalid_input', `unknown action ${JSON.stringify(action)}`, repair('fix-input', 'Use action:"get" or action:"set"', 'Example: {"projectId":"…","action":"get"}'))
    }),
  })

  tools.push({
    name: 'design_comments',
    description: [
      'List or resolve the inline comments the user left on the canvas.',
      'action:"list" returns every comment with id, variant, selector, element text, note, rect, created/resolved time and reply.',
      'action:"resolve" marks one comment resolved and optionally stores a reply.',
      'Read this when the user mentions comments or asks to address design feedback, edit the design, then run design_check.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project id returned by design_start.' },
        action: { type: 'string', enum: ['list', 'resolve'], description: 'list (default) or resolve.' },
        commentId: { type: 'string', description: 'Comment id for action:"resolve".' },
        reply: { type: 'string', description: 'Optional reply stored with the resolved comment.' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: 60000,
    isConcurrencySafe: () => false,
    execute: guarded('design_comments', async (args) => {
      const projectId = String(args.projectId ?? '').trim()
      if (projectId.length === 0) return failure('invalid_input', 'projectId is required', repairForCode('invalid_input', 'Start with design_start.'))
      const action = typeof args.action === 'string' && args.action.length > 0 ? args.action : 'list'
      if (action === 'list') {
        const comments = await service.listComments(projectId)
        const rows = (Array.isArray(comments) ? comments : []).slice(-100).map((comment) => ({
          id: comment.id,
          variant: comment.variant,
          selector: comment.selector,
          note: comment.note,
          element: comment.element,
          rect: comment.rect,
          createdAt: comment.createdAt,
          resolvedAt: comment.resolvedAt ?? null,
          reply: comment.reply ?? '',
        }))
        return {
          ok: true,
          projectId,
          total: rows.length,
          open: rows.filter((row) => !row.resolvedAt).length,
          comments: rows,
          next: rows.length > 0 ? 'Address the open comments in the design, then run design_check and resolve each comment with action:"resolve".' : 'No comments yet; the user can leave them on the canvas in the panel.',
        }
      }
      if (action === 'resolve') {
        const commentId = String(args.commentId ?? '').trim()
        if (commentId.length === 0) {
          return failure('invalid_input', 'commentId is required for action:"resolve"', repair('list-comments', 'List the comments first', 'Call design_comments with action:"list" to see ids.'))
        }
        const comment = await service.resolveComment(projectId, { id: commentId, reply: args.reply })
        return { ok: true, projectId, comment, next: 'Comment resolved. Resolve the rest, then save the edited design and run design_check.' }
      }
      return failure('invalid_input', `unknown action ${JSON.stringify(action)}`, repair('fix-input', 'Use action:"list" or action:"resolve"', 'Example: {"projectId":"…","action":"list"}'))
    }),
  })

  tools.push({
    name: 'design_export',
    description: [
      'Export one design variant as html, zip, pdf, png or pptx.',
      'html copies the variant; zip bundles design/ + system/ + a project summary; pdf prints the preview; png captures the first viewport full page; pptx turns deck screens (or each viewport) into 16:9 slides.',
      'The file is written under the project exports/ folder and recorded with its bytes.',
      'Run it only after design_check reports the quality the user wants.',
      'Returns the project-relative file, bytes and a download URL.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project id returned by design_start.' },
        kind: { type: 'string', enum: [...EXPORT_KINDS], description: 'Export format.' },
        variant: { type: 'string', description: 'Variant id to export (defaults to the first variant).' },
      },
      required: ['projectId', 'kind'],
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: LIMITS.jobTimeoutMs + 30000,
    isConcurrencySafe: () => false,
    execute: guarded('design_export', async (args) => {
      const projectId = String(args.projectId ?? '').trim()
      if (projectId.length === 0) return failure('invalid_input', 'projectId is required', repairForCode('invalid_input', 'Start with design_start.'))
      if (typeof args.kind !== 'string' || args.kind.trim().length === 0) {
        return failure('invalid_input', 'kind is required', repair('choose-export', 'Choose an export format', `Use one of: ${EXPORT_KINDS.join(', ')}`))
      }
      const result = await service.exportDesign(projectId, { kind: args.kind.trim().toLowerCase(), variant: variantArg(args.variant) })
      const exported = result.export ?? {}
      return {
        ok: true,
        projectId,
        kind: exported.kind,
        file: exported.file,
        bytes: exported.bytes,
        url: exported.url,
        at: exported.at,
        next: 'The export is recorded; tell the user the file path and link. Run design_check again if they ask for changes, then re-export.',
      }
    }),
  })

  tools.push({
    name: 'design_projects',
    description: [
      'List, inspect, delete or version design projects.',
      'action:"list" → summaries (id, name, kind, status, best score, updated time, variants, comments);',
      'action:"get" → one project with its brief, variants and per-variant scores, latest check, design system, versions and exports;',
      'action:"delete" → remove the project and its files; action:"save-version" → snapshot design/ + system/ with an optional label; action:"versions" → list snapshots; action:"restore" → restore one snapshot;',
      'action:"set-brief" → save the five brief fields the user wrote in the panel (goal, audience, layout, content, constraints) and return the persisted brief.',
      'Use it to find project ids, edit the requirements brief, or to roll a design back.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get', 'delete', 'save-version', 'versions', 'restore', 'set-brief'], description: 'Operation to perform.' },
        projectId: { type: 'string', description: 'Project id for get/delete/save-version/versions/restore/set-brief.' },
        label: { type: 'string', description: 'Version label for action:"save-version".' },
        versionId: { type: 'string', description: 'Snapshot id (e.g. v-1) for action:"restore".' },
        limit: { type: 'integer', description: 'Maximum rows for action:"list" (1-100; default 20).' },
        brief: {
          type: 'object',
          additionalProperties: false,
          description: 'Brief fields for action:"set-brief"; omitted fields keep their current value.',
          properties: {
            goal: { type: 'string', description: 'What the design must achieve.' },
            audience: { type: 'string', description: 'Who uses it and in what context.' },
            layout: { type: 'string', description: 'Sections, hierarchy and rhythm.' },
            content: { type: 'string', description: 'Real copy and data to use.' },
            constraints: { type: 'string', description: 'Brand, tokens, responsive and accessibility constraints.' },
          },
        },
      },
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: 60000,
    isConcurrencySafe: () => false,
    execute: guarded('design_projects', async (args) => {
      const action = typeof args.action === 'string' && args.action.length > 0 ? args.action : 'list'
      const projectId = String(args.projectId ?? '').trim()
      if (action === 'list') {
        const limit = Number.isFinite(Number(args.limit)) ? Math.min(100, Math.max(1, Math.round(Number(args.limit)))) : 20
        const projects = (await service.listProjects()).slice(0, limit)
        return {
          ok: true,
          action,
          total: projects.length,
          projects: projects.map((project) => ({
            id: project.id,
            name: project.name,
            kind: project.kind,
            status: project.status,
            bestScore: project.bestScore,
            updatedAt: project.updatedAt,
            variants: project.variants,
            comments: project.comments,
          })),
          next: projects.length === 0 ? 'No projects yet. Call design_start to create one.' : 'Use action:"get" for one project, or design_check to validate a design.',
        }
      }
      if (projectId.length === 0) {
        return failure('invalid_input', `projectId is required for action ${JSON.stringify(action)}`, repairForCode('invalid_input', 'Start with design_start or list ids with action:"list".'))
      }
      if (action === 'get') {
        const detail = await service.projectDetail(projectId)
        const project = detail.project
        const checks = Array.isArray(detail.checks) ? detail.checks.slice(-3) : []
        return {
          ok: true,
          action,
          project: {
            id: project.id,
            name: project.name,
            kind: project.kind,
            status: project.status,
            brief: project.brief,
            intake: project.intake ?? null,
            viewports: project.viewports,
            bestScore: project.bestScore,
            dir: projectDir(projectId),
            variants: (detail.variants ?? []).map((variant) => ({ id: variant.id, label: variant.label, bytes: variant.bytes, score: variant.score ?? null })),
            system: detail.system?.system ? { name: detail.system.system.name, tokensPath: detail.system.system.tokensPath } : null,
            latestCheck: detail.latestCheck,
            checks,
            versions: (detail.versions ?? []).map((version) => ({ id: version.id, label: version.label, files: version.files, at: version.at })),
            exports: (detail.exports ?? []).slice(-5).map((row) => ({ kind: row.kind, file: row.file, bytes: row.bytes, at: row.at })),
            job: detail.job ? { id: detail.job.id, status: detail.job.status, progress: detail.job.progress } : null,
            browser: detail.browser,
          },
          next: 'Write or edit the variants in the design/ folder, then run design_check. Use design_export when the user wants a deliverable.',
        }
      }
      if (action === 'delete') {
        const removed = await service.deleteProject(projectId)
        return { ok: true, action, projectId, removed: removed.removed === true, next: 'The project and its files are gone. Call action:"list" to see the remaining projects.' }
      }
      if (action === 'save-version') {
        const version = await service.saveVersion(projectId, args.label)
        return { ok: true, action, projectId, version, next: 'Snapshot saved. Continue editing; restore it with action:"restore" and versionId if needed.' }
      }
      if (action === 'versions') {
        const versions = await service.listVersions(projectId)
        return { ok: true, action, projectId, versions, next: 'Restore one snapshot with action:"restore" and its versionId.' }
      }
      if (action === 'restore') {
        const versionId = String(args.versionId ?? '').trim()
        if (versionId.length === 0) {
          return failure('invalid_input', 'versionId is required for action:"restore"', repair('list-versions', 'List the versions first', 'Call design_projects with action:"versions" to see ids.'))
        }
        const restored = await service.restoreVersion(projectId, versionId)
        return { ok: true, action, projectId, restored, next: 'The snapshot is restored. Run design_check to validate, and export again if the user needs a fresh deliverable.' }
      }
      if (action === 'set-brief') {
        if (!isPlainObject(args.brief)) {
          return failure(
            'invalid_input',
            'brief is required for action:"set-brief"',
            repair('fix-brief', 'Pass the brief object', 'Example: {"action":"set-brief","projectId":"…","brief":{"goal":"做一个运营仪表盘","audience":"运营团队"}}'),
          )
        }
        const brief = await service.updateBrief(projectId, args.brief)
        return {
          ok: true,
          action,
          projectId,
          brief,
          next: 'The brief is persisted and the panel reloads it. Continue with design_context or write the variants, then design_check.',
        }
      }
      return failure('invalid_input', `unknown action ${JSON.stringify(action)}`, repair('choose-action', 'Use a supported action', 'Actions: list, get, delete, save-version, versions, restore, set-brief.'))
    }),
  })

  tools.push({
    name: 'design_serve',
    description: [
      'Return the preview URL of one design variant so it can be opened in a browser.',
      'Uses the same-origin panel route when the harness has a web server (canvas bridge included), otherwise a loopback static server on 127.0.0.1.',
      'Read-only: nothing is written and no browser is launched.',
      'Use it when the user asks to see the design outside the panel; the panel renders exactly the same URL.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project id returned by design_start.' },
        variant: { type: 'string', description: 'Variant id to serve (defaults to the first variant).' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: 60000,
    isConcurrencySafe: () => true,
    execute: guarded('design_serve', async (args) => {
      const projectId = String(args.projectId ?? '').trim()
      if (projectId.length === 0) return failure('invalid_input', 'projectId is required', repairForCode('invalid_input', 'Start with design_start.'))
      const preview = await service.preview(projectId, variantArg(args.variant))
      return {
        ok: true,
        projectId,
        variant: preview.variant,
        url: preview.url,
        sameOrigin: preview.sameOrigin === true,
        next: 'Open this URL in a browser; the panel canvas uses the same address. Editing there does not save automatically — save the variant, then run design_check.',
      }
    }),
  })

  return tools
}

/** Default viewports per kind, re-exported for tool docs/tests. */
export const KIND_DEFAULT_VIEWPORTS = KIND_VIEWPORTS
