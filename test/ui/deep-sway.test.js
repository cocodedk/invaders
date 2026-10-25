import { test } from 'node:test';
import assert from 'node:assert/strict';
import { look, layers, recorder, tracker, H, W, layerX, FLOURISH_SWAY, warmSway, wormOpen, kelpAngles, KELP, made, images, env, kelpsway, reefsway, turns, state } from './deep-reef-kit.js';

// Lantern Deep's swaying kelp, anemones, sea grass and tube worms (the flourishes 'kelpsway' and 'reefsway'): the number
// of images they draw, that they differ from one moment to the next, skip what is off screen, bake nothing mid-fight
// and leave the context as they found it (deep-reef.test.js has the layers they read their signs from).

test('the kelp sways: three images for each strand in view, never more than 48, a different bend from one moment to the next', () => {
  assert.equal(typeof FLOURISH_SWAY.kelpsway.mid, 'function');
  const total = layers[1].signs.filter((s) => s.kelp).length;
  for (const t of [0, 1.3, 6, 33]) {
    const n = images(kelpsway(t).calls).length;
    assert.ok(n % 3 === 0 && n >= 30 && n <= 48, `${n} images at t ${t} (${total} strands)`);
  }
  const [a, b] = [turns(kelpsway(2).calls), turns(kelpsway(3.1).calls)];
  assert.notEqual(a, b, 'the strands move');
  assert.equal(a, turns(kelpsway(2).calls), 'a pure function of time');
  assert.equal(images(kelpsway(2).calls).length, images(kelpsway(3.1).calls).length);
  for (const s of layers[1].signs.filter((q) => q.kelp)) {
    const ang = kelpAngles(s, 5);
    assert.equal(ang.length, 3);
    assert.ok(ang.every((x) => Math.abs(x) <= KELP.lean + 3 * KELP.amp * 1.6), 'bends gently');
  }
  const waves = new Set(layers[1].signs.filter((s) => s.kelp).map((s) => kelpAngles(s, 4)[1].toFixed(3)));
  assert.ok(waves.size >= 10, 'a travelling wave: the strands are not in step');
});

test('the kelp skips what is off screen: none when the layer is far to either side, fewer when only part of it shows', () => {
  assert.equal(images(kelpsway(3, -4000).calls).length, 0);
  assert.equal(images(kelpsway(3, 4000).calls).length, 0);
  const [all, part] = [images(kelpsway(3).calls).length, images(kelpsway(3, -1400).calls).length];
  assert.ok(part > 0 && part < all, `${part} of ${all} images with the left of the layer cut off`);
});

test('the reef sways: tentacles, tufts and crowns, between 24 and 40 images, quiet, different from one moment to the next and skipping what is off screen', () => {
  assert.equal(typeof FLOURISH_SWAY.reefsway.near, 'function');
  for (const t of [0, 2.5, 9, 41]) {
    const n = images(reefsway(t).calls).length;
    assert.ok(n >= 24 && n <= 40, `${n} images at t ${t}`);
  }
  assert.notEqual(turns(reefsway(2).calls), turns(reefsway(3.1).calls));
  assert.equal(turns(reefsway(2).calls), turns(reefsway(2).calls), 'a pure function of time');
  assert.equal(images(reefsway(3, 100000).calls).length, 0, 'the whole reef shifted off the screen');
  const left = images(reefsway(3, 960 - 100000).calls).length;
  assert.equal(left, 0, 'and off the other side');
  const w = layers[2].signs.find((s) => s.worm && s.x > 400 && s.x < 1500);
  let shut = 0;
  for (let t = 0; t < 40; t += 0.01) if (wormOpen(t, w) < wormOpen(shut, w)) shut = t;
  const r = recorder();
  r.ctx.globalAlpha = 1;
  const alpha = images(reefsway(shut, 960, r).calls).map((c) => c.alpha);
  assert.ok(alpha.every((a) => a > 0 && a <= 1) && alpha.some((a) => a < 0.5), 'a crown drawn in is faint');
});

test('a tube worm draws its crown in now and then: fast, rests, then comes out slowly, no jumps, and mostly stays open', () => {
  const worms = layers[2].signs.filter((s) => s.worm);
  let [lo, hi, shut, n, prev] = [1, 0, 0, 0, null];
  for (const s of worms) {
    prev = null;
    for (let t = 0; t < 120; t += 0.02) {
      const o = wormOpen(t, s);
      lo = Math.min(lo, o);
      hi = Math.max(hi, o);
      if (o < 0.9) shut++;
      n++;
      if (prev !== null) assert.ok(Math.abs(o - prev) < 0.12, `no jump at t ${t.toFixed(2)}: ${prev.toFixed(2)} to ${o.toFixed(2)}`);
      prev = o;
    }
  }
  assert.ok(lo >= 0.2 - 1e-9 && lo < 0.25 && hi === 1, `from ${lo} to ${hi}`);
  assert.ok(shut / n > 0.08 && shut / n < 0.4, `${Math.round((shut / n) * 100)}% of the time not fully open`);
  const scaleY = (t, s) => {
    const r = recorder();
    FLOURISH_SWAY.reefsway.near(r.ctx, { ...env(t), v: { look, layers: [null, null, { ...layers[2], signs: [s] }], cache: {} } });
    return r.calls.find(([k]) => k === 'scale')[2];
  };
  const w = worms.find((s) => s.x > 400 && s.x < 1500);
  let [closed, wide] = [0, 0];
  for (let t = 0; t < 40; t += 0.01) {
    if (wormOpen(t, w) < wormOpen(closed, w)) closed = t;
    if (wormOpen(t, w) > wormOpen(wide, w)) wide = t;
  }
  assert.ok(scaleY(closed, w) < 0.3 * w.s, 'drawn in, the crown is squashed');
  assert.ok(Math.abs(scaleY(wide, w) - w.s) < 1e-9, 'open, it is at its full size');
});

test('the sway draws only sprites it baked beforehand: warming paints them all, and no frame bakes one', () => {
  warmSway();
  const before = made.length;
  for (const t of [0, 1.7, 8, 29]) {
    kelpsway(t);
    reefsway(t);
    reefsway(t, 400);
  }
  assert.equal(made.length, before, 'no canvas made while drawing');
  const drawn = new Set();
  for (const t of [0, 3, 6]) [kelpsway(t), reefsway(t)].forEach((r) => images(r.calls).forEach((c) => drawn.add(c[1])));
  assert.ok(drawn.size >= 10, `${drawn.size} different sprites`);
  assert.ok([...drawn].every((c) => c.T), 'each was a baked canvas');
});

test('everything it draws lies on screen: kelp from the bed upward, the reef between the lower middle and the bottom, nothing past the frame', () => {
  const [k, r] = [tracker(), tracker()];
  FLOURISH_SWAY.kelpsway.mid(k.ctx, env(2), layerX(layers[1], 960), layers[1].top);
  FLOURISH_SWAY.reefsway.near(r.ctx, env(2));
  assert.ok(k.calls.length >= 30 && r.calls.length >= 24);
  for (const c of k.calls) assert.ok(c.box[1] >= 330 && c.box[3] <= H + 2 && c.box[2] > -200 && c.box[0] < W + 200, `kelp image at ${c.box.map(Math.round)}`);
  for (const c of r.calls) assert.ok(c.box[1] >= 640 && c.box[3] <= H + 2 && c.box[2] > -200 && c.box[0] < W + 200, `reef image at ${c.box.map(Math.round)}`);
});

test('the sway leaves the line caps and joins, widths, colours, alpha, blend mode and filter as it found them, whatever the time', () => {
  for (const t of [0, 1, 4.4, 17]) {
    for (const [name, run] of Object.entries({ kelp: (c) => FLOURISH_SWAY.kelpsway.mid(c, env(t), -160, layers[1].top), reef: (c) => FLOURISH_SWAY.reefsway.near(c, env(t)), warm: () => warmSway() })) {
      const ctx = state();
      ctx.globalAlpha = 0.6;
      ctx.globalCompositeOperation = 'lighter';
      const before = { ...ctx };
      run(ctx);
      assert.deepEqual({ ...ctx }, before, `${name} at t ${t}`);
    }
  }
});

