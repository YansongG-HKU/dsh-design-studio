/**
 * Scaffold `macos` — desktop application window (type-specimen manager).
 *
 * Visual direction: graphite dark app on a paper-grey desk; one warm amber signal,
 * a cream specimen plate, monospaced metadata. Real window chrome + sidebar.
 * Self-contained, no external requests, Claude edit-mode Tweaks protocol.
 */
export default String.raw`<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>字架 · 青黛宋样张</title>
<style>
  :root {
    --desk: #c7c1b2;
    --desk-dot: rgba(96, 90, 76, 0.28);
    --window: #1b1c1e;
    --titlebar: #232427;
    --sidebar: #1f2023;
    --main: #17181a;
    --plate: #efe9dc;
    --plate-ink: #1f201c;
    --text: #ecebe5;
    --text-soft: #c3c2ba;
    --muted: #a8a8a0;
    --line: #303237;
    --line-soft: #3a3d42;
    --accent: #d8a04e;
    --accent-ink: #2a1f0d;
    --specimen: 158px;
    --sans: "Neue Haas Grotesk Text Pro", "Avenir Next", "Segoe UI Variable Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    --serif: "Iowan Old Style", "Palatino Linotype", "Songti SC", "Noto Serif CJK SC", serif;
    --mono: "Cascadia Code", "SF Mono", "JetBrains Mono", Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 40px;
    background-color: var(--desk);
    background-image: radial-gradient(var(--desk-dot) 1px, transparent 1px);
    background-size: 22px 22px;
    color: var(--text);
    font-family: var(--sans);
    font-size: 16px;
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
  }
  button { font: inherit; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .window {
    display: flex;
    flex-direction: column;
    width: min(1160px, 100%);
    height: min(780px, calc(100vh - 80px));
    min-height: 560px;
    overflow: hidden;
    border-radius: 12px;
    background: var(--window);
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.35),
      0 32px 72px rgba(20, 18, 14, 0.34),
      0 8px 20px rgba(20, 18, 14, 0.18);
  }

  /* Title bar: traffic lights + centred document title + toolbar. */
  .titlebar {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    height: 48px;
    padding: 0 14px;
    flex-shrink: 0;
    background: var(--titlebar);
    border-bottom: 1px solid var(--line);
  }
  .lights { display: flex; gap: 8px; }
  .lights i { display: block; width: 12px; height: 12px; border-radius: 50%; }
  .lights i:nth-child(1) { background: #ff5f57; }
  .lights i:nth-child(2) { background: #febc2e; }
  .lights i:nth-child(3) { background: #28c840; }
  .doc-title {
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.04em;
    color: var(--text-soft);
    white-space: nowrap;
    pointer-events: none;
  }
  .toolbar { display: flex; align-items: center; gap: 2px; margin-left: auto; }
  .tool {
    width: 34px; height: 30px;
    display: grid; place-items: center;
    padding: 0;
    border: 0; border-radius: 7px;
    background: transparent;
    color: var(--text-soft);
    cursor: pointer;
  }
  .tool:hover { background: rgba(236, 235, 229, 0.08); color: var(--text); }
  .tool-divider { width: 1px; height: 18px; margin: 0 6px; background: var(--line-soft); }
  .primary {
    height: 30px;
    padding: 0 14px;
    border: 1px solid #b9863c;
    border-radius: 7px;
    background: var(--accent);
    color: var(--accent-ink);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
  }
  .primary:hover { background: #e4b264; }

  .body { display: flex; flex: 1; min-height: 0; }

  /* Sidebar: collections, counts, and one recent list. */
  .sidebar {
    width: 236px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 20px 12px;
    overflow-y: auto;
    background: var(--sidebar);
    border-right: 1px solid var(--line);
  }
  .side-label {
    margin: 0 0 8px;
    padding: 0 10px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .side-list { display: flex; flex-direction: column; gap: 1px; margin: 0; padding: 0; list-style: none; }
  .side-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 36px;
    padding: 0 12px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text-soft);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }
  .side-item:hover { background: rgba(236, 235, 229, 0.07); color: var(--text); }
  .side-item[aria-current="true"] { background: rgba(216, 160, 78, 0.16); color: var(--accent); }
  .side-item .count { margin-left: auto; font-family: var(--mono); font-size: 11px; color: var(--muted); }
  .side-item .swatch { width: 8px; height: 8px; border-radius: 2px; background: currentColor; opacity: 0.7; }
  .side-note {
    margin-top: auto;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--muted);
  }
  .side-note b { display: block; margin-bottom: 4px; color: var(--text-soft); font-weight: 600; }

  /* Main pane: specimen plate on the left, metadata column on the right. */
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    background: var(--main);
  }
  .main-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding: 20px 32px 18px;
    border-bottom: 1px solid var(--line);
  }
  .main-head h1 { margin: 0 0 4px; font-family: var(--serif); font-size: 27px; font-weight: 600; letter-spacing: 0.01em; }
  .main-head p { margin: 0; font-family: var(--mono); font-size: 12px; letter-spacing: 0.08em; color: var(--muted); }
  .head-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
  .tag {
    padding: 4px 10px;
    border: 1px solid var(--line-soft);
    border-radius: 999px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    color: var(--text-soft);
  }
  .tag.solid { border-color: var(--accent); background: rgba(216, 160, 78, 0.14); color: var(--accent); }

  .workspace { display: grid; grid-template-columns: minmax(0, 1fr) 268px; gap: 0; flex: 1; }
  .stage { padding: 20px 32px 20px; border-right: 1px solid var(--line); min-width: 0; }
  .plate {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 260px;
    padding: 24px;
    border-radius: 8px;
    background: var(--plate);
    color: var(--plate-ink);
  }
  .plate .plate-meta {
    display: flex;
    justify-content: space-between;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6b675a;
  }
  .plate .glyph {
    margin: 8px 0;
    font-family: var(--serif);
    font-size: var(--specimen);
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.02em;
    text-align: center;
    color: #23241f;
  }
  .plate .sample {
    margin: 0;
    font-family: var(--serif);
    font-size: 19px;
    line-height: 1.6;
    color: #33342d;
    text-align: center;
  }
  .plate .sample + .sample { margin-top: 8px; font-size: 15px; color: #5b5b50; }
  body.hide-grid .plate .glyph { color: transparent; -webkit-text-stroke: 1px #8a8674; }

  .weights { margin-top: 16px; }
  .weights h2 {
    margin: 0 0 10px;
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .weight-row {
    display: grid;
    grid-template-columns: 52px 1fr auto;
    align-items: baseline;
    gap: 16px;
    padding: 8px 0;
    border-bottom: 1px solid var(--line);
  }
  .weight-row:last-child { border-bottom: 0; }
  .weight-row b { font-family: var(--mono); font-size: 12px; font-weight: 500; color: var(--muted); }
  .weight-row span { font-family: var(--serif); font-size: 20px; color: var(--text); }
  .weight-row em { font-family: var(--mono); font-size: 11px; font-style: normal; color: var(--muted); }

  .meta-pane { padding: 24px 24px 32px; }
  .meta-pane h2 {
    margin: 0 0 14px;
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .meta-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .meta-table th, .meta-table td { padding: 8px 0; text-align: left; vertical-align: top; border-bottom: 1px solid var(--line); }
  .meta-table th { font-weight: 400; color: var(--muted); font-family: var(--mono); font-size: 11px; letter-spacing: 0.04em; }
  .meta-table td { color: var(--text-soft); font-family: var(--mono); font-size: 12px; }
  .chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 0; }
  .glyph-chip {
    display: grid; place-items: center;
    width: 40px; height: 40px;
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    background: rgba(236, 235, 229, 0.03);
    font-family: var(--serif);
    font-size: 17px;
    color: var(--text);
  }
  .meta-note { margin: 16px 0 0; font-size: 12px; line-height: 1.6; color: var(--muted); }

  /* Window status bar: counts on the left, zoom control on the right. */
  .statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 36px;
    padding: 4px 16px;
    flex-shrink: 0;
    border-top: 1px solid var(--line);
    background: var(--titlebar);
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.05em;
    color: var(--muted);
  }
  .zoom { display: flex; align-items: center; gap: 2px; }
  .zoom button {
    width: 32px; height: 24px;
    border: 0; border-radius: 4px;
    background: transparent;
    color: var(--text-soft);
    cursor: pointer;
  }
  .zoom button:hover { background: rgba(236, 235, 229, 0.08); }

  /* Tweaks tray (edit mode only). */
  .tray {
    position: fixed;
    right: 24px; bottom: 24px;
    z-index: 40;
    width: 248px;
    padding: 14px 16px;
    border: 1px solid var(--line-soft);
    border-radius: 12px;
    background: rgba(27, 28, 30, 0.97);
    color: var(--text);
    font-family: var(--mono);
    font-size: 11px;
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.4);
  }
  .tray[hidden] { display: none; }
  .tray h3 { margin: 0 0 8px; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); }
  .tray label { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 0; }
  .tray input[type="color"] { width: 42px; height: 24px; border: 1px solid var(--line-soft); background: none; padding: 0; }
  .tray input[type="range"] { width: 110px; accent-color: var(--accent); }

  /* App-level light theme: re-derived surfaces, not an inversion. */
  body.light {
    --window: #f4f1e8;
    --titlebar: #e8e4d8;
    --sidebar: #ece8dc;
    --main: #f7f4ec;
    --text: #1d1e1a;
    --text-soft: #44453d;
    --muted: #5f5e53;
    --line: #d8d2c2;
    --line-soft: #cdc6b4;
    --plate: #1d1e1a;
    --plate-ink: #efe9dc;
    --accent: #9a5c1f;
    --accent-ink: #fdf6e6;
  }
  body.light .weight-row span { color: var(--text); }
  body.light .glyph-chip { background: rgba(29, 30, 26, 0.04); }
  body.light .plate .glyph { color: #f2ecdc; }
  body.light .plate .sample { color: #e4ddcb; }
  body.light .plate .sample + .sample { color: #b9b3a2; }
  body.light .plate .plate-meta { color: #a7a08d; }
  body.light.hide-grid .plate .glyph { color: transparent; -webkit-text-stroke: 1px #8f8874; }
  body.light .side-item[aria-current="true"] { background: rgba(154, 92, 31, 0.14); }
  body.light .side-item:hover { background: rgba(29, 30, 26, 0.06); }
  body.light .tool:hover { background: rgba(29, 30, 26, 0.07); }
  body.light .tray { background: #232420; color: #f2eee0; }
  body.light .primary { border-color: #7c4a17; }

  @media (max-width: 900px) {
    body { padding: 20px; }
    .window { height: auto; min-height: 620px; }
    .sidebar { width: 188px; }
    .workspace { grid-template-columns: 1fr; }
    .stage { border-right: 0; border-bottom: 1px solid var(--line); }
    .meta-pane { padding-top: 16px; }
  }
  @media (max-width: 600px) {
    body { display: block; padding: 0; background-image: none; }
    .window { width: 100%; min-height: 100vh; border-radius: 0; box-shadow: none; }
    .titlebar { height: 56px; }
    .tool { width: 44px; height: 44px; }
    .primary { height: 44px; padding: 0 16px; }
    .sidebar { display: none; }
    .main-head { flex-direction: column; padding: 20px; }
    .head-tags { justify-content: flex-start; }
    .stage { padding: 20px; }
    .plate { min-height: 280px; padding: 20px; }
    .plate .glyph { font-size: clamp(120px, 44vw, 190px); }
    .meta-pane { padding: 16px 20px 24px; }
    .statusbar { flex-wrap: wrap; min-height: 44px; }
    .zoom button { width: 44px; height: 44px; }
    .tray { left: 16px; right: 16px; bottom: 16px; width: auto; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }
  button, input, select, textarea { font: inherit; }
</style>
</head>
<body>
<div class="window">
  <div class="titlebar">
    <div class="lights" aria-hidden="true"><i></i><i></i><i></i></div>
    <span class="doc-title">青黛宋 · 样张 — 字架</span>
    <div class="toolbar">
      <button class="tool" type="button" aria-label="搜索字体">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/></svg>
      </button>
      <button class="tool" type="button" aria-label="网格视图">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>
      </button>
      <span class="tool-divider" aria-hidden="true"></span>
      <button class="primary" type="button">导出样张</button>
    </div>
  </div>

  <div class="body">
    <nav class="sidebar" aria-label="字体库">
      <div>
        <p class="side-label">收藏</p>
        <ul class="side-list">
          <li><button class="side-item" type="button" aria-current="true"><span class="swatch"></span>全部样张<span class="count">128</span></button></li>
          <li><button class="side-item" type="button"><span class="swatch"></span>中文<span class="count">42</span></button></li>
          <li><button class="side-item" type="button"><span class="swatch"></span>西文<span class="count">76</span></button></li>
          <li><button class="side-item" type="button"><span class="swatch"></span>等宽<span class="count">10</span></button></li>
        </ul>
      </div>
      <div>
        <p class="side-label">最近打开</p>
        <ul class="side-list">
          <li><button class="side-item" type="button">青黛宋</button></li>
          <li><button class="side-item" type="button">白鹭黑</button></li>
          <li><button class="side-item" type="button">砚台楷</button></li>
          <li><button class="side-item" type="button">Berkeley Mono</button></li>
        </ul>
      </div>
      <div class="side-note">
        <b>字架 2.4</b>
        本地字体档案。所有样张、字重与授权状态只存在这台机器上。
      </div>
    </nav>

    <main class="main">
      <header class="main-head">
        <div>
          <h1>青黛宋</h1>
          <p>QINGDAI SERIF · 中文宋体 · 5 个字重</p>
        </div>
        <div class="head-tags">
          <span class="tag solid">已授权</span>
          <span class="tag">可变字体</span>
          <span class="tag">简体中文</span>
        </div>
      </header>

      <div class="workspace">
        <section class="stage" aria-label="样张">
          <div class="plate">
            <div class="plate-meta"><span>样张 / 常规</span><span>2026 · 字架</span></div>
            <div class="glyph" aria-hidden="true">永</div>
            <div>
              <p class="sample">山川异域，风月同天。</p>
              <p class="sample">The quiet weight of a serif, set at reading size.</p>
            </div>
          </div>

          <div class="weights">
            <h2>字重 / 5 档</h2>
            <div class="weight-row"><b>200</b><span style="font-weight:200">永 和 九 年</span><em>Light</em></div>
            <div class="weight-row"><b>400</b><span style="font-weight:400">永 和 九 年</span><em>Regular</em></div>
            <div class="weight-row"><b>600</b><span style="font-weight:600">永 和 九 年</span><em>Semibold</em></div>
            <div class="weight-row"><b>800</b><span style="font-weight:800">永 和 九 年</span><em>Bold</em></div>
          </div>
        </section>

        <aside class="meta-pane" aria-label="字体信息">
          <h2>字体信息</h2>
          <table class="meta-table">
            <tbody>
              <tr><th>设计</th><td>字架工作室</td></tr>
              <tr><th>首发</th><td>2025-11</td></tr>
              <tr><th>字符集</th><td>GB18030 / 27,842 字</td></tr>
              <tr><th>文件</th><td>QingdaiSerif-VF.woff2</td></tr>
              <tr><th>许可</th><td>桌面 5 台 / 嵌入</td></tr>
              <tr><th>版本</th><td>1.2.0</td></tr>
            </tbody>
          </table>
          <h2 style="margin-top:24px">样本字符</h2>
          <div class="chip-row" aria-hidden="true">
            <span class="glyph-chip">永</span><span class="glyph-chip">青</span><span class="glyph-chip">黛</span>
            <span class="glyph-chip">山</span><span class="glyph-chip">川</span><span class="glyph-chip">纸</span>
          </div>
          <p class="meta-note">样张为虚构字体的设计示意，用于展示桌面应用窗口的信息层级与排版节奏。</p>
        </aside>
      </div>
    </main>
  </div>

  <div class="statusbar">
    <span>128 个字体家族 · 6,240 个样张 · 本地档案</span>
    <span class="zoom">
      <button type="button" aria-label="缩小">−</button>
      <span id="zoom-label">100%</span>
      <button type="button" aria-label="放大">+</button>
    </span>
  </div>
</div>

<div class="tray" id="tweaks" hidden>
  <h3>Tweaks · 字架</h3>
  <label>强调色 <input type="color" id="tw-accent" value="#d8a04e"></label>
  <label>样张字号 <input type="range" id="tw-specimen" min="110" max="260" step="10" value="190"><output id="tw-specimen-out">190px</output></label>
  <label>网格框 <input type="checkbox" id="tw-grid"></label>
  <label>浅色界面 <input type="checkbox" id="tw-light"></label>
</div>

<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#d8a04e",
  "specimenSize": 190,
  "showGrid": false,
  "light": false
}/*EDITMODE-END*/;

const root = document.documentElement;
const body = document.body;
const tray = document.getElementById('tweaks');

function applyTweaks(edits) {
  const v = Object.assign({}, TWEAK_DEFAULTS, edits || {});
  root.style.setProperty('--accent', v.accentColor);
  root.style.setProperty('--specimen', v.specimenSize + 'px');
  body.classList.toggle('hide-grid', v.showGrid === true);
  body.classList.toggle('light', v.light === true);
  const accent = document.getElementById('tw-accent');
  const specimen = document.getElementById('tw-specimen');
  const specimenOut = document.getElementById('tw-specimen-out');
  const grid = document.getElementById('tw-grid');
  const light = document.getElementById('tw-light');
  if (accent) accent.value = v.accentColor;
  if (specimen) specimen.value = v.specimenSize;
  if (specimenOut) specimenOut.textContent = v.specimenSize + 'px';
  if (grid) grid.checked = v.showGrid === true;
  if (light) light.checked = v.light === true;
  return v;
}
window.__dsApplyTweaks = applyTweaks;

function postTweaks(edits) {
  try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: edits }, '*'); } catch (error) {}
}

function bindTray() {
  const accent = document.getElementById('tw-accent');
  const specimen = document.getElementById('tw-specimen');
  const grid = document.getElementById('tw-grid');
  const light = document.getElementById('tw-light');
  if (accent) accent.addEventListener('input', function () {
    applyTweaks({ accentColor: accent.value });
    postTweaks({ accentColor: accent.value });
  });
  if (specimen) specimen.addEventListener('input', function () {
    const value = Number(specimen.value);
    applyTweaks({ specimenSize: value });
    postTweaks({ specimenSize: value });
  });
  if (grid) grid.addEventListener('change', function () {
    applyTweaks({ showGrid: grid.checked });
    postTweaks({ showGrid: grid.checked });
  });
  if (light) light.addEventListener('change', function () {
    applyTweaks({ light: light.checked });
    postTweaks({ light: light.checked });
  });
}

/* Small real interactions: sidebar selection and zoom readout. */
document.querySelectorAll('.side-item').forEach(function (button) {
  button.addEventListener('click', function () {
    document.querySelectorAll('.side-item').forEach(function (item) { item.removeAttribute('aria-current'); });
    button.setAttribute('aria-current', 'true');
  });
});
var zoomLevel = 100;
var zoomLabel = document.getElementById('zoom-label');
document.querySelectorAll('.zoom button').forEach(function (button, index) {
  button.addEventListener('click', function () {
    zoomLevel = Math.min(160, Math.max(60, zoomLevel + (index === 0 ? -10 : 10)));
    if (zoomLabel) zoomLabel.textContent = zoomLevel + '%';
  });
});

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
</script>
</body>
</html>
`
