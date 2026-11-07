/**
 * Scaffold `browser` — desktop web page shell (editorial landing / publication).
 *
 * Visual direction: editorial Swiss on warm paper. Serif display, grotesque body,
 * hairline rules, asymmetric two-column lead. Responsive at 1440 / 768 / 375.
 * Self-contained: inline style + script, zero external requests.
 * Carries the Claude edit-mode / Tweaks protocol (CONTRACT §6).
 */
export default String.raw`<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>缓流出版社 · 缓慢机械 第 14 期</title>
<style>
  :root {
    --paper: #f3efe4;
    --paper-deep: #e9e3d3;
    --ink: #1b1a16;
    --ink-soft: #3a382f;
    --muted: #5b5749;
    --rule: #cfc8b4;
    --accent: #a4402a;
    --accent-ink: #7d2f1e;
    --base: 17px;
    --leading: 1.6;
    --measure: 64ch;
    --serif: "Iowan Old Style", "Palatino Linotype", "Source Han Serif SC", "Songti SC", "Noto Serif CJK SC", serif;
    --sans: "Neue Haas Grotesk Text Pro", "Avenir Next", "Segoe UI Variable Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    --mono: "Cascadia Code", "SF Mono", "JetBrains Mono", Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--sans);
    font-size: var(--base);
    line-height: var(--leading);
    text-rendering: optimizeLegibility;
  }
  ::selection { background: var(--accent); color: var(--paper); }
  a { color: inherit; }
  a:focus-visible, button:focus-visible, input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
  .page { max-width: 1220px; margin: 0 auto; padding: 32px 64px 56px; }

  /* Masthead: wordmark left, issue data right, one heavy rule closes it. */
  .masthead {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 32px;
    padding-bottom: 18px;
    border-bottom: 2px solid var(--ink);
  }
  .brand { display: flex; align-items: baseline; gap: 18px; flex-wrap: wrap; }
  .brand-mark {
    margin: 0;
    font-family: var(--serif);
    font-size: 27px;
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 1.1;
  }
  .brand-latin {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .issue { text-align: right; font-family: var(--mono); font-size: 11px; line-height: 1.7; color: var(--ink-soft); }
  .issue b { font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }
  .issue span { display: block; color: var(--muted); }

  /* Section nav is the only navigation; touch targets stay 44px on phones. */
  .toc { display: flex; flex-wrap: wrap; gap: 8px 40px; border-bottom: 1px solid var(--rule); }
  .toc a {
    display: inline-flex;
    align-items: center;
    min-height: 48px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-soft);
    border-bottom: 2px solid transparent;
    transition: color 140ms ease, border-color 140ms ease;
  }
  .toc a:hover { color: var(--accent-ink); border-color: var(--accent); }
  .toc a[aria-current="page"] { color: var(--ink); border-color: var(--ink); }

  /* Lead story: text column + story index, 1.55fr / 0.85fr. */
  main { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.85fr); gap: 72px; padding-top: 56px; }
  .kicker {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 22px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }
  .kicker::before { content: ""; width: 28px; height: 1px; background: var(--accent); }
  .lead-title {
    margin: 0 0 22px;
    font-family: var(--serif);
    font-size: clamp(42px, 6.4vw, 78px);
    font-weight: 600;
    line-height: 1.02;
    letter-spacing: -0.035em;
    text-wrap: balance;
  }
  .standfirst {
    max-width: 34ch;
    margin: 0 0 28px;
    font-family: var(--serif);
    font-size: clamp(19px, 1.6vw, 22px);
    line-height: 1.5;
    color: var(--ink-soft);
  }
  .byline {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
    margin: 0 0 32px;
    padding: 12px 0;
    border-top: 1px solid var(--rule);
    border-bottom: 1px solid var(--rule);
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    color: var(--muted);
  }
  .byline b { color: var(--ink); font-weight: 600; }

  /* A printed plate, made only of type and rules: no stock illustration. */
  .plate {
    position: relative;
    aspect-ratio: 16 / 9;
    margin: 0 0 32px;
    padding: 24px;
    overflow: hidden;
    background: var(--ink);
    color: var(--paper);
  }
  .plate::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(90deg, rgba(243, 239, 228, 0.12) 0 1px, transparent 1px 44px);
  }
  .plate .plate-no {
    position: absolute;
    right: 18px;
    bottom: -34px;
    font-family: var(--serif);
    font-size: clamp(150px, 22vw, 260px);
    line-height: 1;
    color: transparent;
    -webkit-text-stroke: 1px rgba(243, 239, 228, 0.55);
    letter-spacing: -0.04em;
  }
  .plate .plate-line {
    position: relative;
    width: 64px;
    height: 4px;
    background: var(--accent);
    margin-bottom: 20px;
  }
  .plate .plate-text {
    position: relative;
    max-width: 20ch;
    margin: 0;
    font-family: var(--serif);
    font-size: clamp(22px, 2.6vw, 32px);
    line-height: 1.3;
  }
  .plate .plate-caption {
    position: absolute;
    left: 24px;
    bottom: 20px;
    margin: 0;
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(243, 239, 228, 0.7);
  }

  .lead-body { columns: 2 260px; column-gap: 40px; column-rule: 1px solid var(--rule); }
  .lead-body p { margin: 0 0 16px; }
  .lead-body p:first-child { margin-top: 0; }
  .dropcap::first-letter {
    float: left;
    padding: 6px 10px 0 0;
    font-family: var(--serif);
    font-size: 62px;
    line-height: 0.82;
    color: var(--accent-ink);
  }
  .pullquote {
    grid-column: 1 / -1;
    margin: 8px 0 0;
    padding: 20px 0 0;
    border-top: 1px solid var(--rule);
    font-family: var(--serif);
    font-size: 22px;
    line-height: 1.45;
    color: var(--ink-soft);
  }
  .pullquote cite {
    display: block;
    margin-top: 10px;
    font-family: var(--mono);
    font-size: 11px;
    font-style: normal;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  /* Right rail: story index, numbered like a table of contents. */
  .rail { border-top: 2px solid var(--ink); padding-top: 16px; }
  .rail-label {
    font-size: 12px;
    margin: 0 0 8px;
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .story {
    display: grid;
    grid-template-columns: 34px 1fr;
    gap: 14px;
    padding: 18px 0;
    border-bottom: 1px solid var(--rule);
    text-decoration: none;
  }
  .story-no { font-family: var(--mono); font-size: 12px; color: var(--accent-ink); padding-top: 4px; }
  .story h3 { margin: 0 0 4px; font-family: var(--serif); font-size: 17px; font-weight: 600; line-height: 1.3; }
  .story p { margin: 0 0 8px; font-size: 16px; line-height: 1.55; color: var(--muted); }
  .story span { font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .story:hover h3 { color: var(--accent-ink); }
  .editor-note {
    margin-top: 28px;
    padding: 20px;
    background: var(--paper-deep);
    font-size: 14px;
    line-height: 1.65;
    color: var(--ink-soft);
  }
  .editor-note b {
    display: block;
    margin-bottom: 8px;
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }
  .editor-note p { margin: 0; }

  /* Subscription strip: one decisive form, not a hero-CTA template. */
  .subscribe {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
    gap: 32px 64px;
    align-items: center;
    margin-top: 72px;
    padding: 32px 0;
    border-top: 2px solid var(--ink);
    border-bottom: 1px solid var(--rule);
  }
  .subscribe h2 { margin: 0 0 8px; font-family: var(--serif); font-size: clamp(26px, 3vw, 34px); font-weight: 600; letter-spacing: -0.02em; }
  .subscribe p { margin: 0; font-size: 16px; color: var(--muted); max-width: 46ch; }
  .subscribe form { display: flex; gap: 8px; }
  .subscribe label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .subscribe input {
    flex: 1;
    min-width: 0;
    height: 48px;
    padding: 0 14px;
    border: 1px solid var(--ink);
    border-radius: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 15px;
  }
  .subscribe input::placeholder { color: var(--muted); }
  .subscribe button {
    height: 48px;
    padding: 0 22px;
    border: 1px solid var(--ink);
    border-radius: 0;
    background: var(--ink);
    color: var(--paper);
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease;
  }
  .subscribe button:hover { background: var(--accent-ink); border-color: var(--accent-ink); }
  .subscribe .fine { grid-column: 1 / -1; margin: 0; font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }

  footer {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr;
    gap: 24px 48px;
    padding-top: 28px;
    font-size: 12px;
    line-height: 1.7;
    color: var(--muted);
  }
  footer b { display: block; margin-bottom: 8px; font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-soft); }
  footer p { margin: 0; }
  footer a { display: inline-flex; align-items: center; min-height: 44px; text-decoration-color: var(--rule); text-underline-offset: 3px; }
  footer a:hover { color: var(--accent-ink); }

  /* Tweaks tray: only visible in edit mode (or via the T key when standalone). */
  .tray {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 30;
    width: 252px;
    padding: 16px;
    background: var(--ink);
    color: var(--paper);
    font-family: var(--mono);
    font-size: 11px;
    line-height: 1.5;
    box-shadow: 0 18px 44px rgba(27, 26, 22, 0.28);
  }
  .tray[hidden] { display: none; }
  .tray h3 { margin: 0 0 10px; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); }
  .tray label { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 5px 0; }
  .tray input[type="color"] { width: 44px; height: 26px; padding: 0; border: 1px solid rgba(243, 239, 228, 0.35); background: none; }
  .tray input[type="range"] { width: 118px; accent-color: var(--accent); }
  .tray output { color: rgba(243, 239, 228, 0.72); }

  /* 4/8 rhythm stays intact below 900px; nothing collapses to a generic stack. */
  @media (max-width: 980px) {
    .page { padding: 24px 32px 40px; }
    main { grid-template-columns: 1fr; gap: 48px; padding-top: 40px; }
    .subscribe { grid-template-columns: 1fr; gap: 20px; margin-top: 56px; }
    footer { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 600px) {
    .page { padding: 20px 20px 32px; }
    .masthead { align-items: flex-start; flex-direction: column; gap: 12px; }
    .issue { text-align: left; }
    .toc { gap: 0 24px; }
    .toc a { min-height: 48px; font-size: 11px; }
    .lead-title { font-size: clamp(38px, 12vw, 54px); }
    .standfirst { max-width: none; }
    .lead-body { columns: 1; }
    .plate { aspect-ratio: 4 / 3; }
    .subscribe form { flex-direction: column; }
    .subscribe button { width: 100%; }
    footer { grid-template-columns: 1fr; }
    .tray { left: 16px; right: 16px; bottom: 16px; width: auto; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; }
  }
  /* Hairline rules are a tweak: the page still holds without them. */
  body.lean .toc, body.lean .byline, body.lean .story, body.lean .subscribe, body.lean footer { border-color: transparent; }
  body.lean .lead-body { column-rule-color: transparent; }
  button, input, select, textarea { font: inherit; }
</style>
</head>
<body>
<div class="page">
  <header class="masthead">
    <div class="brand">
      <p class="brand-mark">缓流出版社</p>
      <span class="brand-latin">Slow Current Press</span>
    </div>
    <div class="issue">
      <b>第 14 期</b>
      <span>缓慢机械 · 2026 春季号</span>
      <span>纸本 / 年四期</span>
    </div>
  </header>

  <nav class="toc" aria-label="本期栏目">
    <a href="#lead" aria-current="page">封面专题</a>
    <a href="#index">本季目录</a>
    <a href="#workshop">排字工作坊</a>
    <a href="#about">关于缓流</a>
  </nav>

  <main>
    <article>
      <p class="kicker">封面专题 · 014</p>
      <h1 class="lead-title">把机器调慢一点</h1>
      <p class="standfirst">一位排字工、一台 1974 年的平压机，以及为什么慢下来的印刷仍在解释我们和工具的关系。</p>
      <div class="byline">
        <span>文 / <b>沈砚秋</b></span>
        <span>图 / 缓流印刷室</span>
        <span>2026-02-18</span>
        <span>阅读约 12 分钟</span>
      </div>

      <figure class="plate" aria-label="第 14 期封面版式示意">
        <span class="plate-line" aria-hidden="true"></span>
        <p class="plate-text">手感是一种<br>可被训练的<br>判断力。</p>
        <span class="plate-no" aria-hidden="true">014</span>
        <figcaption class="plate-caption">封面版式 / 铅字与米色纸 · 缓流印刷室</figcaption>
      </figure>

      <div class="lead-body">
        <p class="dropcap">第一次走进缓流印刷室的人，多半会先被噪音震住。平压机每落一次，整个房间就往下沉一寸，纸张的气味被震得浮起来。沈师傅说，这台机器比他年纪还大，但真正老的不是铁，是人的耐心。</p>
        <p>这期专题我们花了三个月，记录一间只有三个人的印刷室如何决定一天只排两页。听上去像效率的反面教材，但沈师傅有一套自己的账：铅字磨损、油墨干得慢、纸的纤维在潮湿天会变软，所有这些都要求人手停下来等。</p>
        <p>等待不是浪费。在等待的十几分钟里，排字工会重新看一遍字距，把挤在一起的逗号挪开半格，把标题最后一个字的撇锋对着上方的空。这些动作不在任何一本效率手册里，却构成了印刷品最容易被忽略的质感。</p>
        <p>数字化并没有消灭这些问题，只是把它们藏进了默认值里。当我们说一个页面“看起来对”，多数时候是在说：有人曾经为这些默认值做过判断。缓流的工作，就是把这些判断重新放回手上。</p>
        <p>本期还收录了排字工作坊的第一批作业、三位读者的旧书修复记录，以及一份关于纸张克重的对照表。它们都不急，适合在周末下午读完。</p>
      </div>

      <blockquote class="pullquote">
        “慢不是姿态，是给判断留出发生的时间。”
        <cite>沈砚秋 · 排字工，缓流印刷室</cite>
      </blockquote>
    </article>

    <aside class="rail" id="index" aria-label="本季目录">
      <h2 class="rail-label">本季目录 / 04 篇</h2>
      <a class="story" href="#story-01">
        <span class="story-no">01</span>
        <span>
          <h3>铅字的一毫米</h3>
          <p>字距微调为什么值得手工完成，以及它与屏幕排版的关系。</p>
          <span>排版 · 9 分钟</span>
        </span>
      </a>
      <a class="story" href="#story-02">
        <span class="story-no">02</span>
        <span>
          <h3>纸的湿度日记</h3>
          <p>连续四十天记录纸张含水率，看看成品颜色如何随天气偏移。</p>
          <span>材料 · 14 分钟</span>
        </span>
      </a>
      <a class="story" href="#story-03">
        <span class="story-no">03</span>
        <span>
          <h3>旧书修复的十道工序</h3>
          <p>从拆线到压平，修复师如何决定哪一道痕迹应该保留。</p>
          <span>工艺 · 11 分钟</span>
        </span>
      </a>
      <a class="story" href="#story-04">
        <span class="story-no">04</span>
        <span>
          <h3>给初学者的字体清单</h3>
          <p>六款可以免费商用的汉字与西文字体，以及各自的使用边界。</p>
          <span>工具 · 7 分钟</span>
        </span>
      </a>
      <div class="editor-note">
        <b>编者按</b>
        <p>本期起，缓流改为每年四期、每期一个主题。下一期讨论“手写与截图之间”的记忆方式。投稿信箱在页脚。</p>
      </div>
    </aside>
  </main>

  <section class="subscribe" id="workshop" aria-label="订阅">
    <div>
      <h2>订阅纸质季刊</h2>
      <p>每季一封纸质来信，含本期专题与工作坊报名表。年四期，不夹带广告，随时可以停。</p>
    </div>
    <form action="#subscribe" method="get">
      <label for="email">电子邮箱</label>
      <input id="email" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
      <button type="submit">订阅</button>
    </form>
    <p class="fine">我们只保存寄送所需的邮箱与地址 · 缓流出版社</p>
  </section>

  <footer id="about">
    <p><b>缓流出版社</b>独立出版与排字工作室<br>上海 · 河间路 17 号 3 楼<br>周二至周六 10:00–18:00</p>
    <p><b>联系</b><a href="#about">letter@slowcurrent.example</a><br><a href="#about">工作坊报名</a><br><a href="#about">投稿须知</a></p>
    <p><b>版权</b>© 2026 缓流出版社<br>本页为设计脚手架，内容为虚构示例。<br>保留所有权利。</p>
  </footer>
</div>

<div class="tray" id="tweaks" hidden>
  <h3>Tweaks · 缓流</h3>
  <label>主色 <input type="color" id="tw-accent" value="#a4402a"></label>
  <label>正文字号 <input type="range" id="tw-size" min="15" max="20" step="1" value="17"><output id="tw-size-out">17px</output></label>
  <label>行高 <input type="range" id="tw-leading" min="1.4" max="1.8" step="0.05" value="1.6"><output id="tw-leading-out">1.6</output></label>
  <label>细线 <input type="checkbox" id="tw-rules" checked></label>
</div>

<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#a4402a",
  "baseSize": 17,
  "leading": 1.6,
  "measure": 64,
  "rules": true
}/*EDITMODE-END*/;

const root = document.documentElement;
const body = document.body;
const tray = document.getElementById('tweaks');

function applyTweaks(edits) {
  const v = Object.assign({}, TWEAK_DEFAULTS, edits || {});
  root.style.setProperty('--accent', v.accentColor);
  root.style.setProperty('--base', v.baseSize + 'px');
  root.style.setProperty('--leading', String(v.leading));
  root.style.setProperty('--measure', v.measure + 'ch');
  body.classList.toggle('lean', v.rules === false);
  const color = document.getElementById('tw-accent');
  const size = document.getElementById('tw-size');
  const leading = document.getElementById('tw-leading');
  const rules = document.getElementById('tw-rules');
  const sizeOut = document.getElementById('tw-size-out');
  const leadingOut = document.getElementById('tw-leading-out');
  if (color) color.value = v.accentColor;
  if (size) size.value = v.baseSize;
  if (leading) leading.value = v.leading;
  if (rules) rules.checked = v.rules !== false;
  if (sizeOut) sizeOut.textContent = v.baseSize + 'px';
  if (leadingOut) leadingOut.textContent = Number(v.leading).toFixed(2);
  return v;
}
window.__dsApplyTweaks = applyTweaks;

function postTweaks(edits) {
  try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: edits }, '*'); } catch (error) {}
}

function bindTray() {
  const color = document.getElementById('tw-accent');
  const size = document.getElementById('tw-size');
  const leading = document.getElementById('tw-leading');
  const rules = document.getElementById('tw-rules');
  if (color) color.addEventListener('input', function () {
    applyTweaks({ accentColor: color.value });
    postTweaks({ accentColor: color.value });
  });
  if (size) size.addEventListener('input', function () {
    const value = Number(size.value);
    applyTweaks({ baseSize: value });
    postTweaks({ baseSize: value });
  });
  if (leading) leading.addEventListener('input', function () {
    const value = Number(leading.value);
    applyTweaks({ leading: value });
    postTweaks({ leading: value });
  });
  if (rules) rules.addEventListener('change', function () {
    applyTweaks({ rules: rules.checked });
    postTweaks({ rules: rules.checked });
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
