// East London canal-side buildings for the far bank: warehouses, our black office,
// the gasholder flats and Containerville. Facades use small canvas-drawn textures.
import * as THREE from 'three';
import { box, mat } from './models.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const rand = (min, max) => min + Math.random() * (max - min);

export const FRONT_X = -15.3; // the canal-side face of the far bank
const FLOOR = 2.6;
const BAY = 3;

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

// One window bay: wall, a big crittall-style window with a grid of glazing bars
function bayTexture({ wall, frame, glass, brickLines }) {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = css(wall);
    g.fillRect(0, 0, w, h);
    if (brickLines) {
      g.fillStyle = 'rgba(0,0,0,0.12)';
      for (let y = 4; y < h; y += 8) g.fillRect(0, y, w, 1);
    }
    g.fillStyle = css(frame);
    g.fillRect(18, 20, 92, 80);
    g.fillStyle = css(glass);
    g.fillRect(22, 24, 84, 72);
    g.fillStyle = css(frame);
    for (let i = 1; i < 4; i++) g.fillRect(22 + (84 / 4) * i - 1, 24, 3, 72);
    for (let i = 1; i < 3; i++) g.fillRect(22, 24 + (72 / 3) * i - 1, 84, 3);
    g.fillStyle = 'rgba(255,255,255,0.18)'; // a bit of sky reflection
    g.fillRect(24, 26, 30, 20);
  });
}

const STYLES = {
  redBrick:    { wall: 0x9b4f3a, frame: 0x2b2b2b, glass: 0x51606b, brickLines: true },
  yellowBrick: { wall: 0xc9a66b, frame: 0x2b2b2b, glass: 0x4f5d66, brickLines: true },
  darkBrick:   { wall: 0x6b3a2e, frame: 0xe8e2d4, glass: 0x45535c, brickLines: true },
  office:      { wall: 0x2a2a2c, frame: 0x161616, glass: 0x8fa3ad, brickLines: true },
};

const bayTextures = {};
const boxGeos = new Map(); // shared shapes, so rebuilding scenery doesn't leak memory
const facadeMats = new Map();

// A material whose texture repeats the window bay across the whole facade
function facadeMat(style, bays, floors) {
  const key = `${style}-${bays}-${floors}`;
  if (!facadeMats.has(key)) {
    bayTextures[style] ||= bayTexture(STYLES[style]);
    const tex = bayTextures[style].clone();
    tex.repeat.set(bays, floors);
    tex.needsUpdate = true;
    facadeMats.set(key, new THREE.MeshLambertMaterial({ map: tex }));
  }
  return facadeMats.get(key);
}

// A box whose canal-facing (+x) side shows the facade
function facadeBox(style, length, floors, depth, z, baseY = -0.7) {
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

// ---------- Buildings ----------
export function makeWarehouse(z, length) {
  length = Math.round(length);
  const group = new THREE.Group();
  const style = pick(['redBrick', 'redBrick', 'yellowBrick', 'darkBrick']);
  const floors = Math.floor(rand(2, 6));
  const depth = 6;
  group.add(facadeBox(style, length, floors, depth, z));
  const top = -0.7 + floors * FLOOR;
  if (Math.random() < 0.5) {
    group.add(sawtoothRoof(length, depth, top, z, STYLES[style].wall));
  } else {
    group.add(box(depth + 0.2, 0.3, length + 0.2, 0x3f3f3f, FRONT_X - depth / 2, top + 0.15, z)); // parapet
  }
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
  flats.position.set(cx, -0.7 + height / 2, z);
  group.add(flats);

  const frameH = height + 4;
  const iron = 0x1f2326;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    group.add(box(0.5, frameH, 0.5, iron, cx + Math.cos(a) * frameR, -0.7 + frameH / 2, z + Math.sin(a) * frameR));
  }
  for (const y of [6, 13, 20, frameH - 1]) {
    const ring = new THREE.Mesh(parts.ringGeo, mat(iron));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(cx, -0.7 + y, z);
    group.add(ring);
  }
  return group;
}

let signMat = null;
const signGeo = new THREE.PlaneGeometry(13, 2.1);

// Containerville: stacked shipping containers turned into studios, with the yellow sign
export function makeContainerville(z) {
  const group = new THREE.Group();
  const colours = [0x1e1e1e, 0x2b2b2b, 0x1e1e1e, 0x3d4a3d, 0x7a2e22, 0x1f3a5f];
  const cl = 6;
  for (let level = 0; level < 3; level++) {
    for (let i = 0; i < 3; i++) {
      if (level === 2 && i === 0) continue;
      const cz = z - 7 + i * (cl + 0.2) + (level % 2) * 1.2;
      const container = box(2.4, 2.5, cl, pick(colours), FRONT_X - 1.4 - (level === 2 ? 2 : 0), 0.55 + level * 2.6, cz);
      group.add(container);
      for (let rib = -2.5; rib <= 2.5; rib += 0.5) {
        group.add(box(0.05, 2.3, 0.08, 0x111111, FRONT_X - 0.18 - (level === 2 ? 2 : 0), 0.55 + level * 2.6, cz + rib));
      }
    }
  }
  group.add(box(0.1, 0.1, 18, 0x111111, FRONT_X - 0.1, 2.9, z)); // walkway rail

  signMat ||= new THREE.MeshBasicMaterial({ transparent: true, map: canvasTexture(1024, 160, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#ffd400';
    g.font = '900 120px "Arial Black", Impact, sans-serif';
    g.textBaseline = 'middle';
    g.fillText('CONTAINERVILLE', 10, h / 2 + 6);
  }) });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.rotation.y = Math.PI / 2 - 0.55; // turned towards people walking up the towpath
  sign.position.set(FRONT_X - 2.5, 8.4, z + 1);
  group.add(sign);
  return group;
}
