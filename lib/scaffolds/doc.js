/**
 * Scaffold `doc` — A4 one-page document (@page size A4, print-safe).
 *
 * Visual direction: clinical editorial memo — serif body, grotesque section
 * headings, monospaced labels and table figures. One page exactly, on screen and
 * on paper. Self-contained, no external requests, Claude edit-mode Tweaks protocol.
 */
export default String.raw`<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>盐度与潮位联合观测 · 方法备忘录</title>
<style>
  @page { size: A4; margin: 18mm; }

  :root {
    --desk: #d6d2c6;
    --paper: #fbfaf5;
    --ink: #14161a;
    --ink-soft: #2f333a;
    --muted: #5b6069;
    --rule: #cfcbbf;
    --accent: #2d4f6b;
    --accent-soft: #dde5ec;
    --body-size: 12pt;
    --leading: 1.5;
    --serif: "Iowan Old Style", "Palatino Linotype", "Source Han Serif SC", "Songti SC", "Noto Serif CJK SC", serif;
    --sans: "Neue Haas Grotesk Text Pro", "Avenir Next", "Segoe UI Variable Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    --mono: "Cascadia Code", "SF Mono", "JetBrains Mono", Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    min-height: 100vh;
    padding: 24px;
    background: var(--desk);
    color: var(--ink);
    font-family: var(--serif);
    font-size: var(--body-size);
    line-height: var(--leading);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

  /* Screen sheet previews the A4 page; print drops the mat. */
  .sheet {
    width: min(100%, 794px);
    aspect-ratio: 210 / 297;
    margin: 0 auto;
    padding: 6.9% 6.9% 5.7%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--paper);
    color: var(--ink);
    box-shadow: 0 18px 48px rgba(49, 45, 36, 0.26), 0 2px 5px rgba(49, 45, 36, 0.14);
  }

  .masthead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    padding-bottom: 2mm;
    border-bottom: 1.5px solid var(--ink);
  }
  .org { font-family: var(--mono); font-size: 12pt; letter-spacing: 0.16em; text-transform: uppercase; }
  .memo-ref { font-family: var(--mono); font-size: 12pt; letter-spacing: 0.04em; color: var(--muted); text-align: right; }

  .head { padding: 3.5mm 0 3mm; border-bottom: 1px solid var(--rule); }
  .doc-kicker {
    margin: 0 0 3mm;
    font-family: var(--mono);
    font-size: 12pt;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--accent);
  }
  h1 {
    margin: 0 0 3mm;
    font-family: var(--sans);
    font-size: 24pt;
    font-weight: 650;
    line-height: 1.15;
    letter-spacing: -0.02em;
  }
  .subtitle {
    margin: 0;
    max-width: 46ch;
    font-size: 13pt;
    line-height: 1.5;
    color: var(--ink-soft);
  }
  .byline {
    display: flex;
    flex-wrap: wrap;
    gap: 2mm 8mm;
    margin-top: 3mm;
    font-family: var(--mono);
    font-size: 12pt;
    letter-spacing: 0.02em;
    color: var(--muted);
  }
  .byline b { color: var(--ink-soft); font-weight: 500; }

  .abstract {
    display: grid;
    grid-template-columns: 22mm 1fr;
    gap: 0 4mm;
    margin: 3mm 0 0;
    padding: 2mm 0;
    border-top: 1px solid var(--rule);
    border-bottom: 1px solid var(--rule);
  }
  .abstract h2 {
    margin: 0;
    font-family: var(--mono);
    font-size: 14pt;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .abstract p { margin: 0; font-size: var(--body-size); line-height: 1.62; }

  .body { flex: 1; padding-top: 3mm; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 0 9mm; }
  .col { min-width: 0; }
  .col + .col { border-left: 1px solid var(--rule); padding-left: 9mm; }
  body.no-rules .col + .col { border-left-color: transparent; }

  section { margin: 0 0 3mm; break-inside: avoid; page-break-inside: avoid; }
  section h3 {
    display: flex;
    align-items: baseline;
    gap: 3mm;
    margin: 0 0 2mm;
    font-family: var(--sans);
    font-size: 13pt;
    font-weight: 650;
    letter-spacing: -0.01em;
  }
  section h3 .no { font-family: var(--mono); font-size: 12pt; font-weight: 500; color: var(--accent); }
  section p { margin: 0 0 1.8mm; font-size: var(--body-size); line-height: var(--leading); }
  section p:last-child { margin-bottom: 0; }
  .note {
    margin: 2.5mm 0 0;
    padding: 2mm 3mm;
    background: var(--accent-soft);
    font-size: 12pt;
    line-height: 1.55;
  }
  .note b { display: block; margin-bottom: 1mm; font-family: var(--mono); font-size: 12pt; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); }

  .data {
    width: 100%;
    margin: 3mm 0 0;
    border-collapse: collapse;
    font-family: var(--mono);
    font-size: 12pt;
    line-height: 1.4;
  }
  .data caption {
    caption-side: top;
    padding-bottom: 1.5mm;
    font-family: var(--mono);
    font-size: 12pt;
    letter-spacing: 0.06em;
    text-align: left;
    color: var(--muted);
  }
  .data th, .data td { padding: 1mm 0; text-align: left; border-top: 1px solid var(--rule); }
  .data th { font-weight: 500; color: var(--muted); }
  .data td.num { text-align: right; }
  .data tr:last-child td { border-bottom: 1px solid var(--rule); }

  .steps { margin: 0; padding: 0; list-style: none; counter-reset: step; }
  .steps li {
    counter-increment: step;
    display: grid;
    grid-template-columns: 8mm 1fr;
    gap: 2mm;
    padding: 1.2mm 0;
    border-top: 1px solid var(--rule);
    font-size: var(--body-size);
    line-height: 1.55;
  }
  .steps li::before { content: counter(step) "."; font-family: var(--mono); color: var(--accent); }

  .foot {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    margin-top: 2.5mm;
    padding-top: 2mm;
    border-top: 1.5px solid var(--ink);
    font-family: var(--mono);
    font-size: 12pt;
    line-height: 1.6;
    letter-spacing: 0.02em;
    color: var(--muted);
  }
  .foot b { color: var(--ink-soft); font-weight: 500; }

  /* Tweaks tray, screen only. */
  .tray {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 30;
    width: 248px;
    padding: 14px 16px;
    border-radius: 10px;
    background: rgba(20, 22, 26, 0.96);
    color: #f4f1e8;
    font-family: var(--mono);
    font-size: 11px;
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.34);
  }
  .tray[hidden] { display: none; }
  .tray h3 { margin: 0 0 8px; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #8fb4cf; }
  .tray label { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 0; }
  .tray input[type="color"] { width: 42px; height: 24px; border: 1px solid rgba(244, 241, 232, 0.3); background: none; padding: 0; }
  .tray input[type="range"] { width: 112px; accent-color: #8fb4cf; }

  @media (max-width: 640px) {
    body { padding: 12px; }
    .sheet { padding: 7% 6.4%; aspect-ratio: auto; min-height: 100vh; }
    .columns { grid-template-columns: 1fr; }
    .col + .col { border-left: 0; padding-left: 0; border-top: 1px solid var(--rule); padding-top: 4mm; margin-top: 4mm; }
    .masthead { flex-direction: column; align-items: flex-start; gap: 1mm; }
    .memo-ref { text-align: left; }
    h1 { font-size: 22pt; }
    .abstract { grid-template-columns: 1fr; gap: 2mm; }
    .foot { flex-direction: column; align-items: flex-start; }
    .tray { left: 12px; right: 12px; bottom: 12px; width: auto; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }

  /* Print: one A4 page, @page margin replaces the screen mat. */
  @media print {
    html, body { background: #fff; padding: 0; margin: 0; min-height: 0; height: auto; }
    .sheet {
      width: auto;
      height: auto;
      min-height: 0;
      aspect-ratio: auto;
      margin: 0;
      padding: 0;
      overflow: visible;
      box-shadow: none;
    }
    .sheet, .sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .tray { display: none !important; }
    .abstract, .data, .note, section, .foot { break-inside: avoid; page-break-inside: avoid; }
  }
  button, input, select, textarea { font: inherit; }
</style>
</head>
<body>
<div class="sheet">
  <header class="masthead">
    <span class="org">河口观测组 · Estuary Survey Group</span>
    <span class="memo-ref">备忘录 E-2026-014<br>2026-03-10 · 内部</span>
  </header>

  <div class="head">
    <p class="doc-kicker">方法备忘录 / Method Memo</p>
    <h1>盐度与潮位的联合观测方法</h1>
    <p class="subtitle">关于采样时序、仪器布放与数据记录的三点修订，适用于 2026 年春季汛前巡测。</p>
    <div class="byline">
      <span>拟稿 <b>第三观测小组</b></span>
      <span>复核 <b>技术委员会</b></span>
      <span>分发 <b>全体巡测人员</b></span>
      <span>版本 <b>v1.2</b></span>
    </div>
  </div>

  <div class="abstract">
    <h2>摘要</h2>
    <p>本备忘录修订三项现场规程：盐度采样固定在涨急后四十分钟内完成；潮位与盐度探头布设在同一垂线；以统一表格记录异常值。</p>
  </div>

  <main class="body" aria-label="备忘录正文">
    <div class="columns">
      <div class="col">
        <section>
          <h3><span class="no">01</span>采样时序</h3>
          <p>盐度在潮周期内的变化并不均匀。涨急之后的四十分钟内水体混合最充分，此时采集的表层样品最能代表该断面的整体状态；错过这个窗口，读数会明显偏向河道淡水一侧。</p>
          <p>每个断面安排两次采样：涨急后与落急后各一次，两次之间不更换采样瓶，只在现场用清水冲洗三遍。如遇降雨顺延至雨停后两小时，连续降雨超过一天的数据单独标记。</p>
        </section>
        <section>
          <h3><span class="no">02</span>仪器布放</h3>
          <p>潮位计与盐度探头必须布设在同一垂线上，水平距离不超过 1 米，探头入水深度固定在 0.5 米。分点布设造成的读数偏差，本次修订中一并取消。</p>
          <table class="data">
            <caption>示例记录 · 3 月第 2 周巡测（仅用于版式演示）</caption>
            <thead>
              <tr><th scope="col">日期</th><th scope="col">涨急</th><th scope="col">落急</th><th scope="col" class="num">盐度 / PSU</th></tr>
            </thead>
            <tbody>
              <tr><td>03-09</td><td>06:12</td><td>12:40</td><td class="num">8.4</td></tr>
              <tr><td>03-10</td><td>07:05</td><td>13:22</td><td class="num">11.6</td></tr>
            </tbody>
          </table>
        </section>
      </div>
      <div class="col">
        <section>
          <h3><span class="no">03</span>数据记录与交接</h3>
          <p>现场只使用本备忘录附带的表格，每行记录时间、潮位、盐度、水温与天气。字迹不清或涂改超过两处的记录视为无效，需要重测。</p>
          <ol class="steps">
            <li>记录仪器编号与最后一次校准日期。</li>
            <li>先记时间，再记读数，最后写备注。</li>
            <li>异常值保留原值，在备注栏说明原因，不做涂改。</li>
            <li>收队前由同组第二人复核并签名。</li>
          </ol>
          <div class="note">
            <b>交接提醒</b>
            仪器箱干燥剂每周更换；潮位计电池低于 30% 必须在出发前更换，不得在船上更换。本备忘录自 2026-03-12 起生效，旧版表格同时废止。
          </div>
        </section>
      </div>
    </div>
  </main>

  <footer class="foot">
    <span>河口观测组 · 第三观测小组<br><b>备忘录 E-2026-014 · 第 1 页 / 共 1 页</b></span>
    <span style="text-align:right">文件为设计脚手架示例<br>非真实观测记录</span>
  </footer>
</div>

<div class="tray" id="tweaks" hidden>
  <h3>Tweaks · 文档</h3>
  <label>强调色 <input type="color" id="tw-accent" value="#2d4f6b"></label>
  <label>正文字号 <input type="range" id="tw-size" min="12" max="14" step="0.5" value="12"><output id="tw-size-out">12pt</output></label>
  <label>行高 <input type="range" id="tw-leading" min="1.45" max="1.8" step="0.05" value="1.5"><output id="tw-leading-out">1.50</output></label>
  <label>分栏细线 <input type="checkbox" id="tw-rules" checked></label>
</div>

<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#2d4f6b",
  "bodySize": 12,
  "lineHeight": 1.5,
  "showRules": true
}/*EDITMODE-END*/;

const root = document.documentElement;
const body = document.body;
const tray = document.getElementById('tweaks');

function applyTweaks(edits) {
  const v = Object.assign({}, TWEAK_DEFAULTS, edits || {});
  root.style.setProperty('--accent', v.accentColor);
  root.style.setProperty('--body-size', v.bodySize + 'pt');
  root.style.setProperty('--leading', String(v.lineHeight));
  body.classList.toggle('no-rules', v.showRules === false);
  const accent = document.getElementById('tw-accent');
  const size = document.getElementById('tw-size');
  const sizeOut = document.getElementById('tw-size-out');
  const leading = document.getElementById('tw-leading');
  const leadingOut = document.getElementById('tw-leading-out');
  const rules = document.getElementById('tw-rules');
  if (accent) accent.value = v.accentColor;
  if (size) size.value = v.bodySize;
  if (sizeOut) sizeOut.textContent = v.bodySize + 'pt';
  if (leading) leading.value = v.lineHeight;
  if (leadingOut) leadingOut.textContent = Number(v.lineHeight).toFixed(2);
  if (rules) rules.checked = v.showRules !== false;
  return v;
}
window.__dsApplyTweaks = applyTweaks;

function postTweaks(edits) {
  try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: edits }, '*'); } catch (error) {}
}

function bindTray() {
  const accent = document.getElementById('tw-accent');
  const size = document.getElementById('tw-size');
  const leading = document.getElementById('tw-leading');
  const rules = document.getElementById('tw-rules');
  if (accent) accent.addEventListener('input', function () {
    applyTweaks({ accentColor: accent.value });
    postTweaks({ accentColor: accent.value });
  });
  if (size) size.addEventListener('input', function () {
    const value = Number(size.value);
    applyTweaks({ bodySize: value });
    postTweaks({ bodySize: value });
  });
  if (leading) leading.addEventListener('input', function () {
    const value = Number(leading.value);
    applyTweaks({ lineHeight: value });
    postTweaks({ lineHeight: value });
  });
  if (rules) rules.addEventListener('change', function () {
    applyTweaks({ showRules: rules.checked });
    postTweaks({ showRules: rules.checked });
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
