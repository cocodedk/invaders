import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { canvases, look, HUD, PAD, f, boss, pass, under, sweepT } from './craving-smoke-kit.js';

// The Craving's live smoke, the contract (bosses/craving-fx.js, craving-ember.js; its lights are craving-smoke-glow.test.js): the churning body under the parts (behind: own pass, opaque,
// two to five draws) and the embers and breath over them (fx: additive, at most 60 draws), the contract: nothing baked mid-fight,
// nothing above the HUD, a destroyed part's glow gone with it, every piece of the context left as it was found.
const { warmBoss, BOSS_ART } = await import('../../src/ui/bosses/bake.js');
const { FB } = await import('../../src/ui/bosses/craving-paint.js');
const { frame, POSES } = await import('../../src/ui/bosses/craving-frames.js');
const { thickFrame, THICK_POSES } = await import('../../src/ui/bosses/craving-thick.js');
const { behind, fx, warm } = await import('../../src/ui/bosses/craving-fx.js');

const bodies = () => Array.from({ length: POSES }, (_, k) => frame(k));
const thicks = () => Array.from({ length: THICK_POSES }, (_, k) => thickFrame(k));

// First, while the shared sprite caches are empty: whatever the live pass needs that warming missed would be made mid-fight.
test('warming bakes everything the live pass draws: nothing is made mid-fight', () => {
  warmBoss(look, 'craving');
  const before = canvases.length;
  for (const phase of [0, 1, 2]) {
    sweepT(boss(phase), true, () => {});
    sweepT(boss(phase), false, () => {});
    const b = boss(phase);
    for (let t = 3; t < 40; t += 0.31) under(b, t);
  }
  assert.equal(canvases.length - before, 0, 'no canvas was made during the fight');
  assert.equal(BOSS_ART.craving.live, fx);
  assert.equal(BOSS_ART.craving.behind, behind);
  assert.equal(BOSS_ART.craving.warm, warm);
});

test('warm is idempotent', () => {
  const before = canvases.length;
  warm();
  warm();
  assert.equal(canvases.length, before);
});

test('the embers stay under the HUD and inside the box and its pad, in every phase and pass, with at most 60 draws', () => {
  for (const phase of [0, 1, 2]) {
    for (const own of [false, true]) {
      sweepT(boss(phase), own, ({ bounds, calls }) => {
        assert.ok(bounds.y0 >= HUD, `phase ${phase} own ${own}: top ${bounds.y0.toFixed(1)}`);
        assert.ok(bounds.y1 <= 330 && -bounds.x0 <= PAD && bounds.x1 <= PAD, `phase ${phase} own ${own}: ${f(bounds.x0)}..${f(bounds.x1)}, bottom ${f(bounds.y1)}`);
        assert.ok(calls.length <= 60, `phase ${phase} own ${own}: ${calls.length} draws`);
        assert.ok(calls.length >= 8, 'and there is a good deal going on');
      });
    }
  }
});

test('nothing rises into the HUD from a fresh boss either: the phase may begin at any time', () => {
  for (const phase of [0, 1, 2]) {
    for (let t = 0; t < 60; t += 0.37) {
      assert.ok(pass(boss(phase), t, true, t - 0.3).bounds.y0 >= HUD, `fx, phase ${phase} at ${t}`);
      assert.ok(under(boss(phase), t, t - 0.3).bounds.y0 >= HUD, `behind, phase ${phase} at ${t}`);
    }
  }
});

test('the body is drawn under the parts, opaque, from the frames, the next frame fading in over the first', () => {
  const b = boss(0);
  let crossfades = 0;
  for (let t = 3; t < 40; t += 0.17) {
    const { calls, after } = under(b, t);
    assert.equal(after, 'source-over');
    assert.ok(calls.length >= 1 && calls.length <= 5, `${calls.length} draws`);
    assert.ok(calls.every((c) => c.comp === 'source-over'), 'opaque');
    const body = calls.filter((c) => bodies().includes(c.img));
    assert.ok(body.length >= 1 && body.length <= 2 && body[0].alpha === 1, 'the first frame is whole');
    if (body.length === 2) {
      crossfades++;
      assert.ok(body[1].alpha > 0 && body[1].alpha < 1, 'the next fades in over it');
      assert.equal(bodies().indexOf(body[1].img), (bodies().indexOf(body[0].img) + 1) % POSES, 'the next pose, wrapping');
    }
    for (const c of calls) assert.ok(Math.abs(c.box[0] - FB.x) <= 2.51 && c.box[2] - c.box[0] === FB.w, 'at the figure\'s box');
  }
  assert.ok(crossfades > 60, `the poses cross-fade (${crossfades} frames of them)`);
});

test('the frames turn faster by each phase, and every one of them gets its turn', () => {
  const advance = (phase) => {
    const b = boss(phase);
    let last = -1;
    let n = 0;
    const seen = new Set();
    for (let t = 3; t < 33; t += 1 / 30) {
      const first = under(b, t).calls.find((c) => bodies().includes(c.img));
      const k = bodies().indexOf(first.img);
      if (last >= 0 && k !== last) n++;
      seen.add(k);
      last = k;
    }
    return [n, seen.size];
  };
  const [a, b, c] = [0, 1, 2].map(advance);
  assert.ok(a[0] < b[0] && b[0] < c[0], `frame changes in 30 s: ${a[0]} ${b[0]} ${c[0]}`);
  assert.equal(c[1], POSES, 'all of them in the last phase');
});

test('in the hover phase the second, fatter layer of smoke fades in over the body, and the last phase heaves the whole mass', () => {
  const layer = (phase) => {
    const b = boss(phase);
    let n = 0;
    let ys = [];
    for (let t = 3; t < 20; t += 0.11) {
      b.phase = phase;
      const { calls } = under(b, t);
      if (t > 12) { n += calls.filter((c) => thicks().includes(c.img)).length; ys.push(calls[0].box[1]); }
    }
    return [n, Math.max(...ys) - Math.min(...ys)];
  };
  const [s, h, o] = [0, 1, 2].map(layer);
  assert.equal(s[0], 0, 'no second layer while the smoke is thin');
  assert.ok(h[0] > 50 && o[0] > 50, 'it is there in the hover and orbit phases');
  assert.ok(s[1] === 0 && h[1] === 0 && o[1] > 2 && o[1] <= 4.01, `the mass heaves by a few px in the last phase only: ${s[1]} ${h[1]} ${o[1].toFixed(2)}`);
  const thick = under(boss(1), 12).calls.filter((c) => thicks().includes(c.img));
  assert.ok(thick.every((c) => c.alpha > 0 && c.alpha <= 1));
});

test('the darkness pass draws only additive light; the own pass adds the eight opaque ribbons of streaming smoke and nothing else', () => {
  for (const phase of [0, 1, 2]) {
    const [dark, own] = [pass(boss(phase), 14, false), pass(boss(phase), 14, true)];
    assert.ok(dark.calls.every((c) => c.comp === 'lighter'), `phase ${phase}: only additive light`);
    const solid = own.calls.filter((c) => c.comp === 'source-over');
    assert.equal(solid.length, 8, 'the ribbons of smoke are opaque, and the own pass\'s alone');
    assert.equal(own.calls.length, dark.calls.length + 8, 'the rest is the same light');
    assert.ok(solid.every((c) => c.alpha <= 1 && c.alpha >= 0), 'translucent');
    assert.equal(own.after, 'lighter');
    assert.equal(dark.after, 'lighter');
    assert.ok(own.calls.every((c) => c.alpha >= 0 && c.alpha <= 1));
  }
  const dim = tracker();
  dim.ctx.globalCompositeOperation = 'lighter';
  fx(dim.ctx, boss(2), 14, 0.4, false, 0);
  assert.ok(dim.calls.every((c) => c.alpha <= 0.4 + 1e-9), 'light strength k scales every light');
});

test('behind and fx leave alpha, blend mode, line state and the save stack as they found them', () => {
  const stateful = (comp) => {
    const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: comp, filter: 'none', depth: 0 };
    const stack = [];
    return new Proxy(state, {
      get: (o, k) => (k === 'save' ? () => { stack.push({ ...o }); o.depth++; } : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
      set: (o, k, v) => ((o[k] = v), true),
    });
  };
  for (const phase of [0, 1, 2]) {
    for (const own of [false, true]) {
      const ctx = stateful('lighter');
      const before = { ...ctx };
      fx(ctx, boss(phase), 14, 1, own, 9);
      assert.deepEqual({ ...ctx }, { ...before, globalAlpha: 1 }, `fx, phase ${phase}, own ${own}`);
    }
    const ctx = stateful('source-over');
    const before = { ...ctx };
    behind(ctx, boss(phase), 14, 9);
    assert.deepEqual({ ...ctx }, before, `behind, phase ${phase}`);
  }
});
