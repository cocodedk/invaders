import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ISLE } from '../../src/core/levels-7.js';
import { LEVELS } from '../../src/core/levels.js';
import { difficulty } from '../../src/core/difficulty.js';
import { ROLES, FORMATIONS, PATTERNS } from '../../src/core/kinds.js';

// World 21's level data and difficulty row, proven on their own (the seed check skips world 21's own listed levels,
// so it holds once levels-7.js joins LEVELS).
const WORLD = 21;
const PREV = WORLD - 1;
const LEVELS_A_WORLD = 5;
const MIN_WAVES = 3;
const MAX_WAVES = 5;
const MAX_WAVE_ALIENS = 40;
const MIN_FORMATIONS = 4;

const [specs] = ISLE;
const waveSpecs = specs.slice(0, -1);
const indices = [...Array(LEVELS_A_WORLD)].map((_, i) => i + 1);

test('levels-7.js holds five world 21 specs: four wave levels, then the boss level, no bunkers', () => {
  assert.equal(ISLE.length, 1);
  assert.equal(specs.length, LEVELS_A_WORLD);
  for (const s of waveSpecs) assert.ok(Array.isArray(s.waves));
  assert.equal(specs.at(-1).waves, undefined, 'the boss level has no waves');
  for (const s of specs) assert.equal(s.bunkers, false);
});

test('world 21 wave levels follow the level data rules', () => {
  waveSpecs.forEach((s, li) => {
    assert.ok(s.waves.length >= MIN_WAVES && s.waves.length <= MAX_WAVES, `w21-${li + 1} waves`);
    assert.ok(s.waves.some((x) => x.roles.includes('carrier')), `w21-${li + 1} has no carrier`);
    s.waves.forEach((x, wi) => {
      const at = `w21-${li + 1} wave ${wi}`;
      assert.ok(FORMATIONS.includes(x.formation), `${at} formation`);
      assert.ok(PATTERNS.includes(x.pattern), `${at} pattern`);
      assert.ok(Number.isInteger(x.rows) && x.rows >= 1 && Number.isInteger(x.cols) && x.cols >= 1, `${at} size`);
      assert.equal(x.roles.length, x.rows, `${at} one role per row`);
      for (const r of x.roles) assert.ok(r in ROLES, `${at} role ${r}`);
      assert.ok(typeof x.speed === 'number' && x.speed > 0, `${at} speed`);
      assert.ok(x.rows * x.cols <= MAX_WAVE_ALIENS, `${at} aliens`);
    });
  });
  const used = new Set(waveSpecs.flatMap((s) => s.waves.map((x) => x.formation)));
  assert.ok(used.size >= MIN_FORMATIONS, `only ${[...used]}`);
});

test('world 21 seeds are integers, distinct from each other and from every listed level', () => {
  const seeds = specs.map((s) => s.seed);
  for (const s of seeds) assert.ok(Number.isInteger(s));
  assert.equal(new Set(seeds).size, seeds.length);
  const listed = new Set(LEVELS.filter((l) => l.world !== WORLD).map((l) => l.seed));
  for (const s of seeds) assert.ok(!listed.has(s), `seed ${s} is taken`);
});

test('world 21 has its own difficulty row, from 0 to 1 and no easier than world 20, level for level', () => {
  // The main curve would put world 21 past 1, so the range check also proves the row is its own.
  for (const i of indices) {
    const d = difficulty(WORLD, i);
    assert.ok(d >= 0 && d <= 1, `w21-${i}`);
    assert.ok(d >= difficulty(PREV, i), `w21-${i} no easier than w20-${i}`);
  }
});
