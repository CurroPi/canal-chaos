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

// All sound effects go through one volume control, so they can be muted separately from the music
let sfxGain = null;
let sfxMuted = false;
try { sfxMuted = localStorage.getItem('canal-sfx-muted') === '1'; } catch { /* storage unavailable */ }
function sfxOut() {
  if (!sfxGain) {
    sfxGain = ctx.createGain();
    sfxGain.gain.value = sfxMuted ? 0 : 1;
    sfxGain.connect(ctx.destination);
  }
  return sfxGain;
}

export function isSfxMuted() {
  return sfxMuted;
}

export function toggleSfx() {
  sfxMuted = !sfxMuted;
  try { localStorage.setItem('canal-sfx-muted', sfxMuted ? '1' : '0'); } catch { /* storage unavailable */ }
  if (sfxGain) sfxGain.gain.value = sfxMuted ? 0 : 1;
  return sfxMuted;
}

function tone(freq, start, dur, { type = 'sine', vol = 0.2, endFreq = null } = {}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain).connect(sfxOut());
  osc.start(start);
  osc.stop(start + dur);
}

// A real bicycle bell: "ding-ding"
// Each ding = a metallic strike click + inharmonic overtones (higher ones fade faster),
// each paired with a slightly detuned twin so the dome shimmers.
const BELL_PARTIALS = [
  { ratio: 1, vol: 0.09, decay: 1.1 },
  { ratio: 2.32, vol: 0.05, decay: 0.45 },
  { ratio: 4.25, vol: 0.025, decay: 0.2 },
  { ratio: 6.63, vol: 0.012, decay: 0.1 },
];
let sfxNoise = null;

function bellStrike(start, strength) {
  const base = 2150;
  for (const p of BELL_PARTIALS) {
    for (const detune of [1, 1.0035]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * p.ratio * detune, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(p.vol * strength, start + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + p.decay);
      osc.connect(gain).connect(sfxOut());
      osc.start(start);
      osc.stop(start + p.decay);
    }
  }
  // The click of the striker hitting the dome
  if (!sfxNoise) {
    sfxNoise = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = sfxNoise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = sfxNoise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 5000;
  filter.Q.value = 2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12 * strength, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.025);
  src.connect(filter).connect(gain).connect(sfxOut());
  src.start(start);
  src.stop(start + 0.03);
}

export function bell() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.01;
  bellStrike(t, 1);
  bellStrike(t + 0.16, 0.8); // thumb flicks it again, a touch softer
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

// Whoosh: a swept burst of air, for the opening camera swing
export function whooshSound(dur) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const len = Math.max(0.2, dur);
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(350, t);
  filter.frequency.exponentialRampToValueAtTime(2400, t + len * 0.55);
  filter.frequency.exponentialRampToValueAtTime(500, t + len);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.exponentialRampToValueAtTime(0.22, t + len * 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(filter).connect(gain).connect(sfxOut());
  src.start(t);
  src.stop(t + len);
}

// Pool balls knocking together (strength 0..1)
let lastClack = 0;
export function clackSound(strength = 1) {
  if (!ctx || ctx.currentTime - lastClack < 0.04) return;
  lastClack = ctx.currentTime;
  const t = ctx.currentTime;
  tone(2200, t, 0.05, { type: 'square', vol: 0.05 * strength, endFreq: 1400 });
  tone(900, t, 0.04, { type: 'triangle', vol: 0.06 * strength });
}

// A quack: two quick nasal honks (pitch: 1 = normal)
export function quackSound(pitch = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const [delay, f] of [[0, 520], [0.11, 470]]) {
    tone(f * pitch, t + delay, 0.09, { type: 'sawtooth', vol: 0.06, endFreq: f * pitch * 0.62 });
    tone(f * pitch * 2, t + delay, 0.07, { type: 'square', vol: 0.025, endFreq: f * pitch * 1.2 });
  }
}

// A splash of water
function splashSound() {
  const t = ctx.currentTime;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.2), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  src.connect(filter).connect(gain).connect(sfxOut());
  src.start(t);
}

// Courtship moves: head up (rising whistle), flick (splash), nod (quack), whistle (grunt then whistle)
export function courtshipSound(move) {
  if (!ctx) return;
  const t = ctx.currentTime;
  if (move === 'up') tone(700, t, 0.22, { type: 'sine', vol: 0.12, endFreq: 1600 });
  else if (move === 'flick') { splashSound(); tone(300, t, 0.08, { type: 'triangle', vol: 0.06, endFreq: 120 }); }
  else if (move === 'nod') quackSound(1.1);
  else { tone(160, t, 0.08, { type: 'square', vol: 0.07, endFreq: 110 }); tone(2400, t + 0.09, 0.2, { type: 'sine', vol: 0.11, endFreq: 3100 }); }
}

// A soft dance beat: kick on the bar, tick on the others
export function beatSound(strong) {
  if (!ctx) return;
  const t = ctx.currentTime;
  if (strong) tone(110, t, 0.16, { type: 'sine', vol: 0.22, endFreq: 45 });
  else tone(1800, t, 0.03, { type: 'square', vol: 0.025 });
}

// Electric motor whine, rising
export function whineSound() {
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(220, t, 0.9, { type: 'sawtooth', vol: 0.07, endFreq: 880 });
  tone(330, t, 0.9, { type: 'square', vol: 0.03, endFreq: 1320 });
}

// ---------- 8-bit music ----------
// An original chiptune loop, synthesised live: square-wave lead, triangle bass, noise drums.
// Am – F – C – G, eight bars, written as eighth notes ('.' is a rest).
const LEAD = [
  'A4 C5 E5 A5 G5 E5 C5 E5', 'F4 A4 C5 F5 E5 C5 A4 C5', 'G4 C5 E5 G5 A5 G5 E5 C5', 'B4 D5 G5 B4 D5 . G4 .',
  'E5 E5 . A5 . G5 E5 D5', 'C5 C5 . F5 . E5 C5 A4', 'G4 G4 . C5 . D5 E5 G5', 'D5 . B4 . G4 . . .',
].join(' ').split(' ');
const BASS_ROOTS = ['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'C3', 'G2'];

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freq(note) {
  const semis = NOTE_INDEX[note[0]] + (Number(note.slice(1)) + 1) * 12; // MIDI number
  return 440 * 2 ** ((semis - 69) / 12);
}

let musicGain = null;
let noiseBuffer = null;
let musicTimer = null;
let step = 0;          // sixteenth notes
let nextStepAt = 0;
let bpm = 150;
let muted = false;
try { muted = localStorage.getItem('canal-muted') === '1'; } catch { /* storage unavailable */ }

function musicOut() {
  if (!musicGain) {
    musicGain = ctx.createGain();
    musicGain.gain.value = muted ? 0 : 0.5;
    musicGain.connect(ctx.destination);
  }
  return musicGain;
}

function blip(f, start, dur, type, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, start);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.setValueAtTime(vol, start + dur * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain).connect(musicOut());
  osc.start(start);
  osc.stop(start + dur);
}

function noise(start, dur, vol, highpass) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = highpass;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  src.connect(filter).connect(gain).connect(musicOut());
  src.start(start);
  src.stop(start + dur);
}

function kick(start) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(150, start);
  osc.frequency.exponentialRampToValueAtTime(40, start + 0.12);
  gain.gain.setValueAtTime(0.5, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
  osc.connect(gain).connect(musicOut());
  osc.start(start);
  osc.stop(start + 0.15);
}

function playStep(s, at) {
  const sixteenth = 60 / bpm / 4;
  const bar = Math.floor(s / 16) % 8;
  const inBar = s % 16;

  if (s % 2 === 0) {
    const note = LEAD[(s / 2) % LEAD.length];
    if (note !== '.') blip(freq(note), at, sixteenth * 1.8, 'square', 0.09);
    const root = BASS_ROOTS[bar];
    const octave = inBar % 4 === 2 ? root[0] + (Number(root[1]) + 1) : root; // root, octave up, root...
    blip(freq(octave), at, sixteenth * 1.7, 'triangle', 0.22);
  }

  if (inBar === 0 || inBar === 8 || (inBar === 10 && bar % 2)) kick(at);
  if (inBar === 4 || inBar === 12) noise(at, 0.12, 0.25, 1200);  // snare
  if (s % 2 === 0) noise(at, 0.03, 0.08, 7000);                  // hi-hat
}

function scheduler() {
  while (nextStepAt < ctx.currentTime + 0.12) {
    playStep(step, nextStepAt);
    nextStepAt += 60 / bpm / 4;
    step++;
  }
}

export function startMusic() {
  if (!ctx || musicTimer) return;
  step = 0;
  nextStepAt = ctx.currentTime + 0.05;
  musicTimer = setInterval(scheduler, 25);
}

export function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}

// The music speeds up as the towpath gets busier (0 = calm, 1 = chaos)
export function setMusicIntensity(p) {
  bpm = 150 + 20 * p;
}

// Sad little "game over" jingle
export function gameOverJingle() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.1;
  ['E5', 'D#5', 'D5', 'C#5'].forEach((n, i) => {
    const f = n.includes('#') ? freq(n.replace('#', '')) * 2 ** (1 / 12) : freq(n);
    blip(f, t + i * 0.22, i === 3 ? 0.7 : 0.2, 'square', 0.1);
  });
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('canal-muted', muted ? '1' : '0'); } catch { /* storage unavailable */ }
  if (musicGain) musicGain.gain.value = muted ? 0 : 0.5;
  return muted;
}

// Rising little fanfare for a milestone title
export function fanfare() {
  if (!ctx) return;
  const t = ctx.currentTime;
  ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => blip(freq(n), t + i * 0.09, i === 3 ? 0.4 : 0.12, 'square', 0.09));
}

// Quick "whoosh-ding" for a close call
export function closeCallSound() {
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(1200, t, 0.12, { type: 'square', vol: 0.06, endFreq: 1800 });
}
