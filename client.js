/**
 * 00-head - loader wrapper, React requires, protocol constants, zh/en dictionary,
 * inline styles, inline SVG icons, primitives and pure helpers (exported via __test__).
 */
window.__ModuleLoader__.load({
  id: "dsh-design-studio",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" })

    const react = require("react")
    const h = react.createElement
    const { useState, useEffect, useRef, useCallback, useMemo } = react

    /* ------------------------------------------------------------------ */
    /* Identity, protocol constants                                        */
    /* ------------------------------------------------------------------ */

    const NS = "dsh-design-studio"
    const API_BASE = "/dsh-design-studio"
    const REQ_HEADER = "x-dsh-design-studio"
    const VERSION = "1.3.2"
    const LANG_KEY = "dsh-design-studio.lang"

    // Canvas bridge (§5): inbound messages say "ds-canvas", outbound "ds-panel".
    const CANVAS_SOURCE = "ds-canvas"
    const PANEL_SOURCE = "ds-panel"
    const HANDSHAKE_TIMEOUT_MS = 5000
    const SERIALIZE_TIMEOUT_MS = 4000
    const JOB_POLL_MS = 1200
    const TWEEN_PERSIST_MS = 250
    const TWEEN_APPLY_MS = 80

    // One warm accent, one cool signal (§9 visual language).
    const ACCENT = "#b4552f"
    const SIGNAL = "#3f6f6a"

    const ZOOM_MIN = 0.15
    const ZOOM_MAX = 2
    const ZOOM_STEPS = [0.15, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2]

    /* --- v2 editor shell ------------------------------------------------- */
    const THEME_KEY = "dsh-design-studio.theme"
    const LAYOUT_KEY = "dsh-design-studio.layout"
    const ONBOARD_KEY = "dsh-design-studio.onboarded"
    const HANDOFF_TEMPLATE_VERSION = 1
    const DEFAULT_LAYOUT = { left: 248, right: 296, leftCollapsed: false, rightCollapsed: false }
    const LEFT_MIN = 196
    const LEFT_MAX = 420
    const RIGHT_MIN = 240
    const RIGHT_MAX = 480
    const THEME_OPTIONS = ["auto", "light", "dark"]
    const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2]
    const ARTBOARD_SCALE = 0.35
    const ARTBOARD_WIDTH = 1440
    const ALIGN_EDGES = ["left", "center", "right", "top", "middle", "bottom"]
    const TAG_ICONS = {
      div: "layers",
      section: "layers",
      article: "layers",
      main: "layers",
      header: "layers",
      footer: "layers",
      nav: "layers",
      aside: "layers",
      h1: "text",
      h2: "text",
      h3: "text",
      h4: "text",
      h5: "text",
      h6: "text",
      p: "text",
      span: "text",
      label: "text",
      button: "button",
      a: "link",
      img: "image",
      picture: "image",
      video: "image",
      svg: "code",
      ul: "list",
      ol: "list",
      li: "list",
      form: "code",
      input: "code",
      textarea: "code",
      select: "code",
    }
    const COMMAND_GROUPS = ["file", "view", "zoom", "tools", "panels", "check", "export", "theme", "help"]

    const KIND_VIEWPORTS = { web: [1440, 768, 375], mobile: [390, 375], deck: [1920], poster: [1080], doc: [794] }
    const VIEWPORT_HEIGHTS = { 1440: 900, 768: 900, 375: 812, 390: 844, 1920: 1080, 1080: 1080, 794: 1123 }

    const KINDS = [
      { id: "web", labelKey: "kindWeb", hintKey: "kindWebHint", icon: "monitor" },
      { id: "mobile", labelKey: "kindMobile", hintKey: "kindMobileHint", icon: "phone" },
      { id: "deck", labelKey: "kindDeck", hintKey: "kindDeckHint", icon: "slides" },
      { id: "poster", labelKey: "kindPoster", hintKey: "kindPosterHint", icon: "poster" },
      { id: "doc", labelKey: "kindDoc", hintKey: "kindDocHint", icon: "doc" },
    ]

    const DEVICE_PRESETS = {
      browser: { id: "browser", labelKey: "deviceBrowser", chromeHeight: 34, radius: 12, pad: 0 },
      phone: { id: "phone", labelKey: "devicePhone", chromeHeight: 0, radius: 34, pad: 10 },
    }

    const SEVERITY_ORDER = ["critical", "high", "medium", "low"]
    const SEVERITY_META = {
      critical: { labelKey: "severityCritical", tone: "danger", rank: 0 },
      high: { labelKey: "severityHigh", tone: "danger", rank: 1 },
      medium: { labelKey: "severityMedium", tone: "warn", rank: 2 },
      low: { labelKey: "severityLow", tone: "", rank: 3 },
    }

    const EXPORT_KINDS = [
      { id: "html", labelKey: "exportHtml", descKey: "exportHtmlDesc", icon: "code" },
      { id: "zip", labelKey: "exportZip", descKey: "exportZipDesc", icon: "layers" },
      { id: "pdf", labelKey: "exportPdf", descKey: "exportPdfDesc", icon: "doc" },
      { id: "png", labelKey: "exportPng", descKey: "exportPngDesc", icon: "image" },
      { id: "pptx", labelKey: "exportPptx", descKey: "exportPptxDesc", icon: "slides" },
    ]

    /* ------------------------------------------------------------------ */
    /* Dictionary — paired entries keep zh/en exactly in sync (§9)         */
    /* ------------------------------------------------------------------ */

    const TEXT_ENTRIES = [
      ["panel", "设计台", "Design Studio"],
      ["appTitle", "设计台", "Design Studio"],
      ["appSubtitle", "把语境变成可交付的设计", "Turn context into shipped design"],
      ["tagline", "语境 · 三档变体 · 质检 · 导出", "Context · variants · check · export"],
      ["loading", "加载中…", "Loading…"],
      ["refresh", "刷新", "Refresh"],
      ["retry", "重试", "Retry"],
      ["error", "出错了", "Something went wrong"],
      ["save", "保存", "Save"],
      ["cancel", "取消", "Cancel"],
      ["close", "关闭", "Close"],
      ["delete", "删除", "Delete"],
      ["confirm", "确认", "Confirm"],
      ["back", "返回", "Back"],
      ["backToProjects", "返回项目", "Back to projects"],
      ["open", "打开", "Open"],
      ["copy", "复制", "Copy"],
      ["copied", "已复制", "Copied"],
      ["reset", "重置", "Reset"],
      ["apply", "应用", "Apply"],
      ["done", "完成", "Done"],
      ["running", "进行中", "Running"],
      ["failed", "失败", "Failed"],
      ["pending", "待开始", "Pending"],
      ["none", "无", "None"],
      ["optional", "可选", "optional"],
      ["newTab", "新窗口打开", "Open in new tab"],
      ["duration", "耗时", "Duration"],
      ["at", "时间", "Time"],
      ["size", "大小", "Size"],
      ["path", "路径", "Path"],
      ["kindLabel", "类型", "Type"],
      ["unknownError", "请求失败", "Request failed"],
      ["tryAgain", "再试一次", "Try again"],
      ["noData", "暂无数据", "No data yet"],
      ["toastCopied", "已复制", "Copied"],
      ["toastCopyFailed", "复制失败", "Copy failed"],
      ["toastRefreshed", "已刷新", "Refreshed"],
      ["toastOpenFailed", "打开失败：{message}", "Could not open: {message}"],
      ["justNow", "刚刚", "just now"],
      ["minutesAgo", "{n} 分钟前", "{n} min ago"],
      ["hoursAgo", "{n} 小时前", "{n} h ago"],
      ["daysAgo", "{n} 天前", "{n} d ago"],
      ["projects", "项目", "Projects"],
      ["newProject", "新建设计", "New design"],
      ["newProjectTitle", "建立设计项目", "Create a design project"],
      ["create", "开始设计", "Start design"],
      ["creating", "创建中…", "Creating…"],
      ["projectName", "项目名", "Project name"],
      ["projectNamePlaceholder", "例如：运营仪表盘", "e.g. Ops dashboard"],
      ["nameOptional", "项目名（可选）", "Project name (optional)"],
      ["kindWeb", "网页", "Web"],
      ["kindMobile", "移动端", "Mobile"],
      ["kindDeck", "演示稿", "Deck"],
      ["kindPoster", "海报", "Poster"],
      ["kindDoc", "文档", "Doc"],
      ["kindWebHint", "落地页、仪表盘、产品页", "Landing page, dashboard, product page"],
      ["kindMobileHint", "App 原型与移动页面", "App prototype and mobile screens"],
      ["kindDeckHint", "16:9 幻灯片，每屏一页", "16:9 slides, one screen per slide"],
      ["kindPosterHint", "单页海报、信息图", "Single poster or infographic"],
      ["kindDocHint", "单页文档与说明页", "One-page doc or spec sheet"],
      ["briefTitle", "需求", "Requirement"],
      ["briefIntro", "语境优先：写真实的文案与约束，模型才不会靠猜。", "Context first: real copy and constraints stop the model from guessing."],
      ["briefGoal", "目标", "Goal"],
      ["briefGoalHint", "这个设计要完成什么", "What this design must achieve"],
      ["briefGoalPlaceholder", "例如：让新客户在 5 秒内理解产品做什么", "e.g. Let a new visitor understand the product in 5 seconds"],
      ["briefAudience", "受众", "Audience"],
      ["briefAudienceHint", "谁会看、在什么场景看", "Who reads it, and where"],
      ["briefAudiencePlaceholder", "例如：中小企业采购负责人，手机上先看", "e.g. SMB buyers, mostly on mobile"],
      ["briefLayout", "布局", "Layout"],
      ["briefLayoutHint", "版式、栅格、需要出现的内容块", "Layout, grid, required blocks"],
      ["briefLayoutPlaceholder", "例如：顶部导航 + 双栏首屏 + 三列特性", "e.g. Top nav + split hero + three-column features"],
      ["briefContent", "内容", "Content"],
      ["briefContentHint", "真实文案、数据、标题", "Real copy, data, headings"],
      ["briefContentPlaceholder", "标题、卖点、真实数据、CTA 文案", "Headline, proof points, real data, CTA copy"],
      ["briefConstraints", "约束", "Constraints"],
      ["briefConstraintsHint", "品牌、技术、尺寸、禁用项", "Brand, tech, size, forbidden items"],
      ["briefConstraintsPlaceholder", "例如：品牌色 #b4552f、不用轮播、移动端优先", "e.g. Brand colour #b4552f, no carousel, mobile first"],
      ["importSystemHint", "已有设计系统？可在「设计系统」里从 URL 或代码库导入，变体将继承它的 tokens。", "Have a design system? Import it from a URL or repo in the Design system tab; variants inherit its tokens."],
      ["createHint", "创建后会生成 A/B/C 三个变体，并把语境写入 DESIGN.md。", "The project starts with A/B/C variants and writes the brief into DESIGN.md."],
      ["projectCount", "{n} 个项目", "{n} projects"],
      ["variantsCount", "{n} 个变体", "{n} variants"],
      ["commentsCount", "{n} 条评论", "{n} comments"],
      ["best", "最佳", "Best"],
      ["updatedAt", "更新于", "Updated"],
      ["createdAt", "创建于", "Created"],
      ["emptyProjectsTitle", "从语境开始", "Start from context"],
      ["emptyProjectsBody", "设计台把一个项目拆成三步：先定语境，再出三档变体，最后质检与导出。每一步都留下可交付的文件。", "The studio splits a project into three steps: set the context, cut three graded variants, then check and export. Every step leaves a shippable file."],
      ["emptyStep1", "语境", "Context"],
      ["emptyStep2", "三档变体", "Three variants"],
      ["emptyStep3", "质检导出", "Check & export"],
      ["emptyStep1Hint", "目标、受众、内容与约束，写进 DESIGN.md", "Goal, audience, content and constraints, written into DESIGN.md"],
      ["emptyStep2Hint", "A 规范版、B 进阶版、C 前卫版，都是可编辑的 HTML", "A spec, B advanced, C avant-garde, all editable HTML"],
      ["emptyStep3Hint", "0–100 质检分与问题清单，然后导出 HTML/ZIP/PDF/PNG/PPTX", "A 0–100 check with fixes, then export HTML/ZIP/PDF/PNG/PPTX"],
      ["emptyCta", "新建第一个设计", "Create your first design"],
      ["noBrowser", "未找到可用的 Chrome 或 Edge：质检与截图导出不可用。安装浏览器或设置 browserPath 后重启。", "No Chrome or Edge found: checks and screenshot exports are unavailable. Install a browser or set browserPath and restart."],
      ["deleteConfirm", "删除这个项目？design/、评论、质检与导出文件会一起删除。", "Delete this project? design/, comments, checks and exports are removed too."],
      ["deleteProject", "删除项目", "Delete project"],
      ["statusDraft", "草稿", "Draft"],
      ["statusDesigned", "已设计", "Designed"],
      ["statusChecked", "已质检", "Checked"],
      ["statusReady", "可用", "Ready"],
      ["projectDetailLoading", "加载项目…", "Loading project…"],
      ["dataDir", "数据目录", "Data directory"],
      ["browserLabel", "浏览器", "Browser"],
      ["toastCreated", "项目已创建", "Project created"],
      ["toastDeleted", "项目已删除", "Project deleted"],
      ["workspaceHint", "在画布上点选元素即可直接改样式", "Click an element on the canvas to edit its styles"],
      ["variants", "变体", "Variants"],
      ["variantTabHint", "数字键 1–3 切换变体", "Keys 1–3 switch variants"],
      ["context", "语境", "Context"],
      ["viewport", "视口", "Viewport"],
      ["zoom", "缩放", "Zoom"],
      ["fit", "适应", "Fit"],
      ["zoomIn", "放大", "Zoom in"],
      ["zoomOut", "缩小", "Zoom out"],
      ["undo", "撤销", "Undo"],
      ["redo", "重做", "Redo"],
      ["saveBtn", "保存", "Save"],
      ["saving", "保存中…", "Saving…"],
      ["saved", "已保存", "Saved"],
      ["unsaved", "有未保存修改", "Unsaved changes"],
      ["dirtyCount", "{n} 处修改", "{n} edits"],
      ["saveBlockedNoBridge", "画布未就绪，无法保存：预览没有加载。", "Canvas is not ready, so nothing was saved: the preview did not load."],
      ["check", "运行质检", "Run check"],
      ["checking", "质检中…", "Checking…"],
      ["checkStarted", "质检已开始", "Check started"],
      ["checkSavedFirst", "已先保存画布修改", "Saved canvas edits first"],
      ["export", "导出", "Export"],
      ["openInBrowser", "在浏览器打开", "Open in browser"],
      ["saveVersion", "存版本", "Save version"],
      ["inspector", "检查器", "Inspector"],
      ["toggleInspector", "显示检查器", "Show inspector"],
      ["closeInspector", "收起检查器", "Hide inspector"],
      ["mode", "模式", "Mode"],
      ["modeBrowse", "浏览", "Browse"],
      ["modeSelect", "选择", "Select"],
      ["modeComment", "评论", "Comment"],
      ["device", "设备框", "Frame"],
      ["deviceBrowser", "浏览器", "Browser"],
      ["devicePhone", "手机", "Phone"],
      ["bridgeLoading", "预览加载中…", "Loading preview…"],
      ["bridgeReady", "预览已就绪", "Preview ready"],
      ["bridgeTimeout", "预览未加载，检查项目文件后重试", "Preview did not load. Check the project files and retry."],
      ["bridgeNoDom", "画布没有返回 HTML，稍后重试", "The canvas returned no HTML. Try again."],
      ["bridgeNotReady", "画布尚未就绪", "The canvas is not ready yet"],
      ["bridgeError", "画布报错", "Canvas error"],
      ["reloadPreview", "重新加载预览", "Reload preview"],
      ["canvasEmpty", "还没有变体。先让 agent 在 design/ 里写入 a.html，或在「版本」里恢复。", "No variants yet. Have the agent write design/a.html, or restore a version."],
      ["selectHint", "选择模式：点击画布元素查看并修改样式", "Select mode: click an element to inspect and edit it"],
      ["commentHint", "评论模式：点击画布元素留下评论", "Comment mode: click an element to leave a comment"],
      ["browseHint", "浏览模式：画布保持原样，适合看整体效果", "Browse mode: the canvas is untouched"],
      ["canvasStatus", "元素", "Element"],
      ["noSelection", "未选择元素", "No element selected"],
      ["zoomLabel", "{n}%", "{n}%"],
      ["jobRunning", "任务进行中", "Job running"],
      ["jobDone", "任务完成", "Job finished"],
      ["jobFailed", "任务失败", "Job failed"],
      ["cancelJob", "取消任务", "Cancel job"],
      ["jobPhase", "阶段", "Phase"],
      ["screenCount", "{n} 屏", "{n} screens"],
      ["quickKeys", "快捷键", "Shortcuts"],
      ["narrowVariants", "变体", "Variant"],
      ["tabProperties", "属性", "Style"],
      ["tabTweaks", "Tweaks", "Tweaks"],
      ["tabComments", "评论", "Comments"],
      ["tabChecks", "检查", "Check"],
      ["tabExports", "导出", "Export"],
      ["tabSystem", "设计系统", "System"],
      ["tabVersions", "版本", "Versions"],
      ["selectedElement", "选中元素", "Selected element"],
      ["classesLabel", "类", "Classes"],
      ["textLabel", "文本", "Text"],
      ["computedStyles", "计算样式", "Computed styles"],
      ["styleEdits", "快速改样式", "Quick styles"],
      ["deselect", "取消选择", "Deselect"],
      ["breadcrumb", "路径", "Path"],
      ["noSelectionTitle", "还没有选中元素", "Nothing selected"],
      ["noSelectionBody", "按 E 进入选择模式，或在「检查」里点一条问题的选择器。", "Press E for select mode, or click a selector in the Check tab."],
      ["styleColor", "文字色", "Text color"],
      ["styleBackground", "背景", "Background"],
      ["styleFontSize", "字号", "Font size"],
      ["styleFontWeight", "字重", "Weight"],
      ["styleLineHeight", "行高", "Line height"],
      ["styleLetterSpacing", "字距", "Letter spacing"],
      ["styleTextAlign", "对齐", "Align"],
      ["stylePadding", "内边距", "Padding"],
      ["styleMargin", "外边距", "Margin"],
      ["styleBorderRadius", "圆角", "Radius"],
      ["styleWidth", "宽度", "Width"],
      ["styleOpacity", "透明度", "Opacity"],
      ["styleDisplay", "布局", "Display"],
      ["styleGap", "间距", "Gap"],
      ["resetProperty", "恢复此项", "Reset this property"],
      ["textEditHint", "双击画布上的文字可直接编辑", "Double-click text on the canvas to edit it"],
      ["textEdited", "文字已更新", "Text updated"],
      ["elementUnselected", "已取消选择", "Selection cleared"],
      ["computedLabel", "取值", "Value"],
      ["propertyLabel", "属性", "Property"],
      ["styleApplied", "样式已应用", "Style applied"],
      ["tweaksTitle", "Tweaks", "Tweaks"],
      ["tweaksHint", "页面里的 EDITMODE 参数会即时应用并写回文件。", "EDITMODE values apply live and persist to the file."],
      ["tweaksEmptyTitle", "这个页面没有 Tweaks 块", "This page has no tweaks block"],
      ["tweaksEmptyBody", "在 HTML 里加入 EDITMODE 块，就能在这里调参：", "Add an EDITMODE block to the HTML and it shows up here:"],
      ["tweaksEmptyCode", "const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{ \"primaryColor\": \"#b4552f\" }/*EDITMODE-END*/;", "const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{ \"primaryColor\": \"#b4552f\" }/*EDITMODE-END*/;"],
      ["tweaksFile", "文件", "File"],
      ["tweaksCount", "{n} 个参数", "{n} tweaks"],
      ["tweaksRaw", "原始 JSON", "Raw JSON"],
      ["tweaksCopyJson", "复制 JSON", "Copy JSON"],
      ["tweaksPersistFailed", "写回文件失败", "Could not write the file"],
      ["tweaksSaved", "已写回", "Saved to file"],
      ["tweaksNoHook", "页面没有 __dsApplyTweaks，改动会在保存后重载生效。", "The page has no __dsApplyTweaks hook; changes apply after a reload."],
      ["tweaksReload", "重新加载画布", "Reload canvas"],
      ["tweakColor", "颜色", "Color"],
      ["tweakNumber", "数值", "Number"],
      ["tweakBoolean", "开关", "Toggle"],
      ["tweakText", "文本", "Text"],
      ["tweakNoTweaks", "没有可调参数", "No tweaks"],
      ["commentsTitle", "评论", "Comments"],
      ["commentEmptyTitle", "还没有评论", "No comments yet"],
      ["commentEmptyBody", "按 C 进入评论模式，点画布上的元素写第一条。", "Press C for comment mode, then click an element."],
      ["commentPlaceholder", "写下要改什么，越具体越好", "What should change, as specifically as possible"],
      ["commentSaveBtn", "添加评论", "Add comment"],
      ["commentSaved", "评论已添加", "Comment added"],
      ["resolve", "标记解决", "Resolve"],
      ["resolved", "已解决", "Resolved"],
      ["resolveAndReply", "解决并回复", "Resolve with reply"],
      ["replyPlaceholder", "回复（可选）", "Reply (optional)"],
      ["commentResolved", "评论已解决", "Comment resolved"],
      ["commentJump", "定位", "Jump"],
      ["commentPending", "待处理", "Open"],
      ["commentReply", "回复", "Reply"],
      ["commentAllResolved", "全部已解决", "All resolved"],
      ["commentModeTip", "评论模式已开启：点击元素放置评论", "Comment mode: click an element"],
      ["commentTarget", "元素", "Element"],
      ["checksTitle", "质检", "Check"],
      ["checksEmptyTitle", "还没有质检结果", "No check yet"],
      ["checksEmptyBody", "运行质检会截图每个视口、算 0–100 分，并列出要修的问题。", "A check screenshots each viewport, scores 0–100 and lists what to fix."],
      ["checksRunBtn", "运行质检", "Run check"],
      ["checksRerun", "重新质检", "Run again"],
      ["checkScore", "得分", "Score"],
      ["checkGrade", "等级", "Grade"],
      ["checkPass", "可用", "Ready"],
      ["checkFail", "待修", "Needs work"],
      ["checkHint", "分数 ≥ 90 视为可用；先修 critical，再修 high。", "90+ counts as ready. Fix critical first, then high."],
      ["checkCategories", "分类得分", "Category scores"],
      ["checkViewports", "分视口", "By viewport"],
      ["checkFindings", "问题清单", "Findings"],
      ["checkNoFindings", "没有发现问题", "No findings"],
      ["checkSeverity", "严重度", "Severity"],
      ["severityCritical", "致命", "Critical"],
      ["severityHigh", "高", "High"],
      ["severityMedium", "中", "Medium"],
      ["severityLow", "低", "Low"],
      ["checkFix", "修法", "Fix"],
      ["checkCode", "规则", "Rule"],
      ["checkSelector", "选择器", "Selector"],
      ["checkScreenshots", "截图", "Screenshots"],
      ["checkRound", "第 {n} 轮", "Round {n}"],
      ["checkVariant", "变体", "Variant"],
      ["checkAll", "全部变体", "All variants"],
      ["checkOverall", "总分", "Overall"],
      ["checkRunningPhase", "质检进行中", "Check running"],
      ["checkNoBrowser", "没有可用浏览器，无法质检。", "No browser available; checks are unavailable."],
      ["checkCounts", "致命 {c} · 高 {h} · 中 {m} · 低 {l}", "critical {c} · high {h} · medium {m} · low {l}"],
      ["checkJobNote", "质检在后台运行，完成后面板会自动刷新。", "The check runs in the background; the panel refreshes when it finishes."],
      ["checkVariantScore", "本变体得分", "This variant"],
      ["checkNoFull", "这一轮没有可读取的详细结果，重新跑一次质检。", "No readable detail for this round; run the check again."],
      ["toastCheckDone", "质检完成：{score} 分（{grade}）", "Check finished: {score} ({grade})"],
      ["toastCheckFailed", "质检失败：{message}", "Check failed: {message}"],
      ["toastSaveFailed", "保存失败：{message}", "Save failed: {message}"],
      ["toastSaved", "画布已保存", "Canvas saved"],
      ["exportsTitle", "导出", "Export"],
      ["exportHtml", "HTML", "HTML"],
      ["exportZip", "ZIP", "ZIP"],
      ["exportPdf", "PDF", "PDF"],
      ["exportPng", "PNG", "PNG"],
      ["exportPptx", "PPTX", "PPTX"],
      ["exportHtmlDesc", "单文件 HTML，直接交付或部署", "One self-contained HTML file"],
      ["exportZipDesc", "设计目录 + 设计系统 + 项目摘要", "Design folder + system + summary"],
      ["exportPdfDesc", "按预览打印成 PDF", "Print the preview to PDF"],
      ["exportPngDesc", "首视口整页长图", "Full-page screenshot at the first viewport"],
      ["exportPptxDesc", "每屏一页，16:9 幻灯片", "One slide per screen, 16:9"],
      ["exportRun", "导出", "Export"],
      ["exportingAll", "正在导出 {kind}…", "Exporting {kind}…"],
      ["exportDone", "已导出", "Exported"],
      ["exportFailed", "导出失败", "Export failed"],
      ["exportRecent", "最近导出", "Recent exports"],
      ["exportEmpty", "还没有导出文件", "No exports yet"],
      ["exportDownload", "下载", "Download"],
      ["exportSize", "体积", "Size"],
      ["exportKind", "类型", "Kind"],
      ["exportResult", "结果", "Result"],
      ["exportNoBrowser", "这个格式需要浏览器（PDF/PNG/PPTX）。", "This format needs a browser (PDF/PNG/PPTX)."],
      ["toastExportDone", "导出完成", "Export finished"],
      ["systemTitle", "设计系统", "Design system"],
      ["systemEmptyTitle", "还没有设计系统", "No design system yet"],
      ["systemEmptyBody", "从网址、代码库或图片导入 tokens，或在下面直接编辑 JSON。变体与质检都会以它为基准。", "Import tokens from a URL, repo or image, or edit the JSON below. Variants and checks use it as the baseline."],
      ["systemImportTitle", "导入语境", "Import context"],
      ["systemImportKind", "来源", "Source"],
      ["systemImportUrl", "网址", "URL"],
      ["systemImportPath", "代码库路径", "Repo path"],
      ["systemImportValue", "地址", "Address"],
      ["systemImportValuePlaceholder", "https://example.com 或 F:\\path\\to\\repo", "https://example.com or F:\\path\\to\\repo"],
      ["systemImportHint", "网址会用浏览器取计算样式；路径会扫描 css/js 与 tailwind 配置。", "A URL is probed with the browser; a path scans css/js and tailwind config."],
      ["systemImportAdopt", "同时设为项目设计系统", "Also adopt as the project system"],
      ["systemImportBtn", "导入", "Import"],
      ["systemImporting", "导入中…", "Importing…"],
      ["systemImportDone", "已导入", "Imported"],
      ["systemTokensJSON", "Tokens JSON", "Tokens JSON"],
      ["systemSaveJson", "保存 tokens", "Save tokens"],
      ["systemSaving", "保存中…", "Saving…"],
      ["systemSaved", "设计系统已保存", "Design system saved"],
      ["systemInvalidJSON", "JSON 解析失败：{message}", "Invalid JSON: {message}"],
      ["systemDoc", "DESIGN.md", "DESIGN.md"],
      ["systemDocHint", "给 agent 的一页设计系统说明，只读。", "The one-page system doc for the agent, read-only."],
      ["systemDocEmpty", "还没有 DESIGN.md", "No DESIGN.md yet"],
      ["systemColor", "颜色", "Colors"],
      ["systemFont", "字体", "Fonts"],
      ["systemSize", "字号", "Sizes"],
      ["systemSpace", "间距", "Spacing"],
      ["systemRadius", "圆角", "Radii"],
      ["systemLayout", "布局", "Layout"],
      ["systemMaxWidth", "最大宽度", "Max width"],
      ["systemGutter", "边距", "Gutter"],
      ["systemBreakpoints", "断点", "Breakpoints"],
      ["systemNotes", "说明", "Notes"],
      ["systemNoTokens", "还没有 tokens", "No tokens"],
      ["systemSource", "来源", "Source"],
      ["systemUpdated", "更新于", "Updated"],
      ["toastSystemSaved", "设计系统已保存", "Design system saved"],
      ["toastImportDone", "语境已导入", "Context imported"],
      ["versionsTitle", "版本", "Versions"],
      ["versionSaveTitle", "存一个版本", "Save a version"],
      ["versionLabel", "版本标签", "Label"],
      ["versionLabelPlaceholder", "例如：第一版提案", "e.g. First proposal"],
      ["versionSaveBtn", "存版本", "Save version"],
      ["versionSaving", "保存中…", "Saving…"],
      ["versionSaved", "版本已保存", "Version saved"],
      ["versionEmpty", "还没有版本。", "No versions yet."],
      ["versionRestore", "恢复", "Restore"],
      ["versionRestoring", "恢复中…", "Restoring…"],
      ["versionRestoreConfirm", "恢复到 {label}？当前 design/ 会先存成一个新版本。", "Restore {label}? The current design/ is saved as a new version first."],
      ["versionRestored", "已恢复", "Restored"],
      ["versionFiles", "{n} 个文件", "{n} files"],
      ["versionAutoNote", "每次保存画布也会进 history/，面板保存前会自动留底。", "Canvas saves also land in history/; the panel keeps a copy before overwriting."],
      ["toastVersionSaved", "版本已保存", "Version saved"],
      ["toastRestored", "版本已恢复", "Version restored"],
      ["help", "帮助", "Help"],
      ["helpTitle", "快捷操作", "Shortcuts"],
      ["helpRegions", "F6 / Shift+F6 在顶栏、画布、检查器之间切换焦点", "F6 / Shift+F6 move focus between topbar, canvas and inspector"],
      ["helpSave", "⌘/Ctrl + S 保存画布", "⌘/Ctrl + S save the canvas"],
      ["helpUndo", "⌘/Ctrl + Z 撤销画布编辑", "⌘/Ctrl + Z undo canvas edits"],
      ["helpRedo", "⇧⌘/Ctrl + Z 重做", "⇧⌘/Ctrl + Z redo"],
      ["helpEscape", "Esc 取消选择或关闭浮层", "Esc deselect or close overlays"],
      ["helpVariants", "1 / 2 / 3 切换变体", "1 / 2 / 3 switch variants"],
      ["helpSelect", "E 选择模式", "E select mode"],
      ["helpComment", "C 评论模式", "C comment mode"],
      ["helpFit", "0 适应画布", "0 fit the canvas"],
      ["helpZoom", "+ / − 缩放", "+ / − zoom"],
      ["helpNote", "输入框内不触发画布快捷键；焦点在预览画布内时，Esc 与方向键由画布本身处理。", "Canvas shortcuts are ignored while typing; when focus is inside the preview, the canvas itself handles Esc and arrow keys."],
      ["helpCanvasTitle", "画布", "Canvas"],
      ["helpCanvasBody", "选择模式下单击选中，双击文字直接编辑；评论模式下单击放评论钉。", "In select mode click to select, double-click text to edit; in comment mode click to drop a pin."],
      ["panelHint", "设计台读取项目的 design/ 目录并在画布中渲染。", "The studio renders design/ files from the project into the canvas."],
      ["dialogConfirmTitle", "确认操作", "Confirm"],
      ["noPreviewUrl", "预览地址不可用：{message}", "Preview URL unavailable: {message}"],

      /* ---- v2 editor shell ------------------------------------------- */
      ["renameHint", "双击改名，Enter 保存，Esc 取消", "Double-click to rename · Enter saves · Esc cancels"],
      ["renamePlaceholder", "项目名", "Project name"],
      ["more", "更多", "More"],
      ["menuFile", "项目", "Project"],
      ["openFolder", "打开项目目录", "Open project folder"],
      ["diagnostics", "诊断信息", "Diagnostics"],
      ["copyProjectId", "复制项目 ID", "Copy project ID"],
      ["deleteProjectConfirmShort", "删除项目", "Delete project"],
      ["viewCanvas", "画布", "Canvas"],
      ["viewArtboards", "画板", "Artboards"],
      ["scoreChipTip", "查看检查结果", "Open check results"],
      ["theme", "主题", "Theme"],
      ["themeAuto", "跟随系统", "Auto"],
      ["themeLight", "浅色", "Light"],
      ["themeDark", "深色", "Dark"],
      ["toolSelect", "选择", "Select"],
      ["toolComment", "评论", "Comment"],
      ["inspectorToggle", "属性面板", "Properties panel"],
      ["viewportCustom", "自定义宽度", "Custom width"],
      ["rotate", "旋转 90°", "Rotate 90°"],
      ["rotateReset", "复位旋转", "Reset rotation"],
      ["zoomFitSelection", "适应选中", "Fit selection"],
      ["oneToOne", "1:1", "1:1"],
      ["rulers", "标尺", "Rulers"],
      ["grid", "8px 网格", "8px grid"],
      ["columns", "12 列参考线", "12-column guides"],
      ["guides", "对齐参考线", "Snap guides"],
      ["saveHint", "保存画布 (⌘S)", "Save canvas (⌘S)"],
      ["leftVariants", "变体", "Variants"],
      ["leftLayers", "图层", "Layers"],
      ["leftContext", "语境", "Context"],
      ["leftComments", "评论", "Comments"],
      ["layersSearch", "搜索图层", "Search layers"],
      ["layersCount", "{n} 个图层", "{n} layers"],
      ["layersEmptyTitle", "没有图层", "No layers"],
      ["layersEmptyBody", "在画布上点选元素、切换到选择工具，或等预览加载完成。", "Click an element on the canvas, switch to the select tool, or wait for the preview to load."],
      ["layersV1Title", "当前画布只支持旧版桥", "The canvas speaks the old bridge"],
      ["layersV1Body", "图层树需要 bridge v2（outline 消息）。宿主升级后可自动启用，其他功能不受影响。", "The layer tree needs bridge v2 (outline message). It turns on automatically after the host upgrade; everything else still works."],
      ["layerShow", "显示", "Show"],
      ["layerHide", "隐藏", "Hide"],
      ["layerExpand", "展开", "Expand"],
      ["layerCollapse", "收起", "Collapse"],
      ["layerCountBadge", "图层 {n}", "Layers {n}"],
      ["contextImportTitle", "导入语境", "Import context"],
      ["contextImportUrl", "网址", "URL"],
      ["contextImportPath", "代码库", "Repo"],
      ["contextImportImage", "图片", "Image"],
      ["contextImportText", "文字", "Text"],
      ["contextValuePlaceholder", "https://example.com、目录路径或一段说明", "https://example.com, a folder path, or a note"],
      ["contextImportBtn", "导入", "Import"],
      ["contextImporting", "导入中…", "Importing…"],
      ["contextEvidence", "已导入证据", "Imported evidence"],
      ["contextEmpty", "还没有语境。导入网址、代码库或一段文字，变体与检查都会以它为准。", "No context yet. Import a URL, repo or note; variants and checks use it as the baseline."],
      ["contextImportHint", "网址取计算样式；代码库扫描 css/js；图片取色板；文字作为约束说明。", "URLs probe computed styles; repos scan css/js; images yield a palette; text becomes a constraint note."],
      ["commentsShowAll", "显示已解决", "Show resolved"],
      ["commentsOpenOnly", "只看未解决", "Open only"],
      ["commentsCopyClaude", "复制为 Claude 指令", "Copy as Claude instructions"],
      ["commentsCopied", "已复制指令", "Instructions copied"],
      ["commentsNoneOpen", "没有未解决评论", "No open comments"],
      ["newVariantHint", "新变体由 agent 或脚手架写入 design/ 后自动出现。", "New variants appear after the agent or scaffold writes design/."],
      ["sectionElement", "元素", "Element"],
      ["sectionAlign", "对齐", "Align"],
      ["sectionPosition", "位置与尺寸", "Position & size"],
      ["sectionTypography", "文字", "Typography"],
      ["sectionBackground", "背景", "Background"],
      ["sectionLayout", "布局", "Layout"],
      ["sectionBorder", "边框", "Border"],
      ["sectionEffects", "效果", "Effects"],
      ["sectionContent", "内容", "Content"],
      ["alignLeft", "左对齐", "Align left"],
      ["alignCenter", "水平居中", "Center horizontally"],
      ["alignRight", "右对齐", "Align right"],
      ["alignTop", "顶对齐", "Align top"],
      ["alignMiddle", "垂直居中", "Center vertically"],
      ["alignBottom", "底对齐", "Align bottom"],
      ["alignTip", "对齐到父级容器，不改变布局流", "Align to the parent without changing layout flow"],
      ["posX", "X", "X"],
      ["posY", "Y", "Y"],
      ["posW", "W", "W"],
      ["posH", "H", "H"],
      ["fontFamily", "字体", "Font"],
      ["fontSize", "字号", "Size"],
      ["fontWeight", "字重", "Weight"],
      ["lineHeight", "行高", "Line height"],
      ["letterSpacing", "字距", "Letter spacing"],
      ["textAlign", "对齐", "Align"],
      ["textColor", "文字色", "Text"],
      ["bgColor", "背景色", "Fill"],
      ["displayLabel", "布局模式", "Display"],
      ["marginLabel", "外边距", "Margin"],
      ["paddingLabel", "内边距", "Padding"],
      ["gapLabel", "间距", "Gap"],
      ["linkSides", "联动四边", "Link sides"],
      ["borderWidth", "宽度", "Width"],
      ["borderStyle", "样式", "Style"],
      ["borderColor", "颜色", "Color"],
      ["radiusLabel", "圆角", "Radius"],
      ["shadowLabel", "阴影", "Shadow"],
      ["shadowSoft", "轻微", "Soft"],
      ["shadowRaised", "浮起", "Raised"],
      ["shadowNone", "无", "None"],
      ["filterLabel", "滤镜", "Filter"],
      ["editText", "编辑文字", "Edit text"],
      ["copySelector", "复制选择器", "Copy selector"],
      ["copyCss", "复制 CSS", "Copy CSS"],
      ["parentLabel", "选中父级", "Select parent"],
      ["moveUp", "上移一层", "Move up"],
      ["moveDown", "下移一层", "Move down"],
      ["copyElement", "复制元素", "Duplicate"],
      ["duplicate", "复制元素", "Duplicate"],
      ["deleteElement", "删除元素", "Delete"],
      ["contrastGood", "对比度好", "Good contrast"],
      ["contrastOk", "对比度可用", "Usable contrast"],
      ["contrastLow", "对比度不足", "Low contrast"],
      ["contrastRatioLabel", "对比度 {ratio}:1", "Contrast {ratio}:1"],
      ["styleResetAll", "重置全部样式", "Reset all styles"],
      ["elementActions", "元素操作", "Element actions"],
      ["artboardsTitle", "画板视图", "Artboards"],
      ["artboardFocus", "进入画布", "Open canvas"],
      ["artboardCount", "{n} 块画板", "{n} artboards"],
      ["panHint", "空格 + 拖拽平移画布", "Space + drag to pan"],
      ["marqueeHint", "空白处拖拽框选，Shift 点击多选", "Drag on empty canvas to marquee, Shift-click to multi-select"],
      ["dragHint", "拖动选中元素移动，把手调整尺寸", "Drag the selection to move; handles resize"],
      ["pinsLabel", "{n} 个评论钉", "{n} comment pins"],
      ["pinOpenThread", "打开评论", "Open thread"],
      ["paletteTitle", "命令面板", "Command palette"],
      ["palettePlaceholder", "搜索命令…", "Search commands…"],
      ["paletteEmpty", "没有匹配的命令", "No matching commands"],
      ["paletteHint", "↑↓ 选择 · Enter 执行 · Esc 关闭", "↑↓ select · Enter run · Esc close"],
      ["groupFile", "文件", "File"],
      ["groupView", "视图", "View"],
      ["groupZoom", "缩放", "Zoom"],
      ["groupTools", "工具", "Tools"],
      ["groupPanels", "面板", "Panels"],
      ["groupCheck", "检查", "Check"],
      ["groupExport", "导出", "Export"],
      ["groupTheme", "主题", "Theme"],
      ["groupHelp", "帮助", "Help"],
      ["cmdSave", "保存画布", "Save canvas"],
      ["cmdUndo", "撤销", "Undo"],
      ["cmdRedo", "重做", "Redo"],
      ["cmdSelectTool", "选择工具", "Select tool"],
      ["cmdCommentTool", "评论工具", "Comment tool"],
      ["cmdToggleInspector", "显示/隐藏属性面板", "Toggle properties panel"],
      ["cmdToggleLeft", "显示/隐藏左栏", "Toggle left rail"],
      ["cmdFit", "适应画布", "Fit canvas"],
      ["cmdFitSelection", "适应选中元素", "Fit selection"],
      ["cmdOneToOne", "缩放到 1:1", "Zoom to 1:1"],
      ["cmdZoomIn", "放大", "Zoom in"],
      ["cmdZoomOut", "缩小", "Zoom out"],
      ["cmdRulers", "切换标尺", "Toggle rulers"],
      ["cmdGrid", "切换 8px 网格", "Toggle 8px grid"],
      ["cmdColumns", "切换 12 列参考线", "Toggle 12-column guides"],
      ["cmdGuides", "切换对齐参考线", "Toggle snap guides"],
      ["cmdCanvasView", "画布视图", "Canvas view"],
      ["cmdArtboardView", "画板视图", "Artboard view"],
      ["cmdRunCheck", "运行质检", "Run check"],
      ["cmdExportKind", "导出 {kind}", "Export {kind}"],
      ["cmdOpenBrowser", "在浏览器打开", "Open in browser"],
      ["cmdTabTweaks", "打开 Tweaks", "Open Tweaks"],
      ["cmdTabComments", "打开评论", "Open comments"],
      ["cmdTabChecks", "打开检查", "Open check"],
      ["cmdTabExports", "打开导出", "Open exports"],
      ["cmdTabSystem", "打开设计系统", "Open design system"],
      ["cmdTabVersions", "打开版本", "Open versions"],
      ["cmdTabProperties", "打开属性", "Open properties"],
      ["cmdThemeAuto", "主题：跟随系统", "Theme: auto"],
      ["cmdThemeLight", "主题：浅色", "Theme: light"],
      ["cmdThemeDark", "主题：深色", "Theme: dark"],
      ["cmdSaveVersion", "保存一个版本", "Save a version"],
      ["cmdHelp", "快捷键总表", "Keyboard shortcuts"],
      ["cmdVariant", "切换到变体 {id}", "Switch to variant {id}"],
      ["shortcutsTitle", "快捷键", "Keyboard shortcuts"],
      ["shortcutsFile", "文件与编辑", "File & edit"],
      ["shortcutsView", "视图", "View"],
      ["shortcutsSelect", "选择与图层", "Selection & layers"],
      ["shortcutsTools", "工具", "Tools"],
      ["shortcutCommands", "命令面板", "Command palette"],
      ["shortcutDuplicate", "复制选中元素", "Duplicate selection"],
      ["shortcutDelete", "删除选中元素", "Delete selection"],
      ["shortcutGrid", "8px 网格", "8px grid"],
      ["shortcutRulers", "标尺", "Rulers"],
      ["shortcutLayers", "图层树上下移动 / 展开 / 折叠", "Layers: move / expand / collapse"],
      ["shortcutArtboard", "适应画板视图", "Fit artboards"],
      ["shortcutLayout", "收起/展开左右栏", "Collapse/expand side panels"],
      ["statusSelection", "选择", "Selection"],
      ["statusNoSelection", "未选择元素", "No selection"],
      ["statusSize", "尺寸", "Size"],
      ["statusZoom", "缩放", "Zoom"],
      ["statusSaved", "已保存", "Saved"],
      ["statusDirty", "有未保存修改", "Unsaved"],
      ["statusBridge", "画布", "Canvas"],
      ["statusScore", "分数", "Score"],
      ["statusHint", "提示", "Hint"],
      ["statusToolSelect", "选择工具：单击选中，Shift 多选，拖动移动", "Select: click to select, Shift multi-select, drag to move"],
      ["statusToolComment", "评论工具：点击元素放评论钉", "Comment: click an element to drop a pin"],
      ["statusV1Bridge", "画布桥 v1：图层/拖拽/标尺降级", "Bridge v1: layers, drag and rulers degraded"],
      ["closePanel", "收起", "Collapse"],
      ["expandPanel", "展开", "Expand"],
      ["resizePanel", "拖动调整宽度，双击恢复默认", "Drag to resize, double-click to reset"],
      ["totalLayers", "共 {n} 个", "{n} total"],
      ["loadingLayers", "读取图层…", "Reading layers…"],
      ["renameSaved", "项目名已更新", "Project renamed"],
      ["diagnosticsTitle", "诊断信息", "Diagnostics"],
      ["copyDone", "已复制", "Copied"],
      ["selectionMulti", "{n} 个元素", "{n} elements"],

      /* ---- v1.2 requirement flow (UX-MAP §5–§6) ---------------------- */
      ["requirementTitle", "要做点什么？", "What should we design?"],
      ["requirementHint", "一句话说清要做什么；具体文案、受众与约束写到下面。写好后一键复制回对话发送。", "One sentence on what to build; put real copy, audience and constraints below. Copy it back into the chat in one click."],
      ["requirementPlaceholder", "例如：做一个 SaaS 运营仪表盘落地页，暖纸底 + 深墨字，强调色 #b4552f，三档方向", "e.g. A SaaS ops dashboard landing page: warm paper, deep ink, accent #b4552f, three directions"],
      ["requirementRequired", "先写一句需求，再保存", "Write one sentence first"],
      ["audienceOptional", "受众（可选）", "Audience (optional)"],
      ["constraintsOptional", "约束（可选）", "Constraints (optional)"],
      ["saveAndChat", "保存并去对话", "Save & go to chat"],
      ["createOnly", "只建项目", "Create project only"],
      ["sayInChat", "在对话里直接说", "Or just say it in the chat"],
      ["sayInChatHint", "面板不负责聊天。写好后一键复制，回到对话窗口粘贴发送即可。", "The panel is not a chat. Write it, copy it, paste it in the conversation."],
      ["exampleFill", "填入", "Use this"],
      ["goToChat", "回到对话", "Back to chat"],
      ["onboardingTitle", "需求在对话里说，面板里改", "Requirements go in the chat; the panel is where you refine"],
      ["onboardingBody", "用 6 步向导说清要做什么；面板负责看变体、改画布、质检与导出。", "Clarify the work with the 6-step wizard; the panel is for variants, canvas edits, checks and exports."],
      ["onboardingStep1", "① 用 6 步向导说清要做什么（或直接在对话里说）", "① Clarify the work with the 6-step wizard (or just say it in the chat)"],
      ["onboardingStep2", "② 面板看三档变体、直接改画布", "② Review the variants and edit the canvas here"],
      ["onboardingStep3", "③ 质检 ≥90 再导出", "③ Check to 90+ then export"],
      ["onboardingDismiss", "知道了", "Got it"],
      ["writeRequirement", "写需求", "Write requirement"],
      ["briefTabHint", "项目语境会写进 DESIGN.md，变体与检查都会参考它。", "The brief is written into DESIGN.md; variants and checks use it."],
      ["briefSave", "保存需求", "Save brief"],
      ["briefSaving", "保存中…", "Saving…"],
      ["briefSaved", "需求已保存", "Brief saved"],
      ["briefDirty", "有未保存改动", "Unsaved changes"],
      ["briefEmptyHint", "还没有需求。在对话里描述，或直接在这里写。", "No requirement yet. Describe it in the chat, or write it here."],
      ["continueTitle", "继续提需求", "Add a requirement"],
      ["continueHint", "会自动附带当前变体、选中元素、未解决评论与待修问题。", "The current variant, selection, open comments and findings are attached automatically."],
      ["continuePlaceholder", "例如：再加一屏客户评价，保持现有配色；把首屏标题缩小一档", "e.g. Add a customer-proof screen with the current palette; reduce the hero title size"],
      ["copyToClaude", "复制给 Claude 并去对话", "Copy for Claude & go to chat"],
      ["saveOnly", "只保存到需求", "Save to brief only"],
      ["contextChipsTitle", "将附带", "Attached"],
      ["chipVariant", "变体 {id}", "Variant {id}"],
      ["chipSelection", "选中 {selector}", "Selected {selector}"],
      ["chipComments", "未解决评论 {n}", "{n} open comments"],
      ["chipIssues", "待修问题 {n}", "{n} open findings"],
      ["chipNone", "无选中元素", "no selection"],
      ["handoffCopied", "需求已复制，在对话输入框 Ctrl+V 粘贴发送", "Requirement copied — paste it in the chat input with Ctrl+V"],
      ["handoffCopiedNoLayout", "需求已复制；未找到对话布局服务，请手动切回对话并粘贴", "Requirement copied; the chat layout service is unavailable, switch back and paste manually"],
      ["handoffFailed", "复制失败，请手动选中文本复制", "Copy failed — select the text and copy it manually"],
      ["backToChat", "回到对话", "Back to chat"],
      ["backToChatToast", "已回到对话", "Back in the conversation"],
      ["backToChatNoLayout", "未找到对话布局服务，请手动切回对话", "Chat layout service unavailable; switch back manually"],
      ["flowTitle", "流程", "Flow"],
      ["flowNext", "下一步：{stage}", "Next: {stage}"],
      ["flowRequirement", "开始", "Start"],
      ["flowContext", "语境", "Context"],
      ["flowVariants", "变体", "Variants"],
      ["flowIterate", "迭代", "Iterate"],
      ["flowCheck", "质检", "Check"],
      ["flowExport", "导出", "Export"],
      ["flowHintRequirement", "用 6 步向导说清要做什么，或直接在对话里说", "Use the 6-step wizard, or just describe it in the chat"],
      ["flowHintContext", "导入 URL / 代码库 / 图片语境", "Import context from a URL, repo or image"],
      ["flowHintVariants", "等待 Claude 写入 a/b/c 三档变体", "Wait for Claude to write the a/b/c variants"],
      ["flowHintIterate", "用评论、画布编辑或 Tweaks 迭代", "Iterate with comments, canvas edits or Tweaks"],
      ["flowHintCheck", "跑质检并修到 ≥90", "Run the check and fix to 90+"],
      ["flowHintExport", "导出 HTML / ZIP / PDF / PNG / PPTX", "Export HTML / ZIP / PDF / PNG / PPTX"],
      ["flowDoneHint", "已完成", "Done"],
      ["fixWithClaude", "让 Claude 修复这些问题", "Ask Claude to fix these"],
      ["copyForClaude", "复制给 Claude", "Copy for Claude"],
      ["generateVariants", "让 Claude 生成三档变体", "Ask Claude for three variants"],
      ["addContext", "让 Claude 补语境", "Ask Claude for context"],
      ["openInChat", "在对话里继续", "Continue in chat"],
      ["briefSaveNotReady", "brief 保存接口未就绪", "The brief save endpoint is not ready yet"],
      ["requirementCopied", "需求已复制", "Requirement copied"],
      ["examplesTitle", "在对话里直接说也可以", "You can also just say it in the chat"],
      ["examplesHint", "点击示例填入需求框", "Click an example to fill the requirement box"],
      ["promptMissing", "没有可发送的内容", "Nothing to send yet"],
      ["onboardingSkip", "跳过", "Skip"],
      ["flowStepTip", "点击跳到{stage}", "Jump to {stage}"],
      ["handoffPromptMissing", "先写一句需求再复制", "Write a requirement before copying"],
      ["briefContextLabel", "上下文", "Context"],
      ["briefSaveOnlyHint", "只写入 brief，不切换面板", "Writes the brief without leaving the panel"],
      ["continueSaved", "已写入需求", "Saved to brief"],

      /* ---- v1.3 start wizard + intake (FLOW.md §2.2–§2.4) -------------- */
      ["wizardStart", "开始一个新设计（6 步）", "Start a new design (6 steps)"],
      ["wizardQuick", "快速开始（一句话）", "Quick start (one sentence)"],
      ["wizardTitle", "开始", "Start"],
      ["wizardStepOf", "第 {n} / {total} 步", "Step {n} of {total}"],
      ["wizardProgress", "进度 {n}/{total}", "Progress {n}/{total}"],
      ["wizardBack", "上一步", "Back"],
      ["wizardNext", "下一步", "Next"],
      ["wizardFinish", "创建并去对话", "Create & go to chat"],
      ["wizardFinishOnly", "只建项目", "Create project only"],
      ["wizardSkipStep", "不知道，让 Claude 决定", "Not sure — let Claude decide"],
      ["wizardDelegated", "已交给 Claude 追问", "Left for Claude"],
      ["wizardRequired", "必答", "Required"],
      ["wizardMissing", "{n} 项未答", "{n} unanswered"],
      ["wizardWritesHint", "答案会写入 brief + intake，Claude 不会重复问已确认项。", "Answers go into brief + intake; Claude won't re-ask confirmed items."],
      ["wizardClose", "取消", "Cancel"],
      ["wizardCreateFailed", "创建失败：{message}", "Could not create: {message}"],
      ["wizardFallbackQuick", "改用快速开始", "Use quick start instead"],
      ["wizardIntakeSaved", "需求信息已更新", "Intake updated"],
      ["wizardQuestionsFallback", "问题清单服务未就绪，使用内置向导", "Question service not ready — using the built-in wizard"],
      ["wizardNoQuestions", "没有可用问题，直接走快速开始", "No questions available — use quick start"],
      ["wizardUnknownType", "该题型未知，按文本作答", "Unknown question type — answer as text"],
      ["wizardStep1", "做什么", "What to make"],
      ["wizardStep2", "给谁看 / 在哪用", "Who sees it / where"],
      ["wizardStep3", "语境从哪来", "Where the context comes from"],
      ["wizardStep4", "变体与探索", "Variants & exploration"],
      ["wizardStep5", "Tweaks 与内容", "Tweaks & content"],
      ["wizardStep6", "交付与成功标准", "Delivery & success"],
      ["qKind", "类型", "Type"],
      ["qGoal", "一句话目标", "One-sentence goal"],
      ["qAudience", "受众", "Audience"],
      ["qScenario", "使用场景", "Where it is used"],
      ["qTone", "语气", "Tone"],
      ["qContextSources", "语境来源", "Context sources"],
      ["qReferences", "参考（URL / 截图 / 描述）", "References (URL / screenshot / description)"],
      ["qBrandConstraints", "品牌约束（色/字体/禁用项）", "Brand constraints (colour / type / forbidden)"],
      ["qVariationsCount", "要几档变体", "How many variants"],
      ["qDimensions", "探索维度", "Dimensions to explore"],
      ["qRange", "偏好（按规矩 ↔ 前卫）", "Preference (by the book ↔ avant-garde)"],
      ["qTweaks", "想调什么", "What to tweak"],
      ["qContentMust", "必须出现的内容", "Content that must appear"],
      ["qContentAvoid", "不要出现的内容", "Content to avoid"],
      ["qDeliverables", "交付格式", "Deliverables"],
      ["qResponsive", "响应式范围", "Responsive range"],
      ["qSuccess", "成功标准", "Success criteria"],
      ["qHintKind", "决定起始脚手架与验收规则", "Sets the starting scaffold and acceptance rules"],
      ["qHintGoal", "例如：做一个 SaaS 运营仪表盘落地页", "e.g. A SaaS ops dashboard landing page"],
      ["qHintAudience", "例如：中小企业采购负责人，手机上先看", "e.g. SMB buyers, mostly on mobile"],
      ["qHintScenario", "例如：销售演示、官网首屏、内部分享", "e.g. sales demo, homepage hero, internal review"],
      ["qHintTone", "例如：克制专业、温暖、锋利", "e.g. restrained, warm, sharp"],
      ["qHintReferences", "每行一个 URL，或描述参考", "One URL per line, or describe the reference"],
      ["qHintBrand", "例如：强调色 #b4552f，禁用轮播", "e.g. accent #b4552f, no carousel"],
      ["qHintRange", "0 = 完全按规矩，100 = 非常前卫", "0 = strictly conventional, 100 = very avant-garde"],
      ["qHintTwicks", "选择你最想现场调的参数", "Pick the parameters you want to tune live"],
      ["qHintContentMust", "真实文案、数据点、必须出现的模块", "Real copy, data points, required blocks"],
      ["qHintContentAvoid", "禁用元素、不要的措辞、不要的模块", "Forbidden elements, wording or blocks"],
      ["qHintSuccess", "可多选；质检 ≥90 是默认门槛", "Multi-select; check ≥90 is the default bar"],
      ["optCtxExisting", "已有设计系统", "Existing design system"],
      ["optCtxUrl", "导入 URL", "Import from URL"],
      ["optCtxRepo", "代码库", "Repository"],
      ["optCtxScreens", "截图", "Screenshots"],
      ["optCtxNone", "没有，让 Claude 探", "None — let Claude explore"],
      ["optVisual", "视觉", "Visual"],
      ["optInteraction", "交互", "Interaction"],
      ["optLayout", "布局", "Layout"],
      ["optCopy", "文案", "Copy"],
      ["optMotion", "动效", "Motion"],
      ["optTweakColor", "颜色", "Colour"],
      ["optTweakType", "字号", "Type"],
      ["optTweakSpacing", "间距", "Spacing"],
      ["optTweakCopy", "文案", "Copy"],
      ["optTweakLayout", "布局变体", "Layout variants"],
      ["optTweakToggles", "开关", "Toggles"],
      ["optDesktop", "桌面", "Desktop"],
      ["optTablet", "平板", "Tablet"],
      ["optMobile", "手机", "Mobile"],
      ["optSuccessCheck", "质检 ≥90", "Check ≥90"],
      ["optSuccessOverflow", "无横向溢出", "No horizontal overflow"],
      ["optSuccessA11y", "无障碍 AA", "A11y AA"],
      ["optSuccessPerf", "首屏 <2s", "First paint <2s"],
      ["optRangeBasic", "按规矩", "By the book"],
      ["optRangeBalanced", "平衡", "Balanced"],
      ["optRangeBold", "前卫", "Avant-garde"],
      ["optVariant2", "2 档", "2"],
      ["optVariant3", "3 档", "3"],
      ["optVariant4", "4 档", "4"],
      ["intakeSummary", "需求信息", "Intake summary"],
      ["intakeCompleteness", "完整度 {n}%", "{n}% complete"],
      ["intakeRefill", "补问 / 完善需求", "Fill the gaps"],
      ["intakeOpenQuestions", "待 Claude 追问", "Open questions"],
      ["intakeMissingHint", "还有未确认项，Claude 会先追问再开始。", "Some answers are missing; Claude will ask before starting."],
      ["intakeNone", "还没有结构化需求，点「补问」跑一次 6 步向导。", "No structured intake yet — run the 6-step wizard."],
      ["intakeGroupBasics", "基础", "Basics"],
      ["intakeGroupContext", "语境", "Context"],
      ["intakeGroupVariants", "变体", "Variants"],
      ["intakeGroupTweaks", "Tweaks", "Tweaks"],
      ["intakeGroupContent", "内容", "Content"],
      ["intakeGroupDelivery", "交付", "Delivery"],
      ["intakeSourceWizard", "向导", "wizard"],
      ["intakeSourceAgent", "agent", "agent"],
      ["intakeSourceMixed", "混合", "mixed"],
      ["intakeNotSet", "未填", "not set"],
      ["promptConfirmed", "已确认信息", "Confirmed so far"],
      ["promptAskFirst", "请先追问以下未确认项（≤8 个）", "Ask these open questions first (up to 8)"],
      ["promptNoOpen", "没有未确认项，可以直接开始。", "Nothing open — start directly."],
      ["promptStartInstructions", "请按设计台流程执行：design_start（带 intake）→ design_context → 写 a/b/c 三档变体 → design_check 直到 ≥90 → design_export。", "Follow the studio flow: design_start (with intake) → design_context → write a/b/c variants → design_check until ≥90 → design_export."],
      ["flowStart", "开始", "Start"],
      ["intakeBadge", "需求信息", "Intake"],
      ["intakeAnswered", "已确认 {n} 项", "{n} confirmed"],
      ["intakeSkipHint", "留空即交给 Claude 追问", "Leave blank to let Claude ask"],
      ["wizardPrefillHint", "已按项目现有 intake 预填，可修改后保存。", "Pre-filled from the project intake; edit and save."],
      ["wizardSaveOnly", "只保存 intake", "Save intake only"],
      ["wizardSavedToProject", "已写入项目需求", "Saved to project intake"],
    ]

    const DICTIONARIES = { zh: {}, en: {} }
    for (const row of TEXT_ENTRIES) {
      DICTIONARIES.zh[row[0]] = row[1]
      DICTIONARIES.en[row[0]] = row[2]
    }
    // A few labels are used as literal keys elsewhere; keep them addressable.
    DICTIONARIES.zh.none = "无"
    DICTIONARIES.en.none = "–"

    /* ------------------------------------------------------------------ */
    /* Language helpers                                                    */
    /* ------------------------------------------------------------------ */

    function readLang() {
      try {
        const value = window.localStorage.getItem(LANG_KEY)
        if (value === "zh" || value === "en") return value
      } catch (error) {}
      return "zh"
    }

    function writeLang(lang) {
      try {
        window.localStorage.setItem(LANG_KEY, lang)
      } catch (error) {}
    }

    function lookup(dictionary, key) {
      return dictionary[key] !== undefined ? dictionary[key] : key
    }

    function makeT(lang) {
      const dictionary = DICTIONARIES[lang] || DICTIONARIES.zh
      return function t(key, vars) {
        let text = lookup(dictionary, key)
        if (vars && typeof text === "string") {
          for (const name of Object.keys(vars)) text = text.split("{" + name + "}").join(String(vars[name]))
        }
        return text
      }
    }

    /* ------------------------------------------------------------------ */
    /* HTTP helpers (§4: header + {ok} envelope)                           */
    /* ------------------------------------------------------------------ */

    async function request(path, options) {
      const opts = options || {}
      const headers = Object.assign({}, opts.headers || {})
      headers[REQ_HEADER] = "1"
      if (opts.body !== undefined) headers["content-type"] = "application/json"
      let response
      try {
        response = await fetch(API_BASE + path, {
          method: opts.method || "GET",
          headers,
          body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
          cache: "no-store",
        })
      } catch (error) {
        throw new Error(String(error && error.message ? error.message : error))
      }
      let payload = null
      try {
        payload = await response.json()
      } catch (error) {}
      if (!response.ok || (payload && payload.ok === false)) {
        const message = payload && payload.error ? payload.error : "HTTP " + response.status
        const failure = new Error(message)
        failure.code = payload && payload.code ? payload.code : "http_" + response.status
        failure.repair = payload && payload.repair ? payload.repair : null
        throw failure
      }
      return payload || {}
    }

    function apiGet(path) {
      return request(path, {})
    }

    function apiPost(path, body) {
      return request(path, { method: "POST", body: body === undefined ? {} : body })
    }

    /** Text read for /file (tokens JSON, DESIGN.md, saved HTML). */
    async function apiText(path) {
      const headers = {}
      headers[REQ_HEADER] = "1"
      let response
      try {
        response = await fetch(API_BASE + path, { headers, cache: "no-store" })
      } catch (error) {
        throw new Error(String(error && error.message ? error.message : error))
      }
      const text = await response.text()
      if (!response.ok) throw new Error(text || "HTTP " + response.status)
      return text
    }

    function messageOf(error) {
      return error && error.message ? error.message : String(error)
    }

    function qs(projectId) {
      return "/api/projects/" + encodeURIComponent(projectId)
    }

    function fileUrl(projectId, relPath) {
      const rel = String(relPath || "").replace(/^\/+/, "")
      return API_BASE + qs(projectId) + "/file?path=" + encodeURIComponent(rel)
    }

    function exportFileUrl(projectId, relPath) {
      const rel = String(relPath || "").replace(/^\/+/, "")
      return API_BASE + qs(projectId) + "/export-file?path=" + encodeURIComponent(rel)
    }

    function previewUrl(projectId, variant) {
      return API_BASE + "/preview/" + encodeURIComponent(projectId) + "/v/" + encodeURIComponent(variant || "a")
    }

    /** Screenshot paths inside a check are project-root-relative; tolerate bare names. */
    function screenshotUrl(projectId, relPath, round, variant) {
      let path = String(relPath || "").replace(/^\/+/, "")
      if (!path) return ""
      if (!/^(checks|exports|system|context|design|history)\//.test(path)) {
        const prefix = "checks/round-" + (round || 1) + "/" + (variant && variant !== "all" ? variant + "/" : "")
        path = prefix + path.replace(/^\.?\//, "")
      }
      return fileUrl(projectId, path)
    }

    /* ------------------------------------------------------------------ */
    /* Pure formatting / mapping helpers (exported via __test__)           */
    /* ------------------------------------------------------------------ */

    function clamp(value, min, max, fallback) {
      const n = Number(value)
      if (!Number.isFinite(n)) return fallback === undefined ? min : fallback
      return Math.min(max, Math.max(min, n))
    }

    function safeArray(value) {
      return Array.isArray(value) ? value : []
    }

    function clampZoom(value) {
      return clamp(Math.round(Number(value) * 100) / 100, ZOOM_MIN, ZOOM_MAX, 1)
    }

    function stepZoom(current, direction) {
      const n = clampZoom(current)
      if (direction === "in") {
        for (let i = 0; i < ZOOM_STEPS.length; i += 1) if (ZOOM_STEPS[i] > n + 0.001) return ZOOM_STEPS[i]
        return ZOOM_MAX
      }
      for (let i = ZOOM_STEPS.length - 1; i >= 0; i -= 1) if (ZOOM_STEPS[i] < n - 0.001) return ZOOM_STEPS[i]
      return ZOOM_MIN
    }

    function fitZoom(viewportWidth, availableWidth, availableHeight, viewportHeight) {
      const width = Math.max(240, Number(viewportWidth) || 1440)
      const roomW = Math.max(160, (Number(availableWidth) || 900) - 88)
      let zoom = roomW / width
      if (availableHeight && viewportHeight) {
        const roomH = (Number(availableHeight) || 900) - 140
        zoom = Math.min(zoom, roomH / Math.max(320, Number(viewportHeight) || 900))
      }
      return clampZoom(zoom)
    }

    function defaultViewports(kind) {
      const value = KIND_VIEWPORTS[kind] || KIND_VIEWPORTS.web
      return value.slice()
    }

    function heightForWidth(width) {
      const w = Number(width) || 1440
      return VIEWPORT_HEIGHTS[w] || Math.max(480, Math.round(w * 0.62))
    }

    function devicePreset(id) {
      return DEVICE_PRESETS[id] || DEVICE_PRESETS.browser
    }

    function pickDeviceForWidth(width, kind) {
      if (kind === "mobile") return "phone"
      return Number(width) <= 520 ? "phone" : "browser"
    }

    function scoreGrade(score) {
      if (score === null || score === undefined || score === "") return ""
      const n = Number(score)
      if (!Number.isFinite(n)) return ""
      if (n >= 90) return "A"
      if (n >= 80) return "B"
      if (n >= 70) return "C"
      if (n >= 60) return "D"
      return "F"
    }

    function gradeTone(grade) {
      if (grade === "A") return "ok"
      if (grade === "B") return "warn"
      if (grade === "C" || grade === "D" || grade === "F") return "danger"
      return ""
    }

    function scoreTone(score) {
      return gradeTone(scoreGrade(score))
    }

    function isPassing(score) {
      return Number(score) >= 90
    }

    function fmtClock(iso) {
      if (!iso) return ""
      try {
        const date = new Date(iso)
        if (Number.isNaN(date.getTime())) return String(iso)
        const pad = (n) => String(n).padStart(2, "0")
        return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes())
      } catch (error) {
        return String(iso)
      }
    }

    function fmtTime(iso, t) {
      if (!iso) return ""
      const translate = typeof t === "function" ? t : makeT("zh")
      try {
        const date = new Date(iso)
        if (Number.isNaN(date.getTime())) return String(iso)
        const diff = Date.now() - date.getTime()
        if (diff >= 0 && diff < 60000) return translate("justNow")
        if (diff >= 0 && diff < 3600000) return translate("minutesAgo", { n: Math.max(1, Math.round(diff / 60000)) })
        if (diff >= 0 && diff < 86400000) return translate("hoursAgo", { n: Math.round(diff / 3600000) })
        if (diff >= 0 && diff < 7 * 86400000) return translate("daysAgo", { n: Math.round(diff / 86400000) })
        return fmtClock(iso)
      } catch (error) {
        return String(iso)
      }
    }

    function fmtDuration(ms) {
      const n = Number(ms) || 0
      if (n < 1000) return n + " ms"
      if (n < 60000) return (n / 1000).toFixed(1) + " s"
      return Math.floor(n / 60000) + " min " + Math.round((n % 60000) / 1000) + " s"
    }

    function fmtBytes(bytes) {
      const n = Number(bytes)
      if (!Number.isFinite(n) || n <= 0) return "–"
      if (n < 1024) return Math.round(n) + " B"
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB"
      return (n / (1024 * 1024)).toFixed(1) + " MB"
    }

    function fmtPct(zoom) {
      return Math.round(clampZoom(zoom) * 100) + "%"
    }

    function kindMeta(kind) {
      for (let i = 0; i < KINDS.length; i += 1) if (KINDS[i].id === kind) return KINDS[i]
      return KINDS[0]
    }

    function kindLabel(kind, t) {
      return t(kindMeta(kind).labelKey)
    }

    function statusMeta(status, t) {
      if (status === "ready") return { label: t("statusReady"), tone: "ok" }
      if (status === "checked") return { label: t("statusChecked"), tone: "signal" }
      if (status === "designed") return { label: t("statusDesigned"), tone: "accent" }
      return { label: t("statusDraft"), tone: "" }
    }

    function variantLabel(project, variantId) {
      const labels = project && project.variantLabels ? project.variantLabels : {}
      return labels[variantId] || String(variantId || "").toUpperCase()
    }

    function variantScore(detail, variantId) {
      if (!detail) return null
      const variants = safeArray(detail.variants)
      for (let i = 0; i < variants.length; i += 1) {
        if (variants[i] && variants[i].id === variantId && variants[i].score !== null && variants[i].score !== undefined) return variants[i].score
      }
      const latest = detail.latestCheck
      if (latest && Array.isArray(latest.variants)) {
        for (let i = 0; i < latest.variants.length; i += 1) {
          const row = latest.variants[i]
          if (row && row.variant === variantId && row.score !== null && row.score !== undefined) return row.score
        }
      }
      if (latest && latest.variant === variantId) return latest.score
      return null
    }

    /** True when a summary row describes the whole project rather than one variant. */
    function latestCheckRound(detail) {
      if (!detail) return null
      const latest = detail.latestCheck
      if (latest && latest.round !== undefined) return latest.round
      const checks = safeArray(detail.checks)
      return checks.length > 0 && checks[checks.length - 1] ? checks[checks.length - 1].round : null
    }

    function selectorLabel(info) {
      if (!info) return ""
      const tag = String(info.tag || "").toLowerCase()
      const id = info.id ? "#" + info.id : ""
      const classes = safeArray(info.classes).filter(Boolean).slice(0, 2)
      return tag + id + classes.map((name) => "." + name).join("")
    }

    function shortSelector(selector, max) {
      const parts = String(selector || "").split(">").map((part) => part.trim()).filter(Boolean)
      const limit = max || 3
      if (parts.length === 0) return ""
      if (parts.length <= limit) return parts.join(" > ")
      return "… > " + parts.slice(parts.length - limit).join(" > ")
    }

    function breadcrumbOf(selector) {
      return String(selector || "").split(">").map((part) => part.trim()).filter(Boolean)
    }

    function sortComments(comments) {
      return safeArray(comments).slice().sort((a, b) => {
        const ar = a && a.resolvedAt ? 1 : 0
        const br = b && b.resolvedAt ? 1 : 0
        if (ar !== br) return ar - br
        const at = String((a && a.createdAt) || "")
        const bt = String((b && b.createdAt) || "")
        if (at === bt) return 0
        return bt < at ? -1 : 1
      })
    }

    function openCommentCount(comments) {
      return safeArray(comments).filter((comment) => comment && !comment.resolvedAt).length
    }

    function tweakType(value) {
      if (typeof value === "boolean") return "boolean"
      if (typeof value === "number") return "number"
      if (typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value.trim())) return "color"
      return "text"
    }

    function normalizeTweakRows(tweaks) {
      let entries = []
      if (Array.isArray(tweaks)) {
        entries = tweaks.map((row) => ({ key: row && row.key, value: row && row.value }))
      } else if (tweaks && typeof tweaks === "object") {
        entries = Object.keys(tweaks).map((key) => ({ key, value: tweaks[key] }))
      }
      const rows = []
      for (let i = 0; i < entries.length; i += 1) {
        const key = entries[i].key
        if (!key) continue
        rows.push({ key: String(key), value: entries[i].value, type: tweakType(entries[i].value) })
      }
      return rows
    }

    function tweakValuesFrom(rows) {
      const values = {}
      for (let i = 0; i < rows.length; i += 1) values[rows[i].key] = rows[i].value
      return values
    }

    function columnize(value) {
      if (!value || typeof value !== "object") return []
      return Object.keys(value).map((key) => ({ key, value: value[key] }))
    }

    function findingList(result) {
      if (!result) return []
      const direct = safeArray(result.findings)
      if (direct.length > 0) return direct
      const categories = safeArray(result.categories)
      const merged = []
      for (let i = 0; i < categories.length; i += 1) {
        const list = safeArray(categories[i].findings)
        for (let j = 0; j < list.length; j += 1) merged.push(list[j])
      }
      return merged
    }

    function countFindings(findings) {
      const counts = { critical: 0, high: 0, medium: 0, low: 0 }
      for (let i = 0; i < findings.length; i += 1) {
        const severity = findings[i] && findings[i].severity
        if (counts[severity] !== undefined) counts[severity] += 1
      }
      return counts
    }

    function groupFindings(findings) {
      const groups = []
      for (let i = 0; i < SEVERITY_ORDER.length; i += 1) {
        const severity = SEVERITY_ORDER[i]
        const rows = []
        for (let j = 0; j < findings.length; j += 1) if (findings[j] && findings[j].severity === severity) rows.push(findings[j])
        if (rows.length > 0) groups.push({ severity, meta: SEVERITY_META[severity], findings: rows })
      }
      return groups
    }

    function categoryRows(result) {
      return safeArray(result && result.categories).map((category) => ({
        id: category.id || "",
        label: category.label || category.id || "",
        score: Number.isFinite(Number(category.score)) ? Number(category.score) : 0,
        weight: Number.isFinite(Number(category.weight)) ? Number(category.weight) : 0,
      }))
    }

    function viewportRows(result) {
      return safeArray(result && result.viewports).map((row) => ({
        width: row.width,
        score: Number.isFinite(Number(row.score)) ? Number(row.score) : 0,
        findings: safeArray(row.findings),
      }))
    }

    /** Flatten check detail → one row per variant, tolerant of round summaries. */
    function checkVariants(check) {
      if (!check) return []
      const rows = safeArray(check.variants)
      if (rows.length > 0) {
        return rows.map((row) => ({
          variant: row.variant || row.id || "a",
          score: row.score,
          grade: row.grade || scoreGrade(row.score),
          pass: row.pass !== undefined ? row.pass : isPassing(row.score),
          categories: safeArray(row.categories),
          viewports: safeArray(row.viewports),
          screenshots: safeArray(row.screenshots),
          screens: safeArray(row.screens),
          health: row.health || null,
          findings: findingList(row),
        }))
      }
      if (check.score !== undefined && check.score !== null) {
        return [
          {
            variant: check.variant && check.variant !== "all" ? check.variant : "all",
            score: check.score,
            grade: check.grade || scoreGrade(check.score),
            pass: check.pass !== undefined ? check.pass : isPassing(check.score),
            categories: safeArray(check.categories),
            viewports: safeArray(check.viewports),
            screenshots: safeArray(check.screenshots),
            screens: safeArray(check.screens),
            health: check.health || null,
            findings: findingList(check),
          },
        ]
      }
      return []
    }

    function pickCheckVariant(check, variant) {
      const rows = checkVariants(check)
      if (rows.length === 0) return null
      for (let i = 0; i < rows.length; i += 1) if (rows[i].variant === variant) return rows[i]
      return rows[0]
    }

    function jobProgress(job) {
      if (!job) return { pct: null, label: "" }
      const progress = job.progress
      if (typeof progress === "string") return { pct: null, label: progress }
      if (progress && typeof progress === "object") {
        const pct = Number(progress.pct)
        const label = [progress.phase, progress.message].filter(Boolean).join(" · ")
        return { pct: Number.isFinite(pct) ? clamp(pct, 0, 100, null) : null, label }
      }
      return { pct: null, label: "" }
    }

    function jobRunning(job) {
      return Boolean(job && job.status === "running")
    }

    function safeJsonParse(text) {
      try {
        return { ok: true, value: JSON.parse(text) }
      } catch (error) {
        return { ok: false, error: messageOf(error) }
      }
    }

    /* --- v2 pure helpers (layers / contrast / align / palette / theme) --- */

    function cssColorToHex(value) {
      const text = String(value || "").trim()
      if (/^#[0-9a-f]{3}$/i.test(text)) return "#" + text[1] + text[1] + text[2] + text[2] + text[3] + text[3]
      if (/^#[0-9a-f]{6}$/i.test(text)) return text.toLowerCase()
      const rgb = parseCssColor(text)
      if (rgb) {
        const part = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")
        return "#" + part(rgb.r) + part(rgb.g) + part(rgb.b)
      }
      return "#ffffff"
    }

    function parseCssColor(value) {
      const text = String(value || "").trim().toLowerCase()
      if (!text || text === "transparent") return null
      if (text.charAt(0) === "#") {
        const hex = text.slice(1)
        if (hex.length === 3 || hex.length === 4) {
          const r = parseInt(hex[0] + hex[0], 16)
          const g = parseInt(hex[1] + hex[1], 16)
          const b = parseInt(hex[2] + hex[2], 16)
          const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1
          return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) ? { r, g, b, a } : null
        }
        if (hex.length === 6 || hex.length === 8) {
          const r = parseInt(hex.slice(0, 2), 16)
          const g = parseInt(hex.slice(2, 4), 16)
          const b = parseInt(hex.slice(4, 6), 16)
          const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
          return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) ? { r, g, b, a } : null
        }
        return null
      }
      const match = text.match(/^rgba?\(([^)]+)\)$/)
      if (!match) return null
      const parts = match[1].split(/[\s,/]+/).map((part) => parseFloat(part)).filter((part) => Number.isFinite(part))
      if (parts.length < 3) return null
      return { r: clamp(parts[0], 0, 255, 0), g: clamp(parts[1], 0, 255, 0), b: clamp(parts[2], 0, 255, 0), a: parts.length > 3 ? clamp(parts[3], 0, 1, 1) : 1 }
    }

    function relativeLuminance(color) {
      const rgb = color && typeof color === "object" ? color : parseCssColor(color)
      if (!rgb) return 0
      const channel = (value) => {
        const n = clamp(value, 0, 255, 0) / 255
        return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
    }

    function contrastRatio(foreground, background) {
      const fg = parseCssColor(foreground)
      const bg = parseCssColor(background)
      if (!fg || !bg) return null
      const l1 = relativeLuminance(fg)
      const l2 = relativeLuminance(bg)
      const light = Math.max(l1, l2)
      const dark = Math.min(l1, l2)
      return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100
    }

    function contrastLevel(ratio) {
      const value = Number(ratio)
      if (!Number.isFinite(value)) return ""
      if (value >= 7) return "aaa"
      if (value >= 4.5) return "aa"
      if (value >= 3) return "large"
      return "fail"
    }

    function contrastTone(ratio) {
      const level = contrastLevel(ratio)
      if (level === "aaa" || level === "aa") return "ok"
      if (level === "large") return "warn"
      return level === "fail" ? "danger" : ""
    }

    function cssFromStyles(styles) {
      const source = styles && typeof styles === "object" ? styles : {}
      const rows = []
      for (const key of Object.keys(source)) {
        const value = source[key]
        if (value === undefined || value === null || value === "") continue
        rows.push(String(key).replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase()) + ": " + String(value) + ";")
      }
      return rows.join("\n")
    }

    function alignOffset(rect, parentRect, edge) {
      const r = rect || {}
      const p = parentRect || {}
      const rx = Number(r.x) || 0
      const ry = Number(r.y) || 0
      const rw = Number(r.w !== undefined ? r.w : r.width) || 0
      const rh = Number(r.h !== undefined ? r.h : r.height) || 0
      const px = Number(p.x) || 0
      const py = Number(p.y) || 0
      const pw = Number(p.w !== undefined ? p.w : p.width) || 0
      const ph = Number(p.h !== undefined ? p.h : p.height) || 0
      if (edge === "left") return { dx: px - rx, dy: 0 }
      if (edge === "center") return { dx: px + (pw - rw) / 2 - rx, dy: 0 }
      if (edge === "right") return { dx: px + pw - rx - rw, dy: 0 }
      if (edge === "top") return { dx: 0, dy: py - ry }
      if (edge === "middle") return { dx: 0, dy: py + (ph - rh) / 2 - ry }
      if (edge === "bottom") return { dx: 0, dy: py + ph - ry - rh }
      return { dx: 0, dy: 0 }
    }

    function formatRect(rect) {
      if (!rect) return "–"
      const w = Number(rect.w !== undefined ? rect.w : rect.width)
      const h = Number(rect.h !== undefined ? rect.h : rect.height)
      if (!Number.isFinite(w) || !Number.isFinite(h)) return "–"
      return Math.round(w) + " × " + Math.round(h)
    }

    function layerKey(node, depth) {
      return String((node && (node.selector || node.id)) || "layer-" + depth)
    }

    function layerLabel(node) {
      if (!node) return ""
      const tag = String(node.tag || "div").toLowerCase()
      const classes = safeArray(node.classes).filter(Boolean)
      if (classes.length > 0) return tag + "." + classes.slice(0, 2).join(".")
      if (node.text) return tag + ' "' + String(node.text).replace(/\s+/g, " ").trim().slice(0, 24) + '"'
      return tag
    }

    function layerMatches(node, query) {
      const needle = String(query || "").trim().toLowerCase()
      if (!needle) return true
      const hay = [node && node.tag, node && node.selector, safeArray(node && node.classes).join(" "), node && node.text, node && node.idAttr].filter(Boolean).join(" ").toLowerCase()
      return needle.split(/\s+/).every((part) => hay.indexOf(part) !== -1)
    }

    function flattenLayers(tree, options) {
      const opts = options || {}
      const query = String(opts.query || "").trim()
      const expanded = opts.expanded instanceof Set ? opts.expanded : new Set(safeArray(opts.expanded))
      if (!query) {
        const rows = []
        const walk = (nodes, depth) => {
          safeArray(nodes).forEach((node) => {
            if (!node) return
            const key = layerKey(node, depth)
            const children = safeArray(node.children)
            rows.push({ node, depth, key, hasChildren: children.length > 0, expanded: expanded.has(key), matched: false })
            if (children.length > 0 && expanded.has(key)) walk(children, depth + 1)
          })
        }
        walk(tree, 0)
        return rows
      }
      const walk = (nodes, depth) => {
        const rows = []
        safeArray(nodes).forEach((node) => {
          if (!node) return
          const children = safeArray(node.children)
          const childResult = walk(children, depth + 1)
          const selfMatch = layerMatches(node, query)
          if (!selfMatch && childResult.rows.length === 0) return
          rows.push({ node, depth, key: layerKey(node, depth), hasChildren: children.length > 0, expanded: true, matched: selfMatch })
          childResult.rows.forEach((row) => rows.push(row))
        })
        return { rows }
      }
      return walk(tree, 0).rows
    }

    function findLayerAncestors(tree, selector) {
      const target = String(selector || "")
      if (!target) return []
      const walk = (nodes, path) => {
        const list = safeArray(nodes)
        for (let i = 0; i < list.length; i += 1) {
          const node = list[i]
          if (!node) continue
          const next = path.concat(String(node.selector || node.id || ""))
          if (node.selector === target) return next
          const found = walk(safeArray(node.children), next)
          if (found) return found
        }
        return null
      }
      return walk(tree, []) || []
    }

    function findLayerBySelector(tree, selector) {
      const target = String(selector || "")
      if (!target) return null
      const list = safeArray(tree)
      for (let i = 0; i < list.length; i += 1) {
        const node = list[i]
        if (!node) continue
        if (node.selector === target) return node
        const found = findLayerBySelector(safeArray(node.children), target)
        if (found) return found
      }
      return null
    }

    function countLayers(tree) {
      let total = 0
      const walk = (nodes) => {
        safeArray(nodes).forEach((node) => {
          if (!node) return
          total += 1
          walk(safeArray(node.children))
        })
      }
      walk(tree)
      return total
    }

    function iconForTag(tag) {
      return TAG_ICONS[String(tag || "").toLowerCase()] || "layers"
    }

    function fuzzyScore(text, query) {
      const hay = String(text || "").toLowerCase()
      const needle = String(query || "").trim().toLowerCase()
      if (!needle) return 0
      if (hay === needle) return 1000
      if (hay.indexOf(needle) === 0) return 800 - Math.min(400, hay.length)
      if (hay.indexOf(needle) !== -1) return 600 - Math.min(300, hay.length)
      let index = 0
      let score = 0
      let streak = 0
      for (let i = 0; i < hay.length && index < needle.length; i += 1) {
        if (hay.charAt(i) === needle.charAt(index)) {
          index += 1
          streak += 1
          score += 10 + streak * 2
        } else {
          streak = 0
        }
      }
      return index === needle.length ? score : -1
    }

    function filterCommands(commands, query) {
      const rows = safeArray(commands)
      const needle = String(query || "").trim()
      if (!needle) return rows.slice()
      const scored = []
      for (let i = 0; i < rows.length; i += 1) {
        const command = rows[i]
        if (!command) continue
        const hay = [command.label, command.keywords, command.groupLabel].filter(Boolean).join(" ")
        const score = fuzzyScore(hay, needle)
        if (score >= 0) scored.push({ command, score, index: i })
      }
      scored.sort((a, b) => (b.score === a.score ? a.index - b.index : b.score - a.score))
      return scored.map((row) => row.command)
    }

    function resolveTheme(preference, systemDark, hostDark) {
      const pref = THEME_OPTIONS.indexOf(preference) !== -1 ? preference : "auto"
      if (pref === "light") return "light"
      if (pref === "dark") return "dark"
      return systemDark || hostDark ? "dark" : "light"
    }

    function detectHostDark() {
      try {
        if (typeof document === "undefined") return false
        const root = document.documentElement
        const body = document.body
        const value = (root && root.getAttribute && (root.getAttribute("data-theme") || root.getAttribute("data-ds-dark-theme"))) || (body && body.getAttribute && body.getAttribute("data-ds-dark-theme")) || ""
        if (value === "dark" || value === "true") return true
        return Boolean(body && body.hasAttribute && body.hasAttribute("data-ds-dark-theme"))
      } catch (error) {
        return false
      }
    }

    function clampPanelWidth(value, min, max, fallback) {
      const lo = Number.isFinite(Number(min)) ? Number(min) : LEFT_MIN
      const hi = Number.isFinite(Number(max)) ? Number(max) : LEFT_MAX
      const next = clamp(value, lo, hi, fallback === undefined ? lo : fallback)
      return Math.round(next)
    }

    function normalizeLayout(raw) {
      const input = raw && typeof raw === "object" ? raw : {}
      return {
        left: clampPanelWidth(input.left, LEFT_MIN, LEFT_MAX, DEFAULT_LAYOUT.left),
        right: clampPanelWidth(input.right, RIGHT_MIN, RIGHT_MAX, DEFAULT_LAYOUT.right),
        leftCollapsed: input.leftCollapsed === true,
        rightCollapsed: input.rightCollapsed === true,
      }
    }

    function parseZoomInput(text, fallback) {
      const numeric = parseFloat(String(text === undefined || text === null ? "" : text).replace("%", "").trim())
      if (!Number.isFinite(numeric)) return clampZoom(fallback === undefined ? 1 : fallback)
      return clampZoom(numeric / 100)
    }

    function zoomPresetNext(current, direction) {
      const value = clampZoom(current)
      if (direction === "in") {
        for (let i = 0; i < ZOOM_PRESETS.length; i += 1) if (ZOOM_PRESETS[i] > value + 0.001) return ZOOM_PRESETS[i]
        return ZOOM_MAX
      }
      for (let i = ZOOM_PRESETS.length - 1; i >= 0; i -= 1) if (ZOOM_PRESETS[i] < value - 0.001) return ZOOM_PRESETS[i]
      return ZOOM_MIN
    }

    function readLocalJson(key, fallback) {
      try {
        const text = window.localStorage.getItem(key)
        if (!text) return fallback
        const parsed = JSON.parse(text)
        return parsed === null || parsed === undefined ? fallback : parsed
      } catch (error) {
        return fallback
      }
    }

    function writeLocalJson(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {}
    }

    function useHostDark() {
      const [dark, setDark] = useState(() => detectHostDark())
      useEffect(() => {
        if (typeof MutationObserver === "undefined" || typeof document === "undefined") return undefined
        const update = () => setDark(detectHostDark())
        update()
        const observer = new MutationObserver(update)
        try {
          if (document.documentElement) observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-ds-dark-theme", "class", "style"] })
          if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ["data-theme", "data-ds-dark-theme", "class", "style"] })
        } catch (error) {}
        return () => observer.disconnect()
      }, [])
      return dark
    }

    function useThemePreference() {
      const [preference, setPreferenceState] = useState(() => {
        try {
          const value = window.localStorage.getItem(THEME_KEY)
          return THEME_OPTIONS.indexOf(value) !== -1 ? value : "auto"
        } catch (error) {
          return "auto"
        }
      })
      const systemDark = useMedia("(prefers-color-scheme: dark)")
      const hostDark = useHostDark()
      const resolved = resolveTheme(preference, systemDark, hostDark)
      const setPreference = useCallback((next) => {
        if (THEME_OPTIONS.indexOf(next) === -1) return
        try {
          window.localStorage.setItem(THEME_KEY, next)
        } catch (error) {}
        setPreferenceState(next)
      }, [])
      return { preference, resolved, setPreference }
    }

    function useMedia(query) {
      const [matches, setMatches] = useState(() => {
        try {
          return typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false
        } catch (error) {
          return false
        }
      })
      useEffect(() => {
        let media = null
        try {
          media = window.matchMedia(query)
        } catch (error) {
          return undefined
        }
        const onChange = (event) => setMatches(event.matches)
        setMatches(media.matches)
        if (typeof media.addEventListener === "function") media.addEventListener("change", onChange)
        else if (typeof media.addListener === "function") media.addListener(onChange)
        return () => {
          if (typeof media.removeEventListener === "function") media.removeEventListener("change", onChange)
          else if (typeof media.removeListener === "function") media.removeListener(onChange)
        }
      }, [query])
      return matches
    }

    function useObservedWidth(ref) {
      const [width, setWidth] = useState(0)
      useEffect(() => {
        const node = ref.current
        if (!node) return undefined
        const measure = () => setWidth(node.clientWidth || 0)
        measure()
        if (typeof ResizeObserver === "undefined") {
          window.addEventListener("resize", measure)
          return () => window.removeEventListener("resize", measure)
        }
        const observer = new ResizeObserver(measure)
        observer.observe(node)
        return () => observer.disconnect()
      }, [ref])
      return width
    }

    /* --- v1.2 requirement flow helpers (UX-MAP §6) ---------------------- */

    function briefDraftFrom(brief) {
      const src = brief && typeof brief === "object" ? brief : {}
      return {
        goal: String(src.goal || ""),
        audience: String(src.audience || ""),
        layout: String(src.layout || ""),
        content: String(src.content || ""),
        constraints: String(src.constraints || ""),
      }
    }

    function briefIsFilled(brief) {
      const draft = briefDraftFrom(brief)
      return Boolean(draft.goal.trim() || draft.audience.trim() || draft.layout.trim() || draft.content.trim() || draft.constraints.trim())
    }

    function briefEquals(a, b) {
      const left = briefDraftFrom(a)
      const right = briefDraftFrom(b)
      return left.goal === right.goal && left.audience === right.audience && left.layout === right.layout && left.content === right.content && left.constraints === right.constraints
    }

    function readOnboarded() {
      return readLocalJson(ONBOARD_KEY, false) === true
    }

    function markOnboarded() {
      writeLocalJson(ONBOARD_KEY, true)
    }

    function contextChips(input, t) {
      const src = input || {}
      const rows = []
      if (src.variant) rows.push({ id: "variant", label: t("chipVariant", { id: String(src.variant).toUpperCase() }), value: String(src.variant) })
      const selector = String(src.selector || "")
      rows.push({ id: "selection", label: selector ? t("chipSelection", { selector: shortSelector(selector, 2) }) : t("chipNone"), value: selector })
      if (Number(src.openComments) > 0) rows.push({ id: "comments", label: t("chipComments", { n: Number(src.openComments) }), value: String(src.openComments) })
      if (Number(src.openIssues) > 0) rows.push({ id: "issues", label: t("chipIssues", { n: Number(src.openIssues) }), value: String(src.openIssues) })
      return rows
    }

    function serializeContext(input) {
      const src = input || {}
      const parts = []
      if (src.variant) parts.push("当前变体：" + src.variant)
      parts.push("选中元素：" + (src.selector || "无"))
      parts.push("未解决评论：" + (Number(src.openComments) || 0))
      parts.push("未修复问题：" + (Number(src.openIssues) || 0))
      return parts.join("；")
    }

    function handoffProjectLine(input) {
      const src = input || {}
      const project = src.project || {}
      const name = project.name || project.id || "未命名项目"
      const id = project.id || ""
      const kind = src.kind || project.kind || "web"
      return "【设计台】项目 " + name + (id ? "（" + id + "）" : "") + "，类型 " + kind
    }

    function handoffContextLine(input) {
      const src = input || {}
      const variant = src.variant || "a"
      return "当前变体：" + variant + "；选中元素：" + (src.selector || "无") + "；未解决评论：" + (Number(src.openComments) || 0) + "；未修复问题：" + (Number(src.openIssues) || 0)
    }

    function buildHandoffPrompt(input) {
      const src = input || {}
      const variant = src.variant || "a"
      const requirement = String(src.requirement || "").trim()
      return [
        handoffProjectLine(src),
        handoffContextLine(src),
        "需求：" + (requirement || "（未填写）"),
        "请使用设计台工具链处理：必要时 design_context / design_system，改 design/" + variant + ".html，",
        "然后 design_check 直到 ≥90，最后 design_export。",
      ].join("\n")
    }

    function buildIssuesPrompt(input) {
      const src = input || {}
      const variant = src.variant || "a"
      const issues = safeArray(src.issues)
      const lines = [handoffProjectLine(src), handoffContextLine(src), "本轮质检问题（" + issues.length + "）："]
      issues.slice(0, 30).forEach((issue, index) => {
        if (!issue) return
        const fix = issue.fix ? "（修法：" + String(issue.fix) + "）" : ""
        const selector = issue.selector ? " 选择器：" + String(issue.selector) : ""
        lines.push(index + 1 + ". [" + String(issue.severity || "info") + "] " + String(issue.code || "") + " — " + String(issue.message || "") + fix + selector)
      })
      lines.push("请逐条修复以上问题，改动 design/" + variant + ".html，然后 design_check 直到 ≥90。")
      return lines.join("\n")
    }

    function buildCommentsPrompt(input) {
      const src = input || {}
      const variant = src.variant || "a"
      const comments = safeArray(src.comments).filter((comment) => comment && !comment.resolvedAt)
      const lines = [handoffProjectLine(src), handoffContextLine(src), "未解决评论（" + comments.length + "）："]
      comments.slice(0, 30).forEach((comment, index) => {
        const element = comment.element && comment.element.text ? "（元素文本：" + String(comment.element.text).slice(0, 60) + "）" : ""
        lines.push(index + 1 + ". 变体 " + String(comment.variant || variant) + " · " + String(comment.selector || "") + " — " + String(comment.note || "") + element)
      })
      lines.push("请读取并按上述评论修改 design/" + variant + ".html，完成后解决对应评论（design_comments resolve）。")
      return lines.join("\n")
    }

    function deriveFlow(detail) {
      const source = detail || {}
      const project = source.project || {}
      const latest = source.latestCheck || null
      const bestValue = project.bestScore !== undefined && project.bestScore !== null ? Number(project.bestScore) : latest && latest.score !== undefined && latest.score !== null ? Number(latest.score) : null
      const stages = [
        { id: "brief", labelKey: "flowRequirement", hintKey: "flowHintRequirement", done: Boolean(project.intake && project.intake.completedAt) || briefIsFilled(project.brief) },
        { id: "context", labelKey: "flowContext", hintKey: "flowHintContext", done: Boolean(project.system) || safeArray(project.context).length > 0 },
        { id: "variants", labelKey: "flowVariants", hintKey: "flowHintVariants", done: safeArray(source.variants).length > 1 },
        { id: "iterate", labelKey: "flowIterate", hintKey: "flowHintIterate", done: Boolean(latest) || safeArray(source.comments).length > 0 || safeArray(source.versions).length > 0 },
        { id: "check", labelKey: "flowCheck", hintKey: "flowHintCheck", done: Number.isFinite(bestValue) && bestValue >= 90 },
        { id: "export", labelKey: "flowExport", hintKey: "flowHintExport", done: safeArray(source.exports).length > 0 },
      ]
      let current = null
      for (let i = 0; i < stages.length; i += 1) {
        if (!stages[i].done) {
          current = stages[i]
          break
        }
      }
      const index = current ? stages.indexOf(current) : -1
      return { stages, currentId: current ? current.id : "", nextId: index >= 0 && stages[index + 1] ? stages[index + 1].id : "", allDone: current === null }
    }

    function handoffPlan(input) {
      const src = input || {}
      const prompt = String(src.prompt || "").trim()
      if (!prompt) return { ok: false, copy: false, switchPanel: false, toastKey: "handoffPromptMissing" }
      const hasLayout = src.hasLayout === true
      return { ok: true, copy: true, switchPanel: hasLayout, toastKey: hasLayout ? "handoffCopied" : "handoffCopiedNoLayout" }
    }

    /* --- v1.3 start wizard + intake helpers (FLOW.md §2.2–§2.4) -------- */

    function fallbackIntakeGroups() {
      const kindOptions = KINDS.map((item) => ({ value: item.id, labelKey: item.labelKey }))
      return [
        {
          id: "basics",
          titleKey: "wizardStep1",
          questions: [
            { id: "kind", type: "kind", labelKey: "qKind", hintKey: "qHintKind", required: true, options: kindOptions },
            { id: "goal", type: "textarea", labelKey: "qGoal", hintKey: "qHintGoal", required: true },
          ],
        },
        {
          id: "audience",
          titleKey: "wizardStep2",
          questions: [
            { id: "audience", type: "textarea", labelKey: "qAudience", hintKey: "qHintAudience", required: true },
            { id: "scenario", type: "text", labelKey: "qScenario", hintKey: "qHintScenario" },
            { id: "tone", type: "text", labelKey: "qTone" },
          ],
        },
        {
          id: "context",
          titleKey: "wizardStep3",
          questions: [
            {
              id: "contextSources",
              type: "multiselect",
              labelKey: "qContextSources",
              required: true,
              options: [
                { value: "existing-design-system", labelKey: "optCtxExisting" },
                { value: "url", labelKey: "optCtxUrl" },
                { value: "repo", labelKey: "optCtxRepo" },
                { value: "screenshots", labelKey: "optCtxScreens" },
                { value: "none", labelKey: "optCtxNone" },
              ],
            },
            { id: "references", type: "textarea", labelKey: "qReferences", hintKey: "qHintReferences" },
            { id: "brandConstraints", type: "textarea", labelKey: "qBrandConstraints", hintKey: "qHintBrand" },
          ],
        },
        {
          id: "variants",
          titleKey: "wizardStep4",
          questions: [
            {
              id: "variationsCount",
              type: "select",
              labelKey: "qVariationsCount",
              required: true,
              options: [
                { value: "2", labelKey: "optVariant2" },
                { value: "3", labelKey: "optVariant3" },
                { value: "4", labelKey: "optVariant4" },
              ],
            },
            {
              id: "dimensions",
              type: "multiselect",
              labelKey: "qDimensions",
              required: true,
              options: [
                { value: "visual", labelKey: "optVisual" },
                { value: "interaction", labelKey: "optInteraction" },
                { value: "layout", labelKey: "optLayout" },
                { value: "copy", labelKey: "optCopy" },
                { value: "motion", labelKey: "optMotion" },
              ],
            },
            { id: "range", type: "range", labelKey: "qRange", hintKey: "qHintRange" },
          ],
        },
        {
          id: "tweaks",
          titleKey: "wizardStep5",
          questions: [
            {
              id: "tweaks",
              type: "multiselect",
              labelKey: "qTweaks",
              hintKey: "qHintTwicks",
              options: [
                { value: "color", labelKey: "optTweakColor" },
                { value: "type", labelKey: "optTweakType" },
                { value: "spacing", labelKey: "optTweakSpacing" },
                { value: "copy", labelKey: "optTweakCopy" },
                { value: "layout", labelKey: "optTweakLayout" },
                { value: "toggle", labelKey: "optTweakToggles" },
              ],
            },
            { id: "contentMust", type: "textarea", labelKey: "qContentMust", hintKey: "qHintContentMust" },
            { id: "contentAvoid", type: "textarea", labelKey: "qContentAvoid", hintKey: "qHintContentAvoid" },
          ],
        },
        {
          id: "delivery",
          titleKey: "wizardStep6",
          questions: [
            {
              id: "deliverables",
              type: "multiselect",
              labelKey: "qDeliverables",
              options: [
                { value: "html", labelKey: "exportHtml" },
                { value: "pdf", labelKey: "exportPdf" },
                { value: "pptx", labelKey: "exportPptx" },
                { value: "png", labelKey: "exportPng" },
                { value: "zip", labelKey: "exportZip" },
              ],
            },
            {
              id: "responsive",
              type: "multiselect",
              labelKey: "qResponsive",
              options: [
                { value: "desktop", labelKey: "optDesktop" },
                { value: "tablet", labelKey: "optTablet" },
                { value: "mobile", labelKey: "optMobile" },
              ],
            },
            {
              id: "success",
              type: "multiselect",
              labelKey: "qSuccess",
              hintKey: "qHintSuccess",
              options: [
                { value: "check>=90", labelKey: "optSuccessCheck" },
                { value: "no-overflow", labelKey: "optSuccessOverflow" },
                { value: "a11y-aa", labelKey: "optSuccessA11y" },
                { value: "first-paint<2s", labelKey: "optSuccessPerf" },
              ],
            },
          ],
        },
      ]
    }

    function normalizeIntakeGroups(raw) {
      const groups = safeArray(raw)
      if (groups.length === 0) return fallbackIntakeGroups()
      const normalized = groups
        .map((group, groupIndex) => {
          if (!group || typeof group !== "object") return null
          const questions = safeArray(group.questions)
            .map((question, questionIndex) => {
              if (!question || typeof question !== "object") return null
              const options = safeArray(question.options).map((option) => {
                if (typeof option === "string") return { value: option, label: option }
                const value = option && option.value !== undefined ? String(option.value) : String((option && option.label) || "")
                return { value, label: String((option && option.label) || value) }
              })
              return {
                id: String(question.id || "q" + groupIndex + "-" + questionIndex),
                type: String(question.type || "text"),
                label: String(question.label || question.id || ""),
                hint: String(question.hint || ""),
                required: question.required === true,
                allowSkip: question.allowSkip !== false,
                options,
              }
            })
            .filter(Boolean)
          if (questions.length === 0) return null
          return { id: String(group.id || "g" + groupIndex), title: String(group.title || group.id || ""), questions }
        })
        .filter(Boolean)
      return normalized.length > 0 ? normalized : fallbackIntakeGroups()
    }

    function wizardAllQuestions(groups) {
      const rows = []
      safeArray(groups).forEach((group) => safeArray(group.questions).forEach((question) => rows.push(question)))
      return rows
    }

    function questionText(question, t, key) {
      const source = question || {}
      const text = key === "hint" ? source.hint : source.label
      if (text) return String(text)
      const dictKey = key === "hint" ? source.hintKey : source.labelKey
      return dictKey ? t(dictKey) : ""
    }

    function questionOptions(question, t) {
      return safeArray(question && question.options).map((option) => ({ value: String(option.value), label: option.labelKey ? t(option.labelKey) : String(option.label || option.value) }))
    }

    function answerIsSet(value) {
      if (Array.isArray(value)) return value.length > 0
      if (value === undefined || value === null || value === false) return false
      return String(value).trim() !== ""
    }

    function wizardAnsweredQuestion(answers, id) {
      return answerIsSet((answers || {})[id])
    }

    function validateWizardStep(questions, answers, delegated) {
      const skipped = safeArray(delegated)
      const missing = []
      safeArray(questions).forEach((question) => {
        if (!question || !question.required) return
        if (wizardAnsweredQuestion(answers, question.id)) return
        if (skipped.indexOf(question.id) !== -1) return
        missing.push(question.id)
      })
      return missing
    }

    function collectOpenQuestions(groups, answers, delegated, t) {
      const skipped = safeArray(delegated)
      const rows = []
      wizardAllQuestions(groups).forEach((question) => {
        if (!question) return
        if (wizardAnsweredQuestion(answers, question.id)) return
        if (skipped.indexOf(question.id) === -1 && !question.required) return
        const label = questionText(question, t)
        if (label) rows.push(label)
      })
      return rows.slice(0, 12)
    }

    function wizardReduce(state, action) {
      const current = state || { step: 0, answers: {}, delegated: [] }
      const answers = Object.assign({}, current.answers || {})
      let delegated = safeArray(current.delegated).slice()
      const act = action || {}
      if (act.type === "answer") {
        answers[act.id] = act.value
        delegated = delegated.filter((id) => id !== act.id)
        return Object.assign({}, current, { answers, delegated })
      }
      if (act.type === "delegate") {
        if (delegated.indexOf(act.id) === -1) delegated.push(act.id)
        delete answers[act.id]
        return Object.assign({}, current, { answers, delegated })
      }
      if (act.type === "skipStep") {
        safeArray(act.questions).forEach((question) => {
          if (!question || !question.required) return
          if (wizardAnsweredQuestion(answers, question.id)) return
          if (delegated.indexOf(question.id) === -1) delegated.push(question.id)
        })
        return Object.assign({}, current, { answers, delegated, step: current.step + 1 })
      }
      if (act.type === "next") return Object.assign({}, current, { step: Math.min(current.step + 1, Math.max(0, (act.total || current.step + 2) - 1)) })
      if (act.type === "back") return Object.assign({}, current, { step: Math.max(0, current.step - 1) })
      if (act.type === "goto") return Object.assign({}, current, { step: Math.max(0, Number(act.step) || 0) })
      if (act.type === "reset") return { step: 0, answers: {}, delegated: [] }
      return current
    }

    function rangeValueToLabel(value) {
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) return "balanced"
      if (numeric <= 33) return "basic"
      if (numeric <= 66) return "balanced"
      return "avant-garde"
    }

    function rangeLabelToValue(range) {
      const text = String(range || "")
      if (text === "basic") return 10
      if (text === "balanced") return 50
      if (text === "avant-garde" || text === "bold") return 90
      const numeric = Number(text)
      return Number.isFinite(numeric) ? clamp(numeric, 0, 100, 50) : 50
    }

    /** The host question bank uses Chinese option values; the fallback bank uses a 0–100 slider. Accept both. */
    function rangeOptionToLabel(value) {
      const text = String(value === undefined || value === null ? "" : value).trim()
      const chinese = { "基础→进阶": "basic", "规则→前卫": "balanced", "保守→实验": "avant-garde" }
      if (chinese[text]) return chinese[text]
      if (text === "basic" || text === "balanced" || text === "avant-garde" || text === "bold") return text === "bold" ? "avant-garde" : text
      const numeric = Number(text)
      return Number.isFinite(numeric) ? rangeValueToLabel(numeric) : "balanced"
    }

    /** Canonical range label -> the host bank Chinese option value (used to prefill 补问). */
    function rangeLabelToOption(label) {
      const normalized = rangeOptionToLabel(label)
      const options = { basic: "基础→进阶", balanced: "规则→前卫", "avant-garde": "保守→实验" }
      return options[normalized] || options.basic
    }

    /** The host bank calls the switch family "toggle"; older intake rows may say "toggles". */
    function tweakId(value) {
      return String(value) === "toggles" ? "toggle" : String(value)
    }

    function answersToBrief(answers) {
      const src = answers || {}
      const constraints = [src.brandConstraints, src.contentAvoid].map((value) => String(value || "").trim()).filter(Boolean).join("\n")
      return {
        goal: String(src.goal || "").trim(),
        audience: String(src.audience || "").trim(),
        layout: "",
        content: String(src.contentMust || "").trim(),
        constraints,
      }
    }

    function answersToIntake(answers, options) {
      const src = answers || {}
      const opts = options || {}
      const count = clamp(parseInt(src.variationsCount, 10) || 3, 2, 4, 3)
      const references = String(src.references || "")
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8)
      const groups = opts.groups || fallbackIntakeGroups()
      const openQuestions = opts.openQuestions || collectOpenQuestions(groups, src, opts.delegated || [], (key) => key)
      return {
        kind: String(src.kind || opts.kind || "web"),
        goal: String(src.goal || "").trim().slice(0, 2000),
        audience: [String(src.audience || "").trim(), String(src.scenario || "").trim(), String(src.tone || "").trim()].filter(Boolean).join(" · ").slice(0, 2000),
        contextSources: safeArray(src.contextSources).map(String).slice(0, 8),
        references,
        brandConstraints: String(src.brandConstraints || "").trim().slice(0, 2000),
        variations: {
          count,
          dimensions: safeArray(safeArray(src.dimensions).length > 0 ? src.dimensions : src.variationDimensions).map(String).slice(0, 8),
          range: rangeOptionToLabel(src.range !== undefined ? src.range : src.variationRange !== undefined ? src.variationRange : 50),
        },
        tweaks: safeArray(src.tweaks).map(tweakId).filter((value, index, list) => value && list.indexOf(value) === index).slice(0, 8),
        contentMust: String(src.contentMust || "").trim().slice(0, 2000),
        contentAvoid: String(src.contentAvoid || "").trim().slice(0, 2000),
        deliverables: safeArray(src.deliverables).map(String).slice(0, 8),
        responsive: safeArray(src.responsive).map(String).slice(0, 8),
        success: safeArray(src.success).map(String).slice(0, 8),
        openQuestions: safeArray(openQuestions).map(String).slice(0, 12),
        completedAt: opts.now || new Date().toISOString(),
        source: opts.source || "wizard",
      }
    }

    function answersFromIntake(intake) {
      const src = intake && typeof intake === "object" ? intake : {}
      const variations = src.variations && typeof src.variations === "object" ? src.variations : {}
      return {
        kind: String(src.kind || "web"),
        goal: String(src.goal || ""),
        audience: String(src.audience || ""),
        contextSources: safeArray(src.contextSources),
        references: safeArray(src.references).join("\n"),
        brandConstraints: String(src.brandConstraints || ""),
        variationsCount: String(variations.count || 3),
        dimensions: safeArray(variations.dimensions).map(String),
        variationDimensions: safeArray(variations.dimensions).map(String),
        range: rangeLabelToValue(variations.range),
        variationRange: rangeLabelToOption(variations.range),
        tweaks: safeArray(src.tweaks).map(tweakId),
        contentMust: String(src.contentMust || ""),
        contentAvoid: String(src.contentAvoid || ""),
        deliverables: safeArray(src.deliverables),
        responsive: safeArray(src.responsive),
        success: safeArray(src.success),
      }
    }

    function mergeIntake(existing, patch) {
      const left = existing && typeof existing === "object" ? existing : {}
      const right = patch && typeof patch === "object" ? patch : {}
      const merged = Object.assign({}, left)
      const arrays = ["contextSources", "references", "tweaks", "deliverables", "responsive", "success", "openQuestions"]
      Object.keys(right).forEach((key) => {
        const value = right[key]
        if (key === "variations") {
          merged.variations = Object.assign({}, left.variations || {}, value || {})
          return
        }
        if (arrays.indexOf(key) !== -1) {
          const union = []
          safeArray(left[key]).concat(safeArray(value)).forEach((item) => {
            const text = String(item)
            if (text && union.indexOf(text) === -1) union.push(text)
          })
          merged[key] = union.slice(0, 12)
          return
        }
        if (value === undefined || value === null || value === "") return
        merged[key] = value
      })
      merged.completedAt = right.completedAt || left.completedAt || new Date().toISOString()
      merged.source = left.source && right.source && left.source !== right.source ? "mixed" : right.source || left.source || "wizard"
      return merged
    }

    function intakeCompleteness(intake) {
      const src = intake && typeof intake === "object" ? intake : null
      const fields = ["kind", "goal", "audience", "contextSources", "brandConstraints", "variations", "tweaks", "contentMust", "contentAvoid", "deliverables", "responsive", "success"]
      if (!src) return { percent: 0, answered: 0, total: fields.length }
      let answered = 0
      fields.forEach((field) => {
        const value = src[field]
        if (field === "variations") {
          const variations = value && typeof value === "object" ? value : {}
          if (safeArray(variations.dimensions).length > 0 || Number(variations.count) > 0) answered += 1
          return
        }
        if (answerIsSet(value)) answered += 1
      })
      return { percent: Math.round((answered / fields.length) * 100), answered, total: fields.length }
    }

    function intakeSummaryGroups(intake, t) {
      const src = intake && typeof intake === "object" ? intake : {}
      const label = (key) => (key ? t(key) : "")
      const optionLabel = (value) => {
        const map = {
          "existing-design-system": "optCtxExisting",
          url: "optCtxUrl",
          repo: "optCtxRepo",
          screenshots: "optCtxScreens",
          none: "optCtxNone",
          visual: "optVisual",
          interaction: "optInteraction",
          layout: "optLayout",
          copy: "optCopy",
          motion: "optMotion",
          color: "optTweakColor",
          type: "optTweakType",
          spacing: "optTweakSpacing",
          toggle: "optTweakToggles",
          toggles: "optTweakToggles",
          html: "exportHtml",
          pdf: "exportPdf",
          pptx: "exportPptx",
          png: "exportPng",
          zip: "exportZip",
          desktop: "optDesktop",
          tablet: "optTablet",
          mobile: "optMobile",
          "check>=90": "optSuccessCheck",
          "no-overflow": "optSuccessOverflow",
          "a11y-aa": "optSuccessA11y",
          "first-paint<2s": "optSuccessPerf",
          basic: "optRangeBasic",
          balanced: "optRangeBalanced",
          "avant-garde": "optRangeBold",
        }
        return map[value] ? t(map[value]) : String(value)
      }
      const groups = []
      const basics = [src.goal, src.audience].filter(Boolean)
      if (basics.length > 0) groups.push({ id: "basics", label: label("intakeGroupBasics"), items: basics.map(String) })
      if (safeArray(src.contextSources).length > 0 || src.brandConstraints) {
        groups.push({
          id: "context",
          label: label("intakeGroupContext"),
          items: safeArray(src.contextSources).map(optionLabel).concat(src.brandConstraints ? [String(src.brandConstraints)] : []),
        })
      }
      const variations = src.variations && typeof src.variations === "object" ? src.variations : {}
      if (Number(variations.count) > 0 || safeArray(variations.dimensions).length > 0) {
        groups.push({
          id: "variants",
          label: label("intakeGroupVariants"),
          items: [String(variations.count || 3) + " 档"].concat(safeArray(variations.dimensions).map(optionLabel)).concat(variations.range ? [optionLabel(variations.range)] : []),
        })
      }
      if (safeArray(src.tweaks).length > 0) groups.push({ id: "tweaks", label: label("intakeGroupTweaks"), items: safeArray(src.tweaks).map(optionLabel) })
      if (src.contentMust || src.contentAvoid) {
        groups.push({ id: "content", label: label("intakeGroupContent"), items: [src.contentMust ? String(src.contentMust) : "", src.contentAvoid ? "✕ " + String(src.contentAvoid) : ""].filter(Boolean) })
      }
      if (safeArray(src.deliverables).length > 0 || safeArray(src.responsive).length > 0 || safeArray(src.success).length > 0) {
        groups.push({
          id: "delivery",
          label: label("intakeGroupDelivery"),
          items: safeArray(src.deliverables).map(optionLabel).concat(safeArray(src.responsive).map(optionLabel)).concat(safeArray(src.success).map(optionLabel)),
        })
      }
      return groups
    }

    function buildStartPrompt(input) {
      const src = input || {}
      const project = src.project || {}
      const intake = src.intake || {}
      const variations = intake.variations && typeof intake.variations === "object" ? intake.variations : {}
      const openQuestions = safeArray(src.openQuestions)
      const lines = [
        "【设计台】开始一个新设计",
        "项目：" + (project.name || project.id || "未命名") + (project.id ? "（" + project.id + "）" : "") + "，类型 " + (intake.kind || project.kind || "web"),
        "",
        "已确认信息：",
      ]
      const push = (label, value) => {
        if (!answerIsSet(value)) return
        const text = Array.isArray(value) ? value.join(" / ") : String(value)
        lines.push("- " + label + "：" + text.slice(0, 600))
      }
      push("目标", intake.goal)
      push("受众 / 场景 / 语气", intake.audience)
      push("语境来源", intake.contextSources)
      push("参考", intake.references)
      push("品牌约束", intake.brandConstraints)
      if (variations.count || safeArray(variations.dimensions).length > 0) lines.push("- 变体：" + (variations.count || 3) + " 档 · " + safeArray(variations.dimensions).join(" / ") + (variations.range ? " · 偏好 " + variations.range : ""))
      push("Tweaks", intake.tweaks)
      push("必须出现", intake.contentMust)
      push("不要出现", intake.contentAvoid)
      push("交付", intake.deliverables)
      push("响应式", intake.responsive)
      push("成功标准", intake.success)
      lines.push("")
      if (openQuestions.length > 0) {
        lines.push("请先追问以下未确认项（≤8 个）：")
        openQuestions.slice(0, 8).forEach((question, index) => lines.push(index + 1 + ". " + question))
      } else {
        lines.push("没有未确认项，可以直接开始。")
      }
      lines.push("")
      lines.push("请按设计台流程执行：design_start（带 intake）→ design_context → 写 a/b/c 三档变体 → design_check 直到 ≥90 → design_export。")
      return lines.join("\n")
    }

    /* ------------------------------------------------------------------ */
    /* Styles — warm paper, ink, one warm accent, one cool signal          */
    /* ------------------------------------------------------------------ */

    const STYLES = `
      .dsg-root {
        --dsg-font: var(--dsw-alias-font-family-sans, "Segoe UI Variable Text", "Segoe UI", -apple-system, "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif);
        --dsg-serif: var(--dsw-alias-font-family-serif, "Iowan Old Style", "Palatino Linotype", Palatino, "Songti SC", "Noto Serif SC", SimSun, STSong, Georgia, serif);
        --dsg-mono: var(--dsw-alias-font-family-mono, ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace);
        --dsg-paper: var(--dsw-alias-bg-base, #f7f4ed);
        --dsg-surface: var(--dsw-alias-bg-layer-1, #fdfbf6);
        --dsg-surface-2: var(--dsw-alias-bg-layer-2, #f1ece1);
        --dsg-sunken: #ece6d9;
        --dsg-canvas: #e6e0d3;
        --dsg-ink: var(--dsw-alias-label-primary, #1e1c18);
        --dsg-ink-2: var(--dsw-alias-label-secondary, #575049);
        --dsg-ink-3: var(--dsw-alias-label-tertiary, #8a8275);
        --dsg-line: var(--dsw-alias-border-l1, #e2dccf);
        --dsg-line-2: var(--dsw-alias-border-l3, #cec6b6);
        --dsg-accent: ${ACCENT};
        --dsg-accent-ink: #8f3f20;
        --dsg-accent-soft: rgba(180, 85, 47, 0.1);
        --dsg-signal: ${SIGNAL};
        --dsg-signal-soft: rgba(63, 111, 106, 0.12);
        --dsg-ok: var(--dsw-alias-state-success, #2f6b4f);
        --dsg-warn: var(--dsw-alias-state-warning, #8a5a12);
        --dsg-danger: var(--dsw-alias-state-error, #a33a2b);
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        overflow: hidden;
        background: var(--dsg-paper);
        color: var(--dsg-ink);
        font-family: var(--dsg-font);
        font-size: 13px;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
      }
      body[data-ds-dark-theme] .dsg-root,
      [data-theme="dark"] .dsg-root,
      .dsg-root[data-theme="dark"] {
        --dsg-sunken: #211f1b;
        --dsg-canvas: #14130f;
        --dsg-accent: #d3774f;
        --dsg-accent-ink: #e59470;
        --dsg-accent-soft: rgba(211, 119, 79, 0.16);
        --dsg-signal: #7fb3ac;
        --dsg-signal-soft: rgba(127, 179, 172, 0.16);
      }
      /* v2: the panel always resolves its own theme attribute, so this wins over
         any host-side dark marker when the user explicitly picks light. */
      .dsg-root[data-theme="light"] {
        --dsg-sunken: #ece6d9;
        --dsg-canvas: #e6e0d3;
        --dsg-accent: ${ACCENT};
        --dsg-accent-ink: #8f3f20;
        --dsg-accent-soft: rgba(180, 85, 47, 0.1);
        --dsg-signal: ${SIGNAL};
        --dsg-signal-soft: rgba(63, 111, 106, 0.12);
      }
      .dsg-root[data-theme="dark"] {
        --dsg-paper: #141416;
        --dsg-surface: #1b1b1e;
        --dsg-surface-2: #232327;
        --dsg-sunken: #1e1e22;
        --dsg-canvas: #101012;
        --dsg-ink: #e9e6df;
        --dsg-ink-2: #b4aea4;
        --dsg-ink-3: #7d776d;
        --dsg-line: #2a2a2e;
        --dsg-line-2: #3a3a40;
        --dsg-accent: #d3774f;
        --dsg-accent-ink: #e59470;
        --dsg-accent-soft: rgba(211, 119, 79, 0.16);
        --dsg-signal: #7fb3ac;
        --dsg-signal-soft: rgba(127, 179, 172, 0.16);
        --dsg-ok: #5fa37c;
        --dsg-warn: #c79b52;
        --dsg-danger: #d3766a;
      }
      .dsg-root[data-theme="dark"] .dsg-btn[data-variant="primary"] { color: #1b1410; }
      .dsg-root[data-theme="dark"] .dsg-btn[data-variant="signal"] { color: #101917; }
      .dsg-root *, .dsg-root *::before, .dsg-root *::after { box-sizing: border-box; }
      .dsg-root button, .dsg-root input, .dsg-root textarea, .dsg-root select { font: inherit; color: inherit; }
      .dsg-root ::selection { background: color-mix(in srgb, var(--dsg-accent) 24%, transparent); }
      .dsg-root ::-webkit-scrollbar { width: 10px; height: 10px; }
      .dsg-root ::-webkit-scrollbar-thumb { background: var(--dsg-line-2); border-radius: 999px; border: 3px solid transparent; background-clip: padding-box; }
      .dsg-shell { display: flex; flex-direction: column; flex: 1; min-height: 0; }

      /* topbar */
      .dsg-topbar { display: flex; align-items: center; gap: 10px; height: 52px; padding: 0 16px; background: var(--dsg-surface); border-bottom: 1px solid var(--dsg-line); flex: none; min-width: 0; }
      .dsg-brand { display: flex; align-items: center; gap: 9px; min-width: 0; flex: none; }
      .dsg-brand-mark { width: 26px; height: 26px; border-radius: 7px; background: var(--dsg-ink); color: var(--dsg-paper); display: grid; place-items: center; flex: none; }
      .dsg-brand-title { font-family: var(--dsg-serif); font-size: 16px; font-weight: 600; letter-spacing: .2px; line-height: 1.15; white-space: nowrap; }
      .dsg-brand-sub { font-size: 10.5px; color: var(--dsg-ink-3); white-space: nowrap; }
      .dsg-topbar-sep { width: 1px; height: 20px; background: var(--dsg-line); margin: 0 3px; flex: none; }
      .dsg-project { display: flex; align-items: center; gap: 7px; min-width: 0; }
      .dsg-project-name { font-weight: 600; font-size: 13.5px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsg-spacer { flex: 1; min-width: 6px; }
      .dsg-topbar-actions { display: flex; align-items: center; gap: 6px; flex: none; }
      .dsg-main { flex: 1; min-height: 0; display: flex; overflow: hidden; }
      .dsg-content { flex: 1; min-height: 0; overflow: auto; }
      .dsg-page { max-width: 1120px; margin: 0 auto; padding: 24px 26px 56px; }
      .dsg-h1 { font-family: var(--dsg-serif); font-size: 24px; font-weight: 600; letter-spacing: -.2px; line-height: 1.25; margin: 0; }
      .dsg-h2 { font-size: 12.5px; font-weight: 650; margin: 0; display: flex; align-items: center; gap: 7px; }
      .dsg-sub { color: var(--dsg-ink-3); font-size: 12px; margin: 4px 0 0; line-height: 1.6; }
      .dsg-kicker { font-size: 10.5px; color: var(--dsg-accent); font-weight: 650; letter-spacing: .02em; }
      .dsg-muted { color: var(--dsg-ink-3); }
      .dsg-dim { color: var(--dsg-ink-2); }
      .dsg-mono { font-family: var(--dsg-mono); font-size: 11px; font-variant-numeric: tabular-nums; }
      .dsg-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; min-width: 0; }
      .dsg-grow { flex: 1; min-width: 0; }
      .dsg-hr { border: 0; border-top: 1px solid var(--dsg-line); margin: 14px 0; }
      .dsg-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
      .dsg-footer-note { margin-top: 22px; text-align: center; font-size: 10.5px; color: var(--dsg-ink-3); }
      .dsg-link { color: var(--dsg-accent); text-decoration: none; border-bottom: 1px solid color-mix(in srgb, var(--dsg-accent) 40%, transparent); cursor: pointer; }
      .dsg-link:hover { border-bottom-color: var(--dsg-accent); }

      /* buttons */
      .dsg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; padding: 0 11px; border: 1px solid var(--dsg-line-2); border-radius: 8px; background: var(--dsg-surface); color: var(--dsg-ink); font-size: 12px; font-weight: 550; cursor: pointer; white-space: nowrap; transition: background .12s ease, border-color .12s ease, color .12s ease; }
      .dsg-btn:hover:not(:disabled) { background: var(--dsg-surface-2); border-color: var(--dsg-ink-3); }
      .dsg-btn:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 2px; }
      .dsg-btn:disabled { opacity: .45; cursor: not-allowed; }
      .dsg-btn[data-variant="primary"] { background: var(--dsg-accent); border-color: var(--dsg-accent); color: #fff; }
      .dsg-btn[data-variant="primary"]:hover:not(:disabled) { background: var(--dsg-accent-ink); border-color: var(--dsg-accent-ink); }
      body[data-ds-dark-theme] .dsg-btn[data-variant="primary"] { color: #1b1410; }
      .dsg-btn[data-variant="signal"] { background: var(--dsg-signal); border-color: var(--dsg-signal); color: #fff; }
      body[data-ds-dark-theme] .dsg-btn[data-variant="signal"] { color: #101917; }
      .dsg-btn[data-variant="dark"] { background: var(--dsg-ink); border-color: var(--dsg-ink); color: var(--dsg-paper); }
      .dsg-btn[data-variant="ghost"] { background: transparent; border-color: transparent; color: var(--dsg-ink-2); }
      .dsg-btn[data-variant="ghost"]:hover:not(:disabled) { background: var(--dsg-surface-2); border-color: transparent; color: var(--dsg-ink); }
      .dsg-btn[data-variant="danger"] { color: var(--dsg-danger); border-color: color-mix(in srgb, var(--dsg-danger) 34%, transparent); background: transparent; }
      .dsg-btn[data-variant="danger"]:hover:not(:disabled) { background: color-mix(in srgb, var(--dsg-danger) 9%, transparent); }
      .dsg-btn[data-size="sm"] { height: 26px; padding: 0 8px; font-size: 11.5px; border-radius: 7px; gap: 4px; }
      .dsg-icon-btn { width: 32px; padding: 0; flex: none; }
      .dsg-icon-btn[data-size="sm"] { width: 26px; }
      .dsg-btn[data-active="true"] { border-color: var(--dsg-ink); }

      /* segmented control */
      .dsg-seg { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--dsg-line); border-radius: 8px; background: var(--dsg-surface-2); flex: none; }
      .dsg-seg-btn { height: 24px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: var(--dsg-ink-3); font-size: 11.5px; font-weight: 550; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
      .dsg-seg-btn:hover { color: var(--dsg-ink-2); }
      .dsg-seg-btn[aria-pressed="true"] { background: var(--dsg-surface); color: var(--dsg-ink); box-shadow: 0 0 0 1px var(--dsg-line), 0 1px 2px rgba(30, 28, 24, .06); }
      .dsg-seg-btn:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 1px; }

      /* chips, bars, dots */
      .dsg-chip { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--dsg-line-2); border-radius: 999px; padding: 1px 8px; font-size: 10.5px; color: var(--dsg-ink-2); white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
      .dsg-chip[data-tone="ok"] { color: var(--dsg-ok); border-color: color-mix(in srgb, var(--dsg-ok) 34%, transparent); background: color-mix(in srgb, var(--dsg-ok) 8%, transparent); }
      .dsg-chip[data-tone="warn"] { color: var(--dsg-warn); border-color: color-mix(in srgb, var(--dsg-warn) 34%, transparent); background: color-mix(in srgb, var(--dsg-warn) 8%, transparent); }
      .dsg-chip[data-tone="danger"] { color: var(--dsg-danger); border-color: color-mix(in srgb, var(--dsg-danger) 34%, transparent); background: color-mix(in srgb, var(--dsg-danger) 7%, transparent); }
      .dsg-chip[data-tone="accent"] { color: var(--dsg-accent); border-color: color-mix(in srgb, var(--dsg-accent) 36%, transparent); background: var(--dsg-accent-soft); }
      .dsg-chip[data-tone="signal"] { color: var(--dsg-signal); border-color: color-mix(in srgb, var(--dsg-signal) 34%, transparent); background: var(--dsg-signal-soft); }
      .dsg-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }
      .dsg-bar { height: 5px; border-radius: 999px; background: var(--dsg-line); overflow: hidden; flex: 1; min-width: 42px; }
      .dsg-bar-fill { height: 100%; border-radius: 999px; background: var(--dsg-signal); transition: width .3s ease; }
      .dsg-bar-fill[data-tone="ok"] { background: var(--dsg-ok); }
      .dsg-bar-fill[data-tone="warn"] { background: var(--dsg-warn); }
      .dsg-bar-fill[data-tone="danger"] { background: var(--dsg-danger); }
      .dsg-bar-fill[data-tone="accent"] { background: var(--dsg-accent); }

      /* score ring */
      .dsg-ring { position: relative; width: 64px; height: 64px; flex: none; }
      .dsg-ring svg { display: block; transform: rotate(-90deg); }
      .dsg-ring-num { position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--dsg-mono); font-size: 18px; font-weight: 600; letter-spacing: -.5px; }
      .dsg-ring[data-tone="ok"] .dsg-ring-num { color: var(--dsg-ok); }
      .dsg-ring[data-tone="warn"] .dsg-ring-num { color: var(--dsg-warn); }
      .dsg-ring[data-tone="danger"] .dsg-ring-num { color: var(--dsg-danger); }

      /* notices, loading, empty */
      .dsg-notice { display: flex; align-items: flex-start; gap: 8px; border-radius: 9px; padding: 8px 11px; font-size: 11.5px; margin-bottom: 12px; border: 1px solid; line-height: 1.55; }
      .dsg-notice[data-tone="err"] { color: var(--dsg-danger); border-color: color-mix(in srgb, var(--dsg-danger) 32%, transparent); background: color-mix(in srgb, var(--dsg-danger) 7%, transparent); }
      .dsg-notice[data-tone="ok"] { color: var(--dsg-ok); border-color: color-mix(in srgb, var(--dsg-ok) 30%, transparent); background: color-mix(in srgb, var(--dsg-ok) 7%, transparent); }
      .dsg-notice[data-tone="warn"] { color: var(--dsg-warn); border-color: color-mix(in srgb, var(--dsg-warn) 32%, transparent); background: color-mix(in srgb, var(--dsg-warn) 7%, transparent); }
      .dsg-notice[data-tone="signal"] { color: var(--dsg-signal); border-color: color-mix(in srgb, var(--dsg-signal) 32%, transparent); background: var(--dsg-signal-soft); }
      .dsg-spinner { width: 13px; height: 13px; border: 2px solid var(--dsg-line); border-top-color: var(--dsg-accent); border-radius: 50%; animation: dsg-spin .7s linear infinite; flex: none; display: inline-block; }
      .dsg-loading { display: flex; align-items: center; gap: 8px; color: var(--dsg-ink-3); font-size: 12px; padding: 18px 4px; }
      .dsg-empty { border: 1px dashed var(--dsg-line-2); border-radius: 12px; padding: 30px 22px; text-align: center; }
      .dsg-empty-title { font-family: var(--dsg-serif); font-size: 17px; font-weight: 600; margin: 0 0 6px; }
      .dsg-empty-body { font-size: 12px; color: var(--dsg-ink-3); max-width: 520px; margin: 0 auto; line-height: 1.7; }
      .dsg-empty-actions { display: flex; justify-content: center; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
      .dsg-empty-code { margin: 12px auto 0; max-width: 520px; text-align: left; }

      /* fields */
      .dsg-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; margin-bottom: 10px; }
      .dsg-field:last-child { margin-bottom: 0; }
      .dsg-label { font-size: 10.5px; font-weight: 600; color: var(--dsg-ink-2); display: flex; align-items: center; gap: 4px; }
      .dsg-hint { font-size: 10.5px; color: var(--dsg-ink-3); line-height: 1.5; }
      .dsg-input, .dsg-textarea, .dsg-select { width: 100%; border: 1px solid var(--dsg-line-2); border-radius: 7px; background: var(--dsg-surface); padding: 6px 8px; font-size: 12px; outline: none; min-height: 30px; transition: border-color .12s ease, box-shadow .12s ease; }
      .dsg-input:hover, .dsg-textarea:hover, .dsg-select:hover { border-color: var(--dsg-ink-3); }
      .dsg-input:focus, .dsg-textarea:focus, .dsg-select:focus { border-color: var(--dsg-accent); box-shadow: 0 0 0 3px var(--dsg-accent-soft); }
      .dsg-input::placeholder, .dsg-textarea::placeholder { color: var(--dsg-ink-3); }
      .dsg-textarea { resize: vertical; min-height: 62px; line-height: 1.55; }
      .dsg-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23888175' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E"); background-position: calc(100% - 10px) center; background-repeat: no-repeat; padding-right: 26px; }
      .dsg-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 12px; }
      .dsg-span-2 { grid-column: 1 / -1; }
      .dsg-checkline { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--dsg-ink-2); cursor: pointer; }
      .dsg-checkline input { accent-color: var(--dsg-accent); width: 14px; height: 14px; }

      /* code */
      .dsg-code { border: 1px solid var(--dsg-line); border-radius: 8px; background: var(--dsg-sunken); overflow: hidden; }
      .dsg-code-head { display: flex; align-items: center; gap: 8px; padding: 4px 8px; border-bottom: 1px solid var(--dsg-line); font-size: 10px; color: var(--dsg-ink-3); }
      .dsg-code-pre { margin: 0; padding: 9px 10px; font-family: var(--dsg-mono); font-size: 10.5px; line-height: 1.6; color: var(--dsg-ink-2); white-space: pre-wrap; overflow-wrap: anywhere; max-height: 260px; overflow: auto; }

      /* kbd, modal, lightbox, toast, popover */
      .dsg-kbd { font-family: var(--dsg-mono); font-size: 10px; border: 1px solid var(--dsg-line-2); border-bottom-width: 2px; border-radius: 5px; padding: 0 5px; min-width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; background: var(--dsg-surface); color: var(--dsg-ink-2); }
      .dsg-scrim { position: absolute; inset: 0; background: rgba(30, 28, 24, .34); z-index: 80; display: grid; place-items: center; padding: 20px; }
      .dsg-modal { width: min(440px, 100%); background: var(--dsg-surface); border: 1px solid var(--dsg-line-2); border-radius: 12px; box-shadow: 0 18px 48px rgba(20, 18, 14, .24); overflow: hidden; }
      .dsg-modal-head { display: flex; align-items: center; gap: 8px; padding: 11px 14px; border-bottom: 1px solid var(--dsg-line); font-weight: 620; font-size: 12.5px; }
      .dsg-modal-body { padding: 14px; font-size: 12px; color: var(--dsg-ink-2); line-height: 1.65; }
      .dsg-modal-actions { display: flex; justify-content: flex-end; gap: 7px; padding: 11px 14px; border-top: 1px solid var(--dsg-line); background: var(--dsg-surface-2); }
      .dsg-lightbox { position: fixed; inset: 0; z-index: 200; background: rgba(16, 15, 12, .82); display: flex; flex-direction: column; }
      .dsg-lightbox-bar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; color: #f4f0e6; font-size: 12px; }
      .dsg-lightbox-body { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 8px 20px 22px; overflow: auto; }
      .dsg-lightbox-body img { max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 20px 60px rgba(0,0,0,.4); background: #fff; }
      .dsg-toast { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 120; display: flex; align-items: center; gap: 8px; padding: 8px 13px; border-radius: 9px; font-size: 12px; background: var(--dsg-ink); color: var(--dsg-paper); box-shadow: 0 12px 30px rgba(20, 18, 14, .28); max-width: min(520px, 90%); }
      .dsg-toast[data-tone="err"] { background: var(--dsg-danger); color: #fff; }
      .dsg-pop { position: absolute; top: 58px; right: 14px; width: min(330px, calc(100% - 28px)); z-index: 90; background: var(--dsg-surface); border: 1px solid var(--dsg-line-2); border-radius: 11px; box-shadow: 0 16px 40px rgba(20, 18, 14, .2); padding: 12px 13px; }
      .dsg-pop-title { font-size: 12px; font-weight: 650; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
      .dsg-shr { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 10px; align-items: start; font-size: 11px; color: var(--dsg-ink-2); }
      .dsg-shr .dsg-kbd { margin-right: 3px; }
      .dsg-kv { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 4px 10px; margin: 0; font-size: 11px; }
      .dsg-kv dt { color: var(--dsg-ink-3); }
      .dsg-kv dd { margin: 0; color: var(--dsg-ink-2); overflow-wrap: anywhere; }

      /* cards */
      .dsg-card { border: 1px solid var(--dsg-line); border-radius: 10px; background: var(--dsg-surface); padding: 13px 14px; min-width: 0; }
      .dsg-card + .dsg-card { margin-top: 10px; }
      .dsg-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; min-width: 0; }
      .dsg-card-head .dsg-h2 { flex: none; }
      .dsg-section { margin-bottom: 18px; }
      .dsg-section:last-child { margin-bottom: 0; }

      /* overview */
      .dsg-hero { display: flex; align-items: flex-end; gap: 18px; flex-wrap: wrap; margin-bottom: 18px; }
      .dsg-hero-text { flex: 1; min-width: 240px; }
      .dsg-project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(268px, 1fr)); gap: 10px; margin-top: 12px; }
      .dsg-project-card { text-align: left; border: 1px solid var(--dsg-line); border-radius: 11px; background: var(--dsg-surface); padding: 13px; cursor: pointer; display: flex; flex-direction: column; gap: 9px; min-width: 0; transition: border-color .12s ease, background .12s ease; }
      .dsg-project-card:hover { border-color: var(--dsg-ink-3); background: var(--dsg-paper); }
      .dsg-project-name-btn { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; flex: 1; min-width: 0; border: 0; background: transparent; padding: 0; text-align: left; cursor: pointer; border-radius: 5px; }
      .dsg-project-name-btn:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 3px; }
      .dsg-project-card:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 2px; }
      .dsg-project-top { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
      .dsg-project-name { font-size: 13.5px; font-weight: 620; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsg-project-id { font-family: var(--dsg-mono); font-size: 9.5px; color: var(--dsg-ink-3); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsg-project-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 10.5px; color: var(--dsg-ink-3); }
      .dsg-project-score { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; font-family: var(--dsg-mono); font-size: 14px; font-weight: 600; border: 2px solid var(--dsg-line); color: var(--dsg-ink-3); flex: none; }
      .dsg-project-score[data-tone="ok"] { border-color: color-mix(in srgb, var(--dsg-ok) 55%, transparent); color: var(--dsg-ok); }
      .dsg-project-score[data-tone="warn"] { border-color: color-mix(in srgb, var(--dsg-warn) 55%, transparent); color: var(--dsg-warn); }
      .dsg-project-score[data-tone="danger"] { border-color: color-mix(in srgb, var(--dsg-danger) 45%, transparent); color: var(--dsg-danger); }
      .dsg-kind-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 7px; }
      .dsg-kind-opt { border: 1px solid var(--dsg-line); border-radius: 9px; background: var(--dsg-surface); padding: 9px 8px; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
      .dsg-kind-opt:hover { border-color: var(--dsg-ink-3); }
      .dsg-kind-opt[data-active="true"] { border-color: var(--dsg-ink); box-shadow: inset 0 0 0 1px var(--dsg-ink); background: var(--dsg-paper); }
      .dsg-kind-opt:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 1px; }
      .dsg-kind-name { font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 5px; }
      .dsg-kind-hint { font-size: 9.5px; color: var(--dsg-ink-3); line-height: 1.4; overflow-wrap: anywhere; }
      .dsg-flow { display: flex; align-items: stretch; justify-content: center; gap: 8px; margin: 16px auto 0; max-width: 760px; flex-wrap: wrap; }
      .dsg-flow-step { flex: 1; min-width: 170px; border: 1px solid var(--dsg-line); border-radius: 10px; padding: 11px 12px; background: var(--dsg-surface); text-align: left; }
      .dsg-flow-num { font-family: var(--dsg-mono); font-size: 10px; color: var(--dsg-accent); display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; border: 1px solid color-mix(in srgb, var(--dsg-accent) 40%, transparent); border-radius: 50%; margin-bottom: 6px; }
      .dsg-flow-title { font-size: 12px; font-weight: 620; margin-bottom: 3px; }
      .dsg-flow-hint { font-size: 10.5px; color: var(--dsg-ink-3); line-height: 1.55; }

      /* workspace */
      .dsg-work { display: flex; flex: 1; min-width: 0; min-height: 0; position: relative; }
      .dsg-rail { width: 214px; flex: none; border-right: 1px solid var(--dsg-line); background: var(--dsg-surface); overflow: auto; padding: 14px 12px 24px; display: flex; flex-direction: column; gap: 18px; }
      .dsg-rail-sec { min-width: 0; }
      .dsg-rail-title { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 650; color: var(--dsg-ink); margin-bottom: 7px; }
      .dsg-rail-title .dsg-count { margin-left: auto; font-family: var(--dsg-mono); font-size: 9.5px; color: var(--dsg-ink-3); }
      .dsg-variant { width: 100%; text-align: left; display: grid; grid-template-columns: 25px minmax(0, 1fr) auto; align-items: center; gap: 7px; padding: 7px; border: 1px solid var(--dsg-line); border-radius: 9px; background: var(--dsg-surface); cursor: pointer; margin-bottom: 5px; min-width: 0; }
      .dsg-variant:hover { border-color: var(--dsg-ink-3); }
      .dsg-variant[data-active="true"] { border-color: var(--dsg-ink); background: var(--dsg-paper); box-shadow: inset 0 0 0 1px var(--dsg-ink); }
      .dsg-variant:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 1px; }
      .dsg-variant-key { width: 25px; height: 25px; border-radius: 6px; display: grid; place-items: center; font-family: var(--dsg-mono); font-size: 12px; font-weight: 600; background: var(--dsg-surface-2); color: var(--dsg-ink-2); }
      .dsg-variant[data-active="true"] .dsg-variant-key { background: var(--dsg-accent); color: #fff; }
      .dsg-variant-name { font-size: 11.5px; font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsg-variant-file { font-family: var(--dsg-mono); font-size: 9px; color: var(--dsg-ink-3); }
      .dsg-variant-score { font-family: var(--dsg-mono); font-size: 11px; font-weight: 600; color: var(--dsg-ink-3); }
      .dsg-variant-score[data-tone="ok"] { color: var(--dsg-ok); }
      .dsg-variant-score[data-tone="warn"] { color: var(--dsg-warn); }
      .dsg-variant-score[data-tone="danger"] { color: var(--dsg-danger); }
      .dsg-rail-hint { font-size: 10px; color: var(--dsg-ink-3); line-height: 1.55; }
      .dsg-brief-lines { display: flex; flex-direction: column; gap: 7px; }
      .dsg-brief-line { min-width: 0; }
      .dsg-brief-key { font-size: 9.5px; color: var(--dsg-ink-3); }
      .dsg-brief-val { font-size: 11px; color: var(--dsg-ink-2); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
      .dsg-center { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; }
      .dsg-toolbar { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; padding: 7px 12px; border-bottom: 1px solid var(--dsg-line); background: var(--dsg-surface); flex: none; }
      .dsg-tool-label { font-size: 10px; color: var(--dsg-ink-3); }
      .dsg-toolbar-sep { width: 1px; height: 18px; background: var(--dsg-line); flex: none; margin: 0 1px; }
      .dsg-toolbar-spacer { flex: 1; min-width: 4px; }
      .dsg-variant-select { display: none; }
      .dsg-stage { position: relative; flex: 1; min-width: 0; min-height: 0; overflow: auto; background: var(--dsg-canvas); }
      .dsg-toolbar:focus-visible, .dsg-stage:focus-visible, .dsg-inspector-body:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: -2px; }
      .dsg-stage-inner { position: relative; min-width: 100%; min-height: 100%; padding: 28px; }
      .dsg-stage-inner > .dsg-frame { margin: 0 auto; }
      .dsg-frame { background: var(--dsg-surface); border: 1px solid var(--dsg-line-2); border-radius: 12px; box-shadow: 0 12px 32px rgba(30, 28, 24, .12), 0 1px 2px rgba(30, 28, 24, .08); overflow: hidden; flex: none; position: relative; }
      .dsg-frame[data-device="phone"] { border-radius: 34px; border-width: 2px; padding: 10px 8px 14px; background: var(--dsg-ink); box-shadow: 0 18px 44px rgba(20, 18, 14, .24); }
      .dsg-frame-chrome { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 11px; border-bottom: 1px solid var(--dsg-line); background: var(--dsg-surface-2); }
      .dsg-dots { display: flex; gap: 5px; flex: none; }
      .dsg-dotmark { width: 7px; height: 7px; border-radius: 50%; border: 1px solid var(--dsg-line-2); background: transparent; }
      .dsg-url { flex: 1; font-family: var(--dsg-mono); font-size: 10px; color: var(--dsg-ink-3); background: var(--dsg-surface); border: 1px solid var(--dsg-line); border-radius: 5px; padding: 1px 7px; max-width: 460px; margin: 0 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
      .dsg-frame-body { position: relative; overflow: hidden; background: #fff; border-radius: 3px; }
      .dsg-frame[data-device="phone"] .dsg-frame-body { border-radius: 24px; }
      .dsg-frame-body iframe { border: 0; display: block; background: #fff; transform-origin: 0 0; }
      .dsg-phone-notch { position: absolute; top: 5px; left: 50%; transform: translateX(-50%); width: 76px; height: 16px; border-radius: 999px; background: #000; z-index: 2; }
      .dsg-stage-overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; z-index: 12; background: color-mix(in srgb, var(--dsg-canvas) 92%, transparent); }
      .dsg-stage-note { display: flex; align-items: center; gap: 6px; font-family: var(--dsg-mono); font-size: 10px; color: var(--dsg-ink-3); background: color-mix(in srgb, var(--dsg-surface) 92%, transparent); border: 1px solid var(--dsg-line); border-radius: 999px; padding: 2px 9px; }
      .dsg-statusbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 5px 12px; border-top: 1px solid var(--dsg-line); background: var(--dsg-surface); font-size: 10.5px; color: var(--dsg-ink-3); flex: none; min-height: 30px; }
      .dsg-status-strong { color: var(--dsg-ink-2); font-family: var(--dsg-mono); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 46vw; }
      .dsg-composer { position: absolute; width: 286px; z-index: 20; background: var(--dsg-surface); border: 1px solid var(--dsg-line-2); border-radius: 11px; box-shadow: 0 16px 40px rgba(20, 18, 14, .2); padding: 10px; }
      .dsg-composer-head { display: flex; align-items: center; gap: 6px; margin-bottom: 7px; min-width: 0; }
      .dsg-composer-target { font-family: var(--dsg-mono); font-size: 10px; color: var(--dsg-ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
      .dsg-composer-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }

      /* inspector */
      .dsg-inspector { width: 344px; flex: none; border-left: 1px solid var(--dsg-line); background: var(--dsg-surface); display: flex; flex-direction: column; min-height: 0; }
      .dsg-inspector-head { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-bottom: 1px solid var(--dsg-line); flex: none; }
      .dsg-inspector-title { font-size: 11.5px; font-weight: 650; flex: 1; }
      .dsg-tabstrip { display: flex; flex-wrap: wrap; gap: 3px; padding: 8px 10px; border-bottom: 1px solid var(--dsg-line); flex: none; background: var(--dsg-surface); }
      .dsg-tab { display: inline-flex; align-items: center; gap: 4px; height: 27px; padding: 0 8px; border-radius: 7px; border: 1px solid transparent; background: transparent; color: var(--dsg-ink-3); font-size: 11px; font-weight: 550; cursor: pointer; position: relative; }
      .dsg-tab:hover { background: var(--dsg-surface-2); color: var(--dsg-ink-2); }
      .dsg-tab[aria-selected="true"] { background: var(--dsg-ink); color: var(--dsg-paper); }
      .dsg-tab:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 1px; }
      .dsg-tab-badge { min-width: 15px; height: 15px; border-radius: 999px; background: var(--dsg-accent); color: #fff; font-family: var(--dsg-mono); font-size: 9px; display: grid; place-items: center; padding: 0 4px; }
      .dsg-inspector-body { flex: 1; min-height: 0; overflow: auto; padding: 12px; }
      .dsg-tabpane { display: flex; flex-direction: column; }
      .dsg-root a.dsg-btn { text-decoration: none; }
      .dsg-sec { margin-bottom: 16px; }
      .dsg-sec:last-child { margin-bottom: 0; }
      .dsg-sec-head { display: flex; align-items: center; gap: 6px; margin-bottom: 7px; min-width: 0; }
      .dsg-sec-title { font-size: 11px; font-weight: 650; color: var(--dsg-ink); flex: none; }
      .dsg-sec-head .dsg-grow { min-width: 4px; }
      .dsg-props { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .dsg-prop { min-width: 0; }
      .dsg-prop-full { grid-column: 1 / -1; }
      .dsg-prop-head { display: flex; align-items: center; gap: 3px; min-height: 14px; }
      .dsg-prop-label { font-size: 9.5px; font-weight: 600; color: var(--dsg-ink-3); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsg-prop-reset { border: 0; background: transparent; color: var(--dsg-ink-3); cursor: pointer; padding: 0 2px; font-size: 10px; border-radius: 4px; line-height: 1.2; }
      .dsg-prop-reset:hover { color: var(--dsg-accent); }
      .dsg-prop-reset:focus-visible { outline: 2px solid var(--dsg-accent); }
      .dsg-prop input, .dsg-prop select { width: 100%; height: 26px; border: 1px solid var(--dsg-line-2); border-radius: 6px; background: var(--dsg-surface); padding: 0 6px; font-size: 11px; font-family: var(--dsg-mono); outline: none; min-width: 0; }
      .dsg-prop input:focus, .dsg-prop select:focus { border-color: var(--dsg-accent); box-shadow: 0 0 0 2px var(--dsg-accent-soft); }
      .dsg-color-field { display: flex; gap: 4px; min-width: 0; }
      .dsg-color-field input[type="color"] { width: 26px; flex: none; padding: 1px; cursor: pointer; }
      .dsg-color-field input[type="text"] { flex: 1; min-width: 0; }
      .dsg-range { width: 100%; accent-color: var(--dsg-accent); height: 26px; }
      .dsg-computed { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 3px 9px; margin: 0; font-size: 10.5px; }
      .dsg-computed dt { color: var(--dsg-ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsg-computed dd { margin: 0; font-family: var(--dsg-mono); font-size: 10px; color: var(--dsg-ink-2); overflow-wrap: anywhere; }
      .dsg-breadcrumb { display: flex; align-items: center; gap: 2px; flex-wrap: wrap; margin-bottom: 8px; }
      .dsg-breadcrumb-seg { border: 0; background: transparent; color: var(--dsg-ink-3); font-family: var(--dsg-mono); font-size: 9.5px; padding: 1px 3px; border-radius: 4px; cursor: pointer; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsg-breadcrumb-seg:hover { background: var(--dsg-surface-2); color: var(--dsg-ink); }
      .dsg-breadcrumb-seg:focus-visible { outline: 2px solid var(--dsg-accent); }
      .dsg-breadcrumb-sep { color: var(--dsg-ink-3); font-size: 9px; }
      .dsg-sel-tag { font-family: var(--dsg-mono); font-size: 10.5px; background: var(--dsg-ink); color: var(--dsg-paper); border-radius: 5px; padding: 1px 6px; }
      .dsg-sel-class { font-family: var(--dsg-mono); font-size: 9.5px; background: var(--dsg-surface-2); border: 1px solid var(--dsg-line); border-radius: 5px; padding: 0 5px; color: var(--dsg-ink-2); }
      .dsg-sel-text { font-size: 11px; color: var(--dsg-ink-2); line-height: 1.55; max-height: 62px; overflow: auto; overflow-wrap: anywhere; border-left: 2px solid var(--dsg-line-2); padding-left: 7px; white-space: pre-wrap; }

      /* comments */
      .dsg-comment { border: 1px solid var(--dsg-line); border-radius: 9px; padding: 9px 10px; margin-bottom: 7px; background: var(--dsg-surface); min-width: 0; }
      .dsg-comment[data-resolved="true"] { opacity: .62; }
      .dsg-comment-head { display: flex; align-items: center; gap: 6px; min-width: 0; }
      .dsg-pin { width: 17px; height: 17px; border-radius: 50%; background: var(--dsg-accent); color: #fff; font-family: var(--dsg-mono); font-size: 9px; display: grid; place-items: center; flex: none; }
      .dsg-pin[data-resolved="true"] { background: var(--dsg-ink-3); }
      .dsg-comment-note { font-size: 11.5px; color: var(--dsg-ink); margin: 5px 0; line-height: 1.55; overflow-wrap: anywhere; white-space: pre-wrap; }
      .dsg-comment-meta { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 9.5px; color: var(--dsg-ink-3); }
      .dsg-reply { border-left: 2px solid var(--dsg-signal); padding-left: 7px; font-size: 10.5px; color: var(--dsg-ink-2); margin-top: 6px; overflow-wrap: anywhere; }

      /* findings + score */
      .dsg-scorecard { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
      .dsg-score-meta { min-width: 0; flex: 1; }
      .dsg-grade { font-family: var(--dsg-mono); font-size: 11px; font-weight: 600; }
      .dsg-finding { border-bottom: 1px solid var(--dsg-line); padding: 8px 1px; min-width: 0; }
      .dsg-finding:last-child { border-bottom: 0; }
      .dsg-finding-head { display: flex; align-items: flex-start; gap: 6px; min-width: 0; }
      .dsg-sev { flex: none; font-size: 9px; font-weight: 650; border-radius: 4px; padding: 0 5px; line-height: 16px; border: 1px solid; }
      .dsg-sev[data-tone="danger"] { color: var(--dsg-danger); border-color: color-mix(in srgb, var(--dsg-danger) 34%, transparent); background: color-mix(in srgb, var(--dsg-danger) 7%, transparent); }
      .dsg-sev[data-tone="warn"] { color: var(--dsg-warn); border-color: color-mix(in srgb, var(--dsg-warn) 34%, transparent); background: color-mix(in srgb, var(--dsg-warn) 7%, transparent); }
      .dsg-sev[data-tone=""] { color: var(--dsg-ink-3); border-color: var(--dsg-line-2); }
      .dsg-finding-msg { font-size: 11px; color: var(--dsg-ink); line-height: 1.5; flex: 1; min-width: 0; overflow-wrap: anywhere; }
      .dsg-finding-code { font-family: var(--dsg-mono); font-size: 9px; color: var(--dsg-ink-3); }
      .dsg-finding-fix { font-size: 10.5px; color: var(--dsg-ink-2); margin-top: 4px; line-height: 1.55; overflow-wrap: anywhere; }
      .dsg-finding-actions { display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
      .dsg-selector-chip { border: 1px solid var(--dsg-line-2); background: var(--dsg-surface-2); color: var(--dsg-ink-2); font-family: var(--dsg-mono); font-size: 9px; border-radius: 5px; padding: 1px 5px; cursor: pointer; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsg-selector-chip:hover { border-color: var(--dsg-accent); color: var(--dsg-accent); }
      .dsg-selector-chip:focus-visible { outline: 2px solid var(--dsg-accent); }
      .dsg-cat-row { display: flex; align-items: center; gap: 7px; margin-bottom: 6px; min-width: 0; }
      .dsg-cat-name { font-size: 10.5px; color: var(--dsg-ink-2); width: 64px; flex: none; }
      .dsg-cat-score { font-family: var(--dsg-mono); font-size: 10px; color: var(--dsg-ink-2); width: 26px; text-align: right; flex: none; }
      .dsg-vp-row { display: flex; align-items: center; gap: 7px; margin-bottom: 5px; }
      .dsg-vp-name { font-family: var(--dsg-mono); font-size: 10px; color: var(--dsg-ink-2); width: 52px; flex: none; }
      .dsg-thumbs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
      .dsg-thumb { border: 1px solid var(--dsg-line); border-radius: 7px; overflow: hidden; background: #fff; cursor: zoom-in; padding: 0; }
      .dsg-thumb img { width: 100%; height: 78px; object-fit: cover; object-position: top; display: block; }
      .dsg-thumb span { display: block; font-family: var(--dsg-mono); font-size: 9px; color: var(--dsg-ink-2); background: var(--dsg-surface-2); padding: 2px 5px; text-align: left; }
      .dsg-thumb:hover { border-color: var(--dsg-accent); }
      .dsg-thumb:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 1px; }

      /* exports */
      .dsg-export-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
      .dsg-export-card { border: 1px solid var(--dsg-line); border-radius: 9px; background: var(--dsg-surface); padding: 9px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
      .dsg-export-card[data-pptx] { }
      .dsg-export-name { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 620; }
      .dsg-export-desc { font-size: 9.5px; color: var(--dsg-ink-3); line-height: 1.45; flex: 1; }
      .dsg-export-card .dsg-btn { margin-top: 3px; width: 100%; }
      .dsg-export-row { display: flex; align-items: center; gap: 7px; border-bottom: 1px solid var(--dsg-line); padding: 6px 1px; font-size: 10.5px; min-width: 0; }
      .dsg-export-row:last-child { border-bottom: 0; }
      .dsg-export-kind { font-family: var(--dsg-mono); font-size: 9px; color: var(--dsg-ink-3); width: 34px; flex: none; }
      .dsg-export-file { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsg-ink-2); }

      /* system */
      .dsg-swatch { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--dsg-line); border-radius: 6px; padding: 2px 6px 2px 3px; font-family: var(--dsg-mono); font-size: 9.5px; color: var(--dsg-ink-2); }
      .dsg-swatch-chip { width: 13px; height: 13px; border-radius: 3px; border: 1px solid rgba(0,0,0,.18); flex: none; }
      .dsg-token-list { display: flex; flex-wrap: wrap; gap: 4px; }
      .dsg-token { font-family: var(--dsg-mono); font-size: 9.5px; background: var(--dsg-surface-2); border: 1px solid var(--dsg-line); border-radius: 4px; padding: 0 5px; color: var(--dsg-ink-2); }
      .dsg-doc { border: 1px solid var(--dsg-line); border-radius: 8px; background: var(--dsg-sunken); padding: 9px 10px; font-family: var(--dsg-mono); font-size: 10px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 260px; overflow: auto; color: var(--dsg-ink-2); margin: 0; }
      .dsg-version-row { display: flex; align-items: center; gap: 7px; border-bottom: 1px solid var(--dsg-line); padding: 7px 1px; min-width: 0; }
      .dsg-version-row:last-child { border-bottom: 0; }
      .dsg-version-label { font-size: 11.5px; font-weight: 550; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      /* 44px touch targets on touch devices */
      @media (pointer: coarse) {
        .dsg-btn { height: 44px; padding: 0 14px; font-size: 13px; }
        .dsg-btn[data-size="sm"] { height: 38px; font-size: 12.5px; }
        .dsg-seg-btn { height: 36px; padding: 0 12px; font-size: 12.5px; }
        .dsg-icon-btn { width: 44px; }
        .dsg-icon-btn[data-size="sm"] { width: 38px; }
        .dsg-tab { height: 38px; font-size: 12px; }
        .dsg-prop input, .dsg-prop select { height: 36px; }
        .dsg-input, .dsg-select { min-height: 40px; }
        .dsg-variant { padding: 10px 8px; }
      }

      /* responsive: 1024 loses the rail, 900 turns the inspector into a drawer */
      @media (max-width: 1280px) {
        .dsg-rail { width: 192px; }
        .dsg-inspector { width: 320px; }
      }
      @media (max-width: 1080px) {
        .dsg-rail { display: none; }
        .dsg-variant-select { display: inline-flex; }
        .dsg-inspector { width: 312px; }
      }
      @media (max-width: 900px) {
        .dsg-inspector { position: absolute; top: 0; right: 0; bottom: 0; z-index: 40; width: min(360px, 92vw); box-shadow: -14px 0 36px rgba(20, 18, 14, .18); transform: translateX(103%); transition: transform .18s ease; }
        .dsg-inspector[data-open="true"] { transform: none; }
        .dsg-inspector-toggle { display: inline-flex; }
        .dsg-stage-inner { padding: 16px; }
        .dsg-page { padding: 18px 16px 48px; }
      }
      @media (min-width: 901px) {
        .dsg-inspector-toggle { display: none; }
        .dsg-drawer-scrim { display: none; }
      }
      @media (max-width: 620px) {
        .dsg-topbar { padding: 0 10px; gap: 7px; }
        .dsg-brand-sub { display: none; }
        .dsg-brand-title { font-size: 15px; }
        .dsg-project-name { max-width: 140px; }
        .dsg-form-grid { grid-template-columns: minmax(0, 1fr); }
        .dsg-kind-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .dsg-project-grid { grid-template-columns: minmax(0, 1fr); }
        .dsg-props { grid-template-columns: minmax(0, 1fr); }
        .dsg-export-grid { grid-template-columns: minmax(0, 1fr); }
        .dsg-status-strong { max-width: 60vw; }
      }
      @media (prefers-reduced-motion: reduce) {
        .dsg-root *, .dsg-root *::before, .dsg-root *::after { animation-duration: 0s !important; transition-duration: 0s !important; }
      }
      @keyframes dsg-spin { to { transform: rotate(360deg); } }

      /* ================= v2 editor shell ================= */
      .eds-root { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; background: var(--dsg-paper); color: var(--dsg-ink); font-family: var(--dsg-font); font-size: 12px; line-height: 1.5; }
      .eds-root *, .eds-root *::before, .eds-root *::after { box-sizing: border-box; }
      .eds-root button, .eds-root input, .eds-root textarea, .eds-root select { font: inherit; color: inherit; }
      .eds-top { display: flex; align-items: center; gap: 8px; height: 52px; flex: none; padding: 0 12px; background: var(--dsg-surface); border-bottom: 1px solid var(--dsg-line); position: relative; z-index: 30; }
      .eds-top-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
      .eds-brand { display: flex; align-items: center; gap: 7px; flex: none; }
      .eds-brand-mark { width: 24px; height: 24px; border-radius: 6px; background: var(--dsg-ink); color: var(--dsg-paper); display: grid; place-items: center; flex: none; }
      .eds-brand-title { font-family: var(--dsg-serif); font-size: 14px; font-weight: 600; white-space: nowrap; }
      .eds-crumb-sep { color: var(--dsg-ink-3); flex: none; display: inline-flex; }
      .eds-name-btn { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 7px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--dsg-ink); font-size: 13px; font-weight: 600; cursor: text; max-width: 260px; min-width: 0; }
      .eds-name-btn:hover { background: var(--dsg-surface-2); border-color: var(--dsg-line); }
      .eds-name-btn:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 1px; }
      .eds-name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .eds-name-input { height: 26px; width: 200px; border: 1px solid var(--dsg-accent); border-radius: 6px; background: var(--dsg-surface); padding: 0 7px; font-size: 13px; font-weight: 600; outline: none; box-shadow: 0 0 0 3px var(--dsg-accent-soft); }
      .eds-chip-row { display: flex; align-items: center; gap: 5px; flex-wrap: nowrap; min-width: 0; }
      .eds-score-chip { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px; border-radius: 999px; border: 1px solid var(--dsg-line-2); background: var(--dsg-surface); font-family: var(--dsg-mono); font-size: 10.5px; font-weight: 600; cursor: pointer; color: var(--dsg-ink-2); white-space: nowrap; }
      .eds-score-chip:hover { border-color: var(--dsg-ink-3); color: var(--dsg-ink); }
      .eds-score-chip:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 1px; }
      .eds-score-chip[data-tone="ok"] { color: var(--dsg-ok); border-color: color-mix(in srgb, var(--dsg-ok) 40%, transparent); }
      .eds-score-chip[data-tone="warn"] { color: var(--dsg-warn); border-color: color-mix(in srgb, var(--dsg-warn) 40%, transparent); }
      .eds-score-chip[data-tone="danger"] { color: var(--dsg-danger); border-color: color-mix(in srgb, var(--dsg-danger) 40%, transparent); }
      .eds-seg-views { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--dsg-line); border-radius: 7px; background: var(--dsg-surface-2); }
      .eds-top-right { display: flex; align-items: center; gap: 4px; margin-left: auto; flex: none; }
      .eds-toolbar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-height: 44px; padding: 5px 10px; flex: none; background: var(--dsg-surface); border-bottom: 1px solid var(--dsg-line); position: relative; z-index: 20; }
      .eds-tgroup { display: inline-flex; align-items: center; gap: 3px; flex: none; }
      .eds-vsep { width: 1px; height: 18px; background: var(--dsg-line); margin: 0 2px; flex: none; }
      .eds-tbtn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 30px; min-width: 30px; padding: 0 8px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--dsg-ink-2); font-size: 11.5px; font-weight: 550; cursor: pointer; white-space: nowrap; position: relative; }
      .eds-tbtn:hover:not(:disabled) { background: var(--dsg-surface-2); color: var(--dsg-ink); }
      .eds-tbtn[data-active="true"] { background: var(--dsg-ink); color: var(--dsg-paper); border-color: var(--dsg-ink); }
      .eds-tbtn[data-tone="primary"] { background: var(--dsg-accent); border-color: var(--dsg-accent); color: #fff; }
      .dsg-root[data-theme="dark"] .eds-tbtn[data-tone="primary"] { color: #1b1410; }
      .eds-tbtn[data-tone="signal"] { background: var(--dsg-signal); border-color: var(--dsg-signal); color: #fff; }
      .dsg-root[data-theme="dark"] .eds-tbtn[data-tone="signal"] { color: #101917; }
      .eds-tbtn:disabled { opacity: .4; cursor: not-allowed; }
      .eds-tbtn:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 1px; }
      .eds-tbtn[data-dirty="true"] { box-shadow: inset 0 0 0 1px var(--dsg-accent); color: var(--dsg-ink); }
      .eds-tbtn[data-active="soft"] { background: var(--dsg-surface-2); color: var(--dsg-ink); border-color: var(--dsg-line); }
      .eds-tool-label { font-size: 10px; color: var(--dsg-ink-3); margin-right: 2px; flex: none; white-space: nowrap; }
      .eds-select { height: 28px; border: 1px solid var(--dsg-line-2); border-radius: 6px; background: var(--dsg-surface); padding: 0 24px 0 7px; font-size: 11.5px; outline: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23888175' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: calc(100% - 8px) center; cursor: pointer; }
      .eds-select:focus-visible { border-color: var(--dsg-accent); box-shadow: 0 0 0 2px var(--dsg-accent-soft); }
      .eds-zoom-ctl { display: inline-flex; align-items: center; gap: 1px; border: 1px solid var(--dsg-line); border-radius: 7px; background: var(--dsg-surface); padding: 1px; }
      .eds-zoom-input { width: 48px; height: 26px; text-align: center; border: 0; background: transparent; font-family: var(--dsg-mono); font-size: 11px; outline: none; }
      .eds-zoom-input:focus-visible { box-shadow: inset 0 0 0 1px var(--dsg-accent); border-radius: 4px; }
      .eds-viewport-input { width: 62px; }

      .eds-body { display: flex; flex: 1; min-height: 0; min-width: 0; position: relative; }
      .eds-left { flex: none; min-width: 0; border-right: 1px solid var(--dsg-line); background: var(--dsg-surface); display: flex; flex-direction: column; overflow: hidden; }
      .eds-right { flex: none; min-width: 0; border-left: 1px solid var(--dsg-line); background: var(--dsg-surface); display: flex; flex-direction: column; overflow: hidden; }
      .eds-split { flex: none; width: 5px; cursor: col-resize; background: transparent; position: relative; margin: 0 -3px; z-index: 6; }
      .eds-split:hover::after, .eds-split[data-dragging="true"]::after { content: ""; position: absolute; top: 0; bottom: 0; left: 2px; width: 1px; background: var(--dsg-accent); }
      .eds-center { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; position: relative; background: var(--dsg-canvas); }
      .eds-ltabs, .eds-rtabs { display: flex; align-items: center; gap: 2px; padding: 5px 7px; border-bottom: 1px solid var(--dsg-line); flex: none; overflow-x: auto; scrollbar-width: none; }
      .eds-ltabs::-webkit-scrollbar, .eds-rtabs::-webkit-scrollbar { display: none; }
      .eds-ltab, .eds-rtab { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: var(--dsg-ink-3); font-size: 11px; font-weight: 550; cursor: pointer; white-space: nowrap; flex: none; }
      .eds-ltab:hover, .eds-rtab:hover { color: var(--dsg-ink); background: var(--dsg-surface-2); }
      .eds-ltab[aria-selected="true"], .eds-rtab[aria-selected="true"] { background: var(--dsg-surface-2); color: var(--dsg-ink); box-shadow: inset 0 0 0 1px var(--dsg-line); }
      .eds-ltab:focus-visible, .eds-rtab:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: -1px; }
      .eds-ltab-badge { min-width: 14px; height: 14px; padding: 0 4px; border-radius: 999px; background: var(--dsg-accent); color: #fff; font-family: var(--dsg-mono); font-size: 9px; display: grid; place-items: center; }
      .eds-lbody { flex: 1; min-height: 0; overflow: auto; padding: 8px; }
      .eds-rbody { flex: 1; min-height: 0; overflow: auto; }
      .eds-tree-tools { position: sticky; top: -8px; z-index: 2; background: var(--dsg-surface); padding: 2px 0 6px; margin: -2px 0 0; }
      .eds-search { position: relative; }
      .eds-search input { width: 100%; height: 28px; border: 1px solid var(--dsg-line); border-radius: 6px; background: var(--dsg-surface-2); padding: 0 8px 0 26px; font-size: 11.5px; outline: none; }
      .eds-search input:focus { border-color: var(--dsg-accent); box-shadow: 0 0 0 2px var(--dsg-accent-soft); }
      .eds-search-icon { position: absolute; left: 7px; top: 7px; color: var(--dsg-ink-3); pointer-events: none; }
      .eds-tree { margin: 2px -4px 0; }
      .eds-trow { display: flex; align-items: center; gap: 4px; height: 28px; padding: 0 4px; border-radius: 5px; cursor: pointer; color: var(--dsg-ink-2); font-size: 11.5px; min-width: 0; position: relative; }
      .eds-trow:hover { background: var(--dsg-surface-2); color: var(--dsg-ink); }
      .eds-trow[data-active="true"] { background: var(--dsg-accent-soft); color: var(--dsg-ink); }
      .eds-trow[data-active="true"]::before { content: ""; position: absolute; left: 0; top: 4px; bottom: 4px; width: 2px; border-radius: 2px; background: var(--dsg-accent); }
      .eds-trow[data-hover="true"] { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsg-accent) 46%, transparent); }
      .eds-trow:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: -1px; }
      .eds-tcaret { width: 14px; height: 14px; flex: none; display: grid; place-items: center; border: 0; background: transparent; color: var(--dsg-ink-3); cursor: pointer; border-radius: 3px; }
      .eds-tcaret:hover { color: var(--dsg-ink); }
      .eds-ticon { flex: none; color: var(--dsg-ink-3); display: inline-flex; }
      .eds-trow[data-active="true"] .eds-ticon { color: var(--dsg-accent); }
      .eds-tlabel { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--dsg-mono); font-size: 10.5px; }
      .eds-tmeta { font-size: 9.5px; color: var(--dsg-ink-3); flex: none; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .eds-eye { flex: none; width: 20px; height: 20px; border: 0; border-radius: 4px; background: transparent; color: var(--dsg-ink-3); display: grid; place-items: center; cursor: pointer; opacity: 0; }
      .eds-trow:hover .eds-eye, .eds-trow[data-hidden="true"] .eds-eye { opacity: 1; }
      .eds-eye:hover { color: var(--dsg-ink); background: var(--dsg-surface); }
      .eds-eye:focus-visible { opacity: 1; outline: 2px solid var(--dsg-accent); }
      .eds-trow[data-hidden="true"] .eds-tlabel { opacity: .55; text-decoration: line-through; }
      .eds-tree-empty { padding: 22px 10px; text-align: center; color: var(--dsg-ink-3); font-size: 11px; line-height: 1.65; }
      .eds-tree-empty b { display: block; color: var(--dsg-ink-2); font-size: 11.5px; margin-bottom: 3px; }

      .eds-varcard { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 7px; width: 100%; text-align: left; padding: 7px; border: 1px solid var(--dsg-line); border-radius: 7px; background: var(--dsg-surface); margin-bottom: 5px; cursor: pointer; }
      .eds-varcard:hover { border-color: var(--dsg-ink-3); }
      .eds-varcard[data-active="true"] { border-color: var(--dsg-ink); box-shadow: inset 0 0 0 1px var(--dsg-ink); }
      .eds-varcard:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 1px; }
      .eds-varkey { width: 24px; height: 24px; border-radius: 5px; display: grid; place-items: center; font-family: var(--dsg-mono); font-size: 11.5px; font-weight: 600; background: var(--dsg-surface-2); color: var(--dsg-ink-2); }
      .eds-varcard[data-active="true"] .eds-varkey { background: var(--dsg-accent); color: #fff; }
      .eds-varname { font-size: 11.5px; font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .eds-varmeta { font-family: var(--dsg-mono); font-size: 9px; color: var(--dsg-ink-3); }
      .eds-varscore { font-family: var(--dsg-mono); font-size: 11px; font-weight: 600; color: var(--dsg-ink-3); }
      .eds-hint { font-size: 10px; color: var(--dsg-ink-3); line-height: 1.6; margin: 6px 2px 0; }

      .eds-scroll { flex: 1; min-height: 0; overflow: auto; position: relative; }
      .eds-scroll[data-panning="true"] { cursor: grabbing; }
      .eds-desk { position: relative; min-width: 100%; min-height: 100%; padding: 28px; }
      .eds-frame { margin: 0 auto; background: var(--dsg-surface); border: 1px solid var(--dsg-line-2); border-radius: 10px; box-shadow: 0 14px 40px rgba(20, 18, 14, .14); overflow: hidden; position: relative; }
      .eds-frame-bar { display: flex; align-items: center; gap: 7px; height: 30px; padding: 0 9px; background: var(--dsg-surface-2); border-bottom: 1px solid var(--dsg-line); font-size: 10px; color: var(--dsg-ink-3); }
      .eds-frame-dots { display: flex; gap: 4px; }
      .eds-frame-dot { width: 6px; height: 6px; border-radius: 50%; border: 1px solid var(--dsg-line-2); }
      .eds-frame-url { flex: 1; text-align: center; font-family: var(--dsg-mono); font-size: 9.5px; background: var(--dsg-surface); border: 1px solid var(--dsg-line); border-radius: 4px; padding: 0 6px; max-width: 420px; margin: 0 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .eds-frame-body { position: relative; overflow: hidden; background: #fff; }
      .eds-frame-body iframe { border: 0; display: block; background: #fff; transform-origin: 0 0; }
      .eds-pins { position: absolute; inset: 0; pointer-events: none; }
      .eds-pin { position: absolute; width: 22px; height: 22px; margin-left: -11px; margin-top: -11px; border-radius: 50% 50% 50% 2px; border: 2px solid #fff; background: var(--dsg-accent); color: #fff; font-family: var(--dsg-mono); font-size: 9.5px; font-weight: 600; display: grid; place-items: center; cursor: pointer; pointer-events: auto; box-shadow: 0 2px 6px rgba(0, 0, 0, .25); padding: 0; }
      .eds-pin[data-resolved="true"] { background: var(--dsg-ink-3); }
      .eds-pin:hover { transform: scale(1.1); }
      .eds-pin:focus-visible { outline: 2px solid #fff; }
      .eds-float { position: absolute; z-index: 12; display: flex; align-items: center; gap: 1px; padding: 3px; border-radius: 8px; background: var(--dsg-surface); border: 1px solid var(--dsg-line-2); box-shadow: 0 8px 24px rgba(20, 18, 14, .18); }
      .eds-float-btn { width: 26px; height: 26px; border: 0; border-radius: 5px; background: transparent; color: var(--dsg-ink-2); display: grid; place-items: center; cursor: pointer; position: relative; }
      .eds-float-btn:hover { background: var(--dsg-surface-2); color: var(--dsg-ink); }
      .eds-float-btn:focus-visible { outline: 2px solid var(--dsg-accent); }
      .eds-float-btn[data-active="true"] { background: var(--dsg-ink); color: var(--dsg-paper); }
      .eds-float-sep { width: 1px; height: 16px; background: var(--dsg-line); margin: 0 2px; }
      .eds-float-size { font-family: var(--dsg-mono); font-size: 9.5px; color: var(--dsg-ink-3); padding: 0 5px; white-space: nowrap; }
      .eds-dock { position: absolute; right: 12px; bottom: 12px; z-index: 11; display: flex; align-items: center; gap: 2px; padding: 3px; border-radius: 8px; background: color-mix(in srgb, var(--dsg-surface) 94%, transparent); border: 1px solid var(--dsg-line); box-shadow: 0 4px 14px rgba(20, 18, 14, .1); }
      .eds-dock-btn { height: 24px; min-width: 24px; padding: 0 6px; border: 0; border-radius: 5px; background: transparent; color: var(--dsg-ink-2); font-family: var(--dsg-mono); font-size: 10px; cursor: pointer; }
      .eds-dock-btn:hover { background: var(--dsg-surface-2); color: var(--dsg-ink); }
      .eds-dock-btn:focus-visible { outline: 2px solid var(--dsg-accent); }
      .eds-canvas-hint { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); z-index: 10; display: flex; gap: 6px; align-items: center; padding: 3px 10px; border-radius: 999px; background: color-mix(in srgb, var(--dsg-surface) 92%, transparent); border: 1px solid var(--dsg-line); color: var(--dsg-ink-3); font-size: 10px; white-space: nowrap; pointer-events: none; }
      .eds-overlay-msg { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; background: color-mix(in srgb, var(--dsg-canvas) 94%, transparent); z-index: 14; }
      .eds-artboards { display: flex; gap: 18px; padding: 24px; align-items: flex-start; min-height: 100%; overflow-x: auto; }
      .eds-ab { flex: none; background: var(--dsg-surface); border: 1px solid var(--dsg-line-2); border-radius: 8px; overflow: hidden; cursor: pointer; box-shadow: 0 8px 22px rgba(20, 18, 14, .1); padding: 0; text-align: left; }
      .eds-ab:hover { border-color: var(--dsg-accent); }
      .eds-ab[data-active="true"] { border-color: var(--dsg-ink); box-shadow: inset 0 0 0 1px var(--dsg-ink), 0 8px 22px rgba(20, 18, 14, .12); }
      .eds-ab:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 2px; }
      .eds-ab-label { display: flex; align-items: center; gap: 6px; height: 26px; padding: 0 8px; border-bottom: 1px solid var(--dsg-line); background: var(--dsg-surface-2); font-size: 10px; color: var(--dsg-ink-2); white-space: nowrap; }
      .eds-ab-score { margin-left: auto; font-family: var(--dsg-mono); font-size: 9.5px; color: var(--dsg-ink-3); }
      .eds-ab-body { position: relative; overflow: hidden; background: #fff; }
      .eds-ab-body iframe { border: 0; display: block; transform-origin: 0 0; background: #fff; }

      .eds-sec { border-bottom: 1px solid var(--dsg-line); }
      .eds-sec:last-child { border-bottom: 0; }
      .eds-sec-head { display: flex; align-items: center; gap: 5px; width: 100%; padding: 7px 10px; border: 0; background: transparent; cursor: pointer; text-align: left; color: var(--dsg-ink); }
      .eds-sec-head:hover { background: var(--dsg-surface-2); }
      .eds-sec-head:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: -2px; }
      .eds-sec-caret { color: var(--dsg-ink-3); transition: transform .12s ease; flex: none; display: inline-flex; }
      .eds-sec[data-open="true"] .eds-sec-caret { transform: rotate(90deg); }
      .eds-sec-title { font-size: 11px; font-weight: 600; letter-spacing: .01em; flex: 1; min-width: 0; }
      .eds-sec-reset { opacity: 0; }
      .eds-sec-head:hover .eds-sec-reset, .eds-sec-head:focus-visible .eds-sec-reset { opacity: 1; }
      .eds-sec-body { padding: 2px 10px 10px; display: flex; flex-direction: column; gap: 6px; }
      .eds-row2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
      .eds-row4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
      .eds-field { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
      .eds-field-label { font-size: 9.5px; font-weight: 600; color: var(--dsg-ink-3); }
      .eds-input { width: 100%; height: 26px; border: 1px solid var(--dsg-line-2); border-radius: 5px; background: var(--dsg-surface); padding: 0 6px; font-size: 11px; font-family: var(--dsg-mono); outline: none; min-width: 0; }
      .eds-input:focus { border-color: var(--dsg-accent); box-shadow: 0 0 0 2px var(--dsg-accent-soft); }
      .eds-input[readonly] { color: var(--dsg-ink-3); background: var(--dsg-surface-2); }
      textarea.eds-input { height: auto; min-height: 52px; padding: 5px 6px; font-family: var(--dsg-font); font-size: 11.5px; line-height: 1.5; resize: vertical; }
      select.eds-input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23888175' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: calc(100% - 7px) center; padding-right: 20px; }
      .eds-color { display: flex; gap: 4px; min-width: 0; }
      .eds-color input[type="color"] { width: 26px; height: 26px; flex: none; padding: 1px; border: 1px solid var(--dsg-line-2); border-radius: 5px; background: var(--dsg-surface); cursor: pointer; }
      .eds-color .eds-input { flex: 1; }
      .eds-alignbar { display: flex; gap: 2px; flex-wrap: wrap; }
      .eds-alignbar .eds-tbtn { border: 1px solid var(--dsg-line); }
      .eds-contrast { display: inline-flex; align-items: center; gap: 4px; font-family: var(--dsg-mono); font-size: 9.5px; padding: 1px 6px; border-radius: 999px; border: 1px solid var(--dsg-line-2); align-self: flex-start; color: var(--dsg-ink-3); }
      .eds-contrast[data-tone="ok"] { color: var(--dsg-ok); border-color: color-mix(in srgb, var(--dsg-ok) 40%, transparent); }
      .eds-contrast[data-tone="warn"] { color: var(--dsg-warn); border-color: color-mix(in srgb, var(--dsg-warn) 40%, transparent); }
      .eds-contrast[data-tone="danger"] { color: var(--dsg-danger); border-color: color-mix(in srgb, var(--dsg-danger) 40%, transparent); }
      .eds-elem-card { padding: 10px; border-bottom: 1px solid var(--dsg-line); display: flex; flex-direction: column; gap: 6px; }
      .eds-elem-top { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
      .eds-crumb { display: flex; align-items: center; gap: 1px; flex-wrap: wrap; }
      .eds-crumb button { border: 0; background: transparent; color: var(--dsg-ink-3); font-family: var(--dsg-mono); font-size: 9px; padding: 1px 3px; border-radius: 3px; cursor: pointer; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .eds-crumb button:hover { background: var(--dsg-surface-2); color: var(--dsg-ink); }
      .eds-empty-mini { padding: 26px 16px; text-align: center; color: var(--dsg-ink-3); font-size: 11px; line-height: 1.65; }
      .eds-empty-mini b { display: block; color: var(--dsg-ink-2); font-size: 12px; margin-bottom: 4px; }

      .eds-status { display: flex; align-items: center; gap: 8px; height: 26px; flex: none; padding: 0 10px; background: var(--dsg-surface); border-top: 1px solid var(--dsg-line); font-size: 10.5px; color: var(--dsg-ink-3); overflow: hidden; }
      .eds-status-item { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
      .eds-status-item b { color: var(--dsg-ink-2); font-weight: 550; font-family: var(--dsg-mono); font-size: 10px; }
      .eds-status-spacer { flex: 1; }
      .eds-status-sep { width: 1px; height: 12px; background: var(--dsg-line); flex: none; }
      .eds-status-sel { max-width: 38%; }

      .eds-overlay { position: absolute; inset: 0; z-index: 80; background: rgba(20, 18, 14, .34); display: flex; align-items: flex-start; justify-content: center; padding: 12vh 16px 16px; }
      .eds-palette { width: min(560px, 100%); max-height: 60vh; display: flex; flex-direction: column; background: var(--dsg-surface); border: 1px solid var(--dsg-line-2); border-radius: 12px; box-shadow: 0 24px 70px rgba(20, 18, 14, .32); overflow: hidden; }
      .eds-palette-search { position: relative; }
      .eds-palette-input { width: 100%; height: 46px; border: 0; border-bottom: 1px solid var(--dsg-line); background: transparent; padding: 0 14px 0 40px; font-size: 13px; outline: none; color: var(--dsg-ink); }
      .eds-palette-list { flex: 1; min-height: 0; overflow: auto; padding: 6px; }
      .eds-cmd { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border: 0; border-radius: 7px; background: transparent; color: var(--dsg-ink-2); font-size: 12px; text-align: left; cursor: pointer; }
      .eds-cmd[data-active="true"] { background: var(--dsg-ink); color: var(--dsg-paper); }
      .eds-cmd:hover { background: var(--dsg-surface-2); color: var(--dsg-ink); }
      .eds-cmd[data-active="true"]:hover { background: var(--dsg-ink); color: var(--dsg-paper); }
      .eds-cmd-icon { flex: none; opacity: .8; display: inline-flex; }
      .eds-cmd-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .eds-cmd-group { font-size: 9px; opacity: .6; flex: none; }
      .eds-cmd-kbd { font-family: var(--dsg-mono); font-size: 9px; opacity: .7; flex: none; }
      .eds-palette-foot { display: flex; align-items: center; gap: 10px; padding: 6px 12px; border-top: 1px solid var(--dsg-line); font-size: 9.5px; color: var(--dsg-ink-3); }
      .eds-sheet { width: min(720px, 100%); max-height: 72vh; display: flex; flex-direction: column; background: var(--dsg-surface); border: 1px solid var(--dsg-line-2); border-radius: 12px; box-shadow: 0 24px 70px rgba(20, 18, 14, .32); overflow: hidden; }
      .eds-sheet-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--dsg-line); font-size: 13px; font-weight: 600; }
      .eds-sheet-body { overflow: auto; padding: 8px 14px 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 24px; }
      .eds-sheet-group { grid-column: 1 / -1; margin: 10px 0 4px; font-size: 10px; color: var(--dsg-accent); font-weight: 600; }
      .eds-shortcut { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--dsg-line); font-size: 11px; color: var(--dsg-ink-2); min-width: 0; }
      .eds-shortcut:last-child { border-bottom: 0; }
      .eds-shortcut span { flex: 1; min-width: 0; }
      .eds-kbd-group { display: flex; gap: 3px; flex: none; }
      .eds-menu { position: absolute; z-index: 90; min-width: 190px; padding: 5px; background: var(--dsg-surface); border: 1px solid var(--dsg-line-2); border-radius: 9px; box-shadow: 0 16px 42px rgba(20, 18, 14, .24); }
      .eds-menu-item { display: flex; align-items: center; gap: 7px; width: 100%; height: 28px; padding: 0 8px; border: 0; border-radius: 5px; background: transparent; color: var(--dsg-ink-2); font-size: 11.5px; text-align: left; cursor: pointer; }
      .eds-menu-item:hover { background: var(--dsg-surface-2); color: var(--dsg-ink); }
      .eds-menu-item[data-danger="true"] { color: var(--dsg-danger); }
      .eds-menu-item:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: -2px; }
      .eds-menu-sep { height: 1px; margin: 4px 6px; background: var(--dsg-line); }
      .eds-menu-head { padding: 4px 8px 5px; font-size: 9.5px; color: var(--dsg-ink-3); }
      .eds-drawer-scrim { position: absolute; inset: 0; background: rgba(20, 18, 14, .32); z-index: 40; }
      .eds-skeleton { background: var(--dsg-surface-2); border-radius: 6px; animation: eds-pulse 1.4s ease-in-out infinite; }
      @keyframes eds-pulse { 0%, 100% { opacity: .5; } 50% { opacity: .95; } }
      .eds-diagnostics { margin: 0; padding: 10px; border: 1px solid var(--dsg-line); border-radius: 8px; background: var(--dsg-sunken); font-family: var(--dsg-mono); font-size: 10px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 320px; overflow: auto; }

      [data-tip] { position: relative; }
      [data-tip]::after { content: attr(data-tip); position: absolute; left: 50%; top: calc(100% + 6px); transform: translateX(-50%) translateY(2px); padding: 3px 7px; border-radius: 5px; background: var(--dsg-ink); color: var(--dsg-paper); font-family: var(--dsg-font); font-size: 10px; font-weight: 500; white-space: nowrap; pointer-events: none; opacity: 0; z-index: 300; transition: opacity .1s ease .3s, transform .1s ease .3s; }
      [data-tip]:hover::after { opacity: 1; transform: translateX(-50%) translateY(0); }
      [data-tip]:focus-visible::after { opacity: 1; transform: translateX(-50%) translateY(0); transition-delay: 0s; }
      [data-tip][data-tip-side="right"]::after { left: calc(100% + 6px); top: 50%; bottom: auto; transform: translateY(-50%); }
      [data-tip][data-tip-side="top"]::after { top: auto; bottom: calc(100% + 6px); }

      /* v1.2 requirement flow: composer, examples, onboarding, stepper */
      .dsg-composer-card { border: 1px solid var(--dsg-line); border-radius: 14px; background: var(--dsg-surface); padding: 18px 20px; margin-top: 16px; box-shadow: 0 1px 2px rgba(20, 18, 14, .04); }
      .dsg-composer-title { font-family: var(--dsg-serif); font-size: 19px; font-weight: 600; margin: 0 0 4px; }
      .dsg-composer-hint { color: var(--dsg-ink-3); font-size: 11.5px; margin: 0 0 13px; line-height: 1.65; max-width: 680px; }
      .dsg-kind-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
      .dsg-kind-chip { display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 12px; border: 1px solid var(--dsg-line); border-radius: 999px; background: var(--dsg-surface); color: var(--dsg-ink-2); font-size: 12px; cursor: pointer; }
      .dsg-kind-chip:hover { border-color: var(--dsg-ink-3); }
      .dsg-kind-chip[data-active="true"] { border-color: var(--dsg-accent); background: var(--dsg-accent-soft); color: var(--dsg-accent-ink); }
      .dsg-kind-chip:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 1px; }
      .dsg-composer-textarea { width: 100%; min-height: 96px; border: 1px solid var(--dsg-line-2); border-radius: 10px; background: var(--dsg-surface); padding: 11px 12px; font-size: 13px; line-height: 1.65; resize: vertical; outline: none; }
      .dsg-composer-textarea:focus { border-color: var(--dsg-accent); box-shadow: 0 0 0 3px var(--dsg-accent-soft); }
      .dsg-composer-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
      .dsg-composer-row .dsg-field { margin-bottom: 0; }
      .dsg-composer-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
      .dsg-composer-note { font-size: 10.5px; color: var(--dsg-ink-3); margin: 9px 0 0; line-height: 1.6; }
      .dsg-examples { border: 1px solid var(--dsg-line); border-radius: 12px; background: color-mix(in srgb, var(--dsg-surface) 82%, transparent); padding: 14px 16px; margin-top: 12px; }
      .dsg-example { display: block; width: 100%; text-align: left; border: 1px solid var(--dsg-line); border-radius: 8px; background: var(--dsg-surface); padding: 8px 10px; margin-bottom: 6px; font-size: 11.5px; color: var(--dsg-ink-2); cursor: pointer; line-height: 1.55; }
      .dsg-example:hover { border-color: var(--dsg-accent); color: var(--dsg-ink); }
      .dsg-example:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 1px; }
      .dsg-onboard { border: 1px solid color-mix(in srgb, var(--dsg-accent) 40%, transparent); background: var(--dsg-accent-soft); border-radius: 12px; padding: 14px 16px; margin-bottom: 14px; display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap; }
      .dsg-onboard-body { flex: 1; min-width: 240px; }
      .dsg-onboard-title { font-size: 13.5px; font-weight: 650; margin-bottom: 3px; color: var(--dsg-ink); }
      .dsg-onboard-steps { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 7px; font-size: 11px; color: var(--dsg-ink-2); }
      .dsg-onboard-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
      .eds-flow { display: flex; align-items: center; gap: 3px; height: 28px; flex: none; padding: 0 10px; background: var(--dsg-surface); border-bottom: 1px solid var(--dsg-line); overflow-x: auto; scrollbar-width: none; }
      .eds-flow::-webkit-scrollbar { display: none; }
      .eds-flow-title { font-size: 10px; color: var(--dsg-ink-3); margin-right: 4px; flex: none; }
      .eds-flow-step { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 7px; border: 1px solid transparent; border-radius: 999px; background: transparent; color: var(--dsg-ink-3); font-size: 10.5px; cursor: pointer; white-space: nowrap; flex: none; }
      .eds-flow-step:hover { background: var(--dsg-surface-2); color: var(--dsg-ink); }
      .eds-flow-step[data-done="true"] { color: var(--dsg-signal); }
      .eds-flow-step[data-current="true"] { background: var(--dsg-accent-soft); border-color: color-mix(in srgb, var(--dsg-accent) 42%, transparent); color: var(--dsg-accent-ink); font-weight: 600; }
      .eds-flow-step:focus-visible { outline: 2px solid var(--dsg-accent); }
      .eds-flow-dot { width: 13px; height: 13px; border-radius: 50%; border: 1px solid currentColor; display: grid; place-items: center; font-family: var(--dsg-mono); font-size: 8px; flex: none; }
      .eds-flow-step[data-done="true"] .eds-flow-dot { background: var(--dsg-signal); border-color: var(--dsg-signal); color: #fff; }
      .eds-flow-arrow { color: var(--dsg-line-2); flex: none; display: inline-flex; }
      .eds-flow-spacer { flex: 1; min-width: 6px; }
      .eds-flow-next { font-size: 10.5px; color: var(--dsg-ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: none; max-width: 40%; }
      .eds-flow-next b { color: var(--dsg-ink); font-weight: 600; }
      .eds-brief-dirty { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; color: var(--dsg-accent); }

      @media (max-width: 768px) {
        .dsg-composer-row { grid-template-columns: minmax(0, 1fr); }
        .eds-flow-next, .eds-flow-title { display: none; }
      }

      .dsg-wizard-entry { display: flex; align-items: center; gap: 13px; width: 100%; margin-top: 16px; padding: 15px 18px; border: 1px solid color-mix(in srgb, var(--dsg-accent) 42%, transparent); border-radius: 14px; background: color-mix(in srgb, var(--dsg-accent-soft) 60%, var(--dsg-surface)); color: var(--dsg-ink); cursor: pointer; text-align: left; }
      .dsg-wizard-entry:hover { border-color: var(--dsg-accent); }
      .dsg-wizard-entry:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 2px; }
      .dsg-wizard-entry-icon { width: 34px; height: 34px; border-radius: 9px; background: var(--dsg-accent); color: #fff; display: grid; place-items: center; flex: none; }
      .dsg-wizard-entry-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .dsg-wizard-entry-title { font-size: 13.5px; font-weight: 650; }
      .dsg-wizard-entry-sub { font-size: 11px; color: var(--dsg-ink-3); }
      .dsg-wizard-entry-chevron { color: var(--dsg-accent); flex: none; display: inline-flex; }
      @media (max-width: 620px) { .dsg-wizard-entry-sub { display: none; } }

      /* v1.3 start wizard + intake summary */
      .dsg-wizard-overlay { position: absolute; inset: 0; z-index: 210; background: rgba(20, 18, 14, .38); display: flex; align-items: center; justify-content: center; padding: 18px; }
      .dsg-wizard { width: min(780px, 100%); max-height: 88vh; display: flex; flex-direction: column; background: var(--dsg-surface); border: 1px solid var(--dsg-line-2); border-radius: 14px; box-shadow: 0 26px 80px rgba(20, 18, 14, .34); overflow: hidden; }
      .dsg-wizard-head { padding: 14px 18px 10px; border-bottom: 1px solid var(--dsg-line); }
      .dsg-wizard-progress { display: flex; align-items: center; gap: 9px; margin-bottom: 9px; }
      .dsg-wizard-track { flex: 1; height: 4px; border-radius: 999px; background: var(--dsg-line); overflow: hidden; }
      .dsg-wizard-fill { height: 100%; background: var(--dsg-accent); border-radius: 999px; transition: width .2s ease; }
      .dsg-wizard-count { font-family: var(--dsg-mono); font-size: 10px; color: var(--dsg-ink-3); white-space: nowrap; }
      .dsg-wizard-title { font-family: var(--dsg-serif); font-size: 18px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; }
      .dsg-wizard-sub { font-size: 11px; color: var(--dsg-ink-3); margin-top: 3px; line-height: 1.55; }
      .dsg-wizard-body { flex: 1; min-height: 0; overflow: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 15px; }
      .dsg-wizard-q { display: flex; flex-direction: column; gap: 6px; }
      .dsg-wizard-qhead { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .dsg-wizard-label { font-size: 12px; font-weight: 600; color: var(--dsg-ink); }
      .dsg-wizard-req { font-size: 9px; color: var(--dsg-accent); font-weight: 600; }
      .dsg-wizard-delegated { font-size: 9.5px; color: var(--dsg-signal); }
      .dsg-wizard-hint { font-size: 10.5px; color: var(--dsg-ink-3); margin: 0; line-height: 1.55; }
      .dsg-wizard-chips { display: flex; gap: 5px; flex-wrap: wrap; }
      .dsg-wizard-chip { height: 28px; padding: 0 10px; border: 1px solid var(--dsg-line); border-radius: 999px; background: var(--dsg-surface); color: var(--dsg-ink-2); font-size: 11.5px; cursor: pointer; white-space: nowrap; }
      .dsg-wizard-chip:hover { border-color: var(--dsg-ink-3); }
      .dsg-wizard-chip[data-active="true"] { border-color: var(--dsg-accent); background: var(--dsg-accent-soft); color: var(--dsg-accent-ink); }
      .dsg-wizard-chip:focus-visible { outline: 2px solid var(--dsg-accent); outline-offset: 1px; }
      .dsg-wizard-input { width: 100%; height: 34px; border: 1px solid var(--dsg-line-2); border-radius: 8px; background: var(--dsg-surface); padding: 0 10px; font-size: 12.5px; outline: none; }
      textarea.dsg-wizard-input { height: auto; min-height: 66px; padding: 9px 10px; line-height: 1.6; resize: vertical; }
      .dsg-wizard-input:focus { border-color: var(--dsg-accent); box-shadow: 0 0 0 3px var(--dsg-accent-soft); }
      .dsg-wizard-select { height: 34px; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23888175' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: calc(100% - 10px) center; padding-right: 26px; cursor: pointer; }
      .dsg-wizard-range { display: flex; align-items: center; gap: 10px; }
      .dsg-wizard-range input { flex: 1; accent-color: var(--dsg-accent); }
      .dsg-wizard-range b { font-family: var(--dsg-mono); font-size: 11px; color: var(--dsg-ink-2); min-width: 82px; text-align: right; }
      .dsg-wizard-foot { display: flex; align-items: center; gap: 7px; padding: 11px 18px; border-top: 1px solid var(--dsg-line); background: var(--dsg-surface-2); flex-wrap: wrap; }
      .dsg-wizard-foot .dsg-grow { flex: 1; }
      .dsg-wizard-missing { font-size: 10.5px; color: var(--dsg-warn); }
      .dsg-wizard-error { font-size: 11px; color: var(--dsg-danger); }
      .dsg-intake-card { border: 1px solid var(--dsg-line); border-radius: 10px; background: var(--dsg-surface-2); padding: 10px; margin-bottom: 10px; }
      .dsg-intake-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
      .dsg-intake-meter { height: 4px; border-radius: 999px; background: var(--dsg-line); overflow: hidden; flex: 1; min-width: 60px; }
      .dsg-intake-meter i { display: block; height: 100%; background: var(--dsg-signal); border-radius: 999px; }
      .dsg-intake-group { margin-top: 7px; }
      .dsg-intake-group-title { font-size: 9.5px; color: var(--dsg-ink-3); margin-bottom: 3px; }
      .dsg-intake-tag { display: inline-flex; max-width: 100%; margin: 0 3px 3px 0; padding: 1px 6px; border-radius: 5px; border: 1px solid var(--dsg-line); background: var(--dsg-surface); font-size: 10px; color: var(--dsg-ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsg-intake-open { font-size: 10px; color: var(--dsg-warn); margin-top: 6px; line-height: 1.5; overflow-wrap: anywhere; }

      @media (max-width: 1100px) {
        .eds-right { position: absolute; top: 0; right: 0; bottom: 0; z-index: 45; width: min(326px, 92vw) !important; border-left: 0; box-shadow: -16px 0 40px rgba(20, 18, 14, .24); transform: translateX(102%); transition: transform .18s ease; }
        .eds-right[data-open="true"] { transform: none; }
        .eds-split-right { display: none; }
      }
      @media (max-width: 900px) {
        .eds-left { position: absolute; top: 0; left: 0; bottom: 0; z-index: 45; width: min(286px, 88vw) !important; border-right: 0; box-shadow: 16px 0 40px rgba(20, 18, 14, .24); transform: translateX(-102%); transition: transform .18s ease; }
        .eds-left[data-open="true"] { transform: none; }
        .eds-split-left { display: none; }
      }
      @media (max-width: 768px) {
        .eds-top { padding: 0 8px; gap: 5px; height: 48px; }
        .eds-brand-title { display: none; }
        .eds-toolbar { padding: 4px 7px; }
        .eds-status { font-size: 10px; gap: 5px; }
        .eds-status-hide { display: none; }
        .eds-sheet-body { grid-template-columns: minmax(0, 1fr); }
        .eds-canvas-hint { display: none; }
      }
      @media (pointer: coarse) {
        .eds-tbtn { height: 44px; min-width: 44px; }
        .eds-ltab, .eds-rtab { height: 38px; }
        .eds-trow { height: 44px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .eds-root *, .eds-root *::before, .eds-root *::after { animation-duration: 0s !important; transition-duration: 0s !important; }
      }
    `

    /* ------------------------------------------------------------------ */
    /* Icons — inline SVG only, stroke 1.6                                  */
    /* ------------------------------------------------------------------ */

    function Icon(props) {
      const p = props || {}
      const name = p.name || "grid"
      const size = p.size || 15
      const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }
      if (name === "grid") return h("svg", common, h("path", { d: "M4 4h7v7H4V4zM13 4h7v7h-7V4zM4 13h7v7H4v-7zM13 13h7v7h-7v-7z" }))
      if (name === "plus") return h("svg", common, h("path", { d: "M12 5v14M5 12h14" }))
      if (name === "minus") return h("svg", common, h("path", { d: "M5 12h14" }))
      if (name === "back") return h("svg", common, h("path", { d: "M15 5l-7 7 7 7" }))
      if (name === "refresh") return h("svg", common, h("path", { d: "M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" }))
      if (name === "trash") return h("svg", common, h("path", { d: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" }))
      if (name === "x") return h("svg", common, h("path", { d: "M6 6l12 12M18 6L6 18" }))
      if (name === "check") return h("svg", common, h("path", { d: "M20 6L9 17l-5-5" }))
      if (name === "save") return h("svg", common, h("path", { d: "M5 4h11l3 3v13H5V4zM8 4v6h7V4M8 20v-6h8v6" }))
      if (name === "undo") return h("svg", common, h("path", { d: "M8 7L4 11l4 4M4 11h9a6 6 0 0 1 0 12H9" }))
      if (name === "redo") return h("svg", common, h("path", { d: "M16 7l4 4-4 4M20 11h-9a6 6 0 0 0 0 12h4" }))
      if (name === "zoomIn") return h("svg", common, h("circle", { cx: 10.5, cy: 10.5, r: 6.5 }), h("path", { d: "M15.5 15.5L21 21M10.5 8v5M8 10.5h5" }))
      if (name === "zoomOut") return h("svg", common, h("circle", { cx: 10.5, cy: 10.5, r: 6.5 }), h("path", { d: "M15.5 15.5L21 21M8 10.5h5" }))
      if (name === "fit") return h("svg", common, h("path", { d: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" }))
      if (name === "browse") return h("svg", common, h("path", { d: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" }), h("circle", { cx: 12, cy: 12, r: 2.8 }))
      if (name === "select") return h("svg", common, h("path", { d: "M5 3l6.5 17 2.2-6.3L20 11.5 5 3z" }))
      if (name === "comment") return h("svg", common, h("path", { d: "M4 5h16v11H9l-5 4V5z" }))
      if (name === "monitor") return h("svg", common, h("rect", { x: 3, y: 4, width: 18, height: 12, rx: 1.6 }), h("path", { d: "M9 20h6M12 16v4" }))
      if (name === "phone") return h("svg", common, h("rect", { x: 7, y: 2.5, width: 10, height: 19, rx: 2.2 }), h("path", { d: "M10.5 5.5h3M11 18.5h2" }))
      if (name === "slides") return h("svg", common, h("rect", { x: 3, y: 4, width: 18, height: 11, rx: 1.6 }), h("path", { d: "M8 20l4-5 4 5" }))
      if (name === "poster") return h("svg", common, h("rect", { x: 5, y: 3, width: 14, height: 18, rx: 1.4 }), h("path", { d: "M8 7h8M8 10.5h5M8 16h8" }))
      if (name === "doc") return h("svg", common, h("path", { d: "M7 3h7l4 4v14H7V3zM14 3v4h4M9.5 12h5M9.5 16h5" }))
      if (name === "download") return h("svg", common, h("path", { d: "M12 4v11M7.5 11l4.5 4 4.5-4M4 19h16" }))
      if (name === "copy") return h("svg", common, h("path", { d: "M9 9h11v11H9V9zM5 15V4h11" }))
      if (name === "chevron") return h("svg", common, h("path", { d: "M9 6l6 6-6 6" }))
      if (name === "chevronDown") return h("svg", common, h("path", { d: "M6 9l6 6 6-6" }))
      if (name === "external") return h("svg", common, h("path", { d: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" }))
      if (name === "folder") return h("svg", common, h("path", { d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" }))
      if (name === "help") return h("svg", common, h("circle", { cx: 12, cy: 12, r: 8.5 }), h("path", { d: "M9.6 9.2a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 1.9-2.4 3.4M12 17h.01" }))
      if (name === "layers") return h("svg", common, h("path", { d: "M12 3l8 4.5-8 4.5-8-4.5L12 3zM4 12l8 4.5 8-4.5M4 16.5L12 21l8-4.5" }))
      if (name === "image") return h("svg", common, h("rect", { x: 3.5, y: 4.5, width: 17, height: 15, rx: 1.6 }), h("path", { d: "M3.5 15l4.5-4 4 3.5 3-2.5 4.5 4M9 9h.01" }))
      if (name === "code") return h("svg", common, h("path", { d: "M9 7l-5 5 5 5M15 7l5 5-5 5" }))
      if (name === "sliders") return h("svg", common, h("path", { d: "M4 7h10M18 7h2M4 17h4M12 17h8" }), h("circle", { cx: 16, cy: 7, r: 2 }), h("circle", { cx: 10, cy: 17, r: 2 }))
      if (name === "gauge") return h("svg", common, h("path", { d: "M4 17a8 8 0 1 1 16 0" }), h("path", { d: "M12 13l4-3M12 17h.01" }))
      if (name === "history") return h("svg", common, h("path", { d: "M4 12a8 8 0 1 0 8-8 8 8 0 0 0-6 2.7M4 4v5h5" }), h("path", { d: "M12 8v4l3 2" }))
      if (name === "palette") return h("svg", common, h("path", { d: "M12 3a9 9 0 0 0 0 18c1.4 0 2-1 2-2s-.6-2-2-2h-1a3 3 0 0 1 0-6h4a3 3 0 0 0 3-3c0-2.8-3-5-6-5z" }), h("circle", { cx: 8, cy: 9, r: 1 }), h("circle", { cx: 12, cy: 6.5, r: 1 }), h("circle", { cx: 16, cy: 9, r: 1 }))
      if (name === "warning") return h("svg", common, h("path", { d: "M12 3.5L22 20H2L12 3.5zM12 10v4M12 17h.01" }))
      if (name === "info") return h("svg", common, h("circle", { cx: 12, cy: 12, r: 8.5 }), h("path", { d: "M12 11v5M12 8h.01" }))
      if (name === "play") return h("svg", common, h("path", { d: "M7 4l12 8-12 8V4z" }))
      if (name === "stop") return h("svg", common, h("rect", { x: 6, y: 6, width: 12, height: 12, rx: 2 }))
      if (name === "eye") return h("svg", common, h("path", { d: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" }), h("circle", { cx: 12, cy: 12, r: 2.8 }))
      if (name === "target") return h("svg", common, h("circle", { cx: 12, cy: 12, r: 8 }), h("circle", { cx: 12, cy: 12, r: 3 }), h("path", { d: "M12 2v3M12 19v3M2 12h3M19 12h3" }))
      if (name === "spark") return h("svg", common, h("path", { d: "M12 3l1.9 5.4L19.5 10l-5.6 1.6L12 17l-1.9-5.4L4.5 10l5.6-1.6L12 3z" }))
      if (name === "dots") return h("svg", common, h("circle", { cx: 5, cy: 12, r: 1.4, fill: "currentColor", stroke: "none" }), h("circle", { cx: 12, cy: 12, r: 1.4, fill: "currentColor", stroke: "none" }), h("circle", { cx: 19, cy: 12, r: 1.4, fill: "currentColor", stroke: "none" }))
      if (name === "layers") return h("svg", common, h("rect", { x: 4, y: 4, width: 16, height: 6, rx: 1.4 }), h("rect", { x: 4, y: 14, width: 16, height: 6, rx: 1.4 }))
      if (name === "eye") return h("svg", common, h("path", { d: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" }), h("circle", { cx: 12, cy: 12, r: 2.6 }))
      if (name === "eyeOff") return h("svg", common, h("path", { d: "M4 4l16 16M9.5 9.7A3 3 0 0 0 12 15c.8 0 1.5-.3 2-.8M6.2 6.6C4 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1M17.8 17.4C19.9 15.7 21.5 12 21.5 12S18 5.5 12 5.5c-.7 0-1.4.1-2 .2" }))
      if (name === "text") return h("svg", common, h("path", { d: "M5 6h14M12 6v12M9 18h6" }))
      if (name === "button") return h("svg", common, h("rect", { x: 3, y: 7, width: 18, height: 10, rx: 3 }), h("path", { d: "M8 12h8" }))
      if (name === "link") return h("svg", common, h("path", { d: "M10 14a4 4 0 0 1 0-5.6l2-2a4 4 0 0 1 5.6 5.6l-1 1M14 10a4 4 0 0 1 0 5.6l-2 2A4 4 0 0 1 6.4 12l1-1" }))
      if (name === "list") return h("svg", common, h("path", { d: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" }))
      if (name === "search") return h("svg", common, h("circle", { cx: 10.5, cy: 10.5, r: 6.5 }), h("path", { d: "M15.5 15.5L21 21" }))
      if (name === "command") return h("svg", common, h("path", { d: "M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6z" }))
      if (name === "ruler") return h("svg", common, h("path", { d: "M4 15L15 4l5 5L9 20l-5-5zM7.5 11.5l2 2M10.5 8.5l2 2M13.5 5.5l2 2" }))
      if (name === "grid") return h("svg", common, h("path", { d: "M4 9h16M4 15h16M9 4v16M15 4v16" }))
      if (name === "columns") return h("svg", common, h("rect", { x: 3, y: 4, width: 18, height: 16, rx: 1.5 }), h("path", { d: "M9 4v16M15 4v16" }))
      if (name === "guides") return h("svg", common, h("path", { d: "M4 4v16M20 4v16M4 12h16" }), h("path", { d: "M7 9l-2 3 2 3M17 9l2 3-2 3" }))
      if (name === "artboard") return h("svg", common, h("rect", { x: 4, y: 6, width: 10, height: 12, rx: 1.4 }), h("rect", { x: 16.5, y: 3, width: 4.5, height: 9, rx: 1, opacity: .55 }), h("path", { d: "M7 21v-3M11 21v-3" }))
      if (name === "duplicate") return h("svg", common, h("rect", { x: 8, y: 8, width: 12, height: 12, rx: 1.6 }), h("path", { d: "M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" }))
      if (name === "arrowUp") return h("svg", common, h("path", { d: "M12 19V5M6 11l6-6 6 6" }))
      if (name === "arrowDown") return h("svg", common, h("path", { d: "M12 5v14M6 13l6 6 6-6" }))
      if (name === "alignLeft") return h("svg", common, h("path", { d: "M4 3v18" }), h("rect", { x: 7, y: 6, width: 12, height: 4, rx: 1 }), h("rect", { x: 7, y: 14, width: 7, height: 4, rx: 1 }))
      if (name === "alignCenter") return h("svg", common, h("path", { d: "M12 3v18" }), h("rect", { x: 5, y: 6, width: 14, height: 4, rx: 1 }), h("rect", { x: 8, y: 14, width: 8, height: 4, rx: 1 }))
      if (name === "alignRight") return h("svg", common, h("path", { d: "M20 3v18" }), h("rect", { x: 5, y: 6, width: 12, height: 4, rx: 1 }), h("rect", { x: 10, y: 14, width: 7, height: 4, rx: 1 }))
      if (name === "alignTop") return h("svg", common, h("path", { d: "M3 4h18" }), h("rect", { x: 6, y: 7, width: 4, height: 12, rx: 1 }), h("rect", { x: 14, y: 7, width: 4, height: 7, rx: 1 }))
      if (name === "alignMiddle") return h("svg", common, h("path", { d: "M3 12h18" }), h("rect", { x: 6, y: 5, width: 4, height: 14, rx: 1 }), h("rect", { x: 14, y: 8, width: 4, height: 8, rx: 1 }))
      if (name === "alignBottom") return h("svg", common, h("path", { d: "M3 20h18" }), h("rect", { x: 6, y: 5, width: 4, height: 12, rx: 1 }), h("rect", { x: 14, y: 10, width: 4, height: 7, rx: 1 }))
      if (name === "rotate") return h("svg", common, h("path", { d: "M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5" }))
      if (name === "moon") return h("svg", common, h("path", { d: "M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" }))
      if (name === "sun") return h("svg", common, h("circle", { cx: 12, cy: 12, r: 4 }), h("path", { d: "M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" }))
      if (name === "panelLeft") return h("svg", common, h("rect", { x: 3, y: 4, width: 18, height: 16, rx: 2 }), h("path", { d: "M9 4v16" }))
      if (name === "panelRight") return h("svg", common, h("rect", { x: 3, y: 4, width: 18, height: 16, rx: 2 }), h("path", { d: "M15 4v16" }))
      if (name === "folderOpen") return h("svg", common, h("path", { d: "M3 8V6a1 1 0 0 1 1-1h5l2 2h7a1 1 0 0 1 1 1v2M3 9h18l-2 9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1L3 9z" }))
      if (name === "checkSquare") return h("svg", common, h("rect", { x: 4, y: 4, width: 16, height: 16, rx: 2 }), h("path", { d: "M8 12l3 3 5-6" }))
      if (name === "refreshCw") return h("svg", common, h("path", { d: "M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" }))
      if (name === "move") return h("svg", common, h("path", { d: "M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" }))
      if (name === "chat") return h("svg", common, h("path", { d: "M4 5h16v11H9l-5 4V5z" }), h("path", { d: "M8 8.5h8M8 12h5" }))
      return h("svg", common, h("path", { d: "M12 3v18M5.5 7.5l13 9M18.5 7.5l-13 9" }))
    }

    /* ------------------------------------------------------------------ */
    /* Small primitives                                                    */
    /* ------------------------------------------------------------------ */

    function Btn(props) {
      const p = props || {}
      const tip = p.tip || p.title || p.label || ""
      const attributes = {
        type: "button",
        className: "dsg-btn" + (p.iconOnly ? " dsg-icon-btn" : ""),
        onClick: p.onClick,
        disabled: Boolean(p.disabled),
        title: tip || undefined,
        "aria-label": p.iconOnly || !p.label ? tip || undefined : undefined,
        "data-variant": p.variant || undefined,
        "data-size": p.size || undefined,
        "data-active": p.active === true ? "true" : undefined,
      }
      if (tip) attributes["data-tip"] = tip
      if (p.ariaPressed !== undefined) attributes["aria-pressed"] = p.ariaPressed ? "true" : "false"
      return h("button", attributes, p.glyph ? h(Icon, { name: p.glyph, size: p.size === "sm" ? 12 : 14 }) : null, p.iconOnly ? null : h("span", null, p.label))
    }

    /* Compact v2 editor control with a delayed CSS tooltip. */
    function Tbtn(props) {
      const p = props || {}
      const tip = p.tip || p.label || ""
      const attributes = {
        type: "button",
        className: "eds-tbtn" + (p.className ? " " + p.className : ""),
        onClick: p.onClick,
        disabled: Boolean(p.disabled),
        title: tip || undefined,
        "aria-label": p["aria-label"] || tip || undefined,
      }
      if (tip) attributes["data-tip"] = tip
      if (p["data-tip-side"]) attributes["data-tip-side"] = p["data-tip-side"]
      if (p.active !== undefined) attributes["data-active"] = p.active === "soft" ? "soft" : p.active ? "true" : "false"
      if (p.ariaPressed !== undefined) attributes["aria-pressed"] = p.ariaPressed ? "true" : "false"
      if (p.tone) attributes["data-tone"] = p.tone
      if (p.dirty) attributes["data-dirty"] = "true"
      if (p.style) attributes.style = p.style
      return h("button", attributes, p.icon ? h(Icon, { name: p.icon, size: p.iconSize || 15 }) : null, p.label ? h("span", null, p.label) : null)
    }

    function Section(props) {
      const p = props || {}
      const [open, setOpen] = useState(p.defaultOpen !== false)
      return h(
        "section",
        { className: "eds-sec", "data-open": open ? "true" : "false", "data-section": p.id || undefined },
        h(
          "button",
          { type: "button", className: "eds-sec-head", "aria-expanded": open ? "true" : "false", onClick: () => setOpen((value) => !value) },
          h("span", { className: "eds-sec-caret" }, h(Icon, { name: "chevron", size: 10 })),
          h("span", { className: "eds-sec-title" }, p.title),
          p.badge ? h(Chip, { label: p.badge }) : null,
        ),
        open ? h("div", { className: "eds-sec-body" }, p.children) : null,
      )
    }

    function FieldBox(props) {
      const p = props || {}
      return h("label", { className: "eds-field" }, p.label ? h("span", { className: "eds-field-label" }, p.label) : null, p.children)
    }

    function ContrastBadge(props) {
      const p = props || {}
      const ratio = p.ratio
      if (ratio === null || ratio === undefined || !Number.isFinite(Number(ratio))) return null
      const tone = contrastTone(ratio)
      const label = tone === "ok" ? p.t("contrastGood") : tone === "warn" ? p.t("contrastOk") : p.t("contrastLow")
      return h("span", { className: "eds-contrast", "data-tone": tone, title: label + " · " + Number(ratio) + ":1" }, h(Icon, { name: tone === "danger" ? "warning" : "check", size: 9 }), Number(ratio) + ":1")
    }

    function Skeleton(props) {
      const p = props || {}
      return h("div", { className: "eds-skeleton", style: Object.assign({ height: p.height || 12, width: p.width || "100%" }, p.style || {}) })
    }

    function StudioMark(props) {
      const size = props && props.size ? props.size : 18
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": "true", fill: "none" },
        h("path", { d: "M4 5.5h9.5M4 12h16M4 18.5h6.5", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" }),
        h("rect", { x: 16.2, y: 3.2, width: 5, height: 5, rx: 1, fill: "#d3774f" }),
      )
    }

    function Chip(props) {
      const p = props || {}
      return h("span", { className: "dsg-chip", "data-tone": p.tone || undefined, title: p.title || undefined }, p.dot ? h("span", { className: "dsg-dot" }) : null, p.label)
    }

    function Bar(props) {
      const p = props || {}
      const value = clamp(p.value, 0, 100, 0)
      const tone = p.tone !== undefined ? p.tone : scoreTone(value)
      return h("div", { className: "dsg-bar", title: p.title || value + "/100", role: "presentation" }, h("div", { className: "dsg-bar-fill", "data-tone": tone || undefined, style: { width: Math.max(0, Math.min(100, value)) + "%" } }))
    }

    function ScoreRing(props) {
      const p = props || {}
      const score = p.score === null || p.score === undefined || !Number.isFinite(Number(p.score)) ? null : Math.round(Number(p.score))
      const size = p.size || 64
      const radius = (size - 7) / 2
      const circumference = 2 * Math.PI * radius
      const pct = score === null ? 0 : Math.max(0, Math.min(100, score))
      const tone = score === null ? "" : scoreTone(score)
      const color = tone === "ok" ? "var(--dsg-ok)" : tone === "warn" ? "var(--dsg-warn)" : tone === "danger" ? "var(--dsg-danger)" : "var(--dsg-line-2)"
      return h(
        "div",
        { className: "dsg-ring", style: { width: size, height: size }, "data-tone": tone },
        h(
          "svg",
          { width: size, height: size, viewBox: "0 0 " + size + " " + size, "aria-hidden": "true" },
          h("circle", { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: "var(--dsg-line)", strokeWidth: 5 }),
          h("circle", { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: color, strokeWidth: 5, strokeLinecap: "round", strokeDasharray: circumference, strokeDashoffset: circumference * (1 - pct / 100) }),
        ),
        h("span", { className: "dsg-ring-num" }, score === null ? "–" : score),
      )
    }

    function Spinner() {
      return h("span", { className: "dsg-spinner", "aria-hidden": "true" })
    }

    function Loading(props) {
      return h("div", { className: "dsg-loading", role: "status" }, h(Spinner), h("span", null, (props && props.label) || "…"))
    }

    function Notice(props) {
      const p = props || {}
      return h("div", { className: "dsg-notice", "data-tone": p.tone || "warn", role: p.tone === "err" ? "alert" : "status" }, p.children)
    }

    function EmptyState(props) {
      const p = props || {}
      return h(
        "div",
        { className: "dsg-empty" },
        p.icon ? h("div", { style: { marginBottom: 8, color: "var(--dsg-ink-3)" } }, h(Icon, { name: p.icon, size: 22 })) : null,
        h("p", { className: "dsg-empty-title" }, p.title),
        p.body ? h("p", { className: "dsg-empty-body" }, p.body) : null,
        p.children || null,
        p.action ? h("div", { className: "dsg-empty-actions" }, p.action) : null,
      )
    }

    function Kbd(props) {
      return h("kbd", { className: "dsg-kbd" }, props.children)
    }

    function CodeBlock(props) {
      const p = props || {}
      return h(
        "div",
        { className: "dsg-code" },
        p.head ? h("div", { className: "dsg-code-head" }, h("span", { className: "dsg-grow" }, p.head), p.action || null) : null,
        h("pre", { className: "dsg-code-pre" }, p.text),
      )
    }

    function Modal(props) {
      const p = props || {}
      const closeRef = useRef(null)
      useEffect(() => {
        if (closeRef.current && typeof closeRef.current.focus === "function") closeRef.current.focus()
        const onKey = (event) => {
          if (event.key === "Escape") {
            event.stopPropagation()
            if (p.onClose) p.onClose()
          }
        }
        window.addEventListener("keydown", onKey, true)
        return () => window.removeEventListener("keydown", onKey, true)
      }, [p.onClose])
      return h(
        "div",
        { className: "dsg-scrim", onMouseDown: (event) => { if (event.target === event.currentTarget && p.onClose) p.onClose() } },
        h(
          "div",
          { className: "dsg-modal", role: "dialog", "aria-modal": "true", "aria-label": p.title || "" },
          h("div", { className: "dsg-modal-head" }, h(Icon, { name: p.icon || "info", size: 14 }), h("span", { className: "dsg-grow" }, p.title), h("button", { ref: closeRef, type: "button", className: "dsg-btn dsg-icon-btn", "data-size": "sm", "data-variant": "ghost", onClick: p.onClose, "aria-label": p.closeLabel || "close" }, h(Icon, { name: "x", size: 12 }))),
          h("div", { className: "dsg-modal-body" }, p.children),
          h("div", { className: "dsg-modal-actions" }, p.actions),
        ),
      )
    }

    function Lightbox(props) {
      const p = props || {}
      useEffect(() => {
        const onKey = (event) => {
          if (event.key === "Escape") {
            event.stopPropagation()
            if (p.onClose) p.onClose()
          }
        }
        window.addEventListener("keydown", onKey, true)
        return () => window.removeEventListener("keydown", onKey, true)
      }, [p.onClose])
      return h(
        "div",
        { className: "dsg-lightbox", role: "dialog", "aria-modal": "true", "aria-label": p.alt || "" },
        h(
          "div",
          { className: "dsg-lightbox-bar" },
          h(Icon, { name: "image", size: 14 }),
          h("span", { className: "dsg-grow" }, p.alt || ""),
          p.href ? h("a", { className: "dsg-link", href: p.href, target: "_blank", rel: "noreferrer noopener", style: { color: "#f4f0e6", borderBottomColor: "rgba(244,240,230,.4)" } }, p.openLabel || "open") : null,
          h("button", { type: "button", className: "dsg-btn dsg-icon-btn", "data-size": "sm", "data-variant": "ghost", style: { color: "#f4f0e6" }, onClick: p.onClose, "aria-label": p.closeLabel || "close" }, h(Icon, { name: "x", size: 14 })),
        ),
        h("div", { className: "dsg-lightbox-body", onMouseDown: (event) => { if (event.target === event.currentTarget && p.onClose) p.onClose() } }, h("img", { src: p.src, alt: p.alt || "" })),
      )
    }

    function Toggle(props) {
      const p = props || {}
      return h(
        "label",
        { className: "dsg-checkline" },
        h("input", { type: "checkbox", checked: Boolean(p.checked), onChange: (event) => p.onChange && p.onChange(Boolean(event.target.checked)), disabled: Boolean(p.disabled) }),
        p.label ? h("span", null, p.label) : null,
      )
    }

    function Segmented(props) {
      const p = props || {}
      const options = safeArray(p.options)
      return h(
        "div",
        { className: "dsg-seg", role: "group", "aria-label": p.ariaLabel || undefined },
        options.map((option) =>
          h(
            "button",
            {
              key: option.id,
              type: "button",
              className: "dsg-seg-btn",
              "aria-pressed": p.value === option.id ? "true" : "false",
              title: option.title || option.label,
              onClick: () => p.onChange && p.onChange(option.id),
            },
            option.icon ? h(Icon, { name: option.icon, size: 12 }) : null,
            option.iconOnly ? null : h("span", null, option.label),
          ),
        ),
      )
    }

    function CopyButton(props) {
      const p = props || {}
      const [copied, setCopied] = useState(false)
      const copy = async () => {
        const text = String(p.text || "")
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text)
          else throw new Error("no clipboard")
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
          if (p.onCopied) p.onCopied(true)
        } catch (error) {
          if (p.onCopied) p.onCopied(false)
        }
      }
      return h(Btn, { size: "sm", variant: "ghost", glyph: "copy", label: copied ? p.copiedLabel || "✓" : p.label, onClick: copy, disabled: p.disabled })
    }

    function Field(props) {
      const p = props || {}
      return h("div", { className: "dsg-field" + (p.full ? " dsg-span-2" : ""), style: p.style }, p.label ? h("label", { className: "dsg-label", htmlFor: p.id || undefined }, p.label, p.right || null) : null, p.children, p.hint ? h("span", { className: "dsg-hint" }, p.hint) : null)
    }

    /* Small helper for a labelled two-column key/value block. */
    function KV(props) {
      const p = props || {}
      return h("dl", { className: "dsg-kv" }, p.rows.map((row, index) => h(react.Fragment, { key: "kv" + index }, h("dt", null, row[0]), h("dd", null, row[1]))))
    }

    function SectionHead(props) {
      const p = props || {}
      return h("div", { className: "dsg-sec-head" }, h("span", { className: "dsg-sec-title" }, p.title), h("span", { className: "dsg-grow" }), p.right || null)
    }

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
