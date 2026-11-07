/**
 * Scaffold `tweaks` — interactive Tweaks demo (live design-token playground).
 *
 * A reading card plus a real control panel: every control re-maps CSS custom
 * properties immediately and posts a partial __edit_mode_set_keys message.
 * Visual direction: paper and ink, one clay accent, monospaced control labels.
 * Self-contained, no external requests.
 */
export default String.raw`<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tweaks · 实时调参样板</title>
<style>
  :root {
    --paper: #f5f1e6;
    --paper-deep: #ebe5d5;
    --card: #fffdf6;
    --ink: #1d1c17;
    --ink-soft: #3b3931;
    --muted: #5f5b4f;
    --line: #d7d0bd;
    --accent: #b0552c;
    --accent-ink: #8a3d1c;
    --text-size: 17px;
    --line-height: 1.65;
    --radius: 12px;
    --measure: 62ch;
    --display: "Iowan Old Style", "Palatino Linotype", "Source Han Serif SC", "Songti SC", serif;
    --sans: "Neue Haas Grotesk Text Pro", "Avenir Next", "Segoe UI Variable Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    --mono: "Cascadia Code", "SF Mono", "JetBrains Mono", Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    min-height: 100vh;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--sans);
    font-size: 16px;
    line-height: 1.55;
    -webkit-text-size-adjust: 100%;
  }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  ::selection { background: var(--accent); color: var(--paper); }

  .page { max-width: 1216px; margin: 0 auto; padding: 40px 40px 64px; }
  .masthead {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--ink);
  }
  .masthead h1 { margin: 0; font-family: var(--display); font-size: clamp(26px, 3vw, 34px); font-weight: 600; letter-spacing: -0.02em; }
  .masthead p { margin: 8px 0 0; max-width: 58ch; font-size: 16px; line-height: 1.6; color: var(--muted); }
  .masthead .badge {
    flex-shrink: 0;
    padding: 8px 12px;
    border: 1px solid var(--line);
    border-radius: 999px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    color: var(--muted);
  }

  .layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 56px; padding-top: 40px; align-items: start; }

  /* Preview column: one card that every tweak visibly affects. */
  .preview-label {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 12px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .preview-label::before { content: ""; width: 22px; height: 1px; background: var(--accent); }
  .card {
    padding: 40px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--card);
    box-shadow: 0 1px 2px rgba(29, 28, 23, 0.04), 0 10px 30px rgba(29, 28, 23, 0.05);
  }
  body.grotesk .card h2, body.grotesk .card .quote { font-family: var(--sans); }
  .card .eyebrow {
    margin: 0 0 12px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }
  .card h2 {
    margin: 0 0 16px;
    max-width: 20ch;
    font-family: var(--display);
    font-size: clamp(30px, 3.6vw, 44px);
    font-weight: 600;
    line-height: 1.08;
    letter-spacing: -0.025em;
  }
  .card .lede { margin: 0 0 20px; max-width: var(--measure); font-size: var(--text-size); line-height: var(--line-height); color: var(--ink-soft); }
  .card .lede mark { padding: 0 2px; background: color-mix(in srgb, var(--accent) 22%, transparent); color: inherit; }
  .card .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    margin: 0 0 24px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .card .actions { display: flex; flex-wrap: wrap; gap: 12px; }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 20px;
    border: 1px solid var(--ink);
    border-radius: max(4px, calc(var(--radius) - 4px));
    background: var(--ink);
    color: var(--paper);
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.01em;
    text-decoration: none;
    cursor: pointer;
  }
  .btn.ghost { border-color: var(--line); background: transparent; color: var(--ink); }
  .btn:hover { border-color: var(--accent); background: var(--accent); color: #fff8ef; }
  .quote {
    margin: 28px 0 0;
    padding: 20px 0 0;
    border-top: 1px solid var(--line);
    font-family: var(--display);
    font-size: calc(var(--text-size) + 3px);
    line-height: var(--line-height);
  }
  .quote cite {
    display: block;
    margin-top: 10px;
    font-family: var(--mono);
    font-size: 11px;
    font-style: normal;
    letter-spacing: 0.08em;
    color: var(--muted);
  }

  /* Control panel: typed controls, always visible in this scaffold. */
  .panel {
    position: static;
    padding: 24px;
    border-radius: 16px;
    background: var(--ink);
    color: #f2ede0;
    font-size: 12px;
  }
  .panel h2 { margin: 0 0 4px; font-family: var(--mono); font-size: 11px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: #d99a76; }
  .panel > p { margin: 0 0 16px; font-size: 12px; line-height: 1.6; color: rgba(242, 237, 224, 0.62); }
  .field { display: grid; grid-template-columns: 72px 1fr; align-items: center; gap: 10px; padding: 8px 0; }
  .field > label { font-family: var(--mono); font-size: 11px; letter-spacing: 0.04em; color: rgba(242, 237, 224, 0.72); }
  .field input[type="color"] { width: 100%; height: 32px; padding: 0; border: 1px solid rgba(242, 237, 224, 0.28); border-radius: 8px; background: none; }
  .field input[type="range"] { width: 100%; accent-color: #d99a76; }
  .field select {
    width: 100%;
    height: 36px;
    padding: 0 8px;
    border: 1px solid rgba(242, 237, 224, 0.28);
    border-radius: 8px;
    background: #262520;
    color: #f2ede0;
    font-family: var(--mono);
    font-size: 12px;
  }
  .field .value { font-family: var(--mono); font-size: 11px; color: rgba(242, 237, 224, 0.9); text-align: right; }
  .switch { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; font-family: var(--mono); font-size: 11px; color: rgba(242, 237, 224, 0.72); }
  .switch input { width: 18px; height: 18px; accent-color: #d99a76; }
  .panel .row { display: flex; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(242, 237, 224, 0.14); }
  .panel .row button {
    flex: 1;
    min-height: 44px;
    border: 1px solid rgba(242, 237, 224, 0.3);
    border-radius: 8px;
    background: transparent;
    color: #f2ede0;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    cursor: pointer;
  }
  .panel .row button:hover { border-color: #d99a76; color: #d99a76; }
  .panel .json {
    margin: 12px 0 0;
    padding: 12px;
    max-height: 132px;
    overflow: auto;
    border-radius: 8px;
    background: rgba(242, 237, 224, 0.06);
    font-family: var(--mono);
    font-size: 10px;
    line-height: 1.6;
    color: rgba(242, 237, 224, 0.72);
    white-space: pre-wrap;
  }

  /* Dark preview theme is a re-derived palette, not an inversion. */
  body.dark {
    --paper: #171714;
    --paper-deep: #1f1f1a;
    --card: #22221d;
    --ink: #eceae0;
    --ink-soft: #c7c5b8;
    --muted: #a09d8d;
    --line: #3b3a31;
    --accent: #d0855c;
    --accent-ink: #e5a882;
  }
  body.dark .panel { background: #0f0f0c; }
  body.dark .btn { background: var(--accent); border-color: var(--accent); color: #16150f; }
  body.dark .btn.ghost { background: transparent; border-color: var(--line); color: var(--ink); }

  @media (max-width: 980px) {
    .layout { grid-template-columns: 1fr; gap: 32px; }
    .panel { position: static; }
  }
  @media (max-width: 600px) {
    .page { padding: 24px 20px 40px; }
    .masthead { flex-direction: column; align-items: flex-start; gap: 12px; }
    .card { padding: 24px; }
    .layout { padding-top: 28px; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }
  button, input, select, textarea { font: inherit; }
</style>
</head>
<body>
<div class="page">
  <header class="masthead">
    <div>
      <h1>纸面 · 调参样板</h1>
      <p>这块阅读卡是预览区：右侧每个控件都直接改写 CSS 变量，并通过 <code>__edit_mode_set_keys</code> 把改动同步给画布宿主。所有控件都是真实可用的。</p>
    </div>
    <span class="badge">TWEAKS · 6 个参数</span>
  </header>

  <main class="layout">
    <section aria-label="预览">
      <p class="preview-label">预览 / 阅读卡片</p>
      <article class="card">
        <p class="eyebrow">第 03 期 · 阅读笔记</p>
        <h2>把字距当成一种语气</h2>
        <p class="lede">排版里最容易被忽略的参数是字距。它不改变字号，也不改变行高，却决定了一行字是<mark>从容</mark>还是局促。把标题的负字距收紧 0.01em，读者不会说出哪里变了，但会觉得更稳。</p>
        <p class="meta"><span>文 / 纸面编辑部</span><span>2026-03-09</span><span>约 6 分钟</span></p>
        <div class="actions">
          <a class="btn" href="#read">继续阅读</a>
          <a class="btn ghost" href="#save">保存到书架</a>
        </div>
        <blockquote class="quote">
          “好的排版不解释自己，它只是让阅读少一点阻力。”
          <cite>纸面 · 排版手记</cite>
        </blockquote>
      </article>
    </section>

    <aside class="panel" aria-label="Tweaks 控件">
      <h2>Tweaks</h2>
      <p>改完立即生效。宿主会把改动写回页面的 EDITMODE JSON。</p>
      <div class="field">
        <label for="tw-accent">主色</label>
        <input type="color" id="tw-accent" value="#b0552c">
      </div>
      <div class="field">
        <label for="tw-size">字号</label>
        <input type="range" id="tw-size" min="15" max="20" step="1" value="17">
      </div>
      <div class="field">
        <label for="tw-leading">行高</label>
        <input type="range" id="tw-leading" min="1.45" max="1.85" step="0.05" value="1.65">
      </div>
      <div class="field">
        <label for="tw-radius">圆角</label>
        <input type="range" id="tw-radius" min="0" max="24" step="2" value="12">
      </div>
      <div class="field">
        <label for="tw-display">标题体</label>
        <select id="tw-display">
          <option value="serif">衬线（稳妥）</option>
          <option value="grotesk">无衬线（现代）</option>
        </select>
      </div>
      <label class="switch" for="tw-dark">深色纸面 <input type="checkbox" id="tw-dark"></label>
      <div class="row">
        <button type="button" id="tw-reset">恢复默认</button>
        <button type="button" id="tw-copy">复制 JSON</button>
      </div>
      <details class="json-box"><summary>查看 EDITMODE JSON</summary><pre class="json" id="tw-json" aria-live="polite"></pre></details>
    </aside>
  </main>
</div>

<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#b0552c",
  "textSize": 17,
  "lineHeight": 1.65,
  "radius": 12,
  "displayFont": "serif",
  "dark": false
}/*EDITMODE-END*/;

const root = document.documentElement;
const body = document.body;
const values = Object.assign({}, TWEAK_DEFAULTS);

function renderJson() {
  const node = document.getElementById('tw-json');
  if (node) node.textContent = JSON.stringify(values, null, 2);
}

function applyTweaks(edits) {
  Object.assign(values, edits || {});
  root.style.setProperty('--accent', values.accentColor);
  root.style.setProperty('--text-size', values.textSize + 'px');
  root.style.setProperty('--line-height', String(values.lineHeight));
  root.style.setProperty('--radius', values.radius + 'px');
  body.classList.toggle('grotesk', values.displayFont === 'grotesk');
  body.classList.toggle('dark', values.dark === true);

  const accent = document.getElementById('tw-accent');
  const size = document.getElementById('tw-size');
  const leading = document.getElementById('tw-leading');
  const radius = document.getElementById('tw-radius');
  const display = document.getElementById('tw-display');
  const dark = document.getElementById('tw-dark');
  if (accent) accent.value = values.accentColor;
  if (size) size.value = values.textSize;
  if (leading) leading.value = values.lineHeight;
  if (radius) radius.value = values.radius;
  if (display) display.value = values.displayFont;
  if (dark) dark.checked = values.dark === true;
  renderJson();
  return values;
}
window.__dsApplyTweaks = applyTweaks;

function postTweaks(edits) {
  try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: edits }, '*'); } catch (error) {}
}

function set(key, value) {
  applyTweaks({ [key]: value });
  postTweaks({ [key]: value });
}

function bind() {
  const accent = document.getElementById('tw-accent');
  const size = document.getElementById('tw-size');
  const leading = document.getElementById('tw-leading');
  const radius = document.getElementById('tw-radius');
  const measure = document.getElementById('tw-measure');
  const display = document.getElementById('tw-display');
  const dark = document.getElementById('tw-dark');
  const reset = document.getElementById('tw-reset');
  const copy = document.getElementById('tw-copy');

  if (accent) accent.addEventListener('input', function () { set('accentColor', accent.value); });
  if (size) size.addEventListener('input', function () { set('textSize', Number(size.value)); });
  if (leading) leading.addEventListener('input', function () { set('lineHeight', Number(leading.value)); });
  if (radius) radius.addEventListener('input', function () { set('radius', Number(radius.value)); });
  if (display) display.addEventListener('change', function () { set('displayFont', display.value); });
  if (dark) dark.addEventListener('change', function () { set('dark', dark.checked); });
  if (reset) reset.addEventListener('click', function () {
    applyTweaks(Object.assign({}, TWEAK_DEFAULTS));
    postTweaks(Object.assign({}, TWEAK_DEFAULTS));
  });
  if (copy) copy.addEventListener('click', function () {
    const text = JSON.stringify(values, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
    }
    copy.textContent = '已复制';
    window.setTimeout(function () { copy.textContent = '复制 JSON'; }, 1600);
  });
}

/* Edit-mode protocol: listener first, announcement second (CONTRACT §6). */
window.addEventListener('message', function (event) {
  const data = event.data || {};
  if (data.type === '__activate_edit_mode') {
    root.dataset.editMode = 'on';
    body.classList.add('editing');
  } else if (data.type === '__deactivate_edit_mode') {
    root.dataset.editMode = 'off';
    body.classList.remove('editing');
  }
});
try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (error) {}

bind();
applyTweaks(TWEAK_DEFAULTS);
</script>
</body>
</html>
`
