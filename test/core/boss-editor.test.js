import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_DEFS } from '../../src/core/bosses-data.js';
import { BOSSES7, EDITOR_Y, EDITOR_SIZE, EDITOR_HP, EDITOR_UNTIL, EDITOR_RATE, EDITOR_EVERY, EDITOR_CARRIER_EVERY, EDITOR_BURST } from '../../src/core/bosses-data-7.js';
import { PATTERNS, ROLES, HUD_BOTTOM } from '../../src/core/kinds.js';
import { WARN } from '../../src/core/boss-attack.js';
import { ZONE } from '../../src/core/ship.js';

// The Night Editor (world 20) is not in BOSS_DEFS yet (part 7 lists it): these are the rules
// boss-data.test.js holds every entry of BOSS_DEFS to, applied to it alone.
const [editor] = BOSSES7;
const sum = (parts) => parts.reduce((n, p) => n + p.hp, 0);
const attacks = editor.phases.flatMap((p) => p.attacks);

test('one definition, kind editor, built from its constants', () => {
  assert.equal(BOSSES7.length, 1);
  assert.equal(editor.kind, 'editor');
  assert.equal(typeof editor.name, 'string');
  assert.equal(editor.y, EDITOR_Y);
  assert.deepEqual(editor.size, EDITOR_SIZE);
  assert.deepEqual(editor.phases.map((p) => p.until), EDITOR_UNTIL);
  assert.deepEqual(editor.phases.map((p) => p.rate), EDITOR_RATE);
  assert.deepEqual(editor.phases.map((p) => p.attacks.map((a) => a.every)), EDITOR_EVERY);
  for (const p of editor.parts) assert.ok(Object.values(EDITOR_HP).includes(p.hp), p.id);
  assert.doesNotThrow(() => structuredClone(editor));
});

test('maxHp is the sum of its parts, ids are unique, parts fit the size, above the player zone and below the HUD', () => {
  assert.equal(editor.maxHp, sum(editor.parts));
  assert.equal(new Set(editor.parts.map((p) => p.id)).size, editor.parts.length);
  assert.ok(editor.parts.length >= 5);
  for (const p of editor.parts) {
    assert.ok(p.hp > 0 && p.w > 0 && p.h > 0, p.id);
    assert.ok(!(p.weak && p.armor), p.id);
    assert.ok(Math.abs(p.dx) + p.w / 2 <= editor.size.w / 2, `${p.id} fits the width`);
    assert.ok(Math.abs(p.dy) + p.h / 2 <= editor.size.h / 2, `${p.id} fits the height`);
    assert.ok(editor.y + p.dy - p.h / 2 >= HUD_BOTTOM + 4, `${p.id} below the HUD`);
  }
  assert.ok(editor.y - editor.size.h / 2 >= 0 && editor.y + editor.size.h / 2 <= ZONE.y0);
});

test('2 or 3 phases at falling thresholds, the last at 0, a weak part in each, and it never charges', () => {
  const n = editor.phases.length;
  assert.ok(n >= 2 && n <= 3);
  assert.equal(editor.phases[n - 1].until, 0);
  for (let i = 0; i < n - 1; i++) assert.ok(editor.phases[i].until > editor.phases[i + 1].until && editor.phases[i].until < 1);
  for (const ph of editor.phases) assert.ok(['sway', 'hover', 'orbit'].includes(ph.move), `${ph.move}: never a charge`);
  assert.ok(editor.parts.some((p) => p.weak));
  assert.ok(editor.parts.every((p) => p.weak || p.armor), 'no bare hull to open');
});

test('attacks come from real parts with existing patterns, slower than their telegraph; minions are real roles', () => {
  const ids = editor.parts.map((p) => p.id);
  for (const ph of editor.phases) {
    assert.ok(ph.attacks.length >= 1);
    for (const a of ph.attacks) {
      assert.ok(PATTERNS.includes(a.pattern), a.pattern);
      assert.ok(ids.includes(a.from), a.from);
      assert.ok(a.every >= WARN + 0.8, `${a.pattern} every ${a.every}`);
    }
    for (const m of ph.minions) {
      assert.ok(m.role in ROLES && m.count >= 1 && m.count <= EDITOR_BURST && m.every >= 4, m.role);
      assert.ok(ids.includes(m.from), m.from);
    }
  }
});

test('every phase sends one carrier at a time, at least every 5 s, listed first', () => {
  editor.phases.forEach((ph, i) => {
    const carriers = ph.minions.filter((m) => m.role === 'carrier');
    assert.equal(carriers.length, 1, `phase ${i}`);
    assert.equal(ph.minions[0], carriers[0]);
    assert.ok(carriers[0].count === 1 && carriers[0].every === EDITOR_CARRIER_EVERY && EDITOR_CARRIER_EVERY <= 5);
  });
});

test('its signature (layout and attack mix) is no other boss\'s', () => {
  const sig = (d) => JSON.stringify([d.parts.map((p) => [p.dx, p.dy]), d.phases.map((p) => p.attacks.map((a) => a.pattern))]);
  assert.ok(!BOSS_DEFS.filter((d) => d !== editor).map(sig).includes(sig(editor)));
  assert.equal(BOSS_DEFS.filter((d) => d.kind === 'editor').length, 1, 'listed once');
  assert.ok(attacks.length > 0);
});
