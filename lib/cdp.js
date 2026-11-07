/**
 * dsh-design-studio — a small Chrome DevTools Protocol client.
 *
 * One connection to the browser endpoint carries many flattened sessions (one
 * per page/context). Commands are promises with per-command timeouts; events
 * are delivered to one listener list and can be awaited by predicate. Nothing
 * here knows about pages or captures — `browser.js` and `capture.js` do.
 */

import { connectWebSocket } from './ws.js'
import { LIMITS } from './config.js'

/**
 * Open the CDP connection.
 * @param {string} wsUrl browser WebSocket endpoint (`/devtools/browser/...`)
 * @param {{timeoutMs?: number}} options
 */
export async function createCdpConnection(wsUrl, options = {}) {
  const socket = await connectWebSocket(wsUrl, { timeoutMs: options.timeoutMs ?? 10000 })
  return new CdpConnection(socket, options)
}

/** One live CDP connection. */
export class CdpConnection {
  constructor(socket, options = {}) {
    this.socket = socket
    this.timeoutMs = options.timeoutMs ?? LIMITS.cdpTimeoutMs
    this.nextId = 0
    this.pending = new Map()
    this.listeners = new Set()
    this.waiters = new Set()
    this.closed = false
    this.closeReason = ''
    socket.on('message', (text) => this._onMessage(text))
    socket.on('close', (code, reason) => this._onClose(code, reason))
    socket.on('error', (error) => this._onClose(1006, String(error?.message ?? error)))
  }

  /** Dispatch one protocol message. */
  _onMessage(text) {
    let message
    try {
      message = JSON.parse(text)
    } catch {
      return
    }
    if (Object.prototype.hasOwnProperty.call(message, 'id')) {
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      clearTimeout(pending.timer)
      if (message.error) {
        const error = new Error(message.error.message ?? 'CDP error')
        error.code = message.error.code
        error.data = message.error.data
        error.method = pending.method
        pending.reject(error)
      } else {
        pending.resolve(message.result ?? {})
      }
      return
    }
    if (typeof message.method !== 'string') return
    const event = { method: message.method, params: message.params ?? {}, sessionId: message.sessionId }
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch {
        /* listener errors never break the connection */
      }
    }
    for (const waiter of [...this.waiters]) {
      if (waiter.method !== undefined && waiter.method !== event.method) continue
      if (waiter.sessionId !== undefined && waiter.sessionId !== event.sessionId) continue
      let matched = true
      if (typeof waiter.predicate === 'function') {
        try {
          matched = waiter.predicate(event.params, event)
        } catch {
          matched = false
        }
      }
      if (!matched) continue
      this.waiters.delete(waiter)
      clearTimeout(waiter.timer)
      waiter.resolve(event.params)
    }
  }

  /** Reject everything on close. */
  _onClose(code, reason) {
    if (this.closed) return
    this.closed = true
    this.closeReason = reason || `closed (${code})`
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(new Error(`CDP connection closed before ${pending.method} answered: ${this.closeReason}`))
    }
    this.pending.clear()
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer)
      waiter.reject(new Error(`CDP connection closed while waiting for ${waiter.method ?? 'an event'}`))
    }
    this.waiters.clear()
  }

  /** Send one command. */
  send(method, params = {}, sessionId) {
    if (this.closed) return Promise.reject(new Error(`CDP connection is closed: ${this.closeReason}`))
    const id = ++this.nextId
    const payload = { id, method, params }
    if (sessionId) payload.sessionId = sessionId
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) {
          const error = new Error(`CDP command ${method} timed out after ${this.timeoutMs} ms`)
          error.code = 'timeout'
          reject(error)
        }
      }, this.timeoutMs)
      if (typeof timer.unref === 'function') timer.unref()
      this.pending.set(id, { resolve, reject, timer, method })
      try {
        this.socket.send(JSON.stringify(payload))
      } catch (error) {
        clearTimeout(timer)
        this.pending.delete(id)
        reject(error)
      }
    })
  }

  /** Subscribe to every CDP event; returns the unsubscribe function. */
  onEvent(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Wait for one event (optionally from one session) with a timeout.
   * @param {string|undefined} method
   * @param {{sessionId?: string, timeout?: number, predicate?: Function}} options
   */
  waitForEvent(method, options = {}) {
    const timeout = options.timeout ?? this.timeoutMs
    return new Promise((resolve, reject) => {
      const waiter = {
        method,
        sessionId: options.sessionId,
        predicate: options.predicate,
        resolve,
        reject,
        timer: null,
      }
      waiter.timer = setTimeout(() => {
        this.waiters.delete(waiter)
        const error = new Error(`timed out after ${timeout} ms waiting for ${method ?? 'a CDP event'}`)
        error.code = 'timeout'
        reject(error)
      }, timeout)
      if (typeof waiter.timer.unref === 'function') waiter.timer.unref()
      this.waiters.add(waiter)
    })
  }

  /** Close the connection. */
  close() {
    this._onClose(1000, 'closed by the client')
    try {
      this.socket.close(1000, 'done')
    } catch {
      /* already closed */
    }
  }
}

/** A convenience wrapper bound to one flattened session. */
export class CdpSession {
  constructor(connection, sessionId, targetId) {
    this.connection = connection
    this.sessionId = sessionId
    this.targetId = targetId
  }

  send(method, params = {}) {
    return this.connection.send(method, params, this.sessionId)
  }

  waitForEvent(method, options = {}) {
    return this.connection.waitForEvent(method, { ...options, sessionId: this.sessionId })
  }

  onEvent(listener) {
    return this.connection.onEvent((event) => {
      if (event.sessionId === this.sessionId) listener(event)
    })
  }

  async detach() {
    try {
      await this.connection.send('Target.detachFromTarget', { sessionId: this.sessionId })
    } catch {
      /* the target may already be gone */
    }
  }
}

/** A raw JSON HTTP request to the browser endpoint (used for /json/version). */
export async function fetchJson(url, timeoutMs = 5000) {
  const http = await import('node:http')
  return new Promise((resolve, reject) => {
    const request = http.get(url, { timeout: timeoutMs }, (response) => {
      let text = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        text += chunk
      })
      response.on('end', () => {
        try {
          resolve(JSON.parse(text))
        } catch (error) {
          reject(new Error(`invalid JSON from ${url}: ${String(error?.message ?? error)}`))
        }
      })
    })
    request.on('timeout', () => request.destroy(new Error(`timed out fetching ${url}`)))
    request.on('error', reject)
  })
}
