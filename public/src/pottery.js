// Mini-game: Pilar's Open Studio Show. Make a mug to a (very local) brief and Pilar judges it.
// 1. THROW: hold to pull the clay up to the line, let go to steady it, let go before bubbles pop.
// 2. SHAPE: drag left/right as the pot spins to push the walls in or out (bulgy, straight, wonky).
// 3. FINISH: pick a handle and a glaze, then fire it.
// Pilar scores SHAPE, WONK (just the right amount: perfect is bad), GLAZE and VIBE out of 10 each.
// 28/40 or more and you're in the show.

import { crashSound, fanfare, clackSound } from './sound.js';
import { FONT } from './ads.js';

const W = 180;
const H = 320;
const WHEEL_Y = 262;     // top of the wheel head, where the pot sits
const CX = 82;           // centre of the wheel
const BASE_HALF = 17;    // the mug's half-width before you shape it

// The briefs. shape: -1 straight .. 1 bulgy. wonk: the right amount of wonky (0 machine-made .. 1 chaos).
const BRIEFS = [
  {
    text: 'A mug for a natural wine bar in Clapton. Earthy. Slightly wonky.',
    height: 62, shape: 0.4, wonk: 0.4, glaze: ['terracotta', 'speckled'], glazeOk: ['sage'], handle: ['chunky'], handleOk: ['classic', 'loop'],
  },
  {
    text: 'A mug for a Scandi coffee shop on Broadway Market. Calm. Beige. Minimal.',
    height: 56, shape: -0.7, wonk: 0.1, glaze: ['speckled'], glazeOk: ['sage'], handle: ['classic', 'none'], handleOk: [],
  },
  {
    text: 'A mug for a Hackney Wick warehouse party. Loud. Weird. Very wonky.',
    height: 70, shape: 0.9, wonk: 0.75, glaze: ['drippy'], glazeOk: ['blue'], handle: ['loop'], handleOk: ['chunky'],
  },
  {
    text: 'A mug for a sourdough café on Chatsworth Road. Rustic. Honest. Brownish.',
    height: 60, shape: 0, wonk: 0.3, glaze: ['terracotta'], glazeOk: ['speckled'], handle: ['chunky', 'classic'], handleOk: [],
  },
  {
    text: 'A mug for a Columbia Road flower stall. Green. Fresh. A bit bulgy.',
    height: 58, shape: 0.6, wonk: 0.35, glaze: ['sage'], glazeOk: ['speckled', 'blue'], handle: ['classic', 'chunky'], handleOk: ['loop'],
  },
];

const GLAZES = {
  speckled: { name: 'SPECKLED OAT', colour: '#e9dcc0', dark: '#cdbd9c', fleck: '#8a7a5a' },
  sage: { name: 'SAGE', colour: '#9cb59a', dark: '#7d977b', fleck: '#5f7a5d' },
  terracotta: { name: 'TERRACOTTA', colour: '#c0663f', dark: '#9a4f30', fleck: '#7a3a22' },
  blue: { name: 'CLAPTON BLUE', colour: '#3d6fb0', dark: '#2e5689', fleck: '#e8eef8' },
  drippy: { name: 'DRIPPY', colour: '#e9dcc0', dark: '#cdbd9c', fleck: '#ff5a8a', drip: true },
};
const HANDLES = { classic: 'CLASSIC', chunky: 'CHUNKY', loop: 'WEIRD LOOP', none: 'NONE' };

const PILAR = {
  start: ['Feel the clay.', 'Read the brief. Then ignore it. Then read it again.'],
  pulling: ['Less pressure. Like your rent.', 'Gentle...', 'Let the clay lead.'],
  wobbly: ['Steady!', 'That\'s very... intentional.'],
  bubble: ['Air bubble! Stop pulling!', 'Bubble! Let go!', 'Did you wedge this?'],
  popped: ['You pulled through a bubble.', 'Told you.', 'That\'s going to show.'],
  shape: ['Now shape it. Push it in, let it out.', 'Give it a silhouette.'],
  finish: ['Handle. Glaze. Choose wisely.', 'This is the important bit.'],
};
const COMMENTS = {
  shape: [
    ['That\'s not what the brief said.', 'Interesting silhouette. Wrong one.'],
    ['It\'s... a mug.', 'Fine. Very fine. Just fine.'],
    ['Strong silhouette. Very 1970s Danish.', 'That\'s exactly the shape I saw in my head.'],
  ],
  wonk: [
    ['Too symmetrical. Did a machine make this?', 'Way too wonky. Even for Hackney.'],
    ['Wonky, but not the good kind.', 'Nearly the right amount of wonk.'],
    ['The perfect amount of wonk.', 'Handmade. You can tell. Beautiful.'],
  ],
  glaze: [
    ['That glaze? For THIS brief?', 'Bold. Wrong, but bold.'],
    ['Sure. It\'s a glaze.', 'Safe choice.'],
    ['That glaze is giving everything.', 'Exactly the colour I had in mind.'],
  ],
  vibe: [
    ['Nobody would pay for this.', 'It\'s very... brave.'],
    ['Would sell at a car boot.', 'Maybe at the Sunday market. Maybe.'],
    ['This would sell for £68 on Broadway Market.', 'I\'d put this in my window.'],
  ],
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const band = (score) => (score >= 8 ? 2 : score >= 5 ? 1 : 0);

function text(g, str, cx, y, colour, k = 1) {
  const x0 = Math.round(cx - (str.length * 4 - 1) * k / 2);
  [...str].forEach((ch, i) => {
    const p = FONT[ch] || FONT[' '];
    for (let j = 0; j < 15; j++) if (p[j] === '1') { g.fillStyle = colour; g.fillRect(x0 + (i * 4 + (j % 3)) * k, y + Math.floor(j / 3) * k, k, k); }
  });
}

export function playPottery(card, {
  seconds = 22, tolerance = 6, pullSpeed = 26, wobbleRate = 0.36, calmRate = 0.5, steadyFor = 0.8, bubbleEvery = 3, passMark = 28,
}, onDone) {
  card.classList.add('pottery-card');
  card.innerHTML = `
    <div class="pool-head">
      <span class="pool-title">🏺 PILAR'S OPEN STUDIO SHOW</span>
      <button class="pool-leave" aria-label="Leave">✕</button>
    </div>
    <div class="pool-stage">
      <canvas width="${W}" height="${H}"></canvas>
      <div class="pool-say"></div>
      <div class="pool-score"></div>
      <div class="pool-result hidden"></div>
    </div>
    <div class="pottery-controls"></div>
  `;
  const canvas = card.querySelector('canvas');
  const g = canvas.getContext('2d');
  const sayEl = card.querySelector('.pool-say');
  const scoreEl = card.querySelector('.pool-score');
  const resultEl = card.querySelector('.pool-result');
  const controls = card.querySelector('.pottery-controls');
  scoreEl.style.cssText = 'top: 6px; bottom: auto;';

  let brief;
  let phase;        // brief | throw | collapse | lamp | shape | finish | judge | over
  let phaseT;
  let height;
  let wobble;
  let maxWobble;
  let holding;
  let timeLeft;
  let steadyInBand;
  let bubble;
  let bubbleT;
  let popFlash;
  let pulledThroughBubble;
  let collapseAs;
  let shake;
  let widths;       // half-width at each height, set while shaping
  let shapeY;       // the shaping hands climbing the pot
  let shapeInput;   // -1 .. 1 from your drag
  let shapeTarget;
  let handle;
  let glaze;
  let swapsLeft;   // you can ask for another brief once
  let sayUntil = 0;
  let nextComment = 0;
  let running = true;

  function say(str, secs = 2.4) {
    sayEl.textContent = `"${str}"`;
    sayEl.classList.add('show');
    sayUntil = performance.now() + secs * 1000;
  }

  // ---------- Controls under the picture, per step ----------
  function showControls() {
    const ticket = `<p class="pottery-ticket"><b>📋 THE BRIEF</b> ${brief.text}</p>`;
    if (phase === 'brief') {
      // The commission, big over the studio: accept it (or swap it, once) before you start
      controls.innerHTML = '';
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `
        <div class="commission">
          <p class="commission-title">NEW COMMISSION</p>
          <p class="commission-text">${brief.text}</p>
          <p class="commission-small">Pilar will judge it against this brief.<br>You need ${passMark}/40 to get into the show.</p>
          <button class="commission-accept">✓ Accept the brief</button>
          ${swapsLeft ? '<button class="commission-swap secondary">↻ Ask for another</button>' : ''}
        </div>`;
      resultEl.querySelector('.commission-accept').addEventListener('click', () => { resultEl.classList.add('hidden'); startThrow(); });
      resultEl.querySelector('.commission-swap')?.addEventListener('click', () => {
        swapsLeft--;
        brief = pick(BRIEFS.filter((b) => b !== brief));
        say('Fine. This one, then.', 2);
        showControls();
      });
    } else if (phase === 'throw') {
      controls.innerHTML = `
        ${ticket}
        <button class="pull-button">HOLD TO PULL UP</button>
        <p class="pool-hint">1/3 THROW · Pull to the line, let go to steady it.<br>Bubble? Let go before it pops!</p>`;
      const btn = controls.querySelector('.pull-button');
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch { /* fine */ } setHolding(true); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, () => setHolding(false));
    } else if (phase === 'shape') {
      controls.innerHTML = `
        ${ticket}
        <div class="joystick" aria-label="Drag left to push in, right to let out">
          <span class="joy-arrow">◀ IN</span><span class="joy-arrow">OUT ▶</span>
          <div class="joy-knob"></div>
        </div>
        <p class="pool-hint">2/3 SHAPE · Drag the knob as the hands climb:<br>left pushes the clay in, right lets it bulge out.</p>`;
      bindJoystick();
    } else if (phase === 'finish') {
      controls.innerHTML = `
        ${ticket}
        <p class="pottery-label">HANDLE</p>
        <div class="pottery-options">${Object.entries(HANDLES).map(([id, name]) => `<button data-handle="${id}" class="${id === handle ? 'chosen' : ''}">${name}</button>`).join('')}</div>
        <p class="pottery-label">GLAZE</p>
        <div class="pottery-options glazes">${Object.entries(GLAZES).map(([id, gz]) => `<button data-glaze="${id}" class="${id === glaze ? 'chosen' : ''}" style="background:${gz.colour}">${gz.name}</button>`).join('')}</div>
        <button class="pottery-go">🔥 Fire it and show Pilar</button>`;
      controls.querySelectorAll('[data-handle]').forEach((b) => b.addEventListener('click', () => { handle = b.dataset.handle; showControls(); }));
      controls.querySelectorAll('[data-glaze]').forEach((b) => b.addEventListener('click', () => { glaze = b.dataset.glaze; showControls(); }));
      controls.querySelector('.pottery-go').addEventListener('click', startJudging);
    } else controls.innerHTML = '';
  }

  function bindJoystick() {
    const joy = controls.querySelector('.joystick');
    const knob = controls.querySelector('.joy-knob');
    let dragging = false;
    const set = (clientX) => {
      const r = joy.getBoundingClientRect();
      const reach = r.width / 2 - knob.offsetWidth / 2;
      shapeTarget = clamp((clientX - (r.left + r.width / 2)) / reach, -1, 1);
      knob.style.transform = `translateX(${shapeTarget * reach}px)`;
    };
    joy.addEventListener('pointerdown', (e) => { e.preventDefault(); try { joy.setPointerCapture(e.pointerId); } catch { /* fine */ } dragging = true; joy.classList.add('active'); set(e.clientX); });
    joy.addEventListener('pointermove', (e) => { if (dragging) set(e.clientX); });
    for (const ev of ['pointerup', 'pointercancel']) joy.addEventListener(ev, () => { dragging = false; joy.classList.remove('active'); });
  }

  // ---------- Steps ----------
  function setup() {
    brief = pick(BRIEFS);
    phase = 'brief';
    phaseT = 0;
    height = 6;
    wobble = 0;
    maxWobble = 0;
    holding = false;
    timeLeft = seconds;
    steadyInBand = 0;
    bubble = null;
    bubbleT = 1.3 + Math.random() * 0.8;
    popFlash = 0;
    pulledThroughBubble = 0;
    collapseAs = null;
    shake = 0;
    widths = null;
    handle = 'classic';
    glaze = 'speckled';
    swapsLeft = 1;
    resultEl.classList.add('hidden');
    showControls();
    say('Read the brief. Then make me something beautiful.', 3);
  }

  function startThrow() {
    phase = 'throw';
    phaseT = 0;
    nextComment = performance.now() + 5000;
    showControls();
    say(pick(PILAR.start));
  }

  function startShape() {
    phase = 'shape';
    phaseT = 0;
    widths = [];
    shapeY = 0;
    shapeInput = 0;
    shapeTarget = 0;
    holding = false;
    showControls();
    say(pick(PILAR.shape));
  }

  function startFinish() {
    phase = 'finish';
    showControls();
    say(pick(PILAR.finish));
  }

  function setHolding(on) {
    if (phase !== 'throw') { holding = false; return; }
    if (on && !holding && Math.random() < 0.3) say(pick(PILAR.pulling), 1.6);
    holding = on;
    controls.querySelector('.pull-button')?.classList.toggle('active', on);
  }

  // ---------- Judging ----------
  function measure() {
    const n = widths.length;
    const offsets = widths.map((w) => w - BASE_HALF);
    const bulge = offsets.reduce((a, b) => a + b, 0) / n / 6;                    // -1 straight/narrow .. 1 bulgy
    let jag = 0;
    for (let i = 1; i < n; i++) jag += Math.abs(offsets[i] - offsets[i - 1]);
    const wonk = clamp(jag / n / 0.9 + maxWobble * 0.25 + pulledThroughBubble * 0.12, 0, 1);
    return { bulge: clamp(bulge, -1, 1), wonk };
  }

  function scores() {
    const { bulge, wonk } = measure();
    const jitter = () => Math.round((Math.random() - 0.5) * 2);
    const heightOff = Math.abs(height - brief.height) > tolerance ? 2 : 0;
    const shape = clamp(Math.round(10 - Math.abs(bulge - brief.shape) * 6 - heightOff), 1, 10);
    const wonkScore = clamp(Math.round(10 - Math.abs(wonk - brief.wonk) * 14), 1, 10);
    const glazeScore = clamp((brief.glaze.includes(glaze) ? 9 : brief.glazeOk.includes(glaze) ? 6 : 3) + jitter(), 1, 10);
    const handleScore = brief.handle.includes(handle) ? 9 : brief.handleOk.includes(handle) ? 6 : 3;
    const vibe = clamp(Math.round(handleScore * 0.7 + (glazeScore + shape) * 0.15) + jitter(), 1, 10);
    return [['SHAPE', shape, 'shape'], ['WONK', wonkScore, 'wonk'], ['GLAZE', glazeScore, 'glaze'], ['VIBE', vibe, 'vibe']];
  }

  function startJudging() {
    phase = 'judge';
    showControls();
    const rows = scores();
    const total = rows.reduce((a, r) => a + r[1], 0);
    resultEl.classList.remove('hidden');
    resultEl.innerHTML = `
      <p class="pool-big judge-title">PILAR JUDGES</p>
      <div class="judge-rows">${rows.map(([name, score, key]) => `
        <div class="judge-row"><span class="judge-cat">${name}</span><span class="judge-score">${score}/10</span>
        <span class="judge-comment">"${pick(COMMENTS[key][band(score)])}"</span></div>`).join('')}</div>
      <p class="judge-total">TOTAL ${total}/40</p>
      <div class="judge-verdict"></div>`;
    const rowEls = [...resultEl.querySelectorAll('.judge-row')];
    rowEls.forEach((el, i) => setTimeout(() => { el.classList.add('show'); clackSound(0.7); }, 600 + i * 900));
    setTimeout(() => {
      resultEl.querySelector('.judge-total').classList.add('show');
      const won = total >= passMark;
      const verdict = resultEl.querySelector('.judge-verdict');
      if (won) {
        fanfare();
        verdict.innerHTML = `<p class="pool-big win">YOU WON!</p><p>You're in the show.</p><button class="pool-continue">Continue</button>`;
        verdict.querySelector('.pool-continue').addEventListener('click', () => close(true));
      } else {
        crashSound();
        verdict.innerHTML = `<p class="pool-big lose">NOT FOR THE SHOP.</p><p>You need ${passMark}/40.</p>
          <button class="pool-again">Try again</button> <button class="pool-later secondary">Later</button>`;
        verdict.querySelector('.pool-again').addEventListener('click', setup);
        verdict.querySelector('.pool-later').addEventListener('click', () => close(false));
      }
      phase = 'over';
    }, 600 + rows.length * 900 + 500);
  }

  // Failing at the wheel ends the attempt early
  function failThrow(how) {
    phase = 'over';
    holding = false;
    showControls();
    resultEl.classList.remove('hidden');
    const [title, line] = {
      lamp: ['IT\'S A LAMP NOW.', 'Too tall. Pilar is putting a bulb in it.'],
      time: ['CLASS IS OVER.', 'That\'ll be £65.'],
      coaster: ['IT\'S A COASTER NOW.', 'Pilar will sell it as a set of six.'],
      bowl: ['IT\'S A BOWL NOW.', 'Wonky is a feature. That isn\'t.'],
      art: ['IT\'S ART NOW.', 'Pilar is selling it for £900. You get nothing.'],
    }[how];
    resultEl.innerHTML = `
      <p class="pool-big lose">${title}</p>
      <p>${line}</p>
      <button class="pool-again">Try again</button>
      <button class="pool-later secondary">Later</button>`;
    resultEl.querySelector('.pool-again').addEventListener('click', setup);
    resultEl.querySelector('.pool-later').addEventListener('click', () => close(false));
  }

  function close(won) {
    running = false;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    onDone(won);
  }

  // ---------- Keys: Space/↑ pulls, ← → shape ----------
  const keyDir = { ArrowLeft: -1, ArrowRight: 1 };
  function onKeyDown(e) {
    if (phase === 'throw' && (e.key === ' ' || e.key === 'ArrowUp')) { e.preventDefault(); if (!e.repeat) setHolding(true); }
    if (phase === 'shape' && keyDir[e.key]) { e.preventDefault(); shapeTarget = keyDir[e.key]; }
  }
  function onKeyUp(e) {
    if (e.key === ' ' || e.key === 'ArrowUp') setHolding(false);
    if (phase === 'shape' && keyDir[e.key] && shapeTarget === keyDir[e.key]) shapeTarget = 0;
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  card.querySelector('.pool-leave').addEventListener('click', () => close(false));

  // ---------- Drawing ----------
  function drawStudio() {
    g.fillStyle = '#6e2f22'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < 200; y += 4) for (let x = ((y / 4) % 2) * 4 - 4; x < W; x += 8) { g.fillStyle = (x * 3 + y) % 5 ? '#9a4733' : '#8f3f2d'; g.fillRect(x, y, 7, 3); }
    g.fillStyle = '#e9dcc0';
    g.beginPath(); g.ellipse(W / 2, 200, 92, 190, 0, Math.PI, 0); g.lineTo(W / 2 + 92, 200); g.fill();
    g.fillStyle = '#f3ead6'; g.fillRect(6, 196, W - 12, 4);
    g.fillStyle = '#a39d92'; g.fillRect(0, 200, W, H - 200);
    for (let y = 214; y < H; y += 18) { g.fillStyle = '#958f84'; g.fillRect(0, y, W, 1); }
    g.fillStyle = '#b9805e'; g.fillRect(24, 300, 5, 2); g.fillRect(140, 292, 3, 2);
    g.fillStyle = '#1b1b1b'; g.fillRect(12, 34, 70, 30);                               // the show poster
    text(g, 'OPEN STUDIO', 47, 38, '#fffaf0');
    text(g, 'SHOW SAT', 47, 46, '#ffd23f');
    text(g, 'FREE WINE', 47, 54, '#9fd3a0');
    g.fillStyle = '#8a5a35'; g.fillRect(96, 64, 72, 3);
    const pots = [[104, '#8fb3a6', 10, 12], [120, '#d98a5a', 8, 16], [136, '#e9dcc0', 12, 9], [154, '#b8584a', 9, 14]];
    for (const [x, c, w, h] of pots) { g.fillStyle = c; g.fillRect(x - w / 2, 64 - h, w, h); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x - w / 2, 64 - h, 2, h); }
    text(g, '£340', 136, 70, '#1b1b1b');
    g.fillStyle = '#c0663f'; g.fillRect(150, 172, 16, 14);
    for (const [dx, dy, c] of [[-6, -10, '#3f9a44'], [2, -16, '#2e7d32'], [8, -9, '#5cb85c'], [-2, -6, '#2e7d32'], [6, -20, '#3f9a44']]) { g.fillStyle = c; g.fillRect(158 + dx, 172 + dy, 6, 6); }
    const px = 132;
    const py = 120;
    g.fillStyle = '#3b2618'; g.fillRect(px - 2, py - 2, 18, 22);
    g.fillStyle = '#ebc3a6'; g.fillRect(px + 2, py + 2, 10, 11);
    g.fillStyle = '#111'; g.fillRect(px + 2, py + 5, 4, 3); g.fillRect(px + 8, py + 5, 4, 3);
    g.fillStyle = '#dfe9ef'; g.fillRect(px + 3, py + 6, 2, 1); g.fillRect(px + 9, py + 6, 2, 1);
    g.fillStyle = '#f4f4f2'; g.fillRect(px - 1, py + 18, 16, 24);
    g.fillStyle = '#fbfaf6'; g.fillRect(px + 1, py + 22, 12, 30);
    g.fillStyle = '#b9805e'; g.fillRect(px + 3, py + 30, 4, 3); g.fillRect(px + 8, py + 40, 3, 4);
    g.fillStyle = '#cdb8a6'; g.fillRect(px + 1, py - 1, 3, 2);
    g.fillStyle = '#3b3b40'; g.fillRect(px + 2, py + 52, 4, 18); g.fillRect(px + 8, py + 52, 4, 18);
  }

  function drawWheel(t) {
    g.fillStyle = '#5a3a22'; g.fillRect(CX - 44, WHEEL_Y + 6, 88, 46);
    g.fillStyle = '#4a2e1c'; g.fillRect(CX - 44, WHEEL_Y + 6, 88, 3);
    g.fillStyle = '#7a8088';
    g.beginPath(); g.ellipse(CX, WHEEL_Y + 3, 34, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9aa0a8';
    const spin = phase === 'finish' || phase === 'judge' || phase === 'over' ? 0 : (t * 10) % (Math.PI * 2);
    for (let i = 0; i < 3; i++) { const a = spin + (i * Math.PI * 2) / 3; g.fillRect(Math.round(CX + Math.cos(a) * 26), Math.round(WHEEL_Y + 3 + Math.sin(a) * 4), 3, 1); }
  }

  // Half-width of the pot at height y
  function halfAt(y) {
    if (widths && widths.length) return widths[Math.min(widths.length - 1, Math.max(0, Math.round(y)))] ?? BASE_HALF;
    return BASE_HALF * (0.92 + 0.08 * Math.sin((height ? y / height : 0) * Math.PI));
  }

  function drawPot(t) {
    const h = Math.round(height);
    const sway = Math.sin(t * 14) * wobble * 6;
    const gz = (phase === 'finish' || phase === 'judge' || (phase === 'over' && widths)) ? GLAZES[glaze] : null;
    for (let y = 0; y < h; y++) {
      const half = halfAt(y) + Math.sin(t * 9 + y * 0.3) * wobble * 1.5;
      const x0 = Math.round(CX - half + sway * (y / Math.max(1, h)));
      const w = Math.round(half * 2);
      g.fillStyle = gz ? gz.colour : (y % 7 === 0 ? '#a46a4a' : '#b9805e');
      g.fillRect(x0, WHEEL_Y - y, w, 1);
      g.fillStyle = gz ? gz.dark : '#8a5236'; g.fillRect(x0 + w - 3, WHEEL_Y - y, 3, 1);
      g.fillStyle = gz ? 'rgba(255,255,255,0.35)' : '#d29a78'; g.fillRect(x0 + 2, WHEEL_Y - y, 2, 1);
      if (gz && (y * 7 + x0) % 5 === 0) { g.fillStyle = gz.fleck; g.fillRect(x0 + 4 + ((y * 13) % Math.max(1, w - 8)), WHEEL_Y - y, 1, 1); }
      if (gz?.drip && y > h - 14 && y % 3 === 0) { g.fillStyle = ['#ff5a8a', '#3fd0ff', '#ffd23f'][(y / 3) % 3]; g.fillRect(x0 + 3 + ((y * 5) % Math.max(1, w - 6)), WHEEL_Y - y, 2, 3); }
    }
    if (h > 3) {
      const half = halfAt(h - 1);
      g.fillStyle = gz ? gz.dark : '#6e3a24'; g.fillRect(Math.round(CX - half + 3 + sway), WHEEL_Y - h, Math.round(half * 2 - 6), 2);
    }
    if (gz && handle !== 'none') {                                                // the handle, on the right
      const mid = Math.round(h * 0.55);
      const edge = Math.round(CX + halfAt(mid));
      g.fillStyle = gz.colour;
      if (handle === 'classic') { g.fillRect(edge, WHEEL_Y - mid - 10, 7, 3); g.fillRect(edge + 5, WHEEL_Y - mid - 10, 3, 18); g.fillRect(edge, WHEEL_Y - mid + 6, 7, 3); }
      if (handle === 'chunky') { g.fillRect(edge, WHEEL_Y - mid - 11, 10, 6); g.fillRect(edge + 6, WHEEL_Y - mid - 11, 6, 22); g.fillRect(edge, WHEEL_Y - mid + 5, 10, 6); }
      if (handle === 'loop') { g.strokeStyle = gz.colour; g.lineWidth = 3; g.beginPath(); g.ellipse(edge + 10, WHEEL_Y - mid - 6, 10, 14, 0.6, 0, Math.PI * 2); g.stroke(); }
    }
    if ((phase === 'throw' && holding) || phase === 'shape') {                    // your hands on the clay
      const y = phase === 'shape' ? Math.min(h - 2, shapeY) : h - 2;
      const half = halfAt(y);
      g.fillStyle = '#ebc3a6';
      g.fillRect(Math.round(CX - half - 6 + sway), WHEEL_Y - y - 2, 6, 5);
      g.fillRect(Math.round(CX + half + sway), WHEEL_Y - y - 2, 6, 5);
    }
  }

  function drawTarget() {
    if (phase !== 'throw' && phase !== 'brief') return;
    const y = WHEEL_Y - brief.height;
    for (let x = CX - 40; x < CX + 40; x += 4) { g.fillStyle = '#1f7a3a'; g.fillRect(x, y, 2, 1); }
    g.fillStyle = 'rgba(31,122,58,0.12)'; g.fillRect(CX - 40, y - tolerance, 80, tolerance * 2);
  }

  function drawWobbleMeter() {
    if (phase !== 'throw') return;
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
    phaseT += dt;
    if (phase === 'throw') {
      timeLeft -= dt;
      if (holding) { height += pullSpeed * dt; wobble += (wobbleRate + height / 220) * dt; } else wobble = Math.max(0, wobble - calmRate * dt);
      // Bubbles swell for a second, then pop: still pulling when it pops = a big jolt
      if (!bubble) {
        bubbleT -= dt;
        if (bubbleT <= 0 && height > 10) { bubble = { t: 1.05, y: 4 + Math.random() * Math.max(4, height - 10) }; if (now > sayUntil) say(pick(PILAR.bubble), 1.1); }
      } else {
        bubble.t -= dt;
        if (bubble.t <= 0) {
          if (holding) { wobble += 0.5; shake = 0.35; pulledThroughBubble++; crashSound(); say(pick(PILAR.popped), 1.4); } else wobble += 0.06;
          popFlash = 0.6;
          clackSound(1);
          bubble = null;
          bubbleT = bubbleEvery * (0.7 + Math.random() * 0.6);
        }
      }
      popFlash = Math.max(0, popFlash - dt);
      maxWobble = Math.max(maxWobble, wobble);
      if (wobble > 0.75) shake = Math.max(shake, 0.05);
      if (wobble >= 1) {
        const f = height / brief.height;
        collapseAs = f < 0.35 ? 'coaster' : f < 0.85 ? 'bowl' : 'art';
        phase = 'collapse';
        phaseT = 0;
        crashSound();
      } else if (height > brief.height + tolerance) { phase = 'lamp'; phaseT = 0; crashSound(); }
      else if (timeLeft <= 0) failThrow('time');
      else {
        const inBand = Math.abs(height - brief.height) <= tolerance;
        steadyInBand = inBand && !holding && wobble < 0.4 ? steadyInBand + dt : 0;
        if (steadyInBand > steadyFor) { clackSound(1); startShape(); }
      }
      if (phase === 'throw' && now > nextComment) { nextComment = now + 6000; if (now > sayUntil) say(pick(wobble > 0.6 ? PILAR.wobbly : PILAR.pulling)); }
    } else if (phase === 'collapse') {
      if (collapseAs === 'coaster') height = Math.max(4, height - 80 * dt);
      else if (collapseAs === 'bowl') height = Math.max(22, height - 120 * dt);
      wobble = collapseAs === 'art' ? 0.8 : Math.max(0, wobble - 2 * dt);
      if (phaseT > 1) failThrow(collapseAs);
    } else if (phase === 'lamp') {
      if (phaseT > 0.8) failThrow('lamp');
    } else if (phase === 'shape') {
      // The hands climb the pot over ~4 seconds; your drag sets how wide it is at each height
      wobble = Math.max(0, wobble - dt);
      shapeInput += (shapeTarget - shapeInput) * Math.min(1, dt * 8);
      const top = Math.round(height);
      const from = Math.floor(shapeY);
      shapeY = Math.min(top, shapeY + (top / 4.2) * dt);
      for (let y = from; y <= Math.floor(shapeY); y++) widths[y] = BASE_HALF * (0.92 + 0.08 * Math.sin((y / top) * Math.PI)) + shapeInput * 7;
      if (shapeY >= top) { while (widths.length < top) widths.push(widths[widths.length - 1]); startFinish(); }
    }
    shake = Math.max(0, shake - dt);
    if (now > sayUntil) sayEl.classList.remove('show');
    scoreEl.textContent = phase === 'throw' ? `1/3 · ${Math.max(0, Math.ceil(timeLeft))}S` : phase === 'shape' ? '2/3 SHAPE' : phase === 'finish' ? '3/3 FINISH' : '';
    scoreEl.style.display = scoreEl.textContent ? '' : 'none';

    g.save();
    if (shake > 0) g.translate(Math.round((Math.random() - 0.5) * 3), Math.round((Math.random() - 0.5) * 2));
    drawStudio();
    drawTarget();
    drawWheel(t);
    drawPot(t);
    if (bubble && phase === 'throw') {
      const r = 2 + (1 - bubble.t) * 3 + Math.sin(t * 30) * 0.6;
      const by = WHEEL_Y - Math.min(bubble.y, height - 3);
      const bx = CX + halfAt(bubble.y) - 2;
      g.fillStyle = '#e8c2a6'; g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#8a5236'; g.lineWidth = 1; g.stroke();
      text(g, '!', bx + 7, by - 8, '#e0332f', 2);
    }
    g.restore();
    drawWobbleMeter();
    if (phase === 'lamp' || (phase === 'over' && !widths && height > brief.height + tolerance)) {
      g.fillStyle = 'rgba(255,210,63,0.25)'; g.beginPath(); g.arc(CX, WHEEL_Y - height - 6, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(CX, WHEEL_Y - height - 6, 6, 0, Math.PI * 2); g.fill();
    }
    if (collapseAs === 'art' && phase !== 'throw') text(g, '£900', CX + 40, WHEEL_Y - height - 4, '#1f7a3a', 2);
    if (popFlash > 0) text(g, 'POP!', CX, WHEEL_Y - height - 18, '#e0332f', 2);
    requestAnimationFrame(frame);
  }
  setup();
  requestAnimationFrame(frame);
  // Testing helper (?debug only): a perfect mug for the brief, straight to judging
  return {
    skip() { if (phase === 'brief' || phase === 'throw') { height = brief.height; startShape(); } else if (phase === 'shape') shapeY = height; },
    cheat() {
      height = brief.height;
      widths = Array.from({ length: Math.round(height) }, (_, y) => BASE_HALF * (0.92 + 0.08 * Math.sin((y / height) * Math.PI)) + brief.shape * 6 + (y % 6 < 3 ? brief.wonk * 1.2 : 0));
      maxWobble = 0;
      glaze = brief.glaze[0];
      handle = brief.handle[0];
      startJudging();
    },
  };
}
