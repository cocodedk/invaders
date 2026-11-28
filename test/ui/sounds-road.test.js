import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { eventSounds, SILENT } from '../../src/ui/sounds.js';
import { SFX } from '../../src/ui/sfx.js';
import { WANDER_WORLD } from '../../src/ui/wander-kit.js';
import { THORN } from '../../src/core/course-kinds.js';
import { sampleEvent as sample } from '../event-sample.js';

// World 22's events (the core's course-*.js and the events its ground and air craft borrow) and the sounds they make (sfx-road.js).
const WORLD_22 = { boss: null, level: { world: WANDER_WORLD }, ship: { x: 1100 } };
const sounds = (events, world = { boss: null }) => {
  const out = [];
  eventSounds(events, world, (name, o) => out.push({ name, ...o }));
  return out;
};
const coreDir = fileURLToPath(new URL('../../src/core/', import.meta.url));
const PENDING = ['lasso', 'shardBounce', 'flockScatter']; // silent until Leg 3's sound lands (the shard's return is told by its bullet)
const COURSE_EVENTS = [...new Set(readdirSync(coreDir).filter((f) => f.startsWith('course')).flatMap((f) =>
  [...readFileSync(coreDir + f, 'utf8').matchAll(/emit\(world, '(\w+)'/g)].map((m) => m[1])))];

test('no event world 22 emits is silent: each makes a sound that exists, and only the two screens that play their own stingers stay silent', () => {
  assert.ok(COURSE_EVENTS.length >= 10, COURSE_EVENTS.join());
  for (const type of COURSE_EVENTS.filter((t) => !PENDING.includes(t))) {
    assert.ok(!Object.hasOwn(SILENT, type), `${type} is silent`);
    const played = sounds([sample(type)], WORLD_22);
    assert.ok(played.length > 0, `${type} makes no sound`);
    for (const { name } of played) assert.equal(typeof SFX[name], 'function', `${type} -> ${name}`);
  }
  assert.deepEqual(Object.keys(SILENT).sort(), ['cleared', 'failed', ...PENDING].sort());
});

test('a lantern, a seed, a struck bullet and a respawn sound where they happen; the ability at the ship, the gate over the whole field', () => {
  assert.deepEqual(sounds([{ ...sample('checkpoint'), x: 300 }]), [{ name: 'checkpoint', x: 300 }]);
  assert.deepEqual(sounds([{ ...sample('seedBurst'), x: 1500 }]), [{ name: 'seedBurst', x: 1500 }]);
  assert.deepEqual(sounds([{ ...sample('chip'), x: 800 }]), [{ name: 'chip', x: 800 }]);
  assert.deepEqual(sounds([{ ...sample('respawn'), x: 700 }]), [{ name: 'respawn', x: 700 }]);
  assert.deepEqual(sounds([sample('ability')], WORLD_22), [{ name: 'ability', x: 1100 }]);
  assert.deepEqual(sounds([sample('ability')]), [{ name: 'ability', x: undefined }], 'a bare world: no pan');
  assert.deepEqual(sounds([sample('holdBreak')]), [{ name: 'holdBreak' }]);
});

test("a broken bullet is the cut's sound where it broke (the road's style cracks it: sfx-road.js); a struck one, which flies on, is a chip", () => {
  assert.deepEqual(sounds([{ ...sample('cut'), x: 640 }], WORLD_22), [{ name: 'cut', x: 640 }]);
  assert.deepEqual(sounds([sample('chip')], WORLD_22).map((s) => s.name), ['chip']);
});

test("a kite shot down flutters, a paper rustle at its x over the kill's stab, in this world only", () => {
  const kill = { ...sample('kill'), x: 420 };
  assert.deepEqual(sounds([kill], WORLD_22).map((s) => [s.name, s.x]), [['kill', 420], ['flutter', 420]]);
  assert.deepEqual(sounds([kill]).map((s) => s.name), ['kill'], 'a bare world');
  assert.deepEqual(sounds([kill], { boss: null, level: { world: WANDER_WORLD - 1 } }).map((s) => s.name), ['kill'], 'the world before');
});

test("a stopped line scratches, not chips; a thorn's break is the kill then a snap, a stone's has no snap", () => {
  assert.deepEqual(sounds([{ ...sample('lineStop'), x: 500 }], WORLD_22), [{ name: 'lineScratch', x: 500 }]);
  const kind = (k) => sounds([{ ...sample('groundKill'), kind: k, x: 900 }], WORLD_22).map((s) => s.name);
  assert.deepEqual(kind(THORN), ['kill', 'brambleSnap']);
  assert.deepEqual(kind('stone'), ['kill']);
});

test("the ground's breaks and strikes do not flutter: a stone is not paper", () => {
  const events = [{ ...sample('groundKill'), kind: 'gate' }, { ...sample('groundHit'), kind: 'turret' }];
  assert.deepEqual(sounds(events, WORLD_22).map((s) => s.name), ['kill', 'hit']);
});
