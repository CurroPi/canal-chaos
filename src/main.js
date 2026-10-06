// M2a: runners, cyclists (oncoming and from behind), coffee lives.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createWorld } from './world.js';
import {
  makePlayer, makeRunner, makeCyclist, animateWalk, animatePedal, setCoffee, box,
} from './models.js';
import { initAudio, bell, spillSound, crashSound } from './sound.js';

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

// ---------- Enemy types ----------
const ENEMIES = {
  runner: {
    make: makeRunner,
    animate: (m, t) => animateWalk(m, t + m.phase, 13),
    deaths: [
      'Flattened by a jogger. Strava will remember.',
      'Run over mid-tempo. They didn\'t even pause their watch.',
      'Collided with a marathon trainee. It\'s their taper week.',
      'Jogged into oblivion. They said "sorry" without stopping.',
    ],
  },
  cyclist: {
    make: makeCyclist,
    animate: (m, t) => animatePedal(m, t + m.phase),
    deaths: [
      'Hit by a cyclist doing 25 in a "shared space".',
      'Run down by Lycra. The bell was more of a suggestion.',
      'Mown down by a road bike. They\'re already tweeting about "pedestrian hazards".',
      'Cycled over. They shouted "MOVE!" which technically counts as a warning.',
    ],
    behindDeaths: [
      '"ON YOUR LEFT!" You went left.',
      'The bell rang. Twice. You chose violence.',
      'Overtaken, literally, through you.',
    ],
  },
};

// ---------- Game state ----------
let state = 'ready'; // 'ready' | 'playing' | 'over'
let lane = 1;
let elapsed = 0;
let score = 0;
let spawnTimer = 0;
let behindTimer = 0;
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
    <p>Dodge the runners and cyclists.<br>Listen for bells behind you. 🔔</p>
    <p class="small">← → or A / D to change lane · swipe on phones<br>☕ Your coffee is your extra life.</p>
    <button>Start walking</button>
  `);
}

function updateHud() {
  scoreEl.textContent = Math.floor(score);
  bestEl.textContent = best ? `Best ${best}` : '';
  livesEl.innerHTML = hasCoffee ? '☕' : '<span class="spilled">☕</span>';
}

function floatText(text, cls = '') {
  const el = document.createElement('div');
  el.className = `float ${cls}`;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

// ---------- Spawning ----------
// Fairness rule: never let all 3 lanes be blocked at the same moment.
function canPlace(laneIdx, arrival, fromAhead) {
  const f = CONFIG.fairness;
  const blocked = new Set([laneIdx]);
  for (const e of entities) {
    if (Math.abs(e.arrival - arrival) < f.window) blocked.add(e.lane);
    // Don't let a fast bike catch up with (and pass through) someone in its lane
    if (fromAhead && !e.fromBehind && e.lane === laneIdx && e.arrival > arrival - f.sameLaneGap) return false;
  }
  return blocked.size < 3;
}

function addEntity(kind, laneIdx, z, own, hitZ, arrival, fromBehind) {
  const model = ENEMIES[kind].make();
  model.group.position.set(CONFIG.lanes[laneIdx], 0, z);
  if (fromBehind) model.group.rotation.y = Math.PI;
  scene.add(model.group);
  const e = { kind, model, lane: laneIdx, own, hitZ, arrival, fromBehind, flash: null };
  entities.push(e);
  return e;
}

function spawnAhead(kind, laneIdx) {
  const own = kind === 'cyclist' ? CONFIG.cyclist.speedAhead : CONFIG.runner.speed;
  const hitZ = kind === 'cyclist' ? CONFIG.cyclist.hitZ : CONFIG.runner.hitZ;
  const arrival = elapsed + -CONFIG.spawnZ / (own + CONFIG.walkSpeed);
  if (!canPlace(laneIdx, arrival, true)) return false;
  addEntity(kind, laneIdx, CONFIG.spawnZ, own, hitZ, arrival, false);
  return true;
}

function spawnWave() {
  const s = CONFIG.spawn;
  const c = CONFIG.cyclist;
  const p = progress();
  const count = Math.random() < lerp(s.doubleChanceStart, s.doubleChanceMax, p) ? 2 : 1;
  const cyclistChance = elapsed > c.startAfter ? lerp(0.1, c.aheadChanceMax, p) : 0;

  let placed = 0;
  for (const l of shuffle([0, 1, 2])) {
    if (placed >= count) break;
    const kind = Math.random() < cyclistChance ? 'cyclist' : 'runner';
    if (spawnAhead(kind, l)) placed++;
  }

  const gap = lerp(s.startGap, s.minGap, p);
  spawnTimer = gap * (0.8 + Math.random() * 0.4) + (placed === 2 ? s.extraGapAfterDouble : 0);
}

// An overtaking cyclist: starts behind you, with a warning
function spawnBehind() {
  const c = CONFIG.cyclist;
  const p = progress();
  const warn = lerp(c.warnStart, c.warnMin, p);
  const gain = c.speedBehind - CONFIG.walkSpeed;
  const arrival = elapsed + warn;

  const preferred = Math.random() < c.sameLaneAsYou ? [lane] : [];
  const choices = [...preferred, ...shuffle([0, 1, 2])];
  const laneIdx = choices.find((l) => canPlace(l, arrival, false));
  if (laneIdx === undefined) return;

  const e = addEntity('cyclist', laneIdx, gain * warn + 0.5, -c.speedBehind, c.hitZ, arrival, true);

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

// ---------- Game flow ----------
function reset() {
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
  behindTimer = CONFIG.cyclist.startAfter;
  player.group.position.set(CONFIG.lanes[1], 0, 0);
  player.group.rotation.set(0, Math.PI, 0);
  player.group.visible = true;
  warningEl.classList.add('hidden');
  updateHud();
}

function start() {
  if (state === 'playing') return;
  if (state === 'over' && performance.now() - overAt < 900) return; // no accidental instant restarts
  clearTimeout(overlayTimer);
  initAudio();
  reset();
  state = 'playing';
  overlay.classList.add('hidden');
}

function gameOver(e) {
  state = 'over';
  overAt = performance.now();
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
    if (!e.fromBehind || !e.flash) continue;
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
  const side = nearest.lane < lane ? 'ON YOUR LEFT!' : nearest.lane > lane ? 'ON YOUR RIGHT!' : 'BEHIND YOU!';
  warningEl.textContent = `🔔 ${side}`;
  warningEl.classList.toggle('danger', nearest.lane === lane);
  warningEl.classList.remove('hidden');
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
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
      const c = CONFIG.cyclist;
      behindTimer = lerp(c.behindGapStart, c.behindGapMin, progress()) * (0.8 + Math.random() * 0.4);
    }

    for (const e of entities) {
      e.model.group.position.z += (e.own + walk) * dt;
      ENEMIES[e.kind].animate(e.model, t);
    }
    updateWarning(t);

    if (elapsed >= invulnUntil) {
      for (const e of entities) {
        const dz = Math.abs(e.model.group.position.z - pg.position.z);
        const dx = Math.abs(e.model.group.position.x - pg.position.x);
        if (dz < e.hitZ && dx < CONFIG.hitX) {
          hit(e);
          break;
        }
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
