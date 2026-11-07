# 工程设计记录 — dsh-design-studio「设计台」

本文记录实现的取舍与机制（含 v1.1.0 的 UI v2 编辑器架构、v1.2 的需求动线与 v1.3 的开始向导 / intake）：为什么画布是真实 HTML、桥接协议怎么工作、质检如何算分、导出如何保证一屏一页、项目数据如何落盘、安全边界画在哪、以及与 Claude Design 的对照和刻意差异。接口契约以 `CONTRACT.md` 为准，流程逆向与 v1.3 验收见 `docs/FLOW.md`，本文解释「为什么」。

## 1. 目标与边界

目标是让 DSH agent 具备 Claude Design 的完整工作流，而不是只产出「一张好看的图」：

1. **先语境后设计**：设计系统 / 参考站点 / 代码库 / 图片先被采集为 token 与证据。
2. **三档变体**：A 规范、B 进阶、C 前卫，同一项目内并排比较。
3. **画布可编辑**：用户能在面板里选中、改样式、改文字、留评论、调 Tweaks。
4. **质检可复核**：每轮检查来自真实无头浏览器的渲染与计算样式，而不是模型自评。
5. **交接即代码**：每个变体都是自包含 HTML，导出成 HTML / ZIP / PDF / PNG / PPTX。

不做的：Figma 式对象模型与自由图层拖拽、多人实时协作、云端账号体系、远程渲染服务。这些取舍来自「DSH 是本地 agent 环境」这一前提。

## 2. 为什么画布是真实 HTML

**决定**：`design/<variant>.html` 就是最终产物；画布 iframe 直接渲染它，面板编辑直接改 DOM，保存时把序列化后的 HTML 写回文件。

理由：

- **零转换损耗**。如果先建模再导出，必然存在「模型能力 ⊂ HTML」的取舍；真实 DOM 没有这个上限，一切 CSS 都能用。
- **质检对象 = 交付对象**。无头浏览器打开的就是用户画布里的同一份 HTML，截图、计算样式、对比度、触控尺寸的测量结果无需再映射回模型。
- **交接成本为零**。agent 交付路径就是一个文件；ZIP 里也是这些文件。用户双击即可打开，不依赖本插件。
- **编辑可以是增量的**。面板的 `patch` 消息只改选中元素的 inline style，`serialize` 时才整体回写；撤销/重做只需重放编辑历史（cap 100），不需要 diff 引擎。

代价：没有语义对象模型、画板对象与约束求解。v1.1.0 的 DOM 图层树补上了结构导航与直接操作，但没有改变这个取舍。对「生成—评审—交接」工作流影响很小，对「从零手工绘制」影响很大——这是我们明确放弃的使用场景。

编辑器三层：**属性面板快速改样式**（低风险、可撤销）→ **双击改文字**（contenteditable，提交时发 `text-edited`）→ **直接编辑 HTML**（agent 工具或用户在项目文件夹里改代码）。越靠后能力越强、风险越高。

## 3. 架构总览

```text
Host 插件（index.js）
├─ lib/store.js      项目磁盘存储：路径限制、原子写、写序列化
├─ lib/jobs.js       单进程任务器：一项目一任务，180s 超时，可取消
├─ lib/service.js    编排层：项目 / 系统 / 变体 / 检查 / 导出 / 评论 / 版本 / Tweaks
├─ lib/tools.js      11 个 agent 工具定义（outcome-first 描述 + repair）
├─ lib/panel.js      loopback 路由（前缀 /dsh-design-studio）+ 请求头闸门
├─ lib/preview.js    无 webServer 时的 loopback 静态预览服务器
├─ lib/bridge.js     注入预览页的画布桥（<script data-ds-bridge>）
└─ 无头引擎（lib/browser.js / cdp.js / ws.js / probe.js / tokens.js / audit.js / export.js / zip.js / pptx.js）

Client 插件（client.js，由 src/client/*.js 拼接）
└─ 侧边栏入口 + 主区面板：项目列表 / 画布 / 检查器 / 评论 / Tweaks / 导出 / 版本
```

- Host 插件 `inject=['tools']`，`webServer` 可选；无 webServer 时用自带 loopback 预览服务器。
- 一个共享浏览器池（空闲 90s 释放），探针、截图与导出复用同一浏览器。
- 所有对外副作用（浏览器、审计规则、导出、token 扫描、脚手架、预览）都通过 `deps` 可注入，单测不需要真浏览器。

## 4. 画布桥协议

预览页 `/preview/:id/v/:variant` 由 `lib/bridge.js` 注入一段 `<script data-ds-bridge>`。所有消息都带 `source`：

- 页面 → 面板（`source:"ds-canvas"`）：`ready`、`selected`、`hover`、`comment-request`、`dom`、`saved-state`、`tweaks`、`text-edited`、`mode`、`error`。
- 面板 → 页面（`source:"ds-panel"`）：`mode`、`select`、`patch`、`patch-many`、`undo`/`redo`、`serialize`、`tweak`、`scroll-to`、`reload`、`edit-mode`。

约束与实现细节：

- **不信任 origin 通配**：校验 `event.source === window.parent`，可用时再校验 `event.origin`；发消息时传已知 origin。
- **稳定选择器**：优先 `#id`；否则 tag + 最多两个唯一 class + `:nth-of-type(n)` 链，最多 8 段，保证在页面内唯一。评论、选择与 `patch` 都靠它定位。
- **序列化**：`serialize` 时移除桥脚本、overlay、comment pin、`contenteditable` 属性，恢复临时样式后返回 `document.documentElement.outerHTML`（带 doctype），保证保存的 HTML 与交付物一致。
- **模式隔离**：`off` 模式除 ready/tweaks/dom 外不挂任何监听，不改变页面视觉；`select` 模式才画 hover 轮廓；`comment` 模式点击发评论请求。
- **编辑历史**：桥内保存样式/文本编辑操作栈（cap 100），`undo`/`redo` 重放；保存时父面板拿到干净 DOM。
- 桥的注入大小有预算：`BRIDGE_MAX_BYTES` 64 KiB（v2 预算），当前实际注入 45,856 B；嵌入失败不影响页面本身。

### 4.1 协议 v2 增量（v1.1.0）

v2 在 CONTRACT §5 的 v1 消息之上做增量，不改变 v1 语义。`ready` 消息保持原字段（`variant` / `screens` / `tweaksAvailable` / `tweaks` / `url`），没有版本号字段；客户端在收到 ready 后 1.8s 内收到任一 v2 消息即判定画布支持 v2，否则降级为 v1 行为（图层树空态、覆盖层按钮禁用、状态栏与画布提示）。

**parent → iframe**

| type | 载荷 | 作用 |
|---|---|---|
| `outline` | — | 请求图层树 |
| `hover` | `selector` | 图层列表悬停，只画描边不选中 |
| `select-many` | `selectors[]` | 多选 |
| `op` | `{op, selector}` | `duplicate` / `delete` / `up` / `down` / `parent` / `first` / `editable` |
| `visibility` | `{selector, visible}` | inline `display` 显隐 |
| `align` | `{selector, edge}` | `left` / `center` / `right` / `top` / `middle` / `bottom` 对齐父级 |
| `style` | `{selector, styles}` | `patch` 的别名 |
| `overlay` | `{rulers, grid, columns, guides}` | 标尺 / 8px 网格 / 12 列参考线 / 对齐参考线开关 |
| `zoom-to` | `selector` | 滚动到元素并在面板侧缩放 |
| `comment-pins` | `pins:[{number, selector}]` | 可选增量：桥在页面内绘制编号评论钉；面板当前按评论 rect 自行绘制钉，这条消息保留给桥内渲染/降级路径 |

**iframe → parent**

| type | 载荷 | 作用 |
|---|---|---|
| `outline` | `{tree, count}` | 图层树 + 节点数 |
| `selected-many` | `{infos}` | 多选信息（始终与 `selected` 并行发送） |
| `selection-geometry` | `{rect, parentRect, handles}` | 选区几何与把手可用状态 |
| `drag-state` | `{on, dx, dy}` | 拖拽实时位移 |
| `changed` | `{reason}` | `op` / `style` / `drag` / `resize` / `align` / `visibility` / `text` |
| `editable-state` | `{selector, editing}` | 文字编辑进入 / 退出 |
| `comment-rect` | `{selector, rect}` | 评论钉定位刷新 |

行为约束（全部可在 `lib/bridge.js` 中核对）：

- **outline**：限制 ≤ 400 节点、深度 ≤ 10；忽略 `script` / `style` / `link` / `meta` / `noscript` / `template` / `head` / `title` / `br` 与桥覆盖层；节点按文档顺序，字段为 `{id, tag, selector, text, classes, idAttr, rect, visible, depth, children}`，文本合并进父节点摘要；`changed` 后 150ms 节流重发。
- **selection-geometry**：滚动、缩放、窗口 resize 与拖拽/缩放过程中以 50ms 节流重发；`handles` 仅在单选与 select 模式为真。
- **8 个缩放手柄**：由桥绘制在页面覆盖层中（`data-ds-handle`，8px 方块，`pointer-events:auto`），不进入页面 HTML；`serialize` 时连同覆盖层一起剔除。
- **历史**：每次结构或样式操作 push 一条记录，历史上限 100；undo/redo 后重发 `changed`、选区与几何，保证面板状态跟上。
- **序列化**：克隆 `documentElement`，移除桥脚本、`[data-ds-overlay]`、`contenteditable` 属性、临时 `will-change`，以及 `data-ds-marquee` / `data-ds-guide` / `data-ds-handle` / `data-ds-pin` / `data-ds-ruler` / `data-ds-grid` / `data-ds-columns` 节点，保留实际样式改动，返回带 doctype 的 HTML。
- **v1 兼容**：v1 的 `ready` / `selected` / `hover` / `comment-request` / `dom` / `saved-state` / `tweaks` / `text-edited` / `mode` / `error` 与 `patch` / `patch-many` / `undo` / `redo` / `serialize` / `tweak` / `scroll-to` / `reload` / `edit-mode` 语义不变；`style` 是 `patch` 的别名，旧面板仍可用 `patch`。

## 5. UI v2 编辑器架构

v1.0.0 的面板是「检查器 + 工具栏」；v1.1.0 把它重构成编辑器 IA：三栏布局、区域焦点模型、DOM 图层树、画布直接操作、属性分组、命令面板与主题三态。设计依据是 Claude Design 的区域键盘文档、Figma 的三栏 / 图层 / 属性分组、v0 的真实 DOM 编辑路线。实现不引入对象模型，所有状态仍以 `design/*.html` 为唯一事实来源。

### 5.1 区域模型

| 区域 | 高度 / 默认宽度 | 内容 |
|---|---|---|
| TopBar | 52px（≤768px 时 48px） | 返回、品牌、项目名（点击改名，Enter 保存 / Esc 取消）、状态 chip、分数 chip、画布/画板切换、回到对话、检查、导出菜单、更多菜单、语言、帮助 |
| ToolBar | 最小 44px | 选择/评论工具、左右栏开关、视口下拉 + 自定义宽度、浏览器/手机设备框、旋转、缩放控制、标尺/网格/12 列/对齐参考线、撤销/重做、保存 |
| 左栏 | 默认 248px（196–420） | 需求（默认打开；含 intake 摘要卡与「补问」）/ 变体 / 图层 / 语境 / 评论 |
| 画布 | 自适应 | iframe + 可选设备框、标尺与覆盖层、浮动工具条、8 向把手、评论钉、评论输入卡 |
| 右栏 | 默认 296px（240–480） | 属性 / Tweaks / 评论 / 检查 / 导出 / 设计系统 / 版本 |
| 状态栏 | 26px | 选中路径、尺寸、视口、缩放、保存态、桥状态、分数、拖拽 dx/dy、提示 |

- **焦点模型**：`F6` 前进、`Shift+F6` 后退，顺序固定为 TopBar → ToolBar → 左栏 → 画布 → 右栏 → 状态栏；每个区域容器 `tabIndex=-1`，聚焦时画 2px 描边。这是 Claude Design 键盘模型在 Web 面板上的直接映射，也是不让鼠标成为唯一入口的最低成本。
- **可调宽**：左右栏可拖拽调整并收起，分隔条 5px 宽（视觉 1px 高亮），双击恢复默认宽度；宽度与收起态 250ms debounce 写入 `localStorage` 的 `dsh-design-studio.layout`，非法值经 `normalizeLayout` 夹到合法范围。
- **抽屉**：≤ 1100px 右栏变抽屉、≤ 900px 左栏变抽屉、≤ 768px 顶栏 48px + 工具栏换行 + 画布全宽。抽屉打开时有遮罩，Esc 关闭；只改变层叠与可见性，不改变 DOM 顺序，保证 F6 顺序稳定。
- **v1.2 增量**：TopBar 下方插入 28px 的 FlowStepper 阶段条（在 ToolBar 之前，不属于 F6 区域）；左栏第一个 tab 变为「需求」并默认打开；TopBar 增加「回到对话」。六个 F6 焦点区域与顺序不变（见 §13）。
- **v1.3 增量**：FlowStepper 首段改名「开始」（完成条件加入 `intake.completedAt`）；总览以 6 步开始向导为主入口；「需求」tab 顶部加 intake 摘要卡与「补问」。区域数量与 F6 顺序仍不变（见 §14）。

### 5.2 图层树：从真实 DOM 推导

- 桥的 `outline` 在 iframe 内 DFS 真实 DOM，按文档顺序返回节点；文本不单独成行，合并进父节点 `text` 摘要（80 字符）。
- 限制：≤ 400 节点、深度 ≤ 10；每个节点 `selector` 都可在页面内反查，因此「面板点击 → `select`」「画布 hover → 面板行高亮」「眼睛按钮 → `visibility`」都复用同一套选择器。
- 更新策略：会改变结构或可见性的操作由桥发 `changed`，面板 160ms 后请求新 outline；纯样式改动只刷新属性面板，不重建树。搜索在客户端 `flattenLayers` 里过滤，不重新请求。
- 键盘：↑/↓ 移动焦点、→ 展开或进入第一个子级、← 折叠或回到父级、Enter/Space 把节点选中到画布；选中行自动展开祖先。
- v1 降级：收不到 outline 时图层 tab 显示「图层树需要 bridge v2（outline 消息）」的解释性空态，不伪造数据。
- 为什么不做对象模型：树与 DOM 不会出现「两份状态不一致」；用户用面板改、agent 用文本编辑器改的是同一份东西。代价是没有图层命名、组件实例、约束与自动布局——这些需要模型，而模型会与 HTML 事实源冲突，明确不在 v2 范围。

### 5.3 选择与直接操作的安全模型

选择：

- 单击 / Shift 点击多选 / 空白处拖拽框选（≥ 8px，与矩形相交的可见元素，最多 50 个）/ Escape 清空。
- 选区信息走 `selected-many`（与 `selected` 并行），几何单独走 `selection-geometry`（rect + parentRect + handles）；滚动、缩放、窗口 resize 后 50ms 节流重发，保证浮动工具条与把手不漂移。
- 8 个缩放手柄由桥绘制在覆盖层中（`data-ds-handle`，8px 方块，`pointer-events:auto`），面板不复制渲染；覆盖层节点不会进入保存文件。

移动、缩放与对齐：

- 拖拽 ≥ 3px 才触发，用 `position:relative; left/top` 位移而不是 `transform`：不改布局流，元素仍参与文档排版，序列化后就是普通 CSS；拖动中写临时 `will-change: left, top`，结束后移除。Alt 拖动先克隆再拖，撤销时整条移除。
- 缩放：8 个把手改 inline `width/height`；四角始终按原宽高比，边把手按住 Shift 才保持比例；Alt 从中心缩放（同时改相对 `left/top`）；最小 8px；拖动中写临时 `will-change: width, height`，结束后移除。
- 对齐父级：用 `transform: translate(dx,dy)` 对齐父容器可视矩形；如果元素自身（或设计）已经带 transform，则不覆盖它，退化为相对 `left/top` 偏移。这样既能对齐，也不会破坏设计里原有的变换与动画。
- 每次手势（一次拖拽 / 一次缩放 / 一次对齐）只记一条历史；取消手势时恢复手势前的内联样式。

叠加与覆盖层：

- 对齐参考线在拖拽时绘制：元素左/中/右与父容器左/中/右、元素上/中/下与父容器上/中/下相差 ±4px 时画线；**只是视觉提示，不做吸附**。
- 标尺、8px 网格、12 列参考线、悬停框、选区框、评论钉、框选框全部画在 `[data-ds-overlay]` 内，`renderOverlay` 每次重绘；关闭模式或覆盖层时清空，序列化时剔除。

结构与显隐：

- `duplicate` 用 `cloneNode(true)` 插入原元素之后；`delete` 移除元素并把被删节点留在历史里供撤销；`up` / `down` 用同级 `insertBefore`；`parent` / `first` 只移动选择；`visibility` 写 inline `display:none` 或清空。
- 文字编辑是 `contenteditable`，提交时移除属性并记历史；`editable-state` 通知面板进入/退出编辑。
- 这些操作只改预览 DOM，不落盘；保存时由 serialize 输出干净 HTML。

这样设计的三个理由：

1. **保真**：交付物和画布里的 DOM 是同一份，没有「导出时重建」的转换层。
2. **可逆**：直接操作只产生 inline style 或 DOM 结构变化，桥历史（上限 100）可整体回放；保存前的错误不会污染磁盘。
3. **有边界**：不做对象模型与约束求解，避免「编辑器里对齐了但 HTML 里没有」的隐性状态。局限是不做自动吸附 / 智能参考线（参考线是人工对齐用的可视化），也不支持组件复用与自动布局。

### 5.4 主题与密度

- 三态「跟随系统 / 浅色 / 深色」，选择写入 `localStorage` 的 `dsh-design-studio.theme`；`auto` 同时读取 `prefers-color-scheme` 与宿主注入的 `data-theme` / `data-ds-dark-theme`（MutationObserver 监听变化）。
- 深色不是简单反色：工作台 `#141416`、面板 `#1b1b1e`、边框 `#2a2a2e`、文字 `#e9e6df`，强调色保持暖色不换。语言、主题与布局都是本地偏好，不写项目文件。
- 面板颜色通过语义变量映射宿主 token（`--dsw-alias-*`）并提供本地兜底值，换主题不需要重写组件样式。
- 密度按 Figma 级：11–12px 标签、26px 行高、1px 分隔线、13–15px 图标；tooltip hover 延迟 300ms、键盘聚焦立即显示；toast 3.4s 自动消失；coarse pointer 下按钮目标 ≥ 44px。

### 5.5 Pending-edit / Apply 心智

- 编辑**即时生效**：`patch` / `style` / 拖拽 / 缩放 / 对齐直接改 iframe DOM，视觉立刻可见；桥的 `saved-state` 报告 dirty 与编辑次数（来自历史栈），面板据此刻画保存按钮的可用/高亮状态。
- **保存是应用边界**：点保存（或 `⌘S`）时面板请求 `serialize`，把干净 HTML POST 到 `/save`，服务端写文件并保存一条 history 快照；随后面板清理 dirty、刷新项目详情。没有 v0 式独立的 Apply 按钮——画布本身就承载真实 DOM，「应用到版本」和「保存文件」是同一件事。
- **检查会先保存（面板路径）**：面板的检查/重跑在 dirty 时通过 `serialize` 静默保存再启动质检，保证评分针对磁盘上的版本。agent 的 `design_check` 直接读 `design/*.html`，本来就不存在「画布未保存」状态。
- **导出不自动保存**：面板导出读磁盘文件，不读 iframe 内存状态；所以正确顺序是「保存 → 导出」。这是与检查路径的刻意差异，文档、提示与验收都按此执行。
- 结果：刷新或关闭 iframe 会丢弃未保存的编辑（磁盘仍是上一次保存）；agent 读写的是磁盘文件，所以面板刷新后看到的是已保存版本。验收与测试都以保存后的 HTML 为准。

### 5.6 画板、命令面板与状态栏

- 画板视图：每个变体一个 1440×900 的懒加载 iframe，按 0.35 缩放并排；标签显示字母 / 名称 / 当前变体分数 / 宽度（`1440 · 96`）；点击进入该变体的画布视图并切回「画布」。没有独立的「适应画板」快捷键，适应由缩放控件承担。
- 命令面板：`⌘K` / `Ctrl+K` 打开，动作由面板内注册的 45 条命令组成，分 9 组（文件 / 视图 / 缩放 / 工具 / 面板 / 检查 / 导出 / 主题 / 帮助）；`filterCommands` 对标题 + 关键词做包含/前缀评分，↑↓ 选择、Enter 执行、Esc 关闭，输入框自动聚焦。
- 快捷键总表：`?` 打开，分 4 组（文件与编辑 / 工具 / 视图 / 选择与图层），内容与全局快捷键一致。
- 状态栏：选中路径（多选计数）、矩形尺寸、视口、缩放、保存态（已保存 / 有未保存修改）、桥状态 chip、最近检查分数与等级、拖拽 dx/dy、当前工具提示；窄屏隐藏次要项。

### 5.7 客户端分层

`src/client/` 按职责拆成 8 个片段，由 `scripts/build-client.mjs` 按文件名顺序拼成单个 `client.js`（浏览器模块表里 `require('react')`；v1.3 冻结版 466,536 B）：

| 片段 | 职责 |
|---|---|
| `00-head.js` | loader 包装、react require、常量、i18n 字典、样式、图标、纯 helper（图层 / 对比度 / 对齐 / 命令过滤 / 主题 / intake 规范化 / 向导 reducer / prompt 生成） |
| `01-overview.js` | 总览：开始向导入口、快速开始需求卡、示例、5 步流程说明、项目列表 |
| `02-canvas.js` | 桥握手 + v2 消息、画布、设备框、缩放平移、评论钉、浮动工具条、画板视图 |
| `03-left-rail.js` | 左栏五个 tab：需求（intake 摘要 + brief + 继续提需求）、变体、图层、语境、评论 |
| `04-inspector.js` | 右栏七个 tab：属性分组、Tweaks、评论、检查、导出、设计系统、版本 |
| `05-shell.js` | 编辑器外壳：顶栏、工具栏、FlowStepper、三栏布局与抽屉、状态栏、命令面板、快捷键总表、主题菜单、全局快捷键 |
| `06-wizard.js` | v1.3 6 步开始 / 补问向导（问题渲染、委派、校验、完成交接） |
| `07-apply.js` | 面板根：语言、主题、路由（总览 ↔ 编辑器）、数据流、intake / 向导状态、桥事件接线、注册 |

## 6. Tweaks 编辑模式

页面内固定协议（CONTRACT §6）：

```html
<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{ "accentColor": "#b4552f", "baseSize": 17, "rules": true }/*EDITMODE-END*/;
</script>
```

- Host 的 `readTweak` 解析两个标记之间的 JSON；`patchTweak` 只替换这段子串，保留已有键顺序、新键追加、原子写。面板按值类型渲染控件：color → color input，number → range/number，boolean → switch，string → 文本输入。
- 页面必须实现 `window.__dsApplyTweaks = (edits) => {...}`，把键映射到 CSS 变量 / body class。没有 hook 的页面在 patch 后由父面板 reload。
- **协议顺序**：先 `window.addEventListener('message', ...)`，再向 `window.parent.postMessage({type:'__edit_mode_available'})`。否则 activate 可能先到，toggle 静默失效。所有 10 个脚手架都遵守这个顺序。
- 页面自己控件改动时发 partial `{type:'__edit_mode_set_keys', edits:{key:value}}` → 桥转发 `tweaks` → 面板持久化（debounce 80ms）。面板下发时桥先调 `__dsApplyTweaks`，再回退到通用映射（`primaryColor→--primary`、`fontSize→--font-size`、`radius→--radius`、`dark→body class`）。
- 10 个脚手架都带 3–6 个有意义的键，且至少覆盖 string / number / boolean 三种类型。

## 7. 质检模型

### 数据来源

`probeDesign` 在真实浏览器里逐视口导航、等待网络稳定、整页截图（高度上限 12000），并在页面内提取：颜色与背景、字体家族/字重/字号、行高、间距、圆角、元素统计、文本节点样本（含对比度）、小字与触控目标、横向溢出、标题顺序、渐变色、可检测 slop 命中、以及渲染健康（控制台错误、失败请求）。

deck 特殊路径：页面含 `[data-screen-label]` 时切 1920×1080，逐屏滚动截图并只算该屏指标；导出 PPTX 复用这批截图。

### 规则与权重

五类规则：`a11y`、`type`、`layout`、`system`（仅当存在 token 系统）、`slop`。无系统时权重 a11y .35 / type .20 / layout .20 / slop .25；有系统时 a11y .30 / type .15 / layout .20 / system .20 / slop .15。

评分数学：

```text
deduction(category) = Σ min(count, 10) 条 finding 的 severity 权重（critical 30 / high 15 / medium 7 / low 3）
category.score = max(0, 100 − deduction)
overall = Σ category.score × weight / Σ weight
grade: ≥90 A, ≥80 B, ≥70 C, ≥60 D, else F
pass = overall ≥ 90
```

- 每条 finding 都带 `code`、`severity`、`message`、具体 `fix` 句子，能定位时带 `selector` / `value`。
- 同一 finding 在不同视口/屏幕出现，会进入对应视口的 findings 列表；deck 每屏单独评分后取平均。
- 正文打小是 type 类里最容易踩的：实现用「按字符数加权的中位数」判断正文主字号，避免少量小标签把结论带偏——但也会对「大量 14px 长文案」如实扣分。脚手架自测时就是按这条规则把次要长文案提到 16px 的。
- 移动端判定：`mobile` kind 在所有宽度使用 14px 正文 / 44px 触控阈值；web 在宽度 ≤ 480 时用手机阈值；deck 用 24px 且不查触控。

### 设计系统一致性

`compareToSystem(usage, tokens)` 把实际用色/字体/字号/圆角/间距和 token 比较，输出各维度的偏差列表与得分；`system` 分类把主要违规逐条转成 finding，并给出「改哪个值」的修复建议。这使「沿用设计系统」不是口头承诺，而是可量化的检查项。

## 8. 导出管线

| 类型 | 机制 | 关键点 |
|---|---|---|
| html | 复制 `design/<variant>.html` | 自包含假设（脚手架与规则都要求零外部请求）；复制前不做改写 |
| zip | `lib/zip.js` 用 `node:zlib` deflate 手写中央目录 | 条目：`design/*`、`system/*`、项目摘要 JSON、`README.txt` |
| pdf | CDP `Page.printToPDF`（printBackground、preferCSSPageSize） | 页面自己声明 `@page`；deck 每屏一页、poster A3、doc A4 |
| png | CDP 整页截图 | 取首个视口，高度受 `maxPageHeight` 限制 |
| pptx | `lib/pptx.js` 生成最小合法 OOXML | `[Content_Types].xml`、`_rels/.rels`、`ppt/presentation.xml` + rels、slideMaster/theme/slideLayout、逐页 slide、`media/*.png`；16:9 画布，每屏一页 |

文件名 `design-<projectId>-<variant>-<kind>.<ext>`，写入 `exports/`，记录 bytes 与时间；超过 `maxExportBytes`（64 MB）拒绝。导出行为不依赖外部服务，全部在本机完成。

## 9. 项目存储布局

```text
<dataDir>/projects/<projectId>/
  project.json            schemaVersion 1，原子替换，updatedAt 每次写更新
  design/                 a.html b.html c.html assets/...
  system/tokens.json      token（可选）
  system/DESIGN.md        一页设计系统说明（可选）
  context/                evidence.json + 参考图片/片段
  checks/round-<n>/       check.json + capture-<width>.png + screen-<nn>.png
  exports/                design-<id>-<variant>-<kind>.<ext>
  versions/<v-n>/         design/ + system/ 快照
  history/<file>-<ts>.html 面板保存前的旧内容（每文件 20，总计 40）
  comments.json           评论数组（原子写）
```

- 变体不写进 `project.json`，由 `design/*.html` 排序发现 → 文件即事实来源，用户手改文件也能被识别。
- 每次面板保存先把旧文件复制进 `history/`，再原子写新内容。
- `writeFileAtomic` / `writeJsonAtomic` 都是临时文件 + rename；单项目写操作串行化，避免并发写坏文件。
- 项目记录损坏时跳过并上报，列表不因此崩溃。

## 10. 安全边界

插件只服务本机，边界分三层：

1. **网络**：面板路由只注册在 DSH 的 loopback webServer 上；页面请求要求 loopback Host 与匹配的 Origin；`/api/*` 还必须带 `x-dsh-design-studio: 1` 请求头（跨站表单/图片带不上自定义头），`/preview/*` 与 `<img>` 类路由只校验 loopback Host（iframe/img 无法带头）。没有本地服务以外的网络出口，抓取只访问用户显式给出的 URL。
2. **路径**：所有项目内路径都解析到项目根之内，拒绝绝对路径、`..` 与符号链接逃逸；文件路由走扩展名 allowlist。
3. **序列化内容**：预览注入的桥有大小上限；导出只写 `exports/`；`project.json` 等记录原子写；客户端所有文本来自 locale 字典，JSON 响应统一 `{ok}` 结构，错误走 `code + repair`，不把内部错误原文直接当 HTML 渲染。

私密性：项目数据全部在用户本机 `<DSH_HOME>/design-studio` 下，插件不上传任何内容。

## 11. 与 Claude Design / Figma / v0 的对照

| 能力 | Claude Design | Figma | v0 (Design mode) | 设计台 1.1.0 |
|---|---|---|---|---|
| 区域模型 + 区域键盘循环 | ✓（F6 / Shift+F6） | 部分 | 部分 | ✓（六区域，F6 / Shift+F6） |
| 画布对象 | 设计对象模型 | 对象模型 + 约束 | 真实 DOM | 真实 DOM（刻意不做对象模型） |
| 图层树 | ✓（属性面板内） | ✓（Layers） | 部分 | ✓（DOM outline，搜索 / 显隐 / 键盘） |
| 多选 / 框选 | ✓ | ✓ | 部分 | ✓（Shift 多选 + marquee） |
| 拖拽 / 缩放 / 对齐 | ✓ | ✓（约束 + 智能参考线） | 部分（改样式为主） | ✓（拖拽 / 8 向缩放 / 六向对齐；无自动吸附） |
| 属性面板分组 | ✓ | ✓（Design / Prototype / Inspect） | ✓（Typography / Color / Layout…） | ✓（8 组可折叠 + 元素卡） |
| 浮动工具条 | ✓（属性面板关闭时） | ✓（上下文工具条） | ✓ | ✓（选中即出现） |
| 多方案 / 画板并排 | ✓（design_canvas） | ✓（Frame 并排） | 部分 | ✓（画板视图，0.35 缩放并排） |
| 命令面板 | — | ✓（Quick actions） | — | ✓（⌘K，45 个动作 / 9 组） |
| 主题 | 跟随产品 | 部分（面板深浅） | — | ✓（auto / light / dark，持久化） |
| 内联评论 | ✓ | ✓ | — | ✓（编号钉 + 列表 + 复制为 Claude 指令） |
| 设计系统 | ✓ | 部分（styles / components） | 部分 | ✓（token + 一致性检查） |
| Pending edits / Apply | — | — | ✓（Apply 后落版本） | 即时预览 + 保存（无独立 Apply） |
| 导出 | ✓（Slides / PDF / 图 / 代码） | ✓ | 部分 | ✓（HTML / ZIP / PDF / PNG / PPTX） |
| 代码交接 | 导出代码 | 部分（Dev Mode / Inspect） | ✓ | ✓✓（产物即自包含 HTML） |
| 对象模型 / 约束 / 组件实例 | — | ✓ | — | ✗（有意不做） |
| 多人协作 / 云端 | ✓ | ✓ | 部分 | ✗（单机、本地文件） |

刻意的差异：

1. **真实 DOM 优先**：画布与交付物是同一份 HTML。代价是没有对象模型、约束求解与组件实例；收益是无导出损耗、可以直接把文件交给下一位工程师。
2. **即时预览 + 保存，而不是显式 Apply**：v0 用 Apply 把 pending edits 变成新版本；我们让编辑立刻作用于 iframe DOM，`⌘S` 时序列化落盘并写历史快照。保存边界就是应用边界（见 §5.5）。检查在 dirty 时会先自动保存；导出读磁盘文件，不自动保存，因此正确顺序是「保存 → 导出」。
3. **图层树是结构树，不是语义树**：节点是 DOM 元素，不是「按钮 / 卡片 / 文本样式」这类设计语义；没有图层重命名与组件复用。
4. **参考线用于人工对齐**：标尺、8px 网格、12 列参考线与拖拽对齐参考线都是可视化；对齐参考线只在元素边缘与父容器对齐位相差 ±4px 时显示，不做落点吸附，也没有智能间距。
5. **单机单用户**：无账号、无云同步、无多人协作；数据只在 `<DSH_HOME>/design-studio`。
6. **PPTX 是图片型幻灯片**：本地生成最小 OOXML，不调用 Google Slides API，也不是可编辑文本框。

## 12. 测试策略

- **单元**：纯 Node，`node --test`。store / jobs / service（注入 fake deps）/ audit 规则与评分 / tokens 规范化 / zip / pptx / panel 路由 / bridge 序列化 / scaffolds 内容契约 / intake。v1.3 冻结验证：**单元总数 270/270 通过**（`client.test.mjs` 38、`bridge.test.mjs` 38、`intake.test.mjs` 8）。
- **集成**：真实 Chrome/Edge 跑 `probeDesign` → 截图与指标 → `auditDesign` → 导出链路；断言截图文件存在、zip/pptx 头合法、审计分数落在合理区间。测试 fixture 使用本地静态 HTML（含一个故意有缺陷的页面与一个高质量页面）。浏览器集成 **9/9 通过**（浏览器 8 + e2e 1，e2e 分数 a=96 b=50）。
- **构建检查**：`node scripts/build-client.mjs --check` 校验 8 个客户端片段与 `client.js`（466,536 B）一致。
- **内容自测**：10 个脚手架各自在目标视口下跑真实探针 + 审计，当前得分 96.6–100（A），保证「新建项目即得高分起点」，agent 不会从原型级 HTML 起步。
- **UI v2 纯函数与桥**：图层树展平 / 搜索、对比度计算、对齐数学、命令面板过滤、主题解析；`bridge` 测试覆盖 v2 新消息、拖拽 / 缩放 / 对齐的历史记录与序列化保真（剔除 overlay、`contenteditable`、临时 `will-change`）。
- **v1.2 需求动线**：`mergeBriefPatch` / `updateBrief` 的合并、上限与错误码，`POST /api/projects/:id/brief` 路由，三种 handoff prompt 生成器，`deriveFlow` 阶段推导，`handoffPlan` 降级与 onboarding 记忆；client 单测从 24 增至 30。
- **v1.3 开始 / intake**：intake 规范化 / 增量合并 / 完整度 / 问题清单（`intake.test.mjs`）；向导 reducer、逐步校验、委派与 openQuestions、答案到 brief / intake 的映射、开始 prompt、FlowStepper 首段（client）；`design_intake` 两种模式、`design_start({intake})`、`GET /api/intake/questions`、`POST /api/projects/:id/intake`、DESIGN.md 的 Intake 段（tools / panel / service）。
- **面板**：纯 helper 用 `__test__` 暴露做无头单测；交互部分靠手工/集成验证。

## 13. 需求动线与交接架构（v1.2）

v1.1 把面板做成了 Figma 级编辑器，但用户打开面板后的第一反应是「我在哪里发需求？」——这是信息架构问题，不是功能缺失。v1.2 的原则是：**对话是需求入口，面板是设计工作台**；任何「要对 Claude 说的话」在面板里都有统一的写下 → 复制 → 切回对话路径，任何「能在面板里做的事」都不要求回对话。完整的功能 / 流程 / 界面地图与验收清单见 [`docs/UX-MAP.md`](./UX-MAP.md)。

### 13.1 为什么对话与面板是两个表面

- DSH 的主区域一次只呈现一个表面：Conversation（对话）或插件面板。Claude Design 那种「对话 + artifact 并排」在 DSH 框架里做不到——这是框架差异，不是取舍。
- 面板是纯 UI 客户端：它不能调用 agent 工具，也不能把消息直接塞进模型上下文。真正能执行设计工作流（`design_start` / `design_check` / `design_export` …）的只有对话里的模型轮次。
- 所以交接必须是**显式、用户可控**的：面板把需求整理成一段可执行 prompt，复制到剪贴板，再切回对话由用户粘贴发送；不做隐藏的自动发送，也不伪造「已提交给模型」。
- 动线原则：需要自然语言的地方（新需求、结构调整、组件级反馈、质检修复）都提供 handoff；能直接操作的地方（样式、文字、拖拽、Tweaks、导出）都留在面板里。

### 13.2 HandoffToClaude：统一交接动作

面板内所有「要跟 Claude 说话」的入口复用同一个动作，实际顺序是 **复制 → toast → 切回对话**：

```text
HandoffToClaude({ prompt })
  1. navigator.clipboard.writeText(prompt)   // 复制可执行指令；失败则提示并中止
  2. toast("需求已复制，在对话输入框 Ctrl+V 粘贴发送")
  3. layout.selectPanel(null)                // 只在有对话布局服务时切回
```

- `prompt` 由纯函数从项目状态生成：`buildHandoffPrompt`（项目行 + 上下文行 + 需求正文 + 工具链指令）、`buildIssuesPrompt`（带 severity / code / message / fix / selector 的 findings，最多 30 条）、`buildCommentsPrompt`（未解决评论，最多 30 条，含变体、选择器、元素文本）；三者都以「改 `design/{variant}.html` → `design_check` 直到 ≥90 → `design_export`」收尾。
- 交接只负责「把话说清楚」，不负责执行：用户可以修改后再发送；agent 收到的是普通用户消息，走既有 11 个工具（v1.3 新增 `design_intake`）。
- 兜底行为：prompt 为空 → toast「先写一句需求再复制」，不复制；剪贴板不可用 → toast「复制失败，请手动选中文本复制」并中止；宿主没有 `layout.selectPanel` → 仍复制并 toast「未找到对话布局服务，请手动切回对话并粘贴」。面板不会静默丢内容，也不假装发送成功。
- TopBar 的「回到对话」是纯导航：调用 `selectPanel(null)` 后 toast「已回到对话」，不复制、不生成 prompt；没有布局服务时 toast 提示手动切回。

入口一览：

| 入口 | 行为 |
|---|---|
| 总览需求输入卡「保存并去对话」 | `POST /api/projects` 创建项目（brief 在创建请求里）→ 生成 prompt（变体 a、无选中/评论/问题）→ 复制 → toast → 切回对话 |
| 左栏「需求」tab「复制给 Claude 并去对话」 | 先保存 dirty 的 brief，再生成带上下文的 prompt → 复制 → toast → 切回对话；`Cmd/Ctrl+Enter` 同效 |
| 检查 tab「让 Claude 修复这些问题」 | 把本轮 findings 序列化为修复指令 → 复制 → toast → 切回对话 |
| 评论 tab「复制为 Claude 指令」 | 把未解决评论序列化为指令 → 复制 → toast → 切回对话；没有未解决评论时只 toast 提示 |
| 空态「让 Claude 生成三档变体 / 补语境」 | 按当前项目状态生成对应指令 → 复制 → toast → 切回对话 |
| TopBar「回到对话」 | 只切回 Conversation 并 toast，不复制、不生成 prompt |

### 13.3 brief 持久化与需求写入路径

- 路由：`POST /api/projects/:id/brief`，请求体是嵌套的 `{brief:{goal,audience,layout,content,constraints}}`，响应 `{ok:true, brief}`——`brief` 是持久化后的完整五字段对象。路由落在既有面板路由前缀、loopback 与请求头闸门内。
- 合并语义（`service.updateBrief` → `mergeBriefPatch`）：只接受五个字段，未知键丢弃；提交的字段必须是字符串，trim 后每字段截断到 2000 字节（UTF-8）；未提交字段保留当前值；`brief` 不是对象或字段非字符串抛 `invalid_input` + repair，项目不存在抛 `not_found`。更新只写 `project.json`，不动 `design/*.html`。
- 三条写入路径共享同一组字段：
  1. 总览需求输入卡：`POST /api/projects` 创建项目时直接携带 `brief`（`goal` = 需求正文，`audience` / `constraints` 带入，`layout` / `content` 为空），不再调 `/brief`；创建成功后生成 prompt 并 handoff；「只建项目」走同一创建接口但不 handoff，直接进入工作区。
  2. 左栏「需求」tab：编辑五个字段后 `POST /brief` 增量合并；「只保存到需求」把「继续提需求」文本追加到 `goal` 再保存，不切换面板；「复制给 Claude 并去对话」在 dirty 时先保存再 handoff。
  3. agent：`design_start` 创建时可带 brief；`design_projects action:"set-brief"` 走同一个 `service.updateBrief`。
- `system/DESIGN.md` 是创建项目时用当时的 brief 生成的；后续更新 brief 不会自动重写 DESIGN.md，需要时由 agent 调 `design_system`（v1.3 起 intake 变更会刷新自动生成的 DESIGN.md，见 §14.3）。
- brief 仍是五个自由文本字段，不新增结构化 schema。

### 13.4 FlowStepper：从项目状态推导阶段

- 位置与尺寸：TopBar 下方一条 28px 高的阶段条（在 ToolBar 之前），不属于六个 F6 焦点区域（F6 仍是顶栏 / 工具栏 / 左栏 / 画布 / 右栏 / 状态栏）。
- 阶段固定为 `需求 → 语境 → 变体 → 迭代 → 质检 → 导出`，由纯函数 `deriveFlow(detail)` 推导，不新增持久化字段。判定条件：
  - 需求：`brief` 任一字段非空（`briefIsFilled`）；
  - 语境：`project.system` 存在，或 `project.context` 非空；
  - 变体：`variants.length > 1`；
  - 迭代：存在 `latestCheck`，或评论非空，或版本非空；
  - 质检：`bestScore`（项目或最近检查）≥ 90；
  - 导出：`exports` 非空。

  第一个未完成的阶段是当前阶段，其后是「下一步」；全部完成显示「已完成」。阶段条只提示与提供捷径，不阻塞任何操作。
- 点击跳转：需求 / 语境 → 左栏对应 tab（移动端打开抽屉）；变体 → 变体 tab + 画布视图；迭代 → 评论 tab + 画布视图；质检 → 右栏检查 tab；导出 → 右栏导出 tab。
- 总览页另有一张 5 步流程说明（需求 / 语境 / 变体 / 质检 / 导出，不含迭代），与工作区的 6 阶段条不是同一个组件；≤ 768px 时阶段条隐藏标题与「下一步」文案，只保留阶段胶囊。v1.3 起首段改名「开始」并加入 intake 完成条件（见 §14.6）。

### 13.5 首启引导与记忆

- 第一次打开面板时，**总览页**顶部显示三步引导卡：① 在对话里说要做什么；② 面板看三档变体、直接改画布；③ 质检 ≥90 再导出。按钮为「回到对话 / 写需求 / 知道了」+ 右上角关闭，「写需求」把焦点移到总览需求输入框。
- 卡片只在总览页、且仅在首次（`readOnboarded()` 为 false）时显示；关闭或跳过调用 `markOnboarded()`，把 `true` 以 JSON 写入 `localStorage` 的 `dsh-design-studio.onboarded`，之后不再自动出现。它是本地偏好，不写项目文件。
- 无项目、无变体、语境为空、未选中元素、桥未就绪等空态继续保留各自的解释与下一步动作（需求输入卡 / 复制指令 / 重载预览 / 让 Claude 生成变体或补语境）。

### 13.6 与 Claude Design 的流程层差异

| 能力 | Claude Design | 设计台 v1.2 |
|---|---|---|
| 对话 + artifact 同屏 | 并排 | 主区域互斥；用「需求」tab + HandoffToClaude 把需求带回对话 |
| 评论回传模型 | Send to Claude 复选框 | agent 读 `design_comments`；「复制为 Claude 指令」生成指令 |
| 需求输入位置 | 对话 | 对话为主；面板总览需求卡与「需求」tab 是补充入口 |
| 阶段指引 | 无显式阶段条 | FlowStepper 按项目状态给出当前阶段与下一步 |

## 14. 开始向导、intake 与 agent 提问（v1.3）

v1.3 补的是 Claude Design 流程里最容易被忽略的一段：**开始与提问**。v1.2 的需求动线解决了「需求在哪里说」，但入口仍是开放文本——用户不知道该提供什么，agent 拿到一句话就开工。v1.3 用 6 步向导 + 结构化 intake + `design_intake` 工具，把「含糊需求 → 结构化语境 → 可执行开始 prompt」做成默认路径。流程逆向、与 Claude Design 的逐条对照和验收清单见 [`docs/FLOW.md`](./FLOW.md)。

### 14.1 为什么需要 intake

- 开放文本一句话 → agent 只能猜；brief 五个自由文本字段也承载不了「变体维度 / Tweaks 期望 / 成功标准」这类结构化选择。
- Claude Design 的做法是 questions_v2：新项目或需求含糊时先问（原文至少 10 个问题），小改动与跟进跳过；问题覆盖起点与语境、变体、Tweaks 期望、偏好（视觉 / 交互 / 想法）。
- v1.3 取精简版：面板 6 步向导把能点选的都点选掉；agent 侧再问 ≤8 个缺失项；已答信息写进 intake，agent 不重复问。
- 兼容优先：intake 全部字段可选，旧项目与只走 brief 的调用路径照常工作；brief 仍是交付主依据，intake 是它的结构化补充。

### 14.2 数据模型

- 位置：`project.json` 的可选 `intake`；`POST /api/projects` 创建时可带，`POST /api/projects/:id/intake` 增量写，`design_projects get` 返回。
- 字段（16 个持久化键，全部可选）：`kind`；`goal` / `audience` / `brandConstraints` / `contentMust` / `contentAvoid`；`contextSources`；`references`；`variations{count,dimensions,range}`；`tweaks`；`deliverables`；`responsive`；`success`；`openQuestions`；`completedAt`；`source`（`wizard | agent | mixed`）。
- 类型约束（`lib/intake.js`）：`kind` 限 `KINDS`；`contextSources` 限 `existing-design-system | url | repo | screenshots | none`；`variations.count` 取 2/3/4（默认 3）；`variations.dimensions` 限 `visual | interaction | layout | copy | motion`；`tweaks` 限 `color | type | spacing | copy | layout | toggle`；`deliverables` 取导出格式；`responsive` 限 `desktop | tablet | mobile`；文本 trim 后按 UTF-8 截断到 2000 字节；列表去重、最多 12 项、单项最多 500 字节；未知键丢弃；`normalizeIntake` 永不抛错、缺省返回完整骨架。
- 合并语义（`mergeIntake`）：patch 里出现的键替换当前值（数组整体替换），未出现的键保留；`variations` 按子字段合并；兼容扁平别名 `variationsCount` / `variationDimensions` / `variationRange`；`source` 由显式参数（wizard / agent）或 patch 决定，已有来源不同则记 `mixed`。
- 完整度（`intakeCompleteness`）：服务端按 16 个规范问题加权——必答问题权重 2、其余 1，输出 0–100 分与 `filled` / `missing` 问题 id；达到 80 分且没有 `completedAt` 时服务端自动写当前时间。
- 摘要（`intakeSummary`）：把非空答案渲染成 agent 可读的行（类型 / 目标 / 受众 / 语境 / 变体 / Tweaks / 内容 / 交付 / 成功标准 / 完整度），按 UTF-8 截断到 4000 字节，用于 `system/DESIGN.md` 与开始 prompt。

### 14.3 接口与持久化

- `GET /dsh-design-studio/api/intake/questions` → `{ok, groups, questions}`：`groups` 是 6 组（start / audience / context / variations / tweaks / delivery）共 16 个规范问题，`questions` 是带 `group` 的扁平清单；问题公共形状为 `{id,label,type,options,required,allowSkip,hint}`。向导与 agent 共用这一份问题清单。
- `POST /api/projects` 接受可选 `intake`：服务端规范化后写入项目；brief 缺失的字段从 intake 回填（`goal` / `audience` / `brandConstraints→constraints` / `contentMust→content`）；完整度 ≥80 自动补 `completedAt`；创建时生成的 `DESIGN.md` 含 Brief 与 Intake 两段。
- `POST /api/projects/:id/intake`：请求体 `{intake}`，返回 `{ok, intake, filled, missing}`；`source` 标记 `wizard`（面板路径）；仅合并 intake，不动 `design/*.html`。
- intake 保存后会刷新「自动生成的」`system/DESIGN.md`（文件头匹配 `# <name> — design system` 才覆盖）；手改过的文档不会被覆盖。brief 单独更新仍不触发该刷新。
- 错误：`intake` / `answers` 不是对象 → `invalid_input` + repair；项目不存在 → `not_found`。`design_projects get` 的详情里带 intake，旧项目为 `null`。

### 14.4 面板：6 步开始向导与补问

- 入口：总览首屏「开始一个新设计（6 步）」按钮打开创建向导；「快速开始（一句话）」保留 v1.2 的需求卡；工作区「需求」tab 的「补问 / 完善需求」打开更新向导。
- 问题来源：面板挂载时请求 `GET /api/intake/questions`，用 `normalizeIntakeGroups` 归一化成组件形状；请求失败或返回空时用内置 `fallbackIntakeGroups()`（同样是 6 步，标签走本地 i18n），并在向导副标题提示「问题清单服务未就绪，使用内置向导」。
- 交互：模态对话框（`role="dialog"`、`aria-modal`）；顶部「第 n / 6 步」+ 进度条百分比；问题控件按题型渲染（类型 chips、多选 chips、单选、0–100 滑块映射到「按规矩 / 平衡 / 前卫」、文本 / 多行文本）；必答题标「必答」；Esc 或点遮罩关闭；提交中禁用按钮。
- 委派与跳过：每题可标「已交给 Claude 追问」；每步「不知道，让 Claude 决定」把该步未答的必答题加入 `delegated` 并进入下一步；步骤级与全局校验只把「必答且未答且未委派」算缺失，底部显示总缺失数，缺失不为 0 时不能完成。
- 输出映射：`answersToBrief`（goal / audience / content = 必须内容 / constraints = 品牌约束 + 不要出现 / layout 空）与 `answersToIntake`（含 `variations.range` 标签、`openQuestions` ≤12、`completedAt` 当前时间、`source: wizard`）。
- 创建模式：末步「创建并去对话」→ `POST /api/projects`（带 kind / brief / intake）→ `buildStartPrompt` → HandoffToClaude（复制 → toast → 切回对话）；「只建项目」创建后直接打开工作区。更新模式：`answersFromIntake` 预填 → `POST /intake` → 同样可交接，或「只建项目」按钮仅保存（toast「已写入项目需求」）。
- 开始 prompt（`buildStartPrompt`）：项目行 +「已确认信息」清单（有值的字段逐条列出，单条截断 600 字符）+ 若有未答项「请先追问以下未确认项（≤8 个）」列表，否则「没有未确认项，可以直接开始」+ 固定工具链指令。
- 需求 tab 的 intake 卡：显示客户端完整度百分比（按 12 个摘要字段计算，与服端 16 问加权口径不同）、分组标签、待追问项；「补问」重开更新向导。

### 14.5 agent 提问策略

- 系统提示（`index.js` 的 `PROMPT_SECTION`）新增「开始方式」：新或含糊的设计请求先 `design_intake` 拿问题清单，用 `ask_user_question` 问 ≤8 个缺失关键问题（做什么、受众、设计系统 / UI kit / 仓库 / 截图、变体与维度、Tweaks、视觉 vs 交互偏好、交付、成功标准），答案用 `design_intake({projectId, answers})` 持久化；用户已给全才跳过；设计必须扎根真实语境，缺语境就说明假设并确认；先给 placeholder 再迭代；始终 3 档变体 + 质检 ≥90 再导出。
- `design_intake` 两种模式：无 `projectId` → 返回 `{ok, groups, questions, howTo, next}`，供 agent 组 `ask_user_question`；有 `projectId` + `answers` → `service.saveIntake(..., {source:'agent'})`，返回 `{intake, filled, missing, score, next}`，`next` 会列出仍缺失的字段并提示继续问或转 `design_start`。
- `design_start` 接受 `intake`，返回 `intakeScore`；创建时服务端规范化 intake、回填 brief、写 DESIGN.md。
- 权限与边界不变：所有写入仍在项目目录内；intake 只是数据，不触发模型调用；面板向导不会自动发送消息（仍走复制 → 用户粘贴）。

### 14.6 FlowStepper 首段与与 Claude Design 的对照

- FlowStepper 首段：`id: brief`，标签「开始」，提示「用 6 步向导说清要做什么，或直接在对话里说」；完成条件 `Boolean(project.intake?.completedAt) || briefIsFilled(project.brief)`；点击「开始」时若 intake 未完成则打开更新向导，否则切到「需求」tab。其余五段与 v1.2 相同。
- 对照（流程层）：

| 环节 | Claude Design | 设计台 v1.3 |
|---|---|---|
| 开始 | artifact Design 模板 / 对话 / `/design` 命令 | 总览 6 步向导 / 快速开始需求卡 / 对话直接说 |
| 提问时机 | 新项目或需求含糊时；小调整跳过 | 同上；向导已答的字段 agent 不再重复问 |
| 问题规模 | questions_v2，至少 10 个 | 面板 16 问（6 组）可跳过；agent 只补 ≤8 个缺失项 |
| 提问内容 | 起点与语境、变体、Tweaks、偏好、流程 / 文案 / 视觉 | 同左，落成 16 个字段的结构化 intake |
| 设计系统 | 新项目自动继承组织设计系统 | `design_context` 采集 + intake `contextSources` 记录；无组织级默认系统 |
| 阶段指引 | 无显式阶段条 | FlowStepper `开始 → 语境 → 变体 → 迭代 → 质检 → 导出` |

### 14.7 边界与测试

- 向导是可选加速器，不阻塞熟手；跳过、只保存、旧项目兼容都有路径；面板仍不聊天（复制交接）。
- 已知差异：没有 Claude Design 的组织级设计系统继承与「至少 10 问」的强制问询；我们用 16 问问题库 + 必答 7 题 + agent ≤8 问补足，其余靠 `design_context` 与 `DESIGN.md`。
- 测试：`test/unit/intake.test.mjs` 覆盖问题库、规范化、别名、合并、完整度、摘要与字段覆盖；client 覆盖 fallback 问题集 / 归一化 / reducer / 校验 / 委派 / 答案映射 / 开始 prompt / FlowStepper 首段；panel 覆盖问题清单与 `/intake` 路由；service 覆盖创建时 intake、DESIGN.md Intake 段与增量合并；tools 覆盖 `design_intake` 两种模式与 `design_start({intake})`。冻结验证：单元 270/270（intake 8、client 38、bridge 38）、集成 9/9、build check 8 片段 466,536 B。

## 15. 未来工作

1. **可编辑 PPTX**：把 deck 的文本与形状映射成 OOXML 富文本，而不是图片型幻灯片。
2. **智能参考线与吸附**：v2 已有标尺 / 网格 / 参考线与拖拽缩放；下一步是吸附、智能参考线与间距拖拽——需要在桥内维护临时几何提示，但仍以 HTML 为唯一事实来源。
3. **多页面项目**：目前一个变体一个文件；多页 deck/多屏应用可按文件名分组，画布增加页面缩略图。
4. **设计系统双向同步**：把面板里对 token 的修改反写回页面 CSS 变量与 DESIGN.md。
5. **更强的对比度与语义检查**：SVG 文本、伪元素内容、ARIA 属性一致性。
6. **更细的 AI-slop 检测**：目前是启发式（渐变、emoji、假名字、万能模板）；可以引入布局模式签名而不是文本关键词。
7. **跨会话索引**：项目列表已有，后续可加全文搜索（brief / 设计系统 / 评论）。

---

维护约定：改设计决策时同步更新本文与 `README.md`；改接口时先改 `CONTRACT.md`。文档不描述未实现的承诺。
