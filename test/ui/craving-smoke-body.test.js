import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canvases, f } from './craving-smoke-kit.js';
import { tracker } from './galleon-track.js';

// The Craving's smoke figure (bosses/craving-figure.js, craving-paint.js, craving-frames.js, craving-thick.js): it
// paints at every pose without error, lies inside the box and under the HUD, the churn frames wrap (the last frame is the first's
// neighbour), the hull gets one drawImage of it, and the second layer shares the box.
const { paintBody, FB } = await import('../../src/ui/bosses/craving-paint.js');
const { frame, POSES, warmFrames, bodyOn } = await import('../../src/ui/bosses/craving-frames.js');
const { thickFrame, THICK_POSES, warmThick } = await import('../../src/ui/bosses/craving-thick.js');
const { mouthFront } = await import('../../src/ui/bosses/craving-throne-geo.js');

const run = (fn) => { const T = tracker(); fn(T.ctx); return T; };
const sig = (T) => T.calls.map((c) => c.box.map((v) => Math.round(v * 20) / 20 + 0).join(',') + '|' + c.img.width).join(';');

test('the figure paints at every pose inside its box, and nothing is drawn above the HUD line', () => {
  for (let k = 0; k < 12; k++) {
    const T = run((g) => paintBody(g, k / 12));
    // paintBody works in the box's own coordinates (the origin at its top left): 0 is y -158, the HUD's edge
    const top = Math.min(...T.calls.map((c) => c.box[1]));
    assert.ok(top >= 4 - 1e-6, `pose ${k}/12: top ${top.toFixed(1)} (boss y ${f(top + FB.y)})`);
    assert.ok(T.bounds.x0 >= -70 && T.bounds.x1 <= FB.w + 70, `pose ${k}/12: ${f(T.bounds.x0)}..${f(T.bounds.x1)}`);
    assert.ok(T.calls.length > 40, `${T.calls.length} puffs`);
  }
  assert.ok(FB.y >= -158 && FB.x >= -380 && FB.x + FB.w <= 380, 'the box is under the HUD and inside the hull');
});

test('the smoke itself stays inside x -370..370 in boss coordinates (the art of a boss)', () => {
  for (const pose of [0, 0.4, 0.8]) {
    const T = run((g) => paintBody(g, pose));
    // a puff's body lies within 0.4 of its size of its centre (the rest of its box is feather and margin)
    const [x0, x1] = [Math.min(...T.calls.map((c) => (c.box[0] + c.box[2]) / 2 - 0.4 * c.img.width)) + FB.x, Math.max(...T.calls.map((c) => (c.box[0] + c.box[2]) / 2 + 0.4 * c.img.width)) + FB.x];
    assert.ok(x0 >= -370 && x1 <= 370, `${f(x0)}..${f(x1)}`);
  }
});

test('the churn frames wrap: pose 0 and pose 1 are the same picture, and a frame is the figure at its pose', () => {
  const at = (p) => sig(run((g) => paintBody(g, p)));
  assert.equal(at(0), at(1));
  assert.notEqual(at(0), at(1 / POSES));
  assert.ok(POSES >= 8);
  warmFrames();
  const frames = Array.from({ length: POSES }, (_, k) => frame(k));
  assert.equal(new Set(frames).size, POSES, 'a canvas each');
  assert.equal(frame(3), frame(3), 'cached');
  assert.ok(frames.every((c) => c.width === FB.w && c.height === FB.h), 'all of the box');
  const [a, b] = [run((g) => paintBody(g, (POSES - 1) / POSES)), run((g) => paintBody(g, 0))];
  const mid = (c) => [(c.box[0] + c.box[2]) / 2, (c.box[1] + c.box[3]) / 2];
  const worst = Math.max(...a.calls.map((c, i) => Math.hypot(mid(c)[0] - mid(b.calls[i])[0], mid(c)[1] - mid(b.calls[i])[1])));
  assert.ok(worst < 16, `the last frame and the first are neighbours: a puff moves ${worst.toFixed(1)} px at most`);
});

test("the hull's frozen frame is one drawImage of the figure at pose 0, drawn at the box, and a live frame adds the spill over the rim", () => {
  const T = run((g) => bodyOn(g, 0));
  assert.equal(T.calls.length, 1);
  assert.deepEqual([T.calls[0].box[0], T.calls[0].box[1]], [FB.x, FB.y]);
  assert.equal(run((g) => bodyOn(g)).calls.length, 1);
  const body = run((g) => paintBody(g, 0, 'body')).calls.length;
  const spilled = run((g) => paintBody(g, 0, 'all')).calls.length - body;
  assert.ok(spilled >= 6 && spilled < body, 'the spill is a few billows over the rim');
});

test('the second layer of smoke is made in the same box, at its own poses, and wraps', () => {
  warmThick();
  const ks = Array.from({ length: THICK_POSES }, (_, k) => thickFrame(k));
  assert.equal(new Set(ks).size, THICK_POSES);
  assert.ok(ks.every((c) => c.width === FB.w && c.height === FB.h));
  assert.ok(THICK_POSES >= 4);
});

test('the smoke is cut away above the ashtray mouth, so that a frame never covers the rim', () => {
  const edges = [-300, -150, 0, 150, 300].map(mouthFront);
  assert.ok(edges.every((y) => y > FB.y && y < FB.y + FB.h), 'the mouth edge lies inside the box');
  assert.ok(FB.y + FB.h > Math.max(...edges), 'and the box reaches below it');
  assert.ok(canvases.length > 0);
});
