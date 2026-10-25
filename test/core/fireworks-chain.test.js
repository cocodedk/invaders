import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hurtAlien } from '../../src/core/aliens.js';
import { FUSE } from '../../src/core/fireworks.js';
import { burstAt } from '../../src/core/damage.js';
import { part, bossLevel } from './boss-kit.js';
import {
  TICK, input, level, wave, step, playing, drain, ofType, holdAlien, addAlien,
} from './world-kit.js';

// World 14's chain and its targets: a shell killed by a burst lights its own fuse one link deeper, a
// bomb-killed shell bursts too, and a burst reaches a boss's parts through their armor rule.

const w14 = () => level([wave({ rows: 1, cols: 3, roles: ['grunt'] }), wave()], 0, { world: 14, twist: 'fireworks' });
const arena = () => {
  const w = playing(w14());
  holdAlien(w, 100, 300, 1e6); // far away, and it never dies: the level is never cleared
  return w;
};
const shell = (w, x, y, o = {}) => addAlien(w, x, y, { shell: true, ...o });
// Every burst event of the next `ticks` ticks, with its position.
function bursts(w, ticks = 120) {
  const out = [];
  for (let i = 0; i < ticks; i++) {
    step(w);
    for (const e of ofType(drain(w), 'burst')) out.push(e);
  }
  return out;
}

test('a row of shells goes off pop, pop, pop: depth 0, 1, 2, a fuse apart', () => {
  const w = arena();
  const row = [600, 700, 800].map((x) => shell(w, x, 300));
  hurtAlien(w, row[0], 1);
  const got = bursts(w);
  assert.deepEqual(got.map((e) => [e.x, e.depth]), [[600, 0], [700, 1], [800, 2]]);
  for (let i = 1; i < got.length; i++) {
    const gap = (got[i].tick - got[i - 1].tick) * TICK;
    assert.ok(gap >= FUSE - 1e-9 && gap < FUSE + TICK, `link ${i} ${gap} s after the one before`);
  }
  assert.ok(row.every((a) => a.hp <= 0), 'every shell of the row is dead');
  assert.equal(w.twist.fuses.length, 0);
});

test('shells killed by the same burst all light at the next depth, and one killed earlier keeps its own', () => {
  const w = arena();
  const [a, b, c] = [[600, 300], [600, 400], [700, 350]].map(([x, y]) => shell(w, x, y));
  const lone = shell(w, 1500, 300);
  hurtAlien(w, lone, 1); // a shot killed this one: depth 0, far from the rest
  hurtAlien(w, a, 1);
  const got = bursts(w);
  assert.deepEqual(got.map((e) => [e.x, e.y, e.depth]).sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]),
    [[600, 300, 0], [600, 400, 1], [700, 350, 1], [1500, 300, 0]]);
  assert.ok(b.hp <= 0 && c.hp <= 0);
});

test('a burst deepens only the fuses it lit itself, never one already burning', () => {
  const w = arena();
  const early = shell(w, 600, 300);
  const victim = shell(w, 700, 300);
  hurtAlien(w, early, 1);
  step(w, 3); // early's fuse burns; now a second, unrelated shell dies by a shot
  const other = shell(w, 1200, 300);
  hurtAlien(w, other, 1);
  const got = bursts(w);
  const depthAt = (x) => got.find((e) => e.x === x).depth;
  assert.deepEqual([depthAt(600), depthAt(700), depthAt(1200)], [0, 1, 0]);
  assert.ok(victim.hp <= 0);
});

test('a shell killed by a bomb bursts too, at depth 0, and so does every shell the bomb killed', () => {
  const w = arena();
  const near = addAlien(w, 600, 300, { hp: 10 });
  shell(w, 500, 300);
  shell(w, 1300, 300);
  step(w, 1, input({ bomb: true }));
  assert.equal(near.hp, 7, 'the bomb does 3');
  const got = bursts(w);
  assert.deepEqual(got.map((e) => [e.x, e.depth]), [[500, 0], [1300, 0]]);
  assert.equal(near.hp, 6, 'and the burst, 1 more');
});

// A world 14 boss level past the carousel's entrance.
function carousel() {
  const w = playing(level(undefined, 0, { boss: 'carousel', world: 14, twist: 'fireworks' }));
  while (w.boss.enter > 0) step(w);
  w.events.length = 0;
  return w;
}
const hps = (w) => Object.fromEntries(w.boss.parts.map((p) => [p.id, p.hp]));

test('a burst at the organ hurts the parts within reach: a weak part by 1, an armor plate by a quarter', () => {
  const w = carousel();
  const was = hps(w);
  const organ = part(w, 'organ');
  burstAt(w, organ.x, organ.y, 0);
  const lost = Object.fromEntries(Object.entries(hps(w)).map(([id, hp]) => [id, was[id] - hp]));
  assert.deepEqual(lost, { crown: 0.25, organ: 1, horseL: 0, horseR: 0, lampL: 1, lampR: 1, drum: 1 });
  assert.equal(w.boss.hp, Object.values(hps(w)).reduce((n, hp) => n + hp, 0), 'the boss\'s hp is re-added');
  const hits = ofType(w.events, 'hit').map((e) => [e.part, e.dmg]);
  assert.ok(hits.some(([id, dmg]) => id === 'crown' && dmg === 0.25), 'the plate says 0.25');
});

test('a part is measured to its box, not its centre: reached from 150 px off its edge, safe at 161', () => {
  const w = carousel();
  const crown = part(w, 'crown');
  for (const [dist, lost] of [[150, 0.25], [161, 0]]) {
    const was = crown.hp;
    burstAt(w, crown.x + crown.w / 2 + dist, crown.y, 0);
    assert.equal(was - crown.hp, lost, `${dist} px beside the crown's edge`);
  }
  const top = crown.y - crown.h / 2;
  const all = hps(w);
  burstAt(w, crown.x, top - 161, 0);
  assert.deepEqual(hps(w), all, '161 px above the crown\'s top: nothing is in reach');
});

test('a shell minion of the carousel that bursts beside it hurts it, and the burst does not wait for the ship', () => {
  const w = carousel();
  const lampL = part(w, 'lampL');
  const minion = shell(w, lampL.x, lampL.y + lampL.h / 2 + 60, { role: 'diver' });
  minion.minion = true;
  const hp = lampL.hp;
  hurtAlien(w, minion, 1);
  const got = bursts(w, 20);
  assert.equal(got.length, 1);
  assert.ok(lampL.hp < hp, `the lamp took the burst: ${lampL.hp} of ${hp}`);
});

test('the last shell of a level bursts before the clear, which waits for its fuse', () => {
  const w = playing(level([wave({ rows: 1, cols: 1, roles: ['grunt'] })], 0, { world: 14, twist: 'fireworks' }));
  const [last] = w.aliens;
  last.shell = true;
  hurtAlien(w, last, last.hp);
  const seen = [];
  for (let i = 0; i < 60; i++) {
    step(w);
    for (const e of drain(w)) if (e.type === 'burst' || e.type === 'cleared') seen.push(e.type);
  }
  assert.deepEqual(seen, ['burst', 'cleared']);
});

test('a shell that rams the ship costs a life and still bursts, like a shell dying any other way', () => {
  const w = playing(bossLevel('carousel', 0, { world: 14, twist: 'fireworks' }));
  const lives = w.ship.lives;
  w.aliens.push({ id: 7, role: 'diver', x: w.ship.x, y: w.ship.y, hp: 1, maxHp: 1, slot: null, mode: 'dive', t: 0, dive: null, minion: true, shell: true });
  const got = bursts(w, 20);
  assert.equal(w.ship.lives, lives - 1, 'the ram cost a life');
  assert.deepEqual(got.map((e) => [e.depth, e.kind]), [[0, 'diver']]);
});
