import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { TICK } from '../../src/core/kinds.js';
import { parOf } from '../../src/core/pars.js';
import { makeRng } from '../../src/core/rng.js';
import { createFx, stepFx } from '../../src/fx/fx.js';
import { MAX_PARTICLES } from '../../src/fx/particles.js';
import { applyEvents } from '../../src/fx/react.js';
import { FLOOD } from '../../src/fx/react-road.js';
import { eventSounds } from '../../src/ui/sounds.js';
import { SFX } from '../../src/ui/sfx.js';
import { steer, CLEAR_PARS } from '../core/course-clear-kit.js';
import { courseLevel, FAIR_COURSE } from '../core/course-kit.js';

// The events as a whole flown course really emits them (the steered, invulnerable flight of test/core/course-clear-kit.js on the fair
// course: a checkpoint that grants the ground weapon, seeds, turrets, a crate, the hold), fed tick by tick to the effects and the sounds
// with the real world, not a hand-built payload.

const finite = (p) => [p.x, p.y, p.vx, p.vy, p.size].every(Number.isFinite);

test('every event a flown course emits makes finite, bounded effects and sounds that exist, and the break shows its points and floods the field', () => {
  const level = courseLevel(FAIR_COURSE);
  const world = createWorld(level);
  const fx = createFx();
  const rng = makeRng(5);
  const heard = new Set();
  const played = new Set();
  let flooded = 0;
  for (let i = 0; i < (CLEAR_PARS * parOf(level)) / TICK && world.state !== 'cleared'; i++) {
    world.ship.invuln = Infinity;
    stepWorld(world, TICK, steer(world));
    const events = world.events.splice(0);
    eventSounds(events, world, (name) => played.add(name));
    applyEvents(fx, events, rng, world);
    for (const e of events) {
      heard.add(e.type);
      if (e.type === 'groundKill') assert.ok(fx.popups.some((p) => p.text === '+' + e.score), `a break paid ${e.score}`);
      if (e.type === 'holdBreak') flooded = fx.particles.length;
    }
    stepFx(fx, TICK);
    assert.ok(fx.particles.length <= MAX_PARTICLES);
    assert.ok(fx.particles.every(finite), 'a particle went off');
  }
  assert.equal(world.state, 'cleared');
  for (const type of ['checkpoint', 'ability', 'seedBurst', 'groundKill', 'holdBreak']) assert.ok(heard.has(type), `${type} was emitted`);
  for (const name of ['checkpoint', 'ability', 'seedBurst', 'holdBreak', 'kill']) assert.ok(played.has(name), `${name} sounded`);
  for (const name of played) assert.equal(typeof SFX[name], 'function', name);
  assert.ok(flooded >= FLOOD.spots * FLOOD.puffs, `the flood: ${flooded} particles`);
});
