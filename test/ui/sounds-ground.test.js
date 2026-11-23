import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventSounds, SILENT } from '../../src/ui/sounds.js';
import { SFX } from '../../src/ui/sfx.js';
import { BIG_GROUND } from '../../src/fx/react-ground.js';

// The events as the core emits them (course-ground.js hurtGround): a break says its kind, its place, what it paid and the multiplier it came at.
const kill = (kind, x = 700, mult = 1) => ({ type: 'groundKill', kind, x, y: 300, score: 100, mult });
const hit = (kind, x = 700) => ({ type: 'groundHit', kind, x, y: 300 });
const KINDS = ['stone', 'turret', 'crate', 'pillar', 'gate'];

function sounds(events, world = { boss: null }) {
  const out = [];
  eventSounds(events, world, (name, o) => out.push({ name, ...o }));
  return out;
}

test('a broken ground thing sounds as an alien kill, where it stood, with the combo it raised', () => {
  assert.deepEqual(sounds([kill('stone', 300, 3)]), [{ name: 'kill', role: 'grunt', mult: 3, x: 300 }]);
  assert.deepEqual(sounds([kill('gate', 1500, 1)]), [{ name: 'kill', role: 'armored', mult: 1, x: 1500 }]);
});

test('two breaks on one tick each sound at the combo they raised, whatever the world holds by then', () => {
  const world = { boss: null, combo: { mult: 8, timer: 1 } };
  assert.deepEqual(sounds([kill('stone', 300, 1), kill('turret', 500, 2)], world).map((s) => s.mult), [1, 2]);
});

test('an event with no multiplier sounds the kill at x1', () => {
  const { mult, ...bare } = kill('crate');
  assert.equal(sounds([bare])[0].mult, 1);
});

test('a pillar and a gate sound heavier (an armored alien) than a stone, a turret and a crate (a grunt)', () => {
  for (const kind of KINDS) {
    const role = BIG_GROUND.includes(kind) ? 'armored' : 'grunt';
    assert.equal(sounds([kill(kind)])[0].role, role, kind);
    assert.equal(sounds([hit(kind)])[0].role, role, kind);
  }
});

test('a hurt ground thing that stands sounds as a hit alien, where it was struck, and no break sound plays with it', () => {
  assert.deepEqual(sounds([hit('turret', 1100)]), [{ name: 'hit', role: 'grunt', x: 1100 }]);
  assert.deepEqual(sounds([hit('pillar', 200)]), [{ name: 'hit', role: 'armored', x: 200 }]);
  assert.deepEqual(sounds([kill('turret')]).map((s) => s.name), ['kill']);
});

test('both are sounded now, with sounds that exist', () => {
  for (const type of ['groundKill', 'groundHit']) assert.ok(!Object.hasOwn(SILENT, type), `${type} is not silent`);
  for (const s of sounds([kill('gate'), hit('gate')])) assert.equal(typeof SFX[s.name], 'function', s.name);
});
