/**
 * dsh-design-studio — a minimal RFC 6455 WebSocket client.
 *
 * The Host process may run on a Node/Electron build without a global
 * `WebSocket`, so the CDP transport cannot depend on one. This client speaks
 * only what DevTools needs: one text request, masked client frames, fragmented
 * server frames, ping/pong and clean close. No extensions, no compression.
 *
 * It is deliberately small and allocation-light; a CDP session carries tens of
 * thousands of small messages during a capture.
 */

import { EventEmitter } from 'node:events'
import { createHash, randomBytes } from 'node:crypto'
import http from 'node:http'
import { URL } from 'node:url'

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

/** Build one masked client frame. */
export function encodeFrame(payload, { opcode = 0x1, fin = true } = {}) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload), 'utf8')
  const mask = randomBytes(4)
  const length = body.length
  let header
  if (length < 126) {
    header = Buffer.allocUnsafe(6)
    header[1] = 0x80 | length
  } else if (length < 65536) {
    header = Buffer.allocUnsafe(8)
    header[1] = 0x80 | 126
    header.writeUInt16BE(length, 2)
  } else {
    header = Buffer.allocUnsafe(14)
    header[1] = 0x80 | 127
    header.writeUInt32BE(0, 2)
    header.writeUInt32BE(length, 6)
  }
  header[0] = (fin ? 0x80 : 0) | opcode
  mask.copy(header, length < 126 ? 2 : length < 65536 ? 4 : 10)
  const masked = Buffer.allocUnsafe(length)
  for (let i = 0; i < length; i += 1) masked[i] = body[i] ^ mask[i & 3]
  return Buffer.concat([header, masked])
}

/** Parse one server frame from a buffer; returns null when incomplete. */
export function decodeFrame(buffer) {
  if (buffer.length < 2) return null
  const first = buffer[0]
  const second = buffer[1]
  const fin = (first & 0x80) !== 0
  const opcode = first & 0x0f
  const masked = (second & 0x80) !== 0
  let length = second & 0x7f
  let offset = 2
  if (length === 126) {
    if (buffer.length < 4) return null
    length = buffer.readUInt16BE(2)
    offset = 4
  } else if (length === 127) {
    if (buffer.length < 10) return null
    const high = buffer.readUInt32BE(2)
    const low = buffer.readUInt32BE(6)
    if (high > 0x001fffff) return null
    length = high * 2 ** 32 + low
    offset = 10
  }
  let maskKey = null
  if (masked) {
    if (buffer.length < offset + 4) return null
    maskKey = buffer.subarray(offset, offset + 4)
    offset += 4
  }
  if (buffer.length < offset + length) return null
  let payload = buffer.subarray(offset, offset + length)
  if (masked && maskKey) {
    const unmasked = Buffer.allocUnsafe(length)
    for (let i = 0; i < length; i += 1) unmasked[i] = payload[i] ^ maskKey[i & 3]
    payload = unmasked
  }
  return { fin, opcode, payload, consumed: offset + length }
}

/**
 * Open a WebSocket to a ws:// URL and resolve on the 101 handshake.
 * @param {string} url
 * @param {{timeoutMs?: number, maxPayload?: number}} options
 * @returns {Promise<WebSocketClient>}
 */
export function connectWebSocket(url, options = {}) {
  return new Promise((resolve, reject) => {
    let parsed
    try {
      parsed = new URL(url)
    } catch (error) {
      reject(new Error(`invalid WebSocket URL: ${url}`))
      return
    }
    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
      reject(new Error(`unsupported WebSocket protocol ${parsed.protocol}`))
      return
    }
    const key = randomBytes(16).toString('base64')
    const request = http.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'wss:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': key,
        Host: parsed.host,
      },
      rejectUnauthorized: false,
      timeout: options.timeoutMs ?? 10000,
    })
    request.on('upgrade', (response, socket, head) => {
      const accept = response.headers['sec-websocket-accept']
      const expected = createAccept(key)
      if (accept !== expected) {
        socket.destroy()
        reject(new Error('WebSocket handshake failed: bad Sec-WebSocket-Accept'))
        return
      }
      const client = new WebSocketClient(socket, options)
      if (head && head.length > 0) client._onData(head)
      resolve(client)
    })
    request.on('response', (response) => {
      response.resume()
      reject(new Error(`WebSocket handshake rejected with HTTP ${response.statusCode}`))
    })
    request.on('timeout', () => {
      request.destroy(new Error('WebSocket handshake timed out'))
    })
    request.on('error', reject)
    request.end()
  })
}

/** Compute the handshake accept token. */
function createAccept(key) {
  return createHash('sha1').update(key + GUID).digest('base64')
}

/** One live WebSocket connection. */
export class WebSocketClient extends EventEmitter {
  /** @param {import('node:net').Socket} socket */
  constructor(socket, options = {}) {
    super()
    this.socket = socket
    this.maxPayload = options.maxPayload ?? 64 * 1024 * 1024
    this.closed = false
    this.buffer = Buffer.alloc(0)
    this.fragments = []
    this.fragmentOpcode = 0
    this.fragmentBytes = 0
    socket.setNoDelay(true)
    socket.on('data', (chunk) => this._onData(chunk))
    socket.on('error', (error) => {
      if (!this.closed) {
        this.closed = true
        this.emit('error', error)
        this.emit('close', 1006, String(error?.message ?? error))
      }
    })
    socket.on('close', () => {
      if (!this.closed) {
        this.closed = true
        this.emit('close', 1006, 'socket closed')
      }
    })
  }

  /** Feed raw bytes into the frame parser. */
  _onData(chunk) {
    if (this.closed) return
    this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk])
    for (;;) {
      const frame = decodeFrame(this.buffer)
      if (!frame) break
      this.buffer = this.buffer.subarray(frame.consumed)
      this._handleFrame(frame)
      if (this.closed) break
    }
    if (this.buffer.length > this.maxPayload) {
      this.close(1009, 'frame too large')
    }
  }

  /** Dispatch one decoded frame. */
  _handleFrame(frame) {
    if (frame.opcode === 0x8) {
      const code = frame.payload.length >= 2 ? frame.payload.readUInt16BE(0) : 1005
      const reason = frame.payload.length > 2 ? frame.payload.subarray(2).toString('utf8') : ''
      this._finish(code, reason)
      return
    }
    if (frame.opcode === 0x9) {
      this._sendFrame(Buffer.alloc(0), { opcode: 0xa })
      return
    }
    if (frame.opcode === 0xa) return
    if (frame.opcode === 0x2) {
      // Binary messages are not used by CDP; ignore rather than crash.
      return
    }
    this.fragmentBytes += frame.payload.length
    if (this.fragmentBytes > this.maxPayload) {
      this.close(1009, 'message too large')
      return
    }
    if (frame.opcode !== 0x0) this.fragmentOpcode = frame.opcode
    this.fragments.push(Buffer.from(frame.payload))
    if (!frame.fin) return
    const payload = this.fragments.length === 1 ? this.fragments[0] : Buffer.concat(this.fragments)
    this.fragments = []
    this.fragmentBytes = 0
    if (this.fragmentOpcode === 0x1) this.emit('message', payload.toString('utf8'))
  }

  /** Send one text message. */
  send(text) {
    if (this.closed) throw new Error('WebSocket is closed')
    this._sendFrame(Buffer.from(String(text), 'utf8'), { opcode: 0x1 })
  }

  /** Send one frame. */
  _sendFrame(payload, options) {
    if (this.closed) return
    try {
      this.socket.write(encodeFrame(payload, options))
    } catch (error) {
      this._finish(1006, String(error?.message ?? error))
    }
  }

  /** Close cleanly. */
  close(code = 1000, reason = '') {
    if (this.closed) return
    const body = Buffer.allocUnsafe(2 + Buffer.byteLength(reason))
    body.writeUInt16BE(code, 0)
    body.write(reason, 2, 'utf8')
    this._sendFrame(body, { opcode: 0x8 })
    this._finish(code, reason)
  }

  /** Mark closed and tear the socket down. */
  _finish(code, reason) {
    if (this.closed) return
    this.closed = true
    try {
      this.socket.end()
      this.socket.destroy()
    } catch {
      /* already gone */
    }
    this.emit('close', code, reason)
  }
}
