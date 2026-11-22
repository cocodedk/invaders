import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../../src/core/rng.js';
import { stepShip } from '../../src/core/ship.js';
import { createWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';
import { createFx } from '../../src/fx/fx.js';
import { MAX_PARTICLES } from '../../src/fx/particles.js';
import { applyEvent } from '../../src/fx/react.js';
import {
  BIG_CHIP_SIZE, BIG_CHIPS, BIG_GROUND, BIG_PUFFS, BIG_SHAKE, CHIP_SIZE, CHIPS, GROUND_GREYS, HIT_CHIPS,
} from '../../src/fx/react-ground.js';
import { PAL } from '../../src/ui/wander-kit.js';
import { TICK, kindsOf, ofKind, react, run } from './fx-kit.js';

// The events as the core emits them: a kind and a place, nothing else (course-ground.js hurtGround).
const kill = (kind) => ({ type: 'groundKill', kind, x: 900, y: 400 });
const hit = (kind) => ({ type: 'groundHit', kind, x: 900, y: 400 });
const KINDS = ['stone', 'turret', 'crate', 'pillar', 'gate'];
const SMALL = KINDS.filter((k) => !BIG_GROUND.includes(k));
const [lo, hi] = [Math.min(...CHIP_SIZE), Math.max(...BIG_CHIP_SIZE)];

test('a broken ground thing blasts: a flash and a ring where it stood, smoke, and grey chips flying apart', () => {
  for (const kind of KINDS) {
    const fx = react(kill(kind));
    assert.ok(fx.flashes.length >= 1 && fx.rings.length >= 1, kind);
    assert.deepEqual([fx.flashes[0].x, fx.flashes[0].y], [900, 400], kind);
    assert.ok(kindsOf(fx).has('smoke'), kind);
    const chips = ofKind(fx, 'debris');
    assert.ok(chips.length >= CHIPS, kind);
    for (const c of chips) assert.ok(GROUND_GREYS.includes(c.color), `${kind}: ${c.color} is a grey`);
    assert.ok(chips.some((c) => Math.hypot(c.vx, c.vy) > 50) && chips.every((c) => !c.additive), 'solid chips that fly');
  }
});

test('the greys are the stone the course draws (wander-kit.js)', () => {
  assert.deepEqual([...GROUND_GREYS].sort(), [PAL.stone, PAL.stoneDark, PAL.stoneLight].sort());
});

test('a pillar or a gate blasts bigger than a stone, a turret or a crate: more and bigger chips, more smoke, a harder shake', () => {
  assert.deepEqual(BIG_GROUND.slice().sort(), ['gate', 'pillar']);
  const small = react(kill('stone'));
  assert.equal(ofKind(small, 'debris').length, CHIPS);
  for (const kind of BIG_GROUND) {
    const big = react(kill(kind));
    assert.equal(ofKind(big, 'debris').length, BIG_CHIPS, kind);
    assert.ok(BIG_CHIPS > CHIPS && BIG_CHIP_SIZE[0] >= CHIP_SIZE[0] && BIG_CHIP_SIZE[1] > CHIP_SIZE[1]);
    assert.ok(Math.max(...ofKind(big, 'debris').map((c) => c.size)) > CHIP_SIZE[1], `${kind}: bigger chips`);
    assert.ok(ofKind(big, 'smoke').length >= ofKind(small, 'smoke').length + BIG_PUFFS, kind);
    assert.ok(big.shake >= BIG_SHAKE && big.shake > small.shake, kind);
  }
  for (const kind of SMALL) assert.equal(react(kill(kind)).particles.length, small.particles.length, kind);
});

test('a chip stays inside the sizes named for it', () => {
  for (const kind of KINDS) {
    for (const c of ofKind(react(kill(kind)), 'debris')) assert.ok(c.size >= lo && c.size <= hi, `${kind}: ${c.size}`);
  }
});

test('a hurt ground thing that stands flashes like a hit alien and throws a few stone chips: no ring, much less than a break', () => {
  for (const kind of KINDS) {
    const fx = react(hit(kind));
    assert.equal(fx.flashes.length, 1, kind);
    assert.deepEqual([fx.flashes[0].x, fx.flashes[0].y, fx.flashes[0].tag], [900, 400, 'hit'], kind);
    assert.equal(fx.rings.length, 0, kind);
    const chips = ofKind(fx, 'debris');
    assert.equal(chips.length, HIT_CHIPS, kind);
    for (const c of chips) assert.ok(GROUND_GREYS.includes(c.color), kind);
    assert.ok(fx.particles.length < react(kill(kind)).particles.length, kind);
    assert.equal(fx.shake, 0, kind);
  }
});

test('an unknown kind is treated as a small one, and the effects need no world and draw nothing from it', () => {
  assert.equal(react(kill('spread')).particles.length, react(kill('stone')).particles.length);
  assert.equal(ofKind(react(hit('spread')), 'debris').length, HIT_CHIPS);
  for (const ev of [kill('pillar'), hit('gate')]) assert.deepEqual(react(ev, undefined, 3), react(ev, { level: { world: 22 } }, 3));
});

test('the same seed gives the same chips; another seed gives others', () => {
  assert.deepEqual(react(kill('gate'), undefined, 7).particles, react(kill('gate'), undefined, 7).particles);
  assert.notDeepEqual(react(kill('gate'), undefined, 7).particles, react(kill('gate'), undefined, 8).particles);
});

test('density thins the chips for the quality scaler, as it does every other effect', () => {
  const fx = createFx();
  fx.density = 0.5;
  applyEvent(fx, kill('gate'), makeRng(1));
  assert.ok(ofKind(fx, 'debris').length <= Math.round(BIG_CHIPS * 0.5) + 1);
  assert.ok(ofKind(fx, 'debris').length >= 1);
});

test('a storm of breaks and hits cannot pass 600 particles', () => {
  const fx = createFx();
  const rng = makeRng(5);
  for (let i = 0; i < 200; i++) {
    applyEvent(fx, { ...kill(KINDS[i % KINDS.length]), x: 100 + i * 8 }, rng);
    applyEvent(fx, hit(KINDS[(i + 2) % KINDS.length]), rng);
  }
  assert.ok(fx.particles.length <= MAX_PARTICLES);
  assert.ok(fx.particles.length > MAX_PARTICLES / 2, 'it did fill the pool');
});

// What one pull of the trigger sends under each shooting power, read off the core: the shots (each a hit on a thing it lands on) and the wait for the next.
function volley(power) {
  const world = createWorld(levelById('w22-1'));
  world.state = 'play';
  world.ship.power = { kind: power };
  stepShip(world, TICK, { fire: true });
  return { hits: world.shots.length, wait: world.ship.cooldown };
}

test('an upper bound: the heaviest volley any power sends (every shot of it landing on one thing) holds under half the pool, so the break that ends it still shows whole', () => {
  const volleys = ['spread', 'rapid', 'homing', 'wingmen', 'trident'].map(volley);
  const heaviest = volleys.reduce((a, b) => (b.hits / b.wait > a.hits / a.wait ? b : a)); // hits a second
  assert.ok(heaviest.hits > 1, 'a power that sends more than one shot a pull exists');
  const fx = createFx();
  const rng = makeRng(2);
  let peak = 0;
  for (let t = 0; t < 4; t += heaviest.wait) {
    for (let i = 0; i < heaviest.hits; i++) applyEvent(fx, hit('gate'), rng);
    run(fx, heaviest.wait);
    peak = Math.max(peak, fx.particles.length);
  }
  assert.ok(peak <= MAX_PARTICLES / 2, `peak ${peak} of ${MAX_PARTICLES}`);
  const before = fx.particles.length;
  applyEvent(fx, kill('gate'), rng);
  assert.ok(fx.particles.length > before && fx.particles.length < MAX_PARTICLES, 'nothing was pushed out of the pool');
});

test('every chip and puff is gone within its life', () => {
  const fx = react(kill('pillar'));
  run(fx, 3);
  assert.equal(fx.particles.length + fx.flashes.length + fx.rings.length, 0);
});
