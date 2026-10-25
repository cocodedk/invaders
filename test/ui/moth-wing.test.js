import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canvases, look, def, f } from './moth-kit.js';
import { tracker } from './galleon-track.js';
import { polygon, contains } from './moth-poly.js';

// The Vesper Moth's forewing and the frames of its slow wingbeat: a fan of 20 lancet panes in lead, one frame baked
// for each pose of the beat, each holding the one before (so the part's static body, which the hull, the poster and the
// collapse show, never peeks out round a frame), every frame inside its canvas and under the HUD, the right wing the
// left mirrored, and the damage layers (cracks, shattered panes, the white flash) clipped to the wing. The live
// drawing of the frames is moth-live.test.js.
const geo = await import('../../src/ui/bosses/moth-wing-geo.js');
const { paintWing, TILT, GROW, wave } = await import('../../src/ui/bosses/moth-wing.js');
const { FB, POSES, LS, wingFrame, wingFlash, crackLayer, pose } = await import('../../src/ui/bosses/moth-frames.js');
const { HUD, PAD } = await import('./moth-kit.js');

const wing = def.parts.find((p) => p.id === 'wingL');
const margin = (await import('../../src/ui/bosses/moth.js')).default.margins.wingL;

// The outline at beat pose p: the rest outline turned and swelled about the base the way the frames are.
const turned = (p, n = 24) => {
  const [c, s] = [Math.cos(TILT * p), Math.sin(TILT * p)];
  return polygon((g) => geo.outline(g), n).map(([x, y]) => {
    const [dx, dy] = [(x - geo.HUB[0]) * (1 + GROW[0] * p), (y - geo.HUB[1]) * (1 + GROW[1] * p)];
    return [geo.HUB[0] + dx * c - dy * s, geo.HUB[1] + dx * s + dy * c];
  });
};

test('the forewing is a fan of 20 lancet panes: 6 veins, 4 rows, each pane with a pointed head and a pointed notch in its foot', () => {
  assert.equal((geo.NV - 1) * geo.ROWS, 20);
  assert.equal(geo.ROOTS.length, geo.NV);
  assert.equal(geo.RING.length, geo.F.length);
  for (let k = 1; k <= geo.ROWS + 1; k++) {
    assert.equal(geo.ARCHES[k].length, geo.NV - 1, `ring ${k} is a chain of ${geo.NV - 1} arches`);
    for (const a of geo.ARCHES[k]) {
      assert.ok(a.h >= 4 && a.h <= 15, `an arch ${a.h.toFixed(1)} px high`);
      const mid = [(a.p[0] + a.q[0]) / 2, (a.p[1] + a.q[1]) / 2];
      assert.ok(Math.hypot(a.apex[0] - mid[0], a.apex[1] - mid[1]) > 3.5, 'its point stands clear of its feet');
    }
  }
  const out = polygon((g) => geo.outline(g));
  for (let r = 1; r <= geo.ROWS; r++) {
    for (let i = 0; i < geo.NV - 1; i++) {
      const cell = polygon((g) => geo.cellPath(g, i, r));
      assert.ok(cell.length > 20, 'a pane has curved edges');
      assert.deepEqual(contains(out, cell, 1.2), [], `pane ${i},${r} lies inside the wing`);
    }
  }
  const root = polygon((g) => geo.rootPath(g));
  assert.deepEqual(contains(out, root, 1.2), [], 'and so does the stone at the root');
  assert.ok(wing.dx + geo.HUB[0] > -120 && wing.dx + geo.HUB[0] < -80, 'the base meets the thorax: the root is at the body');
});

test('every frame holds the wing at rest, and every pose holds the one before: the static body never peeks out', () => {
  const rest = polygon((g) => geo.outline(g), 24);
  let before = rest;
  for (let k = 1; k < POSES; k++) {
    const now = turned(k / (POSES - 1));
    assert.deepEqual(contains(now, rest, 0.6), [], `pose ${k} holds the wing at rest`);
    assert.deepEqual(contains(now, before, 0.6), [], `and pose ${k - 1}`);
    before = now;
  }
});

test('the beat swells the wing across and up and tips it, within its frame and under the HUD', () => {
  const extent = (p) => {
    const [b, l] = [tracker(), tracker()];
    b.ctx.translate(-FB.x, -FB.y);
    paintWing(b.ctx, l.ctx, p);
    return b.bounds;
  };
  let prev = null;
  for (let k = 0; k < POSES; k++) {
    const e = extent(k / (POSES - 1));
    assert.ok(e.x0 >= 0 && e.y0 >= 0 && e.x1 <= FB.w && e.y1 <= FB.h, `pose ${k} lies in the frame: ${f(e.x0)}..${f(e.x1)}, ${f(e.y0)}..${f(e.y1)} of ${FB.w} x ${FB.h}`);
    assert.ok(wing.dy + e.y0 + FB.y >= HUD, `pose ${k} stays under the HUD: ${f(wing.dy + e.y0 + FB.y)}`);
    assert.ok(wing.dx + e.x0 + FB.x >= -PAD, `and inside the pad: ${f(wing.dx + e.x0 + FB.x)}`);
    if (prev) {
      assert.ok(e.x0 < prev.x0 && e.y0 < prev.y0 && e.x1 > prev.x1, `pose ${k} reaches further out and up than the one before`);
    }
    prev = e;
  }
  assert.ok(GROW[0] >= 0.1 && GROW[1] >= 0.08, 'the swell is a good part of a tenth');
  assert.ok(FB.y + wing.dy >= HUD, 'the frames\' canvas starts under the HUD line');
  assert.ok(margin >= 50, 'the wings are margined for it');
});

test('the frames are baked once each, as canvases of the frame\'s box with their light beside them at half the size', () => {
  const before = canvases.length;
  const frames = Array.from({ length: POSES - 1 }, (_, i) => wingFrame(i + 1));
  assert.equal(new Set(frames.map((x) => x.body)).size, POSES - 1, 'a frame for each pose after the rest');
  for (const x of frames) {
    assert.deepEqual([x.body.width, x.body.height], [FB.w, FB.h]);
    assert.deepEqual([x.lights.width, x.lights.height], [FB.w * LS, FB.h * LS], 'the soft light at half resolution');
  }
  assert.ok(canvases.length - before <= 0 || canvases.length >= before, 'made before or now, and never twice');
  assert.equal(wingFrame(3), frames[2], 'a frame is kept');
  assert.equal(POSES, 8);
  assert.equal(wingFrame(0 + 1).body, frames[0].body);
  void look;
});

test('a wave of light runs out through the rows of panes as the wing rises, and the glass brightens with the pose', () => {
  const peak = (p) => [1, 2, 3, 4].map((r) => wave(r, p));
  const rowOf = (p) => peak(p).indexOf(Math.max(...peak(p)));
  assert.deepEqual([0, 0.34, 0.67, 1].map(rowOf), [0, 1, 2, 3], 'from the root row to the margin row');
  for (const p of [0, 1 / 3, 2 / 3, 1]) assert.equal(Math.max(...peak(p)), 1, `pose ${p.toFixed(2)} has its row at full glow`);
  for (const p of [0.1, 0.25, 0.5, 0.75, 0.9]) assert.ok(Math.max(...peak(p)) > 0.4, `and between the rows the light is shared`);
  assert.ok(peak(0).every((v, i) => v >= 0 && v <= 1 && (i < 3 || v === 0)), 'and the margin is dark at rest');
});

test('the swell and turn the live pass gives the damage layers are the frames\' own', () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (o, k) => (...a) => { calls.push([k, ...a]); } });
  pose(ctx, 1);
  assert.deepEqual(calls.map((c) => c[0]), ['translate', 'rotate', 'scale', 'translate']);
  assert.deepEqual(calls[0].slice(1), geo.HUB);
  assert.equal(calls[1][1], TILT);
  assert.deepEqual(calls[2].slice(1), [1 + GROW[0], 1 + GROW[1]]);
  assert.deepEqual(calls[3].slice(1), geo.HUB.map((v) => -v));
});

test('the damage layers and the flash are clipped to the wing: stage 2 is a wreck of stage 1', () => {
  const layers = [wingFlash(), crackLayer(1), crackLayer(2)];
  for (const c of layers) assert.deepEqual([c.width, c.height], [FB.w, FB.h]);
  assert.equal(new Set(layers).size, 3);
  assert.equal(crackLayer(1), crackLayer(1), 'baked once');
  for (const c of layers) {
    const b = c.T.bounds;
    assert.ok(b.x0 >= 0 && b.y0 >= 0 && b.x1 <= FB.w && b.y1 <= FB.h, 'inside the frame\'s box');
  }
  assert.ok(wing.dy + FB.y + layers[2].T.bounds.y0 >= HUD, 'under the HUD');
  assert.ok(layers[2].T.bounds.y1 - layers[2].T.bounds.y0 >= layers[1].T.bounds.y1 - layers[1].T.bounds.y0 - 5, 'and the second stage reaches as far as the first');
});
