import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setMusic, updateMusic, startLoop, fillLoop, stopLoop } from '../../src/ui/music.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { node } from './audio-kit.js';

// A stand-in AudioContext that records every node and its outgoing connections.
function fakeAudio() {
  const ctx = { currentTime: 0, nodes: [] };
  const make = (kind) => () => {
    const n = node({
      kind, out: new Set(), stopAt: null,
      connect(target) { this.out.add(target); return target; },
      disconnect() { this.out.clear(); },
      stop(t) { this.stopAt = t; },
    });
    ctx.nodes.push(n);
    return n;
  };
  for (const kind of ['Gain', 'BiquadFilter', 'Oscillator', 'Delay', 'BufferSource']) ctx[`create${kind}`] = make(kind);
  const music = make('MusicBus')();
  return { ctx, music, noise: {} };
}

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
