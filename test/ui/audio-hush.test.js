import { test } from 'node:test';
import assert from 'node:assert/strict';

// A stand-in AudioContext, enough for audio.js to build its graph and play patches. Every param
// records its automation, so the test can see which voices were faded and how fast.
const gains = [];
function param(value = 0) {
  return {
    value, calls: [],
    setValueAtTime(v, t) { this.calls.push(['set', v, t]); },
    exponentialRampToValueAtTime(v, t) { this.calls.push(['exp', v, t]); },
    linearRampToValueAtTime(v, t) { this.calls.push(['lin', v, t]); },
    setTargetAtTime(v, t, k) { this.calls.push(['target', v, t, k]); },
    cancelScheduledValues(t) { this.calls.push(['cancel', t]); },
  };
}
const node = (extra = {}) => ({
  connect: (t) => t, disconnect() {}, start() {}, stop() {},
  gain: param(1), frequency: param(), detune: param(), Q: param(), playbackRate: param(1), pan: param(),
  threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), ...extra,
});
class FakeContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 10;
    this.sampleRate = 8000;
    this.destination = node();
  }
  resume() {}
  suspend() {}
  createGain() { const g = node(); gains.push(g); return g; }
  createBuffer(ch, n) { const d = Array.from({ length: ch }, () => new Float32Array(n)); return { getChannelData: (i) => d[i] }; }
}
for (const kind of ['DynamicsCompressor', 'Convolver', 'StereoPanner', 'Oscillator', 'BiquadFilter', 'BufferSource', 'WaveShaper']) {
  FakeContext.prototype[`create${kind}`] = () => node();
}
globalThis.AudioContext = FakeContext;

const faded = (g, by) => g.gain.calls.some(([k, v, t]) => (k === 'lin' || k === 'target') && v === 0 && t <= by);

test('hush fades every voice of its group within 150 ms, and only those', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { unlockAudio, play, hush, audioStats } = await import('../../src/ui/audio.js');
  unlockAudio();
  const before = gains.length;
  play('braam', { group: 'film' });
  const afterBraam = gains.length;
  play('impact', { group: 'film' });
  const afterImpact = gains.length;
  play('select');
  assert.deepEqual(audioStats().grouped, { film: 2 });
  hush('film');
  const outs = { braam: gains[before], impact: gains[afterBraam], select: gains[afterImpact] }; // each voice's first gain is its out
  assert.ok(faded(outs.braam, 10.15), 'the braam fades out at once');
  assert.ok(faded(outs.impact, 10.15), 'the impact fades out at once');
  assert.ok(!faded(outs.select, 99), 'a menu sound outside the group plays on');
  assert.deepEqual(audioStats().grouped, { film: 0 });
  hush('film'); // nothing left: no-op
  hush('nobody');
  t.mock.timers.tick(10000); // the voices' clean-up runs without trouble
  assert.equal(audioStats().failed, 0, audioStats().error);
});
