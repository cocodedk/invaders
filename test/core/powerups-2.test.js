import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POWERS, TICK } from '../../src/core/kinds.js';
import { LIVES } from '../../src/core/ship.js';
import { hurtAlien } from '../../src/core/aliens.js';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { sweepPickups } from '../../src/core/powerups.js';
import { stateHash } from '../../src/core/state-hash.js';
import { randomInputs } from './replay-kit.js';
import { level, wave, step, seconds, playing, drain, ofType, pickupAt, pickupOnShip } from './world-kit.js';

// R53: the power reserve and the extra life (homing and slow are in homing-slow.test.js).

const lv = (roles = ['grunt']) => level([wave({ rows: roles.length, cols: 3, roles })]);
const powers = (w) => ofType(drain(w), 'power').map((e) => `${e.kind} ${e.on ? 'on' : 'off'}`);

// ---- the reserve -------------------------------------------------------------------------------

test('a displaced power waits with its time left and resumes when the new one ends: off, then on', () => {
  const w = playing(lv());
  pickupOnShip(w, 'spread');
  seconds(w, 6);
  pickupOnShip(w, 'rapid');
  step(w);
  const waiting = w.ship.reserve.left;
  assert.ok(waiting > 3.8 && waiting < 4.1, `spread has ${waiting} s left`);
  assert.deepEqual(powers(w), ['spread on', 'rapid on'], 'no event for the displaced power: it is not over');
  seconds(w, 5);
  assert.equal(w.ship.reserve.left, waiting, 'the reserve does not tick');
  seconds(w, 5.1);
  assert.deepEqual([w.ship.power.kind, w.ship.reserve], ['spread', null]);
  assert.ok(Math.abs(w.ship.power.left - waiting) < 0.2, 'it resumes with the time it had left');
  assert.deepEqual(powers(w), ['rapid off', 'spread on']);
  seconds(w, 4.1);
  assert.deepEqual([w.ship.power, w.ship.reserve], [null, null]);
  assert.deepEqual(powers(w), ['spread off']);
});

test('a third pickup overwrites the reserve: the first power is lost', () => {
  const w = playing(lv());
  for (const kind of ['spread', 'rapid', 'shield']) {
    pickupOnShip(w, kind);
    step(w);
  }
  assert.deepEqual([w.ship.power.kind, w.ship.reserve.kind], ['shield', 'rapid']);
  seconds(w, 40);
  assert.deepEqual(powers(w), ['spread on', 'rapid on', 'shield on', 'shield off', 'rapid on', 'rapid off']);
});

test('a pickup of the running kind puts its remainder in the reserve', () => {
  const w = playing(lv());
  pickupOnShip(w, 'shield');
  seconds(w, 4);
  pickupOnShip(w, 'shield');
  step(w);
  assert.ok(w.ship.power.left > 9.9);
  assert.ok(w.ship.reserve.kind === 'shield' && w.ship.reserve.left > 5.8 && w.ship.reserve.left < 6.1);
  seconds(w, 20);
  assert.deepEqual(powers(w), ['shield on', 'shield on', 'shield off', 'shield on', 'shield off']);
});

// ---- the extra life ----------------------------------------------------------------------------

test('a life pickup adds a life, capped at 3, scores like any pickup and emits only the pickup event', () => {
  const w = playing(lv());
  w.ship.lives = 1;
  pickupOnShip(w, 'life');
  step(w);
  assert.equal(w.ship.lives, 2);
  assert.equal(w.score, 500, 'worth what every pickup is worth');
  const kinds = drain(w).map((e) => e.type).filter((t) => t === 'pickup' || t === 'power');
  assert.deepEqual(kinds, ['pickup']);
  assert.equal(w.ship.power, null);
  for (let i = 0; i < 3; i++) {
    pickupOnShip(w, 'life');
    step(w);
  }
  assert.equal(w.ship.lives, LIVES);
  assert.equal(w.score, 2000, 'a life at full lives still scores');
});

test('the clear\'s sweep scores a life pickup but never grants it', () => {
  const w = playing(lv());
  w.ship.lives = 1;
  pickupAt(w, 'life', 500, 300);
  sweepPickups(w);
  assert.equal(w.ship.lives, 1);
  assert.equal(ofType(w.events, 'sweep').length, 1);
});

test('1000 seeded drops: no life at full lives; about 5 % below, bombs still about 20 %', () => {
  const drops = (lives) => {
    const w = createWorld(lv(['carrier']), 99);
    w.ship.lives = lives;
    for (let i = 0; i < 1000; i++) hurtAlien(w, { id: i, role: 'carrier', x: 500, y: 200, hp: 1 }, 1);
    return (k) => w.pickups.filter((p) => p.kind === k).length;
  };
  const full = drops(LIVES);
  assert.equal(full('life'), 0);
  for (const lives of [1, 2]) {
    const count = drops(lives);
    assert.ok(count('life') >= 30 && count('life') <= 70, `lives ${lives}: ${count('life')} lives`);
    assert.ok(count('bomb') >= 160 && count('bomb') <= 240, `lives ${lives}: ${count('bomb')} bombs`);
    for (const k of POWERS) assert.ok(count(k) >= 95 && count(k) <= 160, `${k} ${count(k)}`); // 125 each: 75 % in six
  }
});

// ---- determinism -------------------------------------------------------------------------------

test('a run with homing, slow, a reserve and a life replays to the same state at every tick', () => {
  const inputs = randomInputs(5, 900);
  const long = level(Array(3).fill(wave({ rows: 2, cols: 6, roles: ['armored', 'gunner'] }))); // outlasts the run
  const fly = () => {
    const w = playing(long, { seed: 7, quiet: false });
    w.ship.invuln = Infinity;
    const hashes = [];
    const seen = new Set();
    inputs.forEach((inp, i) => {
      if (i === 200) w.ship.lives = 1;
      for (const [at, kind] of [[200, 'life'], [300, 'homing'], [420, 'slow'], [440, 'shield']]) {
        if (i === at) pickupOnShip(w, kind);
      }
      stepWorld(w, TICK, inp);
      hashes.push(stateHash(w));
      if (w.ship.reserve) seen.add(`reserve ${w.ship.reserve.kind}`);
      for (const e of w.events.splice(0)) if (e.type === 'power' && e.on) seen.add(e.kind);
    });
    return { hashes, seen, lives: w.ship.lives, state: w.state };
  };
  const [a, b] = [fly(), fly()];
  assert.deepEqual(a.hashes, b.hashes);
  for (const k of ['homing', 'slow', 'shield', 'reserve homing', 'reserve slow']) assert.ok(a.seen.has(k), `never saw ${k}`);
  assert.equal(a.lives, 2, 'the life was taken');
  assert.equal(a.state, 'play', 'the level outlasted the run');
});

test('stateHash sees the reserve: its kind and its time left', () => {
  const w = playing(lv());
  pickupOnShip(w, 'spread');
  step(w);
  pickupOnShip(w, 'rapid');
  step(w);
  const changed = (edit) => {
    const c = structuredClone(w);
    edit(c);
    return stateHash(c) !== stateHash(w);
  };
  assert.ok(changed((c) => { c.ship.reserve.kind = 'laser'; }), 'kind');
  assert.ok(changed((c) => { c.ship.reserve.left -= 0.5; }), 'time left');
  assert.ok(changed((c) => { c.ship.reserve = null; }), 'no reserve');
  assert.ok(!changed((c) => { c.ship.reserve.left += 1e-6; }), 'float dust');
});
