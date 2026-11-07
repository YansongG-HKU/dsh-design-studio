/**
 * Unit tests for lib/store.js — project folders, atomic records, confinement.
 * Run: node --test test/unit/store.test.mjs
 */

import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { confineProjectPath, createStore, isValidProjectId, projectPaths } from '../../lib/store.js'

const ID = 'dsg-20261108-010203-ab12'

/** A fresh store in a throwaway directory, cleaned up after the test. */
async function makeStore(t) {
  const dir = await mkdtemp(join(tmpdir(), 'dsg-store-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  return { dir, store: createStore({ dir }) }
}

/** A minimal valid project record. */
function record(overrides = {}) {
  const at = '2026-11-08T01:02:03.000Z'
  return {
    schemaVersion: 1,
    id: ID,
    name: '运营仪表盘',
    kind: 'web',
    brief: { goal: '', audience: '', layout: '', content: '', constraints: '' },
    viewports: [1440, 768, 375],
    createdAt: at,
    updatedAt: at,
    status: 'draft',
    system: null,
    context: [],
    checks: [],
    bestScore: null,
    variantLabels: { a: '规范版', b: '进阶版', c: '前卫版' },
    comments: [],
    versions: [],
    exports: [],
    history: [],
    ...overrides,
  }
}

test('projectPaths resolves the frozen layout', () => {
  const dir = '/data/design-studio'
  const paths = projectPaths(dir, ID)
  assert.equal(paths.root, join(dir, 'projects', ID))
  assert.equal(paths.record, join(dir, 'projects', ID, 'project.json'))
  for (const name of ['design', 'system', 'context', 'checks', 'exports', 'versions', 'history']) {
    assert.equal(paths[name], join(dir, 'projects', ID, name))
  }
  assert.equal(paths.comments, join(dir, 'projects', ID, 'comments.json'))
})

test('project ids are validated', () => {
  assert.equal(isValidProjectId(ID), true)
  assert.equal(isValidProjectId('dsg-bad'), true)
  assert.equal(isValidProjectId('../etc'), false)
  assert.equal(isValidProjectId('C:\\evil'), false)
  assert.equal(isValidProjectId(''), false)
  assert.equal(confineProjectPath('/data', ID, '../x'), null)
  assert.equal(confineProjectPath('/data', '../escape', 'a.html'), null)
})

test('createProject creates folders and a readable record', async (t) => {
  const { dir, store } = await makeStore(t)
  await store.init()
  const created = await store.createProject(record())
  assert.equal(created.id, ID)
  assert.equal(created.schemaVersion, 1)
  assert.equal(created.name, '运营仪表盘')

  const paths = store.projectPaths(ID)
  for (const name of ['design', 'system', 'context', 'checks', 'exports', 'versions', 'history']) {
    await store.writeFile(ID, `.probe-${name}`, 'ok')
  }
  const onDisk = JSON.parse(await readFile(paths.record, 'utf8'))
  assert.equal(onDisk.id, ID)
  assert.deepEqual(JSON.parse(await readFile(paths.comments, 'utf8')), [])

  const read = await store.readProject(ID)
  assert.equal(read.id, ID)
  assert.equal((await store.listProjects()).length, 1)
  assert.equal(store.dataDir, dir)
})

test('createProject refuses invalid ids and bad records', async (t) => {
  const { store } = await makeStore(t)
  await assert.rejects(store.createProject(record({ id: '../escape' })), (error) => error.code === 'invalid_input')
  await assert.rejects(store.createProject(null), (error) => error.code === 'invalid_input')
})

test('updateProject mutates atomically and bumps updatedAt', async (t) => {
  const { store } = await makeStore(t)
  await store.createProject(record())
  const updated = await store.updateProject(ID, (project) => {
    project.status = 'designed'
    project.bestScore = 42
  })
  assert.equal(updated.status, 'designed')
  assert.equal(updated.bestScore, 42)
  const read = await store.readProject(ID)
  assert.equal(read.bestScore, 42)
  assert.notEqual(read.updatedAt, '2026-11-08T01:02:03.000Z')
})

test('updateProject reports not_found for a missing project', async (t) => {
  const { store } = await makeStore(t)
  await assert.rejects(store.updateProject('dsg-20990101-000000-abcd', () => {}), (error) => error.code === 'not_found')
})

test('updateProject can skip the write by returning false', async (t) => {
  const { store } = await makeStore(t)
  await store.createProject(record())
  const before = await readFile(store.projectPaths(ID).record, 'utf8')
  const skipped = await store.updateProject(ID, (project) => {
    project.name = 'never written'
    return false
  })
  assert.equal(skipped.name, 'never written')
  assert.equal(await readFile(store.projectPaths(ID).record, 'utf8'), before)
})

test('concurrent updates are serialised per project', async (t) => {
  const { store } = await makeStore(t)
  await store.createProject(record({ counter: 0 }))
  await Promise.all(
    Array.from({ length: 20 }, () =>
      store.updateProject(ID, async (project) => {
        const current = Number(project.counter ?? 0)
        await new Promise((resolve) => setTimeout(resolve, 1))
        project.counter = current + 1
      }),
    ),
  )
  const read = await store.readProject(ID)
  assert.equal(read.counter, 20)
})

test('path confinement rejects traversal and absolute paths', async (t) => {
  const { store } = await makeStore(t)
  await store.createProject(record())

  for (const rel of ['../escape.txt', '..\\escape.txt', 'design/../../escape.txt', '/etc/passwd', 'C:\\Windows\\evil.txt', 'C:/Windows/evil.txt', '']) {
    await assert.rejects(store.writeFile(ID, rel, 'x'), (error) => error.code === 'invalid_input', `should reject ${JSON.stringify(rel)}`)
  }
  await assert.rejects(store.writeJson(ID, '../escape.json', { a: 1 }), (error) => error.code === 'invalid_input')

  // Reads degrade to null/fallback instead of throwing.
  assert.equal(await store.readFile(ID, '../escape.txt'), null)
  assert.equal(await store.readText(ID, '../../etc/passwd', 'fallback'), 'fallback')
  assert.deepEqual(await store.readJson(ID, '../escape.json', { fallback: true }), { fallback: true })
  assert.equal(await store.statFile(ID, '../escape.txt'), null)
  assert.deepEqual(await store.listDir(ID, '../..'), [])

  // A confined absolute-looking file name inside design/ is fine.
  const written = await store.writeFile(ID, 'design/notes.txt', 'hello')
  assert.equal(written.bytes, 5)
  assert.equal(await store.readText(ID, 'design/notes.txt'), 'hello')
  assert.equal((await store.statFile(ID, 'design/notes.txt')).size, 5)
})

test('readJson/writeJson round-trip and fallback', async (t) => {
  const { store } = await makeStore(t)
  await store.createProject(record())
  await store.writeJson(ID, 'system/tokens.json', { name: '品牌', color: { ink: '#111111' } })
  assert.deepEqual(await store.readJson(ID, 'system/tokens.json', null), { name: '品牌', color: { ink: '#111111' } })
  assert.equal(await store.readJson(ID, 'system/missing.json', null), null)
})

test('corrupt records are skipped by the list, not fatal', async (t) => {
  const { dir, store } = await makeStore(t)
  await store.init()
  await store.createProject(record())
  const broken = join(dir, 'projects', 'dsg-20251108-000000-dead')
  await mkdir(broken, { recursive: true })
  await writeFile(join(broken, 'project.json'), '{ this is not json')
  const wrongSchema = join(dir, 'projects', 'dsg-20251108-000000-beef')
  await mkdir(wrongSchema, { recursive: true })
  await writeFile(join(wrongSchema, 'project.json'), JSON.stringify({ schemaVersion: 99, id: 'dsg-20251108-000000-beef' }))

  const rows = await store.listProjects()
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, ID)
  assert.equal(await store.readProject('dsg-20251108-000000-dead'), null)
})

test('listDir returns sorted file rows and tolerates missing folders', async (t) => {
  const { store } = await makeStore(t)
  await store.createProject(record())
  await store.writeFile(ID, 'design/b.html', 'bb')
  await store.writeFile(ID, 'design/a.html', 'a')
  const rows = await store.listDir(ID, 'design')
  assert.deepEqual(
    rows.map((row) => row.name),
    ['a.html', 'b.html'],
  )
  assert.equal(rows[0].size, 1)
  assert.equal(typeof rows[0].mtime, 'string')
  assert.deepEqual(await store.listDir(ID, 'no-such-folder'), [])
})

test('deleteProject removes the tree and is idempotent', async (t) => {
  const { store } = await makeStore(t)
  await store.createProject(record())
  await store.writeFile(ID, 'design/a.html', '<html></html>')
  assert.equal(await store.deleteProject(ID), true)
  assert.equal(await store.readProject(ID), null)
  assert.equal(await store.statFile(ID, 'design/a.html'), null)
  assert.equal(await store.deleteProject(ID), false)
  assert.deepEqual(await store.listProjects(), [])
})

test('concurrent create/delete never corrupts a record', async (t) => {
  const { store } = await makeStore(t)
  const ids = ['dsg-20261108-000001-aaaa', 'dsg-20261108-000002-bbbb']
  await Promise.all(ids.map((id) => store.createProject(record({ id, name: id }))))
  const rows = await store.listProjects()
  assert.equal(rows.length, 2)
  await Promise.all(ids.map((id) => store.deleteProject(id)))
  assert.deepEqual(await store.listProjects(), [])
})
