import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TICK } from '../../src/core/kinds.js';
import { LINE_STEP, LINE_SEGS, LINE_LIFE, lineSegs, lineLife, drawLine, lineStops } from '../../src/core/course-line.js';
import { LASSO_SEGS, LASSO_LIFE, LASSO_RECHARGE, LOOP_MIN_AREA, closeLoop } from '../../src/core/course-lasso.js';
import { GROUND_SCORE } from '../../src/core/course-ground.js';
import { stateHash } from '../../src/core/state-hash.js';
import { hitShip } from '../../src/core/ship.js';
import { RESPAWN_DELAY } from '../../src/core/course-check.js';
import { step, drain, ofType, pickupAt } from './world-kit.js';
import { lineWorld, put, hline } from './course-line-kit.js';
import { circle, lassoWorld, bullet, gnd, caught, CX, CY, R } from './course-lasso-kit.js';

// The lasso (world 22, Leg 3): the line closes into a loop and what is inside is caught (course-lasso.js).

test('without the ability a closed circle of flight catches nothing, and the line keeps Leg 2 numbers and hash', () => {
  const world = lassoWorld(['line']);
  const stone = gnd(world, 'stone', CX, CY);
  const b = bullet(world, CX, CY + 40);
  circle(world);
  assert.deepEqual([stone.hp > 0, b.life > 0, ofType(drain(world), 'lasso').length], [true, true, 0]);
  assert.deepEqual([lineSegs(world.course), lineLife(world.course)], [LINE_SEGS, LINE_LIFE]);
  const h = stateHash(world);
  world.course.lassoCool = 1;
  assert.equal(stateHash(world), h, 'the rest is not hashed without the ability');
});

test('with the ability the line holds LASSO_SEGS segments and a segment lasts LASSO_LIFE', () => {
  const world = lineWorld(['line', 'lasso']);
  assert.deepEqual([lineSegs(world.course), lineLife(world.course)], [LASSO_SEGS, LASSO_LIFE]);
  hline(world, 100, LASSO_SEGS + 10);
  assert.equal(world.course.line.length, LASSO_SEGS);
  const h = stateHash(world);
  world.course.lassoCool = 1;
  assert.notEqual(stateHash(world), h, 'the rest is hashed once the ability is held');
  const old = lineWorld(['line', 'lasso']);
  hline(old, 100, 5);
  for (let t = 0; t < (LASSO_LIFE - 0.1) / TICK; t++) drawLine(old, TICK);
  assert.equal(old.course.line.length, 5);
  for (let t = 0; t < 0.2 / TICK; t++) drawLine(old, TICK);
  assert.equal(old.course.line.length, 0);
});

test('a circle round a stone, a bullet, a laser, an armored craft and a pickup catches them all on the tick it closes', () => {
  const world = lassoWorld();
  const stone = gnd(world, 'stone', CX, CY);
  const craft = world.aliens[0];
  Object.assign(craft, { x: CX + 50, y: CY - 50 });
  bullet(world, CX - 60, CY);
  bullet(world, CX + 60, CY + 60, 'laser');
  pickupAt(world, 'bomb', CX, CY + 80);
  world.pickups[0].vy = 0;
  world.ship.bombs = 0;
  const before = world.score;
  drain(world);
  circle(world);
  const events = drain(world);
  assert.equal(stone.hp, 0);
  assert.equal(ofType(events, 'groundKill').length, 1);
  assert.ok(world.bullets.every((b) => b.life === 0 && b.near), 'bullets settled, no dodge');
  assert.ok(craft.hp <= 0);
  assert.equal(ofType(events, 'kill').length, 1);
  const [ev, ...rest] = ofType(events, 'lasso');
  assert.equal(rest.length, 0);
  assert.deepEqual([ev.shots, ev.craft, ev.ground, ev.pickups], [2, 1, 1, 1]);
  assert.ok(Math.abs(ev.x - CX) < R && Math.abs(ev.y - CY) < R && ev.poly.length % 2 === 0);
  assert.ok(world.score - before >= GROUND_SCORE.stone, 'the kills are scored');
  assert.ok(Math.abs(Math.hypot(world.pickups[0].x - CX, world.pickups[0].y - CY) - R) < LINE_STEP, 'the pickup flew to the ship, on the loop');
  step(world);
  assert.equal(world.ship.bombs, 1, 'the pickup is collected next tick');
});

test('the loop ink is gone after it closes, older ink before the crossing stays', () => {
  const world = lassoWorld();
  world.course.pen = null;
  hline(world, 100, 4, 300); // older ink, far from the loop
  const older = world.course.line.length;
  circle(world);
  assert.equal(older, 4);
  assert.ok(world.course.line.slice(0, older).every((s) => s.y1 === 300), 'older ink stays');
  assert.ok(world.course.line.length <= older + 2, 'the loop segments are gone');
});

test('a lantern and anything outside the loop stay; a pillar half inside stays; a gate inside breaks', () => {
  const world = lassoWorld();
  const lantern = gnd(world, 'checkpoint', CX, CY, null);
  const out = gnd(world, 'stone', CX + R + 150, CY);
  const pillar = gnd(world, 'pillar', CX + R, CY, 5, { w: 100, h: 100 });
  const inner = gnd(world, 'pillar', CX, CY, 5, { w: 100, h: 100 });
  const gate = gnd(world, 'gate', CX - 80, CY, 3, { holdId: 0 });
  const bOut = bullet(world, CX + R + 200, CY);
  circle(world);
  assert.deepEqual([lantern.hp, out.hp > 0, pillar.hp, bOut.life > 0], [null, true, 5, true]);
  assert.equal(inner.hp, 0, 'a box wholly inside is caught');
  assert.equal(gate.hp, 0);
});

test('a retraced stroke and a wobble that encloses less than LOOP_MIN_AREA close nothing', () => {
  const world = lassoWorld();
  hline(world, 200, 20);
  hline(world, 200 + 20 * LINE_STEP, -20);
  assert.equal(ofType(drain(world), 'lasso').length, 0);
  const wob = lassoWorld();
  const small = Math.sqrt(LOOP_MIN_AREA / Math.PI) / 2;
  circle(wob, { r: small });
  assert.equal(ofType(drain(wob), 'lasso').length, 0);
});

test('a chain with a segment bitten out does not close', () => {
  const world = lassoWorld();
  circle(world, { turns: 0.7 });
  world.course.line.splice(Math.floor(world.course.line.length / 2), 1);
  assert.equal(closeLoop(world), false);
  put(world, CX + R, CY);
  circle(world, { turns: 0.4, from: 0.7 });
  assert.equal(ofType(drain(world), 'lasso').length, 0, 'the cut chain is no loop');
});

test('a stroke that crosses the loop twice in one pointer jump closes exactly one loop', () => {
  const world = lassoWorld();
  world.course.lassoCool = Infinity; // the circle is flown while the lasso rests: it stays as ink
  circle(world, { turns: 0.95 });
  world.course.lassoCool = 0;
  drain(world);
  put(world, CX - R, CY - R * 0.2); // one jump across the whole circle and out the far side
  drawLine(world, TICK);
  put(world, CX + R * 2, CY + R * 0.2);
  drawLine(world, TICK);
  assert.equal(ofType(drain(world), 'lasso').length, 1);
  assert.ok(world.course.lassoCool > LASSO_RECHARGE - 2 * TICK && world.course.lassoCool <= LASSO_RECHARGE);
});

test('during LASSO_RECHARGE a second circle catches nothing, keeps its ink and still stops a bullet; after it, one catches', () => {
  const world = lassoWorld();
  circle(world);
  drain(world);
  const stone = gnd(world, 'stone', CX, CY);
  circle(world, { r: R / 2 }); // quick enough to close inside the rest
  assert.equal(stone.hp > 0, true);
  assert.ok(world.course.lassoCool > 0);
  assert.ok(world.course.line.length >= 8, 'the ink stays');
  const s = world.course.line[0];
  const b = bullet(world, s.x1 + 1, s.y1 - 1);
  Object.assign(b, { vy: 60 });
  lineStops(world, TICK);
  assert.equal(b.life, 0, 'the ink of the rest still stops a bullet');
  assert.ok(ofType(drain(world), 'lineStop').length >= 1);
  for (let t = 0; t < LASSO_RECHARGE / TICK + 2; t++) drawLine(world, TICK);
  assert.equal(world.course.lassoCool, 0);
  circle(world, { r: R / 2 });
  assert.equal(stone.hp, 0);
});

test('a loop round a crate holding a bomb breaks it and the bomb is collected next tick', () => {
  const world = lassoWorld();
  const crate = gnd(world, 'crate', CX, CY, 2);
  crate.drop = 'bomb';
  world.ship.bombs = 0;
  circle(world);
  assert.equal(crate.hp, 0);
  assert.equal(world.pickups.length, 1);
  assert.ok(Math.abs(Math.hypot(world.pickups[0].x - CX, world.pickups[0].y - CY) - R) < LINE_STEP, 'the bomb flew to the ship');
  step(world);
  assert.equal(world.ship.bombs, 1);
  assert.equal(caught(world, 'pickups'), 1);
});

test('a dead ship closes nothing, and a respawn sets lassoCool back to 0', () => {
  const world = lassoWorld();
  circle(world, { turns: 0.9 });
  world.ship.alive = false;
  assert.equal(closeLoop(world), false);
  const w2 = lassoWorld();
  world.course.lassoCool = 1;
  w2.course.lassoCool = 1;
  Object.assign(w2.ship, { lives: 1, invuln: 0 });
  hitShip(w2);
  for (let i = 0; i < Math.ceil(RESPAWN_DELAY / TICK) + 3; i++) step(w2);
  assert.equal(w2.course.lassoCool, 0);
});
