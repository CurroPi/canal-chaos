// Mini-game: beat David at pool, inside The Victory.
// Pot `target` balls before David finishes his pint (the pint is the timer).
// Drag back from the white ball to aim (the further, the harder), let go to shoot.

import { pickupSound, crashSound, fanfare, clackSound } from './sound.js';
import { FONT } from './ads.js';

const W = 180;
const H = 320;
const T = { left: 16, right: 164, top: 84, bottom: 304 };   // the baize
const MID = (T.top + T.bottom) / 2;
const R = 4;           // ball radius
const POCKET = 7.5;    // pocket capture radius
const MAX_SPEED = 430;
const PULL = 70;       // drag distance for full power

const POCKETS = [
  [T.left, T.top], [T.right, T.top], [T.left, MID], [T.right, MID], [T.left, T.bottom], [T.right, T.bottom],
];

const HECKLES = {
  start: ['Hey hey!! Rack \'em up, son.', 'Hey hey!! Winner stays on. I always stay on.'], // he always says hey hey
  idle: ['Bit of a slow one, son.', 'I was playing here before your mum was born.', 'Take your time. I\'ve got all night.', 'You hold a cue like a flat white.'],
  pot: ['Lucky.', 'Even a broken clock...', 'Hm.', 'Don\'t get excited.'],
  miss: ['Unlucky. Actually, no. Bad.', 'Nearly. Not really.', 'Shall I get you a straw?'],
  foul: ['Foul! That\'s my round you\'re buying.', 'In-off. Classic.'],
  lastOrders: ['Last orders, son.', 'Nearly done with this pint...'],
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Crisp 3x5 pixel lettering (same font as the fake ads), centred on x
function pixelText(g, str, cx, y, colour) {
  g.fillStyle = colour;
  const x0 = Math.round(cx - (str.length * 4 - 1) / 2);
  [...str].forEach((ch, i) => {
    const p = FONT[ch] || FONT[' '];
    for (let j = 0; j < 15; j++) if (p[j] === '1') g.fillRect(x0 + i * 4 + (j % 3), y + Math.floor(j / 3), 1, 1);
  });
}

export function playPool(card, { seconds = 45, target = 3 }, onDone) {
  card.innerHTML = `
    <div class="pool-head">
      <span class="pool-title">🎱 BEAT DAVID AT POOL</span>
      <button class="pool-leave" aria-label="Leave">✕</button>
    </div>
    <div class="pool-stage">
      <canvas width="${W}" height="${H}"></canvas>
      <div class="pool-say"></div>
      <div class="pool-score"></div>
      <div class="pool-result hidden"></div>
    </div>
    <p class="pool-hint">Drag back from the white ball, let go to shoot.<br>Pot ${target} before David finishes his pint.</p>
  `;
  const canvas = card.querySelector('canvas');
  const g = canvas.getContext('2d');
  const sayEl = card.querySelector('.pool-say');
  const scoreEl = card.querySelector('.pool-score');
  const resultEl = card.querySelector('.pool-result');

  let balls;
  let potted;
  let timeLeft;
  let aim = null;        // { x, y } pointer while dragging
  let shotTaken = false; // a shot is rolling
  let pottedThisShot = 0;
  let fouled = false;
  let over = false;
  let sayUntil = 0;
  let nextIdle = 0;
  let lastOrdersSaid = false;
  let running = true;

  function say(text, secs = 2.6) {
    sayEl.textContent = text;
    sayEl.classList.add('show');
    sayUntil = performance.now() + secs * 1000;
  }

  function setup() {
    const cx = (T.left + T.right) / 2;
    balls = [{ x: cx, y: T.bottom - 46, vx: 0, vy: 0, color: '#fafafa', cue: true }];
    const colours = ['#e0332f', '#f2c12e', '#e0332f', '#f2c12e', '#e0332f', '#f2c12e'];
    let k = 0;
    for (let row = 0; row < 3; row++) {      // a triangle, point towards you
      for (let i = 0; i <= row; i++) {
        balls.push({ x: cx + (i - row / 2) * (R * 2 + 0.6), y: T.top + 70 - row * (R * 1.8 + 0.4), vx: 0, vy: 0, color: colours[k++] });
      }
    }
    potted = 0;
    timeLeft = seconds;
    over = false;
    shotTaken = false;
    resultEl.classList.add('hidden');
    lastOrdersSaid = false;
    nextIdle = performance.now() + 7000;
    say(pick(HECKLES.start));
    updateScore();
  }

  function updateScore() {
    scoreEl.textContent = `POTTED ${potted}/${target}`;
  }

  const cue = () => balls.find((b) => b.cue);
  const moving = () => balls.some((b) => !b.potted && (b.vx || b.vy));

  // ---------- Physics ----------
  function physics(dt) {
    const steps = 6;
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      for (const b of balls) {
        if (b.potted) continue;
        b.x += b.vx * h;
        b.y += b.vy * h;
        const damp = Math.exp(-1.15 * h);       // cloth friction
        b.vx *= damp;
        b.vy *= damp;
        if (Math.hypot(b.vx, b.vy) < 5) { b.vx = 0; b.vy = 0; }
        if (POCKETS.some(([px, py]) => Math.hypot(b.x - px, b.y - py) < POCKET)) { pot(b); continue; }
        // Cushions
        if (b.x < T.left + R) { b.x = T.left + R; b.vx = Math.abs(b.vx) * 0.78; clackSound(0.3); }
        if (b.x > T.right - R) { b.x = T.right - R; b.vx = -Math.abs(b.vx) * 0.78; clackSound(0.3); }
        if (b.y < T.top + R) { b.y = T.top + R; b.vy = Math.abs(b.vy) * 0.78; clackSound(0.3); }
        if (b.y > T.bottom - R) { b.y = T.bottom - R; b.vy = -Math.abs(b.vy) * 0.78; clackSound(0.3); }
      }
      // Ball on ball (equal weights)
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i];
          const b = balls[j];
          if (a.potted || b.potted) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d === 0 || d >= R * 2) continue;
          const nx = dx / d;
          const ny = dy / d;
          const push = (R * 2 - d) / 2;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rel <= 0) continue;
          const imp = rel * 0.96;
          a.vx -= imp * nx; a.vy -= imp * ny;
          b.vx += imp * nx; b.vy += imp * ny;
          clackSound(Math.min(1, rel / 250));
        }
      }
    }
  }

  function pot(b) {
    b.potted = true;
    b.vx = 0;
    b.vy = 0;
    if (b.cue) { fouled = true; crashSound(); return; }
    potted++;
    pottedThisShot++;
    pickupSound();
    updateScore();
  }

  function shotFinished() {
    shotTaken = false;
    if (fouled) {
      fouled = false;
      const c = cue();
      c.potted = false;
      c.x = (T.left + T.right) / 2;
      c.y = T.bottom - 46;
      say(pick(HECKLES.foul));
    } else if (pottedThisShot) say(pick(HECKLES.pot));
    else say(pick(HECKLES.miss), 2);
    pottedThisShot = 0;
    if (potted >= target) finish(true);
  }

  function finish(won) {
    over = true;
    aim = null;
    resultEl.classList.remove('hidden');
    if (won) {
      fanfare();
      resultEl.innerHTML = `
        <p class="pool-big win">YOU WON!</p>
        <p>You beat David at pool.<br>"Hey hey!! Fair play, son."</p>
        <button class="pool-continue">Continue</button>`;
      resultEl.querySelector('.pool-continue').addEventListener('click', () => close(true));
    } else {
      crashSound();
      resultEl.innerHTML = `
        <p class="pool-big lose">DAVID WINS.</p>
        <p>David always wins.</p>
        <button class="pool-again">Rematch</button>
        <button class="pool-later secondary">Later</button>`;
      resultEl.querySelector('.pool-again').addEventListener('click', setup);
      resultEl.querySelector('.pool-later').addEventListener('click', () => close(false));
    }
  }

  function close(won) {
    running = false;
    onDone(won);
  }

  // ---------- Input ----------
  const toTable = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (over || shotTaken || moving()) return;
    canvas.setPointerCapture(e.pointerId);
    aim = toTable(e);
  });
  canvas.addEventListener('pointermove', (e) => { if (aim) aim = toTable(e); });
  canvas.addEventListener('pointerup', () => {
    if (!aim) return;
    const c = cue();
    const dx = c.x - aim.x;
    const dy = c.y - aim.y;
    const pull = Math.min(PULL, Math.hypot(dx, dy));
    aim = null;
    if (pull < 6) return;                      // just a tap: no shot
    const power = pull / PULL;
    c.vx = (dx / Math.hypot(dx, dy)) * power * MAX_SPEED;
    c.vy = (dy / Math.hypot(dx, dy)) * power * MAX_SPEED;
    shotTaken = true;
    clackSound(0.8);
  });
  card.querySelector('.pool-leave').addEventListener('click', () => close(false));

  // ---------- Drawing ----------
  function drawPub(t) {
    // Wood panelling and wallpaper
    g.fillStyle = '#3b2416'; g.fillRect(0, 0, W, 76);
    g.fillStyle = '#5a1f22'; g.fillRect(0, 0, W, 46);
    for (let x = 4; x < W; x += 10) { g.fillStyle = '#4c1a1d'; g.fillRect(x, 0, 2, 46); }
    g.fillStyle = '#2a190f'; g.fillRect(0, 46, W, 3);
    for (let x = 0; x < W; x += 20) { g.fillStyle = '#4a2e1c'; g.fillRect(x + 2, 52, 16, 20); }
    // Window with the pub's name in gold
    g.fillStyle = '#1b1b1b'; g.fillRect(6, 6, 52, 34);
    g.fillStyle = '#3d5a73'; g.fillRect(8, 8, 48, 30);
    g.fillStyle = '#4b6c87'; g.fillRect(8, 8, 48, 3);
    g.fillStyle = '#1b1b1b'; g.fillRect(31, 8, 2, 30);                             // window bars
    pixelText(g, 'THE', 32, 14, '#e8c766');
    pixelText(g, 'VICTORY', 32, 22, '#e8c766');
    g.fillStyle = '#d9b54a'; g.fillRect(12, 30, 40, 1);
    // The jukebox, glowing and playing
    const jx = 66;
    g.fillStyle = '#1b1b1b'; g.fillRect(jx - 1, 13, 32, 62);
    g.fillStyle = '#7a3b1f'; g.fillRect(jx, 18, 30, 56);                          // wooden body...
    g.fillRect(jx + 3, 14, 24, 4); g.fillRect(jx + 6, 12, 18, 2);                 // ...with a rounded top
    const glow = ['#ff5a8a', '#ffd23f', '#5cf072', '#3fd0ff', '#b26bff'];
    for (let i = 0; i < 4; i++) {                                                 // light-up bands, cycling
      g.fillStyle = glow[(i + Math.floor(t * 3)) % glow.length];
      g.fillRect(jx + 2 + i, 18 + i * 2, 2, 50 - i * 4);
      g.fillRect(jx + 26 - i, 18 + i * 2, 2, 50 - i * 4);
    }
    g.fillStyle = '#e9dcc0'; g.fillRect(jx + 8, 22, 14, 12);                      // song window...
    g.fillStyle = '#1b1b1b'; for (let y = 24; y < 33; y += 2) g.fillRect(jx + 10, y, 10, 1); // ...with the song list
    g.fillStyle = '#d9b54a'; g.fillRect(jx + 8, 38, 14, 2);                       // coin slot panel
    g.fillStyle = '#3a1d10';                                                      // speaker grille
    for (let y = 44; y < 70; y += 3) g.fillRect(jx + 8, y, 14, 2);
    for (let i = 0; i < 3; i++) {                                                 // music notes floating up
      const k = (t * 0.5 + i / 3) % 1;
      const nx = jx + 30 + Math.round(Math.sin(t * 2 + i * 2) * 3) + i * 3;
      const ny = Math.round(30 - k * 26);
      g.globalAlpha = 1 - k;
      g.fillStyle = glow[i + 1];
      g.fillRect(nx, ny, 2, 2); g.fillRect(nx + 1, ny - 4, 1, 4); g.fillRect(nx + 2, ny - 4, 2, 1);
      g.globalAlpha = 1;
    }
    // David, stooped, leaning on his cue
    const dx = 132;
    const sway = Math.round(Math.sin(t * 1.5));
    g.fillStyle = '#c8a46a'; g.fillRect(dx + 16 + sway, 14, 2, 62);                 // cue
    g.fillStyle = '#d2d2d2'; g.fillRect(dx + 1 + sway, 10, 12, 5);                  // messy hair
    g.fillRect(dx + sway, 8, 3, 3); g.fillRect(dx + 6 + sway, 7, 3, 3); g.fillRect(dx + 11 + sway, 8, 3, 3);
    g.fillStyle = '#e6b99c'; g.fillRect(dx + 2 + sway, 14, 10, 9);                  // face
    g.fillStyle = '#1b1b1b'; g.fillRect(dx + 4 + sway, 17, 2, 2); g.fillRect(dx + 8 + sway, 17, 2, 2);
    g.fillStyle = '#d2d2d2'; g.fillRect(dx + 3 + sway, 16, 3, 1); g.fillRect(dx + 8 + sway, 16, 3, 1); // eyebrows
    g.fillStyle = '#2f5486'; g.fillRect(dx - 1, 24, 16, 26);                        // boiler suit, hunched
    g.fillRect(dx - 3, 26, 4, 18); g.fillRect(dx + 14, 26, 4, 14);
    g.fillStyle = '#e6b99c'; g.fillRect(dx + 5, 24, 4, 3);                          // open collar
    g.fillStyle = '#2f5486'; g.fillRect(dx + 1, 50, 5, 22); g.fillRect(dx + 8, 50, 5, 22);
    g.fillStyle = '#3a2a1d'; g.fillRect(dx, 70, 7, 4); g.fillRect(dx + 7, 70, 7, 4);
    // His pint, on the shelf: the timer
    const px = 112;
    const level = Math.max(0, timeLeft / seconds);
    g.fillStyle = '#4a2e1c'; g.fillRect(104, 58, 24, 3);                           // shelf
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(px, 34, 10, 24);           // glass
    const full = 22;
    const h = Math.round(full * level);
    g.fillStyle = '#1a120d'; g.fillRect(px + 1, 57 - h, 8, h);
    if (h > 0) { g.fillStyle = '#f3e6c8'; g.fillRect(px + 1, 57 - h, 8, Math.min(3, h)); }
  }

  function drawTable() {
    g.fillStyle = '#5a3420'; g.fillRect(T.left - 9, T.top - 9, T.right - T.left + 18, T.bottom - T.top + 18);
    g.fillStyle = '#7a4a2c'; g.fillRect(T.left - 9, T.top - 9, T.right - T.left + 18, 2);
    g.fillStyle = '#1f7a3a'; g.fillRect(T.left, T.top, T.right - T.left, T.bottom - T.top);
    g.fillStyle = '#1a6a32'; g.fillRect(T.left, T.top, T.right - T.left, 2);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(T.left, T.bottom - 46, T.right - T.left, 1);  // baulk line
    for (const [x, y] of POCKETS) {
      g.fillStyle = '#0d0d0d';
      g.beginPath(); g.arc(x, y, POCKET - 1, 0, Math.PI * 2); g.fill();
    }
  }

  function drawBalls() {
    for (const b of balls) {
      if (b.potted) continue;
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.beginPath(); g.arc(b.x + 1, b.y + 1.2, R, 0, Math.PI * 2); g.fill();
      g.fillStyle = b.color;
      g.beginPath(); g.arc(b.x, b.y, R, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(Math.round(b.x - 2), Math.round(b.y - 2), 1.5, 1.5);
    }
  }

  function drawAim() {
    if (!aim) return;
    const c = cue();
    const dx = c.x - aim.x;
    const dy = c.y - aim.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) return;
    const power = Math.min(PULL, d) / PULL;
    const ux = dx / d;
    const uy = dy / d;
    g.fillStyle = 'rgba(255,255,255,0.75)';                                  // where it's going
    for (let i = 6; i < 26 + power * 60; i += 5) g.fillRect(Math.round(c.x + ux * i), Math.round(c.y + uy * i), 1, 1);
    g.fillStyle = '#c8a46a';                                                 // the cue, pulled back
    for (let i = 0; i < 40; i++) g.fillRect(Math.round(c.x - ux * (6 + power * 14 + i)), Math.round(c.y - uy * (6 + power * 14 + i)), 2, 2);
    g.fillStyle = '#1b1b1b'; g.fillRect(4, T.bottom - 60, 6, 60);           // power bar
    g.fillStyle = power > 0.8 ? '#e0332f' : '#ffd23f';
    g.fillRect(5, T.bottom - 1 - Math.round(58 * power), 4, Math.round(58 * power));
  }

  // ---------- Loop ----------
  let last = performance.now();
  let clock = 0;
  function frame(now) {
    if (!running || !canvas.isConnected) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    clock += dt;
    if (!over) {
      timeLeft -= dt;
      if (timeLeft <= 10 && !lastOrdersSaid) { lastOrdersSaid = true; say(pick(HECKLES.lastOrders)); }
      if (timeLeft <= 0) { timeLeft = 0; finish(false); }
      physics(dt);
      if (shotTaken && !moving()) shotFinished();
      if (!shotTaken && now > nextIdle) { nextIdle = now + 9000; if (now > sayUntil) say(pick(HECKLES.idle)); }
    }
    if (now > sayUntil) sayEl.classList.remove('show');
    g.clearRect(0, 0, W, H);
    drawPub(clock);
    drawTable();
    drawBalls();
    drawAim();
    requestAnimationFrame(frame);
  }
  setup();
  requestAnimationFrame(frame);
  // Testing helper (?debug only): pot the balls you need
  return {
    potAll() {
      balls.filter((b) => !b.cue && !b.potted).slice(0, target - potted).forEach(pot);
      shotFinished();
    },
  };
}
