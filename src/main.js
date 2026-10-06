// M1 prototype: dodge solo runners on the towpath.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createWorld } from './world.js';
import { makePlayer, makeRunner, animateWalk } from './models.js';

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
let distance = 0;
let spawnTimer = 0;
let runners = [];
let best = loadBest();

const DEATHS = [
  'Flattened by a jogger. Strava will remember.',
  'Run over mid-tempo. They didn\'t even pause their watch.',
  'Collided with a marathon trainee. It\'s their taper week.',
  'Jogged into oblivion. They said "sorry" without stopping.',
];

const lerp = (a, b, t) => a + (b - a) * t;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function loadBest() {
  try { return Number(localStorage.getItem('canal-best')) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { localStorage.setItem('canal-best', String(value)); } catch { /* storage unavailable */ }
}

// ---------- UI ----------
const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

function showOverlay(html) {
  overlay.innerHTML = `<div class="card">${html}</div>`;
  overlay.classList.remove('hidden');
  overlay.querySelector('button')?.addEventListener('click', start);
}

function showReady() {
  showOverlay(`
    <h1>Canal Game</h1>
    <p class="small">M1 prototype · Victoria Park, Saturday, 11am</p>
    <p>Dodge the runners.</p>
    <p class="small">← → or A / D to change lane · swipe on phones</p>
    <button>Start walking</button>
  `);
}

function updateHud() {
  scoreEl.textContent = Math.floor(distance);
  bestEl.textContent = best ? `Best ${best}` : '';
}

// ---------- Game flow ----------
function reset() {
  for (const r of runners) scene.remove(r.group);
  runners = [];
  lane = 1;
  elapsed = 0;
  distance = 0;
  spawnTimer = CONFIG.spawn.firstWaveDelay;
  player.group.position.set(CONFIG.lanes[1], 0, 0);
  player.group.rotation.set(0, Math.PI, 0);
  updateHud();
}

function start() {
  if (state === 'playing') return;
  reset();
  state = 'playing';
  overlay.classList.add('hidden');
}

function gameOver() {
  state = 'over';
  const score = Math.floor(distance);
  const isRecord = score > best;
  if (isRecord) { best = score; saveBest(best); }
  updateHud();
  setTimeout(() => showOverlay(`
    <h2>${pick(DEATHS)}</h2>
    <p class="big">${score}</p>
    <p class="small">${isRecord ? '🎉 New personal best!' : `Best ${best}`}</p>
    <button>Try again</button>
  `), 600);
}

function spawnWave() {
  const s = CONFIG.spawn;
  const p = Math.min(1, elapsed / s.rampSeconds);
  const isDouble = Math.random() < lerp(s.doubleChanceStart, s.doubleChanceMax, p);

  // Fairness rule: never fill all three lanes at once
  const lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, isDouble ? 2 : 1);
  for (const l of lanes) {
    const r = makeRunner();
    r.group.position.set(CONFIG.lanes[l], 0, CONFIG.runner.spawnZ);
    scene.add(r.group);
    runners.push(r);
  }

  const gap = lerp(s.startGap, s.minGap, p);
  spawnTimer = gap * (0.8 + Math.random() * 0.4) + (isDouble ? s.extraGapAfterDouble : 0);
}

// ---------- Input ----------
function move(dir) {
  if (state !== 'playing') return;
  lane = Math.max(0, Math.min(2, lane + dir));
}

window.addEventListener('keydown', (e) => {
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

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (state === 'playing') {
    elapsed += dt;
    distance += CONFIG.walkSpeed * dt;
    world.scroll(CONFIG.walkSpeed * dt);

    // Slide towards the chosen lane, leaning into the move
    const targetX = CONFIG.lanes[lane];
    const pg = player.group;
    pg.position.x += (targetX - pg.position.x) * Math.min(1, dt * CONFIG.laneChangeSharpness);
    pg.rotation.z = (targetX - pg.position.x) * 0.12;
    animateWalk(player, t, 9);

    spawnTimer -= dt;
    if (spawnTimer <= 0) spawnWave();

    const approach = (CONFIG.walkSpeed + CONFIG.runner.speed) * dt;
    for (const r of runners) {
      r.group.position.z += approach;
      animateWalk(r, t + r.phase, 13);
    }

    for (const r of runners) {
      const dz = Math.abs(r.group.position.z - pg.position.z);
      const dx = Math.abs(r.group.position.x - pg.position.x);
      if (dz < CONFIG.hit.zRange && dx < CONFIG.hit.xRange) {
        gameOver();
        break;
      }
    }

    runners = runners.filter((r) => {
      if (r.group.position.z > CONFIG.runner.despawnZ) {
        scene.remove(r.group);
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

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

reset();
showReady();
tick();
