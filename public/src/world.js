// The scrolling canal scenery: towpath, canal, narrowboats, brick wall, far bank.
import * as THREE from 'three';
import { box, mat, makeLimeBike } from './models.js';
import { FRONT_X, makeBuilding, makeOffice, makeGasholder, makeContainerville, makeSharks } from './buildings.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const rand = (min, max) => min + Math.random() * (max - min);

const BOAT_COLOURS = [0x1f5f3a, 0x8c1c1c, 0x1d2f5c, 0x5b2a5e, 0x2a6f73, 0x222222];
const GRAFFITI = [0xff5fa2, 0x3fd3ff, 0xffd23f, 0x7cff6b, 0xffffff, 0xff7a1a];

const WATER_Y = -0.7;
const waterMat = new THREE.MeshLambertMaterial({ color: 0x3d5f52, transparent: true, opacity: 0.68 });

// Canal rubbish (shared shapes)
const canGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.22, 8);
const bottleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.34, 8);
const cupGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.2, 8);
const coneGeo = new THREE.ConeGeometry(0.25, 0.7, 8);

const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.4, 6);
const crownGeo = new THREE.IcosahedronGeometry(1.4, 0);

export function createWorld(scene, cfg) {
  const L = cfg.tile.length;
  const N = cfg.tile.count;
  const tiles = [];
  let sinceLandmark = 0;
  let queued = null;

  // What stands on the far bank of the next tile: mostly warehouses, sometimes a landmark
  function nextFarBank() {
    if (world.forceNext) {
      queued = world.forceNext;
      world.forceNext = null;
      return 'gap';
    }
    if (queued) {
      const kind = queued;
      queued = null;
      return kind;
    }
    sinceLandmark++;
    if (sinceLandmark >= 6 && Math.random() < 0.3) {
      // Leave a low gap in front of a landmark so you can see it coming
      sinceLandmark = 0;
      queued = pick(['gasholder', 'gasholder', 'containerville', 'containerville', 'sharks']);
      return 'gap';
    }
    return Math.random() < 0.15 ? 'gap' : 'warehouses';
  }

  for (let i = 0; i < N; i++) {
    const tile = new THREE.Group();
    tile.position.z = 10 - i * L;
    buildStatic(tile, L);
    tile.userData.decor = new THREE.Group();
    tile.add(tile.userData.decor);
    scene.add(tile);
    tiles.push(tile);
  }

  // Distance walked, so the office can come back every `cfg.officeEvery` points
  let walked = 0;
  let nextOffice = 0;
  const trackPos = (tile) => walked - tile.position.z;

  const world = {
    forceNext: null, // testing helper: the next tile's far bank

    scroll(dz) {
      walked += dz;
      for (const tile of tiles) {
        tile.position.z += dz;
        if (tile.position.z - L / 2 > 12) {
          tile.position.z -= N * L;
          const p = trackPos(tile);
          let farBank;
          if (p >= nextOffice - L / 2) {
            farBank = 'office';
            nextOffice += cfg.officeEvery;
          } else if (p >= nextOffice - L * 1.5) {
            farBank = 'gap'; // clear view of the office
          } else {
            farBank = nextFarBank();
          }
          decorate(tile, L, farBank);
        }
      }
    },

    // Fresh scenery for a new run. Our office comes a few seconds in, with a clear view of it.
    reset() {
      const nearest = (z) => tiles.reduce((a, b) => (Math.abs(b.position.z - z) < Math.abs(a.position.z - z) ? b : a));
      const officeTile = nearest(-75);
      const inFront = nearest(officeTile.position.z + L);
      walked = 0;
      nextOffice = trackPos(officeTile) + cfg.officeEvery;
      sinceLandmark = 0;
      queued = null;
      for (const tile of tiles) {
        decorate(tile, L, tile === officeTile ? 'office' : tile === inFront ? 'gap' : nextFarBank());
      }
      // Our tag, sprayed on the wall where you see it on the welcome screen
      const tagTile = nearest(cfg.signature.z);
      const decor = tagTile.userData.decor;
      decor.children.filter((o) => Math.abs(o.position.x - 3.08) < 0.01).forEach((o) => decor.remove(o)); // clear the wall
      const tag = makeSignatureTag(cfg.signature);
      tag.position.z = cfg.signature.z - tagTile.position.z;
      tagTile.userData.decor.add(tag);
    },
  };
  world.reset();
  return world;
}

// Things that look the same on every tile
function buildStatic(tile, L) {
  // Towpath (x from -3 to 3)
  tile.add(box(6, 0.2, L, 0xb8a689, 0, -0.1, 0));
  for (const x of [-1, 1]) {
    for (let z = -L / 2 + 1; z < L / 2; z += 4) {
      tile.add(box(0.06, 0.01, 1.6, 0xd8cbb2, x, 0.005, z));
    }
  }

  // Canal edge, canal and far bank (left)
  tile.add(box(0.5, 0.12, L, 0xcfc8b8, -3.2, 0.0, 0));
  tile.add(box(0.4, 2.1, L, 0x7d7468, -3.25, -1.05, 0));
  tile.add(box(0.4, 2.1, L, 0x6e675e, FRONT_X + 0.2, -1.05, 0)); // far canal edge
  tile.add(box(12, 0.1, L, 0x2a3326, -9.5, -2.0, 0));            // murky canal bed
  const water = new THREE.Mesh(new THREE.BoxGeometry(12, 0.1, L), waterMat);
  water.position.set(-9.5, WATER_Y - 0.05, 0);
  tile.add(water);
  tile.add(box(16, 0.8, L, 0x5c5650, FRONT_X - 8, -0.4, 0));  // far bank ground

  // Brick wall (right) with brick courses and coping stones
  tile.add(box(1, 3.2, L, 0x9b4f3a, 3.6, 1.6, 0));
  for (let y = 0.4; y < 3.1; y += 0.45) {
    tile.add(box(0.02, 0.04, L, 0x7f3e2d, 3.09, y, 0));
  }
  tile.add(box(1.2, 0.15, L, 0x8b8378, 3.6, 3.25, 0));
}

// Random bits that change every time a tile is reused
function decorate(tile, L, farBank) {
  const decor = tile.userData.decor;
  decor.clear();

  // Narrowboat moored at the edge
  if (Math.random() < 0.6) {
    const z = rand(-3, 3);
    const colour = pick(BOAT_COLOURS);
    decor.add(box(1.9, 1.2, 13, colour, -4.5, -0.6, z));
    decor.add(box(1.6, 0.5, 11.5, 0xe9e1cf, -4.5, 0.25, z));
    decor.add(box(1.62, 0.06, 11.6, colour, -4.5, 0.53, z));
    for (let wz = -4.5; wz <= 4.5; wz += 1.8) {
      decor.add(box(0.03, 0.22, 0.6, 0x2b3a42, -3.69, 0.27, z + wz));
    }
    decor.add(box(0.12, 0.45, 0.12, 0x333333, -4.8, 0.78, z - 4));
    for (let i = 0; i < 4; i++) {
      const pz = z + rand(-5, 5);
      decor.add(box(0.25, 0.2, 0.25, 0xb5653b, -4.3, 0.66, pz));
      decor.add(box(0.35, 0.3, 0.35, 0x4f8a3c, -4.3, 0.9, pz));
    }
  }

  // Graffiti on the wall
  const tags = Math.floor(rand(0, 3));
  for (let i = 0; i < tags; i++) {
    decor.add(box(0.03, rand(0.4, 1.3), rand(1, 3.5), pick(GRAFFITI), 3.08, rand(0.6, 2.2), rand(-L / 2 + 2, L / 2 - 2)));
  }

  addRubbish(decor, L);

  // The far bank: East London buildings and the odd landmark
  if (farBank === 'office') decor.add(makeOffice(0));
  else if (farBank === 'gasholder') decor.add(makeGasholder(0));
  else if (farBank === 'containerville') decor.add(makeContainerville(0));
  else if (farBank === 'sharks') decor.add(makeSharks(0));
  else if (farBank === 'warehouses') {
    if (Math.random() < 0.5) {
      decor.add(makeBuilding(0, L - 0.4));
    } else {
      const split = rand(7, 12);
      decor.add(makeBuilding(-L / 2 + split / 2, split - 0.3));
      decor.add(makeBuilding(split / 2, L - split - 0.3));
    }
  } else {
    // A gap between buildings, with a scruffy canal-side tree
    const z = rand(-5, 5);
    const trunk = new THREE.Mesh(trunkGeo, mat(0x6b4a2f));
    trunk.position.set(FRONT_X - 2, 0.6, z);
    const crown = new THREE.Mesh(crownGeo, mat(pick([0x4f8a3c, 0x3f7a35, 0x5f9a45])));
    crown.position.set(FRONT_X - 2, 2.4, z);
    decor.add(trunk, crown);
  }
}

// Cans, bottles, bags, coffee cups and the odd dumped Lime bike
function addRubbish(decor, L) {
  const spot = () => [rand(-14.5, -6), rand(-L / 2, L / 2)];
  const items = Math.floor(rand(4, 9));
  for (let i = 0; i < items; i++) {
    const [x, z] = spot();
    const kind = Math.random();
    let piece;
    if (kind < 0.35) {
      piece = new THREE.Mesh(canGeo, mat(pick([0xc0392b, 0xd0d0d0, 0x2e86de, 0x27ae60, 0xf1c40f])));
      piece.rotation.set(0, rand(0, Math.PI), Math.PI / 2);
    } else if (kind < 0.55) {
      piece = new THREE.Mesh(bottleGeo, mat(pick([0x6f9f7f, 0xc7d6cf, 0x6b4a2f])));
      piece.rotation.set(0, rand(0, Math.PI), Math.PI / 2);
    } else if (kind < 0.75) {
      piece = box(rand(0.35, 0.6), 0.03, rand(0.3, 0.45), pick([0xf2f2f2, 0x3498db, 0xe8e8e8, 0x2c3e50]));
      piece.rotation.y = rand(0, Math.PI);
    } else if (kind < 0.92) {
      piece = new THREE.Mesh(cupGeo, mat(0xf5f5f5)); // somebody else's spilled flat white
      piece.rotation.set(0, rand(0, Math.PI), Math.PI / 2);
    } else {
      piece = new THREE.Mesh(coneGeo, mat(0xff6a13)); // the obligatory traffic cone
      piece.rotation.set(rand(-1.2, 1.2), 0, rand(-1.2, 1.2));
    }
    piece.position.set(x, WATER_Y + 0.03, z);
    decor.add(piece);
  }

  // A dumped Lime bike: either fully sunk and glowing green under the water, or half sticking out
  if (Math.random() < 0.4) {
    const bike = makeLimeBike();
    const [x, z] = spot();
    const sunk = Math.random() < 0.6;
    bike.rotation.set(sunk ? 0 : 0.3, rand(0, Math.PI * 2), sunk ? Math.PI / 2 : 1.1);
    bike.position.set(x, sunk ? -1.45 : -1.05, z);
    decor.add(bike);
  }
}

const BRICK = 0x3e3431; // sooty London brick
const BRIDGE_DEPTH = 7;

// A dark, sooty brick bridge over the canal. Its abutment blocks `blocked` lanes on the wall side,
// squeezing the towpath. The abutment fades out as it passes the camera.
export function makeBridge(blocked, lanesX) {
  const group = new THREE.Group();
  const D = BRIDGE_DEPTH;

  // Deck, high enough for the camera to pass under
  group.add(box(22, 1.0, D, BRICK, -6.5, 5.1, 0));
  group.add(box(22, 0.05, D, 0x0f0d0c, -6.5, 4.58, 0));                // dark underside
  for (const z of [D / 2 - 0.15, -D / 2 + 0.15]) {
    group.add(box(22, 0.6, 0.3, 0x332a27, -6.5, 5.9, z));              // parapets
    group.add(box(22, 0.16, 0.12, 0x6f6a63, -6.5, 4.62, z > 0 ? D / 2 : -D / 2)); // stone edging
  }
  group.add(box(1.2, 5, D, BRICK, -15.4, 2.3, 0));                      // pier on the far bank
  group.add(box(1, 1.4, D, BRICK, 3.6, 3.9, 0));                        // fill above the wall
  group.add(box(6, 0.01, D, 0x5e5246, 0, 0.006, 0));                    // deep shade on the path

  // Abutment over the blocked lanes
  const minX = lanesX[Math.min(...blocked)] - 1;
  const maxX = 3.1;
  const geo = new THREE.BoxGeometry(maxX - minX, 4.6, D);
  const fadeMat = new THREE.MeshLambertMaterial({ color: BRICK, flatShading: true, transparent: true });
  const abutment = new THREE.Mesh(geo, fadeMat);
  abutment.position.set((minX + maxX) / 2, 2.3, 0);
  group.add(abutment);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x241e1b, transparent: true });
  const lines = [];
  for (let y = 0.4; y < 4.5; y += 0.45) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, 0.04, 0.02), lineMat);
    line.position.set((minX + maxX) / 2, y, D / 2 + 0.01);
    group.add(line);
    lines.push(line);
  }

  return {
    group,
    fade(opacity) {
      fadeMat.opacity = opacity;
      lineMat.opacity = opacity;
    },
    dispose() {
      geo.dispose();
      fadeMat.dispose();
      lineMat.dispose();
      for (const line of lines) line.geometry.dispose();
    },
  };
}

// "BY DUDE LONDON", sprayed in glowing white paint with overspray and drips
let tagMaterial = null;
let tagGeometry = null;
function signatureTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const g = canvas.getContext('2d');
  let seed = 11; // the same tag every time
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

  const spray = (text, x, y, size, font) => {
    g.font = `${size}px ${font}`;
    g.textBaseline = 'alphabetic';
    // soft glow of overspray
    g.shadowColor = 'rgba(255,255,255,0.9)';
    g.shadowBlur = size * 0.25;
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillText(text, x, y);
    // the paint itself, a few wobbly passes
    g.shadowBlur = size * 0.08;
    for (let i = 0; i < 4; i++) {
      g.fillStyle = `rgba(255,255,255,${0.55 + rnd() * 0.3})`;
      g.fillText(text, x + (rnd() - 0.5) * size * 0.04, y + (rnd() - 0.5) * size * 0.04);
    }
    g.shadowBlur = 0;
    const width = g.measureText(text).width;
    // speckles of overspray
    for (let i = 0; i < size * 6; i++) {
      g.fillStyle = `rgba(255,255,255,${rnd() * 0.5})`;
      g.fillRect(x - size * 0.1 + rnd() * (width + size * 0.2), y - size * 1.05 + rnd() * size * 1.25, 2, 2);
    }
    // drips running down
    for (let i = 0; i < Math.round(width / size * 2.5); i++) {
      const dx = x + rnd() * width;
      const len = size * (0.15 + rnd() * 0.45);
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.fillRect(dx, y - size * 0.05, Math.max(2, size * 0.025), len);
      g.beginPath();
      g.arc(dx + size * 0.012, y - size * 0.05 + len, size * 0.022, 0, Math.PI * 2);
      g.fill();
    }
  };

  const chunky = '"Arial Black", Impact, sans-serif';
  const scrawl = '"Marker Felt", "Chalkboard SE", "Comic Sans MS", cursive';
  spray('BY', 40, 250, 90, scrawl);
  spray('DUDE', 170, 300, 230, chunky);
  spray('LONDON', 470, 440, 110, scrawl);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSignatureTag({ length, height, y }) {
  tagMaterial ||= new THREE.MeshBasicMaterial({ map: signatureTexture(), transparent: true, depthWrite: false });
  tagGeometry ||= new THREE.PlaneGeometry(length, height);
  const tag = new THREE.Mesh(tagGeometry, tagMaterial);
  tag.rotation.y = -Math.PI / 2; // face the towpath
  tag.position.set(3.07, y, 0);
  return tag;
}
