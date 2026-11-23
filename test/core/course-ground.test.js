import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEIGHT } from '../../src/core/kinds.js';
import { SPAWN_Y } from '../../src/core/course-kinds.js';
import { TURRET_COOL, TURRET_PATTERN, GROUND_SCORE, hurtGround } from '../../src/core/course-ground.js';
import { HEAVY_SPEED } from '../../src/core/patterns.js';
import { COMBO_WINDOW } from '../../src/core/scoring.js';
import { makePickup } from '../../src/core/powerups.js';
import { enemyDt } from '../../src/core/twists-2.js';
import { step, shotAt, drain, ofType, gunTicks, TICK } from './world-kit.js';
import { flight, launched } from './course-kit.js';

// A turret spends two cooldowns above the top edge, then a long time on screen (a slow scroll, derived).
const SPEED = -SPAWN_Y / (2 * TURRET_COOL);
const turret = (at = 0, x = 900) => ({ kind: 'turret', at, x, hp: 3 });
const crate = (drop, at = 0) => ({ kind: 'crate', at, x: 900, hp: 2, drop });
const SHOTS = 4;

// A turret world: the ship cannot be hurt (the shots are about the turret), the turret just spawned above the top edge.
function turretWorld(spawns = [turret()]) {
  const world = launched(spawns, { speed: SPEED });
  world.ship.invuln = Infinity;
  return world;
}
// Step until the turret is on screen; returns the number of ticks that took.
function untilSeen(world) {
  let n = 0;
  while (world.course.ground[0].y < 0) { step(world); n++; }
  return n;
}
const untilY = (world, y) => { while (world.course.ground[0].y < y) step(world); };
// The ticks (counted from the one the turret came on screen, as 1) of the next `n` enemy shots, with the bullet each made.
function shotsOf(world, n) {
  const seen = new WeakSet(world.bullets);
  const out = [];
  for (let tick = 1; out.length < n; tick++) {
    step(world);
    for (const b of world.bullets) if (!seen.has(b)) { seen.add(b); out.push({ tick, b, g: { ...world.course.ground[0] } }); }
  }
  return out;
}

test('a turret above the top edge never fires, though more than a whole cooldown goes by; it comes on screen with its cooldown full', () => {
  const world = turretWorld();
  const g = world.course.ground[0];
  assert.ok(g.y < 0 && g.cool === TURRET_COOL);
  const hidden = untilSeen(world);
  assert.ok(hidden > gunTicks(TURRET_COOL), 'it was out of sight for longer than a cooldown');
  assert.equal(world.bullets.length, 0);
  assert.equal(g.cool, TURRET_COOL - TICK, 'and the tick it appears is the first the timer counts');
});

test('a turret on screen fires every TURRET_COOL, the first shot a whole cooldown after it appears, with no rng', () => {
  const world = turretWorld();
  const rng = world.rng.s;
  untilSeen(world);
  const shots = shotsOf(world, SHOTS);
  const n = gunTicks(TURRET_COOL);
  assert.equal(shots[0].tick, n - 1, 'the tick it appeared counts, so the first shot is n ticks in');
  shots.slice(1).forEach((s, i) => assert.equal(s.tick - shots[i].tick, n, 'then one every cooldown'));
  assert.equal(world.rng.s, rng, 'no draw on the way');
});

test('the shot is the turret pattern, aimed at the ship, from the turret, at the heavy shot\'s share of the world bullets\' speed', () => {
  const world = turretWorld();
  untilSeen(world);
  const { b, g } = shotsOf(world, 1)[0];
  const { ship, scale } = world;
  assert.equal(b.pattern, TURRET_PATTERN);
  assert.deepEqual([b.x, b.y], [g.x, g.y]);
  const speed = scale.bulletSpeed * HEAVY_SPEED;
  assert.ok(Math.abs(Math.hypot(b.vx, b.vy) - speed) < 1e-6);
  const dist = Math.hypot(ship.x - g.x, ship.y - g.y);
  assert.ok(Math.abs(b.vx / speed - (ship.x - g.x) / dist) < 1e-9);
  assert.ok(Math.abs(b.vy / speed - (ship.y - g.y) / dist) < 1e-9);
});

test('a turret that has sunk below the bottom edge no longer fires, though its timer is up', () => {
  const world = turretWorld();
  untilY(world, HEIGHT + 1);
  const before = new Set(world.bullets);
  world.course.ground[0].cool = 0;
  step(world);
  assert.ok(world.bullets.every((b) => before.has(b)), 'no new bullet');
});

test('bullet time slows the turret timer', () => {
  const [slowed, normal] = [0, 1].map(() => turretWorld());
  slowed.ship.power = { kind: 'slow', left: Infinity };
  assert.ok(enemyDt(slowed, TICK) < TICK && enemyDt(normal, TICK) === TICK);
  for (const w of [slowed, normal]) { untilSeen(w); step(w, 30); }
  const [s, n] = [slowed, normal].map((w) => TURRET_COOL - w.course.ground[0].cool);
  assert.ok(Math.abs(s - (n * enemyDt(slowed, TICK)) / TICK) < 1e-9, 'it counted in the slowed time');
});

test('a crate fires nothing, however long it is on screen', () => {
  const world = turretWorld([crate(null)]);
  untilY(world, HEIGHT / 2);
  assert.equal(world.bullets.length, 0);
  assert.equal(world.course.ground[0].cool, undefined, 'it has no timer');
});

test('a ship shot hurts a turret by a point and is spent, and breaks nothing yet (course-shots.test.js has the rest)', () => {
  const world = turretWorld();
  untilY(world, HEIGHT / 2);
  drain(world);
  const g = world.course.ground[0];
  shotAt(world, g);
  step(world);
  assert.deepEqual([g.hp, world.shots.length, world.score], [2, 0, 0]);
  assert.deepEqual(world.events.map((e) => [e.type, e.kind]), [['groundHit', 'turret']]);
});

test('hurtGround takes hp off a turret; at 0 it scores, says so, and the broken turret is gone next tick', () => {
  const world = turretWorld();
  untilSeen(world);
  drain(world);
  const g = world.course.ground[0];
  hurtGround(world, g, 1);
  assert.deepEqual([g.hp, world.score], [2, 0]);
  assert.deepEqual(drain(world), [{ type: 'groundHit', tick: world.tick, kind: 'turret', x: g.x, y: g.y }], 'a hit that leaves it standing');
  hurtGround(world, g, 99);
  assert.equal(g.hp, 0, 'hp stops at 0');
  assert.equal(world.score, GROUND_SCORE.turret);
  assert.deepEqual(drain(world), [{ type: 'groundKill', tick: world.tick, kind: 'turret', x: g.x, y: g.y, score: GROUND_SCORE.turret, mult: 1 }]);
  hurtGround(world, g, 1);
  assert.deepEqual([world.score, world.events.length], [GROUND_SCORE.turret, 0], 'a broken one is not broken twice');
  step(world, 2 * gunTicks(TURRET_COOL));
  assert.deepEqual([world.course.ground.length, world.bullets.length], [0, 0]);
});

test('ground kills share the combo with the aliens: the second inside the window is worth double', () => {
  const world = launched([turret(), crate(null, 1)]);
  const [a, b] = world.course.ground;
  hurtGround(world, a, a.hp);
  assert.deepEqual([world.combo.mult, world.combo.timer], [1, COMBO_WINDOW]);
  hurtGround(world, b, b.hp);
  assert.equal(world.combo.mult, 2);
  assert.equal(world.score, GROUND_SCORE.turret + 2 * GROUND_SCORE.crate);
});

test('a crate drops the pickup it holds where it broke, and nothing until it breaks', () => {
  for (const drop of ['bomb', 'life']) {
    const world = launched([crate(drop)]);
    const g = world.course.ground[0];
    hurtGround(world, g, 1);
    assert.equal(world.pickups.length, 0);
    hurtGround(world, g, 1);
    assert.deepEqual(world.pickups, [makePickup(drop, g.x, g.y)]);
    assert.equal(world.score, GROUND_SCORE.crate);
  }
});

test('a crate with no drop of its own drops a random pickup there, on the world rng', () => {
  const world = launched([crate(null)]);
  const g = world.course.ground[0];
  assert.equal(g.drop, null);
  const rng = world.rng.s;
  hurtGround(world, g, g.hp);
  assert.equal(world.pickups.length, 1);
  assert.deepEqual([world.pickups[0].x, world.pickups[0].y], [g.x, g.y]);
  assert.notEqual(world.rng.s, rng);
});

test('a lantern cannot be hurt, and stays on the ground; a stone and a pillar are hurt like any target and pay when they break', () => {
  const world = flight(['stone', 'pillar', 'checkpoint'].map((kind, i) => ({ kind, at: i, x: 800 + i, w: 50, h: 50 })));
  step(world, 4);
  const [stone, pillar, lantern] = world.course.ground;
  const before = structuredClone(lantern);
  hurtGround(world, lantern, 99);
  assert.deepEqual([lantern, world.score, world.events.length, world.combo.timer], [before, 0, 0, 0]);
  for (const g of [stone, pillar]) hurtGround(world, g, g.hp);
  assert.equal(world.score, GROUND_SCORE.stone + 2 * GROUND_SCORE.pillar, 'the second kill of the combo is worth double');
  step(world);
  assert.deepEqual(world.course.ground, [lantern], 'only the lantern is left');
});

test('only a turret and a crate hold more than the plain ground object', () => {
  const world = flight([{ kind: 'stone', at: 0, x: 700 }, turret(0), crate(null, 0)]);
  step(world);
  const [stone, t, c] = world.course.ground;
  assert.deepEqual(Object.keys(stone).sort(), ['at', 'hp', 'id', 'kind', 'x', 'y']);
  assert.deepEqual([t.cool, c.drop], [TURRET_COOL, null]);
});

test('a turret mid-cooldown survives a snapshot: the copy fires on the same ticks', () => {
  const world = turretWorld();
  untilSeen(world);
  step(world, 40);
  const copy = structuredClone(world);
  step(world, 3 * gunTicks(TURRET_COOL));
  step(copy, 3 * gunTicks(TURRET_COOL));
  assert.deepEqual(copy.bullets, world.bullets);
  assert.ok(world.bullets.length > 0);
});
