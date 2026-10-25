import { test } from 'node:test';
import assert from 'node:assert/strict';
import { look, made, frame, rec, env, PHASE, drawFlourishes, stateful, W } from './smogenv1-kit.js';

// World 17's sky flourishes besides the cigarettes (flourish-smog-sky.js): smokeroll (banks of smoke rolling above the skyline, gone with
// the smog), sunbeams (shafts from the sun, breaking through from h 0.45) and skybirds (flocks over the clean sky, from h 0.6). Pure
// functions of t and h, quiet, within the draw budget, nothing baked once the fight is on, and the registry that joins them to the
// cigarettes and the warm function the view calls.
const { warmBreath } = await import('../../src/ui/warm-breath.js');
const { FLOURISH_SKY, ROLL, BEAMS, BIRDS } = await import('../../src/ui/flourish-smog-sky.js');
const { FLOURISH_SMOG } = await import('../../src/ui/flourish-smog.js');
const { SUN } = await import('../../src/ui/sky-bodies-9.js');
const { BANK, BEAM, BIRD } = await import('../../src/ui/flourish-smog-sky-sprites.js');

test('warming (through the view\'s warm-breath.js) bakes every sprite first; a long run of every sky flourish at every healing then bakes none large', () => {
  const before = made.length;
  warmBreath(look);
  assert.ok(made.length - before >= 60, `${made.length - before} sprites baked up front`);
  const warmed = made.length;
  warmBreath(look);
  assert.equal(made.length, warmed, 'twice bakes nothing more');
  for (let h = 0; h <= 1.001; h += 0.1) for (let t = 0; t < 200; t += 17.3) for (const n of ['smokeroll', 'sunbeams', 'skybirds']) frame(n, 'sky', h, t);
  assert.deepEqual(made.slice(warmed).filter((c) => c.width * c.height > 400).map((c) => `${c.width}x${c.height}`), []);
});

test('the registry has the four flourishes at their depths, in the game\'s table and in the look', () => {
  assert.deepEqual(Object.keys(FLOURISH_SKY).sort(), ['cigarettes', 'skybirds', 'smokeroll', 'sunbeams']);
  assert.deepEqual(Object.fromEntries(Object.entries(FLOURISH_SKY).map(([k, v]) => [k, Object.keys(v)])), { smokeroll: ['sky'], sunbeams: ['sky'], skybirds: ['sky'], cigarettes: ['far'] });
  for (const k of Object.keys(FLOURISH_SKY)) {
    assert.equal(FLOURISH_SMOG[k], FLOURISH_SKY[k], `${k} is in flourish-smog.js`);
    assert.ok(look.flourish.includes(k), `${k} is in the look`);
  }
});

test('smokeroll: six faint banks of smoke at different heights and speeds, gone as the smog goes, fewer at low quality', () => {
  const a = frame('smokeroll', 'sky', 0, 12);
  assert.equal(a.length, ROLL.n);
  for (const c of a) {
    assert.ok(c.comp === 'source-over' && c.alpha >= ROLL.alpha[0] * 0.8 && c.alpha <= ROLL.alpha[1] + 1e-9, `alpha ${c.alpha}`);
    const [w, cy] = [c.box[2] - c.box[0], (c.box[1] + c.box[3]) / 2];
    assert.ok(w >= BANK.w * 0.8 && w <= BANK.w * 1.8 && cy > 120 && cy < 570, `${Math.round(w)} wide at y ${Math.round(cy)}`);
  }
  assert.equal(new Set(a.map((c) => Math.round((c.box[1] + c.box[3]) / 20))).size, ROLL.n, 'every one at a height of its own');
  const b = frame('smokeroll', 'sky', 0, 13);
  const moved = a.map((c, i) => b[i].box[0] - c.box[0]);
  assert.ok(moved.every((d) => d > 0 && d < 20), `slow: ${moved.map((d) => d.toFixed(1))}`);
  assert.ok(new Set(moved.map((d) => d.toFixed(2))).size >= 5, 'at speeds of their own');
  assert.ok(frame('smokeroll', 'sky', 0.4, 12).every((c, i) => c.alpha < a[i].alpha));
  assert.equal(frame('smokeroll', 'sky', 0.9, 12).length, 0, 'a healed sky is clear');
  assert.equal(frame('smokeroll', 'sky', 0, 12, 0.5).length, 3);
});

test('sunbeams: five additive shafts from the sun, none before h 0.45, each at most 0.08 strong, swaying and breathing', () => {
  assert.equal(frame('sunbeams', 'sky', 0.4, 9).length, 0);
  assert.equal(frame('sunbeams', 'sky', 0, 9).length, 0);
  const a = frame('sunbeams', 'sky', 0.9, 9);
  assert.equal(a.length, BEAMS.n);
  for (const c of a) assert.ok(c.comp === 'lighter' && c.alpha > 0 && c.alpha <= 0.08 + 1e-9, `alpha ${c.alpha}`);
  assert.ok(BEAMS.alpha <= 0.08);
  const r = rec('sunbeams', 'sky', 0.9, 9);
  assert.equal(r.filter(([k, x, y]) => k === 'translate' && x === SUN.x && y === SUN.y).length, BEAMS.n, 'every shaft starts at the sun');
  const [b, c2] = [frame('sunbeams', 'sky', 0.9, 31), frame('sunbeams', 'sky', 0.6, 9)];
  assert.notDeepEqual(a.map((c) => c.alpha), b.map((c) => c.alpha), 'they breathe');
  assert.ok(c2.length === BEAMS.n && c2.every((c, i) => c.alpha < a[i].alpha * 1.01 + 1e-9) || c2.length > 0, 'and grow with h');
  assert.ok(BEAM.w * 1.3 < 400 && BEAM.h >= 900, 'a long soft shaft');
  assert.equal(frame('sunbeams', 'sky', 0.9, 9, 0.5).length, 3, 'every other shaft at low quality');
});

test('skybirds: none before h 0.6; flocks and stragglers after, dark and small, in the frame, wings in three poses, more as the city heals', () => {
  assert.equal(frame('skybirds', 'sky', 0.5, 30).length, 0);
  const full = frame('skybirds', 'sky', 1, 30);
  assert.ok(full.length >= 12 && full.length <= BIRDS.flocks.reduce((s, f) => s + f.n, BIRDS.stragglers), `${full.length} birds`);
  for (const c of full) {
    assert.ok(c.box[2] - c.box[0] <= BIRD.w + 1e-6 && c.alpha > 0.3 && c.alpha <= 0.75, `${c.alpha}`);
    assert.ok(c.box[0] > -60 && c.box[2] < W + 60 && c.box[1] > 100 && c.box[3] < 720, 'in the sky above the skyline');
  }
  assert.ok(frame('skybirds', 'sky', 0.75, 30).length < full.length, 'fewer while it heals');
  assert.ok(frame('skybirds', 'sky', 1, 30, 0.5).length < full.length);
  const poses = new Set();
  for (let t = 0; t < 4; t += 0.2) frame('skybirds', 'sky', 1, 30 + t).forEach((c) => poses.add(c.img));
  assert.equal(poses.size, 3, 'up, level, down');
  const lead = (t) => Math.min(...frame('skybirds', 'sky', 1, t).map((c) => c.box[0]));
  assert.notEqual(lead(30), lead(31), 'they fly');
});

test('every sky flourish is a pure function of t and h, and leaves the context as it found it', () => {
  for (const name of ['smokeroll', 'sunbeams', 'skybirds', 'cigarettes']) {
    const phase = Object.keys(FLOURISH_SKY[name])[0];
    for (const h of [0, 0.4, 0.7, 1]) {
      const ctx = stateful();
      const before = { ...ctx };
      drawFlourishes(ctx, env([name], h, 17.5), phase, ...PHASE[phase]);
      assert.deepEqual({ ...ctx }, before, `${name} at ${h}`);
      assert.deepEqual(frame(name, phase, h, 17.5).map((c) => c.box), frame(name, phase, h, 17.5).map((c) => c.box), `${name} twice`);
    }
  }
});

test('all four together stay within budget at 0, 0.3, 0.6 and 1: at most 60 images, and the sky flourishes alone at most 30', () => {
  const all = [['smokeroll', 'sky'], ['sunbeams', 'sky'], ['skybirds', 'sky'], ['cigarettes', 'far']];
  for (const h of [0, 0.3, 0.6, 1]) {
    for (const t of [3, 30, 77]) {
      const n = all.reduce((s, [name, phase]) => s + frame(name, phase, h, t).length, 0);
      assert.ok(n <= 60, `${n} images at h ${h}, t ${t}`);
      assert.ok(n - frame('cigarettes', 'far', h, t).length <= 30);
    }
  }
});
