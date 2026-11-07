/**
 * Unit tests for lib/preview.js — the standalone loopback static server.
 * Run: node --test test/unit/preview.test.mjs
 */

import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  MIME_TYPES,
  closeAllPreviews,
  mimeFor,
  previewCount,
  safeJoin,
  startPreview,
} from '../../lib/preview.js'

/** Build a throwaway design folder with a few files. */
async function makeRoot(t) {
  const dir = await mkdtemp(join(tmpdir(), 'dsg-preview-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  await mkdir(join(dir, 'assets'), { recursive: true })
  await writeFile(join(dir, 'index.html'), '<!DOCTYPE html><html><body>home</body></html>')
  await writeFile(join(dir, 'a.html'), '<!DOCTYPE html><html><body>variant a</body></html>')
  await writeFile(join(dir, 'assets', 'style.css'), ':root { --ink: #111; }')
  await writeFile(join(dir, 'assets', 'logo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  await writeFile(join(dir, 'notes.txt'), 'hello')
  return dir
}

test('serves html, assets and index with the right MIME types', async (t) => {
  const root = await makeRoot(t)
  const server = await startPreview({ rootDir: root })
  t.after(() => server.dispose())
  assert.equal(typeof server.url, 'string')
  assert.ok(server.url.startsWith('http://127.0.0.1:'))
  assert.ok(server.port > 0)

  const page = await fetch(`${server.url}a.html`)
  assert.equal(page.status, 200)
  assert.equal(page.headers.get('content-type'), 'text/html; charset=utf-8')
  assert.match(await page.text(), /variant a/u)

  const css = await fetch(`${server.url}assets/style.css`)
  assert.equal(css.status, 200)
  assert.equal(css.headers.get('content-type'), 'text/css; charset=utf-8')
  assert.match(await css.text(), /--ink/u)

  const index = await fetch(server.url)
  assert.equal(index.status, 200)
  assert.match(await index.text(), /home/u)

  const txt = await fetch(`${server.url}notes.txt`)
  assert.equal(txt.headers.get('content-type'), 'text/plain; charset=utf-8')

  const head = await fetch(`${server.url}a.html`, { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal((await head.text()).length, 0)
})

test('missing files and traversal are 404, non-GET methods are 405', async (t) => {
  const root = await makeRoot(t)
  const server = await startPreview({ rootDir: root })
  t.after(() => server.dispose())

  assert.equal((await fetch(`${server.url}missing.html`)).status, 404)
  assert.equal((await fetch(`${server.url}%2e%2e%2fsecret.txt`)).status, 404)
  assert.equal((await fetch(`${server.url}a%00.html`)).status, 404)
  assert.equal((await fetch(`${server.url}assets`)).status, 404) // directory without index.html

  const post = await fetch(`${server.url}a.html`, { method: 'POST' })
  assert.equal(post.status, 405)
  assert.equal(post.headers.get('allow'), 'GET, HEAD')
})

test('dispose closes the server and closeAllPreviews closes every server', async (t) => {
  const root = await makeRoot(t)
  const first = await startPreview({ rootDir: root })
  const second = await startPreview(root) // string form is accepted too
  assert.ok(previewCount() >= 2)
  await first.dispose()
  await assert.rejects(fetch(`${first.url}a.html`))
  assert.equal((await fetch(`${second.url}a.html`)).status, 200)
  await closeAllPreviews()
  assert.equal(previewCount(), 0)
  await assert.rejects(fetch(`${second.url}a.html`))
})

test('a missing root folder is rejected', async () => {
  await assert.rejects(startPreview({ rootDir: join(tmpdir(), 'dsg-does-not-exist-xyz') }), /does not exist/u)
  await assert.rejects(startPreview({}), /rootDir/u)
})

test('safeJoin confines paths and mimeFor maps extensions', () => {
  const root = '/srv/design'
  assert.equal(safeJoin(root, '/a.html'), resolve(root, 'a.html'))
  assert.equal(safeJoin(root, '/assets/logo.png'), resolve(root, 'assets', 'logo.png'))
  assert.equal(safeJoin(root, '/../etc/passwd'), null)
  assert.equal(safeJoin(root, '/assets/../../etc/passwd'), null)
  assert.equal(safeJoin(root, '/a%00.html'), null)
  assert.equal(safeJoin(root, '/%zz'), null)

  assert.equal(mimeFor('a.html'), MIME_TYPES['.html'])
  assert.equal(mimeFor('a.css'), 'text/css; charset=utf-8')
  assert.equal(mimeFor('a.png'), 'image/png')
  assert.equal(mimeFor('a.bin'), 'application/octet-stream')
  assert.equal(mimeFor(''), 'application/octet-stream')
})
