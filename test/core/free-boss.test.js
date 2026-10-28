import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INVULN } from '../../src/core/ship.js';
import { bossWorld, part } from './boss-kit.js';
import { step, seconds, drain, ofType } from './world-kit.js';

// R67 against a boss: in a free level the ship can fly up to the boss, so touching a live part rams it
// (a life, the boss untouched), and the homing bullets the ship has dragged round hurt the boss's parts
// by their own rule. The Squall Ray (world 18) is the boss these rules were made for.

const fight = () => bossWorld('ray', {}, { free: true, world: 18 });
const onPart = (w, id) => {
  const p = part(w, id);
  Object.assign(w.ship, { x: p.x, y: p.y });
  return p;
};
// A dragged homing bullet 10 px under the part, climbing into it, with the ship far below it.
const dragged = (w, p) => {
  Object.assign(w.ship, { x: p.x, y: 1000 });
  const b = { pattern: 'homing', x: p.x, y: p.y + p.h / 2 + 10, vx: 0, vy: -320, r: 10, life: 6, turn: Math.PI / 3, h0: Math.PI / 2, dragged: true };
  w.bullets.push(b);
  return b;
};

test("touching a live part of the boss costs a life and leaves the boss whole; the blink passes, as in a ram", () => {
  const w = fight();
  const hp = w.boss.hp;
  onPart(w, 'maw');
  step(w);
  const hits = ofType(drain(w), 'shipHit');
  assert.deepEqual(hits.map((e) => e.source), ['ram']);
  assert.equal(w.ship.lives, 2);
  assert.equal(w.boss.hp, hp, 'the boss takes nothing');
  onPart(w, 'maw');
  seconds(w, INVULN - 0.2);
  assert.equal(w.ship.lives, 2, 'not again while the ship blinks');
});

test('a part that is down no longer rams, and a shielded ship grazes the boss unharmed and silent', () => {
  const w = fight();
  part(w, 'coilL').hp = 0;
  onPart(w, 'coilL');
  step(w, 10);
  assert.equal(w.ship.lives, 3, 'the coil is gone');
  w.ship.power = { kind: 'shield', left: 10 };
  onPart(w, 'heart');
  step(w, 30);
  assert.equal(w.ship.lives, 3);
  const ev = drain(w);
  assert.equal(ofType(ev, 'shipHit').length + ofType(ev, 'shieldHit').length, 0);
});

test('a dragged homing bullet hurts the first part it enters: 1 on a weak part, a quarter on armour, with a backfire', () => {
  for (const [id, want] of [['maw', 1], ['wingL', 0.25]]) {
    const w = fight();
    const p = part(w, id);
    const before = p.hp;
    const b = dragged(w, p);
    step(w, 4);
    assert.ok(!w.bullets.includes(b), `${id}: the bullet is spent`);
    assert.ok(Math.abs(before - p.hp - want) < 1e-9, `${id} lost ${before - p.hp}`);
    const fire = ofType(drain(w), 'backfire');
    assert.equal(fire.length, 1, id);
    assert.equal(fire[0].role, 'boss');
    assert.equal(fire[0].id, id);
  }
});

test('a homing bullet still on its first course flies through the boss', () => {
  const w = fight();
  const p = part(w, 'maw');
  const before = p.hp;
  const b = dragged(w, p);
  delete b.dragged;
  delete b.h0;
  step(w, 4);
  assert.equal(p.hp, before);
  assert.equal(ofType(drain(w), 'backfire').length, 0);
});
