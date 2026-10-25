import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installCanvas, recorder, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// World 15's two powers on screen: the pearls round the ship (ship-deep.js, drawn where the core's pearlsOf says) and the
// trident's three-pronged bolt (shots-deep.js). The fx of both are test/fx/react-deep.test.js.
installCanvas(64);
const made = [];
const stand = document.createElement;
document.createElement = (...a) => { // every canvas now made follows what is drawn into it, so a sprite's extent can be read off
  const T = tracker();
  const c = { ...stand(...a), getContext: () => T.ctx, T };
  made.push(c);
  return c;
};
const { drawPearls, warmPearls } = await import('../../src/ui/ship-deep.js');
const { drawTridents, warmTrident } = await import('../../src/ui/shots-deep.js');
const { drawShots } = await import('../../src/ui/lasers-view.js');
const { drawShip } = await import('../../src/ui/ship-view.js');
const { pearlsOf, PEARL_R, PEARL_ORBIT } = await import('../../src/core/pearls.js');
const { powerTime } = await import('../../src/core/powerups.js');
const { look } = await import('./deep-kit.js');

const ship = (left, extra = {}) => ({ alive: true, lives: 3, invuln: 0, x: 900, y: 800, vx: 0, vy: 0, power: { kind: 'pearls', left }, ...extra });
const FULL = powerTime('pearls');
const drawn = (s, t = 1, alpha = 1) => {
  const r = recorder();
  drawPearls(r.ctx, s, look, t, alpha);
  return r.calls.filter(([k]) => k === 'drawImage');
};

test('three pearls are drawn, each glowing and trailing, at the places the core gives', () => {
  const s = ship(5);
  const places = pearlsOf(s);
  assert.equal(places.length, 3);
  const calls = drawn(s);
  const size = (64 * PEARL_R) / 20;
  const body = calls.filter((c) => Math.abs(c[4] - size) < 1e-9);
  assert.equal(body.length, 3, 'one body each, at the size the core blocks with (a pearl is 2 x PEARL_R across)');
  places.forEach((p, i) => {
    assert.ok(Math.abs(body[i][2] + size / 2 - p.x) < 1e-6 && Math.abs(body[i][3] + size / 2 - p.y) < 1e-6, `pearl ${i} sits on its place`);
  });
  assert.ok(calls.length >= 3 * (1 + 7 + 3), `a halo, two glows, a tail and a glint each: ${calls.length} images`);
  const radius = Math.hypot(places[0].x - s.x, places[0].y - s.y);
  assert.ok(Math.abs(radius - PEARL_ORBIT) < 1e-6);
});

test('no pearl while the power is not running, and none after the ship is gone', () => {
  assert.equal(drawn(ship(0, { power: null })).length, 0);
  assert.equal(drawn(ship(5, { power: { kind: 'wingmen', left: 5 } })).length, 0);
  assert.equal(drawn(ship(5, { alive: false })).length, 0);
});

test('the pearls fade in as the power starts and out as it ends, and every part of one carries the fade', () => {
  const peak = (s, alpha = 1) => Math.max(...drawn(s, 1, alpha).map((c) => c.alpha));
  const mid = peak(ship(5));
  assert.ok(mid > 0.95 && mid <= 1, `full strength in between: ${mid}`);
  assert.ok(peak(ship(FULL - 0.05)) < 0.2, 'just started');
  assert.ok(peak(ship(0.05)) < 0.2, 'about to end');
  assert.ok(peak(ship(FULL - 0.17)) > 0.2 && peak(ship(FULL - 0.17)) < mid, 'halfway in');
  for (const left of [FULL - 0.1, 5, 0.1]) { // the halo, tail, body and glint all fade together, never one at full opacity
    const calls = drawn(ship(left));
    const top = Math.max(...calls.map((c) => c.alpha));
    const bright = calls.filter((c) => c.alpha > top * 0.6);
    assert.ok(bright.length >= 3 && calls.every((c) => c.alpha <= top + 1e-9));
    assert.ok(calls.every((c) => c.alpha <= (left > 1 ? 1 : 0.2) + 1e-9), `left ${left}: no part is drawn at more than the fade allows`);
  }
});

test("the ship's own blink dims the pearls with it, and the last two seconds blink them", () => {
  assert.ok(Math.max(...drawn(ship(5), 1, 0.3).map((c) => c.alpha)) <= 0.3 + 1e-9, 'a blinking ship, a blinking ring');
  const on = Math.max(...drawn(ship(1.5), 0.0).map((c) => c.alpha));
  const off = Math.max(...drawn(ship(1.5), 0.1).map((c) => c.alpha));
  assert.ok(on > off * 1.5 || off > on * 1.5, `the blink: ${on} then ${off}`);
});

test('the pearls turn: the same power time later is a different place, and the tail follows behind', () => {
  const a = pearlsOf(ship(5));
  const b = pearlsOf(ship(4.9));
  assert.notDeepEqual(a, b);
  const first = drawn(ship(5)).filter((c) => c.alpha < 0.5);
  const ahead = (list) => list.map((c) => Math.round(c[2]));
  assert.notDeepEqual(ahead(drawn(ship(5))), ahead(drawn(ship(4.9))));
  assert.ok(first.length > 0);
});

test('the pearl sprite lies inside its canvas with room for its rim, and warming paints it', () => {
  warmPearls();
  const sprite = made.find((c) => c.width === 64 && c.height === 64 && c.T.bounds.x1 > 0);
  assert.ok(sprite, 'the pearl is baked by warmPearls');
  const b = sprite.T.bounds;
  assert.ok(b.x0 >= 0 && b.y0 >= 0 && b.x1 <= 64 && b.y1 <= 64, `${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
  assert.ok(b.x1 - b.x0 > 38, 'the pearl fills most of it');
});

const bolt = (extra = {}) => ({ x: 700, y: 500, vx: 0, vy: -1100, trident: true, pierced: [], ...extra });

test('a trident shot is a head, a wake, rings and two glows; other shots are left to the streaks', () => {
  const r = recorder();
  drawTridents(r.ctx, [bolt(), { x: 300, y: 300, vx: 0, vy: -1100 }], 1.2);
  const images = r.calls.filter(([k]) => k === 'drawImage');
  assert.ok(images.length >= 8 && images.length <= 10, `${images.length} images for the one bolt`);
  assert.equal(r.calls.filter(([k]) => k === 'translate').length, 1, 'the plain shot is not drawn');
  const heads = images.filter((c) => c[1].width === 80 && c[1].height === 120);
  assert.equal(heads.length, 1);
});

test('the bolt flies head first along its velocity and burns brighter for each thing it has run through', () => {
  const rot = (extra) => { const r = recorder(); drawTridents(r.ctx, [bolt(extra)], 1); return r.calls.find(([k]) => k === 'rotate')[1]; };
  assert.ok(Math.abs(rot({})) < 1e-9, 'straight up');
  assert.ok(rot({ vx: 500 }) > 0.3 && rot({ vx: -500 }) < -0.3, 'leans with the shot');
  const light = (n) => { const r = recorder(); drawTridents(r.ctx, [bolt({ pierced: Array.from({ length: n }, (_, i) => i) })], 1); return r.calls.filter(([k]) => k === 'drawImage').reduce((s, c) => s + c.alpha, 0); };
  assert.ok(light(2) > light(1) && light(1) > light(0), 'each alien run through adds light');
  const flare = (n) => { const r = recorder(); drawTridents(r.ctx, [bolt({ pierced: Array.from({ length: n }, (_, i) => i) })], 1); return r.calls.filter(([k]) => k === 'drawImage').length; };
  assert.ok(flare(1) > flare(0), 'and a flare at the tip');
});

test('the trident head and ring sprites fit their canvases', () => {
  warmTrident();
  const head = made.find((c) => c.width === 80 && c.height === 120);
  assert.ok(head, 'the head is baked');
  const b = head.T.bounds;
  assert.ok(b.x0 >= 0 && b.y0 >= 0 && b.x1 <= 80 && b.y1 <= 120, `${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
  assert.ok(b.x1 - b.x0 > 54 && b.y1 - b.y0 > 100, 'the prongs span the sprite');
  const ring = made.find((c) => c.width === 16 && c.height === 16 && c.T.bounds.x1 > 0);
  assert.ok(ring.T.bounds.x0 >= 0 && ring.T.bounds.x1 <= 16, 'the ring');
});

test('the trident leaves the shot streaks and glows for the others and is drawn by drawShots', () => {
  const r = recorder();
  drawShots(r.ctx, { shots: [bolt()] }, look, 1);
  assert.equal(r.calls.filter(([k]) => k === 'moveTo').length, 0, 'no streak for a trident');
  assert.ok(r.calls.some(([k]) => k === 'rotate'), 'but the bolt');
  const plain = recorder();
  drawShots(plain.ctx, { shots: [{ x: 1, y: 2, vx: 0, vy: -900 }] }, look, 1);
  assert.equal(plain.calls.filter(([k]) => k === 'moveTo').length, 3, 'a plain shot is still a streak, stroked three ways');
});

test('the ship draws its pearls with it', () => {
  const r = recorder();
  drawShip(r.ctx, { ship: ship(5) }, look, 1);
  const plain = recorder();
  drawShip(plain.ctx, { ship: ship(5, { power: null }) }, look, 1);
  assert.ok(r.calls.length > plain.calls.length + 20);
});

// A context that keeps what a painter may change, with a real save and restore, and hands everything else to the sink.
const stateful = () => {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 0.8, globalCompositeOperation: 'source-over' };
  const stack = [];
  return new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
};

test('the pearls and the bolt leave every piece of the context state as they found it', () => {
  for (const [name, run] of Object.entries({
    pearls: (ctx) => drawPearls(ctx, ship(5), look, 3, 0.8),
    fading: (ctx) => drawPearls(ctx, ship(0.1), look, 3, 0.8),
    bolts: (ctx) => drawTridents(ctx, [bolt({ pierced: [1, 2, 3] }), bolt({ x: 200, vx: 300 })], 3),
  })) {
    const ctx = stateful();
    const before = { ...ctx };
    run(ctx);
    assert.deepEqual({ ...ctx }, before, name);
  }
});

test("the powers' drawing follows the sprite rules: no shadow blur, no clock or dice, files under 200 lines", () => {
  for (const name of ['ship-deep.js', 'shots-deep.js']) {
    const src = readFileSync(new URL(`../../src/ui/${name}`, import.meta.url), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
});
