import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUNKER, createBunker, hitBunker } from '../../src/core/bunkers.js';
import { sink } from './dom-kit.js';

// What bunkers-view.js does for world 17's filter skin (smogprop-filter.test.js has the skin itself): it tells the skin how worn
// the bunker is, and draws the lit rim and the shadow over every carve. The canvas stand-in keeps the pixels the view puts.
const images = [];
globalThis.document = {
  createElement: () => ({
    width: 1,
    height: 1,
    getContext: () => new Proxy({
      createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (img) => images.push(img),
    }, { get: (o, k) => (k in o ? o[k] : sink), set: () => true }),
  }),
  addEventListener() {},
};
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { SKINS } = await import('../../src/ui/bunker-skins.js');
const { drawBunkers } = await import('../../src/ui/bunkers-view.js');
const { rgb } = await import('../../src/ui/sprites.js');

const look = LOOKS.find((l) => l.world === 17);
const { w: W, h: H } = BUNKER;

const bakeOf = (bunker, skin = look.bunker.skin) => {
  images.length = 0;
  drawBunkers(sink, { bunkers: [bunker] }, { ...look, bunker: { ...look.bunker, skin } });
  return images.at(-1);
};

test('the view tells the skin the share of the bunker shot away, 0 for a fresh one', () => {
  const seen = [];
  SKINS['smogprop-probe'] = (x, y, w, h, P) => { seen.push(P.worn); return [P.fill, 0]; };
  const b = createBunker(0, 0, W, H);
  const whole = b.solid;
  bakeOf(b, 'smogprop-probe');
  assert.ok(seen.length > 0 && seen.every((v) => v === 0), 'fresh: no wear');
  hitBunker(b, 40, 20, 8);
  hitBunker(b, 110, 30, 10);
  seen.length = 0;
  bakeOf(b, 'smogprop-probe');
  const expected = 1 - b.solid / whole;
  assert.ok(expected > 0.05 && expected < 0.5);
  assert.ok(seen.every((v) => Math.abs(v - expected) < 1e-9), `wear ${seen[0]} is ${expected}`);
  delete SKINS['smogprop-probe'];
});

test('a carved bunker still gets the lit rim on its top and left edges and the shadow on the others, over the filter skin', () => {
  const b = createBunker(0, 0, W, H);
  hitBunker(b, 80, 14, 9);
  hitBunker(b, 30, 36, 7);
  const img = bakeOf(b);
  const px = (x, y) => [...img.data.slice((y * W + x) * 4, (y * W + x) * 4 + 3)];
  const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && b.mask[y * W + x] === 1;
  const [edge, light, dark] = ['edge', 'light', 'dark'].map((k) => rgb(look.bunker[k]));
  let [e, l, d] = [0, 0, 0];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!at(x, y)) continue;
    if (!at(x, y - 1) || !at(x - 1, y)) { assert.deepEqual(px(x, y), edge, `edge ${x},${y}`); e++; }
    else if (!at(x, y - 2) || !at(x - 2, y)) { assert.deepEqual(px(x, y), light, `light ${x},${y}`); l++; }
    else if (!at(x, y + 1) || !at(x + 1, y) || !at(x, y + 2)) { assert.deepEqual(px(x, y), dark, `dark ${x},${y}`); d++; }
  }
  assert.ok(e > 150 && l > 100 && d > 100, `${e} edge, ${l} light and ${d} dark px round the carves`);
});

test('the skin, the leaf frame and the shared files follow the sprite rules: no shadow blur, dice or clock, under 200 lines', () => {
  for (const name of ['bunker-filter.js', 'bunkers-view.js', 'bunker-skins.js', 'pickup-leaf.js', 'pickup-skins.js']) {
    const src = readFileSync(new URL(`../../src/ui/${name}`, import.meta.url), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
});
