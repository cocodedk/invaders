import { test } from 'node:test';
import assert from 'node:assert/strict';
import { look, HUD, boss, pass, count, sweepT, f } from './angler-kit.js';

// The Lantern Leviathan's lower jaw (angler-jaw-sprite.js) and the ripple over its fins (angler-ripple.js), the two
// live extras that are sprites of their own: where each lies against its box and the HUD, that the jaw is the own
// pass's and rides closed or hangs open, works a little and never jumps, the needles that stand on it, and the fins'
// eight frames of ripple, the right fin's the left's mirrored.
const { warmBoss } = await import('../../src/ui/bosses/bake.js');
const { DROP, CH, upper } = await import('../../src/ui/bosses/angler-kit.js');
const { JB, jawBody, jawLights, FANGS } = await import('../../src/ui/bosses/angler-jaw-sprite.js');
const { TEETH } = await import('../../src/ui/bosses/angler-teeth.js');
const { RB, FRAMES, rippleFrame } = await import('../../src/ui/bosses/angler-ripple.js');
const { motion } = await import('../../src/ui/bosses/angler-lure.js');

warmBoss(look, 'angler');
const jawY = (calls) => calls.find((c) => c.img === jawBody()).args[1] - JB.y; // where the jaw's body stands, against open
const lightsY = (calls) => calls.find((c) => c.img === jawLights()).args[1] - JB.y;

test("the jaw's sprites lie inside their boxes, and the closed jaw's fangs stay under the HUD", () => {
  for (const img of [jawBody(), jawLights()]) {
    const { x0, y0, x1, y1 } = img.T.bounds;
    assert.ok(x0 >= -12 && y0 >= -2.5 && x1 <= JB.w + 12 && y1 <= JB.h + 2.5, // (the textures overshoot, clipped to the jaw)
       `painted ${f(x0)},${f(y0)} .. ${f(x1)},${f(y1)} in ${JB.w} x ${JB.h}`);
    assert.ok(img.width === JB.w && img.height === JB.h);
    assert.ok(JB.y - DROP + y0 >= HUD, `closed, its highest point is ${f(JB.y - DROP + y0)}`);
  }
});

test('the jaw is the own pass\'s alone and its lights ride with it; closed it stands DROP px above the open pose, and from the hover phase it hangs open', () => {
  for (const phase of [0, 1, 2]) {
    assert.equal(count(pass(boss(phase), 14, false).calls, jawBody()), 0, `phase ${phase}: the darkness pass draws no jaw`);
    assert.equal(count(pass(boss(phase), 14, false).calls, jawLights()), 1, 'only its lights');
    const ys = [];
    sweepT(boss(phase), true, ({ calls }) => {
      ys.push(jawY(calls));
      assert.equal(lightsY(calls), jawY(calls), 'the lights ride with the jaw');
    });
    const [lo, hi] = [Math.min(...ys), Math.max(...ys)];
    if (phase === 0) assert.ok(lo > -DROP - 1.1 && hi < -DROP + 1.1, `closed: ${lo.toFixed(1)}..${hi.toFixed(1)}`);
    else assert.ok(lo > -2.8 && hi < 2.8, `open: ${lo.toFixed(1)}..${hi.toFixed(1)}`);
    assert.ok(hi - lo > 0.6, `phase ${phase}: it works a little (${(hi - lo).toFixed(1)} px)`);
  }
});

test('the jaw never jumps over a phase change: it eases open and works on', () => {
  const b = boss(0);
  let prev = null;
  let worst = 0;
  for (let i = 0; i < 780; i++) {
    const t = 3 + i / 60;
    b.phase = i < 240 ? 0 : i < 480 ? 1 : 2;
    const y = jawY(pass(b, t, true, 3).calls);
    if (prev !== null) worst = Math.max(worst, Math.abs(y - prev));
    prev = y;
    if (i === 252) assert.ok(y < -DROP / 2, `a fifth of a second into the hover phase it is still mostly shut: ${y.toFixed(1)}`);
    if (i === 400) assert.ok(y > -4, `well into it, it hangs open: ${y.toFixed(1)}`);
  }
  assert.ok(worst < 0.9, `the jaw moves ${worst.toFixed(2)} px a tick at most`);
  assert.ok(motion(boss(1), 40, 1).chewAmp > 1, 'and a boss first seen open is drawn working');
});

test('the needles are not a comb: lengths and gaps are uneven, the lower ones reach up past the upper lip, the upper ones hang', () => {
  const stats = (v) => {
    const mean = v.reduce((a, c) => a + c, 0) / v.length;
    return Math.sqrt(v.reduce((a, c) => a + (c - mean) ** 2, 0) / v.length) / mean;
  };
  for (const row of ['up', 'dn']) {
    const right = TEETH[row].filter((t) => t.x > 0).sort((a, b) => a.x - b.x);
    assert.ok(stats(right.map((t) => t.len)) > 0.4, `${row}: lengths vary (${stats(right.map((t) => t.len)).toFixed(2)})`);
    assert.ok(stats(right.slice(1).map((t, i) => t.x - right[i].x)) > 0.3, `${row}: gaps vary (${stats(right.slice(1).map((t, i) => t.x - right[i].x)).toFixed(2)})`);
    assert.notDeepEqual(right.map((t) => Math.round(t.len)), TEETH[row].filter((t) => t.x < 0).sort((a, b) => b.x - a.x).map((t) => Math.round(t.len)), `${row}: the left is not the right's twin`);
  }
  const past = (open) => FANGS.filter(([x, y]) => y - (open ? 0 : DROP) < upper(x) - 2).length; // tips beyond the upper lip
  assert.ok(past(false) >= 4, `closed, ${past(false)} fangs reach up over the upper lip`);
  assert.ok(past(true) < past(false), `open, fewer (${past(true)})`);
  assert.ok(TEETH.up.filter((t) => t.y + t.len * 0.8 > upper(t.x) + 24).length >= 6, 'and the upper ones hang well down from it');
  assert.ok(FANGS.filter(([x]) => Math.abs(x) < CH).length >= 6, 'the long fangs stand in front of the throat');
});

test('the fins ripple: eight frames that loop, one drawn over each fin, the right fin\'s the left\'s mirrored, none without its fin', () => {
  assert.equal(FRAMES, 8);
  assert.notEqual(rippleFrame(0), rippleFrame(Math.PI / 4 + 0.01), 'the frames differ');
  assert.equal(rippleFrame(0.1), rippleFrame(0.1 + Math.PI * 2), 'and loop');
  const frames = new Set(Array.from({ length: FRAMES }, (_, i) => rippleFrame((i + 0.5) * Math.PI / 4)));
  assert.equal(frames.size, FRAMES);
  const img = rippleFrame(0);
  assert.ok(img.width === RB.w && img.height === RB.h && img.T.bounds.x0 >= -2.5 && img.T.bounds.x1 <= RB.w + 2.5 && img.T.bounds.y1 <= RB.h + 2.5);
  const seen = new Set();
  sweepT(boss(1), false, ({ calls }) => {
    const rip = calls.filter((c) => frames.has(c.img));
    assert.equal(rip.length, 2, 'one over each fin');
    assert.equal(rip[0].img, rip[1].img);
    const [l, r] = rip.sort((a, c) => a.box[0] - c.box[0]);
    assert.ok(Math.abs(l.box[0] + r.box[2]) < 1e-6 && Math.abs(l.box[2] + r.box[0]) < 1e-6 && l.box[1] === r.box[1], 'mirrored about the middle');
    assert.ok(l.alpha > 0 && l.alpha < 0.8 && l.comp === 'lighter', 'a light, added');
    seen.add(l.img);
  });
  assert.ok(seen.size >= 6, `the ripple runs through ${seen.size} of its frames`);
});
