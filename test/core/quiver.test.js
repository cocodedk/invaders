import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { encodeInputs, decodeInputs } from '../../src/core/input-codec.js';
import { levelById } from '../../src/core/levels.js';
import { replay, stateHash } from '../../src/core/replay.js';
import { QUIVER_SPEED } from '../../src/core/quiver.js';
import { ALIEN_R, HUD_BOTTOM, TICK } from '../../src/core/kinds.js';
import { level, wave, step, at, input, holdAlien, addAlien, dry, playing, drain, ofType } from './world-kit.js';
import { randomInputs } from './replay-kit.js';
import { w21, start, fireOne, arrow, until } from './quiver-kit.js';

test('a shot turns on the tick it reaches HUD_BOTTOM, toward where the ship stands that tick, at QUIVER_SPEED', () => {
  const w = start();
  const s = fireOne(w);
  const moving = (i) => at(1400 + (i % 40) * 5, 900 + (i % 30) * 3); // the ship moves aside, and on every tick
  let before = null;
  until(w, () => s.turned, (i) => {
    before = { y: s.y, turned: Boolean(s.turned) };
    return moving(i);
  });
  assert.equal(before.turned, false, 'not turned on the tick before');
  assert.ok(before.y > HUD_BOTTOM, 'and below the line then');
  assert.ok(s.y <= HUD_BOTTOM, 'it turned on the tick it reached the line');
  const dx = w.ship.x - s.x;
  const dy = w.ship.y - s.y;
  assert.ok(Math.abs(Math.hypot(s.vx, s.vy) - QUIVER_SPEED) < 1e-6, 'speed');
  assert.ok(Math.abs(s.vx * dy - s.vy * dx) < 1e-6 * QUIVER_SPEED * Math.hypot(dx, dy), 'aimed at the ship');
  assert.ok(s.vx * dx + s.vy * dy > 0, 'toward it, not away');
});

// The score of the one alien at (960, 600) killed by a shot on its way up, or by the returning arrow.
function killScore(back) {
  const w = dry(start());
  const a = holdAlien(w, back ? 1700 : 960, back ? 300 : 600, 1);
  addAlien(w, 1800, 200, { hp: 1e6 }); // so the kill does not clear the wave
  const s = fireOne(w);
  if (back) {
    until(w, () => s.turned);
    assert.ok(a.hp > 0, 'the shot missed it on the way up');
    Object.assign(a, { x: 960, y: 600 }); // on the arrow's way back down
  }
  until(w, () => a.hp <= 0);
  assert.equal(Boolean(s.turned), back);
  return w.score;
}

test('an alien killed by a returning arrow scores what a ship shot scores for it', () => {
  const up = killScore(false);
  assert.ok(up > 0);
  assert.equal(killScore(true), up);
});

test('a returning arrow that crosses the ship leaves its lives unchanged', () => {
  const w = start();
  step(w, 1, at(960, 1000));
  const lives = w.ship.lives;
  arrow(w, 960, 1000 - 40, 0, QUIVER_SPEED, { life: 0.5 });
  drain(w);
  step(w, 10, at(960, 1000));
  assert.equal(w.ship.lives, lives);
  assert.equal(ofType(drain(w), 'shipHit').length, 0);
});

test('a returning arrow is gone by the tick after it reaches its quiver point', () => {
  const w = start();
  const s = fireOne(w);
  until(w, () => s.turned);
  const q = { x: w.ship.x, y: w.ship.y };
  let last = null;
  until(w, () => !w.shots.includes(s), () => {
    last = { x: s.x, y: s.y };
    return at(300, 700); // the ship moves off; the quiver point stays
  });
  assert.ok(Math.hypot(last.x - q.x, last.y - q.y) <= QUIVER_SPEED * TICK + 1e-6, 'it flew to its quiver point');
});

test('a turned homing shot flies straight to its quiver point, though an alien stands above its way back', () => {
  const w = start();
  const [a] = w.aliens;
  a.y = -50; // off the field, so the shot seeks nothing on its way up
  w.ship.power = { kind: 'homing', left: 10 };
  const s = fireOne(w);
  assert.ok(s.seek, 'a homing shot');
  until(w, () => s.turned);
  const from = { x: s.x, y: s.y };
  const q = { x: w.ship.x, y: w.ship.y };
  Object.assign(a, { x: 1700, y: 300 }); // above the arrow all the way down: a seeking shot would steer to it
  const len = Math.hypot(q.x - from.x, q.y - from.y);
  let last = null;
  until(w, () => !w.shots.includes(s), () => {
    last = { x: s.x, y: s.y };
    const off = Math.abs((q.x - from.x) * (s.y - from.y) - (q.y - from.y) * (s.x - from.x)) / len;
    assert.ok(off < 1e-6, `on the line from the turn to the quiver point (${off} px off)`);
    return at(300, 700);
  });
  assert.ok(Math.hypot(last.x - q.x, last.y - q.y) <= QUIVER_SPEED * TICK + 1e-6, 'and it ends there');
});

test('an alien at the quiver point\'s end of the path is hit by the arrow\'s last stretch', () => {
  const w = dry(start());
  addAlien(w, 1800, 200, { hp: 1e6 }); // so the kill does not clear the wave
  const s = fireOne(w);
  until(w, () => s.turned);
  const q = { x: w.ship.x, y: w.ship.y };
  step(w, 1, at(300, 700)); // the ship moves off, so it cannot ram the alien; the quiver point stays
  // The arrow comes straight down to q in steps of QUIVER_SPEED * TICK; the last step before the point stops
  // `short` px above it. The alien stands just out of that step's reach and well inside the reach of the next one.
  const stride = QUIVER_SPEED * TICK;
  const dist = q.y - s.y;
  const short = dist - (Math.ceil(dist / stride) - 1) * stride;
  const a = holdAlien(w, q.x, q.y + ALIEN_R + s.r - short + 1, 1);
  addAlien(w, 1800, 200, { hp: 1e6 });
  until(w, () => !w.shots.includes(s), () => at(300, 700));
  assert.equal(a.hp, 0, 'killed');
});

test('a turned rapid shot flies back at QUIVER_SPEED', () => {
  const w = start();
  w.ship.power = { kind: 'rapid', left: 10 };
  const s = fireOne(w);
  until(w, () => s.turned);
  assert.ok(Math.abs(Math.hypot(s.vx, s.vy) - QUIVER_SPEED) < 1e-6);
});

test('a returning arrow that reaches HUD_BOTTOM again does not turn', () => {
  const w = start();
  const s = arrow(w, 960, HUD_BOTTOM + 5, 0, -QUIVER_SPEED);
  until(w, () => !w.shots.includes(s), () => {
    assert.ok(s.vy < 0 && s.vx === 0, 'it flies on up');
    return at(960, 1000);
  });
});

test('the laser beam does in a quiver level what it does in any other', () => {
  const run = (twist) => {
    const w = playing(level([wave({ rows: 1, cols: 1 })], 0, { world: 21, twist, free: true }));
    holdAlien(w, 960, 300, 1e6);
    w.ship.power = { kind: 'laser', left: 10 };
    step(w, 90, input({ fire: true, target: { x: 960, y: 1000 } }));
    return w;
  };
  const q = run('quiver');
  const plain = run('broadside'); // no per-tick rule
  assert.ok(q.ship.beam && q.aliens[0].hp < 1e6, 'the beam burned');
  assert.equal(q.shots.length, 0);
  assert.equal(stateHash(q), stateHash(plain));
});

test('a recorded quiver run re-simulates to the same state hash; the turned state is part of the hash', () => {
  const lv = w21({ waves: [wave({ rows: 2, cols: 6, roles: ['grunt', 'diver'] }), wave({ rows: 2, cols: 6, roles: ['gunner', 'grunt'] })] });
  const inputs = randomInputs(21, 30 * 60);
  // The live run, stepped as the game loop does (replay-kit.js liveRun, for a level that is not listed).
  const live = createWorld(lv, lv.seed);
  const events = [];
  let turned = false;
  for (const inp of inputs) {
    stepWorld(live, TICK, inp);
    events.push(...live.events.splice(0));
    turned ||= live.shots.some((s) => s.turned);
  }
  assert.ok(turned, 'arrows turned in the run');
  const again = replay(lv, lv.seed, decodeInputs(encodeInputs(inputs))); // the recorded inputs, read back
  assert.equal(stateHash(again.world), stateHash(live));
  assert.deepEqual(again.events, events);
  const w = start();
  const s = fireOne(w);
  step(w, 2, at(960, 1000));
  const flipped = structuredClone(w);
  flipped.shots[w.shots.indexOf(s)].turned = true;
  assert.notEqual(stateHash(flipped), stateHash(w));
});

test('in a level of any other twist no shot ever turns', () => {
  for (const lv of [levelById('w1-1'), levelById('w20-1'), w21({ twist: 'echo' })]) {
    const w = playing(lv);
    holdAlien(w, 100, 200, 1e6);
    let reached = false;
    for (let i = 0; i < 180; i++) {
      step(w, 1, input({ fire: true, target: { x: 1700, y: 1000 } }));
      reached ||= w.shots.some((s) => s.y <= HUD_BOTTOM);
      assert.ok(w.shots.every((s) => !s.turned && s.vy <= 0), `${lv.id} tick ${i}`);
    }
    assert.ok(reached, `${lv.id}: shots reached the top`);
  }
});
