import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BATH, BANDS, bandOf, SQUEAK, VOICE, LINK_TOP, BOING, LIPS } from '../../src/ui/sfx-bath.js';
import { FIGHT } from '../../src/ui/sfx-fight.js';
import { SFX } from '../../src/ui/sfx.js';
import { kitFor, SCALES } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import w19 from '../../src/ui/looks/w19.js';
import { fakeVoice } from './audio-kit.js';

const KIT = kitFor(w19.music);
const F_SUNNY = [5, 7, 9, 10, 0, 2]; // F, G, A, B flat, C, D
const XS = [160, 480, 800, 1120, 1440, 1760]; // one x in each of the six bands
const ROLES = ['grunt', 'diver', 'gunner', 'armored', 'carrier'];
const oscillators = (nodes) => nodes.filter((x) => x.kind === 'Oscillator');
const played = (nodes) => oscillators(nodes).filter((x) => x.frequency.calls.length); // an LFO has no automation
const start = (x) => x.frequency.calls[0]?.[1] ?? x.frequency.value;
const hz2 = (hz) => Math.round(hz * 100) / 100;
const pitchClass = (hz) => (Math.round(12 * Math.log2(hz / 440)) + 69) % 12;
const peaks = (nodes) => nodes.filter((x) => x.kind === 'Gain' && x.gain.calls.length === 3).map((x) => x.gain.calls[1][1]);
const held = (x) => new Set(x.frequency.calls.map((c) => c[1])).size === 1;
const noLeak = (a, nodes, secs) => {
  for (const s of nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource')) assert.ok(s.started && s.stopAt <= a.t + secs + 0.5, 'a source left running');
};
const run = (patch, o = {}, kit = KIT) => {
  const { a, nodes } = fakeVoice(kit);
  const secs = patch(a, o);
  return { a, nodes, secs, osc: played(nodes) };
};
// The carriers of the FM tones on `ratio`: fm() makes the modulator, its depth (a gain set and falling), then the carrier.
const carriers = (nodes, ratio) => oscillators(nodes).filter((x) => {
  const [mod, depth] = [nodes[nodes.indexOf(x) - 2], nodes[nodes.indexOf(x) - 1]];
  return mod?.kind === 'Oscillator' && depth.kind === 'Gain' && depth.gain.calls.length === 2 && Math.abs(start(mod) / start(x) - ratio) < 1e-9;
});
const trace = ({ nodes, secs }) => JSON.stringify([secs, nodes.map((x) => [x.kind, x.type, x.frequency.calls, x.gain.calls, x.detune.calls, x.Q.calls])]);
const TWIST_CALLS = [
  ['whack', {}], ['bonk', { link: 0 }], ['bonk', { link: 9 }], ['bonk', { link: 0, boss: true }], ['bank', {}], ['strike', {}],
  ['plop', { x: 100 }], ['plop', { x: 1800 }], ['fizzle', {}],
];

test("every batting sound is short, quiet beside the ship's shot (peaks 0.12 and under) and on the world's scale", () => {
  for (const [name, o] of TWIST_CALLS) {
    const { a, nodes, secs, osc } = run(BATH[name], o);
    noLeak(a, nodes, secs);
    assert.ok(secs > 0 && secs <= 1, `${name}: ${secs} s`);
    assert.ok(peaks(nodes).length > 0 && Math.max(...peaks(nodes)) <= 0.12, `${name}: ${peaks(nodes)}`);
    assert.ok(osc.length > 0 && osc.every((x) => F_SUNNY.includes(pitchClass(start(x)))), `${name}: ${osc.map((x) => hz2(start(x)))}`);
  }
});

test('a knock-out squeaks one held note: the further right, the higher up the scale, so a run of knock-outs plays a phrase', () => {
  assert.equal(BANDS, SCALES.sunny.length, 'a band for each degree of the scale');
  const note = (x, role = 'grunt') => run(BATH.kill, { role, mult: 1, x }).osc[0];
  assert.deepEqual(XS.map((x) => hz2(start(note(x)))), [1396.91, 1567.98, 1760, 1864.66, 2093, 2349.32], 'F6 G6 A6 B flat 6 C7 D7');
  assert.equal(start(note(-40)), start(note(XS[0])));
  assert.equal(start(note(5000)), start(note(XS[5])));
  assert.equal(start(note(undefined)), start(note(XS[0])), 'a squeak without an x still sounds');
  assert.deepEqual(XS.map(bandOf), [0, 1, 2, 3, 4, 5]);
  for (const x of XS) {
    const { nodes, osc } = run(BATH.kill, { role: 'grunt', mult: 1, x });
    assert.ok(osc.every(held), 'nothing glides: every tone holds its pitch');
    const reed = osc[0];
    const f = start(reed);
    const cut = nodes[nodes.indexOf(reed) + 2]; // tone(): the oscillator, its envelope, then its lowpass
    assert.deepEqual([cut.type, cut.frequency.calls[0][1], cut.Q.value], ['lowpass', f * 2, SQUEAK.q], 'a nasal reed');
    const env = nodes[nodes.indexOf(reed) + 1].gain.calls;
    assert.equal(env[1][1], SQUEAK.peak);
    assert.ok(Math.abs(env[2][2] - env[0][2] - SQUEAK.dur) < 0.01, 'its length is the squeak\'s');
  }
});

test('the role picks the voice, x picks the note; the combo stab comes last and climbs the scale', () => {
  const voice = (role) => run(BATH.kill, { role, mult: 1, x: 800 }).osc[0];
  assert.deepEqual(ROLES.map((role) => voice(role).type), ROLES.map((role) => VOICE[role][0]));
  assert.equal(new Set(ROLES.map((role) => `${voice(role).type} ${start(voice(role))}`)).size, ROLES.length, 'each role its own squeak');
  assert.ok(start(voice('gunner')) < start(voice('grunt')), 'the frog croaks lower than the duckling');
  const stab = (mult) => start(run(BATH.kill, { role: 'grunt', mult, x: 800 }).osc.at(-1));
  assert.ok(stab(1) < stab(3) && stab(3) < stab(8));
  assert.equal(stab(8), stab(12));
  for (const role of ROLES) {
    const { a, nodes, secs } = run(BATH.kill, { role, mult: 6, x: 1500 });
    noLeak(a, nodes, secs);
  }
});

test("every other world's kill is sfx-kill.js's, called call for call; the registry plays the bath's", () => {
  const others = LOOKS.filter((l) => kitFor(l.music).style !== 'bath');
  assert.equal(others.length, LOOKS.length - 1);
  for (const look of others) {
    for (const role of ROLES) {
      for (const o of [{ role, mult: 1, x: 300 }, { role, mult: 6, x: 1500 }]) {
        assert.equal(trace(run(BATH.kill, o, kitFor(look.music))), trace(run(FIGHT.kill, o, kitFor(look.music))), `w${look.world} ${role}`);
      }
    }
  }
  assert.notEqual(trace(run(BATH.kill, { role: 'grunt', mult: 1, x: 300 })), trace(run(FIGHT.kill, { role: 'grunt', mult: 1, x: 300 })));
  assert.equal(SFX.kill, BATH.kill);
  for (const name of ['whack', 'bonk', 'bank', 'strike', 'plop', 'fizzle']) assert.equal(SFX[name], BATH[name], name);
});

test('the plain whack is a dry thwack with no slide: every tone and every filter holds its pitch, the thump on F', () => {
  const { nodes, osc } = run(BATH.whack);
  assert.ok(osc.every(held), 'no tone slides');
  assert.ok(nodes.filter((x) => x.kind === 'BiquadFilter').every(held), 'no filter sweeps');
  assert.equal(hz2(start(osc[0])), 174.61, 'F3');
  assert.equal(nodes.filter((x) => x.kind === 'BufferSource').length, 1, 'and one crack');
});

test('a bonk is a woodblock and a marimba note one degree higher for each link of the chain', () => {
  const marimba = (link) => {
    const { nodes, osc } = run(BATH.bonk, { link });
    assert.ok(osc.some((x) => hz2(start(x)) === 1046.5 && x.type === 'sine'), 'the woodblock\'s tok on C6');
    const notes = carriers(nodes, 4);
    assert.equal(notes.length, 1);
    return hz2(start(notes[0]));
  };
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(marimba), [698.46, 783.99, 880, 932.33, 1046.5, 1174.66, 1396.91, 1567.98]);
  assert.equal(marimba(LINK_TOP + 5), marimba(LINK_TOP), 'the climb tops out at two octaves');
  assert.equal(marimba(undefined), marimba(0));
});

test('a bonk on the boss is a honk and a deep doink, and no marimba note', () => {
  const { nodes, osc } = run(BATH.bonk, { link: 3, boss: true });
  const honk = osc.find((x) => x.type === 'square');
  assert.equal(hz2(start(honk)), 261.63, 'the honk on C4, the fifth');
  const doink = osc.find((x) => x.type === 'sine');
  assert.deepEqual(doink.frequency.calls.map((c) => hz2(c[1])), [98, 87.31], 'the doink drops from G2 to the root, F2');
  assert.equal(carriers(nodes, 4).length, 0);
});

test('a plop is a water drop: a bloop up an octave onto a note, higher the further right', () => {
  const drop = (x) => run(BATH.plop, { x }).osc[0].frequency.calls.map((c) => hz2(c[1]));
  assert.deepEqual(XS.map((x) => drop(x)[1]), [698.46, 783.99, 880, 932.33, 1046.5, 1174.66]);
  for (const x of XS) assert.ok(Math.abs(drop(x)[1] / drop(x)[0] - 2) < 0.01, 'up an octave');
});

test('a bank is a boing: a spring\'s tone wobbling up a fifth, F4 to C5', () => {
  const { nodes, osc } = run(BATH.bank);
  assert.deepEqual(osc[0].frequency.calls.map((c) => hz2(c[1])), [349.23, 523.25]);
  assert.ok(oscillators(nodes).some((x) => !x.frequency.calls.length && x.frequency.value === BOING), `its wobble at ${BOING} Hz`);
});

test('a strike is a slide whistle up an octave into an arpeggio of the chord, climbing after it', () => {
  const { a, nodes, osc } = run(BATH.strike);
  const slide = osc[0];
  assert.deepEqual(slide.frequency.calls.map((c) => hz2(c[1])), [349.23, 698.46], 'F4 up to F5');
  const notes = carriers(nodes, 4);
  assert.deepEqual(notes.map((x) => hz2(start(x))), [698.46, 880, 1046.5, 1396.91], 'F A C F');
  const when = notes.map((x) => x.frequency.calls[0][2]);
  assert.ok(when.every((t, i) => t > a.t + 0.3 && (i === 0 || t > when[i - 1])), 'after the slide, one by one');
});

test('a fizzle is a brief, quiet raspberry: lips flapping on a low C', () => {
  const { nodes, osc, secs } = run(BATH.fizzle);
  assert.ok(secs < 0.4);
  assert.ok(Math.max(...peaks(nodes)) <= 0.06, 'quiet');
  assert.equal(hz2(start(osc.find((x) => x.type === 'sawtooth'))), 130.81, 'C3');
  assert.ok(oscillators(nodes).some((x) => x.type === 'square' && !x.frequency.calls.length && x.frequency.value > LIPS), 'the flap, faster than the raspberry\'s');
});
