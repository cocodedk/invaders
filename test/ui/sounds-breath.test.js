import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventSounds, SILENT } from '../../src/ui/sounds.js';
import { SFX } from '../../src/ui/sfx.js';
import { STYLES, SCALES, NOTES, kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import w17 from '../../src/ui/looks/w17.js';
import { sampleEvent as sample } from '../event-sample.js';

const BREATH = { mood: 'breath', root: 'D#', scale: 'major', bpm: 104 };

function names(events, world = { boss: null }) {
  const out = [];
  eventSounds(events, world, (name, o) => out.push({ name, ...o }));
  return out;
}

test('Ash to Air plays the breath style, in E flat major at 104 bpm: a root and a tempo no other world has', () => {
  const kit = kitFor(BREATH);
  assert.deepEqual([kit.style, kit.root, kit.scale, kit.bpm], ['breath', NOTES['D#'], SCALES.major, 104]);
  for (const [name, s] of Object.entries(STYLES)) if (name !== 'breath') assert.notEqual(s.mood, 'breath');
  const others = LOOKS.filter((l) => l.world !== 17);
  assert.equal(others.length, LOOKS.length - 1);
  assert.ok(others.length >= 16);
  for (const look of others) {
    assert.notEqual(look.music.root, 'D#', `w${look.world}: the root is Ash to Air's alone`);
    assert.notEqual(look.music.bpm, 104, `w${look.world}: and the tempo`);
  }
});

test('it is calm: an easy tempo, a struck electric piano, no hiss of breath and no racing heart; none of the smoky jazz or blues it could have been', () => {
  const m = STYLES.breath.music;
  assert.ok(kitFor(BREATH).bpm < 120, 'slower than the first world\'s march');
  assert.match(m.drum, /^[kqzh.]+$/, 'a soft kick, a choir, a plucked bass and a hat');
  assert.equal(m.lead.fm?.ratio, 1, 'a tine struck on a whole ratio');
  assert.ok(m.lead.hold === undefined && m.lead.bow === undefined, 'it rings out alone, nothing held or beating against it');
  const scale = kitFor(BREATH).scale;
  assert.ok(!scale.includes(3) && !scale.includes(10), 'no blue third, no flat seventh');
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
