import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fastForward, drain, startClip, stepClip, clipDone } from '../../src/ui/trailer/reel.js';
import { cutClips, timeline } from '../../src/ui/trailer/cut.js';
import { statsOf, cardsFor, finalCard } from '../../src/ui/trailer/cards.js';
import { levelById } from '../../src/core/levels.js';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { autopilot } from '../../src/core/autopilot.js';
import { quantizeInput, makeRun, decodeRun, TICK } from '../../src/core/replay.js';

// A saved world 22 run whose re-simulation diverges from the run: the ship's shots broke nothing on the ground when such a run was saved
// (course-shots.js changed that), and RUN_V stays as it is (a rule scoped to world 22 does not date worlds 1-21's runs), so the run is still
// read and plays out differently. Nothing in the trailer compares a re-simulation with the run's stored result: it cuts its clips from the
// events its own re-simulation made, and drops any clip that has no snapshot (player.js), so a diverged run is a different film, not an error.
// A re-simulation that no longer clears (the gates are tougher now) has no 'cleared' event; the stats, the cards, the timeline and the final card
// that player.js builds from it take the run's stored score and stars as they are. (saveBestRun keeps such an old run in the Cinema until a
// better one replaces it.)
// The old rules are stood in for by a gun that cannot fire: the inputs are what the autopilot chose in a world where nothing was shot.
const SECS = 40;
const level = levelById('w22-1');

function recordedWithGunJammed() {
  const world = createWorld(level, level.seed);
  const inputs = [];
  for (let i = 0; i < SECS / TICK; i++) {
    world.ship.cooldown = Infinity;
    const input = quantizeInput(autopilot(world));
    stepWorld(world, TICK, input);
    world.events.length = 0;
    inputs.push(input);
  }
  return { world, inputs };
}

test('a world 22 run saved under older rules is still read, re-simulates differently, and its trailer is cut from the re-simulation without a throw', () => {
  const { world: old, inputs } = recordedWithGunJammed();
  const run = decodeRun(JSON.parse(JSON.stringify(makeRun(level, level.seed, inputs, { score: old.score, stars: 1 }))));
  assert.ok(run, 'the run is read');
  const again = createWorld(level, level.seed);
  for (const input of run.inputs) stepWorld(again, TICK, input);
  assert.ok(again.score > old.score, `the re-simulation went its own way: it scored ${again.score}, the run ${old.score}`);

  const starts = (events, ticks) => cutClips(events, ticks).map((c) => c.start);
  const pass = drain(fastForward(level, run.seed, run.inputs, starts, { budget: 0 }));
  assert.ok(!pass.events.some((e) => e.type === 'cleared'), 'the re-simulation never clears');
  const clips = cutClips(pass.events, pass.ticks).filter((c) => pass.snaps.has(c.start));
  assert.ok(clips.length > 0, 'there are clips to play');
  const stats = statsOf(pass.events, pass.ticks);
  const segs = timeline(clips, cardsFor(level.world, stats)); // what player.js builds before the first clip plays
  assert.deepEqual([segs.filter((s) => s.type === 'clip').length, segs.at(-1).type], [clips.length, 'final']);
  assert.equal(finalCard({ level, stats, stars: run.stars, score: run.score, newBest: false }).title, 'WANDERLIGHT');
  for (const c of clips) {
    const clip = startClip(pass.snaps.get(c.start), run.inputs, c, { seed: run.seed });
    for (let i = 0; i < 2000 && !clipDone(clip); i++) stepClip(clip, TICK);
    assert.ok(clipDone(clip), `the clip at ${c.start} plays to its end`);
  }
});
