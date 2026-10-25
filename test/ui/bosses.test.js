import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_DEFS } from '../../src/core/bosses-data.js';
import { CHAIN } from '../../src/core/boss-phase.js';
import { BOSS_ART, painterFor } from '../../src/ui/bosses/bake.js';
import { partStage } from '../../src/ui/bosses/index.js';
import { collapse } from '../../src/ui/bosses/death.js';
import { wellLight } from '../../src/ui/sky-bodies-2.js';
import { levelById } from '../../src/core/levels.js';

const parts = (kind) => BOSS_DEFS.find((d) => d.kind === kind).parts.map((p) => ({ ...p }));
const dying = (kind, left) => ({ kind, dying: left, parts: parts(kind) });

test('every boss has a hull painter and a painter for every one of its parts (the parts are the hit boxes)', () => {
  assert.equal(Object.keys(BOSS_ART).length, 17);
  for (const def of BOSS_DEFS) {
    const art = BOSS_ART[def.kind];
    assert.ok(art, `${def.kind} has art`);
    assert.equal(typeof art.hull, 'function', `${def.kind} hull`);
    for (const p of def.parts) {
      const found = painterFor(art, p.id);
      assert.ok(found, `${def.kind}.${p.id} has a painter`);
      assert.equal(typeof found[0], 'function');
    }
  }
});

test('a right-hand part without its own painter is its left twin mirrored', () => {
  const art = { parts: { gun: () => {}, eyeR: () => {} } };
  assert.equal(painterFor(art, 'gunL')[1], 1);
  assert.equal(painterFor(art, 'gunR')[1], -1);
  assert.equal(painterFor(art, 'eyeR')[1], 1, 'its own painter is not mirrored');
  assert.equal(painterFor(art, 'dome'), null);
});

test("the behemoth's gills and claws are drawn once, as the left ones, and mirrored for the right", () => {
  const art = BOSS_ART.behemoth;
  for (const base of ['gill', 'claw']) {
    assert.deepEqual(painterFor(art, `${base}L`), [art.parts[base], 1]);
    assert.deepEqual(painterFor(art, `${base}R`), [art.parts[base], -1]);
  }
  for (const id of ['crest', 'skull', 'maw']) assert.equal(painterFor(art, id)[1], 1, `${id} is drawn as it is`);
  assert.equal(art.rage.length, 3, 'one rage layer per phase');
  assert.equal(art.rage[0], null, 'the first phase is the beast at rest');
});

test("the Count's wings and claws are drawn once, as the left ones, and mirrored for the right", () => {
  const art = BOSS_ART.count;
  for (const base of ['wing', 'claw']) {
    assert.deepEqual(painterFor(art, `${base}L`), [art.parts[base], 1]);
    assert.deepEqual(painterFor(art, `${base}R`), [art.parts[base], -1]);
  }
  for (const id of ['collar', 'head', 'heart']) assert.equal(painterFor(art, id)[1], 1, `${id} is drawn as it is`);
  assert.equal(art.rage.length, 3, 'one rage layer per phase');
  assert.equal(art.rage[0], null, 'the first phase is the lord at rest');
  assert.equal(typeof art.live, 'function', 'the swarm and the heartbeat are live extras');
});

test("the wyrm's gems and coils are drawn once, as the left ones, and mirrored for the right", () => {
  const art = BOSS_ART.wyrm;
  for (const base of ['gem', 'coil']) {
    assert.deepEqual(painterFor(art, `${base}L`), [art.parts[base], 1]);
    assert.deepEqual(painterFor(art, `${base}R`), [art.parts[base], -1]);
  }
  for (const id of ['crest', 'head', 'maw']) assert.equal(painterFor(art, id)[1], 1, `${id} is drawn as it is`);
  assert.equal(art.rage.length, 3, 'one rage layer per phase');
  assert.equal(art.rage[0], null, 'the first phase is the serpent at rest');
  assert.equal(typeof art.live, 'function', 'the breath and the blizzard are live extras');
});

test("the grimoire's pages and quills are drawn once, as the left ones, and mirrored for the right", () => {
  const art = BOSS_ART.grimoire;
  for (const base of ['page', 'quill']) {
    assert.deepEqual(painterFor(art, `${base}L`), [art.parts[base], 1]);
    assert.deepEqual(painterFor(art, `${base}R`), [art.parts[base], -1]);
  }
  for (const id of ['crown', 'eye', 'clasp']) assert.equal(painterFor(art, id)[1], 1, `${id} is drawn as it is`);
  assert.equal(art.rage.length, 3, 'one rage layer per phase');
  assert.equal(art.rage[0], null, 'the first phase is the book at rest');
  assert.equal(typeof art.live, 'function', 'the script, the pupil and the storm are live extras');
  assert.equal(typeof art.warm, 'function', 'whose sprites are baked ahead of the fight');
});

test('armour shows the hp it has lost out of its max: whole, cracked, badly cracked', () => {
  assert.deepEqual([8, 7.75, 5, 4, 3.9, 1, 0.25].map((hp) => partStage({ hp, max: 8 })), [0, 1, 1, 1, 2, 2, 2]);
  assert.equal(partStage({ hp: 0, max: 8 }), 2, 'a destroyed part is drawn as wreckage, not by stage, but never throws');
  assert.equal(partStage({ hp: 3, max: 3 }), 0);
});

test('the collapse starts whole and ends with every part torn off and the hull broken apart', () => {
  const start = collapse(dying('titan', CHAIN), 0);
  assert.equal(start.split, 0);
  assert.ok(start.parts.every((p) => p === null), 'nothing torn off at the start');
  const end = collapse(dying('titan', 0.001), 0.95);
  assert.ok(end.split > 0.99, 'the hull has broken');
  assert.ok(end.parts.every((p) => p !== null), 'every part torn off by the end');
  const [left, right] = end.halves;
  assert.ok(left.dx < 0 && right.dx > 0, 'the halves part sideways');
  assert.ok(left.rot < 0 && right.rot > 0, 'and droop outward');
  assert.ok(end.white > 0.9, 'white-hot at the end');
});

test("on the Singularity's level the sky's own black hole steps back to faint lensing (R29)", () => {
  assert.equal(wellLight(levelById('w8-5')), 0.35, 'the boss level dims the well');
  for (const id of ['w8-1', 'w8-4']) assert.equal(wellLight(levelById(id)), 1, `${id} keeps it whole`);
  assert.equal(wellLight(null), 1, 'the alien sheet (no level) keeps it whole');
});

test('the collapse is a pure function of the boss and the chain left (replays and trailer clips match)', () => {
  for (const def of BOSS_DEFS) {
    const a = collapse(dying(def.kind, CHAIN * 0.4), 1.7);
    const b = collapse(dying(def.kind, CHAIN * 0.4), 1.7);
    assert.deepEqual(a, b, def.kind);
    const torn = a.parts.filter(Boolean);
    assert.ok(torn.length > 0 && torn.length < def.parts.length, `${def.kind}: parts tear off one by one`);
  }
});
