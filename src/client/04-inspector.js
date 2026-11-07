/**
 * 04-inspector - the v2 right column: Figma/v0-style collapsible property groups
 * (element card, align, position/size, typography with contrast badge, background,
 * layout box model, border, effects, content) plus Tweaks, comments, check results,
 * exports, design system and the version timeline.
 */

    const FONT_STACKS = [
      { label: "默认", value: "" },
      { label: "Fraunces", value: '"Fraunces", Georgia, serif' },
      { label: "Georgia", value: "Georgia, serif" },
      { label: "Inter Tight", value: '"Inter Tight", system-ui, sans-serif' },
      { label: "JetBrains Mono", value: '"JetBrains Mono", ui-monospace, monospace' },
      { label: "System", value: "system-ui, sans-serif" },
    ]

    function splitBox(value) {
      const parts = String(value || "").trim().split(/\s+/).filter(Boolean)
      if (parts.length === 0) return ["", "", "", ""]
      if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]]
      if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]]
      if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]]
      return [parts[0], parts[1], parts[2], parts[3]]
    }

    function joinBox(parts) {
      const list = parts.map((part) => String(part || "").trim())
      if (list.every((part) => part === "")) return ""
      if (list[0] === list[1] && list[0] === list[2] && list[0] === list[3]) return list[0]
      return list.join(" ")
    }

    function PropField(props) {
      const p = props || {}
      return h(
        "label",
        { className: "eds-field" + (p.full ? " eds-field-full" : "") },
        h("span", { className: "eds-field-label" }, p.label),
        h("input", { className: "eds-input", value: p.value === undefined || p.value === null ? "" : String(p.value), readOnly: Boolean(p.readOnly), placeholder: p.placeholder || "", spellCheck: false, "aria-label": p.label, onChange: (event) => p.onChange && p.onChange(event.target.value), style: p.style }),
      )
    }

    function ColorField(props) {
      const p = props || {}
      const value = p.value === undefined || p.value === null ? "" : String(p.value)
      return h(
        "div",
        { className: "eds-field" },
        h("span", { className: "eds-field-label" }, p.label),
        h(
          "div",
          { className: "eds-color" },
          h("input", { type: "color", value: cssColorToHex(value), "aria-label": p.label, onChange: (event) => p.onChange(event.target.value) }),
          h("input", { className: "eds-input", value, "aria-label": p.label + " value", spellCheck: false, onChange: (event) => p.onChange(event.target.value) }),
        ),
      )
    }

    function BoxFields(props) {
      const p = props || {}
      const parts = splitBox(p.value)
      const labels = ["T", "R", "B", "L"]
      return h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 4 } },
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 5 } },
          h("span", { className: "eds-field-label", style: { flex: 1 } }, p.label),
          h(Tbtn, { icon: p.linked ? "link" : "guides", tip: p.linked ? p.t("linkSides") : p.t("linkSides"), active: p.linked, onClick: () => p.onToggleLink && p.onToggleLink() }),
        ),
        h(
          "div",
          { className: "eds-row4" },
          parts.map((part, index) =>
            h("input", {
              key: index,
              className: "eds-input",
              value: part,
              placeholder: labels[index],
              "aria-label": p.label + " " + labels[index],
              spellCheck: false,
              onChange: (event) => {
                const next = parts.slice()
                next[index] = event.target.value
                if (p.linked) {
                  p.onChange([event.target.value, event.target.value, event.target.value, event.target.value].join(" "))
                  return
                }
                p.onChange(joinBox(next))
              },
            }),
          ),
        ),
      )
    }

    function PropertiesTab(props) {
      const p = props || {}
      const t = p.t
      const actions = p.actions
      const info = p.selection
      const [linkedMargin, setLinkedMargin] = useState(false)
      const [linkedPadding, setLinkedPadding] = useState(false)
      if (!info) {
        return h(
          "div",
          { className: "eds-empty-mini" },
          h("b", null, t("noSelectionTitle")),
          t("noSelectionBody"),
          h("div", { style: { marginTop: 10 } }, h(Tbtn, { icon: "select", label: t("modeSelect") + " (E)", tone: "primary", onClick: () => actions.setMode("select") })),
        )
      }
      const styles = info.styles || {}
      const rect = (p.geometry && p.geometry.rect) || info.rect || {}
      const segments = breadcrumbOf(info.selector)
      const classes = safeArray(info.classes)
      const bgColor = parseCssColor(styles.backgroundColor)
      const ratio = bgColor && bgColor.a >= 0.9 ? contrastRatio(styles.color, styles.backgroundColor) : null
      const patch = (key, value) => actions.patchStyles({ [key]: value })
      const fontValue = String(styles.fontFamily || "")
      const fontOptions = FONT_STACKS.slice()
      if (fontValue && fontOptions.every((row) => row.value !== fontValue)) fontOptions.push({ label: fontValue.split(",")[0].replace(/["']/g, ""), value: fontValue })
      return h(
        "div",
        { className: "eds-tabpane" },
        h(
          "div",
          { className: "eds-elem-card" },
          h(
            "div",
            { className: "eds-elem-top" },
            h("span", { className: "dsg-sel-tag" }, info.tag || "element"),
            classes.slice(0, 3).map((name) => h("span", { key: name, className: "dsg-sel-class" }, "." + name)),
            h("span", { className: "dsg-grow", style: { flex: 1 } }),
            h(Tbtn, { icon: "x", tip: t("deselect"), onClick: actions.deselect }),
          ),
          segments.length > 0
            ? h(
                "div",
                { className: "eds-crumb" },
                segments.map((segment, index) =>
                  h(
                    react.Fragment,
                    { key: segment + index },
                    index > 0 ? h("span", { className: "eds-crumb-sep" }, "›") : null,
                    h("button", { type: "button", title: segments.slice(0, index + 1).join(" > "), onClick: () => actions.jumpTo(segments.slice(0, index + 1).join(" > ")) }, segment),
                  ),
                ),
              )
            : null,
          info.text ? h("div", { className: "dsg-sel-text" }, info.text) : null,
          h(
            "div",
            { style: { display: "flex", gap: 3, flexWrap: "wrap" } },
            h(Tbtn, { icon: "target", label: t("copySelector"), onClick: actions.copySelector }),
            h(Tbtn, { icon: "code", label: t("copyCss"), onClick: actions.copyCss }),
            h(Tbtn, { icon: "text", tip: t("editText"), onClick: actions.editable }),
            h(Tbtn, { icon: "duplicate", tip: t("duplicate"), onClick: () => actions.op("duplicate") }),
            h(Tbtn, { icon: "trash", tip: t("deleteElement"), onClick: () => actions.op("delete") }),
          ),
        ),
        h(
          Section,
          { title: t("sectionAlign"), id: "align" },
          h(
            "div",
            { className: "eds-alignbar" },
            [
              ["left", "alignLeft"],
              ["center", "alignCenter"],
              ["right", "alignRight"],
              ["top", "alignTop"],
              ["middle", "alignMiddle"],
              ["bottom", "alignBottom"],
            ].map((row) => h(Tbtn, { key: row[0], icon: row[1], tip: t(row[1]), onClick: () => actions.align(row[0]) })),
          ),
          h("p", { className: "eds-hint", style: { margin: "2px 0 0" } }, t("alignTip")),
        ),
        h(
          Section,
          { title: t("sectionPosition"), id: "position" },
          h(
            "div",
            { className: "eds-row2" },
            h(PropField, { label: t("posX"), value: rect.x === undefined ? "" : Math.round(Number(rect.x)), readOnly: true }),
            h(PropField, { label: t("posY"), value: rect.y === undefined ? "" : Math.round(Number(rect.y)), readOnly: true }),
            h(PropField, { label: t("posW"), value: String(styles.width || (rect.w ? Math.round(rect.w) + "px" : "")), onChange: (value) => patch("width", value) }),
            h(PropField, { label: t("posH"), value: String(styles.height || (rect.h ? Math.round(rect.h) + "px" : "")), onChange: (value) => patch("height", value) }),
          ),
        ),
        h(
          Section,
          { title: t("sectionTypography"), id: "type" },
          h(
            "div",
            { className: "eds-row2" },
            h(
              "label",
              { className: "eds-field" },
              h("span", { className: "eds-field-label" }, t("fontFamily")),
              h(
                "select",
                { className: "eds-input", value: fontValue, "aria-label": t("fontFamily"), onChange: (event) => patch("fontFamily", event.target.value) },
                fontOptions.map((row) => h("option", { key: row.label + row.value, value: row.value }, row.label)),
              ),
            ),
            h(
              "label",
              { className: "eds-field" },
              h("span", { className: "eds-field-label" }, t("fontWeight")),
              h(
                "select",
                { className: "eds-input", value: String(styles.fontWeight || "400"), "aria-label": t("fontWeight"), onChange: (event) => patch("fontWeight", event.target.value) },
                ["300", "400", "500", "600", "700", "800"].map((weight) => h("option", { key: weight, value: weight }, weight)),
              ),
            ),
            h(PropField, { label: t("fontSize"), value: styles.fontSize, onChange: (value) => patch("fontSize", value) }),
            h(PropField, { label: t("lineHeight"), value: styles.lineHeight, onChange: (value) => patch("lineHeight", value) }),
            h(PropField, { label: t("letterSpacing"), value: styles.letterSpacing, onChange: (value) => patch("letterSpacing", value) }),
            h(
              "label",
              { className: "eds-field" },
              h("span", { className: "eds-field-label" }, t("textAlign")),
              h(
                "select",
                { className: "eds-input", value: String(styles.textAlign || "left"), "aria-label": t("textAlign"), onChange: (event) => patch("textAlign", event.target.value) },
                ["left", "center", "right", "justify"].map((align) => h("option", { key: align, value: align }, align)),
              ),
            ),
          ),
          h(ColorField, { label: t("textColor"), value: styles.color, onChange: (value) => patch("color", value) }),
          h(ContrastBadge, { t, ratio }),
          h(
            "div",
            { style: { display: "flex", justifyContent: "flex-end", marginTop: 2 } },
            h(Tbtn, { icon: "refresh", tip: t("styleResetAll"), onClick: () => actions.resetStyles(["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlign", "color"]) }),
          ),
        ),
        h(
          Section,
          { title: t("sectionBackground"), id: "background" },
          h(ColorField, { label: t("bgColor"), value: styles.backgroundColor, onChange: (value) => patch("backgroundColor", value) }),
          h("div", { style: { display: "flex", justifyContent: "flex-end" } }, h(Tbtn, { icon: "refresh", tip: t("resetProperty"), onClick: () => actions.resetStyles(["backgroundColor"]) })),
        ),
        h(
          Section,
          { title: t("sectionLayout"), id: "layout" },
          h(
            "label",
            { className: "eds-field" },
            h("span", { className: "eds-field-label" }, t("displayLabel")),
            h(
              "select",
              { className: "eds-input", value: String(styles.display || ""), "aria-label": t("displayLabel"), onChange: (event) => patch("display", event.target.value) },
              ["", "block", "inline", "inline-block", "flex", "inline-flex", "grid", "none"].map((value) => h("option", { key: value || "default", value }, value || "—")),
            ),
          ),
          h(BoxFields, { t, label: t("marginLabel"), value: styles.margin, linked: linkedMargin, onToggleLink: () => setLinkedMargin((value) => !value), onChange: (value) => patch("margin", value) }),
          h(BoxFields, { t, label: t("paddingLabel"), value: styles.padding, linked: linkedPadding, onToggleLink: () => setLinkedPadding((value) => !value), onChange: (value) => patch("padding", value) }),
          h(PropField, { label: t("gapLabel"), value: styles.gap, onChange: (value) => patch("gap", value) }),
        ),
        h(
          Section,
          { title: t("sectionBorder"), id: "border" },
          h(
            "div",
            { className: "eds-row2" },
            h(PropField, { label: t("borderWidth"), value: styles.borderWidth, onChange: (value) => patch("borderWidth", value) }),
            h(
              "label",
              { className: "eds-field" },
              h("span", { className: "eds-field-label" }, t("borderStyle")),
              h(
                "select",
                { className: "eds-input", value: String(styles.borderStyle || "solid"), "aria-label": t("borderStyle"), onChange: (event) => patch("borderStyle", event.target.value) },
                ["none", "solid", "dashed", "dotted"].map((value) => h("option", { key: value, value }, value)),
              ),
            ),
          ),
          h(ColorField, { label: t("borderColor"), value: styles.borderColor, onChange: (value) => patch("borderColor", value) }),
          h(PropField, { label: t("radiusLabel"), value: styles.borderRadius, onChange: (value) => patch("borderRadius", value) }),
        ),
        h(
          Section,
          { title: t("sectionEffects"), id: "effects" },
          h(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 7 } },
            h("span", { className: "eds-field-label", style: { width: 52, flex: "none" } }, t("styleOpacity")),
            h("input", {
              type: "range",
              min: 0,
              max: 1,
              step: 0.01,
              value: Number.isFinite(Number.parseFloat(styles.opacity)) ? Math.max(0, Math.min(1, Number.parseFloat(styles.opacity))) : 1,
              style: { flex: 1, accentColor: "var(--dsg-accent)" },
              "aria-label": t("styleOpacity"),
              onChange: (event) => patch("opacity", event.target.value),
            }),
            h("span", { className: "dsg-mono", style: { width: 28, textAlign: "right" } }, styles.opacity || "1"),
          ),
          h(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" } },
            h("span", { className: "eds-field-label", style: { width: 52, flex: "none" } }, t("shadowLabel")),
            h(Tbtn, { label: t("shadowNone"), onClick: () => patch("boxShadow", "none") }),
            h(Tbtn, { label: t("shadowSoft"), onClick: () => patch("boxShadow", "0 4px 14px rgba(20, 18, 14, .1)") }),
            h(Tbtn, { label: t("shadowRaised"), onClick: () => patch("boxShadow", "0 12px 32px rgba(20, 18, 14, .18)") }),
          ),
          h(PropField, { label: t("filterLabel"), value: styles.filter, onChange: (value) => patch("filter", value) }),
        ),
        h(
          Section,
          { title: t("sectionContent"), id: "content", defaultOpen: false },
          h(
            "div",
            { style: { display: "flex", gap: 3, flexWrap: "wrap" } },
            h(Tbtn, { icon: "text", label: t("editText"), onClick: actions.editable }),
            h(Tbtn, { icon: "duplicate", label: t("duplicate"), onClick: () => actions.op("duplicate") }),
            h(Tbtn, { icon: "trash", label: t("deleteElement"), onClick: () => actions.op("delete") }),
            h(Tbtn, { icon: "copy", label: t("copyCss"), onClick: actions.copyCss }),
          ),
        ),
      )
    }

    function TweaksTab(props) {
      const p = props || {}
      const t = p.t
      const actions = p.actions
      const state = actions.tweakState || { loading: false, values: {}, error: "" }
      const rows = normalizeTweakRows(state.values)
      useEffect(() => {
        if (!state.loaded && !state.loading) actions.loadTweaks()
      }, [state.loaded, state.loading, actions])
      return h(
        "div",
        { className: "eds-tabpane", style: { padding: 10 } },
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 5, marginBottom: 8 } },
          h("span", { className: "eds-sec-title", style: { flex: 1 } }, t("tweaksTitle")),
          state.file ? h(Chip, { label: state.file }) : null,
          h(Tbtn, { icon: "refresh", tip: t("refresh"), onClick: actions.loadTweaks }),
        ),
        h("p", { className: "eds-hint", style: { margin: "0 0 8px" } }, t("tweaksHint")),
        state.error ? h(Notice, { tone: "err" }, state.error) : null,
        state.loading && rows.length === 0 ? h(Loading, { label: t("loading") }) : null,
        !state.loading && rows.length === 0 && !state.error
          ? h(
              "div",
              null,
              h("div", { className: "eds-tree-empty" }, h("b", null, t("tweaksEmptyTitle")), t("tweaksEmptyBody")),
              h(CodeBlock, { head: "EDITMODE", text: t("tweaksEmptyCode") }),
              h("p", { className: "eds-hint" }, t("tweaksNoHook")),
            )
          : null,
        rows.map((row) =>
          h(
            "div",
            { key: row.key, className: "eds-field", style: { marginBottom: 8 } },
            h("span", { className: "eds-field-label" }, row.key + " · " + t("tweak" + row.type.charAt(0).toUpperCase() + row.type.slice(1))),
            row.type === "boolean"
              ? h(Toggle, { checked: Boolean(row.value), onChange: (value) => actions.setTweak(row.key, value), label: String(row.value) })
              : row.type === "color"
                ? h("div", { className: "eds-color" }, h("input", { type: "color", value: cssColorToHex(row.value), "aria-label": row.key, onChange: (event) => actions.setTweak(row.key, event.target.value) }), h("input", { className: "eds-input", value: String(row.value), onChange: (event) => actions.setTweak(row.key, event.target.value) }))
                : row.type === "number"
                  ? h(
                      "div",
                      { style: { display: "flex", alignItems: "center", gap: 6 } },
                      h("input", { type: "range", min: 0, max: Math.max(10, Math.ceil(Number(row.value) * 2)), step: Number.isInteger(row.value) ? 1 : 0.1, value: Number(row.value) || 0, style: { flex: 1, accentColor: "var(--dsg-accent)" }, "aria-label": row.key, onChange: (event) => actions.setTweak(row.key, Number(event.target.value)) }),
                      h("input", { className: "eds-input", style: { width: 62 }, type: "number", value: Number(row.value) || 0, onChange: (event) => actions.setTweak(row.key, Number(event.target.value)) }),
                    )
                  : h("input", { className: "eds-input", value: String(row.value), onChange: (event) => actions.setTweak(row.key, event.target.value) }),
          ),
        ),
        rows.length > 0
          ? h(
              "div",
              { style: { marginTop: 10 } },
              h(
                "div",
                { style: { display: "flex", alignItems: "center", gap: 5, marginBottom: 5 } },
                h("span", { className: "eds-field-label", style: { flex: 1 } }, t("tweaksRaw")),
                h(CopyButton, { label: t("copy"), copiedLabel: t("copied"), text: JSON.stringify(state.values, null, 2), onCopied: (ok) => actions.notify(ok ? t("toastCopied") : t("toastCopyFailed"), ok ? "ok" : "err") }),
              ),
              h(CodeBlock, { text: JSON.stringify(state.values, null, 2) }),
            )
          : null,
      )
    }

    function CheckTab(props) {
      const p = props || {}
      const t = p.t
      const actions = p.actions
      const job = actions.job
      const running = jobRunning(job)
      const progress = jobProgress(job)
      const check = actions.checkFull
      const rows = checkVariants(check)
      const [selectedVariant, setSelectedVariant] = useState("")
      useEffect(() => {
        if (!check) return
        const list = checkVariants(check)
        if (list.length === 0) return
        if (list.filter((row) => row.variant === selectedVariant).length === 0) setSelectedVariant(list[0].variant)
      }, [check, selectedVariant])
      const row = selectedVariant ? pickCheckVariant(check, selectedVariant) : null
      const categoryList = categoryRows(row || check)
      const viewportList = viewportRows(row || check)
      const findings = row && row.findings && row.findings.length > 0 ? row.findings : findingList(row || check)
      const groups = groupFindings(findings)
      const counts = countFindings(findings)
      const score = row && row.score !== undefined && row.score !== null ? row.score : check && check.score !== undefined ? check.score : null
      const grade = (row && row.grade) || (check && check.grade) || scoreGrade(score)
      const round = actions.latestRound || (check && check.round) || 1
      const browserAvailable = actions.browserAvailable !== false
      const screenshots = []
      if (row) {
        safeArray(row.screenshots).forEach((shot) => {
          if (shot && shot.path) screenshots.push({ path: shot.path, label: shot.width ? shot.width + "px" : "shot" })
        })
        safeArray(row.screens).forEach((screen, index) => {
          if (screen && screen.path) screenshots.push({ path: screen.path, label: screen.label || "screen " + (index + 1) })
        })
      }
      return h(
        "div",
        { className: "eds-tabpane", style: { padding: 10 } },
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 5, marginBottom: 8 } },
          h("span", { className: "eds-sec-title", style: { flex: 1 } }, t("checksTitle")),
          check ? h(Chip, { label: t("checkRound", { n: round }) }) : null,
          h(Tbtn, { icon: "refresh", tip: running ? t("checking") : t("checksRerun"), disabled: running || !browserAvailable, onClick: () => actions.runCheck() }),
        ),
        !browserAvailable ? h(Notice, { tone: "warn" }, t("checkNoBrowser")) : null,
        running
          ? h(
              "div",
              { className: "dsg-card", role: "status", style: { marginBottom: 8 } },
              h("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, h(Spinner), h("span", { className: "dsg-grow", style: { flex: 1 } }, t("checkRunningPhase")), progress.pct !== null ? h("span", { className: "dsg-mono" }, Math.round(progress.pct) + "%") : null),
              progress.pct !== null ? h("div", { className: "dsg-bar", style: { marginTop: 7 } }, h("div", { className: "dsg-bar-fill", "data-tone": "accent", style: { width: Math.max(2, progress.pct) + "%" } })) : null,
              h("div", { className: "eds-hint" }, progress.label || t("checkJobNote")),
            )
          : null,
        !check && !running
          ? actions.latestRound
            ? h(Notice, { tone: "warn" }, t("checkNoFull"))
            : h("div", { className: "eds-tree-empty" }, h("b", null, t("checksEmptyTitle")), t("checksEmptyBody"), h("div", { style: { marginTop: 10 } }, h(Tbtn, { icon: "play", label: t("checksRunBtn"), tone: "primary", disabled: !browserAvailable, onClick: () => actions.runCheck() })))
          : null,
        check
          ? h(
              "div",
              null,
              rows.length > 1
                ? h(
                    "div",
                    { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" } },
                    h(Segmented, { options: rows.map((entry) => ({ id: entry.variant, label: String(entry.variant).toUpperCase() })), value: selectedVariant, onChange: (value) => setSelectedVariant(value), ariaLabel: t("checkVariant") }),
                    check.score !== null && check.score !== undefined ? h(Chip, { label: t("checkOverall") + " " + Math.round(Number(check.score)), tone: scoreTone(check.score) }) : null,
                  )
                : null,
              h(
                "div",
                { className: "dsg-scorecard" },
                h(ScoreRing, { score, size: 64 }),
                h(
                  "div",
                  { style: { flex: 1, minWidth: 0 } },
                  h("div", { style: { display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" } }, h("span", { className: "dsg-grade" }, t("checkGrade") + " " + (grade || "–")), h(Chip, { label: isPassing(score) ? t("checkPass") : t("checkFail"), tone: isPassing(score) ? "ok" : scoreTone(score), dot: true })),
                  h("div", { className: "eds-hint", style: { margin: "2px 0 0" } }, fmtTime(check.at, t)),
                  h("div", { className: "eds-hint", style: { margin: "1px 0 0" } }, t("checkCounts", { c: counts.critical, h: counts.high, m: counts.medium, l: counts.low })),
                ),
              ),
              h("p", { className: "eds-hint", style: { margin: "0 0 8px" } }, t("checkHint")),
            )
          : null,
        categoryList.length > 0
          ? h(
              "div",
              { style: { marginBottom: 10 } },
              h("div", { className: "eds-field-label", style: { marginBottom: 4 } }, t("checkCategories")),
              categoryList.map((category) =>
                h(
                  "div",
                  { key: category.id || category.label, style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 } },
                  h("span", { style: { width: 64, flex: "none", fontSize: 10, color: "var(--dsg-ink-2)" }, title: category.id }, category.label),
                  h(Bar, { value: category.score }),
                  h("span", { className: "dsg-mono", style: { width: 24, textAlign: "right", fontSize: 10 } }, Math.round(category.score)),
                ),
              ),
            )
          : null,
        viewportList.length > 0
          ? h(
              "div",
              { style: { marginBottom: 10 } },
              h("div", { className: "eds-field-label", style: { marginBottom: 4 } }, t("checkViewports")),
              viewportList.map((entry) =>
                h(
                  "div",
                  { key: entry.width, style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 } },
                  h("span", { className: "dsg-mono", style: { width: 52, flex: "none", fontSize: 10 } }, entry.width + "px"),
                  h(Bar, { value: entry.score }),
                  h("span", { className: "dsg-mono", style: { width: 24, textAlign: "right", fontSize: 10 } }, Math.round(entry.score)),
                ),
              ),
            )
          : null,
        groups.length > 0
          ? h(
              "div",
              null,
              h(
                "div",
                { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 3 } },
                h("span", { className: "eds-field-label", style: { flex: 1 } }, t("checkFindings") + " " + findings.length),
                h(Tbtn, {
                  icon: "chat",
                  label: t("fixWithClaude"),
                  onClick: () => {
                    const prompt = buildIssuesPrompt({
                      project: (actions.detail && actions.detail.project) || {},
                      variant: (row && row.variant) || actions.variant || "a",
                      selector: actions.activeInfo ? actions.activeInfo.selector : "",
                      openComments: 0,
                      openIssues: findings.length,
                      issues: findings,
                    })
                    if (actions.handoff) void actions.handoff(prompt)
                  },
                }),
              ),
              groups.map((group) =>
                h(
                  "div",
                  { key: group.severity },
                  h("div", { style: { display: "flex", alignItems: "center", gap: 5, margin: "6px 0 2px" } }, h("span", { className: "dsg-sev", "data-tone": group.meta.tone }, t(group.meta.labelKey)), h("span", { className: "dsg-hint" }, String(group.findings.length))),
                  group.findings.map((finding, index) =>
                    h(
                      "div",
                      { key: (finding.code || "finding") + index, className: "dsg-finding" },
                      h("div", { style: { display: "flex", alignItems: "flex-start", gap: 6 } }, h("span", { className: "dsg-finding-msg" }, finding.message || finding.code || ""), finding.code ? h("span", { className: "dsg-finding-code" }, finding.code) : null),
                      finding.fix ? h("div", { className: "dsg-finding-fix" }, h("b", null, t("checkFix") + " · "), finding.fix) : null,
                      finding.selector ? h("div", { style: { display: "flex", alignItems: "center", gap: 5, marginTop: 3 } }, h("span", { className: "dsg-hint" }, t("checkSelector")), h("button", { type: "button", className: "dsg-selector-chip", title: finding.selector, onClick: () => actions.jumpTo(finding.selector) }, shortSelector(finding.selector, 3))) : null,
                    ),
                  ),
                ),
              ),
            )
          : check
            ? h("p", { className: "eds-hint" }, t("checkNoFindings"))
            : null,
        screenshots.length > 0
          ? h(
              "div",
              { style: { marginTop: 10 } },
              h("div", { className: "eds-field-label", style: { marginBottom: 4 } }, t("checkScreenshots")),
              h(
                "div",
                { className: "dsg-thumbs" },
                screenshots.slice(0, 8).map((shot) =>
                  h(
                    "button",
                    {
                      key: shot.path,
                      type: "button",
                      className: "dsg-thumb",
                      onClick: () => actions.setLightbox({ src: screenshotUrl(actions.projectId, shot.path, round, row ? row.variant : ""), alt: shot.label + " · " + shot.path, href: fileUrl(actions.projectId, shot.path) }),
                    },
                    h("img", { src: screenshotUrl(actions.projectId, shot.path, round, row ? row.variant : ""), alt: shot.label, loading: "lazy" }),
                    h("span", null, shot.label),
                  ),
                ),
              ),
            )
          : null,
      )
    }

    function ExportsTab(props) {
      const p = props || {}
      const t = p.t
      const actions = p.actions
      const exports = safeArray(actions.detail && actions.detail.exports)
      return h(
        "div",
        { className: "eds-tabpane", style: { padding: 10 } },
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 5, marginBottom: 8 } },
          h("span", { className: "eds-sec-title", style: { flex: 1 } }, t("exportsTitle")),
          actions.exporting ? h("span", { style: { display: "flex", alignItems: "center", gap: 5 } }, h(Spinner), h("span", { className: "dsg-hint" }, String(actions.exporting).toUpperCase())) : null,
        ),
        h(
          "div",
          { className: "dsg-export-grid" },
          EXPORT_KINDS.map((item) =>
            h(
              "div",
              { key: item.id, className: "dsg-export-card" },
              h("div", { className: "dsg-export-name" }, h(Icon, { name: item.icon, size: 13 }), t(item.labelKey)),
              h("div", { className: "dsg-export-desc" }, t(item.descKey)),
              h(Tbtn, { icon: "download", label: actions.exporting === item.id ? t("exportingAll", { kind: t(item.labelKey) }) : t("exportRun"), tone: item.id === "html" ? "primary" : undefined, disabled: Boolean(actions.exporting), onClick: () => actions.runExport(item.id) }),
            ),
          ),
        ),
        actions.exportResult
          ? h(
              "div",
              { className: "dsg-card", style: { marginTop: 8 } },
              h("div", { style: { display: "flex", alignItems: "center", gap: 5, marginBottom: 4 } }, h(Icon, { name: "check", size: 12 }), h("b", { style: { fontSize: 11 } }, t("exportResult")), h("span", { className: "dsg-grow", style: { flex: 1 } }), h(Chip, { label: String(actions.exportResult.kind || "").toUpperCase(), tone: "ok" })),
              h("div", { className: "dsg-mono", style: { fontSize: 10, overflowWrap: "anywhere" } }, actions.exportResult.file || ""),
              h(
                "a",
                { className: "dsg-btn", "data-size": "sm", "data-variant": "primary", href: exportFileUrl(actions.projectId, actions.exportResult.file || ""), download: String(actions.exportResult.file || "").split("/").pop(), style: { marginTop: 6 } },
                h(Icon, { name: "download", size: 12 }),
                t("exportDownload"),
              ),
            )
          : null,
        h("div", { className: "eds-field-label", style: { margin: "12px 0 4px" } }, t("exportRecent")),
        exports.length === 0
          ? h("div", { className: "eds-tree-empty", style: { padding: "12px 4px" } }, t("exportEmpty"))
          : exports
              .slice()
              .reverse()
              .slice(0, 12)
              .map((entry, index) =>
                h(
                  "div",
                  { key: (entry.file || "export") + index, className: "dsg-export-row" },
                  h("span", { className: "dsg-export-kind" }, String(entry.kind || "").toUpperCase()),
                  h("a", { className: "dsg-export-file dsg-link", href: exportFileUrl(actions.projectId, entry.file || ""), download: String(entry.file || "").split("/").pop(), title: entry.file }, String(entry.file || "").split("/").pop() || "–"),
                  h("span", { className: "dsg-hint" }, fmtBytes(entry.bytes)),
                  h("span", { className: "dsg-hint" }, fmtTime(entry.at, t)),
                ),
              ),
      )
    }

    function SystemTab(props) {
      const p = props || {}
      const t = p.t
      const actions = p.actions
      const projectId = actions.projectId
      const [system, setSystem] = useState(actions.detail ? actions.detail.system || null : null)
      const [tokensText, setTokensText] = useState("")
      const [tokens, setTokens] = useState(null)
      const [docText, setDocText] = useState("")
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState("")
      const [saving, setSaving] = useState(false)
      const [importKind, setImportKind] = useState("url")
      const [importValue, setImportValue] = useState("")
      const [adopt, setAdopt] = useState(true)
      const [importing, setImporting] = useState(false)

      const readFiles = useCallback(async () => {
        setLoading(true)
        setError("")
        try {
          const result = await apiGet(qs(projectId) + "/system")
          const nextSystem = result.system || null
          setSystem(nextSystem)
          const tokensPath = (nextSystem && nextSystem.tokensPath) || "system/tokens.json"
          const docPath = (nextSystem && nextSystem.docPath) || "system/DESIGN.md"
          try {
            const text = await apiText(qs(projectId) + "/file?path=" + encodeURIComponent(tokensPath))
            const parsed = safeJsonParse(text)
            if (parsed.ok) {
              setTokens(parsed.value)
              setTokensText(JSON.stringify(parsed.value, null, 2))
            } else {
              setTokensText(text)
            }
          } catch (tokenError) {
            setTokens(null)
            setTokensText("")
          }
          try {
            const doc = await apiText(qs(projectId) + "/file?path=" + encodeURIComponent(docPath))
            setDocText(doc)
          } catch (docError) {
            setDocText("")
          }
        } catch (loadError) {
          setError(messageOf(loadError))
        } finally {
          setLoading(false)
        }
      }, [projectId])
      useEffect(() => {
        void readFiles()
      }, [readFiles])

      const saveTokens = async () => {
        const parsed = safeJsonParse(tokensText)
        if (!parsed.ok) {
          setError(t("systemInvalidJSON", { message: parsed.error }))
          return
        }
        setSaving(true)
        try {
          await apiPost(qs(projectId) + "/system", { tokens: parsed.value })
          actions.notify(t("toastSystemSaved"))
          await actions.refreshDetail()
          await readFiles()
        } catch (saveError) {
          setError(messageOf(saveError))
        } finally {
          setSaving(false)
        }
      }
      const runImport = async () => {
        const value = importValue.trim()
        if (!value) return
        setImporting(true)
        setError("")
        try {
          await apiPost(qs(projectId) + "/context", { kind: importKind, value, adoptSystem: adopt })
          actions.notify(t("toastImportDone"))
          setImportValue("")
          await actions.refreshDetail()
          await readFiles()
        } catch (importError) {
          setError(messageOf(importError))
        } finally {
          setImporting(false)
        }
      }
      const colorRows = []
      const color = tokens && tokens.color && typeof tokens.color === "object" ? tokens.color : {}
      Object.keys(color).forEach((key) => {
        if (key === "extra") return
        if (typeof color[key] === "string") colorRows.push({ key, value: color[key] })
      })
      safeArray(color.extra).forEach((value, index) => {
        if (typeof value === "string") colorRows.push({ key: "extra " + (index + 1), value })
      })
      const font = (tokens && tokens.font) || {}
      const sizeScale = (tokens && tokens.size && safeArray(tokens.size.scale)) || []
      const spaceScale = (tokens && tokens.space && safeArray(tokens.space.scale)) || []
      const radiusScale = (tokens && tokens.radius && safeArray(tokens.radius.scale)) || []
      const layout = (tokens && tokens.layout) || {}
      const systemScore = (() => {
        const cats = safeArray(actions.checkFull && actions.checkFull.categories)
        const row = cats.filter((category) => category && category.id === "system")[0]
        return row && Number.isFinite(Number(row.score)) ? Math.round(Number(row.score)) : null
      })()
      return h(
        "div",
        { className: "eds-tabpane", style: { padding: 10 } },
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 5, marginBottom: 8 } },
          h("span", { className: "eds-sec-title", style: { flex: 1 } }, t("systemTitle")),
          systemScore !== null ? h(Chip, { label: t("statusScore") + " " + systemScore, tone: scoreTone(systemScore) }) : null,
          h(Tbtn, { icon: "refresh", tip: t("refresh"), onClick: () => void readFiles() }),
        ),
        error ? h(Notice, { tone: "err" }, error) : null,
        loading ? h(Loading, { label: t("loading") }) : null,
        !loading && !system && !tokens && !docText ? h("div", { className: "eds-tree-empty" }, h("b", null, t("systemEmptyTitle")), t("systemEmptyBody")) : null,
        colorRows.length > 0
          ? h(Section, { title: t("systemColor"), children: h("div", { className: "dsg-token-list" }, colorRows.map((row) => h("button", { key: row.key, type: "button", className: "dsg-swatch", title: row.key + " · " + row.value, onClick: () => actions.notify(t("copyDone")) }, h("i", { className: "dsg-swatch-chip", style: { background: row.value } }), row.value))) })
          : null,
        font.display || font.body || font.mono
          ? h(Section, {
              title: t("systemFont"),
              children: ["display", "body", "mono"].map((role) =>
                font[role]
                  ? h("div", { key: role, style: { marginBottom: 5 } }, h("div", { className: "eds-field-label" }, role), h("div", { className: "dsg-token", style: { fontFamily: font[role].stack || font[role].family || undefined } }, (font[role].family || "–") + " · " + String(font[role].stack || "").slice(0, 40)))
                  : null,
              ),
            })
          : null,
        sizeScale.length + spaceScale.length + radiusScale.length > 0
          ? h(Section, {
              title: t("systemSize") + " / " + t("systemSpace"),
              children: [
                ["size", sizeScale],
                ["space", spaceScale],
                ["radius", radiusScale],
              ].map((pair) => h("div", { key: pair[0], style: { display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 4 } }, h("span", { className: "eds-field-label", style: { width: 42, flex: "none" } }, pair[0]), safeArray(pair[1]).map((value, index) => h("span", { key: pair[0] + index, className: "dsg-token" }, String(value))))),
            })
          : null,
        layout.maxWidth || layout.gutter || safeArray(layout.breakpoints).length > 0
          ? h(Section, {
              title: t("systemLayout"),
              children: h(KV, {
                rows: [
                  [t("systemMaxWidth"), layout.maxWidth ? layout.maxWidth + "px" : "–"],
                  [t("systemGutter"), layout.gutter ? layout.gutter + "px" : "–"],
                  [t("systemBreakpoints"), safeArray(layout.breakpoints).map((width) => width + "px").join(" / ") || "–"],
                ],
              }),
            })
          : null,
        h(
          Section,
          { title: t("systemImportTitle") },
          h(
            "div",
            { style: { display: "flex", gap: 4, marginBottom: 5 } },
            h(
              "select",
              { className: "eds-input", style: { width: "auto" }, value: importKind, onChange: (event) => setImportKind(event.target.value), "aria-label": t("systemImportKind") },
              h("option", { value: "url" }, t("systemImportUrl")),
              h("option", { value: "path" }, t("systemImportPath")),
            ),
          ),
          h("input", { className: "eds-input", placeholder: t("systemImportValuePlaceholder"), value: importValue, onChange: (event) => setImportValue(event.target.value), spellCheck: false }),
          h("div", { style: { margin: "5px 0" } }, h(Toggle, { checked: adopt, onChange: setAdopt, label: t("systemImportAdopt") })),
          h(Tbtn, { icon: importing ? null : "layers", label: importing ? t("systemImporting") : t("systemImportBtn"), tone: "primary", disabled: importing || !importValue.trim(), onClick: () => void runImport() }),
        ),
        h(
          Section,
          {
            title: t("systemTokensJSON"),
            children: [
              h("textarea", { key: "json", className: "eds-input", style: { minHeight: 150, width: "100%", fontFamily: "var(--dsg-mono)", fontSize: 10.5 }, value: tokensText, placeholder: t("systemNoTokens"), onChange: (event) => setTokensText(event.target.value), spellCheck: false }),
              h("div", { key: "save", style: { display: "flex", justifyContent: "flex-end", marginTop: 5 } }, h(Tbtn, { icon: "save", label: saving ? t("systemSaving") : t("systemSaveJson"), tone: "primary", disabled: saving, onClick: () => void saveTokens() })),
            ],
          },
        ),
        h(Section, {
          title: t("systemDoc"),
          defaultOpen: false,
          children: docText ? h("pre", { className: "dsg-doc" }, docText) : h("p", { className: "eds-hint" }, t("systemDocEmpty")),
        }),
      )
    }

    function VersionsTab(props) {
      const p = props || {}
      const t = p.t
      const actions = p.actions
      const versions = safeArray(p.versions)
      const [label, setLabel] = useState("")
      const [saving, setSaving] = useState(false)
      const [confirming, setConfirming] = useState(null)
      const [restoring, setRestoring] = useState(false)
      const submit = async () => {
        if (saving) return
        setSaving(true)
        try {
          await actions.saveVersion(label.trim())
          setLabel("")
        } catch (error) {
          actions.notify(messageOf(error), "err")
        } finally {
          setSaving(false)
        }
      }
      const restore = async () => {
        if (!confirming) return
        setRestoring(true)
        try {
          await actions.restoreVersion(confirming.id)
          setConfirming(null)
        } finally {
          setRestoring(false)
        }
      }
      return h(
        "div",
        { className: "eds-tabpane", style: { padding: 10 } },
        h("div", { className: "eds-field", style: { marginBottom: 8 } }, h("span", { className: "eds-field-label" }, t("versionLabel")), h("input", { className: "eds-input", value: label, placeholder: t("versionLabelPlaceholder"), onChange: (event) => setLabel(event.target.value), onKeyDown: (event) => { if (event.key === "Enter") void submit() }, spellCheck: false })),
        h("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 8 } }, h(Tbtn, { icon: "history", label: saving ? t("versionSaving") : t("versionSaveBtn"), tone: "primary", disabled: saving, onClick: () => void submit() })),
        h("p", { className: "eds-hint", style: { marginBottom: 10 } }, t("versionAutoNote")),
        versions.length === 0
          ? h("div", { className: "eds-tree-empty" }, t("versionEmpty"))
          : versions.slice().reverse().map((version) =>
              h(
                "div",
                { key: version.id, className: "dsg-version-row" },
                h("span", { className: "dsg-pin", style: { background: "var(--dsg-ink)", width: 20, height: 20 } }, String(version.id || "").replace(/^v-?/, "") || "v"),
                h(
                  "div",
                  { style: { flex: 1, minWidth: 0 } },
                  h("div", { className: "dsg-version-label" }, version.label || version.id),
                  h("div", { className: "dsg-hint" }, fmtClock(version.at) + " · " + t("versionFiles", { n: version.files || 0 })),
                ),
                h(Tbtn, { icon: "history", label: t("versionRestore"), onClick: () => setConfirming(version) }),
              ),
            ),
        confirming
          ? h(Modal, {
              title: t("versionRestore"),
              icon: "history",
              closeLabel: t("close"),
              onClose: () => setConfirming(null),
              children: h("p", { style: { margin: 0 } }, t("versionRestoreConfirm", { label: confirming.label || confirming.id })),
              actions: [h(Btn, { key: "cancel", size: "sm", variant: "ghost", label: t("cancel"), onClick: () => setConfirming(null) }), h(Btn, { key: "ok", size: "sm", variant: "primary", label: restoring ? t("versionRestoring") : t("versionRestore"), disabled: restoring, onClick: () => void restore() })],
            })
          : null,
      )
    }

    function RightInspector(props) {
      const p = props || {}
      const t = p.t
      const actions = p.actions
      const tabs = [
        { id: "properties", labelKey: "tabProperties", icon: "sliders" },
        { id: "tweaks", labelKey: "tabTweaks", icon: "palette" },
        { id: "comments", labelKey: "tabComments", icon: "comment", badge: p.badges ? p.badges.comments : 0 },
        { id: "checks", labelKey: "tabChecks", icon: "gauge", badge: p.badges ? p.badges.checks : 0 },
        { id: "exports", labelKey: "tabExports", icon: "download" },
        { id: "system", labelKey: "tabSystem", icon: "layers" },
        { id: "versions", labelKey: "tabVersions", icon: "history" },
      ]
      const tab = p.tab || "properties"
      let body = null
      if (tab === "properties") body = h(PropertiesTab, { t, selection: p.selection, selectionCount: p.selectionCount, geometry: p.geometry, actions })
      else if (tab === "tweaks") body = h(TweaksTab, { t, actions })
      else if (tab === "comments") body = h("div", { style: { padding: 10 } }, h(CommentList, { t, comments: actions.detail ? actions.detail.comments : [], actions, mode: p.mode, onCopyClaude: p.onCopyClaude, onResolve: (id, reply) => void actions.resolveComment(id, reply) }))
      else if (tab === "checks") body = h(CheckTab, { t, actions })
      else if (tab === "exports") body = h(ExportsTab, { t, actions })
      else if (tab === "system") body = h(SystemTab, { t, actions })
      else if (tab === "versions") body = h(VersionsTab, { t, actions, versions: p.versions })
      return h(
        "aside",
        { className: "eds-right", "data-open": p.open === false ? "false" : "true", style: p.style, ref: p.rightRef, "aria-label": t("inspector"), tabIndex: -1 },
        h(
          "div",
          { className: "eds-rtabs", role: "tablist" },
          tabs.map((item) =>
            h(
              "button",
              { key: item.id, type: "button", role: "tab", className: "eds-rtab", "aria-selected": tab === item.id ? "true" : "false", title: t(item.labelKey), onClick: () => p.onTab(item.id) },
              h(Icon, { name: item.icon, size: 12 }),
              h("span", null, t(item.labelKey)),
              item.badge ? h("span", { className: "eds-ltab-badge" }, item.badge > 99 ? "99+" : String(item.badge)) : null,
            ),
          ),
        ),
        h("div", { className: "eds-rbody" }, body),
      )
    }
