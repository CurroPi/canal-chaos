// Everything that can get in your way: how it looks, moves, and how it kills you.
import { CONFIG } from './config.js';
import {
  makeRunner, makeLimeRider, makeInstagrammer, makePramPusher, makeDogWalker,
  makeCargoBike, makeMonsteraCarrier, makeCafeQueue, makeCoffeePickup,
  animateWalk, animateLime, animatePose, animateDogWalker, animateCargoBike, animateCafeQueue, animatePickup,
} from './models.js';
import { makeBridge } from './world.js';

const X = CONFIG.lanes;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function at(model, x) {
  model.group.position.x = x;
  return model;
}

export const ENEMIES = {
  runner: {
    width: 1,
    build: ([l]) => at(makeRunner(), X[l]),
    animate: (m, t) => animateWalk(m, t + m.phase, 13),
    deaths: [
      'Flattened by a jogger. Strava will remember.',
      'Run over mid-tempo. They didn\'t even pause their watch.',
      'Collided with a marathon trainee. It\'s their taper week.',
      'Jogged into oblivion. They said "sorry" without stopping.',
    ],
  },

  lime: {
    width: 1,
    build: ([l]) => at(makeLimeRider(), X[l]),
    animate: (m, t) => animateLime(m, t + m.phase),
    deaths: [
      'Lime\'d. They were doing 15mph while checking Google Maps.',
      'Hit by a Lime bike. It\'ll be in the canal by 6pm.',
      'Run over by someone who "hasn\'t really cycled since uni".',
      'Mown down by a Lime. Their trip cost £4.20. Yours cost everything.',
    ],
    behindDeaths: [
      '"ON YOUR LEFT!" You went left.',
      'The bell rang. Twice. You chose violence.',
      'Overtaken, literally, through you.',
    ],
  },

  instagrammer: {
    width: 1,
    build: ([l]) => at(makeInstagrammer(), X[l]),
    animate: (m, t) => animatePose(m, t + m.phase),
    deaths: [
      'Photobombed an influencer. You\'re in 40 stories now.',
      'Walked into a selfie. "Can you NOT?"',
      'Ruined a golden-hour shot. Unforgivable.',
    ],
  },

  pram: {
    width: 1,
    build: ([l]) => at(makePramPusher(), X[l]),
    animate: (m, t) => animateWalk(m, t + m.phase, 6),
    deaths: [
      'Rammed by a £1,400 pram. It has better suspension than a Range Rover.',
      'Flattened by a Bugaboo. The baby didn\'t even wake up.',
      'Ran into a pram. You\'ve been reported to the NCT WhatsApp.',
    ],
  },

  dogWalker: {
    width: 2,
    build: (lanes) => {
      const ownerLane = pick(lanes);
      const dogLane = lanes.find((l) => l !== ownerLane);
      return at(makeDogWalker(X[dogLane] - X[ownerLane]), X[ownerLane]);
    },
    animate: (m, t) => animateDogWalker(m, t + m.phase),
    deaths: [
      'Clotheslined by an extendable dog lead. The dog is fine.',
      'Tripped over a lead. The owner didn\'t look up from their phone.',
      'Taken out by a sausage dog called Biscuit. You\'ll never forget his name.',
    ],
  },

  // ---------- Hackney specials ----------
  cargoBike: {
    width: 2,
    build: (lanes) => at(makeCargoBike(), (X[lanes[0]] + X[lanes[1]]) / 2),
    animate: (m, t) => animateCargoBike(m, t + m.phase),
    deaths: [
      'Run over by a cargo bike carrying Otto, Wren and a sourdough loaf.',
      'Flattened by a cargo bike. The toddlers waved.',
      'Hit by £6,000 of Dutch cargo bike. The sourdough survived.',
    ],
  },

  monstera: {
    width: 1,
    build: ([l]) => at(makeMonsteraCarrier(), X[l]),
    animate: (m, t) => animateWalk(m, t + m.phase, 6),
    deaths: [
      'Slapped by a Monstera deliciosa. It was £85 on Marketplace.',
      'Taken out by a houseplant. Its name is Gerald.',
      'Walked into a Monstera. It has more Instagram followers than you.',
    ],
  },

  cafe: {
    width: 1,
    build: ([l]) => at(makeCafeQueue(X[l]), X[l]),
    animate: (m, t) => animateCafeQueue(m, t + m.phase),
    deaths: [
      'Walked into the cinnamon bun queue. Everyone tutted in unison.',
      'Cut the narrowboat café queue. You\'re trending on the Hackney Facebook group.',
      'Collided with a queue for £6 cinnamon buns. Worth it, apparently.',
    ],
  },

  // Not an enemy: walk into it to get your coffee back
  coffee: {
    width: 1,
    pickup: true,
    build: ([l]) => at(makeCoffeePickup(), X[l]),
    animate: (m, t) => animatePickup(m, t + m.phase),
  },

  bridge: {
    build: (lanes) => makeBridge(lanes, X),
    animate: () => {},
    deaths: [
      'Walked into a bridge. It\'s been there since 1820.',
      'Head-butted a Grade II listed bridge.',
      'Hit a bridge. There was literally one way through.',
    ],
  },
};
