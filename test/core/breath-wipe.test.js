import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';
import { emitPattern } from '../../src/core/patterns.js';
import { breathFront } from '../../src/core/twists-3.js';
import { step, seconds, drain, ofType, bulletAt, shotAt, pickupAt, holdAlien, FIRE, IDLE, playing, level, wave } from './world-kit.js';
import { bossLevel } from './boss-kit.js';
import { arena, until, COLUMNS, RISE_TICKS } from './breath-kit.js';

// What the breath wipes and what it leaves: every enemy bullet the front passes over, by a swept test
// (so no speed gets past it); no beam; no near miss for a wipe; nothing else in the world. (The timer
// and the front itself are in breath.test.js.)

const frontAfter = (k) => (k >= RISE_TICKS ? 96 : 1080 - ((1080 - 96) * k) / RISE_TICKS);
const put = (w, x, y, vx = 0, vy = 0) => {
  bulletAt(w, x, y, vx, vy);
  return w.bullets.at(-1);
};

test('every bullet the front passes over is wiped, tick by tick, and those above it are left alone', () => {
  const w = arena();
  until(w, 'breath');
  const ys = [1040, 880, 700, 520, 360, 200, 120, 60];
  const bullets = ys.map((y, i) => put(w, COLUMNS[i % COLUMNS.length] + 10 * i, y));
  const cleansed = [];
  for (let k = 1; k <= RISE_TICKS; k++) {
    step(w);
    cleansed.push(...ofType(drain(w), 'cleanse'));
    for (const b of bullets) assert.equal(w.bullets.includes(b), b.y < frontAfter(k), `tick ${k}: bullet at ${b.y}`);
  }
  assert.deepEqual(w.bullets, [bullets.at(-1)], 'only the one above the HUD is left (y 60)');
  assert.deepEqual(cleansed.map((e) => [e.x, e.y]), bullets.slice(0, -1).map((b) => [b.x, b.y]), 'one cleanse per bullet, where it was, in the order the front met them');
  for (const b of bullets.slice(0, -1)) assert.deepEqual([b.life, b.near], [0, true]);
  assert.ok(bullets.at(-1).life > 0 && bullets.at(-1).near === undefined, 'and that one is untouched');
});

test('swept: a bullet that jumps clean over the front in one tick is still wiped', () => {
  const w = arena();
  until(w, 'breath');
  const jumper = put(w, 300, 1000, 0, 6000); // 1000 -> 1100 in a tick, past the front's old place (1080)
  const faller = put(w, 1700, 300, 0, 1500); // falling to meet the rising front
  const fronts = [];
  for (let k = 1; k <= RISE_TICKS && w.bullets.includes(faller); k++) {
    step(w);
    fronts.push(frontAfter(k));
    if (k === 1) assert.ok(!w.bullets.includes(jumper), 'the jumper went on the first tick');
  }
  assert.ok(!w.bullets.includes(faller), 'the faller was met');
  const [e] = ofType(drain(w), 'cleanse').filter((c) => c.x === 1700);
  assert.ok(Math.abs(e.y - fronts.at(-1)) < 80, `met near the front: bullet ${e.y}, front ${fronts.at(-1)}`);
  assert.ok(e.y > 300 && e.y < 1000, 'and not at the top, where it started');
});

test('a bullet fired behind the front is not passed over: only the front moving on can meet a bullet', () => {
  const w = arena();
  until(w, 'breath');
  step(w, 24);
  const front = breathFront(w);
  assert.ok(front > 500 && front < 600, `front at ${front}`);
  const behind = [put(w, 400, 900), put(w, 1500, 800), put(w, 1300, front + 30)];
  const ahead = put(w, 700, 300);
  step(w, RISE_TICKS - 24);
  assert.ok(behind.every((b) => w.bullets.includes(b) && b.life > 0), 'left where they were');
  assert.ok(!w.bullets.includes(ahead), 'and the one ahead of it was wiped');
});

test('beams are not wiped: a laser burns on through the front while a bullet beside it is cleansed', () => {
  const w = arena();
  until(w, 'breath');
  const [beam] = emitPattern('laser', { x: 300, y: 120 }, { x: 300, y: 900 }, { speed: 400 }, w.rng);
  w.bullets.push(beam);
  const bullet = put(w, 320, 600);
  step(w, RISE_TICKS);
  assert.ok(w.bullets.includes(beam) && beam.life > 0 && beam.near === undefined, 'the beam is untouched');
  assert.ok(!w.bullets.includes(bullet));
  assert.equal(ofType(drain(w), 'cleanse').length, 1, 'one cleanse, for the bullet');
});

test('a wipe is not a dodge: a bullet in the ship\'s near band is settled silently, with no near miss', () => {
  const near = (twist) => {
    const w = playing(level([wave()], 0, { world: twist === 'breath' ? 17 : 1, twist }));
    holdAlien(w, 100, 300, 1e6);
    if (twist === 'breath') until(w, 'breath');
    const b = put(w, w.ship.x, w.ship.y - 25); // 25 px from the ship: inside the band (22..28), outside the hit
    step(w);
    assert.equal(typeof b.near, 'number', 'it is in the band');
    seconds(w, 6.5);
    return { b, events: drain(w) };
  };
  const control = near('bunkers');
  assert.equal(ofType(control.events, 'nearMiss').length, 1, 'without the breath it runs out in the band: a near miss');
  const wiped = near('breath');
  assert.equal(wiped.b.near, true);
  assert.equal(ofType(wiped.events, 'nearMiss').length, 0);
  assert.equal(ofType(wiped.events, 'cleanse').length, 1);
  assert.equal(ofType(wiped.events, 'shipHit').length, 0);
});

// A pair of worlds, the same but for the twist: 'breath' and 'bunkers' (a saucer every 20 s, so none yet).
function pair(make) {
  const [a, b] = ['breath', 'bunkers'].map((twist) => {
    const w = make({ world: 17, twist });
    w.ship.invuln = Infinity;
    return w;
  });
  return [a, b];
}
const rest = (w) => ({
  aliens: w.aliens, shots: w.shots, pickups: w.pickups, ship: w.ship, boss: w.boss, score: w.score, hits: w.hits,
  combo: w.combo, rng: w.rng.s, march: w.march, wave: w.wave, gap: w.gap, events: w.events.filter((e) => e.type !== 'breath' && e.type !== 'cleanse'),
});

for (const [name, make] of [
  ['a wave level', (extra) => { const w = playing(level([wave(), wave()], 0, extra)); holdAlien(w, 960, 300, 1e6); return w; }],
  ['the Craving fight', (extra) => { const w = playing(bossLevel('craving', 0, extra)); while (w.boss.enter > 0) step(w); return w; }],
]) {
  test(`nothing else is touched in ${name}: aliens, boss, ship, pickups, shots and score go as in a world without the breath`, () => {
    const [a, b] = pair(make);
    const both = (f) => [a, b].forEach(f);
    while (a.twist.rise === null) {
      const inp = a.twist.timer < 0.3 ? FIRE : IDLE; // firing as it comes, the same input for both
      both((w) => step(w, 1, inp));
    }
    assert.equal(a.twist.rise, 0, 'the breath starts');
    both((w) => { pickupAt(w, 'spread', 700, 200); pickupAt(w, 'rapid', 1400, 500); shotAt(w, { x: 900, y: 900 }); });
    both((w) => w.bullets.push({ pattern: 'aimed', x: 200, y: 900, vx: 0, vy: 0, r: 8, life: 6 }));
    for (let k = 0; k < RISE_TICKS + 12; k++) {
      both((w) => step(w, 1, FIRE));
      assert.deepEqual(rest(a), rest(b), `tick ${k}`);
    }
    assert.equal(a.bullets.length, 0, 'the one bullet was wiped');
    assert.equal(b.bullets.length, 1, 'and without the breath it still hangs there');
    assert.ok(a.pickups.length > 0 || a.score > 0, 'something was in play');
  });
}

test('in the boss fight the breath wipes the boss\'s bullets too', () => {
  const w = createWorld(levelById('w17-5'));
  w.ship.invuln = Infinity;
  while (w.state === 'intro') step(w);
  const p = until(w, 'breath');
  assert.equal(p.ticks, 840);
  const hp = w.boss.parts.map((x) => x.hp);
  const bullets = [put(w, 400, 700), put(w, 1500, 400)];
  step(w, RISE_TICKS);
  assert.ok(bullets.every((b) => !w.bullets.includes(b)));
  assert.deepEqual(w.boss.parts.map((x) => x.hp), hp, 'the boss is not hurt by it');
});
