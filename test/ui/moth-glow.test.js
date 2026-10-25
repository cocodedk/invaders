import { test } from 'node:test';
import assert from 'node:assert/strict';
import { glow } from '../../src/ui/sprites.js';
import { look, def, art, boss, pass, settle, drawn } from './moth-kit.js';

// The Vesper Moth's light, live: the rose window's light turning through its frames, the light circling each eyespot
// (faster by phase, the eyespots blazing from the hover phase), and the abdomen breathing in a wave down its slits.
const { roseFrame, spinFrame, slitGlow, ROSE_FRAMES, SPIN_FRAMES } = await import('../../src/ui/bosses/moth-light.js');
const { SLITS } = await import('../../src/ui/bosses/moth-tail.js');

const spins = () => Array.from({ length: SPIN_FRAMES }, (_, i) => spinFrame(i));
const roses = () => Array.from({ length: ROSE_FRAMES }, (_, i) => roseFrame(i));

test("the rose window's light turns through its frames and loops; the eyespots' rings of light circle faster by phase", () => {
  const seq = (phase) => {
    const b = boss(phase);
    const out = [];
    for (let t = 3; t < 3 + 24; t += 1 / 30) {
      const i = roses().indexOf(drawn(pass(b, t).calls, roses())[0].img);
      if (out.at(-1) !== i) out.push(i);
    }
    return out;
  };
  const s = seq(0);
  assert.ok(new Set(s).size === ROSE_FRAMES, 'it passes through every frame');
  assert.ok(s.every((v, i) => i === 0 || v === (s[i - 1] + 1) % ROSE_FRAMES), 'in order, and round again');
  const spin = (phase) => {
    const b = boss(phase);
    let turns = 0;
    let last = -1;
    for (let t = 3; t < 13; t += 1 / 60) {
      const i = spins().indexOf(drawn(pass(b, t).calls, spins())[0].img);
      if (last >= 0 && i < last) turns++;
      last = i;
    }
    return turns;
  };
  assert.ok(spin(0) < spin(1) && spin(1) < spin(2), `the light circles faster each phase: ${spin(0)}, ${spin(1)}, ${spin(2)} laps in ten seconds`);
});

test('the abdomen breathes in a wave down its slits, and the eyespots blaze from the hover phase', () => {
  const alphas = (phase, t) => SLITS.map((_, i) => drawn(pass(boss(phase), t).calls, [slitGlow(i)])[0].alpha);
  const lows = [];
  const highs = [];
  for (let t = 3; t < 12; t += 0.1) {
    const a = alphas(1, t);
    lows.push(Math.min(...a));
    highs.push(Math.max(...a));
  }
  assert.ok(Math.min(...lows) < 0.3 && Math.max(...highs) > 0.8, 'each slit swells and dims');
  const peak = (i) => { let [best, at] = [-1, 0]; for (let t = 3; t < 3 + 2 * Math.PI / 2.1; t += 0.02) { const a = alphas(1, t)[i]; if (a > best) [best, at] = [a, t]; } return at; };
  assert.ok(peak(0) !== peak(3), 'the wave runs down the abdomen: the slits peak one after another');
  const blaze = (phase) => {
    const b = boss(phase);
    settle(b, phase);
    return Math.max(...Array.from({ length: 60 }, (_, i) => Math.max(0, ...pass(b, 8 + i / 20).calls.filter((c) => c.img === glow('#ffe9b0')).map((c) => c.alpha))));
  };
  assert.ok(blaze(0) < blaze(1) * 0.6, `the eyespots' halo blazes in the hover phase: ${blaze(0).toFixed(2)} then ${blaze(1).toFixed(2)}`);
});

