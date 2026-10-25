import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recorder } from './dom-kit.js';
import { look, stateful, tracker, hsl, magentaish, parse } from './smogenv2-kit.js';

// World 17's mid layer (parallax-smog-mid*.js: older blocks, a church, water towers, an empty billboard, a bus shelter, a vacant lot,
// poles and wires, dead trees) and near layer (parallax-smog-near*.js: railings, a bench, a lamp stump, the pavement, the kerb,
// a gutter of cigarette stubs, the road), each painted in the three modes of heal-layers.js. The passes must agree on every
// shape (the rng is never touched: the city that heals is the same city at every level), every painter must leave the context as
// it found it, nothing may be lettered, nothing the bullets' hot magenta, and no green may show before it grows back.
const { SMOG } = await import('../../src/ui/parallax-smog.js');
const { buildHealLayers } = await import('../../src/ui/heal-layers.js');
const { MID, NEAR } = await import('../../src/ui/parallax-smog-pal.js');
const { BLOCKS, TOWERS, TREES, POLES, KITE_POSTS, BILLBOARD } = await import('../../src/ui/parallax-smog-mid-plan.js');
const { Y, FENCE, SECTIONS } = await import('../../src/ui/parallax-smog-near-plan.js');
const { bays } = await import('../../src/ui/parallax-smog-mid-house.js');
const { waterTower } = await import('../../src/ui/parallax-smog-mid-props.js');

const [FAR, MIDL, NEARL] = look.layers;
const SIZES = { smogblocks: [2240, 460], smogstreet: [2240, 320] };
const paint = (name, ctx, mode, out = { lights: [], signs: [] }, rng = () => 0.5) => SMOG[name](ctx, ...SIZES[name], rng, look.layers[name === 'smogblocks' ? 1 : 2], out, mode);
const calls = (name, mode) => {
  const r = recorder();
  paint(name, r.ctx, mode);
  return r.calls;
};

test('the look names the two painters, the bands are the right size and each carries a green overlay', () => {
  assert.deepEqual([MIDL.kind, NEARL.kind], ['smogblocks', 'smogstreet']);
  assert.deepEqual([MIDL.height, MIDL.speed, NEARL.height, NEARL.speed], [460, 0.22, 320, 0.55]);
  assert.ok(MIDL.over && NEARL.over);
  assert.equal(typeof SMOG.smogblocks, 'function');
  assert.equal(typeof SMOG.smogstreet, 'function');
  assert.ok(FAR.kind === 'smogcity');
});

test('every painter in every mode leaves the line caps and joins, widths, colours, alpha and blend mode as it found them, and paints', () => {
  for (const name of Object.keys(SIZES)) {
    for (const mode of ['smog', 'clean', 'over']) {
      const ctx = stateful();
      const before = { ...ctx };
      paint(name, ctx, mode);
      assert.deepEqual({ ...ctx }, before, `${name} ${mode}`);
      assert.ok(calls(name, mode).length > 400, `${name} ${mode} paints a good deal`);
    }
  }
});

test('the smog and the clean pass draw one silhouette: the same path calls in the same order and the same lights, whatever rng they are handed (it is never asked)', () => {
  for (const name of Object.keys(SIZES)) {
    const shape = (mode, rng) => {
      const r = recorder();
      const out = { lights: [], signs: [] };
      paint(name, r.ctx, mode, out, rng);
      return [r.calls.filter(([k]) => ['moveTo', 'lineTo', 'rect', 'fillRect', 'arc', 'ellipse', 'quadraticCurveTo'].includes(k)).map(([k, ...a]) => [k, ...a.map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v))]), out.lights.length];
    };
    let asked = 0;
    const [smog, clean] = [shape('smog', () => (asked++, 0.1)), shape('clean', () => (asked++, 0.9))];
    assert.equal(asked, 0, 'the painter never asks for the layer rng');
    assert.deepEqual(smog, clean, `${name}: the same shapes in both modes`);
    assert.deepEqual(shape('smog'), smog, 'and the same every time');
  }
});

test('nothing is lettered: no painter draws text in any mode', () => {
  for (const name of Object.keys(SIZES)) for (const mode of ['smog', 'clean', 'over']) assert.ok(!calls(name, mode).some(([k]) => /text/i.test(k)), `${name} ${mode}`);
});

test('no colour any painter sets is the bullets\' hot magenta, in any mode; the palettes hold none either', () => {
  for (const name of Object.keys(SIZES)) {
    for (const mode of ['smog', 'clean', 'over']) {
      const seen = new Set();
      const ctx = new Proxy({}, { get: (o, k) => (k in o ? o[k] : () => ctx), set: (o, k, v) => ((o[k] = v), ['fillStyle', 'strokeStyle'].includes(k) && seen.add(parse(v)), true) });
      paint(name, ctx, mode);
      assert.ok(seen.size > 10, `${name} ${mode} sets many colours`);
      for (const c of [...seen].filter(Boolean)) assert.ok(!magentaish(c), `${name} ${mode}: ${c}`);
    }
  }
  for (const pal of [MID.smog, MID.clean, NEAR.smog, NEAR.clean]) for (const c of Object.values(pal).flat().filter((v) => /^#[0-9a-f]{6}$/i.test(v))) assert.ok(!magentaish(c), c);
});

test('the smog drawing holds no green: only what grows back (the over pass) is green, and it is green', () => {
  const greens = (mode, name) => {
    const seen = new Set();
    const ctx = new Proxy({}, { get: (o, k) => (k in o ? o[k] : () => ctx), set: (o, k, v) => ((o[k] = v), ['fillStyle', 'strokeStyle'].includes(k) && seen.add(parse(v)), true) });
    paint(name, ctx, mode);
    return [...seen].filter(Boolean).filter((c) => { const { h, s, l } = hsl(c); return h >= 80 && h <= 170 && s > 0.2 && l > 0.14; });
  };
  for (const name of Object.keys(SIZES)) {
    assert.deepEqual(greens('smog', name), [], `${name} smog`);
    assert.deepEqual(greens('clean', name), [], `${name} clean`);
    assert.ok(greens('over', name).length >= 3, `${name} over grows green`);
  }
});

test('drawn bounds: the mid layer keeps its roofs inside the band, the near layer its fence and piers; the green stays near the layer too', () => {
  const box = (name, mode) => {
    const T = tracker();
    paint(name, T.ctx, mode);
    return T.bounds;
  };
  for (const mode of ['smog', 'clean']) {
    const b = box('smogblocks', mode);
    assert.ok(b.y0 > -20 && b.y1 < 470 && b.x0 > 0 && b.x1 < 2260, `mid ${mode}: ${JSON.stringify(b)}`);
    const n = box('smogstreet', mode);
    assert.ok(n.y0 >= 30 && n.y1 <= 326, `near ${mode}: ${JSON.stringify(n)}`);
  }
  assert.ok(box('smogblocks', 'over').y0 > 20 && box('smogblocks', 'over').y1 < 400);
  assert.ok(box('smogstreet', 'over').y0 > 30 && box('smogstreet', 'over').y1 < 326);
  const top = waterTower(tracker().ctx, MID.smog, 826, 140, 0.92);
  assert.ok(top > 8 && top < 40, `the water tower's tip at ${top}`);
});

test('the plan: blocks and towers stand where the layer is wide enough, windows fit in their blocks, trees and poles lie in the band', () => {
  assert.ok(BLOCKS.length >= 8);
  for (const b of BLOCKS) {
    assert.ok(b.x >= 0 && b.x + b.w <= 2240 && b.top >= 80 && b.top <= 260, `block at ${b.x}`);
    for (const w of bays(b)) assert.ok(w.x > b.x + 2 && w.x + 15 < b.x + b.w - 2 && w.y > b.top, `window of block ${b.x}`);
  }
  assert.ok(new Set(BLOCKS.map((b) => b.roof)).size === 4, 'all four roof types');
  assert.ok(BLOCKS.some((b) => b.esc) && BLOCKS.some((b) => b.brick));
  for (const t of TOWERS) assert.ok(BLOCKS.some((b) => t.x > b.x && t.x < b.x + b.w && Math.abs(t.base - b.top) < 6), 'a water tower stands on a roof');
  assert.ok(BILLBOARD.x + BILLBOARD.w < 2240 && BILLBOARD.base > 180);
  assert.ok(TREES.length >= 4 && POLES.length >= 4);
  for (const [x, y] of KITE_POSTS) assert.ok(x > 100 && x < 1900 + 160 && y > 60 && y < 340, `kite post at ${x},${y}`);
  assert.ok(Y.soil < Y.pave && Y.pave < Y.kerb && Y.kerb < Y.gutter && Y.gutter < Y.road && Y.road < 320);
  for (const [a, b] of SECTIONS) assert.ok(a < b && FENCE.top < FENCE.base);
});

test('lights: a handful of faint amber window glows in the mid layer, none in the near layer', () => {
  const [mid, near] = [{ lights: [], signs: [] }, { lights: [], signs: [] }];
  paint('smogblocks', tracker().ctx, 'smog', mid);
  paint('smogstreet', tracker().ctx, 'smog', near);
  assert.ok(mid.lights.length >= 3 && mid.lights.length <= 12, `${mid.lights.length} glows`);
  for (const l of mid.lights) {
    assert.ok(l.a <= 0.1 && l.r <= 24 && ['pulse', 'steady'].includes(l.mode), JSON.stringify(l));
    const h = hsl(l.color).h;
    assert.ok(h >= 20 && h <= 50, `amber: hue ${h}`);
    assert.ok(l.y > 40 && l.y < 280, `a glow at ${l.y}: not low in the frame`);
  }
  assert.equal(near.lights.length, 0);
  const again = { lights: [], signs: [] };
  paint('smogblocks', tracker().ctx, 'smog', again);
  assert.deepEqual(again.lights, mid.lights, 'the same glows every time');
});

test('heal-layers bakes both layers three ways and collects the lights from the smog pass alone', () => {
  const heal = { h: 0 };
  const [far, mid, near] = buildHealLayers(look, 5, heal);
  assert.ok(mid.canvas && mid.clean && mid.over && near.canvas && near.clean && near.over);
  assert.ok(mid.lights.length >= 3 && near.lights.length === 0);
  assert.deepEqual([mid.top, near.top, mid.speed, near.speed], [620, 760, 0.22, 0.55]);
  assert.ok(far);
});
