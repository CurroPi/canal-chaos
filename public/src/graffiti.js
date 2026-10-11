// Towpath wall graffiti, like the real thing: bubble pieces, silver throw-ups, scrawled tags,
// grey "buffed" patches where the council painted over, and the odd tagged-up electrical box.
// Every texture is drawn once on a canvas and shared.
import * as THREE from 'three';
import { mat } from './models.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const rand = (min, max) => min + Math.random() * (max - min);

// Invented tags (plus a few local opinions)
const PIECE_WORDS = ['ZOKE', 'KREM', 'BAZE', 'SKOR', 'OATY', 'DRIP', 'FLUX', 'REMS', 'TOFU', 'YUPZ', 'NOPE', 'E9'];
const TAG_WORDS = ['zoke', 'krem!', 'E9 KREW', 'NO2LIME', 'YUPPIES OUT', 'oat milk is a lie', 'baze', 'skor E8', 'RENT 2 HIGH', 'dms'];
const FILLS = ['#ff5fa2', '#3fd3ff', '#ffd23f', '#7cff6b', '#ff7a1a', '#b07cff', '#ff3b3b'];

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Letters drawn one by one, tilted and bouncing, so the outlines melt into one blob
function letters(g, word, x0, baseY, size, each) {
  g.font = `900 ${size}px "Arial Black", "Helvetica Neue", Impact, sans-serif`;
  g.textBaseline = 'alphabetic';
  const spots = [];
  let x = x0;
  for (const ch of word) {
    spots.push({ ch, x, y: baseY + rand(-size * 0.08, size * 0.08), r: rand(-0.18, 0.18) });
    x += g.measureText(ch).width * 0.82; // overlap a little
  }
  for (const pass of each) {
    for (const s of spots) {
      g.save();
      g.translate(s.x, s.y);
      g.rotate(s.r);
      pass(s.ch);
      g.restore();
    }
  }
  return { spots, width: x - x0 };
}

// Bubble piece or silver throw-up: shadow, white and black outlines, fill, shine and drips
function piece(word, fill, chrome) {
  return canvasTexture(512, 200, (g, w, h) => {
    const size = word.length > 3 ? 120 : 140;
    g.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
    const textW = [...word].reduce((a, ch) => a + g.measureText(ch).width * 0.82, 0);
    const x0 = Math.max(20, (w - textW) / 2);
    const base = 150;
    g.lineJoin = 'round';
    const paint = chrome ? (() => {
      const grad = g.createLinearGradient(0, base - size, 0, base);
      grad.addColorStop(0, '#f4f6f7');
      grad.addColorStop(0.5, '#b9bec2');
      grad.addColorStop(0.55, '#8e9499');
      grad.addColorStop(1, '#d6dadd');
      return grad;
    })() : fill;
    const { spots } = letters(g, word, x0, base, size, [
      (ch) => { g.lineWidth = 34; g.strokeStyle = chrome ? '#111' : '#1a1a2e'; g.strokeText(ch, 9, 9); }, // 3D shadow
      (ch) => { if (!chrome) { g.lineWidth = 30; g.strokeStyle = '#fff'; g.strokeText(ch, 0, 0); } },
      (ch) => { g.lineWidth = 16; g.strokeStyle = '#111'; g.strokeText(ch, 0, 0); },
      (ch) => { g.fillStyle = paint; g.fillText(ch, 0, 0); },
      (ch) => { // little shine
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.fillRect(size * 0.1, -size * 0.6, size * 0.08, size * 0.18);
      },
    ]);
    // Drips running down from the letters
    g.strokeStyle = chrome ? '#b9bec2' : fill;
    g.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const s = pick(spots);
      const dx = s.x + rand(10, size * 0.5);
      const len = rand(12, 40);
      g.lineWidth = rand(4, 7);
      g.beginPath();
      g.moveTo(dx, s.y + 4);
      g.lineTo(dx, s.y + 4 + len);
      g.stroke();
    }
  });
}

// Quick marker scrawl, slanted, with a swoosh underneath
function tag(word, ink, buffed) {
  return canvasTexture(512, 200, (g, w, h) => {
    if (buffed) { // council paint rollered over older tags: patchy greys with ragged edges
      for (let i = 0; i < 4; i++) {
        g.fillStyle = pick(['#9a9690', '#8d8a85', '#a5a29b', '#b4b1aa', '#c2c4c6']);
        const x = rand(0, 50);
        const y = rand(0, 30);
        const bw = rand(360, 500 - x);
        const bh = rand(130, 195 - y);
        g.fillRect(x, y, bw, bh);
        for (let k = 0; k < 14; k++) { // roller marks sticking out
          g.fillRect(x + rand(0, bw - 20), y - rand(0, 8), rand(12, 40), bh + rand(0, 16));
        }
      }
    }
    g.save();
    g.translate(40, 130);
    g.transform(1, 0, -0.3, 1, 0, 0); // italic lean
    g.font = `bold ${word.length > 8 ? 64 : 110}px "Marker Felt", "Comic Sans MS", cursive`;
    g.fillStyle = ink;
    const fit = Math.min(1, 440 / g.measureText(word).width);
    g.scale(fit, 1);
    g.fillText(word, 0, 0);
    g.restore();
    g.strokeStyle = ink;
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(50, 150);
    g.quadraticCurveTo(250, 175, 440, 140);
    g.stroke();
    if (Math.random() < 0.5) { // crown
      g.beginPath();
      g.moveTo(60, 60); g.lineTo(70, 35); g.lineTo(82, 55); g.lineTo(94, 30); g.lineTo(104, 58);
      g.stroke();
    }
  });
}

// Grey box covered in tags and peeling stickers, for the electrical cabinet
function cabinet() {
  return canvasTexture(128, 160, (g, w, h) => {
    g.fillStyle = '#8f978d';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(w / 2 - 1, 8, 2, h - 16); // the two doors
    for (let i = 0; i < 5; i++) { // stickers
      g.fillStyle = pick(['#f2f2f2', '#ffd23f', '#3fd3ff', '#ff5fa2', '#111']);
      g.fillRect(rand(5, w - 35), rand(5, h - 30), rand(18, 34), rand(12, 24));
    }
    g.lineCap = 'round';
    for (let i = 0; i < 6; i++) { // scribbled tags
      g.strokeStyle = pick(['#111', '#fff', '#d22', '#1a5fd0']);
      g.lineWidth = rand(2, 4);
      g.beginPath();
      let x = rand(5, 50);
      let y = rand(20, h - 10);
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += rand(6, 14);
        y += rand(-14, 14);
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.fillStyle = '#ffd23f'; // danger sticker
    g.beginPath();
    g.moveTo(w / 2 + 16, 30); g.lineTo(w / 2 + 34, 58); g.lineTo(w / 2 - 2, 58);
    g.fill();
  });
}

// The pool of designs, drawn the first time they're needed
let designs = null;
function getDesigns() {
  if (designs) return designs;
  const make = (tex, width, height, under = false) => ({
    under, // buffed patches go underneath the newer stuff
    mat: new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    geo: new THREE.PlaneGeometry(width, height),
  });
  designs = [];
  for (let i = 0; i < 7; i++) designs.push(make(piece(pick(PIECE_WORDS), FILLS[i % FILLS.length], false), rand(2.6, 3.6), 1.3));
  for (let i = 0; i < 3; i++) designs.push(make(piece(pick(PIECE_WORDS), null, true), rand(2.4, 3.2), 1.15));
  for (const word of TAG_WORDS) designs.push(make(tag(word, pick(['#111', '#fff', '#111', '#e23', '#1a5fd0']), false), rand(1.6, 2.4), 0.75));
  for (let i = 0; i < 4; i++) designs.push(make(tag(pick(TAG_WORDS), pick(['#111', '#e23', '#1a5fd0']), true), rand(2.6, 3.6), 1.4, true));
  return designs;
}

let cabinetParts = null;

// 2–6 pieces per stretch of wall, sometimes with a tagged electrical box at the foot of it
export function addGraffiti(decor, L, wall) {
  const pool = getDesigns();
  const count = Math.floor(rand(2, 7));
  const chosen = Array.from({ length: count }, () => pick(pool)).sort((a, b) => b.under - a.under);
  chosen.forEach((d, i) => {
    const patch = new THREE.Mesh(d.geo, d.mat);
    patch.rotation.y = -Math.PI / 2; // face the towpath
    patch.renderOrder = 1 + i;
    // each at its own depth, so overlapping ones don't flicker
    patch.position.set(wall - 0.015 - i * 0.006, rand(0.75, 2.3), rand(-L / 2 + 2, L / 2 - 2));
    decor.add(patch);
  });

  if (Math.random() < 0.25) {
    cabinetParts ||= {
      geo: new THREE.BoxGeometry(0.4, 1.3, 0.9),
      front: new THREE.MeshLambertMaterial({ map: cabinet() }),
    };
    const plain = mat(0x8f978d);
    const box = new THREE.Mesh(cabinetParts.geo, [plain, cabinetParts.front, plain, plain, plain, plain]);
    // The group sits on the wall line, so clearing the wall for our signature clears this too
    const group = new THREE.Group();
    group.position.set(wall, 0, rand(-L / 2 + 2, L / 2 - 2));
    box.position.set(-0.2, 0.65, 0);
    group.add(box);
    decor.add(group);
  }
}
