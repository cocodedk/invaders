import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/core/world.js';
import { levelById, LEVELS } from '../../src/core/levels.js';
import { hurtAlien } from '../../src/core/aliens.js';
import { SHELL_SHARE, FUSE, markShell } from '../../src/core/fireworks.js';
import { BURST_R, burstAt, drip } from '../../src/core/damage.js';
import { stateHash } from '../../src/core/state-hash.js';
import { bossLevel } from './boss-kit.js';
import {
  TICK, level, wave, step, playing, drain, ofType, shotAt, bulletOnShip, holdAlien, addAlien, solid,
} from './world-kit.js';

// World 14's twist: some aliens are shells. A shell that dies lights a fuse and, FUSE s later, bursts
// where it died: 1 damage to every target within BURST_R. (The chain, the bomb and the boss's parts
// are in fireworks-chain.test.js.)

const w14 = (extra = {}) => level([wave({ rows: 1, cols: 3, roles: ['grunt'] }), wave()], 0, { world: 14, twist: 'fireworks', ...extra });
// A quiet world 14 whose one alien, far to the left, cannot be killed: the level is never cleared.
const arena = (extra) => {
  const w = playing(w14(extra));
  holdAlien(w, 100, 300, 1e6);
  return w;
};
const shell = (w, x, y, o = {}) => addAlien(w, x, y, { shell: true, ...o });
const fuses = (w) => w.twist.fuses;

test('the constants: 22 % of aliens are shells, a fuse burns 0.12 s, a burst reaches 160 px', () => {
  assert.deepEqual([SHELL_SHARE, FUSE, BURST_R], [0.22, 0.12, 160]);
});

test('world 14 makes about 22 % of its aliens shells; no other world makes one or draws for it', () => {
  let shells = 0;
  let total = 0;
  for (let seed = 1; seed <= 200; seed++) {
    for (const a of createWorld(levelById('w14-1'), seed).aliens) {
      total++;
      if (a.shell) shells++;
      assert.ok(!('shell' in a) || a.shell === true);
    }
  }
  assert.ok(shells / total > 0.19 && shells / total < 0.25, `${shells} of ${total}`);
  for (const l of LEVELS.filter((x) => x.world !== 14 && x.waves)) {
    assert.ok(createWorld(l).aliens.every((a) => !('shell' in a)), `${l.id} has no shell field`);
  }
  const w = createWorld(levelById('w13-1'));
  const before = w.rng.s;
  markShell(w, {});
  assert.equal(w.rng.s, before, 'no draw outside world 14');
  const w4 = createWorld(levelById('w14-1'));
  const was = w4.rng.s;
  markShell(w4, {});
  assert.notEqual(w4.rng.s, was, 'one draw in world 14');
});

test('a boss minion of world 14 can be a shell, and none is in world 13', () => {
  const minions = (lv) => {
    const seen = new Map();
    for (let seed = 1; seed <= 30; seed++) {
      const w = createWorld(lv, seed);
      w.ship.invuln = Infinity;
      for (let i = 0; i < 60 * 30; i++) {
        step(w);
        for (const a of w.aliens) if (a.minion) seen.set(`${seed}:${a.id}`, a.shell === true);
      }
    }
    return [...seen.values()];
  };
  const mine = minions(bossLevel('carousel', 0, { world: 14, twist: 'fireworks' }));
  const share = mine.filter(Boolean).length / mine.length;
  assert.ok(mine.length > 100 && share > 0.12 && share < 0.34, `${mine.length} minions, ${share} shells`);
  assert.ok(!minions(bossLevel('galleon', 0, { world: 13, twist: 'broadside' })).some(Boolean));
});

test('the fuse queue exists for the fireworks twist alone, and the state hash sees it', () => {
  assert.deepEqual(fuses(createWorld(w14())), []);
  assert.equal(createWorld(level([wave()], 0, { world: 13, twist: 'broadside' })).twist.fuses, undefined);
  const w = arena();
  hurtAlien(w, shell(w, 700, 300), 1);
  const lit = structuredClone(w);
  lit.twist.fuses.length = 0;
  assert.notEqual(stateHash(w), stateHash(lit));
});

test('a shot-dead shell bursts FUSE s later, where it died, and not before', () => {
  const w = arena();
  shotAt(w, shell(w, 700, 300));
  step(w);
  const kill = ofType(drain(w), 'kill')[0];
  assert.equal(fuses(w).length, 1);
  let burst = null;
  for (let i = 0; i < 30 && !burst; i++) {
    step(w);
    burst = ofType(drain(w), 'burst')[0];
  }
  const delay = (burst.tick - kill.tick) * TICK;
  assert.ok(delay >= FUSE - 1e-9 && delay < FUSE + TICK, `${delay} s`);
  assert.deepEqual([burst.x, burst.y], [700, 300]);
  assert.equal(fuses(w).length, 0);
});

test('the burst event: x, y, depth 0 for the first, and the dead shell\'s role as kind', () => {
  const w = arena();
  hurtAlien(w, shell(w, 640, 410, { role: 'diver' }), 1);
  drain(w);
  let burst = null;
  for (let i = 0; i < 30 && !burst; i++) {
    step(w);
    burst = ofType(drain(w), 'burst')[0];
  }
  assert.deepEqual(Object.keys(burst).sort(), ['depth', 'kind', 'tick', 'type', 'x', 'y']);
  assert.deepEqual([burst.type, burst.x, burst.y, burst.depth, burst.kind], ['burst', 640, 410, 0, 'diver']);
});

test('a shell lights its fuse however it dies, and only when it dies', () => {
  const w = arena();
  const a = shell(w, 700, 300, { hp: 2 });
  hurtAlien(w, a, 1);
  assert.equal(fuses(w).length, 0, 'hurt is not dead');
  hurtAlien(w, a, 1);
  assert.equal(fuses(w).length, 1, 'a hit');
  hurtAlien(w, a, 1);
  assert.equal(fuses(w).length, 1, 'a corpse lights nothing twice');
  drip(w, shell(w, 900, 300), 1);
  assert.equal(fuses(w).length, 2, 'the beam');
  hurtAlien(w, addAlien(w, 1100, 300), 1);
  assert.equal(fuses(w).length, 2, 'an ordinary alien lights nothing');
});

test('the burst hurts everything within BURST_R by 1, edge included, and nothing beyond', () => {
  const w = arena();
  const hp = (a) => a.hp;
  const near = [[100, 0], [160, 0], [96, 128], [0, -160]].map(([dx, dy]) => addAlien(w, 900 + dx, 400 + dy, { hp: 3 }));
  const far = [[161, 0], [0, 161], [-120, 120]].map(([dx, dy]) => addAlien(w, 900 + dx, 400 + dy, { hp: 3 }));
  burstAt(w, 900, 400, 0);
  assert.deepEqual(near.map(hp), [2, 2, 2, 2]);
  assert.deepEqual(far.map(hp), [3, 3, 3], '161 px out either way, and 169.7 px on the diagonal');
});

test('a burst never hurts the ship, a bunker, or a bullet', () => {
  const w = arena({ bunkers: true });
  const cover = w.bunkers.map(solid);
  const lives = w.ship.lives;
  bulletOnShip(w);
  shotAt(w, { x: w.ship.x, y: w.ship.y });
  const [bullet] = w.bullets;
  const [shot] = w.shots;
  burstAt(w, w.ship.x, w.ship.y, 0);
  assert.equal(w.ship.lives, lives);
  assert.deepEqual(w.bunkers.map(solid), cover);
  assert.ok(bullet.life > 0 && shot.life > 0, 'bullets and shots fly on');
  assert.equal(w.hits, 0);
});

test('a wave whose last shell is still lit waits for the burst before it is clear', () => {
  const w = playing(w14());
  const last = holdAlien(w, 700, 300);
  last.shell = true;
  hurtAlien(w, last, 1);
  const seen = [];
  for (let i = 0; i < 40; i++) {
    step(w);
    for (const e of drain(w)) if (e.type === 'waveClear' || e.type === 'burst') seen.push(e.type);
  }
  assert.deepEqual(seen, ['burst', 'waveClear']);
  assert.equal(w.wave, 1, 'and the next wave is still to come');
});

test('a pending fuse survives structuredClone and bursts the same in the copy', () => {
  const w = arena();
  hurtAlien(w, shell(w, 700, 300), 1);
  addAlien(w, 760, 300, { hp: 3 });
  step(w, 3);
  const copy = structuredClone(w);
  step(w, 12);
  step(copy, 12);
  assert.equal(JSON.stringify(copy), JSON.stringify(w));
  assert.equal(ofType(w.events, 'burst').length, 1);
});

test('a shell that flies off the bottom without being killed lights nothing', () => {
  const w = playing(bossLevel('carousel', 0, { world: 14, twist: 'fireworks' }));
  w.aliens.push({ id: 7, role: 'diver', x: 960, y: 1119, hp: 1, maxHp: 1, slot: null, mode: 'dive', t: 0, dive: null, minion: true, shell: true });
  step(w, 40);
  assert.equal(w.aliens.some((a) => a.id === 7), false);
  assert.equal(fuses(w).length, 0);
  assert.equal(ofType(w.events, 'burst').length, 0);
});
