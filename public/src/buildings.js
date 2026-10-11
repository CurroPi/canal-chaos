// East London canal-side buildings for the far bank. Facades use small canvas-drawn
// textures repeated per window bay; all shapes and textures are shared and cached.
import * as THREE from 'three';
import { box, mat } from './models.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const rand = (min, max) => min + Math.random() * (max - min);

export const FRONT_X = -15.3; // the canal-side face of the far bank
const FLOOR = 2.6;
const BAY = 3;
const WATER_Y = -0.7;

// ---------- Canvas textures ----------
function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

function brickLines(g, w, h) {
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 4; y < h; y += 8) g.fillRect(0, y, w, 1);
}

// Big crittall-style window with a grid of glazing bars
function crittall(wall, frame, glass, brick = true) {
  return (g, w, h) => {
    g.fillStyle = css(wall);
    g.fillRect(0, 0, w, h);
    if (brick) brickLines(g, w, h);
    g.fillStyle = css(frame);
    g.fillRect(18, 20, 92, 80);
    g.fillStyle = css(glass);
    g.fillRect(22, 24, 84, 72);
    g.fillStyle = css(frame);
    for (let i = 1; i < 4; i++) g.fillRect(22 + (84 / 4) * i - 1, 24, 3, 72);
    for (let i = 1; i < 3; i++) g.fillRect(22, 24 + (72 / 3) * i - 1, 84, 3);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(24, 26, 30, 20);
  };
}

// Arched Victorian warehouse window with glazing bars
function arched(g, w, h) {
  g.fillStyle = '#a88a5a';
  g.fillRect(0, 0, w, h);
  brickLines(g, w, h);
  g.fillStyle = '#2e3236';
  g.beginPath();
  g.moveTo(28, 104);
  g.lineTo(28, 46);
  g.arc(64, 46, 36, Math.PI, 0);
  g.lineTo(100, 104);
  g.closePath();
  g.fill();
  g.strokeStyle = '#c9ccc9';
  g.lineWidth = 2;
  for (let x = 40; x < 100; x += 12) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 104); g.stroke(); }
  for (let y = 40; y < 104; y += 14) { g.beginPath(); g.moveTo(28, y); g.lineTo(100, y); g.stroke(); }
  g.fillStyle = '#7d6a4a';
  g.fillRect(24, 104, 80, 6); // sill
}

// Rusty Corten steel panels with tall narrow windows
function corten(g, w, h) {
  g.fillStyle = '#8c4a26';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(60,25,10,0.25)' : 'rgba(190,110,60,0.25)';
    g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
  }
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, 0, w, 2);
  g.fillRect(0, 0, 2, h);
  g.fillStyle = '#1d1f22';
  g.fillRect(44, 18, 36, 88);
  g.fillStyle = '#7f949e';
  g.fillRect(48, 22, 28, 80);
  g.fillStyle = '#1d1f22';
  g.fillRect(48, 60, 28, 3);
}

// Vertical timber slats with a window
function timber(g, w, h) {
  for (let x = 0; x < w; x += 8) {
    g.fillStyle = (x / 8) % 2 ? '#b98b5e' : '#a87b50';
    g.fillRect(x, 0, 8, h);
  }
  g.fillStyle = '#9aa3a8';
  g.fillRect(0, 118, w, 10); // floor slab
  g.fillStyle = '#3d474d';
  g.fillRect(64, 20, 52, 76);
  g.fillStyle = '#7f949e';
  g.fillRect(68, 24, 44, 68);
}

// Dark grey brick, big modern windows
function modern(g, w, h) {
  g.fillStyle = '#3a3b40';
  g.fillRect(0, 0, w, h);
  brickLines(g, w, h);
  g.fillStyle = '#20242a';
  g.fillRect(14, 16, 100, 92);
  g.fillStyle = '#6f8592';
  g.fillRect(18, 20, 92, 84);
  g.fillStyle = '#20242a';
  g.fillRect(62, 20, 4, 84);
}

// Canal-side terrace: brick with a white sash window and a stone lintel
function sash(wall) {
  return (g, w, h) => {
    g.fillStyle = css(wall);
    g.fillRect(0, 0, w, h);
    brickLines(g, w, h);
    g.fillStyle = '#d9d2c3';
    g.fillRect(36, 14, 56, 8);            // lintel
    g.fillStyle = '#f2efe8';
    g.fillRect(40, 22, 48, 82);           // white frame
    g.fillStyle = '#4d5b63';
    g.fillRect(44, 26, 40, 34);           // top sash
    g.fillRect(44, 66, 40, 34);           // bottom sash
    g.fillStyle = '#f2efe8';
    g.fillRect(62, 26, 3, 74);
    g.fillStyle = '#d9d2c3';
    g.fillRect(36, 104, 56, 6);           // sill
  };
}

// White render with plain dark windows
function render(g, w, h) {
  g.fillStyle = '#ece9e2';
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,0.06)';
  g.fillRect(0, 120, w, 8);
  g.fillStyle = '#3a4248';
  g.fillRect(30, 26, 68, 66);
  g.fillStyle = '#6f8592';
  g.fillRect(34, 30, 60, 58);
  g.fillStyle = '#3a4248';
  g.fillRect(63, 30, 3, 58);
}

const STYLES = {
  redBrick:    { wall: 0x9b4f3a, draw: crittall(0x9b4f3a, 0x2b2b2b, 0x51606b) },
  yellowBrick: { wall: 0xc9a66b, draw: crittall(0xc9a66b, 0x2b2b2b, 0x4f5d66) },
  darkBrick:   { wall: 0x6b3a2e, draw: crittall(0x6b3a2e, 0xe8e2d4, 0x45535c) },
  office:      { wall: 0x2a2a2c, draw: crittall(0x2a2a2c, 0x161616, 0x8fa3ad) },
  arched:      { wall: 0xa88a5a, draw: arched },
  corten:      { wall: 0x8c4a26, draw: corten },
  timber:      { wall: 0xb08257, draw: timber },
  modern:      { wall: 0x3a3b40, draw: modern },
  terrace:     { wall: 0xb89b6e, draw: sash(0xb89b6e) },
  terraceRed:  { wall: 0x9b5440, draw: sash(0x9b5440) },
  render:      { wall: 0xece9e2, draw: render },
};

const bayTextures = {};
const boxGeos = new Map(); // shared shapes, so rebuilding scenery doesn't leak memory
const facadeMats = new Map();

// A material whose texture repeats the window bay across the whole facade
function facadeMat(style, bays, floors) {
  const key = `${style}-${bays}-${floors}`;
  if (!facadeMats.has(key)) {
    bayTextures[style] ||= canvasTexture(128, 128, STYLES[style].draw);
    const tex = bayTextures[style].clone();
    tex.repeat.set(bays, floors);
    tex.needsUpdate = true;
    facadeMats.set(key, new THREE.MeshLambertMaterial({ map: tex }));
  }
  return facadeMats.get(key);
}

// A box whose canal-facing (+x) side shows the facade
function facadeBox(style, length, floors, depth, z, baseY = WATER_Y) {
  const height = floors * FLOOR;
  const bays = Math.max(1, Math.round(length / BAY));
  const plain = mat(STYLES[style].wall);
  const geoKey = `${depth}-${floors}-${length}`;
  if (!boxGeos.has(geoKey)) boxGeos.set(geoKey, new THREE.BoxGeometry(depth, height, length));
  const mesh = new THREE.Mesh(boxGeos.get(geoKey), [facadeMat(style, bays, floors), plain, plain, plain, plain, plain]);
  mesh.position.set(FRONT_X - depth / 2, baseY + height / 2, z);
  return mesh;
}

// Sawtooth factory roof: right-angled teeth along the building
const toothGeos = new Map();
function sawtoothRoof(length, depth, topY, z, color) {
  const group = new THREE.Group();
  const s = 3;
  const h = 1.7;
  const key = `${depth}`;
  if (!toothGeos.has(key)) {
    const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(s, 0), new THREE.Vector2(0, h)]);
    toothGeos.set(key, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }));
  }
  const teeth = Math.max(1, Math.floor(length / s));
  for (let i = 0; i < teeth; i++) {
    const tooth = new THREE.Mesh(toothGeos.get(key), mat(color));
    tooth.rotation.y = -Math.PI / 2;
    tooth.position.set(FRONT_X, topY, z - length / 2 + i * s);
    group.add(tooth);
  }
  return group;
}

// Balconies sticking out over the water, one per bay per floor (some skipped)
function balconies(group, length, floors, z, colours, startFloor = 1) {
  const bays = Math.max(1, Math.round(length / BAY));
  for (let f = startFloor; f < floors; f++) {
    for (let b = 0; b < bays; b++) {
      if (Math.random() < 0.35) continue;
      const bz = z - length / 2 + BAY * (b + 0.5);
      const y = WATER_Y + f * FLOOR + 0.1;
      group.add(box(0.9, 0.12, 2.2, 0x8a8f94, FRONT_X + 0.45, y, bz));              // slab
      group.add(box(0.06, 0.8, 2.2, pick(colours), FRONT_X + 0.88, y + 0.45, bz));  // front panel
    }
  }
}

// ---------- Buildings ----------
// Pick one of the ordinary far-bank buildings
export function makeBuilding(z, length) {
  return pick([
    makeWarehouse, makeWarehouse, makeArchedWarehouse, makeCortenBlock,
    makeTimberFlats, makeGoldFlats, makeDoodleWarehouse,
  ])(z, Math.round(length));
}

function makeWarehouse(z, length) {
  const group = new THREE.Group();
  const style = pick(['redBrick', 'redBrick', 'yellowBrick', 'darkBrick']);
  const floors = Math.floor(rand(2, 6));
  const depth = 6;
  group.add(facadeBox(style, length, floors, depth, z));
  const top = WATER_Y + floors * FLOOR;
  if (Math.random() < 0.5) {
    group.add(sawtoothRoof(length, depth, top, z, STYLES[style].wall));
  } else {
    group.add(box(depth + 0.2, 0.3, length + 0.2, 0x3f3f3f, FRONT_X - depth / 2, top + 0.15, z)); // parapet
  }
  return group;
}

// Yellow stock brick, arched windows, concrete plinth at the waterline
function makeArchedWarehouse(z, length) {
  const group = new THREE.Group();
  group.add(facadeBox('arched', length, 3, 6, z, WATER_Y + 0.8));
  group.add(box(6, 0.8, length, 0xb9b4a8, FRONT_X - 3, WATER_Y + 0.4, z)); // plinth
  group.add(box(6.2, 0.25, length + 0.2, 0x8a7a5a, FRONT_X - 3, WATER_Y + 0.8 + 3 * FLOOR, z));
  group.add(box(0.12, 3 * FLOOR, 0.12, 0x1b1b1b, FRONT_X + 0.06, WATER_Y + 0.8 + 1.5 * FLOOR, z + rand(-2, 2))); // drainpipe
  return group;
}

// Rusty Corten steel block with a black external fire escape
function makeCortenBlock(z, length) {
  const group = new THREE.Group();
  const floors = 5;
  const len = Math.min(length, 12);
  group.add(facadeBox('corten', len, floors, 6, z, WATER_Y + 0.6));
  group.add(box(5.6, 0.6, len, 0x2a2a2a, FRONT_X - 3, WATER_Y + 0.3, z)); // dark ground floor
  // Fire escape at the near end
  const fz = z + len / 2 + 0.9;
  for (let f = 1; f <= floors; f++) {
    const y = WATER_Y + 0.6 + f * FLOOR - 0.2;
    group.add(box(1.6, 0.1, 1.4, 0x1b1b1b, FRONT_X - 1.2, y, fz));                    // landing
    group.add(box(0.05, 0.9, 1.4, 0x1b1b1b, FRONT_X - 0.4, y + 0.45, fz));            // railing
    const flight = box(0.9, 0.1, 3.0, 0x1b1b1b, FRONT_X - 1.2, y - FLOOR / 2, fz);
    flight.rotation.x = f % 2 ? 0.75 : -0.75;
    group.add(flight);
  }
  group.add(box(0.12, floors * FLOOR, 0.12, 0x1b1b1b, FRONT_X - 0.4, WATER_Y + floors * FLOOR / 2, fz + 0.7));
  return group;
}

// Timber-clad flats with red, orange and yellow balconies
function makeTimberFlats(z, length) {
  const group = new THREE.Group();
  const floors = 5;
  group.add(facadeBox('timber', length, floors, 7, z, WATER_Y + 0.4));
  group.add(box(7, 0.4, length, 0x2a2a2a, FRONT_X - 3.5, WATER_Y + 0.2, z));
  balconies(group, length, floors, z, [0xd9412b, 0xe8742c, 0xe8c02c, 0xe58a9a]);
  group.add(box(7.2, 0.25, length + 0.2, 0x8a8f94, FRONT_X - 3.5, WATER_Y + 0.4 + floors * FLOOR, z));
  return group;
}

// Dark brick flats with chunky gold balconies
function makeGoldFlats(z, length) {
  const group = new THREE.Group();
  const floors = 6;
  group.add(facadeBox('modern', length, floors, 7, z, WATER_Y + 0.4));
  group.add(box(7, 0.4, length, 0x2a2a2a, FRONT_X - 3.5, WATER_Y + 0.2, z));
  balconies(group, length, floors, z, [0xc9a24a, 0xb8913e]);
  return group;
}

let doodleMat = null;
const doodleGeo = new THREE.PlaneGeometry(7, 6.5);

// A white wall covered in cartoon doodle faces
function doodleTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#ecebe6';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1b1b1b';
    g.fillStyle = '#1b1b1b';
    g.lineWidth = 6;
    for (let i = 0; i < 26; i++) {
      const x = 30 + Math.random() * (w - 60);
      const y = 30 + Math.random() * (h - 60);
      const r = 18 + Math.random() * 22;
      g.beginPath();
      g.ellipse(x, y, r, r * 1.25, 0, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.ellipse(x - r * 0.4, y - r * 0.2, r * 0.22, r * 0.35, 0, 0, Math.PI * 2);
      g.ellipse(x + r * 0.4, y - r * 0.2, r * 0.22, r * 0.35, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(x - r * 0.5, y + r * 0.6);
      for (let k = 1; k <= 4; k++) g.lineTo(x - r * 0.5 + k * r * 0.25, y + r * (k % 2 ? 0.45 : 0.65));
      g.stroke();
    }
  });
}

// Brick warehouse with a doodle-covered end, a corrugated roof and a grey shed behind
function makeDoodleWarehouse(z, length) {
  const group = new THREE.Group();
  group.add(facadeBox('redBrick', length, 3, 6, z));
  doodleMat ||= new THREE.MeshLambertMaterial({ map: doodleTexture() });
  const doodles = new THREE.Mesh(doodleGeo, doodleMat);
  doodles.rotation.y = Math.PI / 2;
  doodles.position.set(FRONT_X + 0.03, WATER_Y + 3.6, z + length / 2 - 3.8);
  group.add(doodles);
  const roof = box(6.4, 0.2, length + 0.4, 0x9aa0a6, FRONT_X - 3, WATER_Y + 3 * FLOOR + 0.6, z);
  roof.rotation.z = 0.25;
  group.add(roof);
  group.add(box(8, 4 * FLOOR, length * 0.6, 0xb8bcc0, FRONT_X - 10, WATER_Y + 2 * FLOOR, z - length * 0.15)); // shed behind
  group.add(box(0.1, 0.9, 1.1, 0xc0392b, FRONT_X + 0.05, WATER_Y + 1.2, z - 1)); // red door
  group.add(box(2.2, 0.15, 1.6, 0xb08a5a, FRONT_X + 1.4, WATER_Y + 0.05, z + 2)); // pontoon
  return group;
}

const tagTextures = {};
function graffitiTexture(words) {
  return (tagTextures[words] ||= canvasTexture(1024, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#f4f4f4';
    g.font = 'bold 72px "Marker Felt", "Comic Sans MS", cursive';
    g.textBaseline = 'middle';
    const fit = Math.min(1, (w - 40) / g.measureText(words).width); // squeeze to fit the wall
    g.save();
    g.translate(20, h / 2 + 4);
    g.scale(fit, 1);
    g.fillText(words, 0, 0);
    g.restore();
  }));
}

let tagMat = null;
let tagGeo = null;

// Our office: the black warehouse on piers, with graffiti and a rooftop garden
export function makeOffice(z) {
  const group = new THREE.Group();
  const length = 18;
  const depth = 7;
  const base = 0.5;
  group.add(facadeBox('office', length, 2, depth, z, base));

  // Piers in the water
  for (let i = 0; i < 5; i++) {
    group.add(box(0.6, 1.4, 0.8, 0x3a3a3a, FRONT_X - 0.6, -0.3, z - length / 2 + 1.5 + i * ((length - 3) / 4)));
  }

  // Graffiti along the bottom
  tagMat ||= new THREE.MeshBasicMaterial({ map: graffitiTexture('RUSHT  GEWEY  HOTSEX  PISTOL PETE'), transparent: true });
  tagGeo ||= new THREE.PlaneGeometry(length - 1, 1.3);
  const tag = new THREE.Mesh(tagGeo, tagMat);
  tag.rotation.y = Math.PI / 2;
  tag.position.set(FRONT_X + 0.02, base + 0.9, z);
  group.add(tag);

  // Rooftop terrace: railing, planters, and old sawtooth roofs behind
  const top = base + 2 * FLOOR;
  group.add(box(0.05, 0.8, length, 0x1b1b1b, FRONT_X - 0.2, top + 0.4, z));
  for (let i = 0; i < 7; i++) {
    const pz = z - length / 2 + 1.5 + i * 2.5;
    group.add(box(0.5, 0.4, 0.8, 0x2b2b2b, FRONT_X - 1, top + 0.2, pz));
    group.add(box(0.45, rand(0.8, 1.8), 0.6, pick([0x5a7d3a, 0x6f8f4e, 0x4f6b35]), FRONT_X - 1, top + 1, pz));
  }
  group.add(box(2, 1.6, 2.4, 0x1e1e1e, FRONT_X - 3, top + 0.8, z + length / 2 - 2)); // stair block
  group.add(sawtoothRoof(length, 4, top + 0.6, z, 0x9b4f3a).translateX(-depth + 2));
  return group;
}

function gasholderTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#4a4f55';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = '#2d3238';
      g.fillRect(0, y + 6, w, 18);        // glazing
      g.fillStyle = '#d9d9d9';
      g.fillRect(0, y + 22, w, 3);        // balcony rail
    }
    g.fillStyle = '#c0392b';
    g.fillRect(40, 0, 26, h);             // red panels
    g.fillRect(170, 0, 26, h);
  });
}
let gas = null;
function gasParts(r, height, frameR) {
  if (!gas) {
    const tex = gasholderTexture();
    tex.repeat.set(6, 5);
    gas = {
      flatsGeo: new THREE.CylinderGeometry(r, r, height, 24),
      flatsMat: new THREE.MeshLambertMaterial({ map: tex }),
      ringGeo: new THREE.TorusGeometry(frameR, 0.25, 6, 32),
    };
  }
  return gas;
}

// The gasholder: round flats inside a Victorian iron frame
export function makeGasholder(z) {
  const group = new THREE.Group();
  const r = 7;
  const cx = FRONT_X - 9;
  const height = 22;

  const frameR = r + 1;
  const parts = gasParts(r, height, frameR);
  const flats = new THREE.Mesh(parts.flatsGeo, parts.flatsMat);
  flats.position.set(cx, WATER_Y + height / 2, z);
  group.add(flats);

  const frameH = height + 4;
  const iron = 0x1f2326;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    group.add(box(0.5, frameH, 0.5, iron, cx + Math.cos(a) * frameR, WATER_Y + frameH / 2, z + Math.sin(a) * frameR));
  }
  for (const y of [6, 13, 20, frameH - 1]) {
    const ring = new THREE.Mesh(parts.ringGeo, mat(iron));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(cx, WATER_Y + y, z);
    group.add(ring);
  }
  return group;
}

// ---------- Shared bits: railings and trees ----------
// Black railings as one see-through textured strip (much cheaper than hundreds of bars)
let railTex = null;
const railMats = new Map();
const railGeos = new Map();
function railing(length, height, x, y, z) {
  railTex ||= canvasTexture(32, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#141414';
    g.fillRect(0, 0, w, 5);       // top rail
    g.fillRect(0, h - 8, w, 4);   // bottom rail
    g.fillRect(13, 0, 5, h);      // upright
  });
  const key = `${length}-${height}`;
  if (!railMats.has(key)) {
    const tex = railTex.clone();
    tex.repeat.set(Math.round(length / 0.25), 1);
    tex.needsUpdate = true;
    railMats.set(key, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
    railGeos.set(key, new THREE.PlaneGeometry(length, height));
  }
  const mesh = new THREE.Mesh(railGeos.get(key), railMats.get(key));
  mesh.rotation.y = Math.PI / 2; // face the canal
  mesh.position.set(x, y, z);
  return mesh;
}

const treeTrunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 1, 6);
const treeCrownGeo = new THREE.IcosahedronGeometry(1, 0);
const TREE_GREENS = [0x4f8a3c, 0x3f7a35, 0x5f9a45, 0x6b9e4a, 0x2f6a35];

// A canal-side tree: round, tall and thin (poplar) or wide and droopy (willow)
function tree(x, z, kind = pick(['round', 'round', 'poplar', 'willow'])) {
  const group = new THREE.Group();
  const trunkH = kind === 'poplar' ? 2 : rand(1.4, 2.2);
  const trunk = new THREE.Mesh(treeTrunkGeo, mat(0x6b4a2f));
  trunk.scale.set(1, trunkH, 1);
  trunk.position.y = trunkH / 2;
  group.add(trunk);
  const crown = new THREE.Mesh(treeCrownGeo, mat(kind === 'willow' ? 0x8fae4f : pick(TREE_GREENS)));
  const size = rand(1.3, 2.1);
  if (kind === 'poplar') crown.scale.set(0.9, 3.2, 0.9);
  else if (kind === 'willow') crown.scale.set(size * 1.3, size * 0.9, size * 1.3);
  else crown.scale.setScalar(size);
  crown.position.y = trunkH + crown.scale.y * 0.75;
  crown.rotation.y = rand(0, Math.PI);
  group.add(crown);
  if (kind === 'willow') { // branches hanging down to the water
    const drape = new THREE.Mesh(treeCrownGeo, mat(0x7c9c42));
    drape.scale.set(size * 1.1, size * 1.2, size * 1.1);
    drape.position.set(0.5, trunkH, 0);
    group.add(drape);
  }
  group.position.set(x, 0, z);
  return group;
}

// Pitched slate roof: a long triangular prism running along the canal
const roofGeos = new Map();
function pitchedRoof(depth, length, height, x, y, z, colour = 0x4a4e57) {
  const key = `${depth}-${length}-${height}`;
  if (!roofGeos.has(key)) {
    const shape = new THREE.Shape([
      new THREE.Vector2(-depth / 2, 0), new THREE.Vector2(depth / 2, 0), new THREE.Vector2(0, height),
    ]);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
    geo.translate(0, 0, -length / 2);
    roofGeos.set(key, geo);
  }
  const roof = new THREE.Mesh(roofGeos.get(key), mat(colour));
  roof.position.set(x, y, z);
  return roof;
}

// ---------- The gaps: low canal-side houses and trees ----------
// Kept low and set back, so the landmarks behind still show over the top
export function makeCanalside(z, length) {
  const group = new THREE.Group();
  const back = 3;           // a strip of garden between the houses and the water
  const depth = 7;
  const x = FRONT_X - back - depth / 2;
  const layout = pick(['terrace', 'terrace', 'render', 'trees']);
  let from = 0;             // the stretch the buildings take up, so trees go around them
  let to = 0;

  if (layout === 'terrace') {
    // Two or three brick houses in a row, pitched roofs and chimneys
    const houses = pick([2, 3]);
    const w = 6;
    const style = pick(['terrace', 'terraceRed']);
    const start = z + rand(-3, 3) - (houses * w) / 2;
    for (let i = 0; i < houses; i++) {
      const hz = start + w * (i + 0.5);
      const house = facadeBox(style, w - 0.1, 2, depth, hz, 0);
      house.position.x -= back;
      group.add(house);
      group.add(pitchedRoof(depth + 0.4, w, 2.2, x, 2 * FLOOR, hz));
      group.add(box(0.7, 1.2, 1.4, STYLES[style].wall, x, 2 * FLOOR + 2.1, hz - w / 2)); // chimney
      group.add(box(0.9, 1.0, 0.25, 0x2b2b2b, FRONT_X - back + 0.1, 1.0, hz + 1.5));   // front door
    }
    from = start;
    to = start + houses * w;
    group.add(box(0.3, 0.6, houses * w, STYLES[style].wall, FRONT_X - 0.6, 0.3, (from + to) / 2)); // garden wall
  } else if (layout === 'render') {
    // A white-render block with a flat roof and a couple of balconies
    const w = 9;
    const rz = z + rand(-3, 3);
    const block = facadeBox('render', w, 3, depth, rz, 0);
    block.position.x -= back;
    group.add(block);
    group.add(box(depth + 0.2, 0.3, w + 0.2, 0xd6d3cc, x, 3 * FLOOR + 0.15, rz)); // parapet
    for (const f of [1, 2]) {
      group.add(box(0.8, 0.1, 2.4, 0x9aa0a6, FRONT_X - back + 0.4, f * FLOOR, rz - 1.5));
      group.add(railing(2.4, 0.9, FRONT_X - back + 0.8, f * FLOOR + 0.5, rz - 1.5));
    }
    from = rz - w / 2;
    to = rz + w / 2;
    group.add(railing(w + 2, 1.1, FRONT_X - 0.5, 0.55, rz));
  }

  // Trees: in front of the houses, between them, and a few further back
  const trees = layout === 'trees' ? Math.floor(rand(4, 7)) : Math.floor(rand(2, 5));
  for (let i = 0; i < trees; i++) {
    const tz = z + rand(-length / 2 + 1, length / 2 - 1);
    const inFront = tz > from - 1 && tz < to + 1;
    const tx = inFront ? FRONT_X - rand(0.8, 2) : FRONT_X - rand(1, 6);
    group.add(tree(tx, tz, inFront ? pick(['round', 'willow']) : undefined));
  }
  for (let i = 0; i < 3; i++) group.add(tree(FRONT_X - rand(12, 16), z + rand(-length / 2, length / 2)));
  // Bushes along the bank
  for (let i = 0; i < 4; i++) {
    const bush = new THREE.Mesh(treeCrownGeo, mat(pick(TREE_GREENS)));
    bush.scale.set(rand(0.5, 0.9), rand(0.4, 0.7), rand(0.6, 1.2));
    bush.position.set(FRONT_X - rand(0.4, 1.2), 0.3, z + rand(-length / 2, length / 2));
    group.add(bush);
  }
  return group;
}

// ---------- Landmark: ONE HUNDRED YEARS, big portraits on the railings ----------
// Seven invented faces, from a baby to a hundred-year-old
const AGES = [
  { age: 0, hair: 'tuft', grey: 0, wrinkles: 0 },
  { age: 9, hair: 'bob', grey: 0, wrinkles: 0 },
  { age: 18, hair: 'fringe', grey: 0, wrinkles: 0 },
  { age: 34, hair: 'short', grey: 0, wrinkles: 0.1, beard: true },
  { age: 55, hair: 'long', grey: 0.5, wrinkles: 0.4, glasses: true },
  { age: 78, hair: 'receding', grey: 0.9, wrinkles: 0.7, glasses: true },
  { age: 100, hair: 'wisps', grey: 1, wrinkles: 1 },
];
const SKINS = ['#f1c9a5', '#e0ac85', '#c98d64', '#9a6040', '#6b4029', '#e8b894', '#b07850'];
const BACKDROPS = ['#c9b8a6', '#9fb3c8', '#d8c7b0', '#a8b5a0', '#c7a6a0', '#b6b0c8', '#d4cfc7'];
const HAIRS = ['#2a1d14', '#4a3020', '#1a1a1a', '#7a4a24', '#3a2a1a', '#2a1d14', '#5a3a22'];

function portraitTexture(i) {
  const p = AGES[i];
  return canvasTexture(160, 220, (g, w, h) => {
    const cx = 80;
    const baby = p.age === 0;
    const headY = baby ? 98 : 84;
    const rx = baby ? 44 : 36;
    const ry = baby ? 44 : 46;
    const hair = p.grey >= 0.9 ? '#e6e4e0' : p.grey > 0 ? '#8c8781' : HAIRS[i];
    // Studio backdrop with a soft vignette, like a printed photo
    const grad = g.createRadialGradient(cx, 90, 20, cx, 100, 130);
    grad.addColorStop(0, BACKDROPS[i]);
    grad.addColorStop(1, '#4a4440');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, 190);
    // Long hair falls behind the shoulders
    if (p.hair === 'long' || p.hair === 'bob') {
      g.fillStyle = hair;
      g.beginPath();
      g.ellipse(cx, headY + 10, rx + 10, ry + (p.hair === 'long' ? 30 : 12), 0, 0, Math.PI * 2);
      g.fill();
    }
    // Shoulders and neck
    g.fillStyle = ['#e8e2d4', '#e85d4a', '#2f4f6f', '#3a3a3a', '#6b8f5a', '#7a5a8a', '#d9d2c3'][i];
    g.beginPath();
    g.ellipse(cx, 200, baby ? 52 : 66, 48, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = SKINS[i];
    if (!baby) g.fillRect(cx - 14, headY + 30, 28, 30);
    // Head
    g.beginPath();
    g.ellipse(cx, headY, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.fillRect(cx - rx - 4, headY - 4, 8, 14); // ears
    g.fillRect(cx + rx - 4, headY - 4, 8, 14);
    // Hair on top
    g.fillStyle = hair;
    g.strokeStyle = hair;
    if (p.hair === 'tuft') {
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(cx - 4, headY - ry + 2); g.quadraticCurveTo(cx, headY - ry - 14, cx + 8, headY - ry - 8);
      g.stroke();
    } else if (p.hair === 'bob' || p.hair === 'long') {
      g.beginPath();
      g.ellipse(cx, headY - ry + 18, rx + 4, 26, 0, Math.PI, 0);
      g.fill();
      g.fillRect(cx - rx - 4, headY - ry + 16, rx * 2 + 8, 10);
    } else if (p.hair === 'fringe') {
      g.beginPath();
      g.ellipse(cx, headY - ry + 16, rx + 5, 24, -0.15, Math.PI, 0);
      g.fill();
      g.beginPath();
      g.moveTo(cx - rx, headY - ry + 14); g.lineTo(cx + 12, headY - 16); g.lineTo(cx + rx, headY - ry + 14);
      g.fill();
    } else if (p.hair === 'short') {
      g.beginPath();
      g.ellipse(cx, headY - ry + 14, rx + 2, 18, 0, Math.PI, 0);
      g.fill();
    } else if (p.hair === 'receding') {
      g.fillRect(cx - rx - 2, headY - 26, 10, 26);
      g.fillRect(cx + rx - 8, headY - 26, 10, 26);
      g.beginPath();
      g.ellipse(cx, headY - ry + 10, 18, 7, 0, Math.PI, 0);
      g.fill();
    } else if (p.hair === 'wisps') {
      g.lineWidth = 2;
      for (const side of [-1, 1]) {
        for (let k = 0; k < 5; k++) {
          g.beginPath();
          g.moveTo(cx + side * (rx - 4), headY - 18 + k * 5);
          g.lineTo(cx + side * (rx + 8), headY - 24 + k * 6);
          g.stroke();
        }
      }
    }
    // Beard
    if (p.beard) {
      g.beginPath();
      g.ellipse(cx, headY + 26, 28, 20, 0, 0, Math.PI);
      g.fill();
    }
    // Eyes, eyebrows, nose, mouth
    const eyeY = headY - (baby ? 0 : 6);
    g.fillStyle = '#1a1410';
    for (const side of [-1, 1]) {
      g.beginPath();
      g.arc(cx + side * 14, eyeY, baby ? 4.5 : 3.5, 0, Math.PI * 2);
      g.fill();
      if (!baby) g.fillRect(cx + side * 14 - 7, eyeY - 11, 14, 3);
    }
    g.strokeStyle = 'rgba(60,30,20,0.6)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx, eyeY + 4); g.lineTo(cx - 4, eyeY + 18); g.lineTo(cx + 2, eyeY + 19);
    g.stroke();
    g.strokeStyle = '#7a3a30';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, eyeY + 22, baby ? 6 : 9, 0.2, Math.PI - 0.2);
    g.stroke();
    // Lines that come with the years
    if (p.wrinkles > 0) {
      g.strokeStyle = `rgba(70,40,30,${0.25 + p.wrinkles * 0.35})`;
      g.lineWidth = 1.5;
      for (let k = 0; k < Math.round(p.wrinkles * 4); k++) { // forehead
        g.beginPath();
        g.moveTo(cx - 16, headY - 26 - k * 5); g.lineTo(cx + 16, headY - 26 - k * 5);
        g.stroke();
      }
      for (const side of [-1, 1]) { // smile lines and crow's feet
        g.beginPath();
        g.moveTo(cx + side * 10, eyeY + 14); g.lineTo(cx + side * 16, eyeY + 30);
        g.moveTo(cx + side * 24, eyeY - 2); g.lineTo(cx + side * 30, eyeY - 6);
        g.moveTo(cx + side * 24, eyeY + 2); g.lineTo(cx + side * 30, eyeY + 4);
        g.stroke();
      }
    }
    if (p.glasses) {
      g.strokeStyle = '#222';
      g.lineWidth = 2.5;
      g.strokeRect(cx - 24, eyeY - 8, 20, 15);
      g.strokeRect(cx + 4, eyeY - 8, 20, 15);
      g.beginPath();
      g.moveTo(cx - 4, eyeY - 2); g.lineTo(cx + 4, eyeY - 2);
      g.stroke();
    }
    // The age, on a white strip underneath
    g.fillStyle = '#f4f2ee';
    g.fillRect(0, 190, w, 30);
    g.fillStyle = '#111';
    g.font = 'bold 22px Helvetica, Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText(String(p.age), cx, 213);
  });
}

let portraitParts = null;
function getPortraitParts() {
  if (portraitParts) return portraitParts;
  const title = canvasTexture(512, 48, (g, w, h) => {
    g.fillStyle = '#f4f2ee';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#111';
    g.font = 'bold 30px Helvetica, Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('O N E   H U N D R E D   Y E A R S', w / 2, h / 2 + 1);
  });
  portraitParts = {
    geo: new THREE.PlaneGeometry(2.4, 3.3),
    mats: AGES.map((_, i) => new THREE.MeshBasicMaterial({ map: portraitTexture(i), color: 0xe6e6e6 })),
    titleGeo: new THREE.PlaneGeometry(7, 0.66),
    titleMat: new THREE.MeshBasicMaterial({ map: title, color: 0xe6e6e6 }),
  };
  return portraitParts;
}

// The portraits stand along the far-bank railings, facing the towpath, with a park behind
export function makePortraits(z) {
  const group = new THREE.Group();
  const parts = getPortraitParts();
  const px = FRONT_X - 0.5;
  group.add(box(4, 0.04, 19.6, 0x6f8f4e, FRONT_X - 2.2, 0.02, z)); // grass
  group.add(railing(19.6, 1.2, px - 0.1, 0.6, z));
  const step = 2.75;
  for (let i = 0; i < AGES.length; i++) {
    const pz = z + 8.25 - i * step; // youngest first, as you walk up the towpath
    const photo = new THREE.Mesh(parts.geo, parts.mats[i]);
    photo.rotation.y = Math.PI / 2;
    photo.position.set(px + 0.05, 2.35, pz);
    group.add(photo);
    group.add(box(0.06, 3.4, 2.5, 0x1b1b1b, px, 2.35, pz));  // backing board
    group.add(box(0.1, 0.8, 0.1, 0x1b1b1b, px, 0.4, pz));    // post
  }
  const title = new THREE.Mesh(parts.titleGeo, parts.titleMat);
  title.rotation.y = Math.PI / 2;
  title.position.set(px + 0.05, 4.5, z);
  group.add(box(0.06, 0.74, 7.1, 0x1b1b1b, px, 4.5, z));
  group.add(title);
  for (let i = 0; i < 5; i++) group.add(tree(FRONT_X - rand(4, 9), z + rand(-9, 9)));
  return group;
}

// ---------- Landmark: Containerville ----------
// Black containers, three storeys, glass doors and windows behind concertina security grilles
function containerTexture(variant) {
  return canvasTexture(256, 104, (g, w, h) => {
    g.fillStyle = '#1b1b1d';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) { // corrugation
      g.fillStyle = '#26262a';
      g.fillRect(x, 0, 4, h);
    }
    g.fillStyle = '#0e0e10';
    g.fillRect(0, 0, w, 5);
    g.fillRect(0, h - 5, w, 5);
    // Glass door on one side, wide window next to it
    const lit = variant % 3 === 1;
    const glass = lit ? '#e2c27a' : '#4f6470';
    const panes = [[20, 14, 52, 86], [86, 18, 150, 56]];
    for (const [x, y, pw, ph] of panes) {
      g.fillStyle = '#3a3a3e';
      g.fillRect(x - 3, y - 3, pw + 6, ph + 6);
      g.fillStyle = glass;
      g.fillRect(x, y, pw, ph);
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.fillRect(x + 4, y + 4, pw * 0.3, ph * 0.25);
    }
    if (variant === 2) { // plants in the window
      g.fillStyle = '#4f8a3c';
      for (let k = 0; k < 5; k++) g.fillRect(100 + k * 26, 52, 14, 22);
    }
    // Concertina grilles: closed across some panes, folded to the side on others
    g.strokeStyle = '#8a8a8e';
    g.lineWidth = 2;
    panes.forEach(([x, y, pw, ph], k) => {
      const closed = (variant + k) % 2 === 0;
      const gw = closed ? pw : 14;
      g.beginPath();
      for (let gx = 0; gx <= gw; gx += 8) { g.moveTo(x + gx, y); g.lineTo(x + gx, y + ph); }
      if (closed) {
        for (let gx = 0; gx < gw; gx += 8) { // the criss-cross
          for (let gy = 0; gy < ph; gy += 12) {
            g.moveTo(x + gx, y + gy); g.lineTo(x + gx + 8, y + gy + 12);
            g.moveTo(x + gx + 8, y + gy); g.lineTo(x + gx, y + gy + 12);
          }
        }
      }
      g.stroke();
    });
  });
}

let crate = null;
function getContainerParts() {
  if (crate) return crate;
  const side = mat(0x1e1e21);
  crate = {
    geo: new THREE.BoxGeometry(2.5, 2.5, 5.6),
    mats: [0, 1, 2, 3].map((v) => [new THREE.MeshLambertMaterial({ map: containerTexture(v) }), side, side, side, side, side]),
    sign: new THREE.MeshBasicMaterial({ map: canvasTexture(256, 64, (g, w, h) => {
      g.fillStyle = '#f2d43a';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#111';
      g.font = 'bold 30px Helvetica, Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('SPACES AVAILABLE', w / 2, h / 2 - 6);
      g.font = 'bold 14px Helvetica, Arial, sans-serif';
      g.fillText('STUDIOS · WORKSHOPS · VIBES', w / 2, h / 2 + 18);
    }) }),
    signGeo: new THREE.PlaneGeometry(3.2, 0.8),
  };
  return crate;
}

export function makeContainerville(z) {
  const group = new THREE.Group();
  const parts = getContainerParts();
  const back = 1.3;              // walkways and railings in front
  const cx = FRONT_X - back - 1.25;
  const cl = 5.6;
  const level = 2.6;
  const start = z - 9.6;         // three containers per storey, staircase at the far end
  group.add(box(4.4, 0.04, 19.6, 0x7a7670, FRONT_X - 2.2, 0.02, z)); // concrete yard

  for (let lv = 0; lv < 3; lv++) {
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(parts.geo, parts.mats[(lv * 3 + i * 2 + Math.floor(rand(0, 2))) % 4]);
      c.position.set(cx, lv * level + 1.25, start + cl * (i + 0.5) + 0.05 * i);
      group.add(c);
    }
    const runZ = start + (cl * 3) / 2;
    if (lv > 0) { // walkway balcony along the front of the upper storeys
      group.add(box(back, 0.12, cl * 3, 0x2a2a2c, FRONT_X - back / 2, lv * level, runZ));
      group.add(railing(cl * 3, 1.0, FRONT_X - 0.05, lv * level + 0.55, runZ));
    }
  }
  group.add(box(2.6, 0.2, cl * 3 + 0.2, 0x111113, cx, 3 * level - 0.05, start + (cl * 3) / 2)); // roof edge
  // The ground floor sits behind railings
  group.add(railing(cl * 3, 1.4, FRONT_X - 0.1, 0.7, start + (cl * 3) / 2));
  // Plants on the walkways
  for (let i = 0; i < 6; i++) {
    const pz = start + rand(0.5, cl * 3 - 0.5);
    const lv = pick([1, 2]);
    group.add(box(0.4, 0.35, 0.4, 0x2b2b2b, FRONT_X - 0.4, lv * level + 0.24, pz));
    group.add(box(0.35, rand(0.4, 0.9), 0.35, pick(TREE_GREENS), FRONT_X - 0.4, lv * level + 0.7, pz));
  }

  // Black outside staircase at the end, zig-zagging up to each walkway
  const sz = start + cl * 3 + 0.9;
  const steps = 9;
  for (let lv = 0; lv < 2; lv++) {
    const dir = lv % 2 ? -1 : 1;  // first flight climbs back from the water, second climbs forward
    const x0 = dir > 0 ? FRONT_X - 3.6 : FRONT_X - 0.6;
    for (let j = 0; j < steps; j++) {
      group.add(box(0.3, 0.08, 1.3, 0x161618, x0 - dir * (j * 0.33) * -1, lv * level + (j + 1) * (level / steps), sz));
    }
    group.add(box(1.4, 0.1, 1.5, 0x161618, dir > 0 ? FRONT_X - 0.6 : FRONT_X - 3.6, (lv + 1) * level, sz)); // landing
    for (const side of [-0.68, 0.68]) { // the two sloping side beams
      const beam = box(Math.hypot(steps * 0.33, level) + 0.3, 0.16, 0.08, 0x161618, x0 + dir * (steps - 1) * 0.165, lv * level + level / 2, sz + side);
      beam.rotation.z = dir * Math.atan2(level, steps * 0.33);
      group.add(beam);
    }
  }
  for (const px of [FRONT_X - 0.3, FRONT_X - 3.9]) {
    group.add(box(0.1, 2 * level + 1, 0.1, 0x161618, px, level + 0.5, sz + 0.65)); // posts
  }

  // The sign: they always have space
  const sign = new THREE.Mesh(parts.signGeo, parts.sign);
  sign.rotation.y = Math.PI / 2;
  sign.position.set(FRONT_X + 0.02, 2 * level + 0.55, start + cl * 1.5);
  group.add(sign);

  // The gasholder flats rise behind
  const gasholder = makeGasholder(z - 4);
  gasholder.position.x = -12;
  group.add(gasholder);
  return group;
}

// ---------- Easter egg: the Hackney Wick sharks ----------
const sharkBodyGeo = new THREE.CylinderGeometry(0.45, 0.75, 3.2, 8);
const sharkSnoutGeo = new THREE.ConeGeometry(0.45, 1.0, 8);
const sharkJawGeo = new THREE.ConeGeometry(0.4, 0.9, 8);

function makeShark(colour) {
  const shark = new THREE.Group();
  const body = new THREE.Mesh(sharkBodyGeo, mat(colour));
  body.position.y = 1.6;
  shark.add(body);
  shark.add(box(0.5, 2.4, 0.08, 0xe8e6e0, 0, 1.4, 0.62));      // pale belly
  // Upper jaw tipped back, lower jaw dropped forward: mouth wide open
  const snout = new THREE.Mesh(sharkSnoutGeo, mat(colour));
  snout.position.set(0, 3.55, -0.2);
  snout.rotation.x = -0.5;
  shark.add(snout);
  const jaw = new THREE.Mesh(sharkJawGeo, mat(0xe8e6e0));
  jaw.position.set(0, 3.25, 0.45);
  jaw.rotation.x = 1.0;
  shark.add(jaw);
  shark.add(box(0.75, 0.6, 0.35, 0x9b1c1c, 0, 3.35, 0.18));    // inside of the mouth
  for (let i = -2; i <= 2; i++) {
    shark.add(box(0.07, 0.12, 0.07, 0xffffff, i * 0.11, 3.55, 0.28)); // teeth
  }
  shark.add(box(0.08, 0.05, 0.08, 0x111111, -0.33, 3.45, -0.05)); // eyes
  shark.add(box(0.08, 0.05, 0.08, 0x111111, 0.33, 3.45, -0.05));
  const finL = box(0.9, 0.08, 0.5, colour, -0.7, 1.9, 0.2);
  finL.rotation.z = 0.5;
  const finR = box(0.9, 0.08, 0.5, colour, 0.7, 1.9, 0.2);
  finR.rotation.z = -0.5;
  shark.add(finL, finR);
  return shark;
}

// Sharks bursting out of the canal in front of an old yellow-brick warehouse
export function makeSharks(z) {
  const group = new THREE.Group();
  group.add(facadeBox('yellowBrick', 18, 3, 6, z, WATER_Y + 0.6));
  group.add(box(0.5, 0.6, 18, 0x4a3a2a, FRONT_X + 0.25, WATER_Y + 0.3, z)); // timber quay
  const spots = [
    [-9.5, -4.5, 0x7d8a96, 1.6], [-11.0, -1.5, 0x8a96a0, 1.8], [-9.0, 1.5, 0xc9a06b, 2.0],
    [-10.8, 4.5, 0x7d8a96, 1.7], [-12.2, -7, 0x8a96a0, 1.4],
  ];
  for (const [x, dz, colour, scale] of spots) {
    const shark = makeShark(colour);
    shark.position.set(x, WATER_Y - 1.0 * scale, z + dz);
    shark.scale.setScalar(scale);
    // Mouths turned towards people walking up the towpath
    shark.rotation.set(rand(0.05, 0.3), rand(0.2, 0.9), rand(-0.3, 0.1));
    group.add(shark);
    group.add(box(1.4 * scale, 0.15, 1.4 * scale, 0x5c4a36, x, WATER_Y + 0.02, z + dz)); // floating platform
  }
  return group;
}
