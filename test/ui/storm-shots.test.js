import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// What world 18 (Anvil Sky) draws for its borrowed broadside: the arc bolts (shots-storm.js), the coil emitters on the ship (ship-storm.js) and
// the baking that warm-storm.js does up front. The dragged bullets, the arcs of the fx and the pickup rim are test/ui/storm-bullets.test.js; the
// fx that tell the same story are test/fx/react-storm.test.js. Worlds 1 to 17 draw what they always drew.
installCanvas(64);
const made = [];
const stand = document.createElement;
document.createElement = (...a) => { // every canvas made follows what is drawn into it, so a sprite's extent can be read off
  const T = tracker();
  const c = { ...stand(...a), getContext: () => T.ctx, T };
  made.push(c);
  return c;
};
const { drawShots } = await import('../../src/ui/lasers-view.js');
const { drawShip } = await import('../../src/ui/ship-view.js');
const { drawBullets } = await import('../../src/ui/bullets-view.js');
const { drawCoilPorts } = await import('../../src/ui/ship-storm.js');
const { warmStorm } = await import('../../src/ui/warm-storm.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { BROADSIDE_TIME } = await import('../../src/core/powerups.js');

const look = LOOKS[17];
const w13 = LOOKS[12];
const ship = (left, extra = {}) => ({ alive: true, lives: 3, invuln: 0, x: 700, y: 820, vx: 0, vy: 0, power: null, broadside: left, ...extra });
const side = (dir, x = 900, y = 700) => ({ x, y, vx: dir * 1400, vy: 0, broadside: dir, r: 4 });
const worldOf = (n, shots = []) => ({ level: { world: n }, shots, ship: ship(0), bullets: [], pickups: [] });
const seeker = (x, extra = {}) => ({ pattern: 'homing', x, y: 500, vx: 120, vy: 260, r: 10, life: 4, ...extra });
const bolts = (calls) => calls.filter((c) => c.img.width === 92);
const flying = (dir, t, x = 900, y = 700) => {
  const T = tracker();
  drawShots(T.ctx, worldOf(18, [side(dir, x, y)]), look, t);
  return T.calls.find((c) => c.img.width === 92 && c.alpha === 1);
};

test('warming bakes the arc bolts, the dragged orb, ring and light, and drawing then bakes nothing; no other world warms anything', () => {
  const before = made.length;
  warmStorm(w13);
  assert.equal(made.length, before, 'nothing for world 13');
  warmStorm(look);
  const baked = made.slice(before);
  assert.equal(baked.filter((c) => c.width === 92).length, 12, 'six shapes, both ways');
  assert.ok(baked.some((c) => c.width === 56) && baked.some((c) => c.width === 36), 'the ring and the orb');
  for (const c of baked.filter((c) => c.width === 92)) {
    const b = c.T.bounds;
    assert.ok(b.x0 >= 0 && b.y0 >= 0 && b.x1 <= 92 && b.y1 <= 44, `a bolt lies inside its canvas: ${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
  }
  drawBullets(tracker().ctx, { bullets: [seeker(600)] }, look, 0, 1); // the enemy's own kit (bullet-sprites.js) and the ship's streak glow are baked by the first of either, in any world
  drawShots(tracker().ctx, worldOf(18, [{ x: 100, y: 500, vx: 0, vy: -1400, r: 4 }]), look, 0);
  const warmed = made.length;
  for (let k = 0; k < 15; k++) {
    drawShots(tracker().ctx, worldOf(18, [side(1), side(-1, 500, 650)]), look, k / 5);
    drawBullets(tracker().ctx, { bullets: [seeker(300, { dragged: true }), seeker(600)] }, look, k / 5, 1);
  }
  assert.equal(made.length, warmed, 'drawing baked nothing more');
});

test('the broadside shots of world 18 are arc bolts, each with two faint copies behind it and glows over it; world 13 keeps its cannon ball', () => {
  const T = tracker();
  drawShots(T.ctx, worldOf(18, [side(1), side(-1)]), look, 2.3);
  const b = bolts(T.calls);
  assert.equal(b.length, 6, 'three images a shot: the bolt and two copies');
  assert.ok(b.every((c) => c.comp === 'source-over'), 'drawn over the sky, with a dark ground of their own');
  assert.deepEqual(b.slice(0, 3).map((c) => c.alpha), [0.16, 0.34, 1], 'the copies behind it fainter');
  assert.notEqual(b[2].img, b[5].img, 'the right-flying and the left-flying are different sprites');
  assert.equal(T.calls.filter((c) => c.img.width === 32 && c.comp === 'source-over').length, 0, 'no cannon ball');
  assert.ok(T.calls.filter((c) => c.comp === 'lighter').length >= 8, 'four additive lights to a bolt: its length, its head, a yellow heart, a flicker');
  const old = tracker();
  drawShots(old.ctx, worldOf(13, [side(1), side(-1)]), w13, 2.3);
  assert.equal(bolts(old.calls).length, 0, 'no arcs in world 13');
  assert.ok(old.calls.filter((c) => c.img.width === 32 && c.comp === 'source-over').length >= 2, 'a ball for each side shot');
});

test('a bolt trails behind its head, level with the ship, and crackles through six shapes', () => {
  const [r, l] = [flying(1, 1), flying(-1, 1)];
  assert.ok(r.box[2] > 900 && r.box[0] < 900 - 60, `a bolt flying right trails behind its head: ${r.box}`);
  assert.ok(l.box[0] < 900 && l.box[2] > 900 + 60, `and one flying left: ${l.box}`);
  const shapes = new Set();
  for (let k = 0; k < 24; k++) shapes.add(flying(1, k / 24).img);
  assert.equal(shapes.size, 6, 'six shapes in a second');
  const mid = flying(1, 0.5);
  assert.ok(mid.box[1] >= 700 - 22.5 && mid.box[3] <= 700 + 22.5, 'level with the ship');
});

test("world 18's side gun ports are coil emitters with arcs; the brass ports stay world 13's", () => {
  const strokes = (left, w) => {
    const r = recorder();
    drawShip(r.ctx, { ship: ship(left) }, w, 1.3);
    return r.calls.filter(([k]) => k === 'stroke').length;
  };
  assert.ok(strokes(5, look) - strokes(0, look) >= 4, 'arcs stroked on both flanks');
  assert.equal(strokes(5, w13) - strokes(0, w13), 0, 'world 13 draws its ports from fills and glows');
  const T = tracker();
  drawCoilPorts(T.ctx, ship(BROADSIDE_TIME - 0.5), 1, look);
  const b = T.bounds;
  assert.ok(b.x0 >= -60 && b.x1 <= 60 && b.y0 >= -22 && b.y1 <= 22, `a small thing on each flank: ${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
  assert.ok(b.x1 > 28 && b.x0 < -28, 'run out past the hull');
  const gone = tracker();
  drawCoilPorts(gone.ctx, ship(0.01), 1, look);
  assert.ok(gone.bounds.x1 < b.x1, 'run in again at the end');
});

test('the new files keep the sprite rules: under 200 lines, no shadow blur, no dice, no clock', () => {
  for (const name of ['storm-bolt.js', 'shots-storm.js', 'ship-storm.js', 'bullets-dragged.js', 'arc-fx-view.js', 'pickup-storm.js', 'warm-storm.js', 'pickup-skins.js', 'fx-view.js', 'lasers-view.js', 'ship-view.js', 'bullets-view.js']) {
    const src = readFileSync(new URL(`../../src/ui/${name}`, import.meta.url), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
});
