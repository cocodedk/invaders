import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../../src/core/levels.js';
import { PARS, parOf, DEFAULT_PAR } from '../../src/core/pars.js';
import { HOLD_PAR } from '../../src/core/course-kinds.js';
import { currentPars } from '../../scripts/pars.mjs';
import { courseLevel, hold } from './course-kit.js';

// Each level's par (R66) is twice what the never-hit autopilot takes to clear it, rounded up to 5 s:
// scripts/pars.mjs measures and writes them. A level, rule or autopilot change that moves a clear
// fails here until the table is written again (node scripts/pars.mjs). A course level (world 22) is
// not in the table: the autopilot cannot fly one, so its par is computed from its data.

const FLOWN = LEVELS.filter((l) => !l.course); // the levels the autopilot flies

test('every level the autopilot flies has a par, a whole number of 5 s, and nothing else has one', () => {
  assert.deepEqual(Object.keys(PARS), FLOWN.map((l) => l.id));
  for (const l of FLOWN) {
    assert.ok(Number.isInteger(PARS[l.id] / 5) && PARS[l.id] >= 20, `${l.id}: ${PARS[l.id]}`);
    assert.equal(parOf(l), PARS[l.id]);
  }
  assert.equal(parOf({ id: 'not-a-level' }), DEFAULT_PAR);
});

test('every par is current: the table is what scripts/pars.mjs measures now', () => {
  assert.deepEqual(currentPars().changed, [], 'run node scripts/pars.mjs');
});

const up5 = (s) => Math.ceil(s / 5) * 5;
const SPEED = 100; // px/s
const parWith = (length, holds) => parOf(courseLevel({ speed: SPEED, length, starts: [], walls: [], spawns: holds }));

test('a course\'s par is its scroll time plus HOLD_PAR for each hold, up to 5 s', () => {
  const seconds = 50; // a scroll time that is already a multiple of 5 s
  const length = seconds * SPEED;
  assert.equal(parWith(length, []), seconds);
  assert.equal(parWith(length, [hold()]), seconds + up5(HOLD_PAR));
  assert.equal(parWith(length, [hold(), hold({ at: 2 * hold().at })]), seconds + up5(2 * HOLD_PAR));
  assert.equal(parWith(length - SPEED, []), seconds, 'a scroll time between two multiples of 5 s rounds up');
  assert.equal(parWith(length + SPEED, []), seconds + 5);
});

test('a course level\'s par is computed from its data, whatever its id', () => {
  const data = { speed: SPEED, length: 4300, starts: [], walls: [], spawns: [] };
  assert.equal(parOf({ ...courseLevel(data), id: 'w1-1' }), up5(data.length / SPEED), 'not the table\'s par for that id');
});
