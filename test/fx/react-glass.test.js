import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REACTS } from '../../src/fx/react.js';
import { powerColor } from '../../src/fx/emit.js';
import { MAX_PARTICLES } from '../../src/fx/particles.js';
import { MEND_LIFE, SCATTER_LIFE } from '../../src/fx/react-glass.js';
import { react, run } from './fx-kit.js';

// The mirror twin and the mending of the Glass Cathedral (react-glass.js): the twin's muzzle flash and the power's start
// and end, an armored alien shattering, a wreck standing up (a 'mend' ring) and a wreck shot down (a 'scatter' ring). The
// drawing of all of it is test/ui/glass-twin.test.js and glass-mending.test.js. Worlds 1 to 15 see what they always saw.
const glass = (power) => ({ level: { world: 16, twist: 'reassemble' }, ship: { x: 700, y: 900, power: power ? { kind: power, left: 5 } : null }, aliens: [] });
const other = (world = 7) => ({ level: { world, twist: 'reassemble' }, ship: { x: 700, y: 900, power: null }, aliens: [] });
const mirror = { type: 'fire', side: 'ship', x: 700, y: 878, power: 'mirror' };
const plain = { type: 'fire', side: 'ship', x: 700, y: 878, power: null };
const wreck = { type: 'wreck', x: 640, y: 300 };
const down = { type: 'wreckDown', x: 640, y: 300 };
const stand = { type: 'reassemble', id: 9, x: 640, y: 300 };

test("the core's twist and power events have reactions, and the mirror has a colour of its own in the fx", () => {
  for (const type of ['wreck', 'wreckDown', 'reassemble', 'power', 'fire']) assert.ok(REACTS.includes(type), type);
  assert.equal(powerColor('mirror'), '#bfe8ff');
});

test("the twin's muzzle flashes at the mirror of the ship's, at its height, on top of the ship's own flash", () => {
  const base = react(plain, glass(null));
  const fx = react(mirror, glass('mirror'));
  assert.equal(fx.flashes.length, base.flashes.length + 1);
  const added = fx.flashes.at(-1);
  assert.deepEqual([added.x, added.y], [1920 - 700, 878], 'the twin is at 1920 - x');
  assert.equal(added.tag, 'muzzle');
  assert.ok(added.life < 0.1, 'a flash, not a glow that lingers');
  assert.ok(fx.particles.length > base.particles.length && fx.particles.every((p) => p.additive), 'a few additive sparks');
  assert.equal(react(mirror, other(13)).flashes.length, base.flashes.length, 'the same everywhere else: the shot itself says it is the mirror');
  assert.equal(react(plain, glass(null)).flashes.length, base.flashes.length);
  assert.equal(react({ ...mirror, side: 'enemy' }, glass('mirror')).flashes.length, react({ ...mirror, side: 'enemy' }, other(13)).flashes.length, 'only the ship has a twin');
});

test('the power starting rings out of the twin and scatters glass; ending crumbles it', () => {
  const on = react({ type: 'power', kind: 'mirror', on: true }, glass('mirror'));
  assert.ok(on.rings.length >= 2 && on.rings.every((r) => r.x === 1920 - 700 && r.y === 900 || r.x === 700), 'rings at the twin (and the ship\'s own)');
  assert.ok(on.rings.some((r) => r.x === 1220 && r.maxR >= 90), 'a wide ring from the twin');
  assert.ok(on.particles.some((p) => p.kind === 'shard'), 'glass in the air');
  const off = react({ type: 'power', kind: 'mirror', on: false }, glass(null));
  assert.ok(off.particles.some((p) => p.kind === 'shard' && Math.abs(p.x - 1220) < 1), 'the twin crumbles where it was');
  const elsewhere = react({ type: 'power', kind: 'mirror', on: true }, other(13));
  assert.equal(elsewhere.particles.some((p) => p.kind === 'shard'), false, 'no glass outside the cathedral');
  const spread = react({ type: 'power', kind: 'spread', on: true }, glass('spread'));
  assert.equal(spread.rings.length, 1, 'other powers are the usual ring');
});

test('an armored alien that dies in the cathedral shatters: a flash, rings, glints and glass, and none of the machine wreck\'s smoke', () => {
  const fx = react(wreck, glass(null));
  assert.ok(fx.flashes.length >= 1 && fx.rings.length >= 2);
  assert.ok(fx.flashes.every((f) => f.x === 640 && f.y === 300));
  assert.ok(fx.particles.some((p) => p.kind === 'shard') && fx.particles.some((p) => p.kind === 'spark'));
  assert.ok(!fx.particles.some((p) => p.kind === 'smoke' || p.kind === 'ember'), 'no smoke or embers');
  const iron = react(wreck, other(7));
  assert.ok(iron.particles.some((p) => p.kind === 'smoke'), "world 7's wreck is what it was: smoke");
  assert.deepEqual(react(wreck, other(7)).particles.map((p) => p.color), iron.particles.map((p) => p.color), 'and the same every time');
  assert.ok(react(wreck).particles.some((p) => p.kind === 'smoke'), 'with no world at all it is the usual one');
});

test("a wreck standing up is one 'mend' ring at its place, seeded by the slot it hangs in, that lives for the flight", () => {
  const w = glass(null);
  w.aliens = [{ id: 9, role: 'armored', slot: { row: 2, col: 3 } }];
  const fx = react(stand, w);
  assert.equal(fx.rings.length, 1);
  const [r] = fx.rings;
  assert.equal(r.kind, 'mend');
  assert.deepEqual([r.x, r.y, r.seed, r.max], [640, 300, 2 * 31 + 3 * 7 + 3, MEND_LIFE], 'the seed is the wreck\'s (ui/mending-view.js seedOf)');
  assert.equal(fx.particles.length, 0, 'no particle is spent: the ring draws the pieces');
  assert.equal(react(stand, glass(null)).rings[0].seed, Math.round(640 * 0.37 + 300 * 0.11), 'an alien that cannot be found seeds from where it stands');
  run(fx, MEND_LIFE + 0.05);
  assert.equal(fx.rings.length, 0, 'and it is gone with the flight');
  const iron = react(stand, other(7));
  assert.ok(iron.rings.every((x) => x.kind === 'lens'), "world 7's is the inward ring of sparks");
});

test("a wreck shot down is a 'scatter' ring, a quick white ring and glints; elsewhere it is the usual blast", () => {
  const fx = react(down, glass(null));
  const scatter = fx.rings.find((r) => r.kind === 'scatter');
  assert.ok(scatter && scatter.max === SCATTER_LIFE && scatter.x === 640 && scatter.y === 300);
  const hung = react({ ...down, row: 2, col: 3, left: 0.6 }, glass(null)).rings.find((r) => r.kind === 'scatter');
  assert.deepEqual([hung.seed, hung.age], [2 * 31 + 3 * 7 + 3, 2 - 0.6], 'it breaks up from the cloud it hung as: its seed and age (ui/mending-view.js drawMending)');
  assert.ok(fx.rings.some((r) => r.kind === 'ring' && r.color === '#ffffff'));
  assert.ok(fx.particles.length >= 6 && fx.particles.every((p) => p.additive), 'additive glints');
  const iron = react(down, other(7));
  assert.ok(iron.rings.every((r) => r.kind === 'ring') && iron.particles.some((p) => p.kind === 'debris'), "world 7's: sparks and metal");
  run(fx, SCATTER_LIFE + 0.05);
  assert.equal(fx.rings.length, 0);
});

test('a whole nave of wrecks mending and shattering at once stays inside the particle cap, and the rings keep their own', () => {
  const w = glass(null);
  const events = Array.from({ length: 40 }, (_, i) => [wreck, stand, down][i % 3]);
  const fx = react(events, w);
  assert.ok(fx.particles.length <= MAX_PARTICLES);
  assert.ok(fx.rings.length <= 64 && fx.flashes.length <= 64);
  run(fx, 1);
  assert.equal(fx.rings.length, 0, 'all of it over in a second');
});
