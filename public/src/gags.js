// Visual gags along the canal: nothing here interacts with you, it's just there for laughs.
// Boats get silly names and clutter, the wall gets posters, and a set of one-off scenes
// (tarot boat, magnet fisher, heron...) each turn up once per run.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { box, mat, makePerson, makeLimeBike } from './models.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const rand = (min, max) => min + Math.random() * (max - min);

// Same towpath measurements as world.js
const EDGE = 1.5 * CONFIG.lanes[2];
const WALL = EDGE + 0.1;
const CANAL = -EDGE - 0.2;
export const BOAT_X = CANAL - 1.3; // where moored boats sit
const WATER_Y = -0.7;

const SKIN = [0xf1c9a5, 0xe8b894, 0xd8a47f, 0xa86b45, 0x6b4029];
const HAIR = [0x222222, 0x5a3b25, 0xc9a35a, 0x8a3b1f, 0xd4d4d4];
const BOAT_COLOURS = [0x1f5f3a, 0x8c1c1c, 0x1d2f5c, 0x5b2a5e, 0x2a6f73, 0x222222];

// ---------- Canvas text ----------
const textMats = new Map();
function textMaterial(key, w, h, draw) {
  if (!textMats.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    textMats.set(key, new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  }
  return textMats.get(key);
}

function wrap(g, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
  }
  lines.push(line);
  return lines;
}

// A flat sign facing the towpath (+x), e.g. on the side of a boat
function sign(material, w, h, x, y, z, facePath = true) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  plane.rotation.y = facePath ? Math.PI / 2 : -Math.PI / 2;
  plane.position.set(x, y, z);
  return plane;
}

// ---------- 2. Boat names ----------
const BOAT_NAMES = [
  'TAX HAVEN', 'KNOT WORKING', 'MORTGAGE-FREE', 'SOLE MATE', 'RENT DODGER', 'UNSINKABLE II',
  'WI-FI NOT INCLUDED', 'NARROW ESCAPE', 'PIER PRESSURE', 'SEAS THE DAY', 'KNOTTY BUT NICE',
  'ZONE 2 AND A HALF', 'OFF GRID-ISH', 'THE GENTRIFIER', 'BARGE OF THE RINGS', 'CANAL CONTENT',
];

function namePlate(name) {
  return textMaterial(`name:${name}`, 512, 96, (g, w, h) => {
    g.font = 'bold 54px Georgia, "Times New Roman", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.strokeStyle = '#2b1d0e';
    g.strokeText(name, w / 2, h / 2 + 3);
    g.fillStyle = '#f3e3b5'; // traditional cream lettering
    g.fillText(name, w / 2, h / 2 + 3);
  });
}

// ---------- 3. Boat clutter ----------
function cat(x, y, z) {
  const c = new THREE.Group();
  const fur = pick([0xd9822b, 0x2b2b2b, 0xe8e2d4, 0x8a8a8a]);
  c.add(box(0.3, 0.14, 0.4, fur, 0, 0.07, 0));          // curled up body
  c.add(box(0.16, 0.14, 0.14, fur, 0.1, 0.13, 0.16));   // head
  c.add(box(0.04, 0.06, 0.04, fur, 0.06, 0.23, 0.18));  // ears
  c.add(box(0.04, 0.06, 0.04, fur, 0.14, 0.23, 0.18));
  c.add(box(0.06, 0.05, 0.3, fur, -0.13, 0.04, -0.05)); // tail wrapped round
  c.position.set(x, y, z);
  c.rotation.y = rand(0, Math.PI * 2);
  return c;
}

function clutter(group, bx, z, roofY) {
  const spots = [-4, -2, 0, 2, 4].sort(() => Math.random() - 0.5);
  if (Math.random() < 0.5) { // washing line with socks and pants
    group.add(box(0.02, 0.6, 0.02, 0x888888, bx, roofY + 0.3, z + spots[0] - 1));
    group.add(box(0.02, 0.6, 0.02, 0x888888, bx, roofY + 0.3, z + spots[0] + 1));
    group.add(box(0.01, 0.01, 2, 0xdddddd, bx, roofY + 0.58, z + spots[0]));
    for (let i = -0.8; i <= 0.8; i += 0.32) {
      group.add(box(0.02, rand(0.12, 0.22), 0.12, pick([0xffffff, 0xff6b9a, 0x3fb6ff, 0xffd23f, 0x2b2b2b]), bx, roofY + 0.45, z + spots[0] + i));
    }
  }
  if (Math.random() < 0.6) { // firewood stack
    for (let i = 0; i < 6; i++) group.add(box(0.5, 0.08, 0.08, 0x6b4a2f, bx + rand(-0.3, 0.3), roofY + 0.05 + Math.floor(i / 3) * 0.08, z + spots[1] + (i % 3) * 0.09));
  }
  if (Math.random() < 0.4) group.add(box(0.18, 0.4, 0.18, 0xd62828, bx + 0.5, roofY + 0.2, z + spots[2])); // gas bottle
  if (Math.random() < 0.5) { // solar panel
    const panel = box(0.9, 0.04, 1.2, 0x1b2a4a, bx, roofY + 0.15, z + spots[3]);
    panel.rotation.x = 0.25;
    group.add(panel);
  }
  if (Math.random() < 0.3) { // a bike chained to the roof
    const bike = makeLimeBike();
    bike.traverse((o) => { if (o.material && o.material.color?.getHex() === 0x4cd12a) o.material = mat(0x8a8a8a); });
    bike.rotation.z = Math.PI / 2;
    bike.position.set(bx - 0.2, roofY + 0.15, z + spots[4]);
    group.add(bike);
  }
  if (Math.random() < 0.35) group.add(cat(bx + rand(-0.4, 0.4), roofY, z + rand(-4, 4))); // cat asleep on the roof
}

// ---------- A narrowboat ----------
// Returns { group, roofY }. `name` goes on the side facing the towpath.
export function makeNarrowboat({ z = 0, colour = pick(BOAT_COLOURS), cabin = 0xe9e1cf, name = pick(BOAT_NAMES), withClutter = true, bx = BOAT_X } = {}) {
  const group = new THREE.Group();
  group.add(box(1.9, 1.2, 13, colour, bx, -0.6, z));
  group.add(box(1.6, 0.5, 11.5, cabin, bx, 0.25, z));
  group.add(box(1.62, 0.06, 11.6, colour, bx, 0.53, z));
  for (let wz = -4.5; wz <= 4.5; wz += 1.8) group.add(box(0.03, 0.22, 0.6, 0x2b3a42, bx + 0.81, 0.27, z + wz));
  group.add(box(0.12, 0.45, 0.12, 0x333333, bx - 0.3, 0.78, z - 4)); // chimney
  if (name) group.add(sign(namePlate(name), 3.2, 0.6, bx + 0.96, -0.32, z + 2.5));
  const roofY = 0.56;
  if (withClutter) clutter(group, bx, z, roofY);
  return { group, roofY, bx };
}

// ---------- 13. Wall posters ----------
const POSTERS = [
  ['ROOM TO LET', '£1,400pcm (it\'s a cupboard)', '#fffbe6'],
  ['SOUND BATH TONIGHT', 'bring your own gong', '#e7f0ff'],
  ['LOST: BISCUIT', 'sausage dog. answers to Biscuit', '#fff3a8'],
  ['RUN CLUB', 'we\'re not a cult (we are)', '#ffd6e8'],
  ['FREE SOFA', 'slightly haunted', '#ffffff'],
  ['SOURDOUGH STARTER', 'needs a loving home', '#f6ead2'],
  ['VINTAGE MARKET', 'everything £45', '#e3f7e3'],
  ['HAVE YOU SEEN', 'my Lime bike? last seen in the canal', '#ffffff'],
  ['CERAMICS CLASS', 'make a mug you\'ll never use', '#ffe9d6'],
  ['COMEDY NIGHT', 'in a laundrette, Thursdays', '#f0e6ff'],
  ['BAND SEEKS DRUMMER', 'must own a van', '#fff3a8'],
  ['OAT MILK SHORTAGE', 'stay calm', '#e7f0ff'],
];

function posterMaterial([title, line, paper]) {
  return textMaterial(`poster:${title}`, 256, 340, (g, w, h) => {
    g.fillStyle = paper;
    g.fillRect(0, 0, w, h - 40);
    for (let x = 6; x < w - 6; x += 30) g.fillRect(x, h - 40, 24, 40); // tear-off tabs
    g.fillStyle = '#1b1b1b';
    g.textAlign = 'center';
    g.font = 'bold 34px "Marker Felt", "Comic Sans MS", cursive';
    wrap(g, title, w - 30).forEach((l, i) => g.fillText(l, w / 2, 60 + i * 38));
    g.font = '26px "Marker Felt", "Comic Sans MS", cursive';
    wrap(g, line, w - 34).forEach((l, i) => g.fillText(l, w / 2, 160 + i * 30));
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x = 6; x < w - 6; x += 30) g.fillRect(x + 11, h - 36, 2, 30); // phone numbers, sort of
  });
}

export function addPosters(decor, L) {
  const count = Math.floor(rand(0, 3));
  for (let i = 0; i < count; i++) {
    // Clearly in front of the graffiti patches (which stick out ~0.035), and never at the same depth as each other
    const p = sign(posterMaterial(pick(POSTERS)), 0.5, 0.66, WALL - 0.06 - i * 0.01, rand(1.2, 1.8), rand(-L / 2 + 1, L / 2 - 1), false);
    p.rotation.z = rand(-0.08, 0.08);
    decor.add(p);
  }
}

// ---------- One-off gags ----------
const animated = [];
// world.js calls this every frame with the time, for the few things that move
export function animateGags(t) {
  for (let i = animated.length - 1; i >= 0; i--) {
    let root = animated[i].obj;
    while (root.parent) root = root.parent;
    if (!root.isScene) { animated.splice(i, 1); continue; } // scrolled away: forget it
    animated[i].fn(t);
  }
}
const animate = (obj, fn) => animated.push({ obj, fn });

function person(opts = {}) {
  return makePerson({
    skin: pick(SKIN), shirt: pick([0x9ca3af, 0xf5f0e1, 0x4b5563, 0xb45309, 0x065f46, 0x7f1d1d, 0x1e3a8a]),
    legs: pick([0x3b5b8a, 0x2b2b2b, 0xc2a27a]), shoes: pick([0xf5f5f5, 0x222222]), hair: pick(HAIR), ...opts,
  });
}

// 1. Tarot boat: purple, gold stars, fairy lights, a glowing crystal ball
function tarotBoat(z) {
  const b = makeNarrowboat({ z, colour: 0x3b1a5a, cabin: 0x5b2a7e, name: 'MYSTIC MEG II', withClutter: false });
  const sx = b.bx + 0.955;
  for (let i = 0; i < 14; i++) b.group.add(box(0.02, 0.07, 0.07, 0xf2c94c, sx, rand(-0.65, -0.05), z + rand(-6, 6))); // stars
  for (let wz = -5.6; wz <= 5.6; wz += 0.4) {
    b.group.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: pick([0xfff3a8, 0xffd23f, 0xff9ad5]) })).translateX(b.bx + 0.82).translateY(0.5).translateZ(z + wz));
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshBasicMaterial({ color: 0xc9a7ff }));
  ball.position.set(b.bx + 0.84, 0.27, z - 0.9);
  b.group.add(ball);
  animate(ball, (t) => ball.material.color.setHSL(0.75 + Math.sin(t * 2) * 0.05, 0.8, 0.75));
  const board = textMaterial('tarot', 512, 220, (g, w, h) => {
    g.fillStyle = '#2a0f40';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f2c94c';
    g.lineWidth = 8;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#f2c94c';
    g.textAlign = 'center';
    g.font = 'bold 70px Georgia, serif';
    g.fillText('★ TAROT ★', w / 2, 95);
    g.font = '42px Georgia, serif';
    g.fillText('CRYSTALS · £30', w / 2, 165);
  });
  const s = sign(board, 1.8, 0.78, b.bx + 0.5, 1.05, z + 2.5);
  s.rotation.y = Math.PI / 2 - 0.4; // turned towards you
  b.group.add(s);
  return b.group;
}

// 4. For sale boat: faded, a bit rusty, honest sign
function forSaleBoat(z) {
  const b = makeNarrowboat({ z, colour: 0x5a5a4a, cabin: 0xc9c2a8, name: 'PROJECT', withClutter: false });
  for (let i = 0; i < 8; i++) b.group.add(box(0.02, rand(0.1, 0.3), rand(0.3, 0.8), 0x8a4a22, b.bx + 0.955, rand(-0.6, -0.1), z + rand(-6, 6))); // rust
  const board = textMaterial('forsale', 512, 300, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d62828';
    g.fillRect(0, 0, w, 80);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.font = 'bold 60px Arial, sans-serif';
    g.fillText('FOR SALE', w / 2, 60);
    g.fillStyle = '#1b1b1b';
    g.font = 'bold 52px Arial, sans-serif';
    g.fillText('£145,000', w / 2, 140);
    g.font = '30px Arial, sans-serif';
    g.fillText('No mooring. No toilet.', w / 2, 200);
    g.fillText('Great vibes.', w / 2, 245);
  });
  b.group.add(box(0.05, 0.9, 0.05, 0x6b4a2f, b.bx + 0.4, 1.0, z));
  const s = sign(board, 1.2, 0.7, b.bx + 0.45, 1.5, z);
  s.rotation.y = Math.PI / 2 - 0.4;
  b.group.add(s);
  return b.group;
}

// 5. Rooftop party: decks, speakers, bunting, a few people dancing
function partyBoat(z) {
  const b = makeNarrowboat({ z, colour: 0x111111, name: 'BASS LINE', withClutter: false });
  const top = b.roofY;
  b.group.add(box(0.5, 0.35, 0.9, 0x2b2b2b, b.bx, top + 0.18, z - 2));      // DJ table
  b.group.add(box(0.4, 0.04, 0.3, 0xdddddd, b.bx, top + 0.38, z - 2.2));    // decks
  for (const dz of [-3.2, -0.8]) b.group.add(box(0.4, 0.6, 0.4, 0x111111, b.bx + 0.3, top + 0.3, z + dz)); // speakers
  for (let i = 0; i < 12; i++) b.group.add(box(0.03, 0.18, 0.18, pick([0xff3d7f, 0xffd23f, 0x3fb6ff, 0x7cff6b]), b.bx + 0.82, top + 0.5, z - 5 + i * 0.9));
  for (let i = 0; i < 4; i++) {
    const p = person();
    p.group.position.set(b.bx + rand(-0.4, 0.4), top, z + rand(-1, 3));
    p.group.rotation.y = rand(0, Math.PI * 2);
    p.armL.rotation.x = -2.6;
    p.armR.rotation.x = -2.4;
    b.group.add(p.group);
    const phase = rand(0, 6);
    animate(p.group, (t) => { p.rig.position.y = Math.abs(Math.sin(t * 7 + phase)) * 0.12; p.armL.rotation.z = Math.sin(t * 7 + phase) * 0.4; });
  }
  return b.group;
}

// 6. Floating sauna: wooden boat, smoking chimney, someone in a towel about to jump in
function saunaBoat(z) {
  const b = makeNarrowboat({ z, colour: 0x8a5a32, cabin: 0xb07a45, name: 'HOT TUB TIME', withClutter: false });
  const puffs = [];
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshLambertMaterial({ color: 0xdddddd, transparent: true, opacity: 0.6 }));
    b.group.add(puff);
    puffs.push(puff);
  }
  animate(puffs[0], (t) => puffs.forEach((p, i) => {
    const k = (t * 0.4 + i / puffs.length) % 1;
    p.position.set(b.bx - 0.3 + k * 0.4, 1.05 + k * 1.6, z - 4 + k * 0.3);
    p.scale.setScalar(0.6 + k * 1.4);
    p.material.opacity = 0.6 * (1 - k);
  }));
  const p = person({ shirt: 0xf5f5f5, legs: pick(SKIN) }); // towel
  p.rig.add(box(0.6, 0.35, 0.36, 0xffffff, 0, 0.75, 0));
  p.group.position.set(b.bx + 0.7, b.roofY, z + 5.6);
  p.group.rotation.y = Math.PI / 2;
  b.group.add(p.group);
  return b.group;
}

// 12. Yoga on the roof: tree pose, mat, a little plant
function yogaBoat(z) {
  const b = makeNarrowboat({ z, colour: 0x2a6f73, name: 'NAMASTAY', withClutter: false });
  b.group.add(box(0.6, 0.02, 1.6, 0x9b5de5, b.bx, b.roofY + 0.01, z + 1));
  const p = person({ shirt: pick([0xf4c2c2, 0xd6c6f2, 0xfdf6e3]), legs: 0x2b2b2b });
  p.armL.rotation.x = p.armR.rotation.x = -3.0;     // arms up
  p.legR.rotation.z = 0.9;                            // tree pose
  p.legR.rotation.x = -0.3;
  p.group.position.set(b.bx, b.roofY + 0.02, z + 1);
  p.group.rotation.y = Math.PI / 2;
  b.group.add(p.group);
  return b.group;
}

// 7. Heron, perfectly still on a boat roof, judging you
function heronBoat(z) {
  const b = makeNarrowboat({ z });
  const h = new THREE.Group();
  h.add(box(0.22, 0.28, 0.5, 0x8f979e, 0, 0.75, 0));   // body
  h.add(box(0.08, 0.5, 0.08, 0xc9cfd4, 0, 1.1, 0.2));  // long neck
  h.add(box(0.12, 0.12, 0.2, 0xdde2e6, 0, 1.38, 0.24)); // head
  h.add(box(0.03, 0.03, 0.28, 0xe8a33c, 0, 1.36, 0.46)); // beak
  h.add(box(0.14, 0.03, 0.03, 0x1b1b1b, 0, 1.43, 0.2));  // crest
  for (const x of [-0.05, 0.05]) h.add(box(0.03, 0.55, 0.03, 0x8a7a5a, x, 0.33, 0));
  h.position.set(b.bx + 0.3, b.roofY, z + 3);
  h.rotation.y = Math.PI / 2 + 0.3; // facing the towpath
  b.group.add(h);
  return b.group;
}

function swanShape(scale, colour) {
  const s = new THREE.Group();
  s.add(box(0.36, 0.22, 0.6, colour, 0, 0.08, 0));
  s.add(box(0.07, 0.36, 0.07, colour, 0, 0.32, 0.26));
  s.add(box(0.09, 0.08, 0.16, colour, 0, 0.5, 0.32));
  s.add(box(0.04, 0.04, 0.08, colour === 0xffffff ? 0xff7a1a : 0x555555, 0, 0.49, 0.44));
  s.scale.setScalar(scale);
  return s;
}

// 8. Swan family gliding past
function swans(z) {
  const g = new THREE.Group();
  const family = [[1, 0xffffff], [0.55, 0x9a9a9a], [0.55, 0x9a9a9a], [0.55, 0x9a9a9a], [0.55, 0x9a9a9a], [1, 0xffffff]];
  family.forEach(([scale, colour], i) => {
    const s = swanShape(scale, colour);
    s.position.set(CANAL - 3.6 + Math.sin(i) * 0.2, WATER_Y, z - i * 0.9);
    s.rotation.y = Math.PI; // swimming the same way you walk
    g.add(s);
  });
  let t0 = null;
  animate(g, (t) => {
    t0 ??= t;
    g.position.z = -(t - t0) * 0.6; // paddling along slowly
    g.children.forEach((s, i) => { s.position.y = WATER_Y + Math.sin(t * 2 + i) * 0.02; });
  });
  return g;
}

// 9. Coot on a nest built from rubbish
function cootNest(z) {
  const g = new THREE.Group();
  const x = CANAL - 0.7;
  for (let i = 0; i < 10; i++) {
    const stick = box(0.5, 0.04, 0.04, 0x6b4a2f, x + rand(-0.2, 0.2), WATER_Y + 0.05 + rand(0, 0.08), z + rand(-0.2, 0.2));
    stick.rotation.y = rand(0, Math.PI);
    g.add(stick);
  }
  g.add(box(0.4, 0.03, 0.3, 0xf2f2f2, x + 0.1, WATER_Y + 0.12, z));   // plastic bag
  g.add(box(0.3, 0.03, 0.3, 0x3498db, x - 0.15, WATER_Y + 0.1, z + 0.1));
  const cup = box(0.1, 0.16, 0.1, 0xffffff, x + 0.25, WATER_Y + 0.15, z - 0.15); // a coffee cup, obviously
  cup.rotation.z = 1.3;
  g.add(cup);
  g.add(box(0.22, 0.16, 0.32, 0x1b1b1b, x, WATER_Y + 0.25, z));       // coot
  g.add(box(0.12, 0.12, 0.12, 0x1b1b1b, x, WATER_Y + 0.37, z + 0.16));
  g.add(box(0.05, 0.06, 0.06, 0xffffff, x, WATER_Y + 0.38, z + 0.24)); // white face shield
  return g;
}

// 10. Magnet fisher on the edge, hauling a Lime bike out of the canal
function magnetFisher(z) {
  const g = new THREE.Group();
  const p = person({ shirt: 0x3d4a3d, legs: 0x5c5c5c });
  p.group.position.set(CANAL + 0.1, 0.06, z);
  p.group.rotation.y = -Math.PI / 2; // facing the water
  p.rig.rotation.x = -0.25;           // leaning back, pulling
  p.armL.rotation.x = p.armR.rotation.x = -1.3;
  g.add(p.group);
  const bike = makeLimeBike();
  bike.position.set(CANAL - 1.1, WATER_Y - 0.55, z);
  bike.rotation.set(0.4, 0.3, 1.1);
  g.add(bike);
  const from = new THREE.Vector3(CANAL - 0.45, 1.1, z);
  const to = new THREE.Vector3(CANAL - 1.05, WATER_Y + 0.25, z);
  const rope = new THREE.Group();
  rope.position.copy(from);
  rope.add(box(0.025, 0.025, from.distanceTo(to), 0xe8d28a, 0, 0, from.distanceTo(to) / 2));
  rope.lookAt(to);
  g.add(rope);
  return g;
}

// 11. An angler who has caught nothing since 2019
function angler(z) {
  const g = new THREE.Group();
  g.add(box(0.36, 0.3, 0.36, 0x2b5c2b, CANAL + 0.05, 0.2, z));       // fold-out stool
  const p = person({ shirt: 0x556b2f, legs: 0x3b3b2f });
  p.group.position.set(CANAL + 0.05, 0.05, z);
  p.group.rotation.y = -Math.PI / 2;
  p.legL.rotation.x = p.legR.rotation.x = -1.4; // sitting
  p.rig.position.y = -0.35;
  p.armR.rotation.x = -1.1;
  g.add(p.group);
  const rod = box(0.03, 0.03, 3.2, 0x222222, CANAL - 1.2, 1.0, z + 0.2);
  rod.rotation.y = Math.PI / 2;
  rod.rotation.z = 0.35;
  g.add(rod);
  g.add(box(0.01, 1.4, 0.01, 0xdddddd, CANAL - 2.7, 0.2, z + 0.2));   // line
  g.add(box(0.06, 0.1, 0.06, 0xff3d3d, CANAL - 2.7, WATER_Y + 0.05, z + 0.2)); // float, not moving
  g.add(box(0.2, 0.3, 0.2, 0x2b6cb0, CANAL + 0.35, 0.2, z + 0.5));    // thermos
  return g;
}

// 14. Overflowing bin by the wall: oat milk cartons and coffee cups
function bin(z) {
  const g = new THREE.Group();
  const x = WALL - 0.2;
  g.add(box(0.34, 0.75, 0.34, 0x1f3d2b, x, 0.38, z));
  g.add(box(0.38, 0.05, 0.38, 0x162b1f, x, 0.77, z));
  for (let i = 0; i < 7; i++) {
    const item = i % 2 ? box(0.08, 0.14, 0.08, 0xffffff, x + rand(-0.12, 0.12), 0.85 + rand(0, 0.12), z + rand(-0.12, 0.12)) // cups
      : box(0.1, 0.16, 0.07, pick([0x1e5bd8, 0xf5d000, 0xffffff]), x + rand(-0.12, 0.12), 0.86 + rand(0, 0.1), z + rand(-0.12, 0.12)); // oat milk
    item.rotation.set(rand(-0.6, 0.6), rand(0, 3), rand(-0.6, 0.6));
    g.add(item);
  }
  for (let i = 0; i < 3; i++) g.add(box(0.1, 0.12, 0.07, 0xffffff, x + rand(-0.4, -0.15), 0.04, z + rand(-0.4, 0.4))); // fallen out
  return g;
}

// The one-off gags. `boat: true` ones replace that stretch's normal moored boat.
export const GAGS = {
  tarot: { boat: true, build: tarotBoat },
  forSale: { boat: true, build: forSaleBoat },
  party: { boat: true, build: partyBoat },
  sauna: { boat: true, build: saunaBoat },
  yoga: { boat: true, build: yogaBoat },
  heron: { boat: true, build: heronBoat },
  swans: { boat: false, build: swans },
  coot: { boat: true, build: cootNest }, // needs the edge clear of boats
  magnet: { boat: true, build: magnetFisher },
  angler: { boat: true, build: angler },
  bin: { boat: false, build: bin },
};
