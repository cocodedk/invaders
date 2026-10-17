import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';
import {
  encodeInputs, decodeInputs, quantizeInput, makeRun, decodeRun, replay, stateHash, TICK, MAX_TICKS,
} from '../../src/core/replay.js';
import { randomInputs, liveRun } from './replay-kit.js';

const IDLE = { dx: 0, dy: 0, fire: false, bomb: false, target: null };

// ---- input encoding ---------------------------------------------------------------------------

test('encode/decode round-trips random input lists, keys and pointer alike', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const list = randomInputs(seed, (seed * 97) % 1500, { mouse: seed % 3 !== 0 });
    assert.deepEqual(decodeInputs(encodeInputs(list)), list, `seed ${seed}`);
  }
  assert.deepEqual(decodeInputs(encodeInputs([])), []);
});

test('every combination of keys, fire, bomb and a target survives the round trip', () => {
  const list = [];
  for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) for (const fire of [false, true]) for (const bomb of [false, true]) {
    list.push({ dx, dy, fire, bomb, target: null }, { dx, dy, fire, bomb, target: { x: 1920, y: 620 } });
    list.push({ dx, dy, fire, bomb, target: { x: 0, y: 1080 } });
  }
  assert.deepEqual(decodeInputs(encodeInputs(list)), list);
});

test('runs of identical inputs are run-length encoded', () => {
  const held = Array.from({ length: 3000 }, () => ({ ...IDLE, fire: true }));
  assert.ok(encodeInputs(held).length <= 8, encodeInputs(held));
  const keys = randomInputs(5, 3600, { mouse: false });
  assert.ok(encodeInputs(keys).length < 3600, 'a keyboard run is far smaller than one token a tick');
});

test('quantizeInput gives the one shape the core is fed and the encoder writes', () => {
  assert.deepEqual(quantizeInput({ dx: 5, dy: -0.3, fire: 1, target: { x: 10.6, y: 700.4 } }),
    { dx: 1, dy: -1, fire: true, bomb: false, target: { x: 11, y: 700 } });
  assert.deepEqual(quantizeInput({}), IDLE);
  assert.deepEqual(quantizeInput({ target: { x: 5000, y: -5 } }).target, { x: 1920, y: 0 }, 'held on the screen');
  assert.deepEqual(quantizeInput({ target: { x: NaN, y: 3 } }).target, null);
  assert.deepEqual(decodeInputs(encodeInputs([{ dx: 3, fire: 1 }])), [{ ...IDLE, dx: 1, fire: true }]);
});

test('decodeInputs rejects garbage, broken tokens and absurd run lengths with null', () => {
  const bad = ['garbage!', 'A ', 'A*', 'A*0', 'A*1', 'A**3', '*3', '@1,2', 'A@', 'A@1', 'A@1,', 'A@1,2,3', 'A@x,y', 'A@1921,0', 'A@0,1081', 'A@-1,5',
    'k', 'AA*5x', 'A*99999999999', `A*${MAX_TICKS + 1}`, 'A*60000A*60000A*60000'];
  for (const text of bad) assert.equal(decodeInputs(text), null, JSON.stringify(text));
  for (const x of [null, undefined, 42, {}, [], true]) assert.equal(decodeInputs(x), null);
});

// ---- run objects ------------------------------------------------------------------------------

const sample = () => {
  const inputs = randomInputs(11, 900);
  return { inputs, run: makeRun('w3-2', 33, inputs, { score: 12345, stars: 2 }) };
};

test('makeRun builds the storable run and decodeRun gives the playable one back', () => {
  const { inputs, run } = sample();
  assert.deepEqual(Object.keys(run).sort(), ['inputs', 'level', 'score', 'seed', 'stars', 'ticks', 'v']);
  assert.equal(run.v, 1);
  assert.equal(run.level, 'w3-2');
  assert.equal(run.ticks, 900);
  assert.equal(typeof run.inputs, 'string');
  const back = decodeRun(JSON.parse(JSON.stringify(run)));
  assert.deepEqual(back, { ...run, inputs });
  assert.equal(makeRun(levelById('w3-2'), 33, inputs, { score: 1, stars: 0 }).level, 'w3-2', 'a level object gives its id');
});

test('decodeRun rejects the wrong version, bad shapes and bad encodings', () => {
  const { run } = sample();
  const bad = [
    null, undefined, 'garbage', 42, [], true, {},
    { ...run, v: 0 }, { ...run, v: 2 }, { ...run, v: '1' }, { ...run, v: undefined },
    { ...run, level: 'w9-9' }, { ...run, level: 3 }, { ...run, level: undefined },
    { ...run, seed: -1 }, { ...run, seed: 1.5 }, { ...run, seed: 2 ** 32 }, { ...run, seed: '7' },
    { ...run, ticks: 899 }, { ...run, ticks: -1 }, { ...run, ticks: MAX_TICKS + 1 }, { ...run, ticks: 'x' },
    { ...run, score: NaN }, { ...run, score: -5 }, { ...run, score: '9' },
    { ...run, stars: 4 }, { ...run, stars: -1 }, { ...run, stars: 1.5 }, { ...run, stars: undefined },
    { ...run, inputs: 'garbage!' }, { ...run, inputs: 42 }, { ...run, inputs: undefined }, { ...run, inputs: '' },
  ];
  for (const obj of bad) assert.equal(decodeRun(obj), null, JSON.stringify(obj)?.slice(0, 80));
});

test('decodeRun rejects every truncation of a valid run', () => {
  const { run } = sample();
  for (let n = 0; n < run.inputs.length; n++) {
    assert.equal(decodeRun({ ...run, inputs: run.inputs.slice(0, n) }), null, `cut at ${n}`);
  }
  assert.notEqual(decodeRun(run), null);
});

// ---- replay -----------------------------------------------------------------------------------

// One level of every world: the wave levels carry formations and bunkers, the boss levels carry
// attacks and minions, and each world its own twist (gusts, teleports, gravity, ...).
const PER_WORLD = ['w1-4', 'w2-5', 'w3-4', 'w4-5', 'w5-3', 'w6-5', 'w7-4', 'w8-5'];

for (const id of PER_WORLD) {
  test(`${id}: random keys and pointer, run then replay, give the same state, score and events`, () => {
    const inputs = randomInputs(id.charCodeAt(1) * 31 + id.charCodeAt(3), 1500);
    const live = liveRun(id, inputs);
    assert.ok(live.world.tick >= 300, `the run lasted ${live.world.tick} ticks`);
    const level = levelById(id);
    const again = replay(level, level.seed, decodeInputs(encodeInputs(inputs)));
    assert.equal(stateHash(again.world), stateHash(live.world));
    assert.equal(again.world.score, live.world.score);
    assert.equal(again.world.tick, live.world.tick);
    assert.deepEqual(again.events, live.events);
    assert.deepEqual(again.world.events, [], 'the replay drains events like the game does');
  });
}

test('replay takes a level id or a level object, and a bad id throws', () => {
  const inputs = randomInputs(2, 120);
  const level = levelById('w1-2');
  assert.equal(stateHash(replay('w1-2', level.seed, inputs).world), stateHash(replay(level, level.seed, inputs).world));
  assert.throws(() => replay('w0-0', 1, inputs), /level/i);
});

test('replay snapshots are independent clones from which the run carries on identically', () => {
  const level = levelById('w3-2');
  const inputs = randomInputs(8, 700);
  const full = replay(level, level.seed, inputs, { snapshotsAt: [0, 200, 450, 700, 9999] });
  assert.deepEqual([...full.snapshots.keys()].sort((a, b) => a - b), [0, 200, 450, 700]);
  assert.equal(full.snapshots.get(0).tick, 0);
  assert.equal(full.snapshots.get(200).tick, 200);
  assert.deepEqual(full.snapshots.get(200).events, []);
  assert.equal(stateHash(full.snapshots.get(700)), stateHash(full.world));
  assert.notEqual(full.snapshots.get(700), full.world);
  for (const from of [0, 200, 450]) {
    const w = structuredClone(full.snapshots.get(from));
    for (let i = from; i < inputs.length; i++) stepWorld(w, TICK, inputs[i]);
    assert.equal(stateHash(w), stateHash(full.world), `from ${from}`);
  }
  assert.equal(stateHash(full.snapshots.get(0)), stateHash(createWorld(level, level.seed)));
});

test('a world mid-boss-fight survives structuredClone and keeps stepping identically', () => {
  for (const id of ['w1-5', 'w4-5', 'w8-5']) {
    const inputs = randomInputs(4, 1200);
    const level = levelById(id);
    const a = createWorld(level, level.seed);
    a.ship.invuln = Infinity;
    for (let i = 0; i < 600; i++) stepWorld(a, TICK, inputs[i]);
    assert.ok(a.boss && a.boss.enter === 0 && a.boss.dying === null, `${id}: the fight is on`);
    const b = structuredClone(a);
    assert.deepEqual(b, a);
    for (let i = 600; i < 1200; i++) {
      stepWorld(a, TICK, inputs[i]);
      stepWorld(b, TICK, inputs[i]);
    }
    assert.deepEqual(b, a, id);
    assert.equal(stateHash(b), stateHash(a));
  }
});

// ---- stateHash --------------------------------------------------------------------------------

test('stateHash is a string that ignores float dust and sees every part of the state', () => {
  const live = liveRun('w1-1', randomInputs(6, 400)).world;
  const h = stateHash(live);
  assert.equal(typeof h, 'string');
  assert.equal(stateHash(structuredClone(live)), h);
  const changed = (edit) => {
    const w = structuredClone(live);
    edit(w);
    return stateHash(w) !== h;
  };
  assert.ok(changed((w) => { w.score += 1; }), 'score');
  assert.ok(changed((w) => { w.tick += 1; }), 'tick');
  assert.ok(changed((w) => { w.ship.x += 1; }), 'ship x');
  assert.ok(changed((w) => { w.ship.y -= 1; }), 'ship y');
  assert.ok(changed((w) => { w.ship.lives -= 1; }), 'lives');
  assert.ok(changed((w) => { w.aliens.pop(); }), 'alien count');
  assert.ok(changed((w) => { w.aliens[0].x += 1; }), 'alien position');
  assert.ok(changed((w) => { w.bullets.push({ x: 1, y: 2 }); }), 'bullets');
  assert.ok(changed((w) => { w.rng.s += 1; }), 'rng state');
  assert.ok(changed((w) => { w.bunkers[0].mask[500] ^= 1; }), 'one byte of a bunker mask');
  assert.ok(!changed((w) => { w.ship.x += 1e-6; w.aliens[0].y += 1e-6; }), 'positions are rounded');
});
