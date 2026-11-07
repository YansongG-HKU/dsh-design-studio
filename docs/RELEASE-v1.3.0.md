# v1.3.0 — 开始向导 + 提问流程（Claude Design 级设计工作台）

- **Tag**：`v1.3.0`（annotated，指向 `09d5bdb`）
- **发布方式**：GitHub Release；**不发布 npm**（仓库为 DSH bundle 源码，`private: true`）
- **要求**：Node.js ≥ 22、DSH ≥ 0.2.2-rc.1；质检/导出需要本机 Chrome / Edge / Chromium

设计台把 Claude Design 的「开始 → 提问 → 语境 → 三档变体 → 画布迭代 → 质检 → 导出」做成 DSH 原生插件：11 个 agent 工具、面板 HTTP 路由、Figma 级编辑器与可视化质检。

## 亮点

- **6 步开始向导**：总览首屏「开始一个新设计（6 步）」→ 做什么 / 给谁看 / 语境从哪来 / 变体与探索 / Tweaks 与内容 / 交付与成功标准；每步可「不知道，让 Claude 决定」，必答项未填不能 Finish。
- **结构化 intake**：`project.json.intake` 6 组 16 问（7 必答），归一化/增量合并/完整度评分/`DESIGN.md` 自动「需求访谈」段；`GET /api/intake/questions`、`POST /api/projects/:id/intake`。
- **Agent 提问策略**：新/含糊需求先调 `design_intake` 取清单，问 ≤8 个缺失项再 `design_start`；已给全则跳过。交接 prompt 自动带「已确认信息 + 待追问项」。
- **需求动线（v1.2）保留**：总览需求卡、左栏「需求」tab、intake 摘要与补问、顶栏常驻「回到对话」、FlowStepper 首段「开始」。
- **Figma 级编辑器**：三栏布局、图层树、浮动工具条、拖动/缩放/对齐、画板视图、命令面板、深浅主题、Tweaks、内联评论、版本时间线。
- **真实质检**：无头 Chrome 逐视口截图与计算样式，5 类规则（无障碍/排版/布局/设计系统/AI-slop）0–100 A–F；`design_check` 返回 findings 与截图。
- **导出**：HTML / ZIP / PDF / PNG / PPTX（PPTX 为结构校验，非排版等价）。

## 三个真实缺陷修复（由首次 CI 运行暴露）

1. **`awaitJob` 的轮询定时器被 `unref()`** —— 工具调用等待 job 时 Node 认为事件循环已空，Promise 永不落地（Linux/Node 22 必现；`design_check` 会挂起）。修复：移除 `unref`，等待循环必须保活（`7dd1819`）。
2. **`writeScaffold` 的 `..\escape.html` 路径穿越** —— POSIX 上反斜杠是合法文件名字符，Windows 风格的 `..\` 穿越未被拒绝。修复：所有平台把 `\` 视为路径分隔符后再做 `relative`/`isAbsolute` 校验（`7dd1819`）。
3. **`findBrowser` 只认识 Windows 安装路径** —— macOS/Linux 必须手动设 `DESIGN_STUDIO_BROWSER`；集成测试还写死 `chrome.exe`。修复：补 macOS/Linux 常见 Chrome/Chromium/Edge 路径，集成断言改为按可执行文件 basename 判断（`37c695a`）。

## CI

`.github/workflows/ci.yml`（ubuntu-latest，Node 22）：

1. `npm run check`（生成物 `client.js` 与 8 个片段一致）
2. `npm test`（**270/270** 单元测试）
3. `npm run test:integration`（**9/9** 真实浏览器：探针/截图/审计/导出/全链路，e2e `a=96 b=47`）

运行记录：`42407184989` failure（暴露缺陷 1、2）→ `42407314709` failure（暴露缺陷 3）→ `42407757887` success（全部绿）→ `42408166126` success（文档提交）→ badge 反映 main 最新运行。

## 安装

```text
plugin_manager install_bundle({ target: "<插件目录>" })
```

安装后：侧栏出现「设计台」面板、agent 获得 11 个 `design_*` 工具与一段 system-prompt。若侧栏图标隐藏：侧栏「更多 → 设计台 → 显示」。

## 可复现验证

```bash
cd dsh-design-studio
npm run check            # node --check index.js + build-client --check（8 fragments, 466,536 B）
npm test                 # 270 unit tests
npm run test:integration # 9 integration tests（真实 Chrome；DESIGN_STUDIO_BROWSER 可指定路径）
```

## 限制与未包含

- 不发布 npm；本 Release 只提供仓库源码。
- 质检/导出依赖本机 Chromium 系浏览器；无浏览器时 `design_check` 返回 `no_browser` 并给修复建议。
- 交接需要用户一次 Ctrl+V（DSH 对话与全局面板互斥主区域的显式设计）。
- 响应式覆盖 1440/768/375；PPTX 只做结构校验；编辑作用于真实 DOM，不是 Figma 对象模型。
- 主验收平台为 Windows；CI 在 Ubuntu 覆盖单元与真实浏览器集成，macOS 未实测。

完整验收记录与命令输出见 [`docs/VERIFICATION.md`](https://github.com/YansongG-HKU/dsh-design-studio/blob/main/docs/VERIFICATION.md)。
