import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bossDef } from '../../src/core/bosses-data.js';
import { HUD_BOTTOM } from '../../src/core/kinds.js';

// The Squall Ray (world 18, the first free-flight world, R67) never charges, keeps its weak parts clear of
// the HUD at the top of its orbit, and is built to be fought from every side: the wing-tip coils stand
// below and past the wings, the maw shields the heart from below, and the attacks come from the parts the
// picture gives it. (The generic rules for every boss are in boss-data.test.js.)
const ray = bossDef('ray');
const part = (id) => ray.parts.find((p) => p.id === id);
const from = (pattern, id) => ray.phases.flatMap((p) => p.attacks).some((a) => a.pattern === pattern && a.from.startsWith(id));
const has = (p, pattern) => p.attacks.some((a) => a.pattern === pattern);
const box = (p) => ({ l: p.dx - p.w / 2, r: p.dx + p.w / 2, t: p.dy - p.h / 2, b: p.dy + p.h / 2 });
const overlap = (p, q) => {
  const [a, b] = [box(p), box(q)];
  return a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
};

test('the Squall Ray rests at 280, 900 x 300, a little heavier than the moth and lighter than the Craving', () => {
  assert.equal(ray.name, 'The Squall Ray');
  assert.equal(ray.y, 280);
  assert.deepEqual([ray.size.w, ray.size.h], [900, 300]);
  assert.ok(ray.maxHp > bossDef('moth').maxHp && ray.maxHp < bossDef('craving').maxHp, `${ray.maxHp} hp`);
  assert.deepEqual(ray.parts.map((p) => p.id), ['spine', 'heart', 'wingL', 'wingR', 'coilL', 'coilR', 'maw']);
});

test('no two parts overlap, the wings and coils are mirror images, and the spine, heart and maw sit on the axis', () => {
  for (const p of ray.parts) {
    for (const q of ray.parts) assert.ok(p === q || !overlap(p, q), `${p.id} and ${q.id} overlap`);
  }
  for (const [l, r] of [['wingL', 'wingR'], ['coilL', 'coilR']]) {
    const [a, b] = [part(l), part(r)];
    assert.deepEqual([a.dx, a.dy, a.w, a.h, a.hp], [-b.dx, b.dy, b.w, b.h, b.hp], `${l} mirrors ${r}`);
  }
  for (const id of ['spine', 'heart', 'maw']) assert.equal(part(id).dx, 0, `${id} on the axis`);
});

test('weak heart, coils and maw, armoured spine and wings; the weak parts clear the HUD at the top of the orbit', () => {
  for (const id of ['heart', 'coilL', 'coilR', 'maw']) assert.ok(part(id).weak, id);
  for (const id of ['spine', 'wingL', 'wingR']) assert.ok(part(id).armor, id);
  for (const id of ['heart', 'coilL', 'coilR', 'maw']) {
    const p = part(id);
    assert.ok(ray.y + p.dy - p.h / 2 - 55 >= HUD_BOTTOM, `${id} clears the HUD at the top of the orbit`);
  }
  assert.equal(part('spine').dy - part('spine').h / 2, -150, 'no art above y -150: the spine tops the ray');
});

test('for a ship flying free: the coils stand out past the wings and below them, and the maw covers the heart from below', () => {
  const [wing, coil] = [box(part('wingL')), box(part('coilL'))];
  assert.ok(coil.l < wing.l, 'the coil reaches past the wing tip');
  assert.ok(coil.t >= wing.b, 'and hangs below the wing, level with a ship that climbs beside it');
  const [heart, maw] = [box(part('heart')), box(part('maw'))];
  assert.ok(maw.l <= heart.l && maw.r >= heart.r && maw.t >= heart.b, 'the maw under the heart, as wide');
});

test('sways, hovers and circles, never charges; aimed from the coils, fans from the wings, rain from the spine', () => {
  assert.deepEqual(ray.phases.map((p) => p.move), ['sway', 'hover', 'orbit']);
  assert.ok(from('aimed', 'coil') && !from('aimed', 'maw') && !from('aimed', 'wing'), 'aimed bolts from the coils only');
  assert.ok(from('fan', 'wing'), 'fans from the wings');
  assert.ok(from('rain', 'spine'), 'lightning rain from the spine');
});

test('homing shots from the maw in every phase, shock rings from the heart from the hover on, the laser from the maw last', () => {
  for (const p of ray.phases) assert.ok(p.attacks.some((a) => a.pattern === 'homing' && a.from === 'maw'), `homing in the ${p.move} phase`);
  assert.ok(!has(ray.phases[0], 'ring') && ray.phases.slice(1).every((p) => has(p, 'ring')), 'rings from the second phase');
  assert.ok(from('ring', 'heart') && !from('ring', 'maw'), 'rings from the heart');
  assert.deepEqual(ray.phases.map((p) => has(p, 'laser')), [false, false, true], 'the laser in the last phase only');
  assert.ok(from('laser', 'maw'), 'from the maw');
});

test('divers come off the wings in phases 2 and 3, none in the first; a carrier every phase', () => {
  assert.ok(ray.phases.slice(1).every((p) => p.minions.some((m) => m.role === 'diver' && m.from.startsWith('wing'))), 'divers off the wings');
  assert.ok(!ray.phases[0].minions.some((m) => m.role === 'diver'), 'none in the first');
  assert.ok(ray.phases.every((p) => p.minions.some((m) => m.role === 'carrier' && m.every <= 5)), 'a carrier at least every 5 s');
});
