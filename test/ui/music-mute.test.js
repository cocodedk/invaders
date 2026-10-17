import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOKS } from '../../src/ui/looks/index.js';

// A stand-in AudioContext that counts the oscillators made: the music's notes are oscillators, so
// a loop that keeps scheduling notes keeps making them.
let oscillators = 0;
const param = (value = 0) => ({
  value, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {},
  setTargetAtTime() {}, cancelScheduledValues() {},
});
const node = () => ({
  connect: (t) => t, disconnect() {}, start() {}, stop() {},
  gain: param(1), frequency: param(), detune: param(), Q: param(), playbackRate: param(1), pan: param(),
  delayTime: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(),
});
class FakeContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 1;
    this.sampleRate = 8000;
    this.destination = node();
  }
  resume() {}
  suspend() {}
  createOscillator() { oscillators += 1; return node(); }
  createBuffer(ch, n) { const d = Array.from({ length: ch }, () => new Float32Array(n)); return { getChannelData: (i) => d[i] }; }
}
for (const kind of ['Gain', 'DynamicsCompressor', 'Convolver', 'StereoPanner', 'BiquadFilter', 'BufferSource', 'WaveShaper', 'Delay']) {
  FakeContext.prototype[`create${kind}`] = () => node();
}
globalThis.AudioContext = FakeContext;

test('muted, the music schedules no notes; unmuted, it picks up again', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const audio = await import('../../src/ui/audio.js');
  const { setMusic, updateMusic } = await import('../../src/ui/music.js');
  audio.unlockAudio();
  if (audio.audioStats().state !== 'running') throw new Error('the fake context did not start');
  const ctx = () => audio.audioNodes()?.ctx;
  setMusic(LOOKS[0]);
  updateMusic();
  const clock = ctx();
  const play = (secs) => {
    for (let i = 0; i < secs * 60; i++) {
      clock.currentTime += 1 / 60;
      updateMusic();
    }
  };
  play(2);
  assert.ok(oscillators > 10, `the loop plays (${oscillators} oscillators)`);
  if (!audio.toggleMute()) audio.toggleMute(); // muted now, whatever the stored setting was
  const before = oscillators;
  play(5);
  assert.equal(oscillators, before, 'nothing scheduled while muted');
  audio.toggleMute();
  play(2);
  assert.ok(oscillators > before + 10, 'unmuted, the notes come back');
});
