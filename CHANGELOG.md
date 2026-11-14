# Changelog

本项目遵循语义化版本。所有对外接口（工具名、路由、数据目录结构、项目记录字段）在 1.x 内保持稳定。

## 1.3.2

对齐 DeepSeek Harness 0.2.2-rc.3：`engines.dsh` 提升至 `>=0.2.2-rc.3`，面板版本号同步为 `1.3.2`。业务工具/路由无变更。

### 验证

- 单元测试 271/271 通过；真实浏览器集成 10/10 不受影响。

## 1.3.1

发布工程与真实浏览器 e2e；修复 host 问题库与客户端答案键不一致造成的变体信息丢失。业务工具/路由无破坏性变更。

### 修复

- 开始向导在 host 问题库下丢失「变体维度 / 跨度」：`answersToIntake` / `answersFromIntake` 现在同时接受 `variationDimensions` / `variationRange`（host）与 `dimensions` / `range`（fallback 滑杆），跨度在中文选项、0–100 数值与 `basic/balanced/avant-garde` 之间归一；`toggle` / `toggles` 归一后去重，补问预填同时兼容两套问题 id。

### 新增

- `test/integration/wizard-handoff.test.mjs` + `test/fixtures/e2e/wizard-harness.html`：真实 Chrome 点击 6 步向导（shipped `client.js` 的真实状态机、真实问题库、真实 `POST /api/projects`），断言 clipboard === prompt、已确认信息 / 追问项 / 流程指令、`layout.selectPanel(null)`、toast 文案与 intake 持久化；随后从 prompt 解析 projectId（模拟粘贴交接），写入 `good.html` 三档变体并活体 `design_check`，断言 **96 / A**。
- `.github/workflows/release.yml`：tag 推送触发；`npm run check` → `npm test` → `npm run test:integration` → `scripts/verify-release.mjs` 产物校验 → 上传 `release-report.json` + `client.js`；任一步失败即阻断。
- `scripts/verify-release.mjs`：tag/版本/annotated/commit/main、生成物一致性、必需文件、npm pack 内容、密钥扫描等 13 项检查，输出机器可读报告。
- `docs/RELEASE-v1.3.0.md`：v1.3.0 GitHub Release notes（三个真实缺陷修复、CI 记录、可复现步骤；不发布 npm）。

### 验证

- 单元测试 **271/271**；真实浏览器集成 **10/10**（含新 e2e，三变体 96 / A）。
- release verifier 对 `v1.3.1` 本地运行 13/13；GitHub Release workflow 在 tag 上复跑同一门禁。
## 1.3.0

开始 / 提问：对齐 Claude Design 的入口流程。v1.3 在总览加入 6 步开始向导，把答案写进结构化 intake；agent 新增 `design_intake`，新/含糊请求先问 ≤8 个问题再 `design_start`。规格见 `docs/FLOW.md`。

### 新增：6 步开始向导

- 总览首屏新增「开始一个新设计（6 步）」入口，同时保留「快速开始（一句话）」文本卡。
- 六步：做什么 / 给谁看、在哪用 / 语境从哪来 / 变体与探索 / Tweaks 与内容 / 交付与成功标准；顶部显示「第 n / 6 步」与进度条。
- 每步可点「不知道，让 Claude 决定」把该步必答项交给 agent 追问（写入 `openQuestions`）；有未答项时显示「n 项未答」，全部答完或委派后才能完成；Esc / 点遮罩关闭。
- 问题来源优先 `GET /api/intake/questions`（6 组共 16 个问题、7 个必答）；宿主未就绪时使用内置 6 步 fallback，并在向导里提示。
- 完成方式：「创建并去对话」→ 创建项目（`brief` + `intake`）→ 生成开始 prompt → 复制 → toast → 切回对话；「只建项目」→ 创建后直接进工作区。补问模式按现有 intake 预填，增量保存后可直接交接或仅保存。
- 工作区「需求」tab 新增「需求信息」卡：完整度百分比、分组标签、待 Claude 追问列表、「补问 / 完善需求」按钮（重开向导并预填）。
- FlowStepper 首段由「需求」改为「开始」；intake 未完成时点击「开始」打开向导，已完成则进「需求」tab。阶段完成条件加入 `intake.completedAt`。
- 开始 prompt 固定为「已确认信息」清单 + 最多 8 条未确认问题 + 工具链指令（`design_start`（带 intake）→ `design_context` → a/b/c 三档 → `design_check` ≥90 → `design_export`）。

### 新增：intake 数据模型与接口

- `project.json` 新增可选 `intake`（`kind` / `goal` / `audience` / `contextSources` / `references` / `brandConstraints` / `variations{count,dimensions,range}` / `tweaks` / `contentMust` / `contentAvoid` / `deliverables` / `responsive` / `success` / `openQuestions` / `completedAt` / `source`）。所有字段可选；文本截断、数组去重限量、未知键丢弃；旧项目无 intake 照常工作。
- 服务端 `normalizeIntake` / `mergeIntake` / `intakeCompleteness` / `intakeSummary`；完整度按 16 个问题加权（必答双权重），达到 80% 自动写 `completedAt`。
- 新增 `GET /api/intake/questions` → `{groups, questions}`（向导与 agent 共用同一份问题清单）。
- `POST /api/projects` 接受可选 `intake`；brief 缺失时从 intake 回填 goal / audience / constraints / content。
- 新增 `POST /api/projects/:id/intake`：请求体 `{intake}` 增量合并（局部更新保留已有答案），响应 `{ok, intake, filled, missing}`；`source` 标记 `wizard | agent | mixed`。
- `system/DESIGN.md` 新增「Intake（需求访谈）」段；intake 变更会刷新自动生成的 DESIGN.md，不覆盖手改过的文档；`design_projects get` 返回 intake。

### 新增：agent 提问策略

- 新增 `design_intake` 工具：不带 `projectId` 返回 6 组问题清单与 `howTo`；带 `projectId` + `answers` 增量保存并返回 `intake` / `filled` / `missing` / `score` / 下一步建议。
- `design_start` 接受可选 `intake`，返回 `intakeScore`；创建时把 intake 摘要写进 `system/DESIGN.md`。
- 系统提示新增「开始方式」：新/含糊设计请求先按问题清单问 ≤8 个关键问题（语境 / 受众 / 变体 / Tweaks / 偏好 / 交付 / 成功标准），用户已给全才跳过；设计必须扎根真实语境，不从零 mock；先给 placeholder 再迭代；始终 3 档变体 + 质检 ≥90 再导出。
- agent 工具总数 10 → 11。

### 更新：文档

- README 新增「开始：6 步开始向导 / 提问（v1.3）」；v1.2 的「需求在哪里发」保留为历史说明并标注首段改名。
- `docs/FLOW.md` 作为 Claude Design 流程逆向与 v1.3 验收依据；`docs/DESIGN.md` 新增「开始向导、intake 与 agent 提问」章节。

### 测试

- 新增 intake 规范化 / 合并 / 完整度 / 问题清单、向导 reducer 与校验、答案到 brief/intake 的映射、开始 prompt、FlowStepper 首段、`design_intake` 两种模式、`/intake` 路由与 DESIGN.md intake 段用例；v1.1/v1.2 回归保持全绿。
- 冻结验证：单元测试 **270/270** 全绿（`intake.test.mjs` 8、`client.test.mjs` 38、`bridge.test.mjs` 38），真实浏览器集成 **9/9**（浏览器 8 + e2e 1，e2e 分数 a=96 b=50）；`node scripts/build-client.mjs --check` 通过（8 个片段，`client.js` 466,536 B）；活体安装 version `1.3.0`（`application: applied`，warnings 0），`GET /api/state` version `1.3.0`、`GET /api/intake/questions` 返回 6 组 / 16 问，活体检查 96 A。

## 1.2.0

需求动线：把「我在哪里发需求？」这个信息架构问题做成显式流程。对话仍是需求入口，面板是设计工作台；v1.2 在面板内提供「写下需求 → 复制 → 切回对话」的统一交接，并把当前阶段与下一步直接展示出来。规格见 `docs/UX-MAP.md`。

### 新增：需求动线

- **总览需求输入卡**：类型 chips + 需求文本域（必填）+ 可选「受众」「约束」。「保存并去对话」用 `POST /api/projects` 创建项目并把需求写入 brief（`goal` = 需求正文，`audience` / `constraints` 一并带入，`layout` / `content` 留空，默认播种脚手架），随后生成结构化 prompt → 复制 → toast → 切回对话；「只建项目」创建后直接进入工作区。需求为空时提示并聚焦输入框。
- **左栏「需求」tab**（进入工作区默认打开）：brief 五个字段（goal / audience / layout / content / constraints）内联编辑 + 「保存需求」；「继续提需求」文本域带上下文 chips（当前变体、选中元素、未解决评论数、未修复问题数）；「复制给 Claude 并去对话」会先保存 dirty 的 brief，再复制「项目 + 上下文 + 需求 + 工具链指令」并切回对话（`Cmd/Ctrl+Enter` 同效）；「只保存到需求」把这段需求追加到 `goal` 并保存，留在面板提示「已写入需求」。
- **TopBar 常驻「回到对话」**：调用 `layout.selectPanel(null)` 切回 Conversation 并 toast「已回到对话」；不复制内容。宿主没有布局服务时提示手动切回。
- **FlowStepper**：顶栏下方 28px 阶段条 `需求 → 语境 → 变体 → 迭代 → 质检 → 导出`；已完成阶段打勾、当前阶段高亮、右侧显示「下一步：X · 提示」、全部完成显示「已完成」。判定：brief 有任一字段 → 有 system 或 context → 变体数 > 1 → 有 latestCheck 或评论或版本 → bestScore ≥ 90 → exports > 0。点击直达：需求/语境 → 左栏对应 tab；变体 → 变体 tab + 画布；迭代 → 评论 tab + 画布；质检 → 右栏检查；导出 → 右栏导出。FlowStepper 不是 F6 焦点区域（F6 仍为六个区域）。
- **快捷交接（统一 HandoffToClaude：复制 → toast → 切回对话）**：检查 tab「让 Claude 修复这些问题」（findings 序列化为修复指令）、评论 tab「复制为 Claude 指令」（未解决评论序列化，没有未解决评论时只提示不复制）、空态「让 Claude 生成三档变体 / 补语境」；总览示例卡与首启引导的「回到对话」只切不复制。失败兜底：缺内容提示「先写一句需求再复制」、剪贴板不可用提示「复制失败」、无布局服务时仍复制并提示手动切回。
- **首启引导卡**：第一次打开面板的总览页显示三步引导（对话说需求 → 面板看变体改画布 → 质检 ≥90 再导出），按钮「回到对话 / 写需求 / 知道了」+ 关闭；关闭后写入 `localStorage` 的 `dsh-design-studio.onboarded`，不再自动出现。
- 空态补齐：无项目（需求输入卡 + 示例）、无变体（「让 Claude 生成三档变体」+ 复制指令）、语境为空（「让 Claude 补语境」）、未选中元素、桥未就绪。

### 新增：接口与持久化

- 新增 `POST /api/projects/:id/brief`：请求体 `{brief:{goal,audience,layout,content,constraints}}`，响应 `{ok:true, brief}`（持久化后的完整 brief）。
- 服务端 `service.updateBrief` + `mergeBriefPatch`：只接受五个字段，未知键丢弃；提交的字段必须是字符串，trim 后每字段上限 2000 字节（UTF-8）；未提交字段保留原值；非法输入抛 `invalid_input` + repair，项目不存在抛 `not_found`。
- 总览需求卡使用创建接口携带 brief（`POST /api/projects`），「需求」tab 使用 `/brief` 增量合并；agent 侧 `design_projects action:"set-brief"` 复用同一服务方法。`design_start` 创建时仍可直接带 brief。
- 创建项目时生成的 `system/DESIGN.md` 使用当时的 brief；之后更新 brief 不会自动重写 DESIGN.md（agent 可再调 `design_system`）。

### 更新：文档

- README 顶部新增「需求在哪里发？（先看这里）」：两种表面职责、总览需求卡、需求 tab、回到对话、FlowStepper、快捷交接与首启引导。
- `docs/UX-MAP.md` 作为功能 / 流程 / 界面信息架构的单一参考；`docs/DESIGN.md` 新增「需求动线与交接架构」章节（HandoffToClaude、brief 持久化、FlowStepper 推导、onboarding 记忆）。

### 测试

- 单元测试 **246/246** 全绿（`client` 30、`bridge` 38，含 v1.2 的 brief 合并与字段上限、`/brief` 路由、三种 handoff prompt 生成器、FlowStepper 推导、handoffPlan 降级、onboarding 记忆用例）；真实浏览器集成 **8/8**、e2e **1/1**。
- `node scripts/build-client.mjs --check` 通过，7 个客户端片段拼出的 `client.js` 为 410,984 B。

## 1.1.0

UI v2：面板重构为 Claude Design / Figma 级的编辑器信息架构。v1 的 10 个工具、全部 HTTP 路由、项目存储与画布桥 v1 消息语义保持不变；新增的是编辑器外壳、图层树、画布直接操作、属性分组、命令面板与主题。规格见 `docs/UI-V2.md`。

### 新增：编辑器外壳

- 六个编辑区域：TopBar（返回 / 项目名点击改名 / 状态 chip / 分数 chip / 画布·画板视图 / 检查 / 导出 / 更多菜单 / 语言 / 帮助）、ToolBar、左栏、画布、右栏、状态栏。
- `F6` / `Shift+F6` 在六个区域间循环焦点；`Cmd/Ctrl+\` 开关右侧属性面板；工具栏同时提供左右栏开关。
- 左右栏可拖宽、可收起：左栏默认 248px（196–420）、右栏默认 296px（240–480），5px 拖拽热区，双击分隔线复位；状态持久化在 `localStorage` 的 `dsh-design-studio.layout`。
- 响应式：≤ 1100px 右栏变抽屉，≤ 900px 左栏变抽屉，≤ 768px 顶栏变 48px、工具栏换行、画布全宽；抽屉带遮罩。
- 状态栏：选中路径（多选计数）、矩形尺寸、视口、缩放、保存态、桥状态、最近检查分数、拖拽 dx/dy、操作提示。

### 新增：左栏

- 变体 tab：A/B/C 卡（字母块、标签、文件名 + 字节数、该变体分数），点击切换画布变体。
- 图层 tab：DOM 图层树——搜索、节点计数、刷新、缩进、展开折叠、tag 图标、class 摘要、可见性眼睛；hover 联动画布描边，点击选中，选中行高亮并自动展开祖先；键盘 ↑/↓ 移动、→ 展开/进入、← 折叠/回父级、Enter/Space 选中；空态提示「点击画布元素或运行检查」。
- 语境 tab：URL / 路径 / 图片 / 文字四种导入（`Cmd/Ctrl+Enter` 提交）+ 已导入证据卡。
- 评论 tab：未解决数/总数、仅看未解决与全部切换、复制为 Claude 指令、进入评论模式；每条带变体 chip、选择器跳转、回复与解决。

### 新增：画布与直接操作

- 上/左 20px 标尺（100px 刻度），8px 网格、12 列参考线、对齐参考线可独立开关；覆盖层在 `[data-ds-overlay]` 内，序列化时剔除。对齐参考线在拖拽时按父容器左/中/右、上/中/下 ±4px 显示，仅作视觉提示，不自动吸附。
- 缩放 15%–200%：工具栏 − / 百分比输入 / + / 适应 / 1:1 / 适应选中（`zoom-to`）；空格 + 拖拽平移。
- 选择：单击、Shift 多选、空白处拖拽 ≥ 8px 框选（相交的可见元素，≤ 50 个）、Escape 清空。
- 拖拽移动：≥ 3px 触发，`position:relative` + `left/top` 位移，实时 dx/dy；一次拖拽 = 一条撤销历史；Alt 拖动复制。
- 8 向缩放：桥在选区内绘制 8 个 8px 把手（`data-ds-handle`，可点击）；四角保持宽高比，边把手 + Shift 保持比例，Alt 从中心，最小 8px；一次调整 = 一条历史。
- 六向对齐父级：`transform: translate()` 对齐父容器；元素已有 transform 时退化为相对 `left/top` 偏移，不覆盖原有变换，可撤销。
- 元素操作：复制、删除、上移、下移、选中父级、选中首子级、显隐切换（inline `display:none`，记入历史）。
- 浮动选择工具条：选中即出现，显示当前尺寸；父级、复制、删除、上移下移、编辑文字、六向对齐、复制 CSS。
- 方向键微移 1px / Shift 10px（画布聚焦时）；双击文本进入编辑，Enter 提交、Escape 退出。
- 画板视图：每个变体一个 1440×900 的懒加载 iframe，0.35 缩放并排，标签显示字母 / 名称 / 分数 / 宽度，点击进入该变体画布视图。
- 评论钉：画布内按评论记录绘制编号钉，点击跳转评论与元素；评论输入卡直接提交。

### 新增：右栏属性分组

- 元素卡（tag / class / 文本预览 / breadcrumb / 复制选择器 / 复制 CSS / 编辑文字 / 复制 / 删除）。
- 可折叠分组：对齐；位置与尺寸（X/Y 只读，W/H 可编辑）；文字（字体 / 字重 / 字号 / 行高 / 字距 / 对齐 / 颜色 + 对比度徽标 / 重置）；背景（颜色）；布局（display / margin 四边 + link / padding 四边 + link / gap）；边框（宽 / 样式 / 色 / 圆角）；效果（opacity / 阴影 none·soft·raised / filter）；内容（编辑文字 / 复制 / 删除 / 复制 CSS）。
- Tweaks tab 按值类型渲染（boolean 开关、color 取色器 + 文本、number 滑杆 + 数字、string 输入），实时应用并写回 `EDITMODE` JSON，展示原始 JSON 与复制；空态给出 `EDITMODE` 片段示例。
- 检查 tab：分数环、等级、轮次、变体切换、分类条、视口条、按严重度分组的 findings（fix + 选择器跳转）、截图缩略图灯箱、重跑（dirty 时先自动保存）。
- 导出 tab：5 张导出卡 + 当前结果下载 + 最近 12 条记录；设计系统 tab：色板 / 字体 / 尺度 / 布局分区 + system 分数 chip + URL/路径导入 + tokens JSON 编辑 + `DESIGN.md`；版本 tab：标签保存 + 时间线 + 恢复确认。

### 新增：命令面板、主题与快捷键

- `⌘K` / `Ctrl+K` 命令面板：45 个动作、9 个分组（文件 / 视图 / 缩放 / 工具 / 面板 / 检查 / 导出 / 主题 / 帮助），模糊搜索，↑/↓ 选择、Enter 执行、Esc 关闭。
- `?` 快捷键总表，4 组：文件与编辑 / 工具 / 视图 / 选择与图层。
- 主题三态「跟随系统 / 浅色 / 深色」，选择写入 `localStorage` 的 `dsh-design-studio.theme`；跟随系统同时读取 `prefers-color-scheme` 与宿主 `data-theme` / `data-ds-dark-theme`。深色：工作台 `#141416`、面板 `#1b1b1e`、边框 `#2a2a2e`、文字 `#e9e6df`，强调色不变。
- 快捷键：`⌘S` 保存、`⌘Z`/`⇧⌘Z` 撤销重做、`⌘K` 命令、`⌘\` 检查器、`E`/`C` 选择/评论、`1/2/3` 变体、`0`/`+`/`-` 缩放、`⌘D` 复制元素、`Delete` 删除、`G`/`R` 网格/标尺、`?` 帮助、`F6`/`⇧F6` 区域、`Space`+拖拽平移。
- 工具提示 hover 延迟 300ms、键盘聚焦立即显示；toast 3.4s 自动消失；coarse pointer 下按钮目标 ≥ 44px；加载骨架 / 空态 / 错误态 / 运行中进度 / 破坏性操作确认齐全。

### 新增：画布桥协议 v2（增量）

- parent → iframe：`outline`、`hover`、`select-many`、`op`（duplicate / delete / up / down / parent / first / editable）、`visibility`、`align`（left / center / right / top / middle / bottom）、`style`（`patch` 别名）、`overlay`（rulers / grid / columns / guides）、`zoom-to`，以及可选的 `comment-pins`（下发编号钉坐标，桥内绘制）。
- iframe → parent：`outline`（tree + count）、`selected-many`（与 `selected` 并行发送）、`selection-geometry`（rect / parentRect / handles）、`drag-state`（on / dx / dy）、`changed`（op / style / drag / resize / align / visibility / text）、`editable-state`、`comment-rect`。
- 速率与限制：outline ≤ 400 节点、深度 ≤ 10，节流 150ms；选区几何在滚动 / 缩放 / resize 后节流 50ms 重发；历史上限 100 步；序列化剔除 overlay、桥脚本、`contenteditable`、临时 `will-change` 与所有 `data-ds-*` 覆盖层节点，保留实际样式改动。
- v1 兼容：ready 消息不变；客户端在 ready 后 1.8s 内收到任一 v2 消息即视为 v2，否则降级——图层树显示解释性空态，标尺/网格/参考线按钮禁用并标注「画布桥 v1」，其余功能照常。

### 测试

- 单元测试 237/237 全绿（`bridge` 38、`client` 24）；真实浏览器集成 8/8；e2e 1/1。
- client bundle：`client.js` 370,312 B，由 7 个片段（00-head / 01-overview / 02-canvas / 03-left-rail / 04-inspector / 05-shell / 06-apply）经 `scripts/build-client.mjs` 拼接。
- 新增纯函数测试：图层树展平 / 搜索、对比度、对齐数学、命令面板过滤、主题解析。
- bridge 测试覆盖 v2 全部新消息、拖拽 / 缩放 / 对齐历史与序列化保真。

## 1.0.0

首个正式版本。Claude Design 级别的设计工作流在 DeepSeek Harness 原生化：真实 HTML 画布、真实浏览器质检、可交接的代码产物。

### 新增：Agent 工具（10 个）

- `design_start` — 创建项目（名称 / kind / brief / 视口），按 kind 播种起始脚手架到 `design/a.html`。
- `design_context` — 从 URL、代码库、图片或文字采集设计语境；可选直接采纳为项目设计系统。
- `design_system` — 读取或写入 `system/tokens.json` 与一页 `system/DESIGN.md`。
- `design_scaffold` — 取用或写入 10 个自包含起始模板之一。
- `design_check` — 真实无头浏览器逐视口截图 + 计算样式提取，输出评分、等级、分类与可执行 findings。
- `design_tweak` — 读写页面 `EDITMODE` JSON，不重新生成页面即可调参。
- `design_comments` — 列出与解决画布内联评论。
- `design_export` — HTML / ZIP / PDF / PNG / PPTX。
- `design_projects` — 列表、详情、删除、保存版本、版本列表、恢复版本。
- `design_serve` — 返回变体的可打开预览地址。

### 新增：画布与面板

- 侧边栏「设计台」入口与主区面板：项目列表、新建项目、变体标签页（A/B/C，含各自评分）。
- 画布 iframe 真实渲染 `design/*.html`，桥接协议支持选中、悬停、评论、直接改样式、双击改文字、撤销/重做、序列化回写。
- 视口切换、缩放与适应、设备框、保存（含历史快照）、检查轮询、导出、版本、在浏览器中打开。
- 检查器六个标签页：属性、Tweaks、检查结果（分数环 / 分类条 / 逐视口 / findings / 截图灯箱）、导出、设计系统、评论、版本。
- Tweaks 控件按值类型渲染（color / range-number / switch / text），80ms debounce 实时下发并原子写回。
- 响应式布局（1440 / 1024 / 768，≤900 收右侧抽屉），跟随 DSH 主题，所有状态（空 / 加载 / 错误 / 运行中）均有设计。
- 画布快捷键：F6、Cmd/Ctrl+S、Cmd/Ctrl+Z、Escape、1/2/3、E、C、0、+/−。

### 新增：无头浏览器引擎与质检

- 本机 Chrome/Edge 自动发现（`DESIGN_STUDIO_BROWSER` 可覆盖），CDP + WebSocket 连接、持久浏览器池与空闲释放。
- `probeDesign`：逐视口导航、等待网络稳定、整页截图（高度上限）、计算样式与文本采样、控制台/失败请求健康信息；deck 支持逐屏截图与逐屏指标。
- `auditDesign`：a11y / type / layout / system / slop 五类规则；critical −30、high −15、medium −7、low −3，每类上限 10 条；类别加权平均，≥90 为 A、≥80 B、≥70 C、≥60 D。
- 设计系统 token 采集：URL 计算样式、仓库扫描（CSS/JS/Tailwind）、图片调色板、手写 JSON；`compareToSystem` 计算用色/字体/字号/圆角/间距偏差。
- 真实浏览器 QA：多视口截图、对比度、触控目标、横向溢出、标题层级、AI-slop 黑名单。

### 新增：导出

- HTML 单变体复制；ZIP 打包（`design/` + `system/` + 摘要 + README，`node:zlib`，无依赖）。
- PDF 经 CDP `Page.printToPDF`（printBackground + preferCSSPageSize），配合脚手架的 `@page` 输出 deck 每屏一页 / A3 / A4。
- PNG 整页截图。
- PPTX 最小合法 OOXML（deck 每屏一页 16:9，否则每视口一页），内嵌 PNG。
- 导出文件写入 `exports/`，文件名稳定，受大小上限约束。

### 新增：项目存储

- `<DSH_HOME>/design-studio/projects/<id>/`：`project.json`（原子替换）、`design/`、`system/`、`context/`、`checks/round-<n>/`、`exports/`、`versions/`、`history/`、`comments.json`。
- 变体由 `design/*.html` 排序发现；面板保存前写历史快照（每文件 20 份、总计 40 份）；显式版本可保存与恢复。
- 项目记录 schemaVersion 1，`draft → designed → checked → ready` 状态机，`bestScore ≥ 90` 视为 ready。
- 路径限制、原子 JSON 写、损坏记录跳过不崩溃、单项目写序列化。

### 新增：起始脚手架（10 个）

- `browser` 编辑式落地页（响应 1440/768/375）、`ios` 393×852 应用屏、`android` 412×915 Material 3 应用屏、`macos` 桌面窗口、`deck` 16:9 幻灯片（`data-screen-label`、键盘、localStorage、每屏一页打印）、`canvas` 多方案画布、`tweaks` 调参样板、`anim` 动效时间轴、`poster` A3 海报、`doc` A4 单页文档。
- 全部单文件、零外部请求、原创视觉方向、真实排版节奏与 WCAG-AA 对比度；统一携带 `TWEAK_DEFAULTS`（3–6 键）、`window.__dsApplyTweaks` 与先监听后通告的编辑模式协议。
- 真实浏览器质检自测：10 个脚手架在各自目标视口下评分 96.6–100（A）。

### 新增：资源与文档

- 中英文 locale（`meta.title` / `meta.description` / `panel.label`）。
- 24×24 原创插件图标（画板 + 叠放变体卡 + 钢笔尖，currentColor + 暖色强调）。
- README（能力对照、安装、agent 工作流、面板指南、工具表、token schema、评分口径、导出、目录布局、测试、限制、归属）、`docs/DESIGN.md` 工程设计记录、MIT LICENSE。

### 测试

- `test/unit/scaffolds.test.mjs`：内容契约、脚手架结构、编辑模式协议、写入器行为、locale/icon/LICENSE 与文档资源。
- 其余 owner 的单元测试与真实浏览器集成测试（`test/integration/`）随各自模块交付；`npm test` 需要全部模块就绪。

### 已知限制

- 质检与 PDF/PNG/PPTX 导出需要本机 Chrome 或 Edge；无浏览器时返回 `no_browser` 结构化错误。
- PPTX 为图片型幻灯片，不是可编辑文本框。
- 无 Figma 式对象模型、无多人协作、无云端同步、无 Google Slides API。
- 脚手架内容为虚构示例，交付前替换为真实品牌与数据。
