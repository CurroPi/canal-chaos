// Low-poly "toy" characters, built from simple boxes.
import * as THREE from 'three';

const materials = new Map();
export function mat(color) {
  if (!materials.has(color)) {
    materials.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  }
  return materials.get(color);
}

// One shared unit cube, scaled per use (cheap to create many of)
const unitBox = new THREE.BoxGeometry(1, 1, 1);
export function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(unitBox, mat(color));
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  return mesh;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const rand = (min, max) => min + Math.random() * (max - min);

const SKIN_TONES = [0xf1c9a5, 0xe8b894, 0xd8a47f, 0xa86b45, 0x6b4029];
const NEON = [0xff3d7f, 0x39ff88, 0xffe14a, 0x31c8ff, 0xff7a1a];

// A generic person, facing +z. The group's origin is at their feet.
function makePerson({ skin, shirt, legs, shoes, hair }) {
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);

  const makeLeg = (x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.8, 0);
    leg.add(box(0.2, 0.7, 0.22, legs, 0, -0.35, 0));
    leg.add(box(0.22, 0.12, 0.32, shoes, 0, -0.74, 0.04));
    rig.add(leg);
    return leg;
  };
  const legL = makeLeg(-0.13);
  const legR = makeLeg(0.13);

  rig.add(box(0.56, 0.66, 0.32, shirt, 0, 1.12, 0));

  const makeArm = (x) => {
    const arm = new THREE.Group();
    arm.position.set(x, 1.4, 0);
    arm.add(box(0.15, 0.58, 0.16, shirt, 0, -0.27, 0));
    arm.add(box(0.13, 0.12, 0.13, skin, 0, -0.6, 0));
    rig.add(arm);
    return arm;
  };
  const armL = makeArm(-0.36);
  const armR = makeArm(0.36);

  const head = new THREE.Group();
  head.position.set(0, 1.64, 0);
  head.add(box(0.36, 0.36, 0.36, skin));
  head.add(box(0.06, 0.06, 0.02, 0x222222, -0.08, 0.03, 0.185));
  head.add(box(0.06, 0.06, 0.02, 0x222222, 0.08, 0.03, 0.185));
  head.add(box(0.38, 0.1, 0.38, hair, 0, 0.2, 0));
  rig.add(head);

  return { group, rig, legL, legR, armL, armR, head };
}

// Oatley, the Tote Bag Classic. Faces away from the camera.
export function makePlayer() {
  const p = makePerson({
    skin: 0xf1c9a5,
    shirt: 0x6b8f71,
    legs: 0x2d3a4f,
    shoes: 0xf2f2f2,
    hair: 0x5a3b25,
  });

  // Mustard beanie
  p.head.add(box(0.4, 0.2, 0.4, 0xd9a521, 0, 0.24, 0));
  p.head.add(box(0.42, 0.07, 0.42, 0xc08f12, 0, 0.13, 0));

  // Tote bag on the back (local -z is the back)
  p.rig.add(box(0.04, 0.55, 0.04, 0xefe6d2, 0.18, 1.3, -0.17));
  p.rig.add(box(0.38, 0.42, 0.06, 0xefe6d2, 0.1, 0.95, -0.2));

  // Takeaway coffees: one in each hand when you have two
  const cupGeo = new THREE.CylinderGeometry(0.075, 0.055, 0.2, 8);
  const lidGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 8);
  p.cups = [p.armR, p.armL].map((arm) => {
    const cup = new THREE.Mesh(cupGeo, mat(0xffffff));
    cup.position.set(0, -0.66, 0.08);
    const lid = new THREE.Mesh(lidGeo, mat(0x6b4a2f));
    lid.position.set(0, -0.54, 0.08);
    const sleeve = box(0.16, 0.08, 0.16, 0xc8a27a, 0, -0.66, 0.08);
    arm.add(cup, lid, sleeve);
    return [cup, lid, sleeve];
  });

  p.group.rotation.y = Math.PI; // walk away from the camera
  return p;
}

// A solo runner in neon, jogging towards the camera.
export function makeRunner() {
  const skin = pick(SKIN_TONES);
  const r = makePerson({
    skin,
    shirt: pick(NEON),
    legs: skin,
    shoes: pick(NEON),
    hair: pick([0x222222, 0x5a3b25, 0xc9a35a, 0x8a3b1f]),
  });
  // Shorts and a sweatband
  r.legL.add(box(0.23, 0.26, 0.25, 0x222831, 0, -0.12, 0));
  r.legR.add(box(0.23, 0.26, 0.25, 0x222831, 0, -0.12, 0));
  r.head.add(box(0.39, 0.07, 0.39, 0xffffff, 0, 0.1, 0));
  r.rig.rotation.x = 0.15; // lean into it
  r.phase = Math.random() * 10;
  return r;
}

// Show how many coffees the player is carrying (0, 1 or 2)
export function setCoffee(player, count) {
  player.cups.forEach((parts, i) => parts.forEach((part) => { part.visible = count > i; }));
  player.holdR = count >= 1 ? -0.7 : undefined;
  player.holdL = count >= 2 ? -0.7 : undefined;
}

const CASUAL = [0x9ca3af, 0xf5f0e1, 0x4b5563, 0xb45309, 0x065f46, 0x7f1d1d, 0x1e3a8a];
const HAIR = [0x222222, 0x5a3b25, 0xc9a35a, 0x8a3b1f, 0xd4d4d4];
const phone = () => box(0.1, 0.18, 0.03, 0x111111, 0, -0.68, 0.06);

const limeWheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.11, 12);
const LIME = 0x4cd12a;

// A hired Lime e-bike on its own (also used for the ones dumped in the canal). Faces +z.
export function makeLimeBike() {
  const bike = new THREE.Group();
  for (const z of [0.55, -0.55]) {
    const wheel = new THREE.Mesh(limeWheelGeo, mat(0x1b1b1b));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, 0.3, z);
    bike.add(wheel);
    bike.add(box(0.14, 0.05, 0.5, LIME, 0, 0.63, z));          // mudguard
  }
  bike.add(box(0.14, 0.14, 0.9, LIME, 0, 0.48, 0));            // chunky step-through frame
  bike.add(box(0.12, 0.26, 0.38, 0xf5f5f5, 0, 0.62, -0.05));   // battery
  bike.add(box(0.11, 0.6, 0.11, LIME, 0, 0.75, -0.3));         // seat post
  bike.add(box(0.11, 0.55, 0.11, LIME, 0, 0.72, 0.5));         // steerer
  bike.add(box(0.6, 0.06, 0.06, 0x222222, 0, 1.0, 0.48));      // handlebar
  bike.add(box(0.38, 0.26, 0.3, LIME, 0, 0.86, 0.75));         // front basket
  bike.add(box(0.16, 0.08, 0.3, 0x222222, 0, 1.07, -0.3));     // saddle
  return bike;
}

// Someone on a hired Lime e-bike, one hand on the bars, one on their phone. Faces +z.
export function makeLimeRider() {
  const group = new THREE.Group();
  group.add(makeLimeBike());

  const rider = makePerson({
    skin: pick(SKIN_TONES),
    shirt: pick(CASUAL),
    legs: pick([0x3b5b8a, 0x2b2b2b, 0xc2a27a]),
    shoes: pick([0xf5f5f5, 0x222222]),
    hair: pick(HAIR),
  });
  rider.group.position.set(0, 0.25, -0.3);
  rider.rig.rotation.x = 0.12;
  rider.armL.rotation.x = -1.0;   // one hand on the bars...
  rider.armR.rotation.x = -1.7;   // ...the other checking Google Maps
  rider.armR.add(phone());
  group.add(rider.group);

  return { group, rider, phase: Math.random() * 10 };
}

export function animateLime(c, t) {
  const s = Math.sin(t * 9) * 0.5;
  c.rider.legL.rotation.x = -0.8 + s;
  c.rider.legR.rotation.x = -0.8 - s;
  c.group.rotation.z = Math.sin(t * 2.3) * 0.07; // wobbly
}

// Stopped dead in the middle of the path, taking a selfie. Faces +z.
export function makeInstagrammer() {
  const p = makePerson({
    skin: pick(SKIN_TONES),
    shirt: pick([0xe9d5c0, 0xf4c2c2, 0xd6c6f2, 0xfdf6e3, 0xc7a17a]),
    legs: pick([0xf5f5f5, 0x2b2b2b, 0xc2a27a]),
    shoes: 0xffffff,
    hair: pick(HAIR),
  });
  p.armR.rotation.x = -2.0; // phone held up high
  p.armR.add(phone());
  p.armL.rotation.z = -0.5; // hand on hip, sort of
  p.head.add(box(0.34, 0.07, 0.03, 0x111111, 0, 0.04, 0.2)); // sunglasses
  p.phase = Math.random() * 10;
  return p;
}

export function animatePose(m, t) {
  m.rig.rotation.z = Math.sin(t * 1.6) * 0.06;
  m.head.rotation.y = Math.sin(t * 0.9) * 0.3; // finding their angle
}

const pramWheelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.06, 10);

// A parent pushing an enormous designer pram towards you.
export function makePramPusher() {
  const group = new THREE.Group();
  const p = makePerson({
    skin: pick(SKIN_TONES),
    shirt: pick([0x334155, 0x6b705c, 0xd6ccc2, 0x1f2937]),
    legs: pick([0x2b2b2b, 0x3b5b8a]),
    shoes: pick([0xf5f5f5, 0x8b5e3c]),
    hair: pick(HAIR),
  });
  p.group.position.z = -0.45;
  group.add(p.group);

  const pram = new THREE.Group();
  pram.position.z = 0.4;
  const col = pick([0x1f2a44, 0x6b705c, 0xb5838d, 0x222222, 0xc8b6a6]);
  pram.add(box(0.52, 0.36, 0.78, col, 0, 0.72, 0));            // bassinet
  pram.add(box(0.54, 0.34, 0.36, col, 0, 1.04, -0.22));        // hood
  pram.add(box(0.5, 0.04, 0.04, 0x222222, 0, 1.12, -0.62));    // handle
  for (const x of [-0.24, 0.24]) {
    pram.add(box(0.04, 0.5, 0.04, 0x999999, x, 0.85, -0.45));  // handle bars
    for (const z of [-0.3, 0.3]) {
      const wheel = new THREE.Mesh(pramWheelGeo, mat(0x1b1b1b));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x * 1.1, 0.15, z);
      pram.add(wheel);
    }
  }
  pram.add(box(0.04, 0.35, 0.6, 0x999999, 0, 0.38, 0));        // chassis
  group.add(pram);

  return { ...p, group, holdL: -1.1, holdR: -1.1, phase: Math.random() * 10 };
}

// A dog walker on their phone, with an extendable lead stretched across a lane.
// `dogDx` is how far sideways the dog is (one lane = 2 units).
export function makeDogWalker(dogDx) {
  const group = new THREE.Group();
  const owner = makePerson({
    skin: pick(SKIN_TONES),
    shirt: pick([0x14532d, 0x78350f, 0x1e293b, 0xa16207]), // gilets and Barbour-ish
    legs: pick([0x2b2b2b, 0x3b5b8a, 0x57534e]),
    shoes: pick([0x3f2a1d, 0x222222]),
    hair: pick(HAIR),
  });
  group.add(owner.group);

  const side = Math.sign(dogDx);
  const leadArm = side > 0 ? owner.armR : owner.armL;
  const phoneArm = side > 0 ? owner.armL : owner.armR;
  leadArm.rotation.z = 0.5 * side;
  phoneArm.add(phone());
  if (side > 0) { owner.holdR = 0; owner.holdL = -1.5; } else { owner.holdL = 0; owner.holdR = -1.5; }

  const dog = makeDog();
  dog.group.position.set(dogDx, 0, 0.5);
  group.add(dog.group);

  // The lead, from hand to collar
  const from = new THREE.Vector3(0.65 * side, 0.87, 0);
  const to = dog.collar.clone().add(dog.group.position);
  const len = from.distanceTo(to);
  const lead = new THREE.Group();
  lead.position.copy(from);
  lead.add(box(0.05, 0.05, len, 0xff3b30, 0, 0, len / 2));
  lead.lookAt(to);
  group.add(lead);

  return { group, owner, dog, phase: Math.random() * 10 };
}

// Dog breeds of the towpath, as proportions: body length/width/height, leg height, head size
const BREEDS = [
  { name: 'sausage', len: 0.85, w: 0.24, h: 0.22, legH: 0.14, head: 0.24, colours: [0x8b5a2b, 0x2b2b2b, 0x6b3a1f], ears: 'floppy', snout: 0.16 },
  { name: 'frenchie', len: 0.45, w: 0.34, h: 0.28, legH: 0.18, head: 0.3, colours: [0xd9c3a0, 0x3a3330, 0xb59a7a], ears: 'bat', snout: 0.05 },
  { name: 'poodle', len: 0.5, w: 0.3, h: 0.3, legH: 0.38, head: 0.26, colours: [0xf5f2ea, 0xd9a066, 0x2b2b2b], ears: 'floppy', snout: 0.14, fluffy: true },
  { name: 'whippet', len: 0.65, w: 0.18, h: 0.2, legH: 0.46, head: 0.18, colours: [0x9a9a9a, 0xc9a77a, 0xe8e2d4], ears: 'small', snout: 0.2 },
  { name: 'golden', len: 0.8, w: 0.34, h: 0.32, legH: 0.36, head: 0.3, colours: [0xd9a441, 0xe6bf6e], ears: 'floppy', snout: 0.16 },
];

function makeDog() {
  const b = pick(BREEDS);
  const col = pick(b.colours);
  const group = new THREE.Group();
  const bodyY = b.legH + b.h / 2;
  const front = b.len / 2;

  group.add(box(b.w, b.h, b.len, col, 0, bodyY, 0));
  const headY = bodyY + b.h / 2 + b.head * 0.3;
  group.add(box(b.head, b.head, b.head, col, 0, headY, front + b.head * 0.3));
  if (b.snout) group.add(box(b.head * 0.5, b.head * 0.4, b.snout, col, 0, headY - b.head * 0.2, front + b.head * 0.8 + b.snout / 2));
  group.add(box(0.06, 0.05, 0.04, 0x111111, 0, headY - b.head * 0.1, front + b.head * 0.8 + b.snout)); // nose

  const earX = b.head * 0.4;
  if (b.ears === 'bat') {
    for (const x of [-earX, earX]) group.add(box(0.08, 0.16, 0.04, col, x, headY + b.head * 0.6, front + b.head * 0.2));
  } else if (b.ears === 'floppy') {
    for (const x of [-b.head * 0.55, b.head * 0.55]) group.add(box(0.05, b.head * 0.8, b.head * 0.5, col, x, headY - b.head * 0.1, front + b.head * 0.3));
  } else {
    for (const x of [-earX, earX]) group.add(box(0.05, 0.06, 0.08, col, x, headY + b.head * 0.5, front + b.head * 0.1));
  }
  if (b.fluffy) {
    group.add(box(b.head * 1.1, b.head * 0.5, b.head * 1.1, col, 0, headY + b.head * 0.6, front + b.head * 0.3)); // pompadour
    group.add(box(b.w * 1.25, b.h * 1.2, b.len * 0.45, col, 0, bodyY + 0.03, front - b.len * 0.2));               // chest fluff
  }
  const collarZ = front - 0.02;
  group.add(box(b.w + 0.04, 0.05, 0.08, 0xff3b30, 0, bodyY + b.h * 0.3, collarZ));

  const legs = [];
  for (const z of [front - 0.08, -front + 0.08]) {
    for (const x of [-b.w * 0.35, b.w * 0.35]) {
      const leg = new THREE.Group();
      leg.position.set(x, b.legH, z);
      leg.add(box(0.07, b.legH, 0.07, col, 0, -b.legH / 2, 0));
      if (b.fluffy) leg.add(box(0.12, 0.1, 0.12, col, 0, -b.legH + 0.06, 0)); // leg pom-poms
      group.add(leg);
      legs.push(leg);
    }
  }
  const tail = new THREE.Group();
  tail.position.set(0, bodyY + b.h * 0.3, -front);
  tail.add(box(0.05, 0.05, b.name === 'whippet' ? 0.35 : 0.22, col, 0, 0.05, -0.1));
  if (b.fluffy) tail.add(box(0.12, 0.12, 0.12, col, 0, 0.1, -0.22));
  group.add(tail);

  return { group, legs, tail, collar: new THREE.Vector3(0, bodyY + b.h * 0.3, collarZ) };
}

export function animateDogWalker(m, t) {
  animateWalk(m.owner, t, 7);
  m.dog.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(t * 16 + (i % 3 ? Math.PI : 0)) * 0.6; });
  m.dog.tail.rotation.y = Math.sin(t * 18) * 0.7;
}

// Swing arms and legs; `freq` controls stride speed. holdL/holdR pin an arm in place.
export function animateWalk(model, t, freq) {
  const swing = Math.sin(t * freq) * 0.6;
  model.legL.rotation.x = swing;
  model.legR.rotation.x = -swing;
  model.armL.rotation.x = model.holdL ?? -swing * 0.8;
  model.armR.rotation.x = model.holdR ?? swing * 0.8;
  model.rig.position.y = Math.abs(Math.sin(t * freq)) * 0.05;
}

const cargoWheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 12);

// A cargo bike: a parent pedalling a huge wooden box with two toddlers and a sourdough loaf.
// Built enormous on purpose: it takes up two lanes.
export function makeCargoBike() {
  const group = new THREE.Group();
  const wood = 0xb08a5a;
  group.add(box(2.4, 0.7, 1.3, wood, 0, 0.75, 0.9));          // the box
  group.add(box(2.5, 0.08, 1.4, 0x8a6a40, 0, 1.12, 0.9));     // rim
  for (const x of [-1.0, 1.0]) {
    const wheel = new THREE.Mesh(cargoWheelGeo, mat(0x1b1b1b));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.3, 0.9);
    group.add(wheel);
  }
  const rear = new THREE.Mesh(cargoWheelGeo, mat(0x1b1b1b));
  rear.rotation.z = Math.PI / 2;
  rear.position.set(0, 0.3, -0.9);
  group.add(rear);
  group.add(box(0.12, 0.12, 1.6, 0x2b2b2b, 0, 0.45, -0.1));   // frame
  group.add(box(0.7, 0.06, 0.06, 0x222222, 0, 1.2, 0.2));     // handlebar

  // Two toddlers in tiny helmets, and the sourdough
  for (const [x, helmet] of [[-0.55, 0xff6b9a], [0.0, 0x3fb6ff]]) {
    group.add(box(0.36, 0.34, 0.3, pick([0xffd23f, 0x7cff6b, 0xffffff]), x, 1.25, 0.95)); // body
    group.add(box(0.28, 0.28, 0.28, pick(SKIN_TONES), x, 1.55, 0.95));                    // head
    group.add(box(0.32, 0.12, 0.32, helmet, x, 1.73, 0.95));                              // helmet
  }
  const loaf = box(0.45, 0.26, 0.3, 0xc68a4a, 0.65, 1.25, 0.95);
  loaf.rotation.y = 0.4;
  group.add(loaf);

  const rider = makePerson({
    skin: pick(SKIN_TONES),
    shirt: pick([0x6b705c, 0xd6ccc2, 0x1f2937, 0x9c6644]),
    legs: pick([0x2b2b2b, 0x3b5b8a]),
    shoes: 0xf5f5f5,
    hair: pick(HAIR),
  });
  rider.group.position.set(0, 0.25, -0.9);
  rider.rig.rotation.x = 0.2;
  rider.armL.rotation.x = rider.armR.rotation.x = -1.2;
  rider.head.add(box(0.42, 0.16, 0.44, 0x2b2b2b, 0, 0.24, 0)); // sensible helmet
  group.add(rider.group);

  return { group, rider, phase: Math.random() * 10 };
}

export function animateCargoBike(m, t) {
  const s = Math.sin(t * 7) * 0.5;
  m.rider.legL.rotation.x = -0.8 + s;
  m.rider.legR.rotation.x = -0.8 - s;
}

const potGeo = new THREE.CylinderGeometry(0.32, 0.24, 0.45, 8);

// Someone carrying a giant Monstera home from a Marketplace deal. The leaves poke into the next lane.
export function makeMonsteraCarrier() {
  const p = makePerson({
    skin: pick(SKIN_TONES),
    shirt: pick([0xe9d5c0, 0xc7a17a, 0x9c6644, 0xf5f0e1]),
    legs: pick([0xf5f5f5, 0x2b2b2b, 0xc2a27a]),
    shoes: 0xffffff,
    hair: pick(HAIR),
  });
  p.holdL = -1.2;
  p.holdR = -1.2;
  const plant = new THREE.Group();
  plant.position.set(0, 0.95, 0.5);
  const pot = new THREE.Mesh(potGeo, mat(0xc0663a));
  plant.add(pot);
  const leafColours = [0x2f7d32, 0x3a8f3e, 0x27692a];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const reach = 0.6 + Math.random() * 0.5;
    const leaf = new THREE.Group();
    leaf.position.set(Math.cos(a) * 0.15, 0.4, Math.sin(a) * 0.15);
    leaf.rotation.y = -a;
    const blade = box(reach, 0.04, 0.5, pick(leafColours), reach / 2, 0.35 + Math.random() * 0.5, 0);
    blade.rotation.z = 0.5;
    leaf.add(blade);
    plant.add(leaf);
  }
  // One enormous leaf sticking sideways into the next lane
  const big = box(1.6, 0.04, 0.7, 0x2f7d32, 1.0, 0.9, 0);
  big.rotation.z = 0.2;
  plant.add(big);
  p.group.add(plant);
  p.phase = Math.random() * 10;
  return p;
}

// A canvas sign, e.g. for the narrowboat café
const signTextures = {};
function signTexture(text, bg, fg) {
  const key = `${text}|${bg}|${fg}`;
  if (!signTextures[key]) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const g = canvas.getContext('2d');
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = fg;
    g.font = 'bold 56px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 256, 68);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    signTextures[key] = new THREE.MeshBasicMaterial({ map: tex });
  }
  return signTextures[key];
}
const signGeo = new THREE.PlaneGeometry(3.2, 0.8);

// The narrowboat café, moored by the towpath, with its queue blocking the canal-side lane.
// `queueX` is where the queue stands (lane 0's x); the boat sits in the water beside it.
export function makeCafeQueue(queueX) {
  const group = new THREE.Group();
  const boatX = -6.6 - queueX; // moored alongside the boats at the edge ("breasted up"), relative to the queue
  group.add(box(1.9, 1.2, 12, 0x1f5f3a, boatX, -0.6, -1));
  group.add(box(1.6, 0.9, 10.5, 0xe9e1cf, boatX, 0.45, -1));
  group.add(box(1.62, 0.06, 10.6, 0x1f5f3a, boatX, 0.92, -1));
  group.add(box(0.05, 0.6, 1.4, 0x2b2b2b, boatX + 0.82, 0.5, 0.5)); // serving hatch
  const sign = new THREE.Mesh(signGeo, signTexture('CINNAMON BUNS £6', '#1f5f3a', '#f5e6c8'));
  sign.position.set(boatX + 0.2, 1.45, 0.5);
  sign.rotation.y = Math.PI / 2 - 0.5; // angled towards you
  group.add(sign);
  // Bunting
  for (let i = 0; i < 8; i++) {
    group.add(box(0.05, 0.22, 0.22, pick([0xff6b6b, 0xffd23f, 0x3fb6ff, 0x7cff6b]), boatX + 0.8, 1.2, -5 + i * 1.3));
  }

  // The queue: everyone facing the hatch, nobody looking where they're going
  const queue = [];
  for (let i = 0; i < 4; i++) {
    const person = makePerson({
      skin: pick(SKIN_TONES),
      shirt: pick([...CASUAL, 0xe9d5c0, 0xd6c6f2]),
      legs: pick([0x3b5b8a, 0x2b2b2b, 0xc2a27a, 0xf5f5f5]),
      shoes: pick([0xf5f5f5, 0x222222]),
      hair: pick(HAIR),
    });
    person.group.position.set(rand(-0.15, 0.15), 0, 1.2 - i * 0.9);
    person.group.rotation.y = -Math.PI / 2 + 0.6; // facing the boat, half turned
    if (i > 0) { person.armR.rotation.x = -1.5; person.armR.add(phone()); }
    group.add(person.group);
    queue.push(person);
  }
  return { group, queue, phase: Math.random() * 10 };
}

export function animateCafeQueue(m, t) {
  m.queue.forEach((p, i) => { p.rig.rotation.z = Math.sin(t * 1.2 + i) * 0.04; }); // shuffling impatiently
}

const pickupCupGeo = new THREE.CylinderGeometry(0.22, 0.16, 0.5, 10);
const pickupLidGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.1, 10);

// A floating, spinning coffee you can grab to get your extra life back
export function makeCoffeePickup() {
  const group = new THREE.Group();
  const spin = new THREE.Group();
  spin.position.y = 1.1;
  spin.add(new THREE.Mesh(pickupCupGeo, mat(0xffffff)));
  const lid = new THREE.Mesh(pickupLidGeo, mat(0x6b4a2f));
  lid.position.y = 0.3;
  spin.add(lid);
  spin.add(box(0.46, 0.16, 0.36, 0xc8a27a, 0, -0.02, 0)); // cardboard sleeve
  group.add(spin);
  return { group, spin, phase: Math.random() * 10 };
}

export function animatePickup(m, t) {
  m.spin.rotation.y = t * 3;
  m.spin.position.y = 1.1 + Math.sin(t * 4) * 0.12;
}

const CLUB_SHIRTS = [0xff2d87, 0x00e0b8, 0xff7a00, 0x7c4dff, 0xc6ff00];

// A run club: a tight pack in matching shirts, two lanes wide, leader carrying the club flag.
export function makeRunClub() {
  const group = new THREE.Group();
  const shirt = pick(CLUB_SHIRTS);
  const members = [];
  const rows = [
    { z: 0.5, xs: [-1.1, -0.35, 0.4, 1.1] },
    { z: -0.5, xs: Math.random() < 0.5 ? [-0.7, 0.7] : [-1.0, 0, 1.0] },
  ];
  for (const row of rows) {
    for (const x of row.xs) {
      const skin = pick(SKIN_TONES);
      const r = makePerson({ skin, shirt, legs: skin, shoes: pick(NEON), hair: pick(HAIR) });
      r.legL.add(box(0.23, 0.26, 0.25, 0x111111, 0, -0.12, 0));
      r.legR.add(box(0.23, 0.26, 0.25, 0x111111, 0, -0.12, 0));
      r.head.add(box(0.39, 0.07, 0.39, 0xffffff, 0, 0.1, 0));
      r.rig.rotation.x = 0.15;
      r.group.position.set(x + rand(-0.08, 0.08), 0, row.z + rand(-0.12, 0.12));
      r.phase = Math.random() * 0.6; // nearly in step, obviously
      group.add(r.group);
      members.push(r);
    }
  }
  // Club flag
  const leader = members[1];
  leader.holdR = -2.4;
  const pole = new THREE.Group();
  pole.position.set(0, -0.6, 0);
  pole.add(box(0.04, 1.4, 0.04, 0xdddddd, 0, 0.7, 0));
  pole.add(box(0.03, 0.4, 0.6, shirt, 0, 1.2, 0.3));
  leader.armR.add(pole);

  return { group, members, phase: Math.random() * 10 };
}

export function animateRunClub(m, t) {
  for (const r of m.members) animateWalk(r, t + r.phase, 13);
}

const fatWheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.18, 12);

// A food delivery rider on a fat-tyre e-bike with an insulated box on their back. Faces +z.
export function makeDeliveryRider() {
  const group = new THREE.Group();
  for (const z of [0.6, -0.6]) {
    const wheel = new THREE.Mesh(fatWheelGeo, mat(0x111111));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, 0.34, z);
    group.add(wheel);
  }
  group.add(box(0.12, 0.12, 1.1, 0x222222, 0, 0.6, 0));        // frame
  group.add(box(0.2, 0.3, 0.5, 0x333333, 0, 0.55, -0.05));     // big battery
  group.add(box(0.1, 0.6, 0.1, 0x222222, 0, 0.8, 0.55));       // fork
  group.add(box(0.6, 0.06, 0.06, 0x111111, 0, 1.1, 0.5));      // handlebar
  group.add(box(0.12, 0.2, 0.03, 0x111111, 0, 1.22, 0.55));    // phone mount
  group.add(box(0.1, 0.17, 0.02, 0x7fd3ff, 0, 1.22, 0.57));    // the app, glowing

  const rider = makePerson({
    skin: pick(SKIN_TONES),
    shirt: pick([0x1b1b1b, 0x2b2b2b, 0x3a3a3a]),
    legs: 0x1b1b1b,
    shoes: pick([0xf5f5f5, 0x111111]),
    hair: 0x111111,
  });
  rider.group.position.set(0, 0.2, -0.3);
  rider.rig.rotation.x = 0.4;
  rider.armL.rotation.x = rider.armR.rotation.x = -1.1;
  rider.head.add(box(0.42, 0.18, 0.46, 0x111111, 0, 0.24, 0)); // helmet
  // Insulated food box on their back
  rider.rig.add(box(0.7, 0.65, 0.55, pick([0x00c2b2, 0xff7a00, 0xe6f542]), 0, 1.35, -0.48));
  rider.rig.add(box(0.72, 0.06, 0.57, 0xf5f5f5, 0, 1.45, -0.48));
  group.add(rider.group);

  return { group, rider, phase: Math.random() * 10 };
}

export function animateDelivery(m, t) {
  const s = Math.sin(t * 14) * 0.5;
  m.rider.legL.rotation.x = -0.8 + s;
  m.rider.legR.rotation.x = -0.8 - s;
}
