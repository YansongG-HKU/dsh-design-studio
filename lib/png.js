/**
 * dsh-design-studio — a dependency-free PNG codec for browser screenshots.
 *
 * Chrome's `Page.captureScreenshot` returns 8-bit PNGs (colour type 2 or 6, no
 * interlacing). That is the whole input contract here: the decoder accepts the
 * non-interlaced 8-bit truecolour/greyscale forms and returns RGBA, and the
 * encoder always writes 8-bit RGBA. Anything else is rejected with a clear
 * error instead of being silently mis-decoded.
 *
 * The hot path (decode → unfilter → RGBA) works on Buffers with no per-pixel
 * allocation; a 1440×900 screenshot decodes in a few milliseconds.
 */

import { deflateSync, inflateSync } from 'node:zlib'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** CRC-32 table, built once. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

/** Compute a PNG chunk CRC over type + data. */
export function crc32(type, data) {
  let c = 0xffffffff
  const head = Buffer.from(type, 'latin1')
  for (let i = 0; i < head.length; i += 1) c = CRC_TABLE[(c ^ head[i]) & 0xff] ^ (c >>> 8)
  for (let i = 0; i < data.length; i += 1) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Build one PNG chunk. */
function chunk(type, data) {
  const out = Buffer.allocUnsafe(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'latin1')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(type, data), 8 + data.length)
  return out
}

/** Number of channels for a PNG colour type. */
function channelsFor(colorType) {
  switch (colorType) {
    case 0:
      return 1 // greyscale
    case 2:
      return 3 // RGB
    case 3:
      return 1 // palette index
    case 4:
      return 2 // greyscale + alpha
    case 6:
      return 4 // RGBA
    default:
      return 0
  }
}

/**
 * Decode a PNG buffer into { width, height, rgba } where rgba is a Uint8Array of
 * width*height*4 bytes.
 * @param {Buffer|Uint8Array} input
 * @returns {{width: number, height: number, rgba: Uint8Array, animated: boolean}}
 */
export function decodePng(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input)
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('not a PNG (bad signature)')
  }
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = -1
  let interlace = 0
  let palette = null
  let transparency = null
  let animated = false
  const idat = []
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('latin1', offset + 4, offset + 8)
    const start = offset + 8
    const end = start + length
    if (end + 4 > buffer.length) throw new Error(`truncated PNG chunk ${type}`)
    const data = buffer.subarray(start, end)
    offset = end + 4
    if (type === 'IHDR') {
      if (length < 13) throw new Error('bad IHDR')
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      if (data[10] !== 0) throw new Error('unsupported PNG compression method')
      if (data[11] !== 0) throw new Error('unsupported PNG filter method')
      interlace = data[12]
    } else if (type === 'PLTE') {
      palette = data
    } else if (type === 'tRNS') {
      transparency = data
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'acTL') {
      animated = true
    } else if (type === 'IEND') {
      break
    }
  }
  if (width <= 0 || height <= 0) throw new Error('PNG has no size')
  if (![1, 2, 4, 8].includes(bitDepth)) throw new Error(`unsupported PNG bit depth ${bitDepth}`)
  const channels = channelsFor(colorType)
  if (channels === 0) throw new Error(`unsupported PNG colour type ${colorType}`)
  if (colorType === 3 && bitDepth !== 8) throw new Error('palette PNGs must be 8-bit')
  if (colorType !== 3 && bitDepth < 8) throw new Error(`unsupported ${bitDepth}-bit truecolour PNG`)
  if (interlace !== 0) throw new Error('interlaced PNGs are not supported')
  if (idat.length === 0) throw new Error('PNG has no image data')
  const inflated = inflateSync(Buffer.concat(idat))
  const bytesPerPixel = Math.max(1, (bitDepth * channels) >> 3)
  const rowBytes = Math.ceil((width * channels * bitDepth) / 8)
  const expected = (rowBytes + 1) * height
  if (inflated.length < expected) throw new Error('PNG image data is truncated')
  const rgba = new Uint8Array(width * height * 4)
  const prior = new Uint8Array(rowBytes)
  const row = new Uint8Array(rowBytes)
  let pos = 0
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[pos]
    pos += 1
    inflated.copy(row, 0, pos, pos + rowBytes)
    pos += rowBytes
    unfilterRow(filter, row, prior, bytesPerPixel)
    writeRow(row, rgba, y * width * 4, width, colorType, bitDepth, channels, palette, transparency)
    prior.set(row)
  }
  return { width, height, rgba, animated }
}

/** Reverse one PNG scanline filter in place. */
function unfilterRow(filter, row, prior, bpp) {
  const n = row.length
  switch (filter) {
    case 0:
      return
    case 1:
      for (let i = bpp; i < n; i += 1) row[i] = (row[i] + row[i - bpp]) & 0xff
      return
    case 2:
      for (let i = 0; i < n; i += 1) row[i] = (row[i] + prior[i]) & 0xff
      return
    case 3:
      for (let i = 0; i < n; i += 1) {
        const left = i >= bpp ? row[i - bpp] : 0
        row[i] = (row[i] + ((left + prior[i]) >> 1)) & 0xff
      }
      return
    case 4:
      for (let i = 0; i < n; i += 1) {
        const a = i >= bpp ? row[i - bpp] : 0
        const b = prior[i]
        const c = i >= bpp ? prior[i - bpp] : 0
        row[i] = (row[i] + paeth(a, b, c)) & 0xff
      }
      return
    default:
      throw new Error(`unknown PNG filter ${filter}`)
  }
}

/** The Paeth predictor. */
function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/** Unpack one unfiltered row into the RGBA output. */
function writeRow(row, rgba, outStart, width, colorType, bitDepth, channels, palette, transparency) {
  if (colorType === 6 && bitDepth === 8) {
    rgba.set(row.subarray(0, width * 4), outStart)
    return
  }
  if (colorType === 2 && bitDepth === 8) {
    for (let x = 0, i = 0, o = outStart; x < width; x += 1, i += 3, o += 4) {
      rgba[o] = row[i]
      rgba[o + 1] = row[i + 1]
      rgba[o + 2] = row[i + 2]
      rgba[o + 3] = 255
    }
    return
  }
  if (colorType === 0 && bitDepth === 8) {
    for (let x = 0, o = outStart; x < width; x += 1, o += 4) {
      const v = row[x]
      rgba[o] = v
      rgba[o + 1] = v
      rgba[o + 2] = v
      rgba[o + 3] = 255
    }
    return
  }
  if (colorType === 4 && bitDepth === 8) {
    for (let x = 0, i = 0, o = outStart; x < width; x += 1, i += 2, o += 4) {
      const v = row[i]
      rgba[o] = v
      rgba[o + 1] = v
      rgba[o + 2] = v
      rgba[o + 3] = row[i + 1]
    }
    return
  }
  if (colorType === 3 && bitDepth === 8) {
    if (!palette) throw new Error('palette PNG without PLTE')
    for (let x = 0, o = outStart; x < width; x += 1, o += 4) {
      const index = row[x]
      const p = index * 3
      rgba[o] = palette[p] ?? 0
      rgba[o + 1] = palette[p + 1] ?? 0
      rgba[o + 2] = palette[p + 2] ?? 0
      rgba[o + 3] = transparency && index < transparency.length ? transparency[index] : 255
    }
    return
  }
  throw new Error(`unsupported PNG form (colour type ${colorType}, bit depth ${bitDepth})`)
}

/**
 * Encode RGBA pixels as a PNG buffer. Filter type 0 per row (fast; zlib does the
 * compression), colour type 6. Diff images stay small enough because they are
 * mostly flat black/transparent.
 * @param {Uint8Array|Buffer} rgba
 * @param {number} width
 * @param {number} height
 * @returns {Buffer}
 */
export function encodePng(rgba, width, height) {
  const stride = width * 4
  if (rgba.length < stride * height) throw new Error('RGBA buffer is smaller than width*height*4')
  const raw = Buffer.allocUnsafe((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Read a PNG's declared size without decoding its pixels. */
export function pngSize(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input)
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}
