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
