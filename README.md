# 设计台（dsh-design-studio）

[![CI](https://github.com/YansongG-HKU/dsh-design-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/YansongG-HKU/dsh-design-studio/actions/workflows/ci.yml)

一个装在 DeepSeek Harness 里的设计工作台：用真实 HTML 做画布，用真实无头浏览器做质检，产出可以直接交接的代码。它是 Claude Design 能力在 DSH 原生的实现——不是模仿截图，而是把「开始与提问 → 语境采集 → 三档变体 → 画布编辑 → 质量门禁 → 导出」这条工作流做成 11 个 agent 工具、一组本地 HTTP 路由和一个侧边栏面板。

- 包名 / loader 行 / 客户端模块 id：`dsh-design-studio`
- 仓库：<https://github.com/YansongG-HKU/dsh-design-studio>
- 版本 `1.3.2`（开始向导 + intake + 需求动线 + UI v2 编辑器；含发布门禁与真实浏览器 e2e），要求 Node.js ≥ 22、DSH ≥ 0.2.2-rc.3
- 纯 Node ESM，零第三方运行时依赖
- 数据目录：`<DSH_HOME>/design-studio`（`DSH_HOME` 默认 `~/.dsh`）
- 面板路由前缀：`/dsh-design-studio`，请求头 `x-dsh-design-studio: 1`
- 许可证：MIT（Copyright (c) 2026 YansongG-HKU）

## 它是什么

设计台把设计任务拆成可核查的步骤：先建项目并写清 brief，再把现有设计系统（URL / 代码库 / 图片 / 文字说明）采集为 token 与截图，然后用 `design/` 目录下的真实 HTML 写三档变体（A 规范、B 进阶、C 前卫）——**画布是真实 DOM，不是 Figma 对象模型**。之后用本机 Chrome/Edge 逐视口截图与提取计算样式，跑无障碍、排版、间距、设计系统一致性、AI-slop 五类检查；不达标就按 findings 修，直到评分 ≥ 90；最后导出 HTML / ZIP / PDF / PNG / PPTX。

和只生成一张图的流程相比，区别在两点：agent 交付的是**可运行的 HTML 文件**；质量结论来自**真实渲染后的测量**，不是文字自评。

## 需求在哪里发？（先看这里）

设计台的「需求」和「设计」在两个表面，先分清这一步就不会找不到输入框：

| 你想做什么 | 去哪里 |
|---|---|
| 用自然语言提需求、改方向、加页面（"再加一屏""换一种风格"） | **对话**（DSH 主区域） |
| 看三档变体、改样式/文字、拖拽缩放、评论、Tweaks、质检报告、导出 | **设计台面板**（侧边栏「设计台」） |

**对话是需求入口，面板是设计工作台。** v1.2 把这条动线做成显式能力：

- **总览需求输入卡**（面板首页的首屏主任务）：类型 chips + 需求文本域（必填）+ 可选「受众」「约束」。点「保存并去对话」：用 `POST /api/projects` 创建项目并把需求写进 brief（`goal` = 需求正文，`audience` / `constraints` 一并带入，`layout` / `content` 留空，默认播种脚手架）→ 用项目信息生成结构化 prompt 复制到剪贴板 → toast 提示 → 切回对话；点「只建项目」则创建后直接进入工作区。需求为空时提示「先写一句需求，再保存」并把焦点移回输入框。
- **左栏「需求」tab**（进入工作区时默认打开）：brief 五个字段（目标 / 受众 / 布局 / 内容 / 约束）内联编辑，点「保存需求」通过 `POST /api/projects/:id/brief` 以 `{brief:{...}}` 合并持久化（未提交字段保留原值，每个字段 trim 后上限 2000 字节（UTF-8）），有未保存改动会显示标记。「继续提需求」文本域自动附带上下文 chips（当前变体、选中元素、未解决评论数、未修复问题数）；「复制给 Claude 并去对话」会先保存 dirty 的 brief，再把「项目 + 上下文 + 需求 + 工具链指令」复制并切回对话（`Cmd/Ctrl+Enter` 同效）；「只保存到需求」把这段需求追加到 `goal` 并保存，留在面板并提示「已写入需求」。
- **TopBar 常驻「回到对话」**：一键 `layout.selectPanel(null)` 切回 Conversation 并提示「已回到对话」；不复制内容、不生成 prompt。宿主没有布局服务时会提示手动切回。
- **FlowStepper**：顶栏下方 28px 的阶段条 `需求 → 语境 → 变体 → 迭代 → 质检 → 导出`（v1.2 首段为「需求」，v1.3 改为「开始」并接入 intake），按项目状态打勾/高亮当前阶段，右侧显示「下一步：X · 提示」，全部完成显示「已完成」。阶段判定：brief 有任一字段 → 有设计系统或语境 → 变体数 > 1 → 有检查/评论/版本 → bestScore ≥ 90 → 有导出。点击阶段直达：需求 / 语境 → 左栏对应 tab；变体 → 变体 tab + 画布；迭代 → 评论 tab + 画布；质检 → 右栏检查；导出 → 右栏导出。
- **快捷交接**（统一 HandoffToClaude：复制 → toast → 切回对话）：检查 tab「让 Claude 修复这些问题」把当前轮 findings 生成修复指令；评论 tab「复制为 Claude 指令」把未解决评论生成指令（没有未解决评论时只提示，不复制空内容）；空态的「让 Claude 生成三档变体」「让 Claude 补语境」生成对应指令；总览示例卡与首启引导里的「回到对话」只切不复制。
- **首启引导**：第一次打开面板的总览页显示三步引导卡（① 在对话里说要做什么 ② 面板看三档变体、直接改画布 ③ 质检 ≥ 90 再导出），按钮为「回到对话」「写需求」「知道了」与右上角关闭；关闭后写入 `localStorage` 的 `dsh-design-studio.onboarded`，之后不再自动出现。
- **交接兜底**：没有可复制内容时提示「先写一句需求再复制」；剪贴板不可用时提示「复制失败，请手动选中文本复制」；宿主没有对话布局服务时仍复制，并提示手动切回对话粘贴。

> v1.2 这一节保留为需求动线的历史说明；v1.3 起首段「需求」改为「开始」，并加入 6 步向导与 intake，见下一节与 [`docs/FLOW.md`](./docs/FLOW.md)。

完整的功能 / 流程 / 界面地图见 [`docs/UX-MAP.md`](./docs/UX-MAP.md)；实现说明见 [`docs/DESIGN.md`](./docs/DESIGN.md) §13–§14。

## 开始：6 步开始向导 / 提问（v1.3）

v1.2 把需求动线做通了，但总览需求卡仍是开放文本：用户不知道要提供什么，agent 拿到一句话就开工。v1.3 对齐 Claude Design 的「开始 + 提问」——先由 6 步向导把关键信息问清楚、写进结构化 `intake`，再把一份注明「已确认 / 未确认」的开始 prompt 交给对话；agent 侧新增 `design_intake`，新/含糊请求先问 ≤8 个缺失问题再动手。完整设计见 [`docs/FLOW.md`](./docs/FLOW.md)。

### 面板：6 步开始向导

总览首屏新增「开始一个新设计（6 步）」入口，同时保留「快速开始（一句话）」文本卡给熟手：

| 步骤 | 内容（问题清单来自服务端，服务未就绪时用内置 fallback） |
|---|---|
| 1 做什么 | 设计类型（网页 / 移动端 / 演示稿 / 海报 / 文档）+ 一句话目标 |
| 2 给谁看 / 在哪用 | 受众、使用场景、语气 |
| 3 语境从哪来 | 设计系统（已有 / URL / 仓库 / 截图 / 没有）、参考链接或描述、品牌约束 |
| 4 变体与探索 | 2 / 3 / 4 档、探索维度（视觉 / 交互 / 布局 / 文案 / 动效）、偏好滑块（按规矩 ↔ 前卫） |
| 5 Tweaks 与内容 | 想调的参数（颜色 / 字号 / 间距 / 文案 / 布局 / 开关）、必须出现、不要出现、待追问项 |
| 6 交付与成功标准 | 交付格式（HTML / ZIP / PDF / PNG / PPTX）、响应式范围、验收标准（默认质检 ≥90） |

- 顶部显示「第 n / 6 步」与进度条；每步可点「不知道，让 Claude 决定」把该步必答项交给 agent 追问；有未答项时底部显示「n 项未答」，全部答完或委派后才能完成。
- 最后一步两个按钮：「创建并去对话」→ 创建项目（`brief` + `intake`）→ 生成开始 prompt → 复制 → toast → 切回对话；「只建项目」→ 创建后直接进工作区。
- 工作区「需求」tab 顶部新增「需求信息」卡：完整度百分比、分组标签、待 Claude 追问列表，以及「补问 / 完善需求」按钮——重开向导、按现有 intake 预填并增量保存；没有 intake 时提示先跑一次向导。
- 向导的问题来源：优先 `GET /api/intake/questions`（6 组共 16 个问题，7 个必答）；宿主未就绪时用内置 6 步 fallback，并在向导里提示「问题清单服务未就绪，使用内置向导」。
- 开始 prompt 把答案整理成「已确认信息」清单 + 最多 8 条未确认问题，最后附工具链指令（`design_start`（带 intake）→ `design_context` → 写 a/b/c 三档 → `design_check` 直到 ≥90 → `design_export`）；复制与切回对话复用 v1.2 的 HandoffToClaude。

### Agent：先提问，再 design_start

- 新增 `design_intake` 工具：不带 `projectId` 时返回规范问题清单（6 组，供 `ask_user_question` 提问）；带 `projectId` + `answers` 时增量合并进 `project.intake`，返回 `intake` / `filled` / `missing` / `score` 与下一步建议。
- `design_start` 接受可选 `intake`；创建时把 intake 摘要写进 `system/DESIGN.md`，并返回 `intakeScore`。
- 系统提示规定：新/含糊请求先按问题清单问 **≤8 个**最关键问题（语境、受众、变体、Tweaks、偏好、交付、成功标准），用户已给全才跳过；设计必须扎根真实语境（设计系统 / URL / 仓库 / 截图），不从零 mock；先给 placeholder 再迭代；始终 3 档变体 + 质检 ≥90 再导出。
- 旧项目没有 `intake` 照常工作；`brief` 五个自由文本字段仍是主交付依据，`intake` 是它的结构化补充。

### intake 数据模型（摘要）

`project.json` 新增可选 `intake`：`kind` / `goal` / `audience` / `contextSources` / `references` / `brandConstraints` / `variations{count,dimensions,range}` / `tweaks` / `contentMust` / `contentAvoid` / `deliverables` / `responsive` / `success` / `openQuestions` / `completedAt` / `source`（`wizard | agent | mixed`）。所有字段可选；文本截断、数组去重限量、未知键丢弃；服务端按 16 个问题加权（必答双权重）计算完整度，达到 80% 自动写 `completedAt`。接口：`GET /api/intake/questions`、`POST /api/projects`（可带 `intake`）、`POST /api/projects/:id/intake`（`{intake}` 增量合并，返回 `{ok, intake, filled, missing}`）。

## 能力对照（vs Claude Design）

| 能力 | 本插件 | 说明 |
|---|---|---|
| 画布 + 对话 | ✅ | 侧边栏面板画布 + agent 工具，共用同一项目存储 |
| 需求动线（v1.2） | ✅ | 总览需求输入卡、左栏「需求」tab、TopBar「回到对话」、FlowStepper 阶段条、检查/评论/空态快捷交接 |
| 开始向导 + 提问（v1.3） | ✅ | 6 步开始向导（brief + intake）、需求 tab 的 intake 摘要与补问、FlowStepper 首段「开始」、`design_intake` 工具与 ≤8 问策略 |
| 编辑器 IA（v1.1.0） | ✅ | 三栏编辑器 + 区域焦点（F6/Shift+F6）+ 可拖宽左右栏 + 顶部栏/工具栏/状态栏 |
| 图层树（v1.1.0） | ✅ | 由真实 DOM 推导的图层树：搜索、展开折叠、hover/选中双向联动、显隐、键盘导航 |
| 直接操作（v1.1.0） | ✅ | Shift 多选、框选、拖拽移动、8 向缩放把手、六向对齐父级、复制/删除/层级操作 |
| 浮动工具条（v1.1.0） | ✅ | 选中即出现：父级、复制、删除、上移下移、编辑文字、对齐父级、复制 CSS |
| 画板视图（v1.1.0） | ✅ | 多变体以 1440 宽并排（缩放 0.35），点击进入单变体画布 |
| 命令面板（v1.1.0） | ✅ | `⌘K` / `Ctrl+K` 模糊搜索 45 个动作（9 个分组），↑↓ 选择、Enter 执行、Esc 关闭 |
| 设计系统导入 | ✅ | URL 计算样式、代码库扫描、图片调色板、手写 token；写入 `system/tokens.json` + `DESIGN.md` |
| 三档变体 | ✅ | `design/a.html`、`b.html`、`c.html`，按文件名排序发现，面板标签页切换 |
| 内联评论 | ✅ | 画布评论模式 → 编号钉 → `comments.json`，面板可定位/回复/解决，可复制为 Claude 指令 |
| 直接编辑 | ✅ | 选中元素改样式（`patch`/`style`）、双击改文字、撤销/重做；保存写回 HTML 并保留历史快照 |
| Tweaks 实时调参 | ✅ | 页面内 `EDITMODE` JSON + `__dsApplyTweaks`，面板按值类型渲染控件并 debounce 写回 |
| 质检 / 无障碍审查 | ✅ | 真实浏览器截图 + 计算样式，五类规则，逐视口得分 |
| 导出 | ✅ | HTML / ZIP / PDF（CDP printToPDF）/ PNG / PPTX（最小 OOXML） |
| 版本 | ✅ | 手动版本快照与恢复（时间线卡）；面板保存自动写历史 |
| 主题（v1.1.0） | ✅ | `auto / light / dark` 三态切换并持久化，深色画布工作台与面板层级分明 |
| 代码交接 | ✅✅ | 每个变体就是自包含 HTML；ZIP 含 `design/` + `system/` + 项目摘要 |
| Figma 式对象模型 / 约束系统 | ⚠️ | 有 DOM 图层树与直接操作，但无 Figma 对象模型、约束与组件实例；编辑直接作用于真实 DOM |
| 多人协作 / 云端 | ❌ | 单机、本地文件；无账号、无网络同步 |
| Google Slides API | ❌ | PPTX 为本地生成，图片型幻灯片 |

## 安装

在本目录（包含 `package.json` 与 `cordis.patch.yml` 的目录）执行：

```text
plugin_manager install_bundle({ target: "<插件目录>" })
```

安装后 DSH 会应用 `cordis.patch.yml`，激活 Host 插件并加载 Web 客户端：

- 侧边栏「插件」列表出现 **设计台**
- 工具栏/主区出现设计台面板
- agent 侧获得 11 个 `design_*` 工具与一段 system-prompt 说明

若面板不出现：确认 DSH ≥ 0.2.2-rc.3、Node.js ≥ 22，然后重启会话；Host 插件在初始化失败时保持 inert 并写 warn 日志，不会弄崩 DSH。

## Agent 快速开始

直接用自然语言下任务即可，agent 会走工具链。新/含糊需求会先用 `design_intake` 问 ≤8 个关键问题再 `design_start`；把关键信息说全（类型、受众、语境、变体、Tweaks、交付、成功标准）则直接开干：

```text
帮我做一个面向瑜伽工作室的预约落地页，先看看 studio.breath.example 的设计系统，再给三档方案，要求无障碍达标。
```

```text
把设计/ 里的三档首页做一次质检，修到 90 分以上，然后导出 HTML 和 PDF。
```

```text
这个海报项目导出 PPTX，另外把设计系统 token 写进 system/tokens.json。
```

标准工作流（11 个工具的顺序用法）：

```text
design_intake  { } / { projectId, answers }              → 新/含糊请求先提问：拿 6 组问题清单（≤8 问）或增量保存答案
design_start   { name, kind, brief, intake?, viewports? } → 建项目（brief + intake），按 kind 播种脚手架到 design/a.html
design_context { projectId, kind:"url"|"path"|"image"|"text", value, adoptSystem? }
                                                         → 采集参考证据 / token / 截图，可选直接设为设计系统
（写文件）     design/a.html b.html c.html               → 直接写自包含 HTML（用 Write/Edit，不经过工具）
design_check   { projectId, variant?, widths? }          → 真实浏览器逐视口截图 + 质检，返回分数与 findings
（按 findings 修 HTML，重复 design_check 直到 ≥ 90）
design_tweak   { projectId, action:"get"|"set", key, value } → 读写页面 EDITMODE JSON
design_comments{ projectId, action:"list"|"resolve" }    → 处理用户在画布上留的评论
design_export  { projectId, kind:"html"|"zip"|"pdf"|"png"|"pptx", variant? }
```

其余工具：`design_system`（读/写 token 与 DESIGN.md）、`design_scaffold`（取/写 10 个起始模板之一）、`design_projects`（列出/查看/删除/保存版本/恢复版本/写入 brief，详情含 intake）、`design_serve`（拿变体的预览 URL）。

## 编辑器界面（UI v2 / 需求动线）

v1.1.0 起，面板是 Claude Design / Figma 级的三栏编辑器：画布居中，左栏放结构，右栏放属性，顶部栏、工具栏、状态栏齐全。左栏 248px、右栏 296px 是默认宽度（可拖拽：左 196–420、右 240–480，可收起；宽度与收起态持久化在 `localStorage` 的 `dsh-design-studio.layout`）。左右栏之间是 5px 拖拽热区，双击分隔线恢复默认宽度。`F6` / `Shift+F6` 在六个区域间循环焦点：顶栏 → 工具栏 → 左栏 → 画布 → 右栏 → 状态栏。进入编辑器之前是项目总览页（开始向导 / 需求输入 / 项目列表 / 导入设计系统）。v1.2 加入需求动线：左栏「需求」tab（默认打开）、TopBar 常驻「回到对话」与顶栏下方 28px 的 FlowStepper 阶段条；v1.3 起 FlowStepper 首段为「开始」，总览以 6 步开始向导为主入口（见上两节）。

```text
┌ TopBar 52px ─────────────────────────────────────────────────────────────────┐
│ [←] 品牌 · 项目名（点击改名） [状态 chip] [96 A]  [画布|画板] [检查][导出][⋯] [回到对话] │
├ FlowStepper 28px ────────────────────────────────────────────────────────────┤
│ 开始 → 语境 → 变体 → 迭代 → 质检 → 导出 · 高亮当前阶段 · 下一步：…           │
├ ToolBar 44px ────────────────────────────────────────────────────────────────┤
│ [↖ 选择][评论][检查器][左栏] │ [视口 1440▾][自定义][浏览器|手机][旋转]        │
│ [− 100% +][适应][1:1][适应选中] │ [标尺][网格][12列][对齐线] │ [↶][↷][保存]   │
├ Left 248px ─┬──────────────────── Canvas ────────────────────┬─ Right 296px ──┤
│ 需求│变体   │  上/左标尺 + artboard + iframe（设备框）       │ 属性│Tweaks    │
│ 图层│语境   │  浮动工具条 + 8 向缩放把手 / 评论钉            │ 评论│检查      │
│ 评论       │                                              │ 导出│系统│版本 │
├─────────────┴────────────────────────────────────────────────┴────────────────┤
│ StatusBar 26px：选中路径 · 尺寸 · 视口 · 缩放 · 保存态 · 桥状态 · 分数 · 提示 │
└──────────────────────────────────────────────────────────────────────────────┘
```

> 完整规格见 [`docs/UI-V2.md`](./docs/UI-V2.md)；实现见 `src/client/*`，`client.js` 由 `scripts/build-client.mjs` 拼接生成。

### 区域与职责

| 区域 | 内容 |
|---|---|
| TopBar（52px） | 返回、品牌、项目名点击改名（Enter 保存 / Esc 取消）、状态 chip、分数 chip（点击跳到检查 tab）、画布/画板视图切换、检查、导出菜单（HTML/ZIP/PDF/PNG/PPTX）、更多菜单（打开目录、保存版本、主题三态、复制项目 id、诊断、删除项目）、语言 中/EN、帮助、**回到对话** |
| ToolBar（44px） | 选择/评论工具（互斥）、右侧检查器开关、左栏开关、视口下拉 + 自定义宽度、浏览器/手机设备框、旋转、缩放（− / 百分比输入 / + / 适应 / 1:1 / 适应选中）、标尺 / 8px 网格 / 12 列参考线 / 对齐参考线开关、撤销 / 重做、保存（有未保存修改时高亮） |
| 左栏（248px） | 需求（默认打开）、变体、图层、语境、评论五个 tab |
| FlowStepper（28px） | 顶栏下方的阶段条：开始 → 语境 → 变体 → 迭代 → 质检 → 导出；已完成阶段打勾、当前阶段高亮，右侧显示「下一步：X · 提示」；点击阶段跳到对应入口（「开始」在 intake 未完成时打开向导）；不是 F6 焦点区域 |
| 画布 | 真实 HTML iframe + 可选设备框；标尺、覆盖层、浮动工具条、8 向缩放把手、评论钉与评论输入卡；缩放由工具栏控制，空格 + 拖拽平移 |
| 右栏（296px） | 属性、Tweaks、评论、检查、导出、设计系统、版本七个 tab，内容为可折叠分组 |
| 状态栏（26px） | 选中路径（多选计数）、矩形尺寸、视口、缩放、保存态、桥状态、最近检查分数、拖拽 dx/dy、操作提示 |

### 左栏：需求 · 变体 · 图层 · 语境 · 评论

| tab | 内容 |
|---|---|
| 需求 | 默认打开；顶部「需求信息」卡（intake 完整度 %、分组标签、待 Claude 追问列表、「补问 / 完善需求」重开向导并增量保存）；brief 五个字段（goal / audience / layout / content / constraints）内联编辑 + 「保存需求」（`POST /api/projects/:id/brief`，`{brief}` 合并）；「继续提需求」文本域自动附带当前变体、选中元素选择器、未解决评论数、未修复问题数 chip；「复制给 Claude 并去对话」/「只保存到需求」（追加到 goal，留在面板） |
| 变体 | A/B/C 卡：字母块、标签、文件名 + 字节数、该变体分数；点击切换画布变体；底部提示新变体由 agent 或脚手架写入 `design/` 后出现 |
| 图层 | 搜索、节点计数、刷新 + DOM 图层树：缩进、展开三角、tag 图标与 class 摘要、可见性眼睛；hover 联动画布描边、点击选中、选中行自动展开祖先 |
| 语境 | URL / 路径 / 图片 / 文字四种导入入口 + 已导入证据卡（kind、ref、时间、备注） |
| 评论 | 未解决数/总数、仅看未解决与全部切换、复制为 Claude 指令、进入评论模式；每条带变体 chip、选择器跳转、回复与解决 |

图层树由真实 DOM 推导（`outline` 消息）：≤ 400 节点、深度 ≤ 10，忽略 `script`/`style`/`link`/`meta`/`noscript`/`template`/`head`/`title`/`br` 与桥覆盖层，文本合并进父节点摘要，每次变更后 150ms 节流刷新。键盘：↑/↓ 移动、→ 展开或进入首个子级、← 折叠或回到父级、Enter/Space 选中；Escape 由画布清空选择。若画布只支持 v1 桥，图层 tab 显示解释性空态（「图层树需要 bridge v2（outline 消息）」），其余功能不受影响。

### 画布：标尺、参考线、画板视图、直接操作

| 能力 | 说明 |
|---|---|
| 标尺与参考线 | 上/左 20px 标尺（100px 刻度）；8px 网格、12 列参考线、对齐参考线独立开关；覆盖层在 `[data-ds-overlay]` 内，序列化时剔除。对齐参考线在拖拽时按父容器左/中/右、上/中/下 ±4px 显示，只是视觉提示，不自动吸附 |
| 缩放与平移 | 工具栏 − / 百分比输入 / + / 适应 / 1:1 / 适应选中（发送 `zoom-to`）；缩放范围 15%–200%；空格 + 拖拽平移 |
| 选择 | 单击选中；Shift + 点击多选；空白处拖拽 ≥ 8px 框选（与矩形相交的可见元素，最多 50 个）；Escape 清空 |
| 拖拽移动 | 按住选中元素拖 ≥ 3px，用 `position:relative` + `left/top` 位移；实时回传 dx/dy；一次拖拽 = 一条撤销历史；Alt 拖动复制 |
| 8 向缩放 | 桥在选区内绘制 8 个 8px 把手（`data-ds-handle`，可点击）；四角保持宽高比，边把手 + Shift 保持比例，Alt 从中心缩放，最小 8px；一次调整 = 一条历史 |
| 对齐父级 | 浮动工具条与属性面板的六向对齐；用 `transform: translate()` 对齐父容器；元素本身已有 transform 时退化为相对 `left/top` 偏移，绝不覆盖设计原有变换；可撤销 |
| 元素操作 | 复制 / 删除 / 上移 / 下移 / 选中父级 / 选中首子级 / 显隐（inline `display:none`）；删除内容保留在历史中可撤销 |
| 键盘 | 焦点在画布内时：方向键微移 1px、Shift + 方向键 10px；Escape 依次取消拖拽 / 缩放 / 框选，再按清空选择；双击文本进入编辑 |
| 画板视图 | 每个变体一个 1440×900 的懒加载 iframe，0.35 缩放并排；标签显示字母 / 名称 / 分数 / 宽度；点击进入该变体的画布视图 |

选中元素时浮出工具条（显示当前尺寸）：选中父级、复制、删除、上移、下移、编辑文字、六向对齐、复制 CSS。

### 右栏：七个 tab

| tab | 内容 |
|---|---|
| 属性 | 元素卡（tag / class / 文本预览 / DOM breadcrumb、复制选择器、复制 CSS、编辑文字、复制、删除）+ 对齐 / 位置与尺寸（X/Y 只读，W/H 可编辑）/ 文字（字体、字重、字号、行高、字距、对齐、颜色 + 对比度徽标、重置）/ 背景（颜色）/ 布局（display、margin 四边 + link、padding 四边 + link、gap）/ 边框（宽、样式、色、圆角）/ 效果（opacity、阴影 none·soft·raised、filter）/ 内容（编辑文字、复制、删除、复制 CSS） |
| Tweaks | 按值类型渲染：boolean 开关、color 取色器 + 文本、number 滑杆 + 数字、string 输入；改动实时应用并写回 `EDITMODE` JSON；显示原始 JSON 与复制按钮；空态给出 `EDITMODE` 片段示例 |
| 评论 | 与左栏相同的评论列表（解决 / 回复 / 跳转） |
| 检查 | 分数环 + 等级 + 轮次 + 变体切换；分类条、视口条；按严重度分组的 findings（含 fix 与选择器跳转）；截图缩略图 → 灯箱；重跑（有未保存修改时先自动保存） |
| 导出 | 5 张导出卡（HTML/ZIP/PDF/PNG/PPTX）+ 当前结果下载 + 最近 12 条导出记录 |
| 设计系统 | 色板、字体、字号·间距·圆角刻度、布局分区；最近一次检查的 system 分类分数 chip；从 URL 或路径导入（可选采纳为项目系统）；tokens JSON 编辑保存；`DESIGN.md` 预览 |
| 版本 | 标签输入 + 保存；时间线列表（标签、时间、文件数）+ 恢复确认；说明面板保存会自动写历史快照 |

### 命令面板与快捷键

`⌘K` / `Ctrl+K` 打开命令面板：45 个动作、9 个分组（文件 / 视图 / 缩放 / 工具 / 面板 / 检查 / 导出 / 主题 / 帮助），模糊搜索标题与关键词，↑/↓ 选择、Enter 执行、Esc 关闭。`?` 打开快捷键总表（4 组：文件与编辑 / 工具 / 视图 / 选择与图层）；所有图标按钮带自定义 tooltip（`data-tip`）：hover 延迟 300ms，键盘聚焦时立即显示。

| 快捷键 | 动作 |
|---|---|
| Cmd/Ctrl + S | 保存画布（序列化 + 写回 HTML + 历史快照） |
| Cmd/Ctrl + Z / Shift + Cmd/Ctrl + Z | 撤销 / 重做画布编辑 |
| Cmd/Ctrl + K | 打开命令面板 |
| Cmd/Ctrl + \ | 显示 / 隐藏右侧属性面板 |
| F6 / Shift + F6 | 六区域焦点循环 |
| E / C | 选择工具 / 评论工具 |
| 1 / 2 / 3 | 切换 A / B / C 变体 |
| 0 / + / - | 适应画布 / 放大 / 缩小 |
| Cmd/Ctrl + D | 复制选中元素 |
| Delete / Backspace | 删除选中元素（可撤销） |
| G / R | 8px 网格 / 标尺开关 |
| ? | 快捷键总表 |
| Space + 拖拽 | 平移画布 |
| 方向键 / Shift + 方向键 | 画布聚焦时微移 1px / 10px |
| Enter / Escape | 提交文字编辑 / 退出编辑或选择 |

### 主题、响应式与状态

- 主题三态「跟随系统 / 浅色 / 深色」，选择写入 `localStorage` 的 `dsh-design-studio.theme`；跟随系统同时读取 `prefers-color-scheme` 与宿主注入的 `data-theme` / `data-ds-dark-theme`。深色不是简单反色：工作台 `#141416`、面板 `#1b1b1e`、边框 `#2a2a2e`、文字 `#e9e6df`，强调色保持不变。
- 响应式：≤ 1100px 右栏变抽屉，≤ 900px 左栏变抽屉，≤ 768px 顶栏变 48px、工具栏换行、画布全宽；抽屉带遮罩，Esc 关闭；页面本身不横向滚动。
- 密度：11–12px 标签、26px 行高、1px 分隔线、14–16px 图标；tooltip hover 延迟 300ms、键盘聚焦立即显示；toast 3.4s 自动消失；coarse pointer 下可点目标 ≥ 44px。
- 桥 v1 降级：若注入的是旧版桥（ready 后 1.8s 内没有收到任何 v2 消息），图层树显示解释性空态，标尺/网格/参考线按钮禁用并标注「画布桥 v1」，画布顶部提示降级；选择、评论、Tweaks、保存等其余功能不受影响。
- 每个状态都有设计：加载骨架、空态（如「点击画布元素或运行检查」）、错误态、运行中进度、破坏性操作确认。

## 十一个 agent 工具

| 工具 | 主要参数 | 返回 | 什么时候用 |
|---|---|---|---|
| `design_intake` | `projectId?`, `answers?` | 不带 projectId：6 组问题清单 + `howTo`；带 projectId：`{intake, filled, missing, score, next}` | 新/含糊设计请求先提问：用问题清单里 ≤8 个关键问题问用户，再 `design_start({intake})`；已有项目可增量补答 |
| `design_start` | `name?`, `kind?`, `brief?`, `intake?`, `viewports?`, `scaffold?` | `{ok, projectId, dir, kind, variants, intakeScore, next}` | 任何设计任务的第一步；创建项目（brief + intake）并按 kind 播种脚手架 |
| `design_context` | `projectId`, `kind:"url"\|"path"\|"image"\|"text"`, `value`, `note?`, `adoptSystem?` | `{ok, evidence, tokens?, system?}` | 需要真实语境：看别人站点、扫代码库、读品牌图、收文字说明 |
| `design_system` | `projectId`, `action:"get"\|"set"`, `tokens?`, `doc?` | `{ok, system}` | 读/写设计系统 token 与一页 DESIGN.md |
| `design_scaffold` | `projectId?`, `id`, `target?`, `write?` | HTML 内容（≤ 64 KB）和/或写入结果 | 换起点：浏览器页、iOS/Android 屏、macOS 窗、deck、画布、tweaks、动效、A3 海报、A4 文档 |
| `design_check` | `projectId`, `variant?`（默认 `all`）, `widths?` | 分数、等级、分类、findings、截图文案 | 每次改完 HTML 后跑；真实无头 Chrome/Edge |
| `design_tweak` | `projectId`, `file?`, `action:"get"\|"set"`, `key?`, `value?` | `{ok, file, tweaks, changed}` | 读取或修改页面 `EDITMODE` JSON（不用重新生成页面） |
| `design_comments` | `projectId`, `action:"list"\|"resolve"`, `commentId?`, `reply?` | `{ok, comments}` | 用户在画布留了内联评论后，读并逐条解决 |
| `design_export` | `projectId`, `kind:"html"\|"zip"\|"pdf"\|"png"\|"pptx"`, `variant?` | `{ok, file, bytes, url, slides?}` | 交付：单文件、打包、打印 PDF、整页 PNG、每屏一页的 PPTX |
| `design_projects` | `action:"list"\|"get"\|"delete"\|"save-version"\|"versions"\|"restore"\|"set-brief"`, `projectId?`, `label?`, `versionId?`, `brief?` | 列表 / 详情（含 intake）/ 版本 / 持久化后的 brief | 跨会话找回、存版本、回滚、由 agent 写入需求五字段 |
| `design_serve` | `projectId`, `variant?` | `{ok, url, sameOrigin}` | 需要给用户一个可打开的预览地址时 |

工具失败不抛异常，返回 `{ok:false, code, error, repair:{action,label,detail}}`；`repair` 给出下一步可执行的动作。

## 项目数据结构

`<dataDir>/projects/<projectId>/`

```text
project.json           版本化项目记录（原子替换）
design/                agent 写入的变体：a.html、b.html、c.html、assets/...
system/tokens.json     设计系统 token（可选）
system/DESIGN.md       一页设计系统说明：Brief + Intake 摘要（给 agent 读，可选）
context/               导入的参考：evidence.json、图片、抓取片段
checks/round-<n>/      check.json + 截图 + deck 每屏截图
exports/               导出的 html/zip/pdf/png/pptx
versions/<v-n>/        design/ + system/ 的显式快照
history/<file>-<ts>.html 面板保存前的旧内容（每文件上限 20，总计上限 40）
comments.json          内联评论（原子写）
```

`project.json` 关键字段：`schemaVersion`、`id`（`dsg-YYYYMMDD-HHMMSS-xxxx`）、`name`、`kind`、`brief{goal,audience,layout,content,constraints}`、`intake{...}`（v1.3 可选）、`viewports`、`status`（draft→designed→checked→ready，`bestScore ≥ 90` 视为 ready）、`system`、`context`、`checks`、`bestScore`、`variantLabels`、`comments`、`versions`、`exports`、`history`。变体不写进记录，由 `design/*.html` 排序发现，id 即文件名主干。

## 设计系统 token 架构

`system/tokens.json` 的冻结字段（全部可选，读时规范化）：

```json
{
  "name": "品牌",
  "source": { "kind": "manual", "ref": "", "at": "2026-11-08T01:02:03.000Z" },
  "color": { "bg": "#faf9f6", "surface": "#ffffff", "ink": "#1a1a1a", "muted": "#6b6b66", "accent": "#b4552f", "border": "#e4e2db", "extra": [] },
  "font": {
    "display": { "family": "Fraunces", "stack": "\"Fraunces\", Georgia, serif", "weights": [400, 600] },
    "body": { "family": "Inter Tight", "stack": "\"Inter Tight\", system-ui, sans-serif", "weights": [400, 500, 600] },
    "mono": { "family": "JetBrains Mono", "stack": "\"JetBrains Mono\", ui-monospace, monospace" }
  },
  "size": { "scale": [12, 14, 16, 20, 24, 32, 44, 64] },
  "space": { "scale": [4, 8, 12, 16, 24, 32, 48, 64, 96] },
  "radius": { "scale": [0, 4, 8, 12, 16, 999] },
  "layout": { "maxWidth": 1160, "gutter": 24, "breakpoints": [640, 900, 1200] },
  "notes": "一段设计系统约束说明"
}
```

设置系统后，质检会增加 `system` 分类：实际用色/字体/字号/圆角/间距与 token 的偏差比例、具体违规值与出现次数都会变成 findings。没有 token 时该分类权重按 §7 重新分配（a11y .35、type .20、layout .20、slop .25）。

## 质检：类别、评分与等级

五类检查（实现见 `lib/audit.js`，规则口径见 CONTRACT §7）：

- **a11y**：lang/title、图片 alt、可点文本、标题层级顺序、输入标签、对比度（正文 < 4.5:1，大字 < 3:1，< 3:1 升为 critical）、桌面 < 16px / 手机 < 14px 正文、手机 < 44px 触控目标、横向溢出、重复 id。
- **type**：> 3 个字体家族、Inter/Roboto/Arial/Helvetica/system-ui/Poppins 做门面字体、正文字号下限、> 10 种字号、正文行高 < 1.2、标题字号不递减、小字负字距、超长居中段落。
- **layout**：间距偏离 4px 栅格比例、> 12 种间距、根元素溢出、区块高度过扁、非 token 圆角比例、空页面、固定浮层超过视口 20%、文本重叠。
- **system**（有设计系统时）：离调色板/字体/字号/圆角/间距的聚合偏差，逐项给出违规值与修复建议。
- **slop**：紫/蓝/粉渐变背景（critical）、> 6 个 emoji、lorem ipsum、假名字/假公司/"Trusted by" 套路、占位图床、圆角卡片 + 4px 左色条、hero→三卡→CTA→页脚的万能模板、无来源统计数字、> 8 个同款图标卡。

扣分：critical −30、high −15、medium −7、low −3，每类最多计 10 条（按严重度取前 10）。类别分 = `max(0, 100 − 扣分)`；总分 = 类别加权平均；等级：≥ 90 A、≥ 80 B、≥ 70 C、≥ 60 D，否则 F；`pass = score ≥ 90`。deck 以每屏 1920×1080 单独评分后平均（正文下限 24px，不查手机触控），mobile kind 在所有宽度用手机阈值。

## 导出

| 类型 | 实现 | 产物 |
|---|---|---|
| `html` | 直接复制 `design/<variant>.html`（自包含假设） | `.html` |
| `zip` | `design/` + `system/` + 项目摘要 + `README.txt`（`node:zlib` deflate，无依赖） | `.zip` |
| `pdf` | CDP `Page.printToPDF`（printBackground、preferCSSPageSize） | `.pdf` |
| `png` | 首个视口整页截图 | `.png` |
| `pptx` | deck 每屏截图 → 一屏一页 16:9；否则每个视口一页；最小合法 OOXML（embedded PNG） | `.pptx` |

文件名：`design-<projectId>-<variant>-<kind>.<ext>`，写入 `exports/`，受 `maxExportBytes` 上限约束。打印类导出依赖页面自己的 `@page` 规则——`deck`、`poster`、`doc` 三个脚手架已内置真实纸张尺寸与逐页/单页打印样式。

## 起始脚手架

`design_scaffold` 提供 10 个自包含 HTML 起点，全部零外部请求、原创视觉方向、带 Tweaks 编辑模式：

| id | 用途 | 尺寸 / 关键点 |
|---|---|---|
| `browser` | 编辑式落地页 | 响应 1440/768/375，报头 + 导语 + 目录 + 订阅条 |
| `ios` | iPhone 应用屏 | 393×852，安全区、44px 触控目标、状态栏 |
| `android` | Android 应用屏 | 412×915，Material 3 色调、可交互任务勾选 |
| `macos` | 桌面应用窗口 | 红绿灯、侧栏、样张纸面、深浅主题 |
| `deck` | 16:9 幻灯片 | `data-screen-label` 1-indexed、键盘翻页、localStorage 恢复、每屏一页打印 |
| `canvas` | 多方案并排画布 | 三档首屏方向 + 顶部筛选标签 |
| `tweaks` | 实时调参样板 | 6 个参数，控件直接改 CSS 变量并回传宿主 |
| `anim` | 动效时间轴 | 1920×1080 舞台、requestAnimationFrame、播放位置保存 |
| `poster` | A3 海报 | `@page size A3`、专色、套准标记、网点图版 |
| `doc` | A4 单页文档 | `@page size A4`、双栏、表格与编号步骤 |

默认映射：`web → browser`、`mobile → ios`、`deck → deck`、`poster → poster`、`doc → doc`。

## 测试

```text
npm test                        # 单元测试：node --test test/unit/*.test.mjs
npm run test:integration        # 真实浏览器：探针 / 截图 / 导出链路（需要本机 Chrome 或 Edge）
node --check lib/scaffolds.js   # 内容模块语法检查
node --test test/unit/scaffolds.test.mjs
```

`test/unit/scaffolds.test.mjs` 覆盖：10 个 id 的文档外壳（doctype / lang / title / inline style & script）、`EDITMODE` JSON 可解析且 3–6 个键、`__dsApplyTweaks`、编辑模式协议的监听器先于通告、零外部 http(s) 引用、deck 的屏幕标签与打印样式、poster/doc 的纸张尺寸、移动端设备尺寸与 44px 目标、`writeScaffold` 的写入/拒绝覆盖/强制覆盖/路径越界、以及 locale JSON、icon SVG、LICENSE 与文档资源。

v1.3.1 冻结验证：单元测试 **271/271** 通过（`client.test.mjs` 39、`bridge.test.mjs` 38、新增 `intake.test.mjs` 8），真实浏览器集成 **10/10**（浏览器 8 + 全链路 e2e 1 + 向导→交接 e2e 1）；`node scripts/build-client.mjs --check` 校验 8 个客户端片段与 `client.js`（468,184 B）同步；`scripts/verify-release.mjs` 在 tag 上做 13 项产物校验（tag/版本/annotated/commit/main、生成物、文件清单、npm pack、密钥扫描等）。真实浏览器 e2e `wizard-handoff.test.mjs` 用 shipped `client.js` 的向导状态机 + 真实问题库 + 真实 `/api/projects` 走 6 步点击，断言交接 prompt/剪贴板/面板切换/toast，再从 prompt 解析 projectId、写入三档 `good.html` 并活体 `design_check` 断言三个变体 **96 / A**。v1.3.1 同时修复 host 问题库与客户端答案键不一致导致的「变体维度/跨度」丢失：`answersToIntake`/`answersFromIntake` 同时接受 `variationDimensions`/`variationRange` 与 `dimensions`/`range`，跨度在中文选项、0–100 滑杆与 canonical 标签之间归一，`toggle`/`toggles` 去重。发布：tag 推送触发 `.github/workflows/release.yml`（check → 单元 → 真实浏览器集成 → 产物校验 → artifact 上传，失败即阻断）；v1.3.0 Release notes 见 [docs/RELEASE-v1.3.0.md](./docs/RELEASE-v1.3.0.md)。

## 已知限制

- 质检与导出依赖本机 Chrome/Edge/Chromium；Windows 自动发现常见安装路径，macOS/Linux 也可用 `DESIGN_STUDIO_BROWSER` 指定可执行文件。没有浏览器时 `design_check` 返回 `no_browser` 并给出修复建议，Host 仍可正常激活。
- PPTX 是图片型幻灯片，不是可编辑文本框；需要可编辑版式时用 deck HTML + 打印 PDF，或后续接入 OOXML 富文本。
- 有 DOM 图层树、拖拽/缩放/对齐与浮动工具条，但没有 Figma 式对象模型、约束系统与组件实例；所有编辑直接作用于真实 DOM（这是有意的取舍）。
- 编辑是「即时预览 + 保存序列化」：画布里的改动立刻可见、可撤销，但只有点保存（或 agent 直接写文件）才落盘；没有 v0 式独立 Apply 步骤，保存边界就是应用边界。
- 面板检查会先自动保存（dirty 时）再跑质检；agent 的 `design_check` 直接读磁盘上的 `design/*.html`。**导出读磁盘文件，不读画布内存状态**，所以导出前需要先保存。
- 标尺、8px 网格、12 列参考线与对齐参考线都是可视化；对齐参考线只在拖拽时按 ±4px 显示，不做自动吸附或智能间距。
- 面板没有聊天输入框：需求要写好后复制、切回对话粘贴发送；面板只负责设计工作台（这是 DSH 主区域互斥下的设计，不是功能缺失）。
- 单机单用户：无账号、无云同步、无多人实时协作。
- 所有站点抓取只走本机 loopback 浏览器与用户给定 URL；不提供任何远程服务。
- 脚手架内容为虚构示例（品牌、数据、机构均为占位），使用时替换成真实内容。

## 归属与许可证

- 参考并复用了同一作者 `workspace/dsh-site-rebuild`（MIT）的 CDP/WebSocket/浏览器池与面板路由模式。
- 设计判断层来自 `claude-design` skill（改编自 Jane-xiaoer/claude-design-principles，MIT），scaffolds 为 clean-room 原创实现，不复制任何真实站点。
- 本插件以 MIT 许可证发布，见 [LICENSE](./LICENSE)。
