// The scrolling canal scenery: towpath, canal, narrowboats, brick wall, far bank.
import * as THREE from 'three';
import { box, mat, makeLimeBike } from './models.js';
import { FRONT_X, makeBuilding, makeOffice, makeGasholder, makeContainerville, makeSharks } from './buildings.js';
import { CONFIG } from './config.js';
import { makeNarrowboat, addPosters, GAGS, animateGags, BOAT_X } from './gags.js';

// Towpath geometry, all derived from the lane spacing in config.js, so narrowing the path
// moves the wall, the canal edge and everything along them together.
export const LANE_W = CONFIG.lanes[2];   // distance between lanes
export const EDGE = 1.5 * LANE_W;        // half the towpath's width
export const WALL = EDGE + 0.1;          // face of the brick wall (right)
export const CANAL = -EDGE - 0.2;        // middle of the coping stones (left)

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

  // One-off gags (tarot boat, heron...): each turns up once per run, in a random order
  let gagPool = [];
  let sinceGag = 0;
  function nextGag() {
    if (world.forceGag) {
      const kind = world.forceGag;
      world.forceGag = null;
      return kind;
    }
    sinceGag++;
    if (sinceGag < cfg.gags.everyTiles) return null;
    if (!gagPool.length) gagPool = Object.keys(GAGS).sort(() => Math.random() - 0.5);
    sinceGag = 0;
    return gagPool.pop();
  }

  const world = {
    forceNext: null, // testing helper: the next tile's far bank
    forceGag: null,  // testing helper: the next tile's gag

    scroll(dz) {
      walked += dz;
      animateGags(performance.now() / 1000);
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
          decorate(tile, L, farBank, nextGag());
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
      gagPool = [];
      sinceGag = cfg.gags.everyTiles - 3; // the first one comes early
      for (const tile of tiles) {
        decorate(tile, L, tile === officeTile ? 'office' : tile === inFront ? 'gap' : nextFarBank());
      }
      // Our tag, sprayed on the wall where you see it on the welcome screen
      const tagTile = nearest(cfg.signature.z);
      const decor = tagTile.userData.decor;
      decor.children.filter((o) => Math.abs(o.position.x - WALL) < 0.08).forEach((o) => decor.remove(o)); // clear the wall (graffiti, posters)
      const tag = makeSignatureTag(cfg.signature);
      tag.position.z = cfg.signature.z - tagTile.position.z;
      tagTile.userData.decor.add(tag);
    },
  };
  world.reset();
  return world;
}

// ---------- Towpath surfaces, drawn on canvases ----------
// Each texture covers 2 units across (one lane) and 8 units along the path.
function surfaceTexture(draw, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const g = canvas.getContext('2d');
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  draw(g, rnd, 128, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

const shade = (base, rnd, spread) => {
  const v = Math.round((rnd() - 0.5) * spread);
  return `rgb(${base[0] + v},${base[1] + v},${base[2] + v + Math.round(rnd() * 4)})`;
};

// Grey-blue brick pavers in a staggered pattern, the odd one patched with tarmac
function paverTexture() {
  return surfaceTexture((g, rnd, w, h) => {
    g.fillStyle = '#4f5560';
    g.fillRect(0, 0, w, h);
    const bw = 16;
    const bh = 9;
    for (let row = 0; row * bh < h; row++) {
      const offset = row % 2 ? bw / 2 : 0;
      for (let x = -offset; x < w; x += bw) {
        g.fillStyle = rnd() < 0.04 ? '#3e4148' : shade([112, 119, 130], rnd, 22);
        g.fillRect(x + 1, row * bh + 1, bw - 2, bh - 2);
      }
    }
    for (let i = 0; i < 6; i++) { // dark patched bits and dirt
      g.fillStyle = rnd() < 0.5 ? 'rgba(40,40,44,0.6)' : 'rgba(110,90,60,0.35)';
      g.beginPath();
      g.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 18, 6 + rnd() * 26, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }, 5);
}

// Big worn concrete slabs: joints, cracks, stains, moss in the gaps
function slabTexture() {
  return surfaceTexture((g, rnd, w, h) => {
    g.fillStyle = '#867f73';
    g.fillRect(0, 0, w, h);
    const size = 58;
    for (let y = 0; y < h; y += size) {
      const offset = (y / size) % 2 ? size / 2 : 0;
      for (let x = -offset; x < w; x += size) {
        g.fillStyle = shade([186, 179, 166], rnd, 26);
        g.fillRect(x + 2, y + 2, size - 4, size - 4);
        if (rnd() < 0.4) { // stain
          g.fillStyle = `rgba(90,80,60,${0.1 + rnd() * 0.15})`;
          g.beginPath();
          g.ellipse(x + rnd() * size, y + rnd() * size, 6 + rnd() * 14, 4 + rnd() * 10, rnd() * 3, 0, Math.PI * 2);
          g.fill();
        }
        if (rnd() < 0.3) { // crack
          g.strokeStyle = 'rgba(70,64,56,0.7)';
          g.lineWidth = 1;
          g.beginPath();
          let cx = x + rnd() * size;
          let cy = y + 4;
          g.moveTo(cx, cy);
          for (let k = 0; k < 4; k++) { cx += (rnd() - 0.5) * 18; cy += size / 4; g.lineTo(cx, cy); }
          g.stroke();
        }
      }
      g.fillStyle = 'rgba(80,110,50,0.45)'; // moss in the joint
      g.fillRect(0, y, w, 2);
    }
  }, 9);
}

// Packed dirt and gravel
function dirtTexture() {
  return surfaceTexture((g, rnd, w, h) => {
    g.fillStyle = '#8f7a5c';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) { // lighter and darker worn patches
      g.fillStyle = rnd() < 0.5 ? 'rgba(170,150,115,0.35)' : 'rgba(95,78,55,0.35)';
      g.beginPath();
      g.ellipse(rnd() * w, rnd() * h, 8 + rnd() * 30, 8 + rnd() * 40, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 1400; i++) { // gravel
      g.fillStyle = shade([150, 136, 112], rnd, 70);
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    for (let i = 0; i < 40; i++) { // grass creeping in from the wall side
      g.fillStyle = `rgba(${70 + rnd() * 30},${110 + rnd() * 40},50,0.8)`;
      g.fillRect(w - 4 - rnd() * 22, rnd() * h, 2 + rnd() * 3, 3 + rnd() * 8);
    }
  }, 13);
}

// Pale stone coping slabs along the water's edge, with moss
function copingTexture() {
  return surfaceTexture((g, rnd, w, h) => {
    g.fillStyle = '#9d978a';
    g.fillRect(0, 0, w, h);
    const len = 76;
    for (let y = 0; y < h; y += len) {
      g.fillStyle = shade([212, 206, 192], rnd, 18);
      g.fillRect(2, y + 2, w - 4, len - 4);
      g.fillStyle = `rgba(90,120,55,${0.25 + rnd() * 0.3})`; // moss on the water side
      g.fillRect(2, y + 2, 10 + rnd() * 16, len - 4);
    }
  }, 21);
}

let surfaces = null;
function surfaceMaterials(L) {
  if (!surfaces) {
    const make = (tex) => {
      tex.repeat.set(1, L / 8);
      return new THREE.MeshLambertMaterial({ map: tex });
    };
    surfaces = { pavers: make(paverTexture()), slabs: make(slabTexture()), dirt: make(dirtTexture()), coping: make(copingTexture()) };
  }
  return surfaces;
}

function surface(tile, material, width, L, x, y) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, L), material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(x, y, 0);
  tile.add(plane);
}

// Things that look the same on every tile
function buildStatic(tile, L) {
  // Towpath: a different surface per lane, like the real thing
  const s = surfaceMaterials(L);
  tile.add(box(2 * EDGE, 0.2, L, 0x6f675b, 0, -0.1, 0));
  surface(tile, s.pavers, LANE_W, L, -LANE_W, 0.001);
  surface(tile, s.slabs, LANE_W, L, 0, 0.001);
  surface(tile, s.dirt, LANE_W, L, LANE_W, 0.001);

  // Canal edge, canal and far bank (left)
  tile.add(box(0.5, 0.12, L, 0xcfc8b8, CANAL, 0.0, 0));
  surface(tile, s.coping, 0.5, L, CANAL, 0.061);
  tile.add(box(0.4, 2.1, L, 0x7d7468, CANAL - 0.05, -1.05, 0));
  tile.add(box(0.4, 2.1, L, 0x6e675e, FRONT_X + 0.2, -1.05, 0)); // far canal edge
  const nearWater = CANAL - 0.25;
  const farWater = FRONT_X - 0.2;
  tile.add(box(nearWater - farWater, 0.1, L, 0x2a3326, (nearWater + farWater) / 2, -2.0, 0)); // murky canal bed
  const water = new THREE.Mesh(new THREE.BoxGeometry(nearWater - farWater, 0.1, L), waterMat);
  water.position.set((nearWater + farWater) / 2, WATER_Y - 0.05, 0);
  tile.add(water);
  tile.add(box(16, 0.8, L, 0x5c5650, FRONT_X - 8, -0.4, 0));  // far bank ground

  // Brick wall (right) with brick courses and coping stones
  tile.add(box(1, 3.2, L, 0x9b4f3a, WALL + 0.5, 1.6, 0));
  for (let y = 0.4; y < 3.1; y += 0.45) {
    tile.add(box(0.02, 0.04, L, 0x7f3e2d, WALL - 0.01, y, 0));
  }
  tile.add(box(1.2, 0.15, L, 0x8b8378, WALL + 0.5, 3.25, 0));
}

// Shared shapes for the towpath's irregular bits
const blobGeo = new THREE.CircleGeometry(1, 7);       // flat, slightly lumpy patch
const clumpGeo = new THREE.IcosahedronGeometry(1, 0); // weed clump
const PLANT_GREENS = [0x4f7d32, 0x5f8f3a, 0x3f6b2a, 0x6f9a45, 0x587a3a];

function flatPatch(decor, colour, x, z, rx, rz, y) {
  const patch = new THREE.Mesh(blobGeo, mat(colour));
  patch.rotation.set(-Math.PI / 2, 0, rand(0, Math.PI));
  patch.scale.set(rx, rz, 1);
  patch.position.set(x, y, z);
  decor.add(patch);
}

// Plants that come and go along the edges, plus dirt, puddles, patches and leaves on the path.
// Everything on the path itself stays flat, so it never looks like something to dodge.
function addTowpathDetails(decor, L) {
  // Weeds and little bushes along the canal edge, some hanging over the water
  const clumps = Math.floor(rand(3, 9));
  for (let i = 0; i < clumps; i++) {
    const z = rand(-L / 2, L / 2);
    const overWater = Math.random() < 0.35;
    const size = overWater ? rand(0.25, 0.5) : rand(0.12, 0.28);
    const clump = new THREE.Mesh(clumpGeo, mat(pick(PLANT_GREENS)));
    clump.scale.set(size * rand(0.8, 1.4), size * rand(0.6, 1), size * rand(0.8, 1.6));
    clump.position.set(overWater ? rand(CANAL - 0.5, CANAL - 0.2) : rand(CANAL - 0.15, CANAL + 0.15), overWater ? 0 : 0.08 + size * 0.4, z);
    decor.add(clump);
    if (Math.random() < 0.3) { // a few flowers
      for (let f = 0; f < 3; f++) {
        decor.add(box(0.05, 0.05, 0.05, pick([0xffd23f, 0xb07cc6, 0xffffff]), clump.position.x + rand(-size, size) * 0.6, clump.position.y + size * 0.8, z + rand(-size, size)));
      }
    }
  }

  // Grass and weeds along the bottom of the wall, in uneven tufts
  for (let z = -L / 2; z < L / 2; z += rand(0.6, 2.2)) {
    const len = rand(0.3, 1.4);
    const width = rand(0.08, 0.3);
    decor.add(box(width, rand(0.04, 0.16), len, pick(PLANT_GREENS), WALL - 0.02 - width / 2, 0.03, z));
  }

  // Weeds poking out of the joints on the path (flat, not obstacles)
  for (let i = 0; i < Math.floor(rand(2, 7)); i++) {
    flatPatch(decor, pick(PLANT_GREENS), rand(-EDGE + 0.1, EDGE - 0.1), rand(-L / 2, L / 2), rand(0.06, 0.16), rand(0.1, 0.3), 0.004);
  }

  // Dirt spilling across, puddles, patched tarmac and fallen leaves
  for (let i = 0; i < Math.floor(rand(1, 4)); i++) {
    flatPatch(decor, pick([0x7d6a4f, 0x8a7558, 0x6f5d44]), rand(-EDGE + 0.5, EDGE - 0.5), rand(-L / 2, L / 2), rand(0.3, 0.8), rand(0.5, 1.6), 0.005);
  }
  if (Math.random() < 0.35) {
    flatPatch(decor, 0x46525c, rand(-EDGE + 0.6, EDGE - 0.6), rand(-L / 2, L / 2), rand(0.3, 0.55), rand(0.5, 1.1), 0.006); // puddle
  }
  if (Math.random() < 0.3) {
    decor.add(box(rand(0.5, 1.0), 0.01, rand(0.6, 1.6), 0x3b3d42, -LANE_W + rand(-0.5, 0.5), 0.005, rand(-L / 2, L / 2))); // tarmac patch on the pavers
  }
  for (let i = 0; i < Math.floor(rand(0, 8)); i++) {
    const leaf = box(0.09, 0.008, 0.06, pick([0xc9822a, 0xa8641e, 0xd8b04a, 0x8a5a2b]), rand(-EDGE, EDGE), 0.007, rand(-L / 2, L / 2));
    leaf.rotation.y = rand(0, Math.PI);
    decor.add(leaf);
  }
}

// Random bits that change every time a tile is reused
function decorate(tile, L, farBank, gag = null) {
  const decor = tile.userData.decor;
  decor.clear();
  addTowpathDetails(decor, L);

  // A one-off gag, or a normal moored narrowboat (with a silly name and roof clutter)
  if (gag) decor.add(GAGS[gag].build(rand(-2, 2)));
  if (!(gag && GAGS[gag].boat) && Math.random() < 0.6) {
    const boat = makeNarrowboat({ z: rand(-3, 3) });
    for (let i = 0; i < 3; i++) { // plant pots
      const pz = rand(-5, 5) + boat.group.children[0].position.z;
      boat.group.add(box(0.25, 0.2, 0.25, 0xb5653b, BOAT_X + 0.45, 0.66, pz));
      boat.group.add(box(0.35, 0.3, 0.35, 0x4f8a3c, BOAT_X + 0.45, 0.9, pz));
    }
    decor.add(boat.group);
  }

  // Graffiti and posters on the wall
  const tags = Math.floor(rand(0, 3));
  for (let i = 0; i < tags; i++) {
    // each patch at its own depth, so overlapping ones don't flicker
    decor.add(box(0.03, rand(0.4, 1.3), rand(1, 3.5), pick(GRAFFITI), WALL - 0.02 - i * 0.006, rand(0.6, 2.2), rand(-L / 2 + 2, L / 2 - 2)));
  }
  addPosters(decor, L);

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
  group.add(box(1, 1.4, D, BRICK, WALL + 0.5, 3.9, 0));                 // fill above the wall
  group.add(box(2 * EDGE, 0.01, D, 0x5e5246, 0, 0.006, 0));             // deep shade on the path

  // Abutment over the blocked lanes
  const minX = lanesX[Math.min(...blocked)] - LANE_W / 2;
  const maxX = WALL;
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

// "BY DUDE LONDON", hand-sprayed: every letter is drawn as loose spray-can strokes
// (soft glowing core, fuzzy halo, patchy coverage, overspray and drips), not typed in a font.
let tagMaterial = null;
let tagGeometry = null;

// Letters as strokes in a unit box (x right, y down)
const ellipse = (n = 14) => Array.from({ length: n + 1 }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return [0.5 + Math.cos(a) * 0.38, 0.5 + Math.sin(a) * 0.48];
});
const LETTER_STROKES = {
  B: [[[0.18, 0], [0.15, 1]], [[0.18, 0], [0.68, 0.05], [0.72, 0.38], [0.16, 0.48]], [[0.16, 0.48], [0.8, 0.56], [0.8, 0.94], [0.15, 1]]],
  Y: [[[0.1, 0], [0.5, 0.52]], [[0.9, 0], [0.5, 0.52]], [[0.5, 0.52], [0.48, 1]]],
  D: [[[0.18, 0], [0.14, 1]], [[0.18, 0], [0.6, 0.06], [0.86, 0.35], [0.84, 0.68], [0.58, 0.94], [0.14, 1]]],
  U: [[[0.16, 0], [0.14, 0.7], [0.32, 0.98], [0.62, 0.97], [0.84, 0.7], [0.86, 0]]],
  E: [[[0.2, 0], [0.16, 1]], [[0.2, 0], [0.86, 0.03]], [[0.18, 0.5], [0.72, 0.48]], [[0.16, 1], [0.9, 0.97]]],
  L: [[[0.22, 0], [0.18, 1], [0.86, 0.98]]],
  O: [ellipse()],
  N: [[[0.16, 1], [0.18, 0], [0.82, 1], [0.84, 0]]],
};

function signatureTexture(paint) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const g = canvas.getContext('2d');
  let seed = 11; // the same tag every time
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

  // One puff of spray paint
  const puff = (x, y, r, alpha) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${paint},${alpha})`);
    grad.addColorStop(0.45, `rgba(${paint},${alpha * 0.55})`);
    grad.addColorStop(1, `rgba(${paint},0)`);
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // A spray stroke along a path, with a wobbly hand and uneven pressure
  const stroke = (points, width, drips) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = x0 + (x1 - x0) * t + (rnd() - 0.5) * width * 0.25;
        const y = y0 + (y1 - y0) * t + (rnd() - 0.5) * width * 0.25;
        const pressure = 0.55 + rnd() * 0.45;
        puff(x, y, width * 2.4, 0.03);                 // faint halo
        if (rnd() > 0.12) puff(x, y, width * pressure, 0.68 * pressure); // patchy core
        if (rnd() < 0.5) {                              // overspray speckles
          g.fillStyle = `rgba(${paint},${rnd() * 0.6})`;
          g.fillRect(x + (rnd() - 0.5) * width * 4, y + (rnd() - 0.5) * width * 4, 1.5, 1.5);
        }
      }
    }
    if (drips) {
      const [x, y] = points[points.length - 1];
      if (rnd() < 0.7) {
        const len = width * (2 + rnd() * 6);
        for (let d = 0; d < len; d += 2) puff(x + (rnd() - 0.5), y + d, width * 0.28, 0.6);
        puff(x, y + len, width * 0.4, 0.7);
      }
    }
  };

  // Write a word letter by letter, each a bit off: height, tilt, spacing
  const word = (text, x, y, h, w, width, gap) => {
    let cx = x;
    for (const ch of text) {
      const lh = h * (0.9 + rnd() * 0.2);
      const lw = w * (0.85 + rnd() * 0.3);
      const tilt = (rnd() - 0.5) * 0.12;
      const top = y - lh + (rnd() - 0.5) * h * 0.08;
      for (const path of LETTER_STROKES[ch]) {
        const pts = path.map(([u, v]) => [cx + u * lw + (v - 0.5) * lh * tilt, top + v * lh]);
        stroke(pts, width, true);
      }
      cx += lw + gap;
    }
  };

  word('BY', 60, 200, 70, 46, 9, 12);
  word('DUDE', 190, 330, 250, 150, 19, 34);
  word('LONDON', 470, 470, 92, 62, 7.5, 14);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSignatureTag({ length, height, y, paint }) {
  tagMaterial ||= new THREE.MeshBasicMaterial({ map: signatureTexture(paint), transparent: true, depthWrite: false });
  tagGeometry ||= new THREE.PlaneGeometry(length, height);
  const tag = new THREE.Mesh(tagGeometry, tagMaterial);
  tag.rotation.y = -Math.PI / 2; // face the towpath
  tag.position.set(WALL - 0.03, y, 0);
  return tag;
}
