import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { paintStrip, STRIP_SPAN, bandAt, level, data, world, recorder, SPAWN_Y, WIDTH, HEIGHT } from './course-land-kit.js';
import { sink } from './dom-kit.js';
import { mix } from '../../src/ui/sprites.js';
import { PAL } from '../../src/ui/wander-kit.js';
import { fileRules } from './aliens-bath-kit.js';

// The rock of a strip of World 22's land (course-land-rock.js): cut out of both canvases of the strip along the very edge the collision uses, and on the sketch
// pencilled with CONTOURS wobbly lines inside the hole. The live rock (course-view.js) shows through the hole, so the lines are baked, not drawn a frame.
const { CONTOURS, CONTOUR_GAP, CONTOUR_INK, CONTOUR_STEP, CONTOUR_WOBBLE, contourOffset } = await import('../../src/ui/course-land-rock.js');
const { drawCourse, buildCourseView } = await import('../../src/ui/course-view.js');

const hi = (k) => (k + 1) * STRIP_SPAN;
const [keyAt, keyLeft, keyRight] = data.walls.find(([at, left, right], i) => i > 0 && left > 0 && right < WIDTH && at % CONTOUR_STEP !== 0); // off the grid: no row there by chance
const KEY_STRIP = Math.floor(keyAt / STRIP_SPAN);
const near = (a, b) => Math.abs(a - b) < 1e-6;

// A context that records each call with the composite operation and fill style it was made under.
function spy() {
  const calls = [];
  const state = { globalCompositeOperation: 'source-over' };
  const ctx = new Proxy(state, {
    get: (o, k) => (k in o ? o[k] : (...a) => {
      calls.push(Object.assign([k, ...a], { op: o.globalCompositeOperation, style: o.fillStyle, ink: o.strokeStyle }));
      return sink;
    }),
    set: (o, k, v) => ((o[k] = v), true),
  });
  return { ctx, calls, state };
}
const bake = (painted, k) => {
  const r = spy();
  paintStrip(r.ctx, painted, k, level.seed, data);
  return r;
};
// Every path of a recording: the call that closed it, and its subpaths (each a list of [x, y]), in order.
function paths(calls) {
  const out = [];
  let subs = [];
  for (const c of calls) {
    if (c[0] === 'beginPath') subs = [];
    else if (c[0] === 'moveTo' || (c[0] === 'lineTo' && !subs.length)) subs.push([[c[1], c[2]]]);
    else if (c[0] === 'lineTo') subs.at(-1).push([c[1], c[2]]);
    else if (c[0] === 'fill' || c[0] === 'stroke') out.push({ kind: c[0], op: c.op, style: c.style, ink: c.ink, subs, at: calls.indexOf(c) });
  }
  return out;
}
const cuts = (calls) => paths(calls).filter((p) => p.kind === 'fill' && p.op === 'destination-out');
const lines = (calls) => paths(calls).filter((p) => p.kind === 'stroke' && p.at > calls.findLastIndex((c) => c[0] === 'fill' && c.op === 'destination-out'));
const atOf = (k, [, y]) => hi(k) - y;

test('the rock is cut out of the sketch and the painted strip along the very edge bandAt gives, corners and all, so no seed colour lands in it', () => {
  for (const painted of [false, true]) {
    const { calls, state } = bake(painted, KEY_STRIP);
    const [left, right] = cuts(calls);
    assert.equal(cuts(calls).length, 2, `painted ${painted}: one hole a side`);
    for (const cut of cuts(calls)) assert.ok(/^#|,\s*1\)$/.test(cut.style), `a translucent fill (${cut.style}) would only half cut the strip`);
    for (const [cut, side] of [[left, 'left'], [right, 'right']]) {
      const [poly] = cut.subs;
      const edge = poly.slice(1, -1); // the two ends lie off the canvas, out in the screen's edge
      assert.ok(poly[0][0] < 0 === (side === 'left') && poly.at(-1)[0] < 0 === (side === 'left'), 'the ends are outside the screen');
      assert.ok(edge[0][1] < 0 && edge.at(-1)[1] > STRIP_SPAN, 'the edge runs past both ends of the strip');
      edge.forEach((p, i) => {
        assert.ok(near(p[0], bandAt(data, atOf(KEY_STRIP, p))[side]), `${side} vertex ${i} is on the edge`);
        if (i) assert.ok(p[1] > edge[i - 1][1], 'top to bottom');
      });
      for (let i = 1; i < edge.length; i++) { // between two vertices the edge is straight: its middle is the collision's edge too
        const mid = [(edge[i][0] + edge[i - 1][0]) / 2, (edge[i][1] + edge[i - 1][1]) / 2];
        assert.ok(near(mid[0], bandAt(data, atOf(KEY_STRIP, mid))[side]), `${side} between vertex ${i - 1} and ${i}`);
      }
      assert.ok(edge.some((p) => near(p[1], hi(KEY_STRIP) - keyAt) && near(p[0], side === 'left' ? keyLeft : keyRight)), `${side}: the keyframe's corner is a vertex`);
    }
    assert.equal(state.globalCompositeOperation, 'source-over', 'the context is left as it was found');
  }
});

test('the sketch has CONTOURS lines a side, CONTOUR_GAP apart plus their sway, through every keyframe; the painted strip has none', () => {
  assert.equal(lines(bake(true, KEY_STRIP).calls).length, 0, 'colour needs no pencil: the sketch has it');
  const found = lines(bake(false, KEY_STRIP).calls);
  assert.ok(found.length >= 1);
  const ink = mix(PAL.rock, PAL.pencil, CONTOUR_INK); // opaque: drawLand blits a strip's last row twice over a seam, and a translucent line would be inked twice there
  assert.ok(found.every((p) => p.ink === ink && /^#/.test(p.ink)), `the lines are the pencil on the tan, ${ink}, and opaque`);
  const subs = found.flatMap((p) => p.subs);
  assert.equal(subs.length, 2 * CONTOURS);
  const seen = new Set();
  for (const sub of subs) {
    const at0 = atOf(KEY_STRIP, sub[0]);
    const { left, right } = bandAt(data, at0);
    const side = sub[0][0] < left ? -1 : 1;
    const k = Math.round(Math.abs(sub[0][0] - (side < 0 ? left : right)) / CONTOUR_GAP);
    seen.add(side * k);
    assert.ok(k >= 1 && k <= CONTOURS);
    for (const p of sub) {
      const at = atOf(KEY_STRIP, p);
      const band = bandAt(data, at);
      assert.ok(near(p[0], (side < 0 ? band.left : band.right) + side * contourOffset(at, k)), `line ${side * k}, row ${p[1]}`);
    }
    assert.ok(sub.some((p) => near(p[1], hi(KEY_STRIP) - keyAt)), `line ${side * k} turns at the keyframe`);
    assert.ok(sub[0][1] < 0 && sub.at(-1)[1] > STRIP_SPAN, 'and runs past both ends');
    sub.forEach((p, i) => i && assert.ok(p[1] > sub[i - 1][1] && p[1] - sub[i - 1][1] <= CONTOUR_STEP + 1e-6, 'a point every CONTOUR_STEP at most'));
  }
  assert.equal(seen.size, 2 * CONTOURS, 'every line once');
});

test('a line has the same x on the row two strips share, so the lines run on through the seam', () => {
  assert.equal(STRIP_SPAN % CONTOUR_STEP, 0, 'every seam has a point on it');
  for (const k of [KEY_STRIP - 1, KEY_STRIP, 12]) {
    const [upper, lower] = [bake(false, k + 1), bake(false, k)].map((r) => lines(r.calls).flatMap((p) => p.subs));
    const points = (subs, kk) => new Map(subs.flatMap((sub, i) => sub.map((p) => [`line ${i}, row ${Math.round(atOf(kk, p))}`, p[0]])));
    const [a, b] = [points(upper, k + 1), points(lower, k)];
    const shared = [...a.keys()].filter((key) => b.has(key));
    assert.ok(shared.length >= 3 * 2 * CONTOURS, `strip ${k}: ${shared.length} shared points, a row on either side of the seam too`);
    for (const key of shared) assert.ok(near(a.get(key), b.get(key)), `strip ${k}, ${key}`);
  }
});

test('the sway is a function of the row and the line alone: CONTOUR_WOBBLE at most, never the same twice running, and lines never meet', () => {
  assert.ok(CONTOUR_GAP > 2 * CONTOUR_WOBBLE, 'two lines never touch');
  for (let k = 1; k <= CONTOURS; k++) {
    const sway = Array.from({ length: 2000 }, (_, at) => contourOffset(at, k) - k * CONTOUR_GAP);
    assert.ok(sway.every((s) => Math.abs(s) <= CONTOUR_WOBBLE + 1e-9), `line ${k} stays within the sway`);
    assert.ok(Math.max(...sway) > 0.95 * CONTOUR_WOBBLE && Math.min(...sway) < -0.95 * CONTOUR_WOBBLE, `line ${k} does sway`);
    assert.equal(contourOffset(1234.5, k), contourOffset(1234.5, k));
  }
  assert.notEqual(contourOffset(100, 1) - CONTOUR_GAP, contourOffset(100, 2) - 2 * CONTOUR_GAP, 'the lines sway out of step');
});

// The live frame: the tan under the land, the edge over it.
const [mouth] = data.walls.find(([at, left]) => at > 9000 && left > 0);
const inGorge = (dist = 0) => world(mouth + 600 - SPAWN_Y + HEIGHT / 2 + dist); // the screen's middle 600 px into the gorge: rock both sides, the whole way down
const frame = (w, cv, t = 0) => {
  const r = recorder();
  drawCourse(r.ctx, cv, w, t);
  return r.calls;
};

test('the live rock is its tan fill under the land and its pencilled edge over it, and draws no contour: the lines are in the strips', () => {
  const calls = frame(inGorge(), buildCourseView(level.seed));
  const at = (name) => calls.flatMap(([k], i) => (k === name ? [i] : []));
  const [strips, fills, strokes] = ['drawImage', 'fill', 'stroke'].map(at);
  assert.ok(strips.length >= 3, 'the land is drawn');
  assert.equal(fills.length, 2, 'one tan fill a side');
  assert.ok(fills.every((i) => i < strips[0]), 'under every strip');
  assert.equal(strokes.length, 2, 'one pencilled edge a side, no live contour');
  assert.ok(strokes.every((i) => i > strips.at(-1)), 'over the last strip');
});

test('the rock does not move with the clock: the frame is the same at any t, and a strip pencils the same lines every time it is baked', () => {
  const [w, cv] = [inGorge(), buildCourseView(level.seed)];
  const dump = (t) => JSON.stringify(frame(w, cv, t).map(([k, ...a]) => [k, ...a.map((v) => (typeof v === 'object' ? 'strip' : v))]));
  assert.equal(dump(7.3), dump(0), 'any t');
  const pencilled = () => JSON.stringify(lines(bake(false, KEY_STRIP).calls));
  assert.equal(pencilled(), pencilled());
  assert.notEqual(pencilled(), JSON.stringify(lines(bake(false, KEY_STRIP + 1).calls)), 'and another strip has others');
});

test('the rock file keeps the sprite rules, and the strips draw no rock outside it', () => {
  fileRules(assert, ['course-land-rock.js']);
  const art = readFileSync(new URL('../../src/ui/course-land-art.js', import.meta.url), 'utf8');
  assert.ok(/course-land-rock\.js/.test(art), 'paintStrip hands the rock to it');
});
