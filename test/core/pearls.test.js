import { test } from 'node:test';
import assert from 'node:assert/strict';
import { powerTime, POWER_TIME } from '../../src/core/powerups.js';
import { pearlsOf, PEARL_ORBIT, PEARL_R, PEARL_COUNT, PEARL_TURN, PEARL_COOL } from '../../src/core/pearls.js';
import {
  TICK, FIRE, level, wave, step, seconds, playing, drain, ofType, holdAlien, bulletAt, bulletOnShip, pickupOnShip,
} from './world-kit.js';

// World 15's power: three pearls circle the ship for 10 s. A pearl wipes any enemy bullet it touches
// (never a beam), hurts any alien it touches for 1 and then spares it 0.25 s, and the ship keeps firing
// its base shot. Only world 15 drops it (powers-15.test.js).

const w15 = () => level([wave({ rows: 1, cols: 3, roles: ['grunt'] })], 0, { world: 15 });
// Where the pearls are when the next tick's collisions look: the power has lost TICK of its time by then.
const after = (w) => pearlsOf({ ...w.ship, power: { ...w.ship.power, left: w.ship.power.left - TICK } });
const withPearls = (w) => {
  w.ship.power = { kind: 'pearls', left: POWER_TIME };
  return w;
};
// Hold the pearls still: the power's time is put back before every tick, so they stay where `after` says.
const frozen = (w, ticks) => {
  for (let i = 0; i < ticks; i++) {
    w.ship.power.left = POWER_TIME;
    step(w);
  }
};
const close = (p, x, y) => assert.ok(Math.hypot(p.x - x, p.y - y) < 1e-9, `(${p.x}, ${p.y}) is not (${x}, ${y})`);

test('the pearls last 10 s with the ring and the reserve of R53, and score as any pickup', () => {
  assert.equal(powerTime('pearls'), POWER_TIME);
  const w = playing(w15());
  w.pickups.length = 0;
  pickupOnShip(w, 'pearls');
  step(w);
  assert.deepEqual(w.ship.power, { kind: 'pearls', left: 10 });
  const ev = drain(w);
  assert.deepEqual(ofType(ev, 'power').map((e) => [e.kind, e.on]), [['pearls', true]]);
  assert.equal(ofType(ev, 'pickup')[0].kind, 'pearls');
  assert.equal(w.score, 500, 'the flat 500 for a pickup');
  seconds(w, 2);
  pickupOnShip(w, 'rapid');
  step(w);
  assert.equal(w.ship.reserve.kind, 'pearls');
  assert.ok(Math.abs(w.ship.reserve.left - 8) < 0.1, `left ${w.ship.reserve.left}`);
  seconds(w, 10.2);
  assert.equal(w.ship.power.kind, 'pearls', 'the reserve takes over');
  seconds(w, 8);
  assert.equal(w.ship.power, null);
  assert.deepEqual(pearlsOf(w.ship), []);
});

test('three pearls 78 px out, evenly spaced, from the top, clockwise, one turn every 1.2 s, exact from the time left', () => {
  assert.deepEqual([PEARL_COUNT, PEARL_ORBIT, PEARL_R, PEARL_TURN, PEARL_COOL], [3, 78, 13, 1.2, 0.25]);
  const ship = { x: 900, y: 800, alive: true, power: { kind: 'pearls', left: 10 } };
  const [a, b, c] = pearlsOf(ship);
  const s = (78 * Math.sqrt(3)) / 2;
  close(a, 900, 722);
  close(b, 900 + s, 839);
  close(c, 900 - s, 839);
  const turned = (t) => pearlsOf({ ...ship, power: { kind: 'pearls', left: 10 - t } });
  close(turned(0.3)[0], 978, 800); // a quarter turn: the first pearl is on the right
  close(turned(0.6)[0], 900, 878); // a half turn: at the bottom
  close(turned(1.2)[0], 900, 722); // a whole turn: back at the top
  const ring0 = pearlsOf(ship);
  turned(0.4).forEach((p, i) => close(p, ring0[(i + 1) % 3].x, ring0[(i + 1) % 3].y)); // a third of a turn: each is where the next was
  for (const left of [10, 7.77, 3.1, 0.05]) {
    const ring = pearlsOf({ ...ship, power: { kind: 'pearls', left } });
    for (const p of ring) assert.ok(Math.abs(Math.hypot(p.x - 900, p.y - 800) - 78) < 1e-9);
    assert.ok(Math.abs(Math.hypot(ring[0].x - ring[1].x, ring[0].y - ring[1].y) - 78 * Math.sqrt(3)) < 1e-9);
  }
  assert.deepEqual(pearlsOf({ ...ship, power: { kind: 'rapid', left: 5 } }), [], 'another power: none');
  assert.deepEqual(pearlsOf({ ...ship, power: null }), [], 'no power: none');
  assert.deepEqual(pearlsOf({ ...ship, alive: false }), [], 'a lost ship has none');
});

test('a pearl wipes an enemy bullet it touches, and says so where the pearl is', () => {
  const w = withPearls(playing(w15()));
  const p = after(w);
  bulletAt(w, p[1].x + 10, p[1].y); // 10 px off: touching (8 + 13 = 21)
  bulletAt(w, p[2].x + 25, p[2].y); // 25 px off: clear
  step(w);
  assert.equal(w.bullets.length, 1, 'the touching one is gone');
  assert.equal(Math.round(w.bullets[0].x), Math.round(p[2].x + 25));
  assert.deepEqual(ofType(drain(w), 'pearlBlock').map((e) => [e.x, e.y, e.pearl]), [[p[1].x, p[1].y, 1]]);
  assert.equal(w.ship.lives, 3);
});

test('a fast bullet cannot tunnel through a pearl: the path of the tick is tested', () => {
  const w = withPearls(playing(w15()));
  const [p] = after(w);
  bulletAt(w, p.x - 33, p.y, 4000, 0); // it ends the tick 33 px past the pearl: only the swept test sees it
  step(w);
  assert.equal(w.bullets.length, 0);
  assert.equal(ofType(drain(w), 'pearlBlock').length, 1);
});

test('the pearls do not stop a beam, and do not shield what is already inside the ring', () => {
  const w = withPearls(playing(w15()));
  const [p] = after(w);
  w.bullets.push({ pattern: 'laser', x: 100, y: p.y, vx: 1, vy: 0, r: 9, life: 1.4, warn: 0 }); // burns through pearl 0, level with it
  step(w, 5);
  assert.equal(w.bullets.length, 1, 'the beam burns on');
  assert.equal(ofType(drain(w), 'pearlBlock').length, 0);
  bulletOnShip(w);
  step(w);
  assert.equal(ofType(drain(w), 'shipHit').length, 1, 'a bullet inside the ring reaches the ship');
});

test('a block is not a dodge: a bullet the pearl wipes reports no near miss', () => {
  const w = withPearls(playing(w15()));
  const [p] = after(w);
  bulletAt(w, p.x, p.y);
  const b = w.bullets[0];
  b.near = 20; // it had come close to the ship before
  step(w);
  assert.equal(b.life, 0);
  assert.equal(b.near, true);
  assert.equal(ofType(drain(w), 'nearMiss').length, 0);
});

test('a pearl touching an alien deals 1 damage and sparks it, then spares it 0.25 s: one hit every 15 ticks', () => {
  const w = withPearls(playing(w15()));
  const [p] = after(w);
  const a = holdAlien(w, p.x + 30, p.y, 100); // 30 px off: touching (26 + 13 = 39)
  const far = { ...a, id: 901, x: 100, y: 300 };
  w.aliens.push(far);
  assert.ok(!('pearlCool' in a) && !('pearlCool' in far), 'no timer before a hit');
  frozen(w, 61);
  const ev = drain(w);
  const hits = ofType(ev, 'pearlHit');
  assert.deepEqual(hits.map((e) => e.tick - hits[0].tick), [0, 15, 30, 45, 60], 'every 0.25 s while it stays in reach');
  assert.deepEqual([hits[0].x, hits[0].y, hits[0].pearl], [a.x, a.y, 0]);
  assert.equal(a.hp, 95);
  assert.equal(ofType(ev, 'hit').filter((e) => e.id === 900).length, 5, 'each is a plain hit of 1 too');
  assert.ok('pearlCool' in a && !('pearlCool' in far), 'the timer lives on the alien that was hit');
  assert.equal(far.hp, 100, 'out of reach: untouched');
});

test('each alien has its own timer, and a pearl kills what it hurts to death: scored, with its pearlHit first', () => {
  const w = withPearls(playing(w15()));
  const p = after(w);
  const a = holdAlien(w, p[0].x + 30, p[0].y, 5);
  const b = { ...a, id: 901, x: p[1].x + 30, y: p[1].y, hp: 1, maxHp: 1 };
  w.aliens.push(b, { ...a, id: 902, x: 100, y: 300, hp: 1e6 });
  step(w);
  const ev = drain(w);
  assert.deepEqual([a.hp, b.hp], [4, 0]);
  const order = ev.map((e) => e.type).filter((t) => t === 'pearlHit' || t === 'kill');
  assert.deepEqual(order, ['pearlHit', 'pearlHit', 'kill']);
  assert.equal(ofType(ev, 'kill')[0].role, 'grunt');
  assert.ok(w.score >= 100);
});

test('the ship keeps firing its base shot under the pearls', () => {
  const w = withPearls(playing(w15()));
  step(w, 1, FIRE);
  const shots = w.shots.filter((s) => s.life === 1.5);
  assert.equal(shots.length, 1);
  assert.deepEqual([shots[0].r, shots[0].dmg, shots[0].vy], [5, 1, -1400]);
  assert.ok(!shots[0].trident && !shots[0].pierced);
  assert.equal(ofType(drain(w), 'fire')[0].power, 'pearls');
});

test('a world with the pearls clones and replays exactly, timers and all', () => {
  const run = (w, ticks) => {
    for (let i = 0; i < ticks; i++) {
      w.ship.power ??= { kind: 'pearls', left: 5 };
      step(w, 1, { ...FIRE, dx: i % 120 < 60 ? 1 : -1 });
    }
    return w;
  };
  const make = () => {
    const w = playing(level([wave({ rows: 3, cols: 8, roles: ['diver', 'grunt', 'grunt'], formation: 'dive' })], 0.7, { world: 15 }), { quiet: false });
    w.ship.invuln = Infinity;
    return run(w, 200);
  };
  const a = make();
  const b = make();
  const c = structuredClone(a);
  const events = [a, b].map((w) => w.events.filter((e) => e.type.startsWith('pearl')).length);
  assert.ok(events[0] > 0, 'the pearls did something in the run');
  assert.equal(JSON.stringify(a.aliens), JSON.stringify(b.aliens));
  run(a, 300);
  run(c, 300);
  assert.equal(JSON.stringify([a.aliens, a.bullets, a.score, a.rng]), JSON.stringify([c.aliens, c.bullets, c.score, c.rng]));
});
