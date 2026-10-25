import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ON, POWER } from '../../src/ui/sfx-power.js';
import { SFX } from '../../src/ui/sfx.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { POWERS_13, POWERS_15, POWERS_16 } from '../../src/core/kinds.js';
import { node } from './audio-kit.js';

const ALL = [...new Set([...POWERS_13, ...POWERS_15, ...POWERS_16])]; // the six, world 13's wingmen, world 15's pearls and trident, and world 16's mirror

// A stand-in AudioContext: every node a patch makes, and whether each source was started and stopped.
function fakeVoice(kit) {
  const nodes = [];
  const make = (kind) => () => {
    const n = node({ kind, started: false, stopAt: null, start() { this.started = true; }, stop(t) { this.stopAt = t; } });
    nodes.push(n);
    return n;
  };
  const ctx = {};
  for (const kind of ['Gain', 'BiquadFilter', 'Oscillator', 'BufferSource', 'WaveShaper']) ctx[`create${kind}`] = make(kind);
  return { a: { ctx, t: 1, out: make('Out')(), noise: {}, kit }, nodes };
}

// The nodes the pickup chime of `kind` makes in a world.
function chime(look, kind) {
  const { a, nodes } = fakeVoice(kitFor(look.music));
  POWER.pickup(a, { kind });
  return nodes;
}

const sources = (nodes) => nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource');
// The loudest envelope a patch makes (an env gain starts at the floor and ramps up to its peak).
const peak = (nodes) => Math.max(...nodes
  .filter((x) => x.kind === 'Gain' && x.gain.calls[0]?.[1] < 0.001)
  .flatMap((g) => g.gain.calls.filter(([k]) => k === 'exp').map(([, v]) => v)));
// The pitch each oscillator starts on, in the order the patch made them.
const pitches = (nodes) => nodes.filter((x) => x.kind === 'Oscillator').map((x) => x.frequency.calls[0][1]);

test('every power switches on with a patch of its own, quiet as the others are, that stops what it starts', () => {
  assert.equal(new Set(ALL.map((kind) => ON[kind])).size, ALL.length, 'one patch per power, none shared');
  for (const look of LOOKS) {
    for (const kind of ALL) {
      const { a, nodes } = fakeVoice(kitFor(look.music));
      ON[kind](a);
      assert.ok(sources(nodes).length > 0, `${kind} makes a sound`);
      for (const s of sources(nodes)) assert.ok(s.started && s.stopAt > a.t && s.stopAt <= a.t + 0.9, `${kind}: a source left running`);
      assert.ok(peak(nodes) <= 0.22, `${kind} peaks at ${peak(nodes)}, laser's zap is the loudest`);
    }
  }
});

test('slow swoops down, as time thickens', () => {
  const { a, nodes } = fakeVoice(kitFor(LOOKS[0].music));
  ON.slow(a);
  const [from, to] = nodes.find((x) => x.kind === 'Oscillator').frequency.calls.map((c) => c[1]);
  assert.ok(to < from / 4, `${from} -> ${to}`);
});

test('an extra life climbs the scale in six notes; the other pickups are not that', () => {
  for (const look of LOOKS) {
    const { a, nodes } = fakeVoice(kitFor(look.music));
    const secs = POWER.pickup(a, { kind: 'life' });
    const notes = pitches(nodes);
    assert.equal(notes.length, 6, `w${look.world}`);
    assert.deepEqual(notes, notes.toSorted((x, y) => x - y), `w${look.world} rises`);
    assert.ok(secs > 0.5 && secs < 1, `${secs}`);
    for (const s of sources(nodes)) assert.ok(s.started && s.stopAt > a.t && s.stopAt <= a.t + secs + 0.1, `w${look.world}: a source left running`);
    assert.ok(peak(nodes) <= 0.15, `${peak(nodes)}`);
    for (const kind of ['spread', 'bomb']) assert.notEqual(pitches(chime(look, kind)).length, 6, kind);
  }
});

test('the pickup and power patches are reachable by name', () => {
  for (const name of ['pickup', 'powerOn', 'powerOff']) assert.equal(SFX[name], POWER[name], name);
});
