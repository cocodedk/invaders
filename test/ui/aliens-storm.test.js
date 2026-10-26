import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';
import { look, ROLES, colourOf, paint, lit, text, colours, tracker, toRgb, sink } from './aliens-storm-kit.js';

// Anvil Sky's five creatures: the storm hornet, the lightning dart, the thunder turret, the anvil-plated hulk and the cargo
// balloon (aliens/w18.js .. w18-*.js), as the painters draw them; the pieces they share are in w18-kit.js.
installCanvas(64);
const { art } = await import('../../src/ui/aliens/bake.js');
const { jag, bolt } = await import('../../src/ui/aliens/w18-kit.js');
const { default: w18 } = await import('../../src/ui/aliens/w18.js');
const { recorder } = await import('./dom-kit.js');

const A = art(look);
const width = ({ bounds: b }) => b.x1 - b.x0;
const height = ({ bounds: b }) => b.y1 - b.y0;

test("the world's module is registered with its own motion and a forge-gold crack colour, and has a painter for every role", () => {
  assert.equal(look.world, 18);
  assert.equal(A, art({ world: 18 }), 'the baker keeps one module a world');
  assert.equal(A.grunt, w18.grunt, 'bake.js has the world-18 module in slot 18');
  assert.equal(A.rate, 2.6);
  assert.ok(A.bob >= 1 && A.bob <= 4);
  assert.ok(A.halo > 0 && A.halo < 0.4);
  assert.equal(A.crack, '#ffd060');
  for (const role of ROLES) assert.equal(typeof A[role], 'function', role);
  assert.equal(A.diver.size, 120, 'the dart has a taller canvas for its trail');
  for (const role of ROLES.filter((r) => r !== 'diver')) assert.equal(A[role].size, undefined, `${role} keeps the 96 px canvas`);
});

test('every creature paints a lavish body with light over it, on both beats', () => {
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const { b, l } = paint(A, role, f);
      assert.ok(lit(l) >= 12, `${role} frame ${f}: ${lit(l)} fills and strokes of light`);
      assert.ok(lit(b) >= 60, `${role} frame ${f}: ${lit(b)} fills and strokes of body`);
      assert.ok(b.calls.length >= 300, `${role} frame ${f}: ${b.calls.length} calls of body is not lavish`);
      assert.ok(b.calls.length > l.calls.length, `${role} frame ${f} has a body under its lights`);
    }
  }
});

test('the beats are two drawings: the lights differ for every creature, and the body too where it moves; each is deterministic', () => {
  for (const role of ROLES) {
    const [a, b] = [paint(A, role, 0), paint(A, role, 1)];
    assert.notEqual(text(a.l), text(b.l), `${role}: the lights are the same on both beats`);
    const again = paint(A, role, 1);
    assert.equal(text(again.b), text(b.b), `${role}: painted twice, the body differs`);
    assert.equal(text(again.l), text(b.l), `${role}: painted twice, the lights differ`);
  }
  for (const role of ['grunt', 'gunner', 'carrier']) { // the wings beat, the fans turn, the crate swings
    assert.notEqual(text(paint(A, role, 0).b), text(paint(A, role, 1).b), `${role}: the body is the same on both beats`);
  }
});

test('the five roles are five different drawings', () => {
  assert.equal(new Set(ROLES.map((role) => text(paint(A, role, 0).b))).size, 5);
});

test('the hornet beats its wings: the solid fore wing is raised and swept back up the sprite on beat 0, spread out and low on beat 1', () => {
  const fore = (f) => paint(A, 'grunt', f).b.calls.filter(([k]) => k === 'rotate').map((c) => c[1]).slice(4).filter((_, i) => i % 2 === 1)[0]; // after the ghost pose's four turns
  assert.ok(fore(0) < -0.9, `${fore(0)} rad on beat 0`);
  assert.ok(fore(1) > -0.1 && fore(1) < 0.6, `${fore(1)} rad on beat 1`);
  const [w0, w1] = [paint(A, 'grunt', 0, tracker), paint(A, 'grunt', 1, tracker)];
  assert.ok(w0.b.bounds.y0 <= w1.b.bounds.y0 + 0.5, 'the raised wings do not make it shorter');
});

test('the dart is long and narrow, and its trail runs up the sprite in a different bolt on each beat', () => {
  const [d0, d1] = [paint(A, 'diver', 0, tracker), paint(A, 'diver', 1, tracker)];
  assert.ok(height(d0.b) > width(d0.b) * 1.1, `${height(d0.b).toFixed(0)} tall against ${width(d0.b).toFixed(0)} across`);
  assert.ok(d0.l.bounds.y0 < d0.b.bounds.y0 - 14 && d1.l.bounds.y0 < d1.b.bounds.y0 - 14, 'the trail streams out behind the hull');
  assert.ok(d0.l.bounds.y1 <= d0.b.bounds.y1 + 6, 'and nothing glows far ahead of the nose');
  const bolts = (f) => paint(A, 'diver', f).l.calls.filter(([k]) => k === 'lineTo').length;
  assert.ok(bolts(0) >= 25 && bolts(1) >= 25, 'jagged bolts: many short segments');
});

test('the turret is the tallest of the lot but one, with a coil on top whose arcs jump a different way each beat', () => {
  const [t0, t1] = [paint(A, 'gunner', 0, tracker), paint(A, 'gunner', 1, tracker)];
  assert.ok(height(t0.b) >= 70 && height(t1.b) >= 70, `${height(t0.b).toFixed(0)} px from coil to emitter`);
  assert.ok(width(t0.b) >= 56, 'the fans stand out either side');
  assert.notEqual(text(paint(A, 'gunner', 0).l), text(paint(A, 'gunner', 1).l));
});

test('the hulk is an anvil: far wider than it is tall, a horn out to the left, the heel and the base short of it', () => {
  const { b } = paint(A, 'armored', 0, tracker);
  assert.ok(width(b) > height(b) * 1.15, `${width(b).toFixed(0)} across, ${height(b).toFixed(0)} tall`);
  assert.ok(b.bounds.x0 < -36, `the horn reaches ${b.bounds.x0.toFixed(0)}`);
  assert.ok(width(b) >= 70, 'the biggest silhouette in the sky on the level');
});

test('the balloon is the tallest creature, with its crate hung well under the envelope', () => {
  const { b } = paint(A, 'carrier', 0, tracker);
  assert.ok(height(b) >= 88, `${height(b).toFixed(0)} px of pennant, envelope and crate`);
  const area = (role) => { const { b: body } = paint(A, role, 0, tracker); return height(body); };
  for (const role of ['grunt', 'diver', 'gunner', 'armored']) assert.ok(height(b) >= area(role), role);
});

test('every creature and its lights lie inside the canvas with the outline to spare, on both beats', () => {
  for (const role of ROLES) {
    const half = (A[role].size ?? 96) / 2;
    for (const f of [0, 1]) {
      const { b, l } = paint(A, role, f, tracker);
      const n = `${role} frame ${f}`;
      assert.ok(b.bounds.x0 >= -half + 1.5 && b.bounds.x1 <= half - 1.5, `${n}: body ${b.bounds.x0.toFixed(1)}..${b.bounds.x1.toFixed(1)} side to side`);
      assert.ok(b.bounds.y0 >= -half + 1.5 && b.bounds.y1 <= half - 1.5, `${n}: body ${b.bounds.y0.toFixed(1)}..${b.bounds.y1.toFixed(1)} top to bottom`);
      assert.ok(l.bounds.x0 >= -half && l.bounds.x1 <= half && l.bounds.y0 >= -half && l.bounds.y1 <= half, `${n}: a glow reaches the canvas edge and is cut off`);
    }
  }
});

// A context that keeps what a painter may change, with a real save and restore, and hands everything else to the sink.
function stateful() {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const stack = [];
  const ctx = new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
  return { ctx, state, stack };
}

test('every painter gives back the line caps and joins, width, colours, alpha and blend mode, and pairs every save with a restore', () => {
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const [b, l] = [stateful(), stateful()];
      const before = { ...b.state };
      A[role](b.ctx, l.ctx, f, colourOf(role));
      for (const [name, s] of [['body', b], ['lights', l]]) {
        assert.equal(s.stack.length, 0, `${role} frame ${f} ${name}: unbalanced saves`);
        assert.deepEqual({ ...s.state }, before, `${role} frame ${f} ${name}`);
      }
      const { b: rb, l: rl } = paint(A, role, f);
      for (const c of [rb, rl]) {
        const n = (k) => c.calls.filter(([key]) => key === k).length;
        assert.equal(n('save'), n('restore'), `${role} frame ${f}`);
      }
    }
  }
});

test("nothing the creatures are painted in comes near the enemy's hot rose", () => {
  const [er, eg, eb] = toRgb(look.palette.enemy);
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      for (const c of colours(A, role, f).filter((s) => s.startsWith('#'))) {
        const [r, g, b] = toRgb(c);
        const d = Math.hypot(r - er, g - eg, b - eb);
        assert.ok(d >= 60, `${role}: ${c} is too near the bullets' rose (${d.toFixed(0)})`);
      }
    }
  }
});

test('a zigzag keeps its ends, has the segments it was asked for and is the same for the same seed', () => {
  const pts = jag(3, 0, 0, 20, 40, 6, 5);
  assert.equal(pts.length, 7);
  assert.deepEqual(pts[0], [0, 0]);
  assert.deepEqual(pts[6], [20, 40]);
  assert.deepEqual(pts, jag(3, 0, 0, 20, 40, 6, 5));
  assert.notDeepEqual(pts, jag(4, 0, 0, 20, 40, 6, 5));
  const strayed = pts.slice(1, -1).some(([x, y]) => Math.abs(x - (y / 40) * 20) > 0.5);
  assert.ok(strayed, 'it does not run straight');
  const { ctx, calls } = recorder();
  bolt(ctx, pts, '#8ad0ff', 2, 1);
  assert.ok(calls.filter(([k]) => k === 'stroke').length >= 4, 'a glow, the colour and a white core');
});
