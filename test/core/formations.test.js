import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMATIONS } from '../../src/core/kinds.js';
import { makeSlots, slotPosition, entryPosition, marchRate } from '../../src/core/formations.js';
import { wave, SHAPES, CTXS, ONE } from './wave-shapes.js';

test('makeSlots lays out rows x cols slots, row by row, each with its row role', () => {
  const w = wave(4, 6);
  const slots = makeSlots(w);
  assert.equal(slots.length, 24);
  slots.forEach((s, i) => {
    assert.equal(s.row, Math.floor(i / 6));
    assert.equal(s.col, i % 6);
    assert.equal(s.role, w.roles[s.row]);
  });
});

test('slots sit in the top area and are centred on the screen, for every wave shape', () => {
  for (const [key, w] of SHAPES) {
    const slots = makeSlots(w);
    assert.equal(slots.length, w.rows * w.cols, key);
    for (const s of slots) {
      assert.ok(s.sx >= 160 && s.sx <= 1760, `${key} sx ${s.sx}`);
      assert.ok(s.sy >= 120 && s.sy <= 520, `${key} sy ${s.sy}`);
    }
    const xs = slots.map((s) => s.sx);
    assert.ok(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - 960) < 1e-9, `${key} centred`);
  }
});

test('a 1-column wave has all its slots on the centre line', () => {
  for (const s of makeSlots(wave(3, 1))) assert.equal(s.sx, 960);
});

test('every formation keeps every slot inside x 0..1920, y 0..600 for 60 s', () => {
  for (const f of FORMATIONS) {
    for (const [key, w] of SHAPES) {
      for (const slot of makeSlots(w)) {
        for (const ctx of CTXS) {
          for (let t = 0; t <= 60; t += 0.1) {
            const p = slotPosition(f, slot, t, ctx);
            const at = `${f} ${key} r${slot.row}c${slot.col} t${t.toFixed(1)}`;
            assert.ok(p.x >= 0 && p.x <= 1920, `${at} x ${p.x}`);
            assert.ok(p.y >= 0 && p.y <= 600, `${at} y ${p.y}`);
          }
        }
      }
    }
  }
});

test('at t = 0 every formation holds exactly the slot home, whatever dir and speed', () => {
  for (const f of FORMATIONS) {
    for (const slot of makeSlots(wave(3, 8))) {
      for (const ctx of CTXS) {
        const p = slotPosition(f, slot, 0, ctx);
        assert.ok(Math.abs(p.x - slot.sx) < 1e-9 && Math.abs(p.y - slot.sy) < 1e-9, `${f}`);
      }
    }
  }
});

test('every formation actually moves once it holds, and slotPosition is pure', () => {
  const slots = makeSlots(wave(3, 6));
  for (const f of FORMATIONS) {
    const s = slots[7];
    let far = 0;
    for (let t = 0; t <= 30; t += 0.1) {
      const p = slotPosition(f, s, t, ONE);
      assert.deepEqual(slotPosition(f, s, t, ONE), p, `${f} deterministic`);
      far = Math.max(far, Math.hypot(p.x - s.sx, p.y - s.sy));
    }
    assert.ok(far > 5, `${f} moved ${far}`);
  }
});

test('dir mirrors the grid march sideways', () => {
  const s = makeSlots(wave(1, 1))[0];
  const a = slotPosition('grid', s, 1.5, { ...ONE, dir: 1 });
  const b = slotPosition('grid', s, 1.5, { ...ONE, dir: -1 });
  assert.ok(a.x > s.sx);
  assert.ok(Math.abs(a.x - s.sx + (b.x - s.sx)) < 1e-9);
  assert.equal(a.y, b.y);
});

test('split sends the left half left and the right half right, then rejoins', () => {
  const slots = makeSlots(wave(2, 8));
  const left = slots[0];
  const right = slots[7];
  const mid = slotPosition('split', left, 3.1, ONE);
  assert.ok(mid.x < left.sx - 50);
  assert.ok(slotPosition('split', right, 3.1, ONE).x > right.sx + 50);
  const back = slotPosition('split', left, 2 * 3.125, ONE);
  assert.ok(Math.abs(back.x - left.sx) < 1);
});

test('unknown formations are an error, not a silent hold', () => {
  const s = makeSlots(wave(1, 1))[0];
  assert.throws(() => slotPosition('zigzag', s, 0, ONE), /unknown formation/);
  assert.throws(() => entryPosition('zigzag', s, 0.5), /unknown formation/);
});

test('grid steps sideways, drops exactly 24 px at the edge, and only there', () => {
  const s = makeSlots(wave(1, 1))[0];
  const at = (t) => slotPosition('grid', s, t, ONE);
  assert.equal(at(0.5).y, s.sy);
  assert.equal(at(2.9).y, s.sy, 'no drop before the edge');
  assert.ok(Math.abs(at(3).x - s.sx - 240) < 1e-6, 'the first edge is 240 px out');
  assert.equal(at(3.5).y, s.sy + 24);
  assert.equal(at(6).y, s.sy + 24, 'no drop mid-sweep');
  assert.equal(at(9.5).y, s.sy + 48, 'one more drop at the opposite edge');
  let ys = at(0).y;
  for (let t = 0; t <= 40; t += 0.01) {
    const p = at(t);
    assert.ok(p.y >= ys - 1e-9, 'the grid never climbs back');
    if (p.y > ys + 1e-6) assert.ok(Math.abs(p.x - s.sx) > 200, `drop began mid-sweep at t${t}`);
    ys = p.y;
  }
});

test('grid march speeds up as aliveFrac falls', () => {
  const s = makeSlots(wave(1, 1))[0];
  const dist = (aliveFrac, speed = 1) => Math.abs(
    slotPosition('grid', s, 0.2, { aliveFrac, dir: 1, speed }).x
    - slotPosition('grid', s, 0.1, { aliveFrac, dir: 1, speed }).x);
  const fracs = [1, 0.75, 0.5, 0.25, 0.05];
  fracs.slice(1).forEach((f, i) => assert.ok(dist(f) > dist(fracs[i]), `aliveFrac ${f}`));
  assert.ok(Math.abs(dist(0.5, 2) - 2 * dist(0.5)) < 1e-9, 'ctx.speed scales it linearly');
  assert.ok(marchRate(1) === 1 && marchRate(0) > 3);
});

test('grid never drops below y 560, even after hundreds of edges', () => {
  for (const rows of [1, 2, 3, 4]) {
    const slots = makeSlots(wave(rows, 5));
    let lowest = 0;
    for (let t = 0; t <= 3000; t += 1.7) {
      for (const s of slots) lowest = Math.max(lowest, slotPosition('grid', s, t, { ...ONE, aliveFrac: 0.2 }).y);
    }
    assert.ok(lowest <= 560 + 1e-9, `${rows} rows reached ${lowest}`);
  }
  const bottom = makeSlots(wave(4, 5))[19];
  assert.ok(Math.abs(slotPosition('grid', bottom, 3000, ONE).y - 560) < 1e-9, 'it does come down to the floor');
});

