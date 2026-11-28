import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FLATS, LASSO, PING, FLUTTER, FLATS_GAP } from '../../src/ui/sfx-flats.js';
import { ROAD_GAP } from '../../src/ui/sfx-road.js';
import { SFX, ROAD_GAPS } from '../../src/ui/sfx.js';
import { kitFor, degreeMidi, midiHz } from '../../src/ui/sound-data.js';
import { fakeVoice } from './audio-kit.js';
import w22 from '../../src/ui/looks/w22.js';

const KIT = kitFor(w22.music);
const NAMES = ['lasso', 'shardBounce', 'flockScatter'];
const sources = (nodes) => nodes.filter((n) => n.kind === 'Oscillator' || n.kind === 'BufferSource');
const build = (patch, o = {}) => {
  const { a, nodes } = fakeVoice(KIT);
  return { a, nodes, secs: patch(a, o) };
};
const hz = (degree, octave) => midiHz(degreeMidi(KIT, degree, octave));
const carriers = (nodes) => nodes.filter((n) => n.kind === 'Oscillator').map((n) => n.frequency.calls[0]?.[1] ?? n.frequency.value);
const plays = (nodes, d, oct) => carriers(nodes).some((f) => Math.abs(f - hz(d, oct)) < 1e-6);

test('the leg 3 patches are in the sound table and build a sound that ends', () => {
  for (const name of NAMES) {
    assert.equal(SFX[name], FLATS[name], name);
    const { a, nodes, secs } = build(SFX[name], { count: 3 });
    assert.ok(Number.isFinite(secs) && secs > 0, name);
    assert.ok(sources(nodes).length > 0, name);
    for (const s of sources(nodes)) assert.ok(s.started && s.stopAt !== null && s.stopAt <= a.t + secs + 0.1, `${name}: a source runs past its end`);
  }
});

test("the lasso's chime climbs the scale, one bell more for each thing caught, up to a cap, all in key", () => {
  const bells = (count) => build(FLATS.lasso, { count }).nodes.filter((n) => n.kind === 'Oscillator' && carriers([n]).some((f) => f > 400));
  const few = build(FLATS.lasso, { count: 1 });
  const many = build(FLATS.lasso, { count: 4 });
  assert.ok(many.secs > few.secs, 'a bigger catch rings longer');
  for (let d = 0; d <= 4; d++) assert.ok(plays(many.nodes, d, LASSO.octave), `degree ${d}`);
  assert.ok(!plays(few.nodes, 4, LASSO.octave), 'a small catch does not reach the top');
  const top = build(FLATS.lasso, { count: 99 });
  assert.ok(plays(top.nodes, LASSO.bells - 1, LASSO.octave) && !plays(top.nodes, LASSO.bells, LASSO.octave), 'capped');
  assert.ok(bells(0).length >= 1, 'an empty loop still chimes once');
});

test('the shard pings glassy, high and short; the flock flutters soft, noise only, quieter than the kite', () => {
  const ping = build(FLATS.shardBounce);
  assert.ok(plays(ping.nodes, PING.degree, PING.octave) && ping.secs < 0.6);
  const flutter = build(FLATS.flockScatter);
  assert.ok(sources(flutter.nodes).every((n) => n.kind === 'BufferSource'), 'no tone');
  assert.equal(sources(flutter.nodes).length, FLUTTER.beats.length);
  assert.equal(FLUTTER.pitches.length, FLUTTER.beats.length);
  assert.ok(FLUTTER.peak < 0.11, 'softer than the kite');
});

test("world 22's gaps live outside audio.js, which stays under 200 lines", () => {
  for (const k of [...Object.keys(ROAD_GAP), ...Object.keys(FLATS_GAP)]) assert.ok(Object.hasOwn(ROAD_GAPS, k), k);
  for (const k of NAMES) assert.ok(FLATS_GAP[k] > 0, k);
  const src = readFileSync(new URL('../../src/ui/audio.js', import.meta.url), 'utf8');
  assert.ok(src.split('\n').length < 200);
  assert.ok(!/flutter: |seedBurst: |lasso: /.test(src), 'no road entry left in audio.js');
});
