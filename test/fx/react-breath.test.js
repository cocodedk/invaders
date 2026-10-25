import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeRng } from '../../src/core/rng.js';
import { createFx, stepFx } from '../../src/fx/fx.js';
import { applyEvents, REACTS } from '../../src/fx/react.js';
import { MAX_PARTICLES } from '../../src/fx/particles.js';
import { BREATH, BURST, RATE } from '../../src/fx/react-breath.js';
import { react, run, TICK } from './fx-kit.js';

// The breath of world 17 as fx (react-breath.js): the craft's launch along the foot of the field and a bullet wiped (the
// core's events 'breath' and 'cleanse', core/twists-3.js). The front itself is drawn by test/ui/breath-view.test.js; the leaf
// and twinkle particle kinds are drawn by ui/breath-fx-view.js (also covered there).
const launch = { type: 'breath', y0: 1080, y1: 96, dur: 0.8 };
const wipe = (x = 600, y = 500) => ({ type: 'cleanse', x, y });
const glass = { level: { world: 16, twist: 'reassemble' }, ship: { x: 700, y: 900, power: null }, aliens: [] };
const COOL = ['#ffffff', '#cffff0', '#8fd8ff', '#e8fff4', '#d6f4ff'];

test('the two events have reactions, and nothing else changed: the breath adds only its own two', () => {
  assert.deepEqual(Object.keys(BREATH).sort(), ['breath', 'cleanse']);
  for (const type of ['breath', 'cleanse', 'fire', 'kill', 'wreck', 'power']) assert.ok(REACTS.includes(type), type);
});

test('the breath starting blooms along the foot of the field and sends up leaves and sparkles, at most 24 particles', () => {
  const fx = react(launch);
  assert.equal(fx.flashes.length, 5, 'five wide flashes side by side');
  assert.ok(fx.flashes.every((f) => f.y > 980 && f.y <= 1080 && f.r >= 150 && f.life < 0.4 && f.alpha <= 0.6), 'low, wide, brief and not blinding');
  assert.ok(new Set(fx.flashes.map((f) => f.x)).size === 5);
  assert.equal(fx.rings.length + fx.popups.length + fx.slices.length, 0, 'nothing that could hide a bullet');
  assert.ok(fx.particles.length >= 8 && fx.particles.length <= 24, `${fx.particles.length} particles`);
  const kinds = new Set(fx.particles.map((p) => p.kind));
  assert.deepEqual([...kinds].sort(), ['leaf', 'twinkle']);
  for (const p of fx.particles.filter((q) => q.kind === 'leaf')) assert.ok(p.vy < -200 && Number.isInteger(p.shape) && p.shape >= 0 && p.shape < 12 && !p.additive, 'leaves climb');
  assert.ok(fx.particles.filter((q) => q.kind === 'twinkle').every((p) => p.additive && (p.shape === 0 || p.shape === 1)));
  assert.ok(fx.particles.every((p) => p.y > 900), 'they start at the foot');
  const half = createFx();
  half.density = 0.5;
  applyEvents(half, [launch], makeRng(1), undefined);
  assert.ok(half.particles.length <= fx.particles.length * 0.6, 'the quality scaler thins them');
  run(fx, 1.6);
  assert.deepEqual([fx.particles.length, fx.flashes.length], [0, 0], 'all gone in under two seconds');
});

test('a wiped bullet is a small white-mint flash, a twinkle and two cool sparks where it was', () => {
  const fx = react(wipe(600, 500));
  assert.equal(fx.flashes.length, 1);
  const [f] = fx.flashes;
  assert.deepEqual([f.x, f.y, f.tag], [600, 500, 'cleanse']);
  assert.ok(f.r >= 14 && f.r <= 20 && f.life >= 0.1 && f.life <= 0.14, `r ${f.r}, life ${f.life}`);
  assert.ok(COOL.includes(f.color));
  const kinds = fx.particles.map((p) => p.kind).sort();
  assert.deepEqual(kinds, ['spark', 'spark', 'twinkle']);
  assert.ok(fx.particles.every((p) => p.additive && COOL.includes(p.color) && p.x === 600 && p.y === 500), 'all cool and additive, none magenta');
  assert.ok(fx.particles.filter((p) => p.kind === 'spark').every((p) => p.gravity < 0), 'sparks drift up like air');
  const lo = createFx();
  lo.density = 0.5;
  applyEvents(lo, [wipe()], makeRng(1), undefined);
  assert.ok(lo.particles.length < fx.particles.length, 'thinned with density');
  run(fx, 0.8);
  assert.deepEqual([fx.particles.length, fx.flashes.length], [0, 0]);
});

test('200 wiped bullets in one tick sparkle only the budget, and the pools never fill', () => {
  const fx = createFx();
  applyEvents(fx, Array.from({ length: 200 }, (_, i) => wipe(40 + i * 9, 300 + (i % 7))), makeRng(3), undefined);
  assert.equal(fx.flashes.length, BURST, `${fx.flashes.length} flashes`);
  assert.ok(fx.particles.length <= BURST * 3 && fx.particles.length <= MAX_PARTICLES);
});

test("a long sweep sparkles evenly, at the budget's pace, and stays far inside the particle pool", () => {
  const fx = createFx();
  const rng = makeRng(8);
  let sparkles = 0;
  let peak = 0;
  for (let i = 0; i < 48; i++) { // a breath: 0.8 s, 6 bullets wiped a tick, 288 in all
    const before = fx.flashes.length;
    applyEvents(fx, Array.from({ length: 6 }, (_, k) => wipe(100 + k * 300, 900 - i * 16)), rng, undefined);
    sparkles += fx.flashes.length - before;
    stepFx(fx, TICK);
    peak = Math.max(peak, fx.particles.length);
  }
  assert.ok(sparkles >= BURST + RATE * 0.8 - 8 && sparkles <= BURST + RATE * 0.8 + 2, `${sparkles} sparkles of 288`);
  assert.ok(peak < 250 && fx.flashes.length <= 64, `peak ${peak}`);
  assert.ok(fx.breathBudget.n <= BURST && fx.breathBudget.n >= 0);
});

test('the budget refills with time: after a pause a flood sparkles again', () => {
  const fx = createFx();
  const rng = makeRng(2);
  const flood = () => applyEvents(fx, Array.from({ length: 50 }, (_, i) => wipe(50 + i * 30, 400)), rng, undefined);
  flood();
  const first = fx.flashes.length;
  run(fx, 0.3);
  assert.equal(fx.flashes.length, 0, 'the flashes are over');
  flood();
  assert.equal(fx.flashes.length, first, 'a full budget again');
});

test('the same seed gives the same sparkle; a world 16 shot is exactly what it was and leaves the budget full', () => {
  assert.deepEqual(react(wipe(), undefined, 7).particles, react(wipe(), undefined, 7).particles);
  assert.notDeepEqual(react(wipe(), undefined, 7).particles, react(wipe(), undefined, 8).particles);
  const fire = { type: 'fire', side: 'ship', x: 700, y: 878, power: null };
  const fx = react(fire, glass);
  assert.deepEqual(fx.breathBudget, { n: BURST, t: 0 });
  assert.ok(!fx.particles.some((p) => p.kind === 'leaf' || p.kind === 'twinkle') && fx.flashes.every((f) => f.tag !== 'cleanse' && f.tag !== 'breath'));
  assert.deepEqual(react(fire, glass).particles, fx.particles, 'and the same every time');
});

test('the breath files stay pure and short: no Math.random, Date.now or shadowBlur, under 200 lines', () => {
  const root = new URL('../../src/', import.meta.url);
  for (const f of ['fx/react-breath.js', 'ui/breath-fx-view.js']) {
    const text = readFileSync(new URL(f, root), 'utf8');
    assert.ok(text.split('\n').length < 200, f);
    assert.ok(!/Math\s*\.\s*random|Date\s*\.\s*now|shadowBlur/.test(text.replace(/\/\/.*$/gm, '')), f);
  }
});
