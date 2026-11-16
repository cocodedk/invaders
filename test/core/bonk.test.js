import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { LEVELS, levelById } from '../../src/core/levels.js';
import { autopilot } from '../../src/core/autopilot.js';
import { TWISTS, ALIEN_R, HEIGHT, WIDTH, TICK } from '../../src/core/kinds.js';
import { HUD_CLEAR } from '../../src/core/formations.js';
import { SHIP_R } from '../../src/core/ship.js';
import { HOP, TUMBLE_G, SINK, BODY_MAX, BODY_R, hopFrom, knockOut } from '../../src/core/tumble.js';
import { WHACK_R, LAUNCH, DAZE } from '../../src/core/bonk.js';
import { stateHash } from '../../src/core/state-hash.js';
import { level, wave, step, drain, ofType, shotAt, addAlien } from './world-kit.js';
import { bossWorld, part, leave, shotOn } from './boss-kit.js';
import { BONK_EVENTS, arena, bodyAt, flyer, collect } from './bonk-kit.js';

// World 19's twist (R71): a kill leaves a dizzy body that hops and tumbles down. This file holds the body's
// life; the bat is in bonk-whack.test.js, the flight (chain, rebound, bank, boss) in bonk-chain.test.js.
const PEAK = HOP ** 2 / (2 * TUMBLE_G); // how far a hop lifts a body

test('the constants hold together', () => {
  assert.equal(BODY_R, ALIEN_R, 'a body is as big as the toy it was');
  assert.ok(WHACK_R > ALIEN_R + SHIP_R, 'the ship bats a body before it touches it');
  assert.equal(DAZE, HOP / TUMBLE_G, 'a rebound is dazed as long as its hop rises');
});

test("a body's age t grows by TICK a tick, dizzy or flying (it turns the drawing's stars and rocks it)", () => {
  const w = arena();
  const dizzy = bodyAt(w, 600, 300);
  const flying = flyer(w, 900, 900, LAUNCH / 4, 0);
  for (let i = 1; i <= 30; i++) {
    step(w);
    for (const b of [dizzy, flying]) assert.ok(Math.abs(b.t - i * TICK) < 1e-9, `tick ${i}: ${b.fly ? 'flying' : 'dizzy'} ${b.t}`);
  }
});

test('only world 19 has bodies: its levels, its state and its hash, and nothing in any other world', () => {
  assert.deepEqual(TWISTS.map((t, i) => [t, i]).filter(([t]) => t === 'bonk'), [['bonk', 18]]);
  for (const l of LEVELS) assert.equal(l.twist === 'bonk', l.world === 19, l.id);
  const w = createWorld(levelById('w19-1'));
  assert.deepEqual(w.twist.bodies, []);
  const bare = structuredClone(w);
  delete bare.twist.bodies;
  assert.equal(stateHash(w), stateHash(bare), 'no bodies, no term: the hash is as it would be without them');
  for (const l of LEVELS.filter((x) => x.world !== 19)) assert.ok(!('bodies' in createWorld(l).twist), `${l.id} has no bodies`);
});

test('no other twist ever makes a body: 40 s of each, the autopilot killing, brings none and no bonk event', () => {
  for (const twist of [...new Set(TWISTS)].filter((t) => t !== 'bonk')) {
    for (const free of [false, true]) {
      const two = () => wave({ rows: 2, cols: 6, roles: ['grunt', 'grunt'] });
      const w = createWorld(level([two(), two()], 0, { twist, ...(free && { free }) }), 3);
      w.ship.invuln = Infinity;
      const kinds = new Set();
      let kills = 0;
      while (w.t < 40 && w.state !== 'cleared') {
        stepWorld(w, TICK, autopilot(w));
        for (const e of drain(w)) { kinds.add(e.type); if (e.type === 'kill') kills++; }
        knockOut(w, { id: 1, role: 'grunt', x: 500, y: 500 }); // the hook itself does nothing there
      }
      assert.ok(kills > 0, `${twist}: the autopilot killed`);
      assert.ok(!('bodies' in w.twist), twist);
      for (const k of BONK_EVENTS) assert.ok(!kinds.has(k), `${twist}: ${k}`);
    }
  }
});

test('a kill leaves a body where the alien fell, with its id and role, hopping at HOP, and draws no rng', () => {
  const w = arena();
  const a = addAlien(w, 600, 500, { role: 'diver' });
  shotAt(w, a);
  step(w);
  const [b] = w.twist.bodies;
  assert.ok(ofType(drain(w), 'kill').length === 1 && b, 'killed, and a body left');
  assert.deepEqual([b.id, b.role, b.x, b.fly, b.vx, b.r, b.link, b.bonks], [a.id, 'diver', 600, false, 0, BODY_R, 0, 0]);
  assert.ok(Math.abs(b.vy - (-HOP + TUMBLE_G * TICK)) < 1e-9, 'it hopped, and has tumbled one tick');
  const plain = structuredClone(w);
  plain.twist.bodies.length = 0;
  for (let i = 0; i < 120; i++) { step(w); step(plain); }
  assert.equal(w.rng.s, plain.rng.s, 'the body drew nothing');
});

test('the hop turns into a fall at TUMBLE_G, the fall tops out at SINK, and the body never drifts sideways', () => {
  const w = arena();
  const b = bodyAt(w, 600, 500, { vy: hopFrom(500) });
  let vy = b.vy;
  let y = b.y;
  let top = y;
  for (let i = 0; i < 180; i++) {
    step(w);
    vy = Math.min(SINK, vy + TUMBLE_G * TICK);
    y += vy * TICK;
    top = Math.min(top, b.y);
    assert.ok(Math.abs(b.vy - vy) < 1e-9 && Math.abs(b.y - y) < 1e-6 && b.x === 600, `tick ${i}`);
  }
  assert.equal(b.vy, SINK);
  assert.ok(Math.abs(500 - top - PEAK) < HOP * TICK, `it rose ${500 - top} px`);
});

test('no body hops above HUD_CLEAR: one knocked out too high just falls', () => {
  assert.equal(hopFrom(HUD_CLEAR + PEAK), -HOP);
  assert.equal(hopFrom(HUD_CLEAR + PEAK - 1), 0);
  for (const y of [HUD_CLEAR, HUD_CLEAR + PEAK / 2, HUD_CLEAR + PEAK - 1, HUD_CLEAR + PEAK, 400]) {
    const w = arena();
    knockOut(w, { id: 7, role: 'grunt', x: 600, y });
    const b = w.twist.bodies[0];
    let top = y;
    for (let i = 0; i < 90; i++) { step(w); top = Math.min(top, b.y); }
    assert.ok(top >= HUD_CLEAR - 1e-9, `knocked out at ${y}: up to ${top}`);
  }
});

test('at BODY_MAX live bodies a kill scores but leaves none', () => {
  const w = arena();
  for (let i = 0; i < BODY_MAX; i++) bodyAt(w, 300 + (i % 20) * 60, 300 + Math.floor(i / 20) * 60);
  const a = addAlien(w, 1700, 600);
  shotAt(w, a);
  step(w);
  assert.equal(ofType(drain(w), 'kill').length, 1);
  assert.ok(!w.aliens.includes(a));
  assert.equal(w.twist.bodies.length, BODY_MAX);
  assert.ok(!w.twist.bodies.some((b) => b.id === a.id));
});

test('a rammed alien leaves no body, and neither do the minions wiped at the boss death; a shot minion does', () => {
  const w = arena();
  w.ship.invuln = 0;
  const a = addAlien(w, w.ship.x, w.ship.y);
  step(w);
  assert.equal(ofType(drain(w), 'shipHit')[0]?.source, 'ram');
  assert.ok(a.hp <= 0 && !w.twist.bodies.length, 'rammed: no body');
  const f = bossWorld('duck', {}, { world: 19, twist: 'bonk', free: true });
  const m = addAlien(f, 300, 600, { role: 'diver' });
  m.minion = true;
  shotAt(f, m);
  step(f);
  assert.equal(f.twist.bodies.length, 1, 'a shot minion is knocked out');
  const n = addAlien(f, 1500, 600, { role: 'diver' });
  n.minion = true;
  leave(f, ['bill']);
  shotOn(f, part(f, 'bill'));
  step(f, 3);
  assert.ok(ofType(drain(f), 'bossDeath').length && n.hp <= 0, 'the boss died and wiped the minion');
  assert.deepEqual(f.twist.bodies.map((b) => b.id), [m.id]);
});

test('a body that leaves by the bottom plops, dizzy or batted; one that flies off a side or the top is gone without one', () => {
  const w = arena();
  bodyAt(w, 400, HEIGHT, { vy: SINK, role: 'gunner' });
  flyer(w, 1200, HEIGHT - 10, 0, LAUNCH, { role: 'diver' });
  flyer(w, WIDTH - 10, 500, LAUNCH, 0, { banks: 0 });
  flyer(w, 700, 110, 0, -LAUNCH);
  const plops = ofType(collect(w, 30), 'plop');
  assert.deepEqual(plops.map(({ x, role }) => ({ x, role })), [{ x: 1200, role: 'diver' }, { x: 400, role: 'gunner' }]);
  assert.equal(w.twist.bodies.length, 0);
});

test('bodies clone and hash: a copy steps the same, and the hash sees where they are and what they do', () => {
  const w = arena();
  bodyAt(w, 600, 500, { vy: -HOP });
  flyer(w, 300, 900, 600, -800);
  const copy = structuredClone(w);
  step(w, 30);
  step(copy, 30);
  assert.equal(stateHash(copy), stateHash(w));
  const h = stateHash(w);
  for (const [k, v] of [['x', 1], ['y', 1], ['link', 1], ['bonks', 1]]) {
    const c = structuredClone(w);
    c.twist.bodies[0][k] += v;
    assert.notEqual(stateHash(c), h, k);
  }
  const c = structuredClone(w);
  c.twist.bodies[0].fly = !c.twist.bodies[0].fly;
  assert.notEqual(stateHash(c), h, 'fly');
});
