// All tuning numbers live here. Tweak these to change how the game feels.

export const CONFIG = {
  // x position of each lane: 0 = canal side (left), 1 = middle, 2 = wall side (right)
  lanes: [-2, 0, 2],

  // Your walking speed (world units per second). It stays constant; the towpath gets busier instead.
  walkSpeed: 9,

  // How snappy lane changes are (higher = faster)
  laneChangeSharpness: 14,

  runner: {
    speed: 4,         // how fast runners jog towards you, on top of your walking speed
    spawnZ: -110,     // how far ahead they appear
    despawnZ: 12,     // removed once they're behind the camera
  },

  spawn: {
    startGap: 1.6,             // seconds between waves at the start
    minGap: 0.6,               // seconds between waves at max busyness
    rampSeconds: 90,           // how long until max busyness
    doubleChanceStart: 0.0,    // chance of two runners side by side at the start
    doubleChanceMax: 0.45,     // ...and at max busyness
    extraGapAfterDouble: 0.35, // breathing room after a two-runner wave
    firstWaveDelay: 1.2,
  },

  // Collision box: how close (front/back and sideways) counts as a hit
  hit: { zRange: 0.7, xRange: 1.0 },

  // Scenery is built from repeating tiles
  tile: { length: 20, count: 8 },

  camera: { fov: 60, x: 0, y: 4.2, z: 7.5, lookY: 1, lookZ: -8 },
};
