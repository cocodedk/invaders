import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kindsOf, ofKind, react, run } from './fx-kit.js';

// The broadside twist in Sunset Armada (react-armada.js): every side shot a gun going off, and the guns
// opening a burst at both flanks.
const world = { level: { world: 13 }, ship: { x: 800, y: 900 } };
const shot = (dir) => ({ type: 'sideShot', x: 800 + dir * 22, y: 900, dir });

test('a side shot is a flash at the barrel and a plume of powder smoke flung out along it, to the side it fired to', () => {
  for (const dir of [-1, 1]) {
    const fx = react(shot(dir), world);
    assert.equal(fx.flashes.length, 1);
    assert.equal(fx.flashes[0].tag, 'muzzle');
    assert.ok(Math.sign(fx.flashes[0].x - 800) === dir, 'at the barrel, on the side it fired from');
    const smoke = ofKind(fx, 'smoke');
    assert.ok(smoke.length >= 3, `${smoke.length} puffs`);
    assert.ok(smoke.every((p) => Math.sign(p.vx) === dir), 'flung out the way the shot went');
    assert.ok(smoke.every((p) => p.gravity < 0), 'and rising');
    assert.ok(ofKind(fx, 'spark').length > 0, 'with sparks of powder');
  }
});

test('the plume is the dusk smoke, cream where the sun catches it and violet in its shade, never the grey of everywhere else', () => {
  const colours = new Set(ofKind(react(shot(1), world, 3), 'smoke').concat(ofKind(react(shot(-1), world, 4), 'smoke')).map((p) => p.color));
  assert.ok(colours.size >= 2);
  for (const c of colours) assert.ok(parseInt(c.slice(1, 3), 16) > 0x90, `${c} is a light smoke`);
});

test('the guns opening bursts at both flanks: a flash, a ring and a rush of smoke each, and the word over the ship', () => {
  const fx = react({ type: 'broadside', on: true, left: 6, x: 800, y: 900 }, world);
  assert.equal(fx.flashes.filter((f) => f.tag === 'muzzle').length, 2, 'one at each flank');
  assert.equal(fx.rings.length, 2);
  assert.ok(ofKind(fx, 'smoke').length >= 10, 'a rush of smoke');
  assert.deepEqual(fx.popups.map((p) => p.text), ['BROADSIDE']);
  assert.ok(fx.popups[0].y < 900, 'written above the ship');
  const sides = new Set(ofKind(fx, 'smoke').map((p) => Math.sign(p.vx)));
  assert.deepEqual([...sides].sort((a, b) => a - b), [-1, 1], 'out of both sides');
});

test('the guns closing is a wisp of smoke from each barrel and nothing loud', () => {
  const fx = react({ type: 'broadside', on: false, left: 0, x: 800, y: 900 }, world);
  assert.equal(fx.flashes.length + fx.rings.length + fx.popups.length, 0);
  assert.ok(kindsOf(fx).has('smoke') && ofKind(fx, 'smoke').length <= 6);
});

test('the same seed gives the same plume, density thins it, and it is all gone within the second and a half', () => {
  assert.deepEqual(react(shot(1), world, 9).particles, react(shot(1), world, 9).particles);
  const fx = react({ type: 'broadside', on: true, x: 800, y: 900 }, world);
  run(fx, 1.5);
  assert.equal(fx.particles.length + fx.flashes.length + fx.rings.length + fx.popups.length, 0);
});

test('the wingmen pickup is announced in the power\'s own colour', () => {
  const fx = react({ type: 'pickup', kind: 'wingmen', x: 500, y: 600, points: 250 }, world);
  assert.equal(fx.popups[0].text, 'WINGMEN');
  assert.equal(fx.popups[0].color, '#6af0a0');
});

test('the wingmen fire with the ship: a flash at the muzzle of each escort in world 13, and nowhere else', () => {
  const fire = { type: 'fire', side: 'ship', x: 800, y: 878, power: 'wingmen' };
  const escorted = (w) => ({ level: { world: w }, ship: { x: 800, y: 900, alive: true, power: { kind: 'wingmen', left: 5 } } });
  const fx = react(fire, escorted(13));
  assert.equal(fx.flashes.length, 3, "the ship's own and one for each escort");
  assert.deepEqual(fx.flashes.map((f) => f.x).sort((a, b) => a - b), [720, 800, 880], '80 px either side');
  assert.equal(react(fire, escorted(12)).flashes.length, 1, 'another world: the ship alone');
  assert.equal(react(fire).flashes.length, 1, 'and with no world at all');
  const bare = { level: { world: 13 }, ship: { x: 800, y: 900, alive: true, power: null } };
  assert.equal(react(fire, bare).flashes.length, 1, 'no escorts, no extra flashes');
  assert.equal(react({ ...fire, side: 'alien' }, escorted(13)).flashes.length, 1, "and an alien's shot is not theirs");
});
