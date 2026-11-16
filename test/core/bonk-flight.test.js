import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { finished } from '../../src/core/util.js';
import { levelById } from '../../src/core/levels.js';
import { destination } from '../../src/core/autopilot.js';
import { handTarget } from '../../src/core/hand.js';
import { SHIP_R, zoneOf } from '../../src/core/ship.js';
import { EPS } from '../../src/core/kinds.js';
import { WHACK_R } from '../../src/core/bonk.js';
import { BODY_R } from '../../src/core/tumble.js';
import { makeRun, decodeRun, quantizeInput, stateHash, TICK } from '../../src/core/replay.js';

// A real run of world 19 (R71) by a ship that bats the bodies: it takes the nearest dizzy body it can bat, runs
// up from just out of reach behind it on the line to the live alien nearest that body, and swings through it;
// with no body to bat it flies the autopilot's course. The
// pointer walks at HAND speed (hand.js), as a mouse does. The run is saved as the game saves it, and the replay
// must end on the same state, score and events: the whacks, the bonks, the banks and the strikes included.
const BACK = WHACK_R + BODY_R; // the run-up: this far behind the body, just out of the ship's reach
const THROUGH = 2 * SHIP_R; // the swing ends this far beyond the body
const LIMIT = 120; // s: a cleared wave level is far shorter

// Where the batter heads this tick, or null when no body can be batted at an alien.
function batSpot(world, zone) {
  const s = world.ship;
  let body = null;
  let bd = Infinity;
  for (const b of world.twist.bodies) {
    if (b.gone || b.fly || b.daze > EPS || b.y > zone.y1 - BACK) continue;
    const d = Math.hypot(b.x - s.x, b.y - s.y);
    if (d < bd) [body, bd] = [b, d];
  }
  if (!body) return null;
  let to = null;
  let td = Infinity;
  for (const a of world.aliens) {
    const d = Math.hypot(a.x - body.x, a.y - body.y);
    if (a.hp > 0 && d < td) [to, td] = [a, d];
  }
  if (!to) return null;
  const [ux, uy] = [(to.x - body.x) / td, (to.y - body.y) / td];
  const runUp = { x: body.x - ux * BACK, y: body.y - uy * BACK };
  if (Math.hypot(s.x - runUp.x, s.y - runUp.y) >= BODY_R) return runUp;
  return { x: body.x + ux * THROUGH, y: body.y + uy * THROUGH };
}

test('w19-3: a ship that bats every body at the aliens whacks, bonks, banks and strikes, and the run replays to the same end', () => {
  const level = levelById('w19-3');
  const zone = zoneOf(level);
  const world = createWorld(level, level.seed);
  world.ship.invuln = Infinity; // it bats for the whole level, through the aliens' fire
  const inputs = [];
  const events = [];
  while (!finished(world) && world.t < LIMIT) {
    const dest = batSpot(world, zone) ?? destination(world);
    const input = quantizeInput({ fire: true, target: handTarget(world.ship, dest, TICK) });
    inputs.push(input);
    stepWorld(world, TICK, input);
    events.push(...world.events.splice(0));
  }
  const count = (type) => events.filter((e) => e.type === type).length;
  assert.equal(world.state, 'cleared', `ended ${world.state} at ${world.t.toFixed(1)} s`);
  const whacks = count('whack');
  const bonks = events.filter((e) => e.type === 'bonk');
  assert.ok(whacks > 0 && bonks.length > 0, `${whacks} whacks, ${bonks.length} bonks`);
  assert.ok(bonks.some((e) => e.ko) && bonks.some((e) => !e.ko), 'a bonk knocked an alien out and another one bounced off');
  assert.ok(bonks.some((e) => e.link > 0), 'a knock-out flew on and bonked again: the bowling chain');
  assert.ok(count('bank') > 0, 'a batted body banked off a wall');
  assert.ok(count('strike') > 0, 'a chain ran to a strike');

  const run = decodeRun(JSON.parse(JSON.stringify(makeRun(level, level.seed, inputs, { score: world.score, stars: 0 }))));
  assert.ok(run, 'the saved run reads back');
  assert.deepEqual(run.inputs, inputs, 'every pointer target survives the codec');
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
