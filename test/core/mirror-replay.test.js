import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { finished } from '../../src/core/util.js';
import { levelById } from '../../src/core/levels.js';
import { autopilot } from '../../src/core/autopilot.js';
import { makeRun, decodeRun, replay, stateHash, TICK } from '../../src/core/replay.js';

// A real run of world 16 in which the mirror is caught and fires, as the game would save it: the inputs
// go through makeRun, JSON and decodeRun, and the replay must end on the same state, score and events,
// the twin's shots included (the twin adds no rng draw and no input; the run version is 9 since R66). The
// seed is one under which the autopilot catches the mirror: under R66's drops its own seed no longer does.
const SEED = 1;
test('w16-3: a run that catches the mirror and fires with it replays to the same end', () => {
  const level = levelById('w16-3');
  const world = createWorld(level, SEED);
  const inputs = [];
  const events = [];
  while (!finished(world) && world.t < 180) {
    const input = autopilot(world);
    inputs.push(input);
    stepWorld(world, TICK, input);
    events.push(...world.events.splice(0));
  }
  assert.ok(events.some((e) => e.type === 'power' && e.kind === 'mirror' && e.on), 'the mirror was caught');
  assert.ok(events.filter((e) => e.type === 'fire' && e.power === 'mirror').length >= 15, 'and fired with');

  const run = decodeRun(JSON.parse(JSON.stringify(makeRun(level, SEED, inputs, { score: world.score, stars: 0 }))));
  assert.ok(run, 'the saved run reads back');
  assert.equal(makeRun(level, SEED, [], { score: 0, stars: 0 }).v, 9);
  const again = replay(run.level, run.seed, run.inputs);
  assert.equal(stateHash(again.world), stateHash(world));
  assert.equal(again.world.score, world.score);
  assert.equal(again.world.state, world.state);
  assert.deepEqual(again.events, events);
});
