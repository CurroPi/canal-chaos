// Dev-only: turns captured game stills into promo images in the game's 8-bit style,
// and saves them (via serve.py) into the project's "Marketing Materials" folder.
// Loaded on demand from the browser console in ?debug mode; never used by the game itself.

const PIXEL = '"Press Start 2P", monospace';
const BODY = '"VT323", monospace';
const INK = '#1b1b1b';

export async function fontsReady() {
  await Promise.all([document.fonts.load(`40px ${PIXEL}`), document.fonts.load(`30px ${BODY}`)]);
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// A box with a thick black border and a hard drop shadow, like the game's cards and buttons
function pixelBox(g, x, y, w, h, fill, border = 6, shadow = 10) {
  g.fillStyle = INK;
  g.fillRect(x + shadow, y + shadow, w, h);
  g.fillRect(x, y, w, h);
  g.fillStyle = fill;
  g.fillRect(x + border, y + border, w - border * 2, h - border * 2);
}

function outlinedText(g, text, x, y, font, fill, outline = INK, thickness = 5) {
  g.font = font;
  g.lineJoin = 'miter';
  g.lineWidth = thickness * 2;
  g.strokeStyle = outline;
  g.strokeText(text, x, y);
  g.fillStyle = fill;
  g.fillText(text, x, y);
}

// The cream "CANAL CHAOS" card from the start screen
function titleCard(g, x, y, scale = 1, align = 'left') {
  const w = 600 * scale;
  const h = 210 * scale;
  const left = align === 'center' ? x - w / 2 : x;
  pixelBox(g, left, y, w, h, '#fffaf0', 6 * scale, 12 * scale);
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = `${46 * scale}px ${PIXEL}`;
  for (const [text, line] of [['CANAL', 0], ['CHAOS', 1]]) {
    const ty = y + 82 * scale + line * 62 * scale;
    g.fillStyle = '#b6d7a8';
    g.fillText(text, left + w / 2 + 5 * scale, ty + 5 * scale);
    g.fillStyle = '#1f5f3a';
    g.fillText(text, left + w / 2, ty);
  }
  g.font = `${14 * scale}px ${PIXEL}`;
  g.fillStyle = '#b45309';
  g.fillText('A HACKNEY TOWPATH SURVIVAL GAME', left + w / 2, y + 185 * scale);
}

// A tilted warning banner, like the in-game "ON YOUR LEFT!"
function banner(g, x, y, text, { bg = '#ffd23f', fg = INK, size = 26, rot = -0.05 } = {}) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.font = `${size}px ${PIXEL}`;
  const w = g.measureText(text).width + size * 1.4;
  const h = size * 2.2;
  pixelBox(g, -w / 2, -h / 2, w, h, bg, 5, 8);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 0, 3);
  g.restore();
}

// The yellow call-to-action button
function button(g, x, y, text, size = 24, align = 'left') {
  g.font = `${size}px ${PIXEL}`;
  const w = g.measureText(text).width + size * 1.6;
  const h = size * 2.4;
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  pixelBox(g, left, y, w, h, '#d9a521', 5, 8);
  g.fillStyle = INK;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, left + w / 2, y + h / 2 + 2);
}

function caption(g, text, x, y, size, align = 'left') {
  g.textAlign = align;
  g.textBaseline = 'alphabetic';
  outlinedText(g, text, x, y, `${size}px ${BODY}`, '#fffaf0', INK, Math.max(3, size / 9));
}

function credit(g, x, y, size = 16, align = 'right') {
  g.textAlign = align;
  g.textBaseline = 'alphabetic';
  outlinedText(g, 'BY DUDE LONDON', x, y, `${size}px ${PIXEL}`, '#fffaf0', INK, 4);
}

// Darken top and bottom a little so text reads on any scene
function shade(g, w, h, top = 0.35, bottom = 0.45) {
  let grad = g.createLinearGradient(0, 0, 0, h * 0.35);
  grad.addColorStop(0, `rgba(10,20,25,${top})`);
  grad.addColorStop(1, 'rgba(10,20,25,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h * 0.35);
  grad = g.createLinearGradient(0, h * 0.6, 0, h);
  grad.addColorStop(0, 'rgba(10,20,25,0)');
  grad.addColorStop(1, `rgba(10,20,25,${bottom})`);
  g.fillStyle = grad;
  g.fillRect(0, h * 0.6, w, h * 0.4);
}

// ---------- Layouts ----------
export const LAYOUTS = {
  // LinkedIn link/post image: 1200 x 627
  linkedin(shot, { warning = '🔔 ON YOUR LEFT!', warnAt = [880, 150], showCredit = true } = {}) {
    const c = canvas(1200, 627);
    const g = c.getContext('2d');
    g.drawImage(shot, 0, 0);
    shade(g, 1200, 627, 0.3, 0.55);
    titleCard(g, 36, 34, 0.78);
    caption(g, 'Saturday on the Regent\'s Canal.', 40, 262, 40);
    caption(g, 'Nobody has read the sign.', 40, 300, 40);
    if (warning) banner(g, warnAt[0], warnAt[1], warning, { bg: '#e11d48', fg: '#fffaf0', size: 22 });
    button(g, 40, 520, 'PLAY FREE IN YOUR BROWSER ▶', 20);
    if (showCredit) credit(g, 1160, 596, 15);
    return c;
  },

  // Instagram feed post: 1080 x 1350 (4:5)
  igFeed(shot, {
    warning = '🔔 BEHIND YOU!', warnAt = [540, 520],
    lines = ['Dodge run clubs, Lime bikes', 'and a sausage dog attacking a duck.'],
    cta = 'PLAY FREE · LINK IN BIO',
    showCredit = true,
  } = {}) {
    const c = canvas(1080, 1350);
    const g = c.getContext('2d');
    g.drawImage(shot, 0, 0);
    shade(g, 1080, 1350, 0.35, 0.6);
    titleCard(g, 540, 60, 1, 'center');
    if (warning) banner(g, warnAt[0], warnAt[1], warning, { bg: '#e11d48', fg: '#fffaf0', size: 30 });
    caption(g, lines[0], 540, 1130, 54, 'center');
    caption(g, lines[1], 540, 1182, 54, 'center');
    button(g, 540, 1220, cta, 24, 'center');
    if (showCredit) credit(g, 1050, 1330, 15);
    return c;
  },

  // Instagram story: 1080 x 1920 (9:16), text kept clear of the top and bottom UI
  igStory(shot, { warning = '🛵 DELIVERY! ON YOUR LEFT!', warnAt = [540, 760] } = {}) {
    const c = canvas(1080, 1920);
    const g = c.getContext('2d');
    g.drawImage(shot, 0, 0);
    shade(g, 1080, 1920, 0.45, 0.65);
    titleCard(g, 540, 250, 1.1, 'center');
    if (warning) banner(g, warnAt[0], warnAt[1], warning, { bg: '#e11d48', fg: '#fffaf0', size: 30 });
    caption(g, 'Can you survive', 540, 1500, 70, 'center');
    caption(g, 'Saturday on the canal?', 540, 1570, 70, 'center');
    button(g, 540, 1610, 'PLAY FREE · LINK IN BIO', 28, 'center');
    credit(g, 540, 1760, 18, 'center');
    return c;
  },

  // Carousel slide: a clean still with a small label and the title in the corner
  igSlide(shot, { label = 'THE CHAOS', line = '' } = {}) {
    const c = canvas(1080, 1350);
    const g = c.getContext('2d');
    g.drawImage(shot, 0, 0);
    shade(g, 1080, 1350, 0.3, 0.55);
    if (line) caption(g, line, 540, 1250, 52, 'center');
    g.textAlign = 'right';
    outlinedText(g, 'CANAL CHAOS', 1040, 1320, `20px ${PIXEL}`, '#b6d7a8', INK, 4);
    return c;
  },
};

// Fix the slide label's position (banner is centred on x)
const slide = LAYOUTS.igSlide;
LAYOUTS.igSlide = (shot, opts = {}) => {
  const c = slide(shot, { ...opts, label: '' });
  const g = c.getContext('2d');
  g.font = `30px ${PIXEL}`;
  const w = g.measureText(opts.label || 'THE CHAOS').width + 42;
  banner(g, 50 + w / 2, 100, opts.label || 'THE CHAOS', { size: 30, rot: -0.03 });
  return c;
};

export async function save(c, name) {
  const res = await fetch(`/__save/${name}`, { method: 'POST', body: c.toDataURL('image/png') });
  return res.ok ? `saved ${name}` : `failed ${name}`;
}
