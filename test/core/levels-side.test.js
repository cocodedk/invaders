import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, levelById } from '../../src/core/levels.js';

// The side worlds' own level rules (worlds 11 to 17): where each puts its bunkers and what its waves
// lean on. The rules every level keeps are levels.test.js.
const waveLevels = LEVELS.filter((l) => l.index < 5);
const aliens = (w) => w.rows * w.cols;

test('world 11 has glacier bunkers on levels 2 and 4 only, and most of its waves fire ice shards', () => {
  const w11 = waveLevels.filter((x) => x.world === 11);
  assert.deepEqual(w11.map((l) => l.bunkers), [false, true, false, true]);
  const waves = w11.flatMap((l) => l.waves);
  assert.ok(waves.filter((x) => x.pattern === 'shuriken').length > waves.length / 2, 'mostly shuriken');
  for (const l of w11.slice(1)) assert.ok(l.waves.some((x) => x.roles.includes('armored')), `${l.id} has an armored row`);
});

test('world 12 has tome-stack bunkers on levels 1 and 3 only, and an armored row from level 2 on', () => {
  const w12 = waveLevels.filter((x) => x.world === 12);
  assert.deepEqual(w12.map((l) => l.bunkers), [true, false, true, false]);
  const waves = w12.flatMap((l) => l.waves);
  assert.ok(new Set(waves.map((x) => x.pattern)).size >= 4, 'a mix of bullet patterns');
  for (const l of w12.slice(1)) assert.ok(l.waves.some((x) => x.roles.includes('armored')), `${l.id} has an armored row`);
});

test('world 13 has cargo-crate bunkers on levels 2 and 4 only, and divers in most of its waves', () => {
  const w13 = waveLevels.filter((x) => x.world === 13);
  assert.equal(w13.length, 4);
  assert.deepEqual(w13.map((l) => l.bunkers), [false, true, false, true]);
  assert.ok(w13.every((l) => l.twist === 'broadside'), 'the broadside twist');
  const waves = w13.flatMap((l) => l.waves);
  const divers = waves.filter((x) => x.formation === 'dive' || x.roles.includes('diver'));
  assert.ok(divers.length > waves.length / 2, `${divers.length} of ${waves.length} waves have divers, for the side guns`);
  assert.ok(w13.filter((l) => l.waves.some((x) => x.formation === 'dive')).length >= 3, 'dive formations in most levels');
  assert.ok(new Set(waves.map((x) => x.pattern)).size >= 4, 'a mix of bullet patterns');
  for (const l of w13.slice(1)) assert.ok(l.waves.some((x) => x.roles.includes('armored')), `${l.id} has an armored row`);
  assert.equal(levelById('w13-5').boss, 'galleon');
});

test('world 14 has striped-booth bunkers on levels 2 and 4 only, and dense blocks of rows for the shells', () => {
  const w14 = waveLevels.filter((x) => x.world === 14);
  assert.equal(w14.length, 4);
  assert.deepEqual(w14.map((l) => l.bunkers), [false, true, false, true]);
  assert.ok(w14.every((l) => l.twist === 'fireworks'), 'the fireworks twist');
  const waves = w14.flatMap((l) => l.waves);
  const dense = waves.filter((x) => x.rows >= 3 && x.cols >= 8);
  assert.ok(dense.length > waves.length / 2, `${dense.length} of ${waves.length} waves are blocks of 3+ rows and 8+ columns`);
  assert.ok(new Set(waves.map((x) => x.pattern)).size >= 4, 'a mix of bullet patterns');
  for (const l of w14.slice(1)) assert.ok(l.waves.some((x) => x.roles.includes('armored')), `${l.id} has an armored row`);
  assert.deepEqual(w14.map((l) => l.seed), [140417, 140884, 141333, 141796]);
  assert.equal(levelById('w14-5').boss, 'carousel');
});

test('world 15 has reef bunkers on levels 2 and 4 only, divers in most waves and deep columns for the trident', () => {
  const w15 = waveLevels.filter((x) => x.world === 15);
  assert.equal(w15.length, 4);
  assert.deepEqual(w15.map((l) => l.bunkers), [false, true, false, true]);
  assert.ok(w15.every((l) => l.twist === 'gravity'), 'the gravity well, drawn as the maelstrom');
  const waves = w15.flatMap((l) => l.waves);
  const divers = waves.filter((x) => x.roles.includes('diver'));
  assert.ok(divers.length > waves.length / 2, `${divers.length} of ${waves.length} waves have divers, for the pearls`);
  const deep = waves.filter((x) => x.rows >= 4);
  assert.ok(deep.length > waves.length / 2, `${deep.length} of ${waves.length} waves are columns of 4+ rows, for the trident`);
  assert.ok(new Set(waves.map((x) => x.pattern)).size >= 4, 'a mix of bullet patterns');
  assert.deepEqual(w15.map((l) => l.seed), [150417, 150884, 151333, 151796]);
  assert.equal(levelById('w15-5').boss, 'angler');
});

test('world 16 has stained-glass bunkers on levels 2 and 4 only, and on every level an armored row and a wide one', () => {
  const w16 = waveLevels.filter((x) => x.world === 16);
  assert.equal(w16.length, 4);
  assert.deepEqual(w16.map((l) => l.bunkers), [false, true, false, true]);
  assert.ok(w16.every((l) => l.twist === 'reassemble'), "world 7's reassemble, drawn as glass that mends itself");
  const waves = w16.flatMap((l) => l.waves);
  // Re-forming gargoyles are costly at this d (a row of eight made w16-1 a third harder at lag 15), so
  // the levels carry armored rows sparingly: enough on every level for the twist to show.
  for (const l of w16) assert.ok(l.waves.some((x) => x.roles.includes('armored')), `${l.id} has an armored row, for the twist`);
  for (const l of w16) assert.ok(l.waves.some((x) => x.cols >= 8), `${l.id} has a wave 8+ columns wide, for the mirror twin`);
  assert.ok(new Set(waves.map((x) => x.pattern)).size >= 4, 'a mix of bullet patterns');
  assert.deepEqual(w16.map((l) => l.seed), [160417, 160884, 161333, 161796]);
  assert.equal(levelById('w16-5').boss, 'moth');
  assert.equal(levelById('w16-5').seed, 162241);
});

test('world 17 has clean-air-filter bunkers on levels 2 and 4 only, fast waves of gunner rows, and few armored rows', () => {
  const w17 = waveLevels.filter((x) => x.world === 17);
  assert.equal(w17.length, 4);
  assert.deepEqual(w17.map((l) => l.bunkers), [false, true, false, true]);
  assert.ok(w17.every((l) => l.twist === 'breath'), 'the breath twist');
  const waves = w17.flatMap((l) => l.waves);
  const gunners = waves.filter((x) => x.roles.includes('gunner'));
  assert.ok(gunners.length > waves.length * 0.7, `${gunners.length} of ${waves.length} waves have a gunner row`);
  assert.ok(waves.every((x) => x.speed >= 1.15), 'fast waves');
  // The cigars (armored) are costly at this d and re-forming is world 7's: one row to a wave, and not in most.
  assert.ok(waves.every((x) => x.roles.filter((r) => r === 'armored').length <= 1), 'at most one armored row a wave');
  assert.ok(waves.filter((x) => x.roles.includes('armored')).length < waves.length / 2, 'armored rows in under half the waves');
  const patterns = new Set(waves.map((x) => x.pattern));
  for (const p of ['aimed', 'fan', 'ring', 'laser']) assert.ok(patterns.has(p), `${p} among the patterns`);
  assert.ok(waves.filter((x) => x.pattern === 'laser').length <= 2, 'a laser only now and then');
  assert.deepEqual(w17.map((l) => l.seed), [170391, 170862, 171347, 171814]);
  assert.equal(levelById('w17-5').boss, 'craving');
  assert.equal(levelById('w17-5').seed, 172259);
});

