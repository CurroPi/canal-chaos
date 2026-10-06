// Tiny synthesised sound effects. No audio files needed.

let ctx = null;

// Browsers only allow sound after a click/tap, so call this from the Start button.
export function initAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq, start, dur, { type = 'sine', vol = 0.2, endFreq = null } = {}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur);
}

// "Ding ding!"
export function bell() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const offset of [0, 0.17]) {
    tone(2350, t + offset, 0.5, { vol: 0.12 });
    tone(3520, t + offset, 0.3, { vol: 0.05 });
  }
}

// Sad slosh
export function spillSound() {
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(620, t, 0.35, { type: 'triangle', vol: 0.25, endFreq: 140 });
}

// Thud
export function crashSound() {
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(140, t, 0.45, { type: 'square', vol: 0.12, endFreq: 50 });
  tone(90, t + 0.05, 0.5, { type: 'sawtooth', vol: 0.08, endFreq: 40 });
}

// Happy little "bling"
export function pickupSound() {
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(880, t, 0.15, { type: 'triangle', vol: 0.18 });
  tone(1320, t + 0.08, 0.25, { type: 'triangle', vol: 0.15 });
}

// Electric motor whine, rising
export function whineSound() {
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(220, t, 0.9, { type: 'sawtooth', vol: 0.07, endFreq: 880 });
  tone(330, t, 0.9, { type: 'square', vol: 0.03, endFreq: 1320 });
}
