import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TICK, MID_X } from '../../src/core/kinds.js';
import { FREE_ZONE, SHOT_SPEED, bolt } from '../../src/core/ship.js';
import { BEAM_DPS, BEAM_W } from '../../src/core/weapons.js';
import { SPAWN_Y, BOXES, SHOT_SECS, BREAK_SECS, hpFor } from '../../src/core/course-kinds.js';
import { GROUND_HP, GROUND_SCORE } from '../../src/core/course-ground.js';
import { SEED_DMG, SEED_FALL } from '../../src/core/course-seed.js';
import { step, drain, ofType, shotAt, gunTicks, at, FIRE } from './world-kit.js';
import { unfair } from './course-fair-kit.js';
import { closingHedges } from './course-fair-wood.js';
import { flight, launched, courseLevel, thorn, hedge, OPEN_HEDGE, THORN_W, THORN_H, FAIR_COURSE, FAIR_HEDGE_AT } from './course-kit.js';

// Thorn hedges (world 22, Leg 2), the core: a thorn piece is a ground object that is a box, as a pillar is. It rams the ship while it stands,
// and the gun, the beam and a seed's burst break it. (The data rules a hedge answers to are the fair kit's: course-fair.test.js, and the
// bottom of this file.) Test-local: the scroll stands still (speed 0), so an entry's `at` puts it at one screen row for good.
const SHIP_Y = 900;
const ROW = 400; // where the pieces stand
const BIG = 99; // hp that no test wears down
const LASER = { kind: 'laser', left: Infinity };
const stand = (kind, x, y = ROW, o = {}) => ({ kind, at: SPAWN_Y - y, x, w: THORN_W, h: THORN_H, ...o });

// A quiet course world with `spawns` on the ground, one play tick taken to put them there, the ship at the foot of the screen and unhurtable
// (a test that wants it rammed sets its invuln to 0).
function arena(spawns, power = null) {
  const world = flight(spawns, { speed: 0 });
  Object.assign(world.ship, { x: MID_X, y: SHIP_Y, fromX: MID_X, fromY: SHIP_Y, invuln: Infinity, power });
  step(world);
  drain(world);
  return world;
}
const vulnerable = (world) => { world.ship.invuln = 0; return world; };

test('a thorn piece is a box: its entry carries w and h, its hp comes from GROUND_HP unless the entry names one, and it pays GROUND_SCORE', () => {
  assert.ok(BOXES.includes('pillar') && BOXES.includes('thorn'));
  assert.equal(GROUND_HP.thorn, hpFor('thorn'));
  assert.ok(GROUND_HP.thorn > 0 && GROUND_HP.thorn < GROUND_HP.pillar, 'a piece is weaker than a pillar');
  assert.ok(GROUND_SCORE.thorn > 0 && GROUND_SCORE.thorn < GROUND_SCORE.pillar);
  const world = arena([stand('thorn', 300, ROW, { w: 80, h: 70 }), stand('thorn', 700, ROW, { hp: 5 })]);
  const [a, b] = world.course.ground;
  assert.deepEqual([a.w, a.h, a.hp], [80, 70, GROUND_HP.thorn]);
  assert.deepEqual([b.w, b.h, b.hp], [THORN_W, THORN_H, 5]);
});

test('a thorn piece rams like a pillar: the ship loses a life and the hit says what it was; a pillar still says pillar', () => {
  for (const kind of ['thorn', 'pillar']) {
    const world = vulnerable(arena([stand(kind, MID_X, SHIP_Y)]));
    step(world);
    assert.equal(world.hits, 1, kind);
    assert.equal(ofType(drain(world), 'shipHit')[0].source, kind);
  }
});

test('a thorn piece is rammed along the ship\'s move, not only where it ends: crossed in one move is a hit, the same move beside it is not', () => {
  const crossing = vulnerable(arena([stand('thorn', MID_X, ROW)]));
  step(crossing, 1, at(MID_X, ROW - THORN_H)); // from the foot of the screen to beyond the piece
  assert.equal(crossing.hits, 1);
  const beside = vulnerable(arena([stand('thorn', MID_X, ROW)]));
  step(beside, 1, at(MID_X + 3 * THORN_W, ROW - THORN_H));
  assert.equal(beside.hits, 0);
});

test('a broken thorn piece rams no more: the shot that breaks it saves the ship that stands in it', () => {
  const [control, fired] = [false, true].map((fire) => {
    const world = vulnerable(arena([stand('thorn', MID_X, SHIP_Y, { hp: 1 })]));
    if (fire) shotAt(world, world.course.ground[0]);
    step(world);
    return world;
  });
  assert.deepEqual([control.hits, control.course.ground.length], [1, 1], 'a standing piece rams');
  assert.deepEqual([fired.hits, fired.course.ground.length], [0, 0], 'a broken one does not');
});

test('the gun breaks a piece in GROUND_HP.thorn shots, each a groundHit, the last a groundKill that pays GROUND_SCORE.thorn', () => {
  const world = arena([stand('thorn', MID_X)]);
  const g = world.course.ground[0];
  for (let n = 1; n <= GROUND_HP.thorn; n++) {
    assert.equal(g.hp, GROUND_HP.thorn - n + 1, `before shot ${n}`);
    shotAt(world, g);
    step(world);
  }
  const events = drain(world);
  assert.deepEqual([ofType(events, 'groundHit').length, ofType(events, 'groundKill').map((e) => e.kind)], [GROUND_HP.thorn - 1, ['thorn']]);
  assert.equal(world.score, GROUND_SCORE.thorn);
  assert.equal(world.course.ground.length, 0);
});

test('a wide piece is hit across its box by a shot, the shot\'s radius counting, and by the beam: past its edge they fly on', () => {
  const [w, r] = [200, 5];
  for (const [dx, hit] of [[w / 2 - 1, true], [w / 2 + r - 1, true], [w / 2 + r + 1, false]]) {
    const world = arena([stand('thorn', MID_X, ROW, { w, hp: BIG })]);
    const g = world.course.ground[0];
    world.shots.push({ ...bolt(g.x + dx, g.y + THORN_H / 2 + 8, 0, -SHOT_SPEED), life: 1, r });
    step(world);
    assert.equal(g.hp, hit ? BIG - 1 : BIG, `a shot dx ${dx}`);
  }
  for (const [dx, hit] of [[w / 2 + BEAM_W / 2 - 1, true], [w / 2 + BEAM_W / 2 + 1, false]]) {
    const world = arena([stand('thorn', MID_X + dx, ROW, { w, hp: BIG })], LASER);
    step(world, 30, FIRE);
    assert.equal(world.course.ground[0].hp < BIG, hit, `the beam dx ${dx}`);
  }
});

test('the laser beam breaks a piece, and wears a tough one down at BEAM_DPS', () => {
  const world = arena([stand('thorn', MID_X + 5), stand('thorn', MID_X - 5, ROW + 150, { hp: BIG })], LASER);
  const [weak, tough] = world.course.ground;
  const breakTicks = Math.ceil(GROUND_HP.thorn / BEAM_DPS / TICK) + 2; // a piece's hp at BEAM_DPS, and two ticks of slack for the beam's first tick
  step(world, breakTicks, FIRE);
  assert.ok(world.ship.beam);
  assert.equal(weak.hp, 0, 'the piece is broken');
  assert.equal(world.score, GROUND_SCORE.thorn);
  const more = 60;
  step(world, more, FIRE);
  assert.ok(Math.abs(BIG - tough.hp - BEAM_DPS * (breakTicks + more) * TICK) <= 1, `lost ${BIG - tough.hp}`);
});

test('a seed\'s burst hurts a piece by SEED_DMG', () => {
  const world = launched([stand('thorn', MID_X, ROW, { at: 0, hp: BIG })], { speed: 60, starts: ['seed'] });
  world.ship.invuln = Infinity;
  world.ship.cooldown = Infinity; // the gun is jammed: only the seed is under test
  step(world, 1, FIRE);
  const seed = { ...world.course.seeds[0] };
  Object.assign(world.course.ground[0], { x: seed.x, at: seed.at });
  step(world, gunTicks(SEED_FALL));
  assert.equal(world.course.ground[0].hp, BIG - SEED_DMG);
});

test('steady fire breaks a piece in about BREAK_SECS.thorn', () => {
  const world = arena([stand('thorn', MID_X, SHIP_Y - 150)]);
  let ticks = 0;
  while (world.course.ground.length > 0 && ticks < 60 * 20) { step(world, 1, FIRE); ticks++; }
  assert.ok(Math.abs(ticks * TICK - BREAK_SECS.thorn) <= 0.25, `took ${(ticks * TICK).toFixed(2)} s`);
});

// The fair kit's hedge rules (course-fair-wood.js; the rows that break each rule alone are course-fair.test.js's). A hedge is the thorn pieces
// that share an `at`: one with a way round (a gap of BAND_MIN) is counted like a pillar, one with none closes the band and must be shot through.
const TOUGH = Math.floor(FREE_ZONE.y0 / FAIR_COURSE.speed / SHOT_SECS) + 1; // hp whose break takes longer than the scroll gives, at the fair course's speed
const fairWith = (entries) => {
  const data = structuredClone(FAIR_COURSE);
  for (const e of entries) data.spawns.splice(data.spawns.findLastIndex((s) => s.at <= e.at) + 1, 0, e);
  return data;
};

test('a hedge with a way round breaks no rule and is no shoot-through hedge; one that closes the band breaks none while it can be shot through in time', () => {
  const open = fairWith(hedge(FAIR_HEDGE_AT, OPEN_HEDGE));
  assert.deepEqual(unfair(courseLevel(open)), []);
  assert.deepEqual(closingHedges(open), []);
  const closing = hedge(FAIR_HEDGE_AT);
  const shut = fairWith(closing);
  assert.deepEqual(unfair(courseLevel(shut)), []);
  assert.deepEqual(closingHedges(shut), [closing], 'the kit finds the hedge from its pieces: nothing in the data says it closes the band');
});

test('the weakest piece of a hedge that closes the band decides: one weak piece is enough, none is not', () => {
  const weakOne = hedge(FAIR_HEDGE_AT, { hp: TOUGH });
  weakOne[2].hp = GROUND_HP.thorn;
  assert.deepEqual(unfair(courseLevel(fairWith(weakOne))), []);
  assert.deepEqual(unfair(courseLevel(fairWith(hedge(FAIR_HEDGE_AT, { hp: TOUGH })))).map((v) => v.split(':')[0]), ['shoot']);
});

test('a hedge closing the band is shot through in time up to a scroll of FREE_ZONE.y0 over the break time, and not at a px a second more', () => {
  const fastest = FREE_ZONE.y0 / (GROUND_HP.thorn * SHOT_SECS);
  const level = (speed) => courseLevel({ speed, length: 9000, starts: [], walls: [], spawns: hedge(2000) });
  assert.deepEqual(unfair(level(Math.floor(fastest))), []);
  assert.deepEqual(unfair(level(Math.floor(fastest) + 1)).map((v) => v.split(':')[0]), ['shoot']);
});

test('a hedge whose pieces sit on two rows is two hedges: each leaves a way round, so together they close the band as a band violation, not a shoot-through', () => {
  const all = hedge(FAIR_HEDGE_AT); // the hedge that closes the band, every other piece moved a row down: each row's pieces leave a way round between them
  const rows = all.map((p, i) => (i % 2 === 0 ? p : { ...p, at: p.at + 1 }));
  const data = fairWith(rows);
  assert.deepEqual(closingHedges(data), []);
  assert.deepEqual([...new Set(unfair(courseLevel(data)).map((v) => v.split(':')[0]))], ['band']);
});
