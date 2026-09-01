/* =====================================================================
   DOBANESS — a wall of Kenyan comments. Vanilla canvas, no framework.
   Change-spec v2: tap dismisses+refills at any count, 3 exclusive
   reactions, fixed type sizes, 65% desktop column, widgets+forms, intro.
===================================================================== */

// Persisted per-browser session id, threaded through every write (§6.1's
// session_id columns) so related rows can be correlated later.
function getSessionId() {
  try {
    let id = localStorage.getItem('dbn_session_id');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('dbn_session_id', id); }
    return id;
  } catch (e) { return null; }
}
const SESSION_ID = getSessionId();

/* ---------------------------------------------------------------------
   CONTENT MODEL
--------------------------------------------------------------------- */
const AXES = [
  { key: 'mtaa',   title: 'Mtaa Vibes',            emoji: '🏘️' },
  { key: 'matatu', title: 'Matatu Diaries',         emoji: '🚐' },
  { key: 'situ',   title: 'Situationship Files',    emoji: '💔' },
  { key: 'comr',   title: "Comrades' Corner",       emoji: '🎓' },
  { key: 'bunge',  title: 'Ka Bunge',               emoji: '🏛️' },
  { key: 'other',  title: 'Others',                 emoji: '✳️' },
];
const AXIS_BY_KEY = Object.fromEntries(AXES.map(a => [a.key, a]));
const AXIS_COLOR = {
  mtaa: '#FF9A3D', matatu: '#31D2F7', situ: '#FF6B9D',
  comr: '#8FE388', bunge: '#FFC531', other: '#A855F7',
};

// Three, identical on every splash — change-spec v2 §2.
const REACTION_SET = [
  { key: 'fire', emoji: '🔥' },
  { key: 'heart', emoji: '❤️' },
  { key: 'down', emoji: '👎' },
];

const TASKBEE = { brand: 'TASKBEE', line: 'Launch your online store for KSh 10,000', url: 'taskbee.co.ke', href: 'https://taskbee.co.ke/' };

// Founding sponsor — revision-spec §4. Taskbee is sponsor zero and sits
// outside the ten founding slots (not counted against FOUNDING_SLOTS_TOTAL).
const LAUNCH_DATE_HUMAN = '1 October 2026';
const FOUNDING_SLOTS_TOTAL = 10;

const PALETTE = ['#FF4D2E', '#FFC531', '#17A66E', '#2B62F0', '#A855F7', '#F43F5E', '#0EA5E9'];
const GRAD_PAIRS = [
  ['#FF4D2E', '#FF9A3D'], ['#FFC531', '#FF6B9D'], ['#17A66E', '#8FE388'],
  ['#2B62F0', '#31D2F7'], ['#A855F7', '#FF6BCB'], ['#F43F5E', '#FB923C'],
  ['#0EA5E9', '#22D3EE'], ['#84CC16', '#FACC15'], ['#7C3AED', '#2563EB'],
];
// Orange is reserved for actions (the CTA button) — the karibu splash and
// the ambient bundle splashes pick from a non-orange subset instead
// (intro patch v2.1 §1, §3).
const NON_ORANGE_GRADS = [
  ['#17A66E', '#8FE388'], ['#2B62F0', '#31D2F7'], ['#A855F7', '#FF6BCB'],
  ['#0EA5E9', '#22D3EE'], ['#84CC16', '#FACC15'], ['#7C3AED', '#2563EB'],
  ['#FFC531', '#FF6B9D'],
];
// Ambient splashes get a stricter cut — even the gold/pink pair above reads
// a little warm next to the orange CTA ("avoid orange gradients here too").
const AMBIENT_GRADS = [
  ['#17A66E', '#8FE388'], ['#2B62F0', '#31D2F7'], ['#A855F7', '#FF6BCB'],
  ['#0EA5E9', '#22D3EE'], ['#84CC16', '#22C55E'], ['#7C3AED', '#2563EB'],
];
const INK = '#16161A';
const FONT_HEAVY = '"Arial Black","Archivo Black",Impact,sans-serif';
const FONT_UI = '"Inter","Helvetica Neue",Helvetica,Arial,sans-serif';
const FONT_MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace';
const heavyFont = px => '900 ' + px + 'px ' + FONT_HEAVY;

const SCENE_SHARE = 0.5;
const PHOTO_W = 640, PHOTO_H = 480;

/* ---------------------------------------------------------------------
   TIMING (change-spec v2 §6)
--------------------------------------------------------------------- */
const TIME_GROW = 620, TIME_HOLD = 3000, TIME_EXIT = 460, HOLD_JITTER = 0.35;
const SEQ_OFFSET_MS = 150;
const REACT_DWELL_BONUS_MS = 1200;
const HOLD_GESTURE_MS = 220;   // press duration beyond which it's a hold, not a tap
const TAP_MOVE_TOLERANCE = 14; // px

/* ---------------------------------------------------------------------
   TYPE — two fixed sizes, identical on every device except a narrow floor
   below 360px viewport width (change-spec v2 §4)
--------------------------------------------------------------------- */
const TYPE_STANDARD_PX = 27;
const TYPE_SHORT_PX = 35;
const NARROW_FLOOR_PX = 360;
const MIN_RADIUS_FRACTION = 0.30;
function narrowFactor() { return Math.min(1, window.innerWidth / NARROW_FLOOR_PX); }

/* ---------------------------------------------------------------------
   RANDOM / NOISE — vanilla replacements for p5's random()/noise()
--------------------------------------------------------------------- */
const TWO_PI = Math.PI * 2;
function rand(a, b) { if (b === undefined) { b = a; a = 0; } return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Compact 2D Perlin noise (Ken Perlin's improved permutation scheme).
const PERM = (() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
})();
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t, a, b) { return a + t * (b - a); }
function grad2(hash, x, y) {
  const h = hash & 7;
  const u = h < 4 ? x : y, v = h < 4 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
}
function noise(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  x -= Math.floor(x); y -= Math.floor(y);
  const u = fade(x), v = fade(y);
  const a = PERM[X] + Y, aa = PERM[a], ab = PERM[a + 1];
  const b = PERM[X + 1] + Y, ba = PERM[b], bb = PERM[b + 1];
  const res = lerp(v,
    lerp(u, grad2(PERM[aa], x, y), grad2(PERM[ba], x - 1, y)),
    lerp(u, grad2(PERM[ab], x, y - 1), grad2(PERM[bb], x - 1, y - 1)));
  return (res + 1) / 2;
}

/* ---------------------------------------------------------------------
   ACCESSIBILITY / DEVICE STATE
--------------------------------------------------------------------- */
let REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
if (window.matchMedia) {
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (rm.addEventListener) rm.addEventListener('change', e => { REDUCED = e.matches; });
}
let TIER = 'desktop';
function computeTier() {
  const w = window.innerWidth;
  if (w < 720) return 'mobile';
  if (w < 1100) return 'tablet';
  return 'desktop';
}

/* ---------------------------------------------------------------------
   CANVAS SETUP — plain Canvas2D, dpr capped at 2
--------------------------------------------------------------------- */
const holder = document.getElementById('board-holder');
const canvas = document.createElement('canvas');
canvas.setAttribute('role', 'img');
canvas.setAttribute('aria-label', 'A wall of Kenyan comments, thrown on as paint splashes');
holder.appendChild(canvas);
const ctx = canvas.getContext('2d');
let W = 0, H = 0;

function resizeCanvas() {
  const rect = holder.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(100, Math.round(rect.width));
  H = Math.max(100, Math.round(rect.height));
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bg = makeBoardTexture();
  TIER = computeTier();
  ensureSlots();
}

/* ---------------------------------------------------------------------
   OFFSCREEN GRAPHICS + BACKGROUND IMAGE
--------------------------------------------------------------------- */
function makeOffscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

const BG_IMAGE_OPACITY = 0.65;
let bgImage = null, bgImageReady = false;
function loadBgImage() {
  bgImage = new Image();
  bgImage.onload = () => { bgImageReady = bgImage.naturalWidth > 0; bg = makeBoardTexture(); };
  bgImage.onerror = () => { bgImageReady = false; };
  bgImage.src = 'dobaness-bg.jpg';
}

function makeBoardTexture() {
  const w = W, h = H;
  const cvs = makeOffscreen(w, h);
  const c = cvs.getContext('2d');

  c.fillStyle = '#9B968E';
  c.fillRect(0, 0, w, h);

  for (let i = 0; i < 22; i++) {
    const r = rand(120, 420), x = rand(w), y = rand(h);
    const rgb = Math.random() > 0.5 ? '235,230,220' : '60,55,48';
    const a = rand(4, 11) / 255;
    const g = c.createRadialGradient(x, y, r * 0.08, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const grains = Math.floor((w * h) / 95);
  const TONES = ['214,209,200', '182,176,166', '150,144,134', '124,118,108', '90,85,77'];
  for (let i = 0; i < grains; i++) {
    c.fillStyle = 'rgba(' + pick(TONES) + ',' + (rand(8, 26) / 255) + ')';
    c.fillRect(rand(w), rand(h), rand(1, 2.4), rand(1, 2.4));
  }
  for (let i = 0; i < (w * h) / 26000; i++) {
    c.fillStyle = 'rgba(70,64,56,' + (rand(10, 22) / 255) + ')';
    c.beginPath(); c.arc(rand(w), rand(h), rand(1.6, 3.4), 0, TWO_PI); c.fill();
  }

  c.fillStyle = 'rgba(162,158,151,0.55)';
  c.fillRect(0, 0, w, h);

  for (let i = 0; i < 60; i++) {
    c.strokeStyle = 'rgba(0,0,0,' + (2.0 / 255) + ')';
    c.lineWidth = Math.max(1, 24 - i * 0.36);
    const k = i * 1.6;
    c.strokeRect(k, k, w - k * 2, h - k * 2);
  }

  if (bgImageReady) {
    const iw = bgImage.naturalWidth, ih = bgImage.naturalHeight;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale, dh = ih * scale;
    c.save();
    c.globalAlpha = BG_IMAGE_OPACITY;
    c.drawImage(bgImage, (w - dw) / 2, (h - dh) / 2, dw, dh);
    c.restore();
  }

  return cvs;
}

function linGrad(c, x0, y0, x1, y1, stops) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const s of stops) g.addColorStop(s[0], s[1]);
  c.fillStyle = g;
}
function photoFinish(cvs, c) {
  const w = cvs.width, h = cvs.height;
  for (let i = 0; i < (w * h) / 950; i++) {
    c.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255' : '0,0,0') + ',' + ((Math.random() * 14 + 4) / 255) + ')';
    c.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
  }
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}
function newPhoto() { return makeOffscreen(PHOTO_W, PHOTO_H); }

function photoDusk() {
  const cvs = newPhoto(), c = cvs.getContext('2d'), w = PHOTO_W, h = PHOTO_H;
  linGrad(c, 0, 0, 0, h * 0.8, [[0, '#241442'], [0.45, '#6d2a5e'], [0.78, '#ff7038'], [1, '#ffc55c']]);
  c.fillRect(0, 0, w, h * 0.8);
  c.fillStyle = '#150b20'; c.fillRect(0, h * 0.78, w, h * 0.22);
  const sx = w * 0.5, sy = h * 0.62;
  let g = c.createRadialGradient(sx, sy, 4, sx, sy, h * 0.42);
  g.addColorStop(0, 'rgba(255,240,190,0.95)'); g.addColorStop(0.25, 'rgba(255,190,110,0.45)'); g.addColorStop(1, 'rgba(255,150,80,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = '#fff3cf'; c.beginPath(); c.arc(sx, sy, h * 0.075, 0, TWO_PI); c.fill();
  c.fillStyle = '#1a0f24';
  c.beginPath(); c.moveTo(0, h * 0.82);
  c.quadraticCurveTo(w * 0.2, h * 0.72, w * 0.42, h * 0.82);
  c.lineTo(w * 0.42, h); c.lineTo(0, h); c.closePath(); c.fill();
  c.fillStyle = '#110a18';
  c.beginPath(); c.moveTo(w * 0.3, h * 0.86);
  c.quadraticCurveTo(w * 0.62, h * 0.75, w, h * 0.88);
  c.lineTo(w, h); c.lineTo(w * 0.3, h); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(22,10,28,0.85)'; c.lineWidth = 2.4;
  for (let i = 0; i < 4; i++) {
    const bx = w * (0.15 + Math.random() * 0.7), by = h * (0.1 + Math.random() * 0.3), s = 5 + Math.random() * 5;
    c.beginPath(); c.moveTo(bx - s, by);
    c.quadraticCurveTo(bx - s * 0.4, by - s * 0.7, bx, by - s * 0.15);
    c.quadraticCurveTo(bx + s * 0.4, by - s * 0.7, bx + s, by);
    c.stroke();
  }
  photoFinish(cvs, c);
  return cvs;
}
function photoCity() {
  const cvs = newPhoto(), c = cvs.getContext('2d'), w = PHOTO_W, h = PHOTO_H;
  linGrad(c, 0, 0, 0, h, [[0, '#0a1024'], [0.6, '#152142'], [1, '#233758']]);
  c.fillRect(0, 0, w, h);
  const mx = w * 0.79, my = h * 0.18;
  let g = c.createRadialGradient(mx, my, 2, mx, my, 90);
  g.addColorStop(0, 'rgba(240,240,220,0.55)'); g.addColorStop(1, 'rgba(240,240,220,0)');
  c.fillStyle = g; c.fillRect(mx - 90, my - 90, 180, 180);
  c.fillStyle = '#f2efdc'; c.beginPath(); c.arc(mx, my, 21, 0, TWO_PI); c.fill();
  let x = -10;
  while (x < w) {
    const bw = 38 + Math.random() * 58, bh = h * (0.18 + Math.random() * 0.4);
    c.fillStyle = 'rgb(' + Math.floor(4 + Math.random() * 10) + ',' + Math.floor(6 + Math.random() * 12) + ',' + Math.floor(12 + Math.random() * 18) + ')';
    c.fillRect(x, h - bh, bw, bh);
    for (let wy = h - bh + 9; wy < h - 10; wy += 13) {
      for (let wx = x + 6; wx < x + bw - 7; wx += 10) {
        if (Math.random() < 0.28) {
          c.fillStyle = 'rgba(255,' + Math.floor(170 + Math.random() * 45) + ',' + Math.floor(70 + Math.random() * 50) + ',' + (0.55 + Math.random() * 0.4) + ')';
          c.fillRect(wx, wy, 4, 5);
        }
      }
    }
    x += bw + 2 + Math.random() * 12;
  }
  photoFinish(cvs, c);
  return cvs;
}
function photoBeach() {
  const cvs = newPhoto(), c = cvs.getContext('2d'), w = PHOTO_W, h = PHOTO_H;
  linGrad(c, 0, 0, 0, h * 0.55, [[0, '#9adce8'], [1, '#f7efd2']]);
  c.fillRect(0, 0, w, h * 0.55);
  linGrad(c, 0, h * 0.55, 0, h, [[0, '#39c3c9'], [0.5, '#1f96a5'], [1, '#0d6a78']]);
  c.fillRect(0, h * 0.55, w, h * 0.45);
  const g = c.createRadialGradient(w * 0.62, h * 0.42, 3, w * 0.62, h * 0.42, 70);
  g.addColorStop(0, 'rgba(255,255,240,0.9)'); g.addColorStop(1, 'rgba(255,255,240,0)');
  c.fillStyle = g; c.fillRect(w * 0.62 - 70, h * 0.42 - 70, 140, 140);
  c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const y = h * (0.58 + i * 0.035);
    c.beginPath(); c.moveTo(0, y);
    for (let px = 0; px <= w; px += 42) c.quadraticCurveTo(px + 21, y + (i % 2 ? 7 : -7), px + 42, y);
    c.stroke();
  }
  photoFinish(cvs, c);
  return cvs;
}
function photoMarket() {
  const cvs = newPhoto(), c = cvs.getContext('2d'), w = PHOTO_W, h = PHOTO_H;
  linGrad(c, 0, 0, 0, h, [[0, '#e0a868'], [1, '#8a4b2f']]);
  c.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 46) {
    c.fillStyle = (Math.floor(x / 46) % 2 === 0) ? '#e04b3a' : '#f6ead8';
    c.fillRect(x, 0, 46, h * 0.26);
  }
  c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(0, h * 0.26, w, 12);
  c.fillStyle = '#4a2e1a'; c.fillRect(0, h * 0.62, w, h * 0.38);
  c.fillStyle = '#3a2212';
  for (let i = 0; i < 4; i++) c.fillRect(w * 0.06 + i * w * 0.24, h * 0.64, w * 0.16, 14);
  for (let i = 0; i < 9; i++) {
    const x = w * 0.12 + i * 34 + (Math.random() * 8 - 4), y = h * 0.6 + Math.random() * 16;
    c.fillStyle = '#f08a2e'; c.beginPath(); c.arc(x, y, 15, 0, TWO_PI); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(x - 5, y - 5, 4, 0, TWO_PI); c.fill();
  }
  for (let i = 0; i < 4; i++) {
    const x = w * 0.66 + i * 40, y = h * 0.74 + (i % 2) * 12;
    if (i % 2 === 0) {
      c.fillStyle = '#2d6a2f'; c.beginPath(); c.arc(x, y, 22, 0, TWO_PI); c.fill();
      c.strokeStyle = '#1e4720'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x - 22, y); c.quadraticCurveTo(x, y - 14, x + 22, y); c.stroke();
    } else {
      c.fillStyle = '#e5484d'; c.beginPath(); c.arc(x, y, 21, Math.PI, 0); c.closePath(); c.fill();
      c.strokeStyle = '#2d6a2f'; c.lineWidth = 6;
      c.beginPath(); c.arc(x, y, 21, Math.PI, 0); c.stroke();
      c.fillStyle = '#1b1b1b';
      for (let s = 0; s < 6; s++) {
        const a = Math.PI + (s / 5) * Math.PI;
        c.beginPath(); c.arc(x + Math.cos(a) * 11, y - 3 + Math.sin(a) * 8, 2, 0, TWO_PI); c.fill();
      }
    }
  }
  photoFinish(cvs, c);
  return cvs;
}
function photoRoad() {
  const cvs = newPhoto(), c = cvs.getContext('2d'), w = PHOTO_W, h = PHOTO_H;
  linGrad(c, 0, 0, 0, h, [[0, '#141420'], [1, '#05050a']]);
  c.fillRect(0, 0, w, h);
  const vx = w * 0.5, vy = h * 0.42;
  c.fillStyle = '#0e0e16';
  c.beginPath(); c.moveTo(vx, vy); c.lineTo(w * 0.08, h); c.lineTo(w * 0.92, h); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(220,220,200,0.22)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(vx, vy); c.lineTo(w * 0.1, h); c.stroke();
  c.beginPath(); c.moveTo(vx, vy); c.lineTo(w * 0.9, h); c.stroke();
  for (let t = 0.12; t < 0.95; t += 0.09) {
    const y = vy + (h - vy) * t, s = t;
    c.fillStyle = 'rgba(230,230,210,' + (0.25 + t * 0.5) + ')';
    c.fillRect(vx - (3 * s + 1), y, 6 * s + 2, 24 * s + 6);
  }
  const tail = (x, y, r) => {
    const g = c.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, 'rgba(255,60,50,0.95)'); g.addColorStop(1, 'rgba(255,60,50,0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    c.fillStyle = '#ff3b30'; c.beginPath(); c.arc(x, y, r * 0.28, 0, TWO_PI); c.fill();
  };
  tail(vx - 60 * 0.8, h * 0.84, 30); tail(vx + 60 * 0.8, h * 0.84, 30);
  tail(vx - 34, h * 0.66, 16); tail(vx + 34, h * 0.66, 16);
  tail(vx - 18, h * 0.55, 8); tail(vx + 18, h * 0.55, 8);
  const lg = c.createRadialGradient(w * 0.14, h * 0.3, 2, w * 0.14, h * 0.3, 120);
  lg.addColorStop(0, 'rgba(255,240,200,0.5)'); lg.addColorStop(1, 'rgba(255,240,200,0)');
  c.fillStyle = lg; c.fillRect(w * 0.14 - 120, h * 0.3 - 120, 240, 240);
  c.strokeStyle = '#1a1a24'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(w * 0.14, h); c.lineTo(w * 0.14, h * 0.32); c.stroke();
  photoFinish(cvs, c);
  return cvs;
}
function photoBokeh() {
  const cvs = newPhoto(), c = cvs.getContext('2d'), w = PHOTO_W, h = PHOTO_H;
  linGrad(c, 0, 0, 0, h, [[0, '#131020'], [1, '#241836']]);
  c.fillRect(0, 0, w, h);
  const cols = ['255,77,46', '255,197,49', '23,166,110', '43,98,240', '168,85,247', '255,214,160'];
  const beam = (x0, x1, col) => {
    c.fillStyle = 'rgba(' + col + ',0.13)';
    c.beginPath(); c.moveTo(x0, -20); c.lineTo(x1, -20);
    c.lineTo(x1 + 130, h + 20); c.lineTo(x0 - 130, h + 20); c.closePath(); c.fill();
  };
  beam(w * 0.2, w * 0.34, cols[3]); beam(w * 0.48, w * 0.52, cols[0]); beam(w * 0.66, w * 0.82, cols[4]);
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * w, y = h * (0.1 + Math.random() * 0.74), r = 12 + Math.random() * 40;
    const col = pick(cols);
    c.fillStyle = 'rgba(' + col + ',0.26)'; c.beginPath(); c.arc(x, y, r, 0, TWO_PI); c.fill();
    c.fillStyle = 'rgba(' + col + ',0.5)'; c.beginPath(); c.arc(x, y, r * 0.6, 0, TWO_PI); c.fill();
  }
  c.fillStyle = '#0a0812';
  c.beginPath(); c.moveTo(0, h);
  for (let px = 0; px <= w; px += 60) c.quadraticCurveTo(px + 30, h * (0.72 + Math.random() * 0.14), px + 60, h * 0.86);
  c.lineTo(w, h); c.closePath(); c.fill();
  photoFinish(cvs, c);
  return cvs;
}

const PHOTOS = [];
function makePhotos() {
  PHOTOS[0] = photoDusk(); PHOTOS[1] = photoCity(); PHOTOS[2] = photoBeach();
  PHOTOS[3] = photoMarket(); PHOTOS[4] = photoRoad(); PHOTOS[5] = photoBokeh();
}

/* ---------------------------------------------------------------------
   BLOB GEOMETRY — unit-radius vertices; actual R is derived from text.
--------------------------------------------------------------------- */
function buildVerts(N = 100) {
  const nx = rand(1000), ny = rand(1000);
  const verts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TWO_PI;
    const cx = Math.cos(a), cy = Math.sin(a);
    let r = 0.78 + 0.26 * noise(nx + cx * 1.15, ny + cy * 1.15) + 0.14 * noise(nx + cx * 2.9 + 50, ny + cy * 2.9 + 50);
    verts.push({ a, r });
  }
  const fingers = Math.floor(rand(3, 6));
  for (let f = 0; f < fingers; f++) {
    const cIdx = Math.floor(rand(N)), fw = Math.floor(rand(6, 15)), amp = rand(0.22, 0.72), sig = Math.max(1, fw * 0.5);
    for (let k = -fw; k <= fw; k++) {
      const idx = (cIdx + k + N) % N;
      verts[idx].r += amp * Math.exp(-(k * k) / (2 * sig * sig));
    }
  }
  return verts;
}
function tracePath(c, s, t) {
  c.beginPath();
  const N = s.verts.length;
  for (let i = 0; i < N; i++) {
    const v = s.verts[i];
    const wob = REDUCED ? 1 : 1 + 0.014 * Math.sin(t * 1.6 + s.phase + v.a * 3);
    const rr = s.R * s.scale * v.r * wob;
    const x = s.x + Math.cos(v.a) * rr, y = s.y + Math.sin(v.a) * rr;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
}

/* ---------------------------------------------------------------------
   TEXT — fixed-size type, blob radius solved from it, floored at
   0.30×min(W,H) (change-spec v2 §4)
--------------------------------------------------------------------- */
function wrapWordsToLines(ctx2d, words, n) {
  if (n <= 1) return [words.join(' ')];
  let lo = 0, hi = words.reduce((s, w) => s + ctx2d.measureText(w + ' ').width, 0);
  const greedyWrap = maxW => {
    const lines = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx2d.measureText(test).width <= maxW || !cur) cur = test;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  };
  for (let iter = 0; iter < 22; iter++) {
    const mid = (lo + hi) / 2;
    const lines = greedyWrap(mid);
    if (lines.length > n) lo = mid; else hi = mid;
  }
  return greedyWrap(hi).slice(0, n);
}

// Solves (w/2)^2 + y^2 <= (rmin*R)^2 per line (body block + one meta line:
// axis pill + handle), then floors R at 0.30×min(W,H).
function fitTextToBlob(ctx2d, body, pillTitle, handle, rmin, wordClass, boardMinDim) {
  const words = String(body).trim().split(/\s+/).filter(Boolean);
  const nf = narrowFactor();
  let fontPx = (wordClass === 'short' ? TYPE_SHORT_PX : TYPE_STANDARD_PX) * nf;
  const minFontPx = TYPE_STANDARD_PX * 0.6 * nf;
  const pillPx = Math.max(8, 11 * nf);
  const handlePx = Math.max(9, 12 * nf);
  const dotR = pillPx * 0.32;
  const metaLineH = Math.max(pillPx, handlePx) * 1.3;

  ctx2d.font = '800 ' + pillPx + 'px ' + FONT_UI;
  const pillW = dotR * 2 + 6 + ctx2d.measureText(pillTitle.toUpperCase()).width;
  ctx2d.font = '600 ' + handlePx + 'px ' + FONT_MONO;
  const handleW = handle ? ctx2d.measureText(handle).width : 0;
  const sep = handle ? 10 : 0;
  const metaW = pillW + sep + handleW;

  // The 7–9 word rule is a *submission* constraint, not a rendering one —
  // the archive carries posts up to ~16 words. For those, escalate: shrink
  // font in steps (to a floor), then allow more lines, before growing the
  // blob (revision-spec §3). Posts within the normal two size classes never
  // enter this loop meaningfully — one pass, fixed font, exactly as before.
  let attemptLines = 4;
  let best, lineH, metaGap;
  for (let step = 0; step < 6; step++) {
    ctx2d.font = heavyFont(fontPx);
    lineH = fontPx * 1.16;
    metaGap = fontPx * 0.55;
    const maxLines = Math.min(attemptLines, Math.max(1, words.length));
    best = null;
    for (let n = 1; n <= maxLines; n++) {
      const lines = wrapWordsToLines(ctx2d, words, n);
      let widest = 0;
      const widths = lines.map(l => { const w = ctx2d.measureText(l).width; widest = Math.max(widest, w); return w; });
      const blockH = lines.length * lineH + metaGap + metaLineH;
      const aspect = widest / blockH;
      const score = Math.abs(aspect - 1.5);
      if (!best || score < best.score) best = { lines, widths, widest, score };
    }
    if (words.length <= 9 || step >= 5) break;
    if (step % 2 === 0 && fontPx > minFontPx) fontPx = Math.max(minFontPx, fontPx * 0.85);
    else attemptLines = Math.min(6, attemptLines + 1);
  }
  const { lines, widths, widest } = best;

  let neededR = 0;
  lines.forEach((l, i) => {
    const y = (i - (lines.length - 1) / 2) * lineH;
    neededR = Math.max(neededR, Math.sqrt((widths[i] / 2) ** 2 + y * y) / rmin);
  });
  const metaY = (lines.length - 1) / 2 * lineH + metaGap + metaLineH / 2;
  neededR = Math.max(neededR, Math.sqrt((metaW / 2) ** 2 + metaY * metaY) / rmin);
  neededR *= 1.07;

  const floorR = MIN_RADIUS_FRACTION * boardMinDim;
  const R = Math.max(neededR, floorR);
  const boxW = Math.max(widest, metaW);
  const boxH = lines.length * lineH + metaGap + metaLineH;

  return { fontPx, lines, lineH, pillPx, handlePx, dotR, metaGap, metaLineH, pillW, handleW, R, boxW, boxH };
}

// Taskbee / Claim-a-slot layout: [label pill] -> 12px gap -> [headline text]
// -> 16px gap -> [CTA button], as one measured vertical stack inset 24px
// inside the blob, instead of independently-fixed y-offsets — those could
// overlap for longer headlines (brand-splash v2.2 §2). The CTA is sized to
// a real ≥44px tap target rather than a small drawn pill with no padding
// (§1), so morePillBox()'s hit rect and the visible button are the same box.
const MIN_TAP_PX = 44;
function fitPromptToBlob(ctx2d, body, labelText, ctaText, rmin, boardMinDim) {
  const words = String(body).trim().split(/\s+/).filter(Boolean);
  const nf = narrowFactor();
  const minFontPx = 16 * nf;
  let fontPx = TYPE_STANDARD_PX * nf;
  const labelPx = Math.max(8, 11 * nf);
  const ctaPx = Math.max(11, 13 * nf);
  const gapLabel = 12 * nf;
  const gapCta = 16 * nf;
  const inset = 24 * nf;

  ctx2d.font = '800 ' + labelPx + 'px ' + FONT_UI;
  const labelW = ctx2d.measureText(labelText.toUpperCase()).width + labelPx * 1.7;
  const labelH = labelPx * 2.3;

  ctx2d.font = '800 ' + ctaPx + 'px ' + FONT_UI;
  const ctaW = Math.max(MIN_TAP_PX, ctx2d.measureText(ctaText).width + ctaPx * 2.6);
  const ctaH = Math.max(MIN_TAP_PX, ctaPx * 2.8);

  let attemptLines = 3;
  let best, lineH;
  for (let step = 0; step < 6; step++) {
    ctx2d.font = heavyFont(fontPx);
    lineH = fontPx * 1.16;
    const maxLines = Math.min(attemptLines, Math.max(1, words.length));
    best = null;
    for (let n = 1; n <= maxLines; n++) {
      const lines = wrapWordsToLines(ctx2d, words, n);
      let widest = 0;
      const widths = lines.map(l => { const w = ctx2d.measureText(l).width; widest = Math.max(widest, w); return w; });
      const stackH = labelH + gapLabel + lines.length * lineH + gapCta + ctaH;
      const stackW = Math.max(widest, labelW, ctaW);
      const score = Math.abs(stackW / stackH - 1.15);
      if (!best || score < best.score) best = { lines, widths, widest, score };
    }
    if (step >= 5) break;
    if (fontPx > minFontPx) fontPx = Math.max(minFontPx, fontPx - 2);
    else break;
  }
  const { lines, widths, widest } = best;

  const textH = lines.length * lineH;
  const stackH = labelH + gapLabel + textH + gapCta + ctaH;
  const stackW = Math.max(widest, labelW, ctaW);

  const halfW = stackW / 2 + inset, halfH = stackH / 2 + inset;
  const neededR = (Math.sqrt(halfW * halfW + halfH * halfH) / rmin) * 1.02;
  const floorR = MIN_RADIUS_FRACTION * boardMinDim;
  const R = Math.max(neededR, floorR);

  const top = -stackH / 2;
  const labelY = top + labelH / 2;
  const textTop = top + labelH + gapLabel;
  const ctaY = top + stackH - ctaH / 2;

  return { fontPx, lines, lineH, labelPx, labelW, labelH, ctaPx, ctaW, ctaH, R, boxW: stackW, boxH: stackH, labelY, textTop, ctaY };
}

/* ---------------------------------------------------------------------
   DECK — plain shuffle (no seeded engagement, no axis filter — §1)
--------------------------------------------------------------------- */
const PROMPT_EVERY = 8;
let deck = [], deckPos = 0, promptToggle = 0;
function buildDeck() {
  const posts = shuffleArray(SEED_POSTS);
  const out = [];
  let counter = 0;
  for (const p of posts) {
    counter++;
    out.push({ type: 'post', data: p });
    if (counter % PROMPT_EVERY === 0) {
      out.push({ type: promptToggle % 2 === 0 ? 'taskbee' : 'claim', data: null });
      promptToggle++;
    }
  }
  return out;
}
function nextDeckItem() {
  if (deckPos >= deck.length) { deck = buildDeck(); deckPos = 0; }
  return deck[deckPos++];
}

/* ---------------------------------------------------------------------
   THE SPLASH
--------------------------------------------------------------------- */
function computeItemFit(item, rmin) {
  if (item.type === 'post') {
    const p = item.data;
    const axisTitle = (AXIS_BY_KEY[p.axis] || {}).title || p.axis;
    return fitTextToBlob(ctx, p.body, axisTitle, p.handle, rmin, p.word_class, Math.min(W, H));
  }
  const isTaskbee = item.type === 'taskbee';
  const headline = isTaskbee ? TASKBEE.line : 'Your brand, same paint, same nine words';
  const label = isTaskbee ? 'SPONSOR ZERO' : 'CLAIM A SLOT';
  const ctaText = isTaskbee ? 'More' : 'See slot';
  return fitPromptToBlob(ctx, headline, label, ctaText, rmin, Math.min(W, H));
}

let SID = 0;
class Splash {
  constructor(x, y, item, pre) {
    this.sid = ++SID;
    this.x = x; this.y = y;
    this.born = performance.now();
    this.state = 'GROW';
    this.exitAt = 0;
    this.scale = 0;
    this.alpha = 1;
    this.phase = rand(TWO_PI);
    this.verts = pre ? pre.verts : buildVerts();
    this.gradAngle = rand(TWO_PI);
    this.hold = TIME_HOLD * (1 + rand(-HOLD_JITTER, HOLD_JITTER));
    this.item = item;
    this.reactedEmoji = null;
    this.dwellBonusGiven = false;
    this.holding = false;
    this.holdStartedAt = 0;

    const rmin = Math.min(...this.verts.map(v => v.r));
    const fit = pre ? pre.fit : computeItemFit(item, rmin);

    if (item.type === 'post') {
      this.color = pick(PALETTE);
      this.grad = Math.random() < 0.62 ? pick(GRAD_PAIRS) : null;
      this.scene = Math.random() < SCENE_SHARE ? Math.floor(Math.random() * PHOTOS.length) : null;
      if (this.scene != null) this.grad = null;
    } else {
      // taskbee / claim prompt splashes — headline + a small "More"/"See slot" pill
      this.color = '#FFFFFF';
      this.grad = pick(GRAD_PAIRS);
      this.scene = null;
    }
    Object.assign(this, fit);
    this.textRect = textRectAt(fit, x, y);
    this.ink = this.grad ? inkOn(this.grad[0], this.grad[1]) : inkOn(this.color);

    const n = Math.floor(rand(8, 17));
    this.drops = [];
    for (let i = 0; i < n; i++) {
      this.drops.push({ a: rand(TWO_PI), d: rand(1.05, 1.8), rr: rand(0.018, 0.085), delay: REDUCED ? 0 : rand(120, 420) });
    }
  }

  isPrompt() { return this.item.type === 'taskbee' || this.item.type === 'claim'; }

  forceExit() {
    if (this.state !== 'EXIT' && this.state !== 'DEAD') { this.state = 'EXIT'; this.exitAt = performance.now(); }
  }

  startHold() {
    if (this.holding || this.state === 'EXIT' || this.state === 'DEAD') return;
    this.holding = true;
    this.holdStartedAt = performance.now();
  }
  endHold() {
    if (!this.holding) return;
    this.holding = false;
    // Pause, don't reset — shift born forward by the held duration so age
    // (and the hold-expiry clock) resumes exactly where it left off.
    this.born += performance.now() - this.holdStartedAt;
  }

  react(key) {
    if (this.item.type !== 'post') return;
    if (this.reactedEmoji === key) {
      this.reactedEmoji = null; // instant, non-animated re-expansion
      return;
    }
    this.reactedEmoji = key;
    if (!this.dwellBonusGiven) {
      this.hold += REACT_DWELL_BONUS_MS;
      this.dwellBonusGiven = true;
    }
  }

  update(now) {
    if (this.state === 'DEAD') return;
    if (this.holding) return; // frozen — no state transition while held
    const age = now - this.born;
    if (this.state === 'GROW') {
      if (REDUCED || age >= TIME_GROW) { this.scale = 1; this.state = 'HOLD'; }
      else this.scale = Math.max(0.001, easeOutBack(age / TIME_GROW));
    }
    if (this.state === 'HOLD') {
      this.scale = 1;
      if (age >= TIME_GROW + this.hold) this.forceExit();
    }
    if (this.state === 'EXIT') {
      const e = (now - this.exitAt) / TIME_EXIT;
      if (REDUCED || e >= 1) { this.state = 'DEAD'; this.alpha = 0; return; }
      this.alpha = 1 - easeInCubic(e);
      this.scale = 1 - 0.04 * e;
    }
  }

  paintFill(c) {
    if (this.grad) {
      const dx = Math.cos(this.gradAngle) * this.R * 1.2, dy = Math.sin(this.gradAngle) * this.R * 1.2;
      const g = c.createLinearGradient(this.x - dx, this.y - dy, this.x + dx, this.y + dy);
      g.addColorStop(0, this.grad[0]); g.addColorStop(1, this.grad[1]);
      return g;
    }
    return this.color;
  }

  rimPoint(angleFromDown, t) {
    const a = Math.PI / 2 + angleFromDown;
    const N = this.verts.length;
    const idx = (((Math.round((a / TWO_PI) * N) % N) + N) % N);
    const v = this.verts[idx];
    const wob = REDUCED ? 1 : 1 + 0.014 * Math.sin(t * 1.6 + this.phase + v.a * 3);
    const rr = this.R * this.scale * v.r * wob;
    return { x: this.x + Math.cos(a) * rr, y: this.y + Math.sin(a) * rr };
  }

  morePillBox() {
    // Real measured box from fitPromptToBlob — always >= MIN_TAP_PX square,
    // so the visible CTA and its hit rect are one and the same (v2.2 §1).
    return { x: this.x - this.ctaW / 2, y: this.y + this.ctaY - this.ctaH / 2, w: this.ctaW, h: this.ctaH };
  }

  display(c, now) {
    if (this.state === 'DEAD' || this.alpha <= 0.002 || this.scale <= 0.01) return;
    const t = now / 1000;
    c.save();
    c.globalAlpha = this.alpha;

    c.fillStyle = this.grad ? this.grad[Math.floor(this.phase * 10) % 2] : this.color;
    for (const d of this.drops) {
      if (now < this.born + d.delay) continue;
      const p = REDUCED ? 1 : Math.min(1, (now - this.born - d.delay) / 240);
      const pop = easeOutBack(p);
      const dist = this.R * d.d, dr = this.R * d.rr * this.scale * pop;
      if (dr <= 0.4) continue;
      c.beginPath(); c.arc(this.x + Math.cos(d.a) * dist, this.y + Math.sin(d.a) * dist, dr, 0, TWO_PI); c.fill();
    }

    // Real drop shadow so overlapping blobs read as intentional stacking,
    // not a rendering glitch — revision-spec §2.1 (`0 8px 24px rgba(0,0,0,.25)`).
    tracePath(c, this, t);
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.25)';
    c.shadowBlur = this.R * 0.24;
    c.shadowOffsetY = this.R * 0.08;
    c.fillStyle = this.paintFill(c);
    c.fill();
    c.restore();

    tracePath(c, this, t);
    c.save();
    c.shadowColor = this.grad ? this.grad[0] : this.color;
    c.shadowBlur = this.R * 0.22;
    c.fillStyle = this.paintFill(c);
    c.fill();
    c.restore();

    c.save();
    tracePath(c, this, t); c.clip();
    c.globalAlpha = this.alpha * 0.22;
    c.strokeStyle = '#000'; c.lineWidth = Math.max(1, this.R * 0.07);
    c.stroke();
    c.restore();

    c.save();
    tracePath(c, this, t); c.clip();
    c.globalAlpha = this.alpha;
    c.translate(this.x, this.y);
    if (this.isIntro) {
      drawIntroSplashContent(c, this);
    } else if (this.item.type === 'post') {
      if (this.scene != null) drawSceneContent(c, this); else drawPlainContent(c, this);
    } else {
      drawPromptContent(c, this);
    }
    c.restore();

    c.restore();
  }
}

function easeOutBack(x) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
function easeInCubic(x) { return x * x * x; }
function hexRGB(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
// WCAG relative luminance / contrast ratio — picks whichever of INK/white
// clears 4.5:1 against the gradient's midpoint (brand-splash v2.2 §4).
function srgbToLin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function relLuminance(r, g, b) { return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b); }
function contrastRatio(l1, l2) { const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); }
const INK_LUMINANCE = relLuminance(...hexRGB(INK));
function inkOn(hex, hex2) {
  let [r, g, b] = hexRGB(hex);
  if (hex2) { const [r2, g2, b2] = hexRGB(hex2); r = (r + r2) / 2; g = (g + g2) / 2; b = (b + b2) / 2; }
  const bgL = relLuminance(r, g, b);
  return contrastRatio(bgL, INK_LUMINANCE) >= contrastRatio(bgL, 1) ? INK : '#FFFFFF';
}

// body block, then one meta line: ⬤ AXIS PILL · @handle (change-spec v2 §5)
function drawMetaLine(c, s, fg) {
  if (s.item.type !== 'post') return;
  const p = s.item.data;
  const axis = AXIS_BY_KEY[p.axis];
  const totalH = s.lines.length * s.lineH;
  const y = totalH / 2 + s.metaGap + s.metaLineH / 2;
  let x = -(s.pillW + (p.handle ? 10 : 0) + s.handleW) / 2;

  c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillStyle = AXIS_COLOR[p.axis] || fg;
  c.beginPath(); c.arc(x + s.dotR, y, s.dotR, 0, TWO_PI); c.fill();
  x += s.dotR * 2 + 6;

  c.font = '800 ' + s.pillPx + 'px ' + FONT_UI;
  c.fillStyle = fg;
  c.globalAlpha *= 0.95;
  c.fillText(axis.title.toUpperCase(), x, y);
  x += c.measureText(axis.title.toUpperCase()).width;

  if (p.handle) {
    x += 10;
    c.font = '600 ' + s.handlePx + 'px ' + FONT_MONO;
    c.globalAlpha *= 0.65;
    c.fillText(p.handle, x, y);
  }
  c.textAlign = 'center';
}

function drawPlainContent(c, s) {
  const fg = s.ink;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = fg;
  c.font = heavyFont(s.fontPx);
  c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowOffsetY = 2; c.shadowBlur = 3;
  const totalH = s.lines.length * s.lineH;
  const y0 = -totalH / 2 + s.lineH / 2;
  for (let i = 0; i < s.lines.length; i++) c.fillText(s.lines[i], 0, y0 + i * s.lineH);
  c.shadowColor = 'transparent';
  drawMetaLine(c, s, fg);
}

function drawSceneContent(c, s) {
  const ph = PHOTOS[s.scene];
  const box = s.R * 3.0;
  const sc = Math.max(box / ph.width, box / ph.height);
  const dw = ph.width * sc, dh = ph.height * sc;
  c.shadowColor = 'transparent';
  c.drawImage(ph, -dw / 2, -dh / 2, dw, dh);
  c.save();
  c.globalAlpha *= 0.32;
  c.fillStyle = s.color;
  c.fillRect(-dw / 2, -dh / 2, dw, dh);
  c.restore();

  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = heavyFont(s.fontPx);
  const totalH = s.lines.length * s.lineH;
  const y0 = -totalH / 2 + s.lineH / 2;
  c.lineJoin = 'round'; c.miterLimit = 2;
  c.lineWidth = Math.max(2, s.fontPx * 0.16);
  c.strokeStyle = '#FFFFFF';
  c.fillStyle = INK;
  for (let i = 0; i < s.lines.length; i++) {
    c.strokeText(s.lines[i], 0, y0 + i * s.lineH);
    c.fillText(s.lines[i], 0, y0 + i * s.lineH);
  }
  drawMetaLine(c, s, '#FFFFFF');
}

// Taskbee / Claim-a-slot — [label pill] / [headline] / [CTA button] drawn as
// one measured vertical stack (fitPromptToBlob), so the three elements never
// overlap regardless of headline length (brand-splash v2.2 §2).
function drawPromptContent(c, s) {
  const isTaskbee = s.item.type === 'taskbee';
  c.textAlign = 'center'; c.textBaseline = 'middle';

  // label pill — solid fill, never relies on the gradient behind it (§4)
  c.font = '800 ' + s.labelPx + 'px ' + FONT_UI;
  c.fillStyle = INK;
  c.globalAlpha *= 0.9;
  const lx = -s.labelW / 2, ly = s.labelY - s.labelH / 2;
  if (c.roundRect) { c.beginPath(); c.roundRect(lx, ly, s.labelW, s.labelH, s.labelH / 2); c.fill(); }
  else c.fillRect(lx, ly, s.labelW, s.labelH);
  c.fillStyle = '#FFFFFF';
  c.fillText(isTaskbee ? 'SPONSOR ZERO' : 'CLAIM A SLOT', 0, s.labelY + 1);
  c.globalAlpha = s.alpha;

  // headline
  c.fillStyle = s.ink;
  c.font = heavyFont(s.fontPx);
  c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowOffsetY = 2; c.shadowBlur = 3;
  for (let i = 0; i < s.lines.length; i++) c.fillText(s.lines[i], 0, s.textTop + s.lineH / 2 + i * s.lineH);
  c.shadowColor = 'transparent';

  // CTA button — solid fill, sized to a real >=44px tap target (§1, §4)
  const box = s.morePillBox();
  const px = box.x - s.x, py = box.y - s.y;
  c.fillStyle = INK;
  if (c.roundRect) { c.beginPath(); c.roundRect(px, py, box.w, box.h, box.h / 2); c.fill(); }
  else c.fillRect(px, py, box.w, box.h);
  c.fillStyle = '#FFFFFF';
  c.font = '800 ' + s.ctaPx + 'px ' + FONT_UI;
  c.fillText(isTaskbee ? 'More' : 'See slot', px + box.w / 2, py + box.h / 2 + 1);
}

// Welcome splash — body text + a muted PRE-LAUNCH status pill, no axis pill
// and no handle (revision-spec §1.2: "the welcome splash is not a bundle").
function drawIntroSplashContent(c, s) {
  const fg = s.ink;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = fg;
  c.font = heavyFont(s.fontPx);
  c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowOffsetY = 2; c.shadowBlur = 3;
  const totalH = s.lines.length * s.lineH;
  const y0 = -totalH / 2 + s.lineH / 2;
  for (let i = 0; i < s.lines.length; i++) c.fillText(s.lines[i], 0, y0 + i * s.lineH);
  c.shadowColor = 'transparent';

  const y = totalH / 2 + s.metaGap + s.metaLineH / 2;
  c.font = '800 ' + s.pillPx + 'px ' + FONT_UI;
  c.globalAlpha *= 0.6;
  c.fillText('PRE-LAUNCH', 0, y);
}

/* ---------------------------------------------------------------------
   REACTIONS — 3 exclusive, rim-anchored, pop-outward when selected (§2)
--------------------------------------------------------------------- */
function reactionAnchor(s, idx, t) {
  const spread = 0.5;
  const off = (idx - 1) * spread;
  return { p: s.rimPoint(off, t), off };
}
function drawReactionRow(c, s, now) {
  if (s.item.type !== 'post') return;
  if (s.state === 'EXIT' || s.state === 'DEAD' || s.scale < 0.9) return;
  const t = now / 1000;
  const discR = Math.max(11, s.R * 0.1);

  if (s.reactedEmoji) {
    const idx = REACTION_SET.findIndex(r => r.key === s.reactedEmoji);
    const { p } = reactionAnchor(s, idx, t);
    const dx = p.x - s.x, dy = p.y - s.y, len = Math.hypot(dx, dy) || 1;
    const ex = s.x + (dx / len) * (len * 1.22), ey = s.y + (dy / len) * (len * 1.22);
    drawDisc(c, ex, ey, discR * 1.35, REACTION_SET[idx].emoji);
  } else {
    REACTION_SET.forEach((r, i) => {
      const { p } = reactionAnchor(s, i, t);
      drawDisc(c, p.x, p.y, discR, r.emoji);
    });
  }
}
function drawDisc(c, x, y, r, emoji) {
  c.save();
  c.globalAlpha = 1;
  c.fillStyle = '#fff';
  c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 4; c.shadowOffsetY = 1;
  c.beginPath(); c.arc(x, y, r, 0, TWO_PI); c.fill();
  c.shadowColor = 'transparent';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = (r * 1.25) + 'px ' + FONT_MONO;
  c.fillText(emoji, x, y + r * 0.05);
  c.restore();
}
function reactionHitAt(x, y, s, now) {
  if (s.item.type !== 'post' || s.state === 'EXIT' || s.state === 'DEAD') return null;
  const t = now / 1000;
  const discR = Math.max(11, s.R * 0.1) * 1.7;
  if (s.reactedEmoji) {
    const idx = REACTION_SET.findIndex(r => r.key === s.reactedEmoji);
    const { p } = reactionAnchor(s, idx, t);
    const dx = p.x - s.x, dy = p.y - s.y, len = Math.hypot(dx, dy) || 1;
    const ex = s.x + (dx / len) * (len * 1.22), ey = s.y + (dy / len) * (len * 1.22);
    if (Math.hypot(x - ex, y - ey) <= discR * 1.35) return s.reactedEmoji;
    return null;
  }
  for (let i = 0; i < REACTION_SET.length; i++) {
    const { p } = reactionAnchor(s, i, t);
    if (Math.hypot(x - p.x, y - p.y) <= discR) return REACTION_SET[i].key;
  }
  return null;
}

/* ---------------------------------------------------------------------
   SLOT MODEL — unified tap grammar at any count (change-spec v2 §3, §6)
--------------------------------------------------------------------- */
let slots = [];

function slotRange() {
  if (TIER === 'mobile') return [1, 1];
  if (TIER === 'tablet') return [1, 2];
  return [2, 3];
}
function slotCount() {
  const floorR = MIN_RADIUS_FRACTION * Math.min(W, H);
  const n = Math.round((W * H) / (Math.PI * floorR * floorR * 3.6));
  const [lo, hi] = slotRange();
  return Math.max(lo, Math.min(hi, n));
}
function slotPosition(i, count) {
  const fx = count === 1 ? 0.5 : (i + 0.5) / count;
  const x = W * (0.16 + fx * 0.68);
  const stagger = Math.sin(i * 2.6 + count) * 0.07;
  const y = H * (0.45 + stagger);
  return { x, y };
}
function ensureSlots() {
  const n = slotCount();
  while (slots.length < n) slots.push({ splash: null, nextScheduled: false });
  while (slots.length > n) {
    const s = slots.pop();
    if (s.splash) s.splash.forceExit();
  }
}

// Blob outlines may overlap freely; text boxes may never (revision-spec §2.1).
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function textRectAt(fit, cx, cy) {
  const w = fit.boxW + 24, h = fit.boxH + 24; // 12px margin each side
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
function existingTextRects(excludeIdx) {
  const rects = [];
  slots.forEach((s, i) => {
    if (i === excludeIdx) return;
    if (s.splash && s.splash.state !== 'DEAD' && s.splash.textRect) rects.push(s.splash.textRect);
  });
  return rects;
}
// Margin covers the blob's full radius (not a fraction of it) plus a
// viewport-scaled edge gap, so the circle itself — not just its text box —
// never runs off the screen edge (brand-splash v2.2 §3). This also matters
// for tap-thrown splashes: throwAt() passes the raw tap point as
// preferredPos, which can land right at the viewport edge.
function clampToMargins(pos, marginX, marginY) {
  return {
    x: Math.min(Math.max(pos.x, marginX), Math.max(marginX, W - marginX)),
    y: Math.min(Math.max(pos.y, marginY), Math.max(marginY, H - marginY)),
  };
}
function findPlacement(fit, preferredPos, excludeIdx) {
  const existing = existingTextRects(excludeIdx);
  const edgeMargin = TIER === 'mobile' ? 16 : 24;
  const marginX = Math.max(fit.R, fit.boxW / 2) + edgeMargin;
  const marginY = Math.max(fit.R, fit.boxH / 2) + edgeMargin;
  const tryPos = pos => (existing.some(r => rectsOverlap(r, textRectAt(fit, pos.x, pos.y))) ? null : pos);
  const first = tryPos(clampToMargins(preferredPos, marginX, marginY));
  if (first) return first;
  for (let i = 0; i < 20; i++) {
    const candidate = tryPos({
      x: rand(marginX, Math.max(marginX + 1, W - marginX)),
      y: rand(marginY, Math.max(marginY + 1, H - marginY)),
    });
    if (candidate) return candidate;
  }
  return clampToMargins(preferredPos, marginX, marginY); // exhausted retries — a rare residual overlap beats going off-screen
}

function fillEmptySlot(i, pos) {
  if (!slots[i]) return;
  const item = nextDeckItem();
  const verts = buildVerts();
  const rmin = Math.min(...verts.map(v => v.r));
  const fit = computeItemFit(item, rmin);
  const preferred = pos || slotPosition(i, slots.length);
  const finalPos = findPlacement(fit, preferred, i);
  slots[i].splash = new Splash(finalPos.x, finalPos.y, item, { verts, fit });
  slots[i].nextScheduled = false;
  track('splash_shown', {
    post_id: item.type === 'post' ? item.data.id : item.type,
    axis: item.type === 'post' ? item.data.axis : null,
    tier: TIER,
  });
}
function dismissSlot(i, manual, refillPos) {
  const slot = slots[i];
  if (!slot || !slot.splash || slot.nextScheduled) return;
  if (slot.splash.state === 'DEAD') return;
  const dwell = performance.now() - slot.splash.born;
  const splashId = slot.splash.item.type === 'post' ? slot.splash.item.data.id : slot.splash.item.type;
  track('splash_dismissed', { post_id: splashId, dwell_ms: Math.round(dwell), method: manual ? 'tap' : 'timer' });
  if (manual) {
    gaEvent('splash_tap', { splash_id: splashId, bundle: slot.splash.item.type === 'post' ? slot.splash.item.data.axis : null });
  }
  slot.splash.forceExit();
  slot.nextScheduled = true;
  setTimeout(() => fillEmptySlot(i, refillPos), REDUCED ? 0 : SEQ_OFFSET_MS);
}
function oldestActiveSlotIndex() {
  let best = -1, bestBorn = Infinity;
  slots.forEach((s, i) => {
    if (s.splash && s.splash.state !== 'DEAD' && s.splash.state !== 'EXIT' && s.splash.born < bestBorn) {
      bestBorn = s.splash.born; best = i;
    }
  });
  return best;
}
function slotIndexForSplash(splash) {
  return slots.findIndex(s => s.splash === splash);
}

// Tapping empty board space throws a fresh splash right where you tapped —
// restores the "paint" feel: an empty slot fills immediately, otherwise the
// oldest active one is retired early and its replacement lands at the tap.
function throwAt(x, y) {
  let idx = slots.findIndex(s => !s.splash || s.splash.state === 'DEAD');
  if (idx >= 0) { fillEmptySlot(idx, { x, y }); return; }
  idx = oldestActiveSlotIndex();
  if (idx >= 0) dismissSlot(idx, true, { x, y });
}

/* ---------------------------------------------------------------------
   HIT TESTING
--------------------------------------------------------------------- */
function activeSplashes() {
  return slots.filter(s => s.splash && s.splash.state !== 'DEAD').map(s => s.splash);
}
function topSplashAt(x, y) {
  const list = activeSplashes();
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (Math.hypot(x - s.x, y - s.y) <= s.R * s.scale * 0.95) return s;
  }
  return null;
}
function morePillHitAt(x, y) {
  for (const s of activeSplashes()) {
    if (!s.isPrompt() || s.state === 'EXIT' || s.state === 'DEAD') continue;
    const box = s.morePillBox();
    if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) return s;
  }
  return null;
}

/* ---------------------------------------------------------------------
   REACTIONS — batched, flushed on timer/pagehide
--------------------------------------------------------------------- */
let pendingReactions = [];
function reactTo(splash, key) {
  splash.react(key);
  gaEvent('splash_react', { splash_id: splash.item.data.id, bundle: splash.item.data.axis, reaction: key });
  if (splash.reactedEmoji === key) {
    pendingReactions.push({ post_id: splash.item.data.id, emoji: key, bundle: splash.item.data.axis, session_id: SESSION_ID });
    track('reaction', { post_id: splash.item.data.id, emoji: key });
  }
}

/* ---------------------------------------------------------------------
   ANALYTICS
--------------------------------------------------------------------- */
let pendingAnalytics = [];
const sessionStart = performance.now();
let splashesSeen = 0;

// A splash counts as viewed at ≥50% visible for ≥1 continuous second, deduped
// once per splash per session (§6.4). There's no DOM element to observe —
// the wall is one canvas — so this is hand-rolled off scale as a visibility
// proxy: our splashes never partially scroll off a viewport edge the way a
// page element would, they only grow in and shrink out in place.
const IMPRESSION_VISIBLE_MS = 1000;
const impressedIds = new Set();
const visibleSince = new Map();
function trackImpressions(list, now) {
  const stillVisible = new Set();
  for (const s of list) {
    if (s.item.type !== 'post' || s.scale < 0.5) continue;
    stillVisible.add(s.sid);
    if (!visibleSince.has(s.sid)) visibleSince.set(s.sid, now);
    const id = s.item.data.id;
    if (!impressedIds.has(id) && now - visibleSince.get(s.sid) >= IMPRESSION_VISIBLE_MS) {
      impressedIds.add(id);
      track('impression', { post_id: id, bundle: s.item.data.axis });
    }
  }
  for (const sid of Array.from(visibleSince.keys())) {
    if (!stillVisible.has(sid)) visibleSince.delete(sid);
  }
}
// D1-bound event log — impressions and every raw interaction go here, batched
// and flushed on a timer or pagehide (§6.4). GA4 gets a separate, smaller,
// PII-free taxonomy — see gaEvent() below.
function track(event, fields) {
  if (event === 'splash_shown') splashesSeen++;
  pendingAnalytics.push(Object.assign({ event, t: Date.now(), session_id: SESSION_ID }, fields || {}));
}

// GA4 discrete funnel events (§7.1) — never whatsapp/brand_name/contact_name
// or any free text; those live in D1 only.
function gaEvent(name, params) {
  if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
}

function flushBatches(useBeacon) {
  if (pendingReactions.length) {
    const body = JSON.stringify(pendingReactions);
    if (useBeacon && navigator.sendBeacon) navigator.sendBeacon('/api/react', new Blob([body], { type: 'application/json' }));
    else fetch('/api/react', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    pendingReactions = [];
  }
  if (pendingAnalytics.length) {
    const body = JSON.stringify(pendingAnalytics);
    if (useBeacon && navigator.sendBeacon) navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
    else fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    pendingAnalytics = [];
  }
}
setInterval(() => flushBatches(false), 5000);
window.addEventListener('pagehide', () => {
  track('session', { tier: TIER, splashes_seen: splashesSeen, duration_ms: Math.round(performance.now() - sessionStart) });
  flushBatches(true);
});

/* ---------------------------------------------------------------------
   MAIN LOOP — RAF, cancelled on visibilitychange
--------------------------------------------------------------------- */
let bg = null;
let rafId = null;

function frame(now) {
  ctx.clearRect(0, 0, W, H);
  if (bg) ctx.drawImage(bg, 0, 0, W, H);

  // Splashes keep aging via update() below even while a panel/intro is open
  // ("the wall stays visible and running behind it" — §8) — so refill must
  // run unconditionally too, and must treat DEAD (not just empty) as needing
  // a refill, or a slot that finished its whole GROW→HOLD→EXIT→DEAD cycle
  // while covered gets permanently stuck: state is DEAD (truthy, not EXIT),
  // so neither branch below would ever fire again without this check.
  slots.forEach((slot, i) => {
    if (!slot.splash || slot.splash.state === 'DEAD') {
      if (!slot.nextScheduled) fillEmptySlot(i);
      return;
    }
    if (slot.splash.state === 'EXIT' && !slot.nextScheduled) dismissSlot(i, false);
  });

  const list = activeSplashes();
  for (const s of list) { s.update(now); s.display(ctx, now); }
  for (const s of list) drawReactionRow(ctx, s, now);
  trackImpressions(list, now);

  rafId = requestAnimationFrame(frame);
}
function startLoop() { if (rafId == null) rafId = requestAnimationFrame(frame); }
function stopLoop() { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } }
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopLoop(); flushBatches(true); } else startLoop();
});

/* ---------------------------------------------------------------------
   INPUT — pointer-based tap/hold disambiguation (change-spec v2 §2, §3)
--------------------------------------------------------------------- */
let press = null; // { splash, x0, y0, t0, holdTimer }

function pointFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

canvas.addEventListener('pointerdown', e => {
  if (panelOpen || introShowing) return;
  const p = pointFromEvent(e);
  const pillHit = morePillHitAt(p.x, p.y);
  const reactHit = !pillHit && (() => {
    for (const s of activeSplashes()) { if (reactionHitAt(p.x, p.y, s, performance.now())) return s; }
    return null;
  })();
  const bodyHit = !pillHit && !reactHit ? topSplashAt(p.x, p.y) : null;

  if (pillHit || reactHit) return; // handled fully on pointerup below, no hold on these targets
  if (!bodyHit) return;

  press = { splash: bodyHit, x0: p.x, y0: p.y, t0: performance.now() };
  press.holdTimer = setTimeout(() => {
    if (press && press.splash) press.splash.startHold();
  }, HOLD_GESTURE_MS);
}, { passive: true });

canvas.addEventListener('pointermove', e => {
  if (!press) return;
  const p = pointFromEvent(e);
  if (Math.hypot(p.x - press.x0, p.y - press.y0) > TAP_MOVE_TOLERANCE) {
    clearTimeout(press.holdTimer);
    if (press.splash.holding) press.splash.endHold();
    press = null;
  }
}, { passive: true });

function endPress() {
  if (!press) return;
  clearTimeout(press.holdTimer);
  if (press.splash.holding) press.splash.endHold();
  press = null;
}
canvas.addEventListener('pointercancel', endPress, { passive: true });

canvas.addEventListener('pointerup', e => {
  const p = pointFromEvent(e);

  if (panelOpen || introShowing) return;

  const pillHit = morePillHitAt(p.x, p.y);
  if (pillHit) { openWidgetFor(pillHit); return; }

  const now = performance.now();
  for (const s of activeSplashes()) {
    const key = reactionHitAt(p.x, p.y, s, now);
    if (key) { reactTo(s, key); return; }
  }

  if (!press) { throwAt(p.x, p.y); return; }
  const wasHolding = press.splash.holding;
  const dt = now - press.t0;
  const dist = Math.hypot(p.x - press.x0, p.y - press.y0);
  endPress();

  if (wasHolding) return; // release after a hold just resumes — no dismiss
  if (dt < HOLD_GESTURE_MS && dist < TAP_MOVE_TOLERANCE) {
    const idx = slotIndexForSplash(topSplashAt(p.x, p.y) || press.splash);
    if (idx >= 0) dismissSlot(idx, true);
  }
});

document.addEventListener('keydown', e => {
  const ae = document.activeElement;
  const typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT');
  if (introShowing) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dismissIntro(); } return; }
  if (panelOpen) { if (e.key === 'Escape') closePanel(); return; }
  if (typing) return;
  if (e.key === ' ' || e.key === 'ArrowRight') {
    e.preventDefault();
    const idx = oldestActiveSlotIndex();
    if (idx >= 0) dismissSlot(idx, true);
  } else if (['1', '2', '3'].includes(e.key)) {
    const idx = oldestActiveSlotIndex();
    if (idx >= 0 && slots[idx].splash.item.type === 'post') {
      reactTo(slots[idx].splash, REACTION_SET[Number(e.key) - 1].key);
    }
  }
});

/* ---------------------------------------------------------------------
   API + TOAST
--------------------------------------------------------------------- */
async function api(path, opts) {
  const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) throw Object.assign(new Error(body.error || 'request failed'), { status: res.status, body });
  return body;
}
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------------------------------------------------------------------
   FOCUS TRAP
--------------------------------------------------------------------- */
function trapFocus(container) {
  let prevFocused = null;
  function focusables() {
    return Array.from(container.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.disabled && el.offsetParent !== null);
  }
  function onKeydown(e) {
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  return {
    activate() {
      prevFocused = document.activeElement;
      container.addEventListener('keydown', onKeydown);
      const items = focusables();
      if (items.length) items[0].focus();
    },
    deactivate() {
      container.removeEventListener('keydown', onKeydown);
      if (prevFocused && prevFocused.focus) prevFocused.focus();
    },
  };
}

/* ---------------------------------------------------------------------
   SIDE WIDGETS + FORMS — one panel, two views, three contents (§8, §9)
--------------------------------------------------------------------- */
const HANDLE_RE = /^[a-z0-9._]{3,22}$/;
const PHONE_RE = /^(?:\+?254|0)?7\d{8}$/;
function wordCount(s) { return String(s).trim().split(/\s+/).filter(Boolean).length; }

let panelOpen = null; // 'taskbee' | 'claim-widget' | 'claim-form' | 'add-widget' | 'add-form'
let pendingSlotClaimEntry = 'button'; // 'button' | 'deeplink' — GA4 slot_claim_start param (§7)
let panelTrap = null;
const panelEl = document.getElementById('panel');
const panelVeil = document.getElementById('panel-veil');
let lastSubmittedForClaim = null; // {} marker so we know to offer name-claim after a successful add

let foundingSlotsLeft = FOUNDING_SLOTS_TOTAL; // updated from /api/stats when it loads

const PANEL = {
  taskbee: () => `
    <div class="p-head"><div class="p-eyebrow">Sponsored ad</div><button class="p-close" data-pclose aria-label="Close">&#10005;</button></div>
    <h2 class="p-title">Taskbee</h2>
    <p class="p-subtitle">${esc(TASKBEE.line)}</p>
    <div class="p-banner"><img src="/taskbee-ecom-banner.webp" alt="A Taskbee online storefront" loading="lazy"></div>
    <p class="p-body">Move your catalog beyond WhatsApp and Instagram DMs. Launch a simple, fast online storefront for your business from KSh 10,000.</p>
    <a class="p-cta external" href="${TASKBEE.href}" target="_blank" rel="noopener">Visit ${TASKBEE.url} ↗</a>`,
  'claim-widget': () => `
    <div class="p-head"><div class="p-eyebrow">Claim a slot</div><button class="p-close" data-pclose aria-label="Close">&#10005;</button></div>
    <h2 class="p-title">Your brand, same paint, same nine words.</h2>
    <p class="p-body">You saw the Taskbee splash. That's a slot. <strong>${foundingSlotsLeft} of ${FOUNDING_SLOTS_TOTAL} founding slots left.</strong></p>
    <button class="p-cta" data-goto="claim-form">Reserve a slot</button>`,
  'claim-form': () => `
    <div class="p-head"><div class="p-eyebrow">Claim a slot · ${foundingSlotsLeft} of ${FOUNDING_SLOTS_TOTAL} left</div><button class="p-close" data-pclose aria-label="Close">&#10005;</button></div>
    <h2 class="p-title">We're looking for 10 founding sponsors.</h2>
    <p class="p-body">KSh 20,000 for the first 12 months.<br>
    After launch: KSh 5,000/month.<br>
    Reserve with KSh 3,000.<br>
    10 slots only.</p>
    <p class="p-note">No payment on this form — this captures interest. We follow up on WhatsApp and take the deposit manually. Refundable in full if we don't launch by ${LAUNCH_DATE_HUMAN}.</p>
    <div class="field"><label for="cs-brand">Brand name</label><input id="cs-brand" maxlength="60" placeholder="Your brand"></div>
    <div class="field"><label for="cs-contact">Contact name</label><input id="cs-contact" maxlength="60" placeholder="Your name"></div>
    <div class="field"><label for="cs-wa">WhatsApp number</label><input id="cs-wa" type="tel" inputmode="tel" placeholder="07XX XXX XXX"><div class="field-err" id="cs-wa-err"></div></div>
    <div class="field"><label for="cs-bundle">Preferred bundle (optional)</label><select id="cs-bundle"><option value="">No preference</option></select></div>
    <div class="field"><label for="cs-notes">Notes (optional)</label><textarea id="cs-notes" maxlength="280" placeholder="anything else we should know"></textarea></div>
    <button class="p-cta" id="cs-submit" disabled>Reserve a slot</button>
    <div class="p-success" id="cs-success"><div class="big">📣</div><h3>Reserved</h3><p>You're on the founding sponsor list. We'll reach out on WhatsApp to sort the deposit.</p></div>`,
  'add-widget': () => `
    <div class="p-head"><div class="p-eyebrow">Add to the wall</div><button class="p-close" data-pclose aria-label="Close">&#10005;</button></div>
    <h2 class="p-title">Heard something too good to lose? Put it up.</h2>
    <p class="p-body">Your name stays on every splash you spot — and we're counting. Early spotters keep their record when the wall opens properly.</p>
    <button class="p-cta" data-goto="add-form">Add a comment</button>`,
  'add-form': () => `
    <div class="p-head"><div class="p-eyebrow">Add to the wall</div><button class="p-close" data-pclose aria-label="Close">&#10005;</button></div>
    <h2 class="p-title">Add a comment</h2>
    <div class="field"><label for="ad-body">The comment</label><textarea id="ad-body" maxlength="200" placeholder="seven to nine words, straight from the timeline"></textarea><div class="field-counter" id="ad-counter">0 words — needs 7 to 9</div></div>
    <div class="field"><label for="ad-seen">Where you saw it (optional)</label><input id="ad-seen" maxlength="300" placeholder="link or description"></div>
    <div class="field"><label for="ad-axis">Axis</label><select id="ad-axis"></select></div>
    <button class="p-cta" id="ad-submit" disabled>Add to the wall</button>
    <div class="p-success" id="ad-success">
      <div class="big">🎨</div><h3>Up for review.</h3>
      <p>Nothing goes on the wall automatically — we read everything first.</p>
      <p>Want the credit? Claim your name and we'll tag you when it lands.</p>
      <div class="field"><label for="ad-name">Name</label><input id="ad-name" maxlength="22" placeholder="yourname"><div class="field-err" id="ad-name-err"></div></div>
      <div class="field"><label for="ad-wa">WhatsApp number</label><input id="ad-wa" type="tel" inputmode="tel" placeholder="07XX XXX XXX"></div>
      <p class="p-note">We'll WhatsApp you when your name goes live. Nothing else.</p>
      <button class="p-cta" id="ad-claim-submit" disabled>Claim my name</button>
      <div class="p-success" id="ad-claim-success"><div class="big">✅</div><h3>Held.</h3><p>We'll message you on WhatsApp when it's live.</p></div>
    </div>`,
};

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function openPanel(view) {
  panelOpen = view;
  panelEl.innerHTML = PANEL[view]();
  panelEl.classList.add('open');
  panelEl.setAttribute('aria-hidden', 'false');
  panelVeil.classList.add('show');
  wirePanelView(view);
  if (panelTrap) panelTrap.deactivate();
  panelTrap = trapFocus(panelEl);
  panelTrap.activate();
  track('widget_opened', { widget: view });
  if (view === 'add-widget') gaEvent('submit_start', {});
  else if (view === 'claim-widget') gaEvent('slot_claim_start', { entry: pendingSlotClaimEntry });
}
function closePanel() {
  if (!panelOpen) return;
  panelEl.classList.remove('open');
  panelEl.setAttribute('aria-hidden', 'true');
  panelVeil.classList.remove('show');
  if (panelTrap) panelTrap.deactivate();
  panelOpen = null;
}
function openWidgetFor(splash) {
  if (splash.item.type !== 'taskbee') pendingSlotClaimEntry = 'button';
  openPanel(splash.item.type === 'taskbee' ? 'taskbee' : 'claim-widget');
}
panelVeil.addEventListener('click', closePanel);

function wirePanelView(view) {
  panelEl.querySelectorAll('[data-pclose]').forEach(b => b.addEventListener('click', closePanel));
  panelEl.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.goto)));

  if (view === 'claim-form') wireClaimSlotForm();
  else if (view === 'add-form') wireAddToWallForm();
}

function wireClaimSlotForm() {
  const brand = panelEl.querySelector('#cs-brand');
  const contact = panelEl.querySelector('#cs-contact');
  const wa = panelEl.querySelector('#cs-wa');
  const waErr = panelEl.querySelector('#cs-wa-err');
  const bundleSel = panelEl.querySelector('#cs-bundle');
  const notes = panelEl.querySelector('#cs-notes');
  const submit = panelEl.querySelector('#cs-submit');

  bundleSel.insertAdjacentHTML('beforeend', AXES.map(a => `<option value="${a.key}">${a.emoji} ${a.title}</option>`).join(''));

  function validate() {
    const waOk = PHONE_RE.test(wa.value.replace(/[\s-]/g, ''));
    submit.disabled = !(brand.value.trim().length >= 2 && contact.value.trim().length >= 2 && waOk);
  }
  [brand, contact, wa].forEach(el => el.addEventListener('input', () => { waErr.classList.remove('show'); validate(); }));
  validate();

  submit.addEventListener('click', async () => {
    const payload = {
      brand_name: brand.value.trim(),
      contact_name: contact.value.trim(),
      whatsapp: wa.value.replace(/[\s-]/g, ''),
      bundle_pref: bundleSel.value || null,
      notes: notes.value.trim().slice(0, 280) || null,
      entry: pendingSlotClaimEntry,
      session_id: SESSION_ID,
    };
    submit.disabled = true; submit.textContent = 'Reserving…';
    try {
      await api('/api/claim-slot', { method: 'POST', body: JSON.stringify(payload) });
      track('action_completed', { action: 'claim-slot' });
      gaEvent('slot_claim_complete', { bundle_pref: payload.bundle_pref });
      panelEl.querySelectorAll('.field, #cs-submit, .p-title, .p-body, .p-note').forEach(el => el.style.display = 'none');
      panelEl.querySelector('#cs-success').classList.add('show');
    } catch (err) {
      waErr.textContent = err.message || 'something went wrong';
      waErr.classList.add('show');
      submit.textContent = 'Reserve a slot';
      validate();
    }
  });
}

function wireAddToWallForm() {
  const axisSel = panelEl.querySelector('#ad-axis');
  axisSel.innerHTML = AXES.map(a => `<option value="${a.key}">${a.emoji} ${a.title}</option>`).join('');
  const body = panelEl.querySelector('#ad-body');
  const seen = panelEl.querySelector('#ad-seen');
  const counter = panelEl.querySelector('#ad-counter');
  const submit = panelEl.querySelector('#ad-submit');

  function validate() {
    const wc = wordCount(body.value);
    const wcOk = wc >= 7 && wc <= 9;
    counter.textContent = wc + ' words' + (wcOk ? '' : ' — needs 7 to 9');
    counter.classList.toggle('bad', !wcOk);
    submit.disabled = !wcOk;
  }
  body.addEventListener('input', validate);
  validate();

  submit.addEventListener('click', async () => {
    const axis = axisSel.value;
    const payload = { body: body.value.trim(), axis, seen_at: seen.value.trim() || null, session_id: SESSION_ID };
    submit.disabled = true; submit.textContent = 'Adding…';
    try {
      await api('/api/submit', { method: 'POST', body: JSON.stringify(payload) });
      track('action_completed', { action: 'add-to-wall' });
      gaEvent('submit_complete', { bundle: axis });
      panelEl.querySelectorAll('.field, #ad-submit, .p-title, .p-body').forEach(el => {
        if (!el.closest('#ad-success')) el.style.display = 'none';
      });
      panelEl.querySelector('#ad-success').classList.add('show');
      gaEvent('name_claim_start', { splash_id: null });
      wireClaimNameForm();
    } catch (err) {
      submit.textContent = 'Add to the wall';
      validate();
      toast(err.message || 'something went wrong');
    }
  });
}

function wireClaimNameForm() {
  const name = panelEl.querySelector('#ad-name');
  const nameErr = panelEl.querySelector('#ad-name-err');
  const wa = panelEl.querySelector('#ad-wa');
  const submit = panelEl.querySelector('#ad-claim-submit');

  function normName() { return name.value.trim().replace(/^@/, '').toLowerCase(); }
  function validate() {
    submit.disabled = !(HANDLE_RE.test(normName()) && PHONE_RE.test(wa.value.replace(/[\s-]/g, '')));
  }
  [name, wa].forEach(el => el.addEventListener('input', () => { nameErr.classList.remove('show'); validate(); }));
  validate();

  submit.addEventListener('click', async () => {
    const payload = { handle: normName(), whatsapp: wa.value.replace(/[\s-]/g, ''), splash_id: null, session_id: SESSION_ID };
    submit.disabled = true; submit.textContent = 'Claiming…';
    try {
      await api('/api/claim-name', { method: 'POST', body: JSON.stringify(payload) });
      track('action_completed', { action: 'claim-name' });
      gaEvent('name_claim_complete', { splash_id: null });
      [name, wa, submit].forEach(el => el.style.display = 'none');
      panelEl.querySelector('#ad-claim-success').classList.add('show');
    } catch (err) {
      nameErr.textContent = err.message || 'something went wrong';
      nameErr.classList.add('show');
      submit.textContent = 'Claim my name';
      validate();
    }
  });
}

/* ---------------------------------------------------------------------
   CHROME
--------------------------------------------------------------------- */
// Share tokens (§6.3) — mint one so an inbound WhatsApp visit is visible as
// a share_return row, not silence.
async function mintShareUrl(splashId) {
  try {
    const res = await api('/api/share', { method: 'POST', body: JSON.stringify({ splash_id: splashId || null, session_id: SESSION_ID }) });
    if (res && res.url) return res.url;
  } catch (e) { /* fall through to the plain URL below */ }
  return location.origin + location.pathname;
}
document.getElementById('share-btn').addEventListener('click', async () => {
  const url = await mintShareUrl(null);
  let channel = 'other';
  try {
    if (navigator.share) { await navigator.share({ title: 'DOBANESS', text: 'A wall of Kenyan comments.', url }); channel = 'other'; }
    else { await navigator.clipboard.writeText(url); channel = 'copy_link'; toast('Link copied — send it somewhere loud'); }
  } catch (e) {
    try { await navigator.clipboard.writeText(url); channel = 'copy_link'; toast('Link copied — send it somewhere loud'); }
    catch (e2) { toast(url); }
  }
  track('share', { channel, splash_id: null });
  gaEvent('share_click', { channel, splash_id: null });
});

// Inbound share visit: ?r={token} — record it, then clean the URL.
(function handleShareReturn() {
  const params = new URLSearchParams(location.search);
  const token = params.get('r');
  if (!token) return;
  track('share_return', { share_token: token });
  gaEvent('share_return', { share_token: token });
  params.delete('r'); params.delete('s');
  const clean = location.pathname + (params.toString() ? '?' + params.toString() : '') + location.hash;
  history.replaceState(null, '', clean);
})();
document.getElementById('btn-add').addEventListener('click', () => openPanel('add-widget'));
document.getElementById('btn-claim').addEventListener('click', () => { pendingSlotClaimEntry = 'button'; openPanel('claim-widget'); });

// dobaness.com/claim — a direct entry point for the sales conversation
// (revision-spec §2.3): loads the wall and opens the slot form immediately.
// public/_redirects sends /claim -> /?claim=1 (a real redirect, not a
// same-URL rewrite — local Wrangler dev doesn't preserve the original path
// on a 200-status rewrite rule the way production Cloudflare Pages does).
if (new URLSearchParams(location.search).get('claim') === '1') {
  pendingSlotClaimEntry = 'deeplink';
  window.addEventListener('load', () => {
    dismissIntro();
    openPanel('claim-form');
    const params = new URLSearchParams(location.search);
    params.delete('claim');
    history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params.toString() : ''));
  });
}

/* ---------------------------------------------------------------------
   INTRO SCREEN — plays the splash motion once, clean; fit-to-bbox so the
   blob is never clipped (revision-spec §1, critical fix)
--------------------------------------------------------------------- */
let introShowing = true;
const introBox = document.querySelector('.intro-splash-box');
const introCanvas = document.getElementById('intro-canvas');
const introCtx = introCanvas.getContext('2d');
let introRaf = null, introSplash = null;

function blobBBox(verts, R) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of verts) {
    const x = Math.cos(v.a) * R * v.r, y = Math.sin(v.a) * R * v.r;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function bootIntroDemo() {
  let iw = 0, ih = 0, dpr = 1, scale = 1, bbox = null;

  function resizeIntroCanvas() {
    const rect = introBox.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    iw = rect.width; ih = rect.height;
    introCanvas.width = iw * dpr;
    introCanvas.height = ih * dpr;
    introCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (introSplash) fitDemoToBox();
  }

  // Generate the blob, measure its real bounding box, then scale it to fit
  // inside the render box minus padding and centre it on both axes — never
  // a hardcoded size, so a differently-shaped blob tomorrow still fits.
  function fitDemoToBox() {
    bbox = blobBBox(introSplash.verts, introSplash.R);
    // Padding scales with the (now much smaller, 150/220px) box itself
    // rather than a fixed px value tuned for the old 280/540px box.
    const padding = Math.max(10, iw * 0.14);
    const availW = Math.max(20, iw - padding * 2), availH = Math.max(20, ih - padding * 2);
    scale = Math.min(availW / bbox.w, availH / bbox.h);
  }

  function spawnDemo() {
    const verts = buildVerts();
    const rmin = Math.min(...verts.map(v => v.r));
    // boardMinDim=0: the intro box is its own world, not tied to the main
    // wall's radius floor — R here comes purely from the text fit.
    // "karibu" alone — DOBANESS already appears as the wordmark below (§1).
    const fit = fitTextToBlob(introCtx, 'karibu', 'PRE-LAUNCH', '', rmin, 'short', 0);
    const grad = pick(NON_ORANGE_GRADS);
    introSplash = Object.assign(Object.create(Splash.prototype), {
      sid: -1, x: 0, y: 0, born: performance.now(), state: 'GROW', exitAt: 0,
      scale: 0, alpha: 1, phase: rand(TWO_PI), verts, gradAngle: rand(TWO_PI),
      hold: 1400, item: { type: 'post', data: { axis: 'other', handle: '', id: 'intro' } },
      reactedEmoji: null, dwellBonusGiven: true, holding: false, holdStartedAt: 0,
      color: grad[0], grad, scene: null, isIntro: true,
      drops: [],
      ...fit,
    });
    introSplash.ink = inkOn(introSplash.grad[0], introSplash.grad[1]);
    fitDemoToBox();
  }

  resizeIntroCanvas();
  spawnDemo();
  window.addEventListener('resize', resizeIntroCanvas);

  function loop(now) {
    introCtx.clearRect(0, 0, iw, ih);
    introSplash.update(now);
    if (introSplash.state === 'DEAD') spawnDemo();
    introCtx.save();
    introCtx.translate(iw / 2, ih / 2);
    introCtx.scale(scale, scale);
    introCtx.translate(-bbox.cx, -bbox.cy);
    introSplash.display(introCtx, now);
    introCtx.restore();
    introRaf = requestAnimationFrame(loop);
  }
  introRaf = requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', () => {
    if (!introShowing) return;
    if (document.hidden) { if (introRaf) { cancelAnimationFrame(introRaf); introRaf = null; } }
    else if (!introRaf) { introRaf = requestAnimationFrame(loop); }
  });
}

/* ---------------------------------------------------------------------
   AMBIENT BUNDLE SPLASHES — small, name-only splashes popping in the dark
   margins around the intro column (intro patch v2.1 §3)
--------------------------------------------------------------------- */
const AMBIENT_FADE_IN_MS = 600, AMBIENT_FADE_OUT_MS = 800;
const AMBIENT_MIN_SEP = 80, AMBIENT_CTA_MARGIN = 120;
const ambientCanvas = document.getElementById('intro-ambient-canvas');
const ambientCtx = ambientCanvas.getContext('2d');
let ambientSplashes = [];
let ambientRaf = null;
let ambientLastSpawnAt = 0, ambientNextSpawnGap = 0;
let ambientStaticBuilt = false;

function ambientIsMobile() { return window.innerWidth < 720; }
function ambientCap() { return ambientIsMobile() ? 2 : 4; }
function ambientSizeRange() { return ambientIsMobile() ? [70, 100] : [90, 140]; }

let ambientDeck = [], ambientDeckPos = 0;
function buildAmbientDeck() { ambientDeck = shuffleArray(AXES.map(a => a.title)); ambientDeckPos = 0; }
// Shuffle the six, walk in order, reshuffle at the end — guarantees all six
// surface within the first cycle. Skip a name that's still live so the same
// bundle is never shown twice at once.
function nextAmbientName(liveNames) {
  for (let tries = 0; tries < 12; tries++) {
    if (ambientDeckPos >= ambientDeck.length) buildAmbientDeck();
    const name = ambientDeck[ambientDeckPos++];
    if (!liveNames.has(name)) return name;
  }
  return null;
}

function rectsOverlapAmbient(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
// Hard exclusion: the text column (60ch measure) and a 120px halo around
// the CTA — motion next to a button steals taps.
function ambientExclusionRects() {
  const col = document.querySelector('.intro-inner').getBoundingClientRect();
  const btn = document.getElementById('intro-enter').getBoundingClientRect();
  return [
    { x: col.left, y: col.top, w: col.width, h: col.height },
    {
      x: btn.left - AMBIENT_CTA_MARGIN, y: btn.top - AMBIENT_CTA_MARGIN,
      w: btn.width + AMBIENT_CTA_MARGIN * 2, h: btn.height + AMBIENT_CTA_MARGIN * 2,
    },
  ];
}
function findAmbientPlacement(R, exclusions, liveSplashes, vw, vh) {
  for (let i = 0; i < 30; i++) {
    const x = rand(R, Math.max(R + 1, vw - R)), y = rand(R, Math.max(R + 1, vh - R));
    const candRect = { x: x - R, y: y - R, w: R * 2, h: R * 2 };
    if (exclusions.some(r => rectsOverlapAmbient(r, candRect))) continue;
    if (liveSplashes.some(s => Math.hypot(x - s.x, y - s.y) < s.R + R + AMBIENT_MIN_SEP)) continue;
    return { x, y };
  }
  return null;
}

function fitAmbientText(c, name, R) {
  const maxW = R * 1.35;
  let fontPx = R * 0.22;
  const minFontPx = Math.max(9, R * 0.1);
  for (;;) {
    c.font = heavyFont(fontPx);
    if (c.measureText(name).width <= maxW || fontPx <= minFontPx) return { fontPx, lines: [name] };
    const twoLine = wrapWordsToLines(c, name.split(/\s+/), 2);
    const widest = Math.max(...twoLine.map(l => c.measureText(l).width));
    if (widest <= maxW || fontPx <= minFontPx) return { fontPx, lines: twoLine };
    fontPx -= 1;
  }
}

function makeAmbientSplash(name, x, y, R) {
  const grad = pick(AMBIENT_GRADS);
  return {
    name, x, y, R, grad, verts: buildVerts(60),
    born: performance.now(), outAt: 0,
    holdMs: rand(2500, 4000),
    targetAlpha: rand(0.5, 0.65),
    state: 'IN',
  };
}
function updateAmbient(s, now) {
  if (s.state === 'STATIC') return;
  const age = now - s.born;
  if (s.state === 'IN' && age >= AMBIENT_FADE_IN_MS) s.state = 'HOLD';
  else if (s.state === 'HOLD' && age >= AMBIENT_FADE_IN_MS + s.holdMs) { s.state = 'OUT'; s.outAt = now; }
  else if (s.state === 'OUT' && now - s.outAt >= AMBIENT_FADE_OUT_MS) s.state = 'DEAD';
}
function ambientAlpha(s, now) {
  if (s.state === 'STATIC') return s.targetAlpha;
  const age = now - s.born;
  if (s.state === 'IN') return s.targetAlpha * Math.min(1, age / AMBIENT_FADE_IN_MS);
  if (s.state === 'HOLD') return s.targetAlpha;
  if (s.state === 'OUT') return s.targetAlpha * Math.max(0, 1 - (now - s.outAt) / AMBIENT_FADE_OUT_MS);
  return 0;
}
// No outer glow, no blur — that's what would push these back and blur the
// name. Flat gradient fill only.
function drawAmbient(c, s, now) {
  const alpha = ambientAlpha(s, now);
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = alpha;
  c.beginPath();
  const N = s.verts.length;
  for (let i = 0; i < N; i++) {
    const v = s.verts[i];
    const rr = s.R * v.r;
    const x = s.x + Math.cos(v.a) * rr, y = s.y + Math.sin(v.a) * rr;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  const g = c.createLinearGradient(s.x - s.R, s.y - s.R, s.x + s.R, s.y + s.R);
  g.addColorStop(0, s.grad[0]); g.addColorStop(1, s.grad[1]);
  c.fillStyle = g;
  c.fill();

  const fit = fitAmbientText(c, s.name, s.R);
  c.fillStyle = inkOn(s.grad[0], s.grad[1]);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = heavyFont(fit.fontPx);
  const lineH = fit.fontPx * 1.15;
  const y0 = s.y - (fit.lines.length - 1) * lineH / 2;
  fit.lines.forEach((l, i) => c.fillText(l, s.x, y0 + i * lineH));
  c.restore();
}

function bootAmbientSplashes() {
  let vw = 0, vh = 0;

  function resizeAmbient() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = window.innerWidth; vh = window.innerHeight;
    ambientCanvas.width = vw * dpr; ambientCanvas.height = vh * dpr;
    ambientCanvas.style.width = vw + 'px'; ambientCanvas.style.height = vh + 'px';
    ambientCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeAmbient();
  window.addEventListener('resize', resizeAmbient);

  function trySpawn(now) {
    const alive = ambientSplashes.filter(s => s.state !== 'DEAD');
    if (alive.length >= ambientCap()) return;
    if (now - ambientLastSpawnAt < ambientNextSpawnGap) return;
    ambientLastSpawnAt = now;
    ambientNextSpawnGap = rand(500, 900); // stagger so pops don't read as one pulse
    const name = nextAmbientName(new Set(alive.map(s => s.name)));
    if (!name) return;
    const [minSize, maxSize] = ambientSizeRange();
    const R = rand(minSize, maxSize) / 2;
    const pos = findAmbientPlacement(R, ambientExclusionRects(), alive, vw, vh);
    if (!pos) return;
    ambientSplashes.push(makeAmbientSplash(name, pos.x, pos.y, R));
  }

  function buildStatic() {
    if (ambientStaticBuilt) return;
    ambientStaticBuilt = true;
    const names = shuffleArray(AXES.map(a => a.title)).slice(0, 3);
    const [minSize, maxSize] = ambientSizeRange();
    for (const name of names) {
      const R = rand(minSize, maxSize) / 2;
      const pos = findAmbientPlacement(R, ambientExclusionRects(), ambientSplashes, vw, vh);
      if (pos) {
        const s = makeAmbientSplash(name, pos.x, pos.y, R);
        s.state = 'STATIC';
        ambientSplashes.push(s);
      }
    }
  }

  function loop(now) {
    ambientCtx.clearRect(0, 0, vw, vh);
    if (REDUCED) {
      buildStatic();
    } else {
      trySpawn(now);
      for (const s of ambientSplashes) updateAmbient(s, now);
      ambientSplashes = ambientSplashes.filter(s => s.state !== 'DEAD');
    }
    for (const s of ambientSplashes) drawAmbient(ambientCtx, s, now);
    ambientRaf = requestAnimationFrame(loop);
  }
  ambientRaf = requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', () => {
    if (!introShowing) return;
    if (document.hidden) { if (ambientRaf) { cancelAnimationFrame(ambientRaf); ambientRaf = null; } }
    else if (!ambientRaf) { ambientRaf = requestAnimationFrame(loop); }
  });

  // Tapping any ambient splash enters the wall — it never filters by bundle,
  // the axes aren't filterable (§3 "Interaction").
  ambientCanvas.addEventListener('pointerdown', e => {
    if (!introShowing) return;
    const hit = ambientSplashes.find(s => s.state !== 'DEAD' && Math.hypot(e.clientX - s.x, e.clientY - s.y) <= s.R);
    if (hit) dismissIntro();
  });
}

// Live splash count (§1.3) — the span already carries the build-time
// fallback (real seed count), so never a spinner, never a 0.
async function loadIntroStats() {
  try {
    const res = await fetch('/api/stats', { signal: AbortSignal.timeout(2500) });
    const data = await res.json();
    if (data && typeof data.splashes === 'number') {
      document.getElementById('intro-count').textContent = data.splashes;
    }
    if (data && typeof data.founding_slots_left === 'number') {
      foundingSlotsLeft = data.founding_slots_left;
    }
  } catch (e) { /* keep the build-time fallback already in the DOM */ }
}

function dismissIntro() {
  introShowing = false;
  document.getElementById('intro').classList.add('hide');
  if (introRaf) cancelAnimationFrame(introRaf);
  if (ambientRaf) cancelAnimationFrame(ambientRaf);
  track('action_completed', { action: 'enter-wall' });
  track('wall_enter', {});
  gaEvent('wall_enter', {});
  maybeShowFirstVisitHint();
}
document.getElementById('intro-enter').addEventListener('click', dismissIntro);

/* ---------------------------------------------------------------------
   FIRST-VISIT COACH MARK — once, centred, dismiss on tap or 4s (§2.4)
--------------------------------------------------------------------- */
const HINT_KEY = 'dbn_hint_seen';
function maybeShowFirstVisitHint() {
  try { if (localStorage.getItem(HINT_KEY)) return; } catch (e) { return; }
  const el = document.getElementById('coach-mark');
  el.classList.add('show');
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    el.classList.remove('show');
    canvas.removeEventListener('pointerdown', dismiss);
    try { localStorage.setItem(HINT_KEY, '1'); } catch (e) {}
  };
  canvas.addEventListener('pointerdown', dismiss, { once: true, passive: true });
  setTimeout(dismiss, 4000);
}

/* ---------------------------------------------------------------------
   BOOT
--------------------------------------------------------------------- */
function boot() {
  loadBgImage();
  makePhotos();
  resizeCanvas();
  deck = buildDeck();
  ensureSlots();
  startLoop();
  bootIntroDemo();
  bootAmbientSplashes();
  loadIntroStats();
}
window.addEventListener('resize', () => {
  resizeCanvas();
});
boot();
