/**
 * Unit tests for lib/jobs.js — one running job per project, progress, cancel.
 * Run: node --test test/unit/jobs.test.mjs
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createJobs } from '../../lib/jobs.js'

/** Poll until `check` returns truthy, or fail the test. */
async function waitUntil(check, label = 'condition', timeoutMs = 3000) {
  const started = Date.now()
  for (;;) {
    const value = await check()
    if (value) return value
    if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for ${label}`)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

test('start/get/latestFor report a running job, then done', async () => {
  const jobs = createJobs({ log: { warn() {} } })
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  const job = jobs.start({ projectId: 'p1', kind: 'check' }, async ({ signal, progress }) => {
    progress('navigating')
    await gate
    if (signal.aborted) throw new Error('should not abort')
    return { score: 91 }
  })
  assert.equal(job.status, 'running')
  assert.equal(job.kind, 'check')
  assert.equal(typeof job.id, 'string')
  assert.match(job.id, /^job-[0-9a-f]{8}$/u)

  assert.equal(jobs.get(job.id).status, 'running')
  assert.equal(jobs.latestFor('p1').id, job.id)
  assert.equal(jobs.isBusy('p1'), true)

  await waitUntil(() => jobs.get(job.id).progress === 'navigating', 'progress update')
  release()
  const done = await waitUntil(() => {
    const current = jobs.get(job.id)
    return current?.status === 'done' ? current : null
  }, 'job done')
  assert.deepEqual(done.result, { score: 91 })
  assert.equal(done.progress, 'done')
  assert.equal(typeof done.finishedAt, 'string')
  assert.equal(jobs.isBusy('p1'), false)
  assert.equal(jobs.latestFor('p1').status, 'done')
  jobs.dispose()
})

test('one running job per project: a second start throws busy', async () => {
  const jobs = createJobs()
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  const first = jobs.start({ projectId: 'p1', kind: 'check' }, async () => {
    await gate
    return 1
  })
  assert.throws(
    () => jobs.start({ projectId: 'p1', kind: 'export' }, async () => 2),
    (error) => error.code === 'busy',
  )
  // A different project can run concurrently.
  const other = jobs.start({ projectId: 'p2', kind: 'check' }, async () => 2)
  assert.equal(other.status, 'running')
  release()
  await waitUntil(() => jobs.get(first.id).status === 'done', 'first done')
  await waitUntil(() => jobs.get(other.id).status === 'done', 'second done')
  jobs.dispose()
})

test('cancel aborts the signal and marks the job cancelled', async () => {
  const jobs = createJobs()
  let observedAbort = false
  const job = jobs.start({ projectId: 'p1', kind: 'check' }, async ({ signal }) => {
    // An engine must check the signal before waiting on it: cancel() may land
    // before the run body starts, and an already-aborted signal never re-fires.
    if (signal.aborted) {
      observedAbort = true
      return 'aborted'
    }
    await new Promise((resolve) => {
      const timer = setInterval(() => {
        if (!signal.aborted) return
        observedAbort = true
        clearInterval(timer)
        resolve()
      }, 5)
      signal.addEventListener(
        'abort',
        () => {
          observedAbort = true
          clearInterval(timer)
          resolve()
        },
        { once: true },
      )
    })
    return 'late'
  })
  assert.equal(jobs.cancel(job.id), true)
  assert.equal(jobs.get(job.id).status, 'cancelled')
  assert.equal(jobs.cancel(job.id), false)
  await waitUntil(() => observedAbort, 'abort observed')
  const current = jobs.get(job.id)
  assert.equal(current.status, 'cancelled')
  assert.equal(current.code, 'cancelled')
  jobs.dispose()
})

test('a failing job records the error and code', async () => {
  const jobs = createJobs()
  const job = jobs.start({ projectId: 'p1', kind: 'check' }, async () => {
    const error = new Error('no browser found')
    error.code = 'no_browser'
    throw error
  })
  const failed = await waitUntil(() => {
    const current = jobs.get(job.id)
    return current?.status === 'failed' ? current : null
  }, 'job failed')
  assert.equal(failed.error, 'no browser found')
  assert.equal(failed.code, 'no_browser')
  jobs.dispose()
})

test('recentFor returns newest first and latestFor ignores other projects', async () => {
  const jobs = createJobs()
  for (const label of ['one', 'two', 'three']) {
    const job = jobs.start({ projectId: 'p1', kind: label }, async () => label)
    await waitUntil(() => jobs.get(job.id).status === 'done', `${label} done`)
  }
  const recent = jobs.recentFor('p1', 2)
  assert.deepEqual(
    recent.map((job) => job.kind),
    ['three', 'two'],
  )
  assert.equal(jobs.latestFor('p2'), null)
  jobs.dispose()
})

test('history is bounded by maxJobs, running jobs survive pruning', async () => {
  const jobs = createJobs({ maxJobs: 3 })
  const ids = []
  for (let index = 0; index < 6; index += 1) {
    const job = jobs.start({ projectId: `p${index}`, kind: 'check' }, async () => index)
    ids.push(job.id)
    await waitUntil(() => jobs.get(job.id).status === 'done', `p${index} done`)
  }
  assert.equal(jobs.get(ids[0]), null)
  assert.equal(jobs.get(ids[5]).status, 'done')
  jobs.dispose()
})

test('dispose cancels running jobs and forgets everything', async () => {
  const jobs = createJobs()
  const job = jobs.start({ projectId: 'p1', kind: 'check' }, async ({ signal }) => {
    if (signal.aborted) return null
    await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
    return null
  })
  jobs.dispose()
  assert.equal(jobs.get(job.id), null)
  assert.equal(jobs.latestFor('p1'), null)
  assert.equal(jobs.isBusy('p1'), false)
})

test('progress accepts strings and objects with a message', async () => {
  const jobs = createJobs()
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  const job = jobs.start({ projectId: 'p1', kind: 'check' }, async ({ progress }) => {
    progress({ phase: 'capture', message: '截图 1440px' })
    await gate
    return true
  })
  await waitUntil(() => jobs.get(job.id).progress === '截图 1440px', 'object progress')
  release()
  await waitUntil(() => jobs.get(job.id).status === 'done', 'done')
  jobs.dispose()
})

test('a start call without a run function is rejected', () => {
  const jobs = createJobs()
  assert.throws(() => jobs.start({ projectId: 'p1', kind: 'check' }), (error) => error.code === 'invalid_input')
  jobs.dispose()
})
