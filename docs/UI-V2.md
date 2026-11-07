# 设计台 UI v2 — Claude Design 逆向 + 成熟设计工具 IA 重构规格

> 依据：Claude Design 系统提示词泄漏全文（CL4R1T4S / Tencent Cloud 转载）、Anthropic 帮助中心（键盘与屏幕阅读器、Claude Design 指南、设计系统设置）、Claude Design 产品页、v0 Design mode 文档、Figma/Framer/Canva 编辑器界面资料。
> 目标：把「设计台」从"能用的面板"提升为 **Claude Design / Figma 级别的编辑器 IA**——区域划分、图层、属性面板、浮动选择工具条、画板视图、标尺参考线、命令面板、深浅色主题，全部落到实处并通过活体验收。

---

## 一、逆向结论：Claude Design 的界面是怎么组织的

### 1. 区域模型（官方键盘文档反推）

Claude Design 的编辑器分为明确的**区域（areas）**，用 `F6` / `Shift+F6` 循环：

1. **顶部栏（top bar）**：面板头部按钮（Comment、Close、More comment options 等）。
2. **画布（canvas）**：一块"画板"（artboard）的画布，每块画板包含图层（文本、形状、图片），图层可再嵌套（group / 容器）。
3. **属性面板（properties panel）**：`Cmd+\` 开关；关闭时，选中对象上方出现**浮动工具条（floating toolbar）**，同样可被 F6 聚焦。
4. **图层列表（layer list）**：位于属性面板内；方向键在行间移动，→ 展开进入，← 折叠退出，Return/Space 在画布上选中，文本图层再按 Return 进入编辑。

对象层级模型（官方原文）：`objects on a slide are inside the slide, layers are inside an artboard, and a group has its own objects inside it`。键盘语义固定：Tab 到画板标题、Return 进入、Tab/Shift+Tab 同级移动、Shift+Return 上升一级、Escape 逐级退出。

**对我们的映射**：我们的画布是真实 HTML iframe，画板=变体（a.html/b.html/c.html），图层=DOM 树，group=容器元素，text box=可编辑文本节点。F6 区域循环、Return 进入图层、Escape 逐级退出、属性面板开关、浮动工具条全部可一一对应实现。

### 2. 交互能力（产品页 + 键盘文档）

- **直接操作**：在画布上拖动、缩放、对齐元素；选中后用箭头键移动（1px / Shift 10px）；自由图层与行列网格图层移动语义不同。
- **内联评论**：Comment 按钮带未解决数量（"3 open comments"）；开启后逐个画板/对象 Tab 选择、Return 打开输入框；评论有作者名标记（marker），marker 只在评论模式显示；"Send to Claude" 复选框决定评论是否也发给模型；"Show all comments" 汇总列表；可回复、编辑（Cmd+Return 保存）。
- **文本编辑**：Return 进入文本框编辑，Escape 结束。
- **复制/删除/组合**：Cmd+D 复制、Delete 删除、Cmd+G 组合、Shift+H/V 翻转、Cmd+Z 撤销。
- **颜色选择器带对比度反馈**：选择文字颜色时，取色器直接告诉"与背景对比度好/差"。
- **设计系统**：以 artifact 形式打开，"左侧分节列表 + 右侧内容"，Return 进入分节，Cmd+F6 在列表与内容间切换。

### 3. 工作流与内容规则（系统提示词提炼，影响 UI 信息架构）

- 流程：**问问题 → 读设计系统/UI kit → 输出假设+上下文+设计推理 → 先给 placeholder 尽早展示 → 迭代 → done（载入检查 console）→ fork_verifier_agent（后台截图/布局/JS 检查）→ 极简总结**。
- **变体优先**：3+ 变体跨维度（视觉/交互/配色/布局/字体），基础→前卫；"单个主文件 + Tweaks 切换"优于多文件。
- **Tweaks**：工具栏开关；页面内自绘 Tweaks 面板；先注册监听再 announce；EDITMODE JSON 持久化。
- **预览内元素引用**：`<mentioned-element>` 块含 `react:` / `dom:` / `id:`（运行时 `data-dm-ref="N"` 设计模式、`data-cc-id="cc-N"` 评论/文字编辑模式）；源码定位靠它；必要时 `eval_js_user_view` 探测。
- **固定尺寸内容**：1920×1080 stage + transform scale letterbox；deck 每屏 `data-screen-label`（1-indexed "01 Title"）；`design_canvas.jsx` 并排展示 2+ 静态方案。
- **启动组件**：deck_stage / design_canvas / ios·android frame / macos·browser window / animations。
- **内容铁律**：无填充内容、无数据拼盘、无 emoji、无左彩边框圆角卡、避免 Inter/Roboto/Arial/system-ui 门面；"一千次 no 换一次 yes"。

### 4. 成熟编辑器 IA（Figma / v0 / Framer / Canva）

一致的结构：**画布居中，左栏结构（页面/图层/资产），右栏属性（设计/原型/检查），顶部工具栏 + 文件菜单，底部缩放/状态**。

- **Figma**：顶部 move/frame/shape/pen/text/comment 工具条；左栏 Pages + Layers；右栏 Design（对齐、位置尺寸、约束、填充、描边、效果、导出）/ Prototype / Inspect 三 tab；画布标尺、智能参考线、多选、缩放控件。
- **v0 Design mode**（最接近我们的"真实 HTML 编辑"路线）：预览工具栏 Design Mode 按钮 → 旁边打开图层/选择/编辑面板；光标变选择工具，hover 高亮，点击选中出现 selection handles + 设计面板；`Cmd+I` 切换 Inspect；面板分组 **Typography / Color / Background / Layout / Border / Appearance / Shadow / Content**；改动是 pending edits（Undo/Redo/Reset/Before-After），点 **Apply** 才序列化进新版本；Tailwind-aware；支持自然语言指令 + 自动附带选中元素截图。
- **Framer**：左侧导航（Pages/Layers）+ 右侧 Properties/Effects，顶部 Insert/Design 模式切换。
- **Canva**：顶部工具条 + 左侧元素/上传/模板面板 + 右侧属性 + **选中后的浮动上下文工具条**。

**结论**：我们的 v2 必须同时具备 Figma 的**三栏结构 + 图层树 + 属性分组**、v0 的**pending edits/Apply 心智**、Claude Design 的**画板+浮动工具条+评论+设计系统分节**，并保留自己的优势：真实 HTML/CSS 源码、质检评分、导出。

---

## 二、现状与差距（v1 → v2）

| 维度 | v1 现状 | v2 目标 |
|---|---|---|
| 区域 | 顶部栏 + 工具栏 + 变体轨 + 检查器 tab + 状态栏 | 顶部栏 / 工具栏 / **左栏 tab（变体·图层·语境·评论）** / 画布 / **右栏可折叠属性区** / 状态栏；面板可拖宽、可收起、F6 循环 |
| 图层 | 无 | **DOM 图层树**：展开折叠、搜索、图标、选中/悬停双向联动、显隐、层级导航 |
| 选择 | 单击选中 + 检查器 | 单击 + **Shift 多选** + **浮动工具条**（父级/复制/删除/上移下移/编辑文字/对齐父级/复制 CSS）+ **拖拽移动** + **8 向缩放把手** + 标尺/参考线 |
| 属性 | 12 项平铺快捷样式 | **Figma/v0 式分组**：对齐 / 位置尺寸 / 文字（含对比度徽标）/ 背景 / 布局（四边 margin·padding + link）/ 边框 / 效果 / 内容；可折叠、可复位 |
| 画布 | 单变体 iframe + 浏览器框 + 缩放 | 加**画板视图**（多变体并排 artboard）、标尺、8px 网格 / 12 列参考线、缩放预设与空格拖拽平移、适应宽度/选中 |
| 评论 | 表单式列表 | 画布**编号钉** + 点击串线 + 列表（未解决优先）+ 回复/解决 + **「复制为 Claude 指令」** |
| 设计系统 | token 摘要 + JSON 编辑 | **分节式**：色彩（角色+复制）/ 字体样张 / 字号 / 间距 / 圆角 / 布局 / 组件说明；导入 URL/路径；覆盖率与最近一次 system 得分 |
| 版本 | 列表 | **时间线卡片** + 恢复确认 + 自动快照说明 |
| 命令/快捷键 | 帮助浮层 | **⌘K 命令面板** + `?` 快捷键总表 + 全部图标按钮 tooltip |
| 主题 | 跟随宿主（浅色为主） | **自动/浅/深** 三态切换并持久化；画布"工作台"底色与面板层级分明 |
| 状态栏 | 桥状态 + 已保存 | 选择路径 · 尺寸坐标 · 缩放 · 保存 · 桥 · 分数 chip · 操作提示 |
| 顶部栏 | 返回/名称/状态/刷新/语言/帮助 | 面包屑返回 · **可重命名** · 状态 chip · **分数 chip（点进检查）** · 视图切换(画布/画板) · 检查/导出/版本 · 更多菜单（打开目录/诊断/删除） |
| 视觉 | 已脱离 AI 味，但密度偏松 | Figma 级密度：11–12px 标签、28–32px 行高、1px 分隔、图标 14–16、分组间距 8/12、强调色克制、hover/active/focus 完整、骨架屏与空态 |

---

## 三、v2 布局规格（实现基准）

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ TopBar 52px: [←][设计台] 项目名(双击重命名) [已设计][96 A]   [画布|画板] [检查][导出][⋯] [中/EN][?] │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ToolBar 44px: [↖ 选择][💬 评论][◫ 检查器] │ [视口 1440▾][浏览器|手机][旋转] │ [− 100% +][适应][1:1] │ [标尺][网格][参考线] │ [↶][↷][保存] │
├────────────┬─────────────────────────────────────────────────────┬───────────────────┤
│ Left 248px │ Canvas desk                                          │ Right 296px        │
│ ┌ tabs ──┐ │  ┌ ruler-h ─────────────────────────────────────┐    │ ┌ tabs ─────────┐ │
│ │变体│图层│ │  │┌ artboard label A · 规范版 · 96 ────────────┐│    │ │属性│Tweaks│评论│ │
│ │语境│评论│ │  ││                                            ││    │ │检查│导出│系统│ │
│ └────────┘ │  ││        iframe (device frame)                ││    │ │版本│           │ │
│ 变体列表    │  ││                                            ││    │ └───────────────┘ │
│ 图层树      │  │└────────────────────────────────────────────┘│    │ 可折叠分组       │
│ 语境卡      │  └──────────────────────────────────────────────┘    │ 对齐/位置/文字…  │
│ 评论列表    │  [floating selection toolbar above selection]        │                   │
│             │  [zoom controls bottom-right]                        │                   │
├────────────┴─────────────────────────────────────────────────────┴───────────────────┤
│ StatusBar 26px: 选择: div.hero-grid > div · 541×200 · 1440×900 · 缩放 42% · 已保存 · 预览已就绪 · 提示   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- 左右栏之间为 1px 分隔线 + 4px 拖拽热区；宽度持久化（localStorage `dsh-design-studio.layout`），双击分隔线恢复默认。
- ≤1100px：右栏变抽屉（工具栏按钮开关）；≤900px：左栏变抽屉；≤768px：工具栏换行、画布全宽。
- 焦点顺序：TopBar → ToolBar → Left → Canvas → Right → Status（F6/Shift+F6 循环，带 2px 高亮描边）。

## 四、Bridge 协议 v2（在 CONTRACT §5 v1 基础上增量，v1 消息全部保留）

新增 parent→iframe：
```
{source:"ds-panel", type:"outline"}                       // -> {type:"outline", tree, count}
{source:"ds-panel", type:"hover", selector}               // 图层悬停，仅画描边不选中
{source:"ds-panel", type:"select-many", selectors:[...]}  // 多选
{source:"ds-panel", type:"mode", mode:"select"|"comment"|"off"}
{source:"ds-panel", type:"op", op:"duplicate"|"delete"|"up"|"down"|"parent"|"first", selector}
{source:"ds-panel", type:"op", op:"editable", selector}   // 进入文字编辑
{source:"ds-panel", type:"visibility", selector, visible:boolean}
{source:"ds-panel", type:"align", selector, edge:"left"|"center"|"right"|"top"|"middle"|"bottom"}
{source:"ds-panel", type:"style", selector, styles:{...}}  // 同 patch，别名保留
{source:"ds-panel", type:"overlay", rulers:boolean, grid:8|0, columns:12|0, guides:boolean}
{source:"ds-panel", type:"zoom-to", selector}
```
新增 iframe→parent：
```
{source:"ds-canvas", type:"outline", tree:[node], count}
node = {id, tag, selector, text, classes:[], idAttr, rect:{x,y,w,h}, visible, children:[node], depth}
{source:"ds-canvas", type:"selected-many", infos:[info]}
{source:"ds-canvas", type:"selection-geometry", rect, parentRect, handles:true}   // 拖拽/缩放把手位置
{source:"ds-canvas", type:"drag-state", on:boolean, dx, dy}
{source:"ds-canvas", type:"changed", reason:"op"|"style"|"drag"|"resize"|"align"|"visibility"|"text"}
{source:"ds-canvas", type:"editable-state", selector, editing:boolean}
{source:"ds-canvas", type:"comment-rect", selector, rect}   // 评论钉定位刷新
```
行为要求：
- **图层树**：outline 节流返回（≤400 节点、深度 ≤10、忽略 `<script>/<style>/<link>/meta` 与 bridge overlay），按 DOM 顺序；每个节点 selector 可反查；文本节点不单独成行（并入父节点 text 摘要）。`getBoundingClientRect` 提供给面板用于 hover 高亮位置。
- **多选**：Shift+点击切换加入/移出；框选（marquee）在 select 模式空白处拖拽 ≥8px 触发，选中与矩形相交的可交互元素（排除 bridge overlay）；Escape 清空。
- **拖拽移动**：在 select 模式下按住选中元素拖动 ≥3px → 用 `position:relative; left/top` 位移；显示实时 dx/dy 状态；保存进 undo 历史（一次拖拽=一条历史）；按住 Alt 复制拖动（duplicate 后跟随）。Escape 取消。
- **缩放把手**：选中后画 8 个把手（四角+四边），拖动修改 width/height（角把手按比例，Shift 保持比例，Alt 从中心）；最小 8px；undo 一条。
- **对齐父级**：用 `transform: translate(dx,dy)` 把元素可视矩形对齐父容器左/中/右/上/中/下；不改变布局流；undo 可逆；不写死 position。
- **元素操作**：duplicate = cloneNode(true) 插入原元素后；delete = remove + 历史保留；up/down = 同级 insertBefore；parent/first = 选中父级/首个子元素。
- **显隐**：`visibility` 设置 inline `display:none/''`，记历史；图层树更新 visible 状态。
- **覆盖层（overlay）**：桥内绘制标尺（上/左，随滚动与缩放）、8px 基线网格、12 列参考线（基于页面宽度百分比）、可选对齐参考线；全部在 `[data-ds-overlay]` 内，serialize 时剔除；关闭后不残留。
- **序列化**：必须剔除 overlay、bridge、contenteditable、以及拖拽/缩放留下的临时 `will-change`；保留实际样式改动。
- 所有新操作都要进 HISTORY，undo/redo 之后发 `changed`；`selection-geometry` 在滚动/缩放/窗口 resize 后重发（节流 50ms）。

## 五、面板行为细则

**TopBar**：返回、可双击改名（POST /rename，Enter 保存 Esc 取消）、状态 chip（草稿/已设计/已质检/可用）、分数 chip（点击跳检查 tab）、视图切换（画布 / 画板）、检查按钮、导出菜单、更多菜单（打开目录、诊断、删除项目、复制项目 id）、语言、帮助。
**ToolBar**：选择/评论工具（互斥，带 active 态）、检查器开关（`\`）、视口下拉（常见宽度 + 自定义输入 + 旋转）、设备框切换、缩放（− / 百分比可输入 / + / 适应 / 1:1 / 适应选中）、标尺/网格/参考线 toggle、撤销/重做（禁用态）、保存（dirty 时高亮 + `⌘S`）。
**Left**：
- 变体：A/B/C 卡（字母块、标签、分数、字节数、当前态），点击切换；「新变体」提示（复制/新建由 agent 或 scaffold 完成）。
- 图层：搜索框 + 树（缩进 12px/级、三角展开、tag 图标、class 摘要、眼睛按钮），hover 联动画布描边，点击选中；选中行高亮并自动展开祖先；空态提示"点击画布元素或运行检查"。
- 语境：导入 URL/路径/图片/文字四个小按钮 + 已导入证据卡。
- 评论：未解决优先列表 + 全部显示 toggle + 「复制为 Claude 指令」。
**Right**：tab 横向滚动（属性/Tweaks/评论/检查/导出/系统/版本），每组内容为可折叠 section：
- 属性：元素卡（tag、class、breadcrumb、复制选择器/复制 CSS）→ 对齐 → 位置尺寸（X/Y/W/H，只读值可编辑 W/H）→ 文字（字体下拉、字号、字重、行高、字距、对齐、颜色+对比度徽标）→ 背景 → 布局（display、margin/padding 四边+link、gap）→ 边框（宽/样式/色/圆角）→ 效果（opacity、shadow 预设、filter）→ 内容（编辑文字、复制元素、删除）。
- Tweaks：分型控件 + 实时应用 + 落盘 + 原始 JSON + 空态说明。
- 评论：编号钉列表、thread、回复、解决。
- 检查：分数环 + 等级 + 分类条 + 视口条 + 严重度分组 + 可点击选择器 + 截图灯箱 + 重跑 + 进度。
- 导出：5 卡 + 结果下载 + 历史。
- 系统：分节（色板/字体/字号/间距/圆角/布局）+ 编辑 JSON + 导入 + 覆盖率。
- 版本：时间线卡片 + 恢复确认 + 自动快照说明。
**画板视图**：水平滚动画布，所有变体以固定 1440 宽缩放 0.35 并排展示，顶部标签（A 规范版 · 96 · 1440），点击进入单变体并切到画布视图；F 键适应。
**命令面板**：⌘K / Ctrl+K，模糊搜索 40+ 动作，↑↓ 选择 Enter 执行 Esc 关闭。
**快捷键**：⌘S 保存、⌘Z 撤销、⇧⌘Z 重做、⌘K 命令、⌘\ 检查器、E 选择、C 评论、1/2/3 变体、0 适应、+/- 缩放、⌘D 复制元素、Delete 删除、G 网格、R 标尺、? 帮助、F6/⇧F6 区域。
**主题**：`auto|light|dark`，auto 读取 `prefers-color-scheme` 与宿主 `data-theme`；深色：画布工作台 #141416、面板 #1b1b1e、边框 #2a2a2e、文字 #e9e6df、强调色不变。
**提示**：所有图标按钮带 title + tooltip（300ms 延迟，键盘聚焦立即显示）；44px 触控目标用于 coarse pointer。
**状态**：加载骨架、错误态、空态、运行中；toast 2.5–4s；破坏性操作确认。

## 六、验收标准（v2）

1. `node --check`、`node scripts/build-client.mjs --check`、单元测试全绿（新增 layers 展平/对比度/对齐数学/命令面板过滤等纯函数测试），bridge 测试覆盖 v2 全部新消息。
2. 活体：`plugin_manager` 禁用→启用热重载后，面板新布局生效；画布握手就绪。
3. 同一真实项目（`dsg-20261107-173923-6775`）上：
   - 图层树出现在左侧"图层"tab，点节点选中画布元素、悬停出现描边；
   - 选中元素出现浮动工具条，可复制/删除/上移下移/编辑文字/对齐；
   - 拖拽移动与缩放把手可用，undo 恢复；
   - 标尺/8px 网格/12 列参考线可开关；
   - 画板视图展示 3 个变体并可进入；
   - ⌘K 命令面板可筛选并执行动作；
   - 浅/深主题切换完整；
   - 检查/评论/导出/版本/系统功能保持 v1 行为不回退。
4. 真机截图证据：总览、工作区（图层+浮动工具条+标尺）、画板视图、命令面板、深色主题，共 ≥5 张（`_artifacts/design-studio/ui-v2/`）。
5. 更新 `docs/VERIFICATION.md`、`README.md`、`CHANGELOG.md`、`docs/DESIGN.md` 到 v1.1.0（或 2.0.0），交付报告追加 v2 章节。

## 七、分工

| Owner | 范围 |
|---|---|
| host-core | `lib/bridge.js` v2（outline/hover/多选/拖拽/缩放/对齐/op/visibility/overlay/serialize 保真）+ `test/unit/bridge.test.mjs` 扩展；不改 v1 消息语义 |
| client-panel | `src/client/*` 全面重构：新壳层与布局、左栏 tabs、图层树、画布标尺/网格/画板视图、浮动工具条、拖拽缩放、属性分组、命令面板、快捷键总表、主题三态、状态栏、评论钉；`scripts/build-client.mjs` 保持；`test/unit/client.test.mjs` 扩展 |
| content-display | `README.md` / `CHANGELOG.md` / `docs/DESIGN.md` 更新 v2（含 UI 架构图与快捷键表）；`docs/VERIFICATION.md` 由 Lead 汇总 |
| Lead | 本规格、集成、安装热重载、真机截图与验收、交付报告 |
