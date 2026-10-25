import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventSounds, SILENT } from '../../src/ui/sounds.js';
import { SFX } from '../../src/ui/sfx.js';
import { STYLES, SCALES, NOTES, kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import w17 from '../../src/ui/looks/w17.js';
import { sampleEvent as sample } from '../event-sample.js';

const BREATH = { mood: 'breath', root: 'D#', scale: 'harmonicmajor', bpm: 140 };

function names(events, world = { boss: null }) {
  const out = [];
  eventSounds(events, world, (name, o) => out.push({ name, ...o }));
  return out;
}

test('Ash to Air plays the breath style, in D sharp harmonic major at 140 bpm: a root, a scale and a tempo no other world has', () => {
  const kit = kitFor(BREATH);
  assert.deepEqual([kit.style, kit.root, kit.scale, kit.bpm], ['breath', NOTES['D#'], SCALES.harmonicmajor, 140]);
  assert.deepEqual(SCALES.harmonicmajor, [0, 2, 4, 5, 7, 8, 11]);
  assert.notDeepEqual(SCALES.harmonicmajor, SCALES.harmonic, 'not the harmonic minor');
  assert.notDeepEqual(SCALES.harmonicmajor, SCALES.major, 'and not the major');
  for (const [name, s] of Object.entries(STYLES)) if (name !== 'breath') assert.notEqual(s.mood, 'breath');
  const others = LOOKS.filter((l) => l.world !== 17);
  assert.equal(others.length, LOOKS.length - 1);
  assert.ok(others.length >= 16);
  for (const look of others) {
    assert.notEqual(look.music.root, 'D#', `w${look.world}: the root is Ash to Air's alone`);
    assert.notEqual(look.music.scale, 'harmonicmajor', `w${look.world}: so is the scale`);
    assert.notEqual(look.music.bpm, 140, `w${look.world}: and the tempo`);
  }
});

test('it is driving and urgent: faster than the techno world, a heart and breath for drums, a supersaw lead; none of the smoky jazz or blues it could have been', () => {
  const m = STYLES.breath.music;
  assert.ok(kitFor(BREATH).bpm > 128, 'quicker than Code Rain\'s minimal techno');
  assert.match(m.drum, /^[HDEIi.]+$/, 'only the heart and the breath');
  assert.ok(/H/.test(m.drum) && /D/.test(m.drum) && /E/.test(m.drum) && /I/.test(m.drum), 'a lub, a dub, an exhale and an inhale');
  for (const [name, s] of Object.entries(STYLES)) {
    if (name !== 'breath') assert.ok(!/[HDEIi]/.test(s.music.drum), `${name} does not play the heart or the breath`);
  }
  assert.equal(m.lead.wave, 'sawtooth');
  assert.ok(m.lead.bow > 0, 'a twin beats against each note: wide');
  assert.ok(m.lead.attack < 1 && m.lead.hold > 0, 'a note that opens at once and holds, a lead that sings');
  assert.ok(kitFor(BREATH).scale.includes(11) && !kitFor(BREATH).scale.includes(10), 'a leading tone and no flat seventh: a line that climbs home');
});

test("world 17's look carries that music entry (looks/w17.js)", () => {
  assert.deepEqual(w17.music, BREATH);
  assert.deepEqual(LOOKS[16]?.music, BREATH);
  assert.equal(kitFor(LOOKS[16].music).style, 'breath');
});

test('help sounds when it arrives: a breath starts to rise (as long as the rise), and a tick for each bullet it wipes, where the bullet was', () => {
  assert.deepEqual(names([{ ...sample('breath'), y0: 1080, y1: 96, dur: 0.8 }]), [{ name: 'breath', dur: 0.8 }]);
  assert.deepEqual(names([{ ...sample('breath'), dur: 0.5 }]), [{ name: 'breath', dur: 0.5 }], 'the rise the event reports');
  assert.deepEqual(names([{ ...sample('cleanse'), x: 700, y: 400 }]), [{ name: 'cleanse', x: 700 }]);
  assert.deepEqual(names([{ ...sample('cleanse'), x: 1800 }]), [{ name: 'cleanse', x: 1800 }]);
  for (const type of ['breath', 'cleanse']) {
    assert.ok(!Object.hasOwn(SILENT, type), `${type} is not silent`);
    assert.equal(typeof SFX[type], 'function', `${type} has a patch`);
  }
});

test('nothing else plays the help: no other event sounds a breath or a cleanse, and the other twists\' events sound as they did', () => {
  for (const type of ['kill', 'explode', 'hit', 'bomb', 'fire', 'absorb', 'wreck', 'pearlBlock', 'burst', 'lightning', 'bunker', 'waveClear']) {
    assert.ok(!names([sample(type)]).some((s) => s.name === 'breath' || s.name === 'cleanse'), type);
  }
  assert.deepEqual(names([{ ...sample('absorb'), x: 950 }]), [{ name: 'absorb', x: 950 }]);
  assert.deepEqual(names([{ ...sample('wreck'), x: 700 }]), [{ name: 'wreck', x: 700 }]);
  assert.deepEqual(names([{ ...sample('fire'), side: 'enemy', pattern: 'fan' }]).map((s) => s.name), ['enemyShot'], 'an enemy bullet fired is still an enemy shot');
});
