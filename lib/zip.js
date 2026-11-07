/**
 * dsh-design-studio — a dependency-free ZIP writer.
 *
 * Produces the small, deterministic archive the exporter needs (PPTX is a ZIP
 * container too). Entries are deflated with `node:zlib.deflateRawSync` unless
 * storing is smaller; every header uses a fixed 2020-01-01 timestamp and the
 * UTF-8 filename flag so two runs over the same bytes produce identical output.
 *
 * Unsafe entry names (absolute paths, drive letters, `..` segments, backslashes,
 * control characters, duplicates) are rejected with `code:"invalid_input"` — a
 * design export must never be able to write outside its extraction directory.
 *
 * Public API (CONTRACT §3): createZip(entries) -> Buffer.
 */

import { deflateRawSync } from 'node:zlib'

/** Local file header signature. */
const LOCAL_SIGNATURE = 0x04034b50
/** Central directory header signature. */
const CENTRAL_SIGNATURE = 0x02014b50
/** End of central directory signature. */
const EOCD_SIGNATURE = 0x06054b50
/** UTF-8 filename flag. */
const FLAG_UTF8 = 0x0800
/** ZIP spec 2.0. */
const VERSION = 20
/** Fixed DOS date: 2020-01-01, 00:00 (deterministic archives). */
const DOS_DATE = (((2020 - 1980) & 0x7f) << 9) | (1 << 5) | 1
/** Fixed DOS time: 00:00:00. */
const DOS_TIME = 0
/** Maximum entries a 16-bit ZIP can describe. */
const MAX_ENTRIES = 0xffff
/** Maximum payload a 32-bit ZIP can describe. */
const MAX_TOTAL_BYTES = 0xf0000000

/** CRC-32 lookup table. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    table[index] = value >>> 0
  }
  return table
})()

/** Build a typed error. */
function fail(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

/** CRC-32 of a Buffer (standard ZIP polynomial). */
function crc32(buffer) {
  let value = 0xffffffff
  for (let index = 0; index < buffer.length; index += 1) {
    value = CRC_TABLE[(value ^ buffer[index]) & 0xff] ^ (value >>> 8)
  }
  return (value ^ 0xffffffff) >>> 0
}

/** Turn string/Buffer data into a Buffer. */
function toBuffer(data) {
  if (Buffer.isBuffer(data)) return data
  if (data instanceof Uint8Array) return Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  if (typeof data === 'string') return Buffer.from(data, 'utf8')
  throw fail('invalid_input', 'ZIP entry data must be a string, Buffer or Uint8Array')
}

/**
 * Validate one archive entry name: relative, forward-slash separated, no `..`,
 * no absolute or Windows drive prefix, bounded length, printable.
 * @returns {string} the normalised name
 */
function safeEntryName(rawName) {
  const name = String(rawName ?? '')
  if (name.length === 0) throw fail('invalid_input', 'ZIP entry names must not be empty')
  if (name.length > 200) throw fail('invalid_input', 'ZIP entry name is too long: ' + name.slice(0, 40) + '…')
  if (name.includes('\\')) throw fail('invalid_input', 'ZIP entry names must use forward slashes: ' + name)
  if (name.includes('\u0000')) throw fail('invalid_input', 'ZIP entry names must not contain NUL bytes')
  if (/^[a-zA-Z]:/u.test(name)) throw fail('invalid_input', 'ZIP entry names must be relative: ' + name)
  if (name.startsWith('/')) throw fail('invalid_input', 'ZIP entry names must be relative: ' + name)
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/u.test(name)) throw fail('invalid_input', 'ZIP entry names must not contain control characters')
  const segments = name.split('/')
  for (const segment of segments) {
    if (segment.length === 0) throw fail('invalid_input', 'ZIP entry names must not contain empty path segments: ' + name)
    if (segment === '.' || segment === '..') throw fail('invalid_input', 'ZIP entry names must not traverse directories: ' + name)
  }
  return name
}

/** Write one local file header + payload. */
function writeLocal({ name, payload, method, crc, compressed }) {
  const nameBytes = Buffer.from(name, 'utf8')
  const header = Buffer.allocUnsafe(30)
  header.writeUInt32LE(LOCAL_SIGNATURE, 0)
  header.writeUInt16LE(VERSION, 4)
  header.writeUInt16LE(FLAG_UTF8, 6)
  header.writeUInt16LE(method, 8)
  header.writeUInt16LE(DOS_TIME, 10)
  header.writeUInt16LE(DOS_DATE, 12)
  header.writeUInt32LE(crc, 14)
  header.writeUInt32LE(compressed.length, 18)
  header.writeUInt32LE(payload.length, 22)
  header.writeUInt16LE(nameBytes.length, 26)
  header.writeUInt16LE(0, 28)
  return Buffer.concat([header, nameBytes, compressed])
}

/** Write one central-directory record. */
function writeCentral({ name, payload, method, crc, compressed, offset }) {
  const nameBytes = Buffer.from(name, 'utf8')
  const header = Buffer.allocUnsafe(46)
  header.writeUInt32LE(CENTRAL_SIGNATURE, 0)
  header.writeUInt16LE(VERSION, 4)
  header.writeUInt16LE(VERSION, 6)
  header.writeUInt16LE(FLAG_UTF8, 8)
  header.writeUInt16LE(method, 10)
  header.writeUInt16LE(DOS_TIME, 12)
  header.writeUInt16LE(DOS_DATE, 14)
  header.writeUInt32LE(crc, 16)
  header.writeUInt32LE(compressed.length, 20)
  header.writeUInt32LE(payload.length, 24)
  header.writeUInt16LE(nameBytes.length, 28)
  header.writeUInt16LE(0, 30)
  header.writeUInt16LE(0, 32)
  header.writeUInt16LE(0, 34)
  header.writeUInt16LE(0, 36)
  header.writeUInt32LE(0, 38)
  header.writeUInt32LE(offset, 42)
  return Buffer.concat([header, nameBytes])
}

/**
 * Build a ZIP archive.
 * @param {Array<{name: string, data: string|Buffer|Uint8Array}>} entries
 * @returns {Buffer}
 */
export function createZip(entries) {
  const list = Array.isArray(entries) ? entries : []
  if (list.length > MAX_ENTRIES) throw fail('invalid_input', 'a ZIP cannot hold more than ' + MAX_ENTRIES + ' entries')
  const seen = new Set()
  const prepared = []
  let totalBytes = 0
  for (const entry of list) {
    if (entry === null || typeof entry !== 'object') throw fail('invalid_input', 'each ZIP entry must be an object with name and data')
    const name = safeEntryName(entry.name)
    if (seen.has(name)) throw fail('invalid_input', 'duplicate ZIP entry name: ' + name)
    seen.add(name)
    const payload = toBuffer(entry.data)
    const deflated = deflateRawSync(payload, { level: 9 })
    const useStore = deflated.length >= payload.length
    const method = useStore ? 0 : 8
    const compressed = useStore ? payload : deflated
    totalBytes += compressed.length + payload.length
    if (totalBytes > MAX_TOTAL_BYTES) throw fail('too_large', 'the ZIP payload exceeds the 32-bit archive limit')
    prepared.push({
      name,
      payload,
      method,
      compressed,
      crc: crc32(payload),
      offset: 0,
    })
  }

  const localParts = []
  let offset = 0
  for (const entry of prepared) {
    entry.offset = offset
    const local = writeLocal(entry)
    localParts.push(local)
    offset += local.length
  }
  const localBytes = Buffer.concat(localParts)
  const centralParts = prepared.map((entry) => writeCentral(entry))
  const centralBytes = Buffer.concat(centralParts)
  const eocd = Buffer.allocUnsafe(22)
  eocd.writeUInt32LE(EOCD_SIGNATURE, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(prepared.length, 8)
  eocd.writeUInt16LE(prepared.length, 10)
  eocd.writeUInt32LE(centralBytes.length, 12)
  eocd.writeUInt32LE(localBytes.length, 16)
  eocd.writeUInt16LE(0, 20)
  return Buffer.concat([localBytes, centralBytes, eocd])
}
