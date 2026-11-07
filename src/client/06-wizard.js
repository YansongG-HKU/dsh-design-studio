/**
 * 06-wizard - the v1.3 6-step start wizard (FLOW.md §2.2 A). Renders the intake
 * question groups from `GET /api/intake/questions` (or the built-in fallback set),
 * collects answers with per-step "让 Claude 决定" delegation, then creates/updates
 * the project and hands a structured start prompt back to the conversation.
 */

    function WizardField(props) {
      const p = props || {}
      const t = p.t
      const question = p.question || {}
      const type = String(question.type || "text")
      const options = questionOptions(question, t)
      const value = p.value
      const onChange = p.onChange
      let control = null
      if (type === "kind") {
        control = h(
          "div",
          { className: "dsg-wizard-chips", role: "group" },
          options.map((option) =>
            h(
              "button",
              { key: option.value, type: "button", className: "dsg-wizard-chip", "data-active": value === option.value ? "true" : "false", "aria-pressed": value === option.value ? "true" : "false", onClick: () => onChange(option.value) },
              h(Icon, { name: kindMeta(option.value).icon, size: 12 }),
              h("span", null, option.label),
            ),
          ),
        )
      } else if (type === "multiselect" || type === "checkbox-group" || type === "multi") {
        const selected = safeArray(value)
        control = h(
          "div",
          { className: "dsg-wizard-chips", role: "group" },
          options.map((option) => {
            const active = selected.indexOf(option.value) !== -1
            return h(
              "button",
              {
                key: option.value,
                type: "button",
                className: "dsg-wizard-chip",
                "data-active": active ? "true" : "false",
                "aria-pressed": active ? "true" : "false",
                onClick: () => onChange(active ? selected.filter((item) => item !== option.value) : selected.concat([option.value])),
              },
              active ? h(Icon, { name: "check", size: 11 }) : null,
              h("span", null, option.label),
            )
          }),
        )
      } else if (type === "select" || type === "single" || type === "radio") {
        control = h(
          "select",
          { className: "dsg-wizard-input dsg-wizard-select", value: value === undefined || value === null ? "" : String(value), onChange: (event) => onChange(event.target.value) },
          h("option", { value: "" }, "—"),
          options.map((option) => h("option", { key: option.value, value: option.value }, option.label)),
        )
      } else if (type === "range" || type === "slider") {
        const numeric = Number.isFinite(Number(value)) ? clamp(Number(value), 0, 100, 50) : 50
        const labelKey = numeric <= 33 ? "optRangeBasic" : numeric <= 66 ? "optRangeBalanced" : "optRangeBold"
        control = h(
          "div",
          { className: "dsg-wizard-range" },
          h("input", { type: "range", min: 0, max: 100, step: 1, value: numeric, "aria-label": questionText(question, t), onChange: (event) => onChange(Number(event.target.value)) }),
          h("b", null, numeric + " · " + t(labelKey)),
        )
      } else if (type === "boolean" || type === "switch") {
        control = h(Toggle, { checked: Boolean(value), onChange: (next) => onChange(next), label: value ? "true" : "false" })
      } else if (type === "textarea" || type === "long") {
        control = h("textarea", {
          className: "dsg-wizard-input",
          value: value === undefined || value === null ? "" : String(value),
          placeholder: questionText(question, t, "hint"),
          "aria-label": questionText(question, t),
          onChange: (event) => onChange(event.target.value),
          spellCheck: false,
        })
      } else {
        control = h("input", {
          className: "dsg-wizard-input",
          value: value === undefined || value === null ? "" : String(value),
          placeholder: questionText(question, t, "hint"),
          "aria-label": questionText(question, t),
          onChange: (event) => onChange(event.target.value),
          spellCheck: false,
        })
      }
      const label = questionText(question, t)
      const hint = questionText(question, t, "hint")
      return h(
        "div",
        { className: "dsg-wizard-q" },
        h(
          "div",
          { className: "dsg-wizard-qhead" },
          h("span", { className: "dsg-wizard-label" }, label),
          question.required ? h("span", { className: "dsg-wizard-req" }, t("wizardRequired")) : null,
          p.delegated ? h("span", { className: "dsg-wizard-delegated" }, t("wizardDelegated")) : null,
        ),
        hint ? h("p", { className: "dsg-wizard-hint" }, hint) : null,
        control,
      )
    }

    function StartWizard(props) {
      const p = props || {}
      const t = p.t
      const steps = safeArray(p.groups).length > 0 ? p.groups : fallbackIntakeGroups()
      const initial = p.initialAnswers || {}
      const defaults = p.mode === "update" ? {} : { kind: "web", variationsCount: "3" }
      const [state, setState] = useState({ step: 0, answers: Object.assign({}, defaults, initial), delegated: [] })
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState("")
      const total = steps.length
      const step = Math.max(0, Math.min(state.step, total - 1))
      const group = steps[step] || { questions: [] }
      const questions = safeArray(group.questions)
      const isLast = step >= total - 1
      const stepMissing = validateWizardStep(questions, state.answers, state.delegated)
      const allMissing = validateWizardStep(wizardAllQuestions(steps), state.answers, state.delegated)
      const canFinish = allMissing.length === 0
      const progress = Math.round(((step + 1) / Math.max(1, total)) * 100)
      const dispatch = (action) => setState((current) => wizardReduce(current, action))
      const setAnswer = (id, value) => dispatch({ type: "answer", id, value })
      const delegatedSet = safeArray(state.delegated)

      useEffect(() => {
        const onKey = (event) => {
          if (event.key === "Escape" && !busy) {
            event.stopPropagation()
            if (p.onClose) p.onClose()
          }
        }
        window.addEventListener("keydown", onKey, true)
        return () => window.removeEventListener("keydown", onKey, true)
      }, [busy, p.onClose])

      const finish = async (createOnly) => {
        if (busy) return
        if (!canFinish) {
          setError(t("wizardMissing", { n: allMissing.length }))
          return
        }
        setBusy(true)
        setError("")
        try {
          const openQuestions = collectOpenQuestions(steps, state.answers, state.delegated, t)
          const brief = answersToBrief(state.answers)
          const intake = answersToIntake(state.answers, { groups: steps, openQuestions, delegated: state.delegated, source: "wizard" })
          if (p.mode === "update") {
            if (p.onUpdateIntake) await p.onUpdateIntake(intake)
            if (createOnly) {
              if (p.notify) p.notify(t("wizardSavedToProject"))
              if (p.onClose) p.onClose()
              return
            }
            const prompt = buildStartPrompt({ project: p.project || {}, intake, openQuestions })
            if (p.onHandoff) await p.onHandoff(prompt)
            if (p.onClose) p.onClose()
            return
          }
          const created = await p.onCreate({ kind: intake.kind, brief, intake, name: "" })
          if (!created || !created.id) throw new Error(t("unknownError"))
          if (createOnly) {
            if (p.onClose) p.onClose()
            if (p.onOpenProject) await p.onOpenProject(created.id)
            return
          }
          const prompt = buildStartPrompt({ project: created, intake, openQuestions })
          if (p.onHandoff) await p.onHandoff(prompt)
          if (p.onClose) p.onClose()
        } catch (err) {
          setError(t("wizardCreateFailed", { message: messageOf(err) }))
        } finally {
          setBusy(false)
        }
      }

      const stepTitle = group.titleKey ? t(group.titleKey) : group.title || ""
      const sourceHint = p.questionsSource === "fallback" ? t("wizardQuestionsFallback") : ""

      return h(
        "div",
        { className: "dsg-wizard-overlay", onMouseDown: (event) => { if (event.target === event.currentTarget && !busy && p.onClose) p.onClose() } },
        h(
          "div",
          { className: "dsg-wizard", role: "dialog", "aria-modal": "true", "aria-label": t("wizardStart") },
          h(
            "div",
            { className: "dsg-wizard-head" },
            h(
              "div",
              { className: "dsg-wizard-progress" },
              h("span", { className: "dsg-wizard-count" }, t("wizardStepOf", { n: step + 1, total })),
              h("div", { className: "dsg-wizard-track" }, h("div", { className: "dsg-wizard-fill", style: { width: progress + "%" } })),
              h("span", { className: "dsg-wizard-count" }, progress + "%"),
            ),
            h("h2", { className: "dsg-wizard-title" }, h(Icon, { name: "spark", size: 16 }), stepTitle),
            sourceHint ? h("div", { className: "dsg-wizard-sub" }, sourceHint) : null,
            p.mode === "update" ? h("div", { className: "dsg-wizard-sub" }, t("wizardPrefillHint")) : null,
          ),
          h(
            "div",
            { className: "dsg-wizard-body" },
            questions.length === 0
              ? h("p", { className: "dsg-wizard-hint" }, t("wizardNoQuestions"))
              : questions.map((question) =>
                  h(WizardField, {
                    key: question.id,
                    t,
                    question,
                    value: state.answers[question.id],
                    delegated: delegatedSet.indexOf(question.id) !== -1 && !wizardAnsweredQuestion(state.answers, question.id),
                    onChange: (value) => setAnswer(question.id, value),
                  }),
                ),
            error ? h("div", { className: "dsg-wizard-error", role: "alert" }, error) : null,
          ),
          h(
            "div",
            { className: "dsg-wizard-foot" },
            h(Btn, { size: "sm", variant: "ghost", label: t("wizardClose"), disabled: busy, onClick: p.onClose }),
            h(Btn, { size: "sm", variant: "ghost", glyph: "back", label: t("wizardBack"), disabled: busy || step === 0, onClick: () => dispatch({ type: "back" }) }),
            h("span", { className: "dsg-grow", style: { flex: 1 } }),
            stepMissing.length > 0 ? h("span", { className: "dsg-wizard-missing" }, t("wizardMissing", { n: allMissing.length })) : null,
            h(Btn, { size: "sm", variant: "ghost", label: t("wizardSkipStep"), disabled: busy, onClick: () => dispatch({ type: "skipStep", questions }) }),
            !isLast
              ? h(Btn, { size: "sm", variant: "primary", glyph: "chevron", label: t("wizardNext"), disabled: busy, onClick: () => dispatch({ type: "next", total }) })
              : h(
                  react.Fragment,
                  null,
                  h(Btn, { size: "sm", variant: "ghost", label: t("wizardFinishOnly"), disabled: busy || !canFinish, onClick: () => void finish(true) }),
                  h(Btn, { size: "sm", variant: "primary", glyph: "chat", label: busy ? t("saving") : t("wizardFinish"), disabled: busy || !canFinish, onClick: () => void finish(false) }),
                ),
          ),
          h("div", { className: "dsg-wizard-foot", style: { borderTop: 0, paddingTop: 0, background: "transparent" } }, h("span", { className: "dsg-hint", style: { margin: 0 } }, t("wizardWritesHint"))),
        ),
      )
    }
