import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_DEFS, registerBoss } from '../../src/core/bosses-data.js';
import {
  BOSSES8, CROWNS_Y, CROWNS_SIZE, CROWNS_HP, CROWNS_REGROW, CROWNS_UNTIL, CROWNS_RATE, CROWNS_EVERY,
  CROWNS_CARRIER_EVERY, CROWNS_DEER, CROWNS_SOLDIERS,
} from '../../src/core/bosses-data-8.js';
import { PATTERNS, ROLES, HUD_BOTTOM } from '../../src/core/kinds.js';
import { WARN } from '../../src/core/boss-attack.js';
import { ZONE } from '../../src/core/ship.js';
import { ORBIT_LIFT } from '../../src/core/boss-move.js';
import { step, drain, ofType, TICK } from './world-kit.js';
import { bossWorld, part, shotOn } from './boss-kit.js';

// The Ten-Crowned King (world 21): the rules boss-data.test.js holds every entry to, applied to it alone, then its
// fight (R9, R10) on a test level that carries world 21, its returning arrow and free flight, the boss found by kind
// (registerBoss, a no-op now that BOSS_DEFS lists it).
const [king] = BOSSES8;
registerBoss(king);
const sum = (parts) => parts.reduce((n, p) => n + p.hp, 0);
const heads = king.parts.filter((p) => p.id.startsWith('head'));
const defPart = (id) => king.parts.find((p) => p.id === id);
const BURST = Math.max(CROWNS_DEER.count, CROWNS_SOLDIERS.count);

test('one definition, kind crowns, built from its constants', () => {
  assert.equal(BOSSES8.length, 1);
  assert.equal(king.kind, 'crowns');
  assert.equal(king.name, 'The Ten-Crowned King');
  assert.equal(king.y, CROWNS_Y);
  assert.deepEqual(king.size, CROWNS_SIZE);
  assert.deepEqual(king.phases.map((p) => p.until), CROWNS_UNTIL);
  assert.deepEqual(king.phases.map((p) => p.rate), CROWNS_RATE);
  assert.deepEqual(king.phases.map((p) => p.attacks.map((a) => a.every)), CROWNS_EVERY);
  for (const p of king.parts) assert.ok(Object.values(CROWNS_HP).includes(p.hp), p.id);
  assert.doesNotThrow(() => structuredClone(king));
});

test('maxHp is the sum of its parts, ids are unique, parts fit the size, above the player zone and below the HUD (R9)', () => {
  assert.equal(king.maxHp, sum(king.parts));
  assert.equal(new Set(king.parts.map((p) => p.id)).size, king.parts.length);
  for (const p of king.parts) {
    assert.ok(p.hp > 0 && p.w > 0 && p.h > 0, p.id);
    assert.ok(!(p.weak && p.armor), p.id);
    assert.ok(Math.abs(p.dx) + p.w / 2 <= king.size.w / 2, `${p.id} fits the width`);
    assert.ok(Math.abs(p.dy) + p.h / 2 <= king.size.h / 2, `${p.id} fits the height`);
    assert.ok(king.y + p.dy - p.h / 2 >= HUD_BOTTOM + 4, `${p.id} below the HUD at rest`);
  }
  assert.ok(king.y - king.size.h / 2 >= 0 && king.y + king.size.h / 2 <= ZONE.y0);
  // Every weak part, the heads that must be cut to finish it among them, clears the HUD at the top of its orbit.
  for (const p of king.parts.filter((q) => q.weak)) assert.ok(king.y + p.dy - p.h / 2 - ORBIT_LIFT >= HUD_BOTTOM, p.id);
});

test('ten weak heads that grow back, the great one at the centre, an armoured breastplate, a heart behind it (R9)', () => {
  assert.equal(heads.length, 10);
  for (const h of heads) assert.ok(h.weak && h.regrow === CROWNS_REGROW, h.id);
  const great = defPart('head');
  assert.equal(great.dx, 0);
  assert.ok(heads.every((h) => h.w * h.h <= great.w * great.h), 'the great head is the largest');
  const [breast, heart] = ['breast', 'heart'].map(defPart);
  assert.ok(breast.armor && !heart.weak && !heart.armor, 'the plate is armour, the heart a bare hull');
  const box = (p) => [p.dx - p.w / 2, p.dx + p.w / 2, p.dy - p.h / 2, p.dy + p.h / 2];
  const [b, h] = [box(breast), box(heart)];
  assert.ok(b[0] < h[0] && h[1] < b[1] && b[2] < h[2] && h[3] < b[3], 'the heart lies wholly behind the plate');
});

test('2 or 3 phases at falling thresholds, never a charge; heads regrow in all but the last, which opens the heart', () => {
  const n = king.phases.length;
  assert.ok(n >= 2 && n <= 3);
  assert.equal(king.phases[n - 1].until, 0);
  for (let i = 0; i < n - 1; i++) assert.ok(king.phases[i].until > king.phases[i + 1].until && king.phases[i].until < 1);
  for (const ph of king.phases) assert.ok(['sway', 'hover', 'orbit'].includes(ph.move), `${ph.move}: never a charge`);
  assert.deepEqual(king.phases.map((ph) => ph.regrow === true), king.phases.map((_, i) => i < n - 1));
  assert.ok(king.phases[n - 1].open.includes('heart'));
  assert.ok(king.phases.slice(0, -1).every((ph) => !ph.open), 'nothing opens before the last phase');
  // The rule boss-data.test.js holds every bare hull to: what is left when the last phase begins covers it.
  assert.ok(CROWNS_HP.heart <= CROWNS_UNTIL.at(-2) * king.maxHp);
  // Cutting all ten heads at once ends the first phase but not the second, so the plates crack before the heart opens.
  const down = (king.maxHp - sum(heads)) / king.maxHp;
  assert.ok(down <= CROWNS_UNTIL[0] && down > CROWNS_UNTIL[1]);
});

test('attacks come from real parts with existing patterns, slower than their telegraph; minions are real roles, carrier first', () => {
  const ids = king.parts.map((p) => p.id);
  for (const ph of king.phases) {
    assert.ok(ph.attacks.length >= 1);
    for (const a of ph.attacks) {
      assert.ok(PATTERNS.includes(a.pattern), a.pattern);
      assert.ok(ids.includes(a.from), a.from);
      assert.ok(a.every >= WARN + 0.8, `${a.pattern} every ${a.every}`);
    }
    for (const m of ph.minions) {
      assert.ok(m.role in ROLES && m.count >= 1 && m.count <= BURST && m.every >= 4, m.role);
      assert.ok(ids.includes(m.from), m.from);
    }
    const carriers = ph.minions.filter((m) => m.role === 'carrier');
    assert.equal(carriers.length, 1);
    assert.equal(ph.minions[0], carriers[0]);
    assert.ok(carriers[0].count === 1 && carriers[0].every === CROWNS_CARRIER_EVERY && CROWNS_CARRIER_EVERY <= 5);
  }
});

test('its signature (layout and attack mix) is no other boss\'s', () => {
  const sig = (d) => JSON.stringify([d.parts.map((p) => [p.dx, p.dy]), d.phases.map((p) => p.attacks.map((a) => a.pattern))]);
  assert.ok(!BOSS_DEFS.filter((d) => d.kind !== king.kind).map(sig).includes(sig(king)));
});

// The fight, on a quiet test level of world 21.
const fight = () => bossWorld(king.kind, undefined, { world: 21, twist: 'quiver', free: true });
const AFTER = Math.ceil(CROWNS_REGROW / TICK) + 1; // ticks a cut head has surely grown back in
const cut = (w, ids) => {
  for (const id of ids) part(w, id).hp = 0;
  step(w);
};
// What one ship shot under the part takes off it.
function shoot(w, p) {
  const hp = p.hp;
  shotOn(w, p);
  step(w);
  return hp - p.hp;
}

test('in the first phase a cut head grows back (R10)', () => {
  const w = fight();
  cut(w, ['headL1']);
  step(w, AFTER);
  assert.equal(part(w, 'headL1').hp, part(w, 'headL1').max);
  assert.equal(w.boss.phase, 0);
});

test('the breastplate is armour while a head stands, and with all ten heads down at once it cracks and takes full damage (R10)', () => {
  const w = fight();
  const breast = part(w, 'breast');
  cut(w, heads.slice(1).map((h) => h.id));
  const dealt = shoot(w, breast);
  assert.ok(breast.armor && dealt > 0 && dealt < 1, `a plate with one head standing takes ${dealt}`);
  drain(w);
  cut(w, [heads[0].id]);
  const exposed = ofType(drain(w), 'bossExpose');
  assert.equal(exposed.length, 1);
  assert.ok(exposed[0].parts.includes('breast'));
  assert.ok(breast.weak && breast.cracked);
  assert.ok(w.boss.phase < king.phases.length - 1, 'the heart is not open yet');
  assert.equal(shoot(w, breast), 1);
});

test('in the last phase the heart is weak and a cut head stays down (R10)', () => {
  const w = fight();
  const heart = part(w, 'heart');
  assert.ok(!heart.weak);
  cut(w, ['armsL', 'armsR', 'breast']);
  const cuts = [];
  for (const h of heads) {
    if (w.boss.hp / w.boss.maxHp <= CROWNS_UNTIL.at(-2)) break;
    cuts.push(h.id);
    cut(w, [h.id]);
  }
  assert.equal(w.boss.phase, king.phases.length - 1);
  assert.ok(cuts.length < heads.length, 'some heads still stand');
  assert.ok(heart.weak && heart.open);
  assert.equal(shoot(w, heart), 1);
  step(w, AFTER);
  for (const id of cuts) assert.equal(part(w, id).hp, 0, `${id} stays down`);
});
