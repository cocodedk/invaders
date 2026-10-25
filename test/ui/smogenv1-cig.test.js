import { test } from 'node:test';
import assert from 'node:assert/strict';
import { look, made, frame, env, PHASE, drawFlourishes, tracker, stateful, W } from './smogenv1-kit.js';

// The giant cigarettes' tall part (flourish `cigarettes`, flourish-smog-sky-cig*.js): each of the six burns until its own healing (ember
// flickering, smoke leaning away from the Craving), goes out, then crumbles from the top down to the stump the layer painted. All of
// it a function of t and h; the paper in two palettes crossfaded with the smog; sprites baked up front, none cut off at its edge; within
// the draw budget at every healing; quiet (the ember is a dim additive glow, not a bullet).
const { warmSkyFx } = await import('../../src/ui/flourish-smog-sky.js'); // first: nothing has baked a sprite yet
const warmed0 = made.length;
warmSkyFx();
const warmed = made.length - warmed0;
const { CIGS, STUMP_H } = await import('../../src/ui/parallax-smog-far-cig.js');
const { cigStage, CRUMBLE_AT, CUT_END } = await import('../../src/ui/flourish-smog-sky-cig.js');
const { M, CAP, SNAP } = await import('../../src/ui/flourish-smog-sky-cig-sprites.js');
const { GROUND } = await import('../../src/ui/parallax-smog-far-kit.js');

const BASE_Y = 380 + GROUND;
const AXIS = (c) => PHASE.far[0] + c.x;
const cs = (c) => c.out + (c.gone - c.out) * CRUMBLE_AT;
const body = (calls, c) => calls.filter((k) => Math.abs(k.box[2] - k.box[0] - (c.w + M * 2)) < 0.5); // sprites as wide as this cigarette's

test('warming bakes every sprite the flourish draws, and a long run after it bakes none larger than 400 px square', () => {
  assert.ok(warmed >= 60, `${warmed} sprites baked up front`);
  const again = made.length;
  warmSkyFx();
  assert.equal(made.length, again, 'warming twice bakes nothing more');
  for (let h = 0; h <= 1.001; h += 0.05) for (let t = 0; t < 40; t += 4.3) frame('cigarettes', 'far', h, t);
  assert.deepEqual(made.slice(again).filter((c) => c.width * c.height > 400).map((c) => `${c.width}x${c.height}`), [], 'nothing is painted once the fight is on');
});

test('no sprite is cut off at its edge: the lit cigarette, the column, the cold cap and the snap keep inside their canvases', () => {
  const inside = (c, pad = 0.5) => c.T.bounds.x0 >= -pad && c.T.bounds.x1 <= c.width + pad && c.T.bounds.y1 <= c.height + pad;
  const sized = (w, h) => made.filter((c) => c.width === w && c.height === h && Number.isFinite(c.T.bounds.x0));
  const dims = (c) => `${c.width}x${c.height}: ${['x0', 'y0', 'x1', 'y1'].map((k) => Math.round(c.T.bounds[k] * 10) / 10).join(',')}`;
  for (const c of CIGS) {
    const lit = sized(c.w + M * 2, c.h + CAP);
    assert.equal(lit.length, 2, 'a lit sprite a palette');
    for (const s of lit) assert.ok(inside(s) && s.T.bounds.y0 >= -0.5, dims(s));
    for (const s of sized(c.w + M * 2, c.h)) assert.ok(inside(s) && s.T.bounds.y0 >= -4.5, `the column is flat on top: ${dims(s)}`);
    for (const s of sized(c.w + M * 2, CAP + 24)) assert.ok(inside(s) && s.T.bounds.y0 >= -0.5, dims(s));
    for (const s of sized(c.w + M * 2, SNAP.h)) assert.ok(inside(s) && s.T.bounds.y0 >= -0.5, dims(s));
  }
  for (const s of sized(46, 40)) assert.ok(inside(s) && s.T.bounds.y0 >= -0.5, dims(s));
});

test('each cigarette has its own stages: burning, going out, cold, crumbling from a start 28 % of the way to its end, gone', () => {
  for (const c of CIGS) {
    const a = { ...cigStage(c, 0) };
    assert.deepEqual([a.ember, a.plume, a.lit, a.p, a.alive], [1, 1, 1, 0, true], 'burning at h 0');
    const out = { ...cigStage(c, c.out) };
    assert.ok(out.ember < 0.01 && out.lit < 0.01 && out.plume > 0.2 && out.p === 0, 'the ember is out at `out`, the smoke thins a little later');
    assert.ok(cigStage(c, c.out + 0.045).plume < 0.01, 'and is gone just after');
    assert.equal(cigStage(c, cs(c) - 0.001).p, 0, 'cold until the crumbling starts');
    assert.ok(cigStage(c, cs(c) + 0.02).p > 0, 'then crumbling');
    assert.ok(Math.abs(cigStage(c, c.gone - 1e-6).p - 1) < 0.01 && cigStage(c, c.gone - 1e-6).alive, 'almost done just before `gone`');
    assert.equal(cigStage(c, c.gone).alive, false, 'and costs nothing from there on');
    let [e, p] = [2, -1];
    for (let h = 0; h <= 1; h += 0.01) {
      const s = cigStage(c, h);
      assert.ok(s.ember <= e + 1e-9 && s.p >= p - 1e-9, 'the ember only dims and the crumbling only goes on');
      [e, p] = [s.ember, s.p];
    }
  }
});

test('at h 0 all six burn: lit paper, a dim flickering ember (additive, under 120 px), two ribbons and puffs of smoke each; at h 1 nothing is drawn', () => {
  const a = frame('cigarettes', 'far', 0, 5);
  assert.ok(a.length > 20 && a.length <= 40, `${a.length} images`);
  const glows = a.filter((c) => c.comp === 'lighter');
  assert.equal(glows.length, CIGS.length, 'one ember each');
  for (const g of glows) assert.ok(g.alpha <= 0.5 && g.box[2] - g.box[0] < 120, `an ember of alpha ${g.alpha}, ${g.box[2] - g.box[0]} wide`);
  const [p, q] = [frame('cigarettes', 'far', 0, 5.4).filter((c) => c.comp === 'lighter'), glows];
  assert.notDeepEqual(p.map((c) => c.alpha), q.map((c) => c.alpha), 'a coal flickers');
  for (const c of CIGS) assert.equal(body(a, c).filter((k) => k.box[3] - k.box[1] === c.h + CAP).length, 1, 'one lit sprite, one palette at h 0');
  assert.equal(frame('cigarettes', 'far', 1, 5).length, 0);
  assert.equal(frame('cigarettes', 'far', Math.max(...CIGS.map((c) => c.gone)), 5).length, 0);
  assert.ok(frame('cigarettes', 'far', null, 5).length === a.length, 'a view without a healing is at h 0');
});

test('the smoke leans away from the middle of the frame, and is gone once every cigarette is out', () => {
  const a = frame('cigarettes', 'far', 0, 5);
  for (const c of CIGS) {
    const ribbons = a.filter((k) => Math.abs(k.box[3] - k.box[1] - 480) < 12 && Math.abs((k.box[0] + k.box[2]) / 2 - AXIS(c)) < 60);
    assert.ok(ribbons.length >= 1, 'a ribbon over every cigarette');
    for (const r of ribbons) assert.ok(c.x < 1120 ? (r.box[0] + r.box[2]) / 2 < AXIS(c) : (r.box[0] + r.box[2]) / 2 > AXIS(c), 'it leans outward');
  }
  assert.equal(frame('cigarettes', 'far', 0.6, 5).filter((k) => Math.abs(k.box[3] - k.box[1] - 480) < 12).length, 0, 'no smoke at 0.6');
});

test('the paper is two palettes crossfaded with the smog: both at h 0.3 (the smog at its share, the clean one whole), one at each end', () => {
  const c = CIGS[3];
  const lit = (h) => body(frame('cigarettes', 'far', h, 5), c).filter((k) => k.box[3] - k.box[1] === c.h + CAP);
  assert.equal(lit(0.3).length, 2);
  assert.deepEqual(lit(0.3).map((k) => Math.round(k.alpha * 100) / 100 > 0.6), [true, true]);
  assert.ok(lit(0.3)[0].alpha === 1 && lit(0.3)[1].alpha < 1, 'the clean one under, whole; the smog one over it');
  assert.equal(lit(0.02).length, 1, 'within a tenth of the end the paper is one image');
  assert.equal(lit(0.15).length, 1);
  assert.ok(lit(0.3).length === 2 && lit(0.4).length === 2);
});

test('crumbling: the cut descends with h to the stump and stops there; chunks and dust keep falling while h stands still; frames are pure', () => {
  const c = CIGS[0];
  const top = (h) => Math.min(...frame('cigarettes', 'far', h, 5).filter((k) => k.args.length === 8 && Math.abs(k.box[2] - k.box[0] - (c.w + M * 2)) < 0.5).map((k) => k.box[1]));
  let last = -Infinity;
  for (let h = cs(c) + 0.005; h < c.gone; h += (c.gone - cs(c)) / 20) {
    const y = top(h);
    assert.ok(y >= last - 1e-6, `the cut at ${y} is not above the one before (${last})`);
    last = y;
  }
  assert.ok(Math.abs(top(c.gone - 1e-6) - (BASE_Y - CUT_END)) < 1, 'it ends where the layer\'s stump has its break');
  assert.equal(CUT_END, STUMP_H - (SNAP.base - SNAP.top));
  assert.equal(BASE_Y - CUT_END - SNAP.base + SNAP.top, BASE_Y - STUMP_H, 'the snap sprite lines up with the stump\'s break');
  const mid = (cs(c) + c.gone) / 2;
  const chunks = (t) => frame('cigarettes', 'far', mid, t).filter((k) => k.box[2] - k.box[0] > 20 && k.box[2] - k.box[0] < 70 && k.box[3] - k.box[1] < 70);
  assert.notDeepEqual(chunks(3).map((k) => k.box), chunks(3.9).map((k) => k.box), 'the debris moves on t');
  assert.deepEqual(chunks(3).map((k) => k.box), chunks(3).map((k) => k.box), 'the same frame twice');
  assert.ok(chunks(3).length >= 1);
});

test('the flourish stays within 40 images a frame at every healing, fewer at low quality, and none of it is in the boss\'s middle', () => {
  let most = 0;
  for (let h = 0; h <= 1.0001; h += 0.02) {
    for (const t of [1, 5.5, 13.3]) {
      const n = frame('cigarettes', 'far', h, t).length;
      most = Math.max(most, n);
      assert.ok(n <= 40, `${n} images at h ${h.toFixed(2)}`);
    }
  }
  assert.ok(most >= 30, `${most} at the busiest: the budget is used`);
  assert.ok(frame('cigarettes', 'far', 0, 5, 0.5).length < frame('cigarettes', 'far', 0, 5).length);
  for (const h of [0, 0.3, 0.6]) {
    for (const k of frame('cigarettes', 'far', h, 5)) {
      const [cx, w] = [(k.box[0] + k.box[2]) / 2, k.box[2] - k.box[0]];
      if (w <= 250 && k.box[1] < 500) assert.ok(cx < 700 || cx > 1220, `an image of width ${Math.round(w)} at ${Math.round(cx)} would be in the boss's middle`);
    }
  }
  assert.ok(frame('cigarettes', 'far', 0, 5).every((k) => k.box[2] > -300 && k.box[0] < W + 300));
});

test('the flourish leaves the context as it found it, in every stage', () => {
  for (const h of [0, 0.2, 0.3, 0.45, 0.6, 0.8]) {
    const ctx = stateful();
    const before = { ...ctx };
    drawFlourishes(ctx, env(['cigarettes'], h, 7), 'far', ...PHASE.far);
    assert.deepEqual({ ...ctx }, before, `h ${h}`);
  }
  const T = tracker();
  drawFlourishes(T.ctx, env(['cigarettes'], 0.4, 7), 'far', ...PHASE.far);
  assert.equal(T.ctx.globalAlpha, 1);
  assert.equal(T.ctx.globalCompositeOperation, 'source-over');
});
