/**
 * Scaffold `deck` — 16:9 slide deck stage (presentation + print/PDF first).
 *
 * Visual direction: editorial briefing on warm paper with one ink cover. Screens
 * are stacked 1920×1080 sections so the probe can scroll each into view and the
 * PDF/PPTX export gets exactly one slide per printed page.
 * Keyboard nav, localStorage restore, data-screen-label, @page, print-safe.
 * Self-contained, no external requests, Claude edit-mode Tweaks protocol.
 */
export default String.raw`<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>热浪来临之前 · 城市热浪响应提案</title>
<style>
  @page { size: 1920px 1080px; margin: 0; }

  :root {
    --paper: #f0ebdd;
    --paper-deep: #e5dfcd;
    --ink: #171612;
    --ink-soft: #39362d;
    --muted: #57534a;
    --rule: #c9c2ae;
    --accent: #a2412a;
    --accent-soft: #e8cdbf;
    --body-size: 34px;
    --serif: "Iowan Old Style", "Palatino Linotype", "Source Han Serif SC", "Songti SC", "Noto Serif CJK SC", serif;
    --sans: "Neue Haas Grotesk Text Pro", "Avenir Next", "Segoe UI Variable Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    --mono: "Cascadia Code", "SF Mono", "JetBrains Mono", Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: auto; scroll-snap-type: y mandatory; }
  body {
    margin: 0;
    background: #0e0d0b;
    color: var(--ink);
    font-family: var(--sans);
    font-size: 24px;
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  ::selection { background: var(--accent); color: var(--paper); }
  :focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }

  /* Every screen is exactly 1920×1080 and stacked: print = one page per screen. */
  .slide {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 1920px;
    height: 1080px;
    padding: 120px 140px 96px;
    overflow: hidden;
    background: var(--paper);
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }
  .slide.cover { background: var(--ink); color: var(--paper); padding-bottom: 148px; }
  body.cover-paper .slide.cover { background: var(--paper); color: var(--ink); }
  body.cover-paper .slide.cover .cover-sub,
  body.cover-paper .slide.cover .cover-meta,
  body.cover-paper .slide.cover .slide-no { color: var(--muted); }
  body.cover-paper .slide.cover .cover-rule { background: var(--accent); }
  body.cover-paper .slide.cover .brand-line { border-color: var(--rule); }

  .slide-no {
    position: absolute;
    top: 56px;
    right: 72px;
    font-family: var(--mono);
    font-size: 24px;
    letter-spacing: 0.12em;
    color: var(--muted);
  }
  .slide.cover .slide-no { color: rgba(240, 235, 221, 0.6); }
  body.hide-numbers .slide-no { display: none; }
  .slide-foot {
    position: absolute;
    left: 140px;
    right: 140px;
    bottom: 56px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 32px;
    font-family: var(--mono);
    font-size: 24px;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .slide.cover .slide-foot { color: rgba(240, 235, 221, 0.62); }
  .slide-foot .foot-rule { position: absolute; left: 0; right: 0; top: -18px; height: 1px; background: var(--rule); }
  .slide.cover .foot-rule { background: rgba(240, 235, 221, 0.24); }

  .kicker {
    display: flex;
    align-items: center;
    gap: 20px;
    margin: 0 0 40px;
    font-family: var(--mono);
    font-size: 24px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .kicker::before { content: ""; width: 56px; height: 2px; background: var(--accent); }
  .slide.cover .kicker { color: #d99a7c; }
  body.cover-paper .slide.cover .kicker { color: var(--accent); }

  h1, h2 { margin: 0; font-family: var(--serif); font-weight: 600; letter-spacing: -0.03em; }
  h1 { font-size: 148px; line-height: 1.02; }
  h2 { font-size: 80px; line-height: 1.1; letter-spacing: -0.025em; }
  p { margin: 0; }

  .cover-body { display: flex; flex-direction: column; height: 100%; }
  .cover-rule { width: 96px; height: 4px; background: #d99a7c; margin-bottom: 40px; }
  .cover-sub {
    max-width: 34ch;
    margin: 36px 0 0;
    font-family: var(--serif);
    font-size: 40px;
    line-height: 1.5;
    color: rgba(240, 235, 221, 0.86);
  }
  .cover-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 56px;
    margin-top: auto;
    padding-top: 36px;
    border-top: 1px solid rgba(240, 235, 221, 0.26);
    font-family: var(--mono);
    font-size: 24px;
    letter-spacing: 0.06em;
    color: rgba(240, 235, 221, 0.72);
  }
  .cover-meta b { color: var(--paper); font-weight: 500; }
  .brand-line { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 28px; border-bottom: 1px solid rgba(240, 235, 221, 0.26); }
  .brand-line .mark { font-family: var(--serif); font-size: 32px; letter-spacing: 0.02em; }
  .brand-line .tag { font-family: var(--mono); font-size: 24px; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.66; }

  /* Slide 02 — three observed shifts, numbered, no charts. */
  .observations { display: flex; flex-direction: column; margin-top: 56px; }
  .observation {
    display: grid;
    grid-template-columns: 120px 380px 1fr;
    gap: 40px;
    align-items: start;
    padding: 40px 0;
    border-top: 1px solid var(--rule);
  }
  .observation:last-child { border-bottom: 1px solid var(--rule); }
  .observation .num { font-family: var(--mono); font-size: 24px; letter-spacing: 0.1em; color: var(--accent); }
  .observation h3 { margin: 0; font-family: var(--serif); font-size: 42px; font-weight: 600; line-height: 1.25; letter-spacing: -0.02em; }
  .observation p { font-size: var(--body-size); line-height: 1.62; color: var(--ink-soft); }

  /* Slide 03 — three response layers. */
  .layers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 56px; margin-top: 72px; }
  .layer { border-top: 2px solid var(--ink); padding-top: 28px; }
  .layer .layer-no { margin: 0 0 12px; font-family: var(--mono); font-size: 24px; letter-spacing: 0.16em; color: var(--accent); }
  .layer h3 { margin: 0 0 20px; font-family: var(--serif); font-size: 54px; font-weight: 600; letter-spacing: -0.02em; }
  .layer ul { margin: 0; padding: 0; list-style: none; font-size: var(--body-size); line-height: 1.55; color: var(--ink-soft); }
  .layer li { padding: 14px 0; border-top: 1px solid var(--rule); }
  .layer li:last-child { border-bottom: 1px solid var(--rule); }

  /* Slide 04 — four design principles, 2 × 2. */
  .principles { display: grid; grid-template-columns: 1fr 1fr; gap: 56px 96px; margin-top: 64px; }
  .principle { display: grid; grid-template-columns: 88px 1fr; gap: 28px; }
  .principle .mark { font-family: var(--serif); font-size: 56px; line-height: 1; color: var(--accent); }
  .principle h3 { margin: 0 0 12px; font-family: var(--serif); font-size: 40px; font-weight: 600; letter-spacing: -0.015em; }
  .principle p { font-size: 28px; line-height: 1.6; color: var(--muted); }

  /* Slide 05 — three summers, a typographic timeline. */
  .seasons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin-top: 72px; border-top: 2px solid var(--ink); }
  .season { padding: 32px 40px 0 0; border-right: 1px solid var(--rule); }
  .season:last-child { border-right: 0; padding-right: 0; }
  .season .when { margin: 0 0 12px; font-family: var(--mono); font-size: 24px; letter-spacing: 0.12em; color: var(--accent); }
  .season h3 { margin: 0 0 22px; font-family: var(--serif); font-size: 56px; font-weight: 600; letter-spacing: -0.02em; }
  .season ul { margin: 0; padding: 0; list-style: none; font-size: 28px; line-height: 1.6; color: var(--ink-soft); }
  .season li { padding: 12px 0; border-top: 1px solid var(--rule); }

  /* Slide 06 — next steps. */
  .next { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 120px; margin-top: 72px; }
  .next ol { margin: 0; padding: 0; list-style: none; counter-reset: step; }
  .next li { counter-increment: step; display: grid; grid-template-columns: 96px 1fr; gap: 24px; padding: 28px 0; border-top: 1px solid var(--rule); font-size: 32px; line-height: 1.5; }
  .next li:last-child { border-bottom: 1px solid var(--rule); }
  .next li::before { content: "0" counter(step); font-family: var(--mono); font-size: 24px; color: var(--accent); }
  .next-contact { border-top: 2px solid var(--ink); padding-top: 24px; font-size: 28px; line-height: 1.7; color: var(--ink-soft); }
  .next-contact b { display: block; margin-bottom: 12px; font-family: var(--mono); font-size: 24px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }

  /* Controls: small fixed rail; hidden when printing. */
  #controls {
    position: fixed;
    right: 28px;
    bottom: 28px;
    z-index: 60;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border-radius: 999px;
    background: rgba(23, 22, 18, 0.86);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
  }
  #controls button {
    width: 40px; height: 40px;
    display: grid; place-items: center;
    border: 0; border-radius: 50%;
    background: transparent;
    color: var(--paper);
    cursor: pointer;
  }
  #controls button:hover { background: rgba(240, 235, 221, 0.14); }
  #counter {
    min-width: 84px;
    padding: 0 10px;
    font-family: var(--mono);
    font-size: 13px;
    letter-spacing: 0.08em;
    color: rgba(240, 235, 221, 0.72);
    text-align: center;
  }
  #hint {
    position: fixed;
    left: 28px;
    bottom: 34px;
    z-index: 60;
    margin: 0;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.06em;
    color: rgba(240, 235, 221, 0.55);
    transition: opacity 400ms ease;
  }
  #hint.gone { opacity: 0; }

  /* Tweaks tray (edit mode only). */
  .tray {
    position: fixed;
    right: 28px;
    bottom: 88px;
    z-index: 70;
    width: 260px;
    padding: 16px;
    border-radius: 10px;
    background: rgba(23, 22, 18, 0.96);
    color: var(--paper);
    font-family: var(--mono);
    font-size: 12px;
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.4);
  }
  .tray[hidden] { display: none; }
  .tray h3 { margin: 0 0 8px; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #d99a7c; }
  .tray label { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 0; }
  .tray input[type="color"] { width: 42px; height: 24px; border: 1px solid rgba(240, 235, 221, 0.3); background: none; padding: 0; }
  .tray input[type="range"] { width: 112px; accent-color: #d99a7c; }

  /* One screen per printed page: real paper size, no chrome, exact colors. */
  @media print {
    html, body { background: #fff; margin: 0; padding: 0; scroll-snap-type: none; }
    .slide {
      display: flex !important;
      width: 1920px;
      height: 1080px;
      break-after: page;
      page-break-after: always;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .slide:last-of-type { break-after: auto; page-break-after: auto; }
    #controls, #hint, .tray { display: none !important; }
    .slide, .slide * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }
  button, input, select, textarea { font: inherit; }
</style>
</head>
<body>
  <section class="slide cover" id="slide-1" data-screen-label="01 封面">
    <div class="cover-body">
      <div class="brand-line">
        <span class="mark">岸线研究组</span>
        <span class="tag">Shoreline Lab · 城市气候单元</span>
      </div>
      <p class="kicker" style="margin-top:72px">内部提案 · 编号 SL-2026-03</p>
      <h1>热浪来临<br>之前</h1>
      <div class="cover-rule" aria-hidden="true"></div>
      <p class="cover-sub">一份关于城市热浪响应的行动提案：把有限的资源放在夜里、树荫下和已经存在的房子里。</p>
      <div class="cover-meta">
        <span>提交 <b>2026-03-18</b></span>
        <span>版本 <b>v1.2</b></span>
        <span>范围 <b>中心城区 6 个街道</b></span>
        <span>阅读 <b>约 18 分钟</b></span>
      </div>
    </div>
    <div class="slide-foot"><span class="foot-rule" aria-hidden="true"></span><span>岸线研究组 · 2026</span><span>01 / 06</span></div>
  </section>

  <section class="slide" id="slide-2" data-screen-label="02 观察">
    <p class="kicker">观察 · 2023—2025 夏</p>
    <h2>三个正在发生的变化</h2>
    <div class="observations">
      <div class="observation">
        <span class="num">01</span>
        <h3>夜间不再降温</h3>
        <p>连续三个夏天，城区夜间最低温高于郊区。水泥与沥青把白天吸收的热量在夜里缓慢释放，凌晨两点成为一天中最难熬的时段。</p>
      </div>
      <div class="observation">
        <span class="num">02</span>
        <h3>街区的树荫正在消失</h3>
        <p>行道树更换周期与管线施工重叠。成年树冠被截断之后，要七年才能恢复原有的遮荫面积，而改造计划通常只写三年。</p>
      </div>
      <div class="observation">
        <span class="num">03</span>
        <h3>降温设施挤在少数街区</h3>
        <p>图书馆、社区中心与商场构成事实上的避暑网络；可它们的覆盖半径，与老年人口分布并不重合。</p>
      </div>
    </div>
    <div class="slide-foot"><span class="foot-rule" aria-hidden="true"></span><span>观察 · 现场记录与访谈</span><span>02 / 06</span></div>
  </section>

  <section class="slide" id="slide-3" data-screen-label="03 方法">
    <p class="kicker">方法 · 三层响应</p>
    <h2>个人保命，街区降温，城市调度</h2>
    <div class="layers">
      <div class="layer">
        <p class="layer-no">LAYER 01</p>
        <h3>个人</h3>
        <ul>
          <li>家庭热风险清单</li>
          <li>药物与饮水提示</li>
          <li>独居老人电话回访</li>
        </ul>
      </div>
      <div class="layer">
        <p class="layer-no">LAYER 02</p>
        <h3>街区</h3>
        <ul>
          <li>夜间开放点与值班表</li>
          <li>树荫步道连接</li>
          <li>喷淋节点与取水点</li>
        </ul>
      </div>
      <div class="layer">
        <p class="layer-no">LAYER 03</p>
        <h3>城市</h3>
        <ul>
          <li>预警分级与触发条件</li>
          <li>跨部门调度接口</li>
          <li>公共空间改造预算</li>
        </ul>
      </div>
    </div>
    <div class="slide-foot"><span class="foot-rule" aria-hidden="true"></span><span>方法 · 与 6 个街道的联合设计</span><span>03 / 06</span></div>
  </section>

  <section class="slide" id="slide-4" data-screen-label="04 原则">
    <p class="kicker">原则 · 写给执行者</p>
    <h2>四条设计原则</h2>
    <div class="principles">
      <div class="principle">
        <span class="mark">01</span>
        <div><h3>先保命，再谈舒适</h3><p>预警、开放点与急救通道优先于景观工程。任何美化方案都不能挤占这三样。</p></div>
      </div>
      <div class="principle">
        <span class="mark">02</span>
        <div><h3>用已有的房子</h3><p>改造现有公共空间，不新增地标。空置的社区用房比新建的避暑中心更快开放。</p></div>
      </div>
      <div class="principle">
        <span class="mark">03</span>
        <div><h3>让数据被读懂</h3><p>预警分级必须能被一张纸说清。市民不需要理解模型，只需要知道今天去哪。</p></div>
      </div>
      <div class="principle">
        <span class="mark">04</span>
        <div><h3>留下可维护的东西</h3><p>每个装置都要有人负责关水、修泵、换滤芯。没有维护方案的设计不进入施工图。</p></div>
      </div>
    </div>
    <div class="slide-foot"><span class="foot-rule" aria-hidden="true"></span><span>原则 · 评审通过版本</span><span>04 / 06</span></div>
  </section>

  <section class="slide" id="slide-5" data-screen-label="05 节奏">
    <p class="kicker">节奏 · 三个夏天</p>
    <h2>把三年拆成三个夏天</h2>
    <div class="seasons">
      <div class="season">
        <p class="when">2026 夏 · 现在</p>
        <h3>先开起来</h3>
        <ul>
          <li>开放点清单公布</li>
          <li>夜间值班表到位</li>
          <li>电话回访名单确认</li>
        </ul>
      </div>
      <div class="season">
        <p class="when">2026 冬 · 施工窗口</p>
        <h3>再连起来</h3>
        <ul>
          <li>树荫步道测绘</li>
          <li>喷淋节点试点</li>
          <li>街道维护队培训</li>
        </ul>
      </div>
      <div class="season">
        <p class="when">2027 夏 · 检验</p>
        <h3>然后公开</h3>
        <ul>
          <li>全区预警联动</li>
          <li>年度复盘公开</li>
          <li>预算进入下一年度</li>
        </ul>
      </div>
    </div>
    <div class="slide-foot"><span class="foot-rule" aria-hidden="true"></span><span>节奏 · 以夏季为交付节点</span><span>05 / 06</span></div>
  </section>

  <section class="slide" id="slide-6" data-screen-label="06 下一步">
    <p class="kicker">下一步 · 需要今天决定的事</p>
    <h2>先把三件事定下来</h2>
    <div class="next">
      <ol>
        <li><span>确认 2026 年夏季开放点名单，并指定每个点的负责人。</span></li>
        <li><span>与街道确认夜间值班与电话回访的执行人。</span></li>
        <li><span>把 2027 年维护预算写进年度计划，而不是等试点成功再申请。</span></li>
      </ol>
      <div class="next-contact">
        <b>联系</b>
        岸线研究组 · 城市气候单元<br>
        内部文件，请勿外传<br>
        版本 v1.2 · 2026-03-18
      </div>
    </div>
    <div class="slide-foot"><span class="foot-rule" aria-hidden="true"></span><span>提案结束 · 谢谢阅读</span><span>06 / 06</span></div>
  </section>

  <div id="controls" role="group" aria-label="幻灯片控制">
    <button type="button" id="prev" aria-label="上一页">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
    </button>
    <span id="counter" aria-live="polite">1 / 6</span>
    <button type="button" id="next" aria-label="下一页">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>
    </button>
  </div>
  <p id="hint">← → 翻页 · Home / End 首尾 · 页码自动保存</p>

  <div class="tray" id="tweaks" hidden>
    <h3>Tweaks · 提案</h3>
    <label>强调色 <input type="color" id="tw-accent" value="#a2412a"></label>
    <label>正文字号 <input type="range" id="tw-body" min="28" max="40" step="2" value="34"><output id="tw-body-out">34px</output></label>
    <label>深色封面 <input type="checkbox" id="tw-cover" checked></label>
    <label>页码 <input type="checkbox" id="tw-numbers" checked></label>
  </div>

<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#a2412a",
  "bodySize": 34,
  "coverDark": true,
  "showNumbers": true
}/*EDITMODE-END*/;

const SLIDES = Array.prototype.slice.call(document.querySelectorAll('[data-screen-label]'));
const STORAGE_KEY = 'dsh-deck-shoreline-index';
const root = document.documentElement;
const body = document.body;
const tray = document.getElementById('tweaks');
const counter = document.getElementById('counter');
const hint = document.getElementById('hint');
let current = 0;

function applyTweaks(edits) {
  const v = Object.assign({}, TWEAK_DEFAULTS, edits || {});
  root.style.setProperty('--accent', v.accentColor);
  root.style.setProperty('--body-size', v.bodySize + 'px');
  body.classList.toggle('cover-paper', v.coverDark === false);
  body.classList.toggle('hide-numbers', v.showNumbers === false);
  const accent = document.getElementById('tw-accent');
  const bodySize = document.getElementById('tw-body');
  const bodyOut = document.getElementById('tw-body-out');
  const cover = document.getElementById('tw-cover');
  const numbers = document.getElementById('tw-numbers');
  if (accent) accent.value = v.accentColor;
  if (bodySize) bodySize.value = v.bodySize;
  if (bodyOut) bodyOut.textContent = v.bodySize + 'px';
  if (cover) cover.checked = v.coverDark !== false;
  if (numbers) numbers.checked = v.showNumbers !== false;
  return v;
}
window.__dsApplyTweaks = applyTweaks;

function postTweaks(edits) {
  try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: edits }, '*'); } catch (error) {}
}

function clampIndex(index) {
  return Math.max(0, Math.min(SLIDES.length - 1, index));
}

function sync(index, behavior) {
  current = clampIndex(index);
  const top = current * 1080;
  window.scrollTo({ top: top, behavior: behavior || 'smooth' });
  if (counter) counter.textContent = (current + 1) + ' / ' + SLIDES.length;
  try { localStorage.setItem(STORAGE_KEY, String(current)); } catch (error) {}
  try { window.postMessage({ slideIndexChanged: current }, '*'); } catch (error) {}
  try {
    if (window.parent && window.parent !== window) window.parent.postMessage({ slideIndexChanged: current }, '*');
  } catch (error) {}
  if (hint) hint.classList.add('gone');
}

function go(delta) {
  sync(current + delta, 'smooth');
}

function jump(index) {
  sync(index, 'smooth');
}

function readScroll() {
  const index = clampIndex(Math.round(window.scrollY / 1080));
  current = index;
  if (counter) counter.textContent = (index + 1) + ' / ' + SLIDES.length;
  try { localStorage.setItem(STORAGE_KEY, String(index)); } catch (error) {}
}

function restore() {
  let saved = 0;
  try { saved = Number(localStorage.getItem(STORAGE_KEY) || 0); } catch (error) {}
  if (!Number.isFinite(saved)) saved = 0;
  sync(saved, 'auto');
}

document.getElementById('prev').addEventListener('click', function () { go(-1); });
document.getElementById('next').addEventListener('click', function () { go(1); });

window.addEventListener('keydown', function (event) {
  const key = event.key;
  if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown') { event.preventDefault(); go(1); }
  else if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp') { event.preventDefault(); go(-1); }
  else if (key === ' ' || key === 'Spacebar') { event.preventDefault(); go(event.shiftKey ? -1 : 1); }
  else if (key === 'Home') { event.preventDefault(); jump(0); }
  else if (key === 'End') { event.preventDefault(); jump(SLIDES.length - 1); }
});

let scrollTimer = 0;
window.addEventListener('scroll', function () {
  if (scrollTimer) window.clearTimeout(scrollTimer);
  scrollTimer = window.setTimeout(readScroll, 120);
}, { passive: true });
setTimeout(function () { if (hint) hint.classList.add('gone'); }, 3200);

function bindTray() {
  const accent = document.getElementById('tw-accent');
  const bodySize = document.getElementById('tw-body');
  const cover = document.getElementById('tw-cover');
  const numbers = document.getElementById('tw-numbers');
  if (accent) accent.addEventListener('input', function () {
    applyTweaks({ accentColor: accent.value });
    postTweaks({ accentColor: accent.value });
  });
  if (bodySize) bodySize.addEventListener('input', function () {
    const value = Number(bodySize.value);
    applyTweaks({ bodySize: value });
    postTweaks({ bodySize: value });
  });
  if (cover) cover.addEventListener('change', function () {
    applyTweaks({ coverDark: cover.checked });
    postTweaks({ coverDark: cover.checked });
  });
  if (numbers) numbers.addEventListener('change', function () {
    applyTweaks({ showNumbers: numbers.checked });
    postTweaks({ showNumbers: numbers.checked });
  });
}

/* Edit-mode protocol: listener first, announcement second (CONTRACT §6). */
window.addEventListener('message', function (event) {
  const data = event.data || {};
  if (data.type === '__activate_edit_mode') {
    tray.hidden = false;
    root.dataset.editMode = 'on';
  } else if (data.type === '__deactivate_edit_mode') {
    tray.hidden = true;
    root.dataset.editMode = 'off';
  }
});
try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (error) {}

window.addEventListener('load', function () {
  restore();
  if (counter) counter.textContent = (current + 1) + ' / ' + SLIDES.length;
});

bindTray();
applyTweaks(TWEAK_DEFAULTS);
restore();
</script>
</body>
</html>
`
