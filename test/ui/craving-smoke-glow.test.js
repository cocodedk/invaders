import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boss, without, pass, settle, near } from './craving-smoke-kit.js';

// The Craving's lights (bosses/craving-ember.js, through craving-fx.js): a destroyed part leaves no glow, the maw's breath draws in
// from the hover phase on, embers rain in the last phase only, the maw blazes from the hover phase on and the eye that takes aim
// flares in the last. The contract of the live pass is craving-smoke-live.test.js.
const { PART } = await import('../../src/ui/bosses/craving-kit.js');
const { puff } = await import('../../src/ui/bosses/craving-puff.js');

const CURLS = [104, 144].flatMap((s) => [0, 1, 2].map((v) => puff('curlLit', s, v)));

test("a destroyed part leaves no glow: the eyes, the maw and its breath, the tray, the claws' wisps and the crown's sparks go with their parts", () => {
  settle(boss(1), 1);
  for (const [id, atLeast] of [['eyeL', 2], ['eyeR', 2], ['maw', 2], ['tray', 1], ['crown', 3], ['clawL', 3], ['clawR', 3]]) {
    let [full, gone, at, after] = [0, 0, 0, 0];
    for (let t = 6; t < 14; t += 0.7) {
      const b = boss(1);
      settle(b, 1);
      const a = pass(b, t, true).calls;
      const d = pass(without(b, id), t, true).calls;
      full += a.length;
      gone += d.length;
      if (id !== 'crown' && !id.startsWith('claw')) { at += near(a, PART[id], 0.6).length; after += near(d, PART[id], 0.6).length; }
    }
    assert.ok(full - gone >= atLeast * 10, `${id}: draws fall by at least ${atLeast} a frame (${full} -> ${gone})`);
    if (id !== 'crown' && !id.startsWith('claw')) assert.ok(at > 0 && after === 0, `${id}: ${at} lights at its centre, then ${after}`);
  }
  const b = boss(1);
  settle(b, 1);
  const dead = pass(without(b, 'eyeL', 'eyeR', 'maw', 'tray', 'crown'), 9, true).calls;
  assert.ok(dead.length < pass(b, 9, true).calls.length - 10, 'with every part gone only the embers in the air are left');
});

test('the breath draws in toward the maw in the hover phase, and the rain falls only in the last', () => {
  const stats = (phase) => {
    const b = boss(phase);
    settle(b, phase, 3, 12);
    let curls = 0;
    let falling = 0;
    let a = 0;
    for (let t = 12; t < 20; t += 0.13) {
      b.phase = phase;
      const calls = pass(b, t, true).calls;
      curls += calls.filter((c) => CURLS.includes(c.img)).length;
      falling += calls.filter((c) => c.box[1] > 150).length;
      a += calls.filter((c) => CURLS.includes(c.img)).reduce((s, c) => s + c.alpha, 0);
    }
    return { curls, falling, a };
  };
  const [s, h, o] = [0, 1, 2].map(stats);
  assert.ok(h.a > s.a * 1.5, `the breath is brighter in the hover phase: ${h.a.toFixed(1)} against ${s.a.toFixed(1)}`);
  assert.equal(s.falling + h.falling, 0, 'nothing falls past the throne before the last phase');
  assert.ok(o.falling > 20, `embers rain in the last phase (${o.falling})`);
});

test('the maw blazes from the hover phase on, and the eye that takes aim flares in the last', () => {
  const light = (phase, p, r) => {
    const b = boss(phase);
    settle(b, phase, 3, 12);
    let a = 0;
    for (let t = 12; t < 20; t += 0.05) { b.phase = phase; a += near(pass(b, t, true).calls, p, r).reduce((s, c) => s + c.alpha, 0); }
    return a;
  };
  const maw = [0, 1, 2].map((ph) => light(ph, PART.maw, 4));
  assert.ok(maw[1] > maw[0] * 1.4 && maw[2] > maw[0] * 1.4, `the maw: ${maw.map((v) => v.toFixed(1))}`);
  const eye = [0, 2].map((ph) => light(ph, PART.eyeL, 4));
  const eyeR = [0, 2].map((ph) => light(ph, PART.eyeR, 4));
  assert.ok(eye[1] > eye[0] * 1.5 && eye[1] > eyeR[1] * 1.2, `the aiming eye flares: ${eye.map((v) => v.toFixed(1))} against ${eyeR.map((v) => v.toFixed(1))}`);
});

