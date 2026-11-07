/**
 * 05-shell - the v2 editor shell: top bar, 44px tool bar, three-column body with
 * resizable/collapsible panels and drawers, 26px status bar, command palette,
 * shortcuts sheet, theme menus and the global shortcut map.
 */

    function ResizeSplitter(props) {
      const p = props || {}
      const [dragging, setDragging] = useState(false)
      const moveRef = useRef(null)
      useEffect(() => {
        if (!dragging) return undefined
        const onMove = (event) => {
          if (moveRef.current) moveRef.current(event)
        }
        const onUp = () => setDragging(false)
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)
        return () => {
          window.removeEventListener("pointermove", onMove)
          window.removeEventListener("pointerup", onUp)
          window.removeEventListener("pointercancel", onUp)
        }
      }, [dragging])
      return h("div", {
        className: "eds-split" + (p.side === "left" ? " eds-split-left" : " eds-split-right"),
        role: "separator",
        "aria-orientation": "vertical",
        "aria-label": p.t("resizePanel"),
        title: p.t("resizePanel"),
        "data-dragging": dragging ? "true" : "false",
        onPointerDown: (event) => {
          event.preventDefault()
          moveRef.current = (moveEvent) => {
            if (p.onResize) p.onResize(moveEvent.clientX, p.side)
          }
          setDragging(true)
        },
        onDoubleClick: () => p.onReset && p.onReset(p.side),
      })
    }

    function MenuPopover(props) {
      const p = props || {}
      return h(
        "div",
        { className: "eds-menu", style: p.style, role: "menu", "aria-label": p.label, onMouseDown: (event) => event.stopPropagation() },
        safeArray(p.head).map((row, index) => h("div", { key: "h" + index, className: "eds-menu-head" }, row)),
        safeArray(p.items).map((item, index) =>
          item === "-"
            ? h("div", { key: "sep" + index, className: "eds-menu-sep" })
            : h(
                "button",
                { key: item.id || "item" + index, type: "button", role: "menuitem", className: "eds-menu-item", "data-danger": item.danger ? "true" : undefined, onClick: item.onClick, "data-tip": item.tip || undefined, "data-tip-side": "right" },
                item.icon ? h(Icon, { name: item.icon, size: 13 }) : null,
                h("span", { className: "dsg-grow", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, item.label),
                item.active ? h(Icon, { name: "check", size: 12 }) : null,
                item.shortcut ? h("span", { className: "dsg-mono", style: { fontSize: 9, opacity: .65 } }, item.shortcut) : null,
              ),
        ),
      )
    }

    function CommandPalette(props) {
      const p = props || {}
      const t = p.t
      const [query, setQuery] = useState("")
      const [active, setActive] = useState(0)
      const inputRef = useRef(null)
      const results = useMemo(() => filterCommands(p.commands || [], query), [p.commands, query])
      useEffect(() => {
        if (!p.open) return
        setQuery("")
        setActive(0)
        const timer = setTimeout(() => {
          if (inputRef.current && inputRef.current.focus) inputRef.current.focus()
        }, 20)
        return () => clearTimeout(timer)
      }, [p.open])
      useEffect(() => {
        setActive(0)
      }, [query])
      if (!p.open) return null
      const clamped = results.length === 0 ? 0 : Math.min(active, results.length - 1)
      const run = (command) => {
        if (!command) return
        if (p.onClose) p.onClose()
        if (command.run) command.run()
      }
      return h(
        "div",
        { className: "eds-overlay", onMouseDown: (event) => { if (event.target === event.currentTarget && p.onClose) p.onClose() } },
        h(
          "div",
          { className: "eds-palette", role: "dialog", "aria-modal": "true", "aria-label": t("paletteTitle") },
          h(
            "div",
            { className: "eds-palette-search" },
            h("span", { className: "eds-search-icon" }, h(Icon, { name: "search", size: 15 })),
            h("input", {
              ref: inputRef,
              className: "eds-palette-input",
              value: query,
              placeholder: t("palettePlaceholder"),
              "aria-label": t("palettePlaceholder"),
              onChange: (event) => setQuery(event.target.value),
              onKeyDown: (event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  setActive((value) => (results.length === 0 ? 0 : (Math.min(value, results.length - 1) + 1) % results.length))
                } else if (event.key === "ArrowUp") {
                  event.preventDefault()
                  setActive((value) => (results.length === 0 ? 0 : (Math.min(value, results.length - 1) + results.length - 1) % results.length))
                } else if (event.key === "Enter") {
                  event.preventDefault()
                  run(results[clamped])
                } else if (event.key === "Escape") {
                  event.preventDefault()
                  if (p.onClose) p.onClose()
                }
              },
            }),
          ),
          h(
            "div",
            { className: "eds-palette-list", role: "listbox" },
            results.length === 0
              ? h("div", { className: "eds-empty-mini" }, t("paletteEmpty"))
              : results.slice(0, 80).map((command, index) =>
                  h(
                    "button",
                    {
                      key: command.id,
                      type: "button",
                      role: "option",
                      "aria-selected": index === clamped ? "true" : "false",
                      className: "eds-cmd",
                      "data-active": index === clamped ? "true" : "false",
                      onMouseEnter: () => setActive(index),
                      onClick: () => run(command),
                    },
                    h("span", { className: "eds-cmd-icon" }, h(Icon, { name: command.icon || "command", size: 13 })),
                    h("span", { className: "eds-cmd-label" }, command.label),
                    command.groupLabel ? h("span", { className: "eds-cmd-group" }, command.groupLabel) : null,
                    command.shortcut ? h("span", { className: "eds-cmd-kbd" }, command.shortcut) : null,
                  ),
                ),
          ),
          h("div", { className: "eds-palette-foot" }, h("span", { className: "dsg-grow" }, t("paletteHint")), h("span", null, results.length + " / " + safeArray(p.commands).length)),
        ),
      )
    }

    function ShortcutsSheet(props) {
      const p = props || {}
      const t = p.t
      if (!p.open) return null
      const groups = [
        {
          label: t("shortcutsFile"),
          rows: [
            ["⌘/Ctrl + S", t("cmdSave")],
            ["⌘/Ctrl + Z", t("cmdUndo")],
            ["⇧⌘/Ctrl + Z", t("cmdRedo")],
            ["⌘/Ctrl + D", t("shortcutDuplicate")],
            ["Delete", t("shortcutDelete")],
            ["⌘/Ctrl + K", t("shortcutCommands")],
          ],
        },
        {
          label: t("shortcutsTools"),
          rows: [
            ["E", t("toolSelect")],
            ["C", t("toolComment")],
            ["⌘/Ctrl + \\", t("inspectorToggle")],
            ["F6 / ⇧F6", t("helpRegions")],
            ["Space + drag", t("panHint")],
          ],
        },
        {
          label: t("shortcutsView"),
          rows: [
            ["0", t("cmdFit")],
            ["1 / 2 / 3", t("helpVariants")],
            ["+ / −", t("helpZoom")],
            ["G", t("shortcutGrid")],
            ["R", t("shortcutRulers")],
            ["?", t("shortcutsTitle")],
          ],
        },
        {
          label: t("shortcutsSelect"),
          rows: [
            ["↑ / ↓", t("shortcutLayers")],
            ["Shift + click", t("marqueeHint")],
            ["Return", t("editText")],
            ["Escape", t("helpEscape")],
          ],
        },
      ]
      return h(
        "div",
        { className: "eds-overlay", onMouseDown: (event) => { if (event.target === event.currentTarget && p.onClose) p.onClose() } },
        h(
          "div",
          { className: "eds-sheet", role: "dialog", "aria-modal": "true", "aria-label": t("shortcutsTitle") },
          h(
            "div",
            { className: "eds-sheet-head" },
            h(Icon, { name: "command", size: 15 }),
            h("span", { className: "dsg-grow" }, t("shortcutsTitle")),
            h(Tbtn, { icon: "x", tip: t("close"), onClick: p.onClose }),
          ),
          h(
            "div",
            { className: "eds-sheet-body" },
            groups.map((group) =>
              h(
                react.Fragment,
                { key: group.label },
                h("div", { className: "eds-sheet-group" }, group.label),
                group.rows.map((row) =>
                  h(
                    "div",
                    { key: group.label + row[0], className: "eds-shortcut" },
                    h("span", { className: "eds-kbd-group" }, row[0].split(" / ").map((key) => h("span", { key: key, className: "dsg-kbd" }, key))),
                    h("span", null, row[1]),
                  ),
                ),
              ),
            ),
          ),
        ),
      )
    }

    /* ------------------------------------------------------------------ */
    /* Editor shell                                                       */
    /* ------------------------------------------------------------------ */

    function Editor(props) {
      const p = props || {}
      const t = p.t
      const detail = p.detail || {}
      const project = detail.project || {}
      const projectId = project.id || ""
      const kind = project.kind || "web"
      const variants = safeArray(detail.variants)
      const viewports = safeArray(project.viewports).length > 0 ? project.viewports.map(Number).filter((n) => Number.isFinite(n)) : defaultViewports(kind)
      const comments = safeArray(detail.comments)

      const [variant, setVariant] = useState(variants.length > 0 ? variants[0].id : "a")
      const [viewportWidth, setViewportWidth] = useState(viewports[0] || 1440)
      const [customWidth, setCustomWidth] = useState("")
      const [rotate, setRotate] = useState(0)
      const [device, setDevice] = useState(() => pickDeviceForWidth(viewports[0] || 1440, kind))
      const [zoom, setZoom] = useState(1)
      const [zoomText, setZoomText] = useState("100%")
      const [autoFit, setAutoFit] = useState(true)
      const [tool, setTool] = useState("select")
      const [view, setView] = useState("canvas")
      const [leftTab, setLeftTab] = useState("brief")
      const [rightTab, setRightTab] = useState("properties")
      const [selection, setSelection] = useState({ infos: [], active: null })
      const [hoveredSelector, setHoveredSelector] = useState("")
      const [geometry, setGeometry] = useState(null)
      const [dragState, setDragState] = useState({ on: false, dx: 0, dy: 0 })
      const [layers, setLayers] = useState({ tree: [], count: 0, query: "", expanded: new Set(), activeKey: "", loading: true, v1: false })
      const [dirty, setDirty] = useState(false)
      const [edits, setEdits] = useState(0)
      const [saving, setSaving] = useState(false)
      const [job, setJob] = useState(detail.job || null)
      const [checkFull, setCheckFull] = useState(null)
      const [checkVersion, setCheckVersion] = useState(0)
      const [exporting, setExporting] = useState(null)
      const [exportResult, setExportResult] = useState(null)
      const [tweakState, setTweakState] = useState({ loading: false, error: "", values: {}, file: "", loaded: false })
      const [lightbox, setLightbox] = useState(null)
      const [overlay, setOverlay] = useState({ rulers: false, grid: 0, columns: 0, guides: false })
      const [layout, setLayout] = useState(() => normalizeLayout(readLocalJson(LAYOUT_KEY, DEFAULT_LAYOUT)))
      const [leftOpen, setLeftOpen] = useState(false)
      const [rightOpen, setRightOpen] = useState(false)
      const [paletteOpen, setPaletteOpen] = useState(false)
      const [sheetOpen, setSheetOpen] = useState(false)
      const [menu, setMenu] = useState("")
      const [menuPos, setMenuPos] = useState({ right: 12, top: 50 })
      const [renaming, setRenaming] = useState(null)
      const [diagnostics, setDiagnostics] = useState(null)
      const [confirmDelete, setConfirmDelete] = useState(false)
      const [composer, setComposer] = useState(null)
      const [commentRects, setCommentRects] = useState({})
      const [panning, setPanning] = useState(false)

      const iframeRef = useRef(null)
      const stageRef = useRef(null)
      const bodyRef = useRef(null)
      const topRef = useRef(null)
      const toolbarRef = useRef(null)
      const leftRef = useRef(null)
      const rightRef = useRef(null)
      const statusRef = useRef(null)
      const stageWidth = useObservedWidth(stageRef)
      const rightDrawer = useMedia("(max-width: 1100px)")
      const leftDrawer = useMedia("(max-width: 900px)")
      const narrow = useMedia("(max-width: 768px)")

      const commentsOpen = openCommentCount(comments)
      const latest = detail.latestCheck || null
      const latestRound = latestCheckRound(detail)
      const tweakFile = variant + ".html"
      const previewSrc = previewUrl(projectId, variant)
      const bestScore = project.bestScore !== null && project.bestScore !== undefined ? project.bestScore : latest ? latest.score : null
      const bestGrade = bestScore !== null && bestScore !== undefined ? scoreGrade(bestScore) : ""
      const activeInfo = selection.active
      const flow = deriveFlow(detail)
      const flowNextStage = flow.nextId ? flow.stages.filter((stage) => stage.id === flow.nextId)[0] || null : null

      const stateRef = useRef({})
      stateRef.current = { variant, viewportWidth, device, zoom, tool, selection, composer, layout, overlay, view, rightTab, layers, activeInfo }

      const notify = useCallback((text, tone) => p.notify(text, tone), [p.notify])
      const propReload = p.reloadDetail
      const propRefreshState = p.refreshState
      const propNotify = p.notify

      const reloadDetail = useCallback(async () => {
        try {
          return await propReload(projectId)
        } catch (error) {
          propNotify(messageOf(error), "err")
          return null
        }
      }, [propReload, propNotify, projectId])

      /* ---- canvas events ------------------------------------------------ */
      const outlineTimer = useRef(null)
      const tweakTimers = useRef({ apply: null, persist: null, pending: {} })
      const tweakValuesRef = useRef({})
      tweakValuesRef.current = tweakState.values

      const requestOutlineSoon = useCallback(
        (delay) => {
          if (outlineTimer.current) clearTimeout(outlineTimer.current)
          outlineTimer.current = setTimeout(() => {
            if (bridgeCtlRef.current) bridgeCtlRef.current.requestOutline()
          }, delay === undefined ? 180 : delay)
        },
        [],
      )

      const flushTweakPersist = useCallback(() => {
        const pending = tweakTimers.current.pending
        tweakTimers.current.pending = {}
        const keys = Object.keys(pending)
        if (keys.length === 0) return
        const file = tweakTimers.current.file || tweakFile
        keys.forEach((key) => {
          apiPost(qs(projectId) + "/tweak", { file, key, value: pending[key] }).catch((error) => {
            propNotify(t("tweaksPersistFailed") + "：" + messageOf(error), "err")
          })
        })
      }, [propNotify, projectId, t, tweakFile])

      const applyTweakValues = useCallback(
        (values) => {
          if (tweakTimers.current.apply) clearTimeout(tweakTimers.current.apply)
          tweakTimers.current.apply = setTimeout(() => {
            if (bridgeCtlRef.current) bridgeCtlRef.current.send({ type: "tweak", values })
          }, TWEEN_APPLY_MS)
        },
        [],
      )

      const persistTweakValues = useCallback(
        (values) => {
          tweakTimers.current.file = tweakFile
          tweakTimers.current.pending = Object.assign({}, tweakTimers.current.pending, values)
          if (tweakTimers.current.persist) clearTimeout(tweakTimers.current.persist)
          tweakTimers.current.persist = setTimeout(flushTweakPersist, TWEEN_PERSIST_MS)
        },
        [flushTweakPersist, tweakFile],
      )

      const setTweak = useCallback(
        (key, value) => {
          setTweakState((current) => Object.assign({}, current, { values: Object.assign({}, current.values, { [key]: value }), loaded: true }))
          applyTweakValues(Object.assign({}, tweakValuesRef.current, { [key]: value }))
          persistTweakValues({ [key]: value })
        },
        [applyTweakValues, persistTweakValues],
      )

      const loadTweaks = useCallback(async () => {
        setTweakState((current) => Object.assign({}, current, { loading: true, error: "" }))
        try {
          const result = await apiGet(qs(projectId) + "/tweak?file=" + encodeURIComponent(tweakFile))
          setTweakState({ loading: false, error: "", values: result.tweaks && typeof result.tweaks === "object" ? result.tweaks : {}, file: result.file || tweakFile, loaded: true })
        } catch (error) {
          setTweakState({ loading: false, error: messageOf(error), values: {}, file: tweakFile, loaded: true })
        }
      }, [projectId, tweakFile])

      const expandAncestors = useCallback((selector) => {
        if (!selector) return
        const chain = findLayerAncestors(stateRef.current.layers.tree, selector)
        if (chain.length === 0) return
        setLayers((current) => {
          const next = new Set(current.expanded)
          chain.forEach((key) => {
            if (key) next.add(key)
          })
          return Object.assign({}, current, { expanded: next, activeKey: selector })
        })
      }, [])

      const onCanvasEvent = (event) => {
        const data = event.data || {}
        if (event.type === "ready") {
          requestOutlineSoon(60)
          return
        }
        if (event.type === "outline") {
          const tree = safeArray(data.tree)
          setLayers((current) => Object.assign({}, current, { tree, count: Number(data.count) || countLayers(tree), loading: false, v1: false }))
          return
        }
        if (event.type === "selected") {
          const info = data.info || null
          setSelection({ infos: info ? [info] : [], active: info })
          if (info) {
            expandAncestors(info.selector)
            setRightTab("properties")
            if (rightDrawer) setRightOpen(true)
          }
          return
        }
        if (event.type === "selected-many") {
          const infos = safeArray(data.infos)
          setSelection({ infos, active: infos.length > 0 ? infos[infos.length - 1] : null })
          if (infos.length > 0) {
            expandAncestors(infos[infos.length - 1].selector)
            setRightTab("properties")
          }
          return
        }
        if (event.type === "selection-geometry") {
          setGeometry({ rect: data.rect || null, parentRect: data.parentRect || null, handles: data.handles !== false })
          return
        }
        if (event.type === "drag-state") {
          setDragState({ on: data.on === true, dx: Number(data.dx) || 0, dy: Number(data.dy) || 0 })
          return
        }
        if (event.type === "changed") {
          setDirty(true)
          requestOutlineSoon(160)
          return
        }
        if (event.type === "hover") {
          setHoveredSelector(data.info ? data.info.selector : "")
          return
        }
        if (event.type === "hovered") {
          setHoveredSelector(String(data.selector || ""))
          return
        }
        if (event.type === "comment-rect") {
          if (data.selector) {
            setCommentRects((current) => Object.assign({}, current, { [data.selector]: data.rect || null }))
          }
          return
        }
        if (event.type === "saved-state") {
          if (typeof data.dirty === "boolean") setDirty(data.dirty)
          if (Number.isFinite(Number(data.edits))) setEdits(Number(data.edits))
          return
        }
        if (event.type === "text-edited") {
          setSelection((current) => (current.active ? { infos: current.infos.map((info) => (info.selector === current.active.selector ? Object.assign({}, info, { text: data.text }) : info)), active: Object.assign({}, current.active, { text: data.text }) } : current))
          setDirty(true)
          return
        }
        if (event.type === "comment-request") {
          openComposer(data.info || null, data.rect || null)
          return
        }
        if (event.type === "tweaks") {
          const values = data.values && typeof data.values === "object" ? data.values : {}
          setTweakState((current) => Object.assign({}, current, { values: Object.assign({}, current.values, values), loaded: true }))
          persistTweakValues(values)
          return
        }
        if (event.type === "tweaks-available") {
          setTweakState((current) => Object.assign({}, current, { available: true }))
          return
        }
        if (event.type === "edit-mode-keys") {
          const values = (data && data.edits) || {}
          if (Object.keys(values).length === 0) return
          setTweakState((current) => Object.assign({}, current, { values: Object.assign({}, current.values, values), loaded: true, available: true }))
          persistTweakValues(values)
        }
      }

      const bridgeCtl = useEditorBridge(iframeRef, variant, onCanvasEvent, t)
      const bridgeCtlRef = useRef(bridgeCtl)
      bridgeCtlRef.current = bridgeCtl
      const { bridge, send, serialize, requestOutline, reloadKey, reload } = bridgeCtl

      /* ---- mode / overlay / outline sync -------------------------------- */
      useEffect(() => {
        if (bridge.status !== "ready") return
        send({ type: "mode", mode: tool === "comment" ? "comment" : "select" })
      }, [bridge.status, tool, send])

      useEffect(() => {
        if (bridge.status !== "ready") return
        send({ type: "overlay", rulers: overlay.rulers, grid: overlay.grid, columns: overlay.columns, guides: overlay.guides })
      }, [bridge.status, overlay.rulers, overlay.grid, overlay.columns, overlay.guides, send])

      useEffect(() => {
        if (bridge.status !== "ready" || bridge.supportsV2 !== false) return
        setLayers((current) => Object.assign({}, current, { loading: false, v1: true }))
      }, [bridge.status, bridge.supportsV2])

      /* ---- invariants ---------------------------------------------------- */
      useEffect(() => {
        if (variants.length === 0) return
        if (variants.filter((row) => row && row.id === variant).length === 0) setVariant(variants[0].id)
      }, [detail.variants, variant])

      const viewportsKey = viewports.join(",")
      useEffect(() => {
        if (viewports.indexOf(viewportWidth) !== -1) return
        const next = viewports[0] || 1440
        setViewportWidth(next)
        setDevice(pickDeviceForWidth(next, kind))
      }, [viewportsKey, viewportWidth, kind])

      /* ---- zoom ---------------------------------------------------------- */
      useEffect(() => {
        if (!autoFit || !stageWidth) return
        setZoom(fitZoom(viewportWidth, stageWidth))
      }, [autoFit, stageWidth, viewportWidth])

      useEffect(() => {
        setZoomText(fmtPct(zoom))
      }, [zoom])

      const fit = () => setAutoFit(true)
      const zoomBy = (direction) => {
        setAutoFit(false)
        setZoom((current) => zoomPresetNext(current, direction))
      }
      const setZoomValue = (next) => {
        setAutoFit(false)
        setZoom(clampZoom(next))
      }
      const fitSelection = () => {
        const rect = (geometry && geometry.rect) || (activeInfo && activeInfo.rect)
        if (!rect || !stageWidth) {
          fit()
          return
        }
        const availableW = Math.max(160, stageWidth - 140)
        const availableH = Math.max(160, 620)
        const next = Math.min(availableW / Math.max(40, rect.w), availableH / Math.max(40, rect.h))
        setAutoFit(false)
        setZoom(clampZoom(next))
        if (activeInfo && send) send({ type: "zoom-to", selector: activeInfo.selector })
      }

      /* ---- job polling + full check -------------------------------------- */
      const jobId = job && job.id ? job.id : ""
      const jobStatus = job && job.status ? job.status : ""
      useEffect(() => {
        if (!jobId || jobStatus !== "running") return undefined
        let stopped = false
        const timer = setInterval(() => {
          if (stopped) return
          void (async () => {
            try {
              const result = await apiGet(qs(projectId) + "/job")
              const next = result.job || null
              if (stopped) return
              setJob(next)
              if (next && next.status !== "running") {
                const nextDetail = await propReload(projectId)
                await propRefreshState()
                const round = (next.result && next.result.round) || (nextDetail && nextDetail.latestCheck ? nextDetail.latestCheck.round : null) || null
                setCheckVersion((value) => value + 1)
                if (round) {
                  try {
                    const full = await apiGet(qs(projectId) + "/check/" + round)
                    setCheckFull(full.check || null)
                  } catch (error) {
                    setCheckFull(null)
                  }
                }
                const summary = nextDetail && nextDetail.latestCheck ? nextDetail.latestCheck : null
                if (next.status === "done") propNotify(t("toastCheckDone", { score: summary && summary.score !== null && summary.score !== undefined ? summary.score : "–", grade: (summary && summary.grade) || "–" }))
                else if (next.status === "failed") propNotify(t("toastCheckFailed", { message: next.error || t("error") }), "err")
              }
            } catch (error) {
              /* transient */
            }
          })()
        }, JOB_POLL_MS)
        return () => {
          stopped = true
          clearInterval(timer)
        }
      }, [jobId, jobStatus, projectId, propNotify, propRefreshState, propReload, t])

      useEffect(() => {
        if (detail.job && detail.job.status === "running" && !jobRunning(job)) setJob(detail.job)
      }, [detail.job, job])

      useEffect(() => {
        if (!latestRound) {
          setCheckFull(null)
          return undefined
        }
        let cancelled = false
        apiGet(qs(projectId) + "/check/" + latestRound)
          .then((result) => {
            if (!cancelled) setCheckFull(result.check || null)
          })
          .catch(() => {
            if (!cancelled) setCheckFull(null)
          })
        return () => {
          cancelled = true
        }
      }, [projectId, latestRound, checkVersion])

      /* ---- tweaks load ---------------------------------------------------- */
      useEffect(() => {
        if (rightTab !== "tweaks") return
        void loadTweaks()
      }, [rightTab, variant, loadTweaks])

      useEffect(() => {
        return () => {
          if (tweakTimers.current.apply) clearTimeout(tweakTimers.current.apply)
          if (tweakTimers.current.persist) clearTimeout(tweakTimers.current.persist)
          if (outlineTimer.current) clearTimeout(outlineTimer.current)
        }
      }, [])

      /* ---- layout persistence + resizing --------------------------------- */
      const layoutTimer = useRef(null)
      const updateLayout = useCallback((next) => {
        const normalized = normalizeLayout(next)
        setLayout(normalized)
        if (layoutTimer.current) clearTimeout(layoutTimer.current)
        layoutTimer.current = setTimeout(() => writeLocalJson(LAYOUT_KEY, normalized), 250)
      }, [])
      useEffect(() => {
        return () => {
          if (layoutTimer.current) clearTimeout(layoutTimer.current)
        }
      }, [])

      const onResize = (clientX, side) => {
        const body = bodyRef.current
        if (!body) return
        const rect = body.getBoundingClientRect()
        if (side === "left") updateLayout(Object.assign({}, layout, { left: clampPanelWidth(clientX - rect.left, LEFT_MIN, LEFT_MAX) }))
        else updateLayout(Object.assign({}, layout, { right: clampPanelWidth(rect.right - clientX, RIGHT_MIN, RIGHT_MAX) }))
      }
      const resetSplit = (side) => updateLayout(Object.assign({}, layout, side === "left" ? { left: DEFAULT_LAYOUT.left } : { right: DEFAULT_LAYOUT.right }))
      const toggleLeft = () => {
        if (leftDrawer) setLeftOpen((value) => !value)
        else updateLayout(Object.assign({}, layout, { leftCollapsed: !layout.leftCollapsed }))
      }
      const toggleRight = () => {
        if (rightDrawer) setRightOpen((value) => !value)
        else updateLayout(Object.assign({}, layout, { rightCollapsed: !layout.rightCollapsed }))
      }
      const leftShown = leftDrawer ? true : !layout.leftCollapsed
      const rightShown = rightDrawer ? true : !layout.rightCollapsed

      /* ---- keyboard shortcuts --------------------------------------------- */
      const shortcutRef = useRef({})
      shortcutRef.current = {
        saveNow: () => saveNow(),
        undo: () => undo(),
        redo: () => redo(),
        fit,
        zoomBy,
        setTool,
        setView,
        setRightTab,
        toggleRight,
        toggleLeft,
        openPalette: () => setPaletteOpen(true),
        openSheet: () => setSheetOpen(true),
        closeOverlays: () => {
          setPaletteOpen(false)
          setSheetOpen(false)
          setMenu("")
          setConfirmDelete(false)
          setDiagnostics(null)
        },
        setOverlay,
        deselect: () => deselect(),
        duplicate: () => op("duplicate"),
        deleteSelection: () => op("delete"),
        activeInfo,
        activeInfoPresent: Boolean(activeInfo),
        variants,
        chooseVariant: (id) => chooseVariant(id),
        closeComposer: () => setComposer(null),
        composer,
        menu,
        paletteOpen,
        sheetOpen,
        diagnostics,
        confirmDelete,
        rightDrawer,
        leftDrawer,
        leftOpen,
        rightOpen,
        setLeftOpen,
        setRightOpen,
      }

      useEffect(() => {
        const onKey = (event) => {
          const current = shortcutRef.current
          const target = event.target
          const tag = target && target.tagName ? target.tagName : ""
          const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (target && target.isContentEditable)
          const mod = event.metaKey || event.ctrlKey
          const key = event.key
          if (mod && (key === "k" || key === "K")) {
            event.preventDefault()
            current.openPalette()
            return
          }
          if (mod && key === "\\") {
            event.preventDefault()
            current.toggleRight()
            return
          }
          if (mod && (key === "s" || key === "S")) {
            event.preventDefault()
            current.saveNow()
            return
          }
          if (typing) {
            if (key === "Escape" && current.composer) current.closeComposer()
            return
          }
          if (key === "F6") {
            event.preventDefault()
            const nodes = [topRef.current, toolbarRef.current, leftRef.current, stageRef.current, rightRef.current, statusRef.current].filter(Boolean)
            if (nodes.length === 0) return
            const index = nodes.indexOf(document.activeElement)
            const delta = event.shiftKey ? -1 : 1
            const next = index === -1 ? (event.shiftKey ? nodes.length - 1 : 0) : (index + delta + nodes.length) % nodes.length
            nodes[next].focus()
            return
          }
          if (key === "Escape") {
            if (current.paletteOpen || current.sheetOpen || current.menu || current.diagnostics || current.confirmDelete) {
              current.closeOverlays()
              return
            }
            if (current.composer) {
              current.closeComposer()
              return
            }
            if (current.rightDrawer && current.rightOpen) {
              current.setRightOpen(false)
              return
            }
            if (current.leftDrawer && current.leftOpen) {
              current.setLeftOpen(false)
              return
            }
            current.deselect()
            return
          }
          if (mod && (key === "z" || key === "Z")) {
            event.preventDefault()
            if (event.shiftKey) current.redo()
            else current.undo()
            return
          }
          if (mod && (key === "d" || key === "D")) {
            event.preventDefault()
            current.duplicate()
            return
          }
          if (mod) return
          if (key === "?" || (key === "/" && event.shiftKey)) {
            event.preventDefault()
            current.openSheet()
            return
          }
          if (key === "Delete" || key === "Backspace") {
            if (current.activeInfoPresent) {
              event.preventDefault()
              current.deleteSelection()
            }
            return
          }
          if (key === "e" || key === "E") {
            event.preventDefault()
            current.setTool("select")
            return
          }
          if (key === "c" || key === "C") {
            event.preventDefault()
            current.setTool("comment")
            return
          }
          if (key === "g" || key === "G") {
            event.preventDefault()
            current.setOverlay((currentOverlay) => Object.assign({}, currentOverlay, { grid: currentOverlay.grid ? 0 : 8 }))
            return
          }
          if (key === "r" || key === "R") {
            event.preventDefault()
            current.setOverlay((currentOverlay) => Object.assign({}, currentOverlay, { rulers: !currentOverlay.rulers }))
            return
          }
          if (key === "0") {
            event.preventDefault()
            current.fit()
            return
          }
          if (key === "1" || key === "2" || key === "3") {
            const index = Number(key) - 1
            const rows = current.variants || []
            if (rows[index]) {
              event.preventDefault()
              current.chooseVariant(rows[index].id)
            }
            return
          }
          if (key === "+" || key === "=") {
            event.preventDefault()
            current.zoomBy("in")
            return
          }
          if (key === "-" || key === "_") {
            event.preventDefault()
            current.zoomBy("out")
          }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
      }, [])

      /* ---- space-drag pan ------------------------------------------------- */
      const spaceRef = useRef(false)
      useEffect(() => {
        const down = (event) => {
          if (event.code === "Space" && !event.target) return
          const tag = event.target && event.target.tagName ? event.target.tagName : ""
          const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (event.target && event.target.isContentEditable)
          if (event.code === "Space" && !typing) {
            spaceRef.current = true
            event.preventDefault()
          }
        }
        const up = (event) => {
          if (event.code === "Space") spaceRef.current = false
        }
        window.addEventListener("keydown", down)
        window.addEventListener("keyup", up)
        return () => {
          window.removeEventListener("keydown", down)
          window.removeEventListener("keyup", up)
        }
      }, [])

      const panRef = useRef(null)
      useEffect(() => {
        const stage = stageRef.current
        if (!stage) return undefined
        const onDown = (event) => {
          if (!spaceRef.current) return
          event.preventDefault()
          panRef.current = { x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop }
          setPanning(true)
        }
        const onMove = (event) => {
          if (!panRef.current) return
          stage.scrollLeft = panRef.current.left - (event.clientX - panRef.current.x)
          stage.scrollTop = panRef.current.top - (event.clientY - panRef.current.y)
        }
        const onUp = () => {
          panRef.current = null
          setPanning(false)
        }
        stage.addEventListener("pointerdown", onDown)
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        return () => {
          stage.removeEventListener("pointerdown", onDown)
          window.removeEventListener("pointermove", onMove)
          window.removeEventListener("pointerup", onUp)
        }
      }, [bridge.status, view])

      /* ---- outside click closes menus ------------------------------------ */
      useEffect(() => {
        if (!menu) return undefined
        const onDown = (event) => {
          if (event.target && event.target.closest && event.target.closest(".eds-menu")) return
          setMenu("")
        }
        document.addEventListener("mousedown", onDown, true)
        return () => document.removeEventListener("mousedown", onDown, true)
      }, [menu])

      /* ---- actions -------------------------------------------------------- */
      const chooseVariant = (nextVariant) => {
        if (!nextVariant || nextVariant === variant) return
        setVariant(nextVariant)
        setSelection({ infos: [], active: null })
        setGeometry(null)
        setDirty(false)
        setEdits(0)
        setComposer(null)
        setView("canvas")
      }
      const chooseViewport = (nextWidth) => {
        const width = Number(nextWidth)
        if (!Number.isFinite(width) || width < 240) return
        setViewportWidth(Math.round(width))
        setDevice(pickDeviceForWidth(width, kind))
        setAutoFit(true)
      }

      const saveNow = useCallback(async (options) => {
        const silent = Boolean(options && options.silent)
        if (saving) return false
        setSaving(true)
        try {
          const payload = await serialize()
          const result = await apiPost(qs(projectId) + "/save", { variant, html: payload.html })
          setDirty(false)
          setEdits(0)
          await propReload(projectId)
          await propRefreshState()
          if (!silent) propNotify(t("toastSaved") + " · " + fmtBytes((result && result.bytes) || payload.bytes))
          return true
        } catch (error) {
          propNotify(t("toastSaveFailed", { message: messageOf(error) }), "err")
          return false
        } finally {
          setSaving(false)
        }
      }, [propNotify, propRefreshState, propReload, projectId, saving, serialize, t, variant])

      const undo = () => {
        send({ type: "undo" })
        setDirty(true)
        requestOutlineSoon(200)
      }
      const redo = () => {
        send({ type: "redo" })
        setDirty(true)
        requestOutlineSoon(200)
      }

      const op = (name) => {
        const selector = activeInfo ? activeInfo.selector : ""
        if (!selector && name !== "first") return
        send({ type: "op", op: name, selector })
        setDirty(true)
        requestOutlineSoon(220)
      }
      const editable = () => {
        if (!activeInfo) return
        send({ type: "op", op: "editable", selector: activeInfo.selector })
        setDirty(true)
      }
      const align = (edge) => {
        if (!activeInfo) return
        send({ type: "align", selector: activeInfo.selector, edge })
        setDirty(true)
        requestOutlineSoon(220)
      }
      const toggleVisibility = (selector, visible) => {
        if (!selector) return
        send({ type: "visibility", selector, visible })
        setDirty(true)
        requestOutlineSoon(240)
      }
      const selectMany = (selectors) => {
        if (!selectors || selectors.length === 0) return
        send({ type: "select-many", selectors })
      }
      const selectLayer = (selector) => {
        if (!selector) return
        send({ type: "select", selector })
        expandAncestors(selector)
      }
      const hoverLayer = (selector) => {
        setHoveredSelector(selector || "")
        if (bridge.supportsV2 !== false) send({ type: "hover", selector: selector || "" })
      }
      const deselect = () => {
        setSelection({ infos: [], active: null })
        setGeometry(null)
        send({ type: "select", selector: "" })
      }
      const patchStyles = (styles) => {
        if (!activeInfo) return
        send({ type: "patch", selector: activeInfo.selector, styles })
        setSelection((current) => (current.active ? { infos: current.infos.map((info) => (info.selector === current.active.selector ? Object.assign({}, info, { styles: Object.assign({}, info.styles, styles) }) : info)), active: Object.assign({}, current.active, { styles: Object.assign({}, current.active.styles, styles) }) } : current))
        setDirty(true)
        setEdits((value) => value + 1)
      }
      const resetStyles = (propsList) => {
        const styles = {}
        safeArray(propsList).forEach((prop) => {
          styles[prop] = ""
        })
        patchStyles(styles)
      }
      const copyText = async (text, okLabel) => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text)
          else throw new Error("no clipboard")
          propNotify(okLabel || t("toastCopied"))
        } catch (error) {
          propNotify(t("toastCopyFailed"), "err")
        }
      }
      const copyCss = () => {
        if (!activeInfo) return
        void copyText(selectorLabel(activeInfo) + " {\n" + cssFromStyles(activeInfo.styles) + "\n}", t("toastCopied"))
      }
      const copySelector = () => {
        if (!activeInfo) return
        void copyText(activeInfo.selector, t("toastCopied"))
      }
      const openComposer = (info, rect) => {
        setComposer({ info, rect, note: "", saving: false })
      }
      const addComment = async () => {
        if (!composer || !composer.info || !composer.note.trim()) return
        setComposer((current) => (current ? Object.assign({}, current, { saving: true }) : current))
        try {
          const info = composer.info
          const rawRect = composer.rect || {}
          await apiPost(qs(projectId) + "/comments", {
            variant,
            selector: info.selector,
            note: composer.note.trim(),
            rect: { x: Number(rawRect.x) || 0, y: Number(rawRect.y) || 0, w: Number(rawRect.w !== undefined ? rawRect.w : rawRect.width) || 0, h: Number(rawRect.h !== undefined ? rawRect.h : rawRect.height) || 0 },
            element: { tag: info.tag || "", id: info.id || "", classes: safeArray(info.classes), text: String(info.text || "").slice(0, 200) },
          })
          setComposer(null)
          await propReload(projectId)
          propNotify(t("commentSaved"))
        } catch (error) {
          propNotify(messageOf(error), "err")
          setComposer((current) => (current ? Object.assign({}, current, { saving: false }) : current))
        }
      }
      const resolveComment = async (commentId, reply) => {
        try {
          await apiPost(qs(projectId) + "/comments/resolve", { id: commentId, reply: reply || "" })
          await propReload(projectId)
          propNotify(t("commentResolved"))
        } catch (error) {
          propNotify(messageOf(error), "err")
        }
      }
      const onPinClick = (comment) => {
        setRightTab("comments")
        if (rightDrawer) setRightOpen(true)
        if (comment && comment.selector) selectLayer(comment.selector)
      }
      const runCheck = useCallback(async () => {
        if (jobRunning(job)) return
        setRightTab("checks")
        if (rightDrawer) setRightOpen(true)
        try {
          if (dirty) {
            propNotify(t("checkSavedFirst"))
            const saved = await saveNow({ silent: true })
            if (!saved) return
          }
          const result = await apiPost(qs(projectId) + "/check", { variant: "all" })
          setJob(result.job || null)
          propNotify(t("checkStarted"))
        } catch (error) {
          propNotify(messageOf(error), "err")
        }
      }, [dirty, job, propNotify, projectId, rightDrawer, saveNow, t])
      const runExport = useCallback(async (exportKind) => {
        if (exporting) return
        setRightTab("exports")
        if (rightDrawer) setRightOpen(true)
        setExporting(exportKind)
        setExportResult(null)
        try {
          const result = await apiPost(qs(projectId) + "/export", { kind: exportKind, variant })
          setExportResult(result.export || null)
          await propReload(projectId)
          propNotify(t("toastExportDone") + " · " + String(exportKind).toUpperCase())
        } catch (error) {
          propNotify(messageOf(error), "err")
        } finally {
          setExporting(null)
        }
      }, [exporting, propNotify, propReload, projectId, rightDrawer, t, variant])
      const saveVersion = async (label) => {
        const result = await apiPost(qs(projectId) + "/versions", { label: label || "" })
        await propReload(projectId)
        propNotify(t("toastVersionSaved"))
        return result.version || null
      }
      const restoreVersion = async (versionId) => {
        try {
          await apiPost(qs(projectId) + "/versions/restore", { id: versionId })
          await propReload(projectId)
          await propRefreshState()
          send({ type: "reload" })
          propNotify(t("toastRestored"))
        } catch (error) {
          propNotify(messageOf(error), "err")
        }
      }
      const saveBrief = useCallback(async (brief) => {
        try {
          await apiPost(qs(projectId) + "/brief", { brief })
          await propReload(projectId)
          propNotify(t("briefSaved"))
          return true
        } catch (error) {
          const code = error && error.code ? String(error.code) : ""
          if (code === "not_found" || code === "http_404") propNotify(t("briefSaveNotReady"), "err")
          else propNotify(messageOf(error), "err")
          return false
        }
      }, [propNotify, propReload, projectId, t])

      const openInBrowser = async () => {
        try {
          const result = await apiPost(qs(projectId) + "/preview", { variant })
          if (result && result.url) window.open(result.url, "_blank", "noopener,noreferrer")
          else propNotify(t("noPreviewUrl", { message: t("unknownError") }), "err")
        } catch (error) {
          propNotify(t("toastOpenFailed", { message: messageOf(error) }), "err")
        }
      }
      const openFolder = async () => {
        try {
          const result = await apiPost(qs(projectId) + "/reveal", {})
          if (result && result.opened === false) propNotify(result.reason || t("error"), "err")
        } catch (error) {
          propNotify(messageOf(error), "err")
        }
      }
      const showDiagnostics = async () => {
        setMenu("")
        try {
          const result = await apiGet("/api/diagnostics")
          setDiagnostics(result.data || result)
        } catch (error) {
          setDiagnostics({ error: messageOf(error) })
        }
      }
      const submitRename = async () => {
        const name = String(renaming || "").trim()
        setRenaming(null)
        if (!name || name === detail.project.name) return
        try {
          await apiPost(qs(projectId) + "/rename", { name })
          await propReload(projectId)
          propNotify(t("renameSaved"))
        } catch (error) {
          propNotify(messageOf(error), "err")
        }
      }
      const removeProject = async () => {
        setConfirmDelete(false)
        if (p.onDelete) await p.onDelete(projectId)
      }
      const toggleTheme = (pref) => {
        setMenu("")
        if (p.theme && p.theme.setPreference) p.theme.setPreference(pref)
      }
      const jumpFlow = (stageId) => {
        if (stageId === "brief") {
          const intakeDone = Boolean(project.intake && project.intake.completedAt)
          if (!intakeDone && p.onOpenWizard) {
            p.onOpenWizard("update", project)
            return
          }
          setLeftTab("brief")
          if (leftDrawer) setLeftOpen(true)
        } else if (stageId === "context") {
          setLeftTab(stageId)
          if (leftDrawer) setLeftOpen(true)
        } else if (stageId === "variants") {
          setLeftTab("variants")
          setView("canvas")
        } else if (stageId === "iterate") {
          setLeftTab("comments")
          setView("canvas")
          if (leftDrawer) setLeftOpen(true)
        } else if (stageId === "check") {
          setRightTab("checks")
          if (rightDrawer) setRightOpen(true)
        } else if (stageId === "export") {
          setRightTab("exports")
          if (rightDrawer) setRightOpen(true)
        }
      }

      /* ---- commands -------------------------------------------------------- */
      const commands = useMemo(() => {
        const rows = []
        const add = (id, label, group, icon, run, keywords, shortcut) => rows.push({ id, label, group, groupLabel: t("group" + group.charAt(0).toUpperCase() + group.slice(1)), icon, run, keywords, shortcut })
        add("save", t("cmdSave"), "file", "save", () => saveNow(), "save canvas 保存", "⌘S")
        add("version", t("cmdSaveVersion"), "file", "history", () => void saveVersion(""), "version snapshot 版本")
        add("browser", t("cmdOpenBrowser"), "file", "external", () => void openInBrowser(), "browser preview 浏览器")
        add("id", t("copyProjectId"), "file", "copy", () => void copyText(projectId, t("copyDone")), "id copy 复制")
        add("folder", t("openFolder"), "file", "folderOpen", () => void openFolder(), "folder reveal 目录")
        add("diagnostics", t("diagnostics"), "file", "info", () => void showDiagnostics(), "diagnostics health 诊断")
        add("delete", t("deleteProject"), "file", "trash", () => setConfirmDelete(true), "delete project 删除")
        add("back", t("backToProjects"), "file", "back", () => p.onBack && p.onBack(), "back projects 返回")
        add("canvas", t("cmdCanvasView"), "view", "monitor", () => setView("canvas"), "canvas 画布")
        add("artboards", t("cmdArtboardView"), "view", "artboard", () => setView("artboards"), "artboards 画板")
        add("inspector", t("cmdToggleInspector"), "view", "sliders", () => toggleRight(), "inspector panel 面板", "⌘\\")
        add("left", t("cmdToggleLeft"), "view", "panelLeft", () => toggleLeft(), "left rail 左栏")
        add("fit", t("cmdFit"), "zoom", "fit", () => fit(), "fit 适应", "0")
        add("fitSelection", t("cmdFitSelection"), "zoom", "target", () => fitSelection(), "selection fit 选中")
        add("one", t("cmdOneToOne"), "zoom", "monitor", () => setZoomValue(1), "100% zoom 1:1")
        add("zoomIn", t("cmdZoomIn"), "zoom", "plus", () => zoomBy("in"), "zoom in 放大", "+")
        add("zoomOut", t("cmdZoomOut"), "zoom", "minus", () => zoomBy("out"), "zoom out 缩小", "-")
        add("select", t("cmdSelectTool"), "tools", "select", () => setTool("select"), "select cursor 选择", "E")
        add("comment", t("cmdCommentTool"), "tools", "comment", () => setTool("comment"), "comment pin 评论", "C")
        add("undo", t("cmdUndo"), "tools", "undo", () => undo(), "undo 撤销", "⌘Z")
        add("redo", t("cmdRedo"), "tools", "redo", () => redo(), "redo 重做", "⇧⌘Z")
        add("rulers", t("cmdRulers"), "view", "ruler", () => setOverlay((current) => Object.assign({}, current, { rulers: !current.rulers })), "rulers 标尺", "R")
        add("grid", t("cmdGrid"), "view", "grid", () => setOverlay((current) => Object.assign({}, current, { grid: current.grid ? 0 : 8 })), "grid 网格", "G")
        add("columns", t("cmdColumns"), "view", "columns", () => setOverlay((current) => Object.assign({}, current, { columns: current.columns ? 0 : 12 })), "columns guides 参考线")
        add("guides", t("cmdGuides"), "view", "guides", () => setOverlay((current) => Object.assign({}, current, { guides: !current.guides })), "snap guides 对齐")
        add("themeAuto", t("cmdThemeAuto"), "theme", "monitor", () => toggleTheme("auto"), "theme auto 主题")
        add("themeLight", t("cmdThemeLight"), "theme", "sun", () => toggleTheme("light"), "theme light 浅色")
        add("themeDark", t("cmdThemeDark"), "theme", "moon", () => toggleTheme("dark"), "theme dark 深色")
        add("check", t("cmdRunCheck"), "check", "gauge", () => void runCheck(), "audit check 质检")
        EXPORT_KINDS.forEach((item) => add("export-" + item.id, t("cmdExportKind", { kind: t(item.labelKey) }), "export", item.icon, () => void runExport(item.id), "export " + item.id + " 导出"))
        ;[
          ["properties", "tabProperties", "sliders"],
          ["tweaks", "tabTweaks", "palette"],
          ["comments", "tabComments", "comment"],
          ["checks", "tabChecks", "gauge"],
          ["exports", "tabExports", "download"],
          ["system", "tabSystem", "layers"],
          ["versions", "tabVersions", "history"],
        ].forEach((row) => add("tab-" + row[0], t("cmd" + row[1].charAt(0).toUpperCase() + row[1].slice(1)) || t(row[1]), "panels", row[2], () => { setRightTab(row[0]); if (rightDrawer) setRightOpen(true) }, "panel tab " + row[1]))
        add("help", t("cmdHelp"), "help", "help", () => setSheetOpen(true), "shortcuts help 帮助", "?")
        variants.forEach((row) => add("variant-" + row.id, t("cmdVariant", { id: String(row.id).toUpperCase() }), "view", "layers", () => chooseVariant(row.id), "variant 变体 " + row.id))
        return rows
      }, [t, variant, dirty, exporting, job, view, layout, overlay, rightDrawer, variants, selection])

      /* ---- status bar data ------------------------------------------------- */
      const selectionPath = activeInfo ? shortSelector(activeInfo.selector, 2) : t("statusNoSelection")
      const selRect = (geometry && geometry.rect) || (activeInfo && activeInfo.rect) || null
      const bridgeChip = bridge.status === "ready" ? { label: t("bridgeReady"), tone: "ok" } : bridge.status === "loading" ? { label: t("bridgeLoading"), tone: "" } : { label: t("bridgeTimeout"), tone: "danger" }
      const hint = tool === "comment" ? t("statusToolComment") : dragState.on ? t("dragHint") : bridge.supportsV2 === false ? t("statusV1Bridge") : t("statusToolSelect")

      const inspectorActions = {
        projectId,
        variant,
        detail,
        notify,
        refreshDetail: reloadDetail,
        refreshState: propRefreshState,
        browserAvailable: !(p.browser && p.browser.available === false),
        setMode: (nextTool) => setTool(nextTool === "comment" ? "comment" : "select"),
        resolveComment,
        saveNow,
        saveVersion,
        restoreVersion,
        runCheck,
        runExport,
        exporting,
        exportResult,
        job,
        checkFull,
        latestRound,
        patchStyles,
        resetStyles,
        deselect,
        jumpTo: selectLayer,
        setTweak,
        loadTweaks,
        tweakState,
        lightbox,
        setLightbox,
        openInBrowser,
        reloadPreview: () => {
          send({ type: "reload" })
          reload()
        },
        op,
        editable,
        align,
        copyCss,
        copySelector,
        toggleVisibility,
        activeInfo,
        geometry,
        handoff: p.onHandoff,
        goChat: p.onGoChat,
        openIssues: latest && latest.issues ? Number(latest.issues) : 0,
        theme: p.theme,
      }

      /* ---- render ---------------------------------------------------------- */
      return h(
        "div",
        { className: "eds-root" },
        h(
          "header",
          { className: "eds-top", ref: topRef, tabIndex: -1 },
          h(
            "div",
            { className: "eds-top-left" },
            h(Tbtn, { icon: "back", tip: t("backToProjects"), onClick: p.onBack }),
            h("div", { className: "eds-brand" }, h("span", { className: "eds-brand-mark" }, h(StudioMark, { size: 15 })), h("span", { className: "eds-brand-title" }, t("appTitle"))),
            h("span", { className: "eds-crumb-sep" }, h(Icon, { name: "chevron", size: 10 })),
            renaming === null
              ? h(
                  "button",
                  { type: "button", className: "eds-name-btn", title: t("renameHint"), onClick: () => setRenaming(project.name || project.id || "") },
                  h("span", { className: "eds-name-text" }, project.name || project.id),
                )
              : h("input", {
                  className: "eds-name-input",
                  value: renaming,
                  autoFocus: true,
                  "aria-label": t("renameHint"),
                  onChange: (event) => setRenaming(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void submitRename()
                    } else if (event.key === "Escape") {
                      event.preventDefault()
                      setRenaming(null)
                    }
                  },
                  onBlur: () => setRenaming(null),
                }),
            h(
              "div",
              { className: "eds-chip-row" },
              h(Chip, { label: statusMeta(project.status, t).label, tone: statusMeta(project.status, t).tone, dot: true }),
              h(
                "button",
                {
                  type: "button",
                  className: "eds-score-chip",
                  "data-tone": bestScore === null || bestScore === undefined ? "" : scoreTone(bestScore),
                  title: t("scoreChipTip"),
                  onClick: () => {
                    setRightTab("checks")
                    if (rightDrawer) setRightOpen(true)
                  },
                },
                bestScore === null || bestScore === undefined ? "–" : Math.round(Number(bestScore)),
                bestGrade ? " · " + bestGrade : "",
              ),
            ),
          ),
          h(
            "div",
            { className: "eds-top-right" },
            h(
              "div",
              { className: "eds-seg-views", role: "group", "aria-label": t("viewCanvas") },
              h(Tbtn, { icon: "monitor", label: narrow ? null : t("viewCanvas"), tip: t("viewCanvas"), active: view === "canvas", onClick: () => setView("canvas") }),
              h(Tbtn, { icon: "artboard", label: narrow ? null : t("viewArtboards"), tip: t("viewArtboards"), active: view === "artboards", onClick: () => setView("artboards") }),
            ),
            h(Tbtn, { icon: "chat", label: narrow ? null : t("backToChat"), tip: t("backToChat"), onClick: () => { if (p.onGoChat) p.onGoChat() } }),
            h(Tbtn, { icon: "gauge", label: narrow ? null : t("tabChecks"), tip: t("checksTitle"), onClick: () => { setRightTab("checks"); if (rightDrawer) setRightOpen(true) } }),
            h(
              "span",
              { style: { position: "relative", display: "inline-flex" } },
              h(Tbtn, {
                icon: "download",
                label: narrow ? null : t("export"),
                tip: t("export"),
                active: menu === "export",
                onClick: (event) => {
                  const rect = event && event.currentTarget ? event.currentTarget.getBoundingClientRect() : null
                  setMenuPos({ right: rect ? Math.max(8, window.innerWidth - rect.right) : 96, top: 50 })
                  setMenu(menu === "export" ? "" : "export")
                },
              }),
            ),
            h(
              "span",
              { style: { position: "relative", display: "inline-flex" } },
              h(Tbtn, {
                icon: "dots",
                tip: t("more"),
                active: menu === "more",
                onClick: (event) => {
                  const rect = event && event.currentTarget ? event.currentTarget.getBoundingClientRect() : null
                  setMenuPos({ right: rect ? Math.max(8, window.innerWidth - rect.right) : 12, top: 50 })
                  setMenu(menu === "more" ? "" : "more")
                },
              }),
            ),
            h(
              "div",
              { className: "dsg-seg", role: "group", "aria-label": "language" },
              h("button", { type: "button", className: "dsg-seg-btn", "aria-pressed": p.lang === "zh" ? "true" : "false", onClick: () => p.onLang && p.onLang("zh"), title: "中文" }, "中"),
              h("button", { type: "button", className: "dsg-seg-btn", "aria-pressed": p.lang === "en" ? "true" : "false", onClick: () => p.onLang && p.onLang("en"), title: "English" }, "EN"),
            ),
            h(Tbtn, { icon: "help", tip: t("help"), onClick: () => setSheetOpen(true) }),
          ),
        ),
        h(
          "div",
          { className: "eds-flow", role: "list", "aria-label": t("flowTitle") },
          h("span", { className: "eds-flow-title" }, t("flowTitle")),
          flow.stages.reduce((acc, stage, index) => {
            if (index > 0) acc.push(h("span", { key: "flow-arrow-" + stage.id, className: "eds-flow-arrow" }, h(Icon, { name: "chevron", size: 9 })))
            acc.push(
              h(
                "button",
                {
                  key: "flow-" + stage.id,
                  type: "button",
                  role: "listitem",
                  className: "eds-flow-step",
                  "data-done": stage.done ? "true" : "false",
                  "data-current": flow.currentId === stage.id ? "true" : "false",
                  title: t(stage.hintKey),
                  onClick: () => jumpFlow(stage.id),
                },
                h("span", { className: "eds-flow-dot" }, stage.done ? h(Icon, { name: "check", size: 8 }) : String(index + 1)),
                h("span", null, t(stage.labelKey)),
              ),
            )
            return acc
          }, []),
          h("span", { className: "eds-flow-spacer" }),
          flow.allDone
            ? h("span", { className: "eds-flow-next" }, h("b", null, t("flowDoneHint")))
            : flowNextStage
              ? h("span", { className: "eds-flow-next" }, t("flowNext", { stage: "" }), h("b", null, t(flowNextStage.labelKey)), " · " + t(flowNextStage.hintKey))
              : null,
        ),
        /* toolbar */
        h(
          "div",
          { className: "eds-toolbar", ref: toolbarRef, tabIndex: -1 },
          h(
            "div",
            { className: "eds-tgroup" },
            h(Tbtn, { icon: "select", label: narrow ? null : t("toolSelect"), tip: t("toolSelect") + " (E)", active: tool === "select", onClick: () => setTool("select") }),
            h(Tbtn, { icon: "comment", label: narrow ? null : t("toolComment"), tip: t("toolComment") + " (C)", active: tool === "comment", onClick: () => setTool("comment") }),
            h("span", { className: "eds-vsep" }),
            h(Tbtn, { icon: rightShown ? "panelRight" : "panelLeft", tip: t("inspectorToggle"), active: rightShown && (rightDrawer ? rightOpen : !layout.rightCollapsed) ? "soft" : false, onClick: toggleRight }),
            h(Tbtn, { icon: "panelLeft", tip: t("cmdToggleLeft"), active: leftShown && (leftDrawer ? leftOpen : !layout.leftCollapsed) ? "soft" : false, onClick: toggleLeft }),
          ),
          h("span", { className: "eds-vsep" }),
          h(
            "div",
            { className: "eds-tgroup" },
            h("span", { className: "eds-tool-label" }, t("viewport")),
            h(
              "select",
              { className: "eds-select", value: String(viewportWidth), "aria-label": t("viewport"), onChange: (event) => chooseViewport(Number(event.target.value)) },
              viewports.map((width) => h("option", { key: width, value: String(width) }, width + "px")),
              viewports.indexOf(viewportWidth) === -1 ? h("option", { value: String(viewportWidth) }, viewportWidth + "px") : null,
            ),
            h("input", {
              className: "eds-input eds-viewport-input",
              value: customWidth,
              placeholder: t("viewportCustom"),
              "aria-label": t("viewportCustom"),
              onChange: (event) => setCustomWidth(event.target.value),
              onKeyDown: (event) => {
                if (event.key === "Enter") chooseViewport(parseInt(customWidth, 10))
              },
              onBlur: () => setCustomWidth(""),
            }),
            h(Tbtn, { icon: "monitor", tip: t("deviceBrowser"), active: device === "browser", onClick: () => setDevice("browser") }),
            h(Tbtn, { icon: "phone", tip: t("devicePhone"), active: device === "phone", onClick: () => setDevice("phone") }),
            h(Tbtn, { icon: "rotate", tip: t("rotate"), onClick: () => setRotate((value) => (value + 90) % 360), active: rotate !== 0 }),
          ),
          h("span", { className: "eds-vsep" }),
          h(
            "div",
            { className: "eds-tgroup eds-zoom-ctl" },
            h(Tbtn, { icon: "minus", tip: t("zoomOut") + " (-)", onClick: () => zoomBy("out") }),
            h("input", {
              className: "eds-zoom-input",
              value: zoomText,
              "aria-label": t("zoom"),
              onChange: (event) => setZoomText(event.target.value),
              onKeyDown: (event) => {
                if (event.key === "Enter") {
                  setZoomValue(parseZoomInput(zoomText, zoom))
                  setZoomText(fmtPct(parseZoomInput(zoomText, zoom)))
                }
              },
              onBlur: () => setZoomText(fmtPct(zoom)),
            }),
            h(Tbtn, { icon: "plus", tip: t("zoomIn") + " (+)", onClick: () => zoomBy("in") }),
          ),
          h(Tbtn, { icon: "fit", tip: t("cmdFit") + " (0)", onClick: fit }),
          h(Tbtn, { label: "1:1", tip: t("cmdOneToOne"), onClick: () => setZoomValue(1) }),
          h(Tbtn, { icon: "target", tip: t("cmdFitSelection"), disabled: !activeInfo, onClick: fitSelection }),
          h("span", { className: "eds-vsep" }),
          h(Tbtn, { icon: "ruler", tip: t("rulers") + " (R)" + (bridge.supportsV2 === false ? " · " + t("statusV1Bridge") : ""), active: overlay.rulers, disabled: bridge.supportsV2 === false, onClick: () => setOverlay((current) => Object.assign({}, current, { rulers: !current.rulers })) }),
          h(Tbtn, { icon: "grid", tip: t("grid") + " (G)" + (bridge.supportsV2 === false ? " · " + t("statusV1Bridge") : ""), active: overlay.grid === 8, disabled: bridge.supportsV2 === false, onClick: () => setOverlay((current) => Object.assign({}, current, { grid: current.grid ? 0 : 8 })) }),
          h(Tbtn, { icon: "columns", tip: t("columns") + (bridge.supportsV2 === false ? " · " + t("statusV1Bridge") : ""), active: overlay.columns === 12, disabled: bridge.supportsV2 === false, onClick: () => setOverlay((current) => Object.assign({}, current, { columns: current.columns ? 0 : 12 })) }),
          h(Tbtn, { icon: "guides", tip: t("guides") + (bridge.supportsV2 === false ? " · " + t("statusV1Bridge") : ""), active: overlay.guides, disabled: bridge.supportsV2 === false, onClick: () => setOverlay((current) => Object.assign({}, current, { guides: !current.guides })) }),
          h("span", { className: "dsg-grow", style: { flex: 1 } }),
          h(Tbtn, { icon: "undo", tip: t("undo") + " (⌘Z)", disabled: !bridgeCtl.ready, onClick: undo }),
          h(Tbtn, { icon: "redo", tip: t("redo") + " (⇧⌘Z)", disabled: !bridgeCtl.ready, onClick: redo }),
          h(Tbtn, { icon: "save", label: saving ? t("saving") : t("saveBtn"), tip: t("saveHint"), tone: "primary", dirty: dirty, disabled: saving || !dirty || !bridgeCtl.ready, onClick: () => void saveNow() }),
        ),
        /* body */
        h(
          "div",
          { className: "eds-body", ref: bodyRef },
          leftShown
            ? h(LeftRail, {
                t,
                open: leftDrawer ? leftOpen : true,
                style: { width: leftDrawer ? undefined : layout.left },
                tab: leftTab,
                onTab: (tab) => {
                  setLeftTab(tab)
                  if (leftDrawer) setLeftOpen(true)
                },
                detail,
                projectId,
                variant,
                variants,
                selection: selection.active,
                selectionCount: selection.infos.length,
                hoveredSelector,
                mode: tool,
                layers,
                onLayerQuery: (query) => setLayers((current) => Object.assign({}, current, { query })),
                onLayerToggle: (key) => setLayers((current) => {
                  const next = new Set(current.expanded)
                  if (next.has(key)) next.delete(key)
                  else next.add(key)
                  return Object.assign({}, current, { expanded: next })
                }),
                onLayerSelect: selectLayer,
                onLayerHover: hoverLayer,
                onLayerVisibility: toggleVisibility,
                onLayerKeySelect: selectLayer,
                onRefreshLayers: () => requestOutline(),
                onVariant: chooseVariant,
                comments,
                commentsOpen,
                onPinClick,
                onResolveComment: resolveComment,
                onCopyClaude: () => {
                  const unresolved = safeArray(comments).filter((comment) => comment && !comment.resolvedAt)
                  if (unresolved.length === 0) {
                    propNotify(t("commentsNoneOpen"))
                    return
                  }
                  if (p.onHandoff) void p.onHandoff(buildCommentsPrompt({ project, variant, selector: activeInfo ? activeInfo.selector : "", openComments: unresolved.length, openIssues: latest && latest.issues ? Number(latest.issues) : 0, comments }))
                },
                onGoChat: p.onGoChat,
                onHandoff: p.onHandoff,
                brief: project.brief,
                briefContext: { variant, selector: activeInfo ? activeInfo.selector : "", openComments: commentsOpen, openIssues: latest && latest.issues ? Number(latest.issues) : 0 },
                onSaveBrief: saveBrief,
                intake: project.intake,
                onOpenWizard: p.onOpenWizard,
                actions: { projectId, variant, notify, refreshDetail: reloadDetail, refreshState: propRefreshState, jumpTo: selectLayer, setMode: (nextTool) => setTool(nextTool === "comment" ? "comment" : "select"), resolveComment, handoff: p.onHandoff, saveBrief, importContext: async (input) => {
                  const result = await apiPost(qs(projectId) + "/context", input)
                  await propReload(projectId)
                  return result
                } },
                bridge,
                leftRef,
              })
            : null,
          leftShown ? h(ResizeSplitter, { t, side: "left", onResize, onReset: resetSplit }) : null,
          h(
            "div",
            { className: "eds-center" },
            view === "artboards"
              ? h(ArtboardView, {
                  t,
                  projectId,
                  detail,
                  variants,
                  activeId: variant,
                  scale: ARTBOARD_SCALE,
                  onPick: (id) => {
                    chooseVariant(id)
                    setView("canvas")
                  },
                })
              : variants.length === 0
                ? h(
                    "div",
                    { className: "eds-stage" },
                    h(
                      "div",
                      { className: "eds-stage-inner" },
                      h(EmptyState, {
                        icon: "layers",
                        title: t("canvasEmpty"),
                        body: t("workspaceHint"),
                        action: h(
                          "div",
                          { className: "dsg-row", style: { justifyContent: "center" } },
                          h(Tbtn, { icon: "chat", label: t("generateVariants"), tone: "primary", onClick: () => p.onHandoff && p.onHandoff(buildHandoffPrompt({ project, variant, requirement: t("generateVariants") + "：a 规范版、b 进阶版、c 前卫版，真实文案与 4/8 间距。" })) }),
                          h(Tbtn, { icon: "refresh", label: t("refresh"), onClick: () => { void p.refreshState(); void p.reloadDetail(projectId) } }),
                        ),
                      }),
                    ),
                  )
                : h(CanvasArea, {
                  t,
                  kind,
                  bridge,
                  iframeRef,
                  iframeKey: variant + ":" + reloadKey + ":" + rotate,
                  previewSrc,
                  variant,
                  viewportWidth,
                  rotate,
                  zoom,
                  device,
                  selection,
                  hoveredSelector,
                  geometry,
                  dragState,
                  comments,
                  commentRects,
                  composer,
                  stageRef,
                  tool,
                  panning,
                  overlay,
                  onRetry: reload,
                  onPinClick,
                  onComposerNote: (note) => setComposer((current) => (current ? Object.assign({}, current, { note }) : current)),
                  onComposerSubmit: () => void addComment(),
                  onComposerCancel: () => setComposer(null),
                  onZoomIn: () => zoomBy("in"),
                  onZoomOut: () => zoomBy("out"),
                  onFit: fit,
                  onOneToOne: () => setZoomValue(1),
                  actions: { op, editable, align, copyCss, copySelector, duplicate: () => op("duplicate"), deleteSelection: () => op("delete"), editText: editable },
                }),
          ),
          rightShown ? h(ResizeSplitter, { t, side: "right", onResize, onReset: resetSplit }) : null,
          rightShown
            ? h(RightInspector, {
                t,
                lang: p.lang,
                open: rightDrawer ? rightOpen : true,
                style: { width: rightDrawer ? undefined : layout.right },
                tab: rightTab,
                onTab: (tab) => {
                  setRightTab(tab)
                  if (rightDrawer) setRightOpen(true)
                },
                actions: inspectorActions,
                selection: selection.active,
                selectionCount: selection.infos.length,
                geometry,
                mode: tool,
                onCopyClaude: () => {
                  const unresolved = safeArray(comments).filter((comment) => comment && !comment.resolvedAt)
                  if (unresolved.length === 0) {
                    propNotify(t("commentsNoneOpen"))
                    return
                  }
                  if (p.onHandoff) void p.onHandoff(buildCommentsPrompt({ project, variant, selector: activeInfo ? activeInfo.selector : "", openComments: unresolved.length, openIssues: latest && latest.issues ? Number(latest.issues) : 0, comments }))
                },
                badges: { comments: commentsOpen, checks: latest && Number(latest.issues) ? Number(latest.issues) : 0 },
                versions: safeArray(detail.versions),
                bridge,
                theme: p.theme,
                rightRef,
              })
            : null,
          (leftDrawer && leftOpen) || (rightDrawer && rightOpen) ? h("div", { className: "eds-drawer-scrim", onClick: () => { setLeftOpen(false); setRightOpen(false) } }) : null,
        ),
        /* status bar */
        h(
          "div",
          { className: "eds-status", ref: statusRef, tabIndex: -1 },
          h("span", { className: "eds-status-item eds-status-sel", title: activeInfo ? activeInfo.selector : t("statusNoSelection") }, h(Icon, { name: "select", size: 10 }), " ", activeInfo ? selectionPath : t("statusNoSelection"), selection.infos.length > 1 ? " · " + t("selectionMulti", { n: selection.infos.length }) : ""),
          h("span", { className: "eds-status-sep" }),
          h("span", { className: "eds-status-item" }, h("b", null, formatRect(selRect))),
          h("span", { className: "eds-status-sep eds-status-hide" }),
          h("span", { className: "eds-status-item eds-status-hide" }, h("b", null, viewportWidth + "×" + heightForWidth(viewportWidth)), rotate ? " · " + rotate + "°" : ""),
          h("span", { className: "eds-status-sep" }),
          h("span", { className: "eds-status-item" }, t("statusZoom"), " ", h("b", null, fmtPct(zoom))),
          h("span", { className: "eds-status-sep" }),
          h("span", { className: "eds-status-item" }, dirty ? h("b", { style: { color: "var(--dsg-accent)" } }, t("statusDirty")) : h("b", null, t("statusSaved"))),
          h("span", { className: "eds-status-sep eds-status-hide" }),
          h("span", { className: "eds-status-item eds-status-hide" }, h(Chip, { label: bridgeChip.label, tone: bridgeChip.tone, dot: true })),
          h("span", { className: "eds-status-sep" }),
          h("span", { className: "eds-status-item" }, t("statusScore"), " ", h("b", { style: { color: bestScore === null || bestScore === undefined ? undefined : "var(--dsg-" + (scoreTone(bestScore) || "ink-2") + ")" } }, bestScore === null || bestScore === undefined ? "–" : Math.round(Number(bestScore))), bestGrade ? " · " + bestGrade : ""),
          h("span", { className: "eds-status-spacer" }),
          dragState.on ? h("span", { className: "eds-status-item" }, h("b", null, "dx " + Math.round(dragState.dx) + " dy " + Math.round(dragState.dy))) : null,
          h("span", { className: "eds-status-item eds-status-hide" }, hint),
        ),
        /* overlays */
        menu === "export"
          ? h(MenuPopover, {
              label: t("export"),
              style: { right: menuPos.right, top: menuPos.top },
              head: [t("export")],
              items: EXPORT_KINDS.map((item) => ({ id: item.id, icon: item.icon, label: t(item.labelKey), tip: t(item.descKey), onClick: () => { setMenu(""); void runExport(item.id) } })),
            })
          : null,
        menu === "more"
          ? h(MenuPopover, {
              label: t("more"),
              style: { right: menuPos.right, top: menuPos.top },
              head: [t("menuFile")],
              items: [
                { id: "folder", icon: "folderOpen", label: t("openFolder"), onClick: () => { setMenu(""); void openFolder() } },
                { id: "version", icon: "history", label: t("cmdSaveVersion"), onClick: () => { setMenu(""); void saveVersion("") } },
                "-",
                { id: "theme-auto", icon: "monitor", label: t("themeAuto"), active: p.theme && p.theme.preference === "auto", onClick: () => toggleTheme("auto") },
                { id: "theme-light", icon: "sun", label: t("themeLight"), active: p.theme && p.theme.preference === "light", onClick: () => toggleTheme("light") },
                { id: "theme-dark", icon: "moon", label: t("themeDark"), active: p.theme && p.theme.preference === "dark", onClick: () => toggleTheme("dark") },
                "-",
                { id: "copy-id", icon: "copy", label: t("copyProjectId"), onClick: () => { setMenu(""); void copyText(projectId, t("copyDone")) } },
                { id: "diagnostics", icon: "info", label: t("diagnostics"), onClick: () => void showDiagnostics() },
                "-",
                { id: "delete", icon: "trash", label: t("deleteProject"), danger: true, onClick: () => { setMenu(""); setConfirmDelete(true) } },
              ],
            })
          : null,
        h(CommandPalette, { t, open: paletteOpen, onClose: () => setPaletteOpen(false), commands }),
        h(ShortcutsSheet, { t, open: sheetOpen, onClose: () => setSheetOpen(false) }),
        diagnostics
          ? h(Modal, {
              title: t("diagnosticsTitle"),
              icon: "info",
              closeLabel: t("close"),
              onClose: () => setDiagnostics(null),
              children: h("pre", { className: "eds-diagnostics" }, typeof diagnostics === "string" ? diagnostics : JSON.stringify(diagnostics, null, 2)),
              actions: [h(Btn, { key: "copy", size: "sm", variant: "ghost", glyph: "copy", label: t("copy"), onClick: () => void copyText(JSON.stringify(diagnostics, null, 2), t("copyDone")) }), h(Btn, { key: "close", size: "sm", variant: "primary", label: t("close"), onClick: () => setDiagnostics(null) })],
            })
          : null,
        confirmDelete
          ? h(Modal, {
              title: t("deleteProject"),
              icon: "warning",
              closeLabel: t("close"),
              onClose: () => setConfirmDelete(false),
              children: h("p", { style: { margin: 0 } }, t("deleteConfirm")),
              actions: [h(Btn, { key: "cancel", size: "sm", variant: "ghost", label: t("cancel"), onClick: () => setConfirmDelete(false) }), h(Btn, { key: "ok", size: "sm", variant: "danger", label: t("delete"), onClick: () => void removeProject() })],
            })
          : null,
        lightbox ? h(Lightbox, { src: lightbox.src, alt: lightbox.alt, href: lightbox.href, onClose: () => setLightbox(null), openLabel: t("newTab"), closeLabel: t("close") }) : null,
      )
    }
