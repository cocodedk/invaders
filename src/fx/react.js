// Turns core events into effects. Pure: randomness comes from `rng` (a makeRng closure of its own,
// never world.rng), nothing is drawn, and `world` is only read (for the ship or a boss part's
// position). Events with no entry here, like `failed`, are left to the screens.
import { FIGHT } from './react-fight.js';
import { BOSS } from './react-boss.js';
import { WORLD } from './react-world.js';
import { ARMADA } from './react-armada.js';
import { CARNIVAL } from './react-carnival.js';
import { DEEP } from './react-deep.js';

const HANDLERS = { ...FIGHT, ...BOSS, ...WORLD, ...ARMADA, ...CARNIVAL, ...DEEP }; // DEEP last: it wraps fire, hit, kill and absorb

// Every event type fx reacts to.
export const REACTS = Object.keys(HANDLERS);

export function applyEvent(fx, ev, rng, world) {
  if (Object.hasOwn(HANDLERS, ev.type)) HANDLERS[ev.type](fx, ev, rng, world);
}

export function applyEvents(fx, events, rng, world) {
  for (const ev of events) applyEvent(fx, ev, rng, world);
}
