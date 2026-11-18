import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerBoss } from '../../src/core/bosses-data.js';
import { boss, weak, phase } from '../../src/core/bosses-kit.js';
import { stateHash } from '../../src/core/state-hash.js';
import { step, drain, ofType, TICK } from './world-kit.js';
import { bossWorld, part } from './boss-kit.js';

// A test boss for the regrowing part (R6-R8): a head that grows back REGROW s after it falls, and a
// core that does not. The first two phases let parts regrow, the last does not.
const REGROW = 2;
const HP = 20;
const UNTIL = [0.75, 0.3, 0];
const KIND = 'regrow-test';
registerBoss(boss(KIND, 'Test', 300, { w: 300, h: 200 }, [
  weak('head', 0, -50, 80, 60, HP, REGROW),
  weak('core', 0, 40, 120, 80, HP),
], [
  phase(UNTIL[0], 'hover', [], { regrow: true }),
  phase(UNTIL[1], 'hover', [], { regrow: true }),
  phase(UNTIL[2], 'hover', []),
]));

const BEFORE = Math.ceil(REGROW / TICK) - 1; // ticks the countdown has surely not run out in
const AFTER = Math.ceil(REGROW / TICK) + 1; // ticks it surely has, float drift allowed

// A world with the boss's hp set by hand, the phases it falls through crossed.
function fight(head, core) {
  const w = bossWorld(KIND);
  part(w, 'head').hp = head;
  part(w, 'core').hp = core;
  step(w);
  return w;
}

test('a cut regrowing part is back at full hp after its regrow time, and the boss hp rises by as much', () => {
  const w = fight(0, HP);
  const head = part(w, 'head');
  step(w, BEFORE - 1);
  assert.equal(head.hp, 0, 'still down just before its regrow time');
  const low = w.boss.hp;
  step(w, AFTER - BEFORE);
  assert.equal(head.hp, head.max);
  assert.equal(w.boss.hp, low + head.max);
});

test('a part without a regrow time stays down', () => {
  const w = fight(HP, HP * (1 - UNTIL[0]) - 1);
  part(w, 'core').hp = 0;
  step(w, AFTER);
  assert.equal(part(w, 'core').hp, 0);
});

test('in a phase that does not let parts regrow, a cut part stays down, even one cut in a phase that did', () => {
  const w = fight(0, HP);
  step(w, Math.floor(BEFORE / 2));
  part(w, 'core').hp = 1;
  step(w);
  assert.equal(w.boss.phase, UNTIL.length - 1);
  step(w, AFTER);
  assert.equal(part(w, 'head').hp, 0);
});

test('while the boss is dying nothing grows back', () => {
  const w = fight(0, 0);
  assert.notEqual(w.boss.dying, null);
  step(w, AFTER);
  assert.equal(part(w, 'head').hp, 0);
});

test('a phase once begun is never left: regrowth above the first threshold keeps the second phase (R7)', () => {
  const core = Math.floor(HP * 2 * UNTIL[0]) - 1; // with the head down, below the first threshold and above the second
  const w = fight(0, core);
  assert.equal(w.boss.phase, 1);
  drain(w);
  step(w, AFTER);
  assert.equal(part(w, 'head').hp, part(w, 'head').max);
  assert.ok(w.boss.hp / w.boss.maxHp > UNTIL[0], 'hp is back above the first phase threshold');
  assert.equal(w.boss.phase, 1);
  assert.deepEqual(ofType(drain(w), 'bossPhase'), []);
});

test('the countdown is part of the state hash, and no rng is drawn (R8)', () => {
  const a = fight(0, HP);
  const b = fight(0, HP);
  assert.equal(stateHash(a), stateHash(b));
  const rng = a.rng.s;
  step(a, AFTER);
  assert.equal(part(a, 'head').hp, part(a, 'head').max, 'it grew back');
  assert.equal(a.rng.s, rng, 'without a draw');
  part(b, 'head').grow -= TICK;
  assert.notEqual(stateHash(b), stateHash(fight(0, HP)), 'only the countdown differs');
});
