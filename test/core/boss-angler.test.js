import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bossDef } from '../../src/core/bosses-data.js';
import { HUD_BOTTOM } from '../../src/core/kinds.js';

// The Lantern Leviathan (world 15) never charges, keeps its maw and eyes clear of the HUD at the top of
// its orbit, ends no lower than the carousel, and works its attacks from the parts the picture gives
// it: aimed bolts and the laser from the maw, fans from the eyes, spines (rain) from the crest, rings
// from the belly. (The generic rules for every boss are in boss-data.test.js.)
const angler = bossDef('angler');
const part = (id) => angler.parts.find((p) => p.id === id);
const from = (pattern, id) => angler.phases.flatMap((p) => p.attacks).some((a) => a.pattern === pattern && a.from.startsWith(id));

test('the Lantern Leviathan rests at 260, 700 x 340, with hp near the carousel\'s and no lower than it', () => {
  assert.equal(angler.name, 'The Lantern Leviathan');
  assert.equal(angler.y, 260);
  assert.deepEqual([angler.size.w, angler.size.h], [700, 340]);
  assert.ok(Math.abs(angler.maxHp - bossDef('carousel').maxHp) <= 10, `${angler.maxHp} hp, about the carousel's`);
  assert.ok(angler.bottom <= bossDef('carousel').bottom, 'no lower than the carousel');
  assert.deepEqual(angler.parts.map((p) => p.id), ['crest', 'maw', 'finL', 'finR', 'eyeL', 'eyeR', 'belly']);
});

test('the parts: weak maw, eyes and belly; armoured crest and fins; the face clears the HUD at the top of the orbit', () => {
  for (const id of ['maw', 'eyeL', 'eyeR', 'belly']) assert.ok(part(id).weak, id);
  for (const id of ['crest', 'finL', 'finR']) assert.ok(part(id).armor, id);
  for (const id of ['maw', 'eyeL', 'eyeR']) {
    const p = part(id);
    assert.ok(angler.y + p.dy - p.h / 2 - 55 >= HUD_BOTTOM, `${id} clears the HUD at the top of the orbit`);
  }
  assert.ok(angler.y + part('crest').dy - part('crest').h / 2 >= HUD_BOTTOM + 4, 'the crest, where the lure rises from, is below the HUD at rest');
});

test('from below, a shot straight up meets a weak part first across the maw, the eyes and the belly', () => {
  const first = (x) => angler.parts.filter((p) => Math.abs(p.dx - x) <= p.w / 2).sort((a, b) => (b.dy + b.h / 2) - (a.dy + a.h / 2))[0];
  for (const x of [0, 60, -60, 100, -100, 155, -155]) assert.ok(first(x)?.weak, `a weak part first from below at x ${x}`);
});

// The maelstrom (the gravity well at 960, 300) sits just under the maw at rest and swallows what it
// fires, so the aimed bolts come from the eyes; the laser, a beam the well does not bend, from the maw.
test('sways, hovers and circles, never charges; shoots from its eyes, maw, crest and belly; the laser only at the end', () => {
  assert.deepEqual(angler.phases.map((p) => p.move), ['sway', 'hover', 'orbit']);
  assert.ok(from('aimed', 'eye') && !from('aimed', 'maw'), 'aimed bolts from the eyes, none from the maw');
  assert.ok(from('laser', 'maw'), 'the laser from the maw');
  assert.ok(from('fan', 'eye'), 'fans from the eyes');
  assert.ok(from('rain', 'crest'), 'spines from the crest');
  assert.ok(from('ring', 'belly'), 'rings from the belly');
  assert.ok(!angler.phases.slice(0, 2).some((p) => p.attacks.some((a) => a.pattern === 'laser')), 'the laser only in the last phase');
  assert.ok(angler.phases.at(-1).attacks.some((a) => a.pattern === 'laser'), 'the laser in the last phase');
});

test('divers come out of the fins in phases 2 and 3, none in the first; a carrier every phase', () => {
  assert.ok(angler.phases.slice(1).every((p) => p.minions.some((m) => m.role === 'diver' && m.from.startsWith('fin'))), 'divers from the fins');
  assert.ok(!angler.phases[0].minions.some((m) => m.role === 'diver'), 'none in the first');
  assert.ok(angler.phases.every((p) => p.minions.some((m) => m.role === 'carrier' && m.every <= 5)), 'a carrier at least every 5 s');
});
