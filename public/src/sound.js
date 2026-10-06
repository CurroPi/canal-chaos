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
