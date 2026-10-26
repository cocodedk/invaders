import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POWERS, POWERS_13, POWERS_16, POWERS_18, SIDE_GUNS, powersFor } from '../../src/core/kinds.js';
import { hurtAlien } from '../../src/core/aliens.js';
import { createWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';
import { BROADSIDE_TIME } from '../../src/core/powerups.js';
import { FIRE, step, seconds, playing, drain, ofType, pickupOnShip, holdAlien } from './world-kit.js';

// World 18's side guns are a power (R67), not world 13's twist: they drop like any power, a catch opens
// them for 6 s and costs the level's medal, and a bomb or a life caught there opens nothing.

const lurking = () => {
  const w = playing(levelById('w18-1'));
  holdAlien(w, 100, 300, 1e6);
  w.ship.lives = 2;
  return w;
};

test('world 18 drops the six powers and the side guns; no other world drops them', () => {
  assert.equal(SIDE_GUNS, 'sideguns');
  assert.deepEqual(POWERS_18, [...POWERS, 'sideguns']);
  assert.equal(powersFor({ world: 18 }), POWERS_18);
  assert.equal(powersFor({ world: 13 }), POWERS_13);
  assert.equal(powersFor({ world: 16 }), POWERS_16);
  for (const n of [1, 12, 14, 17]) assert.equal(powersFor({ world: n }), POWERS, `world ${n}`);
  assert.equal(levelById('w18-1').twist, 'free', 'no twist opens the guns there');
});

test('700 seeded carrier deaths in world 18 drop the side guns about as often as each other power', () => {
  const w = createWorld(levelById('w18-1'), 99);
  for (let i = 0; i < 700; i++) hurtAlien(w, { id: i, role: 'carrier', x: 500, y: 200, hp: 1 }, 1);
  const count = (k) => w.pickups.filter((p) => p.kind === k).length;
  for (const k of POWERS_18) assert.ok(count(k) >= 55 && count(k) <= 105, `${k} ${count(k)}`); // 80 each: 80 % in seven
});

test('catching the side guns opens them for 6 s, says so, costs the medal and leaves the running power on', () => {
  const w = lurking();
  w.ship.power = { kind: 'spread', left: 8 };
  pickupOnShip(w, 'sideguns');
  step(w);
  assert.equal(w.ship.broadside, BROADSIDE_TIME);
  assert.equal(w.ship.powersUsed, 1, 'a power caught: no medal');
  assert.equal(w.ship.power.kind, 'spread', 'the spread keeps running');
  assert.equal(w.ship.reserve, null);
  const ev = drain(w);
  assert.equal(ofType(ev, 'broadside').length, 1);
  assert.equal(ofType(ev, 'power').length, 0);
  step(w, 1, FIRE);
  assert.equal(w.shots.filter((s) => s.broadside).length, 2, 'one shot out of each side');
  seconds(w, BROADSIDE_TIME);
  assert.equal(w.ship.broadside, 0);
});

test('a bomb or a life caught in world 18 opens nothing and keeps the medal', () => {
  for (const kind of ['bomb', 'life']) {
    const w = lurking();
    pickupOnShip(w, kind);
    step(w);
    assert.equal(w.ship.broadside, 0, kind);
    assert.equal(w.ship.powersUsed, 0, kind);
    assert.equal(ofType(drain(w), 'broadside').length, 0, kind);
  }
});
