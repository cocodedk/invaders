import { test } from 'node:test';
import assert from 'node:assert/strict';
import { powerTime, POWER_TIME } from '../../src/core/powerups.js';
import { TRIDENT_R } from '../../src/core/ship.js';
import {
  FIRE, level, wave, step, seconds, playing, drain, ofType, holdAlien, addAlien, pickupOnShip, solid,
} from './world-kit.js';
import { bossWorld, part } from './boss-kit.js';

// World 15's power: the ship's shot becomes a trident bolt (r 7, 1 damage, the base rate) that runs
// through every alien and boss part in its path and hurts each once, and still stops at a bunker.

const lv = (extra = {}) => level([wave({ rows: 1, cols: 3, roles: ['grunt'] })], 0, { world: 15, ...extra });
const withTrident = (w) => {
  w.ship.power = { kind: 'trident', left: POWER_TIME };
  return w;
};
// A bolt placed by hand, flying straight up.
const bolt = (w, x, y) => {
  const s = { pattern: 'shot', x, y, vx: 0, vy: -1400, r: TRIDENT_R, life: 1.5, dmg: 1, trident: true, pierced: [] };
  w.shots.push(s);
  return s;
};
// An alien column over the ship, nearest last, with a far alien of endless hp so the wave never clears.
function column(w, ys, hp = 1) {
  const x = w.ship.x;
  holdAlien(w, 100, 300, 1e6);
  return ys.map((y) => addAlien(w, x, y, { hp }));
}

test('the trident lasts 10 s, like most powers, and is picked up as any pickup', () => {
  assert.equal(powerTime('trident'), POWER_TIME);
  const w = playing(lv());
  w.pickups.length = 0;
  pickupOnShip(w, 'trident');
  step(w);
  assert.deepEqual(w.ship.power, { kind: 'trident', left: 10 });
  assert.deepEqual(ofType(drain(w), 'power').map((e) => [e.kind, e.on]), [['trident', true]]);
  seconds(w, 10.1);
  assert.equal(w.ship.power, null);
});

test('under the trident the shot is a trident bolt: r 7, 1 damage, straight up, marked and empty-handed', () => {
  const w = withTrident(playing(lv()));
  step(w, 1, FIRE);
  const shots = w.shots.filter((s) => s.life === 1.5);
  assert.equal(shots.length, 1);
  assert.deepEqual(shots[0], {
    pattern: 'shot', x: w.ship.x, y: w.ship.y - 22, vx: 0, vy: -1400, r: 7, life: 1.5, dmg: 1, trident: true, pierced: [],
  });
  assert.equal(TRIDENT_R, 7);
  assert.equal(ofType(drain(w), 'fire')[0].power, 'trident');
  const plain = playing(lv());
  step(plain, 1, FIRE);
  assert.ok(!plain.shots[0].trident && !plain.shots[0].pierced && plain.shots[0].r === 5, 'no power: the plain shot');
});

test('the trident fires at the base rate, not faster', () => {
  const count = (power) => {
    const w = playing(lv());
    holdAlien(w, 100, 300, 1e9);
    if (power) w.ship.power = { kind: power, left: 99 };
    let n = 0;
    for (let i = 0; i < 180; i++) {
      step(w, 1, FIRE);
      n += w.shots.filter((s) => s.life === 1.5).length;
    }
    return n;
  };
  assert.equal(count('trident'), count(null));
  assert.ok(count('trident') < count('rapid'));
});

test('it runs through a column and hurts each alien once: a plain shot stops at the first', () => {
  const ys = [540, 460, 380, 300];
  const w = withTrident(playing(lv()));
  const col = column(w, ys, 1);
  step(w, 1, FIRE);
  const s = w.shots.find((q) => q.life === 1.5);
  seconds(w, 0.7);
  assert.deepEqual(col.map((a) => a.hp), [0, 0, 0, 0], 'all four');
  assert.equal(ofType(drain(w), 'kill').length, 4);
  assert.deepEqual(s.pierced, col.map((a) => a.id), 'in the order it met them, nearest first');
  assert.ok(s.life > 0, 'the bolt flew on');
  const plain = playing(lv());
  const col2 = column(plain, ys, 1);
  step(plain, 1, FIRE);
  seconds(plain, 0.7);
  assert.deepEqual(col2.map((a) => a.hp), [0, 1, 1, 1], 'the plain shot only killed the lowest');
});

test('each alien takes the bolt\'s 1 damage once, however long the bolt overlaps it', () => {
  const w = withTrident(playing(lv()));
  const col = column(w, [540, 400], 3);
  step(w, 1, FIRE);
  seconds(w, 0.7);
  assert.deepEqual(col.map((a) => a.hp), [2, 2]);
  const hits = ofType(drain(w), 'hit').filter((e) => e.role !== 'boss');
  assert.deepEqual(hits.map((e) => [e.id, e.dmg]), col.map((a) => [a.id, 1]), 'one hit event each');
  const s = w.shots.find((q) => q.trident);
  assert.equal(s.pierced.length, 2);
});

test('its path is wider than the base shot\'s: 33 px from an alien\'s centre hits, 36 px does not', () => {
  for (const [dx, hurt] of [[32, true], [36, false]]) {
    const w = playing(lv());
    holdAlien(w, 100, 300, 1e6);
    const a = addAlien(w, w.ship.x + dx, 500, { hp: 3 });
    bolt(w, w.ship.x, 800);
    seconds(w, 0.6);
    assert.equal(a.hp, hurt ? 2 : 3, `${dx} px off`);
  }
  const w = playing(lv());
  holdAlien(w, 100, 300, 1e6);
  const a = addAlien(w, w.ship.x + 32, 500, { hp: 3 });
  w.shots.push({ pattern: 'shot', x: w.ship.x, y: 800, vx: 0, vy: -1400, r: 5, life: 1.5, dmg: 1 });
  seconds(w, 0.6);
  assert.equal(a.hp, 3, 'the plain shot (r 5, reach 31) misses at 32 px');
});

test('it runs through boss parts, plates and hulls included, each hurt once by its own rule', () => {
  const w = bossWorld('angler');
  const [belly, maw, crest] = ['belly', 'maw', 'crest'].map((id) => part(w, id));
  const hp = [belly.hp, maw.hp, crest.hp];
  const s = bolt(w, belly.x, 800);
  seconds(w, 0.7);
  assert.deepEqual([belly.hp, maw.hp, crest.hp], [hp[0] - 1, hp[1] - 1, hp[2] - 0.25], 'weak 100 %, plate 25 %');
  assert.deepEqual(s.pierced, ['belly', 'maw', 'crest'], 'in the order it entered them');
  const hits = ofType(drain(w), 'hit').filter((e) => e.role === 'boss');
  assert.deepEqual(hits.map((e) => [e.part, e.dmg]), [['belly', 1], ['maw', 1], ['crest', 0.25]], 'one hit each');
  assert.ok(s.life > 0, 'and the bolt flew on');
  assert.equal(w.boss.hp, w.boss.maxHp - 2.25);

  const f = bossWorld('fortress');
  const core = part(f, 'core');
  const fs = bolt(f, core.x, 800);
  seconds(f, 0.7);
  assert.equal(fs.pierced[0], 'core', 'the hull is the first part it meets (the boss sways, so a plate beside it may follow)');
  assert.equal(core.hp, core.max, 'and takes nothing');
  assert.ok(fs.life > 0, 'a bare hull does not stop it');
  const plain = bossWorld('fortress');
  plain.shots.push({ pattern: 'shot', x: part(plain, 'core').x, y: 800, vx: 0, vy: -1400, r: 5, life: 1.5, dmg: 1 });
  seconds(plain, 0.7);
  assert.equal(plain.shots.filter((q) => q.life > 0).length, 0, 'the plain shot is soaked by the hull');
});

test('it still stops at a bunker and carves it, and hurts only what lay in front of it', () => {
  const w = withTrident(playing(lv({ bunkers: true })));
  holdAlien(w, 100, 300, 1e6);
  const b = w.bunkers[1];
  const x = b.x + 20; // solid stone, not the arch
  const before = solid(b);
  const front = addAlien(w, x, 660, { hp: 3 }); // between the ship and the bunker
  const behind = addAlien(w, x, 400, { hp: 3 }); // beyond it
  const s = bolt(w, x, 780);
  seconds(w, 0.6);
  assert.equal(front.hp, 2, 'hurt on its way');
  assert.equal(behind.hp, 3, 'the bunker stopped it');
  assert.equal(s.life, 0);
  assert.ok(solid(b) < before, 'it carved the bunker');
  assert.equal(ofType(drain(w), 'bunker').length, 1);
});

test('a trident run clones and replays exactly: the ids it has hurt ride in the clone', () => {
  const run = (w, ticks) => {
    for (let i = 0; i < ticks; i++) {
      w.ship.power ??= { kind: 'trident', left: 4 };
      step(w, 1, { ...FIRE, dx: i % 100 < 50 ? 1 : -1 });
    }
    return w;
  };
  const make = () => {
    const w = playing(level([wave({ rows: 4, cols: 8, roles: ['grunt', 'armored', 'gunner', 'grunt'], formation: 'grid' })], 0.7, { world: 15 }), { quiet: false });
    w.ship.invuln = Infinity;
    return run(w, 150);
  };
  const a = make();
  const c = structuredClone(a);
  assert.ok(a.shots.some((s) => s.trident && s.pierced.length) || a.aliens.some((x) => x.hp < x.maxHp) || a.score > 0, 'the bolts did something');
  run(a, 300);
  run(c, 300);
  assert.equal(JSON.stringify([a.aliens, a.shots, a.score, a.rng]), JSON.stringify([c.aliens, c.shots, c.score, c.rng]));
});
