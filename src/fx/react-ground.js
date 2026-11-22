// What breaks and what is only struck on the ground of world 22's courses (the core's 'groundKill' and 'groundHit', course-ground.js
// hurtGround: a kind and a place, nothing else). The owner asked that the bullets "blast them away or rip them apart", so a break is
// an alien's blast (FIGHT.explode at its smallest size: a flash, a ring, sparks, smoke, a small shake) with grey chips of stone thrown out of it,
// and a hit is an alien's hit flash (FIGHT.hit on a plate) with a few chips. On the pale parchment the additive flash is a white blob that
// hides the thing for a moment and the ring is a pale yellow band, so it is the solid chips and the smoke that stay and carry the break. A pillar
// and a gate are the big ones (BIG_GROUND): more and bigger chips, a cloud of smoke and a harder shake. A kind we do not know
// counts as a small one. Plain shapes, no score pop-up (the event carries no score). Every count goes through emit.js, so fx.density thins
// them. A hit is a handful of particles, so even the heaviest volley landing on one thing leaves most of the pool free (react-ground.test.js).
// Pure: randomness comes from `rng`, `world` is not read.
import { addShake } from './camera.js';
import { debris, smoke } from './emit.js';
import { FIGHT } from './react-fight.js';

// The stone the course draws (ui/wander-kit.js PAL.stone, stoneDark, stoneLight; react-ground.test.js keeps the two alike).
export const GROUND_GREYS = ['#8f8b85', '#4c4840', '#a7a39c'];
export const BIG_GROUND = ['pillar', 'gate']; // the kinds that break big

export const CHIPS = 8; // chips thrown by a stone, a turret or a crate breaking
export const CHIP_SPEED = 240; // px/s, at most
export const CHIP_SIZE = [3, 6]; // px radius, [smallest, biggest]; a hit's chips are the same
export const BIG_CHIPS = 18;
export const BIG_CHIP_SPEED = 340;
export const BIG_CHIP_SIZE = [5, 10];
export const BIG_PUFFS = 4; // puffs of smoke on top of the blast's own
export const BIG_PUFF_SPREAD = 28; // px they scatter over
export const BIG_PUFF_SIZE = 16; // px radius they start at
export const BIG_SHAKE = 8; // px: harder than an alien's blast, much lighter than the ship's wreck (the shots are the player's own)
export const HIT_CHIPS = 3;
export const HIT_CHIP_SPEED = 180;

const isBig = (kind) => BIG_GROUND.includes(kind);

function groundKill(fx, ev, rng) {
  const big = isBig(ev.kind);
  FIGHT.explode(fx, { x: ev.x, y: ev.y, size: 1 }, rng);
  if (!big) {
    debris(fx, rng, ev.x, ev.y, CHIPS, GROUND_GREYS, CHIP_SPEED, CHIP_SIZE);
    return;
  }
  debris(fx, rng, ev.x, ev.y, BIG_CHIPS, GROUND_GREYS, BIG_CHIP_SPEED, BIG_CHIP_SIZE);
  smoke(fx, rng, ev.x, ev.y, BIG_PUFFS, BIG_PUFF_SPREAD, BIG_PUFF_SIZE);
  addShake(fx, BIG_SHAKE);
}

function groundHit(fx, ev, rng) {
  FIGHT.hit(fx, { x: ev.x, y: ev.y, dmg: 1, role: 'armored' }, rng); // a struck stone is a plate: pale sparks and the hit flash
  debris(fx, rng, ev.x, ev.y, HIT_CHIPS, GROUND_GREYS, HIT_CHIP_SPEED, CHIP_SIZE);
}

export const GROUND = { groundKill, groundHit };
