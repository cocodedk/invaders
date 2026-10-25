import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeRng } from '../../src/core/rng.js';
import { WELL } from '../../src/core/kinds.js';
import { createFx, addRing, addFlash } from '../../src/fx/fx.js';
import { MAX_PARTICLES } from '../../src/fx/particles.js';
import {
  absorbFor, MAELSTROM_WORLD, BUBBLE_LIFE, POP_AT, LIP, END_R, START_MIN, BUBBLE_COLORS,
} from '../../src/fx/react-maelstrom.js';
import { run } from './fx-kit.js';

// What the maelstrom does to a bullet it swallows in Lantern Deep (react-maelstrom.js): a bubble that spirals down
// the throat and pops, one ring of kind 'bubble' and nothing else; every other world keeps the steel reaction it has.
// The ring is drawn by bubble-view.js (test/ui/bubble-view.test.js).
const world15 = { level: { world: 15, twist: 'gravity' }, well: { ...WELL } };
const ev = (x = 1100, y = 380) => ({ type: 'absorb', x, y });
const marker = (fx) => addFlash(fx, { x: 1, y: 2, tag: 'steel-marker' }); // what a steel handler might add

function swallow(world, e = ev(), seed = 1) {
  const fx = createFx();
  const calls = [];
  const rng = makeRng(seed);
  const steel = (...args) => { calls.push(args); marker(fx); addRing(fx, { x: 5, y: 6, kind: 'lens' }); };
  absorbFor(steel)(fx, e, rng, world);
  return { fx, calls, rng };
}

test('in world 15 a swallowed bullet is one bubble ring and nothing else, and the steel reaction is not called', () => {
  const { fx, calls } = swallow(world15);
  assert.equal(calls.length, 0);
  assert.equal(fx.rings.length, 1);
  assert.equal(fx.particles.length + fx.flashes.length + fx.popups.length + fx.slices.length, 0, 'no particles to count against the cap');
  assert.equal(fx.shake, 0);
  const r = fx.rings[0];
  assert.equal(r.kind, 'bubble');
  assert.equal(r.max, BUBBLE_LIFE);
  assert.equal(r.life, BUBBLE_LIFE);
  assert.ok(BUBBLE_LIFE >= 0.4 && BUBBLE_LIFE <= 0.7 && POP_AT > 0.6 && POP_AT < 0.9, 'a quick bubble with a pop at its end');
});

test('the ring carries where the bullet was, where the well is, and the way down: the angle and distance it starts at, the turns, the size, the colour and a seed', () => {
  const e = ev(1100, 380);
  const r = swallow(world15, e).fx.rings[0];
  assert.deepEqual([r.x, r.y], [1100, 380]);
  assert.deepEqual([r.wx, r.wy], [WELL.x, WELL.y]);
  assert.ok(Math.abs(r.a0 - Math.atan2(380 - WELL.y, 1100 - WELL.x)) < 1e-12);
  assert.ok(Math.abs(r.d0 - Math.hypot(1100 - WELL.x, 380 - WELL.y)) < 1e-9);
  assert.equal(r.r0, r.d0, 'the ring eases from where it starts');
  assert.equal(r.maxR, END_R, 'down to the bottom of the throat');
  assert.ok(r.turns >= 1.4 && r.turns <= 1.8, `${r.turns} turns`);
  assert.ok(r.size >= 11 && r.size <= 13, `${r.size} px`);
  assert.ok(BUBBLE_COLORS.slice(0, 3).includes(r.color) && !BUBBLE_COLORS.slice(3).includes(r.color), 'aqua or teal, never the violet of the whirl');
  assert.ok(Number.isInteger(r.seed) && r.seed >= 0);
  const moved = swallow({ level: { world: 15 }, well: { x: 500, y: 200 } }, ev(540, 230)).fx.rings[0];
  assert.deepEqual([moved.wx, moved.wy], [500, 200], 'the well the world holds, not the default');
  assert.ok(Math.abs(moved.d0 - 50) < 1e-9, 'its distance is from that well');
  const bare = swallow({ level: { world: 15 } }, ev(1100, 380)).fx.rings[0];
  assert.deepEqual([bare.wx, bare.wy], [WELL.x, WELL.y], 'a world with no well of its own: the core\'s');
});

test('every other world, and a call without a world or a level, gets the steel reaction exactly as it was', () => {
  for (const world of [{ level: { world: 8 } }, { level: { world: 14 } }, { level: { world: 1 } }, { level: { world: 16 } }, { level: {} }, {}, undefined, null]) {
    const { fx, calls, rng } = swallow(world);
    assert.equal(calls.length, 1, JSON.stringify(world));
    assert.equal(calls[0].length, 4);
    assert.equal(calls[0][0], fx);
    assert.deepEqual(calls[0][1], ev());
    assert.equal(calls[0][3], world, 'the world passed on as it came');
    assert.ok(fx.rings.every((r) => r.kind !== 'bubble') && fx.rings.length === 1, 'only what the steel handler added');
    assert.equal(fx.flashes.length, 1);
    assert.equal(rng(), makeRng(1)(), 'no random number spent on them');
  }
  for (let w = 1; w <= 14; w++) assert.equal(swallow({ level: { world: w } }).calls.length, 1, `world ${w}`);
  assert.equal(MAELSTROM_WORLD, 15);
});

test('the same bullet and the same rng make the same bubble; another rng makes another, in the whirl\'s colours', () => {
  assert.deepEqual(swallow(world15, ev(), 7).fx.rings, swallow(world15, ev(), 7).fx.rings);
  assert.notDeepEqual(swallow(world15, ev(), 7).fx.rings, swallow(world15, ev(), 8).fx.rings);
  const colours = new Set();
  const turns = [];
  for (let seed = 1; seed < 200; seed++) {
    const r = swallow(world15, ev(), seed).fx.rings[0];
    colours.add(r.color);
    turns.push(r.turns);
  }
  assert.equal(colours.size, 3);
  assert.ok(Math.max(...turns) - Math.min(...turns) > 0.3, 'the turns differ from bubble to bubble');
});

test('a bullet swallowed right at the lip, or at the well\'s very centre, still gets a way down and nothing is NaN', () => {
  for (const e of [ev(WELL.x, WELL.y), ev(WELL.x + 3, WELL.y - 4), ev(WELL.x + LIP - 1, WELL.y), ev(WELL.x - 39, WELL.y)]) {
    const r = swallow(world15, e).fx.rings[0];
    assert.ok(r.d0 >= START_MIN, `d0 ${r.d0}`);
    assert.ok([r.x, r.y, r.a0, r.d0, r.r0, r.turns, r.size].every(Number.isFinite));
  }
  assert.ok(START_MIN > LIP && LIP > 40, 'the lip lies just outside the 40 px at which the core swallows a bullet');
  assert.ok(END_R > 0 && END_R < 40);
});

test('the ring lives its life and goes, easing from where the bullet was to the bottom of the throat', () => {
  const { fx } = swallow(world15);
  const r = fx.rings[0];
  const d0 = r.d0;
  run(fx, 0.1);
  assert.ok(fx.rings.length === 1 && fx.rings[0].r < d0 && fx.rings[0].r > END_R, `r = ${fx.rings[0].r}`);
  run(fx, BUBBLE_LIFE - 0.1 - 0.05);
  assert.equal(fx.rings.length, 1);
  assert.ok(Math.abs(fx.rings[0].r - END_R) < 1.5, 'all but at the bottom');
  run(fx, 0.1);
  assert.equal(fx.rings.length, 0, 'gone');
});

test('a heavy volley adds no particles (the cap is not touched) and the ring list stays at its own cap', () => {
  const fx = createFx();
  const rng = makeRng(3);
  const react = absorbFor(() => assert.fail('steel in world 15'));
  for (let i = 0; i < 150; i++) react(fx, ev(900 + (i % 30) * 6, 330 + (i % 7) * 9), rng, world15);
  assert.equal(fx.particles.length, 0);
  assert.ok(fx.particles.length <= MAX_PARTICLES);
  assert.equal(fx.rings.length, 64, 'ONE ring each, the oldest dropped past the list\'s cap');
});

test('the reaction changes nothing it is handed and stays pure: no window, no document, no dice, no clock', () => {
  const world = { level: { world: 15, twist: 'gravity' }, well: { ...WELL }, ship: { x: 1, y: 2 } };
  const e = ev();
  const [w0, e0] = [JSON.stringify(world), JSON.stringify(e)];
  swallow(world, e);
  assert.equal(JSON.stringify(world), w0);
  assert.equal(JSON.stringify(e), e0);
  const src = readFileSync(new URL('../../src/fx/react-maelstrom.js', import.meta.url), 'utf8');
  assert.ok(src.split('\n').length < 200);
  assert.ok(!/window|document|Math\.random|Date\.now/.test(src.replace(/\/\/.*$/gm, '')));
});
