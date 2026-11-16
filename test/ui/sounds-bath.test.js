import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { eventSounds, SILENT, TWIST_VOICES } from '../../src/ui/sounds.js';
import { SFX } from '../../src/ui/sfx.js';
import { STYLES, SCALES, NOTES, kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import w19 from '../../src/ui/looks/w19.js';
import { sampleEvent as sample } from '../event-sample.js';

const BATH = w19.music;
const TWISTS = ['whack', 'bonk', 'bank', 'strike', 'plop', 'fizzle'];

function names(events, world = { boss: null }) {
  const out = [];
  eventSounds(events, world, (name, o) => out.push({ name, ...o }));
  return out;
}

test('Rubber Regatta plays the bath style, in F on the sunny scale at its own tempo: a mood, a scale and a tempo no other world has', () => {
  assert.deepEqual([BATH.mood, BATH.root, BATH.scale], ['bath', 'F', 'sunny']);
  const kit = kitFor(BATH);
  assert.deepEqual([kit.style, kit.root, kit.scale, kit.bpm], ['bath', NOTES.F, SCALES.sunny, BATH.bpm]);
  for (const [name, s] of Object.entries(STYLES)) if (name !== 'bath') assert.notEqual(s.mood, 'bath');
  const others = LOOKS.filter((l) => l.world !== 19);
  assert.equal(others.length, LOOKS.length - 1);
  assert.ok(others.length >= 18);
  for (const look of others) {
    assert.notEqual(look.music.scale, 'sunny', `w${look.world}: the scale is Rubber Regatta's alone`);
    assert.notEqual(look.music.bpm, BATH.bpm, `w${look.world}: and the tempo`);
    if (look.music.root === 'F') assert.equal(look.music.scale, 'minor', "F is shared only with world 7's minor");
  }
  for (const [name, scale] of Object.entries(SCALES)) if (name !== 'sunny') assert.notDeepEqual(scale, SCALES.sunny, name);
});

test("world 19's music is its look's entry (looks/w19.js, through looks/index.js)", () => {
  assert.deepEqual(LOOKS[18]?.music, w19.music);
});

test("its loop is its own: the letters (B W S L) and the lead (a marimba, FM on 4) are no other style's", () => {
  const mine = STYLES.bath.music;
  for (const [name, s] of Object.entries(STYLES)) {
    if (name === 'bath') continue;
    assert.ok(!/[BWSL]/.test(s.music.drum), `${name} plays none of its letters`);
    assert.notEqual(s.music.lead.fm?.ratio, mine.lead.fm.ratio, `${name}'s lead is not a marimba`);
  }
  assert.ok(!/[KCOHATP]/.test(mine.drum), "and it plays none of world 17's or world 18's");
});

test('the batting rule sounds through its own events, each where it happened, with what its patch reads', () => {
  assert.deepEqual(names([{ ...sample('whack'), x: 700, role: 'diver' }]), [{ name: 'whack', x: 700 }]);
  assert.deepEqual(names([{ ...sample('bonk'), x: 640, link: 2, ko: true, role: 'grunt' }]), [{ name: 'bonk', link: 2, boss: false, x: 640 }]);
  assert.deepEqual(names([{ ...sample('bonk'), x: 900, link: 0, ko: false, role: 'boss' }]), [{ name: 'bonk', link: 0, boss: true, x: 900 }]);
  assert.deepEqual(names([{ ...sample('bank'), x: 60 }]), [{ name: 'bank', x: 60 }]);
  assert.deepEqual(names([{ ...sample('strike'), x: 1000, links: 4 }]), [{ name: 'strike', x: 1000 }]);
  assert.deepEqual(names([{ ...sample('plop'), x: 1500, role: 'gunner' }]), [{ name: 'plop', x: 1500 }]);
  assert.deepEqual(names([{ ...sample('fizzle'), x: 300 }]), [{ name: 'fizzle', x: 300 }]);
  for (const type of TWISTS) {
    assert.ok(!Object.hasOwn(SILENT, type), `${type} is not silent`);
    assert.equal(typeof SFX[type], 'function', type);
  }
  for (const type of ['kill', 'hit', 'explode', 'bomb', 'fire', 'backfire', 'cleanse']) {
    assert.ok(!names([sample(type)]).some((s) => TWISTS.includes(s.name)), type);
  }
});

test('a knock-out by a flying body sounds its bonk, then the kill (which squeaks in this world), in that order', () => {
  const sounds = names([{ ...sample('bonk'), ko: true }, { ...sample('kill'), role: 'grunt' }, { ...sample('strike') }]).map((s) => s.name);
  assert.deepEqual(sounds, ['bonk', 'kill', 'strike']);
});

test(`at most TWIST_VOICES (${TWIST_VOICES}) batting sounds a tick, one of each kind; every other sound of the tick still plays`, () => {
  assert.ok(TWIST_VOICES > 0 && TWIST_VOICES < TWISTS.length, 'a cap that binds: fewer voices than kinds');
  const pile = [...TWISTS, ...TWISTS, ...TWISTS].map((type, i) => ({ ...sample(type), x: 100 + i * 50 }));
  const kills = Array.from({ length: 6 }, (_, i) => ({ ...sample('kill'), x: 200 + i * 100 }));
  const sounds = names([...pile.slice(0, 9), ...kills, ...pile.slice(9)]);
  const twist = sounds.filter((s) => TWISTS.includes(s.name));
  assert.equal(twist.length, TWIST_VOICES);
  assert.equal(new Set(twist.map((s) => s.name)).size, twist.length, 'never the same kind twice in a tick');
  assert.deepEqual(twist.map((s) => s.name), TWISTS.slice(0, TWIST_VOICES), 'the first to come are the ones heard');
  assert.equal(sounds.filter((s) => s.name === 'kill').length, 6, 'the kills are not counted');
  assert.equal(names([sample('whack')]).length, 1, 'the next tick starts afresh');
  const five = names(['whack', 'whack', 'whack', 'whack', 'whack'].map((type) => sample(type)));
  assert.equal(five.length, 1, 'a ship sweeping through a pile of bodies whacks once a tick');
});

test('each batting sound is thinned: the audio engine gives every one a gap, like the other small sounds', () => {
  const src = readFileSync(fileURLToPath(new URL('../../src/ui/audio.js', import.meta.url)), 'utf8');
  for (const type of TWISTS) {
    const gap = src.match(new RegExp(`[ {]${type}: ([\\d.]+)`));
    assert.ok(gap && Number(gap[1]) >= 0.04 && Number(gap[1]) <= 0.3, `${type}: gap ${gap?.[1]}`);
  }
});
