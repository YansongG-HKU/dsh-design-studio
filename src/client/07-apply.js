/**
 * 06-apply - panel root: language, theme, routes (projects ↔ editor), data flow,
 * slot + locale registration and the pure helpers exposed to the unit tests.
 */

    function DesignStudioPanel(props) {
      const outerT = typeof props.t === "function" ? props.t : makeT("zh")
      const layout = props.layout && typeof props.layout === "object" ? props.layout : null
      const [lang, setLang] = useState(readLang())
      const t = useMemo(() => makeT(lang), [lang])
      const theme = useThemePreference()
      const [stateData, setStateData] = useState(null)
      const [detail, setDetail] = useState(null)
      const [route, setRoute] = useState({ page: "overview", projectId: "" })
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState("")
      const [notice, setNotice] = useState(null)
      const [sheetOpen, setSheetOpen] = useState(false)
      const [onboarded, setOnboarded] = useState(() => readOnboarded())
      const [intakeGroups, setIntakeGroups] = useState(() => fallbackIntakeGroups())
      const [intakeSource, setIntakeSource] = useState("fallback")
      const [wizard, setWizard] = useState(null)

      useEffect(() => {
        let cancelled = false
        void (async () => {
          try {
            const result = await apiGet("/api/intake/questions")
            if (cancelled) return
            const groups = normalizeIntakeGroups(result.groups || result.questions)
            if (groups.length > 0) {
              setIntakeGroups(groups)
              const fromHost = safeArray(result.groups).length > 0 || safeArray(result.questions).length > 0
              setIntakeSource(fromHost ? "host" : "fallback")
            }
          } catch (e) {
            /* host not ready: keep the built-in fallback question set */
          }
        })()
        return () => {
          cancelled = true
        }
      }, [])

      const notify = useCallback((text, tone) => {
        setNotice({ id: Date.now() + Math.random(), text: String(text || ""), tone: tone === "err" ? "err" : "ok" })
      }, [])

      const goChat = useCallback(() => {
        if (layout && typeof layout.selectPanel === "function") {
          try {
            layout.selectPanel(null)
            notify(t("backToChatToast"))
            return
          } catch (e) {}
        }
        notify(t("backToChatNoLayout"), "err")
      }, [layout, notify, t])

      const dismissOnboarding = useCallback(() => {
        markOnboarded()
        setOnboarded(true)
      }, [])

      const handoff = useCallback(
        async (prompt) => {
          const plan = handoffPlan({ hasLayout: Boolean(layout && typeof layout.selectPanel === "function"), prompt })
          if (!plan.ok) {
            notify(t(plan.toastKey), "err")
            return false
          }
          try {
            if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") throw new Error("no clipboard")
            await navigator.clipboard.writeText(String(prompt))
          } catch (e) {
            notify(t("handoffFailed"), "err")
            return false
          }
          notify(t(plan.toastKey))
          if (plan.switchPanel) {
            try {
              layout.selectPanel(null)
            } catch (e) {}
          }
          return true
        },
        [layout, notify, t],
      )

      const buildPrompt = useCallback((input) => buildHandoffPrompt(input), [])
      const openWizard = useCallback((mode, project) => setWizard({ mode: mode === "create" ? "create" : "update", project: project || null }), [])

      const loadState = useCallback(async () => {
        try {
          const result = await apiGet("/api/state")
          const data = result.data || {}
          setStateData(data)
          setError("")
          return data
        } catch (e) {
          setError(messageOf(e))
          return null
        }
      }, [])

      const loadDetail = useCallback(async (projectId) => {
        if (!projectId) {
          setDetail(null)
          return null
        }
        const result = await apiGet(qs(projectId))
        const next = result.data || null
        setDetail(next)
        return next
      }, [])

      const updateIntake = useCallback(async (intake, projectId) => {
        const id = projectId || (detail && detail.project ? detail.project.id : "")
        if (!id) throw new Error(t("unknownError"))
        await apiPost(qs(id) + "/intake", { intake })
        await loadDetail(id)
        await loadState()
        notify(t("wizardIntakeSaved"))
        return true
      }, [detail, loadDetail, loadState, notify, t])

      useEffect(() => {
        let cancelled = false
        void (async () => {
          setLoading(true)
          await loadState()
          if (!cancelled) setLoading(false)
        })()
        return () => {
          cancelled = true
        }
      }, [loadState])

      useEffect(() => {
        if (!route.projectId) {
          setDetail(null)
          return undefined
        }
        let cancelled = false
        setLoading(true)
        loadDetail(route.projectId)
          .catch((e) => {
            if (!cancelled) setError(messageOf(e))
          })
          .finally(() => {
            if (!cancelled) setLoading(false)
          })
        return () => {
          cancelled = true
        }
      }, [route.projectId, loadDetail])

      useEffect(() => {
        if (!notice) return undefined
        const timer = setTimeout(() => setNotice(null), 3400)
        return () => clearTimeout(timer)
      }, [notice])

      const chooseLang = (next) => {
        if (next === lang) return
        writeLang(next)
        setLang(next)
      }

      const openProject = async (projectId) => setRoute({ page: "editor", projectId })
      const backToProjects = () => {
        setRoute({ page: "overview", projectId: "" })
        void loadState()
      }
      const onCreate = async (input) => {
        const result = await apiPost("/api/projects", input)
        const project = result.project || {}
        if (!project.id) throw new Error(t("unknownError"))
        notify(t("toastCreated"))
        await loadState()
        await openProject(project.id)
        return project
      }
      const onDelete = async (projectId) => {
        try {
          await apiPost(qs(projectId) + "/delete", {})
          notify(t("toastDeleted"))
          setRoute({ page: "overview", projectId: "" })
          setDetail(null)
          await loadState()
        } catch (e) {
          notify(messageOf(e), "err")
        }
      }
      const refreshAll = async () => {
        await loadState()
        if (route.projectId) {
          try {
            await loadDetail(route.projectId)
          } catch (e) {
            notify(messageOf(e), "err")
          }
        }
        notify(t("toastRefreshed"))
      }

      const stateBrowser = (stateData && stateData.browser) || (detail && detail.browser) || null

      let body = null
      if (route.page === "editor") {
        if (!detail) {
          body = h(
            "div",
            { className: "dsg-content" },
            h(
              "div",
              { className: "dsg-page" },
              h(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: 10, maxWidth: 420, margin: "60px auto" } },
                h(Skeleton, { height: 28, width: "60%" }),
                h(Skeleton, { height: 14 }),
                h(Skeleton, { height: 14, width: "80%" }),
                h("div", { style: { marginTop: 8 } }, error ? h(Notice, { tone: "err" }, error) : h(Loading, { label: t("projectDetailLoading") })),
              ),
            ),
          )
        } else {
          body = h(Editor, {
            t,
            lang,
            detail,
            browser: stateBrowser,
            notify,
            reloadDetail: loadDetail,
            refreshState: loadState,
            onBack: backToProjects,
            onDelete,
            onLang: chooseLang,
            onHandoff: handoff,
            onGoChat: goChat,
            onOpenWizard: (mode, project) => openWizard(mode || "update", project || (detail && detail.project)),
            layout,
            theme,
          })
        }
      } else if (!stateData && loading) {
        body = h("div", { className: "dsg-content" }, h("div", { className: "dsg-page" }, h(Loading, { label: t("loading") })))
      } else if (!stateData && error) {
        body = h(
          "div",
          { className: "dsg-content" },
          h(
            "div",
            { className: "dsg-page" },
            h(EmptyState, { icon: "warning", title: t("error"), body: error, action: h(Btn, { variant: "primary", glyph: "refresh", label: t("retry"), onClick: () => void refreshAll() }) }),
          ),
        )
      } else {
        body = h(OverviewPage, {
          t,
          lang,
          data: stateData || {},
          loading,
          onCreate,
          onOpenProject: openProject,
          onDelete,
          onRefresh: () => void refreshAll(),
          onHandoff: handoff,
          onGoChat: goChat,
          buildPrompt,
          showOnboarding: !onboarded,
          onDismissOnboarding: dismissOnboarding,
          onOpenWizard: () => openWizard("create"),
        })
      }

      return h(
        "div",
        { className: "dsg-root", "data-theme": theme.resolved },
        h("style", null, STYLES),
        route.page === "editor" ? (
          body
        ) : (
          h(
            "div",
            { className: "dsg-shell" },
            h(
              "header",
              { className: "dsg-topbar" },
              h(
                "div",
                { className: "dsg-brand" },
                h("div", { className: "dsg-brand-mark" }, h(StudioMark, { size: 17 })),
                h("div", null, h("div", { className: "dsg-brand-title" }, t("appTitle")), h("div", { className: "dsg-brand-sub" }, t("tagline"))),
              ),
              h("div", { className: "dsg-project" }, h("div", { className: "dsg-topbar-sep" }), h("span", { className: "dsg-muted", style: { fontSize: 11.5 } }, t("appSubtitle"))),
              h("span", { className: "dsg-spacer" }),
              h(
                "div",
                { className: "dsg-topbar-actions" },
                stateBrowser && stateBrowser.available === false ? h(Chip, { label: t("browserLabel") + " —", tone: "danger", title: t("noBrowser") }) : null,
                h(Btn, { size: "sm", variant: "ghost", glyph: "refresh", label: t("refresh"), onClick: () => void refreshAll() }),
                h(
                  "div",
                  { className: "dsg-seg", role: "group", "aria-label": "language" },
                  h("button", { type: "button", className: "dsg-seg-btn", "aria-pressed": lang === "zh" ? "true" : "false", onClick: () => chooseLang("zh"), title: "中文" }, "中"),
                  h("button", { type: "button", className: "dsg-seg-btn", "aria-pressed": lang === "en" ? "true" : "false", onClick: () => chooseLang("en"), title: "English" }, "EN"),
                ),
                h(Btn, { size: "sm", variant: "ghost", glyph: "help", label: t("help"), onClick: () => setSheetOpen(true) }),
              ),
            ),
            h("main", { className: "dsg-main" }, body, error ? h("div", { style: { position: "absolute", left: 16, right: 16, top: 60, zIndex: 95 } }, h(Notice, { tone: "err" }, error)) : null),
          )
        ),
        h(ShortcutsSheet, { t, open: sheetOpen, onClose: () => setSheetOpen(false) }),
        wizard
          ? h(StartWizard, {
              t,
              groups: intakeGroups,
              questionsSource: intakeSource,
              mode: wizard.mode,
              project: wizard.project || (detail && detail.project) || null,
              initialAnswers: (() => {
                const source = wizard.project || (detail && detail.project) || {}
                return wizard.mode === "update" && source && source.intake ? answersFromIntake(source.intake) : {}
              })(),
              onCreate,
              onUpdateIntake: (intake) => updateIntake(intake, ((wizard.project || (detail && detail.project)) || {}).id),
              onHandoff: handoff,
              onOpenProject: openProject,
              onClose: () => setWizard(null),
              notify,
            })
          : null,
        notice ? h("div", { className: "dsg-toast", "data-tone": notice.tone, role: "status" }, h(Icon, { name: notice.tone === "err" ? "warning" : "check", size: 13 }), h("span", null, notice.text)) : null,
      )
    }

    /* ------------------------------------------------------------------ */
    /* Plugin registration                                                 */
    /* ------------------------------------------------------------------ */

    return {
      inject: ["slots", "locale", "layout"],
      apply(ctx) {
        ctx.effect(function () {
          return ctx.locale.register(NS, DICTIONARIES)
        }, "dsh-design-studio: dictionaries")
        const t = ctx.locale.bind(NS)

        ctx.slots.inject("sidebar.panellist", function () {
          return ctx.slots.register(
            {
              name: "sidebar.panellist",
              id: NS,
              order: 24,
              label: function () {
                return t("panel")
              },
              locale: NS,
            },
            function (slotProps) {
              const size = slotProps && typeof slotProps.size === "number" ? slotProps.size : 20
              return h(StudioMark, { size })
            },
          )
        })

        ctx.slots.inject("main", function () {
          return ctx.slots.register(
            {
              name: "main",
              key: NS,
              locale: NS,
            },
            function (slotProps) {
              const props = slotProps || {}
              return h(DesignStudioPanel, { t: typeof props.t === "function" ? props.t : t, layout: ctx.layout })
            },
          )
        })
      },
      /** Pure helpers exposed for the headless unit tests (harmless at runtime). */
      __test__: {
        NS,
        VERSION,
        TEXT_ENTRIES,
        DICTIONARIES,
        makeT,
        readLang,
        writeLang,
        scoreGrade,
        scoreTone,
        gradeTone,
        isPassing,
        fmtTime,
        fmtClock,
        fmtBytes,
        fmtDuration,
        fmtPct,
        clampZoom,
        stepZoom,
        fitZoom,
        ZOOM_STEPS,
        ZOOM_MIN,
        ZOOM_MAX,
        ZOOM_PRESETS,
        zoomPresetNext,
        parseZoomInput,
        DEVICE_PRESETS,
        devicePreset,
        pickDeviceForWidth,
        defaultViewports,
        heightForWidth,
        KIND_VIEWPORTS,
        KINDS,
        EXPORT_KINDS,
        shortSelector,
        selectorLabel,
        breadcrumbOf,
        sortComments,
        openCommentCount,
        normalizeTweakRows,
        tweakType,
        groupFindings,
        countFindings,
        findingList,
        categoryRows,
        viewportRows,
        checkVariants,
        pickCheckVariant,
        latestCheckRound,
        variantScore,
        variantLabel,
        statusMeta,
        jobProgress,
        jobRunning,
        safeJsonParse,
        messageOf,
        previewUrl,
        fileUrl,
        exportFileUrl,
        screenshotUrl,
        /* v2 */
        parseCssColor,
        relativeLuminance,
        contrastRatio,
        contrastLevel,
        contrastTone,
        cssFromStyles,
        alignOffset,
        formatRect,
        flattenLayers,
        findLayerAncestors,
        findLayerBySelector,
        countLayers,
        layerLabel,
        layerKey,
        layerMatches,
        iconForTag,
        TAG_ICONS,
        fuzzyScore,
        filterCommands,
        resolveTheme,
        clampPanelWidth,
        normalizeLayout,
        DEFAULT_LAYOUT,
        LEFT_MIN,
        LEFT_MAX,
        RIGHT_MIN,
        RIGHT_MAX,
        THEME_OPTIONS,
        COMMAND_GROUPS,
        readLocalJson,
        writeLocalJson,
        /* v1.2 requirement flow */
        ONBOARD_KEY,
        briefDraftFrom,
        briefIsFilled,
        briefEquals,
        contextChips,
        serializeContext,
        buildHandoffPrompt,
        buildIssuesPrompt,
        buildCommentsPrompt,
        deriveFlow,
        handoffPlan,
        readOnboarded,
        markOnboarded,
        /* v1.3 start wizard + intake */
        fallbackIntakeGroups,
        normalizeIntakeGroups,
        wizardAllQuestions,
        wizardReduce,
        validateWizardStep,
        collectOpenQuestions,
        answersToBrief,
        answersToIntake,
        answersFromIntake,
        mergeIntake,
        intakeCompleteness,
        intakeSummaryGroups,
        buildStartPrompt,
        rangeValueToLabel,
        rangeLabelToValue,
        answerIsSet,
        questionText,
        questionOptions,
      },
    }
  },
})
