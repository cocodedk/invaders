import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, EDGE, ALIEN_R, TICK } from '../../src/core/kinds.js';
import { HUD_CLEAR } from '../../src/core/formations.js';
import { HOP, BODY_MAX, hopFrom } from '../../src/core/tumble.js';
import { LAUNCH, BONK, BONK_BOSS, BANKS, BONK_MAX, STRIKE_AT } from '../../src/core/bonk.js';
import { bombBoss } from '../../src/core/boss-hit.js';
import { step, drain, ofType, addAlien } from './world-kit.js';
import { bossWorld, part, shotOn } from './boss-kit.js';
import { arena, bodyAt, flyer, until, collect } from './bonk-kit.js';

// World 19's flight (R71): a batted body is spent on the first live alien it crosses. A knock-out hands its
// flight on to the new body (the bowling chain), a survivor or a boss part sends it back where its move began,
// dizzy again, and it banks once off a wall it crosses from inside.
const LO = EDGE + ALIEN_R;
const HI = WIDTH - EDGE - ALIEN_R;
const row = (w, n, o) => Array.from({ length: n }, (_, i) => addAlien(w, 600 + 100 * i, 500, o));

test('a knock-out hands the flight on: the striker is spent and the new body flies on with its velocity and banks, a link deeper', () => {
  const w = arena();
  const [first] = row(w, 2);
  const striker = flyer(w, 500, 500, LAUNCH, 0, { banks: 0 });
  const { events } = until(w, 'bonk');
  const types = events.map((e) => e.type).filter((t) => t === 'bonk' || t === 'kill');
  assert.deepEqual(types, ['bonk', 'kill'], 'the bonk comes before the damage');
  assert.deepEqual(ofType(events, 'bonk').map(({ id, role, x, y, link, ko }) => ({ id, role, x, y, link, ko })),
    [{ id: first.id, role: 'grunt', x: 600, y: 500, link: 0, ko: true }]);
  assert.ok(!w.twist.bodies.includes(striker), 'the striker is spent');
  const nb = w.twist.bodies.find((b) => b.id === first.id);
  assert.deepEqual([nb.x, nb.y, nb.vx, nb.vy, nb.fly, nb.link, nb.banks, nb.bonks], [600, 500, LAUNCH, 0, true, 1, 0, 0]);
});

test('a chain down a row: one bonk a link, and one strike when a chain reaches STRIKE_AT knock-outs', () => {
  const w = arena();
  const aliens = row(w, STRIKE_AT + 2);
  flyer(w, 500, 500, LAUNCH, 0);
  const events = collect(w, 60);
  const bonks = ofType(events, 'bonk');
  assert.deepEqual(bonks.map((e) => e.link), aliens.map((_, i) => i));
  assert.ok(bonks.every((e) => e.ko));
  const strikes = ofType(events, 'strike');
  assert.equal(strikes.length, 1);
  assert.deepEqual(strikes[0], { type: 'strike', tick: strikes[0].tick, x: aliens[STRIKE_AT - 1].x, y: 500, links: STRIKE_AT });
  assert.ok(aliens.every((a) => a.hp <= 0));
});

test('at the cap a chain is never cut: the spent striker frees the place its knock-out takes', () => {
  const w = arena();
  for (let i = 1; i < BODY_MAX; i++) bodyAt(w, 300 + (i % 20) * 60, 220 + Math.floor(i / 20) * 50);
  const [a] = row(w, 1);
  flyer(w, 500, 500, LAUNCH, 0);
  until(w, 'bonk');
  const nb = w.twist.bodies.find((b) => b.id === a.id);
  assert.ok(nb && nb.fly, 'the knock-out flies on');
  assert.equal(w.twist.bodies.length, BODY_MAX);
});

test('a survivor sends the body back where its move began, dizzy and hopping; at BONK_MAX it fizzles', () => {
  const w = arena();
  const tough = addAlien(w, 1000, 500, { hp: BONK + 1, role: 'armored' });
  const b = flyer(w, 880, 500, LAUNCH, 0, { link: 2 });
  let from;
  let events = [];
  for (let n = 0; !events.length; n++) {
    assert.ok(n < 60, 'the body reached the survivor within a second');
    from = { x: b.x, y: b.y };
    step(w);
    events = drain(w).filter((e) => e.type === 'bonk' || e.type === 'hit');
  }
  assert.deepEqual(events.map(({ type, ko, hp }) => [type, ko, hp]), [['bonk', false, undefined], ['hit', undefined, 1]]);
  assert.deepEqual([b.x, b.y, b.fly, b.vx, b.vy, b.link, b.bonks], [from.x, from.y, false, 0, hopFrom(from.y), 0, 1]);
  assert.equal(b.vy, -HOP);
  assert.equal(tough.hp, 1);
  const last = flyer(w, 880, 700, LAUNCH, 0, { bonks: BONK_MAX - 1 });
  addAlien(w, 1000, 700, { hp: 1e6 });
  const { events: end } = until(w, 'fizzle');
  assert.deepEqual(ofType(end, 'fizzle').map(({ id, role }) => ({ id, role })), [{ id: last.id, role: 'grunt' }]);
  assert.ok(!w.twist.bodies.includes(last));
});

test('a rebound under the HUD does not hop: the body never rises above HUD_CLEAR', () => {
  const w = arena();
  addAlien(w, 1000, 150, { hp: 1e6 });
  const b = flyer(w, 880, 150, LAUNCH, 0);
  until(w, 'bonk');
  assert.deepEqual([b.fly, b.bonks], [false, 1]);
  let top = b.y;
  for (let i = 0; i < 60; i++) { step(w); top = Math.min(top, b.y); }
  assert.ok(top >= HUD_CLEAR, `up to ${top}`);
});

test('a body banks once off a wall it crosses from inside, then flies on through the other', () => {
  for (const [x, vx] of [[HI - 5, LAUNCH], [LO + 5, -LAUNCH]]) {
    const w = arena();
    const b = flyer(w, x, 600, vx, 0);
    step(w);
    const [e] = ofType(drain(w), 'bank');
    const wall = vx > 0 ? HI : LO;
    const crossed = x + vx * TICK;
    assert.ok(Math.abs(b.x - (2 * wall - crossed)) < 1e-9 && b.vx === -vx && b.banks === BANKS - 1, `off the wall at ${wall}`);
    assert.deepEqual([e.x, e.y], [b.x, 600]);
    const rest = collect(w, 150);
    assert.equal(ofType(rest, 'bank').length, 0, 'no bank left for the far wall');
    assert.equal(w.twist.bodies.length, 0, 'gone off the far side');
  }
});

test('the hit test runs on the bank tick too, and the rebound goes back inside the wall', () => {
  const w = arena();
  addAlien(w, HI - 40, 600, { hp: 1e6 });
  const b = flyer(w, HI - 5, 600, LAUNCH, 0);
  step(w);
  const events = drain(w);
  assert.deepEqual(events.filter((e) => e.type === 'bank' || e.type === 'bonk').map((e) => e.type), ['bank', 'bonk']);
  assert.deepEqual([b.x, b.y, b.fly], [HI - 5, 600, false]);
});

test('a body that starts beyond a wall flies on with no bank, out or in', () => {
  const out = arena();
  flyer(out, EDGE, 600, -LAUNCH, 0);
  assert.equal(ofType(collect(out, 10), 'bank').length, 0);
  assert.equal(out.twist.bodies.length, 0);
  const back = arena();
  const b = flyer(back, EDGE, 600, LAUNCH, 0);
  assert.equal(ofType(collect(back, 5), 'bank').length, 0);
  assert.ok(b.x > LO && b.banks === BANKS, 'in across the wall, its bank kept');
});

test('a boss part takes BONK_BOSS through its own rule and sends the body back; an alien in front takes it first', () => {
  const w = bossWorld('duck', {}, { world: 19, twist: 'bonk', free: true });
  const share = (id) => {
    const p = part(w, id);
    const hp = p.hp;
    shotOn(w, p);
    step(w);
    drain(w);
    return hp - p.hp;
  };
  const shot = { squeak: share('squeak'), bandL: share('bandL') };
  assert.equal(w.boss.bonked, undefined, 'a shot leaves no bonk stamp');
  for (const [id, dx] of [['squeak', 0], ['bandL', -50]]) {
    const p = part(w, id);
    const hp = p.hp;
    const b = flyer(w, p.x + dx, p.y + p.h / 2 + 40, 0, -LAUNCH, { link: 1 });
    const { events } = until(w, 'bonk');
    const [e] = ofType(events, 'bonk');
    assert.deepEqual([e.id, e.role, e.part, e.link, e.ko, w.boss.bonked], [id, 'boss', id, 1, false, e.tick]);
    assert.ok(e.x === b.x && Math.abs(e.y - (b.y - LAUNCH * TICK)) < 1e-9, `${id}: the bonk is where the body was, a tick past its rebound spot`);
    assert.ok(Math.abs(hp - p.hp - BONK_BOSS * shot[id]) < 1e-9, `${id}: ${hp - p.hp}`);
    assert.deepEqual([b.fly, b.bonks], [false, 1]);
  }
  const p = part(w, 'squeak');
  const guard = addAlien(w, p.x, p.y + p.h / 2 + 30, { hp: 1e6 });
  const hp = p.hp;
  flyer(w, p.x, p.y + p.h / 2 + 90, 0, -LAUNCH);
  const [e] = ofType(until(w, 'bonk').events, 'bonk');
  assert.deepEqual([e.id, p.hp], [guard.id, hp]);
});

test('a bonk that finishes a part stamps the boss too; a bomb does not', () => {
  const w = bossWorld('duck', {}, { world: 19, twist: 'bonk', free: true });
  bombBoss(w);
  drain(w);
  assert.equal(w.boss.bonked, undefined, 'a bomb leaves no bonk stamp');
  const p = part(w, 'footL');
  p.hp = BONK_BOSS / 2;
  flyer(w, p.x, p.y + p.h / 2 + 40, 0, -LAUNCH);
  const [e] = ofType(until(w, 'bonk').events, 'bonk');
  assert.deepEqual([e.part, p.hp, w.boss.bonked], ['footL', 0, e.tick]);
});
