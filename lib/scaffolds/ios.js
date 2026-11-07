/**
 * Scaffold `ios` — phone app screen, iOS metrics (393 × 852 CSS px).
 *
 * Visual direction: warm paper + deep tide teal, serif screen titles against a
 * grotesque UI body, real status bar / home indicator / safe areas, 44px targets.
 * Self-contained, no external requests, Claude edit-mode Tweaks protocol.
 */
export default String.raw`<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>汐表 · 今日潮汐</title>
<style>
  :root {
    --bg: #f6f2e9;
    --surface: #fffdf6;
    --surface-2: #efe9da;
    --ink: #1c1b17;
    --ink-soft: #3c3a31;
    --muted: #5f5a4f;
    --hair: #ded7c5;
    --accent: #1f5f63;
    --accent-ink: #174a4d;
    --accent-soft: #d9e8e3;
    --base: 15px;
    --serif: "Iowan Old Style", "Palatino Linotype", "Songti SC", "Noto Serif CJK SC", serif;
    --sans: "SF Pro Text", "Segoe UI Variable Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    --mono: "SF Mono", "Cascadia Code", "JetBrains Mono", Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    min-height: 100vh;
    background: #cfc9ba;
    color: var(--ink);
    font-family: var(--sans);
    font-size: var(--base);
    line-height: 1.45;
    -webkit-text-size-adjust: 100%;
  }
  .phone {
    position: relative;
    display: flex;
    flex-direction: column;
    width: min(100%, 393px);
    height: 852px;
    margin: 0 auto;
    background: var(--bg);
    overflow: hidden;
  }
  .screen { display: flex; flex-direction: column; flex: 1; min-height: 0; }

  /* Status bar: fixed 54px, matching the iPhone safe area. */
  .status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 54px;
    padding: 12px 28px 0 32px;
    flex-shrink: 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }
  .status-icons { display: flex; align-items: center; gap: 6px; color: var(--ink); }
  .status-icons svg { display: block; }

  /* Navigation row: 44px minimum target on both sides. */
  .navbar {
    display: grid;
    grid-template-columns: 44px 1fr 44px;
    align-items: center;
    padding: 0 12px;
    flex-shrink: 0;
  }
  .navbar .title { text-align: center; font-size: 15px; font-weight: 600; letter-spacing: 0.01em; }
  .icon-btn {
    width: 44px; height: 44px;
    display: grid; place-items: center;
    padding: 0;
    border: 0; border-radius: 12px;
    background: transparent; color: var(--ink);
    cursor: pointer;
  }
  .icon-btn:hover { background: rgba(28, 27, 23, 0.06); }
  .icon-btn:focus-visible, .tab:focus-visible, .row:focus-visible, .task-toggle:focus-visible {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }

  .content { flex: 1; padding: 0 20px 16px; overflow-y: auto; }
  .eyebrow {
    display: flex; align-items: center; gap: 8px;
    margin: 4px 0 0;
    font-family: var(--mono); font-size: 14px;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent-ink);
  }
  .eyebrow::before { content: ""; width: 20px; height: 1px; background: var(--accent); }
  h1 {
    margin: 0 0 14px;
    font-family: var(--serif);
    font-size: 34px; font-weight: 600; line-height: 1.1;
    letter-spacing: -0.02em;
  }
  body.sans-title h1, body.sans-title .readout b { font-family: var(--sans); font-weight: 700; }

  /* Current-tide card: the one focal surface on the screen. */
  .tide-card {
    padding: 16px;
    border-radius: 24px;
    background: var(--accent);
    color: #f7f4ea;
    box-shadow: 0 12px 28px rgba(31, 95, 99, 0.18);
  }
  .tide-card .label {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 14px; letter-spacing: 0.02em; color: rgba(247, 244, 234, 0.9);
  }
  .tide-card .label .live {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
  }
  .tide-card .label .live::before {
    content: ""; width: 6px; height: 6px; border-radius: 999px;
    background: #f2c98c;
  }
  .readout { display: flex; align-items: baseline; gap: 8px; margin: 8px 0 0; }
  .readout b { font-family: var(--serif); font-size: 52px; font-weight: 600; line-height: 1; letter-spacing: -0.03em; }
  .readout span { font-size: 17px; color: rgba(247, 244, 234, 0.85); }
  .tide-card .delta { margin: 0; font-size: 14px; color: rgba(247, 244, 234, 0.9); }

  /* Chart is computed data drawn with SVG; labelled as sample data below. */
  .chart { display: block; width: 100%; height: auto; margin: 8px 0 0; }
  .chart .grid { stroke: rgba(247, 244, 234, 0.24); stroke-width: 1; }
  .chart .axis { stroke: rgba(247, 244, 234, 0.5); stroke-width: 1; }
  .chart .curve { fill: none; stroke: #f7ecd8; stroke-width: 2; stroke-linecap: round; }
  .chart .dot { fill: #f7ecd8; }
  .chart-times {
    display: flex;
    justify-content: space-between;
    margin: 8px 0 0;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.04em;
    color: rgba(247, 244, 234, 0.82);
  }
  body.no-chart .chart, body.no-chart .chart-times { display: none; }

  .section-head {
    display: flex; justify-content: space-between; align-items: baseline;
    margin: 16px 0 4px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--hair);
  }
  .section-head h2 { margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
  .section-head span { font-family: var(--mono); font-size: 14px; letter-spacing: 0.08em; color: var(--muted); }

  .rows { margin: 0; padding: 0; list-style: none; }
  .row {
    display: grid;
    grid-template-columns: 92px 1fr auto;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    border-bottom: 1px solid var(--hair);
  }
  .row:last-child { border-bottom: 0; }
  .row time { font-family: var(--mono); font-size: 14px; color: var(--ink-soft); }
  .row .what { font-size: 14px; color: var(--ink); }
  .row .what small { display: block; font-size: 14px; line-height: 1.45; color: var(--muted); }
  .row output { font-family: var(--mono); font-size: 13px; color: var(--ink-soft); }

  .conditions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    margin: 0 0 8px;
    background: var(--hair);
    border: 1px solid var(--hair);
    border-radius: 16px;
    overflow: hidden;
  }
  .conditions div { padding: 8px 12px; background: var(--surface); }
  .conditions dt { margin: 0 0 4px; font-size: 12px; color: var(--muted); }
  .conditions dd { margin: 0; font-family: var(--mono); font-size: 14px; color: var(--ink); }

  .footnote {
    margin: 12px 0 0;
    font-family: var(--mono);
    font-size: 14px;
    letter-spacing: 0.04em;
    line-height: 1.5;
    color: var(--muted);
  }

  /* Bottom tab bar + home indicator, inside the simulated safe area. */
  .tabbar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    flex-shrink: 0;
    padding: 8px 8px 0;
    border-top: 1px solid var(--hair);
    background: rgba(255, 253, 246, 0.94);
  }
  .tab {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 3px;
    min-height: 48px;
    padding: 4px 0;
    border: 0; border-radius: 12px;
    background: transparent; color: var(--muted);
    font-family: var(--sans); font-size: 10px; letter-spacing: 0.03em;
    cursor: pointer;
  }
  .tab[aria-selected="true"] { color: var(--accent-ink); }
  .tab[aria-selected="true"] svg { color: var(--accent); }
  .home-indicator {
    flex-shrink: 0;
    display: grid; place-items: center;
    height: 32px;
    background: rgba(255, 253, 246, 0.94);
  }
  .home-indicator i { width: 134px; height: 4px; border-radius: 4px; background: var(--ink); opacity: 0.28; }

  /* Edit-mode Tweaks sheet. */
  .tray {
    position: absolute;
    left: 16px; right: 16px; bottom: 96px;
    z-index: 20;
    padding: 16px;
    border-radius: 16px;
    background: rgba(28, 27, 23, 0.96);
    color: #f6f2e9;
    font-family: var(--mono);
    font-size: 11px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
  }
  .tray[hidden] { display: none; }
  .tray h3 { margin: 0 0 8px; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #f2c98c; }
  .tray label { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 0; }
  .tray input[type="color"] { width: 42px; height: 24px; border: 1px solid rgba(246, 242, 233, 0.4); background: none; padding: 0; }
  .tray input[type="range"] { width: 112px; accent-color: #f2c98c; }

  /* Dark theme re-picks every role; it is not a simple inversion. */
  body.dark {
    --bg: #14171a;
    --surface: #1c2024;
    --surface-2: #23282d;
    --ink: #ecefe8;
    --ink-soft: #c8ccc4;
    --muted: #a2a69d;
    --hair: #333940;
    --accent: #2f7f83;
    --accent-ink: #83c9c6;
    --accent-soft: #223a3a;
  }
  body.dark .tabbar, body.dark .home-indicator { background: rgba(28, 32, 36, 0.94); }
  body.dark .tabbar { border-color: var(--hair); }
  body.dark .home-indicator i { background: #ecefe8; opacity: 0.32; }
  body.dark .phone { background: var(--bg); }

  @media (max-width: 392px) {
    .content { padding-left: 16px; padding-right: 16px; }
    h1 { font-size: 33px; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }
  button, input, select, textarea { font: inherit; }
</style>
</head>
<body>
<div class="phone">
  <div class="screen">
    <div class="status" aria-hidden="true">
      <span>9:41</span>
      <span class="status-icons">
        <svg width="18" height="12" viewBox="0 0 18 12"><g fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></g></svg>
        <svg width="17" height="12" viewBox="0 0 17 12"><path fill="currentColor" d="M8.5 2.2c-2.6 0-5 1-6.8 2.7l1.3 1.3a8 8 0 0 1 11 0l1.3-1.3A9.7 9.7 0 0 0 8.5 2.2zm0 3.4c-1.5 0-2.9.6-4 1.6l1.3 1.3a4 4 0 0 1 5.4 0l1.3-1.3a5.7 5.7 0 0 0-4-1.6zm0 3.3c-.6 0-1.1.2-1.5.6L8.5 11l1.5-1.5a2.2 2.2 0 0 0-1.5-.6z"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="21" height="11" rx="3" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="18" height="8" rx="2" fill="currentColor"/><path d="M23 4v4c.9-.3 1.4-1 1.4-2S23.9 4.3 23 4z" fill="currentColor" opacity=".5"/></svg>
      </span>
    </div>

    <div class="navbar">
      <button class="icon-btn" type="button" aria-label="返回">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
      </button>
      <span class="title">南岸观测点</span>
      <button class="icon-btn" type="button" aria-label="更多操作">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>
      </button>
    </div>

    <main class="content">
      <p class="eyebrow">3 月 12 日 · 周四</p>
      <h1>今日潮汐</h1>

      <section class="tide-card" aria-label="当前潮位">
        <div class="label">
          <span>涨潮中 · 当前潮位</span>
          <span class="live">实时</span>
        </div>
        <div class="readout"><b>2.4</b><span>米</span></div>
        <p class="delta">距下一次高潮还有 1 小时 08 分</p>
        <svg class="chart" viewBox="0 0 333 64" role="img" aria-label="今日潮位曲线示意：06:12 低潮、12:40 高潮、18:55 低潮">
          <line class="grid" x1="0" y1="14" x2="333" y2="14"/>
          <line class="grid" x1="0" y1="31" x2="333" y2="31"/>
          <line class="grid" x1="0" y1="48" x2="333" y2="48"/>
          <line class="axis" x1="0" y1="63" x2="333" y2="63"/>
          <path class="curve" d="M0 52 C 36 52 52 24 78 12 S 132 40 166 42 S 224 18 258 15 S 316 35 333 38"/>
          <circle class="dot" cx="78" cy="12" r="3"/>
          <circle class="dot" cx="258" cy="15" r="3"/>
        </svg>
        <div class="chart-times" aria-hidden="true"><span>06:12</span><span>12:40</span><span>18:55</span></div>
      </section>

      <div class="section-head"><h2>接下来</h2><span>未来 3 次</span></div>
      <ul class="rows">
        <li class="row">
          <time datetime="2026-03-12T12:40">12:40</time>
          <span class="what">高潮 <small>东南风 3 级，浪高 0.4 米</small></span>
          <output>2.7 米</output>
        </li>
        <li class="row">
          <time datetime="2026-03-12T18:55">18:55</time>
          <span class="what">低潮 <small>日落前后，适合滩涂观察</small></span>
          <output>0.6 米</output>
        </li>
        <li class="row">
          <time datetime="2026-03-13T01:12">明日 01:12</time>
          <span class="what">高潮 <small>夜间，注意岸线照明</small></span>
          <output>2.9 米</output>
        </li>
      </ul>

      <div class="section-head"><h2>海况</h2><span>观测站 27 号</span></div>
      <dl class="conditions">
        <div><dt>风向</dt><dd>东南 3 级</dd></div>
        <div><dt>水温</dt><dd>14.2 ℃</dd></div>
        <div><dt>能见度</dt><dd>8 公里</dd></div>
      </dl>
      <p class="footnote">示例数据 · 正式版接入本地海洋观测站</p>
    </main>

    <nav class="tabbar" aria-label="主导航">
      <button class="tab" type="button" aria-selected="true">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 17c3-5 6 3 8 0s4-6 8-2"/><circle cx="12" cy="7" r="2.4"/></svg>
        今日
      </button>
      <button class="tab" type="button" aria-selected="false">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4v16M8 8h12M8 12h9M8 16h12"/></svg>
        潮汐表
      </button>
      <button class="tab" type="button" aria-selected="false">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>
        收藏
      </button>
      <button class="tab" type="button" aria-selected="false">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>
        设置
      </button>
    </nav>
    <div class="home-indicator" aria-hidden="true"><i></i></div>

    <div class="tray" id="tweaks" hidden>
      <h3>Tweaks · 汐表</h3>
      <label>主色 <input type="color" id="tw-accent" value="#1f5f63"></label>
      <label>正文字号 <input type="range" id="tw-size" min="14" max="18" step="1" value="15"><output id="tw-size-out">15px</output></label>
      <label>衬线标题 <input type="checkbox" id="tw-serif" checked></label>
      <label>潮位曲线 <input type="checkbox" id="tw-chart" checked></label>
      <label>深色模式 <input type="checkbox" id="tw-dark"></label>
    </div>
  </div>
</div>

<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#1f5f63",
  "baseSize": 15,
  "serifTitle": true,
  "showChart": true,
  "dark": false
}/*EDITMODE-END*/;

const root = document.documentElement;
const body = document.body;
const tray = document.getElementById('tweaks');

function applyTweaks(edits) {
  const v = Object.assign({}, TWEAK_DEFAULTS, edits || {});
  root.style.setProperty('--accent', v.accentColor);
  root.style.setProperty('--base', v.baseSize + 'px');
  body.classList.toggle('sans-title', v.serifTitle === false);
  body.classList.toggle('no-chart', v.showChart === false);
  body.classList.toggle('dark', v.dark === true);
  const accent = document.getElementById('tw-accent');
  const size = document.getElementById('tw-size');
  const serif = document.getElementById('tw-serif');
  const chart = document.getElementById('tw-chart');
  const dark = document.getElementById('tw-dark');
  const sizeOut = document.getElementById('tw-size-out');
  if (accent) accent.value = v.accentColor;
  if (size) size.value = v.baseSize;
  if (serif) serif.checked = v.serifTitle !== false;
  if (chart) chart.checked = v.showChart !== false;
  if (dark) dark.checked = v.dark === true;
  if (sizeOut) sizeOut.textContent = v.baseSize + 'px';
  return v;
}
window.__dsApplyTweaks = applyTweaks;

function postTweaks(edits) {
  try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: edits }, '*'); } catch (error) {}
}

function bindTray() {
  const accent = document.getElementById('tw-accent');
  const size = document.getElementById('tw-size');
  const serif = document.getElementById('tw-serif');
  const chart = document.getElementById('tw-chart');
  const dark = document.getElementById('tw-dark');
  if (accent) accent.addEventListener('input', function () {
    applyTweaks({ accentColor: accent.value });
    postTweaks({ accentColor: accent.value });
  });
  if (size) size.addEventListener('input', function () {
    const value = Number(size.value);
    applyTweaks({ baseSize: value });
    postTweaks({ baseSize: value });
  });
  if (serif) serif.addEventListener('change', function () {
    applyTweaks({ serifTitle: serif.checked });
    postTweaks({ serifTitle: serif.checked });
  });
  if (chart) chart.addEventListener('change', function () {
    applyTweaks({ showChart: chart.checked });
    postTweaks({ showChart: chart.checked });
  });
  if (dark) dark.addEventListener('change', function () {
    applyTweaks({ dark: dark.checked });
    postTweaks({ dark: dark.checked });
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
</script>
</body>
</html>
`
