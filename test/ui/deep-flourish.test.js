import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { installCanvas, recorder, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// Lantern Deep's sky and water flourishes under stand-in canvases (deep-ambient.test.js has the ambient): the shafts of
// light, the far whale, the school, the jellyfish and the caustics. Every one must stay quiet (the pearls, the bullets
// and the maelstrom are the loudest things on screen), stay on the screen when it is drawn, leave the context as it
// found it, and be a pure function of the time.
installCanvas(64);
const made = [];
const stand = document.createElement;
document.createElement = (...a) => { // every canvas now made follows what is drawn into it, so a sprite's extent can be read off
  const T = tracker();
  const c = { ...stand(...a), getContext: () => T.ctx, T };
  made.push(c);
  return c;
};
const { look } = await import('./deep-kit.js');
const { drawFlourishes } = await import('../../src/ui/flourish.js');
const { SHAFTS, WHALE_RUN, whaleAt } = await import('../../src/ui/flourish-12.js');
const { SCHOOL, JELLY_ALPHA, HALO_ALPHA, CAUSTICS, warmDeepFlourish } = await import('../../src/ui/flourish-13.js');
const { SHAFT, shaftSprite, WHALE, whaleFrame } = await import('../../src/ui/flourish-deep-sprites.js');
const { fishSprite, JELLY_COLORS, PULSE_FRAMES, jellyFrame } = await import('../../src/ui/flourish-deep-sprites-2.js');
const { CAUSTIC, causticField, causticFade } = await import('../../src/ui/flourish-deep-sprites-3.js');
const { warmDeepAmbient } = await import('../../src/ui/ambient-7.js');

const W = 1920;
const env = (names, t) => ({ v: { look: { ...look, flourish: names }, layers: [], cache: {} }, world: { ship: { x: 960 } }, fx: { flashes: [], time: t }, t, quality: 1 });
const frame = (name, phase, t) => { // what one flourish draws at t: every drawImage with its alpha, blend and bounds
  const T = tracker();
  drawFlourishes(T.ctx, env([name], t), phase, -160, 600);
  return T.calls;
};
const shows = (c, pad = 0) => c.box[2] > -pad && c.box[0] < W + pad && c.box[3] > -pad && c.box[1] < 1080 + pad;
const inside = (c, pad = 0) => c.T.bounds.x0 >= -pad && c.T.bounds.y0 >= -pad && c.T.bounds.x1 <= c.width + pad && c.T.bounds.y1 <= c.height + pad;
const dims = (c) => `${c.width}x${c.height}: ${['x0', 'y0', 'x1', 'y1'].map((k) => Math.round(c.T.bounds[k])).join(',')}`;

test('warming first bakes everything the live flourishes draw: a long run after it makes no new large sprite', () => { // first, before any other test has baked a sprite
  warmDeepFlourish();
  warmDeepAmbient(look);
  const warmed = made.length;
  for (let t = 0; t < 400; t += 1.9) {
    const r = recorder();
    for (const [phase, names] of [['sky', ['shafts', 'leviathan']], ['mid', ['school', 'jellydrift']], ['near', ['caustics']]]) drawFlourishes(r.ctx, env(names, t), phase);
  }
  assert.deepEqual(made.slice(warmed).filter((c) => c.width * c.height > 10000).map((c) => `${c.width}x${c.height}`), [], 'nothing big is painted once the fight is on');
});

test('six pale shafts of light, additive and faint, each swelling and fading on its own beat, none reaching the player zone', () => {
  const a = frame('shafts', 'sky', 10);
  assert.equal(a.length, SHAFTS.n);
  assert.ok(a.every((c) => c.comp === 'lighter' && c.alpha >= SHAFTS.alpha[0] - 1e-9 && c.alpha <= SHAFTS.alpha[1] + 1e-9), 'quiet');
  const b = frame('shafts', 'sky', 47);
  assert.notDeepEqual(a.map((c) => c.alpha), b.map((c) => c.alpha), 'out of step in time');
  assert.notDeepEqual(a.map((c) => c.box[0]), b.map((c) => c.box[0]), 'swaying');
  assert.ok(a.concat(b).every((c) => c.box[3] < 660 && c.box[1] < 0), 'from the surface down, gone short of the foot');
  assert.deepEqual(frame('shafts', 'sky', 10).map((c) => c.box), a.map((c) => c.box), 'the same frame twice');
});

test('the whale crosses once every period, enters and leaves off screen, is mirrored when it swims left and beats its tail', () => {
  const slots = new Map();
  for (let t = 0; t < 560; t += 0.25) {
    const w = whaleAt(t);
    if (!w) continue;
    assert.deepEqual(w, whaleAt(t));
    assert.ok(w.alpha <= WHALE_RUN.alpha + 1e-9 && w.y > 40 && w.y < 560, `alpha ${w.alpha}, y ${w.y}`);
    slots.set(w.slot, [...(slots.get(w.slot) ?? []), w]);
  }
  assert.deepEqual([...slots.keys()], [0, 1, 2, 3, 4, 5, 6], 'one crossing in each period');
  assert.deepEqual(new Set([...slots.values()].map((l) => l[0].dir)), new Set([-1, 1]), 'both ways');
  for (const [slot, list] of slots) {
    assert.ok(list.length * 0.25 < WHALE_RUN.period - 10, `crossing ${slot} leaves a gap before the next`);
    assert.ok(list.every((w, i) => i === 0 || Math.abs(w.age - list[i - 1].age - 0.25) < 1e-9), `crossing ${slot} is unbroken`);
    const start = WHALE_RUN.first + slot * WHALE_RUN.period;
    const [first, last] = [frame('leviathan', 'sky', start + 1e-6), frame('leviathan', 'sky', start + list[0].dur - 1e-6)];
    const dir = list[0].dir;
    assert.ok(first.length === 2 && last.length === 2);
    assert.ok(dir > 0 ? first.every((c) => c.box[2] < 0.01) && last.every((c) => c.box[0] > W - 0.01) : first.every((c) => c.box[0] > W - 0.01) && last.every((c) => c.box[2] < 0.01), `crossing ${slot} starts and ends beyond the edges`);
    const r = recorder();
    drawFlourishes(r.ctx, env(['leviathan'], start + 5), 'sky');
    assert.equal(Math.sign(r.calls.find(([k]) => k === 'scale')[1]), dir, 'mirrored for a whale swimming left');
  }
  assert.equal(frame('leviathan', 'sky', WHALE_RUN.first + 78).length, 0, 'between crossings there is none');
  assert.equal(frame('leviathan', 'sky', 5).length, 0, 'nor before the first');
  const [x, y] = [frame('leviathan', 'sky', 30), frame('leviathan', 'sky', 31.2)];
  assert.notEqual(x[0].img, y[0].img, 'a new frame of the body wave');
  assert.ok(x.concat(y).every((c) => c.alpha <= WHALE_RUN.alpha + 1e-9 && c.comp === 'source-over' && shows(c)), 'dim, and only while it is on the screen');
  assert.ok(whaleFrame(0).T.bounds.y1 !== whaleFrame(1).T.bounds.y1 || whaleFrame(0).T.bounds.y0 !== whaleFrame(1).T.bounds.y0, 'the frames differ');
});

test('the school is at most 36 fish, each one drawImage, dim, on the screen, wheeling to face both ways and flashing silver; none between crossings', () => {
  const [spin, silver, counts] = [new Set(), new Set(), []];
  for (let t = SCHOOL.first; t < SCHOOL.first + SCHOOL.cross + SCHOOL.lag; t += 0.4) {
    const r = recorder();
    drawFlourishes(r.ctx, env(['school'], t), 'mid');
    const images = r.calls.filter(([k]) => k === 'drawImage');
    counts.push(images.length);
    images.forEach((c) => {
      assert.ok(c.alpha >= SCHOOL.alpha[0] - 1e-9 && c.alpha <= SCHOOL.alpha[1] + 1e-9, `alpha ${c.alpha}`);
      if (c[1] === fishSprite(true)) silver.add(t);
    });
    r.calls.filter(([k]) => k === 'rotate').forEach((c) => spin.add(Math.cos(c[1]) < 0));
    frame('school', 'mid', t).forEach((c) => assert.ok(shows(c, 4), 'only fish that are on the screen'));
  }
  assert.ok(Math.max(...counts) <= SCHOOL.n && Math.max(...counts) >= 25, `${Math.max(...counts)} fish at most`);
  assert.deepEqual(spin, new Set([true, false]), 'the path turns back on itself, so fish face both ways');
  assert.ok(silver.size >= 2, 'a flash of silver now and then');
  assert.equal(frame('school', 'mid', SCHOOL.first + SCHOOL.cross + SCHOOL.lag + 1).length, 0, 'none between crossings');
  assert.equal(frame('school', 'mid', 1).length, 0);
  assert.notDeepEqual(frame('school', 'mid', 12).map((c) => c.box), frame('school', 'mid', 12.5).map((c) => c.box), 'it moves');
  assert.equal(frame('school', 'mid', SCHOOL.first + 0.01).length, 0, 'it enters from beyond the frame');
});

test('four or five jellyfish, each a bell and a halo, faint, pulsing through five frames, on the screen, fading before the player zone', () => {
  const sprites = new Set();
  for (let t = 0; t < 120; t += 1.7) {
    const calls = frame('jellydrift', 'mid', t);
    assert.ok(calls.length <= 10, `${calls.length} images`);
    calls.forEach((c) => {
      const halo = c.img.width === 64; // the glow sprite; a jellyfish's own is 128 wide
      assert.equal(c.comp, 'lighter');
      assert.ok(c.alpha <= (halo ? HALO_ALPHA : JELLY_ALPHA[1]) + 1e-9, `alpha ${c.alpha}`);
      assert.ok(shows(c), 'only on the screen');
      if (!halo) sprites.add(c.img);
    });
  }
  assert.ok(sprites.size >= 2 * PULSE_FRAMES - 2, `${sprites.size} jelly sprites drawn: the pulse runs through its frames`);
  assert.notDeepEqual(frame('jellydrift', 'mid', 20).map((c) => c.box), frame('jellydrift', 'mid', 25).map((c) => c.box), 'rising');
});

test('the caustics are two additive layers of seamless tiles over the upper two thirds, at most 0.07, and fade to nothing above the zone', () => {
  const a = frame('caustics', 'near', 3);
  assert.ok(a.length >= 6 && a.length <= 10, `${a.length} tiles`);
  assert.ok(a.every((c) => c.comp === 'lighter' && c.alpha <= CAUSTICS.alpha[0] + 1e-9 && c.box[1] <= 0 && c.box[3] <= 721), 'quiet, from the top down to 720');
  assert.equal(new Set(a.map((c) => c.img)).size, 2, 'two layers, a web of their own each');
  const edges = a.map((c) => c.box[0]).sort((p, q) => p - q);
  assert.ok(edges[0] <= 0 && Math.max(...a.map((c) => c.box[2])) >= W, 'they cover the frame side to side');
  assert.notDeepEqual(frame('caustics', 'near', 3).map((c) => c.box[0]), frame('caustics', 'near', 9).map((c) => c.box[0]), 'the layers slide');
  const field = causticField(1);
  for (const y of [0, 100, 200, 333]) assert.ok(Math.abs(field(0, y) - field(CAUSTIC.w, y)) < 1e-9, `the tile repeats at row ${y}`);
  let lit = 0;
  for (let y = 0; y < CAUSTIC.h; y += 3) for (let x = 0; x < CAUSTIC.w; x += 3) lit += field(x, y) > 0.35 ? 1 : 0;
  const share = lit / ((CAUSTIC.h / 3) * (CAUSTIC.w / 3));
  assert.ok(share > 0.04 && share < 0.4, `${(share * 100).toFixed(1)}% of the tile is line`);
  assert.equal(causticFade(0), 1);
  assert.equal(causticFade(CAUSTIC.fadeTo), 0);
  assert.ok(causticFade(500) < causticFade(300) && causticFade(719) === 0, 'and the player zone stays dark');
});

test('every sprite fits its canvas and has the size it claims', () => {
  const all = [
    shaftSprite(0), shaftSprite(1), fishSprite(false), fishSprite(true),
    ...Array.from({ length: WHALE.frames }, (_, k) => whaleFrame(k)),
    ...JELLY_COLORS.flatMap((_, ci) => Array.from({ length: PULSE_FRAMES }, (__, f) => jellyFrame(ci, f))),
  ];
  for (const c of all) assert.ok(inside(c, 2), dims(c));
  assert.deepEqual([shaftSprite(0).width, shaftSprite(0).height], [SHAFT.w, SHAFT.h]);
  assert.deepEqual([whaleFrame(3).width, whaleFrame(3).height], [WHALE.w, WHALE.h]);
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

test("the deep's flourishes leave the line caps and joins, widths, colours, alpha and blend mode as they found them", () => {
  const runs = [['shafts', 'sky', 10], ['leviathan', 'sky', 30], ['school', 'mid', 14], ['jellydrift', 'mid', 30], ['caustics', 'near', 5]];
  for (const [name, phase, t] of runs) {
    const ctx = stateful();
    const before = { ...ctx };
    drawFlourishes(ctx, env([name], t), phase, -160, 600);
    assert.deepEqual({ ...ctx }, before, name);
  }
});

test('the deep sky and water files are under 200 lines, bake with unique deepfx keys, and use no shadow blur, dice or clock', () => {
  const dir = new URL('../../src/ui/', import.meta.url);
  const files = readdirSync(dir).filter((n) => /^(ambient-7|flourish-12|flourish-13|flourish-deep-sprites.*)\.js$/.test(n));
  assert.equal(files.length, 6);
  for (const name of files) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
    for (const [, key] of src.matchAll(/cached\(\s*['`]([^'`$]+)/g)) assert.ok(key.startsWith('deepfx'), `${name}: ${key}`);
  }
});
