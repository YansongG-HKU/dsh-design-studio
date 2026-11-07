/**
 * dsh-design-studio — minimal in-process job runner.
 *
 * A check or an export takes seconds; the panel starts it and polls, while an
 * agent tool awaits the same job. Jobs are intentionally not durable: a restart
 * is a clean slate and the project record keeps the durable result. At most one
 * job runs per project; a second start is refused with `code:"busy"`.
 *
 * `fn({job, signal, progress})` does the work. `progress(string)` updates the
 * job's progress line, and `signal` is an AbortSignal aborted by cancel(),
 * dispose() and the job timeout — the engine checks it between phases.
 */

import { randomBytes } from 'node:crypto'
import { LIMITS } from './config.js'
import { messageOf, nowIso } from './util.js'

/** A job id: `job-<8 hex>`. */
function newJobId() {
  return `job-${randomBytes(4).toString('hex')}`
}

/** Coerce any progress value into a bounded one-line string. */
function progressText(value) {
  if (typeof value === 'string') return value.slice(0, 300)
  if (value && typeof value === 'object' && typeof value.message === 'string') return value.message.slice(0, 300)
  return ''
}

/**
 * Create the job runner.
 * @param {{log?: {warn?: Function}, maxJobs?: number}} options
 */
export function createJobs({ log, maxJobs = 40 } = {}) {
  const cap = Number.isFinite(maxJobs) && maxJobs > 0 ? Math.floor(maxJobs) : 40
  const jobs = new Map()
  const order = []
  const activeByProject = new Map()
  /** AbortControllers per running job, so cancel() can abort the signal. */
  const controllers = new Map()

  const warn = (message) => {
    try {
      log?.warn?.(message)
    } catch {
      /* logging never breaks a job */
    }
  }

  /** Trim finished jobs beyond the cap; running jobs are never evicted. */
  function prune() {
    while (order.length > cap) {
      const id = order[0]
      const job = jobs.get(id)
      if (job && job.status === 'running') return
      order.shift()
      jobs.delete(id)
      controllers.delete(id)
    }
  }

  /** The public, serialisable view of one job. */
  function publicJob(job) {
    return {
      id: job.id,
      projectId: job.projectId,
      kind: job.kind,
      label: job.label,
      status: job.status,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      progress: job.progress,
      error: job.error,
      code: job.code,
      result: job.result,
    }
  }

  /**
   * Start one job for a project.
   * @param {{projectId: string, kind: string, label?: string, timeoutMs?: number}} spec
   * @param {(context: {job: object, signal: AbortSignal, progress: (value: unknown) => void}) => Promise<unknown>} run
   * @returns {object} the public job
   */
  function start(spec, run) {
    const projectId = String(spec?.projectId ?? '')
    if (typeof run !== 'function') {
      const error = new Error('a job needs a run function')
      error.code = 'invalid_input'
      throw error
    }
    if (activeByProject.has(projectId)) {
      const error = new Error('this project already has a running job')
      error.code = 'busy'
      throw error
    }
    const id = newJobId()
    const controller = new AbortController()
    const job = {
      id,
      projectId,
      kind: String(spec?.kind ?? 'job'),
      label: String(spec?.label ?? spec?.kind ?? 'job').slice(0, 120),
      status: 'running',
      startedAt: nowIso(),
      finishedAt: null,
      progress: 'starting',
      error: null,
      code: null,
      result: null,
    }
    jobs.set(id, job)
    order.push(id)
    activeByProject.set(projectId, id)
    controllers.set(id, controller)

    const progress = (value) => {
      if (job.status !== 'running') return
      const text = progressText(value)
      if (text.length > 0) job.progress = text
    }
    /** Finish a job exactly once. */
    const settle = (status, extra) => {
      if (job.status !== 'running') return false
      job.status = status
      job.finishedAt = nowIso()
      if (extra && typeof extra === 'object') {
        if ('result' in extra) job.result = extra.result
        if ('error' in extra) job.error = extra.error ? String(extra.error).slice(0, 2000) : null
        if ('code' in extra) job.code = extra.code ?? null
        if ('progress' in extra) job.progress = String(extra.progress ?? '')
      }
      if (activeByProject.get(projectId) === id) activeByProject.delete(projectId)
      return true
    }

    const timeoutMs = Math.max(5000, Number(spec?.timeoutMs) || LIMITS.jobTimeoutMs)
    const timer = setTimeout(() => {
      if (job.status !== 'running') return
      controller.abort()
      settle('failed', { code: 'timeout', error: `job did not finish within ${Math.round(timeoutMs / 1000)} s`, progress: 'timeout' })
      warn(`job ${id} (${job.kind}) timed out after ${timeoutMs} ms`)
    }, timeoutMs)
    if (typeof timer.unref === 'function') timer.unref()

    Promise.resolve()
      .then(() => run({ job: publicJob(job), signal: controller.signal, progress }))
      .then((result) => {
        clearTimeout(timer)
        settle('done', { result: result ?? null, progress: 'done' })
      })
      .catch((error) => {
        clearTimeout(timer)
        const aborted = controller.signal.aborted || error?.code === 'cancelled'
        if (aborted) {
          if (settle('cancelled', { code: 'cancelled', error: 'job cancelled', progress: 'cancelled' })) {
            warn(`job ${id} (${job.kind}) cancelled: ${messageOf(error)}`)
          }
          return
        }
        if (settle('failed', { code: error?.code ?? 'failed', error: messageOf(error), progress: 'failed' })) {
          warn(`job ${id} (${job.kind}) failed: ${messageOf(error)}`)
        }
      })
      .finally(() => {
        clearTimeout(timer)
        if (activeByProject.get(projectId) === id) activeByProject.delete(projectId)
        controllers.delete(id)
        prune()
      })

    return publicJob(job)
  }

  /** Abort and mark a running job cancelled. True when it was running. */
  function cancel(id) {
    const job = jobs.get(String(id ?? ''))
    if (!job || job.status !== 'running') return false
    const controller = controllers.get(job.id)
    job.status = 'cancelled'
    job.code = 'cancelled'
    job.error = 'job cancelled'
    job.progress = 'cancelled'
    job.finishedAt = nowIso()
    if (activeByProject.get(job.projectId) === job.id) activeByProject.delete(job.projectId)
    try {
      controller?.abort()
    } catch {
      /* abort never throws */
    }
    return true
  }

  /** One job by id, or null. */
  function get(id) {
    const job = jobs.get(String(id ?? ''))
    return job ? publicJob(job) : null
  }

  /** The latest job for one project (a running one wins). */
  function latestFor(projectId) {
    const key = String(projectId ?? '')
    const runningId = activeByProject.get(key)
    if (runningId) {
      const running = jobs.get(runningId)
      if (running) return publicJob(running)
    }
    for (let index = order.length - 1; index >= 0; index -= 1) {
      const job = jobs.get(order[index])
      if (job && job.projectId === key) return publicJob(job)
    }
    return null
  }

  /** Newest-first recent jobs for one project, bounded. */
  function recentFor(projectId, limit = 5) {
    const key = String(projectId ?? '')
    const max = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 5
    const out = []
    for (let index = order.length - 1; index >= 0 && out.length < max; index -= 1) {
      const job = jobs.get(order[index])
      if (job && job.projectId === key) out.push(publicJob(job))
    }
    return out
  }

  /** Whether a project currently has a running job. */
  function isBusy(projectId) {
    return activeByProject.has(String(projectId ?? ''))
  }

  /** The most recently started job id for a project, or null. */
  function runningIdFor(projectId) {
    return activeByProject.get(String(projectId ?? '')) ?? null
  }

  /** Cancel everything (plugin disposal) and forget all jobs. */
  function dispose() {
    for (const [id, job] of jobs) {
      if (job.status === 'running') {
        job.status = 'cancelled'
        job.code = 'cancelled'
        job.error = 'plugin disposed'
        job.finishedAt = nowIso()
        try {
          controllers.get(id)?.abort()
        } catch {
          /* abort never throws */
        }
      }
    }
    jobs.clear()
    order.length = 0
    activeByProject.clear()
    controllers.clear()
  }

  return { start, cancel, get, latestFor, recentFor, isBusy, runningIdFor, dispose }
}
