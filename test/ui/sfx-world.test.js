import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORLD } from '../../src/ui/sfx-world.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { fakeVoice } from './audio-kit.js';

const AURORA = kitFor({ mood: 'aurora', root: 'E', scale: 'lydian', bpm: 84 });
const oscillators = (nodes) => nodes.filter((x) => x.kind === 'Oscillator');
const starts = (nodes) => oscillators(nodes).map((x) => x.frequency.calls[0][1]);

test('in Aurora Kingdom a cut shard shatters: a glassy crack, splinters tinkling down, a chime on the scale', () => {
  const { a, nodes } = fakeVoice(AURORA);
  const secs = WORLD.cut(a, { x: 960 });
  const crack = nodes.find((x) => x.kind === 'BiquadFilter' && x.type === 'highpass');
  assert.ok(crack && crack.frequency.calls[0][1] >= 6000, 'a bright crack of noise');
  const splinters = starts(nodes).filter((f) => f >= 4300 && f <= 6900);
  assert.ok(splinters.length >= 3, `${splinters.length} splinters`);
  const chime = starts(nodes).filter((f) => f > 800 && f < 1700);
  assert.equal(chime.length, 1, 'one chime');
  const pc = (Math.round(12 * Math.log2(chime[0] / 440)) + 69) % 12;
  assert.ok([4, 6, 8, 10, 11, 1, 3].includes(pc), `the chime is in E lydian: ${pc}`);
  assert.ok(starts(nodes).some((f) => Math.abs(f - chime[0] * 3.51) < 1), 'with a glassy inharmonic partner');
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
});

test('the shatter chimes higher the further right the shard broke, at any x', () => {
  const chime = (x) => {
    const { a, nodes } = fakeVoice(AURORA);
    WORLD.cut(a, { x });
    return starts(nodes).find((f) => f > 800 && f < 1700);
  };
  const pitches = [100, 500, 900, 1300, 1800].map(chime);
  for (let i = 1; i < pitches.length; i++) assert.ok(pitches[i] > pitches[i - 1], `x step ${i}: ${pitches}`);
  assert.equal(chime(-50), pitches[0], 'left of the screen is the lowest');
  assert.equal(chime(4000), pitches[4], 'right of it the highest');
  assert.ok(chime(undefined) > 0, 'a cut without an x still chimes');
});

test("every other world's cut is still Ronin Moon's steel shing: one FM ring and a hiss of noise", () => {
  for (const look of LOOKS) {
    const kit = kitFor(look.music);
    if (kit.style === 'aurora') continue;
    const { a, nodes } = fakeVoice(kit);
    assert.equal(WORLD.cut(a, { x: 960 }), 0.42, `w${look.world}`);
    assert.deepEqual(starts(nodes).sort((p, q) => p - q), [3100, 3100 * 1.41], `w${look.world}`);
    assert.equal(nodes.filter((x) => x.kind === 'BufferSource').length, 1, `w${look.world}`);
  }
});
