import { test } from 'node:test';
import assert from 'node:assert/strict';
import { made, look, tracker, stateful } from './smogenv2-kit.js';

// World 17's ground flourishes under stand-in canvases (flourish-smog-ground.js): the kites that sail over the roofs once the air
// is clean (none before stage(h, 'life'), muted fabric, a string to a post on a roof, a tail of bows) and the low banks of smog
// along the street (at most 0.14 alpha, thinning as the sky clears, gone at h 1). Pure functions of (t, h), a drawing budget,
// nothing baked once the fight is on, no sprite cut off at its edge.
const { FLOURISH_SMOG } = await import('../../src/ui/flourish-smog.js');
const { KITES, TAIL, BANKS, kiteAt, warmGroundFx } = await import('../../src/ui/flourish-smog-ground.js');
const { FABRIC, KITE, BOW, BANK } = await import('../../src/ui/flourish-smog-ground-sprites.js');
const { KITE_POSTS } = await import('../../src/ui/parallax-smog-mid-plan.js');
const { drawFlourishes } = await import('../../src/ui/flourish.js');
const { stage } = await import('../../src/ui/heal.js');
const { hsl, magentaish } = await import('./smogenv2-kit.js');

const [X0, TOP] = [-160, 620]; // what the mid layer's hook hands a flourish
const env = (t, h, quality = 1) => ({ v: { look, heal: { h }, cache: {} }, world: { ship: { x: 960 } }, t, quality });
const run = (name, phase, t, h, quality = 1, ctx = tracker()) => {
  const x = phase === 'mid' ? [X0, TOP] : [0, 0];
  drawFlourishes(ctx.ctx, { ...env(t, h, quality), v: { look: { ...look, flourish: [name] }, heal: { h }, cache: {} } }, phase, ...x);
  return ctx;
};
const draws = (name, phase, t, h, q) => run(name, phase, t, h, q).calls;

test('the look names both flourishes and the registry holds them in the phases they live in', () => {
  assert.ok(look.flourish.includes('kites') && look.flourish.includes('smogbank'));
  assert.equal(typeof FLOURISH_SMOG.kites.mid, 'function');
  assert.equal(typeof FLOURISH_SMOG.smogbank.near, 'function');
});

test('warming bakes every sprite the flourishes draw: a long run at every healing makes no new sprite', () => {
  warmGroundFx();
  const warmed = made.length;
  assert.ok(warmed >= FABRIC.length * 3 + 1, `${warmed} sprites`);
  warmGroundFx();
  assert.equal(made.length, warmed, 'warming twice bakes nothing more');
  for (let t = 0; t < 300; t += 3.7) for (const h of [0, 0.3, 0.7, 1]) for (const [n, ph] of [['kites', 'mid'], ['smogbank', 'near']]) run(n, ph, t, h);
  assert.equal(made.length, warmed, 'nothing painted once the fight is on');
});

test('kites: none until the life stage begins, then six sail up, each tied to a post on a roof; at most 40 sprites; pure functions of t', () => {
  for (const h of [0, 0.3, 0.55, 0.6]) assert.equal(draws('kites', 'mid', 7, h).length, 0, `h ${h}`);
  assert.ok(stage(0.62, 'life') > 0 && draws('kites', 'mid', 7, 0.7).length > 0);
  const full = draws('kites', 'mid', 7, 1);
  assert.equal(KITES.length, 6);
  assert.equal(full.length, KITES.length * (1 + TAIL.bows), 'a kite and its bows each');
  assert.ok(full.length <= 40, `${full.length} sprites`);
  assert.deepEqual(full.map((c) => c.box), draws('kites', 'mid', 7, 1).map((c) => c.box), 'the same frame twice');
  assert.notDeepEqual(full.map((c) => c.box), draws('kites', 'mid', 12, 1).map((c) => c.box), 'they sail');
  assert.equal(draws('kites', 'mid', 7, 1, 0.5).length, 3 * (1 + TAIL.bows), 'every other kite at low quality');
  const at = {};
  for (let i = 0; i < KITES.length; i++) {
    kiteAt(i, 7, X0, TOP, at);
    const [px, py] = KITE_POSTS[KITES[i].post];
    assert.equal(at.ax, X0 + px);
    assert.equal(at.ay, TOP + py - 14);
    assert.ok(at.y < 440 && at.y > 150, `kite ${i} flies at y ${at.y}`);
    assert.ok(Math.abs(at.a) <= 0.23, 'its lean');
    assert.ok(Math.hypot(at.x - at.ax, at.y - at.ay) > 250, 'a long string');
  }
});

test('kites are small, muted and dim: each at most 60 px, never above the top of the frame nor low in the player\'s zone, in fabric colours that are never magenta, alpha follows the life stage', () => {
  for (const t of [1, 7, 19, 33]) {
    const calls = draws('kites', 'mid', t, 1);
    const kites = calls.filter((c) => c.box[3] - c.box[1] > 30 && c.box[3] - c.box[1] < 70);
    assert.ok(kites.length >= 6);
    for (const c of calls) {
      assert.ok(c.box[2] - c.box[0] <= 60 && c.box[3] - c.box[1] <= 70, `${c.box}`);
      assert.ok(c.box[1] > 100 && c.box[3] < 560, `y ${c.box[1]}..${c.box[3]}`);
      assert.ok(c.alpha === 1 && c.comp === 'source-over');
    }
  }
  assert.ok(draws('kites', 'mid', 7, 0.8).every((c) => c.alpha > 0 && c.alpha < 1), 'fading in');
  for (const c of FABRIC) assert.ok(!magentaish(c) && !(hsl(c).h >= 290 && hsl(c).s > 0.4), c);
  assert.ok(FABRIC.length === 5);
});

test('the kite sprites keep 1 px clear of every side of their boxes', () => {
  const sized = (w, h) => made.filter((c) => c.width === w && c.height === h && Number.isFinite(c.T.bounds.x0));
  const clear = (c) => c.T.bounds.x0 >= 0.5 && c.T.bounds.y0 >= 0.5 && c.T.bounds.x1 <= c.width - 0.5 && c.T.bounds.y1 <= c.height - 0.5;
  const dims = (c) => `${c.width}x${c.height}: ${['x0', 'y0', 'x1', 'y1'].map((k) => Math.round(c.T.bounds[k] * 10) / 10).join(',')}`;
  assert.equal(sized(KITE.w, KITE.h).length, FABRIC.length);
  assert.equal(sized(KITE.boxW, KITE.boxH).length, FABRIC.length);
  assert.equal(sized(BOW.w, BOW.h).length, FABRIC.length);
  for (const c of [...sized(KITE.w, KITE.h), ...sized(KITE.boxW, KITE.boxH), ...sized(BOW.w, BOW.h)]) assert.ok(clear(c), dims(c));
});

test('smog banks: low and soft behind the player\'s zone, at most 0.14 alpha, thinning as the sky clears and gone by h 1; a function of t', () => {
  const at = (h) => draws('smogbank', 'near', 9, h);
  const full = at(0);
  assert.equal(full.length, BANKS.rows.length);
  for (const c of full) {
    assert.ok(c.alpha > 0 && c.alpha <= 0.14 + 1e-9, `alpha ${c.alpha}`);
    assert.ok(c.box[1] >= 760 && c.box[3] < 1115, `y ${c.box[1]}..${c.box[3]}`);
    assert.ok(c.comp === 'source-over');
  }
  assert.ok(Math.max(...at(0.5).map((c) => c.alpha)) < Math.max(...full.map((c) => c.alpha)), 'thinner halfway');
  assert.equal(at(1).length, 0);
  assert.deepEqual(at(0).map((c) => c.box), draws('smogbank', 'near', 9, 0).map((c) => c.box));
  assert.notDeepEqual(at(0).map((c) => c.box), draws('smogbank', 'near', 40, 0).map((c) => c.box), 'they drift');
  assert.equal(draws('smogbank', 'near', 9, 0, 0.5).length, 2, 'every other bank at low quality');
  assert.ok(BANK.w >= 600);
});

test('every flourish leaves the line caps and joins, widths, colours, alpha and blend mode as it found them', () => {
  for (const h of [0, 0.7, 1]) {
    for (const [n, ph] of [['kites', 'mid'], ['smogbank', 'near']]) {
      const ctx = stateful();
      const before = { ...ctx };
      run(n, ph, 11, h, 1, { ctx, calls: [] });
      assert.deepEqual({ ...ctx }, before, `${n} h ${h}`);
    }
  }
});

test('the kite and bank loops allocate nothing per frame: no array or object literals, closures, spreads or array helpers in the drawing', () => {
  for (const [name, phase] of [['kites', 'mid'], ['smogbank', 'near']]) {
    const whole = FLOURISH_SMOG[name][phase].toString().replace(/\/\/.*$/gm, '').replace(/'[^']*'/g, '""');
    const src = whole.slice(whole.indexOf(') {') + 3);
    for (const re of [/Array\.from/, /\.(map|filter|forEach|reduce)\(/, /\.\.\./, /=>/, /\bnew\b/, /[=(,]\s*\[/, /[=(,:]\s*\{/, /\bfunction\b/]) assert.ok(!re.test(src), `${name}: ${re}`);
  }
});
