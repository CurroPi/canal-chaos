// Mini-game: Pilar's wheel class. Pull the clay up to the customer's line.
// Hold to pull the walls up; it wobbles more the longer you pull, so let go to steady it.
// Wobble too much and it collapses ("IT'S A BOWL NOW"); pull past the line and it's a lamp.

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
  pulling: ['Less pressure. Like your rent.', 'Gentle...', 'Let the clay lead.'],
  wobbly: ['Steady!', 'That\'s very... intentional.', 'Wonky is a feature. Within reason.'],
  close: ['Nearly there.', 'Stop when it feels right.'],
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

export function playPottery(card, { seconds = 30, tolerance = 7 }, onDone) {
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
    <button class="pull-button">HOLD TO PULL UP</button>
    <p class="pool-hint">Hold to pull the clay up. Let go to steady it.<br>Stop on the dotted line.</p>
  `;
  const canvas = card.querySelector('canvas');
  const g = canvas.getContext('2d');
  const sayEl = card.querySelector('.pool-say');
  const scoreEl = card.querySelector('.pool-score');
  const resultEl = card.querySelector('.pool-result');
  const pullBtn = card.querySelector('.pull-button');

  let order;
  let height;
  let wobble;     // 0 calm .. 1 collapse
  let holding;
  let timeLeft;
  let phase;      // 'class' | 'collapse' | 'lamp' | 'firing' | 'over'
  let phaseT;
  let steadyInBand;
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
    height = 8;
    wobble = 0;
    holding = false;
    timeLeft = seconds;
    phase = 'class';
    phaseT = 0;
    steadyInBand = 0;
    nextComment = performance.now() + 5000;
    resultEl.classList.add('hidden');
    pullBtn.disabled = false;
    say(pick(PILAR.start));
  }

  function setHolding(on) {
    if (phase !== 'class') { holding = false; return; }
    if (on && !holding && Math.random() < 0.35) say(pick(PILAR.pulling), 1.6);
    holding = on;
    pullBtn.classList.toggle('active', on);
  }

  function finish(won, how) {
    phase = 'over';
    holding = false;
    pullBtn.disabled = true;
    resultEl.classList.remove('hidden');
    if (won) {
      fanfare();
      resultEl.innerHTML = `
        <p class="pool-big win">YOU WON!</p>
        <p>${order.name.toLowerCase().replace(/^a /, 'A ')}.<br>Pilar will sell it for £340.</p>
        <button class="pool-continue">Continue</button>`;
      resultEl.querySelector('.pool-continue').addEventListener('click', () => close(true));
    } else {
      const title = how === 'lamp' ? 'IT\'S A LAMP NOW.' : how === 'time' ? 'CLASS IS OVER.' : 'IT\'S A BOWL NOW.';
      const line = how === 'lamp' ? 'Too tall. Pilar is putting a bulb in it.' : how === 'time' ? 'That\'ll be £65.' : 'Wonky is a feature. That isn\'t.';
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

  // ---------- Input: hold the button, the table, Space or ↑ ----------
  for (const el of [pullBtn, canvas]) {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); setHolding(true); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => setHolding(false));
  }
  const isPull = (e) => e.key === ' ' || e.key === 'ArrowUp';
  function onKeyDown(e) { if (isPull(e)) { e.preventDefault(); if (!e.repeat) setHolding(true); } }
  function onKeyUp(e) { if (isPull(e)) setHolding(false); }
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
    const sway = Math.sin(t * 14) * wobble * 7;
    for (let y = 0; y < h; y++) {
      const half = profile(order.shape, y, h, order.width) + Math.sin(t * 9 + y * 0.3) * wobble * 2;
      const lean = sway * (y / Math.max(1, h));
      const x0 = Math.round(CX - half + lean);
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
    if (holding && phase === 'class') {                                           // your hands, pulling up
      const half = profile(order.shape, h, h, order.width);
      g.fillStyle = '#ebc3a6';
      g.fillRect(Math.round(CX - half - 6 + sway), WHEEL_Y - h + 2, 6, 5);
      g.fillRect(Math.round(CX + half + sway), WHEEL_Y - h + 2, 6, 5);
    }
  }

  function drawTarget() {
    const y = WHEEL_Y - order.height;
    for (let x = CX - 40; x < CX + 40; x += 4) { g.fillStyle = '#1f7a3a'; g.fillRect(x, y, 2, 1); }
    g.fillStyle = 'rgba(31,122,58,0.12)'; g.fillRect(CX - 40, y - tolerance, 80, tolerance * 2);
    text(g, order.name, W / 2, 210, '#1b1b1b');
    text(g, order.price, CX - 54, y - 2, '#1f7a3a');
  }

  function drawWobbleMeter() {
    g.fillStyle = '#1b1b1b'; g.fillRect(8, 222, 6, 60);
    const h = Math.round(58 * Math.min(1, wobble));
    g.fillStyle = wobble > 0.7 ? '#e0332f' : wobble > 0.4 ? '#ffd23f' : '#5cf072';
    g.fillRect(9, 281 - h, 4, h);
    text(g, 'WOBBLE', 22, 286, '#1b1b1b');
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    if (!running || !canvas.isConnected) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    if (phase === 'class') {
      timeLeft -= dt;
      if (holding) {
        height += 24 * dt;
        wobble += (0.32 + height / 260) * dt;                    // the taller it gets, the shakier
      } else wobble = Math.max(0, wobble - 0.55 * dt);
      if (wobble >= 1) { phase = 'collapse'; phaseT = 0; crashSound(); }
      else if (height > order.height + tolerance) { phase = 'lamp'; phaseT = 0; crashSound(); }
      else if (timeLeft <= 0) finish(false, 'time');
      // Resting in the band, calm enough: it's done
      const inBand = Math.abs(height - order.height) <= tolerance;
      steadyInBand = inBand && !holding && wobble < 0.45 ? steadyInBand + dt : 0;
      if (steadyInBand > 0.8) { phase = 'firing'; phaseT = 0; clackSound(1); }
      if (now > nextComment) {
        nextComment = now + 6000;
        if (now > sayUntil) say(wobble > 0.6 ? pick(PILAR.wobbly) : inBand ? pick(PILAR.close) : pick(PILAR.pulling));
      }
      if (wobble > 0.75 && now > sayUntil) say(pick(PILAR.wobbly), 1.4);
    } else if (phase === 'collapse') {                           // slumping into a bowl
      phaseT += dt;
      height = Math.max(order.height > 40 ? 22 : 12, height - 120 * dt);
      wobble = Math.max(0, wobble - 2 * dt);
      if (phaseT > 1) finish(false, 'collapse');
    } else if (phase === 'lamp') {
      phaseT += dt;
      if (phaseT > 0.8) finish(false, 'lamp');
    } else if (phase === 'firing') {
      phaseT += dt;
      wobble = Math.max(0, wobble - dt);
      if (phaseT > 0.8) finish(true);
    }
    if (now > sayUntil) sayEl.classList.remove('show');
    scoreEl.textContent = `CLASS ENDS ${Math.max(0, Math.ceil(timeLeft))}S`;

    drawStudio(t);
    drawTarget();
    drawWheel(t);
    drawPot(t);
    drawWobbleMeter();
    if (phase === 'lamp') { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(CX, WHEEL_Y - height - 6, 6, 0, Math.PI * 2); g.fill(); } // a bulb on top
    requestAnimationFrame(frame);
  }
  setup();
  requestAnimationFrame(frame);
  // Testing helper (?debug only): a perfect pot
  return { cheat() { height = order.height; wobble = 0; holding = false; steadyInBand = 1; phase = 'firing'; phaseT = 0; } };
}
