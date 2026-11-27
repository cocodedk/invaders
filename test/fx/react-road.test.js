import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFx } from '../../src/fx/fx.js';
import { applyEvent } from '../../src/fx/react.js';
import { MAX_PARTICLES } from '../../src/fx/particles.js';
import { makeRng } from '../../src/core/rng.js';
import { WIDTH, HEIGHT } from '../../src/core/kinds.js';
import { ROAD_WORLD, GOLDS, VIOLETS, PAINTS, WOOD_PAINTS, GRAPHITE, GLOW, SEED, FLECKS, FLOOD, SMUDGE } from '../../src/fx/react-road.js';
import { ABILITY_CAPTIONS, CAPTION, openLeg } from '../../src/fx/react-story.js';
import { levelById } from '../../src/core/levels.js';
import { PAL, WANDER_WORLD } from '../../src/ui/wander-kit.js';
import { LINE_COLOUR } from '../../src/ui/course-line-view.js';
import { sampleEvent as sample } from '../event-sample.js';
import { react, ofKind, run } from './fx-kit.js';

// World 22's events as pencil and watercolour: soft opaque puffs and solid chips, never an additive flash or ring (a white blob on parchment).
const WORLD_22 = { level: { world: ROAD_WORLD }, ship: { x: 1100, y: 800 } };
const TYPES = ['checkpoint', 'seedBurst', 'chip', 'respawn', 'holdBreak'];
const plain = (fx) => fx.flashes.length + fx.rings.length === 0 && fx.particles.every((p) => !p.additive);
const within = (fx, x, y, r) => fx.particles.every((p) => Math.hypot(p.x - x, p.y - y) <= r);

test("the world's number and the colours are the renderer's (ui/wander-kit.js)", () => {
  assert.equal(ROAD_WORLD, WANDER_WORLD);
  assert.deepEqual(GOLDS, [PAL.gold, PAL.goldDeep, PAL.flame]);
  assert.deepEqual(VIOLETS, [PAL.violet, PAL.violetRim]);
  assert.deepEqual(PAINTS, [PAL.paint, PAL.river, PAL.field, PAL.leaf, PAL.leafLight, PAL.poppy, PAL.gold, PAL.teal]);
});

test("the smudge's graphite is the line's (ui/course-line-view.js)", () => {
  assert.equal(GRAPHITE, LINE_COLOUR);
});

test("the wood's paints are the wood's colours (ui/wander-kit.js)", () => {
  assert.deepEqual(WOOD_PAINTS, [PAL.canopy, PAL.canopyLight, PAL.bluebell, PAL.clearing, PAL.canopyEdge]);
});

// A session on a leg: openLeg learns the land, then the events are applied.
const onLeg = (id, ev, seed = 1) => {
  const fx = createFx();
  openLeg(fx, levelById(id));
  applyEvent(fx, ev, makeRng(seed), WORLD_22);
  return fx;
};

test("a seed burst and the flood throw the wood's paints on Leg 2 and the valley's on Leg 1, and never the other's", () => {
  for (const type of ['seedBurst', 'holdBreak']) {
    const wood = onLeg('w22-2', sample(type)).particles.filter((p) => p.kind !== 'popup');
    assert.ok(wood.length > 0 && wood.every((p) => WOOD_PAINTS.includes(p.color)), type);
    const valley = onLeg('w22-1', sample(type)).particles;
    assert.ok(valley.length > 0 && valley.every((p) => PAINTS.includes(p.color)), type);
  }
});

test('every event has an effect of plain, solid shapes, with or without a world, and none leaves a flash or a ring', () => {
  for (const type of TYPES) {
    for (const world of [undefined, WORLD_22]) {
      const fx = react(sample(type), world);
      assert.ok(fx.particles.length > 0, type);
      assert.ok(plain(fx), type);
    }
  }
});

test('a lit lantern lets gold puffs rise from it and gold chips jump, where it stands', () => {
  const fx = react({ ...sample('checkpoint'), x: 600, y: 900 });
  const puffs = ofKind(fx, 'smoke');
  assert.equal(puffs.length, GLOW.checkpoint);
  assert.equal(ofKind(fx, 'debris').length, GLOW.chips);
  assert.ok(puffs.every((p) => p.vy < 0 && GOLDS.includes(p.color)), 'warm and rising');
  assert.ok(ofKind(fx, 'debris').every((p) => GOLDS.includes(p.color)));
  assert.ok(puffs.every((p) => Math.hypot(p.x - 600, p.y - 900) <= GLOW.spread * Math.SQRT2));
});

test('the ability glows round the ship as well as telling its caption; with no world, or none to name, it does the half it can', () => {
  const ev = { type: 'ability', kind: 'seed' };
  const fx = react(ev, WORLD_22);
  assert.deepEqual(fx.popups.map((p) => p.text), [ABILITY_CAPTIONS.seed]);
  assert.equal(fx.popups[0].y, CAPTION.y);
  assert.equal(ofKind(fx, 'smoke').length, GLOW.ability);
  assert.ok(ofKind(fx, 'smoke').every((p) => Math.hypot(p.x - 1100, p.y - 800) <= GLOW.spread * Math.SQRT2));
  const bare = react(ev);
  assert.deepEqual([bare.popups.length, bare.particles.length], [1, 0]);
  const unnamed = react({ type: 'ability', kind: 'nothing' }, WORLD_22);
  assert.deepEqual([unnamed.popups.length, unnamed.particles.length], [0, GLOW.ability]);
});

test("a seed's burst puffs the paint's colours out over its radius, with chips of them", () => {
  const fx = react({ ...sample('seedBurst'), x: 900, y: 500, r: 120 });
  assert.equal(ofKind(fx, 'smoke').length, SEED.puffs);
  assert.equal(ofKind(fx, 'debris').length, SEED.chips);
  assert.ok(fx.particles.every((p) => PAINTS.includes(p.color)));
  assert.ok(ofKind(fx, 'smoke').every((p) => Math.hypot(p.x - 900, p.y - 500) <= 120 * Math.SQRT2));
  assert.ok(react({ type: 'seedBurst', x: 900, y: 500 }).particles.length > 0, 'a burst with no radius still pops');
});

test('a struck bullet loses a few violet flecks, a bullet broken in this world a burst of them; elsewhere a cut is as it was', () => {
  const struck = react(sample('chip'));
  assert.equal(struck.particles.length, FLECKS.chip);
  assert.ok(struck.particles.every((p) => VIOLETS.includes(p.color)));
  const cut = react(sample('cut'), WORLD_22);
  assert.equal(ofKind(cut, 'debris').length, FLECKS.cut);
  assert.equal(ofKind(cut, 'smoke').length, FLECKS.puffs);
  assert.ok(plain(cut) && cut.particles.every((p) => VIOLETS.includes(p.color)));
  for (const world of [undefined, { level: { world: 4 } }]) {
    const steel = react(sample('cut'), world);
    assert.ok(steel.flashes.length > 0 && steel.rings.length > 0, 'the steel cut: a flash and a ring');
    assert.equal(ofKind(steel, 'debris').length, 0);
  }
  assert.ok(ofKind(react(sample('cut'), { level: { world: 11 } }), 'shard').length > 0, "Aurora Kingdom's ice still shatters");
});

test('a respawn lets gold puffs rise where the ship is set down', () => {
  const fx = react({ ...sample('respawn'), x: 400, y: 900 });
  assert.equal(ofKind(fx, 'smoke').length, GLOW.respawn);
  assert.ok(fx.particles.every((p) => GOLDS.includes(p.color) && p.vy <= 0));
  assert.ok(within(fx, 400, 900, GLOW.spread * Math.SQRT2));
});

test('the gate falling floods the whole field with colour: puffs of every paint over all of it, swelling, with chips of colour', () => {
  const fx = react(sample('holdBreak'));
  const puffs = ofKind(fx, 'smoke');
  assert.equal(puffs.length, FLOOD.spots * FLOOD.puffs);
  assert.equal(ofKind(fx, 'debris').length, FLOOD.spots * FLOOD.chips);
  assert.ok(fx.particles.every((p) => PAINTS.includes(p.color)));
  assert.ok(new Set(puffs.map((p) => p.color)).size >= PAINTS.length / 2, 'many colours');
  const [xs, ys] = [puffs.map((p) => p.x), puffs.map((p) => p.y)];
  assert.ok(Math.max(...xs) - Math.min(...xs) > WIDTH * 0.6 && Math.max(...ys) - Math.min(...ys) > HEIGHT * 0.6, 'over the field');
  assert.ok(puffs.every((p) => p.grow > 0 && p.size >= FLOOD.size[0] - 1e-9));
  assert.ok(fx.particles.length <= MAX_PARTICLES / 4, 'the flood leaves most of the pool free');
  run(fx, FLOOD.life[1] + 0.1);
  assert.equal(fx.particles.length, 0, 'and it is gone again');
});

test('the quality scaler thins the flood, and a storm of these cannot pass the pool', () => {
  const full = react(sample('holdBreak')).particles.length;
  const fx = createFx();
  fx.density = 0.5;
  applyEvent(fx, sample('holdBreak'), makeRng(1));
  assert.ok(fx.particles.length < full * 0.7, `${fx.particles.length} vs ${full}`);
  const storm = createFx();
  const rng = makeRng(2);
  for (let i = 0; i < 100; i++) for (const type of TYPES) applyEvent(storm, sample(type), rng, WORLD_22);
  assert.equal(storm.particles.length, MAX_PARTICLES);
});

test('the same seed gives the same flood', () => {
  assert.deepEqual(react(sample('holdBreak'), undefined, 5).particles, react(sample('holdBreak'), undefined, 5).particles);
  assert.notDeepEqual(react(sample('holdBreak'), undefined, 5).particles, react(sample('holdBreak'), undefined, 6).particles);
});

test('a bullet the line stops leaves soft graphite puffs and two flecks at the spot, none rising, all gone in about two seconds', () => {
  const fx = react({ ...sample('lineStop'), x: 640, y: 420 });
  const [puffs, flecks] = [ofKind(fx, 'smoke'), ofKind(fx, 'debris')];
  assert.equal(puffs.length, SMUDGE.puffs);
  assert.equal(flecks.length, SMUDGE.chips);
  assert.ok(fx.particles.every((p) => p.color === GRAPHITE && p.vy >= 0 && !p.additive && Math.hypot(p.x - 640, p.y - 420) <= SMUDGE.spread * Math.SQRT2), 'graphite, level or falling, at x, y');
  assert.ok(plain(fx));
  run(fx, SMUDGE.life[1] + 0.1);
  assert.equal(fx.particles.length, 0);
  assert.ok(SMUDGE.life[1] >= 1.8 && SMUDGE.life[1] <= 2.2, 'about two seconds');
});
