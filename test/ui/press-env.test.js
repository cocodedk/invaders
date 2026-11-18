import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scribe, W, H } from './bath-kit.js';
import { recorder } from './dom-kit.js';

// World 20's backdrop (part 3 of 7) under stand-in canvases, with the look as the game will have it: the colophon's text, the sky body,
// layers and ambient kinds registered under names no other world uses and drawing, the colophon on the near layer low on the right, in
// the frame wherever the ship flies and clear of the HUD, and the files of this part free of shadowBlur and under 200 lines.
const { readdirSync, readFileSync } = await import('node:fs');
const look = { world: 20, ...(await import('../../src/ui/looks/w20.js')).default };
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { buildSky } = await import('../../src/ui/sky.js');
const { buildLayers, layerX, MARGIN } = await import('../../src/ui/parallax.js');
const { drawAmbient } = await import('../../src/ui/ambient.js');
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { BODIES12 } = await import('../../src/ui/sky-bodies-12.js');
const { PRESS } = await import('../../src/ui/parallax-press.js');
const { AMBIENT12 } = await import('../../src/ui/ambient-12.js');
const { COLOPHON, MARGIN: PRESS_MARGIN, PAL } = await import('../../src/ui/press-kit.js');
const { SHEET, ROOM } = await import('../../src/ui/parallax-press-colophon.js');
const { HUD_BOTTOM } = await import('../../src/core/kinds.js');
const { ZONE } = await import('../../src/core/ship.js');
const { FLOOR } = await import('../../src/ui/sky-bodies-11-kit.js');

test("the colophon's constant is exactly the agreed text", () => {
  assert.equal(COLOPHON, 'built by graph skill fable-5.2 2026-11-18. cocode.dk');
});

test('the look names a sky body, three layers and ambient entries that exist, under keys no other world uses, and they draw', () => {
  assert.equal(BODIES[look.body], BODIES12[look.body], 'the body is registered and not overridden');
  assert.equal(look.layers.length, 3);
  for (const L of look.layers) assert.equal(typeof PRESS[L.kind], 'function', L.kind);
  assert.ok(look.ambient.length >= 1);
  for (const a of look.ambient) assert.equal(typeof AMBIENT12[a.kind], 'function', a.kind);
  for (const name of ['paper', 'ink', 'vermilion']) assert.equal(look.palette[name], PAL[name], `the palette carries the hall's ${name}`);
  const others = { body: new Set(), layer: new Set(), ambient: new Set() };
  for (const o of LOOKS) {
    others.body.add(o.body);
    for (const L of o.layers) others.layer.add(L.kind);
    for (const a of o.ambient) others.ambient.add(a.kind);
  }
  for (const k of Object.keys(BODIES12)) assert.ok(!others.body.has(k), `body ${k}`);
  for (const k of Object.keys(PRESS)) assert.ok(!others.layer.has(k), `layer kind ${k}`);
  for (const k of Object.keys(AMBIENT12)) assert.ok(!others.ambient.has(k), `ambient kind ${k}`);
  buildSky(look);
  const layers = buildLayers(look, 3);
  assert.deepEqual(layers.map((l) => l.top), look.layers.map((L) => H - L.height));
  assert.equal(PRESS_MARGIN, MARGIN, "parallax.js's margin");
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

test('the colophon is drawn on the near layer, low on the right, readable, in the frame wherever the ship flies and clear of the HUD', () => {
  const s = scribe();
  const built = buildLayers(look, 3);
  s.restore();
  const marks = s.texts.filter((x) => x.text === COLOPHON);
  assert.equal(marks.length, 1, 'lettered once');
  const [mark] = marks;
  assert.deepEqual(mark.canvas, [W + 2 * MARGIN, look.layers[2].height], 'on the near layer');
  assert.ok(Number(/(\d+)px/.exec(mark.font)[1]) >= 18 && mark.textAlign === 'center' && mark.maxWidth === SHEET.w - ROOM, mark.font);
  const L = built[2];
  const y = L.top + mark.y;
  assert.ok(y - SHEET.h / 2 > HUD_BOTTOM && y - SHEET.h / 2 > FLOOR && y + SHEET.h / 2 < H, `low, at frame y ${y}`);
  for (const ship of [ZONE.x0, W / 2, ZONE.x1]) {
    const x = layerX(L, ship) + mark.x;
    assert.ok(x > W / 2, 'on the right');
    assert.ok(x - SHEET.w / 2 >= 0 && x + SHEET.w / 2 <= W, `with the ship at ${ship} the sheet spans ${x - SHEET.w / 2}..${x + SHEET.w / 2}`);
  }
});

test('no file of this part uses shadowBlur, and each stays under 200 lines', () => {
  const dir = new URL('../../src/ui/', import.meta.url);
  const names = readdirSync(dir).filter((n) => /^(parallax-press|sky-bodies-12|ambient-12|press-kit)/.test(n)).map((n) => new URL(n, dir));
  names.push(new URL('looks/w20.js', dir));
  assert.equal(names.length, 9);
  for (const f of names) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!src.includes('shadowBlur'), `${f.pathname} uses shadowBlur`);
    assert.ok(src.split('\n').length < 200, `${f.pathname} is under 200 lines`);
  }
});
