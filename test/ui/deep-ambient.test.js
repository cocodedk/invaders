import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// Lantern Deep's ambient under stand-in canvases (deep-flourish.test.js has the flourishes): marine snow sinking,
// minnows turning at their edges, ring bubbles rising. All of it stays dimmer than the entry's own alpha, and no
// bubble is a filled bright dot (a backdrop bubble must never be taken for a pearl or a bullet).
installCanvas(64);
const made = [];
const stand = document.createElement;
document.createElement = (...a) => {
  const T = tracker();
  const c = { ...stand(...a), getContext: () => T.ctx, T };
  made.push(c);
  return c;
};
const { look } = await import('./deep-kit.js');
const { drawAmbient } = await import('../../src/ui/ambient.js');
const { AMBIENT7, bubble, warmDeepAmbient } = await import('../../src/ui/ambient-7.js');

const entries = look.ambient;
const [snow, minnows, bubbles] = ['marinesnow', 'minnows', 'deepbubbles'].map((k) => entries.filter((a) => a.kind === k));
const frame = (a, t) => {
  const T = tracker();
  drawAmbient(T.ctx, { ...look, ambient: [a] }, a.phase, { t, drift: 0, wind: 0, world: {} });
  return T.calls;
};
const mid = (c) => (c.box[1] + c.box[3]) / 2;

test('warming bakes the sprites of every entry, so drawing them afterwards bakes nothing', () => {
  warmDeepAmbient(look);
  const warmed = made.length;
  assert.ok(warmed >= 6, `${warmed} sprites baked ahead of the fight`);
  for (let t = 0; t < 120; t += 7.3) for (const a of entries) frame(a, t);
  assert.equal(made.length, warmed);
});

test('the registry draws the three kinds: marine snow in three phases, minnows in one, bubbles in two', () => {
  assert.deepEqual([snow.length, minnows.length, bubbles.length], [3, 1, 2]);
  for (const a of entries) {
    assert.equal(typeof AMBIENT7[a.kind], 'function');
    const calls = frame(a, 9);
    assert.ok(calls.length >= Math.floor(a.n / 2) && calls.length <= a.n && a.n <= 60, `${a.kind} ${a.phase}: ${calls.length} of ${a.n}`);
    assert.ok(calls.every((c) => c.alpha <= a.alpha + 1e-9 && c.comp === 'source-over'), `${a.kind} stays at or under its alpha`);
    assert.notDeepEqual(calls.map((c) => c.box), frame(a, 10).map((c) => c.box), `${a.kind} moves`);
    assert.deepEqual(calls.map((c) => c.box), frame(a, 9).map((c) => c.box), 'the same frame twice');
  }
});

test('flecks sink, twinkle and fade out at the frame edges; the size is the entry\'s', () => {
  const a = snow[0];
  const [f0, f1] = [frame(a, 20), frame(a, 21)];
  const sank = f0.filter((c, i) => mid(f1[i]) > mid(c)).length;
  assert.ok(sank >= f0.length * 0.9, `${sank} of ${f0.length} sank`);
  const alphas = [];
  for (let t = 0; t < 60; t += 0.7) frame(a, t).forEach((c) => alphas.push(c.alpha));
  assert.ok(alphas.some((x) => x < a.alpha * 0.1) && alphas.some((x) => x > a.alpha * 0.8), 'faint at the edge, near full at best');
  assert.ok(f0.every((c) => c.box[2] - c.box[0] <= a.size[1] * 2.4 + 1e-6 && c.box[2] - c.box[0] >= a.size[0] * 2.4 - 1e-6));
});

test('minnows stay in the upper water, are dim, and turn: each group swims both ways, narrowing to a sliver as it turns', () => {
  const a = minnows[0];
  const signs = new Set();
  let thin = 0;
  for (let t = 0; t < 700; t += 1.1) {
    frame(a, t).forEach((c) => assert.ok(c.box[3] < 1080 * a.maxY + 40 && c.box[1] > 0, `at y ${c.box[1]}..${c.box[3]}`));
    const r = recorder();
    drawAmbient(r.ctx, { ...look, ambient: [a] }, a.phase, { t, drift: 0, wind: 0, world: {} });
    r.calls.filter(([k]) => k === 'scale').forEach((c) => {
      signs.add(Math.sign(c[1]));
      if (Math.abs(c[1]) < a.size[1] / 14 * 0.8) thin++;
    });
  }
  assert.deepEqual(signs, new Set([-1, 1]), 'both ways');
  assert.ok(thin > 0, 'a turn is a narrowing, not a flip');
});

test('bubbles rise, wobble, swell, and fade out at the top; they are rings, never filled dots', () => {
  for (const a of bubbles) {
    const [f0, f1] = [frame(a, 30), frame(a, 31)];
    assert.ok(f0.filter((c, i) => mid(f1[i]) < mid(c)).length >= f0.length * 0.9, 'rising');
    assert.ok(f0.some((c, i) => Math.abs((f1[i].box[0] + f1[i].box[2]) / 2 - (c.box[0] + c.box[2]) / 2) > 0.2), 'wobbling sideways');
    const widths = [];
    const alphas = [];
    for (let t = 0; t < 90; t += 1.3) frame(a, t).forEach((c) => { widths.push(c.box[2] - c.box[0]); alphas.push([mid(c), c.alpha]); });
    assert.ok(Math.min(...widths) >= (a.size[0] * 40) / 34 - 1e-6 && Math.max(...widths) <= (a.size[1] * 1.35 * 40) / 34 + 1e-6, 'from the entry\'s smallest to its largest, swelling by a third at most');
    assert.ok(alphas.filter(([y]) => y < 60).every(([, x]) => x < a.alpha * 0.4), 'gone over the top');
    assert.ok(alphas.some(([y, x]) => y > 300 && x === a.alpha), 'full strength lower down');
  }
});

const parse = (s) => /rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)/.exec(s)?.slice(1).map(Number) ?? null;
const amber = ([r, g, b]) => r > 180 && g > 90 && g < 200 && b < 100 && r - b > 110;
const pearl = ([r, g, b]) => r > 225 && g > 195 && b > 215 && r > g;

test('the bubble sprite is a rim, a glint and a clear body: no amber, no pearl-white, no filled dot, nothing but a gradient or a faint tint filled', () => {
  const log = [];
  const state = {};
  const spy = new Proxy(state, {
    get: (o, k) => (k in o ? o[k] : (...a) => { log.push([k, a, o.fillStyle, o.strokeStyle]); return sink; }),
    set: (o, k, v) => ((o[k] = v), true),
  });
  document.createElement = () => ({ width: 64, height: 64, getContext: () => spy });
  bubble('#a0f4ff'); // a colour no entry uses, so it is painted now, into the spy
  document.createElement = (...a) => ({ ...stand(...a), getContext: () => tracker().ctx });
  const fills = log.filter(([k]) => k === 'fill');
  assert.ok(fills.length >= 1 && log.filter(([k]) => k === 'stroke').length >= 2, 'a body and a rim and a glint');
  log.forEach(([k, , fill, stroke], i) => {
    if (k !== 'fill' && k !== 'stroke') return;
    const style = k === 'fill' ? fill : stroke;
    if (typeof style !== 'string') return; // a gradient
    const c = parse(style);
    assert.ok(c && !amber(c) && !pearl(c), `${k} ${style}`);
    if (k === 'fill') assert.ok((c[3] ?? 1) <= 0.35, `a filled ${style} would be a dot`);
  });
  const arcs = log.filter(([k]) => k === 'arc').map(([, a]) => a[2]);
  assert.ok(arcs.every((r) => r >= 8), `no small arc to fill: ${arcs}`);
  assert.ok(fills.every(([, , style]) => typeof style !== 'string'), 'the body is a gradient that is clear in the middle');
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

test("the deep's ambient leaves the line caps and joins, widths, colours, alpha and blend mode as it found them", () => {
  for (const a of entries) {
    const ctx = stateful();
    const before = { ...ctx };
    AMBIENT7[a.kind](ctx, a, 12, 40);
    assert.deepEqual({ ...ctx }, before, `${a.kind} ${a.phase}`);
  }
});
