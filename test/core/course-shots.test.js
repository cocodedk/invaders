import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TICK, MID_X } from '../../src/core/kinds.js';
import { MUZZLE } from '../../src/core/ship.js';
import { BEAM_DPS } from '../../src/core/weapons.js';
import { SPAWN_Y, BREAK_SECS, hpFor } from '../../src/core/course-kinds.js';
import { GROUND_HP, GROUND_SCORE, GROUND_R } from '../../src/core/course-ground.js';
import { step, drain, ofType, addAlien, shotAt, FIRE } from './world-kit.js';
import { flight, hold } from './course-kit.js';

// The ship's shots and its beam against the ground (world 22). Test-local: the scroll stands still (speed 0), so an entry's `at`
// puts it at one screen row for good, and the ship stays at the foot of the screen, out of the way and unhurtable.
const SHIP_Y = 900;
const ROW = 400; // where the ground objects stand
const BIG = 99; // hp that no test wears down
const LASER = { kind: 'laser', left: Infinity };
const stand = (kind, x, y = ROW, o = {}) => ({ kind, at: SPAWN_Y - y, x, ...o });
const shot = (x, y, o = {}) => ({ pattern: 'shot', x, y, vx: 0, vy: -1400, r: 5, life: 1, dmg: 1, ...o });

// A quiet course world with `spawns` on the ground, one play tick taken to put them there.
function arena(spawns, power = null) {
  const world = flight(spawns, { speed: 0 });
  Object.assign(world.ship, { x: MID_X, y: SHIP_Y, fromX: MID_X, fromY: SHIP_Y, invuln: Infinity, power });
  step(world);
  drain(world);
  return world;
}

test('a shot through a turret, a stone and a pillar hurts each by its dmg and is spent', () => {
  for (const kind of ['turret', 'stone', 'pillar']) {
    const world = arena([stand(kind, MID_X, ROW, { hp: 9, w: 60, h: 60 })]);
    const g = world.course.ground[0];
    shotAt(world, g);
    world.shots[0].dmg = 2;
    step(world);
    assert.equal(g.hp, 7, kind);
    assert.equal(world.shots.length, 0, `${kind}: the shot is spent`);
  }
});

test('a hit that leaves the object standing says groundHit with its kind and place; the break says groundKill instead', () => {
  const world = arena([stand('turret', MID_X, ROW, { hp: 2 })]);
  const g = world.course.ground[0];
  shotAt(world, g);
  step(world);
  assert.deepEqual(ofType(drain(world), 'groundHit').map(({ type, kind, x, y }) => ({ type, kind, x, y })),
    [{ type: 'groundHit', kind: 'turret', x: g.x, y: g.y }]);
  shotAt(world, g);
  step(world);
  const events = drain(world);
  assert.deepEqual([ofType(events, 'groundHit').length, ofType(events, 'groundKill').length], [0, 1]);
  assert.equal(world.score, GROUND_SCORE.turret);
  assert.equal(world.course.ground.length, 0, 'the broken turret is gone on the tick it breaks');
});

test("an entry with no hp gets its kind's GROUND_HP; one with hp keeps it; a lantern has none", () => {
  const pillar = { w: 80, h: 80 };
  const world = arena([stand('stone', 300), stand('pillar', 700, ROW, pillar), stand('pillar', 1100, ROW, { ...pillar, hp: 5 }), stand('checkpoint', 1500)]);
  assert.deepEqual(world.course.ground.map((g) => g.hp), [GROUND_HP.stone, GROUND_HP.pillar, 5, null]);
  assert.ok(GROUND_HP.stone > 0 && GROUND_HP.pillar > GROUND_HP.stone);
  for (const kind of ['stone', 'pillar']) assert.ok(GROUND_SCORE[kind] > 0, kind);
});

test('a pillar is hit across its box, the shot\'s radius counting: a shot at its edge lands, one just past it flies on', () => {
  const [w, h, r] = [120, 200, 5];
  for (const [dx, hit] of [[w / 2 - 1, true], [w / 2 + r - 1, true], [w / 2 + r + 1, false]]) {
    const world = arena([stand('pillar', MID_X, ROW, { w, h })]);
    const g = world.course.ground[0];
    world.shots.push(shot(g.x + dx, g.y + h / 2 + 8, { r }));
    step(world);
    assert.equal(g.hp, hit ? GROUND_HP.pillar - 1 : GROUND_HP.pillar, `dx ${dx}`);
  }
});

test('a round object is hit from GROUND_R and the shot\'s radius; a shot a pixel further flies on', () => {
  const r = 5;
  for (const [dx, hit] of [[GROUND_R + r - 1, true], [GROUND_R + r + 1, false]]) {
    const world = arena([stand('turret', MID_X, ROW, { hp: 9 })]);
    const g = world.course.ground[0];
    world.shots.push(shot(g.x + dx, g.y + 8, { r }));
    step(world);
    assert.equal(g.hp, hit ? 8 : 9, `dx ${dx}`);
  }
});

test('a shot that crosses an object in one move hits it: the path counts, not where the shot ends', () => {
  const world = arena([stand('stone', MID_X)]);
  const g = world.course.ground[0];
  world.shots.push(shot(g.x, g.y + 5 * GROUND_R, { vy: -1400 * 20 }));
  step(world);
  assert.equal(g.hp, GROUND_HP.stone - 1);
});

test('a shot is spent on the nearest of two objects in its path, the one behind is not touched', () => {
  const world = arena([stand('stone', MID_X, ROW - 200), stand('turret', MID_X, ROW, { hp: 9 })]);
  const [far, near] = world.course.ground;
  world.shots.push(shot(MID_X, ROW + 700, { vy: -1400 * 40 }));
  step(world);
  assert.deepEqual([near.hp, far.hp], [8, GROUND_HP.stone]);
});

test('an air craft in the path takes the shot first, and the ground behind it is not hurt', () => {
  const world = arena([stand('turret', MID_X, ROW, { hp: 9 })]);
  const craft = addAlien(world, MID_X, ROW + 40, { hp: 5 });
  shotAt(world, craft);
  step(world);
  assert.deepEqual([craft.hp, world.course.ground[0].hp], [4, 9]);
});

test('a lantern lets the shot pass: it flies on, and the lantern is whole', () => {
  const world = arena([stand('checkpoint', MID_X)]);
  const g = world.course.ground[0];
  shotAt(world, g);
  step(world, 3);
  assert.ok(world.shots.length === 1 && world.shots[0].y < g.y, 'the shot flew on past');
  assert.deepEqual([g.hp, g.reached, world.score], [null, false, 0]);
  assert.deepEqual(ofType(drain(world), 'groundHit'), []);
});

test('the rock is no enemy: a shot that crosses the wall flies on', () => {
  const world = flight([], { speed: 0, walls: [[0, 700, 1200]] });
  step(world);
  world.shots.push(shot(300, 500));
  step(world, 2);
  assert.equal(world.shots.length, 1);
  assert.ok(world.shots[0].y < 500 - 20);
});

test('an object above the top edge, which the player cannot see, takes nothing', () => {
  const world = arena([stand('turret', MID_X, -40, { hp: 9 })]);
  const g = world.course.ground[0];
  world.shots.push(shot(g.x, 20));
  step(world);
  assert.equal(g.hp, 9);
});

test('a broken pillar no longer rams: the shot that breaks it saves the ship that stands in it', () => {
  const [control, fired] = [false, true].map((fire) => {
    const world = arena([stand('pillar', MID_X, SHIP_Y, { w: 100, h: 100, hp: 1 })]);
    world.ship.invuln = 0;
    if (fire) world.shots.push(shot(MID_X, SHIP_Y + 60));
    step(world);
    return world;
  });
  assert.deepEqual([control.hits, control.course.ground.length], [1, 1], 'a standing pillar rams');
  assert.deepEqual([fired.hits, fired.course.ground.length], [0, 0], 'a broken one does not');
});

test('a trident bolt hurts every object its path crossed, once, and flies on', () => {
  const world = arena([stand('stone', MID_X, ROW, { hp: 9 }), stand('turret', MID_X, ROW - 150, { hp: 9 })]);
  const [a, b] = world.course.ground;
  world.shots.push(shot(MID_X, ROW + 700, { vy: -1400 * 40, r: 7, dmg: 2, trident: true, pierced: [] }));
  step(world);
  assert.deepEqual([a.hp, b.hp, world.shots.length], [7, 7, 1]);
  Object.assign(world.shots[0], { y: ROW + 10, vy: -1400 });
  step(world);
  assert.equal(a.hp, 7, 'the bolt has hurt it already');
});

test('the beam wears down every object in its column at BEAM_DPS and stops at nothing, a lantern excepted', () => {
  const column = (kind, y, o = {}) => stand(kind, MID_X + 5, y, { hp: BIG, ...o });
  const world = arena([column('stone', ROW + 150), hold({ at: SPAWN_Y - ROW, targets: [{ x: MID_X - 30, dy: 0, hp: BIG }] }), column('checkpoint', ROW - 150, { hp: undefined }),
    stand('turret', MID_X + 400, ROW, { hp: BIG }), column('turret', SHIP_Y + 60)], LASER);
  const [stone, gate, lantern, aside, below] = world.course.ground;
  step(world, 60, FIRE);
  assert.ok(world.ship.beam);
  for (const o of [stone, gate]) assert.ok(Math.abs(BIG - o.hp - BEAM_DPS) <= 1, `${o.kind} lost ${BIG - o.hp}`);
  assert.deepEqual([lantern.hp, aside.hp, below.hp], [null, BIG, BIG], 'a lantern, one beside the column and one below the muzzle are not touched');
  assert.equal(world.shots.length, 0, 'the laser fires no shots');
});

// Steady fire from the ship's own gun at a target 150 px above its muzzle: the seconds until the ground is clear of it.
function secondsToBreak(spawns) {
  const world = arena(spawns);
  let n = 0;
  while (world.course.ground.length > 0 && n < 60 * 20) {
    step(world, 1, FIRE);
    n++;
  }
  return n * TICK;
}

test('steady fire breaks each kind in about the seconds BREAK_SECS names', () => {
  const y = SHIP_Y - MUZZLE - 150;
  const cases = {
    stone: [stand('stone', MID_X, y)],
    turret: [stand('turret', MID_X, y, { hp: hpFor('turret') })],
    pillar: [stand('pillar', MID_X, y, { w: 100, h: 100 })],
    gate: [hold({ at: SPAWN_Y - y, targets: [{ x: MID_X, dy: 0, hp: hpFor('gate') }] })],
  };
  for (const [kind, spawns] of Object.entries(cases)) {
    const secs = secondsToBreak(spawns);
    assert.ok(Math.abs(secs - BREAK_SECS[kind]) <= 0.25, `a ${kind} took ${secs.toFixed(2)} s, not about ${BREAK_SECS[kind]}`);
  }
});
