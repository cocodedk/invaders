import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEIGHT, EPS } from '../../src/core/kinds.js';
import { SHIP_R, LIVES } from '../../src/core/ship.js';
import { SPAWN_Y } from '../../src/core/course-kinds.js';
import { scaled } from '../../src/core/difficulty.js';
import { MAX_BULLETS } from '../../src/core/aliens.js';
import { emitPattern, BULLET_R, CURTAIN_W, CURTAIN_GAP, CURTAIN_N, CURTAIN_SPEED, CURTAIN_LIFE } from '../../src/core/patterns.js';
import { LINE_INK, LINE_STEP } from '../../src/core/course-line.js';
import { pathPos, AIR_MARGIN, HANG_Y, HANG_VY, HANG_SECS, HANG_ARRIVE, CURTAIN_WIND, CURTAIN_COOL } from '../../src/core/course-air.js';
import { TICK, FIRE, step, seconds, drain, ofType } from './world-kit.js';
import { air, flight, launched, col, until } from './course-kit.js';
import { Y, lineWorld, put } from './course-line-kit.js';

// The Smudge (world 22, Leg 2): a Hush that drifts down out of the canopy, hangs near the top of the band and drops curtains of fire (a
// 'hang' air craft firing the 'curtain' pattern), and the curtain itself.
const smudge = (o = {}) => air({ role: 'u', path: 'hang', pattern: 'curtain', ...o });
const CURTAINS = Math.floor((HANG_SECS - CURTAIN_WIND) / CURTAIN_COOL) + 1; // curtains a Smudge drops in one hang
const LEAVE = HANG_ARRIVE + HANG_SECS; // s after spawning that it goes on down
const fall = (d) => (HEIGHT - HANG_Y) / (scaled(d).bulletSpeed * CURTAIN_SPEED); // s a curtain takes to fall from where it hangs to the bottom edge

test('a curtain is a straight row of CURTAIN_N small slow bullets, CURTAIN_GAP apart and centred on its emitter, all falling straight down', () => {
  const from = { x: 700, y: HANG_Y };
  const rng = { s: 1 };
  const speed = 400;
  const row = emitPattern('curtain', from, { x: 0, y: 0 }, { speed }, rng);
  assert.equal(row.length, CURTAIN_N);
  assert.equal(rng.s, 1, 'it draws nothing from the rng');
  row.forEach((b, i) => {
    assert.deepEqual([b.pattern, b.y, b.vx, b.vy, b.r, b.life], ['curtain', from.y, 0, speed * CURTAIN_SPEED, BULLET_R, CURTAIN_LIFE], `bullet ${i}`);
    if (i > 0) assert.equal(b.x - row[i - 1].x, CURTAIN_GAP, `${i - 1} and ${i} are one gap apart`);
  });
  assert.ok(Math.abs((row[0].x + row.at(-1).x) / 2 - from.x) < EPS, 'centred on the emitter');
  const width = row.at(-1).x - row[0].x;
  assert.ok(width <= CURTAIN_W && width > CURTAIN_W - CURTAIN_GAP, 'CURTAIN_W wide, to the gap');
});

test('the curtain can be shot through but not slipped through, and one stroke of the line covers one', () => {
  assert.ok(CURTAIN_GAP <= SHIP_R + BULLET_R, 'one bullet cut leaves the ship touching its neighbours');
  assert.ok((3 * CURTAIN_GAP) / 2 > SHIP_R + BULLET_R, 'two side by side cut leave a way through: the middle of the hole is clear of both neighbours');
  assert.ok(CURTAIN_W <= LINE_INK);
});

// A curtain put over a ship parked under its middle bullet, with the gun held down: the first shots cut the middle bullet away. The row's
// ink, when given, lies across it (a stroke laid by hand: nothing draws it, the ship never moves). The world runs until the curtain has
// fallen past the ship, and a second more.
const SHIP_Y = 1000;
const CURTAIN_Y = 600; // where the curtain starts, above the stroke's row Y
function curtainOnShip(ink) {
  const world = lineWorld();
  put(world, col(0.5), SHIP_Y);
  world.ship.invuln = 0;
  const { bulletSpeed } = world.scale;
  world.bullets.push(...emitPattern('curtain', { x: world.ship.x, y: CURTAIN_Y }, world.ship, { speed: bulletSpeed }, world.rng));
  if (ink) {
    for (let x = world.ship.x - CURTAIN_W / 2 - LINE_STEP; x < world.ship.x + CURTAIN_W / 2 + LINE_STEP; x += LINE_STEP) {
      world.course.line.push({ x1: x, y1: Y, x2: x + LINE_STEP, y2: Y, t: 0 });
    }
  }
  drain(world);
  seconds(world, (SHIP_Y - CURTAIN_Y) / (bulletSpeed * CURTAIN_SPEED) + 1, FIRE);
  return { world, events: drain(world) };
}

test('a ship under a curtain\'s middle bullet is hit, though its gun cuts that bullet: one hole is too narrow', () => {
  const { world, events } = curtainOnShip(false);
  assert.ok(ofType(events, 'cut').length > 0, 'the gun cut the middle bullet');
  assert.equal(world.ship.lives, LIVES - 1);
});

test('the same ship with a stroke of the line above it, across the curtain, is not', () => {
  const { world, events } = curtainOnShip(true);
  assert.ok(ofType(events, 'lineStop').length > 0, 'the line stopped bullets');
  assert.equal(world.ship.lives, LIVES);
});

test('pathPos hang: falls to HANG_Y by HANG_ARRIVE, holds it for HANG_SECS, then goes on down at HANG_VY; x never moves', () => {
  const x0 = col(0.3);
  assert.deepEqual(pathPos('hang', 0, x0), { x: x0, y: SPAWN_Y }, 'it starts where it spawns');
  assert.equal(pathPos('hang', 1, x0).y, SPAWN_Y + HANG_VY, 'falling at HANG_VY');
  assert.equal(pathPos('hang', HANG_ARRIVE, x0).y, HANG_Y, 'at HANG_Y on arriving');
  for (const t of [HANG_ARRIVE, HANG_ARRIVE + HANG_SECS / 2, LEAVE]) assert.equal(pathPos('hang', t, x0).y, HANG_Y, `still at ${t}`);
  assert.equal(pathPos('hang', LEAVE + 1, x0).y, HANG_Y + HANG_VY, 'then on down at HANG_VY');
  for (const t of [0, HANG_ARRIVE / 2, HANG_ARRIVE, LEAVE, LEAVE + 10]) assert.equal(pathPos('hang', t, x0).x, x0);
});

test('a hang craft is retired silently once it is off the bottom', () => {
  const world = launched([smudge({ x: col(0.2) })]);
  const a = world.aliens[0];
  drain(world);
  assert.ok(until(world, () => world.aliens.length === 0), 'it goes');
  const goneAt = LEAVE + (HEIGHT + AIR_MARGIN - HANG_Y) / HANG_VY;
  assert.ok(a.t >= goneAt && a.t < goneAt + TICK + EPS, 'when its y passes the margin');
  assert.deepEqual([world.score, ofType(drain(world), 'kill').length], [0, 0]);
});

test('a Smudge fires only while it hangs: its first curtain CURTAIN_WIND after arriving, then every CURTAIN_COOL, whatever fire()\'s roll would say', () => {
  const world = flight([smudge({ x: col(0.2) })], { fireMult: 1e6 }); // as fire() rolls, a craft this eager would shoot every tick
  step(world);
  const a = world.aliens[0];
  drain(world);
  const fires = [];
  while (world.aliens.length) {
    step(world);
    for (const e of ofType(drain(world), 'fire')) {
      const fresh = world.bullets.filter((b) => b.pattern === 'curtain' && b.y === HANG_Y);
      fires.push({ t: a.t, e, fresh: fresh.length });
    }
  }
  assert.equal(fires.length, CURTAINS);
  fires.forEach(({ t, e, fresh }, k) => {
    const due = HANG_ARRIVE + CURTAIN_WIND + k * CURTAIN_COOL;
    assert.ok(t >= due - EPS && t < due + TICK + EPS, `curtain ${k} came at ${t}, due ${due}`);
    assert.deepEqual([e.side, e.id, e.role, e.pattern, e.x, e.y], ['enemy', a.id, 'gunner', 'curtain', a.x, HANG_Y]);
    assert.equal(fresh, CURTAIN_N, 'a whole curtain');
  });
});

test('a hang craft that shares its pattern with another craft is still left out of fire()\'s roll', () => {
  const spawns = [smudge({ x: col(0.2), pattern: 'aimed' }), air({ role: 'u', path: 'swoop', x: col(0.8), pattern: 'aimed' })];
  const world = flight(spawns, { fireMult: 1e6 }); // the swoop shoots every tick it is on screen; the Smudge, if it were rolled for, would too
  step(world);
  const hang = world.aliens.find((a) => a.path === 'hang');
  drain(world);
  const mine = [];
  while (hang.t < HANG_ARRIVE + CURTAIN_WIND + CURTAIN_COOL / 2) {
    step(world);
    mine.push(...ofType(drain(world), 'fire').filter((e) => e.id === hang.id));
  }
  assert.equal(mine.length, 1, 'one shot, on its own cadence');
});

// A Smudge's whole hang with the bullet field already holding `filler` bullets that never move: the most it ever held, and the curtains said.
function hangWith(filler) {
  const world = flight([smudge({ x: col(0.2) })]);
  step(world);
  for (let i = 0; i < filler; i++) world.bullets.push({ pattern: 'aimed', x: 5, y: 5, vx: 0, vy: 0, r: BULLET_R, life: 1e6 });
  drain(world);
  let most = 0;
  let said = 0;
  while (world.aliens.length) {
    step(world);
    said += ofType(drain(world), 'fire').length;
    most = Math.max(most, world.bullets.length);
  }
  return { most, said };
}

test('a curtain that finds the field full is lost, and none ever takes the field past MAX_BULLETS', () => {
  assert.deepEqual(hangWith(MAX_BULLETS), { most: MAX_BULLETS, said: 0 });
  const nearly = hangWith(MAX_BULLETS - 3);
  assert.equal(nearly.most, MAX_BULLETS, 'the first curtain that finds room fills it to the brim');
  assert.ok(nearly.said > 0);
});

test('two Smudges hanging side by side, their whole hang, never fill the field on their own', () => {
  const d = 0; // the slowest curtains stay in flight longest
  const world = flight([smudge({ x: col(0.2) }), smudge({ x: col(0.8) })], { d });
  let most = 0;
  while (world.course.next < 2 || world.aliens.length) {
    step(world);
    most = Math.max(most, world.bullets.length);
  }
  const inFlight = Math.min(CURTAINS, Math.ceil(fall(d) / CURTAIN_COOL)); // the most curtains one Smudge has in the air at once
  assert.ok(most >= 2 * CURTAIN_N, 'both dropped curtains');
  assert.ok(most <= 2 * inFlight * CURTAIN_N, 'and no more than their curtains in flight');
  assert.ok(most < MAX_BULLETS);
});

test('stepping a snapshot taken while a Smudge hangs, from the same inputs, gives the same aliens and bullets', () => {
  const world = flight([smudge({ x: col(0.2) })], { fireMult: 20 });
  seconds(world, HANG_ARRIVE + CURTAIN_COOL);
  const copy = structuredClone(world);
  step(world, 300);
  step(copy, 300);
  assert.ok(world.bullets.length > 0);
  assert.deepEqual(copy.aliens, world.aliens);
  assert.deepEqual(copy.bullets, world.bullets);
});
