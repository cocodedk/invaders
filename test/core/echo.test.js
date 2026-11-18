import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';
import { replay, stateHash } from '../../src/core/replay.js';
import { ECHO_TICKS, ECHO_DELAY } from '../../src/core/echo.js';
import { MUZZLE } from '../../src/core/ship.js';
import { TICK } from '../../src/core/kinds.js';
import { level, wave, step, at, input, holdAlien, addAlien, bulletAt, pickupAt, dry, playing } from './world-kit.js';
import { randomInputs } from './replay-kit.js';

// World 20's rule, the echo: a carbon copy that flies the ship's path ECHO_DELAY late and fires when it fired.
const w20 = (extra = {}) => level([wave(), wave()], 0, { world: 20, twist: 'echo', free: true, ...extra });
const fresh = (w) => w.shots.filter((s) => s.echo && s.life === 1.5); // fired this tick: stepBullet has not aged it

// A quiet world 20 on the first tick of play: no copy yet, and one alien held far up on the left that
// cannot be killed, so no wave ends.
function start(lv = w20()) {
  const w = createWorld(lv);
  w.scale.fireMult = 0;
  while (w.state === 'intro') step(w);
  holdAlien(w, 100, 200, 1e6);
  return w;
}

test('ECHO_DELAY is a whole number of ticks', () => {
  assert.ok(Number.isInteger(ECHO_TICKS) && ECHO_TICKS > 0);
  assert.equal(ECHO_DELAY / TICK, ECHO_TICKS);
});

test('no copy before ECHO_DELAY; then it stands where the ship stood and fires when the ship fired', () => {
  const w = start();
  assert.equal(w.twist.copy, null, 'none in the intro');
  const past = [];
  const ticks = 4 * ECHO_TICKS;
  for (let i = 0; i < ticks; i++) {
    const fire = Math.floor(i / 7) % 3 !== 0;
    step(w, 1, input({ fire, target: { x: 600 + Math.round(500 * Math.sin(i / 20)), y: 700 + (i % 300) } }));
    past.push({ x: w.ship.x, y: w.ship.y, fired: w.ship.shotAt === w.tick });
    const shots = fresh(w);
    if (i < ECHO_TICKS) {
      assert.equal(w.twist.copy, null, `no copy on tick ${i}`);
      assert.equal(shots.length, 0);
      continue;
    }
    const then = past[i - ECHO_TICKS];
    assert.deepEqual(w.twist.copy, { x: then.x, y: then.y }, `tick ${i}`);
    assert.equal(shots.length, then.fired ? 1 : 0, `shots on tick ${i}`);
    if (then.fired) assert.deepEqual([shots[0].x, shots[0].y], [then.x, then.y - MUZZLE]);
  }
  const fired = past.slice(0, ticks - ECHO_TICKS).filter((p) => p.fired).length;
  assert.ok(fired > 0 && fired < ticks - ECHO_TICKS, 'the ship fired on some ticks and not on others');
});

// The score of the one alien at (960, 400) killed by a shot of the ship (`copy` false) or of the copy.
function killScore(copy) {
  const w = dry(start());
  const a = holdAlien(w, copy ? 100 : 960, copy ? 200 : 400, 1);
  addAlien(w, 1800, 200, { hp: 1e6 }); // so the kill does not clear the wave
  step(w, 1, input({ fire: true, target: { x: 960, y: 1000 } }));
  for (let i = 1; i < ECHO_TICKS && a.hp > 0; i++) step(w, 1, at(1600, 1000));
  if (copy) {
    assert.ok(a.hp > 0, 'the ship missed it');
    Object.assign(a, { x: 960, y: 400 }); // the ship's shot is gone; the copy's comes next
    for (let i = 0; i < ECHO_TICKS && a.hp > 0; i++) step(w, 1, at(1600, 1000));
  }
  assert.equal(a.hp, 0, 'killed');
  return w.score;
}

test("a copy's shot that kills an alien scores what the ship's shot scores for it", () => {
  const ship = killScore(false);
  assert.ok(ship > 0);
  assert.equal(killScore(true), ship);
});

test('nothing hits the copy and it collects nothing', () => {
  const w = start();
  step(w, ECHO_TICKS + 1, at(300, 1000));
  step(w, ECHO_TICKS / 2, at(1600, 1000));
  const { x, y } = w.twist.copy;
  assert.deepEqual([x, y], [300, 1000], 'the copy is still where the ship was');
  const lives = w.ship.lives;
  bulletAt(w, x, y - 20, 0, 2400); // crosses the copy's middle this tick
  pickupAt(w, 'spread', x, y);
  step(w, 1, at(1600, 1000));
  assert.equal(w.bullets.length, 1, 'the bullet flies on');
  assert.ok(w.bullets[0].life > 0 && w.bullets[0].y > y);
  assert.equal(w.ship.lives, lives);
  assert.equal(w.pickups.length, 1, 'the pickup is not caught');
  assert.equal(w.ship.power, null);
});

test('a recorded world 20 run re-simulates to the same state hash; the copy is part of the hash', () => {
  const lv = w20({ waves: [wave({ rows: 2, cols: 6, roles: ['grunt', 'diver'] }), wave({ rows: 2, cols: 6, roles: ['gunner', 'grunt'] })] });
  const inputs = randomInputs(20, 30 * 60);
  const a = replay(lv, lv.seed, inputs);
  const b = replay(lv, lv.seed, inputs);
  assert.ok(a.events.some((e) => e.type === 'fire'), 'the ship fired');
  assert.ok(a.world.twist.copy, 'the copy flew');
  assert.ok(a.world.shots.some((s) => s.echo) || a.world.state !== 'play', 'and fired');
  assert.equal(stateHash(b.world), stateHash(a.world));
  assert.deepEqual(b.events, a.events);
  const w = start();
  step(w, ECHO_TICKS + 1, at(300, 1000));
  const moved = structuredClone(w);
  moved.twist.copy.x += 1;
  assert.notEqual(stateHash(moved), stateHash(w));
  const trail = structuredClone(w);
  trail.twist.path[0].fire = !trail.twist.path[0].fire;
  assert.notEqual(stateHash(trail), stateHash(w));
});

test('in a level of any other world the echo state stays empty', () => {
  for (const lv of [levelById('w1-1'), levelById('w19-1'), w20({ world: 19, twist: 'bonk' })]) {
    const w = playing(lv);
    step(w, 3 * ECHO_TICKS, input({ fire: true, dx: 1 }));
    assert.equal(w.twist.path, undefined, lv.id);
    assert.equal(w.twist.copy, undefined);
    assert.equal(w.shots.filter((s) => s.echo).length, 0);
  }
});
