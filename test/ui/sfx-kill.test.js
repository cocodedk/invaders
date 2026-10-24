import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installAudio } from './audio-kit.js';
import { LOOKS } from '../../src/ui/looks/index.js';

// Every oscillator a death makes, with the frequencies its automation visits.
const oscs = [];
installAudio({ currentTime: 5, onNode: (kind, n) => kind === 'Oscillator' && oscs.push(n) });
const { unlockAudio, play, audioNodes, audioStats, setWorldSound } = await import('../../src/ui/audio.js');
unlockAudio();
const { ctx } = audioNodes();
const ROLES = ['grunt', 'diver', 'gunner', 'armored', 'carrier'];

// The oscillators of one death: [start Hz, every Hz it glides or steps to].
function death(look, role, mult) {
  setWorldSound(look);
  oscs.length = 0;
  play('kill', { role, mult, x: 960 });
  ctx.currentTime += 1; // past the thinning gap
  return oscs.map((n) => n.frequency.calls.filter(([k]) => k === 'set' || k === 'exp').map(([, v]) => v));
}

test('a death builds on every world, for every role and combo', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let sounds = 0;
  for (const look of LOOKS) {
    for (const role of ROLES) {
      for (const mult of [1, 4, 9]) {
        assert.ok(death(look, role, mult).length > 0, `${look.world} ${role} x${mult}`);
        sounds += 1;
      }
    }
  }
  assert.equal(audioStats().failed, 0, audioStats().error);
  assert.equal(audioStats().played, sounds);
  t.mock.timers.tick(10000);
});

test('no death slides its pitch: every tone stays within half an octave of where it starts', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const look of LOOKS) {
    for (const role of ROLES) {
      for (const hz of death(look, role, 6)) {
        assert.ok(Math.max(...hz) / Math.min(...hz) < Math.SQRT2, `${look.world} ${role}: ${hz.map(Math.round)}`);
      }
    }
  }
  t.mock.timers.tick(10000);
});

test('a combo climbs the world\'s scale instead of sliding: the stab steps up with the multiplier', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const look of LOOKS) {
    const stab = (mult) => death(look, 'grunt', mult).at(-1)[0];
    assert.ok(stab(1) < stab(3) && stab(3) < stab(8), `world ${look.world}`);
    assert.equal(stab(8), stab(12), 'the climb tops out at seven steps');
  }
  t.mock.timers.tick(10000);
});
