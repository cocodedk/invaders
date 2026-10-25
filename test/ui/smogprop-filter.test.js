import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUNKER } from '../../src/core/bunkers.js';
import { installCanvas } from './dom-kit.js';

// World 17's bunker skin (bunker-filter.js, 'filter'): a wall of clean-air filter cassettes that greys with soot as it is shot
// away. The skin is pure per-pixel, skin(x, y, w, h, P) -> [rgb, k], and reads P.worn (bunkers-view.js) for the soot; what the
// view does with it (the wear it passes, the rim over every carve) is in smogprop-view.test.js.
installCanvas(64);
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { SKINS } = await import('../../src/ui/bunker-skins.js');
const { filterWall } = await import('../../src/ui/bunker-filter.js');
const { rgb } = await import('../../src/ui/sprites.js');

const look = LOOKS.find((l) => l.world === 17);
const { w: W, h: H } = BUNKER;
const palette = (worn) => {
  const P = {};
  for (const k of ['fill', 'light', 'dark', 'edge', 'accent']) P[k] = rgb(look.bunker[k]);
  if (worn !== undefined) P.worn = worn;
  return P;
};
const wall = (worn, w = W, h = H) => {
  const P = palette(worn);
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => filterWall(x, y, w, h, P)));
};
// The colour a pixel ends up, once the view has blended the skin's [rgb, k] toward the light or the dark.
const final = ([c, k], P) => c.map((v, i) => v + ((k >= 0 ? P.light : P.dark)[i] - v) * Math.abs(k));
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const isMedia = (x, y) => y >= 14 && y <= 48 && x % 32 >= 8 && x % 32 <= 24; // the middle of a window, clear of the frame
const mean = (list) => list.reduce((s, v) => s + v, 0) / list.length;

test('world 17 is bunkered in the filter skin, registered beside the others and not an alias of any of them', () => {
  assert.equal(look.bunker.skin, 'filter');
  assert.equal(SKINS.filter, filterWall);
  for (const [name, skin] of Object.entries(SKINS)) if (name !== 'filter') assert.notEqual(skin, filterWall, name);
});

test('the skin gives a colour and a blend in [-1, 1] at every pixel of any bunker size and wear, the same every time', () => {
  for (const [w, h] of [[W, H], [100, 40], [240, 60], [160, 80]]) {
    for (const worn of [undefined, 0, 0.35, 1]) {
      const [a, b] = [wall(worn, w, h), wall(worn, w, h)];
      assert.deepEqual(a, b, `${w}x${h} worn ${worn}: deterministic`);
      for (const row of a) for (const [c, k] of row) assert.ok(c.length === 3 && c.every((v) => v >= 0 && v <= 255) && Number.isFinite(k) && k >= -1 && k <= 1, `colour ${c} blend ${k}`);
    }
  }
  assert.deepEqual(wall(undefined), wall(0), 'no wear given is no wear');
});

test('the wall is five cassettes: a green stripe along the head, seams between them, a window of pleats in each, indicator squares along the foot', () => {
  const P = palette(0);
  const px = wall(0);
  for (const y of [4, 5, 6]) for (let x = 24; x < 136; x++) assert.equal(px[y][x][0], P.edge, `the stripe at ${x},${y}`);
  for (const x of [32, 64, 96, 128]) assert.equal(px[20][x][0], P.dark, `a seam at ${x}`);
  assert.notEqual(px[20][16][0], P.dark, 'and none in the middle of a cassette');
  let leds = 0;
  for (let y = 50; y < H; y++) for (let x = 0; x < W; x++) if (px[y][x][0][1] > 200 && px[y][x][0][2] > 150 && px[y][x][0][0] < 100) leds++;
  assert.ok(leds >= 30 && leds <= 120, `${leds} px of indicator green-teal at the foot`);
  const tones = new Set(px.flat().map((p) => final(p, P).map(Math.round).join()));
  assert.ok(tones.size > 150, `${tones.size} distinct tones: nothing flat`);
});

test('the media is pleated six px crease to crease, lit on one face and shaded on the other, with a wire mesh every fifth row', () => {
  const P = palette(0);
  const px = wall(0);
  const k = (x, y) => px[y][x][1];
  const row = (y) => Array.from({ length: 20 }, (_, i) => k(8 + i, y)); // x 8 to 27: inside the first window's pleats
  const r = row(33); // not a mesh row
  assert.ok(Math.max(...r) - Math.min(...r) > 0.6, 'a crease and a ridge are well apart in blend');
  for (let i = 0; i < 14; i++) assert.ok(Math.abs(r[i] - r[i + 6]) < 0.3, `pleat ${i} repeats after 6 px`);
  const wires = mean(row(37)) - mean(row(36));
  assert.ok(wires < -0.1, `the mesh wire row is darker than the row above (${wires.toFixed(2)})`);
  assert.ok(final(px[33][8 + r.indexOf(Math.max(...r))], P).every((v, i) => v >= [160, 190, 170][i] - 60), 'and the ridges are pale');
});

test('fresh, the media is clean and pale; worn, it greys with soot, first in the creases, with black streaks, while the green trim and the indicator marks stay', () => {
  const fresh = wall(0);
  const P = palette(0);
  const [light, mid, heavy] = [wall(0.2), wall(0.5), wall(1)];
  const media = (px, worn) => {
    const out = [];
    for (let y = 14; y <= 48; y++) for (let x = 0; x < W; x++) if (isMedia(x, y)) out.push(lum(final(px[y][x], palette(worn))));
    return out;
  };
  const [l0, l1, l2, l3] = [media(fresh, 0), media(light, 0.2), media(mid, 0.5), media(heavy, 1)];
  assert.ok(mean(l0) > 190, `fresh media is pale (${mean(l0).toFixed(0)})`);
  assert.ok(mean(l0) > mean(l1) && mean(l1) > mean(l2) && mean(l2) > mean(l3), 'and it greys the more worn the wall is');
  assert.ok(mean(l0) - mean(l3) > 60, `by a lot when it is gone (${(mean(l0) - mean(l3)).toFixed(0)})`);
  assert.ok(Math.min(...l3) < 90, 'with near-black in it');
  assert.ok(l3.filter((v) => v < 90).length > l0.filter((v) => v < 90).length + 40, 'black streaks only come with wear');
  // soot gathers in the creases first: at light wear the creases (u = 0 of the pleat) have greyed more than the faces
  const crease = [];
  const face = [];
  for (let y = 14; y <= 48; y++) {
    for (let x = 4; x < 28; x++) {
      if ((y - 12) % 5 === 0) continue;
      const u = (((x - 4 - 2) % 6) + 6) % 6;
      const d = lum(final(fresh[y][x], P)) - lum(final(light[y][x], palette(0.2)));
      (u === 0 ? crease : u === 3 ? face : []).push(d);
    }
  }
  assert.ok(mean(crease) >= mean(face), 'the creases take the soot first');
  // the green trim and the indicator marks never grey
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [c] = fresh[y][x];
    if (c === P.edge || (c[1] > 200 && c[0] < 100)) assert.deepEqual(heavy[y][x], fresh[y][x], `the green at ${x},${y} stays`);
  }
});

test('the frame greys a little less than the media', () => {
  const [fresh, heavy] = [wall(0), wall(1)];
  const [P0, P1] = [palette(0), palette(1)];
  const drop = (pts) => mean(pts.map(([x, y]) => lum(final(fresh[y][x], P0)) - lum(final(heavy[y][x], P1))));
  const frame = [];
  const media = [];
  for (let x = 40; x < 56; x++) for (let y = 8; y < 11; y++) frame.push([x, y]);
  for (let y = 16; y < 46; y++) for (let x = 38; x < 58; x++) media.push([x, y]);
  assert.ok(drop(frame) < drop(media), `frame ${drop(frame).toFixed(0)} < media ${drop(media).toFixed(0)}`);
});

test('no other skin shares more than one pixel in ten of its colours and blends, fresh or worn, and none of them reads the wear', () => {
  for (const worn of [0, 0.5]) {
    const [mine, P] = [wall(worn), palette(worn)];
    for (const [name, skin] of Object.entries(SKINS)) {
      if (name === 'filter') continue;
      let same = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const [c, k] = skin(x, y, W, H, P);
        if (c === mine[y][x][0] && Math.abs(k - mine[y][x][1]) < 0.05) same++;
      }
      assert.ok(same / (W * H) < 0.1, `${name} agrees at ${((same / (W * H)) * 100).toFixed(1)}% of pixels (worn ${worn})`);
    }
  }
  for (const [name, skin] of Object.entries(SKINS)) {
    if (name === 'filter') continue;
    for (const [x, y] of [[3, 5], [40, 20], [80, 33], [120, 50], [150, 8]]) assert.deepEqual(skin(x, y, W, H, palette(0.8)), skin(x, y, W, H, palette()), `${name} at ${x},${y} ignores P.worn`);
  }
});
