import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bossDef } from '../../src/core/bosses-data.js';
import { HUD_BOTTOM } from '../../src/core/kinds.js';

// The Vesper Moth (world 16) never charges, keeps its heart and eyespots clear of the HUD at the top of
// its orbit, ends no lower than the grimoire, and works its attacks from the parts the picture gives it:
// aimed bolts from the eyespots, fans and glass-scale rain from the wings, rings from the abdomen, the
// laser from the heart. (The generic rules for every boss are in boss-data.test.js.)
const moth = bossDef('moth');
const part = (id) => moth.parts.find((p) => p.id === id);
const from = (pattern, id) => moth.phases.flatMap((p) => p.attacks).some((a) => a.pattern === pattern && a.from.startsWith(id));
const box = (p) => ({ l: p.dx - p.w / 2, r: p.dx + p.w / 2, t: p.dy - p.h / 2, b: p.dy + p.h / 2 });
const overlap = (p, q) => {
  const [a, b] = [box(p), box(q)];
  return a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
};

test('the Vesper Moth rests at 260, 760 x 340, with hp near the angler\'s and no lower than the grimoire', () => {
  assert.equal(moth.name, 'The Vesper Moth');
  assert.equal(moth.y, 260);
  assert.deepEqual([moth.size.w, moth.size.h], [760, 340]);
  assert.ok(Math.abs(moth.maxHp - bossDef('angler').maxHp) <= 10, `${moth.maxHp} hp, about the angler's`);
  assert.ok(moth.bottom <= bossDef('grimoire').bottom, 'no lower than the grimoire');
  assert.deepEqual(moth.parts.map((p) => p.id), ['crown', 'heart', 'wingL', 'wingR', 'spotL', 'spotR', 'tail']);
});

test('no two parts overlap, and the wings and eyespots are mirror images', () => {
  for (const p of moth.parts) {
    for (const q of moth.parts) assert.ok(p === q || !overlap(p, q), `${p.id} and ${q.id} overlap`);
  }
  for (const [l, r] of [['wingL', 'wingR'], ['spotL', 'spotR']]) {
    const [a, b] = [part(l), part(r)];
    assert.deepEqual([a.dx, a.dy, a.w, a.h, a.hp], [-b.dx, b.dy, b.w, b.h, b.hp], `${l} mirrors ${r}`);
  }
  for (const id of ['crown', 'heart', 'tail']) assert.equal(part(id).dx, 0, `${id} on the axis`);
});

test('the parts: weak heart, eyespots and abdomen; armoured crown and wings; the face clears the HUD at the top of the orbit', () => {
  for (const id of ['heart', 'spotL', 'spotR', 'tail']) assert.ok(part(id).weak, id);
  for (const id of ['crown', 'wingL', 'wingR']) assert.ok(part(id).armor, id);
  for (const id of ['heart', 'spotL', 'spotR']) {
    const p = part(id);
    assert.ok(moth.y + p.dy - p.h / 2 - 55 >= HUD_BOTTOM, `${id} clears the HUD at the top of the orbit`);
  }
  assert.equal(moth.y + part('crown').dy - part('crown').h / 2, 102, 'the antennae stop at y -158: the crown tops the moth just under the HUD');
});

test('from below, a shot straight up meets a weak part first across the abdomen, the heart and the eyespots', () => {
  const first = (x) => moth.parts.filter((p) => Math.abs(p.dx - x) <= p.w / 2).sort((a, b) => (b.dy + b.h / 2) - (a.dy + a.h / 2))[0];
  for (const x of [0, 40, -40, 60, -60, 150, -150, 200, -200, 250, -250]) assert.ok(first(x)?.weak, `a weak part first from below at x ${x}`);
});

test('sways, hovers and circles, never charges; aimed from the eyespots, fans and rain from the wings, rings from the tail', () => {
  assert.deepEqual(moth.phases.map((p) => p.move), ['sway', 'hover', 'orbit']);
  assert.ok(from('aimed', 'spot') && !from('aimed', 'heart') && !from('aimed', 'wing'), 'aimed bolts from the eyespots only');
  assert.ok(from('fan', 'wing'), 'fans from the wings');
  assert.ok(from('rain', 'wing'), 'glass scales (rain) from the wings');
  assert.ok(from('ring', 'tail'), 'rings from the abdomen');
});

test('the laser comes from the heart in the last phase only', () => {
  assert.ok(from('laser', 'heart'), 'the laser from the heart');
  assert.ok(!moth.phases.slice(0, 2).some((p) => p.attacks.some((a) => a.pattern === 'laser')), 'not before the last phase');
  assert.ok(moth.phases.at(-1).attacks.some((a) => a.pattern === 'laser'), 'in the last phase');
});

test('divers come out of the wings in phases 2 and 3, none in the first; a carrier every phase', () => {
  assert.ok(moth.phases.slice(1).every((p) => p.minions.some((m) => m.role === 'diver' && m.from.startsWith('wing'))), 'divers from the wings');
  assert.ok(!moth.phases[0].minions.some((m) => m.role === 'diver'), 'none in the first');
  assert.ok(moth.phases.every((p) => p.minions.some((m) => m.role === 'carrier' && m.every <= 5)), 'a carrier at least every 5 s');
});
