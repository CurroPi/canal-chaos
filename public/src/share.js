// "Share score": turns a run into a pixel-style score card image (with a snapshot of the crash)
// and shares it through the phone's share sheet, or downloads it where sharing files isn't supported.

const PIXEL = '"Press Start 2P", monospace';
const BODY = '"VT323", monospace';
const INK = '#1b1b1b';
const CREAM = '#fffaf0';
export const GAME_URL = 'https://playcanalchaos.com';

// A copy of what's on screen right now (call it the moment you crash)
export function snapshot(renderer, scene, camera) {
  renderer.render(scene, camera); // draw a fresh frame so the copy isn't blank
  const src = renderer.domElement;
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

function box(g, x, y, w, h, fill, border = 6, shadow = 10) {
  g.fillStyle = INK;
  g.fillRect(x + shadow, y + shadow, w, h);
  g.fillRect(x, y, w, h);
  g.fillStyle = fill;
  g.fillRect(x + border, y + border, w - border * 2, h - border * 2);
}

// Split text into lines that fit `width`, at most `max` lines (the last one gets "…")
function wrap(g, text, width, max) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > width && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > max) {
    lines.length = max;
    lines[max - 1] = `${lines[max - 1].replace(/\W*\w*$/, '')}…`;
  }
  return lines;
}

function svgImage(svg) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.includes('xmlns') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'))}`;
  });
}

// The card: 1080 x 1350 (fits an Instagram post, WhatsApp, and the rest)
export async function makeScoreCard({ shot, score, message, walker, drinkSvg, title, isRecord }) {
  await Promise.all([document.fonts.load(`40px ${PIXEL}`), document.fonts.load(`40px ${BODY}`)]);
  const W = 1080;
  const H = 1350;
  const PHOTO = 740;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');

  // The crash, cropped to fill the top
  g.fillStyle = '#78aaf0';
  g.fillRect(0, 0, W, PHOTO);
  if (shot) {
    const s = Math.max(W / shot.width, PHOTO / shot.height);
    g.drawImage(shot, (W - shot.width * s) / 2, (PHOTO - shot.height * s) / 2, shot.width * s, shot.height * s);
  }
  const fade = g.createLinearGradient(0, 0, 0, 260);
  fade.addColorStop(0, 'rgba(10,20,25,0.45)');
  fade.addColorStop(1, 'rgba(10,20,25,0)');
  g.fillStyle = fade;
  g.fillRect(0, 0, W, 260);

  // Title card, top left
  box(g, 44, 44, 470, 150, CREAM, 6, 10);
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = `40px ${PIXEL}`;
  for (const [text, y] of [['CANAL', 112], ['CHAOS', 168]]) {
    g.fillStyle = '#b6d7a8';
    g.fillText(text, 279 + 4, y + 4);
    g.fillStyle = '#1f5f3a';
    g.fillText(text, 279, y);
  }

  // The panel
  g.fillStyle = INK;
  g.fillRect(0, PHOTO - 8, W, 8);
  g.fillStyle = CREAM;
  g.fillRect(0, PHOTO, W, H - PHOTO);

  g.textAlign = 'left';
  g.fillStyle = '#b45309';
  g.font = `30px ${PIXEL}`;
  g.fillText('SATURDAY ON THE CANAL.', 60, PHOTO + 72);
  g.font = `110px ${PIXEL}`;
  const steps = score.toLocaleString('en-GB');
  g.fillStyle = '#b6d7a8';
  g.fillText(steps, 66, PHOTO + 196);
  g.fillStyle = INK;
  g.fillText(steps, 60, PHOTO + 190);
  const pw = g.measureText(steps).width;
  g.font = `30px ${PIXEL}`;
  g.fillText('STEPS', 60 + pw + 24, PHOTO + 190);
  g.font = `26px ${PIXEL}`;
  g.fillText('BEFORE THE TOWPATH GOT ME.', 60, PHOTO + 250);

  if (isRecord) { // tilted "new best" sticker
    g.save();
    g.translate(870, PHOTO - 20);
    g.rotate(0.08);
    g.font = `22px ${PIXEL}`;
    box(g, -150, -38, 300, 76, '#ffd23f', 5, 7);
    g.fillStyle = INK;
    g.textAlign = 'center';
    g.fillText('NEW PB!', 0, 12);
    g.restore();
    g.textAlign = 'left';
  }

  g.fillStyle = '#6b6b6b';
  g.font = `40px ${BODY}`;
  g.fillText('KILLED BY:', 60, PHOTO + 318);
  g.fillStyle = INK;
  g.font = `54px ${BODY}`;
  wrap(g, message, W - 120, 2).forEach((line, i) => g.fillText(line, 60, PHOTO + 370 + i * 48));

  // Who you were, and your last title
  const icon = drinkSvg ? await svgImage(drinkSvg) : null;
  if (icon) g.drawImage(icon, 60, PHOTO + 446, 33, 44);
  g.fillStyle = '#4a4a4a';
  g.font = `40px ${BODY}`;
  g.fillText(`as ${walker}${title ? ` · ${title}` : ''}`, icon ? 104 : 60, PHOTO + 480);

  // Call to action
  g.font = `26px ${PIXEL}`;
  const cta = 'BEAT MY STEPS: PLAYCANALCHAOS.COM';
  const cw = g.measureText(cta).width + 60;
  box(g, (W - cw) / 2, H - 92, cw, 62, '#ffd23f', 5, 8);
  g.fillStyle = INK;
  g.textAlign = 'center';
  g.fillText(cta, W / 2, H - 48);
  return c;
}

// Share sheet where possible (phones, Safari); otherwise download the image and copy the link
export async function shareCard(card, text) {
  const blob = await new Promise((resolve) => card.toBlob(resolve, 'image/png'));
  const file = new File([blob], 'canal-chaos-score.png', { type: 'image/png' });
  const message = `${text} ${GAME_URL}`;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: message });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'canal-chaos-score.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  try { await navigator.clipboard.writeText(message); } catch { /* clipboard not allowed */ }
  return 'downloaded';
}
