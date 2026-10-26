import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { finished } from '../../src/core/util.js';
import { levelById } from '../../src/core/levels.js';
import { quantizeInput } from '../../src/core/input-codec.js';
import { makeRun, decodeRun, stateHash, TICK } from '../../src/core/replay.js';

// A real run of world 18 (R67) flown high among the aliens by the pointer, the way a player drags the
// homing bullets into them, saved as the game saves it: the replay must end on the same state, score and
// events, the backfires and the rams included.
test('w18-1: a free-flight run that drags bullets into the aliens replays to the same end', () => {
  const level = levelById('w18-1');
  const world = createWorld(level, level.seed);
  world.ship.invuln = Infinity; // it flies for the whole level, rams and all
  const inputs = [];
  const events = [];
  while (!finished(world) && world.t < 90) {
    const ys = world.aliens.map((a) => a.y);
    const cy = ys.length ? ys.reduce((p, q) => p + q, 0) / ys.length : 400;
    const t = world.t;
    const input = quantizeInput({ fire: true, target: { x: 960 + 760 * Math.sin(t * 0.9), y: cy + 120 + 200 * Math.cos(t * 1.3) } });
    inputs.push(input);
    stepWorld(world, TICK, input);
    events.push(...world.events.splice(0));
  }
  assert.ok(events.filter((e) => e.type === 'backfire').length >= 5, 'bullets were dragged into the aliens');
  assert.ok(inputs.some((i) => i.target.y < 400), 'and the ship flew high');

  const run = decodeRun(JSON.parse(JSON.stringify(makeRun(level, level.seed, inputs, { score: world.score, stars: 0 }))));
  assert.ok(run, 'the saved run reads back');
  assert.deepEqual(run.inputs, inputs, 'every pointer target, the high ones too, survives the codec');
  const again = createWorld(levelById(run.level), run.seed);
  again.ship.invuln = Infinity;
  const seen = [];
  for (const input of run.inputs) {
    stepWorld(again, TICK, input);
    seen.push(...again.events.splice(0));
  }
  assert.equal(stateHash(again), stateHash(world));
  assert.equal(again.score, world.score);
  assert.deepEqual(seen, events);
});
