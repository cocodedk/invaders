// Turns core events into effects. Pure: randomness comes from `rng` (a makeRng closure of its own,
// never world.rng), nothing is drawn, and `world` is only read (for the ship or a boss part's
// position). Events with no entry here, like `failed`, are left to the screens.
import { FIGHT } from './react-fight.js';
import { BOSS } from './react-boss.js';
import { WORLD } from './react-world.js';
import { ARMADA } from './react-armada.js';
import { CARNIVAL } from './react-carnival.js';
import { DEEP } from './react-deep.js';
import { GLASS } from './react-glass.js';
import { BREATH } from './react-breath.js';
import { STORM } from './react-storm.js';
import { BATH } from './react-bath.js';
import { ISLE } from './react-isle.js';
import { GROUND } from './react-ground.js';
import { STORY } from './react-story.js';
import { ROAD } from './react-road.js';

const HANDLERS = { ...FIGHT, ...BOSS, ...WORLD, ...ARMADA, ...CARNIVAL, ...DEEP, ...GLASS, ...BREATH, ...STORM, ...BATH, ...ISLE, ...GROUND, ...STORY, ...ROAD }; // DEEP wraps fire, hit, kill and absorb, GLASS wraps fire again, power and the wreck's three; BREATH adds two events of its own (world 17's breath and its wiped bullets), wrapping nothing; STORM wraps ARMADA's sideShot and broadside (world 18 borrows the broadside) and adds backfire; BATH wraps DEEP's kill and FIGHT's explode (world 19 tells them as a puff and a foam) and adds world 19's six batting events; ISLE adds world 21's arrowTurn; GROUND adds world 22's groundKill and groundHit (a broken thing on the ground blasts, a struck one chips), wrapping nothing; STORY adds world 22's ability (the caption naming it), wrapping nothing; ROAD adds world 22's checkpoint, seedBurst, chip, lineStop, lasso (Leg 3's loop, gold sparkles along its edge), respawn and holdBreak, wrapping STORY's ability (a glow with the caption) and WORLD's cut (world 22 breaks a bullet in violet chips)

// Every event type fx reacts to.
export const REACTS = Object.keys(HANDLERS);

export function applyEvent(fx, ev, rng, world) {
  if (Object.hasOwn(HANDLERS, ev.type)) HANDLERS[ev.type](fx, ev, rng, world);
}

export function applyEvents(fx, events, rng, world) {
  for (const ev of events) applyEvent(fx, ev, rng, world);
}
