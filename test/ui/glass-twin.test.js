import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// World 16's mirror power on screen: the glass twin that flies opposite the ship (ship-glass.js, drawn where the core's
// twinOf says) and its slim bolts of glass (shots-glass.js, handed the shots marked `mirror` by lasers-view.js). The fx of
// both are test/fx/react-glass.test.js.
installCanvas(64);
const made = [];
const stand = document.createElement;
document.createElement = (...a) => { // every canvas now made follows what is drawn into it, so a sprite's extent can be read off
  const T = tracker();
  const c = { ...stand(...a), getContext: () => T.ctx, T };
  made.push(c);
  return c;
};
const { drawTwin, warmTwin, appear } = await import('../../src/ui/ship-glass.js');
const { drawMirrorShots, warmGlassShots } = await import('../../src/ui/shots-glass.js');
const { drawShots } = await import('../../src/ui/lasers-view.js');
const { drawShip } = await import('../../src/ui/ship-view.js');
const { twinOf, SHIP_SPEED } = await import('../../src/core/ship.js');
const { powerTime } = await import('../../src/core/powerups.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');

const look = LOOKS[15];
const ship = (left, extra = {}) => ({ alive: true, lives: 3, invuln: 0, x: 700, y: 820, vx: 0, vy: 0, power: { kind: 'mirror', left }, ...extra });
const FULL = powerTime('mirror');
const drawn = (s, t = 1, alpha = 1) => {
  const T = tracker();
  drawTwin(T.ctx, s, look, t, alpha);
  return T.calls;
};
const body = (calls) => calls.find((c) => c.img.width === 184 && c.comp === 'source-over');
const bolt = (extra = {}) => ({ x: 1200, y: 500, vx: 0, vy: -1400, mirror: true, ...extra });

test('the twin\'s sprites lie inside their canvases with room for the rim, and warming bakes every one', () => {
  const before = made.length;
  warmTwin();
  const baked = made.slice(before);
  assert.ok(baked.filter((c) => c.width === 184).length === 10, 'the body, the fringe and eight frames of sheen');
  for (const c of baked.filter((c) => c.width === 184 && c.T.bounds.x1 > 0)) { // (the glows and stars are 64 px fills of their own)
    const b = c.T.bounds;
    assert.ok(b.x0 >= 2 && b.y0 >= 2 && b.x1 <= c.width - 2 && b.y1 <= c.height - 2, `${c.width}x${c.height}: ${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
  }
  const warmed = made.length;
  for (let t = 0; t < 12; t += 0.37) for (const vx of [-SHIP_SPEED, 0, SHIP_SPEED]) drawn(ship(5, { vx }), t);
  assert.equal(made.length, warmed, 'drawing baked nothing more');
});

test('warming paints the crystal, the train and the glows, and they lie inside their canvases', () => {
  const before = made.length;
  warmGlassShots();
  for (const c of made.slice(before).filter((c) => c.T.bounds.x1 > 0)) {
    const b = c.T.bounds;
    assert.ok(b.x0 >= 2 && b.y0 >= 0 && b.x1 <= c.width - 2 && b.y1 <= c.height, `${c.width}x${c.height}: ${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
  }
  const warmed = made.length;
  drawMirrorShots(tracker().ctx, [bolt(), bolt({ x: 900 })], 5);
  assert.equal(made.length, warmed, 'drawing baked nothing more');
});


test('a twin is drawn at the place the core gives: the ship mirrored across the middle of the field, at its height', () => {
  const s = ship(5);
  const [tw] = twinOf(s);
  assert.deepEqual([tw.x, tw.y], [1920 - 700, 820]);
  const b = body(drawn(s));
  assert.ok(b, 'the glass body');
  assert.ok(Math.abs((b.box[0] + b.box[2]) / 2 - tw.x) < 0.5, `centred on x: ${b.box}`);
  assert.ok(b.box[1] < tw.y - 40 && b.box[3] > tw.y + 30, 'and on y, from the nose to the engines');
});

test('no twin while the power is not running, while another power is, and after the ship is gone', () => {
  assert.equal(drawn(ship(0, { power: null })).length, 0);
  assert.equal(drawn(ship(5, { power: { kind: 'wingmen', left: 5 } })).length, 0);
  assert.equal(drawn(ship(5, { alive: false })).length, 0);
});

test('the twin fades in as the power starts and out as it ends, and every part of it carries the fade', () => {
  const peak = (s, alpha = 1) => Math.max(...drawn(s, 1, alpha).map((c) => c.alpha));
  const mid = peak(ship(5));
  assert.ok(mid > 0.85 && mid <= 1, `full strength in between: ${mid}`);
  assert.ok(peak(ship(FULL - 0.05)) < 0.2, 'just started');
  assert.ok(peak(ship(0.05)) < 0.2, 'about to end');
  const half = peak(ship(FULL - 0.17));
  assert.ok(half > 0.2 && half < mid, `halfway in: ${half}`);
  for (const left of [FULL - 0.1, 5, 0.1]) { // halo, flames, body, sheen, glints and tip lights: never one at full opacity
    const calls = drawn(ship(left));
    assert.ok(calls.length >= 12, `${calls.length} images: a halo, flames, the body, the fringe, glints...`);
    assert.ok(calls.every((c) => c.alpha <= (left > 1 ? 1 : 0.2) + 1e-9), `left ${left}: no part is drawn at more than the fade allows`);
  }
});

test("the ship's own blink dims the twin with it (every part), and the last two seconds blink it", () => {
  const calls = drawn(ship(5), 1, 0.3);
  assert.ok(calls.length >= 12 && calls.every((c) => c.alpha <= 0.3 + 1e-9), 'a blinking ship, a blinking twin: nothing brighter than 0.3');
  const on = Math.max(...drawn(ship(1.5), 0.0).map((c) => c.alpha));
  const off = Math.max(...drawn(ship(1.5), 0.1).map((c) => c.alpha));
  assert.ok(on > off * 1.5 || off > on * 1.5, `the blink: ${on} then ${off}`);
  assert.equal(appear(5, 0.1), 1);
  assert.ok(appear(FULL, 0) === 0 && appear(0, 0) === 0, 'nothing at either end');
});

test('the twin rolls against the ship: the same speed the other way is the mirror image', () => {
  const [l, r] = [drawn(ship(5, { vx: SHIP_SPEED })), drawn(ship(5, { vx: -SHIP_SPEED }))];
  const [a, b] = [body(l), body(r)];
  const mid = 1920 - 700;
  assert.ok(Math.abs(a.box[0] - (2 * mid - b.box[2])) < 1e-6 && Math.abs(a.box[2] - (2 * mid - b.box[0])) < 1e-6, `${a.box} and ${b.box}`);
  assert.notDeepEqual(a.box, body(drawn(ship(5))).box, 'and it is not the same as flying straight');
});

test('the ship draws the twin with it: one glass body beside the ship, which is drawn from paths', () => {
  const T = tracker();
  drawShip(T.ctx, { ship: ship(5) }, look, 1);
  const bodies = T.calls.filter((c) => c.img.width === 184 && c.comp === 'source-over');
  assert.equal(bodies.length, 1, 'one body: the twin');
});

test('a mirror shot is a glass crystal with a prismatic train and a glint; other shots are left to the streaks', () => {
  const T = tracker();
  drawMirrorShots(T.ctx, [bolt(), { x: 300, y: 500, vx: 0, vy: -1400 }, { x: 400, y: 500, vx: 0, vy: -1100, trident: true }], 1);
  assert.ok(T.calls.length >= 5 && T.calls.length <= 8, `a train, two glows, the crystal and a glint for the one: ${T.calls.length}`);
  assert.ok(T.calls.every((c) => c.box[0] > 1100 && c.box[2] < 1300), 'every one of them about the mirror shot');
  const crystal = T.calls.find((c) => c.img.width === 32 && c.img.height === 80 && c.comp === 'source-over');
  assert.ok(crystal && crystal.alpha === 1, 'the crystal is opaque, over the light');
  const train = T.calls.find((c) => c.img.height === 120);
  assert.ok(train && train.box[1] > 500, 'and its train falls away behind it');
});

test('a mirror shot flies point first along its own velocity, whichever way that is', () => {
  const calls = (vx, vy) => {
    const r = recorder();
    drawMirrorShots(r.ctx, [bolt({ vx, vy })], 1);
    return r.calls.filter(([k]) => k === 'rotate').map(([, a]) => a);
  };
  assert.ok(Math.abs(calls(0, -1400)[0]) < 1e-9, 'straight up is no turn');
  assert.ok(calls(500, -1000)[0] > 0.4 && calls(-500, -1000)[0] < -0.4, 'leaning out of the vertical');
});

test('lasers-view leaves a mirror shot out of the streaks and their glow, and draws it as a bolt', () => {
  const run = (shots) => {
    const r = recorder();
    drawShots(r.ctx, { shots }, look, 1);
    return r.calls;
  };
  const plain = run([{ x: 300, y: 500, vx: 0, vy: -1400, r: 5 }]);
  const mirror = run([bolt()]);
  assert.equal(plain.filter(([k]) => k === 'moveTo').length, 3, 'a plain shot is a streak, stroked in three passes');
  assert.equal(mirror.filter(([k]) => k === 'moveTo').length, 0, 'a mirror shot is not');
  const glows = (calls) => calls.filter(([k, , , , w, h]) => k === 'drawImage' && w === 28 && h === 28).length;
  assert.equal(glows(plain), 1);
  assert.equal(glows(mirror), 0);
  assert.ok(mirror.filter(([k]) => k === 'drawImage').length >= 5, 'but the bolt is drawn');
});

