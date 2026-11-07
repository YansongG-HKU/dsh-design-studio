# Claude Design 全流程逆向 + 设计台 v1.3「开始 / 提问」流程设计

> 用户反馈：*"你也得看看 Claude Design 的流程，包括开始、包括提问等等，你都得好好处理一下。"*
> 本文先还原 Claude Design 从「开始」到「交付」的完整流程（含它怎么问问题），再给出设计台 v1.3 的流程实现与验收标准。与 `UX-MAP.md`（界面/需求动线）配合阅读。

---

## 一、Claude Design 的流程（逆向还原）

来源：Claude Design 系统提示词泄漏全文（CL4R1T4S / 腾讯云转载）、官方帮助中心（入门、设计系统、键盘）、产品页。以下为「实际产品行为」的还原，括号内是原文要点。

### 1. 入口（开始）

- 任意对话里说"帮我做个设计/单页文档/原型"→ Claude 直接在对话旁生成 artifact（画布）。
- **Artifacts 标签页** → 选择 Design 模板 → 新项目。
- **Claude Code**：`/design`（在代码库里创建/编辑设计）或 `/design-sync`（把设计系统同步进 Claude Code）。
- 独立版 `claude.ai/design`（2026-12-14 关闭）→ 项目选择器（左下角切换组织）。

新项目**自动继承组织设计系统**（Enterprise 可设默认/保留发布权）。这是「开始」的一部分：不是空白画布，而是"品牌已就位"。

### 2. 提问（questions_v2，官方提示词明写）

**什么时候问**：新项目或需求含糊时用；小的调整、跟进、用户已给全信息时跳过。调用后结束本回合等用户回答。

**必须问到的内容（原文归纳）**：
- 永远确认**起点与产品语境**：UI kit / 设计系统 / 代码库 / Figma / 截图。没有语境就告诉用户附上——"没有上下文的设计永远是烂设计"，并且要**用问题确认，不能只在心里想**。
- 永远问**要不要变体、在哪些维度变体**（整体流程？单个界面？）。
- 永远问用户**想通过 tweaks/变体探索什么**（新 UX / 不同视觉 / 动画 / 文案）。
- 永远问**用户更在乎分歧的视觉、交互还是想法**。
- 问用户最在乎**流程、文案、视觉**中的哪一个。
- 永远问**想要哪些 tweaks**。
- 至少 4 个问题相关的其他问题；**总共至少 10 个问题，可能更多**。
- 好问题的例子：受众/语气/长度（deck）、是否要变体、fidelity、约束、现有品牌。

### 3. 工作流六步（原文）

1. **理解需求**：新/含糊需求先问澄清问题；搞清输出、fidelity、选项数量、约束、设计系统/UI kit/品牌。
2. **探索已有资源**：读设计系统完整定义与相关文件；有代码库/Figma/截图就导入；找不到就问用户；**列出设计资产、ls 设计系统目录，主动探**。
3. **计划 / todo list**。
4. **搭目录结构并把资源复制进来**（防引用失效，保证可交付）。
5. **收尾**：`done` 把文件交给用户并检查加载是否干净；有错修完再 done；干净后 `fork_verifier_agent` 后台深度检查（截图/布局/JS），失败才唤醒主 agent；不等待。
6. **极简总结**：只讲注意事项和下一步。

**硬规则**：高保真设计绝不从零开始（必须扎根设计系统/UI kit/截图）；先从 placeholder 开始尽早给用户看；后续迭代把新版本做成 Tweak 而不是堆文件；变体 ≥3、跨维度、从基础到前卫；CSS/HTML/JS/SVG 要敢用；缺资源用 placeholder 而不是画坏。

### 4. 迭代（三条通道）

- **对话**：结构性修改（加屏、换布局、换方向）。
- **内联评论**：点画布具体元素留言；"Send to Claude" 决定是否同时作为请求发给 Claude；评论 marker 带作者名。
- **画布直接编辑**：拖动/缩放/对齐、文字直接编辑、属性面板；颜色选择器给对比度好坏。
- **Tweaks**：工具栏开关，页面内自绘控件实时调颜色/字体/间距/文案/布局变体；EDITMODE JSON 持久化；先监听后 announce。
- **版本**：重要改版前"保存现有内容，尝试完全不同的方法"，Claude 保存旧版并告诉你位置（对话里可引用）。

### 5. 验证与交付

- `done`：打开到用户 tab 并返回 console 错误；用户落脚的页面必须不崩。
- `fork_verifier_agent`：后台子代理用自己的 iframe 做截图/布局/JS 深度检查；通过静默、失败唤醒；定向检查（"截图看看间距"）也走它——**主 agent 不自己截图检查**。
- **导出/分享**：ZIP、PDF、PPTX、Google Slides、独立 HTML、发送到 Adobe/Canva/Figma/Lovable/v0 等工具、交接到 Claude Code。
- 分享默认私有；可评论/查看。
- **设计系统**：项目开始时已就位；过程中可 `questions_v2` 确认是否用品牌系统。

### 6. 内容铁律贯穿全程

不从零开始、无填充内容、无数据拼盘、无 emoji、避免 AI-slop 字体/渐变/左彩边卡、幻灯片文字 ≥24px、印刷 ≥12pt、移动端点击区 ≥44px、deck 每屏 1920×1080 + scale letterbox + `data-screen-label` 1-indexed、播放位置存 localStorage。

---

## 二、设计台 v1.3：把「开始 / 提问」做成产品流程

### 2.1 现状差距（v1.2）

- 面板有需求输入卡，但**是开放文本**——用户不知道要提供什么，agent 拿到一句话就 `design_start` 开干，容易产出泛泛设计。
- 没有**问询环节**：Claude Design 的"至少 10 个问题"完全缺失；agent 侧也没有强制先问。
- 项目记录没有结构化的 `intake`（受众、变体维度、Tweaks 期望、约束、成功标准），后续 check/变体缺乏依据。

### 2.2 v1.3 流程设计（对齐 Claude Design）

**A. 开始（开始向导，6 步，面板内）**

1. **做什么**：类型（网页/移动端/演示稿/海报/文档）+ 一句话目标。
2. **给谁看 / 在哪用**：受众、使用场景、语气。
3. **语境从哪来**：设计系统（已有/导入 URL/仓库/没有让 Claude 探）+ 参考（URL/截图/描述）+ 品牌约束。
4. **变体与探索**：要几档（2/3/4）、探索维度（视觉/交互/布局/文案/动效）、偏好（按规矩 ↔ 前卫）。
5. **Tweaks 与内容**：想调什么（颜色/字号/间距/文案/布局变体/开关）、必须出现的内容、不要出现的内容。
6. **交付与成功标准**：交付格式（看/HTML/PDF/PPTX/ZIP）、响应式范围、验收标准（如质检 ≥90、移动端无溢出）。

顶部显示 1/6 进度；每步可跳过（"让 Claude 决定"）；最后生成：
- 项目 `brief`（goal/audience/layout/content/constraints）与结构化 `intake`；
- 一段**交接 prompt**（含已知/未知、让 Claude 先追问缺失项）；
- 「创建并去对话」（主）/「只建项目」（次）。

**B. 提问（agent 侧，两层）**

1. **面板已答**：向导答案写进 `intake`，交接 prompt 里明确"已确认信息"，agent 不再重复问。
2. **agent 补问**：系统提示 + 新工具 `design_intake` 规定——新/含糊请求先问 **≤8 个**（Claude Design 的 10 问精简版，按缺失项动态选），已有信息则直接开干；问题涵盖：起点/语境、受众、变体维度、Tweaks 期望、偏好（视觉 vs 交互 vs 功能）、交付、成功标准、不要什么。
   - 只有用户明确给全了才跳过提问。
   - 问完再 `design_start`，把回答写进 `intake`。
3. **面板「补问」**：项目工作区「需求」tab 有「补问 / 完善需求」按钮，重开向导，增量写入 `intake`（不覆盖已有答案）。

**C. 流程阶段（FlowStepper 升级）**

`开始 → 语境 → 变体 → 迭代 → 质检 → 导出`（原"需求"改名"开始"，点击「开始」打开向导/需求 tab）。
每阶段的状态由项目字段推导：`intake` 完成度 / context 数量 / variants>1 / latestCheck|comments|versions / bestScore≥90 / exports>0。

**D. 执行与交付（保持 v1.2）**

`design_start(intake)` → `design_context` → 写 a/b/c 变体 → `design_check` → 修复循环 → `design_export`；面板交接评论/问题给 Claude；版本快照；预览 `design_serve`。

### 2.3 数据模型（新增字段，向后兼容）

`project.json` 新增：
```json
{
  "intake": {
    "kind": "web",
    "goal": "一句话目标",
    "audience": "谁 + 场景",
    "contextSources": ["existing-design-system" | "url" | "repo" | "screenshots" | "none"],
    "references": ["https://…"],
    "brandConstraints": "品牌色/字体/禁用项",
    "variations": { "count": 3, "dimensions": ["visual","layout"], "range": "basic→advanced" },
    "tweaks": ["color","type","spacing","copy"],
    "contentMust": "必须出现的内容 / 真实数据",
    "contentAvoid": "不要出现的内容 / 禁用项",
    "deliverables": ["html","pdf"],
    "responsive": ["desktop","mobile"],
    "success": ["check>=90","no-overflow"],
    "openQuestions": ["让 Claude 追问的项"],
    "completedAt": "ISO",
    "source": "wizard|agent|mixed"
  }
}
```
校验：所有字段可选、类型受限、字符串截断、数组去重限量；未知键丢弃。缺少 intake 的旧项目照常工作。

### 2.4 接口与工具

- `GET /api/intake/questions` → 规范问题清单（向导与 agent 共用同一份；含分组/题型/选项/是否必答）。
- `POST /api/projects` 接受可选 `intake`（创建时写入）。
- `POST /api/projects/:id/intake` → 合并写入（局部更新；`source` 标记 wizard/agent/mixed）；返回完整 intake。
- `design_intake` 工具：
  - 无 projectId → 返回问题清单（供 agent 用 `ask_user_question` 提问）；
  - 有 projectId+answers → 校验并保存 intake，返回"已确认/仍缺失/建议下一步"。
- `design_start` 接受可选 `intake`；写入项目并把 intake 摘要写进 `system/DESIGN.md`，供后续 check/生成使用。
- `design_projects` 不变（detail 已返回 intake）。

### 2.5 系统提示更新（agent 侧流程）

在现有 `PROMPT_SECTION` 前插入"开始方式"：新/含糊设计请求先按 `design_intake` 的问题清单问 ≤8 个关键问题（语境/受众/变体/tweaks/偏好/交付/成功标准），用户已给全才跳过；设计必须扎根语境（设计系统/URL/仓库/截图），不从零 mock；先给 placeholder 再迭代；始终 3 档变体 + check ≥90 再 export；总结只讲注意事项与下一步。

## 三、验收标准（v1.3）

1. 面板：总览「新建设计」/ 需求卡打开 6 步向导；完成向导 → 创建项目（brief+intake）→ 交接 prompt 含已确认信息 → 复制并回对话；「只建项目」也可。
2. 工作区「需求」tab：显示 intake 摘要（标签化）、「补问」重开向导增量保存；FlowStepper 首段为「开始」。
3. 接口：`GET /api/intake/questions` 200；`POST /api/projects/:id/intake` 200 增量合并；`POST /api/projects` 带 intake 200；`design_projects get` 返回 intake。
4. 工具：`design_intake` 两种模式；`design_start({intake})` 写 DESIGN.md；agent 提示含"先提问"流程。
5. 测试：单元测试新增 intake 校验/合并/问题清单/向导纯函数/flow 推导；全绿；e2e 不回归。
6. 版本 1.3.0 安装、活体状态 200、真实窗口截图（总览向导步骤 1/6、工作区需求 tab intake 摘要、FlowStepper「开始」）入 `_artifacts/design-studio/ui-v4/`。
7. 文档：`docs/FLOW.md`（本文）、README/CHANGELOG/DESIGN 更新、UX-MAP 同步。
