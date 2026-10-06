// The scrolling canal scenery: towpath, canal, narrowboats, brick wall, far bank.
import * as THREE from 'three';
import { box, mat } from './models.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const rand = (min, max) => min + Math.random() * (max - min);

const BOAT_COLOURS = [0x1f5f3a, 0x8c1c1c, 0x1d2f5c, 0x5b2a5e, 0x2a6f73, 0x222222];
const GRAFFITI = [0xff5fa2, 0x3fd3ff, 0xffd23f, 0x7cff6b, 0xffffff, 0xff7a1a];

const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.4, 6);
const crownGeo = new THREE.ConeGeometry(1.2, 2.6, 7);

export function createWorld(scene, cfg) {
  const L = cfg.tile.length;
  const N = cfg.tile.count;
  const tiles = [];

  for (let i = 0; i < N; i++) {
    const tile = new THREE.Group();
    tile.position.z = 10 - i * L;
    buildStatic(tile, L);
    tile.userData.decor = new THREE.Group();
    tile.add(tile.userData.decor);
    decorate(tile, L);
    scene.add(tile);
    tiles.push(tile);
  }

  return {
    scroll(dz) {
      for (const tile of tiles) {
        tile.position.z += dz;
        if (tile.position.z - L / 2 > 12) {
          tile.position.z -= N * L;
          decorate(tile, L);
        }
      }
    },
  };
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
  tile.add(box(8, 1.2, L, 0x6f8f4e, -19.5, -0.3, 0));

  // Brick wall (right) with brick courses and coping stones
  tile.add(box(1, 3.2, L, 0x9b4f3a, 3.6, 1.6, 0));
  for (let y = 0.4; y < 3.1; y += 0.45) {
    tile.add(box(0.02, 0.04, L, 0x7f3e2d, 3.09, y, 0));
  }
  tile.add(box(1.2, 0.15, L, 0x8b8378, 3.6, 3.25, 0));
}

// Random bits that change every time a tile is reused
function decorate(tile, L) {
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

  // Trees on the far bank
  const trees = Math.floor(rand(1, 4));
  for (let i = 0; i < trees; i++) {
    const x = rand(-22, -16);
    const z = rand(-L / 2, L / 2);
    const trunk = new THREE.Mesh(trunkGeo, mat(0x6b4a2f));
    trunk.position.set(x, 1, z);
    const crown = new THREE.Mesh(crownGeo, mat(pick([0x4f8a3c, 0x3f7a35, 0x5f9a45])));
    crown.position.set(x, 2.9, z);
    decor.add(trunk, crown);
  }
}
