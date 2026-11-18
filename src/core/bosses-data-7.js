import { boss, weak, armor, atk, minion, phase } from './bosses-kit.js';

// The boss of world 20, Midnight Press. Like the other side-world bosses it never charges: it sways,
// hovers, then circles, resting high enough that every part stays below the HUD.

// The Night Editor, a colossal ink octopus seen front-on: a green eyeshade over two great eyes, the ink
// siphon under them, two thick arms curling out to its sides and a red pencil gripped low in each. The
// shade and the arms are armoured; the eyes, the siphon and the pencils are weak. The pencils mark the
// ship with aimed strokes, the siphon sprays fans, spirals and at last a laser of ink, the shade drips
// rain and rings. The copy boys (divers) are flung from the arms, three at a time; the carrier is listed
// first and a burst is at most 3, so MINION_CAP never starves it.

// Where it rests and how big it is.
export const EDITOR_Y = 320;
export const EDITOR_SIZE = Object.freeze({ w: 820, h: 380 });

// The hit points of each part (mirrored parts share one value).
export const EDITOR_HP = Object.freeze({ shade: 8, eye: 58, arm: 8, siphon: 76, pencil: 44 });

// The hp fraction at which each phase ends, and each phase's pace.
export const EDITOR_UNTIL = Object.freeze([0.65, 0.35, 0]);
export const EDITOR_RATE = Object.freeze([1.0, 1.2, 1.5]);

// Seconds between the attacks of each phase, in the order they are listed below.
export const EDITOR_EVERY = Object.freeze([
  Object.freeze([1.8, 3.4, 3.9]),
  Object.freeze([1.7, 2.6, 2.8, 3.2]),
  Object.freeze([1.5, 1.7, 3.4, 2.9, 6.5]),
]);

// Bullet counts and spreads of the attacks.
export const EDITOR_FAN = Object.freeze({ count: 5, spread: 0.7 });
export const EDITOR_EYE_FAN = Object.freeze({ count: 3, spread: 0.5 });
export const EDITOR_RAIN = Object.freeze([Object.freeze({ count: 5, spread: 300 }), Object.freeze({ count: 6, spread: 340 })]);
export const EDITOR_SPIRAL_COUNT = 14;
export const EDITOR_HOMING_COUNT = 3;
export const EDITOR_RING_COUNT = 18;

// The minions: one carrier per phase, and copy boys from both arms on lines that keep different time.
export const EDITOR_CARRIER_EVERY = 4.5;
export const EDITOR_BURST = 3;
export const EDITOR_DIVER_EVERY = Object.freeze({ armL: 5, armR: 6 });

const [U, R, E, H] = [EDITOR_UNTIL, EDITOR_RATE, EDITOR_EVERY, EDITOR_HP];
const minions = () => [
  minion('carrier', 1, EDITOR_CARRIER_EVERY, 'shade'),
  minion('diver', EDITOR_BURST, EDITOR_DIVER_EVERY.armL, 'armL'),
  minion('diver', EDITOR_BURST, EDITOR_DIVER_EVERY.armR, 'armR'),
];

const editor = boss('editor', 'The Night Editor', EDITOR_Y, { ...EDITOR_SIZE }, [
  armor('shade', 0, -150, 260, 60, H.shade), // the green eyeshade: tops it
  weak('eyeL', -90, -80, 90, 70, H.eye),
  weak('eyeR', 90, -80, 90, 70, H.eye),
  armor('armL', -300, 10, 180, 120, H.arm), // the arms fling the copy boys
  armor('armR', 300, 10, 180, 120, H.arm),
  weak('siphon', 0, 60, 160, 100, H.siphon),
  weak('pencilL', -230, 130, 100, 90, H.pencil), // a red pencil low in each arm
  weak('pencilR', 230, 130, 100, 90, H.pencil),
], [
  // Proofreading: a pencil marks the ship, the siphon sprays a fan, the shade drips ink.
  phase(U[0], 'sway', [
    atk('aimed', E[0][0], 'pencilL'),
    atk('fan', E[0][1], 'siphon', { ...EDITOR_FAN }),
    atk('rain', E[0][2], 'shade', { ...EDITOR_RAIN[0] }),
  ], { rate: R[0], minions: minions() }),
  // Deadline: the siphon spins ink, the shade pours, an eye glares a fan.
  phase(U[1], 'hover', [
    atk('aimed', E[1][0], 'pencilR'),
    atk('spiral', E[1][1], 'siphon', { count: EDITOR_SPIRAL_COUNT }),
    atk('rain', E[1][2], 'shade', { ...EDITOR_RAIN[1] }),
    atk('fan', E[1][3], 'eyeL', { ...EDITOR_EYE_FAN }),
  ], { rate: R[1], minions: minions() }),
  // Stop the press: both pencils strike, the eyes send homing blots, the shade rings, the siphon lances ink.
  phase(U[2], 'orbit', [
    atk('aimed', E[2][0], 'pencilL'),
    atk('aimed', E[2][1], 'pencilR'),
    atk('homing', E[2][2], 'eyeR', { count: EDITOR_HOMING_COUNT }),
    atk('ring', E[2][3], 'shade', { count: EDITOR_RING_COUNT }),
    atk('laser', E[2][4], 'siphon'),
  ], { rate: R[2], minions: minions() }),
]);

export const BOSSES7 = [editor];
