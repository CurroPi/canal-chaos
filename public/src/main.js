// The game: walking, dodging, spilling, dying.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createWorld } from './world.js';
import { makePlayer, animateWalk, setCoffee, box, makeCargoBike } from './models.js';
import { ENEMIES } from './enemies.js';
import { CHARACTERS, characterById, drinkSvg } from './characters.js';
import { leaderboardEnabled, topScores, submitScore, rankOf, bestOf, cleanName } from './leaderboard.js';
import { titleFor } from './titles.js';
import {
  initAudio, bell, spillSound, crashSound, pickupSound, whineSound,
  startMusic, stopMusic, setMusicIntensity, gameOverJingle, isMuted, toggleMute, fanfare, closeCallSound,
  isSfxMuted, toggleSfx,
} from './sound.js';
import { LINES } from './lines.js';
import { GAGS, makeNarrowboat, addPosters } from './gags.js';

// ---------- Scene setup ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const SKY = 0xbfdbe9;
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 35, 120);

const cam = CONFIG.camera;
const camera = new THREE.PerspectiveCamera(cam.fov, 1, 0.1, 200);
camera.position.set(cam.x, cam.y, cam.z);
camera.lookAt(0, cam.lookY, cam.lookZ);

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 2.2));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
sun.position.set(-6, 10, 4);
scene.add(sun);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // On tall phone screens: camera lower and closer (less sky, bigger walker), view widened so all lanes fit
  const c = camera.aspect < 0.8 ? CONFIG.cameraPortrait : cam;
  camera.position.set(c.x, c.y, c.z);
  camera.lookAt(0, c.lookY, c.lookZ);
  camera.fov = Math.min(95, c.fov * Math.max(1, 0.75 / camera.aspect));
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const world = createWorld(scene, CONFIG);
// ---------- Your walker ----------
// Some walkers unlock when your best score (on this device) reaches a threshold
const unlockAt = (c) => CONFIG.unlocks[c.id] || 0;
const isUnlocked = (c) => unlockAt(c) <= loadBest();

function loadCharacter() {
  let c = CHARACTERS[0];
  try { c = characterById(localStorage.getItem('canal-hipster')); } catch { /* storage unavailable */ }
  return isUnlocked(c) ? c : CHARACTERS[0];
}

// A locked walker in the preview: a dark silhouette
const silhouetteMat = new THREE.MeshBasicMaterial({ color: 0x1b1b1b });
function silhouette(p) {
  p.group.traverse((o) => { if (o.isMesh) o.material = silhouetteMat; });
}
let character = loadCharacter();
let player = makePlayer(character);
player.group.scale.setScalar(CONFIG.playerScale);
scene.add(player.group);

function setCharacter(c) {
  character = c;
  try { localStorage.setItem('canal-hipster', c.id); } catch { /* storage unavailable */ }
  scene.remove(player.group);
  player = makePlayer(c);
  player.group.scale.setScalar(CONFIG.playerScale);
  if (!isUnlocked(c)) silhouette(player);
  scene.add(player.group);
  setCoffee(player, coffees);
  updateHud();
}

// ---------- Game state ----------
let state = 'ready'; // 'ready' | 'playing' | 'over'
let lane = 1;
let elapsed = 0;
let score = 0;
let spawnTimer = 0;
let behindTimer = 0;
let deliveryTimer = 0;
let convoy = []; // run club packs still to send: { at, lanes }
let waitingKind = null;
let bridgeTimer = 0;
let specialTimer = 0;
let specialsPool = [];
let entities = [];
let particles = [];
let coffees = CONFIG.coffee.start;
let nextCafeAt = CONFIG.cafe.first;
let cafesServed = 0;
let rushLevel = 0;
let nextRushAt = CONFIG.rush.every;
let bridgeHold = null;   // a bridge waiting for its lanes to clear: { lanes }
let reservations = [];   // delivery bikes booked in advance: { lanes, span, arrival, at }
let prevLane = 1;
let lastMoveAt = -99;
let lastCloseCallAt = -99;
let nextTitleAt = CONFIG.titles.every;
let lastTitle = null;
const usedTitles = new Set();
let invulnUntil = 0;
let spilledAt = -99;
let best = loadBest();
let overAt = 0;
let overlayTimer = null;

const lerp = (a, b, t) => a + (b - a) * t;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const shuffle = (list) => list.sort(() => Math.random() - 0.5);
const progress = () => Math.min(1, elapsed / CONFIG.spawn.rampSeconds);

// Rush levels: faster walking and tighter gaps the further you get
const rushSpeed = () => Math.min(CONFIG.rush.maxSpeed, 1 + CONFIG.rush.speedStep * rushLevel);
const walkNow = () => CONFIG.walkSpeed * rushSpeed();
const rushGap = (seconds) => Math.max(CONFIG.rush.minGap, seconds * CONFIG.rush.gapStep ** rushLevel);

function loadBest() {
  try { return Number(localStorage.getItem('canal-best')) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { localStorage.setItem('canal-best', String(value)); } catch { /* storage unavailable */ }
}

// Walking speed multiplier: you stumble after spilling, then recover
function speedFactor() {
  const c = CONFIG.coffee;
  const since = elapsed - spilledAt;
  return since >= c.slowRecover ? 1 : lerp(c.slowFactor, 1, since / c.slowRecover);
}

// ---------- UI ----------
const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const warningEl = document.getElementById('warning');

// `credit`: show "BY DUDE LONDON" under the card (only on the intro screens)
function showOverlay(html, onButton = start, cls = '', credit = false) {
  overlay.innerHTML = `<div class="card ${cls}">${html}</div>${credit ? '<p class="credit-line">BY DUDE LONDON</p>' : ''}`;
  overlay.classList.remove('hidden', 'clear');
  if (onButton) overlay.querySelector('button')?.addEventListener('click', onButton);
}

// The intro story: lines fade in one by one
function showStory() {
  const lines = [
    '<p class="when">Saturday, 11am. Regent\'s Canal.</p>',
    '<p>All you want is to walk to Broadway Market with your oat flat white.</p>',
    '<p>Run clubs hunt in packs. Lime bikes don\'t brake. A sausage dog is attacking a duck.</p>',
    '<p>The sign says <em>Share the Space</em>.<br><strong>Nobody has read the sign.</strong></p>',
    '<p class="motto">Keep your coffee. Keep your dignity. Keep walking.</p>',
  ];
  showOverlay(`
    <h1 class="title">Canal Chaos</h1>
    <p class="subtitle">A Hackney Towpath Survival Game</p>
    <div class="story">${lines.map((l, i) => l.replace('<p', `<p style="animation-delay:${0.4 + i * 0.7}s"`)).join('')}</div>
    <button class="late" style="animation-delay:${0.4 + lines.length * 0.7}s">Continue</button>
  `, showRules, 'story-card', true);
}

function showRules() {
  showOverlay(`
    <h2>How to survive</h2>
    <ul class="rules">
      <li><b>← →</b> or swipe to dodge. Lime bikes, runners, run clubs, dog leads, prams, bridges.</li>
      <li><b>🔔 Listen for bells.</b> Bikes come from behind. The red lane is where they're going.</li>
      <li><b>☕ Your coffee is your extra life.</b> The narrowboat café pops up every now and then with another.</li>
    </ul>
    <p class="small music-hint">♪ Music on: tap ♪ or press M to mute.</p>
    <button>Choose your walker</button>
  `, showSelect, '', true);
}

// Choose your walker: they turn slowly in front of you while you browse
function showSelect() {
  if (state === 'over' && performance.now() - overAt < 900) return;
  clearTimeout(overlayTimer);
  reset();
  state = 'select';
  showOverlay(`
    <p class="small label">Choose your walker</p>
    <div class="picker">
      <button class="arrow" data-dir="-1" aria-label="Previous">◀</button>
      <div class="who">
        <h2 id="pickName"></h2>
        <p class="small" id="pickDrink"></p>
      </div>
      <button class="arrow" data-dir="1" aria-label="Next">▶</button>
    </div>
    <p class="dots" id="pickDots"></p>
    <button class="go">Start walking</button>
  `, null, 'select-card');
  overlay.classList.add('clear');
  overlay.querySelectorAll('.arrow').forEach((b) => b.addEventListener('click', () => browse(Number(b.dataset.dir))));
  overlay.querySelector('.go').addEventListener('click', start);
  showPick();
}

function browse(dir) {
  const i = CHARACTERS.indexOf(character);
  setCharacter(CHARACTERS[(i + dir + CHARACTERS.length) % CHARACTERS.length]);
  showPick();
}

function showPick() {
  const open = isUnlocked(character);
  document.getElementById('pickName').textContent = character.name;
  document.getElementById('pickDrink').innerHTML = open
    ? `<span class="pick-drink">${drinkSvg(character.drink)}</span> ${character.drink.name}`
    : `🔒 Reach ${unlockAt(character).toLocaleString('en-GB')} points`;
  const go = overlay.querySelector('.go');
  if (go) {
    go.disabled = !open;
    go.textContent = open ? 'Start walking' : 'Locked';
  }
  document.getElementById('pickDots').textContent = CHARACTERS.map((c) => (c === character ? '■' : '□')).join(' ');
  // Face the camera for the preview
  player.group.position.set(0, 0, CONFIG.select.previewZ);
  player.group.scale.setScalar(CONFIG.select.previewScale * CONFIG.playerScale);
}

function showReady() {
  showStory();
}

function updateHud() {
  scoreEl.textContent = Math.floor(score);
  bestEl.textContent = best ? `Best ${best}` : '';
  const open = unlockAt(character) <= best;
  const key = `${character.id}-${coffees}-${open}`;
  if (livesEl.dataset.key !== key) {
    let cups = '';
    if (!open) { livesEl.innerHTML = ''; livesEl.dataset.key = key; return; } // locked: drink stays a secret
    const icon = drinkSvg(character.drink);
    for (let i = 0; i < CONFIG.coffee.max; i++) cups += `<span class="cup ${i < coffees ? 'full' : 'empty'}">${icon}</span>`;
    livesEl.innerHTML = cups;
    livesEl.dataset.key = key;
  }
}

// ---------- Speech bubbles ----------
// Short lines of text that fade in where someone is, stay put, and fade out.
const bubbleLayer = document.getElementById('bubbles');
const HEAD_Y = { runner: 2.2, runClub: 2.2, delivery: 2.6, lime: 2.5, pram: 2.2, dogWalker: 2.2, cargoBike: 2.5, monstera: 2.6, cafe: 2.2 };
const recentLines = [];
const projected = new THREE.Vector3();

// A line nobody has said in a while
function pickLine(list) {
  const fresh = list.filter((l) => !recentLines.includes(l));
  const line = pick(fresh.length ? fresh : list);
  recentLines.push(line);
  if (recentLines.length > 4) recentLines.shift();
  return line;
}

function toScreen(x, y, z) {
  projected.set(x, y, z).project(camera);
  return [(projected.x * 0.5 + 0.5) * window.innerWidth, (-projected.y * 0.5 + 0.5) * window.innerHeight];
}

// Show a line at a fixed spot on screen; returns false if it would overlap one already showing
function say(text, [sx, sy], cls = '') {
  const el = document.createElement('div');
  el.className = `bubble ${cls}`;
  el.textContent = text;
  el.style.animationDuration = `${CONFIG.bubbles.seconds}s`;
  el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
  bubbleLayer.appendChild(el);
  const r = el.getBoundingClientRect();
  for (const other of bubbleLayer.children) {
    if (other === el) continue;
    const o = other.getBoundingClientRect();
    if (r.left < o.right && o.left < r.right && r.top < o.bottom && o.top < r.bottom) {
      el.remove();
      return false;
    }
  }
  setTimeout(() => el.remove(), CONFIG.bubbles.seconds * 1000);
  return true;
}

function clearBubbles() {
  bubbleLayer.replaceChildren();
}

// People say their line once, when they're close enough to read
function updateBubbles() {
  const b = CONFIG.bubbles;
  for (const e of entities) {
    if (!e.line || e.said) continue;
    if (bubbleLayer.children.length >= b.maxAtOnce) return;
    const g = e.model.group.position;
    const inRange = e.fromBehind ? g.z < -3 && g.z > -12 : g.z > b.sayFrom && g.z < b.sayUntil;
    if (!inRange) continue;
    e.said = true;
    say(e.line, toScreen(g.x, HEAD_Y[e.kind] ?? 2.2, g.z), e.fromBehind ? 'shout' : '');
  }
}

function playerSays(list) {
  const pg = player.group.position;
  say(pickLine(list), toScreen(pg.x, 2.4, pg.z), 'player');
}

// Milestone banner: drops in, holds, leaves
const milestoneEl = document.getElementById('milestone');
let milestoneTimer = null;
function celebrate(points) {
  const m = titleFor(points, usedTitles);
  lastTitle = m.title;
  const rush = points % CONFIG.rush.every === 0
    ? `<span class="rush">🔥 ${CONFIG.rush.names[(points / CONFIG.rush.every - 1) % CONFIG.rush.names.length]}: everyone speeds up</span>` : '';
  milestoneEl.innerHTML = `<span class="pts">${points}</span><strong>${m.title}</strong><span class="line">${m.line}</span>${rush}`;
  milestoneEl.classList.remove('show');
  void milestoneEl.offsetWidth; // restart the animation
  milestoneEl.classList.add('show');
  clearTimeout(milestoneTimer);
  milestoneTimer = setTimeout(() => milestoneEl.classList.remove('show'), CONFIG.titles.seconds * 1000);
  fanfare();
}

function floatText(text, cls = '') {
  const el = document.createElement('div');
  el.className = `float ${cls}`;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

// ---------- Spawning ----------
// Each entity knows the time window in which it occupies the spot where you stand.
function spanFor(arrival, hitZ, closingSpeed) {
  const half = hitZ / closingSpeed + CONFIG.fairness.window / 2;
  return [arrival - half, arrival + half];
}

// Fairness rule: never let all 3 lanes be blocked at the same moment.
// Also: never let two things in the same lane visibly pass through each other.
function canPlace(lanes, span, arrival, fromAhead, closing = 0) {
  const f = CONFIG.fairness;
  const blocked = new Set(lanes);
  // A waiting bridge keeps its lanes free of anything that would walk through it
  if (fromAhead && bridgeHold && closing > walkNow() + 0.01 && lanes.some((l) => bridgeHold.lanes.includes(l))) return false;
  // Delivery bikes booked in advance count as already there
  for (const r of reservations) {
    const overlaps = r.span[0] < span[1] && span[0] < r.span[1];
    if (!overlaps) continue;
    if (r.lanes.some((l) => lanes.includes(l))) return false;
    r.lanes.forEach((l) => blocked.add(l));
  }
  for (const e of entities) {
    if (ENEMIES[e.kind].pickup) continue; // coffees don't block anything
    const overlaps = e.span[0] < span[1] && span[0] < e.span[1];
    const sharesLane = e.lanes.some((l) => lanes.includes(l));
    if (overlaps) e.lanes.forEach((l) => blocked.add(l));
    if (!sharesLane) continue;
    if (!fromAhead) {
      if (overlaps) return false; // overtaking bikes need a clear lane
      continue;
    }
    if (e.fromBehind) continue;
    if (Math.abs(e.arrival - arrival) < f.sameLaneGap) return false;
    // Where would the two meet? Only a problem if it's somewhere you can see.
    if (e.closing !== closing) {
      const meetT = (e.closing * e.arrival - closing * arrival) / (e.closing - closing);
      const meetZ = closing * (meetT - arrival);
      if (meetT > elapsed && meetZ > f.visibleZ && meetZ < 2) return false;
    }
  }
  return blocked.size < 3;
}

const spawnCounts = {}; // testing helper: how many of each kind have appeared

// How far away something must appear to reach you in exactly CONFIG.travelTime seconds
const spawnDistance = (closing) => -closing * CONFIG.travelTime;

function addEntity(kind, lanes, { own, hitZ, arrival, span, z, fromBehind = false }) {
  const model = ENEMIES[kind].build(lanes);
  model.group.position.z = z;
  if (fromBehind) model.group.rotation.y = Math.PI;
  scene.add(model.group);
  const e = { kind, model, lanes, own, hitZ, arrival, span, fromBehind, flash: null, said: false };
  e.closing = own + walkNow();
  spawnCounts[kind] = (spawnCounts[kind] || 0) + 1;
  const lines = LINES[fromBehind ? `${kind}Overtake` : kind];
  e.line = lines && Math.random() < CONFIG.bubbles.chance ? pickLine(lines) : null;
  entities.push(e);
  return e;
}

// Try to place an oncoming thing; returns how many lanes it took (0 if it didn't fit)
function spawnAhead(kind, cfg = CONFIG.enemies[kind], options = null) {
  const closing = cfg.speed + walkNow();
  const arrival = elapsed + CONFIG.travelTime;
  const span = spanFor(arrival, cfg.hitZ, closing);
  options ||= ENEMIES[kind].width === 2 ? [[0, 1], [1, 2]] : [[0], [1], [2]];

  for (const lanes of shuffle([...options])) {
    if (canPlace(lanes, span, arrival, true, closing)) {
      addEntity(kind, lanes, { own: cfg.speed, hitZ: cfg.hitZ, arrival, span, z: spawnDistance(closing) });
      return lanes.length;
    }
  }
  return 0;
}

// The next Hackney special. Each appears once, then the list reshuffles.
function spawnSpecial() {
  if (!specialsPool.length) specialsPool = shuffle(Object.keys(CONFIG.specials.kinds));
  const kind = specialsPool[specialsPool.length - 1];
  const cfg = CONFIG.specials.kinds[kind];

  if (!spawnAhead(kind, cfg)) return false;
  specialsPool.pop();
  return true;
}

// Every 500 points: the narrowboat café, with a coffee waiting by the hatch.
// The café is moored on the canal side, so its queue is always in lane 0.
function spawnCafe() {
  if (!spawnAhead('cafe', CONFIG.cafe, [[0]])) return false;
  const arrival = elapsed + CONFIG.travelTime;
  addEntity('coffee', [1], { own: 0, hitZ: 0.6, arrival, span: [arrival, arrival], z: spawnDistance(walkNow()) + 0.5 });
  return true;
}

function pickKind() {
  const available = Object.entries(CONFIG.enemies).filter(([, c]) => elapsed >= c.from);
  let roll = Math.random() * available.reduce((sum, [, c]) => sum + c.weight, 0);
  for (const [kind, c] of available) {
    roll -= c.weight;
    if (roll <= 0) return kind;
  }
  return available[0][0];
}

function spawnWave() {
  const s = CONFIG.spawn;
  const p = progress();
  const r = CONFIG.rush;
  const double = Math.min(r.maxDouble, lerp(s.doubleChanceStart, s.doubleChanceMax, p) + r.doubleStep * rushLevel);
  const wanted = Math.random() < double ? 2 : 1;

  let lanesUsed = 0;
  for (let tries = 0; tries < 3 && lanesUsed < wanted; tries++) {
    // Something that didn't fit last time gets first go, so the mix stays as configured
    const kind = tries === 0 && waitingKind ? waitingKind : pickKind();
    if (kind === waitingKind) waitingKind = null;
    // Two-lane groups (dog walkers, run clubs) can be a whole wave on their own
    const room = lanesUsed === 0 ? 2 : wanted - lanesUsed;
    if (ENEMIES[kind].width > room) continue;
    const used = spawnAhead(kind);
    if (!used && !waitingKind) waitingKind = kind;
    lanesUsed += used;
    if (kind === 'runClub' && used) maybeStartConvoy();
    if (used === 2) break;
  }

  const gap = lerp(s.startGap, s.minGap, p);
  spawnTimer = gap * (0.8 + Math.random() * 0.4) + (lanesUsed >= 2 ? s.extraGapAfterDouble : 0);
}

// Later in the run, a run club brings friends: more packs in alternating lanes, so you weave
function maybeStartConvoy() {
  const c = CONFIG.runClubConvoy;
  if (elapsed < c.from || convoy.length || Math.random() > c.chance) return;
  const last = entities[entities.length - 1].lanes;
  for (let i = 1; i < c.packs; i++) {
    const flip = i % 2 === 1;
    const lanes = flip ? (last[0] === 0 ? [1, 2] : [0, 1]) : last;
    convoy.push({ at: elapsed + i * c.gap, lanes });
  }
}

function spawnBridge() {
  const b = CONFIG.bridge;
  const p = progress();
  const lanes = bridgeHold?.lanes ?? (Math.random() < lerp(b.twoLaneChanceStart, b.twoLaneChanceMax, p) ? [1, 2] : [2]);
  const arrival = elapsed + CONFIG.travelTime;
  const span = spanFor(arrival, b.hitZ, walkNow());
  if (!canPlace(lanes, span, arrival, true, walkNow())) {
    bridgeHold = { lanes }; // keep its lanes clear of new arrivals until it fits
    return false;
  }
  bridgeHold = null;
  addEntity('bridge', lanes, { own: 0, hitZ: b.hitZ, arrival, span, z: spawnDistance(walkNow()) });
  return true;
}

// Something overtaking you from behind (a Lime or a delivery e-bike), with a warning
function spawnBehind(kind, { speed, hitZ, warn, sameLaneAsYou = 0.6 }, bookedLane) {
  const gain = speed - walkNow();
  const arrival = elapsed + warn;
  const span = spanFor(arrival, hitZ, gain);

  const preferred = Math.random() < sameLaneAsYou ? [lane] : [];
  const laneIdx = bookedLane ?? [...preferred, ...shuffle([0, 1, 2])].find((l) => canPlace([l], span, arrival, false));
  if (laneIdx === undefined) return false;

  const e = addEntity(kind, [laneIdx], {
    own: -speed, hitZ, arrival, span, z: gain * warn + 0.5, fromBehind: true,
  });
  e.gain = gain;

  // Flashing red strip on the lane they'll come through
  e.flash = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.lanes[2] * 0.9, 18),
    new THREE.MeshBasicMaterial({ color: 0xff2d2d, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  e.flash.rotation.x = -Math.PI / 2;
  e.flash.position.set(CONFIG.lanes[laneIdx], 0.02, -7);
  scene.add(e.flash);
  if (kind === 'delivery') whineSound();
  else bell();
  return true;
}

// Delivery bikes are booked a whole travel-time ahead, so everything spawned after them leaves
// room. Otherwise, on a busy towpath, there's rarely a fair gap for the fastest thing on it.
function bookDelivery() {
  const d = CONFIG.delivery;
  const arrival = elapsed + CONFIG.travelTime;
  const span = spanFor(arrival, d.hitZ, d.speed - walkNow());
  const l = shuffle([0, 1, 2]).find((x) => canPlace([x], span, arrival, false));
  if (l === undefined) return false;
  reservations.push({ lanes: [l], span, arrival, at: arrival - d.warn });
  return true;
}

// Late in the run, a delivery rider may dart into another lane just before reaching you.
// Only into a lane that keeps a way through, and the red flash moves with them.
function maybeSwerve(e) {
  const d = CONFIG.delivery;
  if (e.kind !== 'delivery' || e.swerveChecked || elapsed < d.swerveFrom) return;
  if (e.model.group.position.z > e.gain * d.swerveAt + 0.5) return;
  e.swerveChecked = true;
  if (Math.random() > d.swerveChance) return;
  const others = entities;
  entities = entities.filter((o) => o !== e);
  const options = shuffle([e.lanes[0] - 1, e.lanes[0] + 1].filter((l) => l >= 0 && l <= 2));
  const to = options.find((l) => canPlace([l], e.span, e.arrival, false));
  entities = others;
  if (to === undefined) return;
  e.lanes = [to];
  if (e.flash) e.flash.position.x = CONFIG.lanes[to];
  bell();
}

function removeFlash(e) {
  if (e.flash) {
    scene.remove(e.flash);
    e.flash.geometry.dispose();
    e.flash.material.dispose();
    e.flash = null;
  }
}

function removeEntity(e) {
  scene.remove(e.model.group);
  removeFlash(e);
  e.model.dispose?.();
}

// Once an overtaking bike has passed you, it weaves around whatever is ahead of it
function steerOvertaker(e, dt) {
  const z = e.model.group.position.z;
  const blockedAhead = (l) => entities.some((o) => o !== e && o.lanes.includes(l)
    && o.model.group.position.z < z && o.model.group.position.z > z - 10);
  if (z < -1.5 && blockedAhead(e.lanes[0])) {
    const free = [0, 1, 2].find((l) => !blockedAhead(l));
    if (free !== undefined) e.lanes = [free];
  }
  const x = e.model.group.position.x;
  e.model.group.position.x += (CONFIG.lanes[e.lanes[0]] - x) * Math.min(1, dt * 6);
}

// ---------- Hits ----------
function spillCoffee() {
  const c = CONFIG.coffee;
  coffees--;
  setCoffee(player, coffees);
  invulnUntil = elapsed + c.invulnerable;
  spilledAt = elapsed;
  score = Math.max(0, score - c.spillPenalty);
  spillSound();
  floatText(`☕ SPILLED! −${c.spillPenalty}`, 'bad');
  playerSays(LINES.spill);

  // Splash of coffee
  const pos = player.group.position;
  for (let i = 0; i < 12; i++) {
    const drop = box(0.1, 0.1, 0.1, character.drink.splash, pos.x + 0.3, 1.1, pos.z - 0.2);
    drop.userData.v = new THREE.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4);
    drop.userData.life = 1;
    scene.add(drop);
    particles.push(drop);
  }
  updateHud();
}

function hit(e) {
  if (coffees > 0) spillCoffee();
  else gameOver(e);
}

function collectCoffee(e) {
  removeEntity(e);
  entities = entities.filter((o) => o !== e);
  if (coffees >= CONFIG.coffee.max) {
    score += CONFIG.cafe.bonusIfFull;
    floatText(`+${CONFIG.cafe.bonusIfFull} ☕ EXTRA SHOT`);
  } else {
    coffees++;
    setCoffee(player, coffees);
    floatText('☕ REFILL! £4.80');
    playerSays(LINES.refill);
  }
  pickupSound();
  updateHud();
}

// ---------- Game flow ----------
function reset() {
  world.reset();
  for (const e of entities) removeEntity(e);
  for (const d of particles) scene.remove(d);
  entities = [];
  particles = [];
  lane = 1;
  elapsed = 0;
  score = 0;
  coffees = CONFIG.coffee.start;
  nextCafeAt = CONFIG.cafe.first;
  cafesServed = 0;
  rushLevel = 0;
  nextRushAt = CONFIG.rush.every;
  bridgeHold = null;
  reservations = [];
  prevLane = 1;
  lastMoveAt = -99;
  lastCloseCallAt = -99;
  nextTitleAt = CONFIG.titles.every;
  lastTitle = null;
  usedTitles.clear();
  milestoneEl.classList.remove('show');
  invulnUntil = 0;
  spilledAt = -99;
  setCoffee(player, coffees);
  spawnTimer = CONFIG.spawn.firstWaveDelay;
  behindTimer = CONFIG.overtaking.from;
  deliveryTimer = CONFIG.delivery.from;
  convoy = [];
  waitingKind = null;
  bridgeTimer = CONFIG.bridge.from;
  specialTimer = CONFIG.specials.from;
  specialsPool = [];
  player.group.position.set(CONFIG.lanes[1], 0, 0);
  player.group.rotation.set(0, Math.PI, 0);
  player.group.scale.setScalar(CONFIG.playerScale);
  player.group.visible = true;
  warningEl.classList.add('hidden');
  clearBubbles();
  updateHud();
}

// Fill the towpath before you start, so there's something to dodge straight away.
// Runs the spawner for a few seconds of game time, then rewinds the clock.
function prewarm(seconds) {
  const step = 1 / 30;
  for (let t = 0; t < seconds; t += step) {
    elapsed += step;
    spawnTimer -= step;
    if (spawnTimer <= 0) spawnWave();
    for (const e of entities) e.model.group.position.z += (e.own + CONFIG.walkSpeed) * step;
  }
  for (const e of entities) {
    e.arrival -= elapsed;
    e.span = e.span.map((v) => v - elapsed);
  }
  elapsed = 0;
}

function start() {
  if (state === 'playing') return;
  if (!isUnlocked(character)) {
    if (state === 'select') return; // the button says Locked
    setCharacter(CHARACTERS.find(isUnlocked));
  }
  if (state === 'over' && performance.now() - overAt < 900) return; // no accidental instant restarts
  clearTimeout(overlayTimer);
  initAudio();
  startMusic();
  reset();
  prewarm(CONFIG.spawn.prewarmSeconds);
  state = 'playing';
  overlay.classList.add('hidden');
}

function gameOver(e) {
  state = 'over';
  overAt = performance.now();
  stopMusic();
  gameOverJingle();
  clearBubbles();
  milestoneEl.classList.remove('show');
  crashSound();
  player.group.visible = true;
  warningEl.classList.add('hidden');
  const type = ENEMIES[e.kind];
  const message = pick(e.fromBehind ? [...type.behindDeaths, ...type.deaths] : type.deaths);

  const final = Math.floor(score);
  runLog.push({
    score: final, kind: e.kind, behind: e.fromBehind, seconds: Math.round(elapsed), fair: autopilotFair?.(),
    lane, px: +player.group.position.x.toFixed(2), coffees,
    near: entities.filter((o) => Math.abs(o.model.group.position.z) < 8)
      .map((o) => `${o.kind}${o.fromBehind ? '(behind)' : ''} L${o.lanes.join('')} z${o.model.group.position.z.toFixed(1)}`),
  });
  const isRecord = final > best;
  const before = best;
  if (isRecord) { best = final; saveBest(best); }
  const unlocked = CHARACTERS.filter((c) => unlockAt(c) > before && unlockAt(c) <= best);
  updateHud();
  overlayTimer = setTimeout(() => {
    showOverlay(`
      ${unlocked.map((c) => `<p class="unlock">🎉 ${c.unlockLine}</p>`).join('')}
      <p class="small label">Cause of death</p>
      <h2>${message}</h2>
      <p class="big">${final}</p>
      ${lastTitle ? `<p class="small last-title">Last title: <b>${lastTitle}</b></p>` : ''}
      <p class="small">${isRecord ? '🎉 New personal best!' : `Best ${best}`}</p>
      <div id="board"></div>
      <button>Try again</button>
      <button class="secondary">Change walker</button>
    `);
    overlay.querySelector('.secondary').addEventListener('click', showSelect);
    if (unlocked.length) fanfare();
    if (leaderboardEnabled()) showLeaderboard(final);
  }, 700);
}

// ---------- Leaderboard ----------
const esc = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function savedName() {
  try { return localStorage.getItem('canal-name') || ''; } catch { return ''; }
}

function boardRow(rank, name, walker, score, cls = '') {
  return `<li class="${cls}">
    <span class="rank">${rank}</span>
    <span class="who">${esc(name)}</span>
    <span class="walker">${walker ? drinkSvg(characterById(walker).drink) : ''}</span>
    <span class="pts">${Number(score)}</span>
  </li>`;
}

// The top 10 (one per name), plus "you": inside the list if you made it, otherwise under a "…"
// `you` is either a preview of this run ({ preview, rank, score, walker }) or your posted best ({ name, rank, score, walker })
function renderBoard(top, you) {
  const list = document.getElementById('boardList');
  if (!list) return;
  const entries = top.map((r) => ({ ...r }));
  if (you.preview && you.rank <= 10) {
    entries.splice(you.rank - 1, 0, { name: 'THIS RUN', walker: you.walker, score: you.score, ghost: true });
    entries.length = Math.min(entries.length, 10);
  }
  let shown = false;
  const rows = entries.map((r, i) => {
    const mine = !you.preview && r.name === you.name;
    if (mine || r.ghost) shown = true;
    return boardRow(i + 1, r.name, r.walker, r.score, r.ghost ? 'ghost' : mine ? 'me' : '');
  });
  if (!shown) {
    rows.push('<li class="gap">…</li>');
    rows.push(boardRow(you.rank, you.preview ? 'THIS RUN' : you.name, you.walker, you.score, you.preview ? 'ghost' : 'me'));
  }
  list.innerHTML = rows.join('');
}

// Game over: show the top 10 straight away with where this run lands, and a one-tap way to post it
async function showLeaderboard(final) {
  const board = document.getElementById('board');
  board.innerHTML = `
    <p class="small label board-title">Top 10</p>
    <ol class="top10" id="boardList"><li class="gap">Loading…</li></ol>
    <form class="post">
      <input id="nameInput" maxlength="12" placeholder="YOUR NAME" autocomplete="off" spellcheck="false" value="${esc(savedName())}">
      <button type="submit" class="post-btn">Post score</button>
    </form>
    <p class="small board-msg"></p>
  `;
  const form = board.querySelector('form');
  const input = board.querySelector('input');
  const msg = board.querySelector('.board-msg');
  input.addEventListener('input', () => { input.value = input.value.toUpperCase(); });

  try {
    const [top, rank] = await Promise.all([topScores(10), rankOf(final)]);
    renderBoard(top, { preview: true, rank, score: final, walker: character.id });
    msg.textContent = rank <= 10 ? `This run would be #${rank}! Post it.` : `This run would be #${rank}.`;
  } catch {
    const list = document.getElementById('boardList');
    if (list) list.innerHTML = '<li class="gap">Couldn\'t load the leaderboard.</li>';
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = cleanName(input.value);
    if (!name) {
      msg.textContent = 'Try another name.';
      return;
    }
    form.querySelector('button').disabled = true;
    msg.textContent = 'Posting…';
    try {
      try { localStorage.setItem('canal-name', name); } catch { /* storage unavailable */ }
      await submitScore(name, final, character.id, Math.max(1, Math.round(elapsed)));
      const mine = (await bestOf(name)) || { score: final, walker: character.id };
      const [rank, top] = await Promise.all([rankOf(mine.score), topScores(10)]);
      renderBoard(top, { name, rank, score: mine.score, walker: mine.walker });
      form.remove();
      msg.textContent = mine.score > final
        ? `Posted! Your best is still ${mine.score} (#${rank}).`
        : rank <= 10 ? `🏆 You're #${rank}!` : `You're #${rank}. Keep walking.`;
    } catch {
      msg.textContent = 'Couldn\'t reach the leaderboard. Try again?';
      form.querySelector('button').disabled = false;
    }
  });
}

// ---------- Input ----------
function move(dir) {
  if (state !== 'playing') return;
  const to = Math.max(0, Math.min(2, lane + dir));
  if (to === lane) return;
  prevLane = lane;
  lastMoveAt = elapsed;
  lane = to;
}

// Got out of someone's way at the very last moment? That's a close call.
function checkCloseCall(e) {
  if (e.passed || ENEMIES[e.kind].pickup || e.own === 0) return; // only moving things count (not bridges or queues)
  const z = e.model.group.position.z;
  const passed = e.fromBehind ? z < -e.hitZ : z > e.hitZ;
  if (!passed) return;
  e.passed = true;
  const c = CONFIG.closeCall;
  if (elapsed - lastMoveAt < c.window && e.lanes.includes(prevLane) && !e.lanes.includes(lane)
      && elapsed >= invulnUntil && elapsed - lastCloseCallAt > c.cooldown) {
    lastCloseCallAt = elapsed;
    score += c.points;
    floatText(`+${c.points} CLOSE CALL!`, 'close');
    closeCallSound();
  }
}

const muteBtn = document.getElementById('mute');
function showMute() {
  muteBtn.textContent = isMuted() ? '♪ OFF' : '♪ ON';
}
// Browsers only allow sound after the first click/tap/key, so the music starts then,
// on the intro screens, giving people the chance to mute it before they play
function wakeAudio() {
  initAudio();
  startMusic();
}
window.addEventListener('pointerdown', wakeAudio, { once: true });
window.addEventListener('keydown', wakeAudio, { once: true });

const sfxBtn = document.getElementById('sfx');
function showSfx() {
  sfxBtn.textContent = isSfxMuted() ? 'SFX OFF' : 'SFX ON';
}
sfxBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleSfx();
  showSfx();
  sfxBtn.blur();
});
showSfx();

muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleMute();
  showMute();
  muteBtn.blur();
});
showMute();

window.addEventListener('keydown', (e) => {
  if (e.repeat || e.target.tagName === 'INPUT') return; // typing your name isn't playing
  if (e.key === 'm' || e.key === 'M') { toggleMute(); showMute(); return; }
  if (state === 'select') {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') browse(-1);
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') browse(1);
    else if (e.key === ' ' || e.key === 'Enter') start();
    return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move(-1);
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move(1);
  else if ((e.key === ' ' || e.key === 'Enter') && state !== 'playing') start();
});

let touchStart = null;
window.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });
window.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
    if (state === 'select') browse(dx > 0 ? 1 : -1);
    else move(dx > 0 ? 1 : -1);
  }
  touchStart = null;
}, { passive: true });

// ---------- Main loop ----------
const clock = new THREE.Clock();

function updateWarning(t) {
  // The overtaking bike closest to reaching you drives the banner
  let nearest = null;
  for (const e of entities) {
    if (!e.flash) continue;
    if (e.model.group.position.z < 0.6) {
      removeFlash(e); // it has reached you: warning over
      continue;
    }
    e.flash.material.opacity = 0.25 + 0.2 * Math.sin(t * 22);
    if (!nearest || e.model.group.position.z < nearest.model.group.position.z) nearest = e;
  }

  if (!nearest) {
    warningEl.classList.add('hidden');
    return;
  }
  const bikeLane = nearest.lanes[0];
  const side = bikeLane < lane ? 'ON YOUR LEFT!' : bikeLane > lane ? 'ON YOUR RIGHT!' : 'BEHIND YOU!';
  const isDelivery = nearest.kind === 'delivery';
  warningEl.textContent = isDelivery ? `🛵 DELIVERY! ${side}` : `🔔 ${side}`;
  warningEl.classList.toggle('danger', bikeLane === lane || isDelivery);
  warningEl.classList.remove('hidden');
}

let paused = false;  // testing helper
let simSpeed = 1;    // testing helper: run the game several steps per frame
let autopilot = null; // testing helper: a bot that plays
let autopilotFair = null;
let autoRuns = 0;
const runLog = [];

function tick() {
  const dt = paused ? 0 : Math.min(clock.getDelta(), 0.05);
  for (let i = 0; i < simSpeed; i++) step(dt, clock.elapsedTime + i * dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function step(dt, t) {
  if (autopilot && state === 'playing') autopilot(dt);
  if (autopilot && state === 'over' && autoRuns > 0) { autoRuns--; overAt = 0; start(); }
  if (autopilot && state === 'over' && autoRuns <= 0) { autopilot = null; simSpeed = 1; }
  if (state === 'playing') {
    elapsed += dt;
    setMusicIntensity(Math.min(1, progress() * 0.7 + rushLevel * 0.1));
    const walk = walkNow() * speedFactor();
    score += walk * dt;
    world.scroll(walk * dt);

    // Slide towards the chosen lane, leaning into the move
    const targetX = CONFIG.lanes[lane];
    const pg = player.group;
    pg.position.x += (targetX - pg.position.x) * Math.min(1, dt * CONFIG.laneChangeSharpness);
    pg.rotation.z = (targetX - pg.position.x) * 0.12;
    animateWalk(player, t, 9 * speedFactor());

    // Blink while safe after a spill
    pg.visible = elapsed < invulnUntil ? Math.floor(t * 12) % 2 === 0 : true;

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnWave();
      spawnTimer = rushGap(spawnTimer);
    }

    behindTimer -= dt;
    if (behindTimer <= 0) {
      const o = CONFIG.overtaking;
      spawnBehind('lime', { speed: o.speed, hitZ: o.hitZ, warn: lerp(o.warnStart, o.warnMin, progress()), sameLaneAsYou: o.sameLaneAsYou });
      behindTimer = rushGap(lerp(o.gapStart, o.gapMin, progress()) * (0.8 + Math.random() * 0.4));
    }

    deliveryTimer -= dt;
    if (deliveryTimer <= 0) {
      const d = CONFIG.delivery;
      deliveryTimer = bookDelivery() ? rushGap(lerp(d.gapStart, d.gapMin, progress()) * (0.8 + Math.random() * 0.4)) : 0.5;
    }
    for (const r of reservations.filter((x) => elapsed >= x.at)) {
      spawnBehind('delivery', CONFIG.delivery, r.lanes[0]);
      reservations = reservations.filter((x) => x !== r);
    }

    while (convoy.length && elapsed >= convoy[0].at) {
      spawnAhead('runClub', CONFIG.enemies.runClub, [convoy.shift().lanes]);
    }

    bridgeTimer -= dt;
    if (bridgeTimer <= 0) {
      const b = CONFIG.bridge;
      bridgeTimer = spawnBridge() ? rushGap(lerp(b.gapStart, b.gapMin, progress()) * (0.8 + Math.random() * 0.4)) : 0.5;
    }

    if (score >= nextCafeAt && spawnCafe()) {
      cafesServed++;
      nextCafeAt += CONFIG.cafe.gap + CONFIG.cafe.growth * (cafesServed - 1);
    }
    if (score >= nextRushAt) {
      rushLevel++;
      nextRushAt += CONFIG.rush.every;
    }
    if (score >= nextTitleAt) {
      celebrate(nextTitleAt);
      nextTitleAt += CONFIG.titles.every;
    }

    specialTimer -= dt;
    if (specialTimer <= 0) {
      const sp = CONFIG.specials;
      specialTimer = spawnSpecial() ? rushGap(lerp(sp.gapStart, sp.gapMin, progress()) * (0.8 + Math.random() * 0.4)) : 0.5;
    }

    for (const e of entities) {
      const g = e.model.group;
      g.position.z += (e.own + walk) * dt;
      ENEMIES[e.kind].animate(e.model, t);
      if (e.fromBehind) { maybeSwerve(e); steerOvertaker(e, dt); }
      if (!e.model.fade) g.visible = g.position.z < CONFIG.hideNearCameraZ; // don't block the view
      checkCloseCall(e);
      // Bridges fade as they pass the camera so they don't block the view
      if (e.model.fade) e.model.fade(Math.max(0, Math.min(1, 1 - (g.position.z - 0.5) / 3)));
    }
    updateWarning(t);
    updateBubbles();

    for (const e of entities) {
      const dz = Math.abs(e.model.group.position.z - pg.position.z);
      const inLane = e.lanes.some((l) => Math.abs(CONFIG.lanes[l] - pg.position.x) < CONFIG.hitX);
      if (dz >= e.hitZ || !inLane) continue;
      if (ENEMIES[e.kind].pickup) {
        collectCoffee(e);
        break;
      }
      if (elapsed >= invulnUntil) {
        hit(e);
        break;
      }
    }

    entities = entities.filter((e) => {
      const z = e.model.group.position.z;
      const gone = e.fromBehind ? z < CONFIG.farZ : z > CONFIG.despawnZ + 6;
      if (gone) {
        removeEntity(e);
        return false;
      }
      return true;
    });

    updateHud();
  } else if (state === 'over') {
    // Topple over backwards
    player.group.rotation.x += (-1.4 - player.group.rotation.x) * Math.min(1, dt * 8);
  } else if (state === 'select') {
    player.group.rotation.y += dt * 0.9; // slow turntable
    animateWalk(player, t, 3);
  } else {
    animateWalk(player, t, 3);
  }

  // Coffee droplets
  particles = particles.filter((d) => {
    d.userData.life -= dt;
    d.userData.v.y -= 12 * dt;
    d.position.addScaledVector(d.userData.v, dt);
    if (d.userData.life <= 0 || d.position.y < 0) {
      scene.remove(d);
      return false;
    }
    return true;
  });

}

reset();
showReady();
tick();

// Testing bot: dodges like a decent human (sees what's coming, reacts after a short delay).
// Also notes whether each death was avoidable, to catch unfair situations.
function makeAutopilot({ reaction = 0.2, safe = 1.3 } = {}) {
  let cooldown = 0;
  const history = [];
  function danger(l) {
    let t = Infinity;
    const walk = walkNow() * speedFactor();
    for (const e of entities) {
      if (ENEMIES[e.kind].pickup || !e.lanes.includes(l)) continue;
      const z = e.model.group.position.z;
      if (!e.fromBehind) {
        if (z > e.hitZ) continue;
        t = Math.min(t, Math.max(0, (-z - e.hitZ) / (e.own + walk)));
      } else if (z > -e.hitZ) {
        t = Math.min(t, Math.max(0, (z - e.hitZ) / -(e.own + walk)));
      }
    }
    return t;
  }
  autopilotFair = () => {
    // Was there a lane with room to escape about 0.8s before the hit?
    const then = history.find((h) => h.t >= elapsed - 0.8);
    return then ? Math.max(...then.d) > 0.5 : true;
  };
  return (dt) => {
    const d = [0, 1, 2].map(danger);
    history.push({ t: elapsed, d });
    while (history.length && history[0].t < elapsed - 2) history.shift();
    cooldown -= dt;
    if (cooldown > 0) return;
    let target = lane;
    if (d[lane] < safe) {
      let bestScore = d[lane];
      for (const l of [0, 1, 2]) {
        if (l === lane) continue;
        // Crossing a lane only takes a moment, so the lane in between just needs a little room
        const mid = (l + lane) / 2;
        const score = Number.isInteger(mid) && mid !== l && d[mid] < 0.4 ? Math.min(d[mid], d[l]) : d[l];
        if (score > bestScore + 0.05) { target = l; bestScore = score; }
      }
    } else {
      const coffee = entities.find((e) => ENEMIES[e.kind].pickup && e.model.group.position.z > -25);
      if (coffee && coffees < CONFIG.coffee.max && d[coffee.lanes[0]] > safe) target = coffee.lanes[0];
    }
    if (target !== lane) {
      move(Math.sign(target - lane));
      cooldown = reaction;
    }
  };
}

// Developer helper: open the game with ?debug in the URL to inspect it from the browser console.
// Only on this computer (localhost), never on the live site, so nobody can cheat with it.
const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
if (isLocal && new URLSearchParams(location.search).has('debug')) {
  window.models = { makeCargoBike, ENEMIES, GAGS, makeNarrowboat, addPosters };
  window.debug = {
    get state() { return { state, elapsed, score, lane, coffees }; },
    get entities() { return entities.map((e) => ({ kind: e.kind, lanes: e.lanes, z: Math.round(e.model.group.position.z) })); },
    skip(seconds) { elapsed += seconds; },
    godMode() { invulnUntil = Infinity; },
    landmark(kind) { world.forceNext = kind; },
    gag(kind) { world.forceGag = kind; },
    special(kind) { specialsPool = [kind]; specialTimer = 0; },
    delivery() { deliveryTimer = 0; },
    cafe() { nextCafeAt = score; },
    get rush() { return { rushLevel, speed: rushSpeed(), nextCafeAt }; },
    title() { nextTitleAt = Math.ceil((score + 1) / CONFIG.titles.every) * CONFIG.titles.every; score = nextTitleAt; },
    get counts() { return { ...spawnCounts }; },
    // ---- Promo stills (dev only) ----
    // Everything a staging script needs: the scene, the walker, the builders
    get rig() { return { scene, camera, player, CONFIG, ENEMIES, GAGS, CHARACTERS, setCharacter, makePlayer, setCoffee, animateWalk }; },
    clearPath() {
      for (const e of entities) removeEntity(e);
      entities = [];
      clearBubbles();
      warningEl.classList.add('hidden');
    },
    // Render the 3D scene at an exact size (no HUD), with an optional camera override
    capture(w, h, cameraOverride) {
      const pixelRatio = renderer.getPixelRatio();
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const c = cameraOverride || (camera.aspect < 0.8 ? CONFIG.cameraPortrait : cam);
      camera.position.set(c.x, c.y, c.z);
      camera.lookAt(c.lookX ?? 0, c.lookY, c.lookZ);
      camera.fov = c.fov;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      out.getContext('2d').drawImage(renderer.domElement, 0, 0);
      renderer.setPixelRatio(pixelRatio);
      resize();
      return out;
    },
    get runs() { return runLog; },
    bell() { initAudio(); bell(); },
    // Let the bot play `runs` games at `speed`x; read the results from debug.runs
    autoplay({ runs = 5, speed = 4, reaction = 0.2, safe = 1.3 } = {}) {
      autopilot = makeAutopilot({ reaction, safe });
      autoRuns = runs - 1;
      simSpeed = speed;
      if (state !== 'playing') { overAt = 0; start(); }
    },
    // Show one model on its own, straight ahead, for design reviews
    // All walkers side by side, facing the camera (front) or away (back), for design reviews
    lineup(front = true) {
      for (const e of entities) removeEntity(e);
      entities = [];
      paused = true;
      player.group.position.x = 50;
      scene.children.filter((o) => o.userData.lineup).forEach((o) => scene.remove(o));
      CHARACTERS.forEach((c, i) => {
        const p = makePlayer(c);
        setCoffee(p, 1);
        animateWalk(p, 0, 0);
        p.group.userData.lineup = true;
        p.group.position.set((i - (CHARACTERS.length - 1) / 2) * 1.25, 0, -2.5);
        p.group.rotation.y = front ? 0.25 * Math.sign(i - 2.5) * -1 : Math.PI;
        scene.add(p.group);
      });
    },
    showcase(build, z = -11) {
      for (const e of entities) removeEntity(e);
      entities = [];
      paused = true;
      player.group.position.x = 50; // out of shot
      const m = build();
      m.group.position.set(0, 0, z);
      scene.add(m.group);
      return m;
    },
    pause(on = true) { paused = on; clock.getDelta(); },
  };
}
