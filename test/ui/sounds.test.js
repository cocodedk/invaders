import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { eventSounds, SILENT } from '../../src/ui/sounds.js';
import { SFX } from '../../src/ui/sfx.js';
import { STYLES, SCALES, NOTES, kitFor, degreeMidi, midiHz } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { sampleEvent as sample } from '../event-sample.js';

const coreDir = fileURLToPath(new URL('../../src/core/', import.meta.url));
// Every event type the core emits, read from its emit(world, '<type>', ...) calls.
const EMITTED = [...new Set(readdirSync(coreDir).flatMap((f) =>
  [...readFileSync(coreDir + f, 'utf8').matchAll(/emit\(world, '(\w+)'/g)].map((m) => m[1])))];

test('every event the core emits makes a sound that exists, or is silent on purpose', () => {
  assert.ok(EMITTED.length >= 25, `found ${EMITTED.length} event types`);
  for (const type of EMITTED) {
    const played = [];
    eventSounds([sample(type)], { boss: null }, (name, o) => played.push([name, o]));
    if (Object.hasOwn(SILENT, type)) {
      assert.equal(played.length, 0, type);
      continue;
    }
    assert.ok(played.length > 0, `${type} makes no sound`);
    for (const [name] of played) assert.equal(typeof SFX[name], 'function', `${type} -> ${name}`);
  }
});

// The sounds a batch of events makes, with their options.
function names(events, world = { boss: null }) {
  const out = [];
  eventSounds(events, world, (name, o) => out.push({ name, ...o }));
  return out;
}

test('an alien death sounds once (its kill), the boss chain swells, the white-out has its own blast', () => {
  assert.deepEqual(names([sample('kill'), { ...sample('explode'), size: 1 }]).map((s) => s.name), ['kill']);
  const early = names([{ ...sample('explode'), size: 1 }], { boss: { dying: 2.7 } })[0];
  const late = names([{ ...sample('explode'), size: 1 }], { boss: { dying: 0.3 } })[0];
  assert.equal(early.name, 'boom');
  assert.ok(late.k > early.k, 'later blasts in the chain are bigger');
  assert.equal(names([{ ...sample('explode'), size: 3 }])[0].name, 'blast');
  assert.deepEqual(names([{ ...sample('fire'), power: 'laser' }]), [], 'the beam hums instead of a shot');
  assert.equal(names([{ ...sample('fire'), side: 'enemy', pattern: 'laser' }])[0].name, 'laserWarn');
});

test('the pickups swept up at the clear chime one after another, a caught one at once', () => {
  const swept = (kind, nth) => ({ ...sample('sweep'), kind, nth });
  const sounds = names([sample('kill'), swept('laser', 0), swept('bomb', 1), swept('rapid', 2), sample('cleared')]);
  const chimes = sounds.filter((s) => s.name === 'pickup');
  assert.deepEqual(chimes.map((s) => s.kind), ['laser', 'bomb', 'rapid'], 'each its own pickup sound');
  assert.equal(chimes[0].delay, 0);
  for (let i = 1; i < chimes.length; i++) {
    const gap = chimes[i].delay - chimes[i - 1].delay;
    assert.ok(gap >= 0.03 && gap <= 0.1, `a run of chimes, ${gap} s apart`);
  }
  assert.equal(names([sample('pickup')])[0].delay ?? 0, 0, 'a caught pickup sounds at once');
});

test('each world has its own sound style, root and scale from its look', () => {
  const styles = LOOKS.map((l) => kitFor(l.music).style);
  assert.equal(new Set(styles).size, LOOKS.length, styles.join());
  assert.equal(Object.keys(STYLES).length, 14, 'a style for each of the 14 worlds');
  for (const look of LOOKS) {
    const kit = kitFor(look.music);
    assert.equal(kit.root, NOTES[look.music.root], look.music.root);
    assert.deepEqual(kit.scale, SCALES[look.music.scale]);
    assert.equal(kit.bpm, look.music.bpm);
  }
});

test('Aurora Kingdom plays the aurora style, in E lydian at 84 bpm', () => {
  const kit = kitFor(LOOKS[10].music);
  assert.deepEqual([kit.style, kit.root, kit.scale, kit.bpm], ['aurora', NOTES.E, SCALES.lydian, 84]);
});

test('Starlit Archive plays the archive style, in D dorian at 116 bpm', () => {
  const kit = kitFor(LOOKS[11].music);
  assert.deepEqual([kit.style, kit.root, kit.scale, kit.bpm], ['archive', NOTES.D, SCALES.dorian, 116]);
});

test('Sunset Armada plays the armada style, in G major at 132 bpm', () => {
  const kit = kitFor(LOOKS[12].music);
  assert.deepEqual([kit.style, kit.root, kit.scale, kit.bpm], ['armada', NOTES.G, SCALES.major, 132]);
  assert.deepEqual(SCALES.major, [0, 2, 4, 5, 7, 9, 11]);
});

const CARNIVAL = { mood: 'carnival', root: 'A#', scale: 'mixolydian', bpm: 156 };

test('Ember Carnival plays the carnival style, in B flat mixolydian at 156 bpm', () => {
  const kit = kitFor(CARNIVAL);
  assert.deepEqual([kit.style, kit.root, kit.scale, kit.bpm], ['carnival', NOTES['A#'], SCALES.mixolydian, 156]);
  assert.deepEqual(SCALES.mixolydian, [0, 2, 4, 5, 7, 9, 10]);
});

test("world 14's look carries that music entry (looks/w14.js)", () => {
  assert.deepEqual(LOOKS[13]?.music, CARNIVAL);
});

test('scale degrees land in the scale, an octave per scale length', () => {
  const kit = kitFor({ mood: 'koto and taiko', root: 'D', scale: 'in', bpm: 72 });
  assert.equal(degreeMidi(kit, 0, 4), 62, 'D4');
  assert.equal(degreeMidi(kit, 5, 4), 74, 'five steps of the in scale is the octave');
  assert.equal(degreeMidi(kit, -1, 4), 58, 'below the root: the top step an octave down (B flat 3)');
  assert.ok(Math.abs(midiHz(69) - 440) < 1e-9);
  for (let d = -6; d < 12; d++) {
    const pc = (degreeMidi(kit, d, 4) - kit.root + 120) % 12;
    assert.ok(kit.scale.includes(pc), `degree ${d}`);
  }
});

test('every music style is well formed', () => {
  for (const [name, s] of Object.entries(STYLES)) {
    const m = s.music;
    assert.ok(m.div > 0 && m.seq.length > 0 && m.drum.length > 0, name);
    for (const d of m.seq) assert.ok(d === null || Number.isInteger(d), `${name} seq`);
    assert.match(m.drum, /^[kthsbpcjfzmvroyaug.]+$/, `${name} drum`);
    assert.ok(m.lead.gain > 0 && m.lead.gain < 0.2, `${name} lead gain`);
    if (m.lead.fm) assert.ok(m.lead.fm.ratio > 0 && m.lead.fm.index > 0, `${name} lead fm`);
  }
});

test("the broadside's events sound: the guns opening and shutting, a cannon out of each side, panned a little outward", () => {
  assert.deepEqual(names([{ ...sample('broadside'), on: true, x: 900 }]), [{ name: 'broadsideOn', x: 900 }]);
  assert.deepEqual(names([{ ...sample('broadside'), on: false, x: 900 }]), [{ name: 'broadsideOff', x: 900 }]);
  const [left, right] = names([{ ...sample('sideShot'), x: 938, dir: -1 }, { ...sample('sideShot'), x: 982, dir: 1 }]);
  assert.deepEqual([left.name, right.name], ['cannonL', 'cannonR']);
  assert.ok(left.x < 938 && right.x > 982, `each sounds out toward its side: ${left.x}, ${right.x}`);
  assert.ok(right.x - left.x < 800, 'a spread, not a hard pan');
});

test("the escorts rattle with the ship's shot only while the wingmen run; every other shot sounds as it always did", () => {
  const volley = (power) => names([{ ...sample('fire'), side: 'ship', power }]).map((s) => s.name);
  assert.deepEqual(volley('wingmen'), ['shot', 'escortShot']);
  for (const power of [null, 'spread', 'rapid', 'shield', 'homing', 'slow']) assert.deepEqual(volley(power), ['shot'], String(power));
  assert.deepEqual(volley('laser'), [], 'the beam still hums instead');
  assert.deepEqual(names([{ ...sample('fire'), side: 'enemy', pattern: 'fan' }]).map((s) => s.name), ['enemyShot']);
});

test('a firework shell going off sounds where it burst and how far down its chain it is; no other event plays a burst', () => {
  assert.deepEqual(names([{ ...sample('burst'), x: 700, depth: 3 }]), [{ name: 'burst', x: 700, depth: 3 }]);
  assert.deepEqual(names([{ ...sample('burst'), x: 700, depth: 0 }]).map((s) => s.depth), [0], 'the first shell is depth 0');
  for (const type of ['kill', 'explode', 'hit', 'bomb', 'fire']) assert.ok(!names([sample(type)]).some((s) => s.name === 'burst'), type);
});
