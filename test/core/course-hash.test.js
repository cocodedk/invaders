import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EPS } from '../../src/core/kinds.js';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { hitShip } from '../../src/core/ship.js';
import { RESPAWN_DELAY } from '../../src/core/course-check.js';
import { stateHash } from '../../src/core/state-hash.js';
import { TICK, input } from './world-kit.js';
import { courseLevel, FAIR_COURSE } from './course-kit.js';

// The hash of a course world (world 22) covers its course, and a snapshot (structuredClone: the trailer's, a replay's) steps
// on exactly as the original does. A clone alone proves little (a hash that saw nothing of the course would match too), so the
// hash is also shown to tell every field apart.

const level = courseLevel({ ...FAIR_COURSE, starts: ['seed'] }); // the ground weapon from the start, so seeds fall at once
const BEAT_TICKS = Math.ceil((RESPAWN_DELAY - EPS) / TICK) + 1; // ticks that more than run a death's beat down
const press = (i) => input({ fire: true, target: { x: 400 + ((i * 37) % 1100), y: 700 + ((i * 11) % 200) } }); // fire held, the pointer sweeping

function play(world, ticks, from = 0) {
  for (let i = 0; i < ticks; i++) stepWorld(world, TICK, press(from + i));
}
function playUntil(world, done) {
  for (let i = 0; i < 5000 && !done(world); i++) {
    world.ship.invuln = Infinity;
    stepWorld(world, TICK, press(i));
  }
  assert.ok(done(world), 'the state was reached');
  return world;
}

// The world flown to a state worth a snapshot: seeds in the air with marks left and ground on the screen, a hold that has stood a while,
// the beat after the last life was lost.
const scrolling = () => playUntil(createWorld(level), (w) => w.course.seeds.length > 0 && w.course.marks.length > 0 && w.course.ground.length > 0);
const holding = () => {
  const world = playUntil(createWorld(level), (w) => w.course.held !== null);
  return playUntil(world, (w) => w.course.held.t > 1);
};
function dying() {
  const world = scrolling();
  Object.assign(world.ship, { lives: 1, invuln: 0 });
  assert.ok(hitShip(world, 'test'));
  play(world, 5, 1000);
  assert.ok(world.course.respawn !== null && world.course.respawn > 0, 'the beat is running');
  return world;
}

// The copy and the original, stepped from the same inputs, hash alike at every tick, and end the same.
function agree(world, ticks) {
  const copy = structuredClone(world);
  const [a, b] = [[], []];
  for (let i = 0; i < ticks; i++) {
    stepWorld(world, TICK, press(2000 + i));
    stepWorld(copy, TICK, press(2000 + i));
    a.push(stateHash(world));
    b.push(stateHash(copy));
  }
  assert.deepEqual(b, a);
  assert.deepEqual(copy, world);
}

test('a snapshot taken mid-scroll, seeds in the air, steps on exactly as the original', () => agree(scrolling(), 240));
test('a snapshot taken mid-hold steps on exactly as the original', () => agree(holding(), 240));
test('a snapshot taken in the beat after a death steps on through the respawn exactly as the original', () => {
  const world = dying();
  agree(world, BEAT_TICKS + 120);
  assert.equal(world.course.respawn, null, 'the leg was rebuilt');
});

// The hash of `world` with `edit` done to a copy of its course.
const edited = (world, edit) => {
  const copy = structuredClone(world);
  edit(copy.course);
  return stateHash(copy);
};
const EDITS = [
  ['how far it has scrolled', (c) => { c.dist += 1; }],
  ['how many entries have come up', (c) => { c.next += 1; }],
  ['an ability', (c) => { c.abilities.push('wings'); }],
  ['a burst mark', (c) => { c.marks.push({ x: 1, at: 1, r: 1 }); }],
  ['a ground object\'s hp', (c) => { c.ground[0].hp = (c.ground[0].hp ?? 0) + 1; }],
  ['a ground object\'s kind', (c) => { c.ground[0].kind = 'other'; }],
  ['a ground object\'s x', (c) => { c.ground[0].x += 1; }],
  ['a ground object\'s y', (c) => { c.ground[0].y += 1; }],
  ['how many ground objects there are', (c) => { c.ground.pop(); }],
  ['a seed\'s x', (c) => { c.seeds[0].x += 1; }],
  ['a seed\'s place on the course', (c) => { c.seeds[0].at += 1; }],
  ['a seed\'s time', (c) => { c.seeds[0].t += 0.1; }],
  ['how many seeds there are', (c) => { c.seeds.pop(); }],
  ['a hold standing', (c) => { c.held = { holdId: 0, t: 0 }; }],
  ['a beat running', (c) => { c.respawn = RESPAWN_DELAY; }],
];

test('the hash tells apart every field of the course', () => {
  const world = scrolling();
  const base = stateHash(world);
  assert.equal(edited(world, () => {}), base, 'a copy hashes alike');
  for (const [what, edit] of EDITS) assert.notEqual(edited(world, edit), base, what);
});

test('the hash tells apart the clock of a hold and the time left of a beat', () => {
  const hold = holding();
  assert.notEqual(edited(hold, (c) => { c.held.t += 0.1; }), stateHash(hold), 'the hold\'s clock');
  const beat = dying();
  assert.notEqual(edited(beat, (c) => { c.respawn -= 0.1; }), stateHash(beat), 'the beat\'s time left');
});
