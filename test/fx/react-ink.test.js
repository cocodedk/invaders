import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kindsOf, ofKind, react, run } from './fx-kit.js';

const at = (world) => ({ level: { world }, ship: { x: 800, y: 900 } });
const blink = { type: 'teleport', id: 4, fromX: 300, fromY: 200, x: 900, y: 240 };
const slow = (on) => ({ type: 'bulletTime', on, left: 2 });

test('in Starlit Archive a blink dissolves the alien into pages and gold dust and re-forms it from the same in the new slot', () => {
  const fx = react(blink, at(12));
  const pages = ofKind(fx, 'page');
  assert.ok(pages.length >= 14, `${pages.length} sheets`);
  assert.ok(ofKind(fx, 'ember').length >= 18, 'and gold dust');
  const [out, back] = [pages.filter((p) => p.x < 600), pages.filter((p) => p.x > 600)];
  assert.ok(out.length >= 7 && back.length >= 7, 'at both ends');
  assert.ok(out.every((p) => Math.hypot(p.vx, p.vy) > 60 && p.drag > 0), 'they fly out of the old slot and slow');
  for (const p of back) assert.ok(Math.hypot(p.x + p.vx * p.life - 900, p.y + p.vy * p.life - 240) < 1, 'each sheet lands on the new slot as its life ends');
  assert.ok(back.every((p) => p.size + p.grow * p.life < 1e-6), 'shrinking into it');
  assert.equal(fx.flashes.filter((f) => f.tag === 'glitch').length, 2, 'a gold flash at each');
  assert.ok(fx.flashes.every((f) => f.color !== '#5dff9a'), 'none of Code Rain\'s green');
  assert.equal(fx.rings.length, 1, 'a ring closes on the new slot');
  run(fx, 1.5);
  assert.equal(fx.particles.length, 0, 'all gone within a second and a half');
});

test('the frame turns over like a page at each end of the blink: a tall gold strip, not Code Rain\'s thin green bands', () => {
  const fx = react(blink, at(12));
  assert.equal(fx.slices.length, 2);
  assert.ok(fx.slices.some((s) => s.x < 400) && fx.slices.some((s) => s.x > 700));
  for (const s of fx.slices) {
    assert.equal(s.kind, 'ink');
    assert.ok(s.h > s.w * 2 && s.h >= 380, 'tall');
    assert.ok(Math.abs(s.dx) >= 40 && s.color === '#ffc850');
  }
  run(fx, 0.5);
  assert.equal(fx.slices.length, 0);
});

test('bullet time in Starlit Archive is the ink holding its breath: a warm swell and a ring from the ship, and the flag as ever', () => {
  const on = react(slow(true), at(12));
  assert.equal(on.bulletTime, true);
  assert.deepEqual(on.flashes.map((f) => [f.full, f.color, f.ramp > 0]), [[true, '#ffc660', true]], 'swelling in');
  assert.equal(on.rings.length, 1);
  assert.deepEqual([on.rings[0].x, on.rings[0].y], [800, 900], 'from the ship');
  const off = react(slow(false), at(12));
  assert.equal(off.bulletTime, false);
  assert.equal(off.rings.length, 0);
  assert.doesNotThrow(() => react(slow(true), { level: { world: 12 } }), 'no ship, no crash');
});

// Code Rain's glitch is pinned: the same events in worlds 1-11 give what they give with no world at all, and
// in world 6 they are the green bands and flashes they always were.
test("everywhere else the blink and bullet time are Code Rain's green ones as they were, in world 6 and with no world at all", () => {
  const [bare, bareOn, bareOff] = [react(blink), react(slow(true)), react(slow(false))];
  assert.equal(bare.slices.length, 6, 'three bands at each end');
  assert.ok(bare.slices.every((s) => !s.kind && s.color === '#5dff9a' && s.h <= 9 && s.w <= 110), 'thin and green');
  assert.deepEqual([...kindsOf(bare)], ['spark']);
  assert.equal(bare.flashes.length, 2);
  assert.ok(bare.flashes.every((f) => f.color === '#5dff9a' && f.tag === 'glitch'));
  assert.equal(bareOn.flashes[0].color, '#3affc8');
  assert.equal(bareOn.rings.length, 0);
  for (const world of [1, 6, 11]) {
    assert.deepEqual(react(blink, at(world)), bare, `world ${world}: the blink`);
    assert.deepEqual(react(slow(true), at(world)), bareOn, `world ${world}: bullet time begins`);
    assert.deepEqual(react(slow(false), at(world)), bareOff, `world ${world}: and ends`);
  }
});
