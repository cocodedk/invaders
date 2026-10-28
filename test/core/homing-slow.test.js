import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POWERS, TICK } from '../../src/core/kinds.js';
import { HOMING_SPEED, HOMING_TURN, COOLDOWN } from '../../src/core/ship.js';
import { createWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';
import { powerTime, POWER_TIME } from '../../src/core/powerups.js';
import { stepBullet } from '../../src/core/patterns.js';
import { enemyDt } from '../../src/core/twists-2.js';
import { FIRE, level, wave, input, step, seconds, playing, drain, ofType, bulletAt, pickupAt, pickupOnShip } from './world-kit.js';

// R53: the slow and homing powers.

const lv = () => level([wave({ rows: 1, cols: 3, roles: ['grunt'] })]);
const powers = (w) => ofType(drain(w), 'power').map((e) => `${e.kind} ${e.on ? 'on' : 'off'}`);

// ---- slow --------------------------------------------------------------------------------------

test('every power lasts 10 s except slow, which lasts 6 s', () => {
  for (const k of POWERS) assert.equal(powerTime(k), k === 'slow' ? 6 : POWER_TIME, k);
  const w = playing(lv());
  pickupOnShip(w, 'slow');
  step(w);
  assert.ok(w.ship.power.left > 5.9 && w.ship.power.left <= 6);
  seconds(w, 5.7);
  assert.equal(w.ship.power.kind, 'slow');
  seconds(w, 0.5);
  assert.equal(w.ship.power, null);
  assert.deepEqual(powers(w), ['slow on', 'slow off']);
});

test('slow halves aliens and enemy bullets; the ship, its shots, pickups and the timer keep real time', () => {
  const run = (power) => {
    const w = playing(lv());
    w.ship.power = power && { kind: power, left: 6 };
    const a0 = w.aliens[0].x;
    bulletAt(w, 300, 100, 0, 200);
    w.shots.push({ pattern: 'shot', x: 100, y: 900, vx: 0, vy: -1000, r: 5, life: 1, dmg: 1 });
    pickupAt(w, 'rapid', 100, 100);
    seconds(w, 0.5, input({ dx: 1 }));
    return { w, aliensMoved: w.aliens[0].x - a0 };
  };
  const [base, slow] = [run(null), run('slow')];
  assert.ok(Math.abs(slow.aliensMoved - base.aliensMoved / 2) < 0.01, `${slow.aliensMoved} vs ${base.aliensMoved}`);
  assert.ok(Math.abs(slow.w.bullets[0].y - 150) < 0.01 && Math.abs(base.w.bullets[0].y - 200) < 0.01);
  assert.equal(slow.w.ship.x, base.w.ship.x, 'the ship');
  assert.equal(slow.w.shots[0].y, base.w.shots[0].y, 'its shots');
  assert.equal(slow.w.pickups[0].y, base.w.pickups[0].y, 'pickups');
  assert.ok(Math.abs(slow.w.ship.power.left - 5.5) < 0.02, 'the power timer');
});

test('slow and the glitch world\'s bullet time do not stack: enemy time is still 0.5', () => {
  const w = playing(lv());
  assert.equal(enemyDt(w, TICK), TICK);
  w.ship.power = { kind: 'slow', left: 6 };
  assert.equal(enemyDt(w, TICK), TICK * 0.5);
  w.slow = 1;
  assert.equal(enemyDt(w, TICK), TICK * 0.5);
  w.ship.power = null;
  assert.equal(enemyDt(w, TICK), TICK * 0.5, 'bullet time alone, as before');
});

// ---- homing ------------------------------------------------------------------------------------

const seekShot = (x, y) => ({ pattern: 'shot', x, y, vx: 0, vy: -HOMING_SPEED, r: 5, life: 1.5, dmg: 1, seek: HOMING_TURN });
const alien = (x, y, hp = 1) => ({ x, y, hp });
const heading = (b) => Math.atan2(b.vy, b.vx);

test('a homing gun fires one shot straight up at 1000 px/s with a seek rate, at the base cooldown', () => {
  const w = playing(lv());
  w.ship.power = { kind: 'homing', left: 10 };
  step(w, 1, FIRE);
  assert.equal(w.shots.length, 1);
  const [s] = w.shots;
  assert.deepEqual([s.vx, s.vy, s.seek, s.turn, s.dmg], [0, -HOMING_SPEED, Math.PI, undefined, 1]);
  assert.equal(w.ship.cooldown, COOLDOWN);
  assert.deepEqual(ofType(drain(w), 'fire').map((e) => e.power), ['homing']);
});

test('a homing shot hits an alien off its line that a straight shot misses', () => {
  const left = (power) => {
    const w = playing(lv());
    Object.assign(w.ship, { x: 700, y: 1000, power: { kind: power, left: 10 } });
    step(w, 1, FIRE);
    step(w, 100);
    return w.aliens.length;
  };
  assert.equal(left('homing'), 2);
  assert.equal(left('rapid'), 3);
});

test('a seeking shot turns toward the nearest live alien ahead, by distance, keeping its speed', () => {
  const b = seekShot(500, 800);
  stepBullet(b, TICK, { aliens: [alien(800, 400), alien(420, 600), alien(500, 700, 0)] });
  assert.ok(b.vx < 0, 'toward (420, 600): the dead one at (500, 700) is nearer but does not count');
  assert.ok(Math.abs(Math.hypot(b.vx, b.vy) - HOMING_SPEED) < 1e-9);
  assert.ok(Math.abs(heading(b) + Math.PI / 2) <= HOMING_TURN * TICK + 1e-9, 'turning at most the seek rate');
  const near = seekShot(500, 800);
  stepBullet(near, TICK, { aliens: [alien(800, 400), alien(520, 300)] });
  assert.ok(near.vx > 0, 'the nearer of two live aliens ahead wins, here the one on the right');
});

test('a seeking shot ignores aliens level with or behind it, or above the screen, and flies straight with nothing ahead', () => {
  for (const aliens of [[], [alien(800, 900)], [alien(800, 800)], [alien(200, 1000), alien(900, 810)], [alien(520, -40)]]) {
    const b = seekShot(500, 800);
    stepBullet(b, 0.1, { aliens });
    assert.deepEqual([b.vx, b.vy, b.x, b.y], [0, -HOMING_SPEED, 500, 700], JSON.stringify(aliens));
  }
});

test('a seeking shot never chases the boss', () => {
  const boss = levelById('w1-5');
  const w = createWorld(boss, boss.seed);
  w.ship.invuln = Infinity;
  step(w, 600);
  assert.ok(w.boss && w.boss.enter === 0, 'the fight is on');
  w.aliens.length = 0;
  const b = seekShot(w.boss.x + 400, w.boss.y + 300);
  stepBullet(b, TICK, w);
  assert.equal(b.vx, 0);
});

test('enemy homing still chases the ship, not the aliens', () => {
  const [a, b] = [0, 1].map(() => ({ pattern: 'homing', x: 960, y: 300, vx: 0, vy: 200, r: 8, life: 4, turn: Math.PI / 3 }));
  stepBullet(a, 0.1, { ship: { x: 100, y: 900 } });
  stepBullet(b, 0.1, { ship: { x: 100, y: 900 }, aliens: [alien(1800, 500)] });
  assert.deepEqual([b.vx, b.vy], [a.vx, a.vy]);
  assert.ok(a.vx < 0, 'toward the ship');
});
