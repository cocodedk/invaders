import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { stateful, hue } from './glass-env-kit.js';

// Glass Cathedral's baked sky (sky-bodies-8.js glassvault): a deep dawn through a broken vault. Quiet by design: the boss
// fights in the top of the frame, so up there only the last stars, a few long clouds, the vault's ribs in the two corners
// and faint shafts may show; the sunrise is low, behind the west front, wide, rose-gold and soft.
installCanvas(64);
const { look } = await import('./glass-env-look-kit.js');
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { SUN, GLOW_ALPHA, SHAFT_ALPHA, CLOUD_ALPHA } = await import('../../src/ui/sky-bodies-8.js');

const [W, H] = [1920, 1080];

test("the sky body is registered under the look's name and bakes a frame that stays inside the frame (the ribs spring from beyond its edges)", () => {
  assert.equal(typeof BODIES[look.body], 'function');
  const T = tracker();
  BODIES[look.body](T.ctx, look);
  const b = T.bounds;
  assert.ok(b.x0 >= -400 && b.x1 <= W + 400 && b.y0 >= -100 && b.y1 <= H + 500, `${Math.round(b.x0)}..${Math.round(b.x1)} x ${Math.round(b.y0)}..${Math.round(b.y1)}: soft glows may spill, nothing else is far out`);
  const { ctx, calls } = recorder();
  BODIES[look.body](ctx, look);
  assert.ok(calls.some(([k, x]) => k === 'moveTo' && x < 0), 'the ribs come in from past the left edge');
  assert.ok(calls.some(([k, x]) => k === 'scale' && x === -1), 'and, mirrored, from past the right one');
});

test('the dawn is low and behind the front: its glows are centred in the lower half, wide, flat and warm, and nothing high in the frame is brighter than a faint haze', () => {
  const T = tracker();
  BODIES[look.body](T.ctx, look);
  const images = T.calls;
  assert.ok(images.length >= 20, `${images.length} soft sprites: stars, clouds, glows`);
  for (const c of images) {
    const cy = (c.box[1] + c.box[3]) / 2;
    assert.ok(c.alpha <= 0.55, `no sprite stronger than about half: ${c.alpha}`);
    const tiny = c.box[2] - c.box[0] <= 24; // a star's glint
    if (cy < 480) assert.ok(c.comp !== 'lighter' || (tiny ? c.alpha <= 0.35 : c.alpha <= 0.25), `high in the frame (${Math.round(cy)}): ${c.alpha} ${c.comp}`);
  }
  const glows = images.filter((c) => c.comp === 'lighter' && c.box[2] - c.box[0] > 700 && (c.box[1] + c.box[3]) / 2 > 700);
  assert.ok(glows.length >= 2, 'a wide glow and a core over the horizon');
  for (const g of glows) {
    assert.ok(Math.abs((g.box[0] + g.box[2]) / 2 - SUN.x) < 220, 'under the west front');
    assert.ok(g.box[3] - g.box[1] < (g.box[2] - g.box[0]) * 0.85, 'flatter than wide: a dawn, not a sun');
  }
  assert.ok(SUN.y > H * 0.78 && GLOW_ALPHA.wide <= 0.5 && GLOW_ALPHA.core <= 0.55 && GLOW_ALPHA.haze <= 0.25);
  assert.ok(SHAFT_ALPHA <= 0.05 && CLOUD_ALPHA <= 0.55, 'the baked shaft hints and the cloud bodies are faint');
  assert.ok(images.filter((c) => (c.box[1] + c.box[3]) / 2 < 330 && c.comp === 'lighter' && c.box[2] - c.box[0] > 24).length <= 6, 'few lit things in the top third besides the stars');
});

test('the vault: ribs spring in from the two top corners as broad bands with a catchlight, none reaching the boss in the middle', () => {
  const { ctx, calls } = recorder();
  BODIES[look.body](ctx, look);
  const quads = calls.filter(([k]) => k === 'quadraticCurveTo');
  assert.ok(quads.length >= 8, `${quads.length} rib strokes`);
  for (const [, , , x1, y1] of quads) assert.ok(Math.min(x1, W - x1) < 700 || y1 > 400, `a rib ends at ${x1},${y1}: clear of the middle`);
  assert.ok(calls.filter(([k]) => k === 'translate').length >= 6, 'a catchlight stroke along the lower edge of each rib');
  assert.equal(calls.filter(([k]) => k === 'save').length, calls.filter(([k]) => k === 'restore').length, 'balanced saves');
});

test('the sky body leaves line caps and joins, widths, colours, alpha and blend mode as it found them', () => {
  const ctx = stateful();
  const before = { ...ctx };
  BODIES[look.body](ctx, look);
  assert.deepEqual({ ...ctx }, before);
});

test('the gradient goes indigo, violet, plum, rose: a deep dawn with a rose horizon, never a lime or a green', () => {
  const hues = look.sky.map(([, c]) => hue(c));
  assert.ok(hues.every((h) => h > 235 || h < 10), `hues ${hues.map(Math.round)}`);
  assert.ok(hues[0] > 235 && hues[0] < 270, 'indigo at the top');
  assert.ok(hues.at(-1) > 320 || hues.at(-1) < 10, 'rose at the horizon');
});
