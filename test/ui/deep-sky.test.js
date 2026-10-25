import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { installCanvas, recorder, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { rgb } from '../../src/ui/sprites.js';

// World 15's (Lantern Deep) baked sky and far layer, the drowned kingdom: what the layer lights and marks, that
// nothing it paints is taller than its band, that its painters leave the context as they found it, that the
// sky is quiet, and the sprite rules over these files. The look comes from deep-kit.js, which is not yet in
// looks/index.js; only the far layer is built, so the test does not depend on the mid and near layers' files.
installCanvas(64);
const { look } = await import('./deep-kit.js');
const { buildLayers, drawLayers, layerX } = await import('../../src/ui/parallax.js');
const { paintLayer } = await import('../../src/ui/parallax-shapes.js');
const { DEEP } = await import('../../src/ui/parallax-deep.js');
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { GLOW, SHAFT_ALPHA, FAR_LIGHTS } = await import('../../src/ui/sky-bodies-7.js');
const { makeRng } = await import('../../src/core/rng.js');

const LAYER = look.layers[0];
const [W, H] = [1920 + 320, LAYER.height]; // the band's size (parallax.js adds 160 px of margin each side)
const far = buildLayers({ ...look, layers: [LAYER] }, 5)[0];
const GOLD = '#ffd27a';
const TEAL = '#3de8d0';

// Amber is the enemy's bullets' colour and nothing baked may wear it (gold, a paler yellow, is the lanterns').
const amber = (hex) => { const [r, g, b] = rgb(hex); return r > 200 && g > 90 && g < 190 && b < 100 && r > g && g > b; };
const near = (a, b, d) => Math.hypot(a.x - b.x, a.y - b.y) <= d;

test('the far layer is registered and bakes a band of the right size, the same one every time', () => {
  assert.equal(look.world, 15);
  assert.equal(LAYER.kind, 'sunkenkingdom');
  assert.equal(typeof DEEP.sunkenkingdom, 'function');
  assert.equal(typeof BODIES[look.body], 'function', 'the sky body is registered');
  assert.deepEqual([far.canvas.width, far.canvas.height, far.top, far.far], [W, H, 380, true]);
  const again = buildLayers({ ...look, layers: [LAYER] }, 5)[0];
  const flat = (l) => JSON.stringify([l.lights.map(({ x, y, r, color, mode, ph, a }) => [x, y, r, color, mode, ph, a]), l.signs]);
  assert.equal(flat(again), flat(far), 'seeded, so a level always looks the same');
});

test('the far layer lights a few small windows, teal glows in the arches and the rose window, and the whale\'s eye, all dim and none amber', () => {
  const lights = far.lights;
  assert.ok(lights.length >= 14 && lights.length <= 70, `${lights.length} lights`);
  for (const l of lights) {
    assert.ok(Number.isFinite(l.x + l.y + l.ph) && l.x >= 0 && l.x <= W && l.y >= 0 && l.y <= H, 'a light has a place in the band');
    assert.ok(['steady', 'pulse', 'flicker'].includes(l.mode), `mode ${l.mode}`);
    assert.ok(l.r > 0 && l.r <= 100, `radius ${l.r}`);
    assert.ok(l.a > 0 && l.a <= 0.6, `alpha ${l.a}: far away, so dim`);
    assert.ok(!amber(l.color), `${l.color} is the bullets' amber`);
  }
  const windows = lights.filter((l) => l.r <= 14 && l.a >= 0.3);
  assert.ok(windows.length >= 8, `${windows.length} window lights`);
  assert.ok(windows.filter((l) => l.color === GOLD).length >= 4, 'warm gold windows');
  assert.ok(windows.filter((l) => l.color === TEAL).length >= 2, 'a few teal ones too');
  for (const mode of ['steady', 'pulse', 'flicker']) assert.ok(lights.some((l) => l.mode === mode && l.r <= 14), `windows that ${mode}`);
  assert.ok(lights.filter((l) => l.mode === 'pulse' && l.color === TEAL && l.r >= 24 && l.r <= 34).length >= 4, 'teal glows in the arches and the doorways');
  assert.ok(lights.every((l) => l.r < 50 || l.a <= 0.3), 'the big glows are the faintest');
});

test('the rose window and the whale\'s skull are marked, with their lights, and the spires reach the upper half of the band', () => {
  const [rose, skull] = ['rose', 'skull'].map((k) => far.signs.filter((s) => s[k]));
  assert.equal(rose.length, 1);
  assert.equal(skull.length, 1);
  assert.ok(rose[0].r > 10 && far.lights.some((l) => near(l, rose[0], 1) && l.r >= 40), 'a glow breathes behind the rose window');
  const socket = far.lights.filter((l) => near(l, skull[0], 8));
  assert.ok(socket.length >= 3 && socket.some((l) => l.color === '#b27cff'), `${socket.length} lights in the eye socket, teal and violet`);
  assert.ok(socket.every((l) => l.r <= 20), 'small ones');
  const spires = far.signs.filter((s) => s.spire);
  assert.ok(spires.length >= 12, `${spires.length} spires`);
  assert.ok(spires.every((s) => Number.isFinite(s.x + s.y) && s.x >= 0 && s.x <= W && s.y >= 0 && s.y <= H));
  assert.ok(Math.min(...spires.map((s) => s.y)) < H / 2 - 200, 'the palace spires stand high in the band');
  assert.ok(spires.filter((s) => s.y < H / 2).length >= 8, 'and so do most of the towers');
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
  assert.ok(seen.length >= far.lights.length - 3, 'nearly all of them are in the frame');
  assert.ok(a.length <= 80, 'a few dozen draws, well inside the budget');
  assert.ok(a.some((c, i) => c.alpha !== b[i].alpha), 'the lights breathe');
  assert.equal(frame(0.4, 0.5).length, 1, 'quality below 1 keeps only the baked band');
});

test('nothing the painter fills is taller than the band, and every part of it is in the band side to side', () => {
  const T = tracker();
  DEEP.sunkenkingdom(T.ctx, W, H, makeRng(1), LAYER, { lights: [], signs: [] });
  const b = T.bounds;
  assert.ok(b.y0 >= 0 && b.y1 <= H, `${Math.round(b.y0)}..${Math.round(b.y1)} in a band ${H} high`);
  assert.ok(b.x0 >= -60 && b.x1 <= W + 60, `${Math.round(b.x0)}..${Math.round(b.x1)} in a band ${W} wide`);
  assert.ok(b.y0 < 80, 'and the tallest spire reaches nearly to the top of it');
});

// A context that keeps the state a painter may change, with a real save and restore, and hands everything else to the sink.
const stateful = () => {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const stack = [];
  return new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
};

test('the far layer painter and the sky body leave line caps and joins, widths, colours, alpha and blend mode as they found them', () => {
  for (const [name, run] of Object.entries({
    kingdom: (ctx) => DEEP.sunkenkingdom(ctx, W, H, makeRng(3), LAYER, { lights: [], signs: [] }),
    sky: (ctx) => BODIES.deepsea(ctx, look),
    // and through the generic entry, which sets the colour before it hands the context over
    paint: (ctx) => paintLayer(ctx, W, H, makeRng(3), LAYER, { lights: [], signs: [] }),
  })) {
    const ctx = stateful();
    const before = { ...ctx };
    run(ctx);
    if (name === 'paint') before.fillStyle = LAYER.color;
    assert.deepEqual({ ...ctx }, before, name);
  }
});

test('the baked sky is quiet: soft glows only, a pale one high at the top-centre, dim far lights that are cool, and no live look', () => {
  const { ctx, calls } = recorder();
  BODIES.deepsea(ctx, look);
  const images = calls.filter(([k]) => k === 'drawImage');
  assert.ok(images.length >= 20, 'the surface glow, the blotches, the backlight and the far lights');
  assert.ok(images.every((c) => c.alpha <= 0.3), `no draw brighter than 0.3: ${Math.max(...images.map((c) => c.alpha))}`);
  const [, sprite, x, y, w, h] = images[0];
  assert.ok(sprite && Math.abs(x + w / 2 - GLOW.x) < 1 && y + h / 2 <= GLOW.y + 1, 'the first is the surface glow, centred high at the top-centre');
  assert.ok(GLOW.alpha <= 0.3 && SHAFT_ALPHA <= 0.05, 'and the shaft hints are fainter still');
  assert.ok(FAR_LIGHTS.colors.every((c) => !amber(c) && rgb(c)[0] < 200), 'the far lights are teal, violet and aqua');
  assert.ok(FAR_LIGHTS.alpha[1] <= 0.25 && FAR_LIGHTS.n <= 14, 'few and extremely dim');
  assert.ok(calls.some(([k]) => k === 'createLinearGradient') && !calls.some(([k]) => k === 'arc'), 'gradients and glows, no round dots');
  assert.equal(calls.filter(([k]) => k === 'save').length, calls.filter(([k]) => k === 'restore').length, 'balanced saves');
});

test('the far layer and the sky follow the sprite rules: no shadow blur, no clock or dice, files under 200 lines', () => {
  const dir = new URL('../../src/ui/', import.meta.url);
  const files = readdirSync(dir).filter((n) => (/^parallax-deep/.test(n) && !/^parallax-deep-(mid|reef|kit-2)/.test(n)) || n === 'sky-bodies-7.js');
  assert.ok(files.length >= 9, `the kingdom is split over many files: ${files.join(', ')}`);
  for (const name of files) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
});
