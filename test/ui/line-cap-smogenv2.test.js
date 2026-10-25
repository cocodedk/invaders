import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';
import { stateful } from './glass-env-kit.js';

// What test/ui/line-cap.test.js asks of every world's drawing, for World 17's mid and near layers, ambient kinds and ground
// flourishes: they must leave every piece of the context's state (line caps and joins, widths, colours, alpha, blend mode) as they
// found it, or later strokes (the HUD's power ring) inherit it. Also the parts they are built from, each on its own.
installCanvas(64);
const { default: w17 } = await import('../../src/ui/looks/w17.js');
const look = { world: 17, ...w17 };
const { SMOG } = await import('../../src/ui/parallax-smog.js');
const { AMBIENT9 } = await import('../../src/ui/ambient-9.js');
const { FLOURISH_SMOG } = await import('../../src/ui/flourish-smog.js');
const { midPal, nearPal } = await import('../../src/ui/parallax-smog-pal.js');
const { grow, bare, TREE_SHAPES } = await import('../../src/ui/parallax-smog-mid-tree.js');
const { crown, shrub, ivyPatch, flowers } = await import('../../src/ui/parallax-smog-mid-leaves.js');
const { house } = await import('../../src/ui/parallax-smog-mid-house.js');
const { BLOCKS } = await import('../../src/ui/parallax-smog-mid-plan.js');
const { church } = await import('../../src/ui/parallax-smog-mid-church.js');
const { waterTower, billboard } = await import('../../src/ui/parallax-smog-mid-props.js');
const { pole, wires, shelter, lot } = await import('../../src/ui/parallax-smog-mid-street.js');
const { escape, drainpipe } = await import('../../src/ui/parallax-smog-mid-escape.js');
const { sash, lancet, BROKEN, BLIND, BOARDED } = await import('../../src/ui/parallax-smog-mid-window.js');
const { railings, pier, earth } = await import('../../src/ui/parallax-smog-near-fence.js');
const { slabs, street, ash } = await import('../../src/ui/parallax-smog-near-ground.js');
const { props } = await import('../../src/ui/parallax-smog-near-props.js');
const { nearGreen } = await import('../../src/ui/parallax-smog-near-green.js');
const { seeded } = await import('../../src/ui/parallax-smog-kit.js');
const { makeRng } = await import('../../src/core/rng.js');

const out = () => ({ lights: [], signs: [] });
const env = (t, h) => ({ v: { look, heal: { h }, cache: {} }, world: { ship: { x: 960 } }, t, quality: 1 });
const amb = (a, h) => (ctx) => AMBIENT9[a.kind](ctx, a, 6, 40, 0, { ship: { x: 960 } }, h);
const jobs = {}; // whole painters, ambient kinds and flourishes: everything must come back
const parts = {}; // the parts they are built from: every line and compositing setting must come back (a part may leave a fill colour, the painter's own save and restore take that back)
for (const mode of ['smog', 'clean', 'over']) {
  jobs[`mid ${mode}`] = (ctx) => SMOG.smogblocks(ctx, 2240, 460, makeRng(3), look.layers[1], out(), mode);
  jobs[`near ${mode}`] = (ctx) => SMOG.smogstreet(ctx, 2240, 320, makeRng(3), look.layers[2], out(), mode);
}
for (const mode of ['smog', 'clean']) {
  const [M, N] = [midPal(mode), nearPal(mode)];
  const r = seeded(7);
  Object.assign(parts, {
    [`house ${mode}`]: (ctx) => BLOCKS.forEach((b) => house(ctx, M, b, out())),
    [`church ${mode}`]: (ctx) => church(ctx, M, 400),
    [`tower ${mode}`]: (ctx) => waterTower(ctx, M, 800, 140, 0.9),
    [`billboard ${mode}`]: (ctx) => billboard(ctx, M, 1228, 236),
    [`street ${mode}`]: (ctx) => { pole(ctx, M, 400, 336, 200, true); wires(ctx, M, pole(ctx, M, 400, 336, 200), pole(ctx, M, 900, 336, 200), 16); shelter(ctx, M, 1768, 336); lot(ctx, M, 886, 1034, 336); },
    [`escape ${mode}`]: (ctx) => { escape(ctx, M, 200, 60, 150, 46, 4); drainpipe(ctx, M, 300, 100, 330); },
    [`windows ${mode}`]: (ctx) => { for (const k of [0, BLIND, BROKEN, BOARDED]) sash(ctx, M, 100, 100, 15, 24, k, true); lancet(ctx, M, 200, 100, 10, 60); },
    [`trees ${mode}`]: (ctx) => TREE_SHAPES.forEach((t) => bare(ctx, M, t)),
    [`fence ${mode}`]: (ctx) => { earth(ctx, N, r, 2240); railings(ctx, N, r, 70, 452); pier(ctx, N, 488); },
    [`ground ${mode}`]: (ctx) => { slabs(ctx, N, r, 2240); street(ctx, N, r, 2240, 320); ash(ctx, N, 300, 190, 40, 6); },
    [`props ${mode}`]: (ctx) => props(ctx, N, r),
  });
}
Object.assign(parts, {
  'leaves': (ctx) => { const r = seeded(9); TREE_SHAPES.forEach((t) => crown(ctx, t)); crown(ctx, grow(2, 100, 300, 70, 3), 0.5); shrub(ctx, r, 100, 300, 40, 20); ivyPatch(ctx, r, 10, 10, 30, 60); flowers(ctx, r, 10, 10, 30, 30, 8); },
  'near green': (ctx) => nearGreen(ctx, nearPal('over'), 2240),
});
for (const h of [0, 0.4, 0.8, 1]) {
  look.ambient.forEach((a, i) => { jobs[`ambient ${a.kind} ${a.phase} ${i} h ${h}`] = amb(a, h); });
  jobs[`kites h ${h}`] = (ctx) => FLOURISH_SMOG.kites.mid(ctx, env(9, h), -160, 620);
  jobs[`smogbank h ${h}`] = (ctx) => FLOURISH_SMOG.smogbank.near(ctx, env(9, h), 0, 0);
}

const LINES = ['lineCap', 'lineJoin', 'lineWidth', 'globalAlpha', 'globalCompositeOperation'];

test("World 17's mid and near layers, the ambient kinds and the ground flourishes leave the line caps and joins, widths, colours, alpha and blend mode as they found them", () => {
  assert.ok(Object.keys(jobs).length > 30);
  for (const [name, run] of Object.entries(jobs)) {
    const ctx = stateful();
    const before = { ...ctx };
    run(ctx);
    assert.deepEqual({ ...ctx }, before, name);
  }
});

test('the parts the layers are built from leave the line caps and joins, widths, alpha and blend mode as they found them', () => {
  assert.ok(Object.keys(parts).length > 20);
  for (const [name, run] of Object.entries(parts)) {
    const ctx = stateful();
    const before = { ...ctx };
    run(ctx);
    for (const k of LINES) assert.equal(ctx[k], before[k], `${name}: ${k}`);
  }
});
