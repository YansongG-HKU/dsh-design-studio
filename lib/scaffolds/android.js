/**
 * Scaffold `android` — phone app screen, Android metrics (412 × 915 CSS px).
 *
 * Visual direction: Material-3 tonal roles in moss / clay / warm paper, but an
 * original type voice and layout. Real status bar, gesture bar, 48dp targets.
 * Self-contained, no external requests, Claude edit-mode Tweaks protocol.
 */
export default String.raw`<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>苔记 · 今日养护</title>
<style>
  :root {
    --primary: #3d5a3a;
    --on-primary: #f6f3e7;
    --primary-container: #d7e4ca;
    --on-primary-container: #1f2c19;
    --secondary: #8a4a33;
    --on-secondary: #fbf3ea;
    --surface: #f7f4ea;
    --surface-1: #efecdf;
    --surface-2: #e8e4d4;
    --on-surface: #1c1b17;
    --on-surface-variant: #5c5a4c;
    --outline: #7a7561;
    --outline-soft: #d8d2bf;
    --radius: 16px;
    --density: 1;
    --sans: "Segoe UI Variable Display", "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif;
    --mono: "Cascadia Code", "SF Mono", "JetBrains Mono", Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    min-height: 100vh;
    background: #cdc9bc;
    color: var(--on-surface);
    font-family: var(--sans);
    font-size: 15px;
    line-height: 1.45;
    -webkit-text-size-adjust: 100%;
  }
  .device {
    position: relative;
    width: min(100%, 412px);
    height: 915px;
    margin: 0 auto;
    background: var(--surface);
    overflow: hidden;
  }
  .screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }

  /* Android 14 status bar + centered camera hole. */
  .status {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 20px;
    flex-shrink: 0;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.04em;
    color: var(--on-surface);
  }
  .status .camera {
    position: absolute;
    top: 12px; left: 50%;
    width: 11px; height: 11px;
    transform: translateX(-50%);
    border-radius: 50%;
    background: #14130f;
    box-shadow: inset 0 0 0 1px rgba(246, 243, 231, 0.12);
  }
  .status-icons { display: flex; align-items: center; gap: 8px; }
  .status-icons svg { display: block; }

  .appbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 20px 0;
    flex-shrink: 0;
  }
  .greeting { margin: 0; font-family: var(--mono); font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--on-surface-variant); }
  h1 {
    margin: 2px 0 0;
    font-size: 30px;
    font-weight: 650;
    line-height: 1.15;
    letter-spacing: -0.02em;
  }
  .avatar {
    flex-shrink: 0;
    width: 48px; height: 48px;
    display: grid; place-items: center;
    border: 1px solid var(--outline-soft);
    border-radius: 50%;
    background: var(--primary-container);
    color: var(--on-primary-container);
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 600;
  }

  /* Week strip: segmented control, 48dp tall targets. */
  .week {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin: 16px 20px 0;
    flex-shrink: 0;
  }
  .day {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px;
    min-height: 48px;
    padding: 4px 0;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: var(--on-surface-variant);
    font-family: var(--sans);
    font-size: 11px;
    cursor: pointer;
  }
  .day b { font-size: 14px; font-weight: 600; color: var(--on-surface); }
  .day[aria-pressed="true"] { background: var(--primary); color: var(--on-primary); }
  .day[aria-pressed="true"] b { color: var(--on-primary); }
  .day:focus-visible, .fab:focus-visible, .tab:focus-visible, .task button:focus-visible {
    outline: 2px solid var(--secondary); outline-offset: 2px;
  }

  .content { flex: 1; padding: 8px 20px 8px; overflow-y: auto; }

  /* Data section: one ring + one honest sentence. */
  .week-card {
    display: grid;
    grid-template-columns: 88px 1fr;
    gap: 16px;
    align-items: center;
    margin-top: 12px;
    padding: 12px;
    border-radius: var(--radius);
    background: var(--primary-container);
    color: var(--on-primary-container);
  }
  .ring {
    position: relative;
    width: 88px; height: 88px;
    border-radius: 999px;
    background: conic-gradient(var(--primary) 0 60%, rgba(31, 44, 25, 0.16) 60% 100%);
  }
  .ring::after {
    content: "";
    position: absolute; inset: 9px;
    border-radius: 999px;
    background: var(--primary-container);
  }
  .ring span {
    position: absolute; inset: 0;
    display: grid; place-items: center;
    z-index: 1;
    font-family: var(--mono);
    font-size: 19px;
    font-weight: 600;
    color: var(--on-primary-container);
  }
  .week-card h2 { margin: 0 0 4px; font-size: 17px; font-weight: 650; letter-spacing: -0.01em; }
  .week-card p { margin: 0; font-size: 14px; line-height: 1.5; color: var(--on-primary-container); opacity: 0.86; }

  .section-head {
    display: flex; align-items: baseline; justify-content: space-between;
    margin: 16px 0 8px;
  }
  .section-head h2 { margin: 0; font-size: 13px; font-weight: 650; letter-spacing: 0.1em; text-transform: uppercase; color: var(--on-surface-variant); }
  .section-head span { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; color: var(--on-surface-variant); }

  .tasks { display: flex; flex-direction: column; gap: calc(12px * var(--density)); margin: 0; padding: 0; list-style: none; }
  .task {
    display: grid;
    grid-template-columns: 48px 1fr auto;
    align-items: center;
    gap: 12px;
    min-height: calc(60px * var(--density));
    padding: calc(8px * var(--density)) 16px calc(8px * var(--density)) 12px;
    border: 1px solid var(--outline-soft);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .task button {
    width: 44px; height: 44px;
    display: grid; place-items: center;
    border: 1.5px solid var(--outline);
    border-radius: 999px;
    background: transparent;
    color: transparent;
    cursor: pointer;
  }
  .task.done button { border-color: var(--primary); background: var(--primary); color: var(--on-primary); }
  .task .name { margin: 0; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
  .task .due { font-family: var(--mono); font-size: 14px; color: var(--on-surface-variant); white-space: nowrap; }
  .task.done .name { color: var(--on-surface-variant); text-decoration: line-through; text-decoration-thickness: 1px; }

  .plants { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0; padding: 0; list-style: none; }
  .plant {
    min-height: 72px;
    padding: 12px;
    border-radius: var(--radius);
    background: var(--surface-1);
  }
  .plant-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .plant .glyph {
    display: grid; place-items: center;
    flex-shrink: 0;
    width: 26px; height: 26px;
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--primary);
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 600;
  }
  .plant b { display: block; font-size: 14px; font-weight: 600; }
  .plant span { font-family: var(--mono); font-size: 12px; letter-spacing: 0.05em; color: var(--on-surface-variant); }

  .note {
    margin: 16px 0 0;
    padding: 12px 14px;
    border-left: 2px solid var(--secondary);
    font-size: 14px;
    line-height: 1.6;
    color: var(--on-surface-variant);
  }

  /* FAB + bottom navigation + gesture bar. */
  .fab {
    position: fixed;
    right: max(20px, calc(50% - 186px));
    bottom: 132px;
    z-index: 5;
    width: 56px; height: 56px;
    display: grid; place-items: center;
    border: 0;
    border-radius: 16px;
    background: var(--secondary);
    color: var(--on-secondary);
    box-shadow: 0 8px 20px rgba(138, 74, 51, 0.3);
    cursor: pointer;
  }
  .bottom {
    position: sticky;
    bottom: 0;
    z-index: 4;
    flex-shrink: 0;
    background: var(--surface-1);
    border-top: 1px solid var(--outline-soft);
  }
  .nav {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding: 4px 8px;
  }
  .tab {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 3px;
    min-height: 56px;
    border: 0; border-radius: 16px;
    background: transparent;
    color: var(--on-surface-variant);
    font-family: var(--sans); font-size: 11px;
    cursor: pointer;
  }
  .tab[aria-current="page"] { color: var(--primary); }
  .tab[aria-current="page"] .pill { background: var(--primary-container); }
  .tab .pill { display: grid; place-items: center; width: 52px; height: 28px; border-radius: 999px; }
  .gesture { display: grid; place-items: center; height: 24px; }
  .gesture i { width: 108px; height: 4px; border-radius: 2px; background: var(--on-surface); opacity: 0.4; }

  /* Edit-mode Tweaks sheet. */
  .tray {
    position: absolute;
    left: 16px; right: 16px; bottom: 96px;
    z-index: 20;
    padding: 16px;
    border-radius: 16px;
    background: rgba(28, 27, 23, 0.96);
    color: #f6f3e7;
    font-family: var(--mono);
    font-size: 11px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
  }
  .tray[hidden] { display: none; }
  .tray h3 { margin: 0 0 8px; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #d7b26a; }
  .tray label { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 0; }
  .tray input[type="color"] { width: 42px; height: 24px; border: 1px solid rgba(246, 243, 231, 0.4); background: none; padding: 0; }
  .tray input[type="range"] { width: 112px; accent-color: #d7b26a; }
  .tray select { background: #2a2a24; color: #f6f3e7; border: 1px solid rgba(246, 243, 231, 0.3); border-radius: 8px; font-family: var(--mono); font-size: 11px; padding: 2px 4px; }

  /* Dark theme re-picks the tonal roles rather than inverting them. */
  body.dark {
    --primary: #a8c69a;
    --on-primary: #1d2a17;
    --primary-container: #33452c;
    --on-primary-container: #d9e7ce;
    --secondary: #e0a58c;
    --on-secondary: #3a1c12;
    --surface: #141612;
    --surface-1: #1d201a;
    --surface-2: #262a22;
    --on-surface: #e9eadf;
    --on-surface-variant: #b0b3a3;
    --outline: #8b907c;
    --outline-soft: #363b30;
  }
  body.dark .ring { background: conic-gradient(var(--primary) 0 60%, rgba(217, 231, 206, 0.18) 60% 100%); }
  body.dark .ring::after { background: var(--primary-container); }
  body.dark .fab { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); }

  @media (max-width: 411px) {
    .appbar, .content { padding-left: 16px; padding-right: 16px; }
    .week { margin-left: 16px; margin-right: 16px; }
    .fab { right: 16px; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }
  button, input, select, textarea { font: inherit; }
</style>
</head>
<body>
<div class="device">
  <div class="screen">
    <div class="status" aria-hidden="true">
      <span>8:24</span>
      <span class="camera"></span>
      <span class="status-icons">
        <svg width="16" height="12" viewBox="0 0 16 12"><g fill="currentColor"><rect x="0" y="8" width="2.6" height="4" rx=".6"/><rect x="4.2" y="5.5" width="2.6" height="6.5" rx=".6"/><rect x="8.4" y="3" width="2.6" height="9" rx=".6"/><rect x="12.6" y="0" width="2.6" height="12" rx=".6"/></g></svg>
        <svg width="16" height="12" viewBox="0 0 17 12"><path fill="currentColor" d="M8.5 2.2c-2.6 0-5 1-6.8 2.7l1.3 1.3a8 8 0 0 1 11 0l1.3-1.3A9.7 9.7 0 0 0 8.5 2.2zm0 3.4c-1.5 0-2.9.6-4 1.6l1.3 1.3a4 4 0 0 1 5.4 0l1.3-1.3a5.7 5.7 0 0 0-4-1.6zm0 3.3c-.6 0-1.1.2-1.5.6L8.5 11l1.5-1.5a2.2 2.2 0 0 0-1.5-.6z"/></svg>
        <svg width="23" height="12" viewBox="0 0 23 12"><rect x="0.5" y="0.5" width="19" height="11" rx="3" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor"/><path d="M21 4.2v3.6c.9-.3 1.4-1 1.4-1.8S21.9 4.5 21 4.2z" fill="currentColor" opacity=".55"/></svg>
      </span>
    </div>

    <header class="appbar">
      <div>
        <p class="greeting">3 月 12 日 · 晴 17℃</p>
        <h1>今日养护</h1>
      </div>
      <div class="avatar" aria-label="账号：Lin">Lin</div>
    </header>

    <div class="week" role="group" aria-label="本周日期">
      <button class="day" type="button" aria-pressed="false"><span>一</span><b>9</b></button>
      <button class="day" type="button" aria-pressed="false"><span>二</span><b>10</b></button>
      <button class="day" type="button" aria-pressed="false"><span>三</span><b>11</b></button>
      <button class="day" type="button" aria-pressed="true"><span>四</span><b>12</b></button>
      <button class="day" type="button" aria-pressed="false"><span>五</span><b>13</b></button>
      <button class="day" type="button" aria-pressed="false"><span>六</span><b>14</b></button>
      <button class="day" type="button" aria-pressed="false"><span>日</span><b>15</b></button>
    </div>

    <main class="content">
      <section class="week-card" aria-label="本周浇水进度">
        <div class="ring" role="img" aria-label="本周浇水完成 3 次，共 5 次"><span id="ring-count">3/5</span></div>
        <div>
          <h2>本周浇水</h2>
          <p id="week-note">还有两次，周末前完成即可。喜水植物可以放在北窗。</p>
        </div>
      </section>

      <div class="section-head"><h2>今天要做</h2><span>3 项</span></div>
      <ul class="tasks" id="tasks">
        <li class="task done">
          <button type="button" aria-label="标记为未完成：龟背竹 浇水"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg></button>
          <p class="name">龟背竹 · 浇水</p>
          <span class="due">已完成 07:40</span>
        </li>
        <li class="task">
          <button type="button" aria-label="标记完成：琴叶榕 转盆"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg></button>
          <p class="name">琴叶榕 · 转盆</p>
          <span class="due">每 10 天</span>
        </li>
        <li class="task">
          <button type="button" aria-label="标记完成：薄荷 修剪"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg></button>
          <p class="name">薄荷 · 修剪</p>
          <span class="due">建议今天</span>
        </li>
      </ul>

      <div class="section-head"><h2>窗台植物</h2><span>4 盆</span></div>
      <ul class="plants">
        <li class="plant"><div class="plant-head"><span class="glyph">龟</span><b>龟背竹</b></div><span>北窗</span></li>
        <li class="plant"><div class="plant-head"><span class="glyph">琴</span><b>琴叶榕</b></div><span>东窗</span></li>
        <li class="plant"><div class="plant-head"><span class="glyph">薄</span><b>薄荷</b></div><span>南窗</span></li>
        <li class="plant"><div class="plant-head"><span class="glyph">蕨</span><b>铁线蕨</b></div><span>浴室</span></li>
      </ul>

      <p class="note">示例数据 · 勾选任务会实时更新周进度环。</p>
    </main>

    <button class="fab" type="button" aria-label="添加养护任务">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
    </button>

    <div class="bottom">
      <nav class="nav" aria-label="主导航">
        <button class="tab" type="button" aria-current="page"><span class="pill"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5 12 5l8 6.5V20H4z"/></svg></span>今日</button>
        <button class="tab" type="button"><span class="pill"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20c0-7 3-12 8-14-1 9-4 12-8 14zM12 20C9 15 6 13 4 6c4 1 8 5 8 14z"/></svg></span>植物</button>
        <button class="tab" type="button"><span class="pill"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5h14v14H5zM8 9h8M8 13h8M8 17h5"/></svg></span>记录</button>
      </nav>
      <div class="gesture" aria-hidden="true"><i></i></div>
    </div>

    <div class="tray" id="tweaks" hidden>
      <h3>Tweaks · 苔记</h3>
      <label>主色 <input type="color" id="tw-primary" value="#3d5a3a"></label>
      <label>圆角 <input type="range" id="tw-radius" min="0" max="28" step="2" value="16"><output id="tw-radius-out">16px</output></label>
      <label>密度
        <select id="tw-density">
          <option value="1">标准</option>
          <option value="0.82">紧凑</option>
          <option value="1.18">宽松</option>
        </select>
      </label>
      <label>深色模式 <input type="checkbox" id="tw-dark"></label>
    </div>
  </div>
</div>

<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "primaryColor": "#3d5a3a",
  "radius": 16,
  "density": "standard",
  "dark": false
}/*EDITMODE-END*/;

const DENSITY = { standard: 1, compact: 0.82, roomy: 1.18 };
const root = document.documentElement;
const body = document.body;
const tray = document.getElementById('tweaks');

function applyTweaks(edits) {
  const v = Object.assign({}, TWEAK_DEFAULTS, edits || {});
  root.style.setProperty('--primary', v.primaryColor);
  root.style.setProperty('--radius', v.radius + 'px');
  root.style.setProperty('--density', String(DENSITY[v.density] || 1));
  body.classList.toggle('dark', v.dark === true);
  const primary = document.getElementById('tw-primary');
  const radius = document.getElementById('tw-radius');
  const radiusOut = document.getElementById('tw-radius-out');
  const density = document.getElementById('tw-density');
  const dark = document.getElementById('tw-dark');
  if (primary) primary.value = v.primaryColor;
  if (radius) radius.value = v.radius;
  if (radiusOut) radiusOut.textContent = v.radius + 'px';
  if (density) density.value = v.density;
  if (dark) dark.checked = v.dark === true;
  return v;
}
window.__dsApplyTweaks = applyTweaks;

function postTweaks(edits) {
  try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: edits }, '*'); } catch (error) {}
}

function bindTray() {
  const primary = document.getElementById('tw-primary');
  const radius = document.getElementById('tw-radius');
  const density = document.getElementById('tw-density');
  const dark = document.getElementById('tw-dark');
  if (primary) primary.addEventListener('input', function () {
    applyTweaks({ primaryColor: primary.value });
    postTweaks({ primaryColor: primary.value });
  });
  if (radius) radius.addEventListener('input', function () {
    const value = Number(radius.value);
    applyTweaks({ radius: value });
    postTweaks({ radius: value });
  });
  if (density) density.addEventListener('change', function () {
    applyTweaks({ density: density.value });
    postTweaks({ density: density.value });
  });
  if (dark) dark.addEventListener('change', function () {
    applyTweaks({ dark: dark.checked });
    postTweaks({ dark: dark.checked });
  });
}

/* Task list interaction drives the weekly ring, so the prototype is real. */
function updateRing() {
  const tasks = Array.prototype.slice.call(document.querySelectorAll('#tasks .task'));
  const done = tasks.filter(function (task) { return task.classList.contains('done'); }).length;
  const count = document.getElementById('ring-count');
  const note = document.getElementById('week-note');
  const weekDone = Math.min(5, done + 2);
  document.querySelector('.ring').style.background = 'conic-gradient(var(--primary) 0 ' + (weekDone / 5 * 100) + '%, rgba(31, 44, 25, 0.16) ' + (weekDone / 5 * 100) + '% 100%)';
  if (count) count.textContent = weekDone + '/5';
  if (note) {
    note.textContent = weekDone >= 5
      ? '本周的量完成了。剩下时间只要观察叶面。'
      : '本周已记 ' + weekDone + ' 次，还差 ' + (5 - weekDone) + ' 次。喜水植物可以放在北窗。';
  }
  if (tasks.length === done + 2) { /* keep prototype text stable */ }
}
document.querySelectorAll('#tasks .task button').forEach(function (button) {
  button.addEventListener('click', function () {
    var task = button.closest('.task');
    task.classList.toggle('done');
    button.setAttribute('aria-label', (task.classList.contains('done') ? '标记为未完成：' : '标记完成：') + task.querySelector('.name').textContent.split('·')[0].trim());
    updateRing();
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
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (event.key === 't' || event.key === 'T') tray.hidden = !tray.hidden;
});

bindTray();
applyTweaks(TWEAK_DEFAULTS);
updateRing();
</script>
</body>
</html>
`
