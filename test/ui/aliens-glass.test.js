import { test } from 'node:test';
import assert from 'node:assert/strict';
import { art, roleSprites } from '../../src/ui/aliens/bake.js';
import { look, ROLES, colourOf, paint, lit, text, tracker, sink } from './aliens-glass-kit.js';
import { installCanvas } from './dom-kit.js';

// Glass Cathedral's five creatures: the stained-glass beetle, the glass swallow, the candle wisp in its lantern, the
// stone gargoyle with stained-glass wings and the gilded reliquary on glass wings (aliens/w16.js .. w16-5.js).

const A = art(look);
const width = ({ bounds: b }) => b.x1 - b.x0;

test("the world's module is registered with its own motion and a pale-gold crack colour, and has a painter for every role", () => {
  assert.equal(look.world, 16);
  assert.equal(A.rate, 2.4);
  assert.ok(A.bob >= 1 && A.bob <= 4);
  assert.ok(A.halo > 0 && A.halo < 0.4);
  assert.equal(A.crack, '#ffe6a8');
  for (const role of ROLES) assert.equal(typeof A[role], 'function', role);
});

test('every creature paints a lavish body with light shining over it, on both beats', () => {
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const { b, l } = paint(A, role, f);
      assert.ok(lit(l) >= 8, `${role} frame ${f}: ${lit(l)} fills and strokes of light`);
      assert.ok(b.calls.length > lit(l) * 3, `${role} frame ${f} has a body under its lights`);
      assert.ok(b.calls.length > 250, `${role} frame ${f}: ${b.calls.length} calls of body is not lavish`);
    }
  }
});

test('both beats are two drawings, body and lights alike, and every painting is deterministic', () => {
  for (const role of ROLES) {
    const [a, b] = [paint(A, role, 0), paint(A, role, 1)];
    assert.notEqual(text(a.b), text(b.b), `${role}: the body is the same on both beats`);
    assert.notEqual(text(a.l), text(b.l), `${role}: the lights are the same on both beats`);
    const again = paint(A, role, 1);
    assert.equal(text(again.b), text(b.b), `${role}: painted twice, the body differs`);
    assert.equal(text(again.l), text(b.l), `${role}: painted twice, the lights differ`);
  }
});

test('the five roles are five different drawings', () => {
  const bodies = ROLES.map((role) => text(paint(A, role, 0).b));
  assert.equal(new Set(bodies).size, 5);
});

test('the swallow beats its wings: spread and low on beat 1, swept up on beat 0; the tail fork opens', () => {
  const [w0, w1] = [paint(A, 'diver', 0, tracker), paint(A, 'diver', 1, tracker)];
  assert.ok(width(w1.b) > width(w0.b) + 1.5, `${width(w1.b).toFixed(1)} px across on beat 1, ${width(w0.b).toFixed(1)} on beat 0`);
  assert.ok(w0.b.bounds.y0 <= w1.b.bounds.y0 + 0.5, 'the tail is not cut by the wings');
  assert.ok(w0.b.bounds.y1 - w0.b.bounds.y0 > 80, 'streamlined and long: the swallow is tall');
});

test('the lantern flares on beat 1: more light, a wider glow, the mouth open', () => {
  const [calm, flare] = [paint(A, 'gunner', 0), paint(A, 'gunner', 1)];
  assert.ok(lit(flare.l) > lit(calm.l) + 3, `${lit(flare.l)} fills and strokes of light flared against ${lit(calm.l)} calm`);
  const bloom = ({ calls }) => Math.max(0, ...calls.filter(([k]) => k === 'fillRect').map((c) => c[3]));
  assert.ok(bloom(flare.l) >= bloom(calm.l), 'the flare blooms at least as wide');
  const ellipses = ({ calls }) => calls.filter(([k]) => k === 'ellipse').length;
  assert.ok(ellipses(flare.b) >= ellipses(calm.b), 'the face is drawn on both beats');
  const [t0, t1] = [paint(A, 'gunner', 0, tracker), paint(A, 'gunner', 1, tracker)];
  assert.ok(t1.b.bounds.y1 - t1.b.bounds.y0 >= 80 && t0.b.bounds.y1 - t0.b.bounds.y0 >= 80, 'a tall lantern on both beats');
});

test('the gargoyle swings its window wings wider on beat 1 and its eyes burn brighter', () => {
  const [g0, g1] = [paint(A, 'armored', 0, tracker), paint(A, 'armored', 1, tracker)];
  assert.ok(width(g1.b) > width(g0.b) + 2, `${width(g1.b).toFixed(1)} px across on beat 1, ${width(g0.b).toFixed(1)} on beat 0`);
  const eyes = (f) => paint(A, 'armored', f).l.calls.filter(([k, , , w]) => k === 'fillRect' && w < 20).map((c) => c[3]);
  assert.ok(Math.max(...eyes(1)) > Math.max(...eyes(0)) + 2, 'the eyes bloom wider on beat 1');
});

test("the reliquary's glass wings are raised on beat 0 and lowered on beat 1, and it is the largest of the five", () => {
  const [r0, r1] = [paint(A, 'carrier', 0, tracker), paint(A, 'carrier', 1, tracker)];
  assert.ok(r1.b.bounds.y1 >= r0.b.bounds.y1 - 0.5, 'its lowest point does not rise on the downstroke');
  assert.ok(width(r0.b) >= 78, `${width(r0.b).toFixed(1)} px of reliquary and wings`);
  const area = (role) => { const { b } = paint(A, role, 0, tracker); return width(b) * (b.bounds.y1 - b.bounds.y0); };
  const [carrier, ...others] = [area('carrier'), ...['grunt', 'gunner'].map(area)];
  assert.ok(others.every((a) => carrier > a), 'a touch larger than the beetle and the lantern');
});

test('every creature and its lights lie inside the 96 px canvas with the outline to spare, on both beats', () => {
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const { b, l } = paint(A, role, f, tracker);
      const n = `${role} frame ${f}`;
      assert.ok(b.bounds.x0 >= -46.5 && b.bounds.x1 <= 46.5, `${n}: body ${b.bounds.x0.toFixed(1)}..${b.bounds.x1.toFixed(1)} side to side`);
      assert.ok(b.bounds.y0 >= -46.5 && b.bounds.y1 <= 46.5, `${n}: body ${b.bounds.y0.toFixed(1)}..${b.bounds.y1.toFixed(1)} top to bottom`);
      assert.ok(l.bounds.x0 >= -48 && l.bounds.x1 <= 48 && l.bounds.y0 >= -48 && l.bounds.y1 <= 48, `${n}: a bloom reaches the canvas edge`);
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

test('the bake gives every role a body, lights and a white hit-flash silhouette for each beat, 96 px square', () => {
  installCanvas(96);
  for (const role of ROLES) {
    const set = roleSprites(look, role);
    assert.equal(set.size, 96);
    for (const part of ['body', 'lights', 'flash']) assert.equal(set[part].length, 2, `${role} ${part}`);
    for (const f of [0, 1]) assert.notEqual(set.flash[f], set.body[f], `${role}: the flash is a copy of its own`);
  }
});

test('there is no wreck painter and no separate saucer: the lead draws the wrecks, the carrier is the saucer', () => {
  assert.equal(A.wreck, undefined);
  assert.equal(A.saucer, undefined);
});
