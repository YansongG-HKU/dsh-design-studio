/**
 * Test helper — parse a ZIP archive without third-party dependencies.
 *
 * Used by the zip/pptx unit tests (and the export integration test) to verify
 * that the writer produced a spec-shaped archive: signatures, central directory,
 * flag bits, method, stored byte ranges and decompressed payloads.
 *
 * Not a test file itself (no `.test.mjs` suffix), so the runner ignores it.
 */

import assert from 'node:assert/strict'
import { inflateRawSync } from 'node:zlib'

export const LOCAL_SIGNATURE = 0x04034b50
export const CENTRAL_SIGNATURE = 0x02014b50
export const EOCD_SIGNATURE = 0x06054b50

/**
 * Parse a ZIP buffer.
 * @param {Buffer} buffer
 * @returns {{entries: Array<{name: string, method: number, flags: number, crc: number, compressedSize: number, uncompressedSize: number, dosTime: number, dosDate: number, content: Buffer}>, count: number, centralSize: number, centralOffset: number}}
 */
export function readZip(buffer) {
  assert.ok(Buffer.isBuffer(buffer), 'ZIP must be a Buffer')
  assert.ok(buffer.length >= 22, 'ZIP is too short to hold an EOCD')
  let eocd = -1
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === EOCD_SIGNATURE) {
      eocd = index
      break
    }
  }
  assert.notEqual(eocd, -1, 'ZIP has no end-of-central-directory record')
  const count = buffer.readUInt16LE(eocd + 10)
  const centralSize = buffer.readUInt32LE(eocd + 12)
  const centralOffset = buffer.readUInt32LE(eocd + 16)
  assert.ok(centralOffset + centralSize <= buffer.length, 'central directory lies outside the buffer')

  const entries = []
  let offset = centralOffset
  for (let index = 0; index < count; index += 1) {
    assert.equal(buffer.readUInt32LE(offset), CENTRAL_SIGNATURE, 'bad central directory signature at entry ' + index)
    const flags = buffer.readUInt16LE(offset + 8)
    const method = buffer.readUInt16LE(offset + 10)
    const dosTime = buffer.readUInt16LE(offset + 12)
    const dosDate = buffer.readUInt16LE(offset + 14)
    const crc = buffer.readUInt32LE(offset + 16)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const uncompressedSize = buffer.readUInt32LE(offset + 24)
    const nameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const localOffset = buffer.readUInt32LE(offset + 42)
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength)
    assert.equal(buffer.readUInt32LE(localOffset), LOCAL_SIGNATURE, 'bad local header signature for ' + name)
    const localNameLength = buffer.readUInt16LE(localOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const data = buffer.subarray(dataStart, dataStart + compressedSize)
    const content = method === 0 ? Buffer.from(data) : inflateRawSync(data)
    assert.equal(content.length, uncompressedSize, 'uncompressed size mismatch for ' + name)
    entries.push({ name, method, flags, crc, compressedSize, uncompressedSize, dosTime, dosDate, content })
    offset += 46 + nameLength + extraLength + commentLength
  }
  return { entries, count, centralSize, centralOffset }
}

/** Get one entry by name or fail. */
export function entryOf(zip, name) {
  const entry = zip.entries.find((row) => row.name === name)
  assert.ok(entry, 'ZIP is missing the entry ' + name)
  return entry
}

/**
 * A deliberately small XML well-formedness check: one prolog, one root element,
 * balanced tags (attributes may not contain raw `>`; our writer always escapes).
 * @param {string} xml
 * @returns {string[]} problems (empty = well formed)
 */
export function xmlProblems(xml) {
  const text = String(xml ?? '')
  const problems = []
  if (!/^<\?xml\s/iu.test(text)) return ['missing XML prolog']
  const body = text.replace(/<\?xml[\s\S]*?\?>/gu, '').replace(/<!--[\s\S]*?-->/gu, '')
  const stack = []
  let roots = 0
  const pattern = /<\/?([A-Za-z_][A-Za-z0-9_.:-]*)(?:\s[^<>]*)?\/?>/gu
  let match = pattern.exec(body)
  while (match) {
    const tag = match[0]
    const name = match[1]
    if (tag.startsWith('</')) {
      const top = stack.pop()
      if (top !== name) {
        problems.push('unbalanced closing tag </' + name + '> (expected </' + (top ?? 'nothing') + '>)')
        return problems
      }
    } else if (tag.endsWith('/>')) {
      if (stack.length === 0) roots += 1
    } else {
      if (stack.length === 0) roots += 1
      stack.push(name)
    }
    match = pattern.exec(body)
  }
  if (stack.length > 0) problems.push('unclosed tags: ' + stack.join(', '))
  if (roots !== 1) problems.push('expected exactly one root element, found ' + roots)
  return problems
}

/** Resolve a relationship target relative to a relationship part name. */
export function resolvePart(partName, target) {
  const parts = partName.split('/')
  const relsIndex = parts.lastIndexOf('_rels')
  const base = relsIndex >= 0 ? parts.slice(0, relsIndex) : parts.slice(0, -1)
  for (const segment of String(target).split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') base.pop()
    else base.push(segment)
  }
  return base.join('/')
}

/** Assert every internal relationship target of every `.rels` part exists. */
export function assertRelationshipsResolve(zip) {
  const names = new Set(zip.entries.map((entry) => entry.name))
  for (const entry of zip.entries) {
    if (!entry.name.endsWith('.rels')) continue
    const xml = entry.content.toString('utf8')
    const pattern = /<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*\/>/gu
    let match = pattern.exec(xml)
    while (match) {
      const target = match[1]
      if (!/^https?:/iu.test(target)) {
        const resolved = resolvePart(entry.name, target)
        assert.ok(names.has(resolved), entry.name + ' points at a missing part: ' + target + ' -> ' + resolved)
      }
      match = pattern.exec(xml)
    }
  }
}
