import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS } from '../../src/ui/sfx-boss.js';
import { UI } from '../../src/ui/sfx-ui.js';
import { kitFor } from '../../src/ui/sound-data.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { fakeVoice } from './audio-kit.js';

const PATCHES = [
  ['phase 1', BOSS.phase, { phase: 1 }], ['phase 2', BOSS.phase, { phase: 2 }], ['bossDeath', BOSS.bossDeath, {}],
  ['waveClear', UI.waveClear, {}], ['cleared', UI.cleared, {}], ['failed', UI.failed, {}], ['start', UI.start, {}],
];

test("the boss's roar and the stingers build in every world's style and stop every source they start", () => {
  for (const look of LOOKS) {
    for (const [name, patch, o] of PATCHES) {
      const { a, nodes } = fakeVoice(kitFor(look.music));
      const secs = patch(a, o);
      assert.ok(secs > 0 && secs < 6, `w${look.world} ${name}: ${secs}`);
      const sources = nodes.filter((x) => x.kind === 'Oscillator' || x.kind === 'BufferSource');
      assert.ok(sources.length > 0, name);
      for (const s of sources) assert.ok(s.started && s.stopAt > a.t && s.stopAt <= a.t + secs + 0.5, `w${look.world} ${name}: a source left running`);
    }
  }
});

test("the monster's roar sits lower than any other world's, so it reads as a bellow, not a siren", () => {
  const floor = (look) => {
    const { a, nodes } = fakeVoice(kitFor(look.music));
    BOSS.phase(a, { phase: 1 });
    return Math.min(...nodes.filter((x) => x.kind === 'Oscillator' && x.frequency.calls.length).map((x) => x.frequency.calls[0][1]));
  };
  const [w9, ...others] = [LOOKS[8], ...LOOKS.slice(0, 8), LOOKS[9]].map(floor);
  assert.ok(w9 < 50, `${w9} Hz`);
  assert.ok(others.every((f) => f > w9), 'every other world roars higher');
});

test("the Count's roar is a bell tolled low, with a bat's shriek high over it, and the stingers play on an organ", () => {
  const kit = kitFor(LOOKS[9].music);
  assert.equal(kit.style, 'gothic');
  const { a, nodes } = fakeVoice(kit);
  BOSS.phase(a, { phase: 1 });
  const starts = nodes.filter((x) => x.kind === 'Oscillator' && x.frequency.calls.length).map((x) => x.frequency.calls[0][1]);
  assert.ok(starts.some((f) => f > 120 && f < 160), 'the bell strikes the root of D, an octave and a half under middle C');
  assert.ok(starts.some((f) => f > 70 && f < 80), 'with its hum an octave under');
  assert.ok(starts.some((f) => f >= 2600), 'the shriek');
  const organ = fakeVoice(kit);
  UI.cleared(organ.a, {});
  const types = organ.nodes.filter((x) => x.kind === 'Oscillator').map((x) => x.type);
  assert.ok(types.filter((t) => t === 'sawtooth').length >= 8, 'a sawtooth lead, each note doubled an octave up like an organ stop');
});
