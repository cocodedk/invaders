import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { art } from '../../src/ui/aliens/bake.js';
import { tubePts, bez, tidy, rod, band, blocked } from '../../src/ui/aliens/w17-kit.js';
import { wisp, flake, glare, coal } from '../../src/ui/aliens/w17-fx.js';
import { scales } from '../../src/ui/aliens/w17-cigar-leaf.js';
import { look, ROLES, colours, toRgb, hsv, recorder, tracker, stateful } from './smogal-kit.js';

// Ash to Air's kit (aliens/w17-kit.js, w17-cigar-leaf.js), the colours of the five invaders and the rules their files follow.

const A = art(look);
const count = ({ calls }, key) => calls.filter(([k]) => k === key).length;

test('palette.alien has the five roles, each a distinct warm tobacco colour, the pack alone a pale cream', () => {
  const p = look.palette.alien;
  assert.deepEqual(Object.keys(p).sort(), [...ROLES].sort());
  assert.equal(new Set(Object.values(p)).size, 5);
  for (const role of ROLES.filter((r) => r !== 'carrier')) {
    const [h, s] = hsv(toRgb(p[role]));
    assert.ok(h >= 15 && h <= 50 && s > 0.35, `${role} ${p[role]} is not ember, amber or brown`);
  }
  const [, s, v] = hsv(toRgb(p.carrier));
  assert.ok(s < 0.15 && v > 0.9, 'the pack is cream white');
});

test('no body or light is the bullets\' hot magenta, in any colour or gradient stop, on either beat', () => {
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const bad = colours(A, role, f).filter((c) => {
        const [h, s, v] = hsv(toRgb(c));
        return h >= 290 && h <= 345 && s > 0.35 && v > 0.5;
      });
      assert.deepEqual(bad, [], `${role} frame ${f} paints a bullet colour`);
    }
  }
});

test('nothing is printed: no text, no images, no clip art, on any invader or beat', () => {
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const [b, l] = [recorder(), recorder()];
      A[role](b.ctx, l.ctx, f, '#ffffff');
      for (const c of [b, l]) assert.deepEqual(c.calls.filter(([k]) => /Text|drawImage|putImageData/.test(k)), [], `${role} frame ${f}`);
    }
  }
});

test('the kit: a tube is a closed outline down its own axis, a bezier hits both ends, a rod paints every layer of every segment', () => {
  const pts = tubePts(() => 0, () => 5, -10, 10, 8);
  assert.equal(pts.length, 18);
  assert.deepEqual([pts[0], pts[8], pts[9], pts[17]], [[-5, -10], [-5, 10], [5, 10], [5, -10]]);
  const c = bez([0, 0], [10, 10], [-10, 20], [0, 30], 12);
  assert.deepEqual([c[0], c[12]], [[0, 0], [0, 30]]);
  const r = recorder();
  rod(r.ctx, [[0, 0], [4, 8], [6, 16]], [3, 2.5, 2], [['#000', 2, 1, 0, 0], ['#888', 0, 0.5, -1, -1]]);
  assert.equal(count(r, 'stroke'), 4);
  const bnd = recorder();
  band(bnd.ctx, [0, 0], 0.5, 4, 5, '#d9a441');
  assert.equal(count(bnd, 'save'), count(bnd, 'restore'));
  assert.ok(count(bnd, 'fill') >= 1 && count(bnd, 'stroke') >= 2);
});

test('smoke, a flake and a coal stay where they are put, and the light of a coal is cut away behind what stands in front', () => {
  const t = tracker();
  wisp(t.ctx, [[0, 0, 4], [3, -10, 5], [1, -20, 6]], 1);
  assert.ok(t.bounds.x0 >= -12 && t.bounds.x1 <= 15 && t.bounds.y0 >= -34 && t.bounds.y1 <= 10, JSON.stringify(t.bounds)); // the radius, the billow and the dark underlay
  const f = tracker();
  flake(f.ctx, 10, 10, 2, 0.5, 3);
  assert.ok(f.bounds.x0 >= 10 - 4 && f.bounds.x1 <= 10 + 4 && f.bounds.y0 >= 10 - 4 && f.bounds.y1 <= 10 + 4);
  const l = recorder();
  coal(l.ctx, 0, 0, 5, 3, 1);
  assert.ok(count(l, 'fill') >= 1 && count(l, 'save') === count(l, 'restore'));
  const cut = recorder();
  const modes = [];
  const spy = new Proxy(cut.ctx, { set: (o, k, v) => { if (k === 'globalCompositeOperation') modes.push(v); o[k] = v; return true; } });
  blocked(spy, (g) => g.rect(0, 0, 4, 4));
  assert.ok(modes.includes('destination-out') && count(cut, 'fill') === 1 && count(cut, 'save') === count(cut, 'restore'));
});

test('a pair of angry eyes is dark sockets and brows on the body and two glowing slits on the lights; glow scales its bloom', () => {
  const [b, l, b2, l2] = [recorder(), recorder(), recorder(), recorder()];
  glare(b.ctx, l.ctx, 0, 0, 5, 3, 1.6, 0.5);
  glare(b2.ctx, l2.ctx, 0, 0, 5, 3, 1.6, 0.5, '#ff7a30', 0.4);
  assert.equal(count(b, 'fill'), 2);
  assert.equal(count(b, 'stroke'), 2, 'a brow over each');
  assert.ok(count(l, 'fill') >= 2);
  const first = ({ calls }) => calls.find(([k]) => k === 'createRadialGradient');
  assert.ok(first(l) && first(l2), 'the bloom is a radial gradient');
});

test('the cigar\'s leaf scales are a few dozen pointed leaves, each filled, veined and edged, the lowest row first', () => {
  const r = recorder();
  scales(r.ctx, () => 18, -30, 15, 8);
  const fills = count(r, 'fill');
  assert.ok(fills >= 40 && fills < 200, `${fills} scales and sheens`);
  assert.equal(count(r, 'save'), count(r, 'restore'));
  const s = stateful();
  scales(s.ctx, () => 18, -30, 15, 8);
  assert.equal(s.stack.length, 0);
});

test('tidy gives back every piece of both contexts, even a painter that changes them and never restores', () => {
  const [b, l] = [stateful(), stateful()];
  const before = { ...b.state };
  const messy = tidy((bb, ll) => {
    for (const g of [bb, ll]) {
      g.lineCap = 'round';
      g.lineWidth = 9;
      g.globalAlpha = 0.2;
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = '#fff';
    }
  });
  messy(b.ctx, l.ctx, 0, '#fff');
  for (const g of [b, l]) assert.deepEqual({ ...g.state }, before);
});

test("Ash to Air's painters follow the sprite rules: no shadow blur, no clock or dice, every file under 200 lines, each with its comment block", () => {
  const dir = new URL('../../src/ui/aliens/', import.meta.url);
  const names = readdirSync(dir).filter((n) => /^w17(-[\w-]+)?\.js$/.test(n));
  assert.ok(names.length >= 10, `${names.length} files: ${names.join(' ')}`);
  for (const name of names) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now|fillText|strokeText/.test(src), `${name} uses no shadow blur, dice, clock or text`);
    assert.ok(src.startsWith('//'), `${name} starts with its comment block`);
  }
});
