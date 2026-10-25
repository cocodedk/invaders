import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { stateful, hue, limeish, contrast } from './glass-env-kit.js';

// Glass Cathedral's mid layer (parallax-glass-mid.js: columns, buttresses, a window frame, ribs with chandeliers hung from
// them) and near layer (parallax-glass-near.js: the floor with shards, candle stands and a stump of carved arch). Both lie
// behind the player's zone, so they are darker than the far cathedral, and the near one is the darkest: what they light is
// few, small, dim and warm, and low in the frame nothing is bright. Painters leave the context as they found it.
installCanvas(64);
const { look } = await import('./glass-env-look-kit.js');
const { buildLayers, drawLayers, layerX } = await import('../../src/ui/parallax.js');
const { paintLayer } = await import('../../src/ui/parallax-shapes.js');
const { GLASS } = await import('../../src/ui/parallax-glass.js');
const { BED, STANDS } = await import('../../src/ui/parallax-glass-near.js');
const { makeRng } = await import('../../src/core/rng.js');

const [FARL, MIDL, NEARL] = look.layers;
const [far, mid, near] = buildLayers(look, 5);
const key = (l) => JSON.stringify([l.lights.map(({ x, y, r, color, mode, ph, a }) => [x, y, r, color, mode, ph, a]), l.signs]);
const lum = (c) => contrast('#000000', c);

test('the mid and near layers are registered, bake bands of the right size, the same ones every time, and get darker toward the viewer', () => {
  assert.deepEqual([MIDL.kind, NEARL.kind], ['glasscolumns', 'glassfloor']);
  assert.deepEqual([mid.canvas.width, mid.canvas.height, mid.top, mid.far], [2240, 460, 620, false]);
  assert.deepEqual([near.canvas.width, near.canvas.height, near.top, near.far], [2240, 320, 760, false]);
  const again = buildLayers(look, 5);
  assert.equal(key(again[1]), key(mid));
  assert.equal(key(again[2]), key(near));
  assert.ok(lum(FARL.color) > lum(MIDL.color) && lum(MIDL.color) > lum(NEARL.color), 'far paler, near darkest');
  assert.ok(BED > 200 && BED < 320, 'the floor is low in the band');
});

test('the mid layer hangs two chandeliers from the crowns of its ribs, and lights only very faint coloured glows where the glass throws its colour', () => {
  const chand = mid.signs.filter((s) => s.chandelier);
  assert.equal(chand.length, 2);
  for (const s of chand) {
    assert.ok(s.x > 600 && s.x < 2240 && s.y > 0 && s.y < 120, `crown at ${s.x},${s.y}`);
    assert.ok(s.len >= 120 && s.len <= 165 && s.ph >= 0 && s.ph < 1);
    assert.ok(s.y + s.len < 300, 'the chandelier hangs well above the floor');
  }
  assert.ok(chand[0].x < chand[1].x - 400, 'one in the middle, one at the right');
  assert.ok(mid.lights.length >= 3 && mid.lights.length <= 8, `${mid.lights.length} lights`);
  for (const l of mid.lights) {
    assert.ok(l.a <= 0.1 && l.r <= 160 && l.mode === 'steady', `${l.a} ${l.r} ${l.mode}`);
    assert.ok(!limeish(l.color));
  }
});

test('the near layer lights a few small dim warm flames (one a candle stand) low in the frame, and nothing else', () => {
  assert.equal(STANDS.length, 3);
  assert.equal(near.lights.length, STANDS.length, 'one light a candle stand');
  for (const l of near.lights) {
    assert.ok(l.r <= 30 && l.a <= 0.3, `${l.r} ${l.a}: small and dim`);
    assert.ok(l.y > 320 * 0.28 && l.y < BED, `y ${l.y}: low in the frame`);
    assert.equal(l.mode, 'flicker');
    const h = hue(l.color);
    assert.ok(h >= 10 && h <= 45 && !limeish(l.color), `warm: hue ${h}`);
  }
  for (const [i, [x]] of STANDS.entries()) assert.ok(Math.abs(near.lights[i].x - x) < 1, 'over its stand');
  assert.deepEqual(near.signs, []);
});

test('drawn, each layer is one image and its lights; the lights flicker or hold', () => {
  for (const [layer, n] of [[mid, mid.lights.length], [near, near.lights.length]]) {
    const frame = (t) => {
      const { ctx, calls } = recorder();
      drawLayers(ctx, [layer], 960, t, 1, null);
      return calls.filter(([k]) => k === 'drawImage');
    };
    const [a, b] = [frame(0.4), frame(1.3)];
    const seen = layer.lights.filter((l) => layerX(layer, 960) + l.x + l.r >= 0 && layerX(layer, 960) + l.x - l.r <= 1920).length;
    assert.equal(a.length, 1 + seen);
    assert.ok(seen <= n);
    assert.ok(a.length <= 10);
    if (layer === near) assert.ok(a.some((c, i) => c.alpha !== b[i].alpha), 'the flames flicker');
  }
});

test('nothing either layer paints is taller than its band, and each stands on the bottom of it', () => {
  for (const [kind, L, h, top] of [['glasscolumns', MIDL, 460, 0], ['glassfloor', NEARL, 320, 0]]) {
    const T = tracker();
    GLASS[kind](T.ctx, 2240, h, makeRng(1), L, { lights: [], signs: [] });
    const b = T.bounds;
    assert.ok(b.y0 >= top && b.y1 <= h + 1, `${kind}: ${Math.round(b.y0)}..${Math.round(b.y1)} in a band ${h} high`);
    assert.ok(b.x0 >= -1 && b.x1 <= 2240 + 6, `${kind}: ${Math.round(b.x0)}..${Math.round(b.x1)}`);
    assert.ok(b.y1 >= h - 2, `${kind} stands on the floor of the band`);
  }
  const T = tracker();
  GLASS.glasscolumns(T.ctx, 2240, 460, makeRng(1), MIDL, { lights: [], signs: [] });
  assert.ok(T.bounds.y0 < 40, 'the tallest column reaches nearly to the top of the mid band');
});

test('both painters leave line caps and joins, widths, colours, alpha and blend mode as they found them, and keep their saves in balance', () => {
  for (const [kind, L, h] of [['glasscolumns', MIDL, 460], ['glassfloor', NEARL, 320]]) {
    for (const [name, run] of Object.entries({
      painter: (ctx) => GLASS[kind](ctx, 2240, h, makeRng(3), L, { lights: [], signs: [] }),
      paint: (ctx) => paintLayer(ctx, 2240, h, makeRng(3), L, { lights: [], signs: [] }),
    })) {
      const ctx = stateful();
      const before = { ...ctx };
      run(ctx);
      if (name === 'paint') before.fillStyle = L.color;
      assert.deepEqual({ ...ctx }, before, `${kind} ${name}`);
    }
    const { ctx, calls } = recorder();
    GLASS[kind](ctx, 2240, h, makeRng(1), L, { lights: [], signs: [] });
    assert.equal(calls.filter(([k]) => k === 'save').length, calls.filter(([k]) => k === 'restore').length, kind);
  }
});

test('the floor is quiet under bullets: its shards are dim (every fill under half alpha or a dark jewel), it has no small bright shapes low in the band', () => {
  const log = [];
  const state = {};
  const spy = new Proxy(state, {
    get: (o, k) => (k in o ? o[k] : (...a) => { log.push([k, a, o.fillStyle]); return spy; }),
    set: (o, k, v) => ((o[k] = v), true),
  });
  GLASS.glassfloor(spy, 2240, 320, makeRng(1), NEARL, { lights: [], signs: [] });
  const fills = log.filter(([k, , style]) => k === 'fill' && typeof style === 'string' && /^rgba/.test(style));
  assert.ok(fills.length >= 40, `${fills.length} translucent fills: shards, leaves, pools`);
  let flames = 0;
  for (const [, , style] of fills) {
    if (style.startsWith('rgba(255,154,140')) continue; // the dawn's rim: laid over a shape, then all but a 2 px strip of it covered again
    const [r, g, b, a] = style.match(/[\d.]+/g).map(Number);
    if (r > 235 && a <= 0.65 && g > 150 && g < 190 && b < 130) { // a candle flame: warm, small, at most four a stand
      flames++;
      continue;
    }
    assert.ok(Math.max(r, g, b) < 235 || a <= 0.35, `${style}: a bright opaque fill`);
    assert.ok(!(g > 200 && b < 120 && r < 220), `${style} is the bullets' lime`);
  }
  assert.ok(flames >= 6 && flames <= 12, `${flames} flames`);
});
