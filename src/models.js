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

  // Coffee cup in the right hand
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.055, 0.2, 8), mat(0xffffff));
  cup.position.set(0, -0.66, 0.08);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 8), mat(0x6b4a2f));
  lid.position.set(0, -0.54, 0.08);
  p.armR.add(cup, lid);
  p.cup = [cup, lid];
  p.holdR = -0.7;

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

// Show or hide the player's coffee
export function setCoffee(player, on) {
  for (const part of player.cup) part.visible = on;
  player.holdR = on ? -0.7 : undefined;
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
  bike.add(box(0.38, 0.26, 0.3, 0x2f2f2f, 0, 0.86, 0.75));     // front basket
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
  const to = new THREE.Vector3(dogDx, 0.5, 0.85);
  const len = from.distanceTo(to);
  const lead = new THREE.Group();
  lead.position.copy(from);
  lead.add(box(0.05, 0.05, len, 0xff3b30, 0, 0, len / 2));
  lead.lookAt(to);
  group.add(lead);

  return { group, owner, dog, phase: Math.random() * 10 };
}

function makeDog() {
  const group = new THREE.Group();
  const col = pick([0x8b5a2b, 0x2b2b2b, 0xd4b48c, 0xf5f5f5]);
  const long = Math.random() < 0.5; // sausage dog, obviously
  const bodyLen = long ? 0.8 : 0.5;
  group.add(box(0.26, 0.24, bodyLen, col, 0, 0.36, 0));
  group.add(box(0.26, 0.24, 0.26, col, 0, 0.52, bodyLen / 2 + 0.08));       // head
  group.add(box(0.13, 0.1, 0.14, 0x3a2a1f, 0, 0.47, bodyLen / 2 + 0.26));   // snout
  group.add(box(0.07, 0.12, 0.05, col, -0.1, 0.68, bodyLen / 2 + 0.04));    // ears
  group.add(box(0.07, 0.12, 0.05, col, 0.1, 0.68, bodyLen / 2 + 0.04));
  group.add(box(0.3, 0.05, 0.08, 0xff3b30, 0, 0.46, bodyLen / 2 - 0.02));   // collar

  const legs = [];
  for (const z of [bodyLen / 2 - 0.08, -bodyLen / 2 + 0.08]) {
    for (const x of [-0.09, 0.09]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.26, z);
      leg.add(box(0.07, 0.26, 0.07, col, 0, -0.13, 0));
      group.add(leg);
      legs.push(leg);
    }
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.45, -bodyLen / 2);
  tail.add(box(0.05, 0.05, 0.25, col, 0, 0.06, -0.1));
  group.add(tail);
  return { group, legs, tail };
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
