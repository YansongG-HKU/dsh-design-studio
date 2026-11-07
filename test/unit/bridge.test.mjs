/**
 * dsh-design-studio — unit tests for the injectable canvas bridge (v1 + v2).
 *
 * The engine is a self-contained browser script, so these tests run it against
 * a tiny fake DOM: enough of Document/Element/computed-style/events to exercise
 * every protocol message for real (outline, multi-select, ops, visibility,
 * drag, resize, align, overlay, serialize) without a browser dependency.
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { BRIDGE_MARKER, BRIDGE_MAX_BYTES, bridgeBytes, bridgeScript, injectBridge } from '../../lib/bridge.js'

const PAGE = '<!DOCTYPE html>\n<html lang="zh"><head><title>t</title></head><body><h1>标题</h1></body></html>'

/* ------------------------------------------------------------------ static */

test('injects one bridge script before the body close', () => {
  const output = injectBridge(PAGE, { projectId: 'dsg-1', variant: 'a', origin: 'http://127.0.0.1:60809' })
  assert.ok(output.includes('<script data-ds-bridge>'))
  assert.equal(output.indexOf('<script data-ds-bridge>') < output.lastIndexOf('</body>'), true, 'bridge must sit before </body>')
  assert.ok(output.startsWith('<!DOCTYPE html>'), 'document prefix must be preserved')
  assert.ok(output.includes('<h1>标题</h1>'), 'page content must be preserved')
  assert.equal(output.match(/<script data-ds-bridge>/gu).length, 1)
})

test('injection is idempotent', () => {
  const once = injectBridge(PAGE, { variant: 'a' })
  const twice = injectBridge(once, { variant: 'b' })
  assert.equal(twice, once)
})

test('html without a body still receives the bridge', () => {
  const fragment = '<div class="card">x</div>'
  const output = injectBridge(fragment, { variant: 'a' })
  assert.ok(output.startsWith(fragment))
  assert.ok(output.includes('data-ds-bridge'))
})

test('empty or non-string input is returned untouched', () => {
  assert.equal(injectBridge(''), '')
  assert.equal(injectBridge('   '), '   ')
  assert.equal(injectBridge(undefined), undefined)
})

test('config values are JSON-escaped and cannot break out of the script', () => {
  const script = bridgeScript({ projectId: '</script><img src=x onerror=alert(1)>', variant: '"><script>', origin: 'http://x/' })
  assert.ok(!script.includes('</script>'), 'no raw closing script tag inside the script')
  assert.ok(!script.includes('<img'), 'no raw markup inside the script')
  assert.ok(script.includes('\\u003c'), 'angle brackets are escaped')
  assert.doesNotThrow(() => new Function(script), 'embedded script must parse')
})

test('the generated script is minified and inside the v2 size budget', () => {
  assert.equal(BRIDGE_MAX_BYTES, 64 * 1024)
  assert.ok(bridgeBytes() > 30000, 'the engine should contain the whole v2 surface')
  assert.ok(bridgeBytes() < BRIDGE_MAX_BYTES, `bridge is ${bridgeBytes()} bytes, limit ${BRIDGE_MAX_BYTES}`)
  const script = bridgeScript({})
  assert.ok(!script.includes('\n  '), 'leading indentation is stripped at build time')
  assert.doesNotThrow(() => new Function(script))
})

test('the protocol surface is present (v1 + v2)', () => {
  const script = bridgeScript({ variant: 'a' })
  for (const token of [
    'ready',
    'selected',
    'hover',
    'comment-request',
    'text-edited',
    'saved-state',
    'serialize',
    'dom',
    'patch-many',
    'scroll-to',
    'edit-mode',
    'data-ds-overlay',
    'EDITMODE-BEGIN',
    '__activate_edit_mode',
    '__deactivate_edit_mode',
    'ds-panel',
    'ds-canvas',
    'announceWithRetry',
    'targetOrigins',
    'outline',
    'select-many',
    'selected-many',
    'selection-geometry',
    'drag-state',
    'editable-state',
    'comment-rect',
    'data-ds-handle',
    'data-ds-ruler',
    'data-ds-grid',
    'data-ds-columns',
    'data-ds-marquee',
    'will-change',
  ]) {
    assert.ok(script.includes(token), `bridge must expose ${token}`)
  }
})

test('the bridge is inert while mode is off', () => {
  const script = bridgeScript({ variant: 'a' })
  assert.ok(script.includes("if(MODE==='off'){clearOverlay();return}"), 'renderOverlay must early-return when off')
  assert.ok(script.includes('window.__dsBridgeLoaded'), 'bridge must guard against double execution')
  assert.ok(script.includes("document.addEventListener('mousemove',onMove,true)"), 'listeners are passive guards')
})

test('marker constant matches the injected attribute', () => {
  assert.equal(BRIDGE_MARKER, 'data-ds-bridge')
  assert.ok(injectBridge(PAGE, {}).includes('data-ds-bridge'))
})

/* ------------------------------------------------------------- fake DOM --- */

const COMPUTED_DEFAULTS = {
  color: 'rgb(26,26,26)',
  backgroundColor: 'rgba(0,0,0,0)',
  backgroundImage: 'none',
  fontFamily: 'Inter Tight',
  fontSize: '16px',
  fontWeight: '400',
  lineHeight: '24px',
  letterSpacing: 'normal',
  textAlign: 'start',
  paddingTop: '0px',
  paddingRight: '0px',
  paddingBottom: '0px',
  paddingLeft: '0px',
  marginTop: '0px',
  marginRight: '0px',
  marginBottom: '0px',
  marginLeft: '0px',
  borderRadius: '0px',
  width: '100px',
  height: '40px',
  display: 'block',
  visibility: 'visible',
  gap: 'normal',
  opacity: '1',
  transform: 'none',
  position: 'static',
  left: 'auto',
  top: 'auto',
  cursor: 'auto',
}

let seq = 0

class FakeClassList {
  constructor() {
    this.names = new Set()
  }
  get length() {
    return this.names.size
  }
  item(index) {
    return [...this.names][index] ?? null
  }
  [Symbol.iterator]() {
    return this.names[Symbol.iterator]()
  }
  get value() {
    return [...this.names].join(' ')
  }
  add(...values) {
    for (const name of values) if (name) this.names.add(name)
  }
  remove(...values) {
    for (const name of values) this.names.delete(name)
  }
  toggle(name, force) {
    const next = force === undefined ? !this.names.has(name) : force === true
    if (next) this.names.add(name)
    else this.names.delete(name)
    return next
  }
  contains(name) {
    return this.names.has(name)
  }
  replace(value) {
    this.names = new Set(String(value ?? '').split(/\s+/).filter(Boolean))
  }
}

function makeStyle() {
  const props = new Map()
  const target = {
    setProperty(name, value) {
      props.set(String(name), String(value))
    },
    getPropertyValue(name) {
      return props.has(String(name)) ? props.get(String(name)) : ''
    },
    getPropertyPriority() {
      return ''
    },
    removeProperty(name) {
      const value = target.getPropertyValue(name)
      props.delete(String(name))
      return value
    },
    get cssText() {
      return [...props.entries()].map(([key, value]) => `${key}:${value}`).join(';')
    },
    set cssText(text) {
      props.clear()
      for (const chunk of String(text ?? '').split(';')) {
        const index = chunk.indexOf(':')
        if (index > 0) props.set(chunk.slice(0, index).trim(), chunk.slice(index + 1).trim())
      }
    },
  }
  return new Proxy(target, {
    get(styleTarget, prop) {
      if (prop === 'cssText') return styleTarget.cssText
      if (typeof prop === 'string' && typeof styleTarget[prop] === 'function') return styleTarget[prop].bind(styleTarget)
      if (typeof prop === 'string') return styleTarget.getPropertyValue(prop)
      return undefined
    },
    set(styleTarget, prop, value) {
      if (prop === 'cssText') {
        styleTarget.cssText = value
        return true
      }
      styleTarget.setProperty(String(prop), String(value))
      return true
    },
  })
}

class FakeElement {
  constructor(tag, doc) {
    this.nodeType = 1
    this.tagName = String(tag).toUpperCase()
    this.ownerDocument = doc
    this.children = []
    this.parentNode = null
    this.parentElement = null
    this.id = ''
    this.attrs = new Map()
    this.classList = new FakeClassList()
    this.style = makeStyle()
    this._text = ''
    this._rect = { x: 0, y: 0, width: 100, height: 40 }
    this._computed = {}
    this._listeners = new Map()
    this.seq = ++seq
  }
  get nextSibling() {
    const parent = this.parentNode
    if (!parent) return null
    const index = parent.children.indexOf(this)
    return index >= 0 && index + 1 < parent.children.length ? parent.children[index + 1] : null
  }
  get firstElementChild() {
    return this.children.length > 0 ? this.children[0] : null
  }
  get innerText() {
    return this.textContent
  }
  get textContent() {
    return this._text + this.children.map((child) => child.textContent).join('')
  }
  set textContent(value) {
    this.children = []
    this._text = String(value ?? '')
  }
  get innerHTML() {
    return this.children.length > 0 ? this.children.map((child) => child.serialize()).join('') : this._text
  }
  set innerHTML(value) {
    this.children = []
    this._text = String(value ?? '')
  }
  get outerHTML() {
    return this.serialize()
  }
  getBoundingClientRect() {
    const rect = this._rect
    return { left: rect.x, top: rect.y, width: rect.width, height: rect.height, right: rect.x + rect.width, bottom: rect.y + rect.height }
  }
  setAttribute(name, value) {
    const text = String(value ?? '')
    this.attrs.set(name, text)
    if (name === 'id') this.id = text
    if (name === 'class') this.classList.replace(text)
  }
  getAttribute(name) {
    if (name === 'id') return this.id.length > 0 ? this.id : null
    if (name === 'class') return this.classList.value.length > 0 ? this.classList.value : null
    if (name === 'style') return this.style.cssText.length > 0 ? this.style.cssText : null
    return this.attrs.has(name) ? this.attrs.get(name) : null
  }
  removeAttribute(name) {
    this.attrs.delete(name)
    if (name === 'id') this.id = ''
    if (name === 'class') this.classList.replace('')
  }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child)
    child.parentNode = this
    child.parentElement = this
    this.children.push(child)
    return child
  }
  insertBefore(child, reference) {
    if (child.parentNode) child.parentNode.removeChild(child)
    const index = reference ? this.children.indexOf(reference) : -1
    if (index < 0) this.children.push(child)
    else this.children.splice(index, 0, child)
    child.parentNode = this
    child.parentElement = this
    return child
  }
  removeChild(child) {
    const index = this.children.indexOf(child)
    if (index >= 0) this.children.splice(index, 1)
    child.parentNode = null
    child.parentElement = null
    return child
  }
  remove() {
    if (this.parentNode) this.parentNode.removeChild(this)
  }
  contains(node) {
    if (node === this) return true
    for (const child of this.children) if (child.contains(node)) return true
    return false
  }
  closest(selector) {
    let node = this
    while (node) {
      if (node.nodeType === 1 && matchSelector(node, selector)) return node
      node = node.parentElement
    }
    return null
  }
  querySelector(selector) {
    const list = this.querySelectorAll(selector)
    return list.length > 0 ? list[0] : null
  }
  querySelectorAll(selector) {
    const out = []
    const walk = (node) => {
      for (const child of node.children) {
        if (matchSelector(child, selector)) out.push(child)
        walk(child)
      }
    }
    walk(this)
    return out
  }
  cloneNode(deep) {
    const clone = new FakeElement(this.tagName, this.ownerDocument)
    clone.id = this.id
    clone.attrs = new Map(this.attrs)
    clone.classList.replace(this.classList.value)
    for (const [key, value] of Object.entries(this._computed)) clone._computed[key] = value
    clone._rect = { ...this._rect }
    clone._text = this._text
    clone.style.cssText = this.style.cssText
    if (deep) for (const child of this.children) clone.appendChild(child.cloneNode(true))
    return clone
  }
  addEventListener(type, listener) {
    const key = String(type)
    if (!this._listeners.has(key)) this._listeners.set(key, new Set())
    this._listeners.get(key).add(listener)
  }
  removeEventListener(type, listener) {
    this._listeners.get(String(type))?.delete(listener)
  }
  dispatchEvent(type, event = {}) {
    const listeners = this._listeners.get(String(type))
    if (!listeners) return
    for (const listener of [...listeners]) listener({ ...event, type, target: event.target ?? this, currentTarget: this })
  }
  scrollIntoView() {}
  focus() {}
  blur() {
    this.dispatchEvent('blur', {})
  }
  serialize() {
    const tag = this.tagName.toLowerCase()
    const attrs = []
    if (this.id) attrs.push(`id="${this.id}"`)
    if (this.classList.value) attrs.push(`class="${this.classList.value}"`)
    for (const [key, value] of this.attrs) {
      if (key === 'id' || key === 'class') continue
      attrs.push(`${key}="${String(value).replace(/"/gu, '&quot;')}"`)
    }
    if (this.style.cssText) attrs.push(`style="${this.style.cssText}"`)
    const open = `<${tag}${attrs.length > 0 ? ` ${attrs.join(' ')}` : ''}>`
    const inner = this.children.length > 0 ? this.children.map((child) => child.serialize()).join('') : this._text
    return `${open}${inner}</${tag}>`
  }
}

const TAG_PATTERN = /^([a-zA-Z][a-zA-Z0-9-]*|\*)/u

function matchCompound(element, compound) {
  if (!element || element.nodeType !== 1) return false
  let rest = compound
  const tagMatch = TAG_PATTERN.exec(rest)
  if (tagMatch) {
    if (tagMatch[1] !== '*' && element.tagName.toLowerCase() !== tagMatch[1].toLowerCase()) return false
    rest = rest.slice(tagMatch[0].length)
  }
  while (rest.length > 0) {
    let match = /^#([A-Za-z0-9_-]+)/u.exec(rest)
    if (match) {
      if (element.id !== match[1]) return false
      rest = rest.slice(match[0].length)
      continue
    }
    match = /^\.([A-Za-z0-9_-]+)/u.exec(rest)
    if (match) {
      if (!element.classList.contains(match[1])) return false
      rest = rest.slice(match[0].length)
      continue
    }
    match = /^\[\s*([A-Za-z0-9_:-]+)(?:\s*=\s*"([^"]*)")?\s*\]/u.exec(rest)
    if (match) {
      const value = element.getAttribute(match[1])
      if (value === null) return false
      if (match[2] !== undefined && value !== match[2]) return false
      rest = rest.slice(match[0].length)
      continue
    }
    match = /^:nth-of-type\((\d+)\)/u.exec(rest)
    if (match) {
      const parent = element.parentElement
      if (!parent) return false
      const sameTag = parent.children.filter((child) => child.tagName === element.tagName)
      if (sameTag.indexOf(element) + 1 !== Number(match[1])) return false
      rest = rest.slice(match[0].length)
      continue
    }
    match = /^:first-child/u.exec(rest)
    if (match) {
      if (!element.parentElement || element.parentElement.children[0] !== element) return false
      rest = rest.slice(match[0].length)
      continue
    }
    return false
  }
  return true
}

function parseSelector(selector) {
  return selector.split(',').map((raw) => {
    const text = raw.trim()
    if (text.length === 0) return null
    const parts = []
    let pending = ' '
    let index = 0
    while (index < text.length) {
      while (index < text.length && /\s/u.test(text[index])) index += 1
      if (index < text.length && text[index] === '>') {
        pending = '>'
        index += 1
        continue
      }
      if (index >= text.length) break
      const start = index
      while (index < text.length && !/\s/u.test(text[index]) && text[index] !== '>') index += 1
      parts.push({ compound: text.slice(start, index), combinator: parts.length === 0 ? null : pending })
      pending = ' '
    }
    return parts.length > 0 ? parts : null
  }).filter(Boolean)
}

function matchChain(element, chain) {
  const last = chain[chain.length - 1]
  if (!matchCompound(element, last.compound)) return false
  let node = element
  for (let index = chain.length - 1; index > 0; index -= 1) {
    const relation = chain[index].combinator
    if (relation === '>') {
      node = node.parentElement
      if (!node || !matchCompound(node, chain[index - 1].compound)) return false
      continue
    }
    let parent = node.parentElement
    let found = false
    while (parent) {
      if (matchCompound(parent, chain[index - 1].compound)) {
        found = true
        node = parent
        break
      }
      parent = parent.parentElement
    }
    if (!found) return false
  }
  return true
}

const SELECTOR_CACHE = new Map()
function matchSelector(element, selector) {
  let parsed = SELECTOR_CACHE.get(selector)
  if (!parsed) {
    parsed = parseSelector(selector)
    SELECTOR_CACHE.set(selector, parsed)
  }
  for (const chain of parsed) if (matchChain(element, chain)) return true
  return false
}

class FakeDocument {
  constructor() {
    this.documentElement = new FakeElement('html', this)
    this.body = new FakeElement('body', this)
    this.documentElement.appendChild(this.body)
    this.readyState = 'complete'
    this._listeners = new Map()
    this.defaultView = null
  }
  createElement(tag) {
    return new FakeElement(tag, this)
  }
  querySelector(selector) {
    const list = this.querySelectorAll(selector)
    return list.length > 0 ? list[0] : null
  }
  querySelectorAll(selector) {
    const out = []
    const walk = (node) => {
      for (const child of node.children) {
        if (matchSelector(child, selector)) out.push(child)
        walk(child)
      }
    }
    walk(this.documentElement)
    return out
  }
  addEventListener(type, listener) {
    const key = String(type)
    if (!this._listeners.has(key)) this._listeners.set(key, new Set())
    this._listeners.get(key).add(listener)
  }
  removeEventListener(type, listener) {
    this._listeners.get(String(type))?.delete(listener)
  }
  dispatchEvent(event) {
    const listeners = this._listeners.get(String(event.type))
    if (!listeners) return
    for (const listener of [...listeners]) listener({ ...event, currentTarget: this })
  }
}

class FakeMessageEvent {
  constructor(type, init = {}) {
    this.type = type
    this.data = init.data
    this.source = init.source
    this.origin = init.origin
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Build a fresh fake page with the real bridge engine running on it. */
function createHarness(options = {}) {
  const messages = []
  const doc = new FakeDocument()
  const winListeners = new Map()
  const dispatched = []
  const win = {
    location: { href: 'http://127.0.0.1:60809/dsh-design-studio/preview/dsg-x/v/a', origin: 'http://127.0.0.1:60809' },
    parent: null,
    innerWidth: 1440,
    innerHeight: 900,
    scrollX: 0,
    scrollY: 0,
    CSS: undefined,
    __dsBridgeLoaded: false,
    __dsApplyTweaks: null,
    getComputedStyle(element) {
      return { ...COMPUTED_DEFAULTS, ...(element?._computed ?? {}) }
    },
    addEventListener(type, listener) {
      const key = String(type)
      if (!winListeners.has(key)) winListeners.set(key, new Set())
      winListeners.get(key).add(listener)
    },
    removeEventListener(type, listener) {
      winListeners.get(String(type))?.delete(listener)
    },
    dispatchEvent(event) {
      dispatched.push(event)
      const listeners = winListeners.get(String(event.type))
      if (!listeners) return
      for (const listener of [...listeners]) listener({ ...event, currentTarget: win })
    },
    postMessage(message) {
      messages.push(JSON.parse(JSON.stringify(message)))
    },
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id) => globalThis.clearTimeout(id),
  }
  win.parent = win
  doc.defaultView = win
  const script = bridgeScript({ variant: 'a', projectId: 'dsg-x', ...options })
  new Function('window', 'document', 'MessageEvent', script)(win, doc, FakeMessageEvent)
  const panel = (data) => {
    win.dispatchEvent({
      type: 'message',
      data: { source: 'ds-panel', ...data },
      source: win.parent,
      origin: win.location.origin,
    })
  }
  panel({ type: 'mode', mode: 'off' }) // stop the ready-retry timer
  const add = (parent, tag, config = {}) => {
    const element = doc.createElement(tag)
    if (config.id) element.setAttribute('id', config.id)
    if (config.className) element.setAttribute('class', config.className)
    if (config.text) element._text = config.text
    if (config.rect) element._rect = { ...config.rect }
    if (config.computed) element._computed = { ...config.computed }
    if (config.attrs) for (const [key, value] of Object.entries(config.attrs)) element.setAttribute(key, value)
    if (parent) parent.appendChild(element)
    return element
  }
  const mouse = (type, target, extra = {}) => {
    doc.dispatchEvent({
      type,
      target,
      clientX: extra.x ?? 0,
      clientY: extra.y ?? 0,
      altKey: extra.altKey === true,
      shiftKey: extra.shiftKey === true,
      button: 0,
      preventDefault() {},
      stopPropagation() {},
    })
  }
  const key = (name, extra = {}) => {
    doc.dispatchEvent({
      type: 'keydown',
      target: extra.target ?? doc.body,
      key: name,
      shiftKey: extra.shiftKey === true,
      preventDefault() {},
      stopPropagation() {},
    })
  }
  return {
    doc,
    win,
    messages,
    panel,
    add,
    mouse,
    key,
    dispatched,
    clear: () => {
      messages.length = 0
    },
    messagesOf: (type) => messages.filter((message) => message.type === type),
    last: (type) => {
      const list = messages.filter((message) => message.type === type)
      return list.length > 0 ? list[list.length - 1] : null
    },
    overlay: () => doc.querySelector('[data-ds-overlay]'),
  }
}

/* ----------------------------------------------------------- v1 behavior --- */

test('ready handshake carries the variant and screens', () => {
  const h = createHarness()
  const ready = h.messagesOf('ready')
  assert.ok(ready.length >= 1)
  assert.equal(ready[0].variant, 'a')
  assert.deepEqual(ready[0].screens, [])
})

test('mode / select / hover messages drive the overlay', () => {
  const h = createHarness()
  const box = h.add(h.doc.body, 'div', { id: 'hero', text: 'Hero', rect: { x: 20, y: 30, width: 400, height: 200 } })
  h.clear()
  h.panel({ type: 'mode', mode: 'select' })
  assert.equal(h.last('mode').mode, 'select')
  h.panel({ type: 'select', selector: '#hero' })
  const selected = h.last('selected')
  assert.equal(selected.info.selector, '#hero')
  assert.equal(selected.info.tag, 'div')
  assert.deepEqual(selected.info.rect, { x: 20, y: 30, width: 400, height: 200 })
  assert.equal(selected.info.text, 'Hero')
  assert.ok(h.overlay().children.length >= 1)
  h.panel({ type: 'select', selector: '' })
  assert.equal(h.last('selected').info, null)
  assert.equal(h.overlay().children.length, 0)
  h.panel({ type: 'mode', mode: 'off' })
  assert.equal(h.overlay().children.length, 0)
  assert.equal(box.children.length, 0)
})

test('hover message draws an outline without selecting', () => {
  const h = createHarness()
  h.add(h.doc.body, 'div', { id: 'card', rect: { x: 0, y: 0, width: 100, height: 100 } })
  h.panel({ type: 'mode', mode: 'select' })
  h.clear()
  h.panel({ type: 'hover', selector: '#card' })
  assert.equal(h.messagesOf('selected').length, 0)
  assert.ok(h.overlay().children.length >= 1, 'hover box is drawn')
  h.panel({ type: 'hover', selector: '#missing' })
  assert.equal(h.overlay().children.length, 0, 'hover clears on a missing selector')
})

test('patch applies camelCase styles and an empty value removes the property', () => {
  const h = createHarness()
  const box = h.add(h.doc.body, 'div', { id: 'box' })
  h.unit = box
  h.panel({ type: 'mode', mode: 'select' })
  h.clear()
  h.panel({ type: 'patch', selector: '#box', styles: { backgroundColor: '#ff0000', fontSize: '20px' } })
  assert.equal(box.style.getPropertyValue('background-color'), '#ff0000')
  assert.equal(box.style.getPropertyValue('font-size'), '20px')
  assert.equal(h.last('changed').reason, 'style')
  h.panel({ type: 'patch', selector: '#box', styles: { fontSize: '' } })
  assert.equal(box.style.getPropertyValue('font-size'), '')
  h.panel({ type: 'undo' })
  assert.equal(box.style.getPropertyValue('font-size'), '20px')
  h.panel({ type: 'redo' })
  assert.equal(box.style.getPropertyValue('font-size'), '')
})

test('scroll-to selects and scrolls the target', () => {
  const h = createHarness()
  const target = h.add(h.doc.body, 'section', { id: 'pricing', rect: { x: 0, y: 500, width: 800, height: 300 } })
  let scrolled = false
  target.scrollIntoView = () => {
    scrolled = true
  }
  h.panel({ type: 'scroll-to', selector: '#pricing' })
  assert.equal(scrolled, true)
  assert.equal(h.last('selected').info.selector, '#pricing')
})

test('tweaks apply CSS variables and call the page hook', () => {
  const h = createHarness()
  let applied = null
  h.win.__dsApplyTweaks = (values) => {
    applied = values
  }
  h.clear()
  h.panel({ type: 'tweak', values: { primaryColor: '#0055ff', radius: 4 } })
  assert.equal(h.doc.documentElement.style.getPropertyValue('--primary'), '#0055ff')
  assert.equal(h.doc.documentElement.style.getPropertyValue('--radius'), '4px')
  assert.deepEqual(applied, { primaryColor: '#0055ff', radius: 4 })
  assert.equal(h.last('tweaks').values.primaryColor, '#0055ff')
})

test('edit-mode forwards the Claude activation messages to the page', () => {
  const h = createHarness()
  h.panel({ type: 'edit-mode', on: true })
  const event = h.dispatched[h.dispatched.length - 1]
  assert.equal(event.type, 'message')
  assert.equal(event.data.type, '__activate_edit_mode')
  h.panel({ type: 'edit-mode', on: false })
  assert.equal(h.dispatched[h.dispatched.length - 1].data.type, '__deactivate_edit_mode')
})

test('messages from another source are ignored', () => {
  const h = createHarness()
  h.add(h.doc.body, 'div', { id: 'x' })
  h.clear()
  h.win.dispatchEvent({ type: 'message', data: { source: 'ds-panel', type: 'mode', mode: 'select' }, source: null, origin: 'http://evil.example' })
  h.win.dispatchEvent({ type: 'message', data: { source: 'other', type: 'mode', mode: 'select' }, source: h.win.parent, origin: h.win.location.origin })
  assert.equal(h.messagesOf('mode').length, 0)
})

/* ----------------------------------------------------------- v2 behavior --- */

test('outline returns a bounded DOM tree with selectors, rects and visibility', () => {
  const h = createHarness()
  const main = h.add(h.doc.body, 'main', { id: 'main', rect: { x: 0, y: 0, width: 1200, height: 800 } })
  h.add(main, 'h1', { id: 'title', text: '数据运营平台', className: 'display', rect: { x: 40, y: 60, width: 600, height: 60 } })
  const hidden = h.add(main, 'div', { id: 'ghost', className: 'overlay', rect: { x: 0, y: 0, width: 100, height: 100 }, computed: { display: 'none' } })
  h.add(main, 'script', { text: 'ignored()' })
  h.clear()
  h.panel({ type: 'outline' })
  const outline = h.last('outline')
  assert.ok(outline)
  assert.ok(outline.count >= 3)
  const body = outline.tree[0]
  assert.equal(body.tag, 'body')
  assert.equal(body.depth, 0)
  assert.equal(body.selector, 'body')
  const mainNode = body.children.find((node) => node.selector === '#main')
  assert.ok(mainNode, 'main is in the tree')
  assert.equal(mainNode.idAttr, 'main')
  assert.deepEqual(mainNode.rect, { x: 0, y: 0, width: 1200, height: 800 })
  const titleNode = mainNode.children.find((node) => node.selector === '#title')
  assert.equal(titleNode.text, '数据运营平台')
  assert.deepEqual(titleNode.classes, ['display'])
  const ghost = mainNode.children.find((node) => node.selector === '#ghost')
  assert.equal(ghost.visible, false)
  assert.equal(mainNode.children.some((node) => node.tag === 'script'), false, 'script is ignored')
  assert.equal(hidden.parentElement, main)
})

test('outline is bounded to 400 nodes and depth 10', () => {
  const h = createHarness()
  let parent = h.doc.body
  for (let index = 0; index < 12; index += 1) parent = h.add(parent, 'div', { attrs: { 'data-depth': String(index) } })
  for (let index = 0; index < 30; index += 1) h.add(h.doc.body, 'p', { className: 'p', rect: { x: 0, y: index, width: 10, height: 10 } })
  h.clear()
  h.panel({ type: 'outline' })
  const outline = h.last('outline')
  assert.ok(outline.count <= 400)
  let maxDepth = 0
  const walk = (nodes) => {
    for (const node of nodes) {
      maxDepth = Math.max(maxDepth, node.depth)
      walk(node.children)
    }
  }
  walk(outline.tree)
  assert.ok(maxDepth <= 10, `depth ${maxDepth} must be capped at 10`)
})

test('select-many resolves selectors, posts infos and paints every box', () => {
  const h = createHarness()
  h.add(h.doc.body, 'div', { id: 'a', rect: { x: 0, y: 0, width: 100, height: 50 } })
  h.add(h.doc.body, 'div', { id: 'b', rect: { x: 0, y: 60, width: 100, height: 50 } })
  h.panel({ type: 'mode', mode: 'select' })
  h.clear()
  h.panel({ type: 'select-many', selectors: ['#a', '#b', '#missing'] })
  const many = h.last('selected-many')
  assert.equal(many.infos.length, 2)
  assert.deepEqual(
    many.infos.map((info) => info.selector),
    ['#a', '#b'],
  )
  assert.equal(h.last('selected').info.selector, '#a')
  assert.ok(h.overlay().children.length >= 2, 'selection boxes are painted')
})

test('shift-click toggles elements in and out of the selection', () => {
  const h = createHarness()
  const a = h.add(h.doc.body, 'div', { id: 'a', rect: { x: 0, y: 0, width: 100, height: 50 } })
  const b = h.add(h.doc.body, 'div', { id: 'b', rect: { x: 0, y: 60, width: 100, height: 50 } })
  h.panel({ type: 'mode', mode: 'select' })
  h.mouse('click', a, {})
  assert.equal(h.last('selected').info.selector, '#a')
  h.mouse('click', b, { shiftKey: true })
  assert.equal(h.last('selected-many').infos.length, 2)
  h.mouse('click', b, { shiftKey: true })
  assert.equal(h.last('selected-many').infos.length, 1)
})

test('op duplicate clones after the original and is undoable', () => {
  const h = createHarness()
  const first = h.add(h.doc.body, 'div', { className: 'card', text: 'A', rect: { x: 0, y: 0, width: 100, height: 50 } })
  h.panel({ type: 'mode', mode: 'select' })
  h.clear()
  h.panel({ type: 'op', op: 'duplicate', selector: '.card' })
  assert.equal(h.doc.body.children.filter((child) => child.classList.contains('card')).length, 2)
  assert.equal(h.last('changed').reason, 'op')
  h.panel({ type: 'undo' })
  assert.equal(h.doc.body.children.filter((child) => child.classList.contains('card')).length, 1)
  assert.equal(h.doc.body.children[0], first)
  h.panel({ type: 'redo' })
  assert.equal(h.doc.body.children.filter((child) => child.classList.contains('card')).length, 2)
})

test('op delete removes the element and undo restores its position', () => {
  const h = createHarness()
  const a = h.add(h.doc.body, 'div', { id: 'a', rect: { x: 0, y: 0, width: 10, height: 10 } })
  const b = h.add(h.doc.body, 'div', { id: 'b', rect: { x: 0, y: 0, width: 10, height: 10 } })
  h.panel({ type: 'mode', mode: 'select' })
  h.panel({ type: 'op', op: 'delete', selector: '#a' })
  assert.equal(h.doc.body.children.length, 1)
  assert.equal(h.doc.body.children[0], b)
  assert.equal(h.last('selected').info, null)
  h.panel({ type: 'undo' })
  assert.equal(h.doc.body.children.length, 2)
  assert.equal(h.doc.body.children[0], a)
})

test('op up/down reorder siblings and stay undoable', () => {
  const h = createHarness()
  const a = h.add(h.doc.body, 'div', { id: 'a' })
  const b = h.add(h.doc.body, 'div', { id: 'b' })
  const c = h.add(h.doc.body, 'div', { id: 'c' })
  h.panel({ type: 'mode', mode: 'select' })
  h.panel({ type: 'op', op: 'up', selector: '#b' })
  assert.deepEqual(
    h.doc.body.children.map((child) => child.id),
    ['b', 'a', 'c'],
  )
  h.panel({ type: 'op', op: 'down', selector: '#b' })
  assert.deepEqual(
    h.doc.body.children.map((child) => child.id),
    ['a', 'b', 'c'],
  )
  h.panel({ type: 'undo' })
  assert.deepEqual(
    h.doc.body.children.map((child) => child.id),
    ['b', 'a', 'c'],
  )
  assert.equal(h.doc.body.children[1], a)
})

test('op parent and first move the selection up/down the tree', () => {
  const h = createHarness()
  const section = h.add(h.doc.body, 'section', { id: 'section' })
  const firstChild = h.add(section, 'h2', { id: 'heading' })
  h.add(section, 'p', { id: 'copy' })
  h.panel({ type: 'mode', mode: 'select' })
  h.panel({ type: 'op', op: 'first', selector: '#section' })
  assert.equal(h.last('selected').info.selector, '#heading')
  h.panel({ type: 'op', op: 'parent', selector: '#heading' })
  assert.equal(h.last('selected').info.selector, '#section')
  h.panel({ type: 'op', op: 'parent', selector: '#section' })
  assert.equal(h.last('selected').info.selector, 'body')
  assert.equal(firstChild.parentElement, section)
})

test('op editable enters text editing and announces editable-state', () => {
  const h = createHarness()
  h.add(h.doc.body, 'h1', { id: 'title', text: 'Old title', rect: { x: 0, y: 0, width: 300, height: 60 } })
  h.panel({ type: 'mode', mode: 'select' })
  h.clear()
  h.panel({ type: 'op', op: 'editable', selector: '#title' })
  const title = h.doc.querySelector('#title')
  assert.equal(title.getAttribute('contenteditable'), 'true')
  assert.equal(h.last('editable-state').editing, true)
  title.blur()
  assert.equal(h.last('editable-state').editing, false)
  assert.equal(title.getAttribute('contenteditable'), null)
})

test('visibility toggles inline display and is undoable', () => {
  const h = createHarness()
  const box = h.add(h.doc.body, 'div', { id: 'box' })
  h.panel({ type: 'op', op: 'select', selector: '#box' })
  h.clear()
  h.panel({ type: 'visibility', selector: '#box', visible: false })
  assert.equal(box.style.getPropertyValue('display'), 'none')
  assert.equal(h.last('changed').reason, 'visibility')
  h.panel({ type: 'undo' })
  assert.equal(box.style.getPropertyValue('display'), '')
  h.panel({ type: 'visibility', selector: '#box', visible: true })
  assert.equal(box.style.getPropertyValue('display'), '')
})

test('align moves the element with a translate transform and is undoable', () => {
  const h = createHarness()
  const parent = h.add(h.doc.body, 'section', { id: 'wrap', rect: { x: 0, y: 0, width: 1000, height: 800 } })
  const box = h.add(parent, 'div', { id: 'box', rect: { x: 100, y: 100, width: 200, height: 100 } })
  h.clear()
  h.panel({ type: 'align', selector: '#box', edge: 'left' })
  assert.equal(box.style.getPropertyValue('transform'), 'translate(-100px, 0px)')
  assert.equal(h.last('changed').reason, 'align')
  h.panel({ type: 'align', selector: '#box', edge: 'center' })
  assert.match(box.style.getPropertyValue('transform'), /^translate\(/)
  h.panel({ type: 'undo' })
  h.panel({ type: 'undo' })
  assert.equal(box.style.getPropertyValue('transform'), '')
})

test('selection-geometry is posted with rect, parent rect and handle flag', async () => {
  const h = createHarness()
  const parent = h.add(h.doc.body, 'section', { id: 'wrap', rect: { x: 0, y: 0, width: 1000, height: 800 } })
  h.add(parent, 'div', { id: 'box', rect: { x: 40, y: 30, width: 200, height: 100 } })
  h.panel({ type: 'mode', mode: 'select' })
  h.clear()
  h.panel({ type: 'select', selector: '#box' })
  await sleep(80)
  const geometry = h.last('selection-geometry')
  assert.ok(geometry, 'geometry event was posted')
  assert.deepEqual(geometry.rect, { x: 40, y: 30, width: 200, height: 100 })
  assert.deepEqual(geometry.parentRect, { x: 0, y: 0, width: 1000, height: 800 })
  assert.equal(geometry.handles, true)
  assert.equal(h.doc.querySelectorAll('[data-ds-handle]').length, 8)
})

test('drag-move moves the element with relative left/top and one history entry', () => {
  const h = createHarness()
  const box = h.add(h.doc.body, 'div', { id: 'box', rect: { x: 100, y: 100, width: 200, height: 100 } })
  h.panel({ type: 'mode', mode: 'select' })
  h.mouse('mousedown', box, { x: 150, y: 150 })
  h.mouse('mousemove', box, { x: 190, y: 170 })
  const live = h.last('drag-state')
  assert.equal(live.on, true)
  assert.equal(live.dx, 40)
  assert.equal(live.dy, 20)
  h.mouse('mouseup', box, { x: 190, y: 170 })
  assert.equal(box.style.getPropertyValue('position'), 'relative')
  assert.equal(box.style.getPropertyValue('left'), '40px')
  assert.equal(box.style.getPropertyValue('top'), '20px')
  assert.equal(box.style.getPropertyValue('will-change'), '')
  assert.equal(h.last('drag-state').on, false)
  assert.equal(h.last('changed').reason, 'drag')
  h.panel({ type: 'undo' })
  assert.equal(box.style.getPropertyValue('left'), '')
  assert.equal(box.style.getPropertyValue('position'), '')
  assert.equal(h.doc.body.children.length, 1)
})

test('alt-drag duplicates the element and undo removes the clone', () => {
  const h = createHarness()
  const box = h.add(h.doc.body, 'div', { className: 'card', rect: { x: 0, y: 0, width: 100, height: 50 } })
  h.panel({ type: 'mode', mode: 'select' })
  h.mouse('mousedown', box, { x: 10, y: 10, altKey: true })
  assert.equal(h.doc.body.children.length, 2, 'clone inserted on alt mousedown')
  h.mouse('mousemove', box, { x: 60, y: 30 })
  h.mouse('mouseup', box, { x: 60, y: 30 })
  h.panel({ type: 'undo' })
  assert.equal(h.doc.body.children.length, 1)
})

test('resize handles change width/height and undo restores them', () => {
  const h = createHarness()
  const box = h.add(h.doc.body, 'div', { id: 'box', rect: { x: 100, y: 100, width: 200, height: 100 } })
  h.panel({ type: 'mode', mode: 'select' })
  h.panel({ type: 'select', selector: '#box' })
  const handles = h.doc.querySelectorAll('[data-ds-handle]')
  const se = handles.find((handle) => handle.getAttribute('data-ds-handle') === 'se')
  assert.ok(se, 'south-east handle exists')
  h.clear()
  h.mouse('mousedown', se, { x: 300, y: 200 })
  h.mouse('mousemove', se, { x: 340, y: 240 })
  h.mouse('mouseup', se, { x: 340, y: 240 })
  assert.equal(box.style.getPropertyValue('width'), '240px')
  assert.equal(box.style.getPropertyValue('height'), '120px')
  assert.equal(box.style.getPropertyValue('will-change'), '')
  assert.equal(h.last('changed').reason, 'resize')
  h.panel({ type: 'undo' })
  assert.equal(box.style.getPropertyValue('width'), '')
  assert.equal(box.style.getPropertyValue('height'), '')
})

test('marquee selects the outermost intersecting elements', () => {
  const h = createHarness()
  h.add(h.doc.body, 'div', { id: 'card-a', rect: { x: 10, y: 10, width: 100, height: 100 } })
  h.add(h.doc.body, 'div', { id: 'card-b', rect: { x: 200, y: 200, width: 100, height: 100 } })
  h.add(h.doc.body, 'div', { id: 'outside', rect: { x: 1200, y: 1200, width: 50, height: 50 } })
  h.panel({ type: 'mode', mode: 'select' })
  h.clear()
  h.mouse('mousedown', h.doc.body, { x: 0, y: 0 })
  h.mouse('mousemove', h.doc.body, { x: 400, y: 400 })
  assert.ok(h.overlay().querySelector('[data-ds-marquee]'), 'marquee box is drawn while dragging')
  h.mouse('mouseup', h.doc.body, { x: 400, y: 400 })
  const many = h.last('selected-many')
  assert.deepEqual(
    many.infos.map((info) => info.selector).sort(),
    ['#card-a', '#card-b'],
  )
})

test('overlay toggles rulers, 8px grid and 12 columns on and off', () => {
  const h = createHarness()
  h.panel({ type: 'mode', mode: 'select' })
  h.panel({ type: 'overlay', rulers: true, grid: 8, columns: 12, guides: true })
  const overlay = h.overlay()
  assert.ok(overlay.querySelectorAll('[data-ds-ruler]').length >= 2)
  assert.equal(overlay.querySelector('[data-ds-grid]').getAttribute('data-ds-grid'), '8')
  assert.equal(overlay.querySelectorAll('[data-ds-column]').length, 12)
  h.panel({ type: 'overlay', rulers: false, grid: 0, columns: 0, guides: false })
  const cleared = h.overlay()
  assert.equal(cleared.querySelectorAll('[data-ds-ruler]').length, 0)
  assert.equal(cleared.querySelector('[data-ds-grid]'), null)
  assert.equal(cleared.querySelectorAll('[data-ds-column]').length, 0)
})

test('serialize strips bridge, overlay, contenteditable and will-change but keeps edits', () => {
  const h = createHarness()
  const box = h.add(h.doc.body, 'div', { id: 'box', text: 'Edited', rect: { x: 0, y: 0, width: 100, height: 50 } })
  const script = h.add(h.doc.body, 'script', { attrs: { 'data-ds-bridge': '' }, text: 'bridge()' })
  box.style.setProperty('background-color', '#ff0000')
  box.style.setProperty('will-change', 'transform')
  box.setAttribute('contenteditable', 'true')
  h.panel({ type: 'mode', mode: 'select' })
  h.panel({ type: 'select', selector: '#box' })
  h.clear()
  h.panel({ type: 'serialize' })
  const dom = h.last('dom')
  assert.ok(dom)
  assert.ok(dom.html.startsWith('<!DOCTYPE html>'))
  assert.equal(dom.html.includes('data-ds-overlay'), false)
  assert.equal(dom.html.includes('data-ds-bridge'), false)
  assert.equal(dom.html.includes('contenteditable'), false)
  assert.equal(dom.html.includes('will-change'), false)
  assert.ok(dom.html.includes('background-color:#ff0000'), 'real edits survive')
  assert.ok(dom.html.includes('Edited'))
  assert.ok(dom.bytes > 0)
  assert.equal(script.parentNode, h.doc.body, 'the live DOM is untouched')
})

test('marquee suppresses the trailing click selection', () => {
  const h = createHarness()
  const a = h.add(h.doc.body, 'div', { id: 'a', rect: { x: 0, y: 0, width: 100, height: 100 } })
  h.panel({ type: 'mode', mode: 'select' })
  h.mouse('mousedown', h.doc.body, { x: 0, y: 0 })
  h.mouse('mousemove', h.doc.body, { x: 300, y: 300 })
  h.mouse('mouseup', h.doc.body, { x: 300, y: 300 })
  h.clear()
  h.mouse('click', a, {})
  assert.equal(h.messagesOf('selected').length, 0, 'the click that ends a marquee is swallowed')
})

test('escape cancels a drag and restores the inline styles', () => {
  const h = createHarness()
  const box = h.add(h.doc.body, 'div', { id: 'box', rect: { x: 0, y: 0, width: 100, height: 50 } })
  h.panel({ type: 'mode', mode: 'select' })
  h.mouse('mousedown', box, { x: 10, y: 10 })
  h.mouse('mousemove', box, { x: 60, y: 40 })
  assert.equal(box.style.getPropertyValue('left'), '50px')
  h.key('Escape')
  assert.equal(box.style.getPropertyValue('left'), '')
  assert.equal(box.style.getPropertyValue('position'), '')
  assert.equal(h.last('drag-state').on, false)
  assert.equal(h.doc.body.children.length, 1)
})

test('viewport changes repost geometry', async () => {
  const h = createHarness()
  h.add(h.doc.body, 'div', { id: 'box', rect: { x: 0, y: 0, width: 10, height: 10 } })
  h.panel({ type: 'mode', mode: 'select' })
  h.panel({ type: 'select', selector: '#box' })
  await sleep(80)
  h.clear()
  h.win.scrollY = 200
  h.win.dispatchEvent({ type: 'scroll' })
  await sleep(180)
  assert.ok(h.messagesOf('selection-geometry').length >= 1)
})
