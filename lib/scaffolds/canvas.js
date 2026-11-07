/**
 * Scaffold `canvas` — multi-variant side-by-side board with tabs.
 *
 * Visual direction: neutral design-tool board (paper grey, hairline cells) that
 * shows three graded first-screen directions for the same product (A spec,
 * B advanced, C avant-garde). Tabs filter the board; every label is real.
 * Self-contained, no external requests, Claude edit-mode Tweaks protocol.
 */
export default String.raw`<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>野簿 · 首屏三档方向</title>
<style>
  :root {
    --board: #ece8dd;
    --board-line: #d8d2c1;
    --cell: #f6f3ea;
    --ink: #1c1b17;
    --ink-soft: #3c3a32;
    --muted: #5d594e;
    --accent: #a84d30;
    --a-bg: #f5f1e6;
    --a-ink: #211f19;
    --b-bg: #1a1b18;
    --b-ink: #efebe0;
    --c-bg: #e4ddc9;
    --c-ink: #24231c;
    --gap: 28px;
    --serif: "Iowan Old Style", "Palatino Linotype", "Source Han Serif SC", "Songti SC", "Noto Serif CJK SC", serif;
    --sans: "Neue Haas Grotesk Text Pro", "Avenir Next", "Segoe UI Variable Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    --mono: "Cascadia Code", "SF Mono", "JetBrains Mono", Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    min-height: 100vh;
    padding: 40px;
    background-color: var(--board);
    background-image: radial-gradient(rgba(93, 89, 78, 0.22) 1px, transparent 1px);
    background-size: 20px 20px;
    color: var(--ink);
    font-family: var(--sans);
    font-size: 16px;
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
  }
  .wrap { max-width: 1360px; margin: 0 auto; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

  .board-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 32px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--board-line);
  }
  .board-head .kicker {
    margin: 0 0 10px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .board-head h1 {
    margin: 0;
    font-family: var(--serif);
    font-size: clamp(30px, 3.6vw, 54px);
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .board-meta {
    flex-shrink: 0;
    font-family: var(--mono);
    font-size: 11px;
    line-height: 1.8;
    letter-spacing: 0.06em;
    color: var(--muted);
    text-align: right;
  }
  .board-meta b { color: var(--ink); font-weight: 500; }

  /* Tabs are the only control: 44px targets, aria-selected drives the filter. */
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px 32px;
    padding: 20px 0 28px;
  }
  .tabs { display: flex; flex-wrap: wrap; gap: 4px; }
  .tab {
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: transparent;
    color: var(--ink-soft);
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
  }
  .tab:hover { border-color: var(--board-line); }
  .tab[aria-selected="true"] { background: var(--ink); color: var(--cell); }
  .toolbar .count { font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em; color: var(--muted); }

  .board {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--gap);
    align-items: start;
  }
  .cell {
    min-width: 0;
    border: 1px solid var(--board-line);
    background: var(--cell);
  }
  .cell[hidden] { display: none; }
  .cell-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--board-line);
  }
  .cell-head .variant {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
  }
  .cell-head b {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.1em;
    color: var(--accent);
  }
  .cell-head strong { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; }
  .cell-head small {
    overflow: hidden;
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.04em;
    color: var(--muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .grade {
    flex-shrink: 0;
    padding: 4px 8px;
    border: 1px solid var(--board-line);
    border-radius: 999px;
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  body.hide-grades .grade { display: none; }

  /* Each frame holds a real first screen, built only from type, rules and color. */
  .frame { position: relative; aspect-ratio: 4 / 3; overflow: hidden; }
  .hero {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    padding: clamp(20px, 3vw, 32px);
  }
  .hero .hero-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .brand-mark { font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; }
  .hero .hero-meta { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.72; }
  .hero h2 {
    margin: 0;
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.05;
    text-wrap: balance;
  }
  .hero p { margin: 0; }
  .hero .cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid currentColor;
    border-radius: 2px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    text-decoration: none;
    transition: background 140ms ease, color 140ms ease;
  }

  /* A — spec version: follows the system, serif display, calm rhythm. */
  .hero-a { background: var(--a-bg); color: var(--a-ink); }
  .hero-a .frame-rule { height: 1px; background: #c9c2ad; margin: 10px 0 18px; }
  .hero-a h2 { font-family: var(--serif); font-size: clamp(26px, 3vw, 40px); max-width: 15ch; }
  .hero-a p.lede { max-width: 30ch; margin-top: 12px; font-size: clamp(14px, 1.3vw, 16px); line-height: 1.6; color: #57534a; }
  .hero-a .cta { color: var(--a-ink); margin-top: 16px; }
  .hero-a .cta:hover { background: var(--a-ink); color: var(--a-bg); }

  /* B — advanced: inverted ink surface, grotesque headline, one clay signal. */
  .hero-b { background: var(--b-bg); color: var(--b-ink); }
  .hero-b .brand-mark { color: #d48a68; }
  .hero-b h2 { font-size: clamp(28px, 3.4vw, 46px); max-width: 12ch; }
  .hero-b h2 em { font-style: normal; color: #d48a68; }
  .hero-b p.lede { max-width: 32ch; margin-top: 16px; font-size: clamp(14px, 1.3vw, 16px); line-height: 1.65; color: rgba(239, 235, 224, 0.78); }
  .hero-b .cta { color: #d48a68; border-color: #d48a68; align-self: flex-start; }
  .hero-b .cta:hover { background: #d48a68; color: var(--b-bg); border-color: #d48a68; }

  /* C — avant-garde: oversized outline numeral, rotated label, paper print. */
  .hero-c { background: var(--c-bg); color: var(--c-ink); }
  .hero-c .rotated {
    position: absolute;
    top: 32px;
    right: 24px;
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    writing-mode: vertical-rl;
    opacity: 0.62;
  }
  .hero-c h2 {
    margin-top: 8px;
    font-family: var(--serif);
    font-size: clamp(30px, 3.8vw, 52px);
    line-height: 0.98;
    max-width: 9ch;
  }
  .hero-c .outline {
    display: block;
    color: transparent;
    -webkit-text-stroke: 1px var(--c-ink);
  }
  .hero-c p.lede { max-width: 26ch; margin-top: 16px; font-size: clamp(14px, 1.3vw, 16px); line-height: 1.65; color: #514f43; }
  .hero-c .cta { color: var(--c-ink); border: 0; border-bottom: 2px solid var(--c-ink); border-radius: 0; padding: 0 0 8px; min-height: 44px; align-self: flex-start; }
  .hero-c .cta:hover { background: transparent; border-bottom-color: var(--accent); color: var(--accent); }

  .cell-foot {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-top: 1px solid var(--board-line);
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.05em;
    color: var(--muted);
  }
  .cell-foot span:last-child { text-align: right; }

  .board-foot {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12px 32px;
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid var(--board-line);
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.05em;
    color: var(--muted);
  }

  /* Tweaks tray. */
  .tray {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 30;
    width: 252px;
    padding: 16px;
    border-radius: 12px;
    background: rgba(28, 27, 23, 0.96);
    color: #f6f3ea;
    font-family: var(--mono);
    font-size: 11px;
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.32);
  }
  .tray[hidden] { display: none; }
  .tray h3 { margin: 0 0 8px; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #d48a68; }
  .tray label { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 0; }
  .tray input[type="color"] { width: 42px; height: 24px; border: 1px solid rgba(246, 243, 234, 0.34); background: none; padding: 0; }
  .tray input[type="range"] { width: 112px; accent-color: #d48a68; }

  /* Board goes one column below 900, and the cells stay full-bleed at 375. */
  @media (max-width: 1080px) {
    .board { grid-template-columns: 1fr 1fr; }
    .cell[data-variant="c"] { grid-column: 1 / -1; }
    .cell[data-variant="c"] .frame { aspect-ratio: 16 / 8; }
  }
  @media (max-width: 760px) {
    body { padding: 20px; }
    .board-head { flex-direction: column; align-items: flex-start; gap: 12px; }
    .board-meta { text-align: left; }
    .board { grid-template-columns: 1fr; }
    .cell[data-variant="c"] { grid-column: auto; }
    .cell[data-variant="c"] .frame, .frame { aspect-ratio: 4 / 3; }
    .toolbar { padding: 16px 0 20px; }
    .tab { min-height: 44px; padding: 0 14px; font-size: 13px; }
    .tray { left: 16px; right: 16px; bottom: 16px; width: auto; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }
  button, input, select, textarea { font: inherit; }
</style>
</head>
<body>
<div class="wrap">
  <header class="board-head">
    <div>
      <p class="kicker">设计台 · 多方案画布</p>
      <h1>野簿 · 首屏三档方向</h1>
    </div>
    <div class="board-meta">
      <span>项目 <b>dsg-20260312-1010-a7f2</b></span><br>
      <span>第 <b>2</b> 轮 · 3 个方案 · 1440 / 768 / 375</span><br>
      <span>规范 → 进阶 → 前卫</span>
    </div>
  </header>

  <div class="toolbar">
    <div class="tabs" role="tablist" aria-label="方案筛选">
      <button class="tab" type="button" role="tab" aria-selected="true" data-filter="all">全部方案</button>
      <button class="tab" type="button" role="tab" aria-selected="false" data-filter="a">A 规范版</button>
      <button class="tab" type="button" role="tab" aria-selected="false" data-filter="b">B 进阶版</button>
      <button class="tab" type="button" role="tab" aria-selected="false" data-filter="c">C 前卫版</button>
    </div>
    <span class="count" id="count">3 / 3 个方案</span>
  </div>

  <div class="board" id="board" data-filter="all">
    <article class="cell" data-variant="a">
      <div class="cell-head">
        <div class="variant"><b>A</b><strong>规范版</strong><small>系统内 · 零冒险</small></div>
        <span class="grade">A · 92</span>
      </div>
      <div class="frame">
        <div class="hero hero-a">
          <div class="hero-top">
            <span class="brand-mark">野簿 Fieldnote</span>
            <span class="hero-meta">野外记录 / 2026</span>
          </div>
          <div class="frame-rule"></div>
          <div>
            <h2>把野外的观察带回桌面</h2>
            <p class="lede">为田野研究者设计的记录工具：离线可用、按地点归档、导出直接进入写作。</p>
            <a class="cta" href="#cell-a"><span>开始记录</span></a>
          </div>
        </div>
      </div>
      <div class="cell-foot"><span>衬线标题 · 8px 栅格 · 单色强调</span><span>首屏 1440 · 内容 660</span></div>
    </article>

    <article class="cell" data-variant="b">
      <div class="cell-head">
        <div class="variant"><b>B</b><strong>进阶版</strong><small>系统上加一次反转</small></div>
        <span class="grade">A- · 90</span>
      </div>
      <div class="frame">
        <div class="hero hero-b">
          <div class="hero-top">
            <span class="brand-mark">野簿 Fieldnote</span>
            <span class="hero-meta">Offline first</span>
          </div>
          <div>
            <h2>记录发生在<br><em>信号之外</em></h2>
            <p class="lede">离线的字段、可追溯的坐标、能直接交给编辑的导出格式。工具退到背景，观察留在前面。</p>
            <a class="cta" href="#cell-b"><span>了解工作流</span></a>
          </div>
        </div>
      </div>
      <div class="cell-foot"><span>深色首屏 · 无衬线标题 · 陶土信号色</span><span>首屏 1440 · 内容 720</span></div>
    </article>

    <article class="cell" data-variant="c">
      <div class="cell-head">
        <div class="variant"><b>C</b><strong>前卫版</strong><small>跳出系统 · 印刷隐喻</small></div>
        <span class="grade">B+ · 84</span>
      </div>
      <div class="frame">
        <div class="hero hero-c">
          <span class="rotated">Field notebook / issue 03</span>
          <div class="hero-top">
            <span class="brand-mark">野簿 03</span>
            <span class="hero-meta">纸本 · 离线</span>
          </div>
          <div>
            <h2><span class="outline">带走</span>你的野外</h2>
            <p class="lede">一册可以离线填写的观察簿：地点、天气、物种、随手画。回来之后，它已经是可以引用的记录。</p>
            <a class="cta" href="#cell-c"><span>翻到示例页</span></a>
          </div>
        </div>
      </div>
      <div class="cell-foot"><span>描边大字 · 竖排标签 · 纸感背景</span><span>首屏 1440 · 内容 600</span></div>
    </article>
  </div>

  <footer class="board-foot">
    <span>点上方标签单独查看某一档 · 方案差异写在每格顶部</span>
    <span>设计台 · 变体由 agent 写入 design/ 文件夹</span>
  </footer>
</div>

<div class="tray" id="tweaks" hidden>
  <h3>Tweaks · 画布</h3>
  <label>强调色 <input type="color" id="tw-accent" value="#a84d30"></label>
  <label>网格间距 <input type="range" id="tw-gap" min="12" max="48" step="4" value="28"><output id="tw-gap-out">28px</output></label>
  <label>显示评级 <input type="checkbox" id="tw-grades" checked></label>
  <label>纸面留白 <input type="range" id="tw-pad" min="20" max="56" step="4" value="40"><output id="tw-pad-out">40px</output></label>
</div>

<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#a84d30",
  "gap": 28,
  "showGrades": true,
  "boardPadding": 40
}/*EDITMODE-END*/;

const root = document.documentElement;
const body = document.body;
const tray = document.getElementById('tweaks');
const count = document.getElementById('count');
const tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
const cells = Array.prototype.slice.call(document.querySelectorAll('.cell'));

function applyTweaks(edits) {
  const v = Object.assign({}, TWEAK_DEFAULTS, edits || {});
  root.style.setProperty('--accent', v.accentColor);
  root.style.setProperty('--gap', v.gap + 'px');
  body.style.padding = v.boardPadding + 'px';
  body.classList.toggle('hide-grades', v.showGrades === false);
  const accent = document.getElementById('tw-accent');
  const gap = document.getElementById('tw-gap');
  const gapOut = document.getElementById('tw-gap-out');
  const grades = document.getElementById('tw-grades');
  const pad = document.getElementById('tw-pad');
  const padOut = document.getElementById('tw-pad-out');
  if (accent) accent.value = v.accentColor;
  if (gap) gap.value = v.gap;
  if (gapOut) gapOut.textContent = v.gap + 'px';
  if (grades) grades.checked = v.showGrades !== false;
  if (pad) pad.value = v.boardPadding;
  if (padOut) padOut.textContent = v.boardPadding + 'px';
  return v;
}
window.__dsApplyTweaks = applyTweaks;

function postTweaks(edits) {
  try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: edits }, '*'); } catch (error) {}
}

function filter(value) {
  tabs.forEach(function (tab) {
    tab.setAttribute('aria-selected', tab.dataset.filter === value ? 'true' : 'false');
  });
  let shown = 0;
  cells.forEach(function (cell) {
    const visible = value === 'all' || cell.dataset.variant === value;
    cell.hidden = !visible;
    if (visible) shown += 1;
  });
  if (count) count.textContent = shown + ' / ' + cells.length + ' 个方案';
}

tabs.forEach(function (tab) {
  tab.addEventListener('click', function () { filter(tab.dataset.filter); });
});

function bindTray() {
  const accent = document.getElementById('tw-accent');
  const gap = document.getElementById('tw-gap');
  const grades = document.getElementById('tw-grades');
  const pad = document.getElementById('tw-pad');
  if (accent) accent.addEventListener('input', function () {
    applyTweaks({ accentColor: accent.value });
    postTweaks({ accentColor: accent.value });
  });
  if (gap) gap.addEventListener('input', function () {
    const value = Number(gap.value);
    applyTweaks({ gap: value });
    postTweaks({ gap: value });
  });
  if (grades) grades.addEventListener('change', function () {
    applyTweaks({ showGrades: grades.checked });
    postTweaks({ showGrades: grades.checked });
  });
  if (pad) pad.addEventListener('input', function () {
    const value = Number(pad.value);
    applyTweaks({ boardPadding: value });
    postTweaks({ boardPadding: value });
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

window.addEventListener('keydown', function (event) {
  const tag = event.target && event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (event.key === 't' || event.key === 'T') tray.hidden = !tray.hidden;
});

bindTray();
applyTweaks(TWEAK_DEFAULTS);
filter('all');
</script>
</body>
</html>
`
