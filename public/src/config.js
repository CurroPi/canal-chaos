// All tuning numbers live here. Tweak these to change how the game feels.

export const CONFIG = {
  // x position of each lane: 0 = canal side (left), 1 = middle, 2 = wall side (right).
  // The towpath's width, wall, canal edge and tunnels all follow this spacing (was 2; 1.7 = 15% narrower).
  lanes: [-1.7, 0, 1.7],

  // Your walking speed (world units per second). It stays constant; the towpath gets busier instead.
  walkSpeed: 9,

  // How snappy lane changes are (higher = faster)
  laneChangeSharpness: 14,

  // Everything coming towards you appears far away in the fog, at whatever distance makes it
  // take exactly this many seconds to reach you. Same travel time = nobody walks through anybody.
  travelTime: 12.8,
  despawnZ: 12,
  farZ: -260, // overtaking bikes are cleaned up beyond this

  // Oncoming traffic. speed = how fast they move towards you (on top of your walking),
  // hitZ = collision length, weight = how common, from = seconds into the run before they appear.
  enemies: {
    runner:       { speed: 3.5, hitZ: 0.7, weight: 2.6, from: 0 },
    // instagrammer: { speed: 0, hitZ: 0.5, weight: 1.3, from: 0 }, // paused: design not clear enough yet
    lime:         { speed: 9,   hitZ: 1.0, weight: 1.6, from: 6 },
    pram:         { speed: 1.8, hitZ: 0.9, weight: 0.7, from: 10 },
    dogWalker:    { speed: 2,   hitZ: 0.6, weight: 3.0, from: 12 }, // takes 2 lanes
    runClub:      { speed: 3.5, hitZ: 1.0, weight: 1.4, from: 20 }, // takes 2 lanes
  },

  // Later on, run clubs sometimes come as a convoy of packs in alternating lanes, so you weave
  runClubConvoy: { from: 50, chance: 0.4, packs: 3, gap: 1.1 },

  // Food delivery e-bikes: overtake you from behind, fastest thing on the path
  delivery: {
    from: 35,
    speed: 26,           // their real speed (you walk at 9)
    hitZ: 1.1,
    gapStart: 14,        // seconds between them at the start...
    gapMin: 6,           // ...and at max busyness
    warn: 1.1,           // seconds of warning
    swerveFrom: 60,      // after this many seconds, they may switch lanes at the last moment
    swerveChance: 0.5,
    swerveAt: 0.6,       // ...this many seconds before reaching you
  },

  // Hackney specials: one-off surprises, each appears once per run (then the list reshuffles)
  specials: {
    from: 14,          // seconds before the first one
    gapStart: 14,      // seconds between specials at the start...
    gapMin: 9,         // ...and at max busyness
    kinds: {
      cargoBike: { speed: 3,   hitZ: 1.6 }, // takes 2 lanes
      monstera:  { speed: 1.5, hitZ: 0.8 },
    },
  },

  // The narrowboat café turns up with a coffee to grab: first at `first` points, then the gaps
  // grow (500, 1250, 2250, 3500...), so coffee gets rarer the longer you last
  cafe: { first: 500, gap: 750, growth: 250, speed: 0, hitZ: 2.6, bonusIfFull: 100 },

  // After the first ~100s, things keep heating up: every `every` points walking speed goes up
  // a notch and gaps between people shrink, so even great runs eventually end
  rush: {
    every: 1000,
    speedStep: 0.08,  // +8% walking speed per level...
    maxSpeed: 1.8,    // ...up to +80%
    doubleStep: 0.05, // +5% chance of two-wide waves per level...
    maxDouble: 0.75,  // ...up to 75%
    gapStep: 0.9,     // gaps between arrivals x0.9 per level...
    minGap: 0.35,     // ...but never closer than this (seconds)
    names: ['BRUNCH RUSH', 'RUN CLUB HOUR', 'CAR-FREE DAY', 'BANK HOLIDAY', 'HEATWAVE', 'MARATHON SATURDAY'],
  },

  // Dodge out of someone's way at the last moment for a bonus
  closeCall: { points: 25, window: 0.2, cooldown: 10 }, // window: how last-second the dodge must be (s)

  // People who've passed you are hidden once they get this close to the camera, so they don't block the view
  hideNearCameraZ: 1.8,

  // Lines people say as they come towards you
  bubbles: {
    chance: 0.17,    // share of people who say something
    maxAtOnce: 2,
    sayFrom: -24,    // they speak once they're within this distance...
    sayUntil: -10,   // ...but not when they're already on top of you
    seconds: 2,      // how long a line stays on screen (fade in, hold, fade out)
  },

  officeEvery: 100, // points between sightings of our office

  // The "BY DUDE LONDON" tag on the wall at the start (where along the path, its size and height)
  signature: { z: -4, length: 4.5, height: 2.25, y: 1.7, paint: '0,0,0' }, // paint: '255,255,255' = white, '0,0,0' = black

  // A Hackney title is celebrated every this many points (see src/titles.js)
  titles: { every: 250, seconds: 2.6 },

  playerScale: 0.89, // size of your walker (1 = same as everyone else)

  // Character select preview: where the walker stands and how big
  select: { previewZ: -5, previewScale: 2.2 },

  // Lime riders overtaking you from behind, with a bell and a warning
  overtaking: {
    from: 6,
    speed: 18,          // their real speed (you walk at 9, so they gain 9/s on you)
    hitZ: 1.0,
    gapStart: 6,        // seconds between them at the start...
    gapMin: 2.5,        // ...and at max busyness
    warnStart: 1.3,     // seconds of warning before they reach you...
    warnMin: 0.75,      // ...and at max busyness
    sameLaneAsYou: 0.6, // chance they come for the lane you're in
  },

  // Bridges squeeze the path from the wall side
  bridge: {
    from: 12,
    gapStart: 16,             // seconds between bridges at the start...
    gapMin: 7,                // ...and at max busyness
    hitZ: 3.7,                // bridges are 7 deep
    twoLaneChanceStart: 0.25, // chance a bridge leaves only 1 lane open
    twoLaneChanceMax: 0.6,
  },

  spawn: {
    startGap: 1.1,             // seconds between oncoming waves at the start
    minGap: 0.55,              // seconds between waves at max busyness
    rampSeconds: 100,          // how long until max busyness
    doubleChanceStart: 0.1,    // chance of two side by side at the start
    doubleChanceMax: 0.45,     // ...and at max busyness
    extraGapAfterDouble: 0.35, // breathing room after a two-wide wave
    firstWaveDelay: 0.6,
    prewarmSeconds: 10,        // the path is already busy when you start
  },

  // Fairness rule: never block all 3 lanes at once
  fairness: {
    window: 0.7,       // things arriving within this many seconds of each other count as "at once"
    sameLaneGap: 0.8,  // min seconds between two oncoming things in the same lane
    visibleZ: -75,     // things may overtake each other further away than this (hidden by the fog)
  },

  coffee: {
    start: 1,          // coffees you start with
    max: 2,            // most you can carry
    spillPenalty: 50,  // points lost when you spill
    invulnerable: 1.5, // seconds of safety after a spill
    slowFactor: 0.5,   // you stumble to this fraction of your speed...
    slowRecover: 1.2,  // ...and recover over this many seconds
  },

  // Sideways distance that counts as a hit (half the lane spacing)
  hitX: 0.85,

  // Scenery is built from repeating tiles
  tile: { length: 20, count: 8 },

  camera: { fov: 60, x: 0, y: 4.2, z: 7.5, lookY: 1, lookZ: -8 },
  cameraPortrait: { fov: 52, x: 0, y: 3.3, z: 6.2, lookY: 0.4, lookZ: -9 }, // phones held upright
};
