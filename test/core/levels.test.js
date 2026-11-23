import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS, LEVELS, DEMO_LEVEL, FREE_FROM, levelById, reelName } from '../../src/core/levels.js';
import { difficulty } from '../../src/core/difficulty.js';
import { ROLES, FORMATIONS, PATTERNS, TWISTS, BOSSES } from '../../src/core/kinds.js';
import { JOURNEY } from '../../src/core/levels-8.js';

// A course level (world 22) has neither waves nor a boss: it is a third kind beside the wave levels and the boss levels.
const courseLevels = LEVELS.filter((l) => l.course);
const waveLevels = LEVELS.filter((l) => !l.course && l.index < 5);
const bossLevels = LEVELS.filter((l) => !l.course && l.index === 5);
const REELS = 5; // the levels in a world of waves and a boss
const LEGS = JOURNEY[0].length; // the levels in the course world: a leg each
const waveWorlds = WORLDS.filter((w) => w.boss);
const aliens = (w) => w.rows * w.cols;

function assertWaveValid(w, at) {
  assert.ok(FORMATIONS.includes(w.formation), `${at} formation ${w.formation}`);
  assert.ok(PATTERNS.includes(w.pattern), `${at} pattern ${w.pattern}`);
  assert.ok(Number.isInteger(w.rows) && w.rows >= 1, `${at} rows`);
  assert.ok(Number.isInteger(w.cols) && w.cols >= 1, `${at} cols`);
  assert.equal(w.roles.length, w.rows, `${at} one role per row`);
  for (const r of w.roles) assert.ok(r in ROLES, `${at} role ${r}`);
  assert.ok(typeof w.speed === 'number' && w.speed > 0, `${at} speed`);
  assert.ok(aliens(w) <= 40, `${at} has ${aliens(w)} aliens`);
}

test('WORLDS has the worlds with names, twists and bosses in the spec order; every world from 18 on flies free', () => {
  assert.deepEqual(WORLDS.map((w) => w.id), WORLDS.map((_, i) => i + 1));
  assert.deepEqual(WORLDS.map((w) => w.name), ['Arcade Origin', 'Neon Rain', 'Twin Suns',
    'Ronin Moon', 'Hive', 'Code Rain', 'Iron Dawn', 'Event Horizon', 'Tidal Siege', 'Hollow Night', 'Aurora Kingdom',
    'Starlit Archive', 'Sunset Armada', 'Ember Carnival', 'Lantern Deep', 'Glass Cathedral', 'Ash to Air', 'Anvil Sky', 'Rubber Regatta', 'Midnight Press', 'Golden Isle', 'Wanderlight']);
  assert.deepEqual(WORLDS.map((w) => w.twist), TWISTS);
  assert.deepEqual(waveWorlds.map((w) => w.boss), BOSSES); // every world has its boss, but the last: a course has none
  assert.deepEqual(WORLDS.at(-1), { id: WORLDS.length, name: 'Wanderlight', twist: 'journey', boss: undefined, free: true });
  assert.equal(FREE_FROM, 18);
  for (const w of WORLDS) assert.equal(w.free, w.id >= FREE_FROM, `world ${w.id} free`);
});

test('the levels run in order with unique ids that match world and index: five a world, but a course world has a level a leg', () => {
  assert.equal(LEVELS.length, waveWorlds.length * REELS + courseLevels.length);
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, LEVELS.length);
  let at = 0;
  for (const world of WORLDS) {
    const mine = LEVELS.filter((l) => l.world === world.id);
    assert.equal(mine.length, world.boss ? REELS : LEGS, `world ${world.id}`);
    mine.forEach((l, i) => {
      assert.equal(LEVELS[at++], l, 'in world order');
      assert.equal(l.index, i + 1);
      assert.equal(l.id, `w${l.world}-${l.index}`);
    });
  }
  assert.equal(at, LEVELS.length);
});

test('every level has waves, a boss or a course, and only one of them', () => {
  for (const l of LEVELS) assert.equal(['waves', 'boss', 'course'].filter((k) => k in l).length, 1, l.id);
  assert.deepEqual(courseLevels.map((l) => l.world), Array(LEGS).fill(WORLDS.length), 'the course world is the last, and has a level a leg');
  courseLevels.forEach((l, i) => assert.equal(levelById(`w${WORLDS.length}-${i + 1}`).course, l.course));
  for (const l of courseLevels) assert.equal(reelName(l), `Leg ${l.index}`);
});

test('every level has an integer seed (all distinct), its difficulty and its world twist', () => {
  for (const l of LEVELS) {
    assert.ok(Number.isInteger(l.seed), `${l.id} seed`);
    assert.equal(l.d, difficulty(l.world, l.index), `${l.id} d`);
    assert.equal(l.twist, WORLDS[l.world - 1].twist, `${l.id} twist`);
    assert.equal(typeof l.bunkers, 'boolean', `${l.id} bunkers`);
  }
  assert.equal(new Set(LEVELS.map((l) => l.seed)).size, LEVELS.length);
  for (const l of LEVELS) assert.equal(l.free, l.world >= FREE_FROM ? true : undefined, `${l.id} free`);
});

test('every wave of every level is valid against kinds.js', () => {
  for (const l of waveLevels) l.waves.forEach((w, i) => assertWaveValid(w, `${l.id} wave ${i}`));
});

test('wave levels have 3 to 5 waves and at least one carrier', () => {
  for (const l of waveLevels) {
    assert.ok(l.waves.length >= 3 && l.waves.length <= 5, `${l.id} has ${l.waves.length} waves`);
    assert.ok(l.waves.some((w) => w.roles.includes('carrier')), `${l.id} has no carrier`);
    assert.ok(!('boss' in l), `${l.id} has a boss`);
  }
});

test('boss levels name their world boss and have no waves or bunkers', () => {
  assert.equal(bossLevels.length, BOSSES.length);
  for (const l of bossLevels) {
    assert.equal(l.boss, BOSSES[l.world - 1], l.id);
    assert.ok(!('waves' in l), `${l.id} has waves`);
    assert.equal(l.bunkers, false, `${l.id} bunkers`);
  }
});

test('each world uses at least 4 different formations across its wave levels', () => {
  for (const { id: world } of waveWorlds) {
    const used = new Set(waveLevels.filter((l) => l.world === world)
      .flatMap((l) => l.waves.map((w) => w.formation)));
    assert.ok(used.size >= 4, `world ${world} uses only ${[...used]}`);
  }
});

test('world 1 has bunkers on every wave level, world 4 waves all fire shuriken', () => {
  for (const l of waveLevels.filter((x) => x.world === 1)) assert.equal(l.bunkers, true, l.id);
  for (const l of waveLevels.filter((x) => x.world === 4)) {
    for (const w of l.waves) assert.equal(w.pattern, 'shuriken', l.id);
  }
});

test('levels are plain data: a JSON round trip changes nothing', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(LEVELS)), LEVELS);
});

test('DEMO_LEVEL is a gentle world 1 level: a 6x3 grunt grid, then a sway with one carrier', () => {
  assert.equal(DEMO_LEVEL.world, 1);
  assert.equal(DEMO_LEVEL.d, 0);
  assert.ok(Number.isInteger(DEMO_LEVEL.seed));
  assert.equal(DEMO_LEVEL.waves.length, 2);
  DEMO_LEVEL.waves.forEach((w, i) => assertWaveValid(w, `demo wave ${i}`));
  const [first, second] = DEMO_LEVEL.waves;
  assert.deepEqual([first.formation, first.rows, first.cols], ['grid', 3, 6]);
  assert.ok(first.roles.every((r) => r === 'grunt'));
  assert.equal(second.formation, 'sway');
  const carriers = second.roles.filter((r) => r === 'carrier').length * second.cols;
  assert.equal(carriers, 1);
  assert.ok(LEVELS.every((l) => l.id !== DEMO_LEVEL.id));
});

test('levelById finds every level and returns undefined for an unknown id', () => {
  for (const l of LEVELS) assert.equal(levelById(l.id), l);
  assert.equal(levelById(`w${WORLDS.length + 1}-1`), undefined);
  assert.equal(levelById(''), undefined);
});
