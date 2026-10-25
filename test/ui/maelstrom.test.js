import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { installCanvas, recorder, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { look } from './deep-kit.js';

// The maelstrom of Lantern Deep (world 15): world 8's well as a whirlpool of bubbles and light. The flourish under
// stand-in canvases: what it draws and where, that it moves and dims, that it gives the context back as it found
// it, that every baked sprite fits its canvas and that warming bakes them all. The bubble a swallowed bullet becomes
// is bubble-view.test.js; the rule behind it is test/fx/react-maelstrom.test.js.
installCanvas(64);
const made = [];
const stand = document.createElement;
// Every canvas now made is one that follows what is drawn into it, so a sprite's extent can be read off.
document.createElement = (...a) => {
  const T = tracker();
  const c = { ...stand(...a), getContext: () => T.ctx, T };
  made.push(c);
  return c;
};
const sprites = await import('../../src/ui/flourish-maelstrom-sprites.js');
const { bubble, BUBBLE_BOX } = await import('../../src/ui/flourish-maelstrom-bubble.js');
const { FLOURISH_MAELSTROM, FLOW, warmMaelstrom } = await import('../../src/ui/flourish-maelstrom.js');
const { WELL } = await import('../../src/core/kinds.js');
const { wellLight } = await import('../../src/ui/sky-bodies-2.js');
const { LIP, BUBBLE_COLORS } = await import('../../src/fx/react-maelstrom.js');

const { ARMS, THROAT, FUNNEL, LIP_BOX } = sprites;
const near = FLOURISH_MAELSTROM.maelstrom.near;
const BOSS = { boss: true };
const env = (t, over = {}) => ({ v: { look, layers: [], cache: {} }, world: { level: {}, ...over.world }, t, quality: over.quality ?? 1 });
const draw = (t, over) => {
  const { ctx, calls } = recorder();
  near(ctx, env(t, over));
  return calls;
};
const images = (calls) => calls.filter(([k]) => k === 'drawImage');
const bubbles = () => new Set(BUBBLE_COLORS.map(bubble)); // not at load: the warming test counts the sprites it bakes
const centre = (c) => [c[2] + c[4] / 2, c[3] + c[5] / 2];
const inside = (c, pad = 0) => c.T.bounds.x0 >= -pad && c.T.bounds.y0 >= -pad && c.T.bounds.x1 <= c.width + pad && c.T.bounds.y1 <= c.height + pad;
const dims = (c) => `${c.width}x${c.height}: ${['x0', 'y0', 'x1', 'y1'].map((k) => Math.round(c.T.bounds[k])).join(',')}`;

test('warming bakes every sprite the maelstrom draws, so no frame of the fight bakes one', () => {
  const before = made.length;
  warmMaelstrom();
  const warmed = made.length;
  assert.ok(warmed - before >= ARMS.length + 3 + BUBBLE_COLORS.length, `${warmed - before} canvases baked`);
  for (const over of [{}, { quality: 0.5 }, { world: { level: BOSS, well: { x: 400, y: 500 } } }]) for (let t = 0; t < 30; t += 1.7) draw(t, over);
  assert.equal(made.length, warmed, 'drawing baked nothing more');
});

test('the look names the maelstrom, and it is one draw at the near depth', () => {
  assert.ok(look.flourish.includes('maelstrom'));
  assert.deepEqual(Object.keys(FLOURISH_MAELSTROM), ['maelstrom']);
  assert.deepEqual(Object.keys(FLOURISH_MAELSTROM.maelstrom), ['near']);
});

test('it draws a halo, three arms, the throat, the funnel, the lip and a stream of bubbles in under 40 images, centred on the well', () => {
  const calls = draw(3.3);
  const all = images(calls);
  assert.ok(all.length >= 14 && all.length <= 40, `${all.length} images`);
  assert.ok(all.every((c) => c.slice(1).every((v) => v === undefined || typeof v === 'object' || Number.isFinite(v)) && c.alpha >= 0 && c.alpha <= 1));
  for (let i = 0; i < ARMS.length; i++) assert.equal(all.filter((c) => c[1] === sprites.arm(i)).length, 1, `arm ${i}`);
  for (const s of [sprites.throat(), sprites.funnel(), sprites.lipArc()]) assert.equal(all.filter((c) => c[1] === s).length, 1);
  const hole = all.find((c) => c[1] === sprites.throat());
  assert.deepEqual([hole[2] + THROAT / 2, hole[3] + THROAT / 2], [WELL.x, WELL.y], 'the well of the core, by default');
  const turned = calls.filter(([k]) => k === 'translate');
  assert.equal(turned.length, ARMS.length + 2, 'each of the arms, the funnel and the lip is turned about the centre');
  assert.ok(turned.every(([, x, y]) => x === WELL.x && y === WELL.y));
  const count = (name) => calls.filter(([k]) => k === name).length;
  assert.equal(count('save'), count('restore'), 'every turn is undone: the transform does not leak into the bunkers and the boss');
  assert.equal(count('save'), turned.length);
  const stream = all.filter((c) => bubbles().has(c[1]));
  assert.equal(stream.length, FLOW.length);
  for (const c of stream) {
    const [x, y] = centre(c);
    const r = Math.hypot(x - WELL.x, y - WELL.y);
    assert.ok(r >= LIP - 1 && r <= 233, `a bubble at ${r.toFixed(0)} px from the centre`);
    assert.ok(c.alpha <= 0.85 + 1e-9, 'bubbles are quiet: a bullet is louder');
  }
});

test('it follows world.well, which a world may move', () => {
  const well = { x: 700, y: 410 };
  const calls = draw(5, { world: { well } });
  const hole = images(calls).find((c) => c[1] === sprites.throat());
  assert.deepEqual([hole[2] + THROAT / 2, hole[3] + THROAT / 2], [700, 410]);
  assert.ok(calls.filter(([k]) => k === 'translate').every(([, x, y]) => x === 700 && y === 410));
});

test('a struggling frame rate gets half the bubbles', () => {
  const stream = (q) => images(draw(3.3, { quality: q })).filter((c) => bubbles().has(c[1])).length;
  assert.equal(stream(1), FLOW.length);
  assert.equal(stream(0.5), Math.ceil(FLOW.length / 2));
});

test('it moves: a later time draws the arms turned, the bubbles elsewhere; the same time draws the same frame', () => {
  const frame = (t) => JSON.stringify(draw(t));
  assert.notEqual(frame(1), frame(2.3));
  assert.equal(frame(7.7), frame(7.7), 'a pure function of t');
  const angles = (t) => draw(t).filter(([k]) => k === 'rotate').map(([, a]) => a);
  assert.equal(angles(1).length, ARMS.length + 2);
  const [a, b] = [angles(100), angles(100 + 1 / 60)];
  ARMS.forEach((arm, i) => assert.ok(Math.abs(b[i] - a[i] - arm.spin / 60) < 1e-9, `arm ${i} moves a tick's worth, with no jump`));
  b.slice(ARMS.length).forEach((v, i) => assert.ok(v - a[ARMS.length + i] > 0 && v - a[ARMS.length + i] < 0.05, 'the funnel and the lip turn clockwise, smoothly'));
  assert.ok(Math.min(...ARMS.map((x) => x.spin)) < 0 && Math.max(...ARMS.map((x) => x.spin)) > 0, 'some arm turns the other way');
  for (const t of [0, 3600 * 5, 1e6]) assert.ok(images(draw(t)).every((c) => c.slice(2, 6).every(Number.isFinite)), `finite at t = ${t}`);
});

test('on a boss level the whole maelstrom dims by wellLight, as world 8\'s black hole does, and the throat stays a hole', () => {
  const [plain, boss] = [images(draw(4.4)), images(draw(4.4, { world: { level: BOSS } }))];
  const k = wellLight(BOSS);
  assert.ok(k < 0.5);
  assert.equal(boss.length, plain.length);
  boss.forEach((c, i) => assert.ok(c.alpha <= plain[i].alpha + 1e-12, `image ${i} is no brighter`));
  const sum = (list) => list.reduce((s, c) => s + c.alpha, 0);
  assert.ok(sum(boss) < sum(plain) * 0.5, `${sum(boss).toFixed(2)} against ${sum(plain).toFixed(2)}`);
  for (let i = 0; i < ARMS.length; i++) {
    const arm = (list) => list.find((c) => c[1] === sprites.arm(i));
    assert.ok(Math.abs(arm(boss).alpha - arm(plain).alpha * k) < 1e-12, `arm ${i} dims by exactly wellLight`);
  }
  const hole = (list) => list.find((c) => c[1] === sprites.throat()).alpha;
  assert.ok(hole(boss) >= 0.6 && hole(boss) < hole(plain), 'the throat dims least: a hole that is gone would be a lie');
});

// A context that keeps the state a painter may change, with a real save and restore, and hands everything else to the sink.
const stateful = () => {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over', filter: 'none' };
  const stack = [];
  return new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
};

test('the maelstrom leaves the line caps and joins, widths, colours, alpha and blend mode as it found them, in every mode', () => {
  for (const over of [{}, { quality: 0.5 }, { world: { level: BOSS } }, { world: { well: { x: 300, y: 300 } } }]) {
    for (const t of [0, 3.3, 41.9]) {
      const ctx = stateful();
      const before = { ...ctx };
      near(ctx, env(t, over));
      assert.deepEqual({ ...ctx }, before, JSON.stringify(over) + ' at ' + t);
    }
  }
});

test('every sprite fits its canvas: no streak, bubble, glint or glow is cut off at an edge', () => {
  for (let i = 0; i < ARMS.length; i++) {
    const c = sprites.arm(i);
    const R = ARMS[i].R;
    assert.ok(inside(c), `arm ${i}: ${dims(c)}`);
    assert.deepEqual([c.width, c.height], [sprites.armSize(ARMS[i]), sprites.armSize(ARMS[i])]);
    const b = c.T.bounds;
    assert.ok(Math.abs((b.x0 + b.x1) / 2 - c.width / 2) < R * 0.35 && b.x1 - c.width / 2 > R * 0.6 && c.width / 2 - b.x0 > R * 0.6, `arm ${i} reaches out about its centre: ${dims(c)}`);
  }
  for (const [c, size] of [[sprites.throat(), THROAT], [sprites.funnel(), FUNNEL], [sprites.lipArc(), LIP_BOX], ...BUBBLE_COLORS.map((col) => [bubble(col), BUBBLE_BOX])]) {
    assert.ok(inside(c), dims(c));
    assert.deepEqual([c.width, c.height], [size, size]);
  }
  const hole = sprites.throat().T.bounds;
  assert.ok(Math.abs((hole.x0 + hole.x1) / 2 - THROAT / 2) < 1 && hole.x1 - THROAT / 2 >= LIP + 5, 'the throat is centred and holds the lip with room for its glow');
  const arcs = sprites.lipArc().T.bounds;
  assert.ok(arcs.x1 - LIP_BOX / 2 >= LIP && arcs.x1 - LIP_BOX / 2 <= LIP + 10, 'the comet arcs run on the lip');
  assert.ok(sprites.funnel().T.bounds.x1 - FUNNEL / 2 < LIP, 'the funnel lies inside the lip');
});

test("the maelstrom's files follow the sprite rules: under 200 lines, no shadow blur, dice or clock, no amber, cache keys of its own", () => {
  const dir = new URL('../../src/ui/', import.meta.url);
  const files = [...readdirSync(dir).filter((n) => /^(flourish-maelstrom.*|bubble-view|fx-view)\.js$/.test(n)).map((n) => new URL(n, dir)), new URL('../../src/fx/react-maelstrom.js', import.meta.url)];
  assert.ok(files.length >= 5, 'the pieces');
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const name = file.pathname.split('/').pop();
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
    if (name === 'fx-view.js') continue; // not the maelstrom's whole: only its size and its rules above
    assert.ok(!/#ff[89ab][0-9a-f]{3}\b/i.test(src), `${name} uses no amber: that is for bullets`);
    for (const [, key] of src.matchAll(/cached\('([^']+)'/g)) assert.ok(key.startsWith('deep'), `${name}: cache key ${key} starts with deep`);
  }
});
