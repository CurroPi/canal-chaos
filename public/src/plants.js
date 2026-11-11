// Mini-game: a week in Fern's flat. She's back from Columbia Road with three plants;
// keep them alive (and growing a new leaf each) until Sunday.
// Tap a plant to water it, drag it to move it. The care needs are the real ones:
// monstera and fiddle-leaf fig like bright indirect light, the snake plant likes being ignored.

import { pickupSound, spillSound, fanfare, crashSound } from './sound.js';
import { FONT } from './ads.js';

const W = 200;
const H = 150;
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const S = 1.3; // plants are drawn this much bigger than the room
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// The three spots in the flat (left to right) and where a pot stands in each
const SPOTS = [
  { id: 'hall', name: 'HALLWAY', x: 36, y: 134, dry: 0.7 },
  { id: 'window', name: 'WINDOW', x: 100, y: 134, dry: 1 },
  { id: 'sill', name: 'SUNNY SILL', x: 166, y: 98, dry: 1.5 },
];

// Real care needs. light: how each spot suits it (good | ok | dark | burn).
// water: the happy range (0 = bone dry, 1 = soaked); drink: how much it uses per day.
const PLANTS = {
  monstera: {
    name: 'monstera', price: '£45', drink: 0.22, water: [0.3, 0.8], growDays: 3,
    light: { hall: 'dark', window: 'good', sill: 'burn' },
  },
  fig: {
    name: 'fiddle-leaf fig', price: '£60', drink: 0.2, water: [0.3, 0.75], growDays: 3.5,
    light: { hall: 'dark', window: 'good', sill: 'ok' },
  },
  snake: {
    name: 'snake plant', price: '£25', drink: 0.06, water: [0, 0.4], growDays: 4, rots: true,
    light: { hall: 'good', window: 'good', sill: 'good' },
  },
};

const LINES = {
  start: ['Columbia Road haul! £130 of plants. Keep them alive till Sunday.'],
  thirsty: ['The {name} looks thirsty.', 'Droopy {name}. Water, please?'],
  soggy: ['Yellow leaves. You\'re drowning the {name}.', 'The {name} is soggy. Ease off.'],
  rot: ['Stop watering the snake plant. It likes being ignored.', 'Unkillable. Unless you love it too much.'],
  dark: ['The {name} is leaning towards the window. Hint, hint.', 'It\'s dark in the hallway. The {name} wants light.'],
  burn: ['The {name} is getting sunburnt. Crispy edges!', 'Too much sun. Even plants need SPF.'],
  figSettle: ['Careful with the fig. It\'s sensitive.'],
  figMoved: ['Don\'t move it. It knows.', 'The fig dropped a leaf. In protest.'],
  grew: {
    monstera: 'FENESTRATION!! A new leaf with holes!',
    fig: 'A new fig leaf! Don\'t. Touch. It.',
    snake: 'The snake plant grew. With zero help. Respect.',
  },
  heatwave: ['HEATWAVE! The sunny sill is basically a grill.'],
  festivalSoon: ['Off to a festival Friday night! Water everything before I go.'],
  festival: ['Bye! Back Sunday. Phone off. Good luck.'],
  back: ['I\'m back! Did they survive?'],
};

function text(g, str, cx, y, colour, k = 1, shadow = '#1b1b1b') {
  const x0 = Math.round(cx - (str.length * 4 - 1) * k / 2);
  [...str].forEach((ch, i) => {
    const p = FONT[ch] || FONT[' '];
    for (let j = 0; j < 15; j++) {
      if (p[j] !== '1') continue;
      const x = x0 + (i * 4 + (j % 3)) * k;
      const y2 = y + Math.floor(j / 3) * k;
      if (shadow) { g.fillStyle = shadow; g.fillRect(x + 1, y2 + 1, k, k); }
      g.fillStyle = colour; g.fillRect(x, y2, k, k);
    }
  });
}

// Blend two #rrggbb colours
function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp(t))).join(',')})`;
}

export function playPlants(card, cfg, onDone) {
  const { day = 5, tap = 0.28, awaySpeed = 2, damage = 1, heal = 0.15 } = cfg;
  card.innerHTML = `
    <div class="pool-head">
      <span class="pool-title">🪴 A WEEK WITH FERN</span>
      <button class="pool-leave" aria-label="Leave">✕</button>
    </div>
    <div class="pool-stage fight-stage plants-stage">
      <canvas width="${W}" height="${H}"></canvas>
      <div class="pool-result hidden"></div>
    </div>
    <p class="plant-say"></p>
    <p class="pool-hint">Tap a plant to water it. Drag it to move it.<br>Keep all three alive and growing until Sunday.</p>
  `;
  const canvas = card.querySelector('canvas');
  const g = canvas.getContext('2d');
  const resultEl = card.querySelector('.pool-result');
  const sayEl = card.querySelector('.plant-say');

  let plants;     // { kind, spot, water, health, growth, grown, burnt, moves, leaves, dropped }
  let clock;      // days since Monday morning (0..7)
  let phase;      // 'week' | 'over'
  let drag;       // { plant, x, y, moved }
  let cans;       // watering animations
  let bits;       // falling leaves, sparkles, water drops
  let saidAt;
  let lastSaid;
  let flags;
  let running = true;

  function say(line, name = '') {
    sayEl.innerHTML = `<b>FERN:</b> ${line.replace('{name}', name)}`;
    sayEl.classList.remove('pop');
    void sayEl.offsetWidth;
    sayEl.classList.add('pop');
    saidAt = performance.now();
  }
  // One complaint at a time, and never the same one twice in a row
  function moan(key, p) {
    const id = `${key}-${p.kind}`;
    if (phase !== 'week' || performance.now() - saidAt < 2600 || (lastSaid[id] && performance.now() - lastSaid[id] < 9000)) return;
    lastSaid[id] = performance.now();
    say(pick(LINES[key]), PLANTS[p.kind].name);
  }

  function setup() {
    // Wherever Fern dumped them on her way in (never all in the right place)
    const order = pick([[0, 2, 1], [2, 0, 1], [0, 0, 0], [2, 2, 0], [0, 2, 0]]);
    plants = [
      { kind: 'monstera', spot: order[0] },
      { kind: 'fig', spot: order[1] },
      { kind: 'snake', spot: order[2] },
    ].map((p) => ({
      ...p, water: { monstera: 0.5, fig: 0.45, snake: 0.2 }[p.kind], health: 1, growth: 0, grown: false,
      burnt: 0, moves: 0, dropped: 0, wobble: 0,
    }));
    clock = 0;
    phase = 'week';
    drag = null;
    cans = [];
    bits = [];
    saidAt = 0;
    lastSaid = {};
    flags = {};
    resultEl.classList.add('hidden');
    say(LINES.start[0]);
  }

  const weekday = () => Math.floor(clock);
  const hour = () => (clock % 1) * 24;
  const heatwave = () => weekday() === 2;                       // all day Wednesday
  const away = () => clock > 4.75 && clock < 6.35;               // Friday night to Sunday morning
  const daylight = () => clamp(Math.min((hour() - 4) / 1.5, (23 - hour()) / 1.5));
  const spotOf = (p) => SPOTS[p.spot];
  const plantsAt = (s) => plants.filter((p) => p.spot === s && p !== drag?.plant);

  // Where each plant is drawn (two in the same spot stand side by side)
  function placeOf(p) {
    const here = plants.filter((q) => q.spot === p.spot);
    const i = here.indexOf(p);
    const s = spotOf(p);
    const spread = p.spot === 2 ? 16 : 21;
    return { x: s.x + (i - (here.length - 1) / 2) * spread, y: s.y };
  }

  // ---------- The week ----------
  function simulate(dt) {
    const days = dt / day * (away() ? awaySpeed : 1);
    const before = weekday();
    clock = Math.min(7, clock + days);
    if (weekday() !== before && weekday() === 2) say(LINES.heatwave[0]);
    if (!flags.soon && clock > 3.55) { flags.soon = true; say(LINES.festivalSoon[0]); }
    if (!flags.away && away()) { flags.away = true; drag = null; say(LINES.festival[0]); }
    if (!flags.back && clock >= 6.35) { flags.back = true; say(LINES.back[0]); }

    for (const p of plants) {
      if (p.health <= 0) continue;
      const need = PLANTS[p.kind];
      const s = spotOf(p);
      const light = need.light[s.id];
      const heat = heatwave() ? (s.id === 'sill' ? 2 : 1.3) : 1;
      p.water = clamp(p.water - need.drink * s.dry * heat * days);
      const [lo, hi] = need.water;
      const thirsty = p.water < lo;
      const soggy = p.water > hi;
      let hurt = 0;
      if (thirsty) { hurt += 0.35 + (lo - p.water); moan('thirsty', p); }
      if (soggy) { hurt += need.rots ? 0.6 : 0.3; moan(need.rots ? 'rot' : 'soggy', p); }
      const sunny = daylight() > 0.3;
      const scorching = light === 'burn' || (light === 'ok' && heatwave());
      if (scorching && sunny) { hurt += 0.3; p.burnt = clamp(p.burnt + days * 0.8); moan('burn', p); }
      if (light === 'dark') { hurt += 0.1; moan('dark', p); }
      if (hurt) p.health = clamp(p.health - hurt * damage * days);
      else p.health = clamp(p.health + heal * days);
      // Growing: happy plants make a new leaf
      const growing = !hurt && light !== 'dark' && !p.grown;
      if (growing) {
        p.growth = clamp(p.growth + days / need.growDays * (light === 'ok' ? 0.6 : 1));
        if (p.growth >= 1) {
          p.grown = true;
          const at = placeOf(p);
          for (let i = 0; i < 14; i++) bits.push({ kind: 'spark', x: at.x + (Math.random() - 0.5) * 30, y: at.y - 30 - Math.random() * 30, vx: 0, vy: -10, t: 0 });
          pickupSound();
          say(LINES.grew[p.kind]);
        }
      }
      if (p.health <= 0) { lose(p); return; }
    }
    if (clock >= 7) {
      const slow = plants.filter((p) => !p.grown);
      if (slow.length) loseSlow(slow); else win();
    }
  }

  // ---------- Actions ----------
  function water(p) {
    p.water = clamp(p.water + tap);
    p.wobble = 1;
    pickupSound();
    const at = placeOf(p);
    cans.push({ x: at.x, y: at.y - 72, t: 0 });
  }

  function move(p, to) {
    if (to === p.spot) return;
    const swap = plantsAt(to).length >= 2 ? plantsAt(to)[0] : null;
    if (swap) swap.spot = p.spot;
    p.spot = to;
    for (const q of swap ? [p, swap] : [p]) {
      q.moves++;
      if (q.kind !== 'fig') continue;
      if (q.moves === 1) { if (!lastSaid.figSettle) { lastSaid.figSettle = 1; say(LINES.figSettle[0]); } continue; }
      // Every move after the first, the fig drops a leaf in protest
      q.dropped++;
      q.health = clamp(q.health - 0.22);
      spillSound();
      const at = placeOf(q);
      bits.push({ kind: 'leaf', x: at.x + 6, y: at.y - 52, vx: 8, vy: 0, t: 0 });
      say(pick(LINES.figMoved));
      if (q.health <= 0) lose(q);
    }
  }

  // ---------- Endings ----------
  function finish(html, won) {
    phase = 'over';
    drag = null;
    resultEl.classList.remove('hidden');
    resultEl.innerHTML = html;
    if (won) {
      fanfare();
      resultEl.querySelector('.pool-continue').addEventListener('click', () => close(true));
    } else {
      crashSound();
      resultEl.querySelector('.pool-again').addEventListener('click', setup);
      resultEl.querySelector('.pool-later').addEventListener('click', () => close(false));
    }
  }
  const retry = `<button class="pool-again">Try again</button><button class="pool-later secondary">Later</button>`;
  function win() {
    say('They\'re thriving. I\'m framing this. And posting it.');
    finish(`<p class="pool-big win">THEY ALL MADE IT!</p>
      <p>Three new leaves.<br>Fern is unbearable about it.</p>
      <button class="pool-continue">Continue</button>`, true);
  }
  function lose(p) {
    p.health = 0;
    say('It\'s fine. I\'ll get another one on Sunday. And a bigger one.');
    finish(`<p class="pool-big lose">RIP THE ${PLANTS[p.kind].name.toUpperCase()}</p>
      <p>Fern is writing a eulogy<br>for Instagram.</p>${retry}`, false);
  }
  function loseSlow(slow) {
    say('Alive, sure. But where are the NEW LEAVES?');
    const names = slow.map((p) => `the ${PLANTS[p.kind].name}`).join(' and ');
    finish(`<p class="pool-big lose">ALIVE. BARELY.</p>
      <p>No new leaf on ${names}.<br>Fern is disappointed.</p>${retry}`, false);
  }

  function close(won) {
    running = false;
    onDone(won);
  }

  // ---------- Input: tap = water, drag = move ----------
  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const spotAt = (x) => (x < 66 ? 0 : x < 133 ? 1 : 2);
  canvas.addEventListener('pointerdown', (e) => {
    if (phase !== 'week' || away()) return;
    const at = toCanvas(e);
    const hit = plants.filter((p) => p.health > 0).find((p) => {
      const pl = placeOf(p);
      return Math.abs(at.x - pl.x) < 14 && at.y < pl.y + 6 && at.y > pl.y - 75;
    });
    if (!hit) return;
    canvas.setPointerCapture(e.pointerId);
    drag = { plant: hit, x: at.x, y: at.y, startX: at.x, startY: at.y, moved: false };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const at = toCanvas(e);
    drag.x = at.x;
    drag.y = at.y;
    if (Math.hypot(at.x - drag.startX, at.y - drag.startY) > 6) drag.moved = true;
  });
  canvas.addEventListener('pointerup', () => {
    if (!drag) return;
    const { plant, moved, x } = drag;
    drag = null;
    if (phase !== 'week') return;
    if (moved) move(plant, spotAt(x)); else water(plant);
  });
  card.querySelector('.pool-leave').addEventListener('click', () => close(false));

  // ---------- Drawing ----------
  function drawRoom(t) {
    const light = daylight();
    const sky = heatwave() ? mix('#1b2340', '#ffd27a', light) : mix('#1b2340', '#9fd0f0', light);
    // Walls: the hallway is darker
    g.fillStyle = '#efe4cc'; g.fillRect(0, 12, W, 108);
    g.fillStyle = '#a99c82'; g.fillRect(0, 12, 66, 108);
    g.fillStyle = '#d7cbb1'; g.fillRect(66, 12, 1, 108); g.fillRect(133, 12, 1, 108);
    // Floorboards
    g.fillStyle = '#b07a4a'; g.fillRect(0, 120, W, 30);
    for (let x = 0; x < W; x += 16) { g.fillStyle = '#9a6a3e'; g.fillRect(x, 120, 1, 30); }
    g.fillStyle = '#e8dcc0'; g.fillRect(0, 118, W, 2);                       // skirting
    // Hallway: the front door and the bike
    g.fillStyle = '#5a3a22'; g.fillRect(6, 44, 22, 74);
    g.fillStyle = '#d9b44a'; g.fillRect(24, 82, 2, 3);
    g.strokeStyle = '#1b1b1b'; g.lineWidth = 1.5;
    for (const wx of [40, 58]) { g.beginPath(); g.arc(wx, 110, 7, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.moveTo(40, 110); g.lineTo(48, 98); g.lineTo(58, 110); g.moveTo(48, 98); g.lineTo(56, 98); g.stroke();
    // Window with a net curtain (bright, no direct sun)
    g.fillStyle = '#f7f3ea'; g.fillRect(76, 22, 48, 50);
    g.fillStyle = sky; g.fillRect(79, 25, 42, 44);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(79, 25, 42, 44);
    for (let x = 80; x < 121; x += 4) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x, 25, 1, 44); }
    g.fillStyle = '#f7f3ea'; g.fillRect(99, 25, 2, 44);
    // The sunny window: no curtain, and the sun moving across it
    g.fillStyle = '#f7f3ea'; g.fillRect(142, 26, 50, 62);
    g.fillStyle = sky; g.fillRect(145, 29, 44, 56);
    if (light > 0) {
      const sx = 147 + ((hour() - 5) / 18) * 36;
      g.fillStyle = heatwave() ? '#ff8a2a' : '#ffe36a';
      g.fillRect(Math.round(sx), 36 + Math.round(Math.abs(13.5 - hour()) * 1.4), 6, 6);
    }
    g.fillStyle = '#f7f3ea'; g.fillRect(166, 29, 2, 56);
    g.fillStyle = '#e8dcc0'; g.fillRect(136, 88, 62, 6);                     // the sill
    g.fillStyle = '#c9bc9e'; g.fillRect(136, 94, 62, 2);
    // Sunbeam on the floor
    if (light > 0) {
      g.fillStyle = heatwave() ? `rgba(255,140,40,${0.3 * light})` : `rgba(255,230,120,${0.22 * light})`;
      g.beginPath(); g.moveTo(145, 96); g.lineTo(189, 96); g.lineTo(200, 120); g.lineTo(150, 120); g.fill();
    }
    // Labels on the floor
    SPOTS.forEach((s, i) => text(g, s.name, 33 + i * 67, 143, '#fffaf0', 1, '#5a3a1e'));
    // Night
    if (light < 1) { g.fillStyle = `rgba(16,22,48,${0.32 * (1 - light)})`; g.fillRect(0, 12, W, 138); }
    if (heatwave() && light > 0) { g.fillStyle = `rgba(255,120,40,${0.08 + Math.sin(t * 3) * 0.03})`; g.fillRect(0, 12, W, 138); }
  }

  function pot(x, y, p) {
    const need = PLANTS[p.kind];
    g.fillStyle = '#b55d33'; g.fillRect(x - 7, y - 10, 14, 10);
    g.fillStyle = '#9a4b28'; g.fillRect(x - 6, y - 2, 12, 2);
    g.fillStyle = '#d27a48'; g.fillRect(x - 8, y - 13, 16, 3);
    // Soil: pale and cracked when dry, dark when wet
    g.fillStyle = mix('#d4b088', '#2e1a0c', p.water); g.fillRect(x - 7, y - 14, 14, 1);
    if (p.water < 0.15) { g.fillStyle = '#9a7a55'; g.fillRect(x - 4, y - 14, 1, 1); g.fillRect(x + 3, y - 14, 1, 1); }
    // Price sticker, still on (it's from Columbia Road)
    g.fillStyle = '#fffaf0'; g.fillRect(x - 6, y - 9, 12, 6);
    text(g, need.price, x, y - 9, '#1b1b1b', 0.75, null);
  }

  function healthBar(x, y, p) {
    g.fillStyle = '#1b1b1b'; g.fillRect(x - 10, y + 2, 20, 3);
    g.fillStyle = p.health > 0.5 ? '#5cf072' : p.health > 0.25 ? '#ffd23f' : '#ff5a5a';
    g.fillRect(x - 9, y + 3, Math.max(0, Math.round(18 * p.health)), 1);
  }

  // Leaf colour from how it's doing: green, yellow if soggy, brown if dead
  function leafColour(p, base) {
    const [, hi] = PLANTS[p.kind].water;
    let c = mix(base, '#d8cf4a', clamp((p.water - hi) * 3));
    if (p.health <= 0) c = '#7a5a30';
    return c;
  }

  function drawPlant(p, bx, by, t) {
    g.save();
    g.translate(bx, by);
    g.scale(S, S);
    drawPlantAt(p, 0, 0, t);
    g.restore();
    healthBar(bx, by, p);
    // A blinking drop when it's thirsty
    if (p.health > 0 && p.water < PLANTS[p.kind].water[0] && Math.floor(t * 3) % 2) {
      g.fillStyle = '#3fb6ff';
      g.fillRect(bx - 1, by - 82, 3, 4); g.fillRect(bx, by - 84, 1, 2);
    }
  }

  function drawPlantAt(p, x, y, t) {
    const need = PLANTS[p.kind];
    const [lo] = need.water;
    const droop = p.health <= 0 ? 1 : clamp((lo - p.water) * 4);
    const lean = need.light[spotOf(p).id] === 'dark' ? 0.35 : 0;
    const wob = Math.sin(t * 20) * p.wobble * 0.08;
    const top = y - 14;
    g.save();
    if (p.kind === 'monstera') {
      const leaves = [[-0.95, 20, 8], [-0.45, 28, 9], [0.05, 32, 10], [0.5, 27, 9], [0.95, 19, 8]];
      if (p.growth > 0) leaves.push([-0.15, 18 + 16 * p.growth, p.grown ? 10 : 3 + 5 * p.growth, true]);
      for (const [a0, len0, size, fresh] of leaves) {
        const a = a0 * (1 + droop * 0.7) + lean + wob + Math.sign(a0 || 1) * droop * 0.5;
        const len = len0 * (1 - droop * 0.25);
        const tx = x + Math.sin(a) * len;
        const ty = top - Math.cos(a) * len + droop * 6;
        g.strokeStyle = '#3f7a2e'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x, top); g.quadraticCurveTo(x + Math.sin(a) * len * 0.3, top - len * 0.6, tx, ty); g.stroke();
        g.fillStyle = leafColour(p, fresh && !p.grown ? '#7cc85a' : '#2f8a3c');
        g.beginPath(); g.ellipse(tx, ty, size, size * 0.78, a, 0, Math.PI * 2); g.fill();
        if (!fresh || p.grown) { // the famous holes
          g.strokeStyle = mix('#efe4cc', '#1f5f2a', 0.4); g.lineWidth = 1;
          for (const k of [-0.5, 0, 0.5]) {
            g.beginPath(); g.moveTo(tx + Math.cos(a + k) * size * 0.3, ty + Math.sin(a + k) * size * 0.3);
            g.lineTo(tx + Math.cos(a + k) * size * 0.9, ty + Math.sin(a + k) * size * 0.75); g.stroke();
          }
        }
        if (p.burnt > 0.2) { g.strokeStyle = `rgba(122,74,30,${p.burnt})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(tx, ty, size, size * 0.78, a, 0, Math.PI * 2); g.stroke(); }
      }
    } else if (p.kind === 'fig') {
      const h = 38 * (1 - droop * 0.1);
      const tx = x + lean * 14;
      g.strokeStyle = '#6b4a2f'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, top); g.quadraticCurveTo(x, top - h * 0.6, tx, top - h); g.stroke();
      const count = Math.max(2, 9 - p.dropped);
      for (let i = 0; i < count; i++) {
        const k = 0.25 + (i / 9) * 0.75;
        const lx = x + (tx - x) * k * k;
        const ly = top - h * k;
        const side = i % 2 ? 1 : -1;
        const a = side * (0.7 + droop * 0.9) + wob;
        g.fillStyle = leafColour(p, i % 3 ? '#2f6b2a' : '#3a7d33');
        g.beginPath(); g.ellipse(lx + side * 5, ly + droop * 3, 6, 4.2, a, 0, Math.PI * 2); g.fill();
        if (p.burnt > 0.2) { g.strokeStyle = `rgba(122,74,30,${p.burnt})`; g.lineWidth = 1; g.stroke(); }
      }
      if (p.growth > 0) { // new leaf at the top
        g.fillStyle = leafColour(p, p.grown ? '#3a7d33' : '#7cc85a');
        g.beginPath(); g.ellipse(tx, top - h - 3, 2 + 4 * p.growth, 2 + 2.5 * p.growth, wob, 0, Math.PI * 2); g.fill();
      }
    } else {
      // Snake plant: upright swords, flopping outwards when it's rotting
      const rot = clamp((p.water - need.water[1]) * 4) + (p.health <= 0 ? 1 : 0);
      const blades = [[-6, 26, -0.12], [-3, 34, -0.05], [0, 38, 0], [3, 32, 0.06], [6, 24, 0.14]];
      if (p.growth > 0) blades.push([1.5, 34 * p.growth, 0.02, true]);
      for (const [dx, hgt, a0, fresh] of blades) {
        const a = a0 * (1 + rot * 6) + wob;
        const bx = x + dx;
        const tipX = bx + Math.sin(a) * hgt;
        const tipY = top - Math.cos(a) * hgt;
        g.fillStyle = p.health <= 0 ? '#7a5a30' : mix(fresh && !p.grown ? '#6fb85a' : '#3f7a3a', '#8a7a3a', rot * 0.6);
        g.beginPath(); g.moveTo(bx - 2, top); g.lineTo(tipX, tipY); g.lineTo(bx + 2, top); g.fill();
        g.strokeStyle = '#d8d26a'; g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(bx - 2, top); g.lineTo(tipX, tipY); g.stroke();
      }
    }
    g.restore();
    pot(x, y, p);
  }

  function drawCan(c) {
    const tilt = Math.min(1, c.t * 4);
    g.save();
    g.translate(c.x - 10, c.y);
    g.rotate(tilt * 0.5);
    g.fillStyle = '#3a9a8a'; g.fillRect(-6, -5, 12, 9);
    g.fillRect(6, -3, 8, 2);
    g.strokeStyle = '#2a7a6a'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(-1, -6, 4, Math.PI, 0); g.stroke();
    g.restore();
    if (c.t > 0.15) {
      for (let i = 0; i < 3; i++) {
        g.fillStyle = '#7fd0ff';
        g.fillRect(Math.round(c.x + 2 + i * 2), Math.round(c.y + 4 + ((c.t * 60 + i * 5) % 16)), 1, 2);
      }
    }
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    if (!running || !canvas.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    if (phase === 'week') simulate(dt);
    for (const p of plants) p.wobble = Math.max(0, p.wobble - dt * 2);

    drawRoom(t);
    for (const p of plants) {
      if (p === drag?.plant && drag.moved) continue;
      const at = placeOf(p);
      drawPlant(p, at.x, at.y, t);
    }
    if (drag?.moved) { // the plant you're carrying, and where it'll land
      const s = SPOTS[spotAt(drag.x)];
      g.strokeStyle = 'rgba(255,250,240,0.8)'; g.lineWidth = 1;
      g.strokeRect(s.x - 30, 14, 60, 134);
      drawPlant(drag.plant, drag.x, drag.y + 30, t);
    }
    cans = cans.filter((c) => (c.t += dt) < 0.8);
    cans.forEach(drawCan);
    bits = bits.filter((b) => (b.t += dt) < 1.4);
    for (const b of bits) {
      b.x += b.vx * dt; b.y += (b.vy + (b.kind === 'leaf' ? 30 : 0)) * dt;
      if (b.kind === 'leaf') { g.fillStyle = '#2f6b2a'; g.fillRect(Math.round(b.x + Math.sin(b.t * 8) * 3), Math.round(b.y), 4, 3); }
      else if (Math.floor(b.t * 10) % 2) { g.fillStyle = '#fff6a0'; g.fillRect(Math.round(b.x), Math.round(b.y), 1, 3); g.fillRect(Math.round(b.x) - 1, Math.round(b.y) + 1, 3, 1); }
    }

    // The week, along the top
    g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, W, 12);
    DAYS.forEach((d, i) => {
      const now2 = i === weekday() && phase === 'week';
      if (now2) { g.fillStyle = heatwave() ? '#ff7a1a' : '#ffd23f'; g.fillRect(4 + i * 28, 1, 25, 10); }
      text(g, d, 16 + i * 28, 4, now2 ? '#1b1b1b' : i < weekday() ? '#6a6a6a' : '#fffaf0', 1, null);
    });
    if (heatwave() && phase === 'week') text(g, 'HEATWAVE!', 100, 16, '#ff7a1a');
    if (away() && phase === 'week') {
      g.fillStyle = 'rgba(20,20,20,0.75)'; g.fillRect(30, 40, 140, 30);
      text(g, 'FERN IS AT A FESTIVAL', 100, 46, '#ffd23f');
      text(g, 'BACK SUNDAY', 100, 58, '#fffaf0');
    }
    requestAnimationFrame(frame);
  }
  setup();
  requestAnimationFrame(frame);
  // Testing helper (?debug only): a perfect week
  return {
    // more testing helpers: move/water a plant by kind, and fast-forward the week
    move(kind, spot) { move(plants.find((p) => p.kind === kind), spot); },
    water(kind) { water(plants.find((p) => p.kind === kind)); },
    advance(days) { for (let i = 0; i < days * day * 20 && phase === 'week'; i++) simulate(0.05); },
    cheat() { plants.forEach((p) => { p.grown = true; p.growth = 1; p.health = 1; }); clock = 6.999; },
    get state() { return { clock, plants: plants.map(({ kind, spot, water, health, growth }) => ({ kind, spot, water: +water.toFixed(2), health: +health.toFixed(2), growth: +growth.toFixed(2) })) }; },
  };
}
