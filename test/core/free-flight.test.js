import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZONE, FREE_ZONE, zoneOf, SHIP_R } from '../../src/core/ship.js';
import { DRAG_TURN } from '../../src/core/free.js';
import { HUD_BOTTOM } from '../../src/core/kinds.js';
import { wrapAngle } from '../../src/core/math.js';
import { level, wave, step, seconds, playing, drain, ofType, input, holdAlien, bulletAt } from './world-kit.js';

// R67, a free level (world 18): the ship flies anywhere under the HUD, any alien it touches rams it, and
// the enemy's homing bullets, once the chase has turned them DRAG_TURN off their first course, hurt the
// aliens they cross. None of it reaches a level that is not free.

const free = (o = {}) => playing(level([wave(), wave()], 0, { free: true, ...o }));
const fixed = () => playing(level([wave(), wave()]));
// A homing bullet as the 'homing' pattern fires it: it turns toward the ship at 60 degrees a second.
const homing = (w, x, y, vx, vy) => {
  const b = { pattern: 'homing', x, y, vx, vy, r: 10, life: 6, turn: Math.PI / 3 };
  w.bullets.push(b);
  return b;
};
const turned = (b) => Math.abs(wrapAngle(Math.atan2(b.vy, b.vx) - b.h0));

test('in a free level the ship climbs to just under the HUD; anywhere else it stops where it always did', () => {
  assert.equal(zoneOf({ free: true }), FREE_ZONE);
  assert.equal(zoneOf({}), ZONE);
  assert.deepEqual([FREE_ZONE.x0, FREE_ZONE.x1, FREE_ZONE.y1], [ZONE.x0, ZONE.x1, ZONE.y1], 'only the top moves');
  assert.ok(FREE_ZONE.y0 - SHIP_R > HUD_BOTTOM, 'the ship stays clear of the HUD');
  for (const [w, top] of [[free(), FREE_ZONE.y0], [fixed(), ZONE.y0]]) {
    holdAlien(w, 200, 300, 50); // out of the way
    seconds(w, 2, input({ dy: -1 }));
    assert.equal(w.ship.y, top);
  }
  const w = free();
  holdAlien(w, 200, 300, 50);
  seconds(w, 2, input({ target: { x: 1500, y: 0 } }));
  assert.deepEqual([w.ship.x, w.ship.y], [1500, FREE_ZONE.y0], 'the pointer reaches the top too');
});

test('in a free level any alien the ship touches rams it: a life gone, the alien gone, no score', () => {
  const w = free();
  w.ship.x = 900;
  w.ship.y = 400;
  holdAlien(w, 900, 400);
  step(w);
  assert.equal(w.ship.lives, 2);
  assert.equal(w.score, 0);
  assert.equal(ofType(drain(w), 'shipHit').length, 1);
  assert.ok(!w.aliens.some((a) => a.id === 900));
});

test('anywhere else a holding alien on the ship is passed, as it always was', () => {
  const w = fixed();
  holdAlien(w, w.ship.x, w.ship.y, 50);
  seconds(w, 1);
  assert.equal(w.ship.lives, 3);
  assert.equal(w.aliens[0].hp, 50);
});

// The bullet starts straight down; the ship waits to its lower right, so the chase turns it.
function dragOne(w) {
  holdAlien(w, 200, 200, 50);
  w.ship.x = 1400;
  w.ship.y = 500;
  const b = homing(w, 900, 300, 0, 200);
  step(w);
  assert.ok(b.h0 !== undefined, 'it notes its first heading');
  while (turned(b) < DRAG_TURN) {
    assert.equal(b.dragged, undefined, `harmless at ${turned(b)} rad`);
    step(w);
  }
  step(w);
  return b;
}

test('a homing bullet the chase has turned 45 degrees off its course is dragged, and the first alien it crosses takes it', () => {
  assert.equal(DRAG_TURN, Math.PI / 4);
  const w = free();
  const b = dragOne(w);
  assert.equal(b.dragged, true);
  const a = w.aliens[0];
  Object.assign(a, { x: b.x + b.vx * 0.1, y: b.y + b.vy * 0.1, hp: 1 });
  drain(w);
  step(w, 12);
  const ev = drain(w);
  assert.equal(ofType(ev, 'backfire').length, 1);
  assert.deepEqual(ofType(ev, 'kill').map((e) => e.id), [900], 'a kill like any other');
  assert.ok(w.score > 0, 'and it scores');
  assert.ok(!w.bullets.includes(b), 'the bullet is spent');
  assert.equal(w.ship.lives, 3);
});

test('a bullet on its first course passes its own side, and a plain bullet never hurts an alien', () => {
  const w = free();
  const a = holdAlien(w, 900, 400, 50);
  w.ship.x = 900;
  w.ship.y = 900; // straight below: the homing bullet has nothing to turn for
  homing(w, 900, 300, 0, 260);
  bulletAt(w, 860, 300, 0, 260, 30); // wide enough to cross the alien
  step(w, 30);
  assert.equal(a.hp, 50);
  assert.equal(ofType(drain(w), 'backfire').length, 0);
});

test('anywhere else a turned homing bullet crosses aliens as it always did', () => {
  const w = fixed();
  holdAlien(w, 200, 200, 50);
  const b = homing(w, 900, 300, 0, 200);
  w.ship.x = 1400;
  seconds(w, 1.2);
  assert.equal(b.h0, undefined);
  assert.equal(b.dragged, undefined);
  Object.assign(w.aliens[0], { x: b.x + b.vx * 0.1, y: b.y + b.vy * 0.1 });
  step(w, 12);
  assert.equal(w.aliens[0].hp, 50);
});
