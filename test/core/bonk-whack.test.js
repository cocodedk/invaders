import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TICK } from '../../src/core/kinds.js';
import { FREE_ZONE } from '../../src/core/ship.js';
import { HOP } from '../../src/core/tumble.js';
import { WHACK_R, LAUNCH, BANKS, BONK_MAX, DAZE } from '../../src/core/bonk.js';
import { step, drain, ofType, at, playing, shotAt, bulletAt, addAlien } from './world-kit.js';
import { arena, bodyAt, flyer, until, collect, w19 } from './bonk-kit.js';

// World 19's bat (R71): a dizzy body the ship's path touches is launched at LAUNCH from where the ship's move
// began through the body's centre. It costs nothing, works while the ship blinks or is shielded, and a body
// still rising on a rebound cannot be batted. Bodies never hurt the ship and block nothing.
const parkAt = (w, x, y) => Object.assign(w.ship, { x, y, fromX: x, fromY: y });
const RISE_TICKS = Math.round(DAZE / TICK); // how long a rebound rises, and how long its daze lasts

test('the bat launches the body from where the ship\'s move began, through the body\'s centre, at LAUNCH', () => {
  const w = arena();
  parkAt(w, 600, 1000);
  const b = bodyAt(w, 1000, 985);
  step(w, 1, at(1400, 1000)); // one sweep past the body: the move began at x 600
  const [e] = ofType(drain(w), 'whack');
  const d = Math.hypot(e.x - 600, e.y - 1000);
  assert.deepEqual([e.id, e.role, e.x, e.y], [b.id, 'grunt', b.x, b.y]);
  assert.ok(Math.abs(e.dx - (e.x - 600) / d) < 1e-12 && Math.abs(e.dy - (e.y - 1000) / d) < 1e-12, 'away from the move\'s start');
  assert.ok(e.dx > 0.99, 'to the right, though the ship ended past it');
  assert.ok(Math.abs(b.vx - e.dx * LAUNCH) < 1e-9 && Math.abs(b.vy - e.dy * LAUNCH) < 1e-9);
  assert.deepEqual([b.fly, b.link, b.banks], [true, 0, BANKS]);
});

test('a parked ship bats what comes within WHACK_R, at the angle it lies, and nothing beyond', () => {
  const w = arena();
  parkAt(w, 1000, 1000);
  const near = bodyAt(w, 1000 - WHACK_R * 0.6, 1000 - WHACK_R * 0.6);
  const far = bodyAt(w, 1000 + WHACK_R + 2, 1000 - 2);
  step(w);
  assert.equal(ofType(drain(w), 'whack').length, 1);
  assert.ok(near.fly && !far.fly);
  assert.ok(Math.abs(near.vx + LAUNCH * Math.SQRT1_2) < 5 && Math.abs(near.vy + LAUNCH * Math.SQRT1_2) < 5, 'up and to the left');
});

test('a body on the very spot the ship stands goes straight up', () => {
  const w = arena();
  parkAt(w, 1000, 1000);
  const b = bodyAt(w, 1000, 1000);
  step(w);
  const [e] = ofType(drain(w), 'whack');
  assert.deepEqual([e.dx, e.dy, b.vx, b.vy], [0, -1, 0, -LAUNCH]);
});

test('the bat works while the ship blinks or is shielded and costs nothing; a dead ship bats nothing', () => {
  for (const set of [(s) => { s.invuln = 1; }, (s) => { s.invuln = 0; s.power = { kind: 'shield', left: 5 }; }]) {
    const w = arena();
    set(w.ship);
    parkAt(w, 1000, 1000);
    const before = { lives: w.ship.lives, bombs: w.ship.bombs, kind: w.ship.power?.kind };
    bodyAt(w, 1000, 970);
    step(w);
    const events = drain(w);
    assert.equal(ofType(events, 'whack').length, 1);
    assert.ok(!events.some((e) => e.type === 'shipHit' || e.type === 'shieldHit'));
    assert.deepEqual({ lives: w.ship.lives, bombs: w.ship.bombs, kind: w.ship.power?.kind }, before);
  }
  const w = arena();
  parkAt(w, 1000, 1000);
  w.ship.alive = false;
  bodyAt(w, 1000, 970);
  step(w);
  assert.equal(ofType(drain(w), 'whack').length, 0);
});

test('a rebounded body cannot be batted while its hop rises (its daze); a fresh body can be batted as it hops', () => {
  const w = arena();
  parkAt(w, 1000, 1000);
  const b = bodyAt(w, 1000, 980, { vy: -HOP, bonks: 1, daze: DAZE });
  const rising = collect(w, RISE_TICKS - 1);
  assert.equal(ofType(rising, 'whack').length, 0);
  assert.ok(b.vy < 0 && !b.fly);
  const { events } = until(w, 'whack');
  assert.equal(ofType(events, 'whack')[0].id, b.id);
  assert.ok(b.fly);
  const f = arena();
  parkAt(f, 1000, 1000);
  bodyAt(f, 1000, 980, { vy: -HOP });
  step(f);
  assert.equal(ofType(drain(f), 'whack').length, 1);
});

test('a ship parked where the body rebounds lands one bonk a bat, not BONK_MAX in a few ticks', () => {
  const w = arena();
  parkAt(w, 1000, 1000);
  const tough = addAlien(w, 1000, 900, { hp: 1e6 });
  bodyAt(w, 1000, 960);
  const events = collect(w, 6 * 60);
  const ticks = (type) => ofType(events, type).map((e) => e.tick);
  const bonks = ticks('bonk');
  assert.equal(bonks.length, BONK_MAX, 'every rebound lands, the last one spends it');
  assert.equal(ofType(events, 'fizzle').length, 1);
  assert.equal(ticks('whack').length, BONK_MAX, 'one bat for each bonk');
  for (let i = 1; i < bonks.length; i++) assert.ok(bonks[i] - bonks[i - 1] > RISE_TICKS, `bonk ${i}: ${bonks[i] - bonks[i - 1]} ticks after the last`);
  assert.ok(tough.hp > 0);
});

test('under the HUD, where a rebound does not hop, the body is still dazed: a ship beside it bats it only after DAZE', () => {
  const w = arena();
  addAlien(w, 1000, FREE_ZONE.y0, { hp: 1e6 });
  const b = flyer(w, 880, FREE_ZONE.y0, LAUNCH, 0);
  until(w, 'bonk');
  assert.deepEqual([b.fly, b.vy, b.daze], [false, 0, DAZE], 'back where its move began, with no hop');
  let ticks = 0;
  while (!b.fly && ticks < 2 * RISE_TICKS) {
    parkAt(w, b.x - WHACK_R / 2, Math.max(FREE_ZONE.y0, b.y)); // in reach every tick, on the side away from the alien
    step(w);
    ticks++;
  }
  assert.equal(ticks, RISE_TICKS, 'batted on the first tick its daze is over, not on the tick after the rebound');
});

test('a body never hurts the ship: a dizzy one on it is batted, a flying one passes through', () => {
  const w = arena();
  w.ship.invuln = 0;
  parkAt(w, 960, 1000);
  bodyAt(w, 960, 1000);
  flyer(w, 800, 1000, LAUNCH, 0);
  const lives = w.ship.lives;
  const events = collect(w, 20);
  assert.ok(!events.some((e) => e.type === 'shipHit' || e.type === 'shieldHit'));
  assert.equal(w.ship.lives, lives);
});

test('a body blocks no shot and no bullet', () => {
  const w = arena();
  const target = addAlien(w, 600, 300, { hp: 1e6 });
  bodyAt(w, 600, 600);
  bodyAt(w, 1500, 500);
  shotAt(w, { x: 600, y: 700 });
  bulletAt(w, 1500, 420, 0, 300);
  const events = collect(w, 30);
  assert.ok(ofType(events, 'hit').some((e) => e.id === target.id), 'the shot went through to the alien');
  const bullet = w.bullets.find((x) => x.x === 1500);
  assert.ok(bullet && bullet.y > 560, 'the bullet fell on past the body');
});

test('bodies hold no wave open and live through the gap into the next wave', () => {
  const w = playing(w19());
  w.ship.invuln = Infinity;
  for (const a of w.aliens) shotAt(w, a);
  until(w, 'waveClear');
  const ids = w.twist.bodies.map((b) => b.id);
  assert.equal(ids.length, 3, 'the wave is clear with its three bodies still falling');
  while (w.wave < 2) step(w);
  assert.deepEqual(w.twist.bodies.map((b) => b.id), ids, 'and they fall on into the next wave');
});
