// The Ten-Crowned King's life (World 21, Golden Isle; see crowns.js and bosses/life.js). His heads sway on their necks like a hydra's,
// each out of step, bending from where its neck leaves the mantle (the head above the great one from its long neck's base, behind
// the great head); the great head rears back and coils before it marks the ship, then lunges; a struck head snaps back and wobbles.
// His arm fans swing from the shoulders, where their upper arms start (so the elbows stay joined), and wind up before their fans.
// His body breathes slowly about the chariot's seat. Every limit keeps each part within LIFE_MAX_PX of its box (life-bound.test.js).
import { PART, HEADS, neckOf, neckBase } from './crowns-kit.js';
import { edgeUnder } from './crowns-robe.js';
import { SHOULDER } from './crowns-arms.js';

export const CROWNS_SEAT = 182; // y of the chariot's top rail, where he sits: the line he breathes about
export const CROWNS_BREATH = 0.008; // how much he swells on a breath, of his height above the seat

// turn (rad) and stretch (a fraction) at most, and how much of the turn each sways through at rest; coil: which way it winds up.
export const CROWNS_LIFE = Object.freeze({
  headT: Object.freeze({ turn: 0.08, stretch: 0.04, sway: 0.6, coil: 1 }), // a long neck: a small turn moves it far
  head: Object.freeze({ turn: 0.13, stretch: 0.1, sway: 0.4, coil: 1 }),
  side: Object.freeze({ turn: 0.17, stretch: 0.11, sway: 0.55 }), // the eight lesser heads, coiling outward
  arms: Object.freeze({ turn: 0.026, stretch: 0.01, sway: 0.5, coil: 1 }), // the fans sit far out from the shoulder; coil raises them
});

// Where a head bends from: where its neck leaves the mantle; the head above the great one from its neck's base.
const pivotOf = (id) => (id === 'headT' ? [0, neckBase(id)] : [neckOf(id)[0], neckOf(id)[1] + edgeUnder(id)]);
const headLife = (id) => {
  const spec = CROWNS_LIFE[id] ?? { ...CROWNS_LIFE.side, coil: Math.sign(PART[id].x) };
  return { ...spec, pivot: pivotOf(id) };
};

export const life = {
  parts: {
    ...Object.fromEntries(HEADS.map((id) => [id, headLife(id)])),
    arms: { ...CROWNS_LIFE.arms, pivot: [SHOULDER[0] + PART.armsL.x, SHOULDER[1] + PART.armsL.y] }, // the left; the right mirrored
  },
  breath: { y: CROWNS_SEAT, amp: CROWNS_BREATH },
};
