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
