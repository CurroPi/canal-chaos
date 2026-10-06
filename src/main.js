// The game: walking, dodging, spilling, dying.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createWorld } from './world.js';
import { makePlayer, animateWalk, setCoffee, box } from './models.js';
import { ENEMIES } from './enemies.js';
import { initAudio, bell, spillSound, crashSound, pickupSound } from './sound.js';
import { LINES } from './lines.js';

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
  // Widen the view on tall phone screens so all three lanes fit
  camera.fov = Math.min(95, cam.fov * Math.max(1, 0.75 / camera.aspect));
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const world = createWorld(scene, CONFIG);
const player = makePlayer();
scene.add(player.group);

// ---------- Game state ----------
let state = 'ready'; // 'ready' | 'playing' | 'over'
let lane = 1;
let elapsed = 0;
let score = 0;
let spawnTimer = 0;
let behindTimer = 0;
let bridgeTimer = 0;
let specialTimer = 0;
let specialsPool = [];
let entities = [];
let particles = [];
let hasCoffee = true;
let invulnUntil = 0;
let spilledAt = -99;
let best = loadBest();
let overAt = 0;
let overlayTimer = null;

const lerp = (a, b, t) => a + (b - a) * t;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const shuffle = (list) => list.sort(() => Math.random() - 0.5);
const progress = () => Math.min(1, elapsed / CONFIG.spawn.rampSeconds);

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

function showOverlay(html) {
  overlay.innerHTML = `<div class="card">${html}</div>`;
  overlay.classList.remove('hidden');
  overlay.querySelector('button')?.addEventListener('click', start);
}

function showReady() {
  showOverlay(`
    <h1>Canal Game</h1>
    <p class="small">Prototype · Victoria Park, Saturday, 11am</p>
    <p>Dodge runners, Lime bikes, dog leads, prams and bridges.<br>Listen for bells behind you. 🔔</p>
    <p class="small">← → or A / D to change lane · swipe on phones<br>☕ Your coffee is your extra life.</p>
    <button>Start walking</button>
  `);
}

function updateHud() {
  scoreEl.textContent = Math.floor(score);
  bestEl.textContent = best ? `Best ${best}` : '';
  livesEl.innerHTML = hasCoffee ? '☕' : '<span class="spilled">☕</span>';
}

// ---------- Speech bubbles ----------
// Short lines of text that fade in where someone is, stay put, and fade out.
const bubbleLayer = document.getElementById('bubbles');
const HEAD_Y = { runner: 2.2, lime: 2.5, pram: 2.2, dogWalker: 2.2, cargoBike: 2.5, monstera: 2.6, cafe: 2.2 };
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
function canPlace(lanes, span, arrival, fromAhead) {
  const blocked = new Set(lanes);
  for (const e of entities) {
    if (ENEMIES[e.kind].pickup) continue; // coffees don't block anything
    const overlaps = e.span[0] < span[1] && span[0] < e.span[1];
    const sharesLane = e.lanes.some((l) => lanes.includes(l));
    if (overlaps) e.lanes.forEach((l) => blocked.add(l));
    if (fromAhead) {
      // Don't let something faster catch up with (and pass through) something in its lane
      if (!e.fromBehind && sharesLane && e.arrival > arrival - CONFIG.fairness.sameLaneGap) return false;
    } else if (overlaps && sharesLane) {
      return false; // overtaking bikes need a clear lane
    }
  }
  return blocked.size < 3;
}

function addEntity(kind, lanes, { own, hitZ, arrival, span, z, fromBehind = false }) {
  const model = ENEMIES[kind].build(lanes);
  model.group.position.z = z;
  if (fromBehind) model.group.rotation.y = Math.PI;
  scene.add(model.group);
  const e = { kind, model, lanes, own, hitZ, arrival, span, fromBehind, flash: null, said: false };
  const lines = LINES[fromBehind ? 'limeOvertake' : kind];
  e.line = lines && Math.random() < CONFIG.bubbles.chance ? pickLine(lines) : null;
  entities.push(e);
  return e;
}

// Try to place an oncoming thing; returns how many lanes it took (0 if it didn't fit)
function spawnAhead(kind, cfg = CONFIG.enemies[kind], options = null) {
  const closing = cfg.speed + CONFIG.walkSpeed;
  const arrival = elapsed + -CONFIG.spawnZ / closing;
  const span = spanFor(arrival, cfg.hitZ, closing);
  options ||= ENEMIES[kind].width === 2 ? [[0, 1], [1, 2]] : [[0], [1], [2]];

  for (const lanes of shuffle([...options])) {
    if (canPlace(lanes, span, arrival, true)) {
      addEntity(kind, lanes, { own: cfg.speed, hitZ: cfg.hitZ, arrival, span, z: CONFIG.spawnZ });
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

  // The café is moored on the canal side, so its queue is always in lane 0
  if (!spawnAhead(kind, cfg, kind === 'cafe' ? [[0]] : null)) return false;
  specialsPool.pop();

  if (kind === 'cafe') {
    // A coffee waiting by the hatch, in the lane next to the queue
    const arrival = elapsed + -CONFIG.spawnZ / CONFIG.walkSpeed;
    addEntity('coffee', [1], { own: 0, hitZ: 0.6, arrival, span: [arrival, arrival], z: CONFIG.spawnZ + 0.5 });
  }
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
  const wanted = Math.random() < lerp(s.doubleChanceStart, s.doubleChanceMax, p) ? 2 : 1;

  let lanesUsed = 0;
  for (let tries = 0; tries < 3 && lanesUsed < wanted; tries++) {
    const kind = pickKind();
    if (ENEMIES[kind].width > wanted - lanesUsed) continue;
    lanesUsed += spawnAhead(kind);
  }

  const gap = lerp(s.startGap, s.minGap, p);
  spawnTimer = gap * (0.8 + Math.random() * 0.4) + (lanesUsed >= 2 ? s.extraGapAfterDouble : 0);
}

function spawnBridge() {
  const b = CONFIG.bridge;
  const p = progress();
  const lanes = Math.random() < lerp(b.twoLaneChanceStart, b.twoLaneChanceMax, p) ? [1, 2] : [2];
  const arrival = elapsed + -CONFIG.spawnZ / CONFIG.walkSpeed;
  const span = spanFor(arrival, b.hitZ, CONFIG.walkSpeed);
  if (!canPlace(lanes, span, arrival, true)) return false;
  addEntity('bridge', lanes, { own: 0, hitZ: b.hitZ, arrival, span, z: CONFIG.spawnZ });
  return true;
}

// A Lime rider overtaking you: starts behind you, with a warning
function spawnBehind() {
  const o = CONFIG.overtaking;
  const warn = lerp(o.warnStart, o.warnMin, progress());
  const gain = o.speed - CONFIG.walkSpeed;
  const arrival = elapsed + warn;
  const span = spanFor(arrival, o.hitZ, gain);

  const preferred = Math.random() < o.sameLaneAsYou ? [lane] : [];
  const laneIdx = [...preferred, ...shuffle([0, 1, 2])].find((l) => canPlace([l], span, arrival, false));
  if (laneIdx === undefined) return;

  const e = addEntity('lime', [laneIdx], {
    own: -o.speed, hitZ: o.hitZ, arrival, span, z: gain * warn + 0.5, fromBehind: true,
  });

  // Flashing red strip on the lane they'll come through
  e.flash = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 18),
    new THREE.MeshBasicMaterial({ color: 0xff2d2d, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  e.flash.rotation.x = -Math.PI / 2;
  e.flash.position.set(CONFIG.lanes[laneIdx], 0.02, -7);
  scene.add(e.flash);
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
  hasCoffee = false;
  setCoffee(player, false);
  invulnUntil = elapsed + c.invulnerable;
  spilledAt = elapsed;
  score = Math.max(0, score - c.spillPenalty);
  spillSound();
  floatText(`☕ SPILLED! −${c.spillPenalty}`, 'bad');
  playerSays(LINES.spill);

  // Splash of coffee
  const pos = player.group.position;
  for (let i = 0; i < 12; i++) {
    const drop = box(0.1, 0.1, 0.1, 0x6b4a2f, pos.x + 0.3, 1.1, pos.z - 0.2);
    drop.userData.v = new THREE.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4);
    drop.userData.life = 1;
    scene.add(drop);
    particles.push(drop);
  }
  updateHud();
}

function hit(e) {
  if (hasCoffee) spillCoffee();
  else gameOver(e);
}

function collectCoffee(e) {
  removeEntity(e);
  entities = entities.filter((o) => o !== e);
  if (hasCoffee) {
    score += CONFIG.coffeeRefill.bonusIfFull;
    floatText(`+${CONFIG.coffeeRefill.bonusIfFull} ☕ EXTRA SHOT`);
  } else {
    hasCoffee = true;
    setCoffee(player, true);
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
  hasCoffee = true;
  invulnUntil = 0;
  spilledAt = -99;
  setCoffee(player, true);
  spawnTimer = CONFIG.spawn.firstWaveDelay;
  behindTimer = CONFIG.overtaking.from;
  bridgeTimer = CONFIG.bridge.from;
  specialTimer = CONFIG.specials.from;
  specialsPool = [];
  player.group.position.set(CONFIG.lanes[1], 0, 0);
  player.group.rotation.set(0, Math.PI, 0);
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
  if (state === 'over' && performance.now() - overAt < 900) return; // no accidental instant restarts
  clearTimeout(overlayTimer);
  initAudio();
  reset();
  prewarm(CONFIG.spawn.prewarmSeconds);
  state = 'playing';
  overlay.classList.add('hidden');
}

function gameOver(e) {
  state = 'over';
  overAt = performance.now();
  clearBubbles();
  crashSound();
  player.group.visible = true;
  warningEl.classList.add('hidden');
  const type = ENEMIES[e.kind];
  const message = pick(e.fromBehind ? [...type.behindDeaths, ...type.deaths] : type.deaths);

  const final = Math.floor(score);
  const isRecord = final > best;
  if (isRecord) { best = final; saveBest(best); }
  updateHud();
  overlayTimer = setTimeout(() => showOverlay(`
    <p class="small label">Cause of death</p>
    <h2>${message}</h2>
    <p class="big">${final}</p>
    <p class="small">${isRecord ? '🎉 New personal best!' : `Best ${best}`}</p>
    <button>Try again</button>
  `), 700);
}

// ---------- Input ----------
function move(dir) {
  if (state !== 'playing') return;
  lane = Math.max(0, Math.min(2, lane + dir));
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
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
  if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
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
  warningEl.textContent = `🔔 ${side}`;
  warningEl.classList.toggle('danger', bikeLane === lane);
  warningEl.classList.remove('hidden');
}

let paused = false; // testing helper

function tick() {
  const dt = paused ? 0 : Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (state === 'playing') {
    elapsed += dt;
    const walk = CONFIG.walkSpeed * speedFactor();
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
    if (spawnTimer <= 0) spawnWave();

    behindTimer -= dt;
    if (behindTimer <= 0) {
      spawnBehind();
      const o = CONFIG.overtaking;
      behindTimer = lerp(o.gapStart, o.gapMin, progress()) * (0.8 + Math.random() * 0.4);
    }

    bridgeTimer -= dt;
    if (bridgeTimer <= 0) {
      const b = CONFIG.bridge;
      bridgeTimer = spawnBridge() ? lerp(b.gapStart, b.gapMin, progress()) * (0.8 + Math.random() * 0.4) : 0.5;
    }

    specialTimer -= dt;
    if (specialTimer <= 0) {
      const sp = CONFIG.specials;
      specialTimer = spawnSpecial() ? lerp(sp.gapStart, sp.gapMin, progress()) * (0.8 + Math.random() * 0.4) : 0.5;
    }

    for (const e of entities) {
      const g = e.model.group;
      g.position.z += (e.own + walk) * dt;
      ENEMIES[e.kind].animate(e.model, t);
      if (e.fromBehind) steerOvertaker(e, dt);
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
      if (z > CONFIG.despawnZ + 6 || z < CONFIG.spawnZ - 10) {
        removeEntity(e);
        return false;
      }
      return true;
    });

    updateHud();
  } else if (state === 'over') {
    // Topple over backwards
    player.group.rotation.x += (-1.4 - player.group.rotation.x) * Math.min(1, dt * 8);
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

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

reset();
showReady();
tick();

// Developer helper: open the game with ?debug in the URL to inspect it from the browser console
if (new URLSearchParams(location.search).has('debug')) {
  window.debug = {
    get state() { return { state, elapsed, score, lane, hasCoffee }; },
    get entities() { return entities.map((e) => ({ kind: e.kind, lanes: e.lanes, z: Math.round(e.model.group.position.z) })); },
    skip(seconds) { elapsed += seconds; },
    godMode() { invulnUntil = Infinity; },
    landmark(kind) { world.forceNext = kind; },
    special(kind) { specialsPool = [kind]; specialTimer = 0; },
    pause(on = true) { paused = on; clock.getDelta(); },
  };
}
