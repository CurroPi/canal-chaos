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

const STYLES = {
  redBrick:    { wall: 0x9b4f3a, draw: crittall(0x9b4f3a, 0x2b2b2b, 0x51606b) },
  yellowBrick: { wall: 0xc9a66b, draw: crittall(0xc9a66b, 0x2b2b2b, 0x4f5d66) },
  darkBrick:   { wall: 0x6b3a2e, draw: crittall(0x6b3a2e, 0xe8e2d4, 0x45535c) },
  office:      { wall: 0x2a2a2c, draw: crittall(0x2a2a2c, 0x161616, 0x8fa3ad) },
  arched:      { wall: 0xa88a5a, draw: arched },
  corten:      { wall: 0x8c4a26, draw: corten },
  timber:      { wall: 0xb08257, draw: timber },
  modern:      { wall: 0x3a3b40, draw: modern },
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
    g.fillText(words, 20, h / 2 + 4);
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
  tagMat ||= new THREE.MeshBasicMaterial({ map: graffitiTexture('OAT MILK · E8 4EVA · RENT£££ · SOURDOUGH'), transparent: true });
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

// Containerville: stacked shipping containers turned into studios
export function makeContainerville(z) {
  const group = new THREE.Group();
  const colours = [0x1e1e1e, 0x2b2b2b, 0x1e1e1e, 0x3d4a3d, 0x7a2e22, 0x1f3a5f];
  const cl = 6;
  for (let level = 0; level < 3; level++) {
    for (let i = 0; i < 3; i++) {
      if (level === 2 && i === 0) continue;
      const cz = z - 7 + i * (cl + 0.2) + (level % 2) * 1.2;
      const back = level === 2 ? 2 : 0;
      group.add(box(2.4, 2.5, cl, pick(colours), FRONT_X - 1.4 - back, 0.55 + level * 2.6, cz));
      for (let rib = -2.5; rib <= 2.5; rib += 0.5) {
        group.add(box(0.05, 2.3, 0.08, 0x111111, FRONT_X - 0.18 - back, 0.55 + level * 2.6, cz + rib));
      }
    }
  }
  group.add(box(0.1, 0.1, 18, 0x111111, FRONT_X - 0.1, 2.9, z)); // walkway rail
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
