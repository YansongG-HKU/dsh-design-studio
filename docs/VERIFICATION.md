# 设计台（dsh-design-studio）验收记录 v1.0.0 → v1.3.0

> 验收时间：2026-11-08（Asia/Shanghai）
> 环境：Windows · DeepSeek Harness 0.2.2-rc.1（profile `desktop`）· Node v24.14.1 · Google Chrome 117.0.5938.62
> 结论：**已安装、已启用、活体验收通过**。单元测试 200/200，真实浏览器集成 8/8，端到端管线 1/1，HTTP 验收全绿，活体工具链与画布面板实测可用。

本文件只记录**实际执行过**的命令与结果；未执行的能力在「八、限制与未覆盖」中明确列出，不用声称代替证据。

## 一、构建与测试

| 命令 | 结果 |
|---|---|
| `node --check index.js` + 全部 `lib/**/*.js` + `client.js` | 0 错误 |
| `node scripts/build-client.mjs --check` | up to date（5 fragments, 235,500 bytes） |
| `node --test test/unit/*.test.mjs` | **200 pass / 0 fail**（store 14、jobs 9、service 16、tools 16、panel 18、preview 5、bridge 9、tokens 18、audit 25、zip 7、pptx 7、client 16、scaffolds 40，共 200） |
| `node --test test/integration/browser.test.mjs` | **8 pass / 0 fail**（真实 Chrome：probe 截图+指标、audit 评分、html/zip/png/pdf、deck→pptx、typed error codes） |
| `node --test test/integration/e2e.test.mjs` | **1 pass / 0 fail**（真实浏览器全链路：建项→保存 a/b 变体→质检 a=96/b=50→截图校验→评论→Tweaks→版本保存/恢复→html/zip/pdf/png/pptx 导出→预览→删除） |
| 打印分页（content-display 实测） | deck 6 页、poster 1 页 A3、doc 1 页 A4（CDP printToPDF，preferCSSPageSize） |

## 二、安装与激活

```
plugin_manager({action:"install_bundle", target:"<plugin-dir>"})
→ application: "applied", bundle: "dsh-design-studio", version: "1.0.0", warnings: []
```

活体注册（`cordis_inspect_query`）：

- Client `Slots.listSubTree("sidebar.panellist")` → occupant `dsh-design-studio`，order **24**，active **true**
- Client `Slots.listSubTree("main")` → occupant key `dsh-design-studio`，active **true**
- Host 工具已出现在会话工具表：`design_start, design_context, design_system, design_scaffold, design_check, design_tweak, design_comments, design_export, design_projects, design_serve`（10/10）
- 插件行 id：`include:dsh-design-studio`，`fiberPhase: "active"`

## 三、HTTP 活体验收（`_tools/accept-panel.mjs`）

项目：`dsg-20261107-173923-6775`（验收 · 盐线 Saltline，kind=web，3 个变体）

| 检查 | 结果 |
|---|---|
| `GET /api/state` | 200，`browser.available=true`，Chrome 117 |
| 无插件头的 API 请求 | **403**（门禁生效） |
| 路径穿越 `/api/projects/nope/file?path=../../../../etc/passwd` | **400 拒绝**（id 非法先被拒绝，仍未读到文件） |
| `POST /api/projects` | 200，生成 `dsg-…` 项目 |
| `POST /api/projects/:id/system` | 200，写入 Saltline Brand System |
| `POST /api/projects/:id/save` ×3 | 200，a/b/c 各约 22.7–26.1 KB |
| `POST /api/projects/:id/check` → 轮询 `/job` | 200 → job done，**18.2 s**；总分 **96 A**（a 96 / b 97 / c 96），9 张截图 |
| 评论 add/list/resolve | 200 / 200（1 条待处理）/ 200 |
| `GET/POST /api/projects/:id/tweak` | 200，keys `accentColor, seaColor, displayScale, density, dark`；patch 成功 |
| 版本 save/list | 200，`v-1` |
| `POST /api/projects/:id/preview` + 预览页 | 200，URL `http://127.0.0.1:60809/dsh-design-studio/preview/<id>/v/a`；HTML 含 `data-ds-bridge` 与 `<base>`，40,850 bytes |
| 导出 html / zip / pdf / png / pptx | 200；22,756 B / 26,135 B / 340,671 B / 388,015 B / 993,696 B |
| `GET /api/projects/:id/export-file?path=…` | 200；zip/pptx magic `PK`、pdf `%PDF`、png `PNG` 全部校验通过 |

证据文件：`_artifacts/design-studio/accept-panel.json`、`accept-panel.log`。
三个变体的真实质检截图：`_artifacts/design-studio/check-{a,b,c}-1440.png`；导出产物副本同目录。

## 四、活体工具链验收（会话内直接调用）

| 工具调用 | 结果 |
|---|---|
| `design_projects(list/get)` | 返回项目、brief、变体（a 96 / b 97 / c 96）、checks、versions、exports、浏览器状态 |
| `design_context(kind:"url", http://127.0.0.1:8099/a.html)` | 返回证据 `ev-…`：7 色 / 3 个字族 / 12 号字号 / 10 间距 / 1 圆角（从真实计算样式提取） |
| `design_check(all)` | round 2，**96 A / pass=true**，18 s；分类 a11y 100 / type 90 / layout 100 / system 86 / slop 100，12 条问题含可点击选择器与修复建议 |
| `design_export("pptx")` | 993,614 B，记录 file + download URL |
| `design_scaffold(id:"deck", write:false)` | 返回 24,428 B 完整 6 屏 deck 起始稿（含 `data-screen-label`、打印分页、TWEAKS 协议） |
| `design_tweak(get/set)` | 读取 5 个 tweak；把 `accentColor` patch 回 `#a8401c`，`changed:true` |
| `design_serve(variant:"a")` | 返回同源预览 URL（`sameOrigin:true`） |
| `design_comments(list)` | 返回 1 条已解决评论（含 selector、element 快照、回复） |

## 五、画布面板验收（真实桌面窗口）

DSH 桌面窗口不向外部浏览器开放（HTTP 401 token 门禁），因此面板证据用 Win32 `PrintWindow` 抓取真实窗口，并用 UI Automation 驱动点击（`_tools/capture-dsh-window.ps1`、`_tools/uia-click.ps1`）。

| 证据 | 文件 | 内容 |
|---|---|---|
| 面板总览 | `_artifacts/design-studio/gui-panel-overview.png` | 设计台面板：2 个统计 chip（1 项目 / 已质检 1 / 可用 1）、项目卡（96 分环、已设计/网页/3 个变体/1 条评论） |
| 画布工作区 | `_artifacts/design-studio/gui-panel-workspace.png` | 变体轨 a/b/c（96/97/96）、视口 1440/768/375、浏览器/手机框、浏览/选择/评论、缩放 42%、真实 iframe 渲染盐线设计；状态栏 **预览已就绪** |
| 元素选择 + 实时检查器 | `_artifacts/design-studio/gui-panel-select.png` | 选择模式选中 `div.hero-grid > div:nth-of-type(1)`；检查器显示计算样式（文字色 rgb(22,24,26)、字号 16px、行高 24.8px、内边距/外边距/圆角/宽度 541.79px/透明度）与 12 个快速改样式控件 |
| 客户端渲染矩阵（harness） | `_artifacts/design-studio/panel-harness/*.png` | 1440 / 1024 / 768 下总览、工作区、检查、设计系统等状态渲染截图 |

**验收中发现并修复的缺陷**：桌面端面板 iframe 的父页面运行在 `dsh-app://` 源上，而注入画布的 bridge 只向插件上报的 HTTP 源 `postMessage`，消息被浏览器静默丢弃 → 画布一直显示“预览未加载”。修复：`lib/bridge.js` 先尝试读取同源父窗口真实 origin，再回退到配置源与本页源逐个投递，并加入握手指数重试（8×400 ms，收到任何 panel 消息即停止）。修复后：
- 预览 HTML 含 `targetOrigins` / `announceWithRetry`；
- 面板状态从“预览未加载”变为 **预览已就绪**；
- 选择模式点击画布元素后，检查器正确显示该元素计算样式（见上表截图）。

Host 模块热重载通过 `plugin_manager set_plugin(include:dsh-design-studio, false→true)` 完成（`application: applied`），无需重启桌面应用。

## 六、设计质量与内容验收

- 验收演示设计「盐线 Saltline」三档变体（规范/进阶/前卫）由 Lead 撰写，经真实 probe+audit 评分 **96 / 97 / 96（全部 A）**，覆盖真实修正流程（对比度、44px 触控、正文 16px、标题层级、设计系统吸附）。
- 10 个起始脚手架全部为自包含 HTML（零外部请求），实测评分 96.6–100（全部 A）：browser 96.7、ios 99.4、android 100、macos 96、deck 99.8、canvas 97.9、tweaks 96.6、anim 98.6、poster 96.6、doc 98。
- 审计识别力：对抗样例 `flawed.html`（紫色渐变、Inter 门面、12px 正文、假统计、Lorem、John Doe、占位图、缺 lang/alt/label）在 e2e 中得 **50 F**，并给出 critical/high 级问题；干净样例得 96 A。

## 七、显示资源与文档

- `locale/zh.json`、`locale/en.json`：`meta.title` 设计台 / Design studio，一句话能力描述；`panel.label`
- `icon.svg`：800+ B 原创图标（画板 + 叠放变体卡 + 钢笔尖），无文字/外链
- `LICENSE`：MIT（Copyright 2026 YansongG-HKU）
- `README.md`（232 行）、`CHANGELOG.md`、`docs/DESIGN.md`：能力对照、安装、agent 工作流、10 工具参考、token schema、评分口径、导出、目录、限制、归属

## 八、限制与未覆盖

1. **PPTX 仅结构校验**：本机无 LibreOffice/PowerPoint，导出的 PPTX 已验证 ZIP 结构、Content_Types/rels 解析、16:9 页面尺寸与 media 字节，但未做 PowerPoint 渲染打开验证。
2. **非 PNG 参考图**：纯 Node 无 JPEG 解码器，`tokensFromImageBuffer` 仅支持 PNG；JPEG/WebP 需走带浏览器的 `tokensFromImageFile`（`design_context(kind:"image")` 走 base64 路径时，非 PNG 会返回 `unsupported_image`）。
3. **画布直接编辑的边界**：选择改写内联样式、方向键 1/10px 微移、双击改文字、撤销/重做、序列化保存为版本均已在 bridge 实现；自由拖拽/图层重排是真实 HTML 编辑器的边界，不在本版范围（用检查器与 Tweaks 替代）。
4. **导出为同步请求**：`POST /export` 无 job 句柄，面板显示请求级进度（契约如此）。
5. **桌面窗口截图**：用 PrintWindow 抓取；一旦用户切换窗口/会话，抓图内容随之变化，因此每次截图均在操作后立即采集。外部浏览器访问 GUI 仍受桌面 token 门禁（401），未绕过。
6. **多用户协作、Google Slides API、Figma 导入导出**不在本版范围（README 已列明）。

## 九、复现命令

```powershell
cd <plugin-dir>
node --check index.js
node scripts/build-client.mjs --check
node --test test/unit/*.test.mjs
node --test test/integration/browser.test.mjs
node --test test/integration/e2e.test.mjs
cd <workspace>
node _tools\serve-dir.mjs "_artifacts\design-studio\demo" 8099   # 验收演示设计
node _tools\accept-panel.mjs http://127.0.0.1:60809
pwsh -File _tools\capture-dsh-window.ps1 -Out _artifacts\design-studio\gui-panel.png -TitleMatch 'DeepSeek Harness'
```

---

## 十、v1.1.0「UI v2」追加验收（2026-11-08）

### 1. 逆向依据

- Claude Design 系统提示词泄漏全文（CL4R1T4S 收录，经腾讯云开发者社区转载）：工作流、变体/Starters/Tweaks、`<mentioned-element>`（react/dom/id、`data-dm-ref`、`data-cc-id`）、固定尺寸 stage、设计系统 artifact、内容铁律。
- Anthropic 帮助中心：Claude Design 编辑器区域模型（toolbar / canvas / properties panel / layer list / floating toolbar）、F6 区域循环、画板→图层→分组的键盘层级语义、评论标记与 "Send to Claude"/"Show all comments"、颜色选择器对比度反馈、设计系统分节浏览。
- 成熟工具 IA：v0 Design mode（图层/选中手柄/设计面板分组 Typography·Color·Background·Layout·Border·Appearance·Shadow·Content、Inspect 切换、pending edits/Apply、before-after）、Figma（三栏 + Pages/Layers + Design 属性 + 标尺参考线 + 缩放）、Framer / Canva（浮动上下文工具条）。

### 2. 交付内容（v1.1.0）

- 前端 5 片段重构为 **7 片段**：`00-head` / `01-overview` / `02-canvas` / `03-left-rail` / `04-inspector` / `05-shell` / `06-apply`；`client.js` **370,312 B / 6,517 行**。
- Bridge v2：注入脚本 **45,856 B**（构建期字符串/正则感知压缩，上限提至 **64 KiB**），新增 outline / hover / select-many / marquee / op(duplicate·delete·up·down·parent·first·editable) / visibility / align / drag-move / 8-handle resize / overlay(标尺·8px 网格·12 列·智能参考线) / selection-geometry / drag-state / changed / comment-rect / comment-pins；v1 消息与 `targetOrigins()`/`announceWithRetry()` 修复原样保留。
- 编辑器 UI：顶部栏（返回/双击改名/状态/分数 chip/画布·画板切换/检查/导出/更多/语言/帮助）、44px 工具栏（选择/评论/检查器·左栏开关/视口+自定义+旋转/设备框/缩放预设+输入+适应+1:1/标尺·网格·参考线/撤销·重做·保存）、左栏四 tab（变体/图层/语境/评论）、画布（设备框、标尺、参考线、空格平移、画板视图、评论钉、浮动选择工具条、拖拽/缩放/对齐）、右栏 Figma/v0 式可折叠属性分组（对齐/位置尺寸/文字+对比度徽标/背景/布局四边+联动/边框/效果/内容）与 Tweaks/评论/检查/导出/系统/版本、26px 状态栏、⌘K 命令面板（45 动作）、`?` 快捷键总表、auto/light/dark 主题、F6 六区域、可拖宽折叠面板与响应式抽屉。

### 3. 构建与测试（v1.1.0 实测）

| 项 | 结果 |
|---|---|
| `node scripts/build-client.mjs --check` | up to date（7 fragments, 370,312 B） |
| `node --check`（index / lib/** / client.js） | 0 错误 |
| `node --test test/unit/*.test.mjs` | **237 pass / 0 fail**（bridge 38、client 24，其余同 v1.0.0） |
| `node --test test/integration/browser.test.mjs` | 8 pass / 0 fail |
| `node --test test/integration/e2e.test.mjs` | 1 pass / 0 fail（真实浏览器全链路，v2 bridge 下重跑） |
| 安装 | `remove_bundle` + `install_bundle` → `application: applied`，`version: "1.1.0"`，warnings 0 |
| 活体状态 | `GET /api/state` → `version:"1.1.0"`，Chrome 可用，项目 1 个 |
| 活体桥 v2 | 预览 HTML 66,986 B，含 `outline / select-many / selection-geometry / drag-state / editable-state / comment-pins / visibility / overlay / align` 全部标记；`targetOrigins`/`announceWithRetry` 仍在 |

### 4. 界面证据

- 活体（真实桌面窗口，Win32 PrintWindow）：`_artifacts/design-studio/ui-v2/01-workspace-live.png` —— v2 顶部栏（面包屑 + 已设计 + 96·A 分数 chip + 画布/画板切换）、工具栏（选择/评论/检查器/视口/设备框/缩放 43%/标尺·网格·参考线/撤销重做保存）、左栏 tab（变体 3 / 图层 99+ / 语境 / 评论）、变体卡（A 96 / B 97 / C 96 + 文件 + 字节）、真实 iframe 设计预览与评论钉。
- 组件级真实 Chromium 渲染（mini-React harness，19 个状态 0 错误）：`ui-v2/v2-editor.png`（亮色编辑器）、`v2-editor-dark.png`（深色）、`v2-layers.png`（图层树）、`v2-inspector.png`（属性分组）、`v2-palette.png`（⌘K 命令面板）。

### 5. 本次限制

- 面板交互式截图（图层树点选、浮动工具条、画板视图、深色主题的**活体**操作）受用户同时使用桌面窗口影响：点击会被用户切换会话打断，因此以「1 张活体 v2 工作区截图 + 5 张真实 Chromium 组件状态截图」组合作为界面证据；v2 消息面、构建、单测、e2e 与活体路由均已独立验证。
- 与 v1.0.0 相同：PPTX 仅结构校验；非 PNG 参考图需浏览器取色路径；画布编辑是真实 DOM 操作而非对象模型（无自由图层重排）；外部浏览器仍受桌面 token 门禁。

---

## 十一、v1.2.0「需求动线」追加验收（2026-11-08）

背景：用户反馈「**我都不知道在哪里发我的需求**」。v1.1 的面板是编辑器信息架构，但没有把"需求属于对话"这条动线显式化。v1.2 只改信息架构与交接，不动工具语义。

### 1. 交付内容

- **总览第一屏 = 需求输入区**：引导卡（"需求在对话里说，面板里改" + 3 步 + 回到对话/写需求/知道了）+ 类型 chips（网页/移动端/演示稿/海报/文档）+ 需求文本域 + 受众/约束 + 主按钮「保存并去对话」+ 次按钮「只建项目」+「在对话里直接说也可以」三条示例与「回到对话」+ 5 步流程卡（需求→语境→变体→质检→导出）。
- **HandoffToClaude 统一交接**：`navigator.clipboard.writeText(结构化 prompt)` → toast → `ctx.layout.selectPanel(null)` 返回对话；缺 `layout` 时降级为"复制 + 说明 toast"。TopBar 常驻「回到对话」（只导航不复制）。
- **左栏第一个 tab「需求」（默认激活）**：brief 五字段内联编辑 + dirty 标记 + 「保存需求」（`POST /api/projects/:id/brief`）+「继续提需求」composer（自动附带 变体/选中元素 selector/未解决评论/待修问题 chips）+「复制给 Claude 并去对话」/「只保存到需求」。
- **FlowStepper**：TopBar 下方 28px 流程条，按项目状态推导 需求/语境/变体/迭代/质检/导出 的 done/current/next 与「下一步：X」提示，可点击直达。
- **快捷交接**：检查 tab「让 Claude 修复这些问题」（序列化本轮 issues）、评论 tab「复制给 Claude」（未解决评论 + 元素文本 + resolve 指令）、变体/语境空态交接。
- **Host 接口**：`service.updateBrief`（五字段校验/截断/局部合并）、`POST /api/projects/:id/brief {brief}` → `{ok, brief}`、`design_projects action:"set-brief"`。
- **文档**：新增 `docs/UX-MAP.md`（功能全景 / 业务流程 / 界面信息架构 / 需求动线 / 验收清单），README/CHANGELOG/DESIGN 同步。

### 2. 构建与测试（v1.2.0 实测）

| 项 | 结果 |
|---|---|
| `node scripts/build-client.mjs --check` | up to date（7 fragments, **410,984 B**） |
| `node --check`（index / lib/** / client.js） | 0 错误 |
| `node --test test/unit/*.test.mjs` | **246 pass / 0 fail**（bridge 38、client 30、service 17、panel 19、tools 18、其余不变） |
| `node --test test/integration/browser.test.mjs` | 8 pass / 0 fail |
| `node --test test/integration/e2e.test.mjs` | 1 pass / 0 fail（真实浏览器全链路在 v1.2 下重跑） |
| 安装 | `remove_bundle` + `install_bundle` → `application: applied`，**version 1.2.0**，warnings 0 |
| 活体版本 | `GET /api/state` → `version:"1.2.0"` |
| 活体 brief 路由 | `POST /api/projects/:id/brief` → 200，`{ok:true, brief.goal:"…（v1.2 需求动线验收）"}`（accept-panel 记录 `brief-update`） |
| 活体工具 | `design_projects({action:"set-brief"})` → 200，返回持久化后的五字段 brief |
| 活体全链路 | accept-panel 全绿：项目 `dsg-20261107-185813-2a81`、质检 **96 A**（a 96 / b 97 / c 96，9 截图）、评论/Tweaks/版本、预览 66,986 B 含全部 v2 标记、5 种导出 magic 全通过 |

### 3. 界面证据（真实桌面窗口，Win32 PrintWindow）

- `_artifacts/design-studio/ui-v3/01-live-overview.png`：**活体总览第一屏**——引导卡「需求在对话里说，面板里改」+ 需求卡「要做点什么？」+ 类型 chips + 需求文本域 + 受众/约束 + 「保存并去对话」/「只建项目」+ 「在对话里直接说也可以」+ 回到对话。
- `_artifacts/design-studio/ui-v3/02-live-editor.png`：同一面板下滚后的 5 步流程卡 + 项目库卡（验收·盐线 96 分）+ 数据目录 `… - v1.2.0`。
- `_artifacts/design-studio/ui-v3/03-live-workspace.png`：**活体工作区**——TopBar「回到对话」、FlowStepper 六段全绿「已完成」、左栏默认「需求」tab（五字段 + 保存需求 + 继续提需求），画布预览已就绪，状态栏含分数/缩放/保存/桥状态。
- `ui-v3/v12-overview.png`、`ui-v3/v12-editor.png`：真实 Chromium 渲染（1440）同状态的组件级截图。

### 4. 本次限制

- 「保存并去对话」的剪贴板内容与 `layout.selectPanel(null)` 跳转由纯函数单测（`buildHandoffPrompt`/`handoffPlan`）+ 渲染态验证覆盖；未在活体上真正点击以免创建额外项目/打扰当前窗口，粘贴动作仍需用户按 Ctrl+V（这是 DSH 对话与全局面板互斥主区域下的显式设计，见 UX-MAP §6）。
- 其余限制同 v1.1（PPTX 结构校验、非 PNG 参考图、DOM 编辑而非对象模型、桌面 token 门禁）。

---

## 十二、v1.3.0「开始 / 提问」流程追加验收（2026-11-08）

背景：用户追问 *"你也得看看 Claude Design 的流程，包括开始、包括提问等等。"* v1.2 有了需求入口，但仍是"一句话开干"，缺 Claude Design 的**开始访谈**环节。v1.3 只补流程与 intake，不改工具语义。

### 1. 交付内容

- **6 步开始向导**（面板）：做什么（类型 + 一句话目标）→ 给谁看（受众/场景/语气）→ 语境（设计系统/URL/仓库/截图/没有 + 参考 + 品牌约束）→ 变体（2/3/4 档 + 视觉/交互/布局/文案/动效 + 按规矩↔前卫）→ Tweaks 与内容（颜色/字号/间距/文案/布局/开关 + 必须有/不要有）→ 交付（HTML/PDF/PPTX/PNG/ZIP + 响应式 + 成功标准）。进度 n/6、每步「不知道，让 Claude 决定」、必答校验、可取消、预填补问。
- **创建并去对话**：答案 → brief + intake → `POST /api/projects {brief, intake}` → 结构化 start prompt（已确认信息表 + ≤8 个让 Claude 追问项）→ 剪贴板 → toast → `layout.selectPanel(null)`；「只建项目」直接进工作区。
- **Agent 提问策略**：系统提示新增开始流程——新/含糊请求先调 `design_intake` 取问题清单、问 ≤8 个缺失项、用 `design_intake({projectId, answers})` 落盘，再 `design_start`；已给全则跳过。`design_start` 新增 `intake` 参数。
- **intake 数据模型**：`lib/intake.js` 6 组 / 16 问（7 必答），`normalizeIntake`/`mergeIntake`/`intakeSummary`/`intakeCompleteness`；`project.json.intake`（所有字段可选、文本 ≤2000 字节、列表 ≤12×500 字节、count 2–4、未知键丢弃、≥80 自动 `completedAt`、source wizard/agent/mixed）；DESIGN.md 恒含 `## Intake（需求访谈）`，仅 intake 保存会刷新自动生成的文档（brief 更新不会）。
- **接口与工具**：`GET /api/intake/questions`（6 组/16 问）；`POST /api/projects/:id/intake {intake}` → `{ok, intake, filled, missing}`；`POST /api/projects` 接受 `intake`；新工具 **`design_intake`**（问题清单 / 落盘两模式）；`design_projects get` 返回 `project.intake`；工具总数 11。
- **工作区**：需求 tab 增 intake 摘要卡（完整度 % + 分组标签 + 待追问 + 「补问 / 完善需求」预填向导）；FlowStepper 首段改名「开始」，未完成 intake 时点击重开向导。
- **文档**：新增 `docs/FLOW.md`（Claude Design 全流程逆向 + v1.3 流程设计 + 验收标准）；README/CHANGELOG/DESIGN 同步 1.3.0 并互链。

### 2. 构建与测试（v1.3.0 实测）

| 项 | 结果 |
|---|---|
| `build-client --check` | up to date（**8 fragments, 466,536 B**，client.js 8,135 行） |
| `node --check`（index / lib/** / client.js） | 0 错误 |
| `node --test test/unit/*.test.mjs` | **270 pass / 0 fail**（intake 8、client 38、bridge 38 等） |
| `node --test test/integration/browser+e2e` | **9 pass / 0 fail**（e2e `scores: a=96 b=50`） |
| 安装 | `remove_bundle` + `install_bundle` → applied，**version 1.3.0**，warnings 0 |
| 活体版本 | `GET /api/state` → `version:"1.3.0"` |
| 活体问题清单 | `GET /api/intake/questions` → 200，groups 6 / questions 16 |
| 活体 intake 写入 | `POST /api/projects/:id/intake` → 200，`filled` 13 项、`missing` 3 项 |
| 活体工具 | `design_intake({projectId, answers})` → ok，合并 3 项后 `source:"mixed"`、`score:100`、missing []；`design_projects set-brief` 200 |
| 活体全链路 | accept-panel：项目 `dsg-20261107-190944-5625`、质检 96 A（a96/b97/c96，9 截图）、预览 66,986 B 全 v2 标记、5 种导出 magic 全通过 |

### 3. 界面证据

- `_artifacts/design-studio/ui-v4/v13-wizard.png`：向导第 1/6 步（类型 chips、一句话目标、必答、委派按钮、进度条）——真实 Chromium 1440。
- `ui-v4/v13-overview.png`：总览主入口「开始一个新设计（6 步）」+「快速开始（一句话）」+ 首启引导。
- `ui-v4/v13-editor.png`：FlowStepper 首段「开始 ✓」、需求 tab intake 摘要（完整度 100% + 分组标签 + 补问 + 待追问）。
- `ui-v4/00-live-*.png`：真实桌面窗口状态（1.3.0 重载后），侧栏图标状态与窗口几何。

### 4. 本次限制

- 向导与 intake 卡为组件级 Chromium 渲染截图；活体 HTTP/工具链已逐项验证（上述），但"活体点击向导并粘贴"未执行（避免在用户当前窗口创建额外项目/切走会话）。
- 桌面窗口重载后 DSH 侧栏的「设计台」图标可见性回到默认隐藏（DSH 侧栏插件图标是用户级显示设置；可在侧栏「更多 → 设计台 → 显示」重新显示）——与本插件功能无关，已实测面板/路由/工具全部正常。
- 其余限制同 v1.2（剪贴板交接需一次 Ctrl+V、PPTX 结构校验、非 PNG 参考图、DOM 编辑、桌面 token 门禁）。

---

## 十三、GitHub 发布与 CI（v1.3.0，2026-11-08）

- 仓库：<https://github.com/YansongG-HKU/dsh-design-studio>（public，默认分支 `main`，MIT）。
- 首次推送：`27d3c1e`（81 files, 45,081 insertions）；随后修复 3 次 CI 暴露的问题：`7dd1819`、`37c695a`，并打 annotated tag `v1.3.0`。
- GitHub Actions（`.github/workflows/ci.yml`，ubuntu-latest + Node 22）三次运行：
  - `42407184989` **failure**：单元测试 2 处失败 —— `awaitJob` 的 `setInterval` 被 `unref()`（工具调用挂起时 Node 认为事件循环已空，Linux/Node 22 下 Promise 永不落地）；`writeScaffold` 在 POSIX 上把 `..\escape.html` 当合法文件名（反斜杠未归一化）。
  - `42407314709` **failure**：上述两项修复后单元测试全绿；集成测试断言写死 `chrome.exe`，在 Linux 的 `/usr/bin/google-chrome` 上失败。
  - `42407757887` **success**：所有步骤绿 —— client freshness、270 单元测试、9 集成测试（真实 Chrome，ubuntu）。
- 修复内容（均为真实缺陷，不只是 CI 适配）：
  - `awaitJob` 不再 unref 轮询定时器：`design_check` 在安静运行时不会再"Promise pending 但事件循环已空"。
  - `writeScaffold` 在所有平台把 `\` 视为路径分隔符：Windows 风格目录穿越在 POSIX 也会被拒绝。
  - `findBrowser` 增加 macOS/Linux 常见 Chrome/Chromium/Edge 路径（`/usr/bin/google-chrome`、`/snap/bin/chromium`、`/Applications/...` 等），仍支持 `DESIGN_STUDIO_BROWSER` 覆盖。
- 本地复核（Windows，Node 24.14.1）：`270/270` 单元、`9/9` 集成（browser 8 + e2e 1，`a=96 b=50`）、`client.js` freshness 通过。

### 可复现步骤

```bash
cd dsh-design-studio
npm run check            # node --check index.js + build-client --check（8 fragments, 466,536 B）
npm test                 # 270 unit tests
npm run test:integration # 9 integration tests（真实 Chrome；DESIGN_STUDIO_BROWSER 可指定路径）
```

CI 等价于依次执行以上三步（`.github/workflows/ci.yml` 中集成步骤动态解析 Chrome 路径）。
