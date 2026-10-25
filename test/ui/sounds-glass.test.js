import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventSounds } from '../../src/ui/sounds.js';
import { STYLES, SCALES, NOTES, kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import w16 from '../../src/ui/looks/w16.js';
import { WIDTH } from '../../src/core/kinds.js';
import { sampleEvent as sample } from '../event-sample.js';

const GLASS = { mood: 'glass', root: 'B', scale: 'melodic', bpm: 63 };

function names(events, world = { boss: null }) {
  const out = [];
  eventSounds(events, world, (name, o) => out.push({ name, ...o }));
  return out;
}

test('Glass Cathedral plays the glass style, in B melodic minor at 63 bpm: a root, a scale and a tempo no other world has', () => {
  const kit = kitFor(GLASS);
  assert.deepEqual([kit.style, kit.root, kit.scale, kit.bpm], ['glass', NOTES.B, SCALES.melodic, 63]);
  assert.deepEqual(SCALES.melodic, [0, 2, 3, 5, 7, 9, 11]);
  for (const [name, s] of Object.entries(STYLES)) if (name !== 'glass') assert.notEqual(s.mood, 'glass');
  const others = LOOKS.filter((l) => l.world !== 16);
  assert.equal(others.length, 15);
  for (const look of others) {
    assert.notEqual(look.music.root, 'B', `w${look.world}: the root is Glass Cathedral's alone`);
    assert.notEqual(look.music.scale, 'melodic', `w${look.world}: so is the scale`);
    assert.notEqual(look.music.bpm, 63, `w${look.world}: and the tempo`);
  }
});

test('it is a sine voice in a wet nave, unlike the organ swell and the gothic mood it could be mistaken for', () => {
  const [glass, organ, gothic] = ['glass', 'cosmic', 'gothic'].map((k) => STYLES[k]);
  assert.ok(glass.wet > organ.wet && glass.wet > gothic.wet);
  assert.equal(glass.music.lead.bow, 3, 'its lead beats against a twin: bowed glass');
  assert.equal(organ.music.lead.bow, undefined);
  assert.notEqual(glass.music.drum, organ.music.drum, 'the organ swell has no drums');
  assert.ok(/[qx]/.test(glass.music.drum) && !/[qx]/.test(gothic.music.drum), 'a choir and tubular bells, not the gothic tolling bell and timpani');
  assert.notEqual(glass.music.div, gothic.music.div);
  assert.notEqual(glass.music.lead.wave, gothic.music.lead.wave);
});

test("world 16's look carries that music entry (looks/w16.js)", () => {
  assert.deepEqual(w16.music, GLASS);
  assert.deepEqual(LOOKS[15]?.music, GLASS);
  assert.equal(kitFor(LOOKS[15].music).style, 'glass');
});

test("the glass twin pings with every shot of the ship while the mirror runs, on the other side of the field; no other power does", () => {
  const volley = (power, x = 500) => names([{ ...sample('fire'), side: 'ship', power, x }]);
  assert.deepEqual(volley('mirror', 640), [{ name: 'shot', power: 'mirror', x: 640 }, { name: 'mirrorShot', x: WIDTH - 640 }]);
  assert.equal(WIDTH, 1920);
  assert.deepEqual(volley('mirror', 100).map((s) => s.x), [100, 1820], 'the ship at the left, the twin at the right');
  assert.equal(volley('mirror', 960)[1].x, 960, 'and the two meet in the middle');
  for (const power of [null, 'spread', 'rapid', 'shield', 'homing', 'slow', 'wingmen', 'pearls', 'trident']) {
    assert.ok(!volley(power).some((s) => s.name === 'mirrorShot'), String(power));
  }
  assert.deepEqual(names([{ ...sample('fire'), side: 'enemy', power: 'mirror', pattern: 'fan' }]).map((s) => s.name), ['enemyShot']);
  assert.deepEqual(names([{ ...sample('fire'), side: 'ship', power: 'laser' }]), [], 'the beam still hums instead');
});

test('the twist\'s events sound as they always did through the same names: the glass is in the patches, not in the event map', () => {
  for (const type of ['wreck', 'wreckDown', 'reassemble']) {
    assert.deepEqual(names([{ ...sample(type), x: 700 }]), [{ name: type, x: 700 }], type);
  }
});
