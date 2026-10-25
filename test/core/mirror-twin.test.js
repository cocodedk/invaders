import { test } from 'node:test';
import assert from 'node:assert/strict';
import { twinOf, escortsOf, MUZZLE, ZONE, SHOT_SPEED } from '../../src/core/ship.js';
import {
  TICK, FIRE, step, playing, drain, ofType, pickupOnShip, pickupAt, bulletAt, holdAlien,
} from './world-kit.js';
import { lv, w16, fresh, twin } from './mirror-kit.js';

// World 16's twin: it flies opposite the ship across the field's centre line and fires one straight
// shot with every volley. It is untouchable and collects nothing: nothing in the collision code reads it.

test('the twin flies opposite the ship across the field\'s centre line, always inside the zone', () => {
  const w = playing(w16());
  assert.deepEqual(twinOf(w.ship), [], 'none without the power');
  twin(w);
  Object.assign(w.ship, { x: 500, y: 800 });
  assert.deepEqual(twinOf(w.ship), [{ x: 1420, y: 800 }]);
  Object.assign(w.ship, { x: 960, y: 700 });
  assert.deepEqual(twinOf(w.ship), [{ x: 960, y: 700 }], 'on the centre line the twin is on the ship');
  for (const [x, y] of [[ZONE.x0, ZONE.y0], [ZONE.x1, ZONE.y1], [ZONE.x0, ZONE.y1], [ZONE.x1, ZONE.y0], [1234, 777]]) {
    Object.assign(w.ship, { x, y });
    const [t] = twinOf(w.ship);
    assert.equal(t.x, 1920 - x);
    assert.equal(t.y, y);
    assert.ok(t.x >= ZONE.x0 && t.x <= ZONE.x1 && t.y >= ZONE.y0 && t.y <= ZONE.y1, `inside the zone at ${x},${y}`);
  }
  w.ship.power = { kind: 'rapid', left: 5 };
  assert.deepEqual(twinOf(w.ship), [], 'another power: no twin');
  w.ship.power = null;
  assert.deepEqual(twinOf(w.ship), [], 'no power: no twin');
  twin(w);
  w.ship.alive = false;
  assert.deepEqual(twinOf(w.ship), [], 'a lost ship has none');
  assert.deepEqual(escortsOf({ ...w.ship, alive: true }), [], 'and the mirror gives no escorts');
});

test('every volley, the twin fires one straight shot from its muzzle, marked mirror; the ship\'s own is the base shot', () => {
  const w = playing(w16());
  twin(w);
  Object.assign(w.ship, { x: 500, y: 900 });
  step(w, 1, FIRE);
  const shots = fresh(w);
  assert.equal(shots.length, 2);
  const own = shots.find((s) => !s.mirror);
  const copy = shots.find((s) => s.mirror);
  assert.equal(copy.mirror, true);
  assert.deepEqual([own.x, own.y, own.vx, own.vy], [500, 900 - MUZZLE, 0, -SHOT_SPEED]);
  assert.deepEqual([copy.x, copy.y, copy.vx, copy.vy], [1420, 900 - MUZZLE, 0, -SHOT_SPEED]);
  for (const s of shots) assert.deepEqual([s.pattern, s.r, s.dmg, s.life], ['shot', 5, 1, 1.5]);
  assert.ok(!('mirror' in own) && !('seek' in copy) && !('trident' in copy), 'the ship\'s shot is the plain one');
  const fire = ofType(drain(w), 'fire');
  assert.equal(fire.length, 1, 'one fire event for the volley');
  assert.equal(fire[0].power, 'mirror');
  assert.deepEqual([fire[0].x, fire[0].y], [500, 900 - MUZZLE], 'the event is the ship\'s muzzle');
});

test('no mirror shot without the power, in any world', () => {
  for (const world of [1, 16]) {
    const w = playing(lv({ world }));
    step(w, 1, FIRE);
    assert.equal(fresh(w).length, 1, `world ${world}`);
    assert.ok(w.shots.every((s) => !s.mirror), `world ${world}`);
  }
});

test('the twin follows the ship: a volley fires from where it is now', () => {
  const w = playing(w16());
  twin(w);
  Object.assign(w.ship, { x: 1300, y: 700, cooldown: 0 });
  step(w, 1, FIRE);
  assert.deepEqual(fresh(w).map((s) => Math.round(s.x)).sort((a, b) => a - b), [620, 1300]);
});

test('the twin fires for 10 s and no longer: 2 shots a volley, then 1', () => {
  const w = playing(w16());
  holdAlien(w, 100, 300, 1e6); // something to fire at that the shots never reach, so the level goes on
  pickupOnShip(w, 'mirror');
  step(w);
  const caught = w.tick;
  const sizes = [];
  let off = null;
  for (let i = 0; i < 60 * 12; i++) {
    step(w, 1, FIRE);
    const n = fresh(w).length;
    if (n) sizes.push(n);
    for (const e of drain(w)) if (e.type === 'power' && !e.on) off = (e.tick - caught) * TICK;
  }
  assert.ok(Math.abs(off - 10) < 0.05, `the power ended ${off} s after the catch`);
  const ones = sizes.indexOf(1);
  assert.ok(ones >= 54 && ones <= 57, `${ones} volleys of two in 10 s at 0.18 s each`);
  assert.ok(sizes.slice(0, ones).every((n) => n === 2), 'two a volley until then');
  assert.ok(sizes.slice(ones).every((n) => n === 1), 'then the plain single shot');
});

test('the twin\'s shot kills an alien the ship\'s own shot would miss', () => {
  const w = playing(w16());
  Object.assign(w.ship, { x: 500, y: 1000 });
  holdAlien(w, 1420, 500);
  step(w, 30, FIRE);
  assert.equal(w.aliens.length, 1, 'the ship alone does not reach it');
  twin(w);
  step(w, 30, FIRE);
  assert.equal(w.aliens.length, 0, 'the twin does');
});

test('the twin is untouchable: a bullet and an alien pass through it, and it collects nothing', () => {
  const w = playing(w16());
  twin(w);
  Object.assign(w.ship, { x: 400, y: ZONE.y0 });
  const [t] = twinOf(w.ship);
  bulletAt(w, t.x, t.y - 150, 0, 600); // falls straight through the twin
  holdAlien(w, t.x, t.y); // an alien stands on it
  pickupAt(w, 'bomb', t.x, t.y - 50); // and two pickups fall through it
  pickupAt(w, 'life', t.x, t.y - 30);
  const bombs = w.ship.bombs;
  for (let i = 0; i < 25; i++) {
    step(w);
    assert.equal(w.ship.lives, 3, `no hit at tick ${i}`);
  }
  assert.equal(w.hits, 0, 'nothing counted as a hit');
  assert.equal(w.bullets.length, 1, 'the bullet was not spent on the twin');
  assert.ok(w.bullets[0].y > t.y + 80, `it went on past: y ${w.bullets[0].y}`);
  assert.equal(w.aliens.length, 1, 'the alien is still there');
  assert.equal(w.ship.bombs, bombs, 'no bomb collected');
  assert.equal(w.pickups.length, 2, 'both pickups fell past, uncollected');
  assert.ok(w.pickups.every((p) => p.y > t.y), 'right through the twin');
  assert.equal(w.ship.power.kind, 'mirror');
  assert.equal(ofType(drain(w), 'pickup').length, 0);
});

test('the ship itself is still hit as ever while the twin flies', () => {
  const w = playing(w16());
  twin(w);
  bulletAt(w, w.ship.x, w.ship.y);
  step(w);
  assert.equal(w.ship.lives, 2, 'a bullet on the ship still lands');
});
