import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShip, COOLDOWN } from '../../src/core/ship.js';
import { BROADSIDE_TIME } from '../../src/core/powerups.js';
import { WIDTH } from '../../src/core/kinds.js';
import { part } from './boss-kit.js';
import {
  TICK, gunTicks, FIRE, level, wave, step, seconds, playing, drain, ofType, pickupOnShip, holdAlien,
} from './world-kit.js';

// World 13's twist: any pickup caught (a power, a bomb or a life) opens the ship's side guns for 6 s,
// another catch resets the time, and while they are open every volley also sends one shot straight
// out of each side, level with the ship.

const w13 = () => level([wave({ rows: 1, cols: 3, roles: ['grunt'] })], 0, { world: 13, twist: 'broadside' });
const side = (w) => w.shots.filter((s) => s.broadside);
const fresh = (w) => w.shots.filter((s) => s.life === 1.5);
// A world that cannot be cleared by firing, with the ship's lives short of full so a life can be caught.
const lurking = () => {
  const w = playing(w13());
  holdAlien(w, 100, 300, 1e6);
  w.ship.lives = 2;
  return w;
};

test('a fresh ship has its side guns shut, and fires only up', () => {
  assert.equal(createShip().broadside, 0);
  const w = lurking();
  step(w, 1, FIRE);
  assert.equal(w.ship.broadside, 0);
  assert.equal(fresh(w).length, 1);
  assert.equal(side(w).length, 0);
});

test('catching any pickup, a power, a bomb or a life, opens them for 6 s and says so', () => {
  assert.equal(BROADSIDE_TIME, 6);
  for (const kind of ['rapid', 'wingmen', 'bomb', 'life']) {
    const w = lurking();
    pickupOnShip(w, kind);
    step(w);
    assert.equal(w.ship.broadside, 6, kind);
    const [open] = ofType(drain(w), 'broadside');
    assert.deepEqual([open.on, open.left, open.x, open.y], [true, 6, w.ship.x, w.ship.y], kind);
  }
});

test('another catch sets the time back to 6 s, and says so again', () => {
  const w = lurking();
  pickupOnShip(w, 'bomb');
  step(w);
  seconds(w, 4);
  assert.ok(Math.abs(w.ship.broadside - 2) < 0.05, `${w.ship.broadside} s left`);
  drain(w);
  pickupOnShip(w, 'life');
  step(w);
  assert.equal(w.ship.broadside, 6, 'back to a full 6 s, not 6 + 2');
  assert.equal(ofType(drain(w), 'broadside').filter((e) => e.on).length, 1);
});

test('they stay open for 6 s from the catch and then shut, once, with an event', () => {
  const w = lurking();
  pickupOnShip(w, 'bomb');
  step(w);
  const caught = w.tick;
  let shut = null;
  const sizes = [];
  for (let i = 0; i < 60 * 8; i++) {
    step(w, 1, FIRE);
    const n = fresh(w).length;
    if (n) sizes.push(n);
    for (const e of drain(w)) if (e.type === 'broadside' && !e.on) shut = (e.tick - caught) * TICK;
  }
  assert.ok(Math.abs(shut - 6) < 0.05, `they shut ${shut} s after the catch`);
  assert.equal(w.ship.broadside, 0);
  const open = sizes.indexOf(1);
  const volleys = 6 / (gunTicks(COOLDOWN) * TICK);
  assert.ok(open >= volleys - 1 && open <= volleys + 1, `${open} volleys in 6 s at ${gunTicks(COOLDOWN)} ticks each`);
  assert.ok(sizes.slice(0, open).every((n) => n === 3), 'ship, left, right while open');
  assert.ok(sizes.slice(open).every((n) => n === 1), 'the ship alone after');
});

test('a catch outside world 13 opens nothing', () => {
  const w = playing(level([wave({ rows: 1, cols: 3, roles: ['grunt'] })], 0, { world: 12, twist: 'glitch' }));
  holdAlien(w, 100, 300, 1e6);
  pickupOnShip(w, 'rapid');
  step(w, 1, FIRE);
  assert.equal(w.ship.broadside, 0);
  assert.equal(ofType(drain(w), 'broadside').length, 0);
});

test('a volley fires one shot straight left and one straight right, from the ship\'s sides, level with it', () => {
  const w = lurking();
  pickupOnShip(w, 'bomb');
  step(w);
  Object.assign(w.ship, { x: 900, y: 800 });
  drain(w);
  step(w, 1, FIRE);
  const [l, r] = side(w);
  assert.deepEqual([l.broadside, l.x, l.y, l.vx, l.vy], [-1, 878, 800, -1400, 0]);
  assert.deepEqual([r.broadside, r.x, r.y, r.vx, r.vy], [1, 922, 800, 1400, 0]);
  for (const s of [l, r]) assert.deepEqual([s.pattern, s.r, s.dmg, s.life], ['shot', 5, 1, 1.5]);
  assert.equal(fresh(w).length, 3, 'with the shot up');
  const ev = drain(w);
  assert.deepEqual(ofType(ev, 'sideShot').map((e) => [e.dir, e.x, e.y]), [[-1, 878, 800], [1, 922, 800]]);
  assert.equal(ofType(ev, 'fire').length, 1, 'still one fire event for the volley');
});

test('the side guns open on top of any power: spread and rapid each add their one shot a side', () => {
  const w = lurking();
  pickupOnShip(w, 'spread');
  step(w);
  step(w, 1, FIRE);
  assert.equal(fresh(w).length, 5 + 2, 'five up and two out');
  assert.equal(side(w).length, 2);
});

test('side shots die at the edges of the field, not at the end of their life', () => {
  const w = lurking();
  pickupOnShip(w, 'bomb');
  step(w);
  Object.assign(w.ship, { x: 1000, y: 800, cooldown: 0 });
  step(w, 1, FIRE);
  assert.equal(side(w).length, 2);
  seconds(w, 0.3);
  assert.equal(side(w).length, 2, 'still crossing the field');
  seconds(w, 0.5); // the left one has gone off at 0.7 s, the right one at 0.68 s: both well before 1.5 s of life
  assert.equal(side(w).length, 0);
  assert.equal(w.shots.filter((s) => s.x < -60 || s.x > WIDTH + 60).length, 0);
});

test('at the very edge a side shot leaves at once', () => {
  const w = lurking();
  pickupOnShip(w, 'bomb');
  step(w);
  Object.assign(w.ship, { x: 40, y: 800, cooldown: 0 });
  step(w, 1, FIRE);
  const [l] = side(w);
  assert.equal(l.x, 18);
  seconds(w, 0.1);
  assert.ok(!side(w).some((s) => s.vx < 0), 'the left one is gone');
  assert.ok(side(w).some((s) => s.vx > 0), 'the right one is still crossing');
});

test('a side shot hits the alien it meets, like any shot', () => {
  const w = lurking();
  const a = holdAlien(w, 400, 800); // level with the ship, to the left of it
  pickupOnShip(w, 'bomb');
  step(w);
  Object.assign(w.ship, { x: 960, y: 800, cooldown: 0 });
  drain(w);
  step(w, 30, FIRE);
  assert.ok(!w.aliens.includes(a), 'killed by the left shot');
  const ev = drain(w);
  assert.equal(ofType(ev, 'kill').length, 1);
  assert.equal(w.score >= 100, true);
});

test('it takes a diver swooping at the ship\'s height, or anything else level with the ship', () => {
  const w = lurking();
  const a = holdAlien(w, 1500, 800, 1, 'diver');
  a.mode = 'dive';
  pickupOnShip(w, 'bomb');
  step(w);
  Object.assign(w.ship, { x: 960, y: 800, cooldown: 0 });
  drain(w);
  step(w, 30, FIRE);
  assert.ok(!w.aliens.includes(a), 'killed by the right shot');
  assert.equal(ofType(drain(w), 'kill')[0].role, 'diver');
});

test('a side shot hits a boss part it meets, and the part takes the damage', () => {
  const w = playing(level(undefined, 0, { boss: 'galleon', world: 13, twist: 'broadside' }));
  while (w.boss.enter > 0) step(w);
  const prop = part(w, 'propR'); // the first part the left shot meets, coming in from the right
  Object.assign(w.ship, { x: 1500, y: 700, cooldown: 0 });
  pickupOnShip(w, 'bomb');
  const hp = prop.hp;
  for (let i = 0; i < 30; i++) {
    Object.assign(w.boss, { x: 960, y: 700 - prop.dy }); // the galleon never comes down so far: hold it level with the ship
    step(w, 1, FIRE);
  }
  assert.ok(prop.hp < hp, `the pod took the shot: ${prop.hp} of ${hp}`);
});

test('under the laser, which fires no volleys, an open broadside still fires its side guns at the base rate', () => {
  const w = lurking();
  w.ship.power = { kind: 'laser', left: 10 };
  step(w, 1, FIRE);
  assert.equal(side(w).length, 0, 'shut: the beam alone');
  w.ship.broadside = 6;
  step(w, 1, FIRE);
  const pairs = side(w).filter((s) => s.broadside === 1).length;
  assert.ok(pairs >= 1 && pairs <= 2, `${pairs} pairs in one tick-step at ${gunTicks(COOLDOWN)} ticks apart`);
  for (let i = 0; i < 59; i++) step(w, 1, FIRE);
  const shots = w.events.filter((e) => e.type === 'sideShot').length;
  assert.ok(shots >= 2 * 5, `${shots} side shots in a second`);
});
