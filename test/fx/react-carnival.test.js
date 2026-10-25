import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../../src/core/rng.js';
import { createFx, stepFx } from '../../src/fx/fx.js';
import { applyEvent, REACTS } from '../../src/fx/react.js';
import { MAX_PARTICLES } from '../../src/fx/particles.js';
import { BURST_R } from '../../src/core/damage.js';
import { HUES, burstColor, hueOf, BLOOM_LIFE } from '../../src/fx/react-carnival.js';
import w14 from '../../src/ui/looks/w14.js';
import { kindsOf, ofKind, react, run, TICK } from './fx-kit.js';

// The fireworks twist in Ember Carnival (react-carnival.js): each shell that goes off is a chrysanthemum of
// sparks in a colour picked from its role and its place in the chain, a flash, a puff of smoke and a rain of
// falling sparks.
const burst = (depth = 0, kind = 'grunt', x = 900, y = 400) => ({ type: 'burst', x, y, depth, kind });
const world = { level: { world: 14, twist: 'fireworks' }, ship: { x: 900, y: 900 } };

test('the core\'s burst event has a reaction', () => {
  assert.ok(REACTS.includes('burst'));
});

test('a burst opens a flower of the burst\'s reach in the shell\'s colour, with a thin shockwave, a white flash, a colour flash and sparks', () => {
  const fx = react(burst(0, 'diver'), world);
  const bloom = fx.rings.filter((r) => r.kind === 'bloom');
  assert.equal(bloom.length, 1);
  assert.equal(bloom[0].maxR, BURST_R, 'it opens to exactly the radius that hurts');
  assert.equal(bloom[0].color, w14.palette.alien.diver, 'a diver bursts in its own colour');
  assert.equal(bloom[0].max, BLOOM_LIFE);
  assert.equal(fx.rings.filter((r) => r.kind === 'ring').length, 1, 'and a shockwave');
  const [white, tint] = fx.flashes.filter((f) => f.tag === 'burst');
  assert.equal(white.color, '#ffffff');
  assert.equal(tint.color, bloom[0].color);
  assert.ok(white.life < tint.life, 'the white is a snap, the colour lingers');
  assert.ok(ofKind(fx, 'spark').length >= 20 && ofKind(fx, 'spark').every((p) => p.additive), 'additive sparks');
  assert.ok(ofKind(fx, 'ember').length >= 4, 'embers');
  assert.ok(ofKind(fx, 'smoke').length >= 2, 'a puff of smoke');
  assert.ok(fx.shake > 0);
});

test('the colour comes from the role and the depth alone: a shell\'s own at the start of a chain, one colour on for every link, all different', () => {
  for (const kind of ['grunt', 'diver', 'gunner', 'armored', 'carrier']) assert.equal(burstColor(kind, 0), w14.palette.alien[kind], `${kind} bursts in the colour it is painted`);
  assert.equal(new Set(['grunt', 'diver', 'gunner', 'armored', 'carrier'].map((k) => burstColor(k, 0))).size, 5);
  for (let d = 0; d < HUES.length; d++) assert.equal(burstColor('grunt', d), HUES[d][0]);
  assert.equal(new Set(HUES.map((h) => h[0])).size, HUES.length, 'six different colours');
  assert.equal(burstColor('grunt', HUES.length), burstColor('grunt', 0), 'and round again');
  assert.equal(burstColor('diver', 2), burstColor('gunner', 1), 'the same link of the same table');
  assert.equal(burstColor('nonsense', undefined), HUES[0][0], 'an unknown role or no depth is the first colour, not a crash');
  assert.notEqual(hueOf('grunt', 0)[1], hueOf('grunt', 0)[0], 'each has a paler tip');
  const colours = (e) => new Set(react(e, world).particles.filter((p) => p.kind === 'spark').map((p) => p.color));
  assert.ok(colours(burst(0, 'gunner')).has(HUES[2][0]) && colours(burst(0, 'gunner')).has(HUES[2][1]));
});

test('every link of a chain flashes harder and shakes the frame more, but throws fewer sparks', () => {
  const at = (d) => react(burst(d), world);
  const white = (fx) => fx.flashes.find((f) => f.tag === 'burst' && !f.full);
  for (let d = 0; d < 5; d++) {
    assert.ok(white(at(d + 1)).r > white(at(d)).r, `link ${d + 1} flashes wider`);
    assert.ok(white(at(d + 1)).alpha >= white(at(d)).alpha);
    assert.ok(at(d + 1).shake > at(d).shake);
    assert.ok(at(d + 1).particles.length < at(d).particles.length, `link ${d + 1} throws fewer`);
  }
  assert.equal(at(0).flashes.filter((f) => f.full).length, 0, 'the first burst does not light the frame');
  const deep = at(5).flashes.filter((f) => f.full);
  assert.equal(deep.length, 1);
  assert.ok(deep[0].alpha <= 0.1, 'and a deep one only faintly, so a chain never strobes');
  assert.equal(white(at(40)).r, white(at(6)).r, 'past six links it stops growing');
});

test('a long chain, a burst every 0.12 s, never passes the particle cap, and every burst keeps the flower of its own', () => {
  const fx = createFx();
  const rng = makeRng(3);
  let most = 0;
  for (let i = 0; i < 40; i++) {
    applyEvent(fx, burst(i, ['grunt', 'diver', 'gunner'][i % 3], 400 + i * 30, 300), rng, world);
    for (let k = 0; k < 7; k++) stepFx(fx, TICK);
    most = Math.max(most, fx.particles.length);
  }
  assert.ok(most <= MAX_PARTICLES, `${most} particles at the busiest`);
  assert.ok(most > 150, `and a real show: ${most}`);
  assert.ok(fx.rings.filter((r) => r.kind === 'bloom').length >= 6, 'the flowers overlap');
});

test('the sparks open to about the burst\'s reach, then fall; the embers drift down; the smoke rises; and all of it is gone in two and a half seconds', () => {
  const fx = react(burst(0), world, 5);
  const [x, y] = [900, 400];
  run(fx, 0.6);
  const far = Math.max(...ofKind(fx, 'spark').map((p) => Math.hypot(p.x - x, p.y - y)));
  assert.ok(far > BURST_R * 0.5 && far < BURST_R * 1.15, `the flower reaches ${far.toFixed(0)} px at 0.6 s`);
  const sparks = ofKind(fx, 'spark');
  assert.ok(sparks.every((p) => p.gravity > 0), 'every spark falls');
  assert.ok(Math.abs(sparks.reduce((s, p) => s + (p.x - x), 0)) < BURST_R * sparks.length * 0.35, 'and the flower is even');
  assert.ok(ofKind(fx, 'smoke').every((p) => p.gravity < 0), 'smoke rises');
  assert.ok(kindsOf(fx).has('ember'));
  run(fx, 1.9);
  assert.equal(fx.particles.length + fx.rings.length + fx.flashes.length, 0);
});

test('the same seed gives the same burst, another gives another, and density thins it', () => {
  assert.deepEqual(react(burst(1), world, 9).particles, react(burst(1), world, 9).particles);
  assert.notDeepEqual(react(burst(1), world, 9).particles, react(burst(1), world, 10).particles);
  const thin = createFx();
  thin.density = 0.5;
  applyEvent(thin, burst(0), makeRng(1), world);
  assert.ok(thin.particles.length < react(burst(0), world, 1).particles.length * 0.6);
});

test('a burst with no depth or role at all (a sample event) still bursts', () => {
  const fx = react({ type: 'burst', x: 100, y: 100 });
  assert.equal(fx.rings.filter((r) => r.kind === 'bloom').length, 1);
});
