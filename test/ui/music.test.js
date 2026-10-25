import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setMusic, updateMusic, startLoop, fillLoop, stopLoop } from '../../src/ui/music.js';
import { STYLES } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { fakeAudio } from './audio-kit.js';

test('a loop that ends disconnects every node it made and stops its sources', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const nodes = fakeAudio();
  for (const look of LOOKS) {
    const c = startLoop(nodes, look);
    fillLoop(c, nodes.ctx.currentTime + 2);
    nodes.ctx.currentTime += 2;
    stopLoop(c);
    assert.ok(c.made.some((n) => n.out.size > 0), 'still sounding while it fades');
    t.mock.timers.tick(3000);
    assert.deepEqual(c.made.filter((n) => n.out.size > 0).map((n) => n.kind), [], `world ${look.world}`);
    assert.ok(c.sources.every((s) => s.stopAt !== null), 'every drone source stopped');
  }
});

test('fifty world changes leave one loop connected, the echo feedback included (R31)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const nodes = fakeAudio();
  const wet = LOOKS.filter((l) => l.music.mood === 'noir synth pads' || l.music.mood === 'organ swell');
  assert.equal(wet.length, 2, 'two worlds have the echo');
  const live = (kind) => nodes.ctx.nodes.filter((n) => n.kind === kind && n.out.size > 0).length;
  const intoMusic = () => nodes.ctx.nodes.filter((n) => n.out.has(nodes.music)).length;
  const counts = [];
  for (let i = 0; i < 50; i++) {
    setMusic(wet[i % 2]); // echo worlds both ways: the worst case for the feedback loop
    updateMusic(nodes);
    nodes.ctx.currentTime += 3;
    t.mock.timers.tick(3000);
    counts.push([intoMusic(), live('Delay')]);
  }
  for (const [into, delays] of counts) {
    assert.equal(into, 1, 'one loop feeds the music bus');
    assert.equal(delays, 1, 'one echo is connected');
  }
  setMusic(null);
  updateMusic(nodes);
  t.mock.timers.tick(3000);
  assert.equal(intoMusic(), 0, 'silence leaves nothing connected to the bus');
  assert.equal(live('Delay'), 0);
});

test("Hollow Night's loop tolls a low bell on the bar, over an organ drone and plucked arpeggios in harmonic minor", () => {
  const nodes = fakeAudio();
  const c = startLoop(nodes, LOOKS[9]);
  fillLoop(c, 4.2); // two bars at 112 bpm, and a little over
  const osc = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator');
  const first = (n) => n.frequency.calls[0]?.[1] ?? n.frequency.value;
  const bell = osc.filter((n) => Math.abs(first(n) - 146.83) < 0.5 || Math.abs(first(n) - 73.42) < 0.5);
  assert.ok(bell.length >= 4, `${bell.length} bell tones: the prime and the hum, on each of the two bars`);
  assert.ok(osc.filter((n) => n.type === 'square').length >= 3, 'an organ pad of square waves: root, fifth and a detuned root');
  const plucks = osc.filter((n) => n.type === 'sawtooth' && n.frequency.calls.length);
  assert.ok(plucks.length >= 12, `${plucks.length} harpsichord plucks`);
  const pitchClass = (n) => (Math.round(12 * Math.log2(first(n) / 440)) + 69) % 12;
  const pcs = new Set(plucks.map(pitchClass));
  assert.ok([...pcs].every((pc) => [1, 2, 4, 5, 7, 9, 10].includes(pc)), `every pluck is D harmonic minor: ${[...pcs]}`);
  assert.ok(pcs.has(1), 'the leading tone, C sharp, is in the arpeggio');
});

test("Aurora Kingdom's loop strikes celesta bells in E lydian over a choir that swells in on each bar, a soft drum and sleigh bells", () => {
  const nodes = fakeAudio();
  const c = startLoop(nodes, { music: { mood: 'aurora', root: 'E', scale: 'lydian', bpm: 84 } });
  fillLoop(c, 5.8); // one 16-step pass at 84 bpm, and a little over
  const osc = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator');
  const first = (n) => n.frequency.calls[0]?.[1] ?? n.frequency.value;
  const bells = osc.filter((n) => n.type === 'sine' && first(n) > 600 && first(n) < 2100);
  assert.ok(bells.length >= 10, `${bells.length} bell strikes`);
  const pitchClass = (n) => (Math.round(12 * Math.log2(first(n) / 440)) + 69) % 12;
  const pcs = new Set(bells.map(pitchClass));
  assert.ok([...pcs].every((pc) => [4, 6, 8, 10, 11, 1, 3].includes(pc)), `every bell is E lydian: ${[...pcs]}`);
  assert.ok(pcs.has(10), 'the raised fourth, A sharp, is in the tune');
  assert.ok(osc.some((n) => Math.abs(first(n) - 987.77 * 3.51) < 1), 'each bell has its inharmonic FM partner');
  const choir = osc.filter((n) => n.type === 'sawtooth');
  assert.equal(choir.length, 12, 'three notes of two detuned voices, on each of the two bars');
  assert.ok(choir.some((n) => n.detune.value < 0) && choir.some((n) => n.detune.value > 0), 'detuned both ways');
  assert.ok(choir.every((n) => n.stopAt - n.frequency.calls[0][2] > 3), 'long pads that swell in slowly');
  assert.ok(osc.filter((n) => Math.abs(first(n) - 123.47) < 0.5).length >= 2, 'a soft drum on each bar');
  const shake = nodes.ctx.nodes.filter((n) => n.kind === 'BiquadFilter' && n.type === 'bandpass' && first(n) >= 5000);
  assert.ok(shake.length >= 10, `${shake.length} sleigh-bell rattles`);
});

test("Starlit Archive's loop plucks harp arpeggios in D dorian under music-box bells and strings that bow in on each bar, with a plucked bass and a soft frame drum", () => {
  const nodes = fakeAudio();
  const c = startLoop(nodes, LOOKS[11]);
  assert.deepEqual([c.kit.style, c.kit.bpm], ['archive', 116]);
  fillLoop(c, 4.2); // one 16-step pass at 116 bpm, and a little over
  const osc = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator');
  const first = (n) => n.frequency.calls[0]?.[1] ?? n.frequency.value;
  const pitchClass = (n) => (Math.round(12 * Math.log2(first(n) / 440)) + 69) % 12;
  const DORIAN = [2, 4, 5, 7, 9, 11, 0];
  const carriers = osc.filter((n) => nodes.ctx.nodes.some((g) => g.out.has(n.frequency))); // the FM tones: what a modulator drives
  const partner = (n, ratio) => osc.some((m) => Math.abs(first(m) - first(n) * ratio) < 0.5);
  const harp = carriers.filter((n) => first(n) < 900);
  assert.equal(harp.length, 15, 'fifteen plucks and a rest in the arpeggio');
  const pcs = new Set(harp.map(pitchClass));
  assert.ok([...pcs].every((pc) => DORIAN.includes(pc)), `every pluck is D dorian: ${[...pcs]}`);
  assert.ok(pcs.has(11), 'the dorian sixth, B, is in the tune');
  assert.ok(harp.every((n) => partner(n, 3)), 'each pluck has a whole-number FM partner, so it rings like a string');
  const bells = carriers.filter((n) => first(n) > 900);
  assert.equal(bells.length, 2, 'sparse: two music-box bells in the pass');
  assert.ok(bells.every((n) => DORIAN.includes(pitchClass(n)) && partner(n, 4.2)), 'in the scale, with an inharmonic partner');
  const saws = osc.filter((n) => n.type === 'sawtooth');
  const drone = saws.filter((n) => !n.frequency.calls.length);
  assert.equal(drone.length, 3, 'the string pad underneath: root, fifth and a detuned root');
  assert.ok(Math.abs(first(drone[0]) - 73.42) < 0.05, 'on D2');
  const pad = saws.filter((n) => n.frequency.calls.length && n.stopAt - n.frequency.calls[0][2] > 2.5);
  assert.equal(pad.length, 16, 'four notes of two detuned voices, bowed in on each of the two bars');
  assert.ok(pad.every((n) => DORIAN.includes(pitchClass(n))), 'a chord of the scale');
  assert.ok(pad.some((n) => n.detune.value < 0) && pad.some((n) => n.detune.value > 0), 'detuned both ways');
  const bass = saws.filter((n) => n.frequency.calls.length && n.stopAt - n.frequency.calls[0][2] < 0.5);
  assert.deepEqual(bass.map((n) => Math.round(first(n))), [73, 147, 73, 147], 'the plucked bass: root, octave, root, octave');
  assert.equal(osc.filter((n) => first(n) === 132).length, 4, 'four soft frame-drum thumps');
});

test("Sunset Armada's loop is a brass fanfare in G major over timpani on the downbeats, a snare march that rolls into each bar and strings chopped off the beat", () => {
  const nodes = fakeAudio();
  const c = startLoop(nodes, LOOKS[12]);
  assert.deepEqual([c.kit.style, c.kit.bpm], ['armada', 132]);
  fillLoop(c, 3.7); // one 16-step pass at 132 bpm (0.227 s a step), and a little over
  const step = 60 / 132 / 2;
  const osc = nodes.ctx.nodes.filter((n) => n.kind === 'Oscillator');
  const first = (n) => n.frequency.calls[0]?.[1] ?? n.frequency.value;
  const startOf = (n) => n.frequency.calls[0][2];
  const stepOf = (n) => Math.round((startOf(n) - 0.1) / step);
  const pitchClass = (n) => (Math.round(12 * Math.log2(first(n) / 440)) + 69) % 12;
  const MAJOR = [7, 9, 11, 0, 2, 4, 6];
  const saws = osc.filter((n) => n.type === 'sawtooth' && n.frequency.calls.length);
  const brass = saws.filter((n) => n.stopAt - startOf(n) > 0.25);
  assert.equal(brass.length, 11, 'eleven fanfare notes and five rests');
  assert.ok(Math.abs(first(brass[0]) - 392) < 0.05, 'the fanfare opens on G4');
  assert.ok(brass.every((n) => MAJOR.includes(pitchClass(n))), 'every note is G major');
  assert.ok(brass.some((n) => pitchClass(n) === 11), 'the major third, B, is in the tune');
  const lowpass = nodes.ctx.nodes.filter((n) => n.kind === 'BiquadFilter' && n.type === 'lowpass');
  const swells = lowpass.filter((n) => n.frequency.calls.length === 2 && n.frequency.calls[1][1] === 3600);
  assert.equal(swells.length, 11, 'the filter opens on each note: a brass swell');
  const strings = saws.filter((n) => n.stopAt - startOf(n) < 0.2);
  assert.equal(strings.length, 12, 'six chopped notes of two detuned voices');
  assert.deepEqual([...new Set(strings.map((n) => Math.round(first(n))))].sort((p, q) => p - q), [196, 247, 294], 'G, B and D: root, third, fifth');
  assert.ok(strings.some((n) => n.detune.value < 0) && strings.some((n) => n.detune.value > 0), 'detuned both ways');
  assert.deepEqual(strings.filter((n) => n.detune.value < 0).map(stepOf), [1, 3, 5, 9, 11, 13], 'off the beat');
  const timpani = osc.filter((n) => n.type === 'sine' && Math.abs(first(n) - 147) < 0.05);
  assert.deepEqual(timpani.map(stepOf), [0, 8], 'a timpani on the downbeat of each bar');
  assert.ok(timpani.every((n) => Math.abs(n.frequency.calls[1][1] - 98) < 0.05), 'sagging a fifth to G2');
  const bands = (hz) => nodes.ctx.nodes.filter((n) => n.kind === 'BiquadFilter' && n.type === 'bandpass' && n.frequency.calls[0][1] === hz);
  assert.equal(bands(1700).length, 6, 'a snare on three beats of each bar');
  assert.equal(bands(1900).length, 12, 'and a roll of six taps into the next bar, twice');
});

test("only Sunset Armada's loop opens its lead's filter or chops strings, only Ember Carnival's holds a lead note and plays its band, and only those two roll a snare; every other loop is as it was", () => {
  for (const [name, s] of Object.entries(STYLES)) {
    const [armada, carnival] = [name === 'armada', name === 'carnival'];
    assert.equal(s.music.lead.cut1 !== undefined, armada, `${name} lead swell`);
    assert.equal(s.music.lead.hold !== undefined, carnival, `${name} lead hold`);
    assert.equal(s.music.drum.includes('o'), armada, `${name} chopped strings`);
    assert.equal(s.music.drum.includes('r'), armada || carnival, `${name} snare roll`);
    assert.equal(/[yuag]/.test(s.music.drum), carnival, `${name} band`);
  }
  const nodes = fakeAudio();
  for (const look of LOOKS.filter((l) => !['armada', 'carnival'].includes(l.music.mood))) {
    const c = startLoop(nodes, look);
    fillLoop(c, 4);
    const lead = nodes.ctx.nodes.filter((n) => n.kind === 'BiquadFilter' && n.type === 'lowpass' && n.Q.value === 1.5);
    assert.ok(lead.length > 0 && lead.every((n) => n.frequency.calls.length === 1), `world ${look.world}: a lead note's filter stays put`);
    assert.ok(nodes.ctx.nodes.every((n) => n.kind !== 'Gain' || n.gain.calls[2]?.[0] !== 'set'), `world ${look.world}: no note holds its level`);
    stopLoop(c);
  }
});
