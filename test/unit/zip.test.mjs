/**
 * Unit tests for lib/zip.js — deterministic headers, deflate/store selection,
 * UTF-8 names, unsafe-name rejection and round-trip integrity.
 *
 * Run: node --test test/unit/zip.test.mjs
 */

import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import { createZip } from '../../lib/zip.js'
import { entryOf, readZip } from '../fixtures/zip-reader.mjs'

test('createZip writes a parseable archive that round-trips content', () => {
  const text = 'x'.repeat(4000) + '<html lang="zh-CN">真实内容</html>'
  const binary = randomBytes(2048)
  const zip = createZip([
    { name: 'design/a.html', data: text },
    { name: 'assets/pic.bin', data: binary },
  ])
  assert.ok(Buffer.isBuffer(zip))
  const parsed = readZip(zip)
  assert.equal(parsed.count, 2)
  assert.deepEqual(parsed.entries.map((entry) => entry.name), ['design/a.html', 'assets/pic.bin'])
  assert.equal(entryOf(parsed, 'design/a.html').content.toString('utf8'), text)
  assert.equal(entryOf(parsed, 'design/a.html').method, 8)
  assert.ok(entryOf(parsed, 'design/a.html').compressedSize < entryOf(parsed, 'design/a.html').uncompressedSize)
  assert.deepEqual(entryOf(parsed, 'assets/pic.bin').content, binary)
  for (const entry of parsed.entries) {
    assert.equal(entry.flags & 0x0800, 0x0800, 'UTF-8 flag must be set')
    assert.equal(entry.dosTime, 0)
    assert.equal(entry.dosDate, (((2020 - 1980) & 0x7f) << 9) | (1 << 5) | 1)
  }
})

test('createZip falls back to stored method for incompressible data and handles empty payloads', () => {
  const random = randomBytes(8192)
  const parsed = readZip(createZip([
    { name: 'random.bin', data: random },
    { name: 'empty.txt', data: '' },
  ]))
  const randomEntry = entryOf(parsed, 'random.bin')
  assert.equal(randomEntry.method, 0)
  assert.equal(randomEntry.compressedSize, randomEntry.uncompressedSize)
  assert.deepEqual(randomEntry.content, random)
  const empty = entryOf(parsed, 'empty.txt')
  assert.equal(empty.uncompressedSize, 0)
  assert.equal(empty.content.length, 0)
  assert.equal(empty.crc, 0)
})

test('createZip supports UTF-8 entry names', () => {
  const parsed = readZip(createZip([{ name: '系统/tokens.json', data: '{"name":"品牌"}' }]))
  assert.equal(parsed.entries[0].name, '系统/tokens.json')
  assert.equal(parsed.entries[0].flags & 0x0800, 0x0800)
  assert.equal(parsed.entries[0].content.toString('utf8'), '{"name":"品牌"}')
})

test('createZip is deterministic for identical input', () => {
  const entries = [
    { name: 'a.txt', data: 'hello design studio' },
    { name: 'b/c.txt', data: 'second' },
  ]
  assert.deepEqual(createZip(entries), createZip(entries))
})

test('createZip rejects unsafe entry names and duplicate entries', () => {
  const invalid = (name) => assert.throws(() => createZip([{ name, data: 'x' }]), (error) => error.code === 'invalid_input', 'expected rejection for ' + JSON.stringify(name))
  invalid('../escape.txt')
  invalid('a/../../escape.txt')
  invalid('/absolute.txt')
  invalid('C:/windows.txt')
  invalid('C:\\windows.txt')
  invalid('a\\b.txt')
  invalid('a//b.txt')
  invalid('')
  invalid('./relative.txt')
  assert.throws(() => createZip([
    { name: 'same.txt', data: 'a' },
    { name: 'same.txt', data: 'b' },
  ]), (error) => error.code === 'invalid_input')
})

test('createZip rejects non-buffer, non-string payloads', () => {
  assert.throws(() => createZip([{ name: 'a.txt', data: 42 }]), (error) => error.code === 'invalid_input')
  assert.throws(() => createZip([null]), (error) => error.code === 'invalid_input')
  assert.deepEqual(readZip(createZip([{ name: 'u.txt', data: new Uint8Array([104, 105]) }])).entries[0].content.toString('utf8'), 'hi')
})

test('createZip tolerates a non-array argument as an empty archive', () => {
  const parsed = readZip(createZip())
  assert.equal(parsed.count, 0)
  assert.equal(parsed.centralSize, 0)
  assert.ok(parsed.centralOffset >= 0)
})
