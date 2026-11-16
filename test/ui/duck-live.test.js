import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tracker } from './galleon-track.js';
import { canvases, look, def, S, TOP, PAD, f, boss, without, pass, sweepT } from './duck-kit.js';

// The Dowager Duck's live pass, her bonk and her pose (bosses/duck-fx.js, duck-sprites.js, duck-bonk.js; her still art is duck-parts.test.js): at most 60
// draws, nothing baked mid-fight, nothing above TOP; additive light but for three sprites laid opaque in her own pass only (the foam crest over her
// waist, the plaster on her tum from the hover on, her eyes crossed after a bonk); a bonk, told by the core's stamp on her (core/bonk.js), not
// by the hp she lost, crosses her eyes and squashes her (never taller, and only for a moment); and bosses/index.js applies the squash to all of
// her and undoes it.
const { warmBoss, BOSS_ART } = await import('../../src/ui/bosses/bake.js');
const { drawBoss } = await import('../../src/ui/bosses/index.js');
const { fx, warm } = await import('../../src/ui/bosses/duck-fx.js');
const { crest, plaster, crossed } = await import('../../src/ui/bosses/duck-sprites.js');
const { CROSS, SQUASH, SQUASH_X, SQUASH_Y, pose, bonkAge } = await import('../../src/ui/bosses/duck-bonk.js');
const { BONK_BOSS } = await import('../../src/core/bonk.js');
const { PART } = await import('../../src/ui/bosses/duck-kit.js');

const total = (b, own = true) => {
  let n = 0;
  sweepT(b, own, ({ calls }) => { n += calls.length; });
  return n;
};
const drawn = (calls, sprite) => calls.filter((c) => c.img === sprite().img).length;
const near = (calls, p, r) => calls.filter((c) => Math.hypot((c.box[0] + c.box[2]) / 2 - p.x, (c.box[1] + c.box[3]) / 2 - p.y) < r);
// A boss drawn once at t, then part `id` hurt for `drop` (Infinity: finished) by a bonk, its stamp moving on as core/bonk.js moves it, or
// with `bonk` false by anything else (a shot, a bomb), then drawn again a frame later: the second pass.
function bonked(id, drop = BONK_BOSS, { bonk = true, phase = 0, t = 5 } = {}) {
  const b = boss(phase);
  pass(b, t);
  const p = b.parts.find((q) => q.id === id);
  p.hp = Math.max(0, p.hp - drop);
  if (bonk) b.bonked = (b.bonked ?? 0) + 1;
  return { b, after: pass(b, t + 1 / 60) };
}

// First, while the shared sprite caches are empty: whatever the live pass needs that warming missed would be made mid-fight.
test('warming bakes everything the live pass draws, the bonked eyes included: nothing is made mid-fight', () => {
  warmBoss(look, 'duck');
  const before = canvases.length;
  for (const phase of [0, 1, 2]) {
    sweepT(boss(phase), true, () => {});
    sweepT(boss(phase), false, () => {});
    bonked('bill', BONK_BOSS, { phase });
  }
  assert.equal(canvases.length - before, 0, 'no canvas was made during the fight');
  assert.equal(BOSS_ART.duck.live, fx);
  assert.equal(BOSS_ART.duck.warm, warm);
  assert.equal(BOSS_ART.duck.pose, pose);
});

test('warm is idempotent', () => {
  const before = canvases.length;
  warm();
  warm();
  assert.equal(canvases.length, before);
});

test('the live pass stays under TOP and inside her box and its pad, in every phase and pass, with at most 60 draws', () => {
  for (const phase of [0, 1, 2]) {
    for (const own of [false, true]) {
      sweepT(boss(phase), own, ({ bounds, calls }) => {
        assert.ok(bounds.y0 >= TOP, `phase ${phase} own ${own}: top ${bounds.y0.toFixed(1)}`);
        assert.ok(bounds.y1 <= 330 && -bounds.x0 <= PAD && bounds.x1 <= PAD, `phase ${phase} own ${own}: ${f(bounds.x0)}..${f(bounds.x1)}, bottom ${f(bounds.y1)}`);
        assert.ok(calls.length <= 60, `phase ${phase} own ${own}: ${calls.length} draws`);
        assert.ok(calls.length >= 6, `phase ${phase}: there is a good deal going on: ${calls.length}`);
      });
    }
  }
  const { bounds, calls } = bonked('bill', BONK_BOSS, { phase: 2 }).after;
  assert.ok(bounds.y0 >= TOP && calls.length <= 60, `bonked: top ${f(bounds.y0)}, ${calls.length} draws`);
});

test('light, but for three sprites laid opaque in her own pass only; the blend mode and the alpha come back as they were; no light is past the strength k', () => {
  const opaque = [crest(), plaster(), crossed()].map((s) => s.img);
  for (const phase of [0, 1, 2]) {
    sweepT(boss(phase), false, ({ after, calls, ctx }) => {
      assert.equal(after, 'lighter');
      assert.equal(ctx.globalAlpha, 1);
      for (const c of calls) assert.equal(c.comp, 'lighter', 'the darkness pass draws only light');
    });
    sweepT(boss(phase), true, ({ after, calls, ctx }) => {
      assert.equal(after, 'lighter');
      assert.equal(ctx.globalAlpha, 1);
      for (const c of calls) {
        if (c.comp === 'lighter') assert.ok(c.alpha <= 1 + 1e-9);
        else assert.ok(opaque.includes(c.img) && c.alpha === 1 && c.comp === 'source-over', 'an opaque draw is one of the three sprites');
      }
    });
  }
  const half = pass(boss(2), 7.3, true, 0.5);
  for (const c of half.calls) if (c.comp === 'lighter') assert.ok(c.alpha <= 0.5 + 1e-9, `strength k scales every light: ${c.alpha}`);
});

test('the foam crest is laid over her waist in every frame of her own pass; the plaster from the hover on, while the belly stands', () => {
  for (const phase of [0, 1, 2]) {
    const { calls } = pass(boss(phase), 6);
    assert.equal(drawn(calls, crest), 1, `phase ${phase}: the crest`);
    assert.equal(drawn(calls, plaster), phase ? 1 : 0, `phase ${phase}: ${phase ? 'a' : 'no'} plaster`);
    assert.equal(drawn(pass(boss(phase), 6, false).calls, crest), 0, 'never in the darkness pass');
  }
  assert.equal(drawn(pass(without(boss(1), 'belly'), 6).calls, plaster), 0, 'no plaster on a belly shot away');
  const c = crest();
  assert.ok(c.x <= -PART.bandR.x - PART.bandR.w / 2 && c.y + c.img.height >= PART.footL.y - PART.footL.h / 2, 'the crest runs past her armbands, down over her ankles');
});

test('a bonk crosses her eyes and squashes her, whatever it takes, one that finishes a part too; any other hurt (a shot, a bomb) does neither', () => {
  for (const [id, drop] of [['bill', BONK_BOSS], ['footR', Infinity], ['bobble', Infinity], ['bandL', 1]]) {
    const { b, after } = bonked(id, drop);
    assert.equal(drawn(after.calls, crossed), 1, `${id}: her eyes cross`);
    const p = pose(b, 5 + 1 / 60 + 0.03);
    assert.ok(p && p[0] > 1 && p[1] < 1, `${id}: she squashes, wider and lower: ${p}`);
  }
  for (const [id, drop] of [['bill', 1], ['bobble', BONK_BOSS], ['bill', BONK_BOSS], ['bandR', Infinity]]) {
    const { b, after } = bonked(id, drop, { bonk: false });
    assert.equal(drawn(after.calls, crossed), 0, `${id} losing ${drop}: no bonk`);
    assert.equal(pose(b, 5 + 1 / 60 + 0.03), null);
  }
  const fresh = boss(0);
  Object.assign(fresh, { bonked: 7 });
  fresh.parts[1].hp = 3;
  assert.equal(bonkAge(fresh, 5), Infinity, 'a boss first seen, already hurt and bonked, has not been bonked since');
});

test('the squash never makes her taller and is over in SQUASH s; her eyes uncross after CROSS s', () => {
  const { b } = bonked('bill');
  const t0 = 5 + 1 / 60;
  let deepest = 1;
  for (let dt = 0; dt < SQUASH; dt += 0.005) {
    const p = pose(b, t0 + dt);
    if (!p) continue;
    assert.ok(p[0] >= 1 && p[1] <= 1, `at ${dt.toFixed(3)} s: ${p}`);
    assert.ok(p[0] <= 1 + SQUASH_X + 1e-9 && p[1] >= 1 - SQUASH_Y - 1e-9, `no more than SQUASH_X wider and SQUASH_Y lower: ${p}`);
    deepest = Math.min(deepest, p[1]);
  }
  assert.ok(deepest <= 1 - SQUASH_Y * 0.9, `she squashes visibly, nearly all of SQUASH_Y: down to ${deepest.toFixed(3)}`);
  assert.equal(pose(b, t0 + SQUASH + 0.01), null);
  assert.equal(drawn(pass(b, t0 + CROSS - 0.02).calls, crossed), 1);
  assert.equal(drawn(pass(b, t0 + CROSS + 0.02).calls, crossed), 0);
});

test('bosses/index.js squashes all of her when she is bonked and puts the context back; her boxes never move', () => {
  const b = { ...boss(0), kind: 'duck', x: 960, y: 330, dying: null, warns: [], clock: 0 };
  b.parts.forEach((p) => Object.assign(p, { x: 960 + p.dx, y: 330 + p.dy }));
  const where = b.parts.map((p) => [p.x, p.y]);
  const hullBox = (t) => {
    const T = tracker();
    drawBoss(T.ctx, { boss: b }, look, t);
    T.ctx.drawImage({ width: 10, height: 10 }, 0, 0, 10, 10);
    assert.deepEqual(T.calls.at(-1).box, [0, 0, 10, 10], 'the transform is undone');
    return T.calls[0].box;
  };
  const still = hullBox(8);
  b.bonked = 1;
  const squashed = hullBox(8 + 0.03);
  assert.ok(squashed[2] - squashed[0] > still[2] - still[0] + 10, `wider: ${f(squashed[2] - squashed[0])} against ${f(still[2] - still[0])}`);
  assert.ok(squashed[0] > still[0] - 60 && squashed[1] > still[1], 'and lower, about her foam');
  assert.deepEqual(hullBox(9), still, 'and back to herself a moment later');
  assert.deepEqual(b.parts.map((p) => [p.x, p.y]), where, 'the boxes never moved');
});

test('the later phases are livelier; a foot shot away kicks up no drops', () => {
  const [a, b, c] = [0, 1, 2].map((ph) => total(boss(ph)));
  assert.ok(c > b && b > a, `${a} < ${b} < ${c} draws over the same seconds`);
  const drops = (bb) => {
    let n = 0;
    sweepT(bb, true, ({ calls }) => { n += near(calls, { x: PART.footL.x - 60, y: PART.footL.y + 40 }, 60).length; });
    return n;
  };
  assert.ok(drops(boss(0)) > 10, `the left foot paddles: ${drops(boss(0))}`);
  assert.equal(drops(without(boss(0), 'footL')), 0, 'and not once it is shot away');
});

test('the same moment gives the same picture: nothing uses chance or the clock', () => {
  const once = (t) => pass(boss(1), t).calls.map((c) => [c.alpha, ...c.box.map(f)]);
  for (const t of [3, 5.5, 11.2]) assert.deepEqual(once(t), once(t), `t ${t}`);
  assert.equal(def.kind, 'duck');
  assert.equal(S.pad, BOSS_ART.duck.pad);
});
