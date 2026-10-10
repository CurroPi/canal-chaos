// Mini-game: the courtship dance, on the canal. A lady duck is choosing between you and a mallard.
// Moves slide in to the beat; hit the matching move on time to win her over.
// The moves are real mallard courtship displays (head-up-tail-up, water flick, nod-swimming, grunt-whistle).

import { courtshipSound, beatSound, fanfare, crashSound } from './sound.js';
import { FONT } from './ads.js';

const W = 200;
const H = 150;
const WATER_Y = 58;
const TRACK_Y = 124;
const TARGET_X = 22;
const TRAVEL = 1.7;   // seconds a move takes to slide from the right edge to the target

export const MOVES = {
  up: { name: 'HEAD UP', key: 'ArrowUp', colour: '#ffd23f' },
  flick: { name: 'FLICK', key: 'ArrowDown', colour: '#3fd0ff' },
  nod: { name: 'NOD', key: 'ArrowLeft', colour: '#5cf072' },
  whistle: { name: 'WHISTLE', key: 'ArrowRight', colour: '#ff7ab6' },
};
const MOVE_IDS = Object.keys(MOVES);

function text(g, str, cx, y, colour, k = 1) {
  const x0 = Math.round(cx - (str.length * 4 - 1) * k / 2);
  [...str].forEach((ch, i) => {
    const p = FONT[ch] || FONT[' '];
    for (let j = 0; j < 15; j++) {
      if (p[j] !== '1') continue;
      const x = x0 + (i * 4 + (j % 3)) * k;
      const y2 = y + Math.floor(j / 3) * k;
      g.fillStyle = '#1b1b1b'; g.fillRect(x + 1, y2 + 1, k, k);
      g.fillStyle = colour; g.fillRect(x, y2, k, k);
    }
  });
}

// Arrow icons for the moves (7x7)
const ARROWS = {
  up: ['0001000', '0011100', '0111110', '1111111', '0011100', '0011100', '0011100'],
  flick: ['0011100', '0011100', '0011100', '1111111', '0111110', '0011100', '0001000'],
  nod: ['0001000', '0011000', '0111111', '1111111', '0111111', '0011000', '0001000'],
  whistle: ['0001000', '0001100', '1111110', '1111111', '1111110', '0001100', '0001000'],
};
function arrow(g, id, x, y, colour) {
  g.fillStyle = colour;
  ARROWS[id].forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') g.fillRect(x + i, y + j, 1, 1); }));
}

const YOU = { body: '#f4f4f2', shade: '#d6d6d0', head: '#f4f4f2', chest: '#f4f4f2', beak: '#ff9a1a', tail: '#d6d6d0' };
const MALLARD = { body: '#9ea3a8', shade: '#7f858b', head: '#1f7a3a', chest: '#6b3d26', beak: '#e3c33a', ring: '#fafafa', tail: '#1b1b1b' };
const HER = { body: '#9a6b45', shade: '#7a5232', head: '#8a5a35', chest: '#a4744c', beak: '#d98a2a', tail: '#7a5232', speckled: true };

// A duck floating side-on. f = 1 faces right, -1 faces left. pose: idle | up | flick | nod | whistle
function drawDuck(g, x, y, f, c, pose, p, t) {
  const R = (col, dx, dy, w, h) => { g.fillStyle = col; g.fillRect(Math.round(f > 0 ? x + dx : x - dx - w), Math.round(y + dy), w, h); };
  const bob = Math.round(Math.sin(t * 3 + x) * 0.7);
  const k = Math.sin(Math.min(1, p) * Math.PI);                     // 0..1..0 over the move
  let headX = 0;
  let headY = 0;
  let tailY = 0;
  if (pose === 'up') { headY = -5 * k; tailY = -4 * k; }
  if (pose === 'flick') { headX = 4 * k; headY = 6 * k; }
  if (pose === 'nod') headX = 5 * Math.sin(p * Math.PI * 2);
  if (pose === 'whistle') { headY = -3 * k; tailY = -2 * k; }
  const yy = y + bob;
  R(c.shade, -11, yy - y - 9, 21, 8);
  R(c.body, -10, yy - y - 10, 19, 7);
  R(c.chest, 4, yy - y - 9, 7, 6);
  R(c.tail, -14, yy - y - 12 + tailY, 5, 4);
  if (c.speckled) for (const [dx, dy] of [[-6, -8], [-2, -7], [1, -9], [-8, -6]]) R('#5a3a22', dx, yy - y + dy, 1, 1);
  R(c.ring || c.body, 6 + headX * 0.5, yy - y - 15 + headY * 0.6, 4, 6);
  R(c.head, 6 + headX, yy - y - 22 + headY, 8, 8);
  R('#1b1b1b', 11 + headX, yy - y - 20 + headY, 2, 2);
  R(c.beak, 13 + headX, yy - y - 17 + headY, 6, 3);
}

export function playCourtship(card, { bpm = 104, notes: count = 28 }, onDone) {
  card.innerHTML = `
    <div class="pool-head">
      <span class="pool-title">🦆 THE COURTSHIP DANCE</span>
      <button class="pool-leave" aria-label="Leave">✕</button>
    </div>
    <div class="pool-stage fight-stage">
      <canvas width="${W}" height="${H}"></canvas>
      <div class="pool-result hidden"></div>
    </div>
    <div class="dance-buttons">
      ${['nod', 'up', 'flick', 'whistle'].map((id) => `<button class="dance-${id}" data-move="${id}" style="background:${MOVES[id].colour}">${{ up: '▲', flick: '▼', nod: '◀', whistle: '▶' }[id]}<small>${MOVES[id].name}</small></button>`).join('')}
    </div>
    <p class="pool-hint">Hit each move as it reaches the circle.<br>Real mallard courtship moves. Look them up.</p>
  `;
  const canvas = card.querySelector('canvas');
  const g = canvas.getContext('2d');
  const resultEl = card.querySelector('.pool-result');
  const beat = 60 / bpm;

  let song;       // notes: { time, move, judged }
  let clock;
  let meter;      // -100 (the mallard) .. +100 (you)
  let phase;
  let myMove;     // { id, t }
  let hisMove;
  let pops;
  let hearts;
  let splashes;
  let lastBeat;
  let running = true;

  function setup() {
    song = [];
    let prev = null;
    for (let i = 0; i < count; i++) {
      const beatNo = 4 + i + Math.floor(i / 6);                        // a little breather every 6
      let move = MOVE_IDS[Math.floor(Math.random() * MOVE_IDS.length)];
      if (move === prev && Math.random() < 0.6) move = MOVE_IDS[(MOVE_IDS.indexOf(move) + 1) % MOVE_IDS.length];
      prev = move;
      song.push({ time: beatNo * beat, move, judged: false });
    }
    clock = -0.3;
    meter = 0;
    phase = 'dance';
    myMove = null;
    hisMove = null;
    pops = [];
    hearts = [];
    splashes = [];
    lastBeat = -1;
    resultEl.classList.add('hidden');
  }

  const pop = (str, colour) => pops.push({ text: str, t: 0, colour });

  function perform(id) {
    myMove = { id, t: 0 };
    courtshipSound(id);
    if (id === 'flick') splash(45);
  }

  function splash(x) {
    for (let i = 0; i < 7; i++) splashes.push({ x: x + 14, y: WATER_Y + 36, vx: (Math.random() - 0.2) * 40, vy: -40 - Math.random() * 30, t: 0 });
  }

  function press(id) {
    if (phase !== 'dance') return;
    perform(id);
    // The closest move still waiting, near its moment
    const n = song.filter((x) => !x.judged && Math.abs(x.time - clock) < 0.28).sort((a, b) => Math.abs(a.time - clock) - Math.abs(b.time - clock))[0];
    if (!n) return;                                                    // dancing between beats is free
    n.judged = true;
    if (n.move !== id) { meter -= 7; pop('WRONG MOVE', '#ff5a5a'); return; }
    const off = Math.abs(n.time - clock);
    if (off < 0.1) { meter += 10; pop('PERFECT!', '#ffd23f'); heart(true); } else { meter += 6; pop('NICE', '#5cf072'); heart(true); }
  }

  function heart(toYou) {
    hearts.push({ x: 100, y: WATER_Y + 14, tx: toYou ? 48 : 152, t: 0 });
  }

  function finish(won) {
    phase = 'over';
    resultEl.classList.remove('hidden');
    if (won) {
      fanfare();
      resultEl.innerHTML = `
        <p class="pool-big win">YOU WON!</p>
        <p>She chose you.<br>The mallard is devastated.</p>
        <button class="pool-continue">Continue</button>`;
      resultEl.querySelector('.pool-continue').addEventListener('click', () => close(true));
    } else {
      crashSound();
      resultEl.innerHTML = `
        <p class="pool-big lose">SHE CHOSE THE MALLARD.</p>
        <p>Classic.</p>
        <button class="pool-again">Try again</button>
        <button class="pool-later secondary">Later</button>`;
      resultEl.querySelector('.pool-again').addEventListener('click', setup);
      resultEl.querySelector('.pool-later').addEventListener('click', () => close(false));
    }
  }

  function close(won) {
    running = false;
    window.removeEventListener('keydown', onKey);
    onDone(won);
  }

  // ---------- Input ----------
  card.querySelectorAll('.dance-buttons button').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); press(b.dataset.move); }));
  card.querySelector('.pool-leave').addEventListener('click', () => close(false));
  function onKey(e) {
    if (e.repeat) return;
    const id = MOVE_IDS.find((m) => MOVES[m].key === e.key);
    if (id) { e.preventDefault(); press(id); }
  }
  window.addEventListener('keydown', onKey);

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    if (!running || !canvas.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    if (phase === 'dance') {
      clock += dt;
      const b = Math.floor(clock / beat);
      if (b !== lastBeat && clock >= 0) {                               // the beat, and the mallard's moves
        lastBeat = b;
        beatSound(b % 4 === 0);
        if (song.some((n) => Math.abs(n.time - b * beat) < 0.01)) {
          meter -= 3.4;                                                 // he's good, to be fair
          hisMove = { id: MOVE_IDS[Math.floor(Math.random() * 4)], t: 0 };
          if (Math.random() < 0.35) heart(false);
        }
      }
      for (const n of song) {
        if (!n.judged && clock - n.time > 0.28) { n.judged = true; meter -= 6; pop('MISSED', '#ff5a5a'); }
      }
      meter = Math.max(-100, Math.min(100, meter));
      if (clock > song[song.length - 1].time + 1.2) {
        phase = 'reveal';
        clock = 0;
      }
    } else if (phase === 'reveal') {
      clock += dt;
      if (clock > 1.6) finish(meter > 0);
    }
    if (myMove) { myMove.t += dt / (beat * 0.9); if (myMove.t > 1) myMove = null; }
    if (hisMove) { hisMove.t += dt / (beat * 0.9); if (hisMove.t > 1) hisMove = null; }

    // Scene: towpath and wall at the back, the canal filling the rest
    g.fillStyle = '#9fc7e8'; g.fillRect(0, 0, W, 14);
    g.fillStyle = '#9a4733'; g.fillRect(0, 14, W, 32);
    for (let y = 14; y < 46; y += 4) for (let x = ((y / 4) % 2) * 4 - 4; x < W; x += 8) { g.fillStyle = '#6e2f22'; g.fillRect(x + 7, y, 1, 3); g.fillRect(x, y + 3, 8, 1); }
    g.fillStyle = '#cfc6b2'; g.fillRect(0, 46, W, 10);
    g.fillStyle = '#8c8577'; g.fillRect(0, 56, W, 2);
    g.fillStyle = '#3e5f4c'; g.fillRect(0, WATER_Y, W, TRACK_Y - WATER_Y - 4);
    for (let i = 0; i < 16; i++) { g.fillStyle = '#527a63'; g.fillRect(Math.round((i * 37 + t * 6) % 215) - 8, WATER_Y + 4 + (i * 11) % 56, 8, 1); }
    // Her, in the middle, looking at whoever's winning
    const herPose = phase === 'reveal' ? 'nod' : 'idle';
    drawDuck(g, 100, WATER_Y + 26, meter >= 0 ? -1 : 1, HER, herPose, clock % 1, t);
    // You (left) and the mallard (right), facing her
    drawDuck(g, 40, WATER_Y + 44, 1, YOU, myMove?.id || 'idle', myMove?.t || 0, t);
    drawDuck(g, 160, WATER_Y + 44, -1, MALLARD, hisMove?.id || 'idle', hisMove?.t || 0, t + 2);
    for (const [x, y] of [[40, WATER_Y + 44], [160, WATER_Y + 44], [100, WATER_Y + 26]]) {
      g.fillStyle = 'rgba(62,95,76,0.85)'; g.fillRect(x - 16, y - 3, 32, 4);   // floating: body under the water line
      g.fillStyle = '#6f9a80'; g.fillRect(x - 15, y - 3, 30, 1);
    }
    if (myMove?.id === 'whistle' || hisMove?.id === 'whistle') {          // music notes
      const x = myMove?.id === 'whistle' ? 58 : 132;
      g.fillStyle = '#ff7ab6'; g.fillRect(x, WATER_Y + 14 - Math.round((t * 30) % 10), 2, 2); g.fillRect(x + 1, WATER_Y + 10 - Math.round((t * 30) % 10), 1, 4);
    }
    splashes = splashes.filter((s) => (s.t += dt) < 0.7);
    for (const s of splashes) { s.vy += 160 * dt; s.x += s.vx * dt; s.y += s.vy * dt; g.fillStyle = '#e8f4ff'; g.fillRect(Math.round(s.x), Math.round(s.y), 1, 2); }
    hearts = hearts.filter((h) => (h.t += dt) < 1);
    for (const h of hearts) {
      const x = h.x + (h.tx - h.x) * h.t;
      const y = h.y - Math.sin(h.t * Math.PI) * 14;
      g.fillStyle = '#ff5a8a';
      g.fillRect(Math.round(x), Math.round(y), 2, 2); g.fillRect(Math.round(x) + 3, Math.round(y), 2, 2); g.fillRect(Math.round(x), Math.round(y) + 1, 5, 2); g.fillRect(Math.round(x) + 1, Math.round(y) + 3, 3, 1);
    }

    // Her heart meter: left = you, right = the mallard
    g.fillStyle = '#1b1b1b'; g.fillRect(29, 3, 142, 9);
    g.fillStyle = '#7f858b'; g.fillRect(30, 4, 140, 7);
    const mid = 100 + Math.round(meter * 0.7);
    g.fillStyle = '#ff5a8a'; g.fillRect(30, 4, mid - 30, 7);
    g.fillStyle = '#fffaf0'; g.fillRect(mid - 1, 2, 2, 11);
    text(g, 'YOU', 14, 5, '#ff5a8a');
    text(g, 'HIM', 186, 5, '#d0d0d0');

    // The move track
    g.fillStyle = '#1b2a22'; g.fillRect(0, TRACK_Y - 4, W, H - TRACK_Y + 4);
    g.fillStyle = '#2c4236'; g.fillRect(0, TRACK_Y - 4, W, 1);
    g.strokeStyle = '#fffaf0'; g.lineWidth = 1;
    g.beginPath(); g.arc(TARGET_X + 3.5, TRACK_Y + 9.5, 7, 0, Math.PI * 2); g.stroke();
    for (const n of song) {
      if (n.judged) continue;
      const x = TARGET_X + ((n.time - clock) / TRAVEL) * (W - TARGET_X);
      if (x > W + 4 || x < -10) continue;
      arrow(g, n.move, Math.round(x), TRACK_Y + 6, MOVES[n.move].colour);
    }
    pops = pops.filter((p) => (p.t += dt) < 0.6);
    if (pops.length) { const p = pops[pops.length - 1]; text(g, p.text, 100, TRACK_Y - 16 - Math.round(p.t * 10), p.colour); }
    if (phase === 'dance' && clock < 4 * beat) text(g, clock < 2 * beat ? 'READY...' : 'DANCE!', 100, 36, '#ffd23f', 2);
    if (phase === 'reveal') text(g, 'SHE CHOOSES...', 100, 30, '#fffaf0', 2);
    requestAnimationFrame(frame);
  }
  setup();
  requestAnimationFrame(frame);
  // Testing helper (?debug only): she's already decided
  return { cheat() { meter = 100; song.forEach((n) => { n.judged = true; }); clock = song[song.length - 1].time + 1.3; } };
}
