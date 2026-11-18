import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BOSS } from '../../src/ui/sfx-boss.js';
import { SQUEAK, QUACK, RASP, LIPS, VALVE } from '../../src/ui/sfx-bath.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import w19 from '../../src/ui/looks/w19.js';
import { fakeVoice } from './audio-kit.js';

// The Dowager Duck's roar and death (sfx-bath.js duckRoar and duckDeath, picked by sfx-boss.js for the bath style), in F.
const BATH = kitFor(w19.music);
const oscillators = (nodes) => nodes.filter((x) => x.kind === 'Oscillator');
const played = (nodes) => oscillators(nodes).filter((x) => x.frequency.calls.length);
const start = (x) => x.frequency.calls[0][1];
const when = (x) => x.frequency.calls[0][2];
const hz2 = (hz) => Math.round(hz * 100) / 100;
const glide = (x) => x.frequency.calls.map((c) => hz2(c[1]));
const filters = (nodes, type) => nodes.filter((x) => x.kind === 'BiquadFilter' && x.type === type);
const sweep = (nodes, type, f0, f1) => filters(nodes, type).filter((x) => x.frequency.calls[0][1] === f0 && x.frequency.calls[1]?.[1] === f1);
const peak = (nodes, filter) => nodes[nodes.indexOf(filter) + 1].gain.calls[1][1]; // a hiss: its filter, then its envelope
const noLeak = (a, nodes, secs) => {
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
};
const roar = (o = { phase: 1 }, patch = BOSS.phase, kit = BATH) => {
  const { a, nodes } = fakeVoice(kit);
  const secs = patch(a, o);
  return { a, nodes, secs };
};

test('her roar is a giant quack: two sawtooths a hair apart sagging from A2 to F2 through the bill\'s nasal band and one crush, a round body under them, the bill\'s clap on top', () => {
  const { a, nodes, secs } = roar();
  const saws = played(nodes).filter((x) => x.type === 'sawtooth');
  assert.equal(saws.length, 3);
  assert.ok(saws.every((x) => glide(x).join() === '110,87.31'), 'the third sagging to the root');
  assert.deepEqual(saws.map((x) => x.detune.value).filter(Boolean).sort((p, q) => p - q), [-10, 10], 'two voices a hair apart');
  assert.equal(sweep(nodes, 'bandpass', 1100, 760).length, 1, 'the bill: a nasal band closing as the quack ends');
  assert.equal(nodes.filter((x) => x.kind === 'WaveShaper').length, 1, 'one crush');
  const [clap] = filters(nodes, 'bandpass').filter((x) => x.frequency.calls[0][1] === 1800);
  assert.ok(clap && clap.frequency.calls[0][2] === a.t, 'the bill claps at once');
  assert.ok(Math.min(...played(nodes).map(start)) >= 87, "a giant's quack, but over world 9's roar floor");
  noLeak(a, nodes, secs);
});

test('each phase springs a leak: air hissing out of her after the quack, louder in the last phase, where the valve squeals over it', () => {
  const leak = (r) => sweep(r.nodes, 'bandpass', 3400, 3900);
  const squeal = (r) => played(r.nodes).filter((x) => hz2(start(x)) === 1046.5);
  const p1 = roar({ phase: 1 });
  const p2 = roar({ phase: 2 });
  for (const r of [p1, p2]) {
    assert.equal(leak(r).length, 1);
    assert.ok(leak(r)[0].frequency.calls[0][2] > r.a.t + QUACK / 2, 'after the quack');
    noLeak(r.a, r.nodes, r.secs);
  }
  assert.ok(peak(p2.nodes, leak(p2)[0]) > peak(p1.nodes, leak(p1)[0]), 'a louder leak');
  assert.equal(squeal(p1).length, 0);
  assert.equal(squeal(p2).length, 1, 'the valve goes in the last phase');
  assert.ok(oscillators(p2.nodes).some((x) => !x.frequency.calls.length && x.frequency.value === VALVE), 'squealing with a flutter');
});

test('her death is one enormous raspberry ending on a tiny squeak: lips flapping on sawtooths sagging from F2 to C2 through a buzzing band and one crush, and no hull groan', () => {
  const { a, nodes, secs } = roar({}, BOSS.bossDeath);
  assert.ok(secs > RASP && secs < RASP * 2, `${secs} s: the raspberry and a moment after`);
  noLeak(a, nodes, secs);
  assert.equal(nodes.filter((x) => x.kind === 'WaveShaper').length, 1);
  assert.equal(sweep(nodes, 'bandpass', 700, 420).length, 1, 'the buzz of the lips');
  assert.ok(oscillators(nodes).some((x) => x.type === 'square' && !x.frequency.calls.length && x.frequency.value === LIPS), 'the lips flap');
  const saws = played(nodes).filter((x) => x.type === 'sawtooth');
  assert.deepEqual(saws.map(glide), [[87.31, 65.41], [174.61, 130.81]], 'F2 sagging to C2, and its octave');
  const squeak = played(nodes).at(-1);
  assert.deepEqual([squeak.type, hz2(start(squeak))], ['square', 1396.91], 'the last sound: a squeak on F6');
  assert.ok(when(squeak) > a.t + RASP, 'once the raspberry has run out');
  assert.equal(nodes[nodes.indexOf(squeak) + 1].gain.calls[1][1], SQUEAK.peak, 'the knock-outs\' squeak');
  assert.ok(!played(nodes).some((x) => start(x) === 62 && x.frequency.calls[1][1] === 30), 'no hull groaning as it snaps');
});

// What a patch asks of the audio graph, hashed: every node's kind, type, values and automation, in order, and its length.
const digest = (patch, o, kit) => {
  const { a, nodes } = fakeVoice(kit);
  const secs = patch(a, o);
  const trace = JSON.stringify([secs, nodes.map((x) => [x.kind, x.type, x.frequency.value, x.frequency.calls, x.gain.value, x.gain.calls,
    x.detune.value, x.detune.calls, x.Q.value, x.Q.calls, x.curve?.[700] ?? null, x.stopAt])]);
  return createHash('sha256').update(trace).digest('hex').slice(0, 12);
};
// Taken before world 19 was added: phase 1, phase 2, phase 1 opening the trench, and the death, for each world.
const BEFORE_WORLD_19 = {
  1: 'dde17e2f68ed af97337c751a 4052633eeb4f 277ce051f6c9',
  2: '0a9ed326b4e7 1352a084c32c 053c7fcbbad5 26f36108bf6e',
  3: '104c4d8e21e9 8c2e2a475a99 89767f15fc25 18648c6ed892',
  4: '2cc8a12b4ca6 e849df9facaa f7fbab0c9adf 194d83571086',
  5: 'b2f344e58699 6ed1c16ae6a7 60298cf01642 28912f2a1bbe',
  6: 'b86d9c1f5832 04ed9d168d8b 69537661f1e2 bdf386ad3d67',
  7: '7e86db33febe fcd34f0483fa 4952df2f08c0 3b07252c87eb',
  8: '8cc6741c33f9 0adc4e8433c0 eb9d40f07d85 f301e3fc3545',
  9: '7d38a4a18804 ab309ee278be 3cb0306910a7 b42c0f4e55c8',
  10: '714f576b897b 14db5308eaed 9aafa17ae829 5ff1401d7c54',
  11: '93b0fef3153c 1631fe190d63 629858ad4775 071b37b743c0',
  12: '3b8baf696040 0e7b7416ab64 c320eac9cd6d 7a24b1b850ae',
  13: '5e666aef317f f3764ccbff2a b8902fcfc076 635e527bdfd6',
  14: '0a08804774d0 e8871bbfcb5b 83b94a70a087 871bfea453fd',
  15: 'e2d5b2fcf873 ca4148ffb9bd 2f09ced3d01e c35b099b5c2b',
  16: '8d8407341ea2 59b5fb1cea1d 198ecb88ef87 bb21bc4450f6',
  17: '6c6076dbf110 996b996a2394 a50a4baedea9 98b6d6335b1f',
  18: '512a6b00a175 45cf41b41899 a632bc84dd89 cb8459722bec',
};

test("every other world's roar and death are called call for call as they were before world 19", () => {
  const others = LOOKS.filter((l) => l.world < 19);
  assert.equal(others.length, Object.keys(BEFORE_WORLD_19).length);
  for (const look of others) {
    const kit = kitFor(look.music);
    const got = [digest(BOSS.phase, { phase: 1 }, kit), digest(BOSS.phase, { phase: 2 }, kit), digest(BOSS.phase, { phase: 1, open: true }, kit), digest(BOSS.bossDeath, {}, kit)];
    assert.equal(got.join(' '), BEFORE_WORLD_19[look.world], `w${look.world}`);
  }
});
