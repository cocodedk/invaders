import { test } from 'node:test';
import assert from 'node:assert/strict';
import { made, look, tracker, hsl, magentaish } from './smogenv2-kit.js';

// World 17's ambient kinds under stand-in canvases (ambient-9.js): ash falling like grey snow and thinning to nothing by h 0.75,
// wide faint ribbons of smoke scaled away by 1 - stage(h, 'wisps'), and pollen that appears with the life stage. Each draws at
// most 60 sprites, stays at or under its entry's alpha (so the bullets, hot magenta, stay the loudest things on screen), is a
// pure function of (index, t, drift, h), allocates nothing per frame, and nothing is baked once the fight is on.
const { drawAmbient } = await import('../../src/ui/ambient.js');
const { AMBIENT9, MAX, warmSmogAmbient } = await import('../../src/ui/ambient-9.js');
const { FLAKE, RIBBON, SEED } = await import('../../src/ui/ambient-9-sprites.js');
const { stage } = await import('../../src/ui/heal.js');
const { rgb } = await import('../../src/ui/sprites.js');

const entries = look.ambient;
const of = (kind) => entries.filter((a) => a.kind === kind);
const [ash, wisps, pollen] = ['ashfall', 'smokewisps', 'pollen'].map(of);
const frame = (a, t, h, drift = 0) => {
  const T = tracker();
  drawAmbient(T.ctx, { ...look, ambient: [a] }, a.phase, { t, drift, wind: 0, world: { ship: { x: 960 } }, heal: h });
  return T.calls;
};

test('warming bakes the sprites of every entry, so drawing them at any healing bakes nothing', () => {
  warmSmogAmbient(look);
  const warmed = made.length;
  assert.ok(warmed >= 18, `${warmed} sprites baked ahead of the fight`);
  for (let t = 0; t < 120; t += 7.3) for (const h of [0, 0.3, 0.7, 1]) for (const a of entries) frame(a, t, h);
  assert.equal(made.length, warmed, 'nothing baked while drawing');
  warmSmogAmbient(look);
  assert.equal(made.length, warmed, 'warming again bakes nothing');
});

test('no flake or seed sprite is cut off at its edge: everything drawn keeps 1 px clear of every side of its box', () => {
  const sized = (w) => made.filter((c) => c.width === w && c.height === w && Number.isFinite(c.T.bounds.x0));
  const clear = (c) => c.T.bounds.x0 >= 1 && c.T.bounds.y0 >= 1 && c.T.bounds.x1 <= c.width - 1 && c.T.bounds.y1 <= c.height - 1;
  const dims = (c) => `${c.width}: ${['x0', 'y0', 'x1', 'y1'].map((k) => Math.round(c.T.bounds[k] * 10) / 10).join(',')}`;
  const flakes = sized(FLAKE.box);
  const colors = new Set(ash.flatMap((a) => a.colors));
  assert.equal(flakes.length, colors.size * FLAKE.shapes, 'every shape in every colour');
  for (const c of flakes) assert.ok(clear(c), dims(c));
  const seeds = sized(SEED.box);
  assert.equal(seeds.length, new Set(pollen.flatMap((a) => a.colors)).size);
  for (const c of seeds) assert.ok(clear(c), dims(c));
});

test('the registry holds the three kinds, and the look draws ash in three phases, wisps in one and pollen in one, in few and soft particles', () => {
  assert.deepEqual([ash.length, wisps.length, pollen.length], [3, 1, 1]);
  assert.deepEqual(ash.map((a) => a.phase), ['sky', 'mid', 'front']);
  for (const k of ['ashfall', 'smokewisps', 'pollen']) assert.equal(typeof AMBIENT9[k], 'function');
  for (const a of entries) assert.ok(a.n <= MAX, `${a.kind} ${a.phase}: n ${a.n}`);
  assert.ok(entries.reduce((s, a) => s + a.n, 0) <= 200);
});

test('ash thins as the city heals: the full count at h 0, fewer at every step, none at h 0.75 and after; the last flake fades before it goes', () => {
  for (const a of ash) {
    const n = (h) => frame(a, 9, h).length;
    assert.equal(n(0), a.n, `${a.phase}: all ${a.n}`);
    let prev = n(0);
    for (const h of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]) {
      const now = n(h);
      assert.ok(now <= prev, `${a.phase} h ${h}`);
      prev = now;
    }
    assert.ok(n(0.5) < n(0) * 0.8 && n(0.5) > 0, `${a.phase}: partway at 0.5`);
    assert.equal(n(0.75), 0);
    assert.equal(n(1), 0);
    const calls = frame(a, 9, 0.4);
    assert.ok(calls.at(-1).alpha <= calls.at(-2).alpha + 1e-9 || calls.length < 2, 'the last one is the faintest or as strong as the rest');
  }
  assert.deepEqual([stage(0.75, 'ash'), stage(0, 'ash')], [1, 0]);
});

test('ash is soft and quiet: alpha never above the entry\'s, flakes small, greys only (never magenta), each phase a different pattern, tumbling and falling', () => {
  for (const a of ash) {
    const calls = frame(a, 9, 0);
    assert.ok(calls.every((c) => c.alpha <= a.alpha + 1e-9 && c.alpha >= 0), a.phase);
    assert.ok(calls.every((c) => c.box[2] - c.box[0] <= a.size[1] * 4.4 * 1.45 && c.box[3] - c.box[1] <= a.size[1] * 4.4 * 1.45), 'a flake is small (even turned)');
    for (const c of a.colors) {
      assert.ok(Math.max(...rgb(c)) - Math.min(...rgb(c)) < 40 && !magentaish(c), `${c} is a grey`);
      assert.ok(Math.min(...rgb(c)) < 240, `${c} is not a white speck`);
    }
    assert.notDeepEqual(calls.map((c) => c.box), frame(a, 10, 0).map((c) => c.box), 'ash falls');
    assert.deepEqual(calls.map((c) => c.box), frame(a, 9, 0).map((c) => c.box), 'the same frame twice');
    assert.notDeepEqual(calls.map((c) => c.box), frame(a, 9, 0, 300).map((c) => c.box), 'the wind drift carries it');
  }
  assert.notDeepEqual(frame(ash[0], 9, 0).map((c) => c.box), frame(ash[1], 9, 0).map((c) => c.box), 'phases do not repeat one pattern');
  const ys = frame(ash[0], 9, 0).map((c) => (c.box[1] + c.box[3]) / 2);
  assert.ok(Math.min(...ys) < 200 && Math.max(...ys) > 800, 'flakes over the whole frame');
});

test('smoke wisps: wide and faint, scaled away as stage(h, wisps) rises and gone by h 0.8', () => {
  const [a] = wisps;
  const n = (h) => frame(a, 20, h).length;
  assert.equal(n(0), a.n);
  assert.ok(n(0.2) <= n(0) && n(0.4) < n(0.1) && n(0.6) < n(0.4), 'fewer as it heals');
  assert.equal(n(0.8), 0);
  assert.equal(n(1), 0);
  for (const c of frame(a, 20, 0)) {
    assert.ok(c.alpha <= a.alpha + 1e-9, 'at or under the entry alpha');
    const w = c.box[2] - c.box[0];
    assert.ok(w >= a.size[0] - 1 && w <= a.size[1] * 1.15 + 1, `${w} px wide`);
    assert.ok(c.box[3] - c.box[1] < w * 0.4, 'a ribbon, wider than tall');
  }
  assert.ok(a.alpha <= 0.2 && a.maxY <= 0.8);
  assert.notDeepEqual(frame(a, 20, 0).map((c) => c.box), frame(a, 30, 0).map((c) => c.box), 'they drift');
});

test('pollen: nothing at h 0 or until the life stage begins, more and more after, additive, at most 0.4, small and soft, never magenta', () => {
  const [a] = pollen;
  const n = (h) => frame(a, 12, h).length;
  assert.equal(n(0), 0);
  assert.equal(n(0.5), 0);
  assert.equal(n(0.6), 0);
  assert.ok(n(0.7) > 0 && n(0.7) < n(0.85) && n(0.85) <= n(1), 'more as the morning comes');
  assert.equal(n(1), a.n);
  const calls = frame(a, 12, 1);
  assert.ok(calls.every((c) => c.alpha <= 0.4 + 1e-9), 'alpha at most 0.4');
  assert.ok(calls.filter((c) => c.comp === 'lighter').length >= calls.length * 0.8, 'the motes are additive');
  assert.ok(calls.every((c) => c.box[2] - c.box[0] <= SEED.box * 1.1 * 1.45), 'tiny (even turned)');
  for (const c of a.colors) {
    const { h, s } = hsl(c);
    assert.ok(!magentaish(c) && (s < 0.5 || (h > 40 && h < 140)), `${c}: pale warm white-gold or green`);
    assert.ok(Math.min(...rgb(c)) < 235, `${c} is not a white orb`);
  }
  assert.notDeepEqual(calls.map((c) => c.box), frame(a, 13, 1).map((c) => c.box), 'they float');
  const ys = calls.map((c) => c.box[3]);
  assert.ok(Math.max(...ys) <= 1080 * a.maxY + 40, 'above the street');
});

test('every entry stays inside its drawing budget, whatever the healing', () => {
  for (const a of entries) for (const h of [0, 0.3, 0.6, 1]) assert.ok(frame(a, 5, h).length <= MAX, `${a.kind} ${a.phase} h ${h}`);
});

test('the hot loops allocate nothing per frame: no array or object literals, closures, spreads, destructuring of fresh arrays or array helpers in the three kinds', () => {
  for (const k of ['ashfall', 'smokewisps', 'pollen']) {
    const whole = AMBIENT9[k].toString().replace(/\/\/.*$/gm, '').replace(/'[^']*'/g, '""');
    const src = whole.slice(whole.indexOf(') {') + 3); // the body: the function's own head is no allocation
    for (const re of [/Array\.from/, /\.(map|filter|forEach|reduce)\(/, /\.\.\./, /=>/, /\bnew\b/, /[=(,]\s*\[/, /[=(,:]\s*\{/, /\bfunction\b/]) assert.ok(!re.test(src), `${k}: ${re}`);
  }
  assert.ok(FLAKE.shapes === 3 && RIBBON.variants === 3);
});
