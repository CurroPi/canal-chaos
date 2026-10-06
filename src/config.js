// All tuning numbers live here. Tweak these to change how the game feels.

export const CONFIG = {
  // x position of each lane: 0 = canal side (left), 1 = middle, 2 = wall side (right)
  lanes: [-2, 0, 2],

  // Your walking speed (world units per second). It stays constant; the towpath gets busier instead.
  walkSpeed: 9,

  // How snappy lane changes are (higher = faster)
  laneChangeSharpness: 14,

  // Where things appear ahead, and when they're cleaned up
  spawnZ: -110,
  despawnZ: 12,

  // Oncoming traffic. speed = how fast they move towards you (on top of your walking),
  // hitZ = collision length, weight = how common, from = seconds into the run before they appear.
  enemies: {
    runner:       { speed: 4,   hitZ: 0.7, weight: 3,   from: 0 },
    // instagrammer: { speed: 0, hitZ: 0.5, weight: 1.3, from: 0 }, // paused: design not clear enough yet
    lime:         { speed: 9,   hitZ: 1.0, weight: 1.6, from: 6 },
    pram:         { speed: 1,   hitZ: 0.9, weight: 1.1, from: 10 },
    dogWalker:    { speed: 1.2, hitZ: 0.6, weight: 1.4, from: 16 }, // takes 2 lanes
  },

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
    prewarmSeconds: 6,         // the path is already busy when you start
  },

  // Fairness rule: never block all 3 lanes at once
  fairness: {
    window: 0.7,       // things arriving within this many seconds of each other count as "at once"
    sameLaneGap: 0.8,  // min seconds between two oncoming things in the same lane
  },

  coffee: {
    spillPenalty: 50,  // points lost when you spill
    invulnerable: 1.5, // seconds of safety after a spill
    slowFactor: 0.5,   // you stumble to this fraction of your speed...
    slowRecover: 1.2,  // ...and recover over this many seconds
  },

  // Sideways distance that counts as a hit
  hitX: 1.0,

  // Scenery is built from repeating tiles
  tile: { length: 20, count: 8 },

  camera: { fov: 60, x: 0, y: 4.2, z: 7.5, lookY: 1, lookZ: -8 },
};
