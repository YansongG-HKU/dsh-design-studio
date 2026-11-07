/**
 * Scaffold `anim` — stage + sprite timeline (requestAnimationFrame, no libraries).
 *
 * Visual direction: dark screening room, warm light, editorial motion titles for a
 * fictional solstice exhibition. Real timeline engine: play/pause, scrub, rate,
 * reduced-motion respect, localStorage position restore.
 * Self-contained, no external requests, Claude edit-mode Tweaks protocol.
 */
export default String.raw`<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>至日 · 动效时间轴样板</title>
<style>
  :root {
    --room: #0f0f0d;
    --stage: #141412;
    --bone: #f2ecdf;
    --bone-soft: #cfc8b8;
    --muted: #8d8779;
    --accent: #d98a4f;
    --rule: rgba(242, 236, 223, 0.16);
    --title-size: 236px;
    --serif: "Iowan Old Style", "Palatino Linotype", "Source Han Serif SC", "Songti SC", "Noto Serif CJK SC", serif;
    --sans: "Neue Haas Grotesk Text Pro", "Avenir Next", "Segoe UI Variable Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    --mono: "Cascadia Code", "SF Mono", "JetBrains Mono", Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    min-height: 100vh;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: var(--room);
    color: var(--bone);
    font-family: var(--sans);
    font-size: 16px;
    line-height: 1.5;
  }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

  /* 1920×1080 stage, scaled to fit the viewport without touching layout units. */
  #stage {
    position: absolute;
    top: 0; left: 0;
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background: var(--stage);
    transform-origin: top left;
  }
  #stage::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(242, 236, 223, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .sprite {
    position: absolute;
    opacity: 0;
    will-change: transform, opacity;
  }
  .sprite::after {
    content: attr(data-label);
    position: absolute;
    top: -30px;
    left: 0;
    display: none;
    font-family: var(--mono);
    font-size: 18px;
    letter-spacing: 0.08em;
    color: var(--accent);
    white-space: nowrap;
  }
  body.show-guides .sprite::after { display: block; }

  .rule-top { top: 236px; left: 160px; width: 420px; height: 2px; background: var(--accent); transform-origin: left center; }
  .cycle { top: 262px; left: 160px; margin: 0; font-family: var(--mono); font-size: 26px; letter-spacing: 0.34em; text-transform: uppercase; color: var(--muted); }
  .title {
    top: 320px;
    left: 150px;
    margin: 0;
    font-family: var(--serif);
    font-size: var(--title-size);
    font-weight: 600;
    line-height: 1.02;
    letter-spacing: -0.03em;
    color: var(--bone);
  }
  .title em { font-style: normal; color: var(--accent); }
  .title-en {
    top: 640px;
    left: 166px;
    margin: 0;
    font-family: var(--mono);
    font-size: 44px;
    letter-spacing: 0.42em;
    text-transform: uppercase;
    color: var(--bone-soft);
  }
  .sub {
    top: 736px;
    left: 166px;
    max-width: 820px;
    margin: 0;
    font-size: 38px;
    line-height: 1.5;
    color: var(--bone-soft);
  }
  .sun {
    top: 208px;
    left: 1236px;
    width: 468px;
    height: 468px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 1px rgba(242, 236, 223, 0.14);
  }
  .sun::after {
    content: "";
    position: absolute;
    inset: 26px;
    border-radius: 50%;
    border: 1px solid rgba(20, 20, 18, 0.28);
  }
  .meta {
    top: 900px;
    left: 160px;
    right: 160px;
    display: flex;
    justify-content: space-between;
    gap: 40px;
    padding-top: 22px;
    border-top: 1px solid var(--rule);
    font-family: var(--mono);
    font-size: 28px;
    letter-spacing: 0.08em;
    color: var(--muted);
  }
  .meta b { color: var(--bone-soft); font-weight: 400; }
  .sign {
    top: 840px;
    right: 160px;
    text-align: right;
    font-family: var(--mono);
    font-size: 24px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent);
  }

  /* Controls live outside the stage so they never scale with it. */
  #controls {
    position: fixed;
    left: 50%;
    bottom: 26px;
    transform: translateX(-50%);
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    border: 1px solid var(--rule);
    border-radius: 999px;
    background: rgba(15, 15, 13, 0.82);
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.4);
  }
  #controls button {
    min-width: 44px;
    height: 44px;
    padding: 0 16px;
    border: 1px solid var(--rule);
    border-radius: 999px;
    background: transparent;
    color: var(--bone);
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.08em;
    cursor: pointer;
  }
  #controls button:hover { border-color: var(--accent); color: var(--accent); }
  #scrubber { width: 280px; accent-color: var(--accent); }
  #time { min-width: 104px; font-family: var(--mono); font-size: 12px; letter-spacing: 0.04em; color: var(--muted); text-align: right; }
  .caption {
    position: fixed;
    left: 24px;
    top: 24px;
    z-index: 20;
    margin: 0;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(242, 236, 223, 0.5);
  }

  /* Tweaks tray. */
  .tray {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 30;
    width: 252px;
    padding: 16px;
    border: 1px solid var(--rule);
    border-radius: 10px;
    background: rgba(15, 15, 13, 0.96);
    font-family: var(--mono);
    font-size: 11px;
    color: var(--bone-soft);
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42);
  }
  .tray[hidden] { display: none; }
  .tray h3 { margin: 0 0 8px; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); }
  .tray label { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 0; }
  .tray input[type="color"] { width: 42px; height: 24px; border: 1px solid var(--rule); background: none; padding: 0; }
  .tray input[type="range"] { width: 112px; accent-color: var(--accent); }

  @media (max-width: 720px) {
    #controls { flex-wrap: wrap; justify-content: center; width: calc(100% - 32px); border-radius: 16px; }
    #scrubber { width: 100%; }
    .caption { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }
  button, input, select, textarea { font: inherit; }
</style>
</head>
<body>
<div id="stage" aria-label="至日 动效舞台">
  <span class="sprite rule-top" data-start="0.15" data-enter="scaleX" data-label="rule 0.15s"></span>
  <p class="sprite cycle" data-start="0.35" data-enter="fade" data-label="label 0.35s">光周期 · THE LIGHT CYCLE</p>
  <h1 class="sprite title" data-start="0.75" data-enter="slide-up" data-label="title 0.75s">至<em>日</em></h1>
  <p class="sprite title-en" data-start="1.35" data-enter="fade" data-label="latin 1.35s">SOLSTICE</p>
  <p class="sprite sub" data-start="1.85" data-enter="slide-up" data-label="sub 1.85s">一场关于日照、影子与城市作息的夏季展览</p>
  <div class="sprite sun" data-start="2.35" data-enter="grow" data-label="disc 2.35s" aria-hidden="true"></div>
  <p class="sprite sign" data-start="3.05" data-enter="fade" data-label="brand 3.05s">东岸仓库 3 号</p>
  <div class="sprite meta" data-start="3.45" data-enter="slide-up" data-label="meta 3.45s">
    <span>展期 <b>2026.06.21 — 08.03</b></span>
    <span>开放 <b>周二至周日 11:00</b></span>
    <span>入场 <b>免费</b></span>
  </div>
</div>

<p class="caption">Motion study · 5.2s · requestAnimationFrame</p>

<div id="controls" role="group" aria-label="时间轴控制">
  <button type="button" id="play">播放</button>
  <input id="scrubber" type="range" min="0" max="5200" value="0" step="10" aria-label="时间轴位置">
  <span id="time">0.00 / 5.20</span>
  <button type="button" id="reset">重来</button>
</div>

<div class="tray" id="tweaks" hidden>
  <h3>Tweaks · 动效</h3>
  <label>光色 <input type="color" id="tw-accent" value="#d98a4f"></label>
  <label>标题字号 <input type="range" id="tw-title" min="180" max="300" step="10" value="236"><output id="tw-title-out">236px</output></label>
  <label>播放速度 <input type="range" id="tw-rate" min="0.5" max="1.5" step="0.25" value="1"><output id="tw-rate-out">1×</output></label>
  <label>时间标记 <input type="checkbox" id="tw-guides"></label>
</div>

<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#d98a4f",
  "titleSize": 236,
  "playbackRate": 1,
  "showGuides": false
}/*EDITMODE-END*/;

const DURATION = 5200;
const STORAGE_KEY = 'dsh-anim-solstice-time';
const root = document.documentElement;
const body = document.body;
const tray = document.getElementById('tweaks');
const scrubber = document.getElementById('scrubber');
const timeReadout = document.getElementById('time');
const playButton = document.getElementById('play');

const sprites = Array.prototype.slice.call(document.querySelectorAll('.sprite')).map(function (element) {
  return {
    element: element,
    start: parseFloat(element.dataset.start || '0') * 1000,
    end: element.dataset.end ? parseFloat(element.dataset.end) * 1000 : DURATION,
    enter: element.dataset.enter || 'fade'
  };
});

let currentTime = 0;
let playing = false;
let lastStamp = 0;
let rate = 1;
let frameHandle = 0;

const easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

function applyFrame(time) {
  sprites.forEach(function (sprite) {
    const element = sprite.element;
    if (time < sprite.start || time > sprite.end) {
      element.style.opacity = '0';
      return;
    }
    const local = Math.min(1, (time - sprite.start) / 620);
    const progress = easeOut(local);
    element.style.opacity = String(progress);
    if (sprite.enter === 'slide-up') element.style.transform = 'translateY(' + (1 - progress) * 48 + 'px)';
    else if (sprite.enter === 'slide-left') element.style.transform = 'translateX(' + (1 - progress) * 64 + 'px)';
    else if (sprite.enter === 'scaleX') element.style.transform = 'scaleX(' + progress + ')';
    else if (sprite.enter === 'grow') element.style.transform = 'scale(' + (0.62 + progress * 0.38) + ')';
    else element.style.transform = 'none';
  });
  if (scrubber) scrubber.value = String(Math.round(time));
  if (timeReadout) timeReadout.textContent = (time / 1000).toFixed(2) + ' / ' + (DURATION / 1000).toFixed(2);
}

function saveTime() {
  try { localStorage.setItem(STORAGE_KEY, String(Math.round(currentTime))); } catch (error) {}
}

function tick(stamp) {
  if (!playing) return;
  if (!lastStamp) lastStamp = stamp;
  const delta = stamp - lastStamp;
  lastStamp = stamp;
  currentTime += delta * rate;
  if (currentTime >= DURATION) {
    currentTime = DURATION;
    playing = false;
    if (playButton) playButton.textContent = '重播';
    saveTime();
  }
  applyFrame(currentTime);
  if (playing) frameHandle = requestAnimationFrame(tick);
}

function play() {
  if (playing) {
    playing = false;
    if (playButton) playButton.textContent = '播放';
    if (frameHandle) cancelAnimationFrame(frameHandle);
    saveTime();
    return;
  }
  if (currentTime >= DURATION) currentTime = 0;
  playing = true;
  lastStamp = 0;
  if (playButton) playButton.textContent = '暂停';
  frameHandle = requestAnimationFrame(tick);
}

function pause() {
  playing = false;
  if (playButton) playButton.textContent = '播放';
  if (frameHandle) cancelAnimationFrame(frameHandle);
  saveTime();
}

function seek(time) {
  currentTime = Math.max(0, Math.min(DURATION, time));
  applyFrame(currentTime);
  saveTime();
}

if (playButton) playButton.addEventListener('click', play);
if (scrubber) scrubber.addEventListener('input', function () {
  pause();
  seek(Number(scrubber.value));
});
const resetButton = document.getElementById('reset');
if (resetButton) resetButton.addEventListener('click', function () {
  pause();
  seek(0);
  if (playButton) playButton.textContent = '播放';
});

window.addEventListener('keydown', function (event) {
  const tag = event.target && event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault();
    play();
  } else if (event.key === 'ArrowRight') {
    pause();
    seek(currentTime + 200);
  } else if (event.key === 'ArrowLeft') {
    pause();
    seek(currentTime - 200);
  } else if (event.key === 'r' || event.key === 'R') {
    pause();
    seek(0);
  }
});
window.addEventListener('beforeunload', saveTime);

function applyTweaks(edits) {
  const v = Object.assign({}, TWEAK_DEFAULTS, edits || {});
  rate = Number(v.playbackRate) || 1;
  root.style.setProperty('--accent', v.accentColor);
  root.style.setProperty('--title-size', v.titleSize + 'px');
  body.classList.toggle('show-guides', v.showGuides === true);
  const accent = document.getElementById('tw-accent');
  const title = document.getElementById('tw-title');
  const titleOut = document.getElementById('tw-title-out');
  const rateInput = document.getElementById('tw-rate');
  const rateOut = document.getElementById('tw-rate-out');
  const guides = document.getElementById('tw-guides');
  if (accent) accent.value = v.accentColor;
  if (title) title.value = v.titleSize;
  if (titleOut) titleOut.textContent = v.titleSize + 'px';
  if (rateInput) rateInput.value = v.playbackRate;
  if (rateOut) rateOut.textContent = Number(v.playbackRate).toFixed(2).replace(/\.?0+$/, '') + '×';
  if (guides) guides.checked = v.showGuides === true;
  return v;
}
window.__dsApplyTweaks = applyTweaks;

function postTweaks(edits) {
  try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: edits }, '*'); } catch (error) {}
}

function bindTray() {
  const accent = document.getElementById('tw-accent');
  const title = document.getElementById('tw-title');
  const rateInput = document.getElementById('tw-rate');
  const guides = document.getElementById('tw-guides');
  if (accent) accent.addEventListener('input', function () {
    applyTweaks({ accentColor: accent.value });
    postTweaks({ accentColor: accent.value });
  });
  if (title) title.addEventListener('input', function () {
    const value = Number(title.value);
    applyTweaks({ titleSize: value });
    postTweaks({ titleSize: value });
  });
  if (rateInput) rateInput.addEventListener('input', function () {
    const value = Number(rateInput.value);
    applyTweaks({ playbackRate: value });
    postTweaks({ playbackRate: value });
  });
  if (guides) guides.addEventListener('change', function () {
    applyTweaks({ showGuides: guides.checked });
    postTweaks({ showGuides: guides.checked });
  });
}

/* Stage fit: transform only, so the 1920×1080 composition never reflows. */
function fit() {
  const stage = document.getElementById('stage');
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  stage.style.transform = 'scale(' + scale + ')';
  stage.style.left = (window.innerWidth - 1920 * scale) / 2 + 'px';
  stage.style.top = (window.innerHeight - 1080 * scale) / 2 + 'px';
}
fit();
window.addEventListener('resize', fit);

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

/* Restore the saved play-head; reduced motion starts on the final frame. */
var savedTime = Number(localStorage.getItem(STORAGE_KEY) || 0);
if (!Number.isFinite(savedTime)) savedTime = 0;
if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) savedTime = DURATION;
seek(savedTime);
bindTray();
applyTweaks(TWEAK_DEFAULTS);
</script>
</body>
</html>
`
