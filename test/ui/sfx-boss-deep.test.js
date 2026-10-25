import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS } from '../../src/ui/sfx-boss.js';
import { UI } from '../../src/ui/sfx-ui.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { fakeVoice } from './audio-kit.js';

const ABYSS = kitFor({ mood: 'abyss', root: 'F#', scale: 'pentatonic', bpm: 54 });
const PENTATONIC = [6, 9, 11, 1, 4]; // F sharp A B C sharp E
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const oscillators = (nodes) => nodes.filter((x) => x.kind === 'Oscillator');
const glides = (nodes, f0, f1) => oscillators(nodes).filter((x) => x.frequency.calls[0]?.[1] === f0 && x.frequency.calls[1]?.[1] === f1);
const lfos = (nodes, hz) => oscillators(nodes).filter((x) => x.frequency.value === hz);
const noLeak = (a, nodes, secs) => {
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
};
const swell = (nodes, osc) => nodes[nodes.indexOf(osc) + 1].gain.calls; // the envelope tone() makes right after its oscillator: floor, peak, floor

test("the Leviathan's roar is a whale's call, a moan that climbs and one that sags, each shaken by a slow vibrato, over a sub tone that swells in", () => {
  assert.equal(ABYSS.style, 'abyss');
  const { a, nodes } = fakeVoice(ABYSS);
  const secs = BOSS.phase(a, { phase: 1 }); // the roar lasts 1.4 s
  const [up] = glides(nodes, 165, 420);
  const [down] = glides(nodes, 420, 170);
  assert.ok(up && down, 'a call that climbs from 165 Hz to 420 and one that falls back to 170');
  assert.ok(up.type === 'sine' && down.type === 'sine');
  assert.ok(Math.abs(up.frequency.calls[0][2] - (a.t + 0.05)) < 1e-9, 'it starts at once');
  assert.ok(Math.abs(down.frequency.calls[0][2] - (a.t + 1.4 * 0.45)) < 1e-9, 'and the fall begins as the climb peaks');
  const [sub] = glides(nodes, 52, 66);
  assert.ok(sub && sub.type === 'sine', 'a sub tone rising from 52 Hz, just above the sea monster of world 9');
  const [rise, peak] = swell(nodes, sub);
  assert.ok(peak[2] - rise[2] > 0.9, 'swelling in over most of the roar');
  assert.ok(peak[1] > swell(nodes, up)[1][1], 'the sub is the heavier voice');
  assert.equal(lfos(nodes, 4.5).length, 2, 'a 4.5 Hz vibrato on each moan');
  assert.ok(nodes.some((x) => x.kind === 'BiquadFilter' && x.type === 'lowpass' && x.frequency.calls[0][1] === 160), 'and a rush of water under it');
  noLeak(a, nodes, secs);
});

test('the last roar moans higher and longer, and the death scream plays it too', () => {
  const { a, nodes } = fakeVoice(ABYSS);
  const secs = BOSS.bossDeath(a);
  assert.equal(glides(nodes, 180, 420).length, 1, 'the climb starts higher with the phase (h 2)');
  assert.equal(glides(nodes, 420, 170).length, 1);
  assert.equal(lfos(nodes, 4.5).length, 2);
  const [sub] = glides(nodes, 52, 66);
  assert.ok(swell(nodes, sub)[1][2] - swell(nodes, sub)[0][2] > 1.3, 'the sub swells in over most of two seconds');
  noLeak(a, nodes, secs);
});

test("no other world's roar moans or swells a sub tone", () => {
  for (const look of LOOKS.filter((l) => l.music.mood !== 'abyss')) {
    for (const play of [(a) => BOSS.phase(a, { phase: 1 }), (a) => BOSS.phase(a, { phase: 2 }), (a) => BOSS.bossDeath(a)]) {
      const roar = fakeVoice(kitFor(look.music));
      play(roar.a);
      assert.equal(lfos(roar.nodes, 4.5).length, 0, `w${look.world}: no slow vibrato`);
      assert.equal(glides(roar.nodes, 52, 66).length, 0, `w${look.world}: no sub swell`);
    }
  }
});

test("the deep's stingers are a theremin on the scale: a pure sine a note, a hand's vibrato on each, a glassy ring an octave over", () => {
  const { a, nodes } = fakeVoice(ABYSS);
  const secs = UI.cleared(a, {}); // seven notes
  const osc = oscillators(nodes);
  assert.ok(osc.filter((x) => x.type !== undefined).every((x) => x.type === 'sine'), 'pure: no sawtooth and no square');
  const notes = osc.filter((x) => x.frequency.calls.length && Math.abs(x.frequency.calls[0][1] - 369.99) < 0.05);
  assert.equal(notes.length, 1, 'the run starts on F sharp 4');
  assert.equal(lfos(nodes, 5.8).length, 7, 'a vibrato on each of the seven notes');
  const modulators = osc.filter((x) => x.type === undefined && x.frequency.calls.length);
  assert.equal(modulators.length, 7, 'a glassy FM partner on each');
  assert.ok(modulators.every((m) => osc.some((c) => c.type === 'sine' && c.frequency.calls.length && Math.abs(m.frequency.calls[0][1] / c.frequency.calls[0][1] - 3.51) < 1e-9)), 'inharmonic: glass');
  const sines = osc.filter((x) => x.type === 'sine' && x.frequency.calls.length);
  assert.equal(sines.length, 15, 'seven notes, seven rings over them and the low root under the last chord');
  assert.ok(sines.every((x) => PENTATONIC.includes(pitchClass(x.frequency.calls[0][1]))), 'every one on the scale');
  assert.equal(nodes.filter((x) => x.kind === 'BiquadFilter').length, 1, 'only the swell\'s own hiss is filtered: no horn to open, no breath');
  noLeak(a, nodes, secs);
  for (const name of ['waveClear', 'failed', 'start']) {
    const stinger = fakeVoice(ABYSS);
    UI[name](stinger.a, {});
    assert.ok(lfos(stinger.nodes, 5.8).length > 0, `${name} is sung by the theremin too`);
  }
});

test("no other world's stinger shakes at a theremin's 5.8 Hz", () => {
  for (const look of LOOKS.filter((l) => l.music.mood !== 'abyss')) {
    for (const name of ['cleared', 'waveClear', 'failed', 'start']) {
      const stinger = fakeVoice(kitFor(look.music));
      UI[name](stinger.a, {});
      assert.equal(lfos(stinger.nodes, 5.8).length, 0, `w${look.world} ${name}`);
    }
  }
});
