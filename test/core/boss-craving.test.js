import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bossDef } from '../../src/core/bosses-data.js';
import { HUD_BOTTOM } from '../../src/core/kinds.js';

// The Craving (world 17) never charges, keeps its eyes and maw clear of the HUD at the top of its
// orbit, ends no lower than the grimoire, and works its attacks from the parts the picture gives it:
// aimed bolts from the eyes, fans from the claws, rain from the crown, rings from the tray, the laser
// and homing shots from the maw (and an eye in the last phase). (The generic rules for every boss are in boss-data.test.js.)
const craving = bossDef('craving');
const moth = bossDef('moth');
const part = (id) => craving.parts.find((p) => p.id === id);
const from = (pattern, id) => craving.phases.flatMap((p) => p.attacks).some((a) => a.pattern === pattern && a.from.startsWith(id));
const box = (p) => ({ l: p.dx - p.w / 2, r: p.dx + p.w / 2, t: p.dy - p.h / 2, b: p.dy + p.h / 2 });
const overlap = (p, q) => {
  const [a, b] = [box(p), box(q)];
  return a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
};

test('the Craving rests at 380, 740 x 340, heavier than the moth and the titan and no lower than the grimoire', () => {
  assert.equal(craving.name, 'The Craving');
  assert.equal(craving.y, 380);
  assert.deepEqual([craving.size.w, craving.size.h], [740, 340]);
  assert.ok(craving.maxHp > moth.maxHp && craving.maxHp > bossDef('titan').maxHp && craving.maxHp <= 280, `${craving.maxHp} hp, above the moth's ${moth.maxHp}`);
  assert.ok(craving.bottom <= bossDef('grimoire').bottom, 'no lower than the grimoire');
  assert.deepEqual(craving.parts.map((p) => p.id), ['crown', 'maw', 'clawL', 'clawR', 'eyeL', 'eyeR', 'tray']);
});

test('no two parts overlap, and the claws and eyes are mirror images', () => {
  for (const p of craving.parts) {
    for (const q of craving.parts) assert.ok(p === q || !overlap(p, q), `${p.id} and ${q.id} overlap`);
  }
  for (const [l, r] of [['clawL', 'clawR'], ['eyeL', 'eyeR']]) {
    const [a, b] = [part(l), part(r)];
    assert.deepEqual([a.dx, a.dy, a.w, a.h, a.hp], [-b.dx, b.dy, b.w, b.h, b.hp], `${l} mirrors ${r}`);
  }
  for (const id of ['crown', 'maw', 'tray']) assert.equal(part(id).dx, 0, `${id} on the axis`);
});

test('the parts: weak maw, eyes and tray; armoured crown and claws; the face clears the HUD at the top of the orbit', () => {
  for (const id of ['maw', 'eyeL', 'eyeR', 'tray']) assert.ok(part(id).weak, id);
  for (const id of ['crown', 'clawL', 'clawR']) assert.ok(part(id).armor, id);
  for (const id of ['maw', 'eyeL', 'eyeR']) {
    const p = part(id);
    assert.ok(craving.y + p.dy - p.h / 2 - 55 >= HUD_BOTTOM, `${id} clears the HUD at the top of the orbit`);
  }
  assert.equal(part('crown').dy - part('crown').h / 2, -158, 'no art above y -158: the crown tops the Craving');
  assert.ok(craving.y - 158 - 55 >= HUD_BOTTOM, 'and is clear of the HUD at the top of the orbit');
});

test('from below, a shot straight up meets a weak part first across the tray, the maw column and the eyes', () => {
  const first = (x) => craving.parts.filter((p) => Math.abs(p.dx - x) <= p.w / 2).sort((a, b) => (b.dy + b.h / 2) - (a.dy + a.h / 2))[0];
  for (const x of [0, 40, -40, 70, -70, 100, -100, 140, -140, 150, -150, 200, -200]) assert.ok(first(x)?.weak, `a weak part first from below at x ${x}`);
});

test('sways, hovers and circles, never charges; aimed from the eyes, fans from the claws, rain from the crown, rings from the tray', () => {
  assert.deepEqual(craving.phases.map((p) => p.move), ['sway', 'hover', 'orbit']);
  assert.ok(from('aimed', 'eye') && !from('aimed', 'maw') && !from('aimed', 'claw'), 'aimed bolts from the eyes only');
  assert.ok(from('fan', 'claw'), 'fans from the claws');
  assert.ok(from('rain', 'crown'), 'falling embers and ash (rain) from the crown');
  assert.ok(from('ring', 'tray'), 'rings from the tray');
});

test('the laser and the homing shots come in the hover and the last phase, never in the first; the laser from the maw only', () => {
  const has = (p, pattern) => p.attacks.some((a) => a.pattern === pattern);
  assert.ok(from('laser', 'maw') && !from('laser', 'eye') && !from('laser', 'claw'), 'the laser from the maw');
  assert.ok(!has(craving.phases[0], 'laser') && !has(craving.phases[0], 'homing'), 'not in the first phase');
  for (const p of craving.phases.slice(1)) assert.ok(has(p, 'laser') && has(p, 'homing'), `in the ${p.move} phase`);
});

test('divers come out of the claws in phases 2 and 3, none in the first; a carrier every phase', () => {
  assert.ok(craving.phases.slice(1).every((p) => p.minions.some((m) => m.role === 'diver' && m.from.startsWith('claw'))), 'divers from the claws');
  assert.ok(!craving.phases[0].minions.some((m) => m.role === 'diver'), 'none in the first');
  assert.ok(craving.phases.every((p) => p.minions.some((m) => m.role === 'carrier' && m.every <= 5)), 'a carrier at least every 5 s');
});
