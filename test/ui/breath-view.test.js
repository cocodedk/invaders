import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installCanvas } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// The breath of world 17, drawn (breath-view.js with its sprites: breath-sprites.js, breath-craft*.js, breath-leaf.js,
// breath-air.js, breath-flow.js): the band of air and its craft at any height of the front, nothing without a front or
// without the healing city, the wake's veil fading after the front is spent, and the sprites lying inside their canvases.
// The fx side is test/fx/react-breath.test.js; the state a painter must give back is line-cap-breath.test.js.
installCanvas(64);
const made = [];
const stand = document.createElement;
document.createElement = (...a) => {
  const T = tracker();
  const c = { ...stand(...a), getContext: () => T.ctx, T };
  made.push(c);
  return c;
};
const { drawBreath, drawBreathWake, envelope, WAKE_FADE } = await import('../../src/ui/breath-view.js');
const { breathKit, warmBreathFx } = await import('../../src/ui/breath-sprites.js');
const { drawLeaf, drawTwinkle } = await import('../../src/ui/breath-fx-view.js');
const { CRAFT_W, CRAFT_H, ORIGIN } = await import('../../src/ui/breath-craft.js');
const { warmBreath } = await import('../../src/ui/warm-breath.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { BREATH_TIME } = await import('../../src/core/twists-3.js');

const FILES = ['breath-view.js', 'breath-sprites.js', 'breath-craft.js', 'breath-craft-parts.js', 'breath-leaf.js', 'breath-air.js', 'breath-flow.js', 'breath-fx-view.js', 'aliens/sheet-breath.js'];
const riseAt = (front) => ((1080 - front) / (1080 - 96)) * BREATH_TIME; // the rise (s) that puts the front at this height
const world = (front) => ({ twist: { rise: front === null ? null : riseAt(front) } });
const view = (extra = {}) => ({ heal: { h: 0 }, cache: {}, quality: { level: 1 }, ...extra });
const frame = (v, front, t = 14.4) => {
  const T = tracker();
  drawBreath(T.ctx, v, world(front), t);
  return T;
};
const craftCalls = (T) => T.calls.filter((c) => c.img === breathKit().body[0] || c.img === breathKit().body[1]);

test('warming bakes every sprite, they lie inside their canvases, and drawing a frame bakes nothing more', () => {
  const before = made.length;
  warmBreathFx();
  const baked = made.slice(before);
  assert.ok(baked.length >= 12 + 4 + 4 + 2, `${baked.length} canvases`);
  for (const c of baked.filter((x) => x.width < 400 && x.width !== 64)) { // leaves, craft (two frames of body and light), twinkles (not sprites.js's 64 px glows); the four tiles run to their edges on purpose
    const b = c.T.bounds;
    assert.ok(b.x0 >= 2 && b.y0 >= 2 && b.x1 <= c.width - 2 && b.y1 <= c.height - 2, `${c.width}x${c.height}: ${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
  }
  assert.equal(baked.filter((x) => x.width === 40).length, 12, 'twelve leaves: four shapes in three greens');
  const k = breathKit();
  assert.ok(k.body[0] !== k.body[1] && k.lights[0] !== k.lights[1] && k.twinkles[0] !== k.twinkles[1]);
  warmBreath(LOOKS[16]); // the level's warm-up (which bakes the backdrop's own sprites too) calls it
  const warmed = made.length;
  warmBreath(LOOKS[0]); // another world's look bakes nothing
  assert.equal(made.length, warmed);
  for (const front of [1000, 700, 400, 150]) frame(view(), front);
  drawBreathWake(tracker().ctx, view(), world(500), 1);
  drawLeaf(tracker().ctx, { x: 5, y: 5, size: 12, shape: 3, vx: 10, life: 0.5, max: 1 });
  drawTwinkle(tracker().ctx, { x: 5, y: 5, size: 12, shape: 1, life: 0.5, max: 1 });
  assert.equal(made.length, warmed, 'drawing baked nothing');
  warmBreathFx();
  assert.equal(made.length, warmed, 'and warming twice is free');
});

test('the front draws nothing without the healing city or without a front, and something at every height between', () => {
  assert.equal(frame({ ...view(), heal: null }, 600).calls.length, 0, 'every other world');
  assert.equal(frame(view(), null).calls.length, 0, 'no breath rising');
  assert.equal(frame(view(), 1080).calls.length, 0, 'invisible the instant it starts');
  assert.equal(frame(view(), 96).calls.length, 0, 'and when it is spent');
  for (const front of [1050, 1000, 800, 600, 400, 250, 150, 110]) {
    const T = frame(view(), front);
    assert.ok(T.calls.length >= 30 && T.calls.length <= 60, `front ${front}: ${T.calls.length} images`);
  }
});

test('nine craft in a bowed line, 212 px apart, the middle ones ahead, each 64-72 px across, with a light layer on top of each', () => {
  const T = frame(view(), 600);
  const bodies = craftCalls(T);
  assert.equal(bodies.length, 9);
  const lights = T.calls.filter((c) => c.img === breathKit().lights[0] || c.img === breathKit().lights[1]);
  assert.equal(lights.length, 9);
  assert.ok(lights.every((c) => c.comp === 'lighter') && bodies.every((c) => c.comp === 'source-over'), 'lights are additive');
  const centres = bodies.map((c) => [(c.box[0] + c.box[2]) / 2, c.box[1] + ((c.box[3] - c.box[1]) * ORIGIN[1]) / CRAFT_H]);
  centres.forEach(([x], i) => assert.ok(Math.abs(x - (110 + 212 * i)) <= 5, `craft ${i} at ${x}`));
  const wing = (c) => (c.box[2] - c.box[0]) * (68 / CRAFT_W);
  for (const c of bodies) assert.ok(wing(c) >= 63 && wing(c) <= 73, `${wing(c)} px across`);
  const ys = centres.map(([, y]) => y);
  assert.ok(ys[4] < ys[0] - 15 && ys[4] < ys[8] - 15 && ys[4] < ys[2] && ys[4] < ys[6], 'the middle one leads');
  assert.ok(ys.every((y) => y < 600 - 10 && y > 600 - 100), 'ahead of the edge, close to it');
  assert.ok(bodies.every((c) => c.alpha === 1));
});

test('the air spans the field and hangs from the edge down about 350 px', () => {
  const T = frame(view(), 600);
  const k = breathKit();
  const air = T.calls.filter((c) => c.img === k.air);
  assert.ok(air.length >= 2);
  assert.ok(Math.min(...air.map((c) => c.box[0])) <= 0 && Math.max(...air.map((c) => c.box[2])) >= 1920, 'the whole width');
  assert.ok(air.every((c) => c.alpha > 0.6 && c.alpha <= 1), 'drawn at the front\'s own strength (the sprite itself is half see-through)');
  assert.ok(air.every((c) => c.box[1] < 600 && c.box[3] > 600 + 300), 'from the edge down about 350 px');
  const edge = T.calls.filter((c) => c.img === k.light);
  assert.ok(edge.length >= 2 && edge.every((c) => c.comp === 'lighter'));
  assert.ok(T.calls.some((c) => c.img === k.flow), 'wind streaks');
  const leaves = T.calls.filter((c) => k.leaves.includes(c.img));
  assert.ok(leaves.length >= 12 && leaves.every((c) => c.args[2] >= 20 && c.args[2] <= 36 && c.args[2] === c.args[3]), 'leaves 18-34 px of blade in a 20-36 px sprite');
  assert.ok(T.calls.filter((c) => k.twinkles.includes(c.img)).every((c) => c.comp === 'lighter'));
  const thin = frame(view({ heal: { h: 1 } }), 600).calls.filter((c) => c.img === k.air);
  assert.ok(thin[0].alpha < air[0].alpha, 'thinner against a bright sky');
});

test('it fades in over the first 120 px of the rise and out over the last 150', () => {
  assert.equal(envelope(1080), 0);
  assert.equal(envelope(96), 0);
  assert.equal(envelope(600), 1);
  assert.ok(envelope(1020) > 0 && envelope(1020) < 1 && envelope(200) > 0 && envelope(200) < 1);
  assert.ok(envelope(1000) < envelope(980) && envelope(980) < envelope(940) && envelope(130) < envelope(200));
  assert.equal(envelope(960), 1);
  assert.equal(envelope(246), 1);
  const a = (front) => frame(view(), front).calls.find((c) => c.img === breathKit().air).alpha;
  assert.ok(a(1050) < a(900) && a(130) < a(500));
});

test('half quality draws fewer images: no wind streaks, every other leaf and twinkle', () => {
  const full = frame(view(), 600).calls.length;
  const half = frame(view({ quality: { level: 0.5 } }), 600).calls.length;
  assert.ok(half <= full - 14, `${half} against ${full}`);
  assert.equal(craftCalls(frame(view({ quality: { level: 0.5 } }), 600)).length, 9, 'the craft are always all there');
});

test('a frame is a pure function of the front and the time: the same twice, different a moment later, no memory', () => {
  const shape = (T) => T.calls.map((c) => [c.args.map((x) => Math.round(x * 100)), c.alpha, c.comp]);
  assert.deepEqual(shape(frame(view(), 500, 3)), shape(frame(view(), 500, 3)));
  assert.notDeepEqual(shape(frame(view(), 500, 3)), shape(frame(view(), 500, 3.1)));
  assert.notDeepEqual(shape(frame(view(), 500, 3)), shape(frame(view(), 450, 3)));
  const v = view();
  frame(v, 500);
  assert.deepEqual(Object.keys(v.cache), [], 'drawBreath keeps nothing');
});

test("the wake's veil follows the front, fades out in WAKE_FADE seconds once it is spent and is each view's own", () => {
  const veil = (v, front, t) => {
    const T = tracker();
    drawBreathWake(T.ctx, v, world(front), t);
    return T.calls;
  };
  const v = view();
  assert.equal(veil(v, null, 1).length, 0, 'nothing before a breath');
  assert.equal(veil({ ...v, heal: null }, 600, 1).length, 0, 'nothing in other worlds');
  const [c] = veil(v, 600, 1.1);
  assert.equal(c.img, breathKit().wake);
  assert.deepEqual([c.args[0], c.args[1], c.args[2]], [0, 600, 1920], 'full width, from the front down');
  assert.ok(c.box[3] - c.box[1] >= 580 && c.box[3] - c.box[1] <= 640, 'about 600 px');
  assert.ok(c.alpha > 0.9, `full veil: ${c.alpha}`);
  const at = (t) => veil(v, null, t)[0]; // frames of the game: a tenth of a second at most between them
  let t = 1.1;
  const spent = (t += 0.05, at(t));
  assert.ok(spent && spent.args[1] === 600 && spent.alpha < c.alpha, 'it lingers where the front stopped, fainter');
  while (t < 1.1 + WAKE_FADE / 2) at((t += 0.05));
  const half = at(t);
  assert.ok(half && half.alpha < spent.alpha && half.alpha > 0.05, `half way: ${half?.alpha}`);
  while (t < 1.1 + WAKE_FADE + 0.1) at((t += 0.05));
  assert.equal(at(t), undefined, 'closed again');
  assert.equal(veil(view(), null, 5).length, 0, 'another view knows nothing of it');
  assert.equal(veil(v, 700, t + 0.05).length, 1, 'and the next breath opens it again');
  const early = tracker();
  drawBreathWake(early.ctx, view(), world(1060), 2);
  assert.ok(early.calls[0].alpha < 0.5, 'it opens as the front leaves the foot');
});

test('nothing in the hot paths allocates and nothing reads the clock, randomness or a shadow', () => {
  const text = readFileSync(new URL('../../src/ui/breath-view.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  const hot = text.slice(text.indexOf('function leaves'));
  assert.ok(!/Array\.from|\.map\(|\.filter\(|\.forEach\(|=>|\bnew\b|\.slice\(/.test(hot), 'no closures, arrays or objects built per frame');
  for (const f of FILES) {
    const src = readFileSync(new URL(`../../src/ui/${f}`, import.meta.url), 'utf8');
    assert.ok(src.split('\n').length < 200, `${f} is under 200 lines`);
    assert.ok(!/Math\s*\.\s*random|Date\s*\.\s*now|shadowBlur/.test(src.replace(/\/\/.*$/gm, '')), f);
    assert.ok(/^\/\/ /.test(src), `${f} starts with its comment`);
  }
});

test("the breath's fx draw from what was warmed: a launch and a wiped bullet bake nothing during the fight", async () => {
  const { drawFx } = await import('../../src/ui/fx-view.js');
  const { createFx, stepFx } = await import('../../src/fx/fx.js');
  const { applyEvents } = await import('../../src/fx/react.js');
  const { makeRng } = await import('../../src/core/rng.js');
  warmBreathFx();
  const warmed = made.length;
  const fx = createFx();
  applyEvents(fx, [{ type: 'breath', y0: 1080, y1: 96, dur: 0.8 }, ...Array.from({ length: 12 }, (_, i) => ({ type: 'cleanse', x: 100 + i * 150, y: 600 }))], makeRng(4), undefined);
  for (let i = 0; i < 20; i++) {
    const T = tracker();
    drawFx(T.ctx, fx);
    assert.ok(T.calls.length > 0 || i > 15);
    stepFx(fx, 1 / 60);
  }
  assert.equal(made.length, warmed, 'every glow, leaf and star was baked ahead');
});
