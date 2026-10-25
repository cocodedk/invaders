import { test } from 'node:test';
import assert from 'node:assert/strict';
import { look, tracker, recorder, stateful, hsl, hexOf, probe, magentaish } from './smogenv1-kit.js';

// World 17's far layer (parallax-smog-far*.js): a dense skyline across the smog, standing on a terrace, with the stumps of the six giant
// cigarettes. It is baked three times (heal-layers.js): 'smog', 'clean' and 'over' (only what grows back). The two twins must share one
// silhouette, so no rng call may sit behind a mode and the painter takes none at all; the towers keep out of the Craving's middle of
// the frame; the cigarettes stand in two groups outside it; every light is dim; nothing is magenta; the painter leaves the context as
// it found it.
const { SMOG } = await import('../../src/ui/parallax-smog.js');
const { buildHealLayers } = await import('../../src/ui/heal-layers.js');
const { createHeal } = await import('../../src/ui/heal.js');
const { GROUND, PLAN, CIGS } = await import('../../src/ui/parallax-smog-far.js');
const { STUMP_H, FILTER, raggedTop } = await import('../../src/ui/parallax-smog-far-cig.js');
const { PAL } = await import('../../src/ui/parallax-smog-far-kit.js');

const LAYER = look.layers[0];
const [LW, LH] = [2240, 700];
const far = buildHealLayers({ ...look, layers: [LAYER] }, 5, createHeal())[0];
const key = (l) => JSON.stringify([l.lights.map(({ x, y, r, color, mode, ph, a }) => [x, y, r, color, mode, ph, a]), l.signs]);
const paint = (ctx, mode, rng = () => 0.5) => SMOG.smogcity(ctx, LW, LH, rng, LAYER, { lights: [], signs: [] }, mode);

test('the far layer is registered, bakes a band of the right size in both twins and a green overlay, and is the same every time', () => {
  assert.equal(LAYER.kind, 'smogcity');
  assert.equal(typeof SMOG.smogcity, 'function');
  assert.deepEqual([far.canvas.width, far.canvas.height, far.top, far.far], [LW, LH, 380, true]);
  assert.ok(far.clean && far.over, 'a clean twin and a green overlay');
  assert.equal(key(buildHealLayers({ ...look, layers: [LAYER] }, 5, createHeal())[0]), key(far), 'seeded, so a level always looks the same');
  assert.ok(GROUND > 300 && GROUND < LH, 'the terrace is in the band');
});

test('the lights are dim windows (pulse) and the mast lamp (blink): a few dozen, small, none bullet-coloured, every one placed in the band', () => {
  const lights = far.lights;
  assert.ok(lights.length >= 20 && lights.length <= 50, `${lights.length} lights`);
  for (const l of lights) {
    assert.ok(Number.isFinite(l.x + l.y + l.ph) && l.x >= 0 && l.x <= LW && l.y >= 0 && l.y <= LH, 'a light has a place in the band');
    assert.ok(['pulse', 'blink'].includes(l.mode), l.mode);
    assert.ok(l.r > 0 && l.r <= 30 && l.a > 0 && l.a <= 0.6, `r ${l.r} a ${l.a}: far away, so small and dim`);
    assert.ok(!magentaish(l.color), `${l.color} is the bullets' colour`);
  }
  const blink = lights.filter((l) => l.mode === 'blink');
  assert.equal(blink.length, 1, 'the mast lamp');
  const h = hsl(blink[0].color).h;
  assert.ok(h < 20 || h > 345, `red (${Math.round(h)})`);
  assert.ok(blink[0].y < 250, 'at the tip of the mast, high in the band');
  assert.ok(lights.filter((l) => l.mode === 'pulse').every((l) => l.a <= 0.35), 'windows glow faintly');
});

test('the smog and the clean passes share one silhouette: the painter draws the same shapes in the same order, takes no rng, and only the colours differ', () => {
  const geo = (mode) => {
    const { ctx, calls } = recorder();
    let n = 0;
    paint(ctx, mode, () => { n++; return 0.5; });
    assert.equal(n, 0, `${mode} consumes no rng`);
    return calls.filter(([k]) => !/^(create|addColorStop)/.test(k)).map((c) => JSON.stringify(c));
  };
  const [a, b] = [geo('smog'), geo('clean')];
  assert.ok(a.length > 4000, `${a.length} calls`);
  assert.deepEqual(a, b, 'the same call for call');
});

test("the 'over' pass draws only what grows back: leafy crowns and ivy in greens, none of it bullet-coloured, a good number of shapes", () => {
  const p = probe();
  paint(p.ctx, 'over');
  assert.ok(p.calls.length > 1500, `${p.calls.length} calls`);
  const colors = p.colors.map(hexOf).filter(Boolean);
  assert.ok(colors.length > 30);
  const greens = colors.filter((c) => { const { h, s } = hsl(c); return h >= 70 && h <= 170 && s > 0.2; });
  assert.ok(greens.length >= colors.length * 0.7, `${greens.length} of ${colors.length} colours are green`);
  assert.deepEqual(colors.filter(magentaish), []);
  const T = tracker();
  paint(T.ctx, 'over');
  assert.ok(T.bounds.y0 >= 100 && T.bounds.y1 <= LH && T.bounds.x0 >= -60 && T.bounds.x1 <= LW + 60, 'in the band');
  const smog = probe();
  paint(smog.ctx, 'smog');
  const g = smog.colors.map(hexOf).filter(Boolean).filter((c) => { const { h, s } = hsl(c); return h >= 85 && h <= 160 && s > 0.25; });
  assert.deepEqual(g, [], 'nothing is green in the smog');
});

test('the plan keeps the Craving\'s middle clear (no tower higher than layer y 180 in x 710-1530) and reaches y 150 outside it, in eight kinds', () => {
  const kinds = new Set(PLAN.map((b) => b.k));
  for (const k of ['slab', 'deco', 'block', 'mast', 'crane', 'dome', 'gas', 'cool']) assert.ok(kinds.has(k), k);
  assert.ok(PLAN.every((b) => b.top >= 150), 'no tower above layer y 150 (screen y 530)');
  assert.ok(Math.min(...PLAN.map((b) => b.top)) <= 156, 'the tallest reach it');
  for (const b of PLAN) if (b.x + b.w > 710 && b.x < 1530) assert.ok(b.top >= 180, `${b.k} at ${b.x} reaches ${b.top}: in the boss's middle`);
  const tiers = [0, 1, 2].map((t) => PLAN.filter((b) => b.t === t).length);
  assert.ok(tiers.every((n) => n >= 6), `${tiers} buildings a tier`);
  const covered = (x) => PLAN.some((b) => b.x <= x && b.x + b.w >= x);
  for (let x = 40; x < LW - 40; x += 20) assert.ok(covered(x), `a gap in the skyline at ${x}`);
});

test('six giant cigarettes in two groups outside the middle of the frame, tall, staggered in their healing, inside the layer', () => {
  assert.equal(CIGS.length, 6);
  for (const c of CIGS) {
    assert.ok(c.w >= 46 && c.w <= 74 && c.h >= 280 && c.h <= 480, `${c.w} x ${c.h}`);
    assert.ok(c.x - c.w / 2 >= 0 && c.x + c.w / 2 <= LW, 'inside the layer');
    const [l, r] = [c.x - c.w / 2 - 160, c.x + c.w / 2 - 160]; // on screen, the ship at the middle
    assert.ok(r < 550 || l > 1370, `a cigarette across the boss's middle: ${l}..${r}`);
    assert.ok(c.out >= 0.12 && c.out <= 0.55 && c.gone <= 0.85 && c.gone > c.out + 0.2, `${c.out} -> ${c.gone}`);
  }
  assert.equal(CIGS.filter((c) => c.x - 160 < 960).length, 3, 'three each side');
  const outs = CIGS.map((c) => c.out).sort((a, b) => a - b);
  assert.ok(outs.every((v, i) => i === 0 || v - outs[i - 1] > 0.02), 'each goes out at a time of its own');
  assert.ok(STUMP_H > FILTER + 30 && STUMP_H < 140, 'a stump is the filter and a little paper');
  assert.deepEqual(raggedTop(10, 60, 30, 3), raggedTop(10, 60, 30, 3), 'the break is the same every time');
});

test('the palettes: the smog is dark and grimy, the clean one is bright and blue, and only the colours differ', () => {
  const lum = (c) => hsl(c).l;
  const avg = (P) => P.tones.reduce((s, c) => s + lum(c), 0) / P.tones.length;
  assert.ok(avg(PAL.smog) < 0.25 && avg(PAL.clean) > 0.4, 'dark umber and light blue-grey');
  assert.deepEqual(Object.keys(PAL.smog).sort(), Object.keys(PAL.clean).sort(), 'one palette, two sets of colours');
  assert.ok(PAL.clean.tones.every((c) => hsl(c).h > 190 && hsl(c).h < 230), 'the morning city is blue-grey');
});

test('nothing painted is taller than the band, and the towers reach the upper part of it; nothing runs far off the sides', () => {
  const T = tracker();
  paint(T.ctx, 'smog');
  const b = T.bounds;
  assert.ok(b.y0 >= 100 && b.y1 <= LH, `${Math.round(b.y0)}..${Math.round(b.y1)} in a band ${LH} high`);
  assert.ok(b.y0 < 175, 'the tallest tower (antenna and spire) reaches layer y 150');
  assert.ok(b.x0 >= -60 && b.x1 <= LW + 60, `${Math.round(b.x0)}..${Math.round(b.x1)}`);
});

test('the painter, in every mode, leaves line caps and joins, widths, colours, alpha and blend mode as it found them, and keeps its saves balanced', () => {
  for (const mode of ['smog', 'clean', 'over']) {
    const ctx = stateful();
    const before = { ...ctx };
    paint(ctx, mode);
    assert.deepEqual({ ...ctx }, before, mode);
    const { ctx: r, calls } = recorder();
    paint(r, mode);
    assert.equal(calls.filter(([k]) => k === 'save').length, calls.filter(([k]) => k === 'restore').length, `${mode} balances its saves`);
  }
});
