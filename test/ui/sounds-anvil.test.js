import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { eventSounds, SILENT } from '../../src/ui/sounds.js';
import { SFX } from '../../src/ui/sfx.js';
import { STYLES, SCALES, NOTES, kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import w18 from '../../src/ui/looks/w18.js';
import { sampleEvent as sample } from '../event-sample.js';

const ANVIL = { mood: 'anvil', root: 'G#', scale: 'bright', bpm: 108 };

function names(events, world = { boss: null }) {
  const out = [];
  eventSounds(events, world, (name, o) => out.push({ name, ...o }));
  return out;
}

test('Anvil Sky plays the anvil style, in A flat major pentatonic at 108 bpm: a mood, a root, a scale and a tempo no other world has', () => {
  const kit = kitFor(ANVIL);
  assert.deepEqual([kit.style, kit.root, kit.scale, kit.bpm], ['anvil', NOTES['G#'], SCALES.bright, 108]);
  assert.deepEqual(SCALES.bright, [0, 2, 4, 7, 9], 'the major pentatonic: no semitone, nothing clashes');
  for (const [name, s] of Object.entries(STYLES)) if (name !== 'anvil') assert.notEqual(s.mood, 'anvil');
  const others = LOOKS.filter((l) => l.world !== 18);
  assert.equal(others.length, LOOKS.length - 1);
  assert.ok(others.length >= 17);
  for (const look of others) {
    assert.notEqual(look.music.root, 'G#', `w${look.world}: the root is Anvil Sky's alone`);
    assert.notEqual(look.music.scale, 'bright', `w${look.world}: and the scale`);
    assert.notEqual(look.music.bpm, 108, `w${look.world}: and the tempo`);
  }
  for (const [name, scale] of Object.entries(SCALES)) if (name !== 'bright') assert.notDeepEqual(scale, SCALES.bright, name);
});

test("world 18's look carries that music entry (looks/w18.js)", () => {
  assert.deepEqual(w18.music, ANVIL);
  assert.deepEqual(LOOKS[17]?.music, ANVIL);
  assert.equal(kitFor(LOOKS[17].music).style, 'anvil');
});

test('it is a struck, ringing loop with a beat, not the relentless one the user turned down: an FM iron tone, no sawtooth or detuned lead, rests in the tune, a hit on well under half the steps', () => {
  const m = STYLES.anvil.music;
  assert.equal(m.lead.wave, 'sine');
  assert.ok(m.lead.fm && m.lead.bow === undefined);
  assert.ok(m.seq.filter((d) => d === null).length > m.seq.length / 2, 'more rests than notes');
  assert.ok([...m.drum].filter((ch) => ch !== '.').length < m.drum.length / 2);
  assert.ok(STYLES.anvil.wet > 0.3, 'wet enough for the lead\'s echo; the beat plays dry past it (music-anvil.js)');
});

test('a backfire sounds where the alien that was hit is, and nothing else plays it', () => {
  assert.deepEqual(names([{ ...sample('backfire'), x: 700, y: 400, role: 'gunner' }]), [{ name: 'backfire', x: 700 }]);
  assert.deepEqual(names([{ ...sample('backfire'), x: 1800 }]), [{ name: 'backfire', x: 1800 }]);
  assert.ok(!Object.hasOwn(SILENT, 'backfire'), 'backfire is not silent');
  assert.equal(typeof SFX.backfire, 'function');
  for (const type of ['kill', 'hit', 'explode', 'bomb', 'fire', 'cleanse', 'breath', 'sideShot', 'broadside', 'lightning']) {
    assert.ok(!names([sample(type)]).some((s) => s.name === 'backfire'), type);
  }
});

test('a dragged bullet that kills sounds as it did elsewhere: a backfire, the hit or the kill, in that order, each once', () => {
  const sounds = names([{ ...sample('backfire'), x: 500 }, { ...sample('hit'), x: 500, role: 'grunt' }, { ...sample('kill'), x: 500, role: 'grunt' }]).map((s) => s.name);
  assert.deepEqual(sounds, ['backfire', 'hit', 'kill']);
});

test('the side guns still sound through the broadside events, left and right: the world\'s kit decides what they are (sfx-storm.js)', () => {
  assert.deepEqual(names([{ ...sample('broadside'), on: true, x: 900 }]), [{ name: 'broadsideOn', x: 900 }]);
  assert.deepEqual(names([{ ...sample('broadside'), on: false, x: 900 }]), [{ name: 'broadsideOff', x: 900 }]);
  const [left, right] = names([{ ...sample('sideShot'), x: 938, dir: -1 }, { ...sample('sideShot'), x: 982, dir: 1 }]);
  assert.deepEqual([left.name, right.name], ['cannonL', 'cannonR']);
});

test('frequent backfires are thinned: the audio engine gives them a gap, like the other small sounds', () => {
  const src = readFileSync(fileURLToPath(new URL('../../src/ui/audio.js', import.meta.url)), 'utf8');
  const gap = src.match(/backfire: ([\d.]+)/);
  assert.ok(gap && Number(gap[1]) >= 0.05 && Number(gap[1]) <= 0.12, `gap ${gap?.[1]}`);
});
