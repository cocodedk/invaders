import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { art } from '../../src/ui/aliens/bake.js';
import { bez, poly, sector, pane, grain, tidy, STONE } from '../../src/ui/aliens/w16-kit.js';
import { lattice } from '../../src/ui/aliens/w16-wing.js';
import { look, ROLES, colours, toRgb, hsv, recorder, tracker, sink } from './aliens-glass-kit.js';

// Glass Cathedral's kit (aliens/w16-kit.js, w16-wing.js), the colours of the five creatures and the rules their files follow.

const A = art(look);
const count = ({ calls }, key) => calls.filter(([k]) => k === key).length;

test('the kit: a bezier hits both ends, a sector stays on its ring, a polygon traces on any context', () => {
  const pts = bez([0, 0], [10, 10], [-10, 20], [0, 30], 12);
  assert.deepEqual([pts[0], pts[12]], [[0, 0], [0, 30]]);
  const t = tracker();
  sector(t.ctx, 0, 0, 5, 10, 0, Math.PI / 2);
  assert.ok(t.bounds.x1 <= 10.01 && t.bounds.y1 <= 10.01, 'a quarter ring stays in its quarter');
  const [a, b] = [recorder(), recorder()];
  poly([[0, 0], [4, 0], [4, 4]])(a.ctx);
  poly([[0, 0], [4, 0], [4, 4]])(b.ctx);
  assert.deepEqual(a.calls.map((c) => c.slice(0, 3)), b.calls.map((c) => c.slice(0, 3)));
});

test('a pane of glass is filled, clipped for its heart and streak, set in lead and lit on the lights layer', () => {
  const [b, l] = [recorder(), recorder()];
  pane(b.ctx, l.ctx, poly([[0, 0], [10, 0], [10, 10], [0, 10]]), '#4fa8ff', [5, 5, 7], 0.2);
  assert.equal(count(b, 'clip'), 1);
  assert.ok(count(b, 'fill') >= 1 && count(b, 'stroke') >= 2, 'the fill, the came and its sheen');
  assert.equal(count(l, 'fill'), 1, 'the colour shining through');
  assert.equal(count(l, 'save'), count(l, 'restore'));
  const dark = recorder();
  pane(dark.ctx, null, poly([[0, 0], [10, 0], [10, 10]]), '#4fa8ff', [5, 5, 7]);
  assert.ok(count(dark, 'fill') >= 1, 'a pane needs no lights context');
});

test('a lattice of glass cuts a wing into rows by columns panes, each a clipped jewel, and outlines the whole wing', () => {
  const le = bez([0, 0], [10, -4], [20, -4], [30, 0], 18);
  const te = bez([0, 14], [10, 12], [20, 12], [30, 0], 18);
  const [b, l] = [recorder(), recorder()];
  lattice(b.ctx, l.ctx, le, te, 2, 6, (i, j) => (i + j) % 2 ? '#e6f1ff' : '#4fa8ff', 0.15);
  assert.equal(count(b, 'clip'), 12);
  assert.equal(count(l, 'fill'), 12);
  assert.ok(count(b, 'stroke') >= 12 * 2 + 3, 'a came round every pane and the heavy one round the wing');
});

test('stone grain is deterministic and stays inside its ellipse', () => {
  const [a, b] = [recorder(), recorder()];
  grain(a.ctx, 40, 7, 0, 0, 10, 6, 0.3);
  grain(b.ctx, 40, 7, 0, 0, 10, 6, 0.3);
  assert.equal(a.calls.length, b.calls.length);
  const t = tracker();
  grain(t.ctx, 60, 5, 10, -5, 12, 8);
  assert.ok(t.bounds.x0 >= 10 - 12 - 1.2 && t.bounds.x1 <= 10 + 12 + 1.2 && t.bounds.y0 >= -5 - 8 - 1.2 && t.bounds.y1 <= -5 + 8 + 1.2);
});

test('tidy gives back every piece of both contexts, even a painter that changes them and never restores', () => {
  const state = () => {
    const o = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000', fillStyle: '#000', globalAlpha: 1, globalCompositeOperation: 'source-over' };
    const stack = [];
    return new Proxy(o, {
      get: (t, k) => (k === 'save' ? () => stack.push({ ...t }) : k === 'restore' ? () => Object.assign(t, stack.pop()) : k in t ? t[k] : () => sink),
      set: (t, k, v) => ((t[k] = v), true),
    });
  };
  const messy = tidy((b, l) => {
    for (const g of [b, l]) {
      g.lineCap = 'round';
      g.lineWidth = 9;
      g.globalAlpha = 0.2;
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = '#fff';
    }
  });
  const [b, l] = [state(), state()];
  messy(b, l, 0, '#fff');
  for (const g of [b, l]) assert.deepEqual({ ...g }, { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000', fillStyle: '#000', globalAlpha: 1, globalCompositeOperation: 'source-over' });
});

test('no bright lime anywhere: acid lime is the enemy bullets\' alone, in any body or light, on either beat', () => {
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const bad = colours(A, role, f).filter((c) => {
        const [h, s, v] = hsv(toRgb(c));
        return h >= 70 && h <= 125 && s > 0.35 && v > 0.45;
      });
      assert.deepEqual(bad, [], `${role} frame ${f} paints lime`);
    }
  }
});

test('each role is its own hue: rose, cobalt, amber, violet and gilt', () => {
  const bands = { rose: [[320, 360], [0, 12]], amber: [[20, 52]], cobalt: [[195, 245]], violet: [[250, 295]] };
  const dominant = (role) => {
    const tally = {};
    for (const c of [...colours(A, role, 0), ...colours(A, role, 1)]) {
      const [h, s, v] = hsv(toRgb(c));
      if (s < 0.35 || v < 0.3) continue;
      for (const [name, spans] of Object.entries(bands)) if (spans.some(([a, z]) => h >= a && h <= z)) tally[name] = (tally[name] ?? 0) + 1;
    }
    return Object.entries(tally).sort((x, y) => y[1] - x[1])[0][0];
  };
  assert.deepEqual(ROLES.map(dominant), ['rose', 'cobalt', 'amber', 'violet', 'amber']);
  assert.ok(hsv(toRgb(look.palette.alien.carrier))[0] >= 40 && hsv(toRgb(STONE))[1] < 0.2, 'gilt gold and neutral stone');
});

test("Glass Cathedral's painters follow the sprite rules: no shadow blur, no clock or dice, every file under 200 lines", () => {
  const dir = new URL('../../src/ui/aliens/', import.meta.url);
  const names = readdirSync(dir).filter((n) => /^w16(-[\w]+)?\.js$/.test(n));
  assert.ok(names.length >= 10, `${names.length} files: ${names.join(' ')}`);
  for (const name of names) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
    assert.ok(src.startsWith('//'), `${name} starts with its comment block`);
  }
});
