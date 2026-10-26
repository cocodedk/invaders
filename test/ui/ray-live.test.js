import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canvases, look, HUD, PAD, f, def, boss, without, pass, sweepT, near } from './ray-kit.js';

// The Squall Ray's live extras, the contract (bosses/ray-fx.js, ray-fx-bolts.js; its still art is ray-parts.test.js): additive, at most 60 draws, nothing
// baked mid-fight, nothing above the HUD, a destroyed part's light gone with it, the later phases livelier, every piece of the context left as it was found.
const { warmBoss, BOSS_ART } = await import('../../src/ui/bosses/bake.js');
const { fx, warm } = await import('../../src/ui/bosses/ray-fx.js');
const { STORM_PATHS, VARIANTS } = await import('../../src/ui/bosses/ray-fx-bolts.js');

const part = (id) => def.parts.find((p) => p.id === id);
const total = (b, own = true) => {
  let n = 0;
  sweepT(b, own, ({ calls }) => { n += calls.length; });
  return n;
};

// First, while the shared sprite caches are empty: whatever the live pass needs that warming missed would be made mid-fight.
test('warming bakes everything the live pass draws: nothing is made mid-fight', () => {
  warmBoss(look, 'ray');
  const before = canvases.length;
  for (const phase of [0, 1, 2]) {
    sweepT(boss(phase), true, () => {});
    sweepT(boss(phase), false, () => {});
    sweepT(boss(phase), true, () => {}, 20);
  }
  assert.equal(canvases.length - before, 0, 'no canvas was made during the fight');
  assert.equal(BOSS_ART.ray.live, fx);
  assert.equal(BOSS_ART.ray.warm, warm);
});

test('warm is idempotent', () => {
  const before = canvases.length;
  warm();
  warm();
  assert.equal(canvases.length, before);
});

test('the live extras stay under the HUD and inside the box and its pad, in every phase and pass, with at most 60 draws', () => {
  for (const phase of [0, 1, 2]) {
    for (const own of [false, true]) {
      sweepT(boss(phase), own, ({ bounds, calls }) => {
        assert.ok(bounds.y0 >= HUD, `phase ${phase} own ${own}: top ${bounds.y0.toFixed(1)}`);
        assert.ok(bounds.y1 <= 330 && -bounds.x0 <= PAD && bounds.x1 <= PAD, `phase ${phase} own ${own}: ${f(bounds.x0)}..${f(bounds.x1)}, bottom ${f(bounds.y1)}`);
        assert.ok(calls.length <= 60, `phase ${phase} own ${own}: ${calls.length} draws`);
        assert.ok(calls.length >= 6, `phase ${phase}: there is a good deal going on: ${calls.length}`);
      });
    }
  }
  for (const since of [3, 3.4, 20]) { // and the flash at the start of a phase too
    const { bounds } = pass(boss(1), 3.3, true, since);
    assert.ok(bounds.y0 >= HUD, `flash: top ${bounds.y0.toFixed(1)}`);
  }
});

test('all of it is additive light: nothing opaque, the blend mode and the alpha come back as they were, every draw is at most the strength k', () => {
  for (const phase of [0, 1, 2]) {
    sweepT(boss(phase), true, ({ after, calls, ctx }) => {
      assert.equal(after, 'lighter');
      assert.equal(ctx.globalAlpha, 1);
      for (const c of calls) {
        assert.equal(c.comp, 'lighter', 'every draw is additive');
        assert.ok(c.alpha <= 1 + 1e-9);
      }
    });
  }
  const half = pass(boss(2), 7.3, true, 0, 0.5);
  for (const c of half.calls) assert.ok(c.alpha <= 0.5 + 1e-9, `strength k scales every draw: ${c.alpha}`);
});

test('a destroyed part leaves no light: no beat without the heart, no fire without the maw, and from a coil without it only a few sparks off its broken ring', () => {
  const count = (b, p, r) => {
    let n = 0;
    sweepT(b, true, ({ calls }) => { n += near(calls, p, r).length; });
    return n;
  };
  const alive = boss(2);
  for (const [id, p, r] of [['coilL', { x: -440, y: 70 }, 60], ['coilR', { x: 440, y: 70 }, 60], ['heart', { x: 0, y: -24 }, 36], ['maw', { x: 0, y: 90 }, 36]]) {
    assert.ok(count(alive, p, r) > 20, `${id} has light about it: ${count(alive, p, r)}`);
    const dead = count(without(alive, id), p, r);
    if (id.startsWith('coil')) assert.ok(dead > 0 && dead * 4 < count(alive, p, r), `a destroyed ${id} throws a few sparks and no arcs: ${dead} draws against ${count(alive, p, r)}`);
    else assert.equal(dead, 0, `a destroyed ${id} has none`);
  }
  const twin = count(without(alive, 'coilL'), { x: 440, y: 70 }, 60);
  assert.ok(twin > 20, 'the other coil goes on');
});

test('the arcs flicker: the coil is lit now and dark then, and the later the phase the more often it is lit', () => {
  const lit = (b) => {
    const seen = [];
    for (let t = 3; t < 12; t += 1 / 15) seen.push(near(pass(b, t).calls, { x: -464, y: 42 }, 40).length);
    return seen;
  };
  const sway = lit(boss(0));
  const orbit = lit(boss(2));
  assert.ok(new Set(sway).size >= 2, 'it flickers');
  const on = (xs) => xs.filter((n) => n > 0).length;
  assert.ok(on(orbit) > on(sway), `lit ${on(orbit)} times in the orbit phase against ${on(sway)} in the first`);
});

test('the later phases are livelier, and a phase that has just begun flashes at the heart', () => {
  const [a, b, c] = [0, 1, 2].map((ph) => total(boss(ph)));
  assert.ok(c > b && b > a, `${a} < ${b} < ${c} draws over the same seconds`);
  const atHeart = (since) => near(pass(boss(1), 5, true, since).calls, { x: 0, y: -24 }, 10).length; // the draws centred on the heart: its glows, and the flash
  assert.equal(atHeart(4.9), atHeart(-1e9) + 2, 'a phase begun a tenth of a second ago flashes at the heart: a glow and a glint');
  assert.equal(atHeart(3), atHeart(-1e9), 'and a phase two seconds old no longer does');
});

test('the same moment gives the same picture: nothing uses chance or the clock', () => {
  const once = (t) => pass(boss(1), t).calls.map((c) => [c.alpha, ...c.box.map(f)]);
  for (const t of [3, 5.5, 11.2]) assert.deepEqual(once(t), once(t), `t ${t}`);
});

test('the bolts of the cloud have six paths over the right wing and the body, and the coil arcs five variants each', () => {
  assert.equal(STORM_PATHS.length, 6);
  assert.equal(VARIANTS, 5);
  for (const [, y0, , y1] of STORM_PATHS) assert.ok(Math.min(y0, y1) >= HUD + 20, 'the bolts of the cloud lie under the HUD');
  assert.ok(part('coilL').dx < 0 && part('coilR').dx > 0);
});
