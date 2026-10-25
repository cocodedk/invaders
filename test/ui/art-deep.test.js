import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUNKER } from '../../src/core/bunkers.js';
import { installCanvas } from './dom-kit.js';
import { look } from './deep-kit.js';
import { rgb } from '../../src/ui/sprites.js';

// Lantern Deep's bunkers (art.test.js and the other art-*.test.js have the other worlds'; art-deep-pickup.test.js
// this world's pickup rim and icons): the reef skin is coral-crusted drowned stone, no other skin's texture.
installCanvas(64);
const { SKINS } = await import('../../src/ui/bunker-skins.js');
const { reef } = await import('../../src/ui/bunker-reef.js');

const { w: W, h: H } = BUNKER;
const P = {};
for (const k of ['fill', 'light', 'dark', 'edge', 'accent']) P[k] = rgb(look.bunker[k]);
const nameOf = (c) => Object.entries(P).find(([, v]) => v === c)?.[0] ?? (c[2] > 200 ? 'violet' : 'moss'); // the skin's own two: a violet coral and a moss

// The skin over a w x h bunker: { px[y][x] = [colour, k], seen: Map name -> count, rows[y]: Map name -> count }.
function bake(w = W, h = H) {
  const px = [];
  const seen = new Map();
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    const count = new Map();
    for (let x = 0; x < w; x++) {
      const out = reef(x, y, w, h, P);
      row.push(out);
      const n = nameOf(out[0]);
      seen.set(n, (seen.get(n) ?? 0) + 1);
      count.set(n, (count.get(n) ?? 0) + 1);
    }
    px.push(row);
    rows.push(count);
  }
  return { px, seen, rows };
}
const share = (rows, y0, y1, w, ...names) => {
  let n = 0;
  for (let y = y0; y < y1; y++) for (const k of names) n += rows[y].get(k) ?? 0;
  return n / (w * (y1 - y0));
};

test("Lantern Deep's bunkers use the reef skin, and it is registered beside the others'", () => {
  assert.equal(look.bunker.skin, 'reef');
  assert.equal(SKINS.reef, reef);
  assert.ok(Object.keys(SKINS).length >= 15);
});

test('the reef skin gives a colour and a blend in [-1, 1] at every pixel of any bunker size, and the same ones every time', () => {
  for (const [w, h] of [[W, H], [100, 40], [240, 60], [160, 80]]) {
    const a = bake(w, h);
    const b = bake(w, h);
    assert.deepEqual(a.px, b.px, `${w}x${h}: deterministic`);
    for (const row of a.px) {
      for (const [c, k] of row) {
        assert.ok(Array.isArray(c) && c.length === 3 && c.every((v) => v >= 0 && v <= 255), 'a colour as [r, g, b]');
        assert.ok(Number.isFinite(k) && k >= -1 && k <= 1, `k ${k}`);
      }
    }
  }
});

test('the reef is drowned stone: ashlar and dark joints, coral in pink and violet, pale barnacles, teal polyps and moss', () => {
  const { seen, rows, px } = bake();
  assert.ok(seen.get('fill') > 4000, `${seen.get('fill')} px of stone: the body of the wall`);
  assert.ok(seen.get('dark') > 700 && share(rows, 20, 58, W, 'dark') < 0.25, `${seen.get('dark')} px of joints, pits and barnacle mouths`);
  assert.ok(seen.get('accent') > 500 && seen.get('violet') > 300, `${seen.get('accent')} px of pink coral and ${seen.get('violet')} of violet`);
  assert.ok(seen.get('light') > 150, `${seen.get('light')} px of barnacle shell and salt`);
  assert.ok(seen.get('moss') > 200, `${seen.get('moss')} px of moss`);
  assert.ok(seen.get('edge') >= 15 && seen.get('edge') < 120, `${seen.get('edge')} px of teal: a few small polyps, not a glow`);
  let hearts = 0;
  for (const row of px) for (const [c, k] of row) if (c === P.light && k === 0.55) hearts++;
  assert.ok(hearts >= 5 && hearts <= 30, `${hearts} bright polyp hearts`);
  const colours = new Set(px.flat().map(([c, k]) => `${c}|${Math.round(k * 20)}`));
  assert.ok(colours.size > 80, `${colours.size} distinct tones: nothing flat`);
});

test('the coral crust runs along the top and drapes the two corners, and the foot and the middle of the wall are stone', () => {
  const { rows, px } = bake();
  assert.ok(share(rows, 3, 9, W, 'accent', 'violet') > 0.6, `rows 3-8 are mostly coral: ${share(rows, 3, 9, W, 'accent', 'violet').toFixed(2)}`);
  assert.ok(share(rows, 24, 56, W, 'accent', 'violet') < 0.02, 'no coral down the body');
  assert.ok(share(rows, 3, 6, W, 'accent') > 0.2 && share(rows, 3, 6, W, 'violet') > 0.2, 'both hues, side by side');
  const coral = (x0, x1, y0, y1) => {
    let n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) n += ['accent', 'violet'].includes(nameOf(px[y][x][0])) ? 1 : 0;
    return n / ((x1 - x0) * (y1 - y0));
  };
  assert.ok(coral(0, 14, 12, 24) > 0.25 && coral(W - 14, W, 12, 24) > 0.25, 'the corners are draped in coral below the crust');
  assert.ok(coral(50, 110, 12, 24) < 0.1 && coral(0, W, 36, 56) < 0.02, 'while the middle of the wall is bare');
  const types = new Set(); // a different growth every few px: the top rows are not one pattern
  for (let x = 0; x < W; x += 4) types.add(`${nameOf(px[7][x][0])}${Math.round(px[7][x][1] * 4)}`);
  assert.ok(types.size >= 6, `${types.size} kinds of coral in one row`);
});

test('the reef is its own texture: no other skin shares more than one pixel in ten of its colours and blends', () => {
  const mine = bake().px;
  for (const [name, skin] of Object.entries(SKINS)) {
    if (name === 'reef') continue;
    let same = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const [c, k] = skin(x, y, W, H, P);
      if (c === mine[y][x][0] && Math.abs(k - mine[y][x][1]) < 0.05) same++;
    }
    assert.ok(same / (W * H) < 0.1, `${name} agrees at ${((same / (W * H)) * 100).toFixed(1)}% of pixels`);
  }
});

test('the reef skin and the pickup rim follow the sprite rules: no shadow blur, no clock or dice, files under 200 lines', () => {
  for (const name of ['bunker-reef.js', 'pickup-deep.js']) {
    const src = readFileSync(new URL(`../../src/ui/${name}`, import.meta.url), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
  for (const name of ['bunker-skins.js', 'pickup-skins.js']) {
    assert.ok(readFileSync(new URL(`../../src/ui/${name}`, import.meta.url), 'utf8').split('\n').length < 200, `${name} is under 200 lines`);
  }
});
