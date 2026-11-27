import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROAD, CHIME, BLOOM, SWELL, CRACK, RUSTLE, FLOOD, SCRATCH, SNAP } from '../../src/ui/sfx-road.js';
import { WORLD } from '../../src/ui/sfx-world.js';
import { SFX } from '../../src/ui/sfx.js';
import { kitFor, degreeMidi, midiHz } from '../../src/ui/sound-data.js';
import { fakeVoice } from './audio-kit.js';
import w22 from '../../src/ui/looks/w22.js';
import w4 from '../../src/ui/looks/w4.js';

const KIT = kitFor(w22.music);
const NAMES = ['checkpoint', 'ability', 'seedBurst', 'chip', 'respawn', 'holdBreak', 'flutter', 'lineScratch', 'brambleSnap'];
const sources = (nodes) => nodes.filter((n) => n.kind === 'Oscillator' || n.kind === 'BufferSource');
const starts = (nodes) => nodes.filter((n) => n.kind === 'Oscillator').map((n) => n.frequency.calls[0]?.[1] ?? n.frequency.value);
const build = (patch, o = {}, kit = KIT) => {
  const { a, nodes } = fakeVoice(kit);
  return { a, nodes, secs: patch(a, o) };
};
const hz = (degree, octave) => midiHz(degreeMidi(KIT, degree, octave));
const plays = (nodes, degree, octave) => starts(nodes).some((f) => Math.abs(f - hz(degree, octave)) < 1e-6);

test('every road patch is in the sound table and builds a sound that ends: every source it starts stops inside the time it reports', () => {
  for (const name of NAMES) {
    assert.equal(SFX[name], ROAD[name], name);
    const { a, nodes, secs } = build(SFX[name]);
    assert.ok(Number.isFinite(secs) && secs > 0, `${name}: ${secs} s`);
    assert.ok(sources(nodes).length > 0, name);
    for (const s of sources(nodes)) assert.ok(s.started && s.stopAt !== null && s.stopAt <= a.t + secs + 0.1, `${name}: a source runs past its end`);
  }
});

test("the lantern chimes the root, the third and the fifth of the world's scale, one after another a gap apart", () => {
  const { nodes } = build(ROAD.checkpoint);
  CHIME.degrees.forEach((d) => assert.ok(plays(nodes, d, CHIME.octave), `degree ${d}`));
  const bells = nodes.filter((n) => n.kind === 'Oscillator' && CHIME.degrees.some((d) => Math.abs(n.frequency.calls[0][1] - hz(d, CHIME.octave)) < 1e-6));
  assert.deepEqual(bells.map((n) => n.started), [true, true, true]);
  assert.ok(Math.abs(bells[1].stopAt - bells[0].stopAt - CHIME.gap) < 1e-9, 'each struck a gap after the last');
});

test('the ability blooms on the chord and sparks over it; the respawn swells on its root, fifth and octave: all of it in key', () => {
  const bloom = build(ROAD.ability).nodes;
  for (const d of BLOOM.chord) assert.ok(plays(bloom, d, BLOOM.octave), `pad ${d}`);
  for (const d of BLOOM.spark) assert.ok(plays(bloom, d, BLOOM.sparkOctave), `spark ${d}`);
  const swell = build(ROAD.respawn).nodes;
  SWELL.chord.forEach((d) => assert.ok(plays(swell, d, SWELL.octave), `swell ${d}`));
});

test('the gate rings a wide chord of the scale with a bell over it, after a rush of air, and is the longest of them all', () => {
  const { nodes, secs } = build(ROAD.holdBreak);
  for (const d of FLOOD.chord) assert.ok(plays(nodes, d, FLOOD.octave), `chord ${d}`);
  assert.ok(plays(nodes, FLOOD.top, FLOOD.topOctave), 'the bell');
  assert.ok(nodes.some((n) => n.kind === 'BufferSource'), 'the rush');
  for (const name of NAMES.filter((n) => n !== 'holdBreak')) assert.ok(build(ROAD[name]).secs < secs, name);
});

test('a struck bullet cracks small and a broken one bigger; the quick ones are short, the seed pops, the kite rustles once a beat', () => {
  assert.ok(CRACK.chip < CRACK.cut);
  const [chip, cut] = [build(ROAD.chip), build(SFX.cut, {})];
  assert.ok(chip.secs < cut.secs && cut.secs < 0.2, `${chip.secs} < ${cut.secs}`);
  assert.ok(build(ROAD.seedBurst).secs < 0.3);
  const rustle = build(ROAD.flutter);
  assert.equal(rustle.nodes.filter((n) => n.kind === 'BufferSource').length, RUSTLE.beats.length);
  assert.equal(RUSTLE.pitches.length, RUSTLE.beats.length);
  assert.ok(rustle.secs < 0.7);
});

test("a broken bullet cracks only in this world: another world's cut is still its own", () => {
  const trace = ({ nodes, secs }) => JSON.stringify([secs, nodes.map((n) => [n.kind, n.type, n.frequency.calls, n.gain.calls])]);
  const other = kitFor(w4.music);
  assert.notEqual(other.style, 'road');
  assert.equal(trace(build(SFX.cut, { x: 300 }, other)), trace(build(WORLD.cut, { x: 300 }, other)));
  assert.notEqual(trace(build(SFX.cut, { x: 300 }, KIT)), trace(build(WORLD.cut, { x: 300 }, KIT)), 'here it is the crack, not the shuriken\'s shing');
});

test('the pencil scratch is noise only: one band-passed hiss stroke each, sweeping down, quiet and short', () => {
  const { nodes, secs } = build(ROAD.lineScratch);
  assert.equal(sources(nodes).length, SCRATCH.strokes.length);
  assert.ok(sources(nodes).every((n) => n.kind === 'BufferSource'), 'no tone');
  assert.ok(secs <= SCRATCH.max, secs + ' s');
  assert.ok(SCRATCH.strokes.every((s) => s.f1 < s.f0));
});

test("the bramble snap is a high-passed crack and a knock on a degree of the world's scale", () => {
  const { nodes, secs } = build(ROAD.brambleSnap);
  assert.ok(nodes.some((n) => n.kind === 'BufferSource'), 'the snap');
  assert.ok(plays(nodes, SNAP.degree, SNAP.octave), 'the knock is in key');
  assert.ok(secs < 0.2);
});
