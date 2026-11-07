/**
 * 02-canvas - the real-HTML canvas: CONTRACT §5 bridge plus the v2 message set
 * (outline / selection-geometry / drag-state / changed / op / align / overlay),
 * zoom + pan + device frames, comment pins, floating selection toolbar and the
 * multi-variant artboard view. Falls back to v1 behaviour when the bridge only
 * speaks the original protocol.
 */

    const V2_MESSAGE_TYPES = ["outline", "selected-many", "selection-geometry", "drag-state", "changed", "editable-state", "comment-rect"]
    const BRIDGE_V2_PROBE_MS = 1800

    /* §5 handshake + v2 plumbing. The bridge speaks {source:"ds-canvas"}; we answer   */
    /* {source:"ds-panel"} to our own origin, never "*". Raw __edit_mode_* messages   */
    /* from a design page go straight to window.parent and bypass the injected bridge. */
    function useEditorBridge(iframeRef, variant, onEvent, t) {
      const [state, setState] = useState({ status: "loading", screens: [], tweaksAvailable: false, supportsV2: null })
      const [reloadKey, setReloadKey] = useState(0)
      const readyRef = useRef(false)
      const v2Ref = useRef(false)
      const pendingRef = useRef(null)
      const eventRef = useRef(onEvent)
      const tRef = useRef(t)
      eventRef.current = onEvent
      tRef.current = t

      const send = useCallback(
        (message) => {
          const frame = iframeRef.current
          if (!frame || !frame.contentWindow) return false
          try {
            frame.contentWindow.postMessage(Object.assign({ source: PANEL_SOURCE }, message), window.location.origin)
            return true
          } catch (error) {
            return false
          }
        },
        [iframeRef],
      )

      const settle = useCallback((ok, payload) => {
        const pending = pendingRef.current
        if (!pending) return
        pendingRef.current = null
        clearTimeout(pending.timer)
        if (ok) pending.resolve(payload)
        else pending.reject(payload)
      }, [])

      const serialize = useCallback(() => {
        return new Promise((resolve, reject) => {
          if (!readyRef.current || !iframeRef.current) {
            reject(new Error(tRef.current("bridgeNotReady")))
            return
          }
          if (pendingRef.current) settle(false, new Error(tRef.current("bridgeNoDom")))
          const timer = setTimeout(() => {
            pendingRef.current = null
            reject(new Error(tRef.current("bridgeNoDom")))
          }, SERIALIZE_TIMEOUT_MS)
          pendingRef.current = { resolve, reject, timer }
          send({ type: "serialize" })
        })
      }, [iframeRef, send, settle])

      const requestOutline = useCallback(() => send({ type: "outline" }), [send])

      useEffect(() => {
        readyRef.current = false
        v2Ref.current = false
        setState({ status: "loading", screens: [], tweaksAvailable: false, supportsV2: null })
        const handshakeTimer = setTimeout(() => {
          if (!readyRef.current) setState((current) => (current.status === "ready" ? current : Object.assign({}, current, { status: "timeout", error: tRef.current("bridgeTimeout") })))
        }, HANDSHAKE_TIMEOUT_MS)
        let probeTimer = null

        const onMessage = (event) => {
          const frame = iframeRef.current
          if (!frame || !frame.contentWindow || event.source !== frame.contentWindow) return
          if (event.origin && event.origin !== window.location.origin) return
          const data = event.data
          if (!data || typeof data !== "object") return
          if (typeof data.type === "string" && data.type.indexOf("__edit_mode") === 0) {
            if (data.type === "__edit_mode_available") {
              setState((current) => (current.tweaksAvailable ? current : Object.assign({}, current, { tweaksAvailable: true })))
              if (eventRef.current) eventRef.current({ type: "tweaks-available", data })
            } else if (data.type === "__edit_mode_set_keys") {
              const edits = data.edits && typeof data.edits === "object" ? data.edits : {}
              if (eventRef.current) eventRef.current({ type: "edit-mode-keys", data: { edits } })
            }
            return
          }
          if (data.source !== CANVAS_SOURCE) return
          if (V2_MESSAGE_TYPES.indexOf(data.type) !== -1 && !v2Ref.current) {
            v2Ref.current = true
            if (probeTimer) clearTimeout(probeTimer)
            setState((current) => Object.assign({}, current, { supportsV2: true }))
          }
          switch (data.type) {
            case "ready": {
              readyRef.current = true
              clearTimeout(handshakeTimer)
              setState((current) =>
                Object.assign({}, current, {
                  status: "ready",
                  error: "",
                  screens: safeArray(data.screens),
                  tweaksAvailable: data.tweaksAvailable === true,
                }),
              )
              if (eventRef.current) eventRef.current({ type: "ready", data })
              probeTimer = setTimeout(() => {
                if (!v2Ref.current) setState((current) => Object.assign({}, current, { supportsV2: false }))
              }, BRIDGE_V2_PROBE_MS)
              requestOutline()
              return
            }
            case "dom": {
              const html = typeof data.html === "string" ? data.html : ""
              settle(true, { html, bytes: Number(data.bytes) || html.length })
              return
            }
            case "error": {
              setState((current) => Object.assign({}, current, { status: "error", error: String(data.message || tRef.current("bridgeError")) }))
              if (eventRef.current) eventRef.current({ type: "error", data })
              return
            }
            default: {
              if (eventRef.current) eventRef.current({ type: data.type, data })
            }
          }
        }

        window.addEventListener("message", onMessage)
        return () => {
          clearTimeout(handshakeTimer)
          if (probeTimer) clearTimeout(probeTimer)
          window.removeEventListener("message", onMessage)
          if (pendingRef.current) {
            const pending = pendingRef.current
            pendingRef.current = null
            clearTimeout(pending.timer)
            pending.reject(new Error(tRef.current("bridgeNoDom")))
          }
        }
      }, [variant, reloadKey, iframeRef, requestOutline, settle])

      const reload = useCallback(() => setReloadKey((value) => value + 1), [])
      return { bridge: state, reloadKey, reload, send, serialize, requestOutline, ready: state.status === "ready" }
    }

    /* ------------------------------------------------------------------ */
    /* Canvas: frame, pins, floating selection toolbar, zoom dock         */
    /* ------------------------------------------------------------------ */

    function pinPoint(rect, zoom, rotate, viewportWidth, viewportHeight) {
      if (!rect) return null
      const x = Number(rect.x) || 0
      const y = Number(rect.y) || 0
      const w = Number(rect.w !== undefined ? rect.w : rect.width) || 0
      const h = Number(rect.h !== undefined ? rect.h : rect.height) || 0
      const cx = x + w / 2
      const cy = y + h / 2
      const angle = ((Number(rotate) || 0) % 360 + 360) % 360
      if (angle === 90) return { left: (Number(viewportHeight) - cy) * zoom, top: cx * zoom }
      if (angle === 180) return { left: (Number(viewportWidth) - cx) * zoom, top: (Number(viewportHeight) - cy) * zoom }
      if (angle === 270) return { left: cy * zoom, top: (Number(viewportWidth) - cx) * zoom }
      return { left: cx * zoom, top: cy * zoom }
    }

    function SelectionToolbar(props) {
      const p = props || {}
      const t = p.t
      const actions = p.actions || {}
      const rect = p.rect
      if (!rect) return null
      const zoom = p.zoom
      const bw = (Number(rect.w !== undefined ? rect.w : rect.width) || 0) * zoom
      const bh = (Number(rect.h !== undefined ? rect.h : rect.height) || 0) * zoom
      const angle = ((Number(p.rotate) || 0) % 360 + 360) % 360
      let left = p.offset.x + (Number(rect.x) || 0) * zoom + bw / 2
      let top = p.offset.y + (Number(rect.y) || 0) * zoom - 48
      if (angle !== 0) {
        left = p.offset.x + p.bodyW / 2
        top = p.offset.y + 8
      }
      if (top < p.offset.y + 4) top = p.offset.y + (Number(rect.y) || 0) * zoom + bh + 10
      return h(
        "div",
        { className: "eds-float", style: { left: left, top: top, transform: angle === 0 ? "translateX(-50%)" : "none" }, role: "toolbar", "aria-label": t("elementActions") },
        h("button", { type: "button", className: "eds-float-btn", "data-tip": t("parentLabel"), "data-tip-side": "top", "aria-label": t("parentLabel"), onClick: () => actions.op && actions.op("parent") }, h(Icon, { name: "layers", size: 14 })),
        h("button", { type: "button", className: "eds-float-btn", "data-tip": t("duplicate"), "data-tip-side": "top", "aria-label": t("duplicate"), onClick: () => actions.op && actions.op("duplicate") }, h(Icon, { name: "duplicate", size: 14 })),
        h("button", { type: "button", className: "eds-float-btn", "data-tip": t("deleteElement"), "data-tip-side": "top", "aria-label": t("deleteElement"), onClick: () => actions.op && actions.op("delete") }, h(Icon, { name: "trash", size: 14 })),
        h("button", { type: "button", className: "eds-float-btn", "data-tip": t("moveUp"), "data-tip-side": "top", "aria-label": t("moveUp"), onClick: () => actions.op && actions.op("up") }, h(Icon, { name: "arrowUp", size: 14 })),
        h("button", { type: "button", className: "eds-float-btn", "data-tip": t("moveDown"), "data-tip-side": "top", "aria-label": t("moveDown"), onClick: () => actions.op && actions.op("down") }, h(Icon, { name: "arrowDown", size: 14 })),
        h("span", { className: "eds-float-sep" }),
        h("button", { type: "button", className: "eds-float-btn", "data-tip": t("editText"), "data-tip-side": "top", "aria-label": t("editText"), onClick: () => actions.editable && actions.editable() }, h(Icon, { name: "text", size: 14 })),
        h("span", { className: "eds-float-sep" }),
        [
          ["left", "alignLeft"],
          ["center", "alignCenter"],
          ["right", "alignRight"],
          ["top", "alignTop"],
          ["middle", "alignMiddle"],
          ["bottom", "alignBottom"],
        ].map((edge) =>
          h("button", { key: edge[0], type: "button", className: "eds-float-btn", "data-tip": t(edge[1]), "data-tip-side": "top", "aria-label": t(edge[1]), onClick: () => actions.align && actions.align(edge[0]) }, h(Icon, { name: edge[1], size: 14 })),
        ),
        h("span", { className: "eds-float-sep" }),
        h("button", { type: "button", className: "eds-float-btn", "data-tip": t("copyCss"), "data-tip-side": "top", "aria-label": t("copyCss"), onClick: () => actions.copyCss && actions.copyCss() }, h(Icon, { name: "code", size: 14 })),
        h("span", { className: "eds-float-size" }, formatRect(rect)),
      )
    }

    function CanvasArea(props) {
      const p = props || {}
      const t = p.t
      const bridge = p.bridge || { status: "loading", error: "" }
      const vw = Number(p.viewportWidth) || 1440
      const vh = heightForWidth(vw)
      const zoom = clampZoom(p.zoom)
      const angle = ((Number(p.rotate) || 0) % 360 + 360) % 360
      const bodyW = Math.round((angle === 90 || angle === 270 ? vh : vw) * zoom)
      const bodyH = Math.round((angle === 90 || angle === 270 ? vw : vh) * zoom)
      const stageRef = p.stageRef
      const frameRef = useRef(null)
      const deskRef = useRef(null)
      const [offset, setOffset] = useState({ x: 0, y: 0, w: 0, h: 0 })
      const selection = p.selection || { infos: [], active: null }
      const active = selection.active
      const usePinRects = p.commentRects || {}

      useEffect(() => {
        const frame = frameRef.current
        const desk = deskRef.current
        if (!frame || !desk) return
        const frameRect = frame.getBoundingClientRect()
        const deskRect = desk.getBoundingClientRect()
        setOffset({ x: frameRect.left - deskRect.left, y: frameRect.top - deskRect.top, w: frameRect.width, h: frameRect.height })
      }, [zoom, vw, angle, p.device, bridge.status, active ? active.selector : "", p.geometry])

      const iframeStyle = { width: vw, height: vh }
      if (angle === 90) iframeStyle.transform = "translateX(" + Math.round(vh * zoom) + "px) rotate(90deg) scale(" + zoom + ")"
      else if (angle === 180) iframeStyle.transform = "translate(" + Math.round(vw * zoom) + "px, " + Math.round(vh * zoom) + "px) rotate(180deg) scale(" + zoom + ")"
      else if (angle === 270) iframeStyle.transform = "translateY(" + Math.round(vw * zoom) + "px) rotate(270deg) scale(" + zoom + ")"
      else iframeStyle.transform = "scale(" + zoom + ")"

      const pins = safeArray(p.comments)
        .map((comment, index) => ({ comment, index }))
        .filter((row) => row.comment && row.comment.rect)
        .map((row) => {
          const comment = row.comment
          const rect = usePinRects[comment.selector] || comment.rect
          const point = pinPoint(rect, zoom, angle, vw, vh)
          if (!point) return null
          return h(
            "button",
            {
              key: comment.id || comment.selector + row.index,
              type: "button",
              className: "eds-pin",
              "data-resolved": comment.resolvedAt ? "true" : "false",
              style: { left: point.left, top: point.top },
              title: comment.note || comment.selector,
              "aria-label": t("pinOpenThread") + " " + (row.index + 1),
              onClick: () => p.onPinClick && p.onPinClick(comment),
            },
            h("span", null, String(row.index + 1)),
          )
        })
        .filter(Boolean)

      const composer = p.composer
      let composerStyle = null
      if (composer && composer.open) {
        const point = pinPoint(composer.rect, zoom, angle, vw, vh)
        const baseX = point ? point.left : 20
        const baseY = point ? point.top : 20
        composerStyle = {
          left: Math.max(8, Math.min(offset.x + baseX + 16, Math.max(8, offset.x + bodyW - 300))),
          top: Math.max(8, Math.min(offset.y + baseY + 16, Math.max(8, offset.y + bodyH - 190))),
        }
      }

      const hint = p.tool === "comment" ? t("commentHint") : selection.infos.length > 1 ? t("selectionMulti", { n: selection.infos.length }) : t("marqueeHint")
      const overlayVisible = bridge.status !== "ready"

      return h(
        "div",
        { className: "eds-scroll", ref: stageRef, tabIndex: -1, "data-panning": p.panning ? "true" : "false", "aria-label": t("viewCanvas") },
        h(
          "div",
          { className: "eds-desk", ref: deskRef },
          h(
            "div",
            { className: "eds-frame", ref: frameRef, style: { width: Math.round(bodyW + 2) } },
            h(
              "div",
              { className: "eds-frame-bar" },
              h("div", { className: "eds-frame-dots" }, h("span", { className: "eds-frame-dot" }), h("span", { className: "eds-frame-dot" }), h("span", { className: "eds-frame-dot" })),
              h("span", { className: "eds-frame-url" }, "preview / " + p.variant + ".html" + (angle ? " · " + angle + "°" : "")),
              h("span", { className: "dsg-mono", style: { fontSize: 9.5, flex: "none" } }, vw + "×" + vh),
            ),
            h(
              "div",
              { className: "eds-frame-body", style: { width: bodyW, height: bodyH } },
              h("iframe", { ref: p.iframeRef, key: p.iframeKey, title: "design preview " + p.variant, src: p.previewSrc, style: iframeStyle, onLoad: p.onIframeLoad }),
              h("div", { className: "eds-pins" }, pins),
            ),
          ),
          active && p.geometry
            ? h(SelectionToolbar, { t, rect: p.geometry.rect, zoom, rotate: angle, offset, bodyW, bodyH, actions: p.actions })
            : null,
          composer && composer.open
            ? h(
                "div",
                { className: "dsg-composer", style: composerStyle },
                h(
                  "div",
                  { className: "dsg-composer-head" },
                  h("span", { className: "dsg-pin" }, "•"),
                  h("span", { className: "dsg-composer-target", title: composer.info ? composer.info.selector : "" }, composer.info ? selectorLabel(composer.info) : t("commentTarget")),
                  h("button", { type: "button", className: "dsg-btn dsg-icon-btn", "data-size": "sm", "data-variant": "ghost", onClick: p.onComposerCancel, "aria-label": t("close"), style: { marginLeft: "auto" } }, h(Icon, { name: "x", size: 12 })),
                ),
                h("textarea", {
                  className: "dsg-textarea",
                  style: { minHeight: 60 },
                  autoFocus: true,
                  placeholder: t("commentPlaceholder"),
                  value: composer.note || "",
                  onChange: (event) => p.onComposerNote && p.onComposerNote(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault()
                      if (p.onComposerSubmit) p.onComposerSubmit()
                    }
                  },
                }),
                h(
                  "div",
                  { className: "dsg-composer-actions" },
                  h(Btn, { size: "sm", variant: "ghost", label: t("cancel"), onClick: p.onComposerCancel }),
                  h(Btn, { size: "sm", variant: "primary", label: t("commentSaveBtn"), disabled: !String(composer.note || "").trim() || composer.saving, onClick: p.onComposerSubmit }),
                ),
              )
            : null,
          h(
            "div",
            { className: "eds-dock", role: "group", "aria-label": t("zoom") },
            h("button", { type: "button", className: "eds-dock-btn", title: t("zoomOut"), "aria-label": t("zoomOut"), onClick: p.onZoomOut }, h(Icon, { name: "minus", size: 11 })),
            h("button", { type: "button", className: "eds-dock-btn", title: t("cmdFit"), onClick: p.onFit }, fmtPct(zoom)),
            h("button", { type: "button", className: "eds-dock-btn", title: t("zoomIn"), "aria-label": t("zoomIn"), onClick: p.onZoomIn }, h(Icon, { name: "plus", size: 11 })),
            h("span", { style: { width: 1, height: 14, background: "var(--dsg-line)" } }),
            h("button", { type: "button", className: "eds-dock-btn", title: t("cmdFit"), onClick: p.onFit }, t("fit")),
            h("button", { type: "button", className: "eds-dock-btn", title: t("cmdOneToOne"), onClick: p.onOneToOne }, "1:1"),
          ),
          !overlayVisible
            ? h(
                "div",
                { className: "eds-canvas-hint" },
                h(Icon, { name: p.tool === "comment" ? "comment" : "select", size: 10 }),
                p.dragState && p.dragState.on ? "dx " + Math.round(p.dragState.dx) + " · dy " + Math.round(p.dragState.dy) : hint,
              )
            : null,
          bridge.status === "loading"
            ? h("div", { className: "eds-overlay-msg" }, h("div", null, h(EmptyState, { icon: "monitor", title: t("bridgeLoading"), body: t("workspaceHint") }), h("div", { style: { display: "flex", justifyContent: "center" } }, h(Loading, { label: t("loading") }))))
            : bridge.status === "timeout" || bridge.status === "error"
              ? h("div", { className: "eds-overlay-msg" }, h(EmptyState, { icon: "warning", title: bridge.status === "timeout" ? t("bridgeTimeout") : t("bridgeError"), body: bridge.error || "", action: h(Tbtn, { icon: "refresh", label: t("reloadPreview"), tone: "primary", onClick: p.onRetry }) }))
              : null,
          bridge === p.bridge && bridge.supportsV2 === false && bridge.status === "ready"
            ? h("div", { className: "eds-canvas-hint", style: { top: 8, opacity: 0.85 } }, h(Icon, { name: "info", size: 10 }), t("statusV1Bridge"))
            : null,
        ),
      )
    }

    function ArtboardView(props) {
      const p = props || {}
      const t = p.t
      const variants = safeArray(p.variants)
      const scale = p.scale || ARTBOARD_SCALE
      const project = (p.detail && p.detail.project) || {}
      const height = heightForWidth(ARTBOARD_WIDTH)
      return h(
        "div",
        { className: "eds-scroll", tabIndex: -1 },
        h(
          "div",
          { className: "eds-artboards" },
          variants.length === 0
            ? h("div", { className: "eds-empty-mini" }, t("canvasEmpty"))
            : variants.map((row) =>
                h(
                  "button",
                  { key: row.id, type: "button", className: "eds-ab", "data-active": row.id === p.activeId ? "true" : "false", onClick: () => p.onPick(row.id), "aria-label": t("artboardFocus") + " " + String(row.id).toUpperCase() },
                  h(
                    "div",
                    { className: "eds-ab-label" },
                    h("b", null, String(row.id).toUpperCase()),
                    h("span", null, row.label || variantLabel(project, row.id)),
                    h("span", { className: "eds-ab-score" }, ARTBOARD_WIDTH + " · " + (variantScore(p.detail, row.id) === null ? "–" : Math.round(Number(variantScore(p.detail, row.id))))),
                  ),
                  h(
                    "div",
                    { className: "eds-ab-body", style: { width: Math.round(ARTBOARD_WIDTH * scale), height: Math.round(height * scale) } },
                    h("iframe", { title: "artboard " + row.id, loading: "lazy", src: previewUrl(p.projectId, row.id), style: { width: ARTBOARD_WIDTH, height: height, transform: "scale(" + scale + ")" } }),
                  ),
                ),
              ),
        ),
      )
    }

