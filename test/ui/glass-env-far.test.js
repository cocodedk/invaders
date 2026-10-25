import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { stateful, hue, limeish } from './glass-env-kit.js';

// Glass Cathedral's far layer (parallax-glass.js and the files it draws with): a cathedral with a great rose window, many
// lit stained windows, a belfry with a bell, piers and broken arches. What it lights and marks, that nothing it paints is
// taller than its band, that its painters leave the context as they found it, that it is the same every time, and that
// every light is dim enough to stay quieter than a bullet.
installCanvas(64);
const { look } = await import('./glass-env-look-kit.js');
const { buildLayers, drawLayers, layerX } = await import('../../src/ui/parallax.js');
const { paintLayer } = await import('../../src/ui/parallax-shapes.js');
const { GLASS, BASE } = await import('../../src/ui/parallax-glass.js');
const { makeRng } = await import('../../src/core/rng.js');

const LAYER = look.layers[0];
const [W, H] = [1920 + 320, LAYER.height];
const far = buildLayers({ ...look, layers: [LAYER] }, 5)[0];
const near = (a, b, d) => Math.hypot(a.x - b.x, a.y - b.y) <= d;
const key = (l) => JSON.stringify([l.lights.map(({ x, y, r, color, mode, ph, a }) => [x, y, r, color, mode, ph, a]), l.signs]);

test('the far layer is registered and bakes a band of the right size, the same one every time', () => {
  assert.equal(LAYER.kind, 'glassnave');
  assert.equal(typeof GLASS.glassnave, 'function');
  assert.deepEqual([far.canvas.width, far.canvas.height, far.top, far.far], [W, H, 380, true]);
  assert.equal(key(buildLayers({ ...look, layers: [LAYER] }, 5)[0]), key(far), 'seeded, so a level always looks the same');
  assert.ok(BASE > 300 && BASE < H, 'the terrace is in the band');
});

test('the far layer lights many windows in jewel colours, dim, none of them the bullets\' lime, and every one has a place in the band', () => {
  const lights = far.lights;
  assert.ok(lights.length >= 22 && lights.length <= 70, `${lights.length} lights`);
  for (const l of lights) {
    assert.ok(Number.isFinite(l.x + l.y + l.ph) && l.x >= 0 && l.x <= W && l.y >= 0 && l.y <= H, 'a light has a place in the band');
    assert.ok(['steady', 'pulse'].includes(l.mode), `mode ${l.mode}`);
    assert.ok(l.r > 0 && l.r <= 260, `radius ${l.r}`);
    assert.ok(l.a > 0 && l.a <= 0.4, `alpha ${l.a}: far away, so dim`);
    assert.ok(!limeish(l.color), `${l.color} is the bullets' lime`);
  }
  const windows = lights.filter((l) => l.r <= 60 && l.a >= 0.2);
  assert.ok(windows.length >= 18, `${windows.length} window lights`);
  const hues = new Set(windows.map((l) => Math.round(hue(l.color) / 30)));
  assert.ok(hues.size >= 4, `${hues.size} different hues of glass among the lit windows`);
  assert.ok(lights.some((l) => l.mode === 'pulse') && lights.some((l) => l.mode === 'steady'), 'some breathe, most hold');
  assert.ok(lights.every((l) => l.r < 100 || l.a <= 0.3), 'the big glows are the faintest');
});

test('the great rose window is marked once, with a warm core and a violet halo on it, and the bell is marked in the left tower', () => {
  const [rose, bell] = ['rose', 'bell'].map((k) => far.signs.filter((s) => s[k]));
  assert.equal(rose.length, 1);
  assert.equal(bell.length, 1);
  assert.ok(rose[0].r >= 70 && rose[0].r <= 110, `rose radius ${rose[0].r}`);
  const glows = far.lights.filter((l) => near(l, rose[0], 1));
  assert.ok(glows.length >= 2 && glows.some((l) => l.r >= rose[0].r * 1.5 && l.color === '#ffb88a') && glows.some((l) => hue(l.color) > 250 && hue(l.color) < 290), 'a warm core and a violet halo');
  assert.ok(bell[0].x > 0 && bell[0].x < rose[0].x && bell[0].y > 0 && bell[0].y < rose[0].y, 'in a tower to the left of the rose, higher than its middle');
  assert.ok(bell[0].len > 20 && bell[0].hw > 0);
  assert.ok(rose[0].y < H / 2, 'the rose stands in the upper half of the band: it is the hero');
});

test('drawn, the far layer is one image and its lights, and they shimmer; the glow is dropped at low quality', () => {
  const frame = (t, quality = 1) => {
    const { ctx, calls } = recorder();
    drawLayers(ctx, [far], 960, t, quality, null);
    return calls.filter(([k]) => k === 'drawImage');
  };
  const [a, b] = [frame(0.4), frame(1.9)];
  const seen = far.lights.filter((l) => layerX(far, 960) + l.x + l.r >= 0 && layerX(far, 960) + l.x - l.r <= 1920);
  assert.equal(a.length, 1 + seen.length, 'the band, then a halo for every light in the frame');
  assert.ok(a.length <= 80, 'a few dozen draws, well inside the budget');
  assert.ok(a.some((c, i) => c.alpha !== b[i].alpha), 'the lights breathe');
  assert.equal(frame(0.4, 0.5).length, 1, 'quality below 1 keeps only the baked band');
});

test('nothing the painter fills is taller than the band or wider than it, and the tallest tower reaches the upper part of it', () => {
  const T = tracker();
  const out = { lights: [], signs: [] };
  GLASS.glassnave(T.ctx, W, H, makeRng(5 * 101), LAYER, out); // the stream buildLayers gives level seed 5's far layer
  const b = T.bounds;
  assert.ok(b.y0 >= 0 && b.y1 <= H, `${Math.round(b.y0)}..${Math.round(b.y1)} in a band ${H} high`);
  assert.ok(b.x0 >= -60 && b.x1 <= W + 60, `${Math.round(b.x0)}..${Math.round(b.x1)} in a band ${W} wide`);
  assert.ok(b.y0 < 60, 'the tower pinnacles reach nearly to the top of it');
  assert.equal(out.lights.length, far.lights.length, 'the same lights as the built layer');
  assert.equal(out.signs.length, far.signs.length);
});

test('the far layer painter leaves line caps and joins, widths, colours, alpha and blend mode as it found them', () => {
  for (const [name, run] of Object.entries({
    cathedral: (ctx) => GLASS.glassnave(ctx, W, H, makeRng(3), LAYER, { lights: [], signs: [] }),
    paint: (ctx) => paintLayer(ctx, W, H, makeRng(3), LAYER, { lights: [], signs: [] }), // through the generic entry, which sets the colour first
  })) {
    const ctx = stateful();
    const before = { ...ctx };
    run(ctx);
    if (name === 'paint') before.fillStyle = LAYER.color;
    assert.deepEqual({ ...ctx }, before, name);
  }
});

test('the painter holds its saves and restores in balance, clips every window and wall, shades glass with gradients, and bakes in a reasonable number of calls', () => {
  const { ctx, calls } = recorder();
  GLASS.glassnave(ctx, W, H, makeRng(1), LAYER, { lights: [], signs: [] });
  assert.equal(calls.filter(([k]) => k === 'save').length, calls.filter(([k]) => k === 'restore').length);
  assert.ok(calls.filter(([k]) => k === 'clip').length >= 40, 'every window and wall is clipped');
  assert.ok(calls.filter(([k]) => k === 'createRadialGradient' || k === 'createLinearGradient').length >= 20, 'glass shades with gradients');
  assert.ok(calls.length < 60000, `${calls.length} drawing calls to bake the band`);
});
