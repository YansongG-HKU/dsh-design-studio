/**
 * 03-left-rail - the v2 left column: tab strip (变体 / 图层 / 语境 / 评论) and the
 * four panels. The layers panel is the DOM tree returned by bridge v2 `outline`
 * with search, expand/collapse, hover/select sync and visibility toggles; it shows
 * an explanatory empty state when the bridge only speaks v1.
 */

    function LayerRow(props) {
      const p = props || {}
      const row = p.row
      const node = row.node
      const hidden = node.visible === false
      const indent = 2 + row.depth * 12
      return h(
        "div",
        {
          role: "treeitem",
          "aria-level": row.depth + 1,
          "aria-expanded": row.hasChildren ? (row.expanded ? "true" : "false") : undefined,
          "aria-selected": p.active ? "true" : "false",
          tabIndex: p.focused ? 0 : -1,
          ref: p.rowRef,
          className: "eds-trow",
          "data-active": p.active ? "true" : "false",
          "data-hover": p.hovered ? "true" : "false",
          "data-hidden": hidden ? "true" : "false",
          style: { paddingLeft: indent },
          title: node.selector || "",
          onMouseEnter: () => p.onHover(node.selector),
          onMouseLeave: () => p.onHover(""),
          onClick: () => p.onSelect(node.selector),
          onKeyDown: p.onKeyDown,
        },
        row.hasChildren
          ? h("button", {
              type: "button",
              className: "eds-tcaret",
              tabIndex: -1,
              "aria-label": row.expanded ? p.t("layerCollapse") : p.t("layerExpand"),
              onClick: (event) => {
                if (event && event.stopPropagation) event.stopPropagation()
                p.onToggle(row.key)
              },
            }, h(Icon, { name: row.expanded ? "chevronDown" : "chevron", size: 10 }))
          : h("span", { className: "eds-tcaret" }),
        h("span", { className: "eds-ticon" }, h(Icon, { name: iconForTag(node.tag), size: 12 })),
        h("span", { className: "eds-tlabel" }, layerLabel(node)),
        node.text ? h("span", { className: "eds-tmeta" }, String(node.text).slice(0, 30)) : null,
        h("button", {
          type: "button",
          className: "eds-eye",
          tabIndex: -1,
          "aria-label": hidden ? p.t("layerShow") : p.t("layerHide"),
          "data-tip": hidden ? p.t("layerShow") : p.t("layerHide"),
          onClick: (event) => {
            if (event && event.stopPropagation) event.stopPropagation()
            p.onVisibility(node.selector, hidden)
          },
        }, h(Icon, { name: hidden ? "eyeOff" : "eye", size: 12 })),
      )
    }

    function LayersTab(props) {
      const p = props || {}
      const t = p.t
      const layers = p.layers || { tree: [], count: 0, query: "", expanded: new Set(), loading: true, v1: false }
      const rows = useMemo(() => flattenLayers(layers.tree, { expanded: layers.expanded, query: layers.query }), [layers.tree, layers.expanded, layers.query])
      const [focusIndex, setFocusIndex] = useState(-1)
      const rowRefs = useRef([])
      useEffect(() => {
        setFocusIndex(-1)
      }, [layers.query, layers.v1, layers.tree])

      const focusRow = (index) => {
        if (rows.length === 0) return
        const next = Math.max(0, Math.min(rows.length - 1, index))
        setFocusIndex(next)
        const node = rowRefs.current[next]
        if (node && node.focus) node.focus()
      }
      const parentIndexOf = (index) => {
        const depth = rows[index].depth
        for (let i = index - 1; i >= 0; i -= 1) if (rows[i].depth === depth - 1) return i
        return -1
      }
      const onKeyDown = (event) => {
        if (rows.length === 0) return
        const index = Math.max(0, focusIndex)
        const row = rows[index]
        if (!row) return
        if (event.key === "ArrowDown") {
          event.preventDefault()
          focusRow(index + 1)
        } else if (event.key === "ArrowUp") {
          event.preventDefault()
          focusRow(index - 1)
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          if (row.hasChildren && !row.expanded) p.onToggle(row.key)
          else if (row.hasChildren) focusRow(index + 1)
        } else if (event.key === "ArrowLeft") {
          event.preventDefault()
          if (row.hasChildren && row.expanded) p.onToggle(row.key)
          else focusRow(parentIndexOf(index))
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          p.onSelect(row.node.selector)
        }
      }

      return h(
        "div",
        { className: "eds-tree-tools" },
        h(
          "div",
          { className: "eds-search" },
          h("span", { className: "eds-search-icon" }, h(Icon, { name: "search", size: 13 })),
          h("input", {
            value: layers.query,
            placeholder: t("layersSearch"),
            "aria-label": t("layersSearch"),
            onChange: (event) => p.onQuery(event.target.value),
          }),
        ),
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 4, margin: "6px 2px 0" } },
          h("span", { className: "eds-hint", style: { margin: 0, flex: 1 } }, t("layersCount", { n: layers.count || countLayers(layers.tree) })),
          h(Tbtn, { icon: "refresh", tip: t("refresh"), onClick: p.onRefresh }),
        ),
        layers.v1
          ? h("div", { className: "eds-tree-empty" }, h("b", null, t("layersV1Title")), t("layersV1Body"))
          : layers.loading
            ? h("div", { style: { padding: "10px 2px", display: "flex", flexDirection: "column", gap: 6 } }, h(Skeleton, { height: 18 }), h(Skeleton, { height: 18, width: "88%" }), h(Skeleton, { height: 18, width: "94%" }), h(Skeleton, { height: 18, width: "76%" }))
            : rows.length === 0
              ? h("div", { className: "eds-tree-empty" }, h("b", null, t("layersEmptyTitle")), t("layersEmptyBody"))
              : h(
                  "div",
                  { className: "eds-tree", role: "tree", "aria-label": t("leftLayers"), onKeyDown },
                  rows.map((row, index) =>
                    h(LayerRow, {
                      key: row.key + ":" + index,
                      t,
                      row,
                      active: layers.activeKey === row.node.selector,
                      hovered: p.hoveredSelector === row.node.selector,
                      focused: focusIndex === index,
                      rowRef: (element) => {
                        rowRefs.current[index] = element
                      },
                      onSelect: p.onSelect,
                      onHover: p.onHover,
                      onToggle: p.onToggle,
                      onVisibility: p.onVisibility,
                      onKeyDown: (event) => onKeyDown(event),
                    }),
                  ),
                ),
      )
    }

    function BriefTab(props) {
      const p = props || {}
      const t = p.t
      const project = (p.detail && p.detail.project) || {}
      const saved = briefDraftFrom(p.brief || project.brief)
      const briefKey = JSON.stringify(saved)
      const [draft, setDraft] = useState(saved)
      const [baseline, setBaseline] = useState(saved)
      const [saving, setSaving] = useState(false)
      const [error, setError] = useState("")
      const [requirement, setRequirement] = useState("")
      useEffect(() => {
        const next = briefDraftFrom(p.brief || project.brief)
        setDraft(next)
        setBaseline(next)
      }, [briefKey])
      const dirty = !briefEquals(draft, baseline)
      const context = p.briefContext || {}
      const intake = p.intake || (p.detail && p.detail.project ? p.detail.project.intake : null)
      const completeness = intakeCompleteness(intake)
      const summary = intakeSummaryGroups(intake || {}, t)
      const openIntakeQuestions = safeArray(intake && intake.openQuestions)
      const chips = contextChips(context, t)
      const notify = (text, tone) => {
        if (p.actions && p.actions.notify) p.actions.notify(text, tone)
      }
      const setField = (key) => (event) => {
        const value = event && event.target ? event.target.value : ""
        setDraft((current) => Object.assign({}, current, { [key]: value }))
      }
      const save = async (nextDraft) => {
        if (!p.onSaveBrief) return false
        setSaving(true)
        setError("")
        try {
          const ok = await p.onSaveBrief(nextDraft || draft)
          if (ok) setBaseline(briefDraftFrom(nextDraft || draft))
          return ok
        } catch (err) {
          setError(messageOf(err))
          return false
        } finally {
          setSaving(false)
        }
      }
      const saveOnly = async () => {
        const text = requirement.trim()
        if (!text) {
          notify(t("handoffPromptMissing"), "err")
          return
        }
        const next = Object.assign({}, draft, { goal: draft.goal.trim() ? draft.goal.trim() + "\n\n" + text : text })
        setDraft(next)
        const ok = await save(next)
        if (ok) {
          setRequirement("")
          notify(t("continueSaved"))
        }
      }
      const handoff = async () => {
        const text = requirement.trim()
        if (!text) {
          notify(t("handoffPromptMissing"), "err")
          return
        }
        if (dirty) await save()
        const prompt = buildHandoffPrompt({
          project,
          variant: context.variant || "a",
          selector: context.selector || "",
          openComments: context.openComments || 0,
          openIssues: context.openIssues || 0,
          requirement: text,
        })
        if (p.onHandoff) {
          const ok = await p.onHandoff(prompt)
          if (ok) setRequirement("")
        }
      }
      const field = (key, labelKey, placeholder, multiline) =>
        h(
          "label",
          { className: "eds-field", style: { marginBottom: 7 } },
          h("span", { className: "eds-field-label" }, t(labelKey)),
          multiline
            ? h("textarea", { className: "eds-input", style: { minHeight: 52, width: "100%", fontFamily: "var(--dsg-font)", fontSize: 11.5, lineHeight: 1.5 }, value: draft[key], placeholder, spellCheck: false, onChange: setField(key) })
            : h("input", { className: "eds-input", style: { fontFamily: "var(--dsg-font)", fontSize: 11.5 }, value: draft[key], placeholder, spellCheck: false, onChange: setField(key) }),
        )
      return h(
        "div",
        null,
        h("p", { className: "eds-hint", style: { margin: "2px 2px 8px" } }, t("briefTabHint")),
        h(
          "div",
          { className: "dsg-intake-card" },
          h(
            "div",
            { className: "dsg-intake-head" },
            h(Icon, { name: "spark", size: 12 }),
            h("b", { style: { fontSize: 11 } }, t("intakeSummary")),
            h(Chip, { label: t("intakeCompleteness", { n: completeness.percent }), tone: completeness.percent >= 70 ? "ok" : completeness.percent > 0 ? "warn" : "" }),
            h("span", { style: { flex: 1 } }),
            h(Tbtn, { icon: "text", label: t("intakeRefill"), onClick: () => p.onOpenWizard && p.onOpenWizard("update", p.detail && p.detail.project) }),
          ),
          h("div", { className: "dsg-intake-meter" }, h("i", { style: { width: completeness.percent + "%" } })),
          summary.length === 0
            ? h("p", { className: "eds-hint", style: { margin: "7px 0 0" } }, t("intakeNone"))
            : summary.map((group) =>
                h(
                  "div",
                  { key: group.id, className: "dsg-intake-group" },
                  h("div", { className: "dsg-intake-group-title" }, group.label),
                  h(
                    "div",
                    null,
                    group.items.slice(0, 6).map((item, index) => h("span", { key: group.id + index, className: "dsg-intake-tag", title: String(item) }, String(item).slice(0, 80))),
                  ),
                ),
              ),
          openIntakeQuestions.length > 0 ? h("div", { className: "dsg-intake-open" }, t("intakeOpenQuestions") + "：" + openIntakeQuestions.slice(0, 6).join("；")) : null,
          completeness.percent < 100 ? h("p", { className: "eds-hint", style: { margin: "6px 0 0" } }, t("intakeMissingHint")) : null,
        ),
        !briefIsFilled(draft) ? h("p", { className: "eds-hint", style: { margin: "0 2px 8px", color: "var(--dsg-accent)" } }, t("briefEmptyHint")) : null,
        field("goal", "briefGoal", t("briefGoalPlaceholder"), true),
        field("audience", "briefAudience", t("briefAudiencePlaceholder")),
        field("layout", "briefLayout", t("briefLayoutPlaceholder"), true),
        field("content", "briefContent", t("briefContentPlaceholder"), true),
        field("constraints", "briefConstraints", t("briefConstraintsPlaceholder"), true),
        error ? h(Notice, { tone: "err" }, error) : null,
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 12 } },
          dirty ? h("span", { className: "eds-brief-dirty" }, h(Icon, { name: "info", size: 10 }), t("briefDirty")) : h("span", { className: "dsg-hint", style: { flex: 1 } }, ""),
          h("span", { style: { flex: 1 } }),
          h(Tbtn, { icon: "save", label: saving ? t("briefSaving") : t("briefSave"), tone: "primary", disabled: saving, onClick: () => void save() }),
        ),
        h("div", { style: { borderTop: "1px solid var(--dsg-line)", margin: "2px 0 10px" } }),
        h("div", { className: "eds-sec-title", style: { marginBottom: 3 } }, t("continueTitle")),
        h("p", { className: "eds-hint", style: { margin: "0 0 7px" } }, t("continueHint")),
        h("textarea", {
          className: "eds-input",
          style: { minHeight: 64, width: "100%", fontFamily: "var(--dsg-font)", fontSize: 11.5, lineHeight: 1.5 },
          value: requirement,
          placeholder: t("continuePlaceholder"),
          "aria-label": t("continueTitle"),
          onChange: (event) => setRequirement(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              void handoff()
            }
          },
        }),
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", margin: "7px 0" } },
          h("span", { className: "eds-field-label", style: { width: "100%" } }, t("contextChipsTitle")),
          chips.map((chip) => h(Chip, { key: chip.id, label: chip.label, tone: chip.id === "comments" || chip.id === "issues" ? "warn" : chip.id === "selection" && !chip.value ? "" : "signal" })),
        ),
        h(
          "div",
          { style: { display: "flex", gap: 4, flexWrap: "wrap" } },
          h(Tbtn, { icon: "chat", label: t("copyToClaude"), tone: "primary", disabled: !requirement.trim(), onClick: () => void handoff() }),
          h(Tbtn, { icon: "save", label: saving ? t("briefSaving") : t("saveOnly"), disabled: saving || !requirement.trim(), onClick: () => void saveOnly() }),
        ),
        h("p", { className: "eds-hint", style: { margin: "7px 0 0" } }, t("briefSaveOnlyHint")),
      )
    }

    function VariantsTab(props) {
      const p = props || {}
      const t = p.t
      const variants = safeArray(p.variants)
      const project = (p.detail && p.detail.project) || {}
      return h(
        "div",
        null,
        variants.length === 0
          ? h(
              "div",
              { className: "eds-tree-empty" },
              h("b", null, t("canvasEmpty")),
              h("div", { style: { marginTop: 9 } }, h(Tbtn, { icon: "chat", label: t("generateVariants"), onClick: () => p.onHandoff && p.onHandoff(buildHandoffPrompt({ project, variant: "a", requirement: t("generateVariants") + "：a 规范版、b 进阶版、c 前卫版，真实文案，4/8 间距。" })) })),
            )
          : variants.map((row) =>
              h(
                "button",
                {
                  key: row.id,
                  type: "button",
                  className: "eds-varcard",
                  "data-active": row.id === p.variant ? "true" : "false",
                  "aria-pressed": row.id === p.variant ? "true" : "false",
                  onClick: () => p.onVariant(row.id),
                  title: row.file || row.id,
                },
                h("span", { className: "eds-varkey" }, String(row.id).toUpperCase()),
                h(
                  "span",
                  { style: { minWidth: 0 } },
                  h("span", { className: "eds-varname", style: { display: "block" } }, row.label || variantLabel(project, row.id)),
                  h("span", { className: "eds-varmeta" }, (row.file || row.id + ".html") + (row.bytes ? " · " + fmtBytes(row.bytes) : "")),
                ),
                h(
                  "span",
                  { className: "eds-varscore", "data-tone": variantScore(p.detail, row.id) === null ? "" : scoreTone(variantScore(p.detail, row.id)), style: { color: variantScore(p.detail, row.id) === null ? undefined : "var(--dsg-" + (scoreTone(variantScore(p.detail, row.id)) || "ink-3") + ")" } },
                  variantScore(p.detail, row.id) === null ? "–" : Math.round(Number(variantScore(p.detail, row.id))),
                ),
              ),
            ),
        h("p", { className: "eds-hint" }, t("newVariantHint")),
      )
    }

    function ContextTab(props) {
      const p = props || {}
      const t = p.t
      const [kind, setKind] = useState("url")
      const [value, setValue] = useState("")
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState("")
      const project = (p.detail && p.detail.project) || {}
      const evidence = safeArray(project.context)
      const kinds = [
        { id: "url", labelKey: "contextImportUrl", icon: "link" },
        { id: "path", labelKey: "contextImportPath", icon: "folder" },
        { id: "image", labelKey: "contextImportImage", icon: "image" },
        { id: "text", labelKey: "contextImportText", icon: "text" },
      ]
      const runImport = async () => {
        const next = value.trim()
        if (!next || busy) return
        setBusy(true)
        setError("")
        try {
          const result = await p.actions.importContext({ kind, value: next, adoptSystem: true })
          if (result && result.ok === false) throw new Error(result.error || t("error"))
          p.actions.notify(t("toastImportDone"))
          setValue("")
        } catch (err) {
          setError(messageOf(err))
        } finally {
          setBusy(false)
        }
      }
      return h(
        "div",
        null,
        h("div", { className: "eds-hint", style: { margin: "2px 2px 8px" } }, t("contextImportHint")),
        h(
          "div",
          { style: { display: "flex", gap: 3, marginBottom: 8, flexWrap: "wrap" } },
          kinds.map((item) =>
            h(Tbtn, {
              key: item.id,
              icon: item.icon,
              label: t(item.labelKey),
              active: kind === item.id,
              onClick: () => setKind(item.id),
            }),
          ),
        ),
        h("textarea", {
          className: "eds-input",
          style: { minHeight: 58, width: "100%", fontFamily: "var(--dsg-font)", fontSize: 11.5 },
          value,
          placeholder: t("contextValuePlaceholder"),
          "aria-label": t("contextImportTitle"),
          onChange: (event) => setValue(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              void runImport()
            }
          },
        }),
        error ? h(Notice, { tone: "err" }, error) : null,
        h(
          "div",
          { style: { display: "flex", justifyContent: "flex-end", marginTop: 6 } },
          h(Tbtn, { icon: busy ? null : "plus", label: busy ? t("contextImporting") : t("contextImportBtn"), tone: "primary", disabled: busy || !value.trim(), onClick: () => void runImport() }),
        ),
        h("div", { style: { marginTop: 14 } }, h("div", { className: "eds-sec-title", style: { padding: "0 2px 6px" } }, t("contextEvidence"))),
        evidence.length === 0
          ? h(
              "div",
              { className: "eds-tree-empty", style: { padding: "14px 6px" } },
              t("contextEmpty"),
              h("div", { style: { marginTop: 9 } }, h(Tbtn, { icon: "chat", label: t("addContext"), onClick: () => p.onHandoff && p.onHandoff(buildHandoffPrompt({ project, variant: (safeArray(p.detail && p.detail.variants)[0] || { id: "a" }).id, requirement: "请为这个项目补充语境：导入设计系统 tokens、品牌色与字体，写进 system/ 与 DESIGN.md，再更新三档变体。" })) })),
            )
          : evidence.map((row, index) =>
              h(
                "div",
                { key: (row && (row.id || row.ref)) || index, className: "dsg-card", style: { padding: "8px 9px", marginBottom: 6 } },
                h(
                  "div",
                  { style: { display: "flex", alignItems: "center", gap: 5, marginBottom: 3 } },
                  h(Chip, { label: String((row && row.kind) || "ref") }),
                  h("span", { className: "dsg-hint", style: { marginLeft: "auto" } }, fmtTime(row && row.at, t)),
                ),
                h("div", { className: "dsg-mono", style: { fontSize: 10, overflowWrap: "anywhere" } }, String((row && (row.ref || row.value)) || "@")),
                row && row.note ? h("div", { className: "dsg-hint", style: { marginTop: 3 } }, String(row.note)) : null,
              ),
            ),
      )
    }

    function CommentRow(props) {
      const p = props || {}
      const t = p.t
      const comment = p.comment || {}
      const [replyOpen, setReplyOpen] = useState(false)
      const [reply, setReply] = useState("")
      const resolved = Boolean(comment.resolvedAt)
      return h(
        "div",
        { className: "dsg-comment", "data-resolved": resolved ? "true" : "false" },
        h(
          "div",
          { className: "dsg-comment-head" },
          h("span", { className: "dsg-pin", "data-resolved": resolved ? "true" : "false" }, String(p.index)),
          h(Chip, { label: String(comment.variant || "a").toUpperCase() }),
          h("button", { type: "button", className: "dsg-selector-chip", title: comment.selector || "", onClick: () => p.actions.jumpTo(comment.selector) }, shortSelector(comment.selector || "", 2)),
          h("span", { className: "dsg-grow" }),
          h(Chip, { label: resolved ? t("resolved") : t("commentPending"), tone: resolved ? "ok" : "accent" }),
        ),
        h("div", { className: "dsg-comment-note" }, comment.note || ""),
        h(
          "div",
          { className: "dsg-comment-meta" },
          comment.element && comment.element.text ? h("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 } }, "“" + String(comment.element.text).slice(0, 50) + "”") : null,
          h("span", null, fmtTime(comment.createdAt, t)),
          h("span", { className: "dsg-grow" }),
          h(Tbtn, { icon: "target", tip: t("commentJump"), onClick: () => p.actions.jumpTo(comment.selector) }),
          resolved ? null : h(Tbtn, { icon: "check", tip: t("resolve"), onClick: () => setReplyOpen((value) => !value) }),
        ),
        comment.reply ? h("div", { className: "dsg-reply" }, h("b", null, t("commentReply") + " · "), comment.reply) : null,
        replyOpen && !resolved
          ? h(
              "div",
              { style: { marginTop: 6 } },
              h("textarea", { className: "eds-input", style: { minHeight: 46, width: "100%", fontFamily: "var(--dsg-font)", fontSize: 11.5 }, placeholder: t("replyPlaceholder"), value: reply, onChange: (event) => setReply(event.target.value) }),
              h(
                "div",
                { style: { display: "flex", justifyContent: "flex-end", gap: 4, marginTop: 4 } },
                h(Tbtn, { label: t("cancel"), onClick: () => setReplyOpen(false) }),
                h(Tbtn, { icon: "check", label: t("resolveAndReply"), tone: "primary", onClick: () => p.onResolve(comment.id, reply) }),
              ),
            )
          : null,
      )
    }

    function CommentList(props) {
      const p = props || {}
      const t = p.t
      const comments = safeArray(p.comments)
      const sorted = sortComments(comments)
      const open = openCommentCount(comments)
      const [showResolved, setShowResolved] = useState(false)
      const visible = sorted.filter((comment) => showResolved || !comment.resolvedAt)
      return h(
        "div",
        null,
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 4, marginBottom: 8, flexWrap: "wrap" } },
          h(Chip, { label: open + " / " + comments.length, tone: open > 0 ? "accent" : "ok" }),
          h("span", { className: "dsg-grow", style: { flex: 1 } }),
          h(Tbtn, { icon: showResolved ? "eyeOff" : "eye", tip: showResolved ? t("commentsOpenOnly") : t("commentsShowAll"), onClick: () => setShowResolved((value) => !value) }),
          p.onCopyClaude ? h(Tbtn, { icon: "copy", tip: t("commentsCopyClaude"), onClick: p.onCopyClaude }) : null,
          h(Tbtn, { icon: "comment", tip: t("modeComment"), onClick: () => p.actions.setMode && p.actions.setMode("comment") }),
        ),
        p.mode === "comment" ? h(Notice, { tone: "signal", children: t("commentModeTip") }) : null,
        visible.length === 0
          ? h("div", { className: "eds-tree-empty" }, h("b", null, comments.length === 0 ? t("commentEmptyTitle") : t("commentsNoneOpen")), comments.length === 0 ? t("commentEmptyBody") : "")
          : visible.map((comment, index) => h(CommentRow, { key: comment.id, t, comment, index: sorted.indexOf(comment) + 1, actions: p.actions, onResolve: p.onResolve })),
      )
    }

    function CommentsTab(props) {
      const p = props || {}
      return h(CommentList, { t: p.t, comments: p.comments, actions: p.actions, mode: p.mode, onCopyClaude: p.onCopyClaude, onResolve: p.onResolve })
    }

    function LeftRail(props) {
      const p = props || {}
      const t = p.t
      const tabs = [
        { id: "brief", labelKey: "briefTitle", icon: "spark", badge: 0 },
        { id: "variants", labelKey: "leftVariants", icon: "layers", badge: safeArray(p.variants).length },
        { id: "layers", labelKey: "leftLayers", icon: "grid", badge: p.layers && p.layers.count ? p.layers.count : 0 },
        { id: "context", labelKey: "leftContext", icon: "folder", badge: 0 },
        { id: "comments", labelKey: "leftComments", icon: "comment", badge: p.commentsOpen || 0 },
      ]
      const tab = p.tab || "variants"
      return h(
        "div",
        { className: "eds-left", "data-open": p.open === false ? "false" : "true", style: p.style, ref: p.leftRef, tabIndex: -1 },
        h(
          "div",
          { className: "eds-ltabs", role: "tablist", "aria-label": t("inspector") },
          tabs.map((item) =>
            h(
              "button",
              { key: item.id, type: "button", role: "tab", className: "eds-ltab", "aria-selected": tab === item.id ? "true" : "false", onClick: () => p.onTab && p.onTab(item.id), title: t(item.labelKey) },
              h(Icon, { name: item.icon, size: 13 }),
              h("span", null, t(item.labelKey)),
              item.badge ? h("span", { className: "eds-ltab-badge" }, item.badge > 99 ? "99+" : String(item.badge)) : null,
            ),
          ),
        ),
        h(
          "div",
          { className: "eds-lbody" },
          tab === "brief"
            ? h(BriefTab, {
                t,
                detail: p.detail,
                brief: p.brief || (p.detail && p.detail.project ? p.detail.project.brief : null),
                briefContext: p.briefContext,
                onSaveBrief: p.onSaveBrief,
                onHandoff: p.onHandoff,
                actions: p.actions,
              })
            : tab === "layers"
            ? h(LayersTab, {
                t,
                layers: p.layers,
                hoveredSelector: p.hoveredSelector,
                onQuery: p.onLayerQuery,
                onToggle: p.onLayerToggle,
                onSelect: p.onLayerSelect,
                onHover: p.onLayerHover,
                onVisibility: p.onLayerVisibility,
                onRefresh: p.onRefreshLayers,
              })
            : tab === "context"
              ? h(ContextTab, { t, detail: p.detail, actions: p.actions })
              : tab === "comments"
                ? h(CommentsTab, { t, comments: p.comments, actions: p.actions, mode: p.mode, onCopyClaude: p.onCopyClaude, onResolve: p.onResolveComment })
                : h(VariantsTab, { t, detail: p.detail, variants: p.variants, variant: p.variant, onVariant: p.onVariant }),
        ),
      )
    }
