import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TICK } from '../../src/core/kinds.js';
import { BULLET_HP, CUT_DMG, BEAM_CUT_DPS, CUT_SCORE } from '../../src/core/course-cut.js';
import { TURRET_PATTERN } from '../../src/core/course-ground.js';
import { BEAM_W } from '../../src/core/weapons.js';
import { LASER_WARN, LASER_BEAM } from '../../src/core/patterns.js';
import { bolt, SHOT_SPEED, SHIP_R } from '../../src/core/ship.js';
import { enemyDt } from '../../src/core/twists-2.js';
import { step, shotAt, drain, ofType, FIRE } from './world-kit.js';
import { flight, air } from './course-kit.js';

// Shots break incoming fire in a course (world 22). A bullet stands still at BULLET (r 8, 6 s of life) until a test says
// otherwise, the ship cannot be hurt, the enemy is quiet, and a shot put on a bullet crosses it in one tick.
const BULLET = { x: 600, y: 400 };
const BULLET_R = 8;
const hitsTo = (pattern) => Math.ceil(BULLET_HP[pattern] / CUT_DMG);

function cutWorld(spawns = []) {
  const world = flight(spawns);
  world.ship.invuln = Infinity;
  step(world);
  drain(world);
  return world;
}
function put(world, pattern, x = BULLET.x, y = BULLET.y) {
  const b = { pattern, x, y, vx: 0, vy: 0, r: BULLET_R, life: 6 };
  world.bullets.push(b);
  return b;
}
// One shot onto the bullet, one tick, and what happened in it.
function fireAt(world, b) {
  shotAt(world, b);
  step(world);
  return drain(world);
}
// Shots onto the bullet until it breaks: how many, and every event on the way.
function breakIt(world, b) {
  const events = [];
  let shots = 0;
  while (b.life > 0 && shots < 20) {
    shots++;
    events.push(...fireAt(world, b));
    assert.equal(world.shots.length, 0, 'every shot is spent on the bullet it met');
  }
  return { shots, events };
}

test('every bullet with hit points breaks after BULLET_HP / CUT_DMG shots: a chip for each hit before the last, then a cut', () => {
  assert.ok(BULLET_HP.aimed <= CUT_DMG, 'a small bullet breaks on the first shot');
  assert.ok(BULLET_HP.aimed < BULLET_HP.homing && BULLET_HP.homing < BULLET_HP.heavy, 'a homing bullet takes more, a heavy one most');
  assert.ok(TURRET_PATTERN === 'heavy' && BULLET_HP[TURRET_PATTERN] === Math.max(...Object.values(BULLET_HP)), 'the turrets fire the toughest');
  for (const pattern of Object.keys(BULLET_HP)) {
    const world = cutWorld();
    const b = put(world, pattern);
    const { shots, events } = breakIt(world, b);
    const n = hitsTo(pattern);
    assert.equal(shots, n, pattern);
    const chips = ofType(events, 'chip');
    assert.deepEqual(chips.map((e) => e.hp), Array.from({ length: n - 1 }, (_, i) => BULLET_HP[pattern] - (i + 1) * CUT_DMG), pattern);
    assert.ok(chips.every((e) => e.x === b.x && e.y === b.y && e.pattern === pattern));
    assert.deepEqual(ofType(events, 'cut').map((e) => [e.x, e.y, e.pattern]), [[b.x, b.y, pattern]], pattern);
    assert.ok(b.life === 0 && !world.bullets.includes(b), 'broken: it is dropped with the dead');
  }
});

test('a bullet hurt but not broken stays in the air, carrying its hp', () => {
  const world = cutWorld();
  const b = put(world, 'heavy');
  fireAt(world, b);
  assert.equal(b.hp, BULLET_HP.heavy - CUT_DMG);
  assert.ok(b.life > 0 && world.bullets.includes(b));
});

test('a cut pays CUT_SCORE, outside the combo, and is not a near miss however close to the ship it was', () => {
  const world = cutWorld();
  world.combo = { mult: 5, timer: 1 };
  const score = world.score;
  const b = put(world, 'aimed', world.ship.x, world.ship.y - (BULLET_R + SHIP_R + 3)); // just clear of the ship, inside the band
  step(world);
  assert.equal(typeof b.near, 'number', 'it is inside the near band');
  drain(world);
  const events = fireAt(world, b);
  assert.equal(world.score, score + CUT_SCORE);
  assert.equal(world.combo.mult, 5);
  assert.equal(ofType(events, 'cut').length + ofType(events, 'nearMiss').length, 1, 'a cut and no near miss');
});

test('a shot breaks a bullet it touches, and not one it passes by or one it reaches after it ran out of life', () => {
  const reach = BULLET_R + bolt(0, 0, 0, 0).r; // the bullet's radius and the shot's
  for (const [dx, life, cut, flies] of [[reach - 1, 1, true, false], [reach + 1, 1, false, true], [0, TICK / 2, false, false]]) {
    const world = cutWorld();
    const b = put(world, 'aimed');
    const shot = { ...bolt(b.x + dx, b.y + 10, 0, -SHOT_SPEED), life };
    world.shots.push(shot);
    step(world);
    assert.equal(b.life <= 0, cut, `dx ${dx}, life ${life}`);
    assert.equal(world.shots.includes(shot), flies, 'a shot that broke a bullet, or ran out, is gone; one that missed flies on');
  }
});

test('a bullet that crossed the shot\'s path within the tick was met, wherever it ended; one that flew away from it was not, in bullet time too', () => {
  const run = 50; // px it flies sideways in one tick: across the shot's column, or off from just outside its reach
  const reach = BULLET_R + bolt(0, 0, 0, 0).r;
  for (const [kind, dx, cut] of [[null, -run / 2, true], ['slow', -run / 2, true], ['slow', reach + 2, false]]) {
    const world = cutWorld();
    world.ship.power = kind && { kind, left: 60 };
    const b = put(world, 'aimed', BULLET.x + dx, BULLET.y);
    b.vx = run / enemyDt(world, TICK);
    const shot = bolt(BULLET.x, BULLET.y + 10, 0, -SHOT_SPEED);
    world.shots.push(shot);
    step(world);
    assert.ok(b.x - BULLET.x > reach, 'it ended well clear of the column');
    assert.deepEqual([b.life <= 0, !world.shots.includes(shot)], [cut, cut]);
  }
});

test('two shots in one tick cannot both spend themselves on one bullet that the first broke', () => {
  const world = cutWorld();
  const b = put(world, 'aimed');
  shotAt(world, b);
  shotAt(world, b);
  step(world);
  assert.equal(ofType(drain(world), 'cut').length, 1);
  assert.equal(world.shots.length, 1, 'the second flew on');
});

test('an enemy laser cannot be shot: the shot flies through, the beam stands', () => {
  const world = cutWorld();
  const beam = { pattern: 'laser', x: BULLET.x, y: BULLET.y, vx: 0, vy: 1, r: 9, life: LASER_WARN + LASER_BEAM, warn: 0 };
  world.bullets.push(beam);
  shotAt(world, beam);
  step(world);
  assert.deepEqual(drain(world).filter((e) => e.type === 'cut' || e.type === 'chip'), []);
  assert.equal(world.shots.length, 1);
  assert.ok(beam.life > 0 && beam.hp === undefined);
});

test('a shot is spent on a bullet that lies before an air craft on its path, and on the air craft when the bullet lies beyond it or on its very centre', () => {
  const START = 10; // px below the craft's centre the shot starts from
  const GAP = 12; // px the bullet lies off the craft's centre along the shot's path, nearer the start or beyond
  for (const [offset, bulletFirst] of [[GAP, true], [-GAP, false], [0, false]]) {
    const world = cutWorld([air({ role: 'a' })]);
    step(world, 30);
    drain(world);
    const [a] = world.aliens;
    const hp = a.hp;
    const b = put(world, 'aimed', a.x, a.y + offset);
    const shot = bolt(a.x, a.y + START, 0, -SHOT_SPEED);
    world.shots.push(shot);
    step(world);
    const events = drain(world);
    assert.equal(world.shots.includes(shot), false, 'the shot is spent on one of them');
    assert.equal(b.life <= 0, bulletFirst, `the bullet at ${offset}`);
    assert.equal(a.hp < hp, !bulletFirst, 'the air craft');
    assert.equal(ofType(events, 'cut').length, bulletFirst ? 1 : 0);
  }
});

test('the laser beam wears a bullet in its column down: a heavy one breaks after about BULLET_HP / BEAM_CUT_DPS s, a chip for each point on the way', () => {
  const world = cutWorld();
  world.ship.power = { kind: 'laser', left: 60 };
  const b = put(world, 'heavy', world.ship.x, BULLET.y);
  const events = [];
  let ticks = 0;
  while (b.life > 0 && ticks < 600) {
    step(world, 1, FIRE);
    ticks++;
    events.push(...drain(world));
  }
  assert.ok(Math.abs(ticks * TICK - BULLET_HP.heavy / BEAM_CUT_DPS) <= 2 * TICK, `${ticks} ticks`);
  assert.deepEqual(ofType(events, 'chip').map((e) => e.hp), Array.from({ length: hitsTo('heavy') - 1 }, (_, i) => BULLET_HP.heavy - (i + 1)));
  assert.equal(ofType(events, 'cut').length, 1);
  assert.equal(world.score, CUT_SCORE);
});

test('the beam leaves alone what is outside its column, below the muzzle, or an enemy laser, and off when fire is not held', () => {
  const world = cutWorld();
  world.ship.power = { kind: 'laser', left: 60 };
  const { x, y } = world.ship;
  const reach = BEAM_W / 2 + BULLET_R;
  const clear = [
    put(world, 'heavy', x + reach + 1, BULLET.y),
    put(world, 'heavy', x - reach - 1, BULLET.y),
    put(world, 'heavy', x, y + BULLET_R + SHIP_R + 20), // below the muzzle, clear of the ship
    { pattern: 'laser', x, y: BULLET.y, vx: 0, vy: 1, r: 9, life: 10, warn: 0 },
  ];
  world.bullets.push(clear.at(-1));
  const edge = put(world, 'heavy', x - reach + 1, BULLET.y - 200);
  step(world, Math.ceil(2 * BULLET_HP.heavy / BEAM_CUT_DPS / TICK), FIRE);
  for (const b of clear) assert.ok(b.life > 0 && b.hp === undefined && b.burn === undefined);
  assert.ok(edge.life <= 0, 'one just inside the column is worn down');
  const quiet = cutWorld();
  quiet.ship.power = { kind: 'laser', left: 60 };
  const idle = put(quiet, 'heavy', quiet.ship.x, BULLET.y);
  step(quiet, 60);
  assert.ok(idle.life > 0 && idle.hp === undefined);
});
