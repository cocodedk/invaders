import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { stateful, hue, limeish } from './glass-env-kit.js';

// Glass Cathedral's ambient under stand-in canvases (glass-env-flourish.test.js has the flourishes): dust motes hanging in the
// shafts of light, glints of drifting glass and sparks rising from the candle stands. All of it stays dimmer than the entry's
// own alpha, nothing is the bullets' lime or near it, and no mote or glint is a bright dot (a backdrop speck must never be
// taken for a bullet or a pickup).
installCanvas(64);
const made = [];
const stand = document.createElement;
document.createElement = (...a) => {
  const T = tracker();
  const c = { ...stand(...a), getContext: () => T.ctx, T };
  made.push(c);
  return c;
};
const { look } = await import('./glass-env-look-kit.js');
const { drawAmbient } = await import('../../src/ui/ambient.js');
const { AMBIENT8, MOTE, SHARD, SPARK, shard, warmGlassAmbient } = await import('../../src/ui/ambient-8.js');
const { SHAFTS, shaftAt } = await import('../../src/ui/flourish-glass.js');
const { STANDS, BED } = await import('../../src/ui/parallax-glass-near.js');
const { warmGlassEnv } = await import('../../src/ui/warm-glass-env.js');
const { rgb } = await import('../../src/ui/sprites.js');

const entries = look.ambient;
const [motes, glints, sparks] = ['dustmotes', 'glassglints', 'candlesparks'].map((k) => entries.filter((a) => a.kind === k));
const world = (x = 960) => ({ ship: { x } });
const frame = (a, t, x = 960) => {
  const T = tracker();
  drawAmbient(T.ctx, { ...look, ambient: [a] }, a.phase, { t, drift: 0, wind: 0, world: world(x) });
  return T.calls;
};
const mid = (c) => [(c.box[0] + c.box[2]) / 2, (c.box[1] + c.box[3]) / 2];
const wide = (c) => c.box[2] - c.box[0];

test('warming bakes the sprites of every entry, so drawing them afterwards bakes nothing', () => {
  warmGlassEnv(look);
  const warmed = made.length;
  assert.ok(warmed >= 5, `${warmed} sprites baked ahead of the fight`);
  for (let t = 0; t < 120; t += 7.3) for (const a of entries) frame(a, t);
  assert.equal(made.length, warmed, 'nothing baked while drawing');
  warmGlassAmbient(look);
  assert.equal(made.length, warmed, 'warming again bakes nothing');
});

test('a shard sprite is a lopsided triangle of glass with a lead edge, one for each colour of an entry, and nothing in it is cut off at its edge', () => {
  const sprites = made.filter((c) => c.width === SHARD.box && c.height === SHARD.box && Number.isFinite(c.T.bounds.x0));
  const colors = new Set(glints.flatMap((a) => a.colors));
  assert.equal(sprites.length, colors.size, 'one a colour');
  for (const c of sprites) assert.ok(c.T.bounds.x0 >= 1 && c.T.bounds.y0 >= 1 && c.T.bounds.x1 <= c.width - 1 && c.T.bounds.y1 <= c.height - 1, `${c.T.bounds.x0},${c.T.bounds.y0},${c.T.bounds.x1},${c.T.bounds.y1}`);
});

test('the registry draws the three kinds: motes in two phases, glints in two, sparks in one; each entry stays under its own count and alpha, and moves', () => {
  assert.deepEqual([motes.length, glints.length, sparks.length], [2, 2, 1]);
  assert.deepEqual(motes.map((a) => a.phase), ['sky', 'mid']);
  assert.deepEqual(glints.map((a) => a.phase), ['mid', 'front']);
  assert.deepEqual(sparks.map((a) => a.phase), ['front']);
  for (const a of entries) {
    assert.equal(typeof AMBIENT8[a.kind], 'function');
    const calls = frame(a, 9);
    assert.ok(calls.length >= Math.floor(a.n / 3) && calls.length <= a.n * 2 && a.n <= 60, `${a.kind} ${a.phase}: ${calls.length} of ${a.n}`);
    assert.ok(calls.every((c) => c.alpha <= a.alpha + 1e-9), `${a.kind} stays at or under its alpha`);
    assert.notDeepEqual(calls.map((c) => c.box), frame(a, 10).map((c) => c.box), `${a.kind} moves`);
    assert.deepEqual(calls.map((c) => c.box), frame(a, 9).map((c) => c.box), 'the same frame twice');
  }
  assert.ok(entries.reduce((s, a) => s + a.n, 0) <= 100, 'a hundred specks at most in all');
});

test('everything is dim: alphas at most 0.4, no colour the bullets\' lime or anything near it, and no entry is a bright white dot', () => {
  for (const a of entries) {
    assert.ok(a.alpha <= 0.4, `${a.kind} ${a.phase} alpha ${a.alpha}`);
    assert.ok(a.colors.length >= 1);
    for (const c of a.colors) {
      assert.ok(!limeish(c), `${a.kind}: ${c} is lime`);
      const h = hue(c);
      assert.ok(h === -1 || h < 60 || h > 150, `${a.kind}: ${c} (hue ${h}) is yellow-green or green`);
      assert.ok(!['#ffffff', '#fff0f8'].includes(c), `${a.kind} wears pure white`);
      const [r, g, b] = rgb(c);
      assert.ok(Math.min(r, g, b) < 235, `${c} is not a white speck`);
    }
  }
  for (const a of [...motes, ...glints.filter((e) => e.phase === 'front')]) assert.ok(a.alpha <= 0.3, `${a.kind} ${a.phase} in front of or among the action stays at 0.3 or less`);
  assert.ok(sparks[0].size[1] <= 3, 'sparks are tiny');
});

test('motes hang in the shafts: each one lies within the width of one of the five shafts at that moment, climbs, and glows when its shaft is strong', () => {
  for (const a of motes) {
    for (const t of [4, 40, 133]) {
      const shafts = Array.from({ length: SHAFTS.n }, (_, i) => shaftAt(i, t));
      const calls = frame(a, t);
      assert.equal(calls.length, a.n);
      for (const c of calls) {
        const [x, y] = mid(c);
        const ok = shafts.some((sh) => {
          const along = (y + 40) / Math.cos(sh.rot);
          const across = (x - (sh.x - Math.sin(sh.rot) * along)) / Math.cos(sh.rot);
          return Math.abs(across) <= 28 * sh.scale + along * MOTE.lean * sh.scale + 8;
        });
        assert.ok(ok, `${a.phase} mote at ${Math.round(x)},${Math.round(y)} t ${t} is in no shaft`);
        assert.ok(y > -35 && y < 1080 * (a.maxY ?? 0.7) + 5, 'in the upper frame');
        assert.ok(wide(c) >= a.size[0] * MOTE.scale - 1e-6 && wide(c) <= a.size[1] * MOTE.scale + 1e-6, 'the entry\'s size');
        assert.equal(c.comp, 'lighter');
      }
    }
    const [f0, f1] = [frame(a, 20), frame(a, 21)];
    assert.ok(f0.filter((c, i) => mid(f1[i])[1] < mid(c)[1] + 40).length >= f0.length * 0.8, 'rising, or wrapping round');
    const climbed = f0.filter((c, i) => mid(f1[i])[1] < mid(c)[1]).length;
    assert.ok(climbed >= f0.length * 0.8, `${climbed} of ${f0.length} climbed`);
    const alphas = new Set();
    for (let t = 0; t < 200; t += 2.1) frame(a, t).forEach((c) => alphas.add(Math.round((c.alpha / a.alpha) * 10)));
    assert.ok(alphas.size >= 5 && Math.max(...alphas) <= 10, 'glowing and fading with the shafts and a twinkle of their own');
  }
});

test('glints of glass fall slowly, turning, fade in at the top and out at the foot, and now and then catch the light in a faint four-point star', () => {
  for (const a of glints) {
    const [f0, f1] = [frame(a, 20), frame(a, 20.5)];
    const shards = f0.filter((c) => c.comp === 'source-over');
    assert.ok(shards.length >= Math.floor(a.n * 0.6), `${shards.length} shards of ${a.n}`);
    assert.ok(shards.every((c) => c.img === shard(a.colors[0]) || a.colors.some((col) => shard(col) === c.img)), 'drawn from their sprites');
    const fell = shards.filter((c) => f1.some((d) => d.img === c.img && mid(d)[1] > mid(c)[1] && Math.abs(mid(d)[0] - mid(c)[0]) < 20 && mid(d)[1] - mid(c)[1] < 30)).length;
    assert.ok(fell >= shards.length * 0.7, `${fell} of ${shards.length} fell`);
    assert.ok(shards.every((c) => wide(c) > 0 && wide(c) <= a.size[1] * Math.SQRT2 + 1e-6), 'the entry\'s size (a turn only narrows it; the box of a tilted shard is at most a diagonal)');
    const alphas = [];
    let stars = 0;
    for (let t = 0; t < 120; t += 0.7) {
      frame(a, t).forEach((c) => {
        alphas.push(c.alpha);
        if (c.comp === 'lighter') {
          stars++;
          assert.ok(c.alpha <= a.alpha * 0.9 + 1e-9, 'a glint is fainter than its shard');
          assert.ok(wide(c) <= a.size[1] * 1.8 + 1e-6);
        }
      });
    }
    assert.ok(stars >= 3, `${stars} glints in two minutes`);
    assert.ok(alphas.some((x) => x < a.alpha * 0.2) && alphas.some((x) => x > a.alpha * 0.45), 'faint at the edges, strong between');
  }
  assert.ok(SHARD.spin <= 1.2 && SHARD.fall <= 1.2, 'slow');
});

test('candle sparks rise from the three stands of the near layer and follow it as the ship moves: warm, tiny, dim, living about two and a half seconds, gone at the top', () => {
  const a = sparks[0];
  assert.equal(a.n % STANDS.length, 0, 'the same number over each stand');
  const calls = frame(a, 7.7);
  assert.equal(calls.length, a.n);
  assert.ok(calls.every((c) => c.comp === 'lighter' && c.alpha <= a.alpha + 1e-9));
  const flameY = (h) => 1080 - 320 + BED - h - 24; // a flame's y in the frame
  for (const [i, c] of calls.entries()) {
    const [x, y] = mid(c);
    const [sx, sh] = STANDS[i % STANDS.length];
    assert.ok(Math.abs(x - (sx - 160)) < 36, `spark ${i} at ${Math.round(x)}, its stand at ${sx - 160}`);
    assert.ok(y <= flameY(sh) + 4 && y >= flameY(sh) - SPARK.rise * 1.5, `spark ${i} at y ${Math.round(y)}`);
    assert.ok(wide(c) <= a.size[1] * 3.4 + 1e-6 && wide(c) >= a.size[0] * 3.4 - 1e-6);
  }
  const [left, right] = [frame(a, 7.7, 400), frame(a, 7.7, 1500)];
  const dx = left.map((c, i) => mid(left[i])[0] - mid(right[i])[0]);
  assert.ok(dx.every((d) => Math.abs(d - 0.0825 * 1100) < 1), `every spark shifts with the layer: ${dx.map(Math.round)}`);
  const ys = new Set();
  for (let t = 0; t < 30; t += 0.4) frame(a, t).forEach((c) => ys.add(Math.round(mid(c)[1] / 10)));
  assert.ok(ys.size >= 6, 'they climb through a range of heights');
  const [u0, u1] = [frame(a, 5), frame(a, 5.3)];
  assert.ok(u0.filter((c, i) => mid(u1[i])[1] < mid(c)[1] || c.alpha < 0.02).length >= a.n - 1, 'climbing');
});

test('the ambient leaves line caps and joins, widths, colours, alpha and blend mode as it found them, whatever the ship\'s place', () => {
  for (const a of entries) {
    for (const t of [3, 12.6, 71]) {
      const ctx = stateful();
      const before = { ...ctx };
      AMBIENT8[a.kind](ctx, a, t, 40, 0, world(300));
      assert.deepEqual({ ...ctx }, before, `${a.kind} ${a.phase} at ${t}`);
    }
  }
  const ctx = stateful();
  AMBIENT8.candlesparks(ctx, sparks[0], 1, 0, 0, undefined);
  AMBIENT8.candlesparks(ctx, sparks[0], 1, 0, 0, {});
});
