import { boss, weak, armor, hull, atk, minion, phase } from './bosses-kit.js';

// The boss of world 21, Golden Isle. Like the other side-world bosses it never charges: it sways,
// hovers, then circles, resting high enough that every part stays below the HUD.

// The Ten-Crowned King, a colossal ten-headed king seen front-on on a flying throne: the great crowned
// head at the centre, one head above it and four fanned out to each side, twenty arms fanned behind him
// gripping swords, maces, bows, axes and spears (two armoured fans, one each side), and a gilded
// breastplate over his heart. The heads are weak and grow back (the kit's regrow) in every phase but
// the last; the breastplate is armour and cracks only when all ten heads are down at once (no weak
// point left: boss-phase.js). The heart sits wholly behind the plate, a bare hull that fires; the last
// phase opens it, and there no head grows back. The great head and the one above it are shielded from
// below by the plate: the world's returning arrows reach them from above. Its minions are masked
// soldiers (gunners) and golden deer (divers), and a carrier chariot listed first in every phase.

// Where it rests and how big it is.
export const CROWNS_Y = 370;
export const CROWNS_SIZE = Object.freeze({ w: 1100, h: 440 });

// The hit points of each part (the nine lesser heads share one value, as do the two arm fans).
export const CROWNS_HP = Object.freeze({ great: 18, head: 8, arms: 30, breast: 10, heart: 30 });

// Seconds after which a cut head grows back, in the phases that let heads regrow.
export const CROWNS_REGROW = 20;

// The hp fraction at which each phase ends, and each phase's pace.
export const CROWNS_UNTIL = Object.freeze([0.65, 0.45, 0]);
export const CROWNS_RATE = Object.freeze([1.0, 1.2, 1.4]);

// Seconds between the attacks of each phase, in the order they are listed below.
export const CROWNS_EVERY = Object.freeze([
  Object.freeze([1.8, 6.8, 7.2, 3.9]),
  Object.freeze([1.7, 2.8, 2.9, 3.2]),
  Object.freeze([1.5, 3.8, 4.2, 3.0, 6.0]),
]);

// Bullet counts and spreads of the attacks.
export const CROWNS_FAN = Object.freeze({ count: 5, spread: 0.7 });
export const CROWNS_RAIN = Object.freeze([Object.freeze({ count: 5, spread: 320 }), Object.freeze({ count: 6, spread: 360 })]);
export const CROWNS_SPIRAL_COUNT = 14;
export const CROWNS_RING_COUNT = 18;

// The minions: a carrier chariot every phase, golden deer from one arm fan and masked soldiers from the other.
export const CROWNS_CARRIER_EVERY = 4.5;
export const CROWNS_DEER = Object.freeze({ count: 3, every: 5.5 });
export const CROWNS_SOLDIERS = Object.freeze({ count: 2, every: 6.5 });

const [U, R, E, H, G] = [CROWNS_UNTIL, CROWNS_RATE, CROWNS_EVERY, CROWNS_HP, CROWNS_REGROW];
const minions = () => [
  minion('carrier', 1, CROWNS_CARRIER_EVERY, 'breast'),
  minion('diver', CROWNS_DEER.count, CROWNS_DEER.every, 'armsL'),
  minion('gunner', CROWNS_SOLDIERS.count, CROWNS_SOLDIERS.every, 'armsR'),
];
// A side head: weak, and grows back.
const side = (id, dx, dy) => weak(id, dx, dy, 80, 70, H.head, G);

const crowns = boss('crowns', 'The Ten-Crowned King', CROWNS_Y, { ...CROWNS_SIZE }, [
  weak('headT', 0, -185, 80, 60, H.head, G), // the head above the great one
  weak('head', 0, -110, 120, 90, H.great, G), // the great crowned head
  side('headL1', -125, -140),
  side('headR1', 125, -140),
  side('headL2', -215, -120),
  side('headR2', 215, -120),
  side('headL3', -300, -90),
  side('headR3', 300, -90),
  side('headL4', -380, -50),
  side('headR4', 380, -50),
  armor('armsL', -480, 40, 120, 200, H.arms), // ten arms fanned out on each side, weapons in every hand
  armor('armsR', 480, 40, 120, 200, H.arms),
  armor('breast', 0, 60, 200, 130, H.breast), // the gilded breastplate
  hull('heart', -50, 50, 70, 70, H.heart), // wholly behind the plate, on his left
], [
  // The court of war: the great head marks the ship, the arms swing fans, the head above rains arrows.
  phase(U[0], 'sway', [
    atk('aimed', E[0][0], 'head'),
    atk('fan', E[0][1], 'armsL', { ...CROWNS_FAN }),
    atk('fan', E[0][2], 'armsR', { ...CROWNS_FAN }),
    atk('rain', E[0][3], 'headT', { ...CROWNS_RAIN[0] }),
  ], { rate: R[0], minions: minions(), regrow: true }),
  // The heads grow back angrier: thrown blades, a spiral from the heart, heavier rain.
  phase(U[1], 'hover', [
    atk('aimed', E[1][0], 'head'),
    atk('shuriken', E[1][1], 'armsL'),
    atk('spiral', E[1][2], 'heart', { count: CROWNS_SPIRAL_COUNT }),
    atk('rain', E[1][3], 'headT', { ...CROWNS_RAIN[1] }),
  ], { rate: R[1], minions: minions(), regrow: true }),
  // The heart is bare: no head grows back, and it lances and rings.
  phase(U[2], 'orbit', [
    atk('aimed', E[2][0], 'head'),
    atk('fan', E[2][1], 'armsL', { ...CROWNS_FAN }),
    atk('fan', E[2][2], 'armsR', { ...CROWNS_FAN }),
    atk('ring', E[2][3], 'heart', { count: CROWNS_RING_COUNT }),
    atk('laser', E[2][4], 'heart'),
  ], { rate: R[2], minions: minions(), open: ['heart'] }),
]);

export const BOSSES8 = [crowns];
