// Mini-game: Pilar's wheel class. The clay rises on its own up to the customer's line;
// your job is to keep it centred with ◀ ▶ (or ← →, or tapping either side of the table).
// It drifts and leans more as it gets taller, and air bubbles shove it. How it fails depends on how
// high it got: a coaster, a bowl, a lamp, or (right at the end) art.

import { crashSound, fanfare, clackSound } from './sound.js';
import { FONT } from './ads.js';

const W = 180;
const H = 320;
const WHEEL_Y = 262;     // top of the wheel head, where the pot sits
const CX = 82;           // centre of the wheel

const ORDERS = [
  { name: 'A WONKY MUG', price: '£45', height: 62, width: 34, shape: 'mug' },
  { name: 'A MINIMALIST VASE', price: '£120', height: 92, width: 30, shape: 'vase' },
  { name: 'A BOWL FOR ONE OLIVE', price: '£38', height: 30, width: 46, shape: 'bowl' },
];
const PILAR = {
  start: ['Feel the clay.', 'Centre yourself first. Then the clay.', 'Wheel class is £65. No refunds.'],
  pulling: ['Less pressure. Like your rent.', 'Gentle...', 'Let the clay lead.', 'That\'s very... intentional.'],
  close: ['Nearly there.', 'Stop when it feels right.'],
  leaning: ['It\'s leaning!', 'Centre it!', 'Back to the middle!'],
  lump: ['Air bubble!', 'Lump!', 'Did you wedge this?'],
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function text(g, str, cx, y, colour, k = 1) {
  const x0 = Math.round(cx - (str.length * 4 - 1) * k / 2);
  [...str].forEach((ch, i) => {
    const p = FONT[ch] || FONT[' '];
    for (let j = 0; j < 15; j++) if (p[j] === '1') { g.fillStyle = colour; g.fillRect(x0 + (i * 4 + (j % 3)) * k, y + Math.floor(j / 3) * k, k, k); }
  });
}

// Half-width of the pot at height y (0 = base), for the order's shape
function profile(shape, y, h, width) {
  const f = h ? y / h : 0;
  const half = width / 2;
  if (shape === 'vase') return half * (0.75 + 0.45 * Math.sin(Math.min(1, f * 1.4) * Math.PI) - (f > 0.8 ? 0.35 * (f - 0.8) / 0.2 : 0));
  if (shape === 'bowl') return half * (0.55 + 0.45 * Math.sqrt(f));
  return half * (0.92 + 0.08 * Math.sin(f * Math.PI));   // mug: straight-ish
}

export function playPottery(card, { riseSpeed = 11, drift = 1.6, push = 3.8, lumpEvery = 3 }, onDone) {
  card.innerHTML = `
    <div class="pool-head">
      <span class="pool-title">🏺 PILAR'S WHEEL CLASS</span>
      <button class="pool-leave" aria-label="Leave">✕</button>
    </div>
    <div class="pool-stage">
      <canvas width="${W}" height="${H}"></canvas>
      <div class="pool-say"></div>
      <div class="pool-score"></div>
      <div class="pool-result hidden"></div>
    </div>
    <div class="joystick" aria-label="Drag left or right to centre the clay">
      <span class="joy-arrow">◀</span><span class="joy-arrow">▶</span>
      <div class="joy-knob"></div>
    </div>
    <p class="pool-hint">The clay rises by itself. Drag the knob to keep it centred.</p>
  `;
  card.classList.add('pottery-card');
  const canvas = card.querySelector('canvas');
  const g = canvas.getContext('2d');
  const sayEl = card.querySelector('.pool-say');
  const scoreEl = card.querySelector('.pool-score');
  const resultEl = card.querySelector('.pool-result');
  scoreEl.style.cssText = 'top: 6px; bottom: auto;'; // up top: the centre meter is at the bottom

  let order;
  let height;
  let lean;       // -1 .. 1: how far the clay leans (1 = it falls over)
  let leanVel;
  let leanBias;   // which way the clay wants to go right now
  let biasT;
  let pushDir;    // -1 .. 1: you pushing it back (the joystick is analogue: further = harder)
  let lumpT;      // seconds to the next air bubble
  let lumpFlash;  // shows "LUMP!" for a moment
  let fail;       // how it went wrong: coaster | bowl | lamp | art
  let phase;      // 'class' | 'collapse' | 'firing' | 'over'
  let phaseT;
  let sayUntil;
  let nextComment;
  let running = true;

  function say(str, secs = 2.4) {
    sayEl.textContent = `"${str}"`;
    sayEl.classList.add('show');
    sayUntil = performance.now() + secs * 1000;
  }

  function setup() {
    order = ORDERS[Math.floor(Math.random() * ORDERS.length)];
    height = 6;
    lean = 0;
    leanVel = 0;
    leanBias = Math.random() < 0.5 ? -1 : 1;
    biasT = 0.6;
    pushDir = 0;
    lumpT = lumpEvery * (0.8 + Math.random() * 0.6);
    lumpFlash = 0;
    fail = null;
    phase = 'class';
    phaseT = 0;
    nextComment = performance.now() + 4000;
    resultEl.classList.add('hidden');
    say(pick(PILAR.start));
  }

  function finish(won) {
    phase = 'over';
    pushDir = 0;
    resultEl.classList.remove('hidden');
    if (won) {
      fanfare();
      resultEl.innerHTML = `
        <p class="pool-big win">YOU WON!</p>
        <p>${order.name.toLowerCase().replace(/^a /, 'A ')}.<br>Pilar will sell it for £340.</p>
        <button class="pool-continue">Continue</button>`;
      resultEl.querySelector('.pool-continue').addEventListener('click', () => close(true));
    } else {
      const [title, line] = {
        coaster: ['IT\'S A COASTER NOW.', 'Pilar will sell it as a set of six.'],
        bowl: ['IT\'S A BOWL NOW.', 'Wonky is a feature. That isn\'t.'],
        lamp: ['IT\'S A LAMP NOW.', 'Pilar is putting a bulb in it.'],
        art: ['IT\'S ART NOW.', 'Pilar is selling it for £900. You get nothing.'],
      }[fail];
      resultEl.innerHTML = `
        <p class="pool-big lose">${title}</p>
        <p>${line}</p>
        <button class="pool-again">Try again</button>
        <button class="pool-later secondary">Later</button>`;
      resultEl.querySelector('.pool-again').addEventListener('click', setup);
      resultEl.querySelector('.pool-later').addEventListener('click', () => close(false));
    }
  }

  function close(won) {
    running = false;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    onDone(won);
  }

  // ---------- Input: the joystick (drag left/right, springs back), or ← → ----------
  const joy = card.querySelector('.joystick');
  const knob = card.querySelector('.joy-knob');
  let dragging = false;
  function setJoy(clientX) {
    const r = joy.getBoundingClientRect();
    const reach = r.width / 2 - knob.offsetWidth / 2;
    const v = Math.max(-1, Math.min(1, (clientX - (r.left + r.width / 2)) / reach));
    pushDir = v;
    knob.style.transform = `translateX(${v * reach}px)`;
  }
  joy.addEventListener('pointerdown', (e) => { e.preventDefault(); try { joy.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ } dragging = true; joy.classList.add('active'); setJoy(e.clientX); });
  joy.addEventListener('pointermove', (e) => { if (dragging) setJoy(e.clientX); });
  for (const ev of ['pointerup', 'pointercancel']) {
    joy.addEventListener(ev, () => { dragging = false; pushDir = 0; knob.style.transform = ''; joy.classList.remove('active'); });
  }
  const leanKey = { ArrowLeft: -1, ArrowRight: 1, a: -1, A: -1, d: 1, D: 1 };
  function onKeyDown(e) { if (leanKey[e.key]) { e.preventDefault(); pushDir = leanKey[e.key]; } }
  function onKeyUp(e) { if (leanKey[e.key] && pushDir === leanKey[e.key]) pushDir = 0; }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  card.querySelector('.pool-leave').addEventListener('click', () => close(false));

  // ---------- Drawing ----------
  function drawStudio(t) {
    // Railway arch: bricks, the curve, a window of light
    g.fillStyle = '#6e2f22'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < 200; y += 4) for (let x = ((y / 4) % 2) * 4 - 4; x < W; x += 8) { g.fillStyle = (x * 3 + y) % 5 ? '#9a4733' : '#8f3f2d'; g.fillRect(x, y, 7, 3); }
    g.fillStyle = '#e9dcc0';
    g.beginPath(); g.ellipse(W / 2, 200, 92, 190, 0, Math.PI, 0); g.lineTo(W / 2 + 92, 200); g.fill(); // the arch, whitewashed inside
    g.fillStyle = '#f3ead6'; g.fillRect(6, 196, W - 12, 4);
    g.fillStyle = '#a39d92'; g.fillRect(0, 200, W, H - 200);                     // concrete studio floor
    for (let y = 214; y < H; y += 18) { g.fillStyle = '#958f84'; g.fillRect(0, y, W, 1); }
    g.fillStyle = '#b9805e'; g.fillRect(24, 300, 5, 2); g.fillRect(140, 292, 3, 2);  // clay drips
    // Sign
    g.fillStyle = '#1b1b1b'; g.fillRect(12, 34, 70, 30);
    text(g, 'WHEEL CLASS', 47, 38, '#fffaf0');
    text(g, '£65  2 HRS', 47, 46, '#ffd23f');
    text(g, 'BYO OAT MILK', 47, 54, '#9fd3a0');
    // Shelf of wonky pots for sale
    g.fillStyle = '#8a5a35'; g.fillRect(96, 64, 72, 3);
    const pots = [[104, '#8fb3a6', 10, 12], [120, '#d98a5a', 8, 16], [136, '#e9dcc0', 12, 9], [154, '#b8584a', 9, 14]];
    for (const [x, c, w, h] of pots) { g.fillStyle = c; g.fillRect(x - w / 2, 64 - h, w, h); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x - w / 2, 64 - h, 2, h); }
    text(g, '£340', 136, 70, '#1b1b1b');
    // A plant
    g.fillStyle = '#c0663f'; g.fillRect(150, 172, 16, 14);
    for (const [dx, dy, c] of [[-6, -10, '#3f9a44'], [2, -16, '#2e7d32'], [8, -9, '#5cb85c'], [-2, -6, '#2e7d32'], [6, -20, '#3f9a44']]) { g.fillStyle = c; g.fillRect(158 + dx, 172 + dy, 6, 6); }
    // Pilar, watching, apron and all
    const px = 132;
    const py = 120;
    g.fillStyle = '#3b2618'; g.fillRect(px - 2, py - 2, 18, 22);                  // hair
    g.fillStyle = '#ebc3a6'; g.fillRect(px + 2, py + 2, 10, 11);                  // face
    g.fillStyle = '#111'; g.fillRect(px + 2, py + 5, 4, 3); g.fillRect(px + 8, py + 5, 4, 3); // glasses
    g.fillStyle = '#dfe9ef'; g.fillRect(px + 3, py + 6, 2, 1); g.fillRect(px + 9, py + 6, 2, 1);
    g.fillStyle = '#f4f4f2'; g.fillRect(px - 1, py + 18, 16, 24);                 // tee
    g.fillStyle = '#fbfaf6'; g.fillRect(px + 1, py + 22, 12, 30);                 // apron
    g.fillStyle = '#b9805e'; g.fillRect(px + 3, py + 30, 4, 3); g.fillRect(px + 8, py + 40, 3, 4); // clay on it
    g.fillStyle = '#cdb8a6'; g.fillRect(px + 1, py - 1, 3, 2);                    // and in her hair
    g.fillStyle = '#3b3b40'; g.fillRect(px + 2, py + 52, 4, 18); g.fillRect(px + 8, py + 52, 4, 18);
    void t;
  }

  function drawWheel(t) {
    g.fillStyle = '#5a3a22'; g.fillRect(CX - 44, WHEEL_Y + 6, 88, 46);           // wheel tray
    g.fillStyle = '#4a2e1c'; g.fillRect(CX - 44, WHEEL_Y + 6, 88, 3);
    g.fillStyle = '#7a8088';                                                      // spinning wheel head
    g.beginPath(); g.ellipse(CX, WHEEL_Y + 3, 34, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9aa0a8';
    const spin = (t * 10) % (Math.PI * 2);
    for (let i = 0; i < 3; i++) { const a = spin + (i * Math.PI * 2) / 3; g.fillRect(Math.round(CX + Math.cos(a) * 26), Math.round(WHEEL_Y + 3 + Math.sin(a) * 4), 3, 1); }
  }

  function drawPot(t) {
    const h = Math.round(height);
    const sway = lean * 16;                                                       // leaning off-centre
    for (let y = 0; y < h; y++) {
      const half = profile(order.shape, y, h, order.width) + Math.sin(t * 9 + y * 0.3) * Math.abs(lean) * 1.5;
      const shift = sway * (y / Math.max(1, h));                                 // the higher, the further it leans
      const x0 = Math.round(CX - half + shift);
      const w = Math.round(half * 2);
      g.fillStyle = y % 7 === 0 ? '#a46a4a' : '#b9805e';                         // clay, with throwing rings
      g.fillRect(x0, WHEEL_Y - y, w, 1);
      g.fillStyle = '#d29a78'; g.fillRect(x0 + 2, WHEEL_Y - y, 2, 1);           // highlight
      g.fillStyle = '#8a5236'; g.fillRect(x0 + w - 3, WHEEL_Y - y, 3, 1);        // shadow
    }
    if (h > 3) {                                                                  // the rim, opening at the top
      const half = profile(order.shape, h, h, order.width);
      g.fillStyle = '#6e3a24'; g.fillRect(Math.round(CX - half + 3 + sway), WHEEL_Y - h, Math.round(half * 2 - 6), 2);
    }
    if (phase === 'class') {                                                      // your hands, pulling up
      const half = profile(order.shape, h, h, order.width);
      g.fillStyle = '#ebc3a6';
      g.fillRect(Math.round(CX - half - 6 + sway), WHEEL_Y - h + 2, 6, 5);
      g.fillRect(Math.round(CX + half + sway), WHEEL_Y - h + 2, 6, 5);
    }
  }

  function drawTarget() {
    const y = WHEEL_Y - order.height;
    for (let x = CX - 40; x < CX + 40; x += 4) { g.fillStyle = '#1f7a3a'; g.fillRect(x, y, 2, 1); }
    text(g, order.name, W / 2, 210, '#1b1b1b');
    text(g, order.price, CX - 54, y - 2, '#1f7a3a');
  }

  function drawLeanMeter() {
    const y = 299;
    g.fillStyle = '#1b1b1b'; g.fillRect(CX - 41, y - 1, 82, 7);
    g.fillStyle = '#e0332f'; g.fillRect(CX - 40, y, 80, 5);
    g.fillStyle = '#ffd23f'; g.fillRect(CX - 26, y, 52, 5);
    g.fillStyle = '#5cf072'; g.fillRect(CX - 12, y, 24, 5);
    g.fillStyle = '#fffaf0'; g.fillRect(Math.round(CX + lean * 39) - 1, y - 3, 3, 11);
    text(g, 'CENTRE', CX, y + 9, '#1b1b1b');
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    if (!running || !canvas.isConnected) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    if (phase === 'class') {
      height += riseSpeed * dt;
      // Off-centre drift: the clay keeps pulling to one side, harder as it gets taller
      biasT -= dt;
      if (biasT <= 0) { biasT = 0.8 + Math.random() * 1.4; leanBias = Math.random() < 0.6 ? -leanBias : leanBias; }
      const pullOn = drift * (0.6 + height / 60);
      lumpT -= dt;
      if (lumpT <= 0) {                                          // an air bubble: a sudden shove
        lumpT = lumpEvery * (0.7 + Math.random() * 0.7);
        leanVel += (Math.random() < 0.5 ? -1 : 1) * (1 + height / 80);
        lumpFlash = 0.7;
        clackSound(0.6);
        if (now > sayUntil) say(pick(PILAR.lump), 1.2);
      }
      lumpFlash = Math.max(0, lumpFlash - dt);
      leanVel += (leanBias * pullOn + (Math.random() - 0.5) * 2 + pushDir * push) * dt;
      leanVel *= Math.exp(-1.6 * dt);
      lean += leanVel * dt;
      if (Math.abs(lean) >= 1) {
        const f = height / order.height;                         // how far up it got decides what it becomes
        fail = f < 0.35 ? 'coaster' : f < 0.7 ? 'bowl' : f < 0.93 ? 'lamp' : 'art';
        lean = Math.sign(lean);
        phase = 'collapse';
        phaseT = 0;
        crashSound();
      }
      else if (height >= order.height) { height = order.height; phase = 'firing'; phaseT = 0; clackSound(1); }
      if (now > nextComment) { nextComment = now + 5000; if (now > sayUntil) say(pick(height > order.height * 0.7 ? PILAR.close : PILAR.pulling)); }
      if (Math.abs(lean) > 0.6 && now > sayUntil) say(pick(PILAR.leaning), 1.2);
    } else if (phase === 'collapse') {                           // slumping (lamps and art stay up, at an angle)
      phaseT += dt;
      if (fail === 'coaster') height = Math.max(4, height - 60 * dt);
      else if (fail === 'bowl') { height = Math.max(order.height > 40 ? 22 : 12, height - 120 * dt); lean *= Math.exp(-3 * dt); }
      else lean = Math.sign(lean) * Math.min(1.6, Math.abs(lean) + 1.2 * dt);
      if (phaseT > 1) finish(false);
    } else if (phase === 'firing') {
      phaseT += dt;
      lean *= Math.exp(-4 * dt);
      if (phaseT > 0.8) finish(true);
    }
    if (now > sayUntil) sayEl.classList.remove('show');
    scoreEl.textContent = `${Math.min(100, Math.round((height / order.height) * 100))}% UP`;

    drawStudio(t);
    drawTarget();
    drawWheel(t);
    drawPot(t);
    drawLeanMeter();
    if (lumpFlash > 0) text(g, 'LUMP!', CX, WHEEL_Y - height - 18, '#e0332f', 2);
    if (fail === 'lamp' && phase !== 'class') {                  // a bulb on top
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.arc(CX + lean * 16, WHEEL_Y - height - 6, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,210,63,0.25)';
      g.beginPath(); g.arc(CX + lean * 16, WHEEL_Y - height - 6, 14, 0, Math.PI * 2); g.fill();
    }
    if (fail === 'art' && phase !== 'class') text(g, '£900', CX + 40, WHEEL_Y - height - 4, '#1f7a3a', 2);
    requestAnimationFrame(frame);
  }
  setup();
  requestAnimationFrame(frame);
  // Testing helper (?debug only): a perfect pot
  return { cheat() { height = order.height; lean = 0; phase = 'firing'; phaseT = 0; } };
}
