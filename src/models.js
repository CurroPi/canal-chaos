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
  p.holdingRight = true;

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

// Swing arms and legs; `freq` controls stride speed.
export function animateWalk(model, t, freq) {
  const swing = Math.sin(t * freq) * 0.6;
  model.legL.rotation.x = swing;
  model.legR.rotation.x = -swing;
  model.armL.rotation.x = -swing * 0.8;
  model.armR.rotation.x = model.holdingRight ? -0.7 : swing * 0.8;
  model.rig.position.y = Math.abs(Math.sin(t * freq)) * 0.05;
}
