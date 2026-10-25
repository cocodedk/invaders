import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boss } from './craving-smoke-kit.js';

// What moves on the Craving (bosses/craving-motion.js): the churn runs at an eased rate, slow in the first phase and fastest in the
// last; nothing jumps over a phase change; a boss first seen in a phase is drawn as that phase has it; two bosses share nothing.
const { motion, RATE, THICK, HEAVE, INHALE, EMBER, RAIN, BLAZE, EYE } = await import('../../src/ui/bosses/craving-motion.js');

test('the phases speed the churn up and thicken the smoke, the last one heaves and rains, the maw burns from the hover phase on', () => {
  assert.ok(RATE[0] < RATE[1] && RATE[1] < RATE[2], 'faster by each phase');
  assert.ok(1 / RATE[0] >= 8, 'the first cycle takes eight seconds or more: slow churn');
  assert.deepEqual([THICK[0], HEAVE[0], RAIN[0], RAIN[1]], [0, 0, 0, 0], 'thin, still and dry at first');
  assert.ok(THICK[1] === 1 && THICK[2] > 0.5 && HEAVE[2] === 1 && RAIN[2] === 1);
  assert.ok(INHALE[1] === 1 && INHALE[1] > INHALE[2] && INHALE[2] > INHALE[0], 'it draws breath in the hover phase');
  assert.ok(BLAZE[1] === 1 && BLAZE[2] === 1 && BLAZE[0] < 0.5, 'the maw burns in the hover and orbit phases: it fires from the hover phase on');
  assert.ok(EMBER[0] < EMBER[1] && EMBER[1] < EMBER[2]);
  assert.ok(EYE[2] === 1 && EYE[0] === 0, 'the eye that takes aim flares in the last phase');
});

test('nothing jumps over a phase change or inside a phase, and the churn clock only runs forward', () => {
  const b = boss(0);
  let prev = null;
  const worst = { rate: 0, thick: 0, heave: 0, inhale: 0, ember: 0, rain: 0, blaze: 0, eye: 0, churn: 0, beat: 0, pulse: 0 };
  let last = -1;
  for (let i = 0; i < 1500; i++) {
    const t = 3 + i / 60;
    const ph = i < 500 ? 0 : i < 1000 ? 1 : 2;
    const m = { ...motion(b, t, ph) };
    if (prev) {
      for (const k of Object.keys(worst)) worst[k] = Math.max(worst[k], Math.abs(m[k] - prev[k]));
      assert.ok(m.churn >= prev.churn, 'the clock does not run back');
    }
    if (i === 510) assert.ok(m.thick < 0.2 && m.rate < RATE[1] * 0.8, 'a sixth of a second into the hover phase the smoke is not yet thick or fast');
    if (i === 900) assert.ok(m.thick > 0.9 && m.inhale > 0.9 && m.rate > RATE[1] * 0.97, 'a few seconds on it is');
    if (i === 1400) assert.ok(m.rain > 0.9 && m.heave > 0.9 && m.eye > 0.9, 'the last phase has come up in full');
    last = m.churn;
    prev = m;
  }
  for (const k of ['thick', 'heave', 'inhale', 'ember', 'rain', 'blaze', 'eye']) assert.ok(worst[k] < 0.03, `${k} moves ${worst[k].toFixed(4)} a tick at most`);
  assert.ok(worst.churn < RATE[2] / 60 * 1.05 + 1e-9, `the churn advances ${worst.churn.toFixed(5)} a tick at most`);
  assert.ok(worst.beat < 0.07 && worst.pulse < 0.14, `the beat and the pulse run on smoothly: ${worst.beat.toFixed(3)} ${worst.pulse.toFixed(3)}`);
  assert.ok(last > 0);
});

test('a boss first seen in a phase is drawn as that phase has it, and a long gap in time never jumps a clock', () => {
  for (const ph of [0, 1, 2]) {
    const m = motion(boss(ph), 50, ph);
    assert.deepEqual([m.thick, m.heave, m.inhale, m.ember, m.rain, m.blaze, m.eye, m.rate], [THICK[ph], HEAVE[ph], INHALE[ph], EMBER[ph], RAIN[ph], BLAZE[ph], EYE[ph], RATE[ph]], `phase ${ph}`);
  }
  const b = boss(1);
  const a = motion(b, 10, 1).churn;
  const c = motion(b, 400, 1).churn;
  assert.ok(c - a <= RATE[1] * 0.1 + 1e-9, 'a stalled clock does not lurch');
});

test('two bosses do not share state, and the same boss at the same time gives the same record', () => {
  const [a, b] = [boss(0), boss(0)];
  for (let t = 3; t < 8; t += 1 / 30) motion(a, t, 2);
  motion(b, 3, 0);
  assert.ok(motion(a, 8, 2).thick > 0.5 && motion(b, 3, 0).thick === 0);
  assert.equal(motion(a, 8, 2), motion(a, 8, 2), 'one record a boss');
  const [c, d] = [motion(a, 9, 2).churn, motion(a, 9, 2).churn];
  assert.equal(c, d, 'asking twice in one frame (the darkness pass) changes nothing');
});
