import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scribe, W, H } from './bath-kit.js';
import { recorder } from './dom-kit.js';

// World 21's backdrop (024) under stand-in canvases, with the look as the game will have it: the mark's text, the sky body, layers and
// ambient kinds registered under names no other world uses and drawing, the mark on the near layer low on the right, smaller than
// world 20's colophon, with no shadow and no lamp's glow on it, in the frame wherever the ship flies and clear of the HUD, and the files
// of this part free of shadowBlur and under 200 lines.
const { readdirSync, readFileSync } = await import('node:fs');
const look = { world: 21, ...(await import('../../src/ui/looks/w21.js')).default };
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { buildSky } = await import('../../src/ui/sky.js');
const { buildLayers, layerX, MARGIN } = await import('../../src/ui/parallax.js');
const { drawAmbient } = await import('../../src/ui/ambient.js');
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { BODIES13 } = await import('../../src/ui/sky-bodies-13.js');
const { ISLE_LAYERS } = await import('../../src/ui/parallax-isle.js');
const { AMBIENT13 } = await import('../../src/ui/ambient-13.js');
const { MARK, MARGIN: ISLE_MARGIN } = await import('../../src/ui/isle-kit.js');
const { LEAF, ROOM } = await import('../../src/ui/parallax-isle-mark.js');
const { SHEET } = await import('../../src/ui/parallax-press-colophon.js');
const { HUD_BOTTOM } = await import('../../src/core/kinds.js');
const { FREE_ZONE } = await import('../../src/core/ship.js');

test("the mark's constant is exactly the agreed text", () => {
  assert.equal(MARK, 'cocode.dk \u00b7 graph-loop \u00b7 2026');
});

test('the look names a sky body, three layers and ambient entries that exist, under keys no other world uses, and they draw', () => {
  assert.equal(BODIES[look.body], BODIES13[look.body], 'the body is registered and not overridden');
  const sky = recorder();
  BODIES13[look.body](sky.ctx, look);
  assert.ok(sky.calls.filter(([k]) => k === 'drawImage').length > 0 && sky.calls.some(([k]) => k === 'fill'), 'the sky body paints');
  assert.equal(look.layers.length, 3);
  for (const L of look.layers) assert.equal(typeof ISLE_LAYERS[L.kind], 'function', L.kind);
  assert.ok(look.ambient.length >= 2);
  for (const a of look.ambient) assert.equal(typeof AMBIENT13[a.kind], 'function', a.kind);
  const others = { body: new Set(), layer: new Set(), ambient: new Set() };
  for (const o of LOOKS.filter((l) => l.world !== look.world)) {
    others.body.add(o.body);
    for (const L of o.layers) others.layer.add(L.kind);
    for (const a of o.ambient) others.ambient.add(a.kind);
  }
  for (const k of Object.keys(BODIES13)) assert.ok(!others.body.has(k), `body ${k}`);
  for (const k of Object.keys(ISLE_LAYERS)) assert.ok(!others.layer.has(k), `layer kind ${k}`);
  for (const k of Object.keys(AMBIENT13)) assert.ok(!others.ambient.has(k), `ambient kind ${k}`);
  buildSky(look);
  const layers = buildLayers(look, 3);
  assert.deepEqual(layers.map((l) => l.top), look.layers.map((L) => H - L.height));
  assert.ok(layers.every((l) => l.lights.length > 0), 'every layer carries its lights: fires, torches, lamps');
  assert.equal(ISLE_MARGIN, MARGIN, "parallax.js's margin");
  for (const a of look.ambient) {
    let drawn = 0;
    for (let i = 0; i < 20; i++) {
      const r = recorder();
      drawAmbient(r.ctx, { ...look, ambient: [a] }, a.phase, { t: i * 0.7, drift: 0, wind: 0, world: {} });
      drawn += r.calls.filter(([k]) => k === 'drawImage').length;
    }
    assert.ok(drawn > 0, `${a.kind} draws`);
  }
});

test('the mark is drawn on the near layer, low on the right, smaller than the colophon, unshadowed and unlit, in the frame and clear of the HUD', () => {
  const s = scribe();
  const built = buildLayers(look, 3);
  s.restore();
  const marks = s.texts.filter((x) => x.text === MARK);
  assert.equal(marks.length, 1, 'lettered once');
  const [mark] = marks;
  assert.deepEqual(mark.canvas, [W + 2 * MARGIN, look.layers[2].height], 'on the near layer');
  const size = Number(/(\d+)px/.exec(mark.font)[1]);
  assert.ok(size === LEAF.size && size < SHEET.size, `${mark.font} is smaller than the colophon's ${SHEET.size}px`);
  assert.ok(mark.textAlign === 'center' && mark.maxWidth === LEAF.w - ROOM);
  for (const k of ['shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY']) assert.ok(!mark[k], `no ${k}`);
  assert.notEqual(mark.globalCompositeOperation, 'lighter', 'not lettered in light');
  const L = built[2];
  const y = L.top + mark.y;
  assert.ok(y - LEAF.h / 2 > HUD_BOTTOM && y + LEAF.h / 2 < H, `low, at frame y ${y}`);
  for (const p of L.lights) {
    const dx = Math.max(0, Math.abs(p.x - mark.x) - LEAF.w / 2);
    const dy = Math.max(0, Math.abs(p.y - mark.y) - LEAF.h / 2);
    assert.ok(Math.hypot(dx, dy) > p.r * 2, `a light at ${p.x},${p.y} glows on the leaf`);
  }
  for (const ship of [FREE_ZONE.x0, W / 2, FREE_ZONE.x1]) {
    const x = layerX(L, ship) + mark.x;
    assert.ok(x > W / 2, 'on the right');
    assert.ok(x - LEAF.w / 2 >= 0 && x + LEAF.w / 2 <= W, `with the ship at ${ship} the leaf spans ${x - LEAF.w / 2}..${x + LEAF.w / 2}`);
  }
});

test('no file of this part uses shadowBlur, and each stays under 200 lines', () => {
  const dir = new URL('../../src/ui/', import.meta.url);
  const names = readdirSync(dir).filter((n) => /^(parallax-isle|sky-bodies-13|ambient-13|isle-kit)/.test(n)).map((n) => new URL(n, dir));
  names.push(new URL('looks/w21.js', dir));
  assert.equal(names.length, 9);
  for (const f of names) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!src.includes('shadowBlur'), `${f.pathname} uses shadowBlur`);
    assert.ok(src.split('\n').length < 200, `${f.pathname} is under 200 lines`);
  }
});
