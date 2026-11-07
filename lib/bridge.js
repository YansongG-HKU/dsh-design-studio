/**
 * dsh-design-studio — the injectable canvas bridge (CONTRACT §5/§6, UI-V2 §4).
 *
 * `injectBridge(html, {projectId, variant, origin})` appends one inline
 * `<script data-ds-bridge>` to a served design page. That script is the canvas
 * engine the Design Studio panel talks to over postMessage: hover/selection
 * overlays, stable CSS selectors, element inspection, inline style patching,
 * undo/redo, 1 px nudge, double-click text editing, DOM serialisation for save,
 * the Claude Tweaks edit-mode protocol, comment requests and scroll-to.
 *
 * v2 adds the editor protocol on top, without changing v1 semantics: a DOM
 * layer outline, panel-driven hover, multi-select + marquee, element
 * duplicate/delete/reorder/parent/first/editable, visibility, drag-move,
 * 8-handle resize, align-to-parent, rulers / 8px grid / 12-column overlay,
 * `changed` + `selection-geometry` events and clean serialisation.
 *
 * The engine is deliberately dependency-free, ES5-flavoured, defensive, and
 * silent when the page is opened outside the panel (no parent, no overlay).
 * It must never change the design visually while mode is `off`.
 */

/** Marker attribute used to detect and strip the injected script. */
export const BRIDGE_MARKER = 'data-ds-bridge'
/** Upper bound for the injected script (v2 budget, per UI-V2; Lead approved). */
export const BRIDGE_MAX_BYTES = 64 * 1024

/* eslint-disable no-useless-escape */
const BRIDGE_TEMPLATE = String.raw`(function () {
  'use strict'
  if (window.__dsBridgeLoaded) return
  window.__dsBridgeLoaded = true
  var CONFIG = __DS_CONFIG__
  var MODE = 'off'
  var SELECTED = null
  var HOVER = null
  var HISTORY = []
  var REDO = []
  var OVERLAY = null
  var EDIT = null
  var ACCENT = '#b4552f'
  var MUTED = '#2f6f68'
  var ANNOUNCE_TRIES = 0
  var ANNOUNCE_TIMER = 0
  /* ---- v2 editor state ---- */
  var SELECTED_MANY = []
  var OUTLINE_TIMER = 0
  var GEOM_TIMER = 0
  var OVERLAY_OPTS = { rulers: false, grid: 0, columns: 0, guides: false }
  var DRAG = null
  var RESIZE = null
  var MARQUEE = null
  var SUPPRESS_CLICK = false
  var PINS = []
  var PIN_COUNT = 0
  var VIEW_TIMER = 0

  /**
   * Origin candidates for panel-bound messages.
   *
   * The desktop harness serves the panel from the dsh-app scheme while the
   * plugin route reports its HTTP origin, so a single hard-coded target origin
   * would be silently dropped by the browser. When the parent is same-origin we
   * can read its real origin; always include our own (the embedded parent is
   * same-origin by construction) and, for external embeds, the configured one.
   */
  function targetOrigins() {
    var list = []
    function add(origin) {
      if (typeof origin === 'string' && origin.length > 0 && origin !== 'null' && list.indexOf(origin) === -1) list.push(origin)
    }
    try {
      if (window.parent && window.parent !== window && window.parent.location) add(window.parent.location.origin)
    } catch (error) {
      /* cross-origin embed; fall through to the configured origin */
    }
    try { add(window.location.origin) } catch (error) {}
    add(CONFIG.origin)
    return list
  }

  function post(message) {
    var targets = targetOrigins()
    if (targets.length === 0) targets = ['*']
    message.source = 'ds-canvas'
    for (var index = 0; index < targets.length; index += 1) {
      try { window.parent.postMessage(message, targets[index]) } catch (error) {}
    }
  }
  function fail(code, error) {
    post({ type: 'error', code: code, message: String((error && error.message) || error) })
  }
  function guard(code, fn) {
    try {
      return fn()
    } catch (error) {
      fail(code, error)
      return undefined
    }
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value)
    return String(value).replace(/[^a-zA-Z0-9_-]/g, function (ch) { return '\\' + ch })
  }
  function isUnique(selector, element) {
    try {
      var list = document.querySelectorAll(selector)
      return list.length === 1 && list[0] === element
    } catch (error) {
      return false
    }
  }
  function query(selector) {
    if (!selector || typeof selector !== 'string') return null
    try {
      return document.querySelector(selector)
    } catch (error) {
      return null
    }
  }
  function queryAll(selector) {
    if (!selector || typeof selector !== 'string') return []
    try {
      return Array.prototype.slice.call(document.querySelectorAll(selector))
    } catch (error) {
      return []
    }
  }

  /** A stable, unique CSS selector for one element (max 8 segments). */
  function selectorFor(element) {
    if (!element || element.nodeType !== 1) return ''
    if (element.id) {
      var byId = '#' + cssEscape(element.id)
      if (isUnique(byId, element)) return byId
    }
    var parts = []
    var node = element
    var guardCount = 0
    while (node && node.nodeType === 1 && node !== document.documentElement && guardCount < 8) {
      guardCount += 1
      var part = String(node.tagName || '').toLowerCase()
      if (node.id) {
        part += '#' + cssEscape(node.id)
      } else {
        var classes = []
        var raw = String(node.getAttribute('class') || '').split(/\s+/)
        for (var index = 0; index < raw.length && classes.length < 2; index += 1) {
          var name = raw[index]
          if (name && !/^_?ds-/.test(name) && /^[a-zA-Z][\w-]*$/.test(name)) classes.push(name)
        }
        for (var classIndex = 0; classIndex < classes.length; classIndex += 1) {
          var candidate = part + '.' + classes[classIndex]
          if (isUnique(candidate, node)) { part = candidate; break }
        }
      }
      var parent = node.parentElement
      if (parent) {
        var sameTag = []
        for (var childIndex = 0; childIndex < parent.children.length; childIndex += 1) {
          if (parent.children[childIndex].tagName === node.tagName) sameTag.push(parent.children[childIndex])
        }
        if (sameTag.length > 1) part += ':nth-of-type(' + (sameTag.indexOf(node) + 1) + ')'
      }
      parts.unshift(part)
      var joined = parts.join(' > ')
      if (isUnique(joined, element)) return joined
      node = parent
    }
    return parts.length > 0 ? parts.join(' > ') : ''
  }

  function rectOf(element) {
    var rect = element.getBoundingClientRect()
    return { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) }
  }
  function styleMap(element) {
    var computed = window.getComputedStyle(element)
    function four(name) {
      return [computed[name + 'Top'], computed[name + 'Right'], computed[name + 'Bottom'], computed[name + 'Left']].join(' ')
    }
    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      textAlign: computed.textAlign,
      padding: four('padding'),
      margin: four('margin'),
      borderRadius: computed.borderRadius,
      width: computed.width,
      height: computed.height,
      display: computed.display,
      gap: computed.gap,
      opacity: computed.opacity,
    }
  }
  function infoFor(element) {
    if (!element || element.nodeType !== 1) return null
    var text = String((element.innerText || element.textContent || '')).replace(/\s+/g, ' ').trim().slice(0, 80)
    return {
      selector: selectorFor(element),
      tag: String(element.tagName || '').toLowerCase(),
      id: element.id || '',
      classes: classNamesOf(element).slice(0, 6),
      text: text,
      role: element.getAttribute('role') || '',
      rect: rectOf(element),
      styles: styleMap(element),
      childCount: element.children.length,
      depth: depthOf(element),
    }
  }
  function depthOf(element) {
    var depth = 0
    var node = element
    while (node && node.parentElement) { depth += 1; node = node.parentElement }
    return depth
  }

  /* ------------------------------------------------------------------ v2: */
  /* shared helpers used by the outline, selection, ops and event handlers   */

  function isAttached(element) {
    var node = element
    while (node) {
      if (node === document.documentElement) return true
      node = node.parentNode
    }
    return false
  }
  function nodeIndex(element) {
    var parent = element && element.parentElement
    if (!parent) return -1
    for (var index = 0; index < parent.children.length; index += 1) {
      if (parent.children[index] === element) return index
    }
    return -1
  }
  function classNamesOf(element) {
    return String((element && element.getAttribute && element.getAttribute('class')) || '').split(/\s+/).filter(Boolean)
  }
  function textOf(element, limit) {
    var text = String((element && (element.innerText || element.textContent)) || '').replace(/\s+/g, ' ').trim()
    return text.slice(0, limit || 80)
  }
  function pushHistory(entry) {
    HISTORY.push(entry)
    if (HISTORY.length > 100) HISTORY.shift()
    REDO.length = 0
  }
  /** One single-element style entry (visibility/align/drag/resize). */
  function styleEntryFor(element, styles) {
    if (!element || !styles) return null
    var entries = []
    for (var key in styles) {
      if (!Object.prototype.hasOwnProperty.call(styles, key)) continue
      var prop = camelToKebab(key)
      var value = styles[key]
      var before = element.style.getPropertyValue(prop)
      var beforePriority = element.style.getPropertyPriority(prop)
      var empty = value === '' || value === null || value === undefined
      if (empty) element.style.removeProperty(prop)
      else element.style.setProperty(prop, String(value))
      entries.push({ prop: prop, before: before, beforePriority: beforePriority, after: empty ? '' : String(value) })
    }
    return styleEntry(selectorFor(element), [element], entries)
  }
  function isSelectMode() { return MODE === 'select' }

  /* outline tree ---------------------------------------------------------- */
  var OUTLINE_IGNORE = /^(script|style|link|meta|noscript|template|head|title|br)$/
  function outlineNode(element, depth, budget) {
    if (budget.count >= 400 || depth > 10) return null
    var tag = String(element.tagName || '').toLowerCase()
    if (OUTLINE_IGNORE.test(tag) || isOverlayNode(element)) return null
    var selector = selectorFor(element)
    if (!selector) return null
    budget.count += 1
    var computed = window.getComputedStyle(element)
    var node = {
      id: selector,
      tag: tag,
      selector: selector,
      text: textOf(element, 80),
      classes: classNamesOf(element).slice(0, 6),
      idAttr: element.id || '',
      rect: rectOf(element),
      visible: computed.display !== 'none' && computed.visibility !== 'hidden',
      depth: depth,
      children: [],
    }
    if (depth < 10) {
      for (var index = 0; index < element.children.length; index += 1) {
        if (budget.count >= 400) break
        var child = outlineNode(element.children[index], depth + 1, budget)
        if (child) node.children.push(child)
      }
    }
    return node
  }
  function buildOutline() {
    var budget = { count: 0 }
    var tree = []
    var root = document.body || document.documentElement
    if (root) {
      var rootNode = outlineNode(root, 0, budget)
      if (rootNode) tree.push(rootNode)
    }
    return { tree: tree, count: budget.count }
  }
  function postOutline() {
    var result = buildOutline()
    post({ type: 'outline', tree: result.tree, count: result.count })
  }
  function scheduleOutline() {
    if (OUTLINE_TIMER) return
    OUTLINE_TIMER = window.setTimeout(function () {
      OUTLINE_TIMER = 0
      guard('outline', postOutline)
    }, 150)
  }

  /* selection & geometry -------------------------------------------------- */
  function selectionList() {
    var list = []
    if (SELECTED && isAttached(SELECTED)) list.push(SELECTED)
    for (var index = 0; index < SELECTED_MANY.length; index += 1) {
      var element = SELECTED_MANY[index]
      if (element && element !== SELECTED && isAttached(element)) list.push(element)
    }
    return list
  }
  function selectionInfos() {
    var list = selectionList()
    var infos = []
    for (var index = 0; index < list.length; index += 1) infos.push(infoFor(list[index]))
    return infos
  }
  function parentRectOf(element) {
    var parent = element && element.parentElement
    if (!parent) return null
    var rect = parent.getBoundingClientRect()
    return { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) }
  }
  function postGeometry() {
    if (!SELECTED || !isAttached(SELECTED)) {
      post({ type: 'selection-geometry', rect: null, parentRect: null, handles: false })
      return
    }
    post({ type: 'selection-geometry', rect: rectOf(SELECTED), parentRect: parentRectOf(SELECTED), handles: MODE === 'select' })
  }
  function scheduleGeometry() {
    if (GEOM_TIMER) return
    GEOM_TIMER = window.setTimeout(function () {
      GEOM_TIMER = 0
      guard('geometry', postGeometry)
    }, 50)
  }
  function markChanged(reason) {
    post({ type: 'changed', reason: reason })
    scheduleGeometry()
    scheduleOutline()
  }

  /* ------------------------------------------------------------------ v2: */
  /* overlay decoration: rulers, grid, columns, handles, marquee, guides    */

  function overlayChild(attrs, cssText) {
    var node = document.createElement('div')
    for (var key in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) node.setAttribute(key, String(attrs[key]))
    }
    node.style.cssText = cssText
    ensureOverlay().appendChild(node)
    return node
  }
  function drawRulers() {
    var size = 20
    var scrollX = window.scrollX || 0
    var scrollY = window.scrollY || 0
    var width = window.innerWidth || 1440
    var height = window.innerHeight || 900
    var step = 100
    var horizontal = overlayChild({ 'data-ds-ruler': 'h' }, 'position:fixed;left:0;top:0;width:100%;height:' + size + 'px;background:rgba(27,27,30,.92);color:#cfc9bd;font:10px/20px ui-monospace,monospace;overflow:hidden;')
    var vertical = overlayChild({ 'data-ds-ruler': 'v' }, 'position:fixed;left:0;top:0;width:' + size + 'px;height:100%;background:rgba(27,27,30,.92);color:#cfc9bd;font:10px/20px ui-monospace,monospace;overflow:hidden;')
    overlayChild({ 'data-ds-ruler': 'corner' }, 'position:fixed;left:0;top:0;width:' + size + 'px;height:' + size + 'px;background:#1b1b1e;z-index:1;')
    for (var x = -(scrollX % step) + size; x < width; x += step) {
      var tick = document.createElement('div')
      tick.textContent = String(Math.round(x + scrollX) - size)
      tick.style.cssText = 'position:absolute;left:' + x + 'px;top:0;height:100%;padding-left:3px;border-left:1px solid rgba(207,201,189,.35);white-space:nowrap;'
      horizontal.appendChild(tick)
    }
    for (var y = -(scrollY % step) + size; y < height; y += step) {
      var tickV = document.createElement('div')
      tickV.textContent = String(Math.round(y + scrollY) - size)
      tickV.style.cssText = 'position:absolute;top:' + y + 'px;left:0;width:100%;padding-top:2px;border-top:1px solid rgba(207,201,189,.35);white-space:nowrap;'
      vertical.appendChild(tickV)
    }
  }
  function drawGrid(step) {
    overlayChild({ 'data-ds-grid': String(step) },
      'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;' +
      'background-image:repeating-linear-gradient(0deg,rgba(47,111,104,.10) 0,rgba(47,111,104,.10) 1px,transparent 1px,transparent ' + step + 'px),' +
      'repeating-linear-gradient(90deg,rgba(47,111,104,.10) 0,rgba(47,111,104,.10) 1px,transparent 1px,transparent ' + step + 'px);')
  }
  function drawColumns(count) {
    var layer = overlayChild({ 'data-ds-columns': String(count) }, 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;display:flex;')
    for (var index = 0; index < count; index += 1) {
      var column = document.createElement('div')
      column.setAttribute('data-ds-column', String(index + 1))
      column.style.cssText = 'flex:1 1 0;margin:0 6px;background:rgba(47,111,104,.06);border-left:1px solid rgba(47,111,104,.20);border-right:1px solid rgba(47,111,104,.20);'
      layer.appendChild(column)
    }
  }
  var HANDLE_CURSOR = { nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize', se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize' }
  function drawOneHandle(rect, name) {
    var x = rect.left
    var y = rect.top
    if (name.indexOf('e') !== -1) x = rect.right - 4
    else if (name.indexOf('w') !== -1) x = rect.left - 4
    if (name.indexOf('s') !== -1) y = rect.bottom - 4
    else if (name.indexOf('n') !== -1) y = rect.top - 4
    if (name === 'n' || name === 's') x = rect.left + rect.width / 2 - 4
    if (name === 'e' || name === 'w') y = rect.top + rect.height / 2 - 4
    overlayChild({ 'data-ds-handle': name }, 'position:fixed;left:' + x + 'px;top:' + y + 'px;width:8px;height:8px;background:#fff;border:1px solid ' + ACCENT + ';box-sizing:border-box;pointer-events:auto;cursor:' + (HANDLE_CURSOR[name] || 'default') + ';')
  }
  function drawHandles(element) {
    var rect = element.getBoundingClientRect()
    var names = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
    for (var index = 0; index < names.length; index += 1) drawOneHandle(rect, names[index])
  }
  function drawMarquee(marquee) {
    var left = Math.min(marquee.startX, marquee.x)
    var top = Math.min(marquee.startY, marquee.y)
    var width = Math.abs(marquee.x - marquee.startX)
    var height = Math.abs(marquee.y - marquee.startY)
    overlayChild({ 'data-ds-marquee': '' }, 'position:fixed;left:' + left + 'px;top:' + top + 'px;width:' + width + 'px;height:' + height + 'px;border:1px solid ' + ACCENT + ';background:rgba(180,85,47,.08);pointer-events:none;')
  }
  function drawLine(x, y, vertical) {
    overlayChild({ 'data-ds-guide': vertical ? 'v' : 'h' }, vertical
      ? 'position:fixed;left:' + Math.round(x) + 'px;top:0;width:1px;height:100%;background:' + ACCENT + ';pointer-events:none;'
      : 'position:fixed;left:0;top:' + Math.round(y) + 'px;width:100%;height:1px;background:' + ACCENT + ';pointer-events:none;')
  }
  function drawGuides() {
    if (!DRAG || !DRAG.element) return
    var rect = DRAG.element.getBoundingClientRect()
    var parent = DRAG.element.parentElement
    var parentRect = parent ? parent.getBoundingClientRect() : null
    if (!parentRect) return
    var tolerance = 4
    var xs = [parentRect.left, parentRect.left + parentRect.width / 2, parentRect.right]
    var ys = [parentRect.top, parentRect.top + parentRect.height / 2, parentRect.bottom]
    var edgesX = [rect.left, rect.left + rect.width / 2, rect.right]
    var edgesY = [rect.top, rect.top + rect.height / 2, rect.bottom]
    var index
    var edgeIndex
    for (index = 0; index < xs.length; index += 1) {
      for (edgeIndex = 0; edgeIndex < edgesX.length; edgeIndex += 1) {
        if (Math.abs(edgesX[edgeIndex] - xs[index]) <= tolerance) { drawLine(xs[index], 0, true); break }
      }
    }
    for (index = 0; index < ys.length; index += 1) {
      for (edgeIndex = 0; edgeIndex < edgesY.length; edgeIndex += 1) {
        if (Math.abs(edgesY[edgeIndex] - ys[index]) <= tolerance) { drawLine(0, ys[index], false); break }
      }
    }
  }
  function drawPins() {
    for (var index = 0; index < PINS.length; index += 1) {
      var pin = PINS[index]
      if (!pin.element || !isAttached(pin.element)) continue
      var rect = pin.element.getBoundingClientRect()
      var node = document.createElement('div')
      node.setAttribute('data-ds-pin', String(pin.number))
      node.textContent = String(pin.number)
      node.style.cssText = 'position:fixed;left:' + (rect.left + rect.width - 8) + 'px;top:' + Math.max(0, rect.top - 10) + 'px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:' + ACCENT + ';color:#fff;font:11px/18px ui-monospace,monospace;text-align:center;pointer-events:none;'
      ensureOverlay().appendChild(node)
    }
  }
  function postPinRects() {
    for (var index = 0; index < PINS.length; index += 1) {
      var pin = PINS[index]
      if (!pin.element || !isAttached(pin.element)) continue
      post({ type: 'comment-rect', selector: pin.selector, rect: rectOf(pin.element) })
    }
  }
  function addPin(element) {
    if (!element) return
    PIN_COUNT += 1
    PINS.push({ number: PIN_COUNT, element: element, selector: selectorFor(element) })
    renderOverlay()
    postPinRects()
  }
  function setCommentPins(pins) {
    PINS = []
    PIN_COUNT = 0
    for (var index = 0; index < (pins || []).length; index += 1) {
      var pin = pins[index]
      var element = pin ? query(pin.selector) : null
      if (!element) continue
      PIN_COUNT += 1
      PINS.push({ number: Number(pin.number) || PIN_COUNT, element: element, selector: pin.selector })
    }
    renderOverlay()
    postPinRects()
  }

  /* ------------------------------------------------------------------ v2: */
  /* align-to-parent (transform based, undoable)                            */

  function parseTranslate(value) {
    var match = /translate\(\s*(-?[\d.]+)px(?:\s*,\s*(-?[\d.]+)px)?\s*\)/.exec(String(value || ''))
    if (!match) return { x: 0, y: 0 }
    return { x: parseFloat(match[1]) || 0, y: parseFloat(match[2] === undefined ? '0' : match[2]) || 0 }
  }
  function applyRelativeOffset(element, dx, dy) {
    var computed = window.getComputedStyle(element)
    var styles = {}
    if (computed.position === 'static' && !element.style.getPropertyValue('position')) styles.position = 'relative'
    var left = parseFloat(element.style.getPropertyValue('left') || computed.left)
    var top = parseFloat(element.style.getPropertyValue('top') || computed.top)
    if (!isFinite(left)) left = 0
    if (!isFinite(top)) top = 0
    styles.left = (left + dx) + 'px'
    styles.top = (top + dy) + 'px'
    var entry = styleEntryFor(element, styles)
    if (entry) pushHistory(entry)
    return entry
  }
  function applyTranslate(element, dx, dy) {
    var computed = window.getComputedStyle(element)
    var own = element.style.getPropertyValue('transform')
    if (!own && computed && computed.transform && computed.transform !== 'none') {
      // The design itself transforms this element: never clobber it, offset instead.
      return applyRelativeOffset(element, dx, dy)
    }
    var base = parseTranslate(own)
    var entry = styleEntryFor(element, { transform: 'translate(' + (base.x + dx) + 'px, ' + (base.y + dy) + 'px)' })
    if (entry) pushHistory(entry)
    return entry
  }
  function applyAlign(selector, edge) {
    var element = targetFor(selector)
    if (!element) return
    var parent = element.parentElement
    if (!parent) return
    var rect = element.getBoundingClientRect()
    var parentRect = parent.getBoundingClientRect()
    var dx = 0
    var dy = 0
    if (edge === 'left') dx = parentRect.left - rect.left
    else if (edge === 'center') dx = parentRect.left + parentRect.width / 2 - (rect.left + rect.width / 2)
    else if (edge === 'right') dx = parentRect.right - rect.right
    else if (edge === 'top') dy = parentRect.top - rect.top
    else if (edge === 'middle') dy = parentRect.top + parentRect.height / 2 - (rect.top + rect.height / 2)
    else if (edge === 'bottom') dy = parentRect.bottom - rect.bottom
    if (dx === 0 && dy === 0) return
    applyTranslate(element, dx, dy)
    renderOverlay()
    postState()
    markChanged('align')
  }

  /* ------------------------------------------------------------------ v2: */
  /* drag-move, resize handles and marquee                                  */

  function handleOf(target) {
    try { return target && target.getAttribute ? target.getAttribute('data-ds-handle') || '' : '' } catch (error) { return '' }
  }
  function startDrag(element, event) {
    var computed = window.getComputedStyle(element)
    var left = parseFloat(element.style.getPropertyValue('left') || computed.left)
    var top = parseFloat(element.style.getPropertyValue('top') || computed.top)
    if (!isFinite(left)) left = 0
    if (!isFinite(top)) top = 0
    var baseElement = element
    var node = element
    var duplicate = false
    if (event.altKey) {
      var parent = element.parentNode
      if (parent) {
        var clone = element.cloneNode(true)
        insertNodeAt(parent, clone, nodeIndex(element) + 1)
        node = clone
        duplicate = true
        select(clone)
      }
    }
    DRAG = {
      element: node,
      baseElement: baseElement,
      startX: event.clientX,
      startY: event.clientY,
      baseLeft: left,
      baseTop: top,
      basePosition: element.style.getPropertyValue('position'),
      baseLeftCss: element.style.getPropertyValue('left'),
      baseTopCss: element.style.getPropertyValue('top'),
      parent: node.parentNode || null,
      index: nodeIndex(node),
      duplicate: duplicate,
      moved: false,
      movedX: 0,
      movedY: 0,
    }
    try { node.style.setProperty('will-change', 'left, top') } catch (error) {}
  }
  function moveDrag(event) {
    if (!DRAG) return
    var drag = DRAG
    var dx = event.clientX - drag.startX
    var dy = event.clientY - drag.startY
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 3) return
    if (!drag.moved) {
      drag.moved = true
      try { drag.element.style.setProperty('position', 'relative') } catch (error) {}
    }
    drag.movedX = dx
    drag.movedY = dy
    try {
      drag.element.style.setProperty('left', (drag.baseLeft + dx) + 'px')
      drag.element.style.setProperty('top', (drag.baseTop + dy) + 'px')
    } catch (error) {}
    renderOverlay()
    post({ type: 'drag-state', on: true, dx: dx, dy: dy })
    scheduleGeometry()
  }
  function finishDrag() {
    if (!DRAG) return
    var drag = DRAG
    DRAG = null
    var element = drag.element
    try { element.style.removeProperty('will-change') } catch (error) {}
    if (!drag.moved) return
    if (drag.duplicate) {
      pushHistory(domEntry('duplicate', [{ parent: drag.parent, node: element, index: drag.index }]))
    } else {
      var entries = [
        { prop: 'position', before: drag.basePosition || '', beforePriority: '', after: element.style.getPropertyValue('position') },
        { prop: 'left', before: drag.baseLeftCss || '', beforePriority: '', after: (drag.baseLeft + drag.movedX) + 'px' },
        { prop: 'top', before: drag.baseTopCss || '', beforePriority: '', after: (drag.baseTop + drag.movedY) + 'px' },
      ]
      pushHistory(styleEntry(selectorFor(element), [element], entries))
    }
    post({ type: 'drag-state', on: false, dx: drag.movedX, dy: drag.movedY })
    postState()
    markChanged('drag')
    postSelection()
  }
  function cancelDrag() {
    if (!DRAG) return
    var drag = DRAG
    DRAG = null
    var element = drag.element
    try { element.style.removeProperty('will-change') } catch (error) {}
    if (drag.duplicate) {
      if (element.parentNode) element.parentNode.removeChild(element)
      select(drag.baseElement || null)
    } else {
      try {
        if (drag.basePosition) element.style.setProperty('position', drag.basePosition)
        else element.style.removeProperty('position')
        if (drag.baseLeftCss) element.style.setProperty('left', drag.baseLeftCss)
        else element.style.removeProperty('left')
        if (drag.baseTopCss) element.style.setProperty('top', drag.baseTopCss)
        else element.style.removeProperty('top')
      } catch (error) {}
    }
    post({ type: 'drag-state', on: false, dx: 0, dy: 0 })
    renderOverlay()
    scheduleGeometry()
  }
  function startResize(handle, element, event) {
    var rect = element.getBoundingClientRect()
    RESIZE = {
      handle: handle,
      element: element,
      startX: event.clientX,
      startY: event.clientY,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      basePosition: element.style.getPropertyValue('position'),
      baseLeft: element.style.getPropertyValue('left'),
      baseTop: element.style.getPropertyValue('top'),
      baseWidth: element.style.getPropertyValue('width'),
      baseHeight: element.style.getPropertyValue('height'),
      moved: false,
      applied: null,
    }
    try { element.style.setProperty('will-change', 'width, height') } catch (error) {}
  }
  function moveResize(event) {
    if (!RESIZE) return
    var resize = RESIZE
    var dx = event.clientX - resize.startX
    var dy = event.clientY - resize.startY
    if (!resize.moved && Math.abs(dx) + Math.abs(dy) < 2) return
    resize.moved = true
    var handle = resize.handle
    var start = resize.rect
    var min = 8
    var east = handle.indexOf('e') !== -1
    var west = handle.indexOf('w') !== -1
    var south = handle.indexOf('s') !== -1
    var north = handle.indexOf('n') !== -1
    var corner = handle.length === 2
    var ratio = start.width > 0 ? start.height / start.width : 1
    var width = start.width
    var height = start.height
    if (east) width = start.width + dx
    else if (west) width = start.width - dx
    if (south) height = start.height + dy
    else if (north) height = start.height - dy
    if (corner) {
      if (Math.abs(dx) >= Math.abs(dy) * (ratio || 1)) height = width * ratio
      else width = height / (ratio || 1)
    } else if (event.shiftKey) {
      if (east || west) height = width * ratio
      else if (south || north) width = height / (ratio || 1)
    }
    width = Math.max(min, Math.round(width))
    height = Math.max(min, Math.round(height))
    var styles = { width: width + 'px', height: height + 'px' }
    if (event.altKey) {
      var computed = window.getComputedStyle(resize.element)
      var left = parseFloat(resize.element.style.getPropertyValue('left') || computed.left)
      var top = parseFloat(resize.element.style.getPropertyValue('top') || computed.top)
      if (!isFinite(left)) left = 0
      if (!isFinite(top)) top = 0
      var shiftX = east ? -(width - start.width) / 2 : west ? (width - start.width) / 2 : 0
      var shiftY = south ? -(height - start.height) / 2 : north ? (height - start.height) / 2 : 0
      if (shiftX !== 0 || shiftY !== 0) {
        styles.position = 'relative'
        styles.left = (left + shiftX) + 'px'
        styles.top = (top + shiftY) + 'px'
      }
    }
    resize.applied = styles
    try {
      for (var key in styles) {
        if (Object.prototype.hasOwnProperty.call(styles, key)) resize.element.style.setProperty(camelToKebab(key), String(styles[key]))
      }
    } catch (error) {}
    renderOverlay()
    scheduleGeometry()
  }
  function finishResize() {
    if (!RESIZE) return
    var resize = RESIZE
    RESIZE = null
    try { resize.element.style.removeProperty('will-change') } catch (error) {}
    if (!resize.moved) return
    var after = resize.applied || {}
    var entries = []
    function add(prop, beforeValue, afterValue) {
      if (!beforeValue && !afterValue) return
      entries.push({ prop: prop, before: beforeValue || '', beforePriority: '', after: afterValue || '' })
    }
    add('width', resize.baseWidth, after.width)
    add('height', resize.baseHeight, after.height)
    add('position', resize.basePosition, after.position)
    add('left', resize.baseLeft, after.left)
    add('top', resize.baseTop, after.top)
    if (entries.length === 0) return
    pushHistory(styleEntry(selectorFor(resize.element), [resize.element], entries))
    postState()
    markChanged('resize')
    postSelection()
  }
  function cancelResize() {
    if (!RESIZE) return
    var resize = RESIZE
    RESIZE = null
    try { resize.element.style.removeProperty('will-change') } catch (error) {}
    if (resize.moved) {
      try {
        function restore(prop, value) {
          if (value) resize.element.style.setProperty(prop, value)
          else resize.element.style.removeProperty(prop)
        }
        restore('width', resize.baseWidth)
        restore('height', resize.baseHeight)
        restore('position', resize.basePosition)
        restore('left', resize.baseLeft)
        restore('top', resize.baseTop)
      } catch (error) {}
    }
    renderOverlay()
    scheduleGeometry()
  }
  function startMarquee(event) {
    MARQUEE = { startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false }
  }
  function moveMarquee(event) {
    if (!MARQUEE) return
    var marquee = MARQUEE
    var dx = event.clientX - marquee.startX
    var dy = event.clientY - marquee.startY
    if (!marquee.moved && Math.abs(dx) + Math.abs(dy) < 8) return
    marquee.moved = true
    marquee.x = event.clientX
    marquee.y = event.clientY
    renderOverlay()
  }
  function marqueeCandidates(marquee) {
    var rect = {
      left: Math.min(marquee.startX, marquee.x),
      top: Math.min(marquee.startY, marquee.y),
      right: Math.max(marquee.startX, marquee.x),
      bottom: Math.max(marquee.startY, marquee.y),
    }
    var hit = function (box) { return box.left < rect.right && box.right > rect.left && box.top < rect.bottom && box.bottom > rect.top }
    var out = []
    var root = document.body
    if (!root) return out
    var stack = [root]
    while (stack.length > 0 && out.length < 50) {
      var element = stack.shift()
      for (var index = 0; index < element.children.length; index += 1) {
        var child = element.children[index]
        if (isOverlayNode(child) || OUTLINE_IGNORE.test(String(child.tagName || '').toLowerCase())) continue
        var box = child.getBoundingClientRect()
        var computed = window.getComputedStyle(child)
        if (computed.display === 'none' || computed.visibility === 'hidden') continue
        if (box.width > 0 && box.height > 0 && hit(box)) {
          out.push(child)
          if (out.length >= 50) break
        } else {
          stack.push(child)
        }
      }
    }
    return out
  }
  function finishMarquee() {
    if (!MARQUEE) return
    var marquee = MARQUEE
    MARQUEE = null
    if (!marquee.moved) {
      renderOverlay()
      return
    }
    SUPPRESS_CLICK = true
    var candidates = marqueeCandidates(marquee)
    if (candidates.length > 0) selectMany(candidates)
    else select(null)
    renderOverlay()
  }
  function cancelMarquee() {
    MARQUEE = null
    renderOverlay()
  }
  function onMouseDown(event) {
    if (MODE === 'off' || MODE === 'comment') return
    var target = event.target
    if (!target || target.nodeType !== 1) return
    var handle = handleOf(target)
    if (handle && SELECTED) {
      event.preventDefault()
      if (event.stopPropagation) event.stopPropagation()
      startResize(handle, SELECTED, event)
      return
    }
    if (isOverlayNode(target)) return
    if (target === document.body || target === document.documentElement) {
      startMarquee(event)
      return
    }
    if (!isSelected(target)) select(target)
    var element = isSelected(target) ? target : SELECTED
    if (!element) return
    event.preventDefault()
    if (event.stopPropagation) event.stopPropagation()
    startDrag(element, event)
  }
  function onDragMove(event) {
    if (DRAG) { moveDrag(event); return }
    if (RESIZE) { moveResize(event); return }
    if (MARQUEE) { moveMarquee(event); return }
  }
  function onMouseUp() {
    if (DRAG) { finishDrag(); return }
    if (RESIZE) { finishResize(); return }
    if (MARQUEE) { finishMarquee(); }
  }
  function onViewportChangeNow() {
    renderOverlay()
    scheduleGeometry()
    postPinRects()
  }
  function scheduleViewport() {
    if (VIEW_TIMER) return
    VIEW_TIMER = window.setTimeout(function () {
      VIEW_TIMER = 0
      guard('viewport', onViewportChangeNow)
    }, 50)
  }

  function ensureOverlay() {
    if (OVERLAY && OVERLAY.parentNode) return OVERLAY
    OVERLAY = document.createElement('div')
    OVERLAY.setAttribute('data-ds-overlay', '')
    OVERLAY.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:2147483000;overflow:hidden;'
    document.documentElement.appendChild(OVERLAY)
    return OVERLAY
  }
  function drawBox(element, colour, dashed) {
    if (!element) return
    var rect = element.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return
    var box = document.createElement('div')
    box.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;' +
      'border:2px ' + (dashed ? 'dashed' : 'solid') + ' ' + colour + ';box-sizing:border-box;pointer-events:none;'
    var label = document.createElement('div')
    label.textContent = String(element.tagName || '').toLowerCase() + (element.id ? '#' + element.id : '')
    label.style.cssText = 'position:absolute;left:-2px;top:-21px;background:' + colour + ';color:#fff;' +
      'font:11px/17px ui-monospace,Consolas,monospace;padding:1px 6px;white-space:nowrap;'
    box.appendChild(label)
    ensureOverlay().appendChild(box)
  }
  function clearOverlay() {
    if (OVERLAY) OVERLAY.innerHTML = ''
  }
  function renderOverlay() {
    if (MODE === 'off') { clearOverlay(); return }
    clearOverlay()
    if (OVERLAY_OPTS.rulers) drawRulers()
    if (OVERLAY_OPTS.grid > 0) drawGrid(OVERLAY_OPTS.grid)
    if (OVERLAY_OPTS.columns > 0) drawColumns(OVERLAY_OPTS.columns)
    if (HOVER && HOVER !== SELECTED && HOVER.nodeType === 1 && isAttached(HOVER)) drawBox(HOVER, MUTED, true)
    var list = selectionList()
    for (var index = 0; index < list.length; index += 1) drawBox(list[index], index === 0 ? ACCENT : MUTED, index !== 0)
    if (MODE === 'select' && SELECTED && isAttached(SELECTED)) drawHandles(SELECTED)
    if (MODE === 'comment') drawPins()
    if (MODE === 'select' && DRAG && OVERLAY_OPTS.guides) drawGuides()
    if (MARQUEE && MARQUEE.moved) drawMarquee(MARQUEE)
  }

  function setMode(mode) {
    MODE = mode === 'select' || mode === 'comment' ? mode : 'off'
    HOVER = null
    if (MODE === 'off') {
      SELECTED = null
      SELECTED_MANY = []
      DRAG = null
      RESIZE = null
      MARQUEE = null
      clearOverlay()
    }
    try { document.documentElement.style.cursor = MODE === 'off' ? '' : 'crosshair' } catch (error) {}
    renderOverlay()
    post({ type: 'mode', mode: MODE })
    scheduleGeometry()
  }
  function postSelection() {
    post({ type: 'selected', info: SELECTED && isAttached(SELECTED) ? infoFor(SELECTED) : null })
    post({ type: 'selected-many', infos: selectionInfos() })
    renderOverlay()
    scheduleGeometry()
  }
  function select(element) {
    SELECTED = element && element.nodeType === 1 && !isOverlayNode(element) ? element : null
    SELECTED_MANY = []
    postSelection()
  }
  function selectMany(elements) {
    var list = []
    for (var index = 0; index < (elements || []).length; index += 1) {
      var element = elements[index]
      if (!element || element.nodeType !== 1 || isOverlayNode(element) || list.indexOf(element) !== -1) continue
      list.push(element)
    }
    SELECTED = list.length > 0 ? list[0] : null
    SELECTED_MANY = list.slice(1)
    postSelection()
  }
  function toggleSelection(element) {
    if (!element || element.nodeType !== 1 || isOverlayNode(element)) return
    var list = selectionList()
    var index = list.indexOf(element)
    if (index === -1) list.push(element)
    else list.splice(index, 1)
    selectMany(list)
  }
  function isSelected(element) {
    return element === SELECTED || SELECTED_MANY.indexOf(element) !== -1
  }
  function clearSelection() { select(null) }

  function isOverlayNode(target) {
    try { return !!(target && target.closest && target.closest('[data-ds-overlay]')) } catch (error) { return false }
  }
  function onMove(event) {
    if (MODE === 'off') return
    if (DRAG || RESIZE || MARQUEE) return
    var target = event.target
    if (!target || target.nodeType !== 1 || isOverlayNode(target)) return
    if (target === HOVER) return
    HOVER = target
    renderOverlay()
    post({ type: 'hover', info: infoFor(target) })
  }
  function onClick(event) {
    if (MODE === 'off') return
    if (SUPPRESS_CLICK) {
      SUPPRESS_CLICK = false
      event.preventDefault()
      event.stopPropagation()
      return
    }
    var target = event.target
    if (!target || target.nodeType !== 1 || isOverlayNode(target)) return
    event.preventDefault()
    event.stopPropagation()
    if (MODE === 'comment') {
      addPin(target)
      post({ type: 'comment-request', info: infoFor(target), rect: rectOf(target) })
      return
    }
    if (event.shiftKey) {
      toggleSelection(target)
      return
    }
    select(target)
  }
  function onDoubleClick(event) {
    if (MODE !== 'select') return
    var target = event.target
    if (!target || target.nodeType !== 1) return
    event.preventDefault()
    beginTextEdit(target)
  }
  function onKeyDown(event) {
    if (MODE === 'off') return
    if (event.key === 'Escape') {
      event.preventDefault()
      if (DRAG) { cancelDrag(); return }
      if (RESIZE) { cancelResize(); return }
      if (MARQUEE) { cancelMarquee(); return }
      select(null)
      return
    }
    if (EDIT) return
    if (!SELECTED || MODE !== 'select') return
    var step = event.shiftKey ? 10 : 1
    if (event.key === 'ArrowUp') { event.preventDefault(); nudge(0, -step) }
    else if (event.key === 'ArrowDown') { event.preventDefault(); nudge(0, step) }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); nudge(-step, 0) }
    else if (event.key === 'ArrowRight') { event.preventDefault(); nudge(step, 0) }
    else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      if (isSelectMode()) opDelete(SELECTED)
    }
  }

  function styleEntry(selector, list, entries) {
    return { kind: 'style', selector: selector, elements: list, entries: entries }
  }
  function camelToKebab(name) {
    if (name.indexOf('-') !== -1) return name
    return name.replace(/[A-Z]/g, function (letter) { return '-' + letter.toLowerCase() })
  }
  function applyStyles(selector, styles) {
    if (!styles || typeof styles !== 'object') return 0
    var list = queryAll(selector)
    if (list.length === 0) return 0
    var entries = []
    for (var index = 0; index < list.length; index += 1) {
      var element = list[index]
      for (var key in styles) {
        if (!Object.prototype.hasOwnProperty.call(styles, key)) continue
        var prop = camelToKebab(key)
        var value = styles[key]
        var before = element.style.getPropertyValue(prop)
        var beforePriority = element.style.getPropertyPriority(prop)
        if (value === '' || value === null || value === undefined) element.style.removeProperty(prop)
        else element.style.setProperty(prop, String(value))
        entries.push({ prop: prop, before: before, beforePriority: beforePriority, after: String(value === '' || value === null || value === undefined ? '' : value) })
      }
    }
    HISTORY.push(styleEntry(selector, list, entries))
    if (HISTORY.length > 100) HISTORY.shift()
    REDO.length = 0
    renderOverlay()
    postState()
    markChanged('style')
    return list.length
  }
  function nudge(dx, dy) {
    if (!SELECTED) return
    var computed = window.getComputedStyle(SELECTED)
    var positionBefore = SELECTED.style.position
    if (computed.position === 'static') SELECTED.style.position = 'relative'
    var left = parseFloat(SELECTED.style.left || computed.left)
    var top = parseFloat(SELECTED.style.top || computed.top)
    if (!isFinite(left)) left = 0
    if (!isFinite(top)) top = 0
    var entries = [
      { prop: 'position', before: positionBefore, beforePriority: '', after: SELECTED.style.position },
      { prop: 'left', before: String(left) + 'px', beforePriority: '', after: String(left + dx) + 'px' },
      { prop: 'top', before: String(top) + 'px', beforePriority: '', after: String(top + dy) + 'px' },
    ]
    SELECTED.style.left = String(left + dx) + 'px'
    SELECTED.style.top = String(top + dy) + 'px'
    HISTORY.push(styleEntry(selectorFor(SELECTED), [SELECTED], entries))
    if (HISTORY.length > 100) HISTORY.shift()
    REDO.length = 0
    renderOverlay()
    postState()
  }

  function beginTextEdit(element) {
    if (!element || element.children.length > 0 || isOverlayNode(element)) return
    if (/^(input|textarea|select|img|svg|video|canvas|iframe)$/i.test(String(element.tagName))) return
    EDIT = { element: element, before: element.innerHTML, selector: selectorFor(element) }
    element.setAttribute('contenteditable', 'true')
    try { element.focus() } catch (error) {}
    element.addEventListener('blur', commitText)
    element.addEventListener('keydown', textKey)
    post({ type: 'editable-state', selector: EDIT.selector, editing: true })
  }
  function textKey(event) {
    if (!EDIT) return
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); EDIT.element.blur() }
    else if (event.key === 'Escape') {
      event.preventDefault()
      EDIT.element.innerHTML = EDIT.before
      finishText()
    }
  }
  function commitText() {
    if (!EDIT) return
    var element = EDIT.element
    var after = element.innerHTML
    if (after !== EDIT.before) {
      HISTORY.push({ kind: 'text', selector: EDIT.selector, before: EDIT.before, after: after })
      if (HISTORY.length > 100) HISTORY.shift()
      REDO.length = 0
      post({ type: 'text-edited', selector: EDIT.selector, text: String((element.innerText || element.textContent || '')).replace(/\s+/g, ' ').trim().slice(0, 200) })
      postState()
      markChanged('text')
    }
    finishText()
  }
  function finishText() {
    if (!EDIT) return
    var selector = EDIT.selector
    try {
      EDIT.element.removeAttribute('contenteditable')
      EDIT.element.removeEventListener('blur', commitText)
      EDIT.element.removeEventListener('keydown', textKey)
    } catch (error) {}
    EDIT = null
    post({ type: 'editable-state', selector: selector, editing: false })
  }

  /* ------------------------------------------------------------------ v2: */
  /* element operations, visibility and history replay                       */

  function domEntry(action, rows) {
    return { kind: 'dom', action: action, rows: rows }
  }
  function targetFor(selector) {
    var element = selector ? query(selector) : SELECTED
    return element && element.nodeType === 1 && !isOverlayNode(element) ? element : null
  }
  function insertNodeAt(parent, node, index) {
    if (!parent || !node) return
    if (node.parentNode) {
      try { node.parentNode.removeChild(node) } catch (error) {}
    }
    var reference = parent.children[index] || null
    parent.insertBefore(node, reference)
  }
  function opDuplicate(element) {
    var parent = element.parentNode
    if (!parent) return
    var index = nodeIndex(element) + 1
    var clone = element.cloneNode(true)
    insertNodeAt(parent, clone, index)
    pushHistory(domEntry('duplicate', [{ parent: parent, node: clone, index: index }]))
    select(clone)
    markChanged('op')
  }
  function opDelete(element) {
    var parent = element.parentNode
    var index = nodeIndex(element)
    if (!parent || index < 0 || parent === document.documentElement) return
    parent.removeChild(element)
    pushHistory(domEntry('delete', [{ parent: parent, node: element, index: index }]))
    select(null)
    markChanged('op')
  }
  function moveSibling(element, direction) {
    var parent = element.parentNode
    var index = nodeIndex(element)
    if (!parent || index < 0) return
    var target = index + direction
    if (target < 0 || target >= parent.children.length) return
    parent.removeChild(element)
    var reference = parent.children[direction < 0 ? index - 1 : index + 1] || null
    parent.insertBefore(element, reference)
    pushHistory(domEntry('move', [{ node: element, from: { parent: parent, index: index }, to: { parent: parent, index: target } }]))
    select(element)
    markChanged('op')
  }
  function opParent(element) {
    var parent = element.parentElement
    if (!parent || parent === document.documentElement) return
    select(parent)
  }
  function opFirst(element) {
    for (var index = 0; index < element.children.length; index += 1) {
      if (!isOverlayNode(element.children[index])) {
        select(element.children[index])
        return
      }
    }
  }
  function opEditable(element) {
    if (!element) return
    select(element)
    beginTextEdit(element)
  }
  function applyOp(op, selector) {
    var element = targetFor(selector)
    if (!element) return
    if (op === 'duplicate') opDuplicate(element)
    else if (op === 'delete') opDelete(element)
    else if (op === 'up') moveSibling(element, -1)
    else if (op === 'down') moveSibling(element, 1)
    else if (op === 'parent') opParent(element)
    else if (op === 'first') opFirst(element)
    else if (op === 'editable') opEditable(element)
  }
  function applyVisibility(selector, visible) {
    var element = targetFor(selector)
    if (!element) return
    var entry = styleEntryFor(element, { display: visible === false ? 'none' : '' })
    if (entry) pushHistory(entry)
    renderOverlay()
    postState()
    markChanged('visibility')
    if (isSelected(element)) postSelection()
  }

  function parentOfRow(row) {
    return (row && row.parent) || (row && row.node && row.node.parentNode) || null
  }
  function applyDomRow(row, action, direction) {
    var node = row && row.node
    if (!node) return
    if (action === 'duplicate') {
      if (direction === 'undo') {
        if (node.parentNode) node.parentNode.removeChild(node)
      } else {
        var duplicateParent = parentOfRow(row)
        if (duplicateParent) insertNodeAt(duplicateParent, node, row.index)
      }
      return
    }
    if (action === 'delete') {
      if (direction === 'undo') {
        var deleteParent = parentOfRow(row)
        if (deleteParent) insertNodeAt(deleteParent, node, row.index)
      } else if (node.parentNode) {
        node.parentNode.removeChild(node)
      }
      return
    }
    if (action === 'move') {
      var target = direction === 'undo' ? row.from : row.to
      if (target && target.parent) insertNodeAt(target.parent, node, target.index)
    }
  }
  function restoreEntry(entry, direction) {
    if (!entry) return
    if (entry.kind === 'text') {
      var textTarget = query(entry.selector)
      if (textTarget) textTarget.innerHTML = direction === 'undo' ? entry.before : entry.after
      return
    }
    if (entry.kind === 'dom') {
      for (var rowIndex = (entry.rows || []).length - 1; rowIndex >= 0; rowIndex -= 1) {
        applyDomRow(entry.rows[rowIndex], entry.action, direction)
      }
      return
    }
    var elements = queryAll(entry.selector)
    if (elements.length === 0) elements = entry.elements || []
    for (var index = 0; index < elements.length; index += 1) {
      for (var entryIndex = 0; entryIndex < entry.entries.length; entryIndex += 1) {
        var item = entry.entries[entryIndex]
        var value = direction === 'undo' ? item.before : item.after
        if (value) elements[index].style.setProperty(item.prop, value, direction === 'undo' ? item.beforePriority || '' : '')
        else elements[index].style.removeProperty(item.prop)
      }
    }
  }
  function afterHistory() {
    if (SELECTED && !isAttached(SELECTED)) {
      SELECTED = null
      SELECTED_MANY = []
    }
    postState()
    markChanged('op')
    postSelection()
  }
  function undo() {
    var entry = HISTORY.pop()
    if (!entry) return
    restoreEntry(entry, 'undo')
    REDO.push(entry)
    afterHistory()
  }
  function redo() {
    var entry = REDO.pop()
    if (!entry) return
    restoreEntry(entry, 'redo')
    HISTORY.push(entry)
    afterHistory()
  }
  function postState() {
    post({ type: 'saved-state', dirty: HISTORY.length > 0, edits: HISTORY.length, undo: HISTORY.length, redo: REDO.length })
  }

  /** Serialise the live DOM without the bridge, overlay or editing attributes. */
  function serialize() {
    var clone = document.documentElement.cloneNode(true)
    var bridges = clone.querySelectorAll('script[' + 'data-ds-bridge]')
    for (var bridgeIndex = 0; bridgeIndex < bridges.length; bridgeIndex += 1) {
      if (bridges[bridgeIndex].parentNode) bridges[bridgeIndex].parentNode.removeChild(bridges[bridgeIndex])
    }
    var overlay = clone.querySelector('[data-ds-overlay]')
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay)
    var editables = clone.querySelectorAll('[contenteditable]')
    for (var editIndex = 0; editIndex < editables.length; editIndex += 1) editables[editIndex].removeAttribute('contenteditable')
    // Temporary performance hints from drag/resize must never reach the saved file.
    var styleNodes = clone.querySelectorAll('[style]')
    for (var styleIndex = 0; styleIndex < styleNodes.length; styleIndex += 1) {
      try {
        var styleValue = String(styleNodes[styleIndex].getAttribute('style') || '')
        if (/will-change/i.test(styleValue)) styleNodes[styleIndex].style.removeProperty('will-change')
      } catch (error) {}
    }
    // Stray bridge bookkeeping attributes never reach the saved file.
    var marked = clone.querySelectorAll('[data-ds-marquee],[data-ds-guide],[data-ds-handle],[data-ds-pin],[data-ds-ruler],[data-ds-grid],[data-ds-columns]')
    for (var markedIndex = 0; markedIndex < marked.length; markedIndex += 1) {
      if (marked[markedIndex].parentNode) marked[markedIndex].parentNode.removeChild(marked[markedIndex])
    }
    var html = '<!DOCTYPE html>\n' + clone.outerHTML
    post({ type: 'dom', html: html, bytes: html.length })
  }

  function readTweaks() {
    try {
      var match = /\/\*EDITMODE-BEGIN\*\/([\s\S]*?)\/\*EDITMODE-END\*\//.exec(document.documentElement.innerHTML)
      if (!match) return null
      return JSON.parse(match[1])
    } catch (error) {
      return null
    }
  }
  var TWEAK_SUFFIX = { fontSize: 'px', radius: 'px' }
  var TWEAK_VAR = {
    primaryColor: '--primary', accentColor: '--accent', seaColor: '--sea', signalColor: '--signal',
    vermilion: '--vermilion', fontSize: '--font-size', radius: '--radius', density: '--density', displayScale: '--scale',
  }
  function applyTweaks(values) {
    if (!values || typeof values !== 'object') return
    var root = document.documentElement
    for (var key in values) {
      if (!Object.prototype.hasOwnProperty.call(values, key)) continue
      var value = values[key]
      if (typeof value === 'boolean') {
        if (key === 'dark') { try { document.body.classList.toggle('dark', value) } catch (error) {} }
        continue
      }
      var cssVar = TWEAK_VAR[key]
      if (cssVar) {
        var suffix = TWEAK_SUFFIX[key] || ''
        root.style.setProperty(cssVar, String(value) + suffix)
      }
    }
    if (typeof window.__dsApplyTweaks === 'function') {
      try { window.__dsApplyTweaks(values) } catch (error) { fail('tweaks', error) }
    }
    post({ type: 'tweaks', values: values })
  }
  function dispatchEditMode(on) {
    var event
    try {
      event = new MessageEvent('message', {
        data: { type: on ? '__activate_edit_mode' : '__deactivate_edit_mode' },
        source: window.parent,
        origin: window.location.origin,
      })
    } catch (error) {
      return
    }
    try { window.dispatchEvent(event) } catch (error) {}
  }

  function screens() {
    var nodes = document.querySelectorAll('[data-screen-label], .screen')
    var list = []
    for (var index = 0; index < nodes.length && index < 60; index += 1) {
      var label = nodes[index].getAttribute('data-screen-label') || nodes[index].getAttribute('data-label') || String(index + 1)
      list.push({ label: label, index: index + 1 })
    }
    return list
  }
  function announce() {
    var tweaks = readTweaks()
    post({
      type: 'ready',
      variant: CONFIG.variant,
      screens: screens(),
      tweaksAvailable: !!tweaks,
      tweaks: tweaks || null,
      url: window.location.href,
    })
  }
  /** The panel may attach its listener after the iframe loads: retry the handshake. */
  function announceWithRetry() {
    if (ANNOUNCE_TRIES >= 8) return
    ANNOUNCE_TRIES += 1
    announce()
    ANNOUNCE_TIMER = window.setTimeout(announceWithRetry, 400)
  }

  function queryAllSelectors(selectors) {
    var list = []
    for (var index = 0; index < (selectors || []).length; index += 1) {
      var element = query(selectors[index])
      if (element) list.push(element)
    }
    return list
  }
  function zoomTo(selector) {
    var node = query(selector)
    if (!node) return
    select(node)
    try { node.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' }) } catch (error) {
      try { node.scrollIntoView() } catch (inner) {}
    }
  }
  function setOverlayOptions(data) {
    if (!data || typeof data !== 'object') return
    if (Object.prototype.hasOwnProperty.call(data, 'rulers')) OVERLAY_OPTS.rulers = data.rulers === true
    if (Object.prototype.hasOwnProperty.call(data, 'grid')) OVERLAY_OPTS.grid = Number(data.grid) > 0 ? Math.round(Number(data.grid)) : 0
    if (Object.prototype.hasOwnProperty.call(data, 'columns')) OVERLAY_OPTS.columns = Number(data.columns) > 0 ? Math.round(Number(data.columns)) : 0
    if (Object.prototype.hasOwnProperty.call(data, 'guides')) OVERLAY_OPTS.guides = data.guides === true
    renderOverlay()
  }

  document.addEventListener('mousedown', onMouseDown, true)
  document.addEventListener('mousemove', onDragMove, true)
  document.addEventListener('mouseup', onMouseUp, true)
  document.addEventListener('mousemove', onMove, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('dblclick', onDoubleClick, true)
  document.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('scroll', scheduleViewport, true)
  window.addEventListener('resize', scheduleViewport)
  window.addEventListener('message', function (event) {
    if (!event.data || event.source !== window.parent) return
    var data = event.data
    if (data.source !== 'ds-panel') return
    // The panel answered: stop retrying the handshake.
    ANNOUNCE_TRIES = 99
    if (ANNOUNCE_TIMER) { try { window.clearTimeout(ANNOUNCE_TIMER) } catch (error) {} }
    guard('message:' + String(data.type), function () {
      if (data.type === 'mode') setMode(data.mode)
      else if (data.type === 'select') select(query(data.selector))
      else if (data.type === 'select-many') selectMany(queryAllSelectors(data.selectors))
      else if (data.type === 'hover') {
        HOVER = query(data.selector)
        renderOverlay()
      } else if (data.type === 'outline') postOutline()
      else if (data.type === 'op') applyOp(data.op, data.selector)
      else if (data.type === 'visibility') applyVisibility(data.selector, data.visible)
      else if (data.type === 'overlay') setOverlayOptions(data)
      else if (data.type === 'align') applyAlign(data.selector, data.edge)
      else if (data.type === 'zoom-to') zoomTo(data.selector)
      else if (data.type === 'comment-pins') setCommentPins(data.pins)
      else if (data.type === 'patch' || data.type === 'style') applyStyles(data.selector, data.styles || {})
      else if (data.type === 'patch-many') {
        var edits = data.edits || []
        for (var index = 0; index < edits.length; index += 1) applyStyles(edits[index].selector, edits[index].styles || {})
      } else if (data.type === 'undo') undo()
      else if (data.type === 'redo') redo()
      else if (data.type === 'serialize') serialize()
      else if (data.type === 'tweak') applyTweaks(data.values)
      else if (data.type === 'edit-mode') dispatchEditMode(!!data.on)
      else if (data.type === 'scroll-to') zoomTo(data.selector)
      else if (data.type === 'reload') window.location.reload()
    })
  })

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', announceWithRetry)
  else announceWithRetry()
  window.addEventListener('load', function () { setTimeout(announce, 60) })
})();`

/**
 * Minimal build-time minifier for the injected engine: drops comments and
 * indentation, then removes every space that is not needed between two tokens.
 * It is string- and regex-literal aware (the only place where spaces can be
 * meaningful), so the engine keeps working exactly as written above while the
 * inline payload stays inside the size budget.
 * @param {string} source
 */
function minifyBridge(source) {
  const src = String(source)
  const tokens = []
  const isWordChar = (ch) => /[A-Za-z0-9_$]/u.test(ch)
  let index = 0
  let previous = ''
  let newline = false
  while (index < src.length) {
    const ch = src[index]
    if (/\s/u.test(ch)) {
      if (ch === '\n') newline = true
      index += 1
      continue
    }
    if (ch === '/' && src[index + 1] === '/') {
      while (index < src.length && src[index] !== '\n') index += 1
      continue
    }
    if (ch === '/' && src[index + 1] === '*') {
      index += 2
      while (index < src.length && !(src[index] === '*' && src[index + 1] === '/')) {
        if (src[index] === '\n') newline = true
        index += 1
      }
      index += 2
      continue
    }
    if (ch === '"' || ch === "'") {
      let j = index + 1
      let value = ch
      while (j < src.length) {
        const current = src[j]
        value += current
        if (current === '\\') {
          value += src[j + 1] ?? ''
          j += 2
          continue
        }
        j += 1
        if (current === ch) break
      }
      tokens.push({ kind: 'string', value, newline })
      previous = 'string'
      newline = false
      index = j
      continue
    }
    if (ch === '/' && (previous === '' || '([{,:;=!&|?+-*%^~<>'.includes(previous) || ['return', 'typeof', 'case', 'in', 'of', 'new'].includes(previous))) {
      let j = index + 1
      let value = '/'
      let inClass = false
      while (j < src.length) {
        const current = src[j]
        if (current === '\\') {
          value += current + (src[j + 1] ?? '')
          j += 2
          continue
        }
        if (current === '[') inClass = true
        else if (current === ']') inClass = false
        else if (current === '/' && !inClass) {
          value += current
          j += 1
          break
        }
        value += current
        j += 1
      }
      while (j < src.length && /[a-z]/u.test(src[j])) {
        value += src[j]
        j += 1
      }
      tokens.push({ kind: 'regex', value, newline })
      previous = 'regex'
      newline = false
      index = j
      continue
    }
    if (isWordChar(ch)) {
      let j = index
      while (j < src.length && isWordChar(src[j])) j += 1
      const value = src.slice(index, j)
      tokens.push({ kind: 'word', value, newline })
      previous = value
      newline = false
      index = j
      continue
    }
    const three = src.slice(index, index + 3)
    const two = src.slice(index, index + 2)
    if (['===', '!==', '>>>', '<<='].includes(three)) {
      tokens.push({ kind: 'op', value: three, newline })
      previous = three
      newline = false
      index += 3
      continue
    }
    if (['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '<<', '>>', '=>', '?.'].includes(two)) {
      tokens.push({ kind: 'op', value: two, newline })
      previous = two
      newline = false
      index += 2
      continue
    }
    tokens.push({ kind: 'op', value: ch, newline })
    previous = ch
    newline = false
    index += 1
  }
  const ENDS_VALUE_OPS = new Set([']', ')', '}', ';'])
  let output = ''
  let last = null
  for (const token of tokens) {
    if (last) {
      const lastEndsValue =
        last.kind === 'word' ||
        last.kind === 'string' ||
        last.kind === 'regex' ||
        (last.kind === 'op' && ENDS_VALUE_OPS.has(last.value))
      const tokenStartsWord = token.kind === 'word' || token.kind === 'string' || token.kind === 'regex'
      if (token.newline && lastEndsValue && tokenStartsWord) {
        // The source relied on automatic semicolon insertion at this line break.
        output += '\n'
      } else if (last.kind === 'word' && tokenStartsWord) {
        output += ' '
      }
    }
    output += token.value
    last = token
  }
  return output
}

/**
 * Build the bridge script with one embedded config object.
 * @param {{projectId?: string, variant?: string, origin?: string}} input
 */
export function bridgeScript(input = {}) {
  const config = {
    projectId: typeof input.projectId === 'string' ? input.projectId.slice(0, 120) : '',
    variant: typeof input.variant === 'string' ? input.variant.slice(0, 80) : '',
    origin: typeof input.origin === 'string' ? input.origin.slice(0, 200) : '',
  }
  const json = JSON.stringify(config)
    .replace(/</gu, '\\u003c')
    .replace(/>/gu, '\\u003e')
    .replace(/\u2028/gu, '\\u2028')
    .replace(/\u2029/gu, '\\u2029')
  return minifyBridge(BRIDGE_TEMPLATE).replace('__DS_CONFIG__', json)
}

/** Byte length of the injected script at build time. */
export function bridgeBytes() {
  return Buffer.byteLength(bridgeScript({}), 'utf8')
}

/**
 * Inject the canvas bridge into one HTML document.
 * Idempotent: a document that already carries the marker is returned unchanged.
 * @param {string} html
 * @param {{projectId?: string, variant?: string, origin?: string}} options
 */
export function injectBridge(html, options = {}) {
  if (typeof html !== 'string' || html.trim().length === 0) return html
  if (html.indexOf(BRIDGE_MARKER) !== -1) return html
  const script = bridgeScript(options)
  const tag = '<script ' + BRIDGE_MARKER + '>' + script + '</' + 'script>'
  const closing = /<\/body\s*>/iu.exec(html)
  if (closing && closing.index >= 0) {
    return html.slice(0, closing.index) + tag + html.slice(closing.index)
  }
  return html + tag
}
