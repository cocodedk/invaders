import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emitPattern } from '../../src/core/patterns.js';
import { FREE_ZONE } from '../../src/core/ship.js';
import { level, wave, playing, input, step, drain, ofType, bulletAt, pickupAt, holdAlien } from './world-kit.js';
import { bossLevel, part } from './boss-kit.js';

// R68: a ship that crosses the field in one tick still meets what lay in its way. The ship's path this tick
// is tested against bullets (the gap between the two paths), beams, rams and pickups; a ship that does not
// move is tested exactly as before. (pointer.test.js has the movement itself and the autopilot.)

const at = (x, y) => input({ target: { x, y } });
// A quiet world past its intro with the ship at (300, 1000), ready to be flicked to the right.
const still = (lv) => {
  const w = playing(lv);
  Object.assign(w.ship, { x: 300, y: 1000 });
  return w;
};
const hits = (w) => ofType(drain(w), 'shipHit').map((e) => e.source);

test('a ship flicked across a bullet in one tick is hit by it, and one that passes at a distance is not', () => {
  const w = still(level([wave()]));
  bulletAt(w, 900, 1000);
  step(w, 1, at(1500, 1000));
  assert.equal(w.ship.x, 1500);
  assert.deepEqual(hits(w), ['aimed'], 'the bullet lay on the ship\'s path');
  const clear = still(level([wave()]));
  bulletAt(clear, 900, 1000);
  step(clear, 1, at(1500, 940));
  assert.deepEqual(hits(clear), [], '60 px off the path is a miss');
});

test('a bullet flying the other way is met too: the paths are swept against each other, not the ship\'s end', () => {
  const w = still(level([wave()]));
  bulletAt(w, 1030, 1000, -1800, 0); // it flies 30 px this tick, 1030 to 1000, while the ship goes 300 to 1400
  step(w, 1, at(1400, 1000));
  assert.deepEqual(hits(w), ['aimed']);
});

test('a bullet that left the ship\'s line before the ship got there is not hit: the two are judged at their closest', () => {
  const w = still(level([wave()]));
  bulletAt(w, 900, 1000, 0, -12000); // on the ship's line at the start of the tick, 200 px above it at the end
  step(w, 1, at(1500, 1000)); // the ship reaches x = 900 about half way through, when the bullet is 100 px up
  assert.equal(w.ship.x, 1500);
  assert.deepEqual(hits(w), []);
});

test('a bullet the ship flicked past is a near miss at the distance it passed (their closest in the tick)', () => {
  const w = still(level([wave()]));
  bulletAt(w, 900, 975);
  step(w, 2, at(1500, 1000));
  const ev = drain(w);
  assert.equal(ofType(ev, 'shipHit').length, 0);
  const near = ofType(ev, 'nearMiss');
  assert.equal(near.length, 1);
  assert.ok(Math.abs(near[0].dist - 25) < 1e-6, `passed at ${near[0].dist}`);
});

test('a ship flicked across a burning beam is hit by it, not across the warning line, nor beside it', () => {
  const beam = (w) => {
    const [b] = emitPattern('laser', { x: 900, y: 100 }, { x: 900, y: 1000 }, { speed: 300 }, w.rng);
    w.bullets.push(b);
    return b;
  };
  const w = still(level([wave()]));
  beam(w).warn = 0;
  step(w, 1, at(1500, 1000));
  assert.deepEqual(hits(w), ['laser']);
  const warned = still(level([wave()]));
  beam(warned);
  step(warned, 1, at(1500, 1000));
  assert.deepEqual(hits(warned), [], 'the warning line harms nothing');
  const beside = still(level([wave()]));
  beam(beside).warn = 0;
  step(beside, 1, at(800, 1000));
  assert.deepEqual(hits(beside), [], '100 px short of the beam');
});

test('a ship flicked through an alien rams it in a free level, and not in the strip, where a held alien is no ram', () => {
  const free = still(level([wave()], 0, { free: true }));
  holdAlien(free, 900, 1000, 99);
  step(free, 1, at(1500, 1000));
  assert.deepEqual(hits(free), ['ram']);
  const strip = still(level([wave()]));
  holdAlien(strip, 900, 1000, 99);
  step(strip, 1, at(1500, 1000));
  assert.deepEqual(hits(strip), []);
});

test('a ship flicked through a boss part rams it, and the floor under the boss is clear', () => {
  const fight = () => {
    const w = playing(bossLevel('ray', 0, { free: true, world: 18 }));
    while (w.boss.enter > 0) step(w);
    drain(w);
    return w;
  };
  const w = fight();
  const p = part(w, 'maw');
  Object.assign(w.ship, { x: Math.max(FREE_ZONE.x0, p.x - p.w / 2 - 200), y: p.y });
  step(w, 1, at(Math.min(FREE_ZONE.x1, p.x + p.w / 2 + 200), p.y));
  assert.ok(hits(w).includes('ram'), 'the maw lay on the ship\'s path');
  const clear = fight();
  Object.assign(clear.ship, { x: 200, y: 1000 });
  step(clear, 1, at(1700, 1000));
  assert.deepEqual(hits(clear), []);
});

test('a power-up the ship flicked over is caught, one 100 px off the path is not', () => {
  const w = still(level([wave()]));
  pickupAt(w, 'rapid', 900, 1000);
  step(w, 1, at(1500, 1000));
  assert.equal(w.ship.power?.kind, 'rapid');
  const far = still(level([wave()]));
  pickupAt(far, 'rapid', 900, 900);
  step(far, 1, at(1500, 1000));
  assert.equal(far.ship.power, null);
});

test('a ship that does not move is hit exactly as before: inside the radius, not outside', () => {
  const w = still(level([wave()]));
  bulletAt(w, 300, 980);
  step(w, 1, input());
  assert.deepEqual(hits(w), ['aimed']);
  const near = still(level([wave()]));
  bulletAt(near, 300, 960);
  step(near, 1, input());
  assert.deepEqual(hits(near), []);
});
