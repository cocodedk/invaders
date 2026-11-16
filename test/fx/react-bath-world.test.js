import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REACTS, applyEvent, applyEvents } from '../../src/fx/react.js';
import { FIGHT } from '../../src/fx/react-fight.js';
import { DEEP } from '../../src/fx/react-deep.js';
import { createFx, stepFx } from '../../src/fx/fx.js';
import { MAX_PARTICLES } from '../../src/fx/particles.js';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { autopilot } from '../../src/core/autopilot.js';
import { levelById, WORLDS } from '../../src/core/levels.js';
import { makeRng } from '../../src/core/rng.js';
import { sampleEvent } from '../event-sample.js';
import { TOY, BATH_WORLD } from '../../src/fx/react-bath.js';
import look from '../../src/ui/looks/w19.js';
import { TICK, react, run, kindsOf } from './fx-kit.js';
import { bath, EVENTS, at, kill, blast } from './react-bath-kit.js';
import { STRIKE_AT } from '../../src/core/bonk.js';
import { COMBO_HOT, COMBO_MAX } from '../../src/core/scoring.js';

// World 19's effects as a whole (react-bath.js): a storm of them, a whole autopiloted level, seeding and purity, and the other worlds,
// which see what they always saw. The events one by one are react-bath.test.js.
const TEAL = [150, 200]; // degrees of hue: worlds 9, 11 and 15 own it (the look's own test holds the wall to the same rule)
const total = (fx) => fx.particles.length + fx.rings.length + fx.flashes.length + fx.popups.length;

test('a storm of them never touches the particle cap, every list keeps its own, and it all dies away', () => {
  const fx = createFx();
  const rng = makeRng(9);
  for (let i = 0; i < 120; i++) {
    for (const type of EVENTS) applyEvent(fx, at(type, { x: 100 + i * 13, link: i % 6, ko: i % 3 > 0 }), rng, bath);
    applyEvent(fx, kill, rng, bath);
    applyEvent(fx, blast(1), rng, bath);
  }
  assert.equal(fx.particles.length, MAX_PARTICLES, 'it fills the pool and stops there');
  assert.ok(fx.flashes.length <= 64 && fx.popups.length <= 64);
  run(fx, 3);
  assert.equal(total(fx), 0);
});

test('a whole autopiloted level of world 19: every effect stays finite and bounded, and the foam shows', () => {
  const world = createWorld(levelById('w19-1'));
  const fx = createFx();
  const rng = makeRng(4);
  const seen = new Set();
  for (let i = 0; i < 60 * 40 && world.state !== 'cleared'; i++) {
    stepWorld(world, TICK, autopilot(world));
    const events = world.events.splice(0);
    for (const e of events) seen.add(e.type);
    applyEvents(fx, events, rng, world);
    stepFx(fx, TICK);
    assert.ok(fx.particles.length <= MAX_PARTICLES);
    for (const p of fx.particles) if (p.kind === 'suds') assert.ok(!p.additive);
  }
  assert.ok(seen.has('kill') && seen.has('whack') && seen.has('plop'), `events seen: ${[...seen]}`);
  assert.ok(fx.particles.concat(fx.popups).every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
  assert.ok(Number.isFinite(fx.shake) && fx.shake < 40);
});

test('the effects are seeded, thin out with the quality scaler, and draw on no dice, no clock and no canvas of their own', () => {
  for (const type of [...EVENTS, 'kill', 'explode']) {
    assert.deepEqual(react(sampleEvent(type), bath, 3), react(sampleEvent(type), bath, 3), type);
    assert.notDeepEqual(react(sampleEvent(type), bath, 3).particles, react(sampleEvent(type), bath, 4).particles, type);
  }
  const half = createFx();
  half.density = 0.5;
  applyEvent(half, at('strike'), makeRng(1), bath);
  assert.ok(half.particles.length < react(at('strike'), bath).particles.length);
  const world = createWorld(levelById('w19-1'));
  const before = world.rng.s;
  const frozen = Object.freeze({ ...bath, level: Object.freeze({ ...bath.level }) });
  const fx = createFx();
  for (const type of REACTS) applyEvent(fx, Object.freeze(sampleEvent(type)), makeRng(1), type === 'kill' ? frozen : world);
  assert.equal(world.rng.s, before);
  assert.doesNotMatch(readFileSync(new URL('../../src/fx/react-bath.js', import.meta.url), 'utf8'), /window|document|Math\.random|Date\.now|canvas/i);
  for (const file of ['src/fx/react-bath.js', 'src/ui/bath-fx-view.js']) {
    const code = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8').replace(/\/\/.*$/gm, ''); // the comments say what is not used
    assert.doesNotMatch(code, /Math\.random|Date\.now|shadowBlur/, file);
  }
});

test("the toys' puffs are the colours of the toys on screen, and nothing the world makes is teal", () => {
  assert.deepEqual(TOY, look.palette.alien, "looks/w19.js's alien colours: the puff of a knock-out is the toy's own");
  const hue = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const top = Math.max(r, g, b);
    const chroma = top - Math.min(r, g, b);
    if (chroma < 0.12) return null; // cream, white or grey: no hue to speak of
    const h = top === r ? ((g - b) / chroma + 6) % 6 : top === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
    return h * 60;
  };
  const events = [...EVENTS.map((t) => at(t)), ...[0, 1, 2, STRIKE_AT].map((link) => at('bonk', { link })), at('bonk', { ko: false }), blast(1),
    ...Object.keys(TOY).flatMap((role) => [1, 2, COMBO_HOT, COMBO_MAX].map((mult) => ({ ...kill, role, mult })))];
  const colors = new Set();
  for (let seed = 1; seed <= 24; seed++) {
    for (const ev of events) {
      const fx = react(ev, bath, seed);
      for (const e of [...fx.particles, ...fx.popups, ...fx.flashes]) colors.add(e.color);
    }
  }
  assert.ok(colors.size >= 20, `${colors.size} colours seen`);
  for (const c of colors) {
    const h = hue(c);
    assert.ok(h === null || h < TEAL[0] || h > TEAL[1], `${c} has a hue of ${h}: teal is another world's`);
  }
});

test('in every other world kill and explode produce exactly what they did', () => {
  const others = WORLDS.map((x) => x.id).filter((id) => id !== BATH_WORLD);
  const worlds = [undefined, { level: {} }, { level: { world: WORLDS.length + 1 } }, ...others.map((id) => ({ level: { world: id, twist: 'x' }, ship: { power: { kind: 'trident' } } }))];
  for (const world of worlds) {
    for (const ev of [kill, { ...kill, role: 'carrier', scored: false }, { ...kill, role: 'armored', mult: 8 }]) {
      const was = createFx();
      DEEP.kill(was, ev, makeRng(1), world);
      assert.deepEqual(react(ev, world), was, JSON.stringify(world?.level));
    }
    for (const size of [undefined, 1, 2, 3]) {
      const was = createFx();
      FIGHT.explode(was, blast(size), makeRng(1), world);
      assert.deepEqual(react(blast(size), world), was, `${JSON.stringify(world?.level)} size ${size}`);
    }
  }
  assert.ok(kindsOf(react(kill, { level: { world: 18 } })).has('debris'), "world 18's kill still breaks into debris");
  assert.ok(kindsOf(react(blast(1), { level: { world: 18 } })).has('smoke'), "and its blast still smokes");
  assert.ok(!kindsOf(react(kill, bath)).has('debris') && !kindsOf(react(blast(1), bath)).has('smoke'), 'world 19 differs');
});
