// Mini-game: NOT UNDER MY SQUAT. Spike squats the flat above an empty shop unit, and
// gentrifiers keep trying to open something artisan underneath. Tap the pavement to drop
// whatever's next out of the window (bucket of water, old telly, microwave, mattress).
// Hits send them running off soaked and knock the GRAND OPENING bar back down.
// Keep the shop from opening until the clock runs out. Cartoon chaos: nobody gets hurt.

import { pickupSound, spillSound, fanfare, crashSound, clackSound, whooshSound } from './sound.js';
import { FONT } from './ads.js';

const W = 200;
const H = 150;
const GROUND = 140;  // where feet stand
const HEAD = 120;    // falling things hit people at this height
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

// The businesses trying to open (parody names, our own signs)
const SHOPS = [
  { sign: 'GIALS', icon: 'loaf', poster: ['YET ANOTHER', 'SOURDOUGH'], board: '#1f3d33', ink: '#f3e6c8', intro: 'A GIALS. The surest sign your rent is about to double.', open: '£7 toast. Your rent just doubled.' },
  { sign: 'GOATLY', icon: 'cup', poster: ['YET ANOTHER', 'COFFEE PLACE'], board: '#f4f1ea', ink: '#1b1b1b', intro: 'Goat milk lattes. Where the launderette used to be.', open: 'Goat milk flat whites, £6.80.<br>The launderette is a memory.' },
  { sign: 'CEREAL THRILLER', icon: 'bowl', poster: ['CEREAL.', 'JUST CEREAL.'], board: '#e8487a', ink: '#fff6a0', intro: '£9 cereal. Next door to the food bank.', open: '£9 for chocolate puffs.<br>The food bank queue can watch.' },
  { sign: 'BRULE', icon: 'ramekin', poster: ['PUDDING FOR', 'LANDLORDS'], board: '#d9a441', ink: '#3a2412', intro: 'A shop that ONLY does creme brulee. For people who own three flats.', open: 'Creme brulee only. £14.<br>Landlords love it.' },
  { sign: 'FUNKY JUICE', icon: 'bottle', poster: ['WINE, BUT', 'CLOUDY'], board: '#6a2c5a', ink: '#ffd6f0', intro: 'Natural wine. It\'s just wine that went off, at £68.', open: 'Cloudy wine, £68 a bottle.<br>The pub it replaced did pints for £3.' },
  { sign: 'DOWNWARD DOG CO', icon: 'dog', poster: ['YOGA.', 'FOR DOGS.'], board: '#9fd8c8', ink: '#1b3a33', intro: 'Dog yoga. Those dogs have more space than my whole flat.', open: 'Dog yoga, £30 a class.<br>The dogs pay less rent than you.' },
  { sign: 'AESNOB', icon: 'soap', poster: ['ONE SOAP.', '£45.'], board: '#2b2b26', ink: '#d8cfb8', intro: 'A whole shop for ONE £45 hand soap.', open: '£45 hand soap.<br>It smells of "displacement".' },
  { sign: 'HOXHO HOUSE', icon: 'rope', poster: ['MEMBERS ONLY.', 'NOT YOU.'], board: '#14233d', ink: '#e8d9a8', intro: 'A members\' club. Members of the landlord class.', open: 'Membership £2,000.<br>Locals can look through the window.' },
  { sign: 'WHOLE PAYCHEQUE', icon: 'avocado', poster: ['ORGANIC.', '£12 AVOCADOS'], board: '#2f5a2a', ink: '#f2ece0', intro: '£12 avocados. On a street where people work three jobs.', open: '£12 avocados.<br>Organic. Ethical. Unaffordable.' },
  { sign: 'FOXDENS', icon: 'house', poster: ['SELLING YOUR', 'STREET BACK'], board: '#2a6a3a', ink: '#ffd23f', intro: 'An ESTATE AGENT. They\'re selling the street back to itself.', open: 'Studio flats from £2,400 a month.<br>"Original damp."' },
];

// Things Spike throws: fall speed (gravity), hit radius, how much they knock the opening back
const ITEMS = {
  water: { g: 420, r: 11, knock: 0.05, weight: 4 },
  microwave: { g: 360, r: 13, knock: 0.08, weight: 2 },
  telly: { g: 300, r: 19, knock: 0.12, weight: 1.6 },
  mattress: { g: 160, r: 24, knock: 0.06, weight: 1.2 },
};
const drawQueue = () => {
  const total = Object.values(ITEMS).reduce((a, b) => a + b.weight, 0);
  let r = Math.random() * total;
  for (const [k, v] of Object.entries(ITEMS)) if ((r -= v.weight) < 0) return k;
  return 'water';
};

// Who turns up: how fast they fit the place out, and how many hits they take
const CREW = {
  fitter: { speed: 36, rate: 1, hp: 1 },
  barista: { speed: 34, rate: 1, hp: 1 },
  hipster: { speed: 30, rate: 1, hp: 1 },
  influencer: { speed: 40, rate: 1.6, hp: 1 },
  agent: { speed: 24, rate: 1.3, hp: 2 },
  // Locals just walking past. Don't drop things on them.
  nan: { speed: 14, local: true },
  kid: { speed: 55, local: true },
  oldboy: { speed: 18, local: true },
};

// What they say as they walk in, so you know who's who
const BUBBLES = {
  fitter: ['RIP OUT THE SOUL', 'PAINT IT GREIGE', 'KEEP THE GRIT. FRAME IT', 'REGENERATION!', 'MORE EDISON BULBS', 'SAVE ONE BRICK. ART.'],
  barista: ['FLAT WHITE: £8', 'CASH? EW.', 'WE LOVE LOCALS!', 'COMMUNITY PRICE: £9', 'ETHICALLY OVERPRICED', 'OAT MILK IS A RIGHT'],
  hipster: ['SO GRITTY. LOVE IT', 'DAD PAID MY DEPOSIT', 'I\'M BASICALLY LOCAL', 'SUCH CHARACTER!', 'I WAS HERE FIRST. 2019', 'I\'M AN ALLY'],
  influencer: ['POVERTY AESTHETIC!', 'SO RAW. SO REAL.', 'SUPPORTING LOCAL!', 'AUTHENTIC HACKNEY!', 'LINK IN BIO', 'MY SAFE SPACE'],
  agent: ['RENT UP 40%', 'VIBRANT AREA!', 'ORIGINAL DAMP', 'UP AND COMING!', 'AFFORDABLE: £3K', 'COSY MEANS TINY', 'NO DSS, NO PETS, NO'],
  party: ['OMG IT\'S OPEN!', 'NEIGHBOURHOOD GEM!', 'SO AUTHENTIC!', 'QUEUE STARTS HERE', 'FINALLY, CULTURE!'],
  nan: ['JUST GETTING BREAD', 'MORNING SPIKE!', '60 YEARS HERE, LOVE'],
  kid: ['WHEEEE!', 'HI SPIKE!'],
  oldboy: ['50 YEARS ON THIS ROAD', 'ALRIGHT SPIKE', 'WAS A PUB, THAT'],
};

const LINES = {
  start: ['They\'re opening something under my squat. Not on my watch.'],
  hit: ['THIS WAS A SQUAT IN \'79!', 'We don\'t want your FLAT WHITES!', 'Oi! That was MY telly!', 'Go back to Shoreditch!',
    'RENT IS THEFT!', 'No sourdough, no masters!', 'This is still CAMDEN!', 'Take your Edison bulbs and GO!',
    'Oh lovely, ANOTHER coffee place. Just what we needed.', 'Supporting local? I AM local!', 'Regeneration! Nice and soggy now.',
    'You love the community? Meet the community: a TELLY.', 'Welcome to the neighbourhood! Here\'s a housewarming microwave.',
    'Authentic Hackney experience, that. You\'re welcome.', 'Vibrant area, innit? VIBRANT.',
    'Social cleansing? Get CLEANSED.', 'Daddy\'s money can\'t buy you a DRY SHIRT!', 'Back to your trust fund!', 'Take your lanyard and LEAVE!'],
  oops: { nan: 'NOT NAN! Sorry, Nan! Aim for the LANYARDS, Spike.', kid: 'Sorry, kid! That was meant for a landlord.', oldboy: 'Oi, he\'s been here 50 years! Sorry, Dave!' },
  miss: ['Missed. Must be all the "vibrancy".', 'Missed. That telly worked, an\' all.', 'Oi, stand STILL.', 'Nearly. NEARLY.'],
  party: ['They\'ve got a DJ. At 11am.', 'Free tasters. Of TOAST.', 'Is that... a ribbon? With GIANT SCISSORS?'],
  close: ['Fairy lights. Gorgeous. I\'m going to be sick.', 'THEY\'RE HANGING THE FAIRY LIGHTS!', 'There\'s a queue already. A QUEUE.', 'They\'re writing the menu on a CHALKBOARD!'],
  agent: ['An ESTATE AGENT. Get the mattress.', 'Is that a FOXDENS clipboard? Have THIS.'],
  influencer: ['Is she… filming it? For CONTENT?', 'She\'s doing a "day in my life". Not today.'],
};

function text(g, str, cx, y, colour, k = 1, shadow = '#1b1b1b') {
  const x0 = Math.round(cx - (str.length * 4 - 1) * k / 2);
  [...str].forEach((ch, i) => {
    const p = FONT[ch] || FONT[' '];
    for (let j = 0; j < 15; j++) {
      if (p[j] !== '1') continue;
      const x = x0 + (i * 4 + (j % 3)) * k;
      const y2 = y + Math.floor(j / 3) * k;
      if (shadow) { g.fillStyle = shadow; g.fillRect(x + 1, y2 + 1, k, k); }
      g.fillStyle = colour; g.fillRect(x, y2, k, k);
    }
  });
}

export function playSquat(card, cfg, onDone) {
  const { seconds = 35, spawnEvery = 1.8, spawnMin = 0.9, workRate = 0.04, cooldown = 0.25 } = cfg;
  card.innerHTML = `
    <div class="pool-head">
      <span class="pool-title">🏚️ NOT UNDER MY SQUAT</span>
      <button class="pool-leave" aria-label="Leave">✕</button>
    </div>
    <div class="pool-stage fight-stage squat-stage">
      <canvas width="${W}" height="${H}"></canvas>
      <div class="pool-result hidden"></div>
    </div>
    <p class="plant-say spike-say"></p>
    <p class="pool-hint">Tap the pavement to drop stuff on them.<br>Don't let the shop open before time's up.</p>
  `;
  const canvas = card.querySelector('canvas');
  const g = canvas.getContext('2d');
  const resultEl = card.querySelector('.pool-result');
  const sayEl = card.querySelector('.spike-say');

  let shop, crew, falling, bits, queue, progress, left, spawnIn, cool, phase, spikeX, throwT, saidAt, flags, elapsed;
  let confetti = [];
  let partyT = 0;
  let running = true;

  function say(line, force = false) {
    if (!force && performance.now() - saidAt < 2200) return;
    sayEl.innerHTML = `<b>SPIKE:</b> ${line}`;
    sayEl.classList.remove('pop');
    void sayEl.offsetWidth;
    sayEl.classList.add('pop');
    saidAt = performance.now();
  }

  function setup() {
    shop = pick(SHOPS);
    crew = [];
    falling = [];
    bits = [];
    queue = [drawQueue(), drawQueue(), drawQueue()];
    progress = 0;
    left = seconds;
    elapsed = 0;
    spawnIn = 0.6;
    cool = 0;
    phase = 'play';
    confetti = [];
    partyT = 0;
    spikeX = 100;
    throwT = 1;
    saidAt = 0;
    flags = {};
    resultEl.classList.add('hidden');
    say(shop.intro, true);
  }

  function spawn() {
    let kind = pick(['fitter', 'fitter', 'barista', 'hipster', 'hipster']);
    if (elapsed > 8 && Math.random() < 0.18) kind = 'influencer';
    if (elapsed > 12 && Math.random() < 0.16 && !crew.some((c) => c.kind === 'agent')) kind = 'agent';
    if (elapsed > 3 && Math.random() < 0.16 && !crew.some((c) => CREW[c.kind].local)) kind = pick(['nan', 'kid', 'oldboy']);
    const fromLeft = Math.random() < 0.5;
    const c = CREW[kind];
    crew.push({
      kind, hp: c.hp, x: fromLeft ? -8 : W + 8, dir: fromLeft ? 1 : -1, target: rand(66, 134),
      state: c.local ? 'pass' : 'walk', speed: c.speed, rate: c.rate, t: Math.random() * 5, wet: 0, flash: 0,
      bubble: pick(BUBBLES[kind]), bubbleT: 2.4,
    });
    if (kind === 'agent') say(pick(LINES.agent), true);
    if (kind === 'influencer') say(pick(LINES.influencer));
  }

  // ---------- Actions ----------
  function drop(x) {
    if (phase !== 'play' || cool > 0) return;
    x = clamp(x, 18, W - 18);
    const kind = queue.shift();
    queue.push(drawQueue());
    falling.push({ kind, x, y: 50, vy: 0, spin: 0 });
    spikeX = x;
    throwT = 0;
    cool = cooldown;
    whooshSound(0.25);
  }

  function land(f) {
    const item = ITEMS[f.kind];
    const near = crew.filter((c) => c.state !== 'flee' && Math.abs(c.x - f.x) < item.r + 3);
    const hits = near.filter((c) => !CREW[c.kind].local);
    for (const c of near.filter((c) => CREW[c.kind].local)) { // oops
      c.state = 'flee'; c.speed *= 2; c.wet = 1; c.flash = 0.3;
      progress = clamp(progress + 0.12);
      say(LINES.oops[c.kind], true);
    }
    for (const c of hits) {
      c.hp--;
      c.flash = 0.3;
      if (c.hp <= 0) { c.state = 'flee'; c.dir = c.x < 100 ? -1 : 1; c.speed = 70; c.wet = 1; }
    }
    if (hits.length) {
      progress = clamp(progress - item.knock * Math.min(2, hits.length));
      clackSound(1);
      if (near.length === hits.length) say(pick(LINES.hit));
    } else if (!near.length) {
      say(pick(LINES.miss));
    }
    if (f.kind === 'water') {
      spillSound();
      for (let i = 0; i < 12; i++) bits.push({ x: f.x, y: HEAD + 4, vx: rand(-40, 40), vy: rand(-60, -10), c: '#7fd0ff', t: 0 });
    } else {
      crashSound();
      const cols = { telly: ['#5a4a3a', '#2a3a4a', '#9aa'], microwave: ['#eee', '#333', '#bbb'], mattress: ['#cfe0ff', '#3a6ad0', '#fff'] }[f.kind];
      for (let i = 0; i < 10; i++) bits.push({ x: f.x, y: GROUND - 4, vx: rand(-50, 50), vy: rand(-70, -20), c: pick(cols), t: 0 });
    }
  }

  // ---------- The game ----------
  function update(dt) {
    elapsed += dt;
    left -= dt;
    cool -= dt;
    throwT += dt;
    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawn();
      spawnIn = Math.max(spawnMin, spawnEvery - elapsed * 0.04) * rand(0.7, 1.2);
    }
    for (const c of crew) {
      c.t += dt;
      c.flash = Math.max(0, c.flash - dt);
      c.wet = Math.max(0, c.wet - dt * 0.4);
      c.bubbleT -= dt;
      if (c.state === 'work' && c.bubbleT < -3 && Math.random() < dt * 0.4) { c.bubble = pick(BUBBLES[c.kind]); c.bubbleT = 2; }
      if (c.state === 'walk') {
        c.x += c.dir * c.speed * dt;
        if ((c.dir > 0 && c.x >= c.target) || (c.dir < 0 && c.x <= c.target)) c.state = 'work';
      } else if (c.state === 'work') {
        progress += workRate * c.rate * dt;
      } else {
        c.x += c.dir * c.speed * dt;
      }
    }
    crew = crew.filter((c) => c.x > -20 && c.x < W + 20);
    for (const f of falling) {
      f.vy += ITEMS[f.kind].g * dt;
      f.y += f.vy * dt;
      f.spin += dt * 6;
      if (f.y >= HEAD && !f.done) { f.done = true; land(f); }
    }
    falling = falling.filter((f) => !f.done);
    if (progress > 0.75 && !flags.close) { flags.close = true; say(pick(LINES.close), true); }
    if (progress < 0.6) flags.close = false;
    if (progress >= 1) lose();
    else if (left <= 0) win();
  }

  // ---------- Endings ----------
  function finish(html, won) {
    phase = 'over';
    resultEl.classList.remove('hidden');
    resultEl.innerHTML = html;
    if (won) {
      fanfare();
      resultEl.querySelector('.pool-continue').addEventListener('click', () => close(true));
    } else {
      crashSound();
      resultEl.querySelector('.pool-again').addEventListener('click', setup);
      resultEl.querySelector('.pool-later').addEventListener('click', () => close(false));
    }
  }
  function win() {
    left = 0;
    say('Still a squat. Still CAMDEN. Kind of.', true);
    finish(`<p class="pool-big win">THE UNIT STAYS EMPTY!</p>
      <p>Just a broken fridge and a<br>community noticeboard. Perfect.</p>
      <p class="squat-twist">…the landlord just listed your squat on Airbunk.<br>"Authentic punk experience, £340/night."</p>
      <button class="pool-continue">Continue</button>`, true);
  }
  // Losing: they throw a GRAND OPENING first (confetti, balloons, a ribbon, a queue), then the verdict
  function lose() {
    progress = 1;
    phase = 'party';
    partyT = 0;
    falling = [];
    fanfare();
    say(pick(LINES.party), true);
    for (const c of crew) if (c.state !== 'flee' && !CREW[c.kind].local) { c.state = 'cheer'; c.bubble = pick(BUBBLES.party); c.bubbleT = rand(0.5, 2.5); }
    for (let i = 0; i < 5; i++) { // the queue arrives
      const kind = pick(['hipster', 'influencer', 'hipster', 'barista']);
      crew.push({ kind, hp: 1, x: W + 10 + i * 14, dir: -1, target: 116 + i * 10, state: 'walk', speed: 45, rate: 0, t: Math.random() * 5,
        wet: 0, flash: 0, bubble: pick(BUBBLES.party), bubbleT: i === 1 ? 2.5 : 0 });
    }
  }
  function verdict() {
    say('That\'s it. I\'m going back to Camden.', true);
    finish(`<p class="pool-big lose">IT'S OPEN: ${shop.sign}</p>
      <p>${shop.open}<br>Spike is moving back to Camden.</p>
      <button class="pool-again">Try again</button><button class="pool-later secondary">Later</button>`, false);
  }
  function close(won) {
    running = false;
    onDone(won);
  }

  // ---------- Input ----------
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    drop(((e.clientX - r.left) / r.width) * W);
  });
  card.querySelector('.pool-leave').addEventListener('click', () => close(false));

  // ---------- Drawing ----------
  function drawBuilding(t) {
    // Sky strip and London brick
    g.fillStyle = '#9fc4dc'; g.fillRect(0, 12, W, 6);
    g.fillStyle = '#7e4636'; g.fillRect(0, 18, W, 110);
    g.fillStyle = '#6c3a2c';
    for (let y = 20; y < 62; y += 4) for (let x = (y / 4) % 2 ? 0 : 5; x < W; x += 10) g.fillRect(x, y, 9, 1);
    // The squat window, half boarded, with Spike's banner under it
    g.fillStyle = '#1b1410'; g.fillRect(14, 22, W - 28, 30);
    g.fillStyle = '#b08a55'; g.fillRect(14, 22, 26, 30); g.fillRect(160, 22, 26, 30);
    g.fillStyle = '#8a6a3e'; g.fillRect(14, 30, 26, 2); g.fillRect(14, 42, 26, 2); g.fillRect(160, 28, 26, 2); g.fillRect(160, 44, 26, 2);
    g.fillStyle = '#d8d0c0'; g.fillRect(12, 52, W - 24, 3); // the ledge
    g.fillStyle = '#f2ece0'; g.fillRect(44, 56, 112, 9);
    text(g, 'THIS IS STILL CAMDEN', 100, 58, '#c0262d', 1, null);
    // Spike: green mohawk, leather jacket, leaning out
    const sx = Math.round(spikeX < 44 ? 44 : spikeX > 156 ? 156 : spikeX);
    const lean = throwT < 0.2 ? 2 : 0;
    g.fillStyle = '#1b1b1b'; g.fillRect(sx - 6, 42 + lean, 12, 10);           // jacket
    g.fillStyle = '#c8c8c8'; g.fillRect(sx - 4, 44 + lean, 1, 1); g.fillRect(sx + 3, 44 + lean, 1, 1); g.fillRect(sx - 4, 47 + lean, 1, 1); // studs
    g.fillStyle = '#f0c8a0'; g.fillRect(sx - 3, 35 + lean, 6, 7);             // head
    g.fillStyle = '#1b1b1b'; g.fillRect(sx - 2, 37 + lean, 1, 1); g.fillRect(sx + 1, 37 + lean, 1, 1);
    g.fillStyle = '#3fe04a';
    if (progress >= 1) { // wilted
      for (let i = 0; i < 4; i++) g.fillRect(sx - 3 + i, 33 + lean, 1, 2), g.fillRect(sx + 1 + i, 34 + lean + i, 1, 2);
    } else for (let i = 0; i < 4; i++) g.fillRect(sx - 2 + i, 28 + lean + (i % 2) * 2 + Math.round(Math.sin(t * 9 + i)), 1, 8 - (i % 2) * 2);
    if (throwT < 0.25) { g.fillStyle = '#1b1b1b'; g.fillRect(sx + 5, 46, 6, 2); g.fillStyle = '#f0c8a0'; g.fillRect(sx + 10, 46, 2, 2); }

    // The shop unit
    g.fillStyle = '#2a2a2a'; g.fillRect(26, 66, 148, 62);
    g.fillStyle = shop.board; g.fillRect(28, 67, 144, 12);
    const shown = Math.ceil(clamp(progress / 0.3) * shop.sign.length);
    if (shown > 0) text(g, shop.sign.slice(0, shown).padEnd(shop.sign.length, ' '), 100, 70, shop.ink, shop.sign.length > 11 ? 1 : 2 - (shop.sign.length > 6 ? 1 : 0), null);
    // Glass and door
    g.fillStyle = '#4a6878'; g.fillRect(30, 81, 140, 45);
    g.fillStyle = '#5b7d8e'; g.fillRect(34, 84, 20, 1); g.fillRect(124, 84, 30, 1);
    g.fillStyle = '#2a2a2a'; g.fillRect(92, 81, 16, 45); g.fillRect(30, 103, 140, 1);
    g.fillStyle = '#3c5a68'; g.fillRect(94, 83, 12, 41);
    // The fit-out showing through the glass as they get going
    if (progress > 0.25) { g.fillStyle = '#c99a5a'; g.fillRect(40, 116, 10, 9); g.fillRect(132, 118, 12, 7); }
    if (progress > 0.4) for (let i = 0; i < 4; i++) { g.fillStyle = '#ffd36a'; g.fillRect(48 + i * 30 + (i > 1 ? 28 : 0), 87, 2, 3); g.fillStyle = '#333'; g.fillRect(48 + i * 30 + (i > 1 ? 28 : 0) + 0.5, 81, 1, 6); }
    if (progress > 0.6) { g.fillStyle = '#3a8a3c'; g.fillRect(62, 112, 6, 8); g.fillRect(150, 110, 6, 10); g.fillStyle = '#b06a3a'; g.fillRect(62, 120, 6, 5); g.fillRect(150, 120, 6, 5); }
    if (progress > 0.75) for (let x = 30; x < 170; x += 5) { g.fillStyle = ['#ff5fa2', '#ffd23f', '#7cff6b', '#3fd3ff'][(x / 5 + Math.floor(t * 4)) % 4]; g.fillRect(x, 80 + Math.round(Math.sin(x / 9) * 1.5), 2, 2); }
    if (progress < 0.6) { // COMING SOON poster, from the very start
      g.fillStyle = '#1b1b1b'; g.fillRect(110, 82, 58, 44);
      g.fillStyle = shop.board; g.fillRect(111, 83, 56, 42);
      g.fillStyle = '#f4f1ea'; g.fillRect(111, 83, 56, 9);
      text(g, 'COMING SOON', 139, 85, '#c0262d', 1, null);
      drawIcon(shop.icon, 139, 94, t);
      text(g, shop.poster[0], 139, 110, shop.ink, 1, null);
      text(g, shop.poster[1], 139, 117, shop.ink, 1, null);
    }
    // Pavement
    g.fillStyle = '#8f8f8a'; g.fillRect(0, 128, W, 22);
    g.fillStyle = '#7d7d78'; for (let x = 0; x < W; x += 20) g.fillRect(x, 128, 1, 22);
    g.fillStyle = '#6a6a66'; g.fillRect(0, 128, W, 1);
  }

  // Little pixel drawings for the COMING SOON posters (about 16x14, top-centre at cx, y)
  function drawIcon(kind, cx, y, t) {
    const r = (c, x, yy, w, h) => { g.fillStyle = c; g.fillRect(cx + x, y + yy, w, h); };
    const steam = Math.floor(t * 3) % 2;
    switch (kind) {
      case 'loaf':
        r('#5a3418', -8, 5, 16, 8); r('#c98a44', -7, 4, 14, 8); r('#e0a860', -5, 3, 10, 2);
        r('#f3dcae', -4, 6, 2, 1); r('#f3dcae', -1, 7, 2, 1); r('#f3dcae', 2, 6, 2, 1); break;
      case 'cup':
        r('#ffffff', -5, 5, 9, 9); r('#ffffff', 4, 7, 3, 1); r('#ffffff', 6, 7, 1, 4); r('#ffffff', 4, 10, 3, 1);
        r('#7a4a2a', -4, 5, 7, 2); r('#f3e6c8', -2, 5, 3, 1);
        r('#d8d8d8', -1 + steam, 0, 1, 3); r('#d8d8d8', 2 - steam, 1, 1, 3); break;
      case 'bowl':
        r('#ffffff', -8, 7, 16, 3); r('#ffffff', -6, 10, 12, 2); r('#ffffff', -4, 12, 8, 1);
        r('#ffd23f', -6, 5, 2, 2); r('#ff5fa2', -3, 4, 2, 2); r('#3fd3ff', 0, 5, 2, 2); r('#7cff6b', 3, 4, 2, 2); r('#ff7a1a', 5, 5, 2, 2); break;
      case 'ramekin':
        r('#ffffff', -6, 6, 12, 7); r('#d9d9d9', -6, 8, 12, 1); r('#d9d9d9', -6, 11, 12, 1); r('#c07a2a', -6, 5, 12, 2);
        r('#ff7a1a', 6, 1 + steam, 2, 3); r('#ffd23f', 6, 2 + steam, 1, 1); r('#555', 7, 4, 3, 2); break;
      case 'bottle':
        r('#2f4a2a', -2, 0, 3, 4); r('#2f4a2a', -4, 4, 7, 10); r('#c9b98a', -3, 7, 5, 6); r('#f4f1ea', -3, 8, 5, 3);
        r('#ffffff', 5, 6, 4, 4); r('#c9b98a', 5, 8, 4, 2); r('#ffffff', 6, 10, 2, 3); r('#ffffff', 5, 13, 4, 1); break;
      case 'dog': // downward dog on a yoga mat
        r('#ff5fa2', -8, 13, 16, 1);
        r('#c98a44', -6, 8, 2, 5); r('#c98a44', 4, 8, 2, 5); r('#c98a44', -4, 5, 3, 3); r('#c98a44', 1, 5, 3, 3); r('#c98a44', -2, 4, 4, 2);
        r('#c98a44', 5, 9, 3, 3); r('#5a3418', 7, 10, 1, 1); r('#5a3418', 5, 9, 1, 2); r('#c98a44', -7, 4, 1, 2); break;
      case 'soap':
        r('#cfcfcf', -1, 0, 2, 3); r('#cfcfcf', 1, 1, 3, 1); r('#1b1b1b', -2, 3, 4, 2);
        r('#9a5a1a', -4, 5, 8, 9); r('#f4f1ea', -3, 8, 6, 3); r('#9a5a1a', -2, 9, 4, 1); break;
      case 'rope':
        r('#d9a441', -8, 2, 2, 12); r('#d9a441', 6, 2, 2, 12); r('#d9a441', -9, 13, 4, 1); r('#d9a441', 5, 13, 4, 1);
        r('#c0262d', -6, 4, 2, 1); r('#c0262d', -4, 5, 2, 1); r('#c0262d', -2, 6, 4, 1); r('#c0262d', 2, 5, 2, 1); r('#c0262d', 4, 4, 2, 1); break;
      case 'avocado':
        r('#2f5a1a', -5, 1, 10, 13); r('#b8d86a', -4, 2, 8, 11); r('#7a4a2a', -2, 6, 4, 4);
        r('#ffffff', 4, 9, 8, 5); r('#c0262d', 5, 10, 1, 1); r('#c0262d', 7, 10, 1, 3); r('#c0262d', 9, 10, 2, 1); r('#c0262d', 9, 12, 2, 1); break;
      case 'house':
        r('#c0262d', -6, 4, 12, 1); r('#c0262d', -4, 2, 8, 2); r('#c0262d', -2, 0, 4, 2);
        r('#f4f1ea', -5, 5, 10, 9); r('#4a6878', -3, 7, 2, 2); r('#4a6878', 1, 7, 2, 2); r('#5a3418', -1, 10, 2, 4);
        r('#ffd23f', 6, 6, 6, 5); r('#1b1b1b', 8, 7, 2, 1); r('#1b1b1b', 8, 8, 1, 2); r('#1b1b1b', 8, 9, 3, 1); r('#5a3418', 8, 11, 1, 3); break;
    }
  }

  // The locals: Nan with her tartan trolley, a kid on a scooter, the old boy with his pint
  function drawLocal(c) {
    const x = Math.round(c.x);
    const y = GROUND;
    const walk = Math.round(Math.sin(c.t * 10) * 1.5);
    const back = -c.dir;
    if (c.kind === 'kid') {
      g.fillStyle = '#c0c0c0'; g.fillRect(x - 5, y - 1, 10, 1); g.fillRect(x + c.dir * 4, y - 10, 1, 9);
      g.fillStyle = '#1b1b1b'; g.fillRect(x - 5, y, 2, 1); g.fillRect(x + 3, y, 2, 1);
      g.fillStyle = '#2a3550'; g.fillRect(x - 1, y - 6, 1, 5); g.fillRect(x + 1, y - 6, 1, 5);
      g.fillStyle = '#3fd3ff'; g.fillRect(x - 2, y - 11, 5, 5);
      g.fillStyle = '#c08a60'; g.fillRect(x - 1, y - 15, 4, 4);
      g.fillStyle = '#ff3b3b'; g.fillRect(x - 2, y - 16, 5, 2);
      return;
    }
    g.fillStyle = '#2a2a2a'; g.fillRect(x - 2 + walk, y - 6, 1, 6); g.fillRect(x + 1 - walk, y - 6, 1, 6);
    if (c.kind === 'nan') {
      g.fillStyle = '#8a4a9a'; g.fillRect(x - 3, y - 15, 7, 10);
      g.fillStyle = '#f0c8a0'; g.fillRect(x - 2, y - 19, 5, 4);
      g.fillStyle = '#e8e8e8'; g.fillRect(x - 3, y - 21, 7, 3);
      g.fillStyle = '#c0262d'; g.fillRect(x + back * 7 - 2, y - 11, 5, 8);   // tartan trolley
      g.fillStyle = '#1f3d33'; g.fillRect(x + back * 7 - 2, y - 8, 5, 1); g.fillRect(x + back * 7, y - 11, 1, 8);
      g.fillStyle = '#1b1b1b'; g.fillRect(x + back * 7 - 1, y - 2, 2, 2); g.fillRect(x + back * 3, y - 12, back * 3 || 1, 1);
    } else { // the old boy: boiler suit, grey hair, a pint of Guinness
      g.fillStyle = '#5a6a7a'; g.fillRect(x - 3, y - 14, 7, 8);
      g.fillStyle = '#e8c8a8'; g.fillRect(x - 2, y - 19, 5, 5);
      g.fillStyle = '#cfcfcf'; g.fillRect(x - 3, y - 21, 7, 2); g.fillRect(x - 3, y - 19, 1, 2);
      g.fillStyle = '#1a120d'; g.fillRect(x + c.dir * 5 - 1, y - 14, 3, 5);
      g.fillStyle = '#f3e6c8'; g.fillRect(x + c.dir * 5 - 1, y - 15, 3, 1);
    }
  }

  // Speech bubble over someone's head (white for locals, angry yellow for gentrifiers)
  function drawBubble(c) {
    if (c.bubbleT <= 0 || c.state === 'flee') return;
    const local = CREW[c.kind].local;
    const w = c.bubble.length * 4 + 5;
    const bx = Math.round(clamp(c.x - w / 2, 2, W - w - 2));
    const by = GROUND - 34;
    g.fillStyle = '#1b1b1b'; g.fillRect(bx - 1, by - 1, w + 2, 11);
    g.fillStyle = local ? '#ffffff' : '#fff1a8'; g.fillRect(bx, by, w, 9);
    g.fillRect(Math.round(c.x), by + 9, 2, 3);
    text(g, c.bubble, bx + w / 2, by + 2, local ? '#1f6a2a' : '#c0262d', 1, null);
  }

  function drawPerson(c, t) {
    if (CREW[c.kind].local) { drawLocal(c); return; }
    const x = Math.round(c.x);
    const cheering = c.state === 'cheer';
    const y = GROUND - (cheering ? Math.abs(Math.round(Math.sin(c.t * 9) * 3)) : 0);
    const walk = c.state !== 'work' ? Math.round(Math.sin(c.t * (c.state === 'flee' ? 22 : 12)) * 1.5) : 0;
    const body = { fitter: '#ff8a1a', barista: '#1b1b1b', hipster: '#c0262d', influencer: '#ff8fc8', agent: '#1f2f5a' }[c.kind];
    // legs
    g.fillStyle = c.kind === 'agent' ? '#1f2f5a' : '#2a3550';
    g.fillRect(x - 2 + walk, y - 6, 1, 6); g.fillRect(x + 1 - walk, y - 6, 1, 6);
    // body and head
    g.fillStyle = c.flash > 0 && Math.floor(c.flash * 20) % 2 ? '#ffffff' : body;
    g.fillRect(x - 3, y - 14, 7, 8);
    if (c.kind === 'hipster') { g.fillStyle = '#7a1a1e'; g.fillRect(x - 3, y - 11, 7, 1); g.fillRect(x, y - 14, 1, 8); }
    if (c.kind === 'agent') { g.fillStyle = '#ffffff'; g.fillRect(x, y - 14, 1, 4); g.fillStyle = '#c0262d'; g.fillRect(x, y - 12, 1, 2); }
    if (c.kind === 'barista') { g.fillStyle = '#6a4a2a'; g.fillRect(x - 2, y - 12, 5, 6); }
    g.fillStyle = '#f0c8a0'; g.fillRect(x - 2, y - 19, 5, 5);
    // hats, hair and props
    if (c.kind === 'fitter') { g.fillStyle = '#ffd23f'; g.fillRect(x - 3, y - 21, 7, 2); }
    if (c.kind === 'barista') { g.fillStyle = '#3a6a5a'; g.fillRect(x - 2, y - 21, 5, 3); }
    if (c.kind === 'hipster') { g.fillStyle = '#5a3a1e'; g.fillRect(x - 2, y - 16, 5, 2); g.fillRect(x, y - 22, 2, 2); }
    if (c.kind === 'influencer') { g.fillStyle = '#f2d16a'; g.fillRect(x - 3, y - 20, 7, 2); g.fillRect(x - 3, y - 18, 1, 5); }
    if (c.kind === 'agent') { g.fillStyle = '#3a2a1e'; g.fillRect(x - 2, y - 20, 5, 1); }
    const arm = c.dir > 0 ? 1 : -1;
    if (cheering) { // arms up, whooping
      g.fillStyle = body; g.fillRect(x - 4, y - 21, 1, 6); g.fillRect(x + 4, y - 21, 1, 6);
    } else if (c.state === 'flee') { // arms up, dripping
      g.fillStyle = body; g.fillRect(x - 4, y - 20, 1, 6); g.fillRect(x + 4, y - 20, 1, 6);
      if (c.wet > 0) { g.fillStyle = '#7fd0ff'; g.fillRect(x - 3, y - 4 + ((c.t * 40) % 6), 1, 2); g.fillRect(x + 3, y - 8 + ((c.t * 40 + 3) % 8), 1, 2); }
    } else if (c.state === 'walk') {
      const prop = { fitter: ['#c99a5a', 6, 5], barista: ['#c8ccd0', 6, 5], hipster: ['#ffd36a', 3, 4], influencer: ['#fff', 2, 4], agent: ['#f4f1ea', 4, 5] }[c.kind];
      g.fillStyle = prop[0]; g.fillRect(x + arm * 4 - (arm < 0 ? prop[1] - 1 : 0), y - 13, prop[1], prop[2]);
    } else { // working: hammering, polishing, filming
      const swing = Math.round(Math.sin(c.t * 10) * 2);
      if (c.kind === 'influencer') {
        g.fillStyle = '#fff'; g.fillRect(x + 3, y - 22, 2, 4);
        if (Math.floor(c.t * 3) % 2) { g.fillStyle = '#fff6a0'; g.fillRect(x + 4, y - 24, 1, 1); }
      } else if (c.kind === 'agent') {
        g.fillStyle = '#f4f1ea'; g.fillRect(x + 4, y - 14, 4, 5);
        g.fillStyle = '#c0262d'; g.fillRect(x + 5, y - 13, 2, 1);
      } else {
        g.fillStyle = '#6a6a6a'; g.fillRect(x + 4, y - 17 + swing, 1, 5); g.fillRect(x + 3, y - 18 + swing, 3, 2);
      }
    }
    if (c.kind === 'agent' && c.hp > 1 && c.state !== 'flee') { g.fillStyle = '#1b1b1b'; g.fillRect(x + 6, y - 22, 6, 4); g.fillStyle = '#fff'; g.fillRect(x + 7, y - 21, 4, 2); }
  }

  function drawItem(kind, x, y, spin, small = false) {
    const k = small ? 0.6 : 1;
    g.save();
    g.translate(Math.round(x), Math.round(y));
    g.scale(k, k);
    if (!small) g.rotate(kind === 'mattress' ? Math.sin(spin) * 0.2 : spin * 0.3);
    if (kind === 'water') {
      g.fillStyle = '#a0a8b0'; g.fillRect(-4, -3, 8, 6); g.fillStyle = '#7fd0ff'; g.fillRect(-4, -5, 8, 2);
      if (!small) { g.fillRect(-2, -8, 1, 2); g.fillRect(2, -9, 1, 2); }
    } else if (kind === 'telly') {
      g.fillStyle = '#5a4a3a'; g.fillRect(-7, -6, 14, 11); g.fillStyle = '#4a6a7a'; g.fillRect(-5, -4, 8, 7);
      g.fillStyle = '#c8c8c8'; g.fillRect(4, -3, 2, 1); g.fillRect(4, 0, 2, 1);
      g.fillStyle = '#333'; g.fillRect(-3, -9, 1, 3); g.fillRect(2, -9, 1, 3);
    } else if (kind === 'microwave') {
      g.fillStyle = '#eeeeea'; g.fillRect(-7, -4, 14, 9); g.fillStyle = '#333'; g.fillRect(-5, -2, 8, 5); g.fillStyle = '#7cff6b'; g.fillRect(4, -2, 2, 1);
    } else {
      g.fillStyle = '#cfe0ff'; g.fillRect(-13, -3, 26, 6);
      g.fillStyle = '#3a6ad0'; for (let i = -12; i < 13; i += 4) g.fillRect(i, -3, 1, 6);
    }
    g.restore();
  }

  // The GRAND OPENING: balloons, a ribbon and giant scissors, a flashing banner, confetti
  function drawParty(t, dt) {
    for (const [bx, cols] of [[34, ['#ff5fa2', '#ffd23f', '#3fd3ff']], [166, ['#7cff6b', '#ff5fa2', '#ffd23f']]]) {
      cols.forEach((c, i) => {
        const x = bx + (i - 1) * 5;
        const y = 70 + i % 2 * 4 + Math.round(Math.sin(t * 3 + i) * 1.5);
        g.fillStyle = '#d8d8d8'; g.fillRect(x, y + 6, 1, 14);
        g.fillStyle = c; g.fillRect(x - 2, y, 5, 6); g.fillRect(x - 1, y - 1, 3, 1);
      });
    }
    // Ribbon across the door, cut after a second
    const cut = partyT > 1.2 || phase === 'over';
    g.fillStyle = '#e8203a';
    if (!cut) {
      g.fillRect(86, 108, 28, 2);
      g.fillStyle = '#c8c8c8'; // giant scissors closing in
      const open = Math.round(Math.abs(Math.sin(partyT * 6)) * 3);
      g.fillRect(96, 104 - open, 10, 1); g.fillRect(96, 112 + open, 10, 1);
      g.fillStyle = '#ff3b3b'; g.fillRect(106, 103 - open, 3, 3); g.fillRect(106, 112 + open, 3, 3);
    } else {
      g.fillRect(86, 108, 6, 2); g.fillRect(91, 109, 2, 8);
      g.fillRect(108, 108, 6, 2); g.fillRect(107, 109, 2, 8);
    }
    // Banner
    const flash = Math.floor(t * 4) % 2;
    g.fillStyle = '#1b1b1b'; g.fillRect(44, 89, 112, 11);
    g.fillStyle = flash ? '#ffd23f' : '#ff5fa2'; g.fillRect(45, 90, 110, 9);
    text(g, 'GRAND OPENING!', 100, 92, flash ? '#c0262d' : '#ffffff', 1, null);
    // Confetti
    if (confetti.length < 160) for (let i = 0; i < 4; i++) confetti.push({ x: rand(0, W), y: rand(-10, 12), vy: rand(18, 40), ph: rand(0, 6), c: pick(['#ff5fa2', '#ffd23f', '#7cff6b', '#3fd3ff', '#ff7a1a', '#ffffff']) });
    for (const p of confetti) {
      p.y += p.vy * dt; p.ph += dt * 5;
      if (p.y > GROUND + 6) { p.y = rand(-10, 12); p.x = rand(0, W); }
    }
  }
  function drawConfetti() {
    for (const p of confetti) { g.fillStyle = p.c; g.fillRect(Math.round(p.x + Math.sin(p.ph) * 2), Math.round(p.y), Math.sin(p.ph) > 0 ? 2 : 1, 1); }
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    if (!running || !canvas.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    if (phase === 'play') update(dt);
    if (phase === 'party') {
      partyT += dt;
      for (const c of crew) {
        c.t += dt; c.bubbleT -= dt;
        if (c.state === 'walk') { c.x += c.dir * c.speed * dt; if (c.x <= c.target) c.state = 'cheer'; }
        else if (c.state === 'flee' || c.state === 'pass') c.x += c.dir * c.speed * dt;
      }
      if (partyT > 3.8) verdict();
    }

    drawBuilding(t);
    if (progress >= 1) drawParty(t, dt);
    for (const c of crew) drawPerson(c, t);
    for (const c of crew) drawBubble(c);
    for (const f of falling) drawItem(f.kind, f.x, f.y, f.spin);
    bits = bits.filter((b) => (b.t += dt) < 0.9);
    for (const b of bits) {
      b.vy += 220 * dt; b.x += b.vx * dt; b.y = Math.min(GROUND, b.y + b.vy * dt);
      g.fillStyle = b.c; g.fillRect(Math.round(b.x), Math.round(b.y), 2, 2);
    }

    if (progress >= 1) drawConfetti();
    // Top bar: time left, what's next, and the GRAND OPENING bar
    g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, W, 12);
    text(g, `0:${String(Math.max(0, Math.ceil(left))).padStart(2, '0')}`, 14, 4, left < 10 ? '#ff5a5a' : '#fffaf0', 1, null);
    text(g, 'NEXT', 40, 4, '#8a8a8a', 1, null);
    queue.forEach((k, i) => drawItem(k, 60 + i * 14, 6, 0, true));
    g.fillStyle = '#3a3a3a'; g.fillRect(108, 2, 88, 8);
    g.fillStyle = progress > 0.75 ? (Math.floor(t * 6) % 2 ? '#ff3b3b' : '#ffd23f') : '#ff8a1a';
    g.fillRect(108, 2, Math.round(88 * clamp(progress)), 8);
    text(g, 'OPENING', 152, 4, '#fffaf0', 1, '#1b1b1b');

    requestAnimationFrame(frame);
  }
  setup();
  requestAnimationFrame(frame);
  // Testing helpers (?debug only)
  return {
    drop(x) { cool = 0; drop(x); },
    advance(sec) { for (let i = 0; i < sec * 20 && phase === 'play'; i++) update(0.05); },
    cheat() { left = 0.01; progress = 0; },
    party() { progress = 1; lose(); },
    get state() { return { left: +left.toFixed(1), progress: +progress.toFixed(2), crew: crew.map((c) => [c.kind, c.state, Math.round(c.x)]), shop: shop.sign }; },
  };
}
