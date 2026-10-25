import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POWERS, POWERS_13, WINGMEN, powersFor } from '../../src/core/kinds.js';
import { hurtAlien } from '../../src/core/aliens.js';
import { createWorld } from '../../src/core/world.js';
import { rand, randPick } from '../../src/core/rng.js';
import { powerTime, POWER_TIME } from '../../src/core/powerups.js';
import { escortsOf, ESCORT_DX, MUZZLE } from '../../src/core/ship.js';
import {
  TICK, FIRE, level, wave, step, seconds, playing, drain, ofType, pickupOnShip, holdAlien,
} from './world-kit.js';

// World 13's power: two escorts that fire a copy of the ship's straight shot with every volley, for
// the same 10 s as most powers, with the ring and the reserve of R53. Only world 13 drops it.

const lv = (extra = {}) => level([wave({ rows: 1, cols: 3, roles: ['grunt'] })], 0, extra);
// World 13's drop list but not its twist, so the power is tested alone: the broadside has its own file.
const w13 = () => lv({ world: 13 });
const fresh = (w) => w.shots.filter((s) => s.life === 1.5); // fired this tick: stepBullet has not aged it

test('the drop list is the six powers, plus the wingmen in world 13 only', () => {
  assert.deepEqual(POWERS, ['spread', 'laser', 'rapid', 'shield', 'homing', 'slow']);
  assert.equal(WINGMEN, 'wingmen');
  assert.deepEqual(POWERS_13, [...POWERS, 'wingmen']);
  assert.equal(powersFor({ world: 13 }), POWERS_13);
  for (let n = 1; n <= 12; n++) assert.equal(powersFor({ world: n }), POWERS, `world ${n}`);
  assert.equal(powersFor({}), POWERS, 'a test level without a world');
});

test('1000 seeded carrier deaths in world 13: about 20 % bombs and every one of the seven powers', () => {
  const w = createWorld(w13(), 99);
  for (let i = 0; i < 1000; i++) hurtAlien(w, { id: i, role: 'carrier', x: 500, y: 200, hp: 1 }, 1);
  const count = (k) => w.pickups.filter((p) => p.kind === k).length;
  assert.ok(count('bomb') >= 160 && count('bomb') <= 240, `bombs ${count('bomb')}`);
  for (const k of POWERS_13) assert.ok(count(k) >= 85 && count(k) <= 145, `${k} ${count(k)}`); // 114 each: 80 % in seven
});

test('every other world keeps its six powers and the very draws it always made', () => {
  for (const world of [1, 6, 12]) {
    const w = createWorld(lv({ world }), 7);
    const ref = { s: w.rng.s };
    for (let i = 0; i < 200; i++) hurtAlien(w, { id: i, role: 'carrier', x: 500, y: 200, hp: 1 }, 1);
    for (const p of w.pickups) {
      const r = rand(ref); // the split: 20 % bomb, 5 % life (not at full lives), the rest a power
      const want = r < 0.2 ? 'bomb' : randPick(ref, POWERS);
      assert.equal(p.kind, want, `world ${world}`);
    }
    assert.ok(w.pickups.every((p) => p.kind !== 'wingmen'));
    assert.equal(w.rng.s, ref.s, `world ${world} drew nothing else`);
  }
});

test('the wingmen last 10 s, like most powers, with the ring and the reserve of R53', () => {
  assert.equal(powerTime('wingmen'), POWER_TIME);
  assert.equal(POWER_TIME, 10);
  const w = playing(w13());
  w.pickups.length = 0;
  pickupOnShip(w, 'wingmen');
  step(w);
  assert.deepEqual(w.ship.power, { kind: 'wingmen', left: 10 });
  assert.deepEqual(ofType(drain(w), 'power').map((e) => [e.kind, e.on]), [['wingmen', true]]);
  seconds(w, 2);
  pickupOnShip(w, 'rapid'); // displaces the wingmen, with the time they had left, into the reserve
  step(w);
  assert.equal(w.ship.power.kind, 'rapid');
  assert.equal(w.ship.reserve.kind, 'wingmen');
  assert.ok(Math.abs(w.ship.reserve.left - 8) < 0.1, `left ${w.ship.reserve.left}`);
  seconds(w, 10.2); // the rapid ends and the wingmen go on from there
  assert.equal(w.ship.power.kind, 'wingmen');
  assert.equal(w.ship.reserve, null);
});

test('the escorts fly level with the ship, 80 px either side, held inside the field', () => {
  const w = playing(w13());
  assert.deepEqual(escortsOf(w.ship), [], 'none without the power');
  w.ship.power = { kind: 'wingmen', left: 10 };
  Object.assign(w.ship, { x: 900, y: 800 });
  assert.equal(ESCORT_DX, 80);
  assert.deepEqual(escortsOf(w.ship), [{ x: 820, y: 800 }, { x: 980, y: 800 }]);
  w.ship.x = 40;
  assert.deepEqual(escortsOf(w.ship).map((e) => e.x), [30, 120], 'the left one stops at the edge of the field');
  w.ship.x = 1880;
  assert.deepEqual(escortsOf(w.ship).map((e) => e.x), [1800, 1890]);
  w.ship.power = { kind: 'rapid', left: 5 };
  assert.deepEqual(escortsOf(w.ship), [], 'another power: no escorts');
  w.ship.power = { kind: 'wingmen', left: 5 };
  w.ship.alive = false;
  assert.deepEqual(escortsOf(w.ship), [], 'a lost ship has none');
});

test('every volley, each escort fires a copy of the straight shot from its own place', () => {
  const w = playing(w13());
  w.ship.power = { kind: 'wingmen', left: 10 };
  step(w, 1, FIRE);
  const shots = fresh(w);
  const { x, y } = w.ship;
  assert.deepEqual(shots.map((s) => s.x).sort((a, b) => a - b), [x - 80, x, x + 80]);
  for (const s of shots) {
    assert.deepEqual([s.pattern, s.vx, s.vy, s.r, s.dmg, s.life], ['shot', 0, -1400, 5, 1, 1.5]);
    assert.equal(s.y, y - MUZZLE);
  }
  assert.equal(ofType(drain(w), 'fire').length, 1, 'one fire event for the volley');
});

test('the escorts follow the ship: a volley fires from where they are now', () => {
  const w = playing(w13());
  w.ship.power = { kind: 'wingmen', left: 10 };
  Object.assign(w.ship, { x: 1300, y: 700, cooldown: 0 });
  step(w, 1, FIRE);
  const xs = fresh(w).map((s) => Math.round(s.x));
  assert.ok(Math.abs(xs[0] - 1300) < 40 && xs.length === 3);
  const spread = Math.max(...xs) - Math.min(...xs);
  assert.ok(Math.abs(spread - 160) < 1e-6, `the escorts stay 160 px apart: ${spread}`);
});

test('the escorts fire for 10 s and no longer: 3 shots a volley, then 1', () => {
  const w = playing(w13());
  holdAlien(w, 100, 300, 1e6); // something to fire at that the shots never reach, so the level goes on
  pickupOnShip(w, 'wingmen');
  step(w);
  const caught = w.tick;
  const sizes = [];
  let off = null;
  for (let i = 0; i < 60 * 12; i++) {
    step(w, 1, FIRE);
    const n = fresh(w).length;
    if (n) sizes.push(n);
    for (const e of drain(w)) if (e.type === 'power' && !e.on) off = (e.tick - caught) * TICK;
  }
  assert.ok(Math.abs(off - 10) < 0.05, `the power ended ${off} s after the catch`);
  const threes = sizes.indexOf(1);
  assert.ok(threes >= 54 && threes <= 57, `${threes} volleys of three in 10 s at 0.18 s each`);
  assert.ok(sizes.slice(0, threes).every((n) => n === 3), 'three a volley until then');
  assert.ok(sizes.slice(threes).every((n) => n === 1), 'then the plain single shot');
});

test('an escort\'s shot kills an alien the ship\'s own shot would miss', () => {
  const w = playing(w13());
  holdAlien(w, w.ship.x + 80, 500);
  step(w, 30, FIRE);
  assert.equal(w.aliens.length, 1, 'the ship alone does not reach it');
  w.ship.power = { kind: 'wingmen', left: 10 };
  step(w, 30, FIRE);
  assert.equal(w.aliens.length, 0, 'an escort does');
});

test('a world-13 pickup of the wingmen scores and sounds as any pickup', () => {
  const w = playing(w13());
  pickupOnShip(w, 'wingmen');
  step(w);
  const ev = drain(w);
  assert.equal(ofType(ev, 'pickup')[0].kind, 'wingmen');
  assert.equal(w.score, 500, 'the flat 500 for a pickup');
});
