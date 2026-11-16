import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REACTS } from '../../src/fx/react.js';
import { FIGHT } from '../../src/fx/react-fight.js';
import { BATH_WORLD, EVENT_MAX, COUNTS, POP, POP_BASE, POP_TOP, STRIKE_FLASH, STRIKE_LIFE, STRIKE_SCALE, STRIKE_SHAKE, SHAKE, TOY, TRAIL, WATERLINE } from '../../src/fx/react-bath.js';
import { STRIKE_AT } from '../../src/core/bonk.js';
import { COMBO_HOT, COMBO_MAX } from '../../src/core/scoring.js';
import { WIDTH, MID_X } from '../../src/core/kinds.js';
import { createFx } from '../../src/fx/fx.js';
import { createWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';
import { makeRng } from '../../src/core/rng.js';
import { react, run } from './fx-kit.js';
import { bath, EVENTS, at, kill, blast } from './react-bath-kit.js';

// World 19's effects (react-bath.js): a knock-out is a puff with little stars and its score, a toy that goes is a puff of foam, and the
// batting game's six events each have their own. The foam is drawn by test/ui/bath-fx-view.test.js; the storm, the whole level, purity and
// the other worlds are react-bath-world.test.js.
const bonkAt = (link, ko = true) => react(at('bonk', { link, ko }), bath);
const scaleOf = (link, ko = true) => bonkAt(link, ko).popups[0].scale;
test('all six events of the batting game have a reaction, and the world is 19', () => {
  for (const type of EVENTS) assert.ok(REACTS.includes(type), type);
  assert.equal(BATH_WORLD, 19);
  assert.equal(createWorld(levelById('w19-1')).level.world, BATH_WORLD);
});

test('a knock-out is a puff in the toy\'s colour, three little stars and the score: opaque, inked, no fire, no light', () => {
  const fx = react(kill, bath);
  const puffs = fx.particles.filter((p) => !p.star);
  assert.equal(fx.particles.filter((p) => p.star).length, COUNTS.knockStars);
  assert.equal(puffs.length, COUNTS.knock);
  assert.ok(fx.particles.every((p) => p.kind === 'suds' && !p.additive), 'suds only: no spark, no smoke, no debris');
  assert.ok(puffs.some((p) => p.color === TOY.diver), 'the diver is soap pink');
  assert.deepEqual(fx.popups.map((p) => p.text), ['+150']);
  assert.deepEqual([fx.rings.length, fx.flashes.length], [0, 0]);
  assert.equal(react({ ...kill, scored: false }, bath).popups.length, 0, 'an unscored kill has no score, but still the puff');
  assert.ok(react({ ...kill, scored: false }, bath).particles.length > 0);
  assert.equal(react({ ...kill, role: 'carrier' }, bath).particles.filter((p) => !p.star).length, COUNTS.knockCarrier, 'a carrier goes with a bigger puff');
  assert.ok(react({ ...kill, role: 'nobody' }, bath).particles.some((p) => p.color === TOY.grunt), 'an unknown role is the grunt\'s colours, not a crash');
});

test('the score of a knock-out is the one every other world shows: same text, colour, size and place, whatever the combo', () => {
  for (const mult of [undefined, 1, 2, COMBO_HOT, COMBO_MAX, COMBO_MAX + 3]) {
    const ev = { ...kill, mult };
    assert.deepEqual(react(ev, bath).popups, react(ev).popups, `mult ${mult}`);
  }
  const colors = [1, 2, COMBO_HOT, COMBO_MAX].map((mult) => react({ ...kill, mult }, bath).popups[0].color);
  assert.equal(new Set(colors).size, colors.length, 'a hotter combo is a hotter colour');
});

test('an explode of size 1 is a puff of foam and a light shake; the ship\'s blast and the boss\'s last one stay as they are', () => {
  const fx = react(blast(1), bath);
  assert.equal(fx.particles.length, COUNTS.foam);
  assert.ok(fx.particles.every((p) => p.kind === 'suds' && !p.star && !p.additive));
  assert.deepEqual([fx.flashes.length, fx.rings.length, fx.popups.length], [0, 0, 0]);
  assert.equal(fx.shake, SHAKE);
  assert.ok(fx.shake < react(blast(1)).shake, 'lighter than the usual alien blast');
  for (const size of [2, 3]) {
    const was = createFx();
    FIGHT.explode(was, blast(size), makeRng(1), bath);
    assert.deepEqual(react(blast(size), bath), was, `size ${size}`);
  }
});

test('a whack is a streak of puffs trailing the launch, all along (dx, dy)', () => {
  for (const [dx, dy] of [[0.6, -0.8], [0, -1], [-1, 0], [0.8, 0.6]]) {
    const fx = react(at('whack', { dx, dy }), bath);
    assert.equal(fx.particles.length, COUNTS.trail);
    assert.ok(fx.particles.every((p) => p.kind === 'suds' && !p.star && !p.additive));
    for (const p of fx.particles) assert.ok((p.vx * dx + p.vy * dy) / Math.hypot(p.vx, p.vy) >= Math.cos(TRAIL.spread) - 1e-9, `along ${dx}, ${dy}`);
    assert.deepEqual([fx.popups.length, fx.flashes.length, fx.rings.length], [0, 0, 0]);
  }
});

test('a bonk is a starburst and a word that grows with the link: BONK, DOUBLE BONK, TRIPLE BONK; TOK on a stopper', () => {
  assert.deepEqual([0, 1, 2, 3, 5].map((link) => bonkAt(link).popups[0].text), ['BONK', 'DOUBLE BONK', 'TRIPLE BONK', 'TRIPLE BONK', 'TRIPLE BONK']);
  const scales = Array.from({ length: STRIKE_AT + 3 }, (_, link) => scaleOf(link));
  for (let i = 1; i <= STRIKE_AT; i++) assert.ok(scales[i] > scales[i - 1], `link ${i} is bigger than ${i - 1}`);
  for (let i = STRIKE_AT + 1; i < scales.length; i++) assert.equal(scales[i], scales[STRIKE_AT], 'it stops growing where a strike begins');
  assert.equal(scales[0], POP_BASE);
  assert.equal(scales[STRIKE_AT], POP_TOP);
  assert.ok(scales[STRIKE_AT] < STRIKE_SCALE, 'STRIKE! is bigger than any BONK');
  const colors = [0, 1, 2].map((link) => bonkAt(link).popups[0].color);
  assert.equal(new Set(colors).size, 3);
  const burst = (link) => bonkAt(link).particles.length;
  for (let link = 0; link < STRIKE_AT + 6; link++) assert.equal(burst(link), Math.min(COUNTS.starsKo + link, COUNTS.starsKoMax), `link ${link}`);
  assert.ok(burst(STRIKE_AT) > burst(0), 'the starburst grows too');
  assert.ok(bonkAt(0).particles.every((p) => p.star && p.kind === 'suds' && !p.additive));
  for (const link of [0, 2, 4]) {
    const tok = bonkAt(link, false);
    assert.deepEqual(tok.popups.map((p) => [p.text, p.scale]), [['TOK', POP_BASE]], 'a stopper is a small TOK, whatever its link');
    assert.equal(tok.particles.length, COUNTS.starsTok);
    assert.ok(tok.particles.length < bonkAt(link).particles.length);
  }
  const part = react(at('bonk', { role: 'boss', part: 'bill', ko: false }), bath);
  assert.deepEqual([part.popups[0].text, part.popups[0].x, part.popups[0].y], ['TOK', 640, 300 + POP.bonk.dy], 'under the spot: the kill\'s score rises over it');
});

test('a bank is BOING and puffs sprung back toward the middle from either wall', () => {
  for (const x of [70, WIDTH - 70]) {
    const fx = react({ type: 'bank', x, y: 400 }, bath);
    assert.deepEqual(fx.popups.map((p) => p.text), ['BOING']);
    assert.ok(fx.popups[0].x >= POP.bank.edge && fx.popups[0].x <= WIDTH - POP.bank.edge, 'the word stays on screen');
    assert.equal(fx.particles.length, COUNTS.bank);
    assert.ok(fx.particles.every((p) => Math.sign(p.vx) === Math.sign(MID_X - x) && p.kind === 'suds'));
  }
});

test('a strike is STRIKE!, a burst of stars, a small shake and a flash tagged strike that lives STRIKE_LIFE', () => {
  const fx = react(at('strike'), bath);
  assert.deepEqual(fx.popups.map((p) => [p.text, p.scale]), [['STRIKE!', STRIKE_SCALE]]);
  assert.equal(fx.flashes.length, 1);
  const { tag, life, full, r, alpha, ramp, x, y } = fx.flashes[0];
  assert.deepEqual([tag, life, full, r, alpha, ramp, x, y], ['strike', STRIKE_LIFE, false, STRIKE_FLASH.r, STRIKE_FLASH.alpha, STRIKE_FLASH.ramp, 640, 300]);
  assert.equal(fx.particles.length, COUNTS.strike);
  assert.ok(fx.particles.every((p) => p.star && !p.additive));
  assert.equal(fx.shake, STRIKE_SHAKE);
  assert.ok(STRIKE_SHAKE > SHAKE, 'a strike shakes more than a puff');
  run(fx, STRIKE_LIFE * 0.9);
  assert.ok(fx.flashes.some((f) => f.tag === 'strike'), 'still alive for the taps near the end of its life');
  run(fx, STRIKE_LIFE * 0.2);
  assert.equal(fx.flashes.length, 0, 'gone once it is over');
  for (const x of [40, WIDTH - 40]) {
    const word = react(at('strike', { x }), bath).popups[0];
    assert.ok(word.x >= POP.strike.edge && word.x <= WIDTH - POP.strike.edge, 'STRIKE! stays on screen');
  }
});

test('a plop is a splash of droplets rising at the waterline, a fizzle PFFT and a few puffs going flat', () => {
  for (const x of [900, -30, WIDTH + 40]) {
    const fx = react({ type: 'plop', x, role: 'gunner' }, bath);
    assert.equal(fx.particles.length, COUNTS.plop);
    assert.ok(fx.particles.every((p) => p.y === WATERLINE && p.vy < 0 && p.x >= 0 && p.x <= WIDTH && !p.additive));
    assert.deepEqual([fx.popups.length, fx.flashes.length, fx.rings.length], [0, 0, 0]);
  }
  const fizz = react(at('fizzle'), bath);
  assert.deepEqual(fizz.popups.map((p) => p.text), ['PFFT']);
  assert.equal(fizz.particles.length, COUNTS.fizzle);
  assert.ok(fizz.particles.every((p) => p.kind === 'suds' && !p.star && !p.additive));
});

test('no event makes more than EVENT_MAX particles, and none lights the frame: no ring, no additive particle, one flash, the strike\'s', () => {
  for (const ev of [...EVENTS.map((t) => at(t)), at('bonk', { ko: false }), at('bonk', { link: 9 }), kill, { ...kill, role: 'carrier' }, blast(1)]) {
    const fx = react(ev, bath);
    assert.ok(fx.particles.length >= 1 && fx.particles.length <= EVENT_MAX, `${ev.type}: ${fx.particles.length}`);
    assert.ok(fx.particles.every((p) => !p.additive && p.kind === 'suds'), ev.type);
    assert.equal(fx.rings.length, 0, ev.type);
    assert.ok(fx.flashes.every((f) => f.tag === 'strike'), ev.type);
  }
});
