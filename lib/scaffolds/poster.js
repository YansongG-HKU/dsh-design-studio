/**
 * Scaffold `poster` — A3 print poster (@page size A3, print-safe colors).
 *
 * Visual direction: botanical field index, single-ink halftone plate, registration
 * marks and a specimen list set in serif + monospace. Everything is typographic;
 * no stock imagery and no external requests.
 * Self-contained, Claude edit-mode Tweaks protocol.
 */
export default String.raw`<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>潮间带图鉴 · A3 海报</title>
<style>
  @page { size: A3; margin: 14mm; }

  :root {
    --desk: #c8c1b0;
    --paper: #efe8d8;
    --ink: #16231d;
    --ink-soft: #33443b;
    --muted: #55625a;
    --rule: #b9b19c;
    --accent: #9d4b2c;
    --title-scale: 1;
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
    font-family: var(--sans);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

  /* Screen sheet is an A3 proportion preview of the printed page. */
  .sheet {
    position: relative;
    width: min(100%, 1122px);
    aspect-ratio: 297 / 420;
    margin: 0 auto;
    padding: 6.2% 6.6% 5.4%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--paper);
    color: var(--ink);
    box-shadow: 0 24px 64px rgba(46, 39, 26, 0.28), 0 2px 6px rgba(46, 39, 26, 0.16);
  }
  .sheet::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: radial-gradient(rgba(22, 35, 29, 0.045) 0.7px, transparent 0.9px);
    background-size: 4px 4px;
  }

  /* Registration marks — real print furniture, kept in two spot colors. */
  .reg { position: absolute; width: 16px; height: 16px; pointer-events: none; }
  .reg::before, .reg::after { content: ""; position: absolute; background: var(--accent); }
  .reg::before { left: 50%; top: 0; width: 1px; height: 100%; }
  .reg::after { top: 50%; left: 0; height: 1px; width: 100%; }
  .reg.tl { top: 20px; left: 20px; }
  .reg.tr { top: 20px; right: 20px; }
  .reg.bl { bottom: 20px; left: 20px; }
  .reg.br { bottom: 20px; right: 20px; }

  .poster-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 24px;
    padding-bottom: 10px;
    border-bottom: 1.5px solid var(--ink);
  }
  .brand { font-family: var(--mono); font-size: 12pt; letter-spacing: 0.18em; text-transform: uppercase; }
  .plate-ref { font-family: var(--mono); font-size: 12pt; letter-spacing: 0.12em; color: var(--muted); }

  .hero {
    flex: 1;
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 0;
    align-items: stretch;
    margin-top: 5.2%;
    border-bottom: 1px solid var(--rule);
    padding-bottom: 4.6%;
  }
  .hero-type { display: flex; flex-direction: column; justify-content: space-between; padding-right: 6%; }
  .hero-type .vol { margin: 0; font-family: var(--mono); font-size: 12pt; letter-spacing: 0.24em; text-transform: uppercase; color: var(--accent); }
  h1 {
    margin: 3% 0 0;
    font-family: var(--serif);
    font-size: calc(88pt * var(--title-scale));
    font-weight: 600;
    line-height: 0.92;
    letter-spacing: -0.035em;
    text-wrap: balance;
  }
  .hero-type .sub {
    max-width: 18ch;
    margin: 4% 0 0;
    font-family: var(--serif);
    font-size: 20pt;
    line-height: 1.4;
    color: var(--ink-soft);
  }
  .hero-type .standfirst {
    max-width: 34ch;
    margin: 5% 0 0;
    font-size: 13pt;
    line-height: 1.62;
    color: var(--muted);
  }

  /* Plate: a halftone field, not an illustration. */
  .plate { position: relative; min-height: 100%; display: flex; flex-direction: column; border-left: 1px solid var(--rule); padding-left: 5%; }
  .plate .halftone {
    flex: 1;
    min-height: 300px;
    background-image: radial-gradient(var(--ink) 1.1px, transparent 1.3px);
    background-size: 8px 8px;
    -webkit-mask-image: linear-gradient(155deg, #000 10%, rgba(0, 0, 0, 0.16) 78%, transparent 100%);
    mask-image: linear-gradient(155deg, #000 10%, rgba(0, 0, 0, 0.16) 78%, transparent 100%);
  }
  body.no-halftone .plate .halftone { opacity: 0; }
  .plate .plate-no {
    position: absolute;
    right: 2%;
    bottom: -1.5%;
    margin: 0;
    font-family: var(--serif);
    font-size: 128pt;
    line-height: 0.8;
    color: transparent;
    -webkit-text-stroke: 1.2px var(--ink);
  }
  .plate .plate-caption {
    position: absolute;
    left: 5%;
    top: 16px;
    margin: 0;
    font-family: var(--mono);
    font-size: 12pt;
    letter-spacing: 0.08em;
    color: var(--ink-soft);
  }

  .index { margin-top: 4.4%; }
  .index h2 {
    font-size: 14pt;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    margin: 0 0 2.4%;
    font-family: var(--mono);
    font-size: 12pt;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .index h2 span { letter-spacing: 0.06em; color: var(--muted); }
  .specimens {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 7%;
    row-gap: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: specimen;
  }
  .specimens li {
    counter-increment: specimen;
    display: grid;
    grid-template-columns: 12mm 1fr auto;
    align-items: baseline;
    gap: 3mm;
    padding: 2.2% 0;
    border-top: 1px solid var(--rule);
    font-size: 12pt;
    line-height: 1.35;
  }
  .specimens li::before {
    content: "0" counter(specimen);
    font-family: var(--mono);
    font-size: 12pt;
    color: var(--accent);
  }
  .specimens .cn { font-family: var(--serif); font-size: 15pt; }
  .specimens .latin { font-style: italic; font-family: var(--serif); color: var(--muted); }

  .notes {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 4.4%;
    margin-top: 4.2%;
    padding-top: 2.8%;
    border-top: 1.5px solid var(--ink);
  }
  .note h3 {
    margin: 0 0 2%;
    font-family: var(--mono);
    font-size: 13pt;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .note p { margin: 0; font-size: 12pt; line-height: 1.6; color: var(--ink-soft); }

  .imprint {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    margin-top: auto;
    padding-top: 3.4%;
    font-family: var(--mono);
    font-size: 12pt;
    line-height: 1.7;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  .imprint b { color: var(--ink-soft); font-weight: 500; }
  .swatches { display: flex; gap: 3px; margin-bottom: 6px; }
  .swatches i { display: block; width: 26px; height: 8px; background: var(--ink); }
  .swatches i:nth-child(2) { background: var(--accent); }
  .swatches i:nth-child(3) { background: var(--rule); }
  .swatches i:nth-child(4) { background: var(--paper); box-shadow: inset 0 0 0 1px var(--rule); }

  /* Tweaks tray, screen only. */
  .tray {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 30;
    width: 248px;
    padding: 14px 16px;
    border-radius: 10px;
    background: rgba(22, 35, 29, 0.96);
    color: #efe8d8;
    font-family: var(--mono);
    font-size: 11px;
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.34);
  }
  .tray[hidden] { display: none; }
  .tray h3 { margin: 0 0 8px; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #d89070; }
  .tray label { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 0; }
  .tray input[type="color"] { width: 42px; height: 24px; border: 1px solid rgba(239, 232, 216, 0.3); background: none; padding: 0; }
  .tray input[type="range"] { width: 112px; accent-color: #d89070; }

  @media (max-width: 760px) {
    body { padding: 12px; }
    .sheet { padding: 7% 6.6%; aspect-ratio: auto; min-height: 100vh; }
    .hero { grid-template-columns: 1fr; gap: 6%; }
    .plate { border-left: 0; border-top: 1px solid var(--rule); padding: 6% 0 0; min-height: 240px; }
    .plate .halftone { min-height: 200px; }
    h1 { font-size: calc(64pt * var(--title-scale)); }
    .specimens { grid-template-columns: 1fr; }
    .notes { grid-template-columns: 1fr; gap: 4%; }
    .imprint { flex-direction: column; align-items: flex-start; }
    .tray { left: 12px; right: 12px; bottom: 12px; width: auto; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }

  /* Print: the @page margin replaces the screen mat; colors are preserved exactly. */
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
    .reg { display: none; }
    .hero, .index, .notes, .imprint { break-inside: avoid; page-break-inside: avoid; }
  }
  button, input, select, textarea { font: inherit; }
</style>
</head>
<body>
<div class="sheet">
  <span class="reg tl" aria-hidden="true"></span>
  <span class="reg tr" aria-hidden="true"></span>
  <span class="reg bl" aria-hidden="true"></span>
  <span class="reg br" aria-hidden="true"></span>

  <header class="poster-head">
    <span class="brand">岸线印刷室 · Shoreline Press</span>
    <span class="plate-ref">潮间带图鉴 / 第一辑</span>
  </header>

  <section class="hero" aria-label="标题">
    <div class="hero-type">
      <p class="vol">Intertidal Index · Plate 01</p>
      <h1>潮间带</h1>
      <p class="sub">十二种沿海植物<br>观察图谱</p>
      <p class="standfirst">退潮之后的两小时，是这片海岸唯一能被完整阅读的时刻。本辑收录盐沼与沙岸的十二种常见植物，按生境从高潮线到低潮线排列。</p>
    </div>
    <figure class="plate" style="margin:0">
      <div class="halftone" aria-hidden="true"></div>
      <p class="plate-no" aria-hidden="true">01</p>
      <figcaption class="plate-caption">图版 01 · 盐角草 / SALICORNIA</figcaption>
    </figure>
  </section>

  <section class="index" aria-label="标本索引">
    <h2>标本索引 <span>共 12 种 · 编号 A-01—A-12</span></h2>
    <ol class="specimens">
      <li><span class="cn">盐角草</span><span class="latin">Salicornia europaea</span></li>
      <li><span class="cn">碱蓬</span><span class="latin">Suaeda salsa</span></li>
      <li><span class="cn">芦苇</span><span class="latin">Phragmites australis</span></li>
      <li><span class="cn">海三棱藨草</span><span class="latin">Scirpus mariqueter</span></li>
      <li><span class="cn">互花米草</span><span class="latin">Spartina alterniflora</span></li>
      <li><span class="cn">柽柳</span><span class="latin">Tamarix chinensis</span></li>
      <li><span class="cn">碱菀</span><span class="latin">Tripolium pannonicum</span></li>
      <li><span class="cn">珊瑚菜</span><span class="latin">Glehnia littoralis</span></li>
    </ol>
  </section>

  <section class="notes" aria-label="观察注记">
    <div class="note">
      <h3>观察方法</h3>
      <p>每处样方以退潮后 30 分钟为起点，沿垂直岸线方向布设 10 米样线，记录株高、盖度与伴生种。</p>
    </div>
    <div class="note">
      <h3>采集范围</h3>
      <p>北岸盐沼、东岸沙堤与河口沙洲三处，海拔 0.4 至 2.1 米。标本照片与坐标存档于印刷室。</p>
    </div>
    <div class="note">
      <h3>版式说明</h3>
      <p>单色平版印刷，网点 60 lpi。纸张为米色胶版纸 120g，适合在自然光下阅读与长期张贴。</p>
    </div>
  </section>

  <footer class="imprint">
    <div>
      <div class="swatches" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <span>岸线印刷室 · 2026 春季<br><b>限量 300 份 / 编号 A-01—A-12</b></span>
    </div>
    <div style="text-align:right">
      单色平版 · 米色胶版纸 120g<br>
      <b>© 2026 岸线印刷室 · 设计脚手架示例</b>
    </div>
  </footer>
</div>

<div class="tray" id="tweaks" hidden>
  <h3>Tweaks · 海报</h3>
  <label>专色 <input type="color" id="tw-accent" value="#9d4b2c"></label>
  <label>纸色 <input type="color" id="tw-paper" value="#efe8d8"></label>
  <label>标题比例 <input type="range" id="tw-scale" min="0.9" max="1.1" step="0.02" value="1"><output id="tw-scale-out">1.00</output></label>
  <label>网点图版 <input type="checkbox" id="tw-halftone" checked></label>
</div>

<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#9d4b2c",
  "paperColor": "#efe8d8",
  "titleScale": 1,
  "showHalftone": true
}/*EDITMODE-END*/;

const root = document.documentElement;
const body = document.body;
const tray = document.getElementById('tweaks');

function applyTweaks(edits) {
  const v = Object.assign({}, TWEAK_DEFAULTS, edits || {});
  root.style.setProperty('--accent', v.accentColor);
  root.style.setProperty('--paper', v.paperColor);
  root.style.setProperty('--title-scale', String(v.titleScale));
  body.classList.toggle('no-halftone', v.showHalftone === false);
  const accent = document.getElementById('tw-accent');
  const paper = document.getElementById('tw-paper');
  const scale = document.getElementById('tw-scale');
  const scaleOut = document.getElementById('tw-scale-out');
  const halftone = document.getElementById('tw-halftone');
  if (accent) accent.value = v.accentColor;
  if (paper) paper.value = v.paperColor;
  if (scale) scale.value = v.titleScale;
  if (scaleOut) scaleOut.textContent = Number(v.titleScale).toFixed(2);
  if (halftone) halftone.checked = v.showHalftone !== false;
  return v;
}
window.__dsApplyTweaks = applyTweaks;

function postTweaks(edits) {
  try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: edits }, '*'); } catch (error) {}
}

function bindTray() {
  const accent = document.getElementById('tw-accent');
  const paper = document.getElementById('tw-paper');
  const scale = document.getElementById('tw-scale');
  const halftone = document.getElementById('tw-halftone');
  if (accent) accent.addEventListener('input', function () {
    applyTweaks({ accentColor: accent.value });
    postTweaks({ accentColor: accent.value });
  });
  if (paper) paper.addEventListener('input', function () {
    applyTweaks({ paperColor: paper.value });
    postTweaks({ paperColor: paper.value });
  });
  if (scale) scale.addEventListener('input', function () {
    const value = Number(scale.value);
    applyTweaks({ titleScale: value });
    postTweaks({ titleScale: value });
  });
  if (halftone) halftone.addEventListener('change', function () {
    applyTweaks({ showHalftone: halftone.checked });
    postTweaks({ showHalftone: halftone.checked });
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
