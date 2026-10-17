import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';
import { IDLE, TICK, level, wave, input, step, seconds, playing, drain, ofType, shotAt, bulletAt } from './world-kit.js';
import { bossLevel, leave } from './boss-kit.js';

// Small fairness rules (task 13a): near misses that end early still count, a cut star cannot hit on
// its last tick, minions come only from parts still standing and gunner minions shoot, and an
// armored alien that falls mid-dive stands up where it fell and flies home.

test('a bullet that runs out of life inside the near band is still a near miss', () => {
  const w = playing(level([wave()]));
  bulletAt(w, w.ship.x, w.ship.y - 25); // in the band (28), not touching (8 + 14)
  w.bullets[0].life = 0.1;
  seconds(w, 0.5);
  const near = ofType(drain(w), 'nearMiss');
  assert.equal(near.length, 1);
  assert.ok(near[0].dist > 22 && near[0].dist <= 28, `closest approach ${near[0].dist}`);
  assert.equal(w.bullets.length, 0);
});

test('a bullet that never came near leaves no near miss when it expires', () => {
  const w = playing(level([wave()]));
  bulletAt(w, w.ship.x, w.ship.y - 80);
  w.bullets[0].life = 0.1;
  seconds(w, 0.5);
  assert.equal(ofType(drain(w), 'nearMiss').length, 0);
});

test('a bomb that clears a bullet inside the near band leaves a near miss, the same tick', () => {
  const w = playing(level([wave()]));
  bulletAt(w, w.ship.x - 25, w.ship.y);
  step(w);
  assert.equal(ofType(drain(w), 'nearMiss').length, 0, 'still in the band');
  step(w, 1, input({ bomb: true }));
  const ev = drain(w);
  assert.equal(ofType(ev, 'bomb').length, 1);
  assert.equal(ofType(ev, 'nearMiss').length, 1);
  assert.equal(ev.find((e) => e.type === 'nearMiss').tick, ev.find((e) => e.type === 'bomb').tick);
});

test('Ronin Moon: a shot that cuts a shuriken on the ship saves the ship on that very tick', () => {
  const w = playing(level([wave()], 0, { twist: 'shuriken' }));
  const { x, y } = w.ship;
  w.bullets.push({ pattern: 'shuriken', x, y: y - 30, vx: 0, vy: 0, r: 18, life: 6 }); // 30 < 18 + 14
  w.shots.push({ pattern: 'shot', x, y, vx: 0, vy: -1400, r: 5, life: 1, dmg: 1 });
  step(w);
  const ev = drain(w);
  assert.equal(ofType(ev, 'cut').length, 1);
  assert.equal(ofType(ev, 'shipHit').length, 0);
  assert.equal(w.ship.lives, 3);
});

const fight = (kind) => {
  const w = createWorld(bossLevel(kind, 0, { seed: 5 }), 5);
  w.ship.invuln = Infinity;
  return w;
};

test('a destroyed part launches no minions; a live one still does', () => {
  const w = fight('mothership'); // its last phase: grunts from the eye, a carrier from the dome
  leave(w, ['gunL', 'gunR', 'eye'], 5); // the dome is gone
  const seen = new Set();
  for (let i = 0; i < 60 * 45; i++) {
    stepWorld(w, TICK, IDLE);
    w.events.length = 0;
    for (const a of w.aliens) seen.add(a.role);
  }
  assert.deepEqual([...seen], ['grunt']);
});

test('gunner minions shoot at the ship', () => {
  const w = createWorld(levelById('w6-5'));
  w.ship.invuln = Infinity;
  leave(w, ['core', 'lensL', 'lensR', 'nodeL', 'nodeR', 'halo'], 3);
  const shots = [];
  for (let i = 0; i < 60 * 40 && !shots.length; i++) {
    stepWorld(w, TICK, IDLE);
    const gunners = new Set(w.aliens.filter((a) => a.minion && a.role === 'gunner').map((a) => a.id));
    shots.push(...w.events.filter((e) => e.type === 'fire' && e.side === 'enemy' && gunners.has(e.id)));
    w.events.length = 0;
  }
  assert.ok(shots.length > 0, 'a gunner minion fired');
  assert.equal(shots[0].role, 'gunner');
});

test('Iron Dawn: an armored alien shot down mid-dive stands up at its wreck and flies home, no snap', () => {
  const w = playing(level([wave({ roles: ['armored'], cols: 3 })], 0, { twist: 'reassemble' }));
  w.ship.x = 1700; // out of the way of the swoop
  const a = w.aliens[0];
  Object.assign(a, { mode: 'dive', t: 0, dive: { fx: a.x, fy: a.y, ax: a.x, ay: 900 } });
  seconds(w, 0.8);
  a.hp = 1;
  shotAt(w, a);
  step(w);
  assert.equal(w.wrecks.length, 1);
  const wreck = { x: w.wrecks[0].x, y: w.wrecks[0].y };
  assert.ok(wreck.y > 400, `it fell low on its dive (y ${wreck.y.toFixed(0)})`);
  let back = null;
  for (let i = 0; i < 200 && !back; i++) {
    step(w);
    back = w.aliens.find((x) => x.reborn);
  }
  assert.ok(back, 'it stood up');
  assert.equal(back.mode, 'return');
  assert.ok(Math.hypot(back.x - wreck.x, back.y - wreck.y) < 1, 'where the wreck lay');
  let jump = 0;
  for (let i = 0; i < 120 && back.mode !== 'hold'; i++) {
    const [x, y] = [back.x, back.y];
    step(w);
    jump = Math.max(jump, Math.hypot(back.x - x, back.y - y));
  }
  assert.equal(back.mode, 'hold', 'back in the formation');
  assert.ok(jump < 25, `the largest step home was ${jump.toFixed(1)} px`);
  assert.ok(back.y < 400, 'in its slot at the top');
});
