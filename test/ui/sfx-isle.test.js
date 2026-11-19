import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ISLE, TURN_BANDS, TURN_OCTAVE, turnDegree } from '../../src/ui/sfx-isle.js';
import { SFX } from '../../src/ui/sfx.js';
import { eventSounds } from '../../src/ui/sounds.js';
import { kitFor, degreeMidi, midiHz } from '../../src/ui/sound-data.js';
import { WIDTH } from '../../src/core/kinds.js';
import { fakeVoice } from './audio-kit.js';
import { sampleEvent } from '../event-sample.js';
import w21 from '../../src/ui/looks/w21.js';

// Golden Isle's kit, read from its look directly (looks/w21.js) until the look is listed.
const ISLE_KIT = kitFor(w21.music);
const starts = (nodes) => nodes.filter((n) => n.kind === 'Oscillator').map((n) => n.frequency.calls[0]?.[1] ?? n.frequency.value);

function chime(x) {
  const { a, nodes } = fakeVoice(ISLE_KIT);
  const secs = ISLE.arrowTurn(a, { x });
  return { secs, a, nodes, f: Math.min(...starts(nodes)) };
}

test('an arrow turning sounds its chime at the turn x', () => {
  const played = [];
  eventSounds([{ ...sampleEvent('arrowTurn'), x: 1234 }], { boss: null }, (name, o) => played.push([name, o]));
  assert.deepEqual(played, [['arrowTurn', { x: 1234 }]]);
  assert.equal(SFX.arrowTurn, ISLE.arrowTurn);
});

test("the chime is a note of world 21's scale, the band of the field it turned in", () => {
  for (let band = 0; band < TURN_BANDS; band++) {
    const x = ((band + 0.5) / TURN_BANDS) * WIDTH;
    const { f } = chime(x);
    assert.equal(turnDegree(x), band);
    assert.ok(Math.abs(f - midiHz(degreeMidi(ISLE_KIT, band, TURN_OCTAVE))) < 1e-6, `band ${band}: ${f}`);
    const pc = (Math.round(12 * Math.log2(f / 440)) + 69 - ISLE_KIT.root + 120) % 12;
    assert.ok(ISLE_KIT.scale.includes(pc), `band ${band} in the scale`);
  }
});

test('a row of turns from left to right plays a rising run; past the edges or with no x it stays on the end notes', () => {
  const pitches = Array.from({ length: TURN_BANDS }, (_, i) => chime(((i + 0.5) / TURN_BANDS) * WIDTH).f);
  for (let i = 1; i < pitches.length; i++) assert.ok(pitches[i] > pitches[i - 1], `step ${i}: ${pitches}`);
  assert.equal(chime(-50).f, pitches[0]);
  assert.equal(chime(undefined).f, pitches[0]);
  assert.equal(chime(WIDTH * 2).f, pitches.at(-1));
});

test('the chime is short and every source it starts stops', () => {
  const { secs, a, nodes } = chime(WIDTH / 2);
  assert.ok(secs > 0 && secs < 0.5, `${secs} s`);
  for (const s of nodes.filter((n) => n.kind === 'Oscillator' || n.kind === 'BufferSource')) {
    assert.ok(s.started && s.stopAt !== null && s.stopAt <= a.t + secs + 0.1, 'a source left running');
  }
});
