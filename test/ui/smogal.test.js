import { test } from 'node:test';
import assert from 'node:assert/strict';
import { art, roleSprites } from '../../src/ui/aliens/bake.js';
import { look, ROLES, colourOf, paint, lit, text, tracker, stateful } from './smogal-kit.js';
import { installCanvas } from './dom-kit.js';

// Ash to Air's five invaders, the habit itself: the lit cigarette, the flicked butt, the tobacco pipe, the fat cigar and the
// plain pack (aliens/w17.js .. w17-pack.js).

const A = art(look);
const width = ({ bounds: b }) => b.x1 - b.x0;
const height = ({ bounds: b }) => b.y1 - b.y0;

test("the world's module is registered with quick embers and an ember-glow crack colour, and has a painter for every role", () => {
  assert.equal(look.world, 17);
  assert.equal(A.rate, 2.2);
  assert.ok(A.bob >= 1 && A.bob <= 4);
  assert.ok(A.halo > 0 && A.halo < 0.4);
  assert.equal(A.crack, '#ffb060');
  for (const role of ROLES) assert.equal(typeof A[role], 'function', role);
});

test('every invader paints a lavish body with its fire shining over it, on both beats', () => {
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const { b, l } = paint(A, role, f);
      assert.ok(lit(l) >= 6, `${role} frame ${f}: ${lit(l)} fills and strokes of light`);
      assert.ok(b.calls.length > lit(l) * 3, `${role} frame ${f} has a body under its lights`);
      assert.ok(b.calls.length > 600, `${role} frame ${f}: ${b.calls.length} calls of body is not lavish`);
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

test('the five roles are five different drawings with five different outlines', () => {
  const bodies = ROLES.map((role) => text(paint(A, role, 0).b));
  assert.equal(new Set(bodies).size, 5);
  const shapes = ROLES.map((role) => {
    const { bounds: o } = paint(A, role, 0, tracker).b;
    return [width({ bounds: o }), height({ bounds: o }), o.x0, o.y0].map(Math.round).join(',');
  });
  assert.equal(new Set(shapes).size, 5, shapes.join(' | '));
});

test('everything that glows is on the lights layer: every invader has plenty of light, and no body is ever painted additively', () => {
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const { l } = paint(A, role, f);
      assert.ok(l.calls.length > 40, `${role} frame ${f}: ${l.calls.length} calls of light`);
      const body = stateful();
      const modes = [];
      const spy = new Proxy(body.ctx, { set: (o, k, v) => { if (k === 'globalCompositeOperation') modes.push(v); o[k] = v; return true; } });
      A[role](spy, stateful().ctx, f, colourOf(role));
      assert.ok(!modes.includes('lighter'), `${role} frame ${f}: the body is painted additively`);
    }
  }
});

test('the lit cigarette burns at its bottom: the coal and the ash are below the middle, its smoke curls up the flank', () => {
  const [g0, g1] = [paint(A, 'grunt', 0, tracker), paint(A, 'grunt', 1, tracker)];
  assert.ok(g0.l.bounds.y1 > 30, `${g0.l.bounds.y1.toFixed(1)}: the glow reaches the lower end`);
  assert.ok(height(g0.b) > 76, `${height(g0.b).toFixed(1)} px tall: a long, slim cigarette`);
  assert.ok(width(g0.b) < 56, `${width(g0.b).toFixed(1)} px across: slim`);
  assert.notEqual(Math.round(g0.b.bounds.x1 * 10), Math.round(g1.b.bounds.x1 * 10), 'the smoke curl sways the other way on beat 1');
});

test('the flicked butt is a spiky teardrop: a long trail of smoke above, the stub low, tumbling the other way on beat 1', () => {
  const [d0, d1] = [paint(A, 'diver', 0, tracker), paint(A, 'diver', 1, tracker)];
  for (const d of [d0, d1]) {
    assert.ok(d.b.bounds.y0 < -40, `${d.b.bounds.y0.toFixed(1)}: the trail runs far above`);
    assert.ok(d.l.bounds.y0 > -8, 'the fire is low, in the stub, not up the trail');
  }
  const centre = (d) => (d.b.bounds.x0 + d.b.bounds.x1) / 2;
  assert.ok(Math.abs(centre(d0) - centre(d1)) > 3, 'the stub is flung over to opposite sides on the two beats');
});

test('the pipe puffs on beat 1: more light, a wider glow, a cloud of smoke under its mouth, and the stem curves away up and right', () => {
  const [calm, puff] = [paint(A, 'gunner', 0), paint(A, 'gunner', 1)];
  assert.ok(lit(puff.l) > lit(calm.l) + 3, `${lit(puff.l)} fills and strokes of light puffing against ${lit(calm.l)} calm`);
  assert.ok(puff.b.calls.length > calm.b.calls.length + 20, 'the cloud is painted');
  const [t0, t1] = [paint(A, 'gunner', 0, tracker), paint(A, 'gunner', 1, tracker)];
  assert.ok(t1.b.bounds.x1 > 28 && t1.b.bounds.y0 < -38, 'the stem reaches the upper right');
  assert.ok(t1.l.bounds.y1 > t0.l.bounds.y1 + 4, 'the puff and its sparks glow lower than the calm coal');
});

test('the cigar is the tank: the most body drawing of the five, and the fattest barrel', () => {
  const calls = (role) => paint(A, role, 0).b.calls.length;
  const [armored, ...others] = [calls('armored'), ...ROLES.filter((r) => r !== 'armored').map(calls)];
  assert.ok(armored > Math.max(...others), `${armored} calls against ${others.join(', ')}`);
  const t = paint(A, 'armored', 0, tracker);
  assert.ok(width(t.b) >= 48, `${width(t.b).toFixed(1)} px of girth and tilt`);
});

test('the pack rocks and its lid and cigarettes jiggle on beat 1; the ember in the lid pulses brighter', () => {
  const [p0, p1] = [paint(A, 'carrier', 0, tracker), paint(A, 'carrier', 1, tracker)];
  assert.notEqual(Math.round(p0.b.bounds.x0 * 10), Math.round(p1.b.bounds.x0 * 10), 'the box is turned a different way');
  assert.ok(p0.b.bounds.y1 - p0.b.bounds.y0 > 80, 'a tall pack with its lid and cigarettes');
  const dot = (f) => paint(A, 'carrier', f).l.calls.filter(([k, , , w]) => k === 'arc' && w < 3).map((c) => c[3]);
  assert.ok(Math.max(...dot(1)) > Math.max(...dot(0)), 'the ember dot swells');
});

test('every invader and its lights lie inside the 96 px canvas with the outline to spare, on both beats', () => {
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
