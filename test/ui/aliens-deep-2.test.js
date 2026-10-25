import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { look } from './deep-kit.js';
import { armored } from '../../src/ui/aliens/w15-4.js';
import { carrier, frontAngle, rearAngle } from '../../src/ui/aliens/w15-5.js';
import { claws, legs } from '../../src/ui/aliens/w15-claw.js';
import { helmet } from '../../src/ui/aliens/w15-8.js';
import { whelk } from '../../src/ui/aliens/w15-whelk.js';
import { chest, pole } from '../../src/ui/aliens/w15-chest.js';
import { rgb } from '../../src/ui/sprites.js';
import { recorder, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// Lantern Deep's armoured and carrier aliens: the hermit crab in a diving helmet and the sea turtle with a
// lantern and a chest (w15-4.js .. w15-chest.js). Painters are called straight, so none of this needs the
// registry in aliens/bake.js.

const PAINTERS = { armored, carrier };
const colourOf = (role) => look.palette.alien[role];
const lit = ({ calls }) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke'].includes(k)).length;
const text = ({ calls }) => calls.map((c) => c.map((a) => (typeof a === 'number' || typeof a === 'string' ? a : '~')).join(',')).join(';');

function paint(role, f, make = recorder) {
  const [b, l] = [make(), make()];
  PAINTERS[role](b.ctx, l.ctx, f, colourOf(role));
  return { b, l };
}

// Every colour a painter gives its lights: strings set as fill or stroke, and gradient stops.
function lightColours(role, f) {
  const seen = [];
  const lights = new Proxy({}, {
    get: (o, k) => (k in o ? o[k] : /^create(Linear|Radial)Gradient$/.test(k) ? () => ({ addColorStop: (_, c) => seen.push(c) }) : () => sink),
    set: (o, k, v) => {
      if ((k === 'fillStyle' || k === 'strokeStyle') && typeof v === 'string') seen.push(v);
      o[k] = v;
      return true;
    },
  });
  PAINTERS[role](recorder().ctx, lights, f, colourOf(role));
  return seen;
}

const toRgb = (c) => {
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
  return m ? [+m[1], +m[2], +m[3]] : rgb(c);
};

test('both aliens paint a body with lights over it on both beats', () => {
  for (const role of Object.keys(PAINTERS)) {
    for (const f of [0, 1]) {
      const { b, l } = paint(role, f);
      assert.ok(lit(l) >= 8, `${role} frame ${f}: ${lit(l)} fills and strokes of light`);
      assert.ok(b.calls.length > lit(l) * 5, `${role} frame ${f} has a lavish body under its lights`);
    }
  }
});

test('the two beats of each alien are clearly two drawings, in body and in lights', () => {
  for (const role of Object.keys(PAINTERS)) {
    const [a, b] = [paint(role, 0), paint(role, 1)];
    assert.notEqual(text(a.b), text(b.b), `${role}: the body is the same on both beats`);
    assert.notEqual(text(a.l), text(b.l), `${role}: the lights are the same on both beats`);
    const diff = a.b.calls.filter((c, i) => c.join() !== b.b.calls[i]?.join()).length;
    assert.ok(diff > 60, `${role}: only ${diff} drawing calls differ between the beats`);
  }
});

test('the crab: claws trade places, legs step in turn, eyes glance and the hose swings from one beat to the next', () => {
  const part = (fn, f) => {
    const b = recorder();
    fn(b.ctx, f, colourOf('armored'));
    return text(b);
  };
  assert.notEqual(part(claws, 0), part(claws, 1), 'claws');
  assert.notEqual(part(legs, 0), part(legs, 1), 'legs');
  const [h0, h1] = [0, 1].map((f) => {
    const [b, l] = [recorder(), recorder()];
    helmet(b.ctx, l.ctx, f, colourOf('armored'));
    return [text(b), text(l)];
  });
  assert.notEqual(h0[0], h1[0], 'eyes, hose and coral');
  assert.notEqual(h0[1], h1[1], 'glints and eye gleams');
  const [w0, w1] = [0, 1].map((f) => {
    const [b, l] = [recorder(), recorder()];
    whelk(b.ctx, l.ctx, f);
    return text(b);
  });
  assert.notEqual(w0, w1, 'the coral on the shell sways');
});

test("the crab's helmet is the big opaque dome in the middle, where the cracks are baked", () => {
  const { b } = paint('armored', 0);
  const domes = b.calls.filter(([k, x, y, rx, ry]) => k === 'ellipse' && Math.abs(x) <= 2 && y > -8 && y < 2 && rx >= 16 && ry >= 15);
  assert.ok(domes.length >= 1, 'a brass dome at least 32 px wide, centred');
});

test('the turtle: front flippers stroke in turn, rear ones opposite, the lantern swings and the chest lid lifts on one beat', () => {
  for (const m of [-1, 1]) {
    assert.notEqual(frontAngle(m, 0), frontAngle(m, 1), 'front flipper');
    assert.notEqual(rearAngle(m, 0), rearAngle(m, 1), 'rear flipper');
    assert.notEqual(frontAngle(m, 0), frontAngle(-m, 0), 'the two sides are in opposite phase');
  }
  const swing = (f) => {
    const [b, l] = [recorder(), recorder()];
    pole(b.ctx, l.ctx, f);
    return [text(b), text(l)];
  };
  assert.notEqual(swing(0)[0], swing(1)[0], 'the lantern and its pole swing');
  assert.notEqual(swing(0)[1], swing(1)[1], 'the lantern glow swings with it');
  const lid = (f) => {
    const [b, l] = [recorder(), recorder()];
    chest(b.ctx, l.ctx, f);
    return lit(l);
  };
  assert.ok(lid(1) > lid(0), 'a thread of light under the lifted lid');
});

test("the carrier's lantern is pale gold with a teal glow, and no light is the bullets' amber", () => {
  const enemy = toRgb(look.palette.enemy);
  for (const role of Object.keys(PAINTERS)) {
    for (const f of [0, 1]) {
      for (const c of lightColours(role, f)) {
        const d = Math.hypot(...toRgb(c).map((v, i) => v - enemy[i]));
        assert.ok(d > 70, `${role} frame ${f}: the light ${c} is within ${d.toFixed(0)} of the enemy's amber`);
      }
    }
  }
  const cols = lightColours('carrier', 0).map(toRgb);
  assert.ok(cols.some(([r, g, b]) => r > 240 && g > 225 && b > 170 && b < 215), 'a pale gold-white flame');
  assert.ok(cols.some(([r, g, b]) => g > 220 && b > 200 && r < 160), 'a teal glow');
});

test('every drawing, lights and blooms included, lies inside its canvas on both beats', () => {
  for (const role of Object.keys(PAINTERS)) {
    const half = (PAINTERS[role].size ?? 96) / 2;
    for (const f of [0, 1]) {
      const { b, l } = paint(role, f, tracker);
      const n = `${role} frame ${f}`;
      assert.ok(b.bounds.x0 >= -half + 1.5 && b.bounds.x1 <= half - 1.5, `${n}: body ${b.bounds.x0.toFixed(1)}..${b.bounds.x1.toFixed(1)} side to side`);
      assert.ok(b.bounds.y0 >= -half + 1.5 && b.bounds.y1 <= half - 1.5, `${n}: body ${b.bounds.y0.toFixed(1)}..${b.bounds.y1.toFixed(1)} top to bottom`);
      assert.ok(l.bounds.x0 >= -half && l.bounds.x1 <= half && l.bounds.y0 >= -half && l.bounds.y1 <= half, `${n}: lights ${l.bounds.x0.toFixed(1)},${l.bounds.y0.toFixed(1)} .. ${l.bounds.x1.toFixed(1)},${l.bounds.y1.toFixed(1)}`);
    }
  }
});

test('every painter puts the transform and the clip back: as many restores as saves, on the body and on the lights', () => {
  for (const role of Object.keys(PAINTERS)) {
    for (const f of [0, 1]) {
      const { b, l } = paint(role, f);
      for (const [name, c] of [['body', b], ['lights', l]]) {
        const n = (k) => c.calls.filter(([key]) => key === k).length;
        assert.equal(n('save'), n('restore'), `${role} frame ${f} ${name}`);
      }
    }
  }
});

test("the crab's and the turtle's files follow the sprite rules: no shadow blur, no clock or dice, under 200 lines", () => {
  const dir = new URL('../../src/ui/aliens/', import.meta.url);
  const mine = /^w15-(4|5|8|9|kit-2|claw|whelk|hose|flip|chest)\.js$/;
  const files = readdirSync(dir).filter((n) => mine.test(n));
  assert.equal(files.length, 10, 'the ten files of the crab and the turtle');
  for (const name of files) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
});
