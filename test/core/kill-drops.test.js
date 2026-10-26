import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POWERS } from '../../src/core/kinds.js';
import { hurtAlien } from '../../src/core/aliens.js';
import { createWorld } from '../../src/core/world.js';
import { KILL_DROP, killDrop } from '../../src/core/powerups.js';
import { rand } from '../../src/core/rng.js';
import { level, wave, step, playing, shotAt } from './world-kit.js';

// R54: every carrier still drops a pickup; any other formation alien drops one with chance KILL_DROP,
// one draw on world.rng per kill, through the same bomb / life / power split. Boss minions and the
// saucer are left as they were: their carriers drop, nothing else of theirs does.

const ROLE_LIST = ['grunt', 'diver', 'gunner', 'armored'];
const lv = () => level([wave({ rows: 1, cols: 3, roles: ['carrier'] })]);
const dead = (id, role, extra = {}) => ({ id, role, x: 500, y: 200, hp: 1, ...extra });

test('KILL_DROP is 3 %', () => {
  assert.equal(KILL_DROP, 0.03);
});

test('a non-carrier kill takes the next draw of world.rng: a pickup exactly when it is under KILL_DROP', () => {
  const w = createWorld(lv(), 5);
  let drops = 0;
  let misses = 0;
  for (let i = 0; i < 600; i++) {
    const roll = rand({ s: w.rng.s }); // what the kill is about to draw
    const before = w.pickups.length;
    hurtAlien(w, dead(i, ROLE_LIST[i % 4]), 1);
    if (roll < KILL_DROP) {
      drops++;
      assert.equal(w.pickups.length, before + 1, `kill ${i} rolled ${roll}`);
      assert.deepEqual([w.pickups.at(-1).x, w.pickups.at(-1).y], [500, 200], 'where it fell');
    } else {
      misses++;
      assert.equal(w.pickups.length, before, `kill ${i} rolled ${roll}`);
    }
  }
  assert.ok(drops > 0 && misses > 0, `${drops} drops, ${misses} misses: both branches ran`);
});

test('over many seeded kills each non-carrier role drops about KILL_DROP of the time', () => {
  const N = 10000; // 300 drops each, sigma 17
  for (const role of ROLE_LIST) {
    const w = createWorld(lv(), 99);
    for (let i = 0; i < N; i++) hurtAlien(w, dead(i, role), 1);
    const n = w.pickups.length;
    assert.ok(n >= 230 && n <= 370, `${role}: ${n} drops in ${N} kills`);
  }
});

// R56: the late worlds shoot hardest, so their aliens drop more.
test('the drop chance climbs with difficulty: 3 % at d 0, 12 % at d 1, 3 % + 9 % x d squared between', () => {
  assert.equal(killDrop(0), KILL_DROP);
  assert.ok(Math.abs(killDrop(1) - 0.12) < 1e-12, `${killDrop(1)} at d 1`);
  assert.ok(Math.abs(killDrop(0.5) - 0.0525) < 1e-12, `${killDrop(0.5)} at d 0.5`);
  for (let k = 1; k <= 10; k++) assert.ok(killDrop(k / 10) > killDrop((k - 1) / 10), `climbs at d ${k / 10}`);
});

test('kills in the hardest level drop about 12 % of the time', () => {
  const w = createWorld(level([wave({ rows: 1, cols: 3, roles: ['carrier'] })], 1), 99);
  const N = 10000; // about 1200 drops, sigma 32
  for (let i = 0; i < N; i++) hurtAlien(w, dead(i, ROLE_LIST[i % 4]), 1);
  const n = w.pickups.length;
  assert.ok(n >= 1050 && n <= 1350, `${n} drops in ${N} kills`);
});

test('a chance drop uses the carrier split: about 20 % bombs, about 5 % lives at full lives too (R66), all six powers', () => {
  const w = createWorld(lv(), 7);
  for (let i = 0; i < 40000; i++) hurtAlien(w, dead(i, ROLE_LIST[i % 4]), 1);
  const n = w.pickups.length; // about 1200
  const count = (k) => w.pickups.filter((p) => p.kind === k).length;
  assert.ok(n >= 1000 && n <= 1400, `${n} drops`);
  assert.ok(count('bomb') >= n * 0.15 && count('bomb') <= n * 0.25, `bombs ${count('bomb')} of ${n}`);
  assert.ok(count('life') >= n * 0.03 && count('life') <= n * 0.07, `lives ${count('life')} of ${n}`);
  for (const k of POWERS) assert.ok(count(k) > 0, k);
});

test('carriers still always drop: in a wave, as a boss minion, and as the saucer', () => {
  const w = createWorld(lv(), 3);
  const kinds = [{}, { minion: true }, { saucer: true, minion: false }];
  for (const [i, extra] of kinds.entries()) {
    for (let k = 0; k < 500; k++) hurtAlien(w, dead(i * 1000 + k, 'carrier', extra), 1);
    assert.equal(w.pickups.length, 500 * (i + 1), `kind ${i}`);
  }
});

test('boss minions that are not carriers neither roll nor drop: the rng is untouched', () => {
  const w = createWorld(lv(), 11);
  const s = w.rng.s;
  for (let i = 0; i < 3000; i++) hurtAlien(w, dead(i, ['grunt', 'diver', 'gunner'][i % 3], { minion: true }), 1);
  assert.equal(w.pickups.length, 0);
  assert.equal(w.rng.s, s, 'no draw was taken');
});

test('a grunt shot in play rolls too: across many seeds some drop and most do not', () => {
  let drops = 0;
  const SEEDS = 400; // 12 expected
  for (let seed = 1; seed <= SEEDS; seed++) {
    const w = playing(level([wave({ rows: 1, cols: 2 })]), { seed }); // two, so the level goes on
    shotAt(w, w.aliens[0]);
    step(w);
    assert.equal(w.aliens.filter((a) => a.hp > 0).length, 1);
    assert.ok(w.pickups.length <= 1);
    drops += w.pickups.length;
  }
  assert.ok(drops >= 1 && drops <= SEEDS * 0.1, `${drops} drops in ${SEEDS} kills`);
});
