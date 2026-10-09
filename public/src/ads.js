// Fake, ironic "ad breaks" between runs: pixel-art scenes in the style of cheap mobile-game ads.
// Each scene is drawn on a tiny 160x120 canvas and scaled up, so every rectangle is one chunky pixel.

const W = 160;
const H = 120;
let g = null; // the canvas being drawn on

// ---------- Pixel helpers ----------
const R = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function L(c, x0, y0, x1, y1, w = 1) {
  g.fillStyle = c;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), w, w);
}

// A tiny 3x5 pixel font for signs painted into the scenes
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', ' ': '000000000000000',
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
  5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111',
  '°': '010101010000000', ':': '000010000010000', '/': '001001010100100', '.': '000000000000010',
};
const textWidth = (s, k = 1) => s.length * 4 * k - k;
function text(s, x, y, c, k = 1) {
  g.fillStyle = c;
  [...s].forEach((ch, i) => {
    const p = FONT[ch] || FONT[' '];
    for (let j = 0; j < 15; j++) if (p[j] === '1') g.fillRect(x + i * 4 * k + (j % 3) * k, y + Math.floor(j / 3) * k, k, k);
  });
}
const textC = (s, cx, y, c, k = 1) => text(s, Math.round(cx - textWidth(s, k) / 2), y, c, k);

// Repeatable randomness, so bricks and bushes look the same every frame
let seed = 1;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function bricks(x0, y0, w, h, s) {
  const tints = ['#9a4733', '#a8503a', '#8f3f2d', '#b05a40'];
  R('#6e2f22', x0, y0, w, h);
  seed = s;
  for (let y = y0; y < y0 + h; y += 4) {
    const off = ((y - y0) / 4 % 2) * 4;
    for (let x = x0 - off; x < x0 + w; x += 8) R(tints[Math.floor(rnd() * 4)], Math.max(x0, x), y, Math.min(7, x0 + w - x), 3);
  }
}
function cloud(x, y) {
  R('#ffffff', x + 4, y, 10, 3);
  R('#ffffff', x, y + 3, 20, 4);
  R('#e4eefa', x + 2, y + 7, 16, 1);
}
function sash(x, y, w, h, sill = true) {
  R('#1b1b1b', x - 1, y - 1, w + 2, h + 2);
  R('#2d3d4a', x, y, w, h);
  R('#1b1b1b', x, y + Math.floor(h / 2), w, 1);
  L('#7f9aab', x + 1, y + h / 2 - 2, x + 4, y + 1);
  if (sill) R('#efe6cf', x - 2, y + h + 1, w + 4, 1);
}

// ---------- The Victory: the pub that opens when it feels like it ----------
function victory(t) {
  const shut = Math.floor(t / 0.8) % 2 === 1;
  R('#3b78d8', 0, 0, W, 14); R('#5a92e6', 0, 14, W, 14); R('#78aaf0', 0, 28, W, 92);
  for (let x = 0; x < W; x += 2) { R('#5a92e6', x, 13, 1, 1); R('#78aaf0', x + 1, 27, 1, 1); }
  cloud((20 + t * 3) % 200 - 30, 6);
  cloud((110 + t * 2) % 200 - 30, 16);
  bricks(0, 30, 18, 80, 5);
  R('#d6d1c6', 150, 18, 10, 90); sash(153, 30, 6, 12); sash(153, 56, 6, 12);
  R('#8f3f2d', 24, 22, 10, 14); R('#c9663f', 25, 17, 3, 5); R('#c9663f', 30, 18, 3, 4); // chimney pots

  // Half-timbered upper floor
  R('#f1ead6', 18, 34, 48, 46); R('#f1ead6', 98, 30, 52, 50);
  R('#ddd3ba', 18, 74, 48, 6); R('#ddd3ba', 98, 74, 52, 6);
  R('#1b1b1b', 18, 33, 48, 2); R('#1b1b1b', 98, 29, 52, 2);
  L('#666', 132, 29, 132, 8); L('#666', 126, 10, 138, 10); L('#666', 128, 13, 136, 13); L('#666', 129, 16, 135, 16); // aerial
  for (const x of [18, 42, 64, 98, 124, 148]) R('#1b1b1b', x, 34, 2, 46);
  L('#1b1b1b', 20, 36, 40, 78, 2); L('#1b1b1b', 62, 36, 44, 78, 2); L('#1b1b1b', 100, 32, 122, 78, 2); L('#1b1b1b', 146, 32, 126, 78, 2);
  sash(48, 44, 12, 16); sash(104, 40, 12, 18); sash(130, 40, 12, 18);

  // The black corner tower with gold lettering
  R('#141414', 66, 24, 32, 58); R('#141414', 68, 22, 28, 2); R('#141414', 71, 21, 22, 1); R('#2e2e2e', 67, 26, 2, 54);
  R('#d9b54a', 69, 27, 26, 1); R('#d9b54a', 69, 70, 26, 1);
  textC('THE', 82, 31, '#e8c766'); textC('VICTORY', 82, 39, '#e8c766');
  textC('BEERS', 82, 50, '#d9b54a'); textC('WINES', 82, 57, '#d9b54a'); textC('SPIRITS', 82, 64, '#d9b54a');

  // Shopfront
  R('#1d2b22', 18, 80, 132, 28); R('#101a14', 18, 80, 132, 8); R('#d9b54a', 18, 80, 132, 1);
  textC('THE VICTORY', 50, 82, '#d9b54a'); textC('FREE HOUSE', 124, 82, '#d9b54a');
  for (const [x, w] of [[24, 36], [104, 40]]) {
    R('#e8a85c', x, 90, w, 13); R('#c8843f', x, 99, w, 4);
    R('#d98aa0', x, 90, 4, 13); R('#d98aa0', x + w - 4, 90, 4, 13); // curtains
    for (let m = x + 9; m < x + w - 4; m += 9) R('#1b1b1b', m, 90, 1, 13);
    R('#1b1b1b', x, 96, w, 1);
    for (let b = x + 6; b < x + w - 6; b += 5) { R('#2e7d32', b, 100, 2, 3); R('#7a1f2b', b + 2, 101, 1, 2); } // bottles
    R('#efe6cf', x, 103, w, 5);
  }
  R('#0c120f', 70, 88, 24, 20);
  R('#1d2b22', 72, 90, 9, 8); R('#1d2b22', 83, 90, 9, 8); R('#1d2b22', 72, 100, 9, 7); R('#1d2b22', 83, 100, 9, 7);
  R('#d9b54a', 90, 98, 1, 2);
  for (let i = 0; i < 4; i++) { L('#8a5a35', 2 + i * 3, 108, 8 + i * 3, 92); L('#8a5a35', 8 + i * 3, 92, 14, 92); } // stacked chairs
  R('#2e7d32', 22, 98, 18, 10); R('#3f9a44', 22, 98, 18, 2); R('#1f5f24', 22, 104, 18, 1); // planter
  seed = 9;
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI;
    const r = rnd() * 10;
    R(['#3f9a44', '#5cb85c', '#2e7d32', '#86c96a'][i % 4], Math.round(31 + Math.cos(a) * r * 1.1 - 1), Math.round(97 - Math.sin(a) * r * 0.9), 2, 2);
  }
  R('#c4bdae', 0, 108, W, 12);
  for (let y = 110; y < H; y += 3) for (let x = ((y / 3) % 2) * 3; x < W; x += 6) R('#aaa293', x, y, 4, 1);

  // The hanging sign that can't make up its mind
  R('#1b1b1b', 98, 62, 12, 1); R('#1b1b1b', 98, 62, 1, 3);
  L('#888', 101, 63, 101, 66); L('#888', 108, 63, 108, 66);
  R('#1b1b1b', 97, 66, 24, 10);
  R(shut ? '#c81e3a' : '#2f9e44', 98, 67, 22, 8);
  textC(shut ? 'SHUT' : 'OPEN', 109, 68, '#fffaf0');
}

// ---------- The Community Canoe: still chained to the wall ----------
function canoe(t) {
  bricks(0, 0, W, 60, 21);
  R('#bdb3a0', 0, 58, W, 3);
  g.globalAlpha = 0.55; text('YOZK', 96, 24, '#f0f0f0', 3); g.globalAlpha = 1;
  R('#1b1b1b', 12, 4, 48, 50); R('#2346b8', 13, 5, 46, 48); R('#3456c8', 13, 5, 46, 2);
  textC('COMMUNITY', 36, 8, '#f7f1d8'); textC('CANOE', 36, 15, '#f7f1d8', 2);
  L('#e63946', 26, 30, 46, 44, 2); L('#e63946', 46, 30, 26, 44, 2); // crossed paddles
  R('#e63946', 23, 27, 5, 6); R('#e63946', 44, 27, 5, 6);
  textC('FREE', 36, 47, '#f7f1d8');

  R('#cfc6b2', 0, 61, W, 11);
  for (let x = 0; x < W; x += 9) R('#b8af9a', x, 64 + (x % 2) * 3, 5, 2);
  R('#8c8577', 0, 72, W, 2);
  R('#3e5f4c', 0, 74, W, 46);
  for (let i = 0; i < 26; i++) {
    const x = Math.round((i * 41 + t * 5) % 180) - 10;
    const y = 78 + (i * 17) % 40;
    R('#527a63', x, y, 7, 1); R('#2f4c3c', x + 2, y + 1, 4, 1);
  }
  g.globalAlpha = 0.25; R('#9a4733', 0, 74, W, 10); g.globalAlpha = 1;

  const bob = Math.round(Math.sin(t * 2) * 1.2);
  const cx = 44;
  const cy = 90 + bob;
  for (let i = 0; i < 72; i++) {
    const e = Math.min(i, 71 - i);
    const th = Math.min(6, 1 + Math.floor(e / 3));
    R('#3fb8b0', cx + i, cy - th + 3, 1, th);
    R('#2a8f88', cx + i, cy + 3, 1, Math.min(3, th));
    if (th > 2) R('#7fe0d8', cx + i, cy - th + 3, 1, 1);
  }
  R('#1f6d68', cx + 10, cy - 1, 52, 2); R('#2a8f88', cx + 30, cy - 2, 2, 4);
  g.globalAlpha = 0.3; R('#000', cx + 4, cy + 7, 64, 2); g.globalAlpha = 1;
  for (let i = 0; i < 9; i++) R(i % 2 ? '#b0b0b0' : '#d8d8d8', 30 + i * 2, 62 + i * 3 + (i > 6 ? bob : 0), 2, 2); // chain
  const dx = cx + 42; // the duck who actually uses it
  R('#8a6a48', dx, cy - 6, 10, 5); R('#6e5236', dx + 1, cy - 4, 7, 1);
  R('#2e7d32', dx + 8, cy - 11, 5, 5); R('#fffaf0', dx + 8, cy - 7, 5, 1); R('#e8b030', dx + 13, cy - 9, 3, 2); R('#111', dx + 10, cy - 10, 1, 1);
  g.globalAlpha = 0.6; // cobweb
  L('#eee', cx + 64, cy - 4, cx + 70, cy + 1); L('#eee', cx + 64, cy + 1, cx + 70, cy - 4); L('#eee', cx + 67, cy - 5, cx + 67, cy + 2);
  g.globalAlpha = 1;
  R('#c0392b', 120, 100 + bob, 5, 3); R('#ddd', 120, 100 + bob, 5, 1); // floating can
}

// ---------- DUDE London: the black warehouse, with drinks upstairs ----------
let tag = null;
function makeTag() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = 20;
  const s = c.getContext('2d');
  seed = 77;
  const words = 'RUSHT GEWEY HOTSEX PISTOL PETE';
  const x0 = Math.round(W / 2 - textWidth(words) / 2) + 1;
  [...words].forEach((ch, i) => {
    const p = FONT[ch];
    const jy = Math.round((rnd() - 0.5) * 2);
    for (let j = 0; j < 15; j++) {
      if (p[j] !== '1') continue;
      const x = x0 + i * 4 + (j % 3);
      const y = 3 + Math.floor(j / 3) * 2 + jy;
      s.fillStyle = '#f4f4f4';
      s.fillRect(x, y, 1, 2);
      if (rnd() < 0.25) { s.fillStyle = 'rgba(244,244,244,.5)'; s.fillRect(x + (rnd() < 0.5 ? -1 : 1), y, 1, 1); }
      if ((Math.floor(j / 3) === 4 || p[j + 3] !== '1') && rnd() < 0.3) { s.fillStyle = '#f4f4f4'; s.fillRect(x, y + 2, 1, 2 + Math.floor(rnd() * 4)); } // drips
    }
  });
  return c;
}

const DRINKS = ['#e8b46a', '#f2d9a8', '#d98a5a', '#e8b46a', '#b8584a', '#f2d9a8', '#7d9cbc'];
const COLS = [18, 34, 56, 72, 94, 110, 132];
function dude(t) {
  tag ||= makeTag();
  R('#d7e3ec', 0, 0, W, 30); R('#eef3f6', 0, 0, W, 8);
  cloud((30 + t * 2) % 200 - 30, 4);
  bricks(0, 10, 18, 86, 31);
  for (let y = 18; y < 80; y += 20) sash(5, y, 8, 10, false);
  bricks(146, 22, 14, 74, 32);
  for (let i = 0; i < 5; i++) { // old sawtooth roofs behind
    const x = 24 + i * 24;
    g.fillStyle = '#9b4f3a';
    g.beginPath(); g.moveTo(x, 24); g.lineTo(x + 12, 12); g.lineTo(x + 24, 24); g.fill();
    R('#7c3c2b', x + 11, 12, 2, 12); L('#5b2c20', x, 24, x + 12, 12);
  }
  R('#2a2a2c', 14, 24, 134, 4); R('#1b1b1b', 14, 22, 134, 1);
  for (let x = 16; x < 146; x += 4) R('#1b1b1b', x, 22, 1, 3); // roof terrace railing
  for (let i = 0; i < 7; i++) {
    R('#2b2b2b', 22 + i * 18, 19, 6, 3);
    R(['#5a7d3a', '#6f8f4e', '#4f6b35'][i % 3], 23 + i * 18, 14 + (i % 2) * 2, 4, 5 + ((i + 1) % 2) * 2);
  }
  R('#1f1f21', 14, 27, 134, 64); R('#2a2a2c', 14, 27, 134, 2);
  for (const x of [52, 90, 128]) R('#151517', x, 27, 2, 64);

  // Top floor: after-work drinks (warm lights on a slow beat, a few people dancing)
  const beat = Math.floor(t * 2.5);
  COLS.forEach((x, i) => {
    R('#121212', x - 1, 31, 14, 12);
    const base = DRINKS[(i * 3 + beat) % DRINKS.length];
    for (let px = x; px < x + 12; px += 3) {
      for (let py = 32; py < 42; py += 3) {
        const flicker = ((px * 5 + py * 3 + beat * 7) % 11) < 1;
        R(flicker ? DRINKS[(i * 3 + beat + 2) % DRINKS.length] : base, px, py, 2, 2);
      }
    }
    const dx = x + ((beat + i) % 3) * 3 + 1;
    const up = (beat + i) % 2;
    R('#111', dx, 37 - up, 2, 5 + up); R('#111', dx - 1, 36 - up, 4, 1);
  });
  // First floor: the office, still working
  for (const x of COLS) {
    R('#121212', x - 1, 51, 14, 13);
    for (let px = x; px < x + 12; px += 3) {
      for (let py = 52; py < 63; py += 3) R(((px * 7 + py * 3) % 11 < 4) ? '#e8b46a' : ((px + py) % 7 < 2 ? '#b9c8d0' : '#8fa3ad'), px, py, 2, 2);
    }
  }
  g.drawImage(tag, 0, 70);
  R('#121214', 14, 88, 134, 3);
  for (let i = 0; i < 5; i++) { // piers
    const x = 20 + i * 30;
    R('#4a4a4a', x, 91, 5, 8); R('#5c5c5c', x, 91, 1, 8); R('#8a8a8a', x, 91, 5, 1);
  }
  R('#26302c', 0, 96, W, 24);
  g.save(); g.globalAlpha = 0.35; g.translate(0, 182); g.scale(1, -1); g.drawImage(tag, 0, 70); g.restore();
  for (let i = 0; i < 30; i++) R('#33403b', Math.round((i * 37 + t * 6) % 175) - 8, 98 + (i * 11) % 22, 8, 1);
  g.globalAlpha = 0.28;
  COLS.forEach((x, i) => R(DRINKS[(i * 3 + beat) % DRINKS.length], x + Math.round(Math.sin(t * 3 + x)), 115, 10, 1));
  for (let x = 18; x < 146; x += 6) R('#e8b46a', x + Math.round(Math.sin(t * 3 + x)), 111, 3, 1);
  g.globalAlpha = 1;
  const lx = 118; // a Lime bike, in the canal, obviously
  L('#1b1b1b', lx, 104, lx + 6, 98); R('#5ad34a', lx + 5, 97, 6, 2); R('#1b1b1b', lx + 10, 95, 3, 1); R('#3e4a45', lx - 2, 105, 12, 1);
  const sx = Math.round(170 - ((t * 12) % 220)); // a swan
  R('#fafafa', sx, 104, 10, 5); R('#fafafa', sx, 98, 2, 7); R('#fafafa', sx, 97, 4, 2);
  R('#e8762a', sx - 2, 98, 2, 1); R('#111', sx + 1, 98, 1, 1); R('#dcdcdc', sx + 3, 106, 7, 1);
}

// ---------- Hot Tub Time: the floating sauna (and Dave) ----------
const SKIN = '#f0c9a0';
const MOSAIC = ['#f0c9a0', '#e8a890', '#d98a7a', '#f5d5b5', '#c97a6a'];
function mosaic(x, y, w, h, t) { // the censor blur, flickering
  seed = Math.floor(t * 12) + 7;
  for (let i = 0; i < w; i += 2) for (let j = 0; j < h; j += 2) R(MOSAIC[Math.floor(rnd() * MOSAIC.length)], x + i, y + j, 2, 2);
}
function dave(x, y, naked, armsUp, t) {
  x = Math.round(x);
  y = Math.round(y);
  R('#6b4a2b', x + 1, y, 4, 1); R(SKIN, x + 1, y + 1, 4, 3); R('#111', x + 2, y + 2, 1, 1); R('#111', x + 4, y + 2, 1, 1);
  R('#6b4a2b', x + 1, y + 3, 4, 2); // beard, obviously
  R(SKIN, x, y + 5, 6, 6); R('#e0b088', x + 1, y + 9, 4, 1);
  if (armsUp) { R(SKIN, x - 1, y, 1, 6); R(SKIN, x + 6, y, 1, 6); } else { R(SKIN, x - 1, y + 5, 1, 5); R(SKIN, x + 6, y + 5, 1, 5); }
  if (naked) mosaic(x - 1, y + 11, 8, 4, t);
  else { R('#fafafa', x - 1, y + 11, 8, 4); R('#5b8fd1', x - 1, y + 13, 8, 1); } // towel
  R(SKIN, x + 1, y + 15, 2, 5); R(SKIN, x + 3, y + 15, 2, 5);
  R('#e0b088', x, y + 19, 3, 1); R('#e0b088', x + 3, y + 19, 3, 1);
}
function canalHat(kind, x, y) { // what Dave comes up wearing
  if (kind === 0) { // traffic cone
    R('#ff7a1a', x + 2, y - 5, 2, 1); R('#ff7a1a', x + 1, y - 4, 4, 2); R('#fafafa', x + 1, y - 3, 4, 1); R('#ff7a1a', x, y - 2, 6, 2);
  } else if (kind === 1) { // carrier bag
    R('#e9e9e9', x, y - 4, 6, 4); R('#cfcfcf', x, y - 4, 1, 4); R('#e9e9e9', x + 1, y - 6, 1, 2); R('#e9e9e9', x + 4, y - 6, 1, 2);
  } else { // a duck
    R('#8a6a48', x - 1, y - 4, 7, 3); R('#2e7d32', x + 4, y - 7, 3, 3); R('#e8b030', x + 7, y - 6, 2, 1); R('#111', x + 5, y - 6, 1, 1);
  }
}
function sauna(t) {
  const loop = t % 7; // towel, drop, jump, splash, surface
  const kind = Math.floor(t / 7) % 3;
  bricks(0, 0, W, 36, 3);
  R('#bdb3a0', 0, 34, W, 2);
  text('SAUNA', 6, 5, '#fffaf0'); R('#1b1b1b', 13, 11, 5, 19); R('#fafafa', 14, 12, 3, 17); R('#e11d48', 14, 13, 3, 16); text('90°', 8, 31, '#fffaf0');
  text('CANAL', 30, 5, '#fffaf0'); R('#1b1b1b', 37, 11, 5, 19); R('#fafafa', 38, 12, 3, 17); R('#3b82f6', 38, 27, 3, 2); text('4°', 33, 31, '#fffaf0');
  R('#cfc6b2', 0, 36, W, 10);
  for (let x = 0; x < W; x += 9) R('#b8af9a', x, 39 + (x % 2) * 3, 5, 2);
  R('#8c8577', 0, 46, W, 2);

  // A jogger on the towpath, who sees everything
  const rx = Math.round(175 - (t * 14) % 200);
  R('#1b1b1b', rx, 44, 1, 2); R('#1b1b1b', rx + 3, 44, 1, 2); R('#ff5a8a', rx, 38, 4, 5); R(SKIN, rx, 34, 4, 4); R('#d9b54a', rx, 33, 4, 1);
  if (loop > 2.2 && loop < 3.6 && rx > 20 && rx < 150) { R('#e11d48', rx + 1, 26, 2, 4); R('#e11d48', rx + 1, 31, 2, 1); }

  R('#3e5f4c', 0, 48, W, 72);
  for (let i = 0; i < 30; i++) {
    const x = Math.round((i * 41 + t * 5) % 180) - 10;
    const y = 52 + (i * 17) % 66;
    R('#527a63', x, y, 7, 1); R('#2f4c3c', x + 2, y + 1, 4, 1);
  }
  g.globalAlpha = 0.25; R('#9a4733', 0, 48, W, 8); g.globalAlpha = 1;

  // The boat
  R('#3a2a1e', 10, 72, 142, 10); R('#2a1e14', 12, 82, 138, 2); R('#c9a227', 10, 72, 142, 1);
  R('#b07a45', 24, 56, 118, 16);
  for (let y = 58; y < 72; y += 3) R('#9a6838', 24, y, 118, 1);
  R('#5a3a22', 22, 54, 122, 3);
  for (const x of [30, 48, 104, 122]) { R('#1b1b1b', x - 1, 59, 10, 8); R('#ff9a3c', x, 60, 8, 6); R('#ffcf7a', x + 1, 61, 3, 2); }
  text('HOT TUB TIME', 64, 62, '#fffaf0');
  R('#1b1b1b', 132, 42, 5, 12); R('#3a3a3a', 131, 41, 7, 2);
  for (let i = 0; i < 6; i++) { // steam
    const k = (t * 0.5 + i / 6) % 1;
    const s = 2 + Math.round(k * 5);
    g.globalAlpha = 0.7 * (1 - k);
    R('#e8e8e8', Math.round(134 + k * 10 - s / 2), Math.round(40 - k * 36), s, s);
    g.globalAlpha = 1;
  }
  g.globalAlpha = 0.25; R('#2a1e14', 10, 86, 142, 5); g.globalAlpha = 1;

  // Dave
  const towel = () => { R('#fafafa', 66, 52, 7, 2); R('#5b8fd1', 67, 52, 5, 1); };
  if (loop < 2.2) dave(60, 34, false, loop > 0.8 && Math.floor(t * 1.5) % 2 === 0, t);
  else if (loop < 2.6) { dave(60, 34, true, false, t); towel(); }
  else {
    towel();
    if (loop < 3.4) {
      const p = (loop - 2.6) / 0.8;
      dave(60 + 34 * p, 34 + 60 * p - 26 * Math.sin(Math.PI * p), true, true, t);
    } else {
      const age = loop - 3.4;
      if (age < 0.6) { seed = Math.floor(t * 30); for (let i = 0; i < 14; i++) R('#e8f4ff', Math.round(96 + (rnd() - 0.5) * 16), Math.round(92 - rnd() * 14 * (1 - age / 0.6)), 1, 2); }
      const r = Math.round(age * 6) % 14;
      g.globalAlpha = 0.5; R('#9ec4b0', 97 - r, 100, 2 * r + 6, 1); g.globalAlpha = 1;
      if (age > 1.3) {
        R('#6b4a2b', 96, 96, 4, 1); R(SKIN, 96, 97, 4, 3); R('#111', 97, 98, 1, 1); R('#111', 99, 98, 1, 1); R('#3e5f4c', 95, 100, 7, 2);
        canalHat(kind, 95, 96);
      }
    }
  }
}

// ---------- Narrowboat for sale: live on the canal (and move every 14 days) ----------
function backdrop(spot, t) { // where the boat is moored this fortnight
  if (spot === 0) { // warehouse wall with graffiti
    bricks(0, 14, W, 38, 41);
    g.globalAlpha = 0.6; text('NO MOORING', 50, 24, '#f0f0f0'); g.globalAlpha = 1;
  } else if (spot === 1) { // Victoria Park trees
    R('#8fc1e8', 0, 14, W, 38);
    seed = 51;
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(rnd() * W);
      const y = 18 + Math.floor(rnd() * 22);
      R(['#3f7d3a', '#4f9a44', '#2e6a2c'][i % 3], x, y, 10, 8);
    }
    for (let x = 6; x < W; x += 22) R('#5b3a22', x + 4, 40, 2, 12);
  } else { // the gasholder frame
    R('#a9c9e6', 0, 14, W, 38);
    for (let x = 30; x <= 130; x += 12) R('#5a6068', x, 18, 2, 34);
    for (const y of [18, 30, 42]) R('#5a6068', 28, y, 106, 2);
    for (let x = 30; x < 130; x += 12) L('#5a6068', x, 30, x + 12, 18);
  }
  cloud((50 + t * 2) % 200 - 30, 2);
}
function narrowboat(bx) {
  bx = Math.round(bx);
  R('#1b1b1b', bx, 88, 120, 8); R('#2b2b2b', bx + 2, 96, 116, 2); R('#c9a227', bx, 88, 120, 1); // hull
  R('#1b1b1b', bx + 118, 86, 6, 6); R('#1b1b1b', bx - 4, 86, 6, 6);                              // bow and stern
  R('#2f6b4a', bx + 8, 72, 104, 16); R('#b8322a', bx + 8, 72, 104, 2); R('#f1e3b8', bx + 8, 84, 104, 1);
  text('FOR SALE', bx + 46, 77, '#f1e3b8');
  for (const x of [14, 26, 90, 102]) { R('#c9a227', bx + x, 76, 5, 5); R('#2d3d4a', bx + x + 1, 77, 3, 3); } // portholes
  R('#244f37', bx + 6, 70, 108, 2); // roof
  R('#3a4a5c', bx + 12, 66, 18, 4); for (let i = 0; i < 18; i += 3) R('#6c87a8', bx + 12 + i, 66, 2, 4);      // solar panel
  L('#1b1b1b', bx + 36, 69, bx + 40, 64); L('#1b1b1b', bx + 40, 64, bx + 48, 64); L('#1b1b1b', bx + 48, 64, bx + 52, 69); // bike
  R('#1b1b1b', bx + 34, 67, 4, 3); R('#1b1b1b', bx + 50, 67, 4, 3);
  for (let i = 0; i < 4; i++) { R('#8a5a35', bx + 58 + i * 4, 67, 3, 3); R('#3f9a44', bx + 58 + i * 4, 64, 3, 3); }  // plant pots
  for (let i = 0; i < 3; i++) R('#7a5230', bx + 78, 64 + i * 2, 10, 2);                                     // log pile
  R('#c0392b', bx + 92, 64, 4, 6);                                                                         // gas bottle
  R('#1b1b1b', bx + 104, 58, 3, 12);                                                                       // stove chimney
}
function boatLife(t) {
  const loop = t % 9;
  const spot = Math.floor(t / 9) % 3;
  R('#cfe3f1', 0, 0, W, 14);
  backdrop(spot, t);
  R('#cfc6b2', 0, 52, W, 10);
  for (let x = 0; x < W; x += 9) R('#b8af9a', x, 55 + (x % 2) * 3, 5, 2);
  R('#8c8577', 0, 62, W, 2);
  R('#3e5f4c', 0, 64, W, 56);
  for (let i = 0; i < 28; i++) R('#527a63', Math.round((i * 41 + t * 5) % 180) - 10, 68 + (i * 17) % 50, 7, 1);

  // In, moored for a while, then off again (every 14 days, in real life)
  let bx = 20;
  if (loop < 1.5) bx = -130 + 150 * (loop / 1.5);
  else if (loop > 7) bx = 20 + 160 * ((loop - 7) / 2);
  g.globalAlpha = 0.25; R('#1b1b1b', Math.round(bx), 99, 124, 3); g.globalAlpha = 1;
  narrowboat(bx);
  for (let i = 0; i < 5; i++) { // stove smoke
    const k = (t * 0.6 + i / 5) % 1;
    g.globalAlpha = 0.6 * (1 - k);
    R('#d8d8d8', Math.round(bx + 105 - k * 8), Math.round(56 - k * 30), 2 + Math.round(k * 4), 2 + Math.round(k * 4));
    g.globalAlpha = 1;
  }
}

// ---------- Soft Launch Run Club: running, technically ----------
const HEART = ['01010', '11111', '11111', '01110', '00100'];
function heart(x, y, c) {
  g.fillStyle = c;
  HEART.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') g.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1); }));
}
function runner(x, feet, t, top, skin, hair, k = 2) { // a runner, k pixels per pixel
  const P = (c, dx, dy, w, h) => R(c, Math.round(x) + dx * k, feet + dy * k, w * k, h * k);
  const step = Math.floor(t * 8) % 2;
  P(hair, 0, -14, 3, 1); P(skin, 0, -13, 3, 3);
  P(top, 0, -10, 3, 5); P(skin, step ? -1 : 3, -9, 1, 3); // swinging arm
  P('#1b1b1b', 0, -5, 3, 2);
  if (step) { P(skin, -1, -3, 1, 3); P(skin, 3, -3, 1, 3); } else { P(skin, 1, -3, 1, 3); }
  P('#fafafa', -1, 0, 2, 1); P('#fafafa', 2, 0, 2, 1);
}
function runClub(t) {
  const scroll = t * 30;
  R('#bcd7ee', 0, 0, W, 22);
  for (let i = -1; i < 10; i++) { // far bank, sliding past
    const x = Math.round(i * 20 - (scroll * 0.3) % 20);
    const h = 12 + ((i + Math.floor(scroll * 0.3 / 20)) * 7 % 3) * 6;
    const col = ['#9a4733', '#7a7f86', '#b05a40'][(i + Math.floor(scroll * 0.3 / 20) + 3) % 3];
    R(col, x, 46 - h, 18, h);
    for (let wy = 46 - h + 3; wy < 43; wy += 5) for (let wx = 3; wx < 16; wx += 5) R('#2d3d4a', x + wx, wy, 2, 2);
  }
  R('#3e5f4c', 0, 46, W, 20);
  for (let i = 0; i < 16; i++) R('#527a63', Math.round(((i * 37) - scroll * 0.5) % 170 + 170) % 170 - 5, 48 + (i * 7) % 16, 7, 1);
  R('#8c8577', 0, 66, W, 2);
  R('#cfc6b2', 0, 68, W, 52);
  for (let x = -12; x < W + 12; x += 12) R('#b8af9a', Math.round(x - scroll % 12), 68, 1, 52);
  for (let y = 80; y < 120; y += 13) R('#b8af9a', 0, y, W, 1);

  // The club, in matching kit
  const NEON = '#c6ff3a';
  const SKINS = ['#f0c9a0', '#c98e62', '#8a5a3c', '#f5d5b5', '#e0b088', '#6b4630'];
  const HAIR = ['#6b4a2b', '#1b1b1b', '#d9b54a', '#1b1b1b', '#a0522d', '#1b1b1b'];
  const lag = ((t % 10) / 10) * 50; // the couple, drifting to the back
  const club = [[138, 108, 0], [116, 116, 1], [96, 108, 2], [76, 114, 3]];
  for (const [x, feet, i] of club) runner(x, feet, t + i * 0.13, NEON, SKINS[i], HAIR[i]);
  runner(54 - lag, 112, t + 0.5, NEON, SKINS[4], HAIR[4]);
  runner(66 - lag, 113, t + 0.6, NEON, SKINS[5], HAIR[5]);
  R(SKINS[4], Math.round(60 - lag), 96, 6, 2); // holding hands
  for (let i = 0; i < 5; i++) { // hearts instead of sweat
    const k = (t * 0.7 + i / 5) % 1;
    g.globalAlpha = 1 - k;
    heart(61 - lag + Math.sin(t * 3 + i) * 5, 80 - k * 34, ['#e11d48', '#ff5a8a'][i % 2]);
    g.globalAlpha = 1;
  }

  // The running app, telling the truth
  R('#1b1b1b', 4, 4, 58, 24);
  text('PACE', 8, 8, '#fc5200'); text('9:42/KM', 28, 8, '#fffaf0');
  heart(8, 16, '#e11d48'); text(`${150 + Math.floor((t % 10) * 4)} BPM`, 16, 16, '#fffaf0');
  text('KM 2.1', 8, 22, '#9aa');
}

// ---------- The ads ----------
export const ADS = [
  {
    logo: 'V', logoBg: '#141414', logoFg: '#e8c766',
    brand: 'THE VICTORY', sub: 'Sponsored · Pub · Hackney',
    headline: 'GOOGLE SAYS OPEN.<br>GOOGLE IS WRONG.',
    small: '*Opening hours subject to vibes. Happy hour also subject to vibes.',
    stars: '★★★☆☆ "it was shut"',
    cta: 'GET DIRECTIONS', ctaAfter: 'SORRY, WE\'RE SHUT',
    draw: victory,
  },
  {
    logo: 'C', logoBg: '#2346b8', logoFg: '#f7f1d8',
    brand: 'COMMUNITY CANOE', sub: 'Sponsored · Free paddles · Regent\'s Canal',
    headline: 'SENT TO THE GROUP CHAT 31 TIMES.<br>BOOKED 0 TIMES.',
    small: 'Free of charge. Free of commitment. The duck is using it for now.',
    stars: '★★★★★ "we should!!"',
    cta: 'BOOK NOW', ctaAfter: 'MAYBE NEXT SUMMER',
    draw: canoe,
  },
  {
    logo: 'D', logoBg: '#111', logoFg: '#fffaf0',
    brand: 'DUDE LONDON', sub: 'Sponsored · Creative agency',
    headline: 'CRAZY SHIT.<br>THAT WORKS.<br>LIKE THIS GAME.',
    small: 'You are literally playing the portfolio.',
    stars: '★★★★★ "crazy shit"',
    cta: 'HIRE US', ctaAfter: 'NOT NOW, WE\'RE AT THE VICTORY',
    link: 'https://dude.it/london/', // the second press opens it
    draw: dude,
  },
  {
    logo: 'H', logoBg: '#8a5a32', logoFg: '#ffcf7a',
    brand: 'HOT TUB TIME', sub: 'Sponsored · Floating sauna · Regent\'s Canal',
    badge: 'RATED PG: PIXELATED GENITALS',
    headline: 'MISSING THE HEATWAVE?<br>90°C ON A BOAT.<br>4°C IN THE CANAL.',
    small: 'Towels optional. Dignity not included. Canal water not tested.',
    stars: '★★★★★ "my pores have never been so open. or so scared."',
    cta: 'BOOK A SESSION', ctaAfter: 'FULLY BOOKED BY CONSULTANTS',
    draw: sauna,
  },
  {
    logo: '£', logoBg: '#2f6b4a', logoFg: '#f1e3b8',
    brand: 'NARROWBOAT FOR SALE', sub: 'Sponsored · £85,000 ONO · Zone 2 (ish)',
    headline: 'ESCAPE THE RENT.<br>MOVE EVERY 14 DAYS.<br>LIKE RENTING, BUT WET.',
    small: 'Mooring not included. Toilet emptying not included. Damp included.',
    stars: '★★★★★ "haven\'t had a dry sock since 2021"',
    cta: 'ENQUIRE NOW', ctaAfter: 'YOUR TOILET IS NOW FULL',
    draw: boatLife,
  },
  {
    logo: '♥', logoBg: '#c6ff3a', logoFg: '#1b1b1b',
    brand: 'SOFT LAUNCH RUN CLUB', sub: 'Sponsored · Tuesdays 7pm · Then natural wine',
    headline: '5K. 3 DATES.<br>0 PERSONAL BESTS.',
    small: 'Pace: conversational. Conversation: about pace. Running optional, post-run drinks mandatory.',
    stars: '★★★★★ "met my fiancé at km 2. we walked the rest."',
    cta: 'JOIN THE CLUB', ctaAfter: 'MATCHED WITH YOUR EX',
    draw: runClub,
  },
];

let nextAd = Math.floor(Math.random() * ADS.length);
export const queueAd = (i) => { nextAd = i % ADS.length; }; // testing helper

// Fills `container` with the next ad. Calls `done` when skipped. Returns a function that skips (if allowed).
export function playAd(container, { skipAfter }, done) {
  const ad = ADS[nextAd];
  nextAd = (nextAd + 1) % ADS.length; // take turns
  container.innerHTML = `
    <div class="ad-head">
      <div class="ad-logo" style="background:${ad.logoBg};color:${ad.logoFg}">${ad.logo}</div>
      <div><div class="ad-brand">${ad.brand}</div><div class="ad-sub">${ad.sub}</div></div>
    </div>
    <div class="ad-scene">
      <canvas width="${W}" height="${H}"></canvas>
      ${ad.badge ? `<span class="ad-badge">${ad.badge}</span>` : ''}
      <button class="ad-skip" disabled></button>
      <div class="ad-progress"></div>
    </div>
    <p class="ad-headline">${ad.headline}</p>
    <p class="ad-small">${ad.small}</p>
    <div class="ad-foot"><span class="ad-stars">${ad.stars}</span><button class="ad-cta">${ad.cta}</button></div>
  `;
  const canvas = container.querySelector('canvas');
  const skip = container.querySelector('.ad-skip');
  const progress = container.querySelector('.ad-progress');
  const cta = container.querySelector('.ad-cta');

  let pressed = false;
  cta.addEventListener('click', () => {
    if (pressed && ad.link) window.open(ad.link, '_blank', 'noopener');
    pressed = true;
    cta.textContent = ad.ctaAfter;
  });

  const start = performance.now();
  let running = true;
  const canSkip = () => (performance.now() - start) / 1000 >= skipAfter;
  const finish = () => {
    if (!running || !canSkip()) return false;
    running = false;
    done();
    return true;
  };
  skip.addEventListener('click', finish);

  const frame = (now) => {
    if (!running || !canvas.isConnected) return;
    const t = (now - start) / 1000;
    g = canvas.getContext('2d');
    ad.draw(t);
    const left = Math.ceil(skipAfter - t);
    skip.disabled = left > 0;
    skip.textContent = left > 0 ? `Skip ad in ${left}` : 'Skip ad ▶';
    progress.style.width = `${Math.min(100, (t / 10) * 100)}%`;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return finish;
}
