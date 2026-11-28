import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALIEN_R } from '../../src/core/kinds.js';
import { SPAWN_Y } from '../../src/core/course-kinds.js';
import { FLOCK_N, FLOCK_R, FLOCK_VY, FLOCK_SPIN, SCATTER_R, SCATTER_SECS, REGROUP_SECS } from '../../src/core/course-flock.js';
import { hurtAlien } from '../../src/core/aliens.js';
import { PATH_NAMES } from '../../src/core/course-air.js';
import { flock } from '../../src/core/levels-8-kit.js';
import { TICK, step, seconds, ofType, drain } from './world-kit.js';
import { air, launched, col } from './course-kit.js';
import { lassoWorld, circle, caught, CX, CY } from './course-lasso-kit.js';
import { stateHash } from '../../src/core/state-hash.js';

const X = col(0.5);
const ENTRY = { kind: 'air', at: 0, role: 'g', path: 'flock', x: X, pattern: 'aimed' };
const MID_SCREEN_SECS = 6; // s: the wheel's centre is on the screen by then
const LEAVE_SECS = 14; // s: by then the wheel has drifted off the bottom
const motes = (w) => w.aliens.filter((a) => a.path === 'flock' && a.hp > 0);
const shotNear = (w, a, dx = 50) => w.shots.push({ pattern: 'shot', x: a.x + dx, y: a.y, vx: 0, vy: 0, r: 5, life: 1, dmg: 1 });
const flown = (secs = MID_SCREEN_SECS) => {
  const w = launched([ENTRY], { fireMult: 1e6 });
  w.ship.invuln = Infinity;
  w.ship.cooldown = Infinity;
  seconds(w, secs);
  return w;
};
const gap = (w) => Math.min(...motes(w).flatMap((a, i, l) => l.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));

test('the kit entry is a flock path, and the path is a name the data check knows', () => {
  assert.deepEqual(flock(7, X), { kind: 'air', at: 7, role: 'g', path: 'flock', x: X, pattern: 'aimed' });
  assert.ok(PATH_NAMES.includes('flock'));
});

test('one entry spawns FLOCK_N one-hp motes with their own ids, a flock id and a place on the wheel', () => {
  const w = launched([ENTRY]);
  assert.equal(w.aliens.length, FLOCK_N);
  assert.deepEqual(w.aliens.map((a) => a.hp), Array(FLOCK_N).fill(1));
  assert.deepEqual(w.aliens.map((a) => a.i), [...Array(FLOCK_N).keys()]);
  assert.equal(new Set(w.aliens.map((a) => a.id)).size, FLOCK_N);
  assert.deepEqual([...new Set(w.aliens.map((a) => a.flock))], [w.aliens[0].id]);
  assert.ok(FLOCK_R >= (FLOCK_N * ALIEN_R) / Math.PI);
});

test('the motes wheel round a centre that drifts down at FLOCK_VY, and no two touch', () => {
  const w = launched([ENTRY]);
  const t0 = w.aliens[0].t;
  seconds(w, 3);
  const dt = w.aliens[0].t - t0;
  const centre = { x: w.aliens.reduce((s, a) => s + a.x, 0) / FLOCK_N, y: w.aliens.reduce((s, a) => s + a.y, 0) / FLOCK_N };
  assert.ok(Math.abs(centre.x - X) < 1e-6);
  assert.ok(Math.abs(centre.y - (SPAWN_Y + FLOCK_VY * w.aliens[0].t)) < 1e-6);
  for (const a of w.aliens) {
    assert.ok(Math.abs(Math.hypot(a.x - centre.x, a.y - centre.y) - FLOCK_R) < 1e-6);
    const turn = Math.atan2(a.y - centre.y, a.x - centre.x) - (FLOCK_SPIN * a.t + (a.i * 2 * Math.PI) / FLOCK_N);
    assert.ok(Math.abs(Math.sin(turn)) < 1e-6 && Math.cos(turn) > 0, 'on the wheel');
  }
  assert.ok(dt > 2.9);
  assert.ok(gap(w) >= 2 * ALIEN_R, 'no two discs overlap');
});

test('a shot within SCATTER_R scatters the whole flock away from it, once, and they are back on the wheel after the regroup', () => {
  const w = flown();
  const before = motes(w).map((a) => ({ x: a.x, y: a.y }));
  drain(w);
  const mote = motes(w)[3];
  shotNear(w, mote, SCATTER_R - 1);
  const [sx, sy] = [w.shots[0].x, w.shots[0].y];
  const from = Math.hypot(mote.x - sx, mote.y - sy);
  step(w);
  const events = ofType(w.events, 'flockScatter');
  assert.equal(events.length, 1);
  assert.deepEqual([events[0].x, events[0].y], [sx, sy], 'says where the shot was');
  seconds(w, SCATTER_SECS / 2);
  assert.ok(Math.hypot(mote.x - sx, mote.y - sy) > from, 'flying from the shot');
  w.shots.length = 0;
  seconds(w, SCATTER_SECS / 2 + REGROUP_SECS + 2 * TICK);
  assert.equal(ofType(w.events, 'flockScatter').length, 1, 'one scatter, not one a tick');
  assert.equal(motes(w).length, before.length);
  assert.ok(motes(w).every((a) => a.sc === null));
  const c = { x: X, y: SPAWN_Y + FLOCK_VY * motes(w)[0].t };
  for (const a of motes(w)) assert.ok(Math.abs(Math.hypot(a.x - c.x, a.y - c.y) - FLOCK_R) < 1e-6, 'back on the wheel');
});

test('a shot farther than SCATTER_R scatters nothing', () => {
  const w = flown();
  drain(w);
  const m = motes(w).reduce((best, a) => (a.x > best.x ? a : best));
  shotNear(w, m, SCATTER_R + 5);
  step(w);
  assert.equal(ofType(w.events, 'flockScatter').length, 0);
});

test('motes fire nothing, even where every gunner fires on every tick', () => {
  const w = flown(MID_SCREEN_SECS + 3);
  assert.equal(w.bullets.length, 0);
});

test('killing motes draws no rng and drops nothing until the last one dies, which drops one pickup', () => {
  const w = flown();
  const rng = JSON.stringify(w.rng);
  const all = motes(w);
  for (const a of all.slice(0, -1)) hurtAlien(w, a, 1);
  step(w);
  assert.equal(w.pickups.length, 0);
  assert.equal(JSON.stringify(w.rng), rng, 'no draw for any kill');
  hurtAlien(w, motes(w)[0], 1);
  const last = all.at(-1);
  const where = { x: last.x, y: last.y };
  step(w);
  assert.equal(w.pickups.length, 1);
  assert.ok(Math.abs(w.pickups[0].y - where.y) < 2 * FLOCK_VY * TICK + 80);
});

test('a flock that leaves the screen with motes alive drops nothing', () => {
  const w = flown();
  hurtAlien(w, motes(w)[0], 1);
  seconds(w, LEAVE_SECS);
  assert.equal(motes(w).length, 0, 'all gone');
  assert.equal(w.aliens.length, 0);
  assert.equal(w.pickups.length, 0);
  assert.equal(ofType(w.events, 'flockScatter').length, 0);
});

test('a loop round the whole flock catches all twelve with exactly one drop', () => {
  const w = lassoWorld();
  w.course.next = w.level.course.spawns.length;
  w.aliens.length = 0;
  const entry = { ...ENTRY, x: CX };
  const a0 = w.nextId;
  w.level.course.spawns.push(entry);
  w.course.dist = entry.at;
  w.course.next = w.level.course.spawns.length - 1;
  step(w);
  const all = w.aliens.filter((a) => a.path === 'flock');
  assert.equal(all.length, FLOCK_N);
  assert.ok(a0 <= all[0].id);
  all.forEach((a, k) => Object.assign(a, { x: CX + 30 * Math.cos(k), y: CY + 30 * Math.sin(k), t: 0, sc: { t: 0, sx: 0, sy: 0 } }));
  drain(w);
  circle(w);
  assert.equal(caught(w, 'craft'), FLOCK_N);
  assert.equal(ofType(w.events, 'kill').length, FLOCK_N);
  step(w);
  assert.equal(w.pickups.length, 1, 'one drop for the twelve');
});

test('two worlds spawned and stepped the same way hold the same positions', () => {
  const [a, b] = [flown(4), flown(4)];
  shotNear(a, motes(a)[0], 20);
  shotNear(b, motes(b)[0], 20);
  seconds(a, 2);
  seconds(b, 2);
  assert.deepEqual(a.aliens.map((m) => [m.x, m.y]), b.aliens.map((m) => [m.x, m.y]));
  assert.equal(stateHash(a), stateHash(b));
});
