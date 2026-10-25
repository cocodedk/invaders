import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder, sink } from './dom-kit.js';
import { makeRng } from '../../src/core/rng.js';
import { WELL } from '../../src/core/kinds.js';
import { createFx } from '../../src/fx/fx.js';

// A bullet the maelstrom swallowed, drawn from its 'bubble' ring (bubble-view.js, called by fx-view.js drawFx): the
// bubble spirals down the throat on a logarithmic spiral, shrinking, with a comet of fainter copies behind it, and
// pops at the bottom: a flash, a thin ring and a handful of specks. The ring is the one react-maelstrom.js makes.
installCanvas(64);
let canvases = 0;
const stand = document.createElement;
document.createElement = (...a) => (canvases++, stand(...a));
const { drawFx } = await import('../../src/ui/fx-view.js');
const { warmMaelstrom } = await import('../../src/ui/flourish-maelstrom.js');
const { bubble } = await import('../../src/ui/flourish-maelstrom-bubble.js');
const { absorbFor, POP_AT, END_R, BUBBLE_COLORS } = await import('../../src/fx/react-maelstrom.js');
const { glow } = await import('../../src/ui/sprites.js');

const world15 = { level: { world: 15, twist: 'gravity' }, well: { ...WELL } };
const TAU = Math.PI * 2;

// The ring a bullet swallowed at (x, y) makes, aged to u (0 just made, 1 gone).
function ringAt(u, { x = WELL.x + 70, y = WELL.y + 20, seed = 2 } = {}) {
  const fx = createFx();
  absorbFor(() => assert.fail('the steel reaction'))(fx, { type: 'absorb', x, y }, makeRng(seed), world15);
  const [r] = fx.rings;
  r.life = r.max * (1 - u);
  return { fx, r };
}
const paint = (fx, ctx) => drawFx(ctx, fx);
const record = (u, opts) => {
  const { fx, r } = ringAt(u, opts);
  const { ctx, calls } = recorder();
  paint(fx, ctx);
  return { ctx, calls, r, images: calls.filter(([k]) => k === 'drawImage'), arcs: calls.filter(([k]) => k === 'arc') };
};
const centre = (c) => [c[2] + c[4] / 2, c[3] + c[5] / 2];
const polar = ([x, y]) => [Math.hypot(x - WELL.x, y - WELL.y), Math.atan2(y - WELL.y, x - WELL.x)];

test('on its way down the bubble is drawn as the maelstrom\'s own bubble sprite, with two fainter copies behind it, and nothing else', () => {
  const { images, arcs, r, ctx } = record(0.3);
  assert.equal(images.length, 3);
  assert.ok(images.every((c) => c[1] === bubble(r.color)), 'the baked bubble in the ring\'s colour');
  assert.equal(arcs.length, 0, 'no stroked shockwave: the generic ring is not drawn for it');
  assert.ok(images[2].alpha > images[0].alpha && images[0].alpha > images[1].alpha && images[1].alpha > 0, 'the head is brightest (drawn last), the trail fades with its distance behind');
  assert.ok(images[2].alpha <= 1);
  assert.equal(ctx.globalCompositeOperation, 'source-over');
  assert.equal(ctx.globalAlpha, 1);
});

test('it starts where the bullet was and ends deep in the throat, turning clockwise the ring\'s `turns` times, always nearer the well', () => {
  const start = ringAt(0.0001);
  const first = record(0.0001);
  const [r0, a0] = polar(centre(first.images.at(-1)));
  assert.ok(Math.abs(centre(first.images.at(-1))[0] - start.r.x) < 1 && Math.abs(centre(first.images.at(-1))[1] - start.r.y) < 1, 'the first frame is where the bullet was');
  assert.ok(Math.abs(r0 - start.r.d0) < 1);
  let [prevR, prevA, turned] = [r0, a0, 0];
  for (let u = 0.02; u <= POP_AT - 0.001; u += 0.02) {
    const [rr, aa] = polar(centre(record(u).images.at(-1)));
    assert.ok(rr < prevR + 1e-9, `nearer the well at ${u.toFixed(2)}`);
    const da = aa - prevA;
    const step = da - Math.round(da / TAU) * TAU;
    assert.ok(step > 0 && step < 1.2, `clockwise, and no jump: ${step.toFixed(2)} rad`);
    turned += step;
    [prevR, prevA] = [rr, aa];
  }
  const [rEnd] = polar(centre(record(POP_AT - 0.0001).images.at(-1)));
  assert.ok(Math.abs(rEnd - END_R) < 1, `at the bottom: ${rEnd.toFixed(1)} px from the centre`);
  assert.ok(turned / TAU > start.r.turns * 0.85 && turned / TAU < start.r.turns * 1.02, `${(turned / TAU).toFixed(2)} turns of ${start.r.turns.toFixed(2)}`);
});

test('it shrinks to two fifths on the way down, and fades in from nothing rather than appearing', () => {
  const size = (u) => record(u).images.at(-1)[4];
  assert.ok(size(0.05) > size(0.3) && size(0.3) > size(0.6) && size(0.6) > size(POP_AT - 0.001));
  assert.ok(Math.abs(size(POP_AT - 0.0001) / size(0) - 0.4) < 0.02);
  assert.ok(record(0).images.length === 3 && record(0).images.at(-1).alpha === 0, 'unseen at the very first instant');
  assert.equal(record(0.2).images.at(-1).alpha, 1);
});

test('then it pops: no bubble, a flash that goes, one thin ring that opens round the bottom of the throat and a handful of specks that fly out and fade', () => {
  const early = record(POP_AT + 0.02);
  const late = record(0.985);
  assert.ok(early.images.every((c) => c[1] === glow('#ffffff') || c[1] === glow(early.r.color)), 'no bubble sprite once popped');
  assert.equal(early.images.filter((c) => c[1] === glow('#ffffff')).length, 1, 'a flash at first');
  assert.equal(late.images.filter((c) => c[1] === glow('#ffffff')).length, 0, 'which is soon gone');
  assert.equal(early.arcs.length, 1);
  assert.equal(late.arcs.length, 1);
  assert.ok(late.arcs[0][3] > early.arcs[0][3], 'the ring opens');
  const [px, py] = [early.arcs[0][1], early.arcs[0][2]];
  assert.ok(Math.hypot(px - WELL.x, py - WELL.y) < END_R + 1, 'round the bottom of the throat');
  const specks = (rec) => rec.images.filter((c) => c[1] === glow(rec.r.color));
  assert.equal(specks(early).length, 6);
  assert.equal(specks(late).length, 6);
  assert.ok(specks(late).every((c) => Math.hypot(...centre(c).map((v, i) => v - [px, py][i])) > 3), 'the specks have flown out');
  assert.ok(specks(late).every((c) => Math.hypot(...centre(c).map((v, i) => v - [px, py][i])) < 30), 'but not far');
  assert.ok(specks(late)[0].alpha < specks(early)[0].alpha, 'and faded');
  const nearEnd = record(0.9995);
  assert.ok(specks(nearEnd).every((c) => c.alpha < 0.05), 'nothing left at the end of the ring\'s life');
  assert.ok(late.arcs[0][3] > 10 && late.arcs[0][3] <= 28.5, 'it reaches about 28 px');
});

test('every colour a swallowed bullet can take has been baked by warming, so the fight bakes nothing', () => {
  warmMaelstrom();
  const baked = canvases;
  for (let seed = 1; seed < 40; seed++) for (let u = 0; u < 1; u += 0.1) record(u, { seed });
  assert.equal(canvases, baked);
  assert.ok(BUBBLE_COLORS.length >= 3);
});

test('drawing leaves the context as it found it and the ring as it was', () => {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over' };
  for (const u of [0.01, 0.4, POP_AT + 0.01, 0.95, 0.999]) {
    const stack = [];
    const ctx = new Proxy({ ...state }, {
      get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
      set: (o, k, v) => ((o[k] = v), true),
    });
    const { fx } = ringAt(u);
    const before = JSON.stringify(fx.rings);
    paint(fx, ctx);
    assert.deepEqual({ ...ctx }, state, `at ${u}`);
    assert.equal(JSON.stringify(fx.rings), before, 'nothing in the fx is changed by drawing it');
  }
});

test('the other ring kinds are drawn as they were: a stroked shockwave, no images', () => {
  const fx = createFx();
  fx.rings.push({ x: 300, y: 300, r: 40, r0: 0, maxR: 100, width: 4, color: '#ffffff', kind: 'ring', life: 0.2, max: 0.5 });
  const { ctx, calls } = recorder();
  drawFx(ctx, fx);
  assert.ok(calls.filter(([k]) => k === 'arc').length >= 1);
  assert.equal(calls.filter(([k]) => k === 'drawImage').length, 0);
});
