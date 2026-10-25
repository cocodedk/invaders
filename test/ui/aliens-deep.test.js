import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { art, roleSprites } from '../../src/ui/aliens/bake.js';
import { bez, ribbon, freckles } from '../../src/ui/aliens/w15-kit.js';
import { look } from './deep-kit.js';
import { installCanvas, recorder, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// Lantern Deep's creatures of the first three roles: the lantern jellyfish, the darting squid and the
// pufferfish that swells to fire (the hermit crab and the turtle are tested with their own files).

const ROLES = ['grunt', 'diver', 'gunner'];
const lit = ({ calls }) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke'].includes(k)).length;

function paint(role, f, make = recorder) {
  const [b, l] = [make(), make()];
  art(look)[role](b.ctx, l.ctx, f, look.palette.alien[role]);
  return { b, l };
}

// A drawing as text: every call with its numbers and strings (gradients and other objects as ~).
const text = ({ calls }) => calls.map((c) => c.map((a) => (typeof a === 'number' || typeof a === 'string' ? a : '~')).join(',')).join(';');
const width = ({ bounds: b }) => b.x1 - b.x0;

test("the world's module is registered with its own motion and crack colour, and has a painter for every role", () => {
  const a = art(look);
  assert.equal(look.world, 15);
  assert.equal(a.rate, 2);
  assert.equal(a.bob, 3);
  assert.equal(a.halo, 0.22);
  assert.equal(a.crack, '#bff4ff');
  for (const role of ['grunt', 'diver', 'gunner', 'armored', 'carrier']) assert.equal(typeof a[role], 'function', role);
});

test('the jellyfish, squid and pufferfish each glow on their lights layer on both beats, over a real body', () => {
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const { b, l } = paint(role, f);
      assert.ok(lit(l) >= 8, `${role} frame ${f}: ${lit(l)} fills and strokes of light`);
      assert.ok(b.calls.length > lit(l) * 3, `${role} frame ${f} has a body under its lights`);
    }
  }
});

test('both beats are two drawings, bodies and lights alike: the bell pulses, the colour pattern changes, the fish swells', () => {
  for (const role of ROLES) {
    const [a, b] = [paint(role, 0), paint(role, 1)];
    assert.notEqual(text(a.b), text(b.b), `${role}: the body is the same on both beats`);
    assert.notEqual(text(a.l), text(b.l), `${role}: the lights are the same on both beats`);
  }
});

test('the bell is wide and relaxed on beat 0 and narrower and taller on beat 1, the fins are out and then folded', () => {
  const [j0, j1] = [paint('grunt', 0, tracker), paint('grunt', 1, tracker)];
  assert.ok(width(j0.b) > width(j1.b) + 12, `jelly ${width(j0.b).toFixed(1)} wide relaxed against ${width(j1.b).toFixed(1)} squeezed`);
  assert.ok(j1.b.bounds.y0 < j0.b.bounds.y0 - 3, 'the squeezed bell stands taller');
  const [s0, s1] = [paint('diver', 0, tracker), paint('diver', 1, tracker)];
  assert.ok(width(s0.b) > width(s1.b) + 12, `squid ${width(s0.b).toFixed(1)} wide with its fins out against ${width(s1.b).toFixed(1)} folded`);
});

test('the pufferfish is calm on beat 0 and swollen on beat 1: more body, more spines, a mouth glowing hot', () => {
  const [calm, swollen] = [paint('gunner', 0), paint('gunner', 1)];
  assert.ok(lit(swollen.l) > lit(calm.l) * 1.5, `${lit(swollen.l)} fills and strokes of light swollen against ${lit(calm.l)} calm`);
  const lines = ({ calls }) => calls.filter(([k]) => k === 'lineTo').length;
  assert.ok(lines(swollen.b) >= lines(calm.b), 'every spine is drawn on both beats, longer on the second');
  const [t0, t1] = [paint('gunner', 0, tracker), paint('gunner', 1, tracker)];
  assert.ok(width(t1.b) > width(t0.b) + 14, `${width(t1.b).toFixed(1)} px across swollen, ${width(t0.b).toFixed(1)} calm`);
  const bright = ({ calls }) => Math.max(0, ...calls.filter(([k]) => k === 'fillRect').map((c) => c[3]));
  assert.ok(bright(swollen.l) >= 20, 'the muzzle blooms wide');
});

test('every creature and its lights lie inside the 96 px canvas, the swollen pufferfish and every bloom included, on both beats', () => {
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const { b, l } = paint(role, f, tracker);
      const n = `${role} frame ${f}`;
      assert.ok(b.bounds.x0 >= -46.5 && b.bounds.x1 <= 46.5, `${n}: body ${b.bounds.x0.toFixed(1)}..${b.bounds.x1.toFixed(1)} side to side`);
      assert.ok(b.bounds.y0 >= -46.5 && b.bounds.y1 <= 46.5, `${n}: body ${b.bounds.y0.toFixed(1)}..${b.bounds.y1.toFixed(1)} top to bottom`);
      assert.ok(l.bounds.x0 >= -48 && l.bounds.x1 <= 48 && l.bounds.y0 >= -48 && l.bounds.y1 <= 48, `${n}: a bloom reaches the canvas edge`);
    }
  }
});

// A context that keeps the saved state of the two settings a painter must give back: alpha and the blend mode.
function stateful() {
  const o = { globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const stack = [];
  const ctx = new Proxy(o, {
    get: (t, k) => {
      if (k === 'save') return () => stack.push([t.globalAlpha, t.globalCompositeOperation]);
      if (k === 'restore') return () => ([t.globalAlpha, t.globalCompositeOperation] = stack.pop());
      return k in t ? t[k] : () => sink;
    },
    set: (t, k, v) => ((t[k] = v), true),
  });
  return { ctx, o, stack };
}

test('every painter puts the transform, the clip, the alpha and the blend mode back, on the body and on the lights', () => {
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const { b, l } = paint(role, f);
      for (const [name, c] of [['body', b], ['lights', l]]) {
        const n = (k) => c.calls.filter(([key]) => key === k).length;
        assert.equal(n('save'), n('restore'), `${role} frame ${f} ${name}`);
      }
      const [sb, sl] = [stateful(), stateful()];
      art(look)[role](sb.ctx, sl.ctx, f, look.palette.alien[role]);
      for (const [name, s] of [['body', sb], ['lights', sl]]) {
        assert.equal(s.stack.length, 0, `${role} frame ${f} ${name}: unbalanced saves`);
        assert.equal(s.o.globalAlpha, 1, `${role} frame ${f} ${name} alpha`);
        assert.equal(s.o.globalCompositeOperation, 'source-over', `${role} frame ${f} ${name} blend mode`);
      }
    }
  }
});

test('the bake gives every one of them a body, lights and a white hit-flash silhouette for each beat, 96 px square', () => {
  installCanvas(96);
  for (const role of ROLES) {
    const set = roleSprites(look, role);
    assert.equal(set.size, 96);
    for (const part of ['body', 'lights', 'flash']) assert.equal(set[part].length, 2, `${role} ${part}`);
    for (const f of [0, 1]) assert.notEqual(set.flash[f], set.body[f], `${role}: the flash is a copy of its own`);
  }
});

test('the kit: a bezier hits both ends, a ribbon narrows toward its tip, freckles stay inside their ellipse', () => {
  const pts = bez([0, 0], [10, 10], [-10, 20], [0, 30], 12);
  assert.deepEqual([pts[0], pts[12]], [[0, 0], [0, 30]]);
  const out = ribbon(pts, 8, 2);
  assert.equal(out.length, pts.length * 2);
  const gap = (i) => Math.hypot(out[i][0] - out[out.length - 1 - i][0], out[i][1] - out[out.length - 1 - i][1]);
  assert.ok(gap(1) > gap(pts.length - 2) * 1.5, 'wider at the root than at the tip');
  const t = tracker();
  freckles(t.ctx, 60, 5, 10, -5, 12, 8, ['#fff'], 0.5, 1.5);
  assert.ok(t.bounds.x0 >= 10 - 12 - 1.5 && t.bounds.x1 <= 10 + 12 + 1.5 && t.bounds.y0 >= -5 - 8 - 1.5 && t.bounds.y1 <= -5 + 8 + 1.5);
});

test("Lantern Deep's first three painters follow the sprite rules: no shadow blur, no clock or dice, files under 200 lines", () => {
  const dir = new URL('../../src/ui/aliens/', import.meta.url);
  for (const name of ['w15.js', 'w15-kit.js', 'w15-2.js', 'w15-3.js', 'w15-6.js', 'w15-7.js']) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
});
