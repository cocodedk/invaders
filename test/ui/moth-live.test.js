import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { canvases, look, def, art, HUD, PAD, f, boss, without, pass, count, sweepT, bodies, lightFrames, drawn, settle } from './moth-kit.js';

// The Vesper Moth's live extras, the contract: nothing baked mid-fight, everything under the HUD and inside the pad, the
// wings opaque and the own pass's alone, every piece of the context left as it was found, a destroyed part's light gone
// with it, and the glass scales of the last phase. The wingbeat is moth-beat.test.js, the light moth-glow.test.js, the
// frames moth-wing.test.js.
const { warmBoss } = await import('../../src/ui/bosses/bake.js');
const { glow, star } = await import('../../src/ui/sprites.js');
const { FB } = await import('../../src/ui/bosses/moth-frames.js');
const { roseFrame, spinFrame, slitGlow, ROSE_FRAMES, SPIN_FRAMES } = await import('../../src/ui/bosses/moth-light.js');
const { scaleSprite, POOL } = await import('../../src/ui/bosses/moth-scales.js');
const { SLITS } = await import('../../src/ui/bosses/moth-tail.js');

const scaleSprites = () => [0, 1, 2, 3, 4].map(scaleSprite);
const spins = () => Array.from({ length: SPIN_FRAMES }, (_, i) => spinFrame(i));
const roses = () => Array.from({ length: ROSE_FRAMES }, (_, i) => roseFrame(i));

// First, while the shared sprite caches are empty: whatever the live extras need that warming missed would be made
// during the fight.
test('warming paints everything the live extras draw: nothing is baked mid-fight', () => {
  warmBoss(look, 'moth');
  const before = canvases.length;
  for (const phase of [0, 1, 2]) for (const own of [false, true]) sweepT(boss(phase), own, () => {});
  for (const hp of [0.7, 0.3]) sweepT({ ...boss(1), parts: boss(1).parts.map((p) => (p.id.startsWith('wing') ? { ...p, hp: p.max * hp } : p)) }, true, () => {});
  assert.equal(canvases.length - before, 0, 'no canvas was made during the fight');
});

test('live extras stay under the HUD and inside the box and its pad, in every phase and pass, with at most 72 draws', () => {
  for (const phase of [0, 1, 2]) {
    for (const own of [false, true]) {
      sweepT(boss(phase), own, ({ bounds, calls }) => {
        assert.ok(bounds.y0 >= HUD, `phase ${phase} own ${own}: top ${bounds.y0.toFixed(1)}`);
        assert.ok(bounds.y1 <= def.size.h / 2 + 60 && -bounds.x0 <= PAD && bounds.x1 <= PAD, `phase ${phase} own ${own}: ${f(bounds.x0)}..${f(bounds.x1)}, bottom ${f(bounds.y1)}`);
        assert.ok(calls.length <= 72, `phase ${phase} own ${own}: ${calls.length} draws`);
      });
    }
  }
  const wing = def.parts.find((p) => p.id === 'wingL');
  assert.ok(wing.dy + FB.y >= HUD, `and the wing frames' own box lies under the HUD: ${f(wing.dy + FB.y)}`);
  assert.ok(wing.dx + FB.x >= -PAD && wing.dx + FB.x + FB.w <= PAD, 'inside the pad');
});

test('nothing rises into the HUD from a fresh boss either: the phase may begin at any time, scales falling', () => {
  for (const phase of [0, 1, 2]) {
    for (let t = 0; t < 60; t += 0.37) assert.ok(pass(boss(phase), t, true, t - 0.3).bounds.y0 >= HUD, `phase ${phase} at ${t}`);
  }
});

test('the wings are opaque and the own pass\'s alone: the darkness pass draws only additive light, and both leave the context additive', () => {
  for (const phase of [0, 1, 2]) {
    const lights = pass(boss(phase), 14, false);
    assert.ok(lights.calls.every((c) => c.comp === 'lighter'), `phase ${phase}: the darkness pass draws only additive light`);
    assert.equal(drawn(lights.calls, bodies()).length, 0, 'and no wing body');
    const own = pass(boss(phase), 14, true);
    const solid = own.calls.filter((c) => c.comp === 'source-over');
    assert.ok(solid.length >= 2 && solid.length <= 4, `phase ${phase}: the own pass adds the frames of the two wings: ${solid.length}`);
    assert.ok(solid.every((c) => bodies().includes(c.img)), 'and nothing else is opaque');
    assert.equal(own.after, 'lighter');
    assert.equal(lights.after, 'lighter');
    assert.equal(own.calls.length, lights.calls.length + solid.length, 'the rest is the same light');
    assert.ok(own.calls.filter((c) => c.comp === 'lighter').every((c) => c.alpha >= 0 && c.alpha <= 1), 'the lights are drawn at their own strength');
  }
  const dim = tracker();
  dim.ctx.globalCompositeOperation = 'lighter';
  art.live(dim.ctx, boss(2), 14, 0.4, false, 0);
  assert.ok(dim.calls.every((c) => c.alpha <= 0.4 + 1e-9), 'light strength k scales every light');
});

test('the live pass leaves alpha, blend mode, line state and the save stack as it found them', () => {
  const stateful = () => {
    const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'lighter', filter: 'none', depth: 0 };
    const stack = [];
    return new Proxy(state, {
      get: (o, k) => (k === 'save' ? () => { stack.push({ ...o }); o.depth++; } : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
      set: (o, k, v) => ((o[k] = v), true),
    });
  };
  for (const phase of [0, 1, 2]) {
    for (const own of [false, true]) {
      for (const hp of [1, 0.6, 0.3]) {
        const ctx = stateful();
        const before = { ...ctx };
        const b = { ...boss(phase), parts: boss(phase).parts.map((p) => (p.id.startsWith('wing') ? { ...p, hp: p.max * hp } : p)) };
        art.live(ctx, b, 14, 1, own, 9);
        assert.deepEqual({ ...ctx }, before, `phase ${phase} own ${own} wings at ${hp}`);
      }
    }
  }
});

test('a destroyed part takes what hangs on it along: wing, heart, eyespot, abdomen, crown', () => {
  for (const phase of [0, 1, 2]) {
    const all = pass(boss(phase), 14, true).calls;
    const wingDraws = (calls) => drawn(calls, [...bodies(), ...lightFrames()]).length;
    const one = wingDraws(pass(without(boss(phase), 'wingR'), 14, true).calls);
    assert.ok(wingDraws(all) - one >= 2, `phase ${phase}: a wing's frames and its light`);
    assert.equal(wingDraws(pass(without(boss(phase), 'wingL', 'wingR'), 14, true).calls), 0, 'none without both');
    assert.equal(drawn(pass(without(boss(phase), 'heart'), 14).calls, roses()).length, 0, 'no rose light without the heart');
    assert.equal(drawn(all, roses()).length, 1);
    assert.equal(count(pass(without(boss(phase), 'heart'), 14).calls, star('#fff6d8')), 0, 'nor the breath at its hub');
    assert.equal(drawn(all, spins()).length, 2, 'a ring of light on each eyespot');
    assert.equal(drawn(pass(without(boss(phase), 'spotL'), 14).calls, spins()).length, 1);
    assert.equal(drawn(pass(without(boss(phase), 'spotL', 'spotR'), 14).calls, spins()).length, 0);
    assert.equal(count(all, star('#fff2c0')), 2, 'and a flare on each lens');
    assert.equal(count(pass(without(boss(phase), 'spotR'), 14).calls, star('#fff2c0')), 1);
    const slits = SLITS.map((_, i) => slitGlow(i));
    assert.equal(drawn(all, slits).length, SLITS.length, 'a glow in every slit of the abdomen');
    assert.equal(drawn(pass(without(boss(phase), 'tail'), 14).calls, slits).length, 0, 'none without it');
    const crown = (calls) => calls.filter((c) => c.img === star('#ffffff') || c.img === glow('#ffe9f6')).length;
    assert.equal(crown(all), 4, 'a glint on each eye and one running up each antenna');
    assert.equal(crown(pass(without(boss(phase), 'crown'), 14).calls), 0, 'none without the crown');
  }
});

test('glass scales shake loose from the wings only in the last phase: a small pool, quiet, never above the HUD, none from a destroyed wing', () => {
  const sprites = scaleSprites();
  const scales = (b, t, own = false) => drawn(pass(b, t, own).calls, sprites);
  for (const phase of [0, 1]) {
    const b = boss(phase);
    settle(b, phase);
    assert.equal(scales(b, 9).length, 0, `phase ${phase} sheds none`);
  }
  const b = boss(2);
  settle(b, 2);
  let most = 0;
  let total = 0;
  for (let t = 8; t < 40; t += 0.17) {
    const s = scales(b, t);
    most = Math.max(most, s.length);
    total += s.length;
    for (const c of s) {
      assert.ok(c.box[1] >= HUD && c.box[3] <= def.size.h / 2 + 60, `a scale at y ${f(c.box[1])}`);
      assert.ok(c.alpha <= 0.56 && c.comp === 'lighter', 'quieter than a bullet: only light, half strength at most');
      assert.ok(c.box[2] - c.box[0] <= 37 && c.box[3] - c.box[1] <= 37, 'and small');
    }
  }
  assert.ok(most <= POOL && total / 188 >= 5, `a pool of ${POOL} (never more than ${most} at once, ${(total / 188).toFixed(1)} on average)`);
  const seen = (bb) => { let n = 0; for (let t = 8; t < 30; t += 0.17) n += scales(bb, t).length; return n; };
  const mid = (id) => ({ ...b, parts: b.parts.map((p) => (p.id === id ? { ...p, hp: 0 } : p)) });
  assert.ok(seen(mid('wingL')) < seen(b) * 0.7 && seen(mid('wingL')) > 0, 'a destroyed wing sheds none, the other still does');
  assert.equal(seen({ ...b, parts: b.parts.map((p) => (p.id.startsWith('wing') ? { ...p, hp: 0 } : p)) }), 0);
});
