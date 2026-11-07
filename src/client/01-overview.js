/**
 * 01-overview - the project library whose first screen is the requirement composer.
 * v1.2 (UX-MAP §5): kind chips + requirement + audience/constraints, primary
 * "保存并去对话" creates the project, copies the structured prompt and hands the
 * panel back to the conversation; secondary "只建项目" opens the workspace.
 */

    const OVERVIEW_EXAMPLES = [
      { zh: "用设计台做一个 SaaS 运营仪表盘落地页，三档方向：规范 / 进阶 / 前卫", en: "Use the design studio to build a SaaS ops dashboard landing page with three directions: spec / advanced / avant-garde" },
      { zh: "从 https://example.com 抓一套设计系统，再把 b 变的强调色改成 #b4552f，质检到 90 分以上", en: "Pull a design system from https://example.com, set variant b's accent to #b4552f and check it to 90+" },
      { zh: "给这个项目补一屏客户评价，保持现有配色和排版，最后导出 PDF", en: "Add a customer-proof screen with the current palette and type, then export a PDF" },
    ]

    function RequirementComposer(props) {
      const p = props || {}
      const t = p.t
      const lang = p.lang === "en" ? "en" : "zh"
      const [kind, setKind] = useState("web")
      const [requirement, setRequirement] = useState("")
      const [audience, setAudience] = useState("")
      const [constraints, setConstraints] = useState("")
      const [busy, setBusy] = useState("")
      const [error, setError] = useState("")
      const textareaRef = useRef(null)

      useEffect(() => {
        if (!p.focusTick) return
        const node = textareaRef.current
        if (node && node.focus) {
          node.focus()
          if (node.scrollIntoView) node.scrollIntoView({ block: "center", behavior: "smooth" })
        }
      }, [p.focusTick])

      const fill = p.fill || { text: "", tick: 0 }
      useEffect(() => {
        if (!fill.tick) return
        setRequirement(String(fill.text || ""))
        const node = textareaRef.current
        if (node && node.focus) {
          node.focus()
          if (node.scrollIntoView) node.scrollIntoView({ block: "center", behavior: "smooth" })
        }
      }, [fill.tick])

      const createProject = async (openWorkspace) => {
        const text = requirement.trim()
        if (!text) {
          setError(t("requirementRequired"))
          const node = textareaRef.current
          if (node && node.focus) node.focus()
          return
        }
        setBusy(openWorkspace ? "open" : "handoff")
        setError("")
        try {
          const project = await p.onCreate({
            kind,
            brief: { goal: text, audience: audience.trim(), constraints: constraints.trim(), layout: "", content: "" },
            scaffold: true,
          })
          if (openWorkspace) {
            if (p.onOpenProject) await p.onOpenProject(project.id)
            return
          }
          const prompt = p.buildPrompt
            ? p.buildPrompt({ project, variant: "a", selection: "", openComments: 0, openIssues: 0, requirement: text })
            : text
          if (p.onHandoff) await p.onHandoff(prompt)
        } catch (e) {
          setError(messageOf(e))
        } finally {
          setBusy("")
        }
      }

      return h(
        "section",
        { className: "dsg-composer-card", "aria-label": t("requirementTitle") },
        h("h2", { className: "dsg-composer-title" }, t(p.titleKey || "requirementTitle")),
        h("p", { className: "dsg-composer-hint" }, t(p.hintKey || "requirementHint")),
        h(
          "div",
          { className: "dsg-kind-chips", role: "group", "aria-label": t("kindLabel") },
          KINDS.map((item) =>
            h(
              "button",
              { key: item.id, type: "button", className: "dsg-kind-chip", "data-active": kind === item.id ? "true" : "false", "aria-pressed": kind === item.id ? "true" : "false", onClick: () => setKind(item.id), title: t(item.hintKey) },
              h(Icon, { name: item.icon, size: 13 }),
              h("span", null, t(item.labelKey)),
            ),
          ),
        ),
        h("textarea", {
          ref: textareaRef,
          className: "dsg-composer-textarea",
          value: requirement,
          placeholder: t("requirementPlaceholder"),
          "aria-label": t("requirementTitle"),
          onChange: (event) => setRequirement(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              void createProject(false)
            }
          },
        }),
        h(
          "div",
          { className: "dsg-composer-row" },
          h(Field, { label: t("audienceOptional") }, h("input", { className: "dsg-input", value: audience, onChange: (event) => setAudience(event.target.value), placeholder: t("briefAudiencePlaceholder"), spellCheck: false })),
          h(Field, { label: t("constraintsOptional") }, h("input", { className: "dsg-input", value: constraints, onChange: (event) => setConstraints(event.target.value), placeholder: t("briefConstraintsPlaceholder"), spellCheck: false })),
        ),
        error ? h(Notice, { tone: "err" }, error) : null,
        h(
          "div",
          { className: "dsg-composer-actions" },
          h(Btn, { variant: "primary", glyph: busy === "handoff" ? null : "chat", label: busy === "handoff" ? t("saving") : t("saveAndChat"), disabled: Boolean(busy), onClick: () => void createProject(false) }),
          h(Btn, { variant: "ghost", glyph: "monitor", label: busy === "open" ? t("creating") : t("createOnly"), disabled: Boolean(busy), onClick: () => void createProject(true) }),
        ),
        h("p", { className: "dsg-composer-note" }, t("sayInChatHint")),
      )
    }

    function ExamplesCard(props) {
      const p = props || {}
      const t = p.t
      const lang = p.lang === "en" ? "en" : "zh"
      return h(
        "section",
        { className: "dsg-examples", "aria-label": t("examplesTitle") },
        h(
          "div",
          { className: "dsg-row", style: { marginBottom: 8 } },
          h("b", { style: { fontSize: 12.5 } }, t("examplesTitle")),
          h("span", { className: "dsg-grow", style: { flex: 1 } }),
          h(Btn, { size: "sm", variant: "primary", glyph: "chat", label: t("goToChat"), onClick: p.onGoChat }),
        ),
        h("p", { className: "dsg-hint", style: { margin: "0 0 8px" } }, t("examplesHint")),
        OVERVIEW_EXAMPLES.map((example, index) =>
          h(
            "button",
            { key: index, type: "button", className: "dsg-example", onClick: () => p.onPick && p.onPick(lang === "en" ? example.en : example.zh) },
            h("span", { className: "dsg-mono", style: { fontSize: 9.5, color: "var(--dsg-ink-3)", marginRight: 6 } }, t("exampleFill")),
            lang === "en" ? example.en : example.zh,
          ),
        ),
      )
    }

    function FlowDiagram(props) {
      const t = props.t
      const steps = [
        { labelKey: "flowRequirement", hintKey: "flowHintRequirement" },
        { labelKey: "flowContext", hintKey: "flowHintContext" },
        { labelKey: "flowVariants", hintKey: "flowHintVariants" },
        { labelKey: "flowCheck", hintKey: "flowHintCheck" },
        { labelKey: "flowExport", hintKey: "flowHintExport" },
      ]
      return h(
        "div",
        { className: "dsg-flow", role: "list", "aria-label": t("flowTitle") },
        steps.map((step, index) =>
          h(
            "div",
            { key: step.labelKey, className: "dsg-flow-step", role: "listitem" },
            h("div", { className: "dsg-flow-num" }, String(index + 1)),
            h("div", { className: "dsg-flow-title" }, t(step.labelKey)),
            h("div", { className: "dsg-flow-hint" }, t(step.hintKey)),
          ),
        ),
      )
    }

    function OnboardingCard(props) {
      const p = props || {}
      const t = p.t
      return h(
        "section",
        { className: "dsg-onboard", "aria-label": t("onboardingTitle") },
        h(
          "div",
          { className: "dsg-onboard-body" },
          h("div", { className: "dsg-onboard-title" }, t("onboardingTitle")),
          h("div", { className: "dsg-hint", style: { margin: 0 } }, t("onboardingBody")),
          h(
            "div",
            { className: "dsg-onboard-steps" },
            h("span", null, t("onboardingStep1")),
            h("span", null, t("onboardingStep2")),
            h("span", null, t("onboardingStep3")),
          ),
          h(
            "div",
            { className: "dsg-onboard-actions" },
            h(Btn, { size: "sm", variant: "primary", glyph: "chat", label: t("goToChat"), onClick: p.onGoChat }),
            h(Btn, { size: "sm", variant: "ghost", glyph: "text", label: t("writeRequirement"), onClick: p.onWrite }),
            h(Btn, { size: "sm", variant: "ghost", label: t("onboardingDismiss"), onClick: p.onDismiss }),
          ),
        ),
        h(Btn, { size: "sm", iconOnly: true, variant: "ghost", glyph: "x", title: t("onboardingSkip"), onClick: p.onDismiss }),
      )
    }

    function ProjectCard(props) {
      const p = props || {}
      const t = p.t
      const project = p.project || {}
      const meta = statusMeta(project.status, t)
      const [confirming, setConfirming] = useState(false)
      const busy = Boolean(p.busy)
      const open = () => {
        if (p.onOpen) p.onOpen(project.id)
      }
      return h(
        "div",
        { className: "dsg-project-card", onClick: open },
        h(
          "div",
          { className: "dsg-project-top" },
          h(
            "button",
            {
              type: "button",
              className: "dsg-project-name-btn",
              onClick: (event) => {
                if (event && event.stopPropagation) event.stopPropagation()
                open()
              },
              "aria-label": (project.name || project.id) + " · " + t("open"),
            },
            h("span", { className: "dsg-project-name", title: project.name }, project.name || project.id),
            h("span", { className: "dsg-project-id" }, project.id || ""),
          ),
          h(
            "div",
            { className: "dsg-project-score", "data-tone": project.bestScore === null || project.bestScore === undefined ? "" : scoreTone(project.bestScore), title: t("best") + " " + (project.bestScore === null || project.bestScore === undefined ? "–" : project.bestScore) },
            project.bestScore === null || project.bestScore === undefined ? "–" : Math.round(Number(project.bestScore)),
          ),
        ),
        h(
          "div",
          { className: "dsg-project-meta" },
          h(Chip, { label: meta.label, tone: meta.tone, dot: true }),
          h(Chip, { label: kindLabel(project.kind, t) }),
          project.variants ? h(Chip, { label: t("variantsCount", { n: project.variants }) }) : null,
          project.comments ? h(Chip, { label: t("commentsCount", { n: project.comments }) }) : null,
        ),
        h(
          "div",
          { className: "dsg-project-meta" },
          h("span", { className: "dsg-grow", style: { flex: 1 } }, t("updatedAt") + " " + fmtTime(project.updatedAt, t)),
          confirming
            ? h(
                "span",
                { className: "dsg-row", style: { gap: 4 }, onClick: (event) => event.stopPropagation() },
                h("span", { className: "dsg-hint", style: { maxWidth: 130 } }, t("deleteConfirm")),
                h(Btn, { size: "sm", variant: "danger", label: t("delete"), disabled: busy, onClick: () => p.onDelete && p.onDelete(project.id) }),
                h(Btn, { size: "sm", variant: "ghost", label: t("cancel"), onClick: () => setConfirming(false) }),
              )
            : h(Btn, {
                size: "sm",
                variant: "ghost",
                glyph: "trash",
                iconOnly: true,
                title: t("deleteProject"),
                onClick: (event) => {
                  if (event && event.stopPropagation) event.stopPropagation()
                  setConfirming(true)
                },
              }),
        ),
      )
    }

    function OverviewPage(props) {
      const p = props || {}
      const t = p.t
      const data = p.data || {}
      const projects = safeArray(data.projects)
      const browser = data.browser || null
      const counts = data.counts || {}
      const [focusTick, setFocusTick] = useState(0)
      const [fill, setFill] = useState({ text: "", tick: 0 })
      const hasBrowserWarning = browser && browser.available === false
      const focusComposer = () => setFocusTick((value) => value + 1)

      return h(
        "div",
        { className: "dsg-content" },
        h(
          "div",
          { className: "dsg-page" },
          p.showOnboarding ? h(OnboardingCard, { t, onGoChat: p.onGoChat, onWrite: focusComposer, onDismiss: p.onDismissOnboarding }) : null,
          h(
            "div",
            { className: "dsg-hero" },
            h(
              "div",
              { className: "dsg-hero-text" },
              h("div", { className: "dsg-kicker" }, t("tagline")),
              h("h1", { className: "dsg-h1", style: { marginTop: 4 } }, t("appSubtitle")),
              h("p", { className: "dsg-sub" }, t("panelHint")),
            ),
            h(
              "div",
              { className: "dsg-row", style: { gap: 6, justifyContent: "flex-end" } },
              h(Chip, { label: t("projectCount", { n: counts.projects !== undefined ? counts.projects : projects.length }) }),
              counts.checked ? h(Chip, { label: t("statusChecked") + " " + counts.checked, tone: "signal" }) : null,
              counts.ready ? h(Chip, { label: t("statusReady") + " " + counts.ready, tone: "ok" }) : null,
              hasBrowserWarning ? h(Chip, { label: t("browserLabel") + " —", tone: "danger", title: t("noBrowser") }) : null,
            ),
          ),
          hasBrowserWarning ? h(Notice, { tone: "warn" }, t("noBrowser")) : null,
          h(
            "button",
            { type: "button", className: "dsg-wizard-entry", onClick: () => p.onOpenWizard && p.onOpenWizard() },
            h("span", { className: "dsg-wizard-entry-icon" }, h(Icon, { name: "spark", size: 18 })),
            h(
              "span",
              { className: "dsg-wizard-entry-text" },
              h("span", { className: "dsg-wizard-entry-title" }, t("wizardStart")),
              h("span", { className: "dsg-wizard-entry-sub" }, t("wizardWritesHint")),
            ),
            h("span", { className: "dsg-wizard-entry-chevron" }, h(Icon, { name: "chevron", size: 16 })),
          ),
          h(RequirementComposer, { t, lang: p.lang, titleKey: "wizardQuick", hintKey: "requirementHint", onCreate: p.onCreate, onHandoff: p.onHandoff, onOpenProject: p.onOpenProject, buildPrompt: p.buildPrompt, focusTick, fill }),
          h(ExamplesCard, { t, lang: p.lang, onPick: (text) => { setFill({ text, tick: fill.tick + 1 }) }, onGoChat: p.onGoChat }),
          h("div", { style: { marginTop: 18 } }, h(FlowDiagram, { t })),
          h(
            "div",
            { className: "dsg-section", style: { marginTop: 24 } },
            h(
              SectionHead,
              {
                title: t("projects"),
                right: h(
                  "div",
                  { className: "dsg-row", style: { gap: 4 } },
                  h(Chip, { label: String(projects.length) }),
                  h(Btn, { size: "sm", variant: "ghost", glyph: "refresh", label: t("refresh"), onClick: p.onRefresh }),
                ),
              },
            ),
            projects.length === 0
              ? h(EmptyState, { icon: "grid", title: t("emptyProjectsTitle"), body: t("emptyProjectsBody") })
              : h("div", { className: "dsg-project-grid" }, projects.map((project) => h(ProjectCard, { key: project.id, project, t, busy: p.busy, onOpen: p.onOpenProject, onDelete: p.onDelete }))),
          ),
          data.dataDir ? h("div", { className: "dsg-footer-note" }, t("dataDir") + " · " + data.dataDir + " · v" + VERSION) : null,
        ),
      )
    }
