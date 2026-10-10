// Mini-game: win a duck fight against a mallard on the towpath (Street Fighter, but ducks).
// PECK when the mallard is open (after it lunges); FLAP to dodge when it crouches and wiggles.
// Peck it while it's ready and it counter-pecks you.

import { quackSound, clackSound, crashSound, fanfare } from './sound.js';
import { FONT } from './ads.js';

const W = 200;
const H = 150;
const FLOOR = 112;

function text(g, str, cx, y, colour, k = 1) {
  const x0 = Math.round(cx - (str.length * 4 - 1) * k / 2);
  [...str].forEach((ch, i) => {
    const p = FONT[ch] || FONT[' '];
    for (let j = 0; j < 15; j++) {
      if (p[j] !== '1') continue;
      const x = x0 + (i * 4 + (j % 3)) * k;
      const y2 = y + Math.floor(j / 3) * k;
      g.fillStyle = '#1b1b1b'; g.fillRect(x + 1, y2 + 1, k, k);  // drop shadow
      g.fillStyle = colour; g.fillRect(x, y2, k, k);
    }
  });
}

const WHITE_DUCK = { body: '#f4f4f2', shade: '#d6d6d0', head: '#f4f4f2', chest: '#f4f4f2', beak: '#ff9a1a', feet: '#ff8c00', ring: null, tail: '#d6d6d0' };
const MALLARD = { body: '#9ea3a8', shade: '#7f858b', head: '#1f7a3a', chest: '#6b3d26', beak: '#e3c33a', feet: '#ff8c00', ring: '#fafafa', tail: '#1b1b1b' };

// A side-on pixel duck. `f` = 1 facing right, -1 facing left.
function drawDuck(g, x, y, f, c, pose, t) {
  const R = (col, dx, dy, w, h) => { g.fillStyle = col; g.fillRect(Math.round(f > 0 ? x + dx : x - dx - w), Math.round(y + dy), w, h); };
  const crouch = pose === 'tell' ? 3 : 0;
  const neck = pose === 'peck' || pose === 'lunge' ? 5 : 0;
  const bob = pose === 'idle' ? Math.round(Math.sin(t * 6) * 0.8) : 0;
  const yy = bob + crouch;
  // Feet and legs
  R(c.feet, -4, -2, 2, 2 - crouch); R(c.feet, 2, -2, 2, 2 - crouch);
  R(c.feet, -6, 0, 5, 1); R(c.feet, 1, 0, 5, 1);
  // Body
  R(c.shade, -11, -13 + yy, 20, 11);
  R(c.body, -10, -14 + yy, 19, 10);
  R(c.chest, 4, -13 + yy, 7, 8);
  R(c.tail, -14, -16 + yy, 5, 4);                                  // tail, up
  const wingUp = pose === 'flap' && Math.floor(t * 20) % 2 === 0;
  R(c.shade, -7, (wingUp ? -22 : -12) + yy, 11, wingUp ? 9 : 5);   // wing
  // Neck and head
  R(c.ring || c.body, 6 + neck, -19 + yy, 4, 6);
  R(c.head, 6 + neck, -26 + yy, 8, 8);
  R('#1b1b1b', 11 + neck, -24 + yy, 2, 2);                          // eye
  R(c.beak, 13 + neck, -21 + yy, 6, 3);
}

export function playDuckFight(card, { lungeDamage = 20, peckDamage = 20 }, onDone) {
  card.innerHTML = `
    <div class="pool-head">
      <span class="pool-title">🦆 DUCK FIGHT</span>
      <button class="pool-leave" aria-label="Leave">✕</button>
    </div>
    <div class="pool-stage fight-stage">
      <canvas width="${W}" height="${H}"></canvas>
      <div class="pool-result hidden"></div>
    </div>
    <div class="fight-buttons">
      <button class="fight-flap">FLAP<small>dodge</small></button>
      <button class="fight-peck">PECK<small>attack</small></button>
    </div>
    <p class="pool-hint">When the mallard crouches and wiggles: FLAP.<br>When it misses: PECK. Don't peck it when it's ready.</p>
  `;
  const canvas = card.querySelector('canvas');
  const g = canvas.getContext('2d');
  const resultEl = card.querySelector('.pool-result');

  let me;
  let foe;
  let phase;
  let phaseT;
  let pops;       // floating words: { text, x, y, t, colour }
  let feathers;
  let shake;
  let running = true;

  function setup() {
    me = { hp: 100, x: 62, action: null, actionT: 0, cool: 0, hurt: 0 };
    foe = { hp: 100, x: 140, state: 'idle', stateT: 0, wait: 1.2, hurt: 0, hitDone: false };
    phase = 'intro';
    phaseT = 0;
    pops = [];
    feathers = [];
    shake = 0;
    resultEl.classList.add('hidden');
  }

  const pop = (str, x, colour = '#fffaf0') => pops.push({ text: str, x, y: 70, t: 0, colour });
  function burst(x, colour) {
    for (let i = 0; i < 8; i++) feathers.push({ x, y: FLOOR - 16, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 40, t: 0, colour });
  }

  // ---------- Your moves ----------
  function peck() {
    if (phase !== 'fight' || me.action || me.cool > 0) return;
    me.action = 'peck';
    me.actionT = 0;
    me.cool = 0.35;
    clackSound(0.7);
    if (foe.state === 'recover') {                       // it's open: proper hit
      foe.hp -= peckDamage;
      foe.hurt = 0.25;
      shake = 0.15;
      quackSound(1.3);
      burst(foe.x - 6, '#9ea3a8');
      pop('PECK!', foe.x, '#ffd23f');
    } else if (foe.state === 'idle') {                   // it's ready: it counters
      me.hp -= 10;
      me.hurt = 0.25;
      foe.state = 'counter';
      foe.stateT = 0;
      quackSound(0.8);
      burst(me.x + 6, '#f4f4f2');
      pop('COUNTER!', me.x, '#ff5a5a');
    } else pop('BLOCKED', foe.x);
    if (foe.hp <= 0) ko(true);
    else if (me.hp <= 0) ko(false);
  }

  function flap() {
    if (phase !== 'fight' || me.action || me.cool > 0) return;
    me.action = 'flap';
    me.actionT = 0;
    me.cool = 0.9;
  }

  function ko(won) {
    phase = 'ko';
    phaseT = 0;
    me.won = won;
    crashSound();
  }

  function finish(won) {
    phase = 'over';
    resultEl.classList.remove('hidden');
    if (won) {
      fanfare();
      resultEl.innerHTML = `
        <p class="pool-big win">YOU WON!</p>
        <p>Duck wins the duck fight.<br>QUACK.</p>
        <button class="pool-continue">Continue</button>`;
      resultEl.querySelector('.pool-continue').addEventListener('click', () => close(true));
    } else {
      resultEl.innerHTML = `
        <p class="pool-big lose">THE MALLARD WINS.</p>
        <p>It's been doing this for years.</p>
        <button class="pool-again">Rematch</button>
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

  // ---------- The mallard ----------
  function updateFoe(dt) {
    foe.stateT += dt;
    const anger = 1 - (100 - foe.hp) / 300;               // a bit quicker as it gets hurt
    if (foe.state === 'idle' && foe.stateT > foe.wait) { foe.state = 'tell'; foe.stateT = 0; quackSound(0.6); }
    else if (foe.state === 'tell' && foe.stateT > 0.62 * anger) { foe.state = 'lunge'; foe.stateT = 0; foe.hitDone = false; }
    else if (foe.state === 'lunge') {
      if (!foe.hitDone && foe.stateT > 0.12) {
        foe.hitDone = true;
        if (me.action === 'flap') { pop('MISSED!', me.x, '#5cf072'); }
        else {
          me.hp -= lungeDamage;
          me.hurt = 0.3;
          shake = 0.25;
          quackSound(1);
          burst(me.x + 4, '#f4f4f2');
          pop('OUCH!', me.x, '#ff5a5a');
          if (me.hp <= 0) ko(false);
        }
      }
      if (foe.stateT > 0.26) { foe.state = 'recover'; foe.stateT = 0; }
    } else if (foe.state === 'recover' && foe.stateT > 0.95) { foe.state = 'idle'; foe.stateT = 0; foe.wait = (0.7 + Math.random() * 0.9) * anger; }
    else if (foe.state === 'counter' && foe.stateT > 0.3) { foe.state = 'idle'; foe.stateT = 0; foe.wait = 0.6; }
  }

  // ---------- Input ----------
  card.querySelector('.fight-peck').addEventListener('pointerdown', (e) => { e.preventDefault(); peck(); });
  card.querySelector('.fight-flap').addEventListener('pointerdown', (e) => { e.preventDefault(); flap(); });
  card.querySelector('.pool-leave').addEventListener('click', () => close(false));
  function onKey(e) {
    if (e.repeat) return;
    if (['ArrowRight', ' ', 'd', 'D', 'j', 'J'].includes(e.key)) { e.preventDefault(); peck(); }
    if (['ArrowUp', 'ArrowLeft', 'w', 'W', 'a', 'A', 'f', 'F'].includes(e.key)) { e.preventDefault(); flap(); }
  }
  window.addEventListener('keydown', onKey);

  // ---------- Drawing ----------
  function drawArena(t) {
    g.fillStyle = '#9fc7e8'; g.fillRect(0, 0, W, 30);
    g.fillStyle = '#6e2f22'; g.fillRect(0, 30, W, 62);                       // brick wall
    for (let y = 30; y < 92; y += 4) {
      const off = ((y - 30) / 4 % 2) * 4;
      for (let x = -off; x < W; x += 8) { g.fillStyle = ['#9a4733', '#a8503a', '#8f3f2d'][(x * 7 + y) % 3 === 0 ? 1 : (x + y) % 2]; g.fillRect(Math.max(0, x), y, 7, 3); }
    }
    g.fillStyle = '#bdb3a0'; g.fillRect(0, 90, W, 3);
    g.fillStyle = '#cfc6b2'; g.fillRect(0, 93, W, 24);                       // towpath
    for (let x = 0; x < W; x += 10) { g.fillStyle = '#b8af9a'; g.fillRect(x, 100 + (x % 20 ? 6 : 0), 7, 1); }
    g.fillStyle = '#8c8577'; g.fillRect(0, 117, W, 2);
    g.fillStyle = '#3e5f4c'; g.fillRect(0, 119, W, 31);                      // canal
    for (let i = 0; i < 12; i++) { g.fillStyle = '#527a63'; g.fillRect(Math.round((i * 37 + t * 8) % 210) - 6, 123 + (i * 7) % 24, 7, 1); }
  }

  function drawBar(x, w, hp, name, right) {
    g.fillStyle = '#1b1b1b'; g.fillRect(x - 1, 5, w + 2, 8);
    g.fillStyle = '#c81e3a'; g.fillRect(x, 6, w, 6);
    const fill = Math.max(0, Math.round(w * hp / 100));
    g.fillStyle = '#ffd23f'; g.fillRect(right ? x + w - fill : x, 6, fill, 6);
    text(g, name, right ? x + w - name.length * 2 : x + name.length * 2, 16, '#fffaf0');
  }

  function frame(now) {
    if (!running || !canvas.isConnected) return;
    const dt = Math.min(0.033, (now - (frame.last || now)) / 1000);
    frame.last = now;
    const t = now / 1000;
    phaseT += dt;
    if (phase === 'intro' && phaseT > 1.6) { phase = 'fight'; phaseT = 0; }
    if (phase === 'fight') {
      updateFoe(dt);
      me.cool = Math.max(0, me.cool - dt);
      if (me.action) {
        me.actionT += dt;
        if (me.actionT > (me.action === 'flap' ? 0.5 : 0.18)) me.action = null;
      }
    }
    if (phase === 'ko' && phaseT > 1.3) finish(me.won);
    me.hurt = Math.max(0, me.hurt - dt);
    foe.hurt = Math.max(0, foe.hurt - dt);
    shake = Math.max(0, shake - dt);

    g.save();
    if (shake > 0) g.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 3));
    drawArena(t);
    // Duck (you)
    const flapH = me.action === 'flap' ? Math.sin(Math.min(1, me.actionT / 0.5) * Math.PI) * 18 : 0;
    const meX = me.x + (me.action === 'peck' ? 6 : 0);
    if (!(me.hurt > 0 && Math.floor(t * 30) % 2)) drawDuck(g, meX, FLOOR - flapH, 1, WHITE_DUCK, me.action || (phase === 'ko' && !me.won ? 'tell' : 'idle'), t);
    // Mallard
    let foeX = foe.x;
    if (foe.state === 'lunge') foeX -= Math.min(1, foe.stateT / 0.12) * 52;
    if (foe.state === 'recover') foeX -= 52 * Math.max(0, 1 - foe.stateT / 0.5);
    if (foe.state === 'tell') foeX += Math.round(Math.sin(t * 40));          // the wiggle
    const foePose = foe.state === 'tell' ? 'tell' : foe.state === 'lunge' || foe.state === 'counter' ? 'peck' : 'idle';
    if (!(foe.hurt > 0 && Math.floor(t * 30) % 2)) drawDuck(g, foeX, FLOOR, -1, MALLARD, foePose, t + 1);
    if (foe.state === 'tell') text(g, '!', foeX - 2, 70, '#ff5a5a', 2);
    if (foe.state === 'recover' && phase === 'fight') text(g, 'OPEN', foeX - 4, 74, '#5cf072');
    // Feathers and words
    feathers = feathers.filter((p) => (p.t += dt) < 0.8);
    for (const p of feathers) { p.vy += 120 * dt; p.x += p.vx * dt; p.y += p.vy * dt; g.fillStyle = p.colour; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 1); }
    pops = pops.filter((p) => (p.t += dt) < 0.8);
    for (const p of pops) text(g, p.text, p.x, Math.round(p.y - p.t * 20), p.colour);
    g.restore();

    drawBar(8, 76, me.hp, 'DUCK', false);
    drawBar(116, 76, foe.hp, 'MALLARD', true);
    if (phase === 'intro') text(g, phaseT < 0.8 ? 'ROUND 1' : 'FIGHT!', W / 2, 50, phaseT < 0.8 ? '#fffaf0' : '#ffd23f', 3);
    if (phase === 'ko') text(g, 'K.O.!', W / 2, 50, '#ff5a5a', 4);
    requestAnimationFrame(frame);
  }
  setup();
  requestAnimationFrame(frame);
  // Testing helper (?debug only): knock the mallard out
  return { cheat() { foe.hp = 0; ko(true); } };
}
