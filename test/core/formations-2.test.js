import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMATIONS } from '../../src/core/kinds.js';
import { makeSlots, entryPosition, diveCurve } from '../../src/core/formations.js';
import { wave, SHAPES } from './wave-shapes.js';

test('entry starts off-screen and ends exactly on the slot, for every formation', () => {
  for (const f of FORMATIONS) {
    for (const [key, w] of SHAPES) {
      for (const slot of makeSlots(w)) {
        const a = entryPosition(f, slot, 0);
        const at = `${f} ${key} r${slot.row}c${slot.col}`;
        assert.ok(a.x < 0 || a.x > 1920 || a.y < 0, `${at} starts on screen at ${a.x},${a.y}`);
        assert.deepEqual(entryPosition(f, slot, 1), { x: slot.sx, y: slot.sy }, at);
        assert.deepEqual(entryPosition(f, slot, 7), { x: slot.sx, y: slot.sy }, `${at} clamps u`);
        assert.deepEqual(entryPosition(f, slot, -3), a, `${at} clamps u`);
      }
    }
  }
});

test('entry paths are finite all the way in', () => {
  const slots = makeSlots(wave(3, 8));
  for (const f of FORMATIONS) {
    for (const s of slots) {
      let last = null;
      for (let u = 0; u <= 1.0001; u += 0.05) {
        const p = entryPosition(f, s, Math.min(u, 1));
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${f} u${u}`);
        last = p;
      }
      assert.deepEqual(last, { x: s.sx, y: s.sy });
    }
  }
});

test('diveCurve leaves the slot, swoops to the ship x and back up, and returns exactly', () => {
  const from = { x: 700, y: 200 };
  const ship = { x: 1500, y: 900 };
  assert.deepEqual(diveCurve(from, ship, 0), from);
  assert.deepEqual(diveCurve(from, ship, 1), from);
  const mid = diveCurve(from, ship, 0.5);
  assert.ok(Math.abs(mid.x - ship.x) < 1, `mid x ${mid.x}`);
  assert.ok(mid.y > 800, `mid y ${mid.y}`);
  assert.ok(diveCurve(from, ship, 0.9).y < mid.y - 300, 'climbs back up');
  assert.ok(diveCurve(from, ship, 0.25).y > from.y);
  assert.deepEqual(from, { x: 700, y: 200 }, 'inputs are not mutated');
});

test('diveCurve stays on screen for ships at either edge and never dips above its slot', () => {
  for (const sx of [40, 960, 1880]) {
    for (const hx of [400, 960, 1520]) {
      const from = { x: hx, y: 392 };
      for (let u = 0; u <= 1; u += 0.02) {
        const p = diveCurve(from, { x: sx, y: 1000 }, u);
        assert.ok(p.x >= 0 && p.x <= 1920 && p.y >= from.y - 1e-9 && p.y <= 1080, `${sx} ${hx} u${u}`);
      }
    }
  }
});
