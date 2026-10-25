import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REACTS } from '../../src/fx/react.js';
import { powerColor } from '../../src/fx/emit.js';
import { MAX_PARTICLES } from '../../src/fx/particles.js';
import { kindsOf, react, run } from './fx-kit.js';

// The two powers of Lantern Deep (react-deep.js): a pearl that blocks a bullet flares, a pearl that bites an alien sparks it,
// the trident's shot leaves with an aqua flash and every hit it lands while the power runs adds an aqua streak.
// The maelstrom's bubble is react-maelstrom.test.js.
const deep = (power) => ({ level: { world: 15, twist: 'gravity' }, ship: { x: 900, y: 900, power: power ? { kind: power, left: 5 } : null } });
const other = (power) => ({ level: { world: 13 }, ship: { x: 900, y: 900, power: power ? { kind: power, left: 5 } : null } });
const block = { type: 'pearlBlock', x: 880, y: 760, pearl: 1 };
const bite = { type: 'pearlHit', x: 700, y: 400, pearl: 2 };
const hit = (extra = {}) => ({ type: 'hit', id: 4, role: 'grunt', x: 640, y: 300, hp: 1, dmg: 1, ...extra });
const trident = { type: 'fire', side: 'ship', x: 900, y: 860, power: 'trident' };

test("the core's pearl events have a reaction", () => {
  assert.ok(REACTS.includes('pearlBlock') && REACTS.includes('pearlHit'));
});

test('a pearl that wipes a bullet flares: a pearly flash on the pearl, a thin ring and specks of nacre', () => {
  const fx = react(block, deep('pearls'));
  const [flash] = fx.flashes;
  assert.deepEqual([flash.x, flash.y], [880, 760], 'at the pearl');
  assert.equal(flash.color, '#ffd8f0');
  assert.ok(flash.life < 0.2, 'a flare, not a glow that lingers');
  assert.equal(fx.rings.length, 1);
  assert.equal(fx.rings[0].kind, 'ring');
  assert.ok(fx.rings[0].maxR < 60, 'a small ring: a pearl is 26 px across');
  assert.ok(fx.particles.length >= 3 && fx.particles.every((p) => p.additive), 'additive specks');
});

test('a pearl that bites an alien sparks it, on the alien', () => {
  const fx = react(bite, deep('pearls'));
  assert.ok(fx.flashes.every((f) => f.x === 700 && f.y === 400));
  assert.ok(fx.rings.every((r) => r.x === 700 && r.y === 400));
  assert.ok(fx.particles.length >= 6 && fx.particles.every((p) => Math.abs(p.x - 700) < 1 && Math.abs(p.y - 400) < 1));
  assert.ok(fx.particles.some((p) => p.color === '#ff8ad0') || fx.rings.some((r) => r.color === '#ff8ad0'), 'rose in it');
});

test("a block's flash is quieter than the ship's hurt and a blocked ring stays inside the particle cap", () => {
  const fx = react(Array.from({ length: 14 }, () => block), deep('pearls')); // a whole ring of bullets wiped at once
  assert.ok(fx.particles.length <= MAX_PARTICLES);
  assert.ok(fx.flashes.length <= 64 && fx.rings.length <= 64);
  assert.ok(fx.shake === 0, 'no shake: it is a guard, not a hit');
  run(fx, 0.5);
  assert.equal(fx.flashes.length, 0, 'all the flares are over in half a second');
});

test('the trident leaves the ship with an aqua flash on top of the usual one; other shots are unchanged', () => {
  const plain = react({ ...trident, power: undefined }, deep(null));
  const t = react(trident, deep('trident'));
  assert.equal(t.flashes.length, plain.flashes.length + 1);
  const added = t.flashes.at(-1);
  assert.equal(added.color, powerColor('trident'));
  assert.equal(added.tag, 'muzzle');
  assert.equal(react(trident, other(null)).flashes.length, t.flashes.length, 'the same everywhere: the shot itself says it is a trident');
});

test('a hit while the trident runs in world 15 adds an aqua streak; elsewhere and without the power it is the plain hit', () => {
  const base = react(hit(), deep(null));
  const run15 = react(hit(), deep('trident'));
  assert.ok(run15.particles.length > base.particles.length, 'more sparks');
  assert.equal(run15.flashes.length, base.flashes.length + 1);
  assert.equal(run15.flashes.at(-1).color, powerColor('trident'));
  assert.ok(run15.particles.some((p) => p.color === '#5af0ff' || p.color === '#9affc8' || p.color === '#bff4ff'));
  for (const w of [other('trident'), deep('pearls'), deep('laser'), undefined]) {
    const fx = react(hit(), w);
    assert.equal(fx.particles.length, base.particles.length, 'no extra sparks');
    assert.equal(fx.flashes.length, base.flashes.length);
  }
  const miss = react(hit({ dmg: 0 }), deep('trident'));
  assert.equal(miss.flashes.length, react(hit({ dmg: 0 }), deep(null)).flashes.length, 'a hit that did nothing leaves nothing');
});

test('a kill while the trident runs in world 15 gets the streak too: a 1 hp alien dies with a kill, never a hit', () => {
  const kill = { type: 'kill', id: 4, role: 'grunt', x: 640, y: 300, score: 10, mult: 1, scored: 10 };
  const base = react(kill, deep(null));
  const run15 = react(kill, deep('trident'));
  assert.ok(run15.particles.length > base.particles.length, 'more sparks');
  assert.equal(run15.flashes.length, base.flashes.length + 1);
  assert.equal(run15.flashes.at(-1).color, powerColor('trident'));
  for (const w of [other('trident'), deep('pearls'), undefined]) {
    const fx = react(kill, w);
    assert.equal(fx.particles.length, base.particles.length, 'no extra sparks');
    assert.equal(fx.flashes.length, base.flashes.length);
  }
});

test("the powers' colours in the fx: pearls pearly, trident aqua", () => {
  assert.equal(powerColor('pearls'), '#ffd8f0');
  assert.equal(powerColor('trident'), '#5af0ff');
  assert.ok(kindsOf(react(block, deep('pearls'))).has('spark'));
});
