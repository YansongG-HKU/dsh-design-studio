/**
 * dsh-design-studio — browser lifecycle.
 *
 * One Chrome/Edge process is started lazily, shared by every capture the plugin
 * performs, and released after an idle period. Each study/check gets one
 * isolated BrowserContext, so cookies and storage never leak between projects,
 * while the process, GPU context and compiled JS stay warm between captures.
 *
 * The process is always treated as hostile infrastructure: bounded startup,
 * parsed DevTools endpoint, dead-process detection, process-tree kill on dispose,
 * and a temp profile directory that is removed afterwards.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CdpSession, createCdpConnection } from './cdp.js'
import { LIMITS } from './config.js'
import { messageOf } from './util.js'

/** Well-known browser executables, most preferred first. */
const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Users\\Public\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.PROGRAMFILES ? join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
  process.env['PROGRAMFILES(X86)'] ? join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
].filter(Boolean)

/** Resolve a Chromium-family executable, or null with the paths tried. */
export function findBrowser(explicitPath = '') {
  if (typeof explicitPath === 'string' && explicitPath.trim().length > 0) {
    return existsSync(explicitPath.trim()) ? { path: explicitPath.trim(), source: 'config' } : { path: null, tried: [explicitPath.trim()] }
  }
  if (typeof process.env.DESIGN_STUDIO_BROWSER === 'string' && process.env.DESIGN_STUDIO_BROWSER.length > 0) {
    const path = process.env.DESIGN_STUDIO_BROWSER
    if (existsSync(path)) return { path, source: 'env' }
  }
  for (const path of CANDIDATES) {
    if (existsSync(path)) return { path, source: 'known-path' }
  }
  return { path: null, tried: CANDIDATES }
}

/** A normal desktop Chrome UA, derived from the browser's own version. */
function desktopUserAgent(product) {
  const match = /Chrome\/([\d.]+)/u.exec(String(product ?? ''))
  const version = match ? match[1] : '131.0.0.0'
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`
}

/** Quote one argument for the Windows command line (used by taskkill only). */
function killTree(pid) {
  return new Promise((resolve) => {
    if (!Number.isFinite(pid) || pid <= 0) {
      resolve()
      return
    }
    try {
      const killer = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
      killer.once('exit', () => resolve())
      killer.once('error', () => {
        try {
          process.kill(pid)
        } catch {
          /* already gone */
        }
        resolve()
      })
    } catch {
      resolve()
    }
  })
}

/** One launched browser process and its CDP connection. */
class BrowserProcess {
  constructor({ exePath, log }) {
    this.exePath = exePath
    this.log = log
    this.child = null
    this.connection = null
    this.userDataDir = ''
    this.product = ''
    this.starting = null
    this.closed = false
    this.disposePromise = null
  }

  /** Start the process and connect to its endpoint. */
  async start() {
    if (this.connection && !this.connection.closed) return this.connection
    if (this.starting) return this.starting
    this.starting = this._start()
    try {
      return await this.starting
    } finally {
      this.starting = null
    }
  }

  async _start() {
    this.userDataDir = await mkdtemp(join(tmpdir(), 'design-studio-browser-'))
    const args = [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${this.userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--hide-scrollbars',
      '--mute-audio',
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-sync',
      '--metrics-recording-only',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-features=Translate,MediaRouter,OptimizationHints',
      '--window-size=1440,900',
      'about:blank',
    ]
    const child = spawn(this.exePath, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    this.child = child
    const endpoint = await this._waitForEndpoint(child)
    const connection = await createCdpConnection(endpoint, { timeoutMs: LIMITS.cdpTimeoutMs })
    child.once('exit', (code) => {
      this._onExit(`browser exited with code ${code}`)
    })
    connection.onEvent((event) => {
      if (event.method === 'Target.targetCrashed') this._onExit('a page crashed')
    })
    this.connection = connection
    try {
      const info = await connection.send('Browser.getVersion')
      this.product = String(info?.product ?? '')
    } catch {
      this.product = ''
    }
    return connection
  }

  /** Wait for Chrome to print its DevTools endpoint. */
  _waitForEndpoint(child) {
    return new Promise((resolve, reject) => {
      let buffer = ''
      const started = Date.now()
      const timer = setTimeout(() => {
        cleanup()
        reject(new Error(`browser did not report a DevTools endpoint in 15 s: ${buffer.slice(-1500)}`))
      }, 15000)
      const onData = (chunk) => {
        buffer += chunk.toString()
        const match = /DevTools listening on (ws:\/\/\S+)/u.exec(buffer)
        if (match) {
          cleanup()
          resolve(match[1])
        }
        if (Date.now() - started > 15000) {
          cleanup()
          reject(new Error(`browser did not report a DevTools endpoint in 15 s: ${buffer.slice(-1500)}`))
        }
      }
      const onExit = (code) => {
        cleanup()
        reject(new Error(`browser exited during startup with code ${code}: ${buffer.slice(-1500)}`))
      }
      const cleanup = () => {
        clearTimeout(timer)
        child.stdout?.off('data', onData)
        child.stderr?.off('data', onData)
        child.off('exit', onExit)
      }
      child.stdout?.on('data', onData)
      child.stderr?.on('data', onData)
      child.once('exit', onExit)
    })
  }

  /** Mark the process dead and prepare for a relaunch. */
  _onExit(reason) {
    if (this.closed && !this.connection) return
    try {
      this.log?.warn?.(`[dsh-design-studio] browser went away: ${reason}`)
    } catch {
      /* logging must not throw */
    }
    this.connection?.close()
    this.connection = null
    this.child = null
  }

  /** Whether the process is usable. */
  alive() {
    return this.connection !== null && !this.connection.closed && this.child !== null
  }

  /**
   * Open one isolated browser context with one page and attach a flattened
   * session to it.
   */
  async newPage({ userAgent = '', blockedUrls = [] } = {}) {
    const connection = await this.start()
    const { browserContextId } = await connection.send('Target.createBrowserContext', { disposeOnDetach: false })
    let targetId
    try {
      const created = await connection.send('Target.createTarget', { url: 'about:blank', browserContextId })
      targetId = created.targetId
    } catch (error) {
      await connection.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {})
      throw error
    }
    const { sessionId } = await connection.send('Target.attachToTarget', { targetId, flatten: true })
    const session = new CdpSession(connection, sessionId, targetId)
    const page = new BrowserPage({ browser: this, session, browserContextId, targetId, userAgent, blockedUrls })
    return page
  }

  /** Release the process and its temp profile. */
  async dispose() {
    if (this.disposePromise) return this.disposePromise
    this.disposePromise = (async () => {
      this.closed = true
      const child = this.child
      const connection = this.connection
      this.child = null
      this.connection = null
      try {
        connection?.close()
      } catch {
        /* best effort */
      }
      if (child && child.pid) await killTree(child.pid)
      if (this.userDataDir) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            await rm(this.userDataDir, { recursive: true, force: true })
            break
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }
        this.userDataDir = ''
      }
    })()
    return this.disposePromise
  }
}

/** One page inside a browser context. */
class BrowserPage {
  constructor({ browser, session, browserContextId, targetId, userAgent, blockedUrls }) {
    this.browser = browser
    this.session = session
    this.connection = browser.connection
    this.browserContextId = browserContextId
    this.targetId = targetId
    this.userAgent = userAgent
    this.blockedUrls = blockedUrls
    this.closed = false
    this.listeners = new Set()
    this.network = { inflight: new Map(), failed: [], responses: [], lastActivity: Date.now() }
    this.unsubscribe = session.onEvent((event) => this._onEvent(event))
  }

  /** Handle every CDP event this page receives. */
  _onEvent(event) {
    const { method, params } = event
    if (method === 'Network.requestWillBeSent') {
      this.network.inflight.set(params.requestId, { url: params.request?.url ?? '', startedAt: Date.now() })
      this.network.lastActivity = Date.now()
    } else if (method === 'Network.loadingFinished') {
      this.network.inflight.delete(params.requestId)
      this.network.lastActivity = Date.now()
    } else if (method === 'Network.loadingFailed') {
      this.network.inflight.delete(params.requestId)
      if (!params.canceled) this.network.failed.push({ url: params.request?.url ?? this.network.inflight.get(params.requestId)?.url ?? '', reason: params.errorText ?? '' })
      this.network.lastActivity = Date.now()
    } else if (method === 'Network.responseReceived') {
      const response = params.response ?? {}
      this.network.responses.push({ url: response.url ?? '', status: response.status ?? 0, type: params.type ?? '', mime: response.mimeType ?? '', fromCache: response.fromDiskCache === true })
      if ((response.status ?? 0) >= 400) this.network.failed.push({ url: response.url ?? '', status: response.status, reason: `HTTP ${response.status}` })
      this.network.lastActivity = Date.now()
    }
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch {
        /* listeners never break the page */
      }
    }
  }

  /** Subscribe to this page's events. */
  onEvent(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Enable the domains a capture needs and apply UA/header/blocking policy. */
  async initialize() {
    await this.session.send('Page.enable')
    await this.session.send('Runtime.enable')
    await this.session.send('Network.enable', { maxTotalBufferSize: 16 * 1024 * 1024, maxResourceBufferSize: 4 * 1024 * 1024 })
    if (this.userAgent) {
      await this.session.send('Network.setUserAgentOverride', { userAgent: this.userAgent, platform: 'Win32', acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.8' })
    }
    await this.session.send('Network.setExtraHTTPHeaders', { headers: { 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' } }).catch(() => {})
    if (Array.isArray(this.blockedUrls) && this.blockedUrls.length > 0) {
      await this.session.send('Network.setBlockedURLs', { urls: this.blockedUrls }).catch(() => {})
    }
    return this
  }

  /** Reset the per-navigation network bookkeeping. */
  resetNetwork() {
    this.network.failed = []
    this.network.responses = []
    this.network.inflight.clear()
    this.network.lastActivity = Date.now()
  }

  /** Wait until the page has no in-flight requests for a quiet window. */
  async waitForNetworkIdle({ quietMs = 220, timeoutMs = 10000 } = {}) {
    const started = Date.now()
    for (;;) {
      if (this.closed) return false
      const now = Date.now()
      if (this.network.inflight.size === 0 && now - this.network.lastActivity >= quietMs) return true
      if (now - started > timeoutMs) return false
      await new Promise((resolve) => setTimeout(resolve, 40))
    }
  }

  /** Close the page and its browser context. */
  async close() {
    if (this.closed) return
    this.closed = true
    try {
      this.unsubscribe?.()
    } catch {
      /* already gone */
    }
    try {
      await this.session.send('Target.closeTarget', { targetId: this.targetId })
    } catch {
      /* target may be gone */
    }
    try {
      await this.connection.send('Target.disposeBrowserContext', { browserContextId: this.browserContextId })
    } catch {
      /* context may be gone */
    }
  }
}

/**
 * The shared browser pool.
 *
 * `withPage()` guarantees the page and context are closed; the idle timer
 * releases the process when nothing has used it for a while.
 */
export class BrowserPool {
  constructor({ browserPath = '', blockedHosts = [], log, idleMs = LIMITS.browserIdleMs } = {}) {
    this.found = findBrowser(browserPath)
    this.blockedHosts = Array.isArray(blockedHosts) ? blockedHosts : []
    this.log = log
    this.idleMs = Math.max(10000, Number(idleMs) || LIMITS.browserIdleMs)
    this.process = null
    this.activePages = 0
    this.idleTimer = null
    this.disposed = false
  }

  /** Whether a browser executable was found (without launching it). */
  availability() {
    return {
      available: typeof this.found.path === 'string',
      path: this.found.path ?? '',
      product: this.process?.product ?? '',
      running: this.process?.alive() === true,
      tried: this.found.tried ?? [],
    }
  }

  /**
   * Panel-safe availability report. Never throws.
   * @param {{refresh?: boolean}} [options] refresh=true launches the browser to learn its product string.
   * @returns {Promise<{available: boolean, path: string, product: string, running: boolean, tried: string[]}>}
   */
  async status(options = {}) {
    const report = {
      available: typeof this.found?.path === 'string',
      path: this.found?.path ?? '',
      product: '',
      running: false,
      tried: Array.isArray(this.found?.tried) ? this.found.tried : [],
    }
    try {
      report.running = this.process !== null && this.process.alive()
      report.product = this.process?.product ?? ''
    } catch {
      /* a dead process must not break the report */
    }
    if (options.refresh === true && report.available && !this.disposed) {
      try {
        const instance = await this.ensure()
        await instance.start()
        report.product = instance.product || report.product
        report.running = instance.alive()
      } catch {
        /* availability stays as found; the reason is reported by the caller's job */
      }
    }
    return report
  }

  /** Blocked URL patterns for the Network domain. */
  blockedUrlPatterns() {
    return this.blockedHosts.map((host) => `*://*.${host.replace(/^\*\./u, '')}/*`).slice(0, 60)
  }

  /** Ensure the process exists, returning the BrowserProcess. */
  async ensure() {
    if (this.disposed) throw new Error('the browser pool was disposed')
    if (!this.found.path) {
      const error = new Error('no Chrome or Edge executable found; set browserPath in the plugin config or the DESIGN_STUDIO_BROWSER environment variable')
      error.code = 'no_browser'
      throw error
    }
    if (!this.process) {
      this.process = new BrowserProcess({ exePath: this.found.path, log: this.log })
    }
    return this.process
  }

  /**
   * Open one page and hand it to the caller, who must close it.
   * The idle timer cannot release the process while the page is open.
   * @returns {Promise<object>} an initialized page (see withPage's action argument)
   */
  async page(options = {}) {
    const process = await this.ensure()
    this.clearIdle()
    const page = await process.newPage({
      userAgent: desktopUserAgent(process.product),
      blockedUrls: this.blockedUrlPatterns(),
      ...options,
    })
    this.activePages += 1
    const close = page.close.bind(page)
    page.close = async () => {
      try {
        await close()
      } finally {
        this.activePages = Math.max(0, this.activePages - 1)
        this.scheduleIdle()
      }
    }
    try {
      await page.initialize()
    } catch (error) {
      await page.close().catch(() => {})
      throw error
    }
    return page
  }

  /** Run `action(page)` inside one isolated context (alias of withPage). */
  async withContext(action, options = {}) {
    return this.withPage(action, options)
  }

  /** Open a page and run `action` with it; always closes the page. */
  async withPage(action, options = {}) {
    const process = await this.ensure()
    this.clearIdle()
    const page = await process.newPage({
      userAgent: desktopUserAgent(process.product),
      blockedUrls: this.blockedUrlPatterns(),
      ...options,
    })
    this.activePages += 1
    try {
      await page.initialize()
      return await action(page)
    } finally {
      this.activePages = Math.max(0, this.activePages - 1)
      try {
        await page.close()
      } catch {
        /* closing is best effort */
      }
      this.scheduleIdle()
    }
  }

  /** Release the process after an idle window. */
  scheduleIdle() {
    this.clearIdle()
    if (this.disposed) return
    this.idleTimer = setTimeout(() => {
      if (this.activePages === 0) void this.release()
    }, this.idleMs)
    if (typeof this.idleTimer.unref === 'function') this.idleTimer.unref()
  }

  clearIdle() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
  }

  /** Stop the browser process (relaunched on demand). */
  async release() {
    this.clearIdle()
    const process = this.process
    this.process = null
    if (process) {
      try {
        await process.dispose()
      } catch (error) {
        try {
          this.log?.warn?.(`[dsh-design-studio] could not stop the browser cleanly: ${messageOf(error)}`)
        } catch {
          /* logging must not throw */
        }
      }
    }
  }

  /** Stop everything for plugin disposal. */
  async dispose() {
    this.disposed = true
    await this.release()
  }
}
