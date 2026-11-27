import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WOOD } from '../../src/core/levels-8-wood.js';
import { recorder, paintStrip, STRIP_SPAN, level, data } from './course-land-kit.js';
const { PENCIL, TIP_POINT, traceReach, paintTrace } = await import('../../src/ui/course-land-trace.js');
const { PAL } = await import('../../src/ui/wander-kit.js');

const { at, x } = WOOD.course.trace;
const kAt = Math.floor(at / STRIP_SPAN);
const run = (painted, k, c = WOOD.course) => {
  const r = recorder();
  const styles = new Set();
  const ctx = new Proxy(r.ctx, { set: (o, p, v) => { if (p === 'fillStyle' || p === 'strokeStyle') styles.add(v); o[p] = v; return true; } });
  paintTrace(ctx, painted, k, c);
  return { calls: r.calls, styles };
};

test('Leg 2 carries a trace in its quiet stretch after lantern 1, and Leg 1 has none', () => {
  assert.ok(at > 6200 && at < 7800, 'between lantern 1 and the next spawn');
  assert.equal(data.trace, undefined);
  assert.equal(run(false, kAt, data).calls.length, 0);
});

test('strips far from the pencil draw none of it, strips that overlap it draw it whole', () => {
  const reach = traceReach(WOOD.course.trace.a);
  for (let k = 0; k < 80; k++) {
    const lo = k * STRIP_SPAN;
    const near = at + reach > lo && at - reach < lo + STRIP_SPAN;
    assert.equal(run(true, k).calls.length > 0, near, `strip ${k}`);
  }
});

test('neighbouring strips put the pencil on the same course row and the same x', () => {
  const place = (k) => run(false, k).calls.find(([n]) => n === 'translate');
  const [, x0, y0] = place(kAt);
  const [, x1, y1] = place(kAt + 1);
  assert.equal(x0, x);
  assert.equal(x1, x);
  assert.equal(y0, (kAt + 1) * STRIP_SPAN - at);
  assert.equal(y1 - y0, STRIP_SPAN);
});

test('the sketch is pencil only; the painted bake adds yellow lacquer and bare wood', () => {
  const sketch = run(false, kAt);
  const painted = run(true, kAt);
  assert.ok(!sketch.styles.has(PAL.lacquer) && !sketch.styles.has(PAL.woodBare));
  assert.ok(painted.styles.has(PAL.lacquer) && painted.styles.has(PAL.woodBare));
  assert.ok(painted.calls.length > sketch.calls.length);
});

test('the pencil is a tower long and about 110 px thick, and its point lies apart from the cone', () => {
  assert.ok(PENCIL.body + PENCIL.cone >= 1100 && PENCIL.body + PENCIL.cone <= 1300);
  assert.equal(PENCIL.width, 110);
  assert.ok(PENCIL.tipGap > 0);
});

test('Leg 2 strips outside the trace paint exactly as paintStrip did without it', () => {
  const far = 40;
  const r = recorder();
  paintStrip(r.ctx, true, far, WOOD.seed, WOOD.course);
  assert.ok(!r.calls.some(([n]) => n === 'translate'));
  const near = recorder();
  paintStrip(near.ctx, true, kAt, WOOD.seed, WOOD.course);
  assert.ok(near.calls.some(([n]) => n === 'translate'));
  assert.equal(level.id, 'w22-1');
});

test("the graphite line starts at the snapped point's tip, not off it", () => {
  const { u, v } = TIP_POINT;
  const tilt = PENCIL.tipTilt;
  assert.ok(Math.abs(u - (PENCIL.body + PENCIL.cone) / 2 - PENCIL.tipGap - PENCIL.tipLen * Math.cos(tilt)) < 1e-9);
  assert.ok(Math.abs(v - PENCIL.tipDrift - PENCIL.tipLen * Math.sin(tilt)) < 1e-9);
  assert.ok(run(false, kAt).calls.some(([n, x, y]) => n === 'moveTo' && x === u && y === v), 'the first stroke of the line begins at the point');
});

test('the fallen pencil lies under the canopies: in a strip that holds both, it is drawn before any crown', () => {
  const seq = [];
  const r = recorder();
  const ctx = new Proxy(r.ctx, { set: (o, p, val) => { if (p === 'fillStyle') seq.push(val); o[p] = val; return true; } });
  paintStrip(ctx, true, kAt, WOOD.seed, WOOD.course);
  const [pencil, crown] = [seq.indexOf(PAL.lacquer), seq.indexOf(PAL.canopy)];
  assert.ok(pencil >= 0 && crown >= 0, 'both are in the strip');
  assert.ok(pencil < crown, 'the pencil first');
});
