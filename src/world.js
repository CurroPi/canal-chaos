// The scrolling canal scenery: towpath, canal, narrowboats, brick wall, far bank.
import * as THREE from 'three';
import { box, mat } from './models.js';
import { FRONT_X, makeWarehouse, makeOffice, makeGasholder, makeContainerville } from './buildings.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const rand = (min, max) => min + Math.random() * (max - min);

const BOAT_COLOURS = [0x1f5f3a, 0x8c1c1c, 0x1d2f5c, 0x5b2a5e, 0x2a6f73, 0x222222];
const GRAFFITI = [0xff5fa2, 0x3fd3ff, 0xffd23f, 0x7cff6b, 0xffffff, 0xff7a1a];

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
      queued = pick(['gasholder', 'containerville']);
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

  const world = {
    forceNext: null, // testing helper: the next tile's far bank

    scroll(dz) {
      for (const tile of tiles) {
        tile.position.z += dz;
        if (tile.position.z - L / 2 > 12) {
          tile.position.z -= N * L;
          decorate(tile, L, nextFarBank());
        }
      }
    },

    // Fresh scenery for a new run, with our office the first building you see
    reset() {
      const officeTile = tiles.reduce((a, b) => (Math.abs(b.position.z + 25) < Math.abs(a.position.z + 25) ? b : a));
      sinceLandmark = 0;
      queued = null;
      for (const tile of tiles) decorate(tile, L, tile === officeTile ? 'office' : nextFarBank());
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
  tile.add(box(0.4, 1, L, 0x7d7468, -3.25, -0.6, 0));
  tile.add(box(12, 0.1, L, 0x3d6b6a, -9.5, -0.75, 0));
  tile.add(box(0.4, 1, L, 0x6e675e, FRONT_X + 0.2, -0.6, 0)); // far canal edge
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
    decor.add(box(1.9, 0.7, 13, colour, -4.5, -0.35, z));
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

  // The far bank: East London warehouses and the odd landmark
  if (farBank === 'office') decor.add(makeOffice(0));
  else if (farBank === 'gasholder') decor.add(makeGasholder(0));
  else if (farBank === 'containerville') decor.add(makeContainerville(0));
  else if (farBank === 'warehouses') {
    if (Math.random() < 0.5) {
      decor.add(makeWarehouse(0, L - 0.4));
    } else {
      const split = rand(7, 12);
      decor.add(makeWarehouse(-L / 2 + split / 2, split - 0.3));
      decor.add(makeWarehouse(split / 2, L - split - 0.3));
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

const BRICK = 0x8f4a36;
const BRIDGE_DEPTH = 5;

// A brick bridge over the canal. Its abutment blocks `blocked` lanes on the wall side,
// squeezing the towpath. The abutment fades out as it passes the camera.
export function makeBridge(blocked, lanesX) {
  const group = new THREE.Group();
  const D = BRIDGE_DEPTH;

  // Deck, high enough for the camera to pass under
  group.add(box(22, 1.0, D, BRICK, -6.5, 5.1, 0));
  group.add(box(22, 0.05, D, 0x2e211b, -6.5, 4.58, 0));                // dark underside
  for (const z of [D / 2 - 0.15, -D / 2 + 0.15]) {
    group.add(box(22, 0.6, 0.3, 0x7f3e2d, -6.5, 5.9, z));              // parapets
    group.add(box(22, 0.16, 0.12, 0xcfc8b8, -6.5, 4.62, z > 0 ? D / 2 : -D / 2)); // stone edging
  }
  group.add(box(1.2, 5, D, BRICK, -15.4, 2.3, 0));                      // pier on the far bank
  group.add(box(1, 1.4, D, BRICK, 3.6, 3.9, 0));                        // fill above the wall
  group.add(box(6, 0.01, D, 0x968671, 0, 0.006, 0));                    // shade on the path

  // Abutment over the blocked lanes
  const minX = lanesX[Math.min(...blocked)] - 1;
  const maxX = 3.1;
  const geo = new THREE.BoxGeometry(maxX - minX, 4.6, D);
  const fadeMat = new THREE.MeshLambertMaterial({ color: BRICK, flatShading: true, transparent: true });
  const abutment = new THREE.Mesh(geo, fadeMat);
  abutment.position.set((minX + maxX) / 2, 2.3, 0);
  group.add(abutment);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x6f3426, transparent: true });
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
