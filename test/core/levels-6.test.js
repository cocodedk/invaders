import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PRESS } from '../../src/core/levels-6.js';
import { WORLDS, LEVELS } from '../../src/core/levels.js';
import { difficulty } from '../../src/core/difficulty.js';
import { ROLES, FORMATIONS, PATTERNS } from '../../src/core/kinds.js';

// World 20's level data and difficulty row, before the world is listed (part 7.3 joins them).
const WORLD = 20;
const PREV = WORLD - 1;
const LEVELS_A_WORLD = 5;
const MIN_WAVES = 3;
const MAX_WAVES = 5;
const MAX_WAVE_ALIENS = 40;
const MIN_FORMATIONS = 4;
const MAX_FILE_LINES = 200;
const LISTED_WORLDS = PREV;

const [specs] = PRESS;
const waveSpecs = specs.slice(0, -1);
const indices = [...Array(LEVELS_A_WORLD)].map((_, i) => i + 1);

test('levels-6.js holds five world 20 specs: four wave levels, then the boss level, no bunkers', () => {
  assert.equal(PRESS.length, 1);
  assert.equal(specs.length, LEVELS_A_WORLD);
  for (const s of waveSpecs) assert.ok(Array.isArray(s.waves));
  assert.equal(specs.at(-1).waves, undefined, 'the boss level has no waves');
  for (const s of specs) assert.equal(s.bunkers, false);
});

test('world 20 wave levels follow the level data rules', () => {
  waveSpecs.forEach((s, li) => {
    assert.ok(s.waves.length >= MIN_WAVES && s.waves.length <= MAX_WAVES, `w20-${li + 1} waves`);
    assert.ok(s.waves.some((x) => x.roles.includes('carrier')), `w20-${li + 1} has no carrier`);
    s.waves.forEach((x, wi) => {
      const at = `w20-${li + 1} wave ${wi}`;
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

test('world 20 seeds are integers, distinct from each other and from every listed level', () => {
  const seeds = specs.map((s) => s.seed);
  for (const s of seeds) assert.ok(Number.isInteger(s));
  assert.equal(new Set(seeds).size, seeds.length);
  const listed = new Set(LEVELS.map((l) => l.seed));
  for (const s of seeds) assert.ok(!listed.has(s), `seed ${s} is taken`);
});

test('world 20 has its own difficulty row, from 0 to 1 and no easier than world 19, level for level', () => {
  // The main curve would put world 20 past 1, so the range check also proves the row is its own.
  for (const i of indices) {
    const d = difficulty(WORLD, i);
    assert.ok(d >= 0 && d <= 1, `w20-${i}`);
    assert.ok(d >= difficulty(PREV, i), `w20-${i} no easier than w19-${i}`);
  }
});

test('WORLDS and LEVELS are unchanged: world 20 is not listed yet', () => {
  assert.equal(WORLDS.length, LISTED_WORLDS);
  assert.equal(LEVELS.length, LISTED_WORLDS * LEVELS_A_WORLD);
  assert.ok(LEVELS.every((l) => l.world !== WORLD));
});

test('every code file is under 200 lines', () => {
  const walk = (dir) => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const files = [...walk('src'), ...walk('test')].filter((p) => /\.(js|mjs|html|css)$/.test(p));
  for (const p of files) assert.ok(readFileSync(p, 'utf8').split('\n').length - 1 < MAX_FILE_LINES, p);
});
