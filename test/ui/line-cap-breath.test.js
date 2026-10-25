import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, sink } from './dom-kit.js';

// What test/ui/line-cap.test.js asks of every world's drawing, for the breath of world 17 (Ash to Air): every painter must
// leave each piece of the context's state (line caps and joins, widths, colours, alpha, blend mode) as it found it, or later
// strokes (the HUD's power ring) inherit it. Covered: the front at several heights, in the smog and the morning and at half
// quality, the wake's veil, the leaf and twinkle particles, the sheet's block, and every sprite painter of the breath (leaves,
// craft, air, light, flow, wake, twinkles), each on a context of its own.
installCanvas(64);

// A context that keeps the state a painter may change, with a real save and restore, and hands everything else to the sink.
const stateful = () => {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const stack = [];
  return new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
};

// The seven things asked about (text settings the label sets are the HUD kit's, restored by its own save and restore).
const KEYS = ['lineCap', 'lineJoin', 'lineWidth', 'strokeStyle', 'fillStyle', 'globalAlpha', 'globalCompositeOperation'];
const snap = (ctx) => Object.fromEntries(KEYS.map((k) => [k, ctx[k]]));

const baked = [];
const canvas = () => {
  const ctx = stateful();
  const c = { width: 64, height: 64, getContext: () => ctx };
  baked.push({ c, ctx, before: snap(ctx) });
  return c;
};
document.createElement = canvas;
const { drawBreath, drawBreathWake } = await import('../../src/ui/breath-view.js');
const { warmBreathFx } = await import('../../src/ui/breath-sprites.js');
const { drawLeaf, drawTwinkle } = await import('../../src/ui/breath-fx-view.js');
const { breathSheet } = await import('../../src/ui/aliens/sheet-breath.js');
const { BREATH_TIME } = await import('../../src/core/twists-3.js');

test('every sprite the breath bakes is painted without leaving a mark on its context', () => {
  warmBreathFx();
  const mine = baked.filter(({ c }) => c.width !== 64); // not sprites.js's 64 px glows the warm-up also makes
  assert.ok(mine.length >= 12 + 4 + 4 + 2, `${mine.length} canvases painted`);
  for (const { ctx, before } of mine) assert.deepEqual(snap(ctx), before);
});

const riseAt = (front) => ((1080 - front) / (1080 - 96)) * BREATH_TIME;
const world = (front) => ({ twist: { rise: front === null ? null : riseAt(front) } });
const view = (h, level = 1) => ({ heal: { h }, cache: {}, quality: { level } });
const leaf = { x: 800, y: 900, size: 12, shape: 4, vx: 30, life: 0.4, max: 1 };
const star = { x: 800, y: 900, size: 12, shape: 1, life: 0.2, max: 0.3 };

const runs = {
  'the front rising': (ctx) => { for (const front of [1060, 900, 600, 300, 120]) drawBreath(ctx, view(0), world(front), 14.4); },
  'the front in the morning': (ctx) => drawBreath(ctx, view(1), world(500), 14.9),
  'the front at half quality': (ctx) => drawBreath(ctx, view(0.5, 0.5), world(500), 14.9),
  'no front': (ctx) => drawBreath(ctx, view(0), world(null), 1),
  'the wake rising and closing': (ctx) => { const v = view(0); drawBreathWake(ctx, v, world(700), 2); drawBreathWake(ctx, v, world(null), 2.3); },
  'a leaf': (ctx) => drawLeaf(ctx, leaf),
  'a twinkle': (ctx) => { ctx.globalCompositeOperation = 'lighter'; drawTwinkle(ctx, star); ctx.globalCompositeOperation = 'source-over'; },
  'the sheet block': (ctx) => breathSheet(ctx),
};

test("the front, the wake, the particles and the sheet's block leave the line caps and joins, widths, colours, alpha and blend mode as they found them", () => {
  for (const [name, run] of Object.entries(runs)) {
    const ctx = stateful();
    const before = snap(ctx);
    run(ctx);
    assert.deepEqual(snap(ctx), before, name);
  }
});
