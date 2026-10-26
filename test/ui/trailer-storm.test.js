import { test } from 'node:test';
import assert from 'node:assert/strict';
import { element, sink } from './dom-kit.js';

// The trailer of one of world 18's (Anvil Sky) wave levels, the first free-flight world: it plays from the leader to the
// final card in the world's own voice, its stat card counting invaders (the boss level's names the Squall Ray, which
// trailer-cards.test.js checks: its art is not needed to cut a wave level).
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 1, height: 1, getContext: () => sink } : element(tag)),
  addEventListener() {}, activeElement: null, hidden: false,
};
const { levelById } = await import('../../src/core/levels.js');
const { createWorld, stepWorld } = await import('../../src/core/world.js');
const { autopilot } = await import('../../src/core/autopilot.js');
const { quantizeInput, TICK } = await import('../../src/core/replay.js');
const { trailerScreen } = await import('../../src/ui/trailer/player.js');

test("a wave level of world 18 cuts and plays a trailer to its final card, the stat card counting invaders", () => {
  const level = levelById('w18-1');
  assert.equal(level.boss, undefined, 'a wave level: no boss to name');
  const world = createWorld(level, level.seed);
  const inputs = [];
  while (world.state === 'play' || world.state === 'intro') {
    const input = quantizeInput(autopilot(world));
    stepWorld(world, TICK, input);
    world.events.length = 0;
    inputs.push(input);
  }
  assert.equal(world.state, 'cleared', 'the autopilot clears it, so there is a run to cut');
  let done = false;
  const canvas = { width: 1920, height: 1080, getContext: () => sink };
  const screen = trailerScreen({
    canvas, level, seed: level.seed, inputs, result: { stars: 2, score: world.score, newBest: true }, onDone: () => { done = true; },
  });
  const lines = [];
  const types = [];
  const dt = 1 / 30;
  for (let frame = 0; !done && frame < 20000; frame++) {
    screen.update(dt);
    const s = screen.status();
    if (s.line && !lines.includes(s.line)) lines.push(s.line);
    if (s.type && types.at(-1) !== s.type) types.push(s.type);
  }
  assert.ok(done, 'the trailer ends');
  assert.equal(types.at(-1), 'final', 'on the final card');
  assert.equal(types.filter((t) => t === 'card').length, 3, 'three title cards');
  assert.equal(lines.length, 3);
  assert.equal(lines[0], 'THE STORM HAD TEETH. THE PILOT TAUGHT IT TO BITE BACK.');
  assert.match(lines[1], /^\d[\d,]* INVADERS FELL TO THE STORM'S OWN FIRE\.$/, 'the stat card counts invaders: no boss fell');
  assert.match(lines[2], / IN THE STORM\. .+ OF BORROWED THUNDER\.$/);
});
