# v1.3.1 — 发布门禁与真实浏览器 e2e

- **Tag**：`v1.3.1`（annotated，指向本次发布提交；上一版 `v1.3.0`）
- **发布方式**：GitHub Release；**不发布 npm**
- **变更类型**：发布工程 + 测试 + 一处兼容性修复（工具/路由/数据目录结构不变）

## 修复

- **开始向导在 host 问题库下丢失「变体维度 / 跨度」**：host 题库的 id 是 `variationDimensions` / `variationRange`（选项为中文标签），而客户端 `answersToIntake` 只认 fallback 题库的 `dimensions` / `range`（0–100 滑杆）。现在两个方向都接受：跨度在中文选项、数值滑杆与 `basic/balanced/avant-garde` 之间归一，`toggle` / `toggles` 归一后去重；`answersFromIntake` 同时输出两套 id，让「补问」预填在两种题库下都正确。

## 新增：真实浏览器 e2e（发布门禁）

`test/integration/wizard-handoff.test.mjs` + `test/fixtures/e2e/wizard-harness.html`：

1. 临时 HTTP 服务器同时服务 harness、`client.js` 与真实面板路由（`registerPanel` + fake webServer + 临时 store + 真实 service/browser pool）。
2. 真实 headless Chrome 打开 harness：用 ModuleLoader + fake React 载入 **shipped `client.js`**，取真实 `__test__` 向导 helpers，并从 `GET /api/intake/questions` 取 **host 真实题库**（6 组）。
3. 真实 DOM 点击走完 6 步（chips / multiselect / `Input.insertText` 文本 / Next ×6 / Finish）；其中委派 1 个必答 + 留空 1 个可选项。
4. Finish 走生产 `wizardReduce → validateWizardStep → collectOpenQuestions → answersToBrief → answersToIntake → buildStartPrompt → handoffPlan`，真实 `POST /api/projects`，剪贴板与 `layout.selectPanel(null)` 记录器断言。
5. 「粘贴交接」：从交接 prompt 中解析 projectId，写入 `good.html` 三档变体，跑真实 `design_check`，断言 **3 × 96 / A**。

## 新增：Release workflow

`.github/workflows/release.yml`，触发条件 `push: tags: ['v*']`，步骤（失败即阻断）：

1. `npm run check`（生成物 `client.js` 与 8 个片段一致）
2. `npm test`（271 单元测试）
3. `npm run test:integration`（10 真实浏览器集成，含上面的向导 e2e）
4. `node scripts/verify-release.mjs --tag "$GITHUB_REF_NAME"`（13 项产物校验）
5. 上传 `release-report.json` 与 `client.js` artifact（保留 7 天）

`scripts/verify-release.mjs` 的检查：tag ↔ package version、annotated tag、tag commit = HEAD、tag commit 在 `origin/main`、版本常量（service/client）与 `package.json` 一致、生成物一致性、必需文件清单、package/locale JSON、cordis patch、npm pack 内容边界、密钥模式扫描，并输出 `release-report.json`。

## 验证（本地，Windows / Node 24.14）

```bash
npm run check            # 8 fragments, client.js 同步
npm test                 # 271 / 271
npm run test:integration # 10 / 10（含向导 e2e：3×96 A）
node scripts/verify-release.mjs --tag v1.3.1 --report release-report.json  # 13 / 13
```

CI 在 tag 推送后复跑同一组命令；结果见 Actions 的 Release workflow 运行记录。

## 已知限制

- e2e 用 harness 承载「真实 client.js 状态机 + 真实问题库 + 真实面板路由 + 真实 Chrome 点击」，不实例化 DSH 的 React 视图层（DSH 主区域在测试环境中不可用）；视图层本身的渲染由单元测试与客户端渲染冒烟覆盖。
- 精确 96/A 依赖 headless Chrome 的计算样式；本机（Chrome 117）与 CI（Chrome 156）均按同一套规则计算，已作为断言。
- 其余限制同 v1.3.0（无 npm 发布、交接需一次 Ctrl+V、PPTX 结构校验、DOM 编辑而非对象模型、Ubuntu 为 CI 平台、Windows 为主验收平台）。
