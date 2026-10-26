import { test } from 'node:test';
import assert from 'node:assert/strict';
import { made, look, frame, env, PHASE, FAR_TOP, W, H, tracker, drawFlourishes, stateful, roseish } from './storm-kit.js';
import { recorder } from './dom-kit.js';

// World 18's backdrop under stand-in canvases: the sky body, the three layers, the ambient kinds and the flourishes with the lightning that drives
// them. Every flourish is a pure function of the time, quiet when the sky is, within its draw budget, leaves the context as it found it, and nothing
// is baked once the fight is on (the far layer's painter bakes the sprites with the layers); the lightning's schedule keeps every strike inside its slot.
const { buildSky } = await import('../../src/ui/sky.js');
const { buildLayers } = await import('../../src/ui/parallax.js');
const { drawAmbient } = await import('../../src/ui/ambient.js');
const { SUN, SLIT } = await import('../../src/ui/sky-bodies-10-kit.js');
const { TOWERS, SEA } = await import('../../src/ui/parallax-storm-anvil.js');
const { PILLARS } = await import('../../src/ui/parallax-storm-mid.js');
const { SUN_X } = await import('../../src/ui/parallax-storm-kit.js');
const { strike, flashAt, SLOT, CHANCE, BOLTS } = await import('../../src/ui/flourish-storm-model.js');
const { BOLT, warmStormFx } = await import('../../src/ui/flourish-storm-sprites.js');
const { AMBIENT10 } = await import('../../src/ui/ambient-10.js');

const layers = buildLayers(look, 3);
const key = (l) => JSON.stringify(l.lights);
const times = (n, f) => Array.from({ length: n }, (_, i) => f(i));
// The first t from `from` (on a 0.05 s grid) at which a strike with these properties is on.
const seek = (ok, from = 0) => {
  for (let t = from; t < 4000; t += 0.05) if (ok(strike(t), t)) return t;
  throw new Error('no such strike');
};
const QUIET = seek((s) => s.k === 0);

test('the sky body paints, and the sun sits in the slit of clear sky between the deck and the sea', () => {
  buildSky(look);
  assert.ok(SUN.y > SLIT.y1 && SUN.y < SLIT.y2, `sun y ${SUN.y} in the slit ${SLIT.y1}..${SLIT.y2}`);
  assert.ok(SUN.x > W * 0.55 && SUN.x < W * 0.85, 'low on the right');
  assert.equal(SUN_X, SUN.x + 160, "the sun's x in a layer (parallax.js MARGIN)");
});

test('three layers, each carrying its lights; the far towers and the mid pillars leave the gap the sun shows through', () => {
  assert.deepEqual(layers.map((l) => [l.top, l.speed, l.far]), [[380, 0.06, true], [620, 0.22, false], [760, 0.55, false]]);
  assert.equal(key(buildLayers(look, 3)[0]), key(layers[0]), 'seeded, so a level always looks the same');
  for (const T of TOWERS) assert.ok(Math.abs(T.x - SUN_X) > T.wc + 150, `a tower's column at ${T.x} keeps clear of the sun at ${SUN_X}`);
  for (const P of PILLARS) assert.ok(Math.abs(P.x + P.lean * 0.5 - SUN_X) > P.wc + 120, `a pillar at ${P.x} keeps clear of the sun`);
  assert.ok(SEA > 400 && SEA < 640, 'the sea is the lower part of the far layer');
  for (const [i, l] of layers.entries()) {
    const h = look.layers[i].height;
    assert.ok(l.lights.length >= 3, `layer ${i} has lights`);
    for (const p of l.lights) {
      assert.ok(p.x >= 0 && p.x <= 2240 && p.y >= 0 && p.y <= h, `a light of layer ${i} lies in its band`);
      assert.ok(['pulse', 'flicker'].includes(p.mode), p.mode);
      assert.ok(p.a > 0 && p.a <= 0.3 && p.r > 0 && p.r <= 190, `dim and not huge: a ${p.a} r ${p.r}`);
      assert.ok(!roseish(p.color), `${p.color} is the bullets' colour`);
    }
  }
  assert.equal(layers[0].lights.length, TOWERS.length * 2, 'two lights in every far tower: the anvil flickers, the column pulses');
});

test('the lightning schedule: a strike stays in its slot, begins with a double flash and dies away, and the fork, the tower and the place are in range', () => {
  assert.equal(strike(1), strike(2), 'one shared object: nothing is allocated');
  let struck = 0;
  for (let i = 0; i < 400; i++) {
    let first = null;
    for (let t = i * SLOT; t < (i + 1) * SLOT; t += 0.02) {
      const s = strike(t);
      assert.ok(s.k >= 0 && s.k <= 1, `light ${s.k}`);
      if (s.k <= 0) continue;
      first ??= s.age;
      assert.ok(s.age >= 0 && s.age <= 1.0001, `age ${s.age}`);
      assert.ok(s.tower >= 0 && s.tower < TOWERS.length && s.dx >= -1 && s.dx <= 1 && s.power >= 0.5 && s.power <= 1);
      assert.ok(s.bolt < BOLTS, 'a drawing that exists');
    }
    if (first !== null) struck++;
    assert.equal(strike((i + 1) * SLOT - 0.0005).k, 0, 'a strike is over before the next slot');
  }
  assert.ok(Math.abs(struck / 400 - CHANCE) < 0.07, `${struck} of 400 slots hold a strike`);
  assert.equal(flashAt(-1), 0);
  assert.ok(flashAt(0.05) > 0.95 && flashAt(0.13) < 0.4 && flashAt(0.23) > 0.6 && flashAt(1) < 0.02, 'two flashes with a dip between, then the glow dies');
  let forks = 0;
  for (let i = 0; i < 2000; i++) if (strike(i * 0.37).bolt >= 0 && strike(i * 0.37).k > 0) forks++; // (strike hands back one shared object)
  assert.ok(forks > 20, `${forks} frames with a bolt in them`);
  const sample = () => times(6, (i) => { const s = strike(i * 3.3 + 0.7); return [s.k, s.bolt, s.tower]; });
  assert.deepEqual(sample(), sample(), 'a pure function of t');
});

test('a quiet sky draws nothing: no wash, no bolt, in any phase', () => {
  for (const phase of Object.keys(PHASE)) for (const name of ['stormsheet', 'stormbolts']) assert.equal(frame(name, phase, QUIET).length, 0, `${name} ${phase}`);
});

test('sheet lightning washes the sky round the struck far tower, lights it from inside, and the pillars before it; the bolt falls from its anvil to the sea', () => {
  const t = seek((s) => s.k > 0.55 && s.bolt >= 0);
  const s = strike(t);
  const T = TOWERS[s.tower];
  const sky = frame('stormsheet', 'sky', t);
  assert.ok(sky.length >= 1 && sky.length <= 2 && sky.every((c) => c.comp === 'lighter' && c.alpha > 0 && c.alpha <= 1), 'additive washes');
  const mid = (sky[0].box[0] + sky[0].box[2]) / 2;
  assert.ok(Math.abs(mid - (T.x - 160)) < 40, 'centred on the tower');
  const far = frame('stormsheet', 'far', t);
  assert.equal(far.length, TOWERS.length, 'every tower catches a share');
  assert.equal(Math.max(...far.map((c) => c.alpha)), far[s.tower].alpha, 'the struck one most');
  assert.equal(frame('stormsheet', 'mid', t).length, 1);
  const bolt = frame('stormbolts', 'far', t);
  assert.ok(bolt.length === 3 && bolt.every((c) => c.comp === 'lighter'), 'the bolt, where it lands and where it leaves the cloud');
  const x = (bolt[0].box[0] + bolt[0].box[2]) / 2;
  assert.ok(Math.abs(x - (T.x - 160)) <= T.wc * 1.2 + 1, "it falls within the struck tower's column");
  assert.ok(bolt[0].box[1] >= FAR_TOP && Math.abs(bolt[0].box[3] - (FAR_TOP + SEA + 50)) < 1, 'from the anvil to the sea');
  assert.equal(bolt[0].img.width, BOLT.w);
  const sheetOnly = seek((q) => q.k > 0.5 && q.bolt < 0);
  assert.equal(frame('stormbolts', 'far', sheetOnly).length, 0, 'a strike that does not fork draws no bolt');
  assert.ok(frame('stormsheet', 'sky', sheetOnly).length > 0);
});

test('the curtains, the sun, the gusts and the front wash: their draw budgets, at full and half quality', () => {
  for (const [name, phase, full, half] of [['stormcurtains', 'far', 1, 1], ['stormcurtains', 'mid', 2, 1], ['stormsun', 'sky', 5, 3], ['stormgusts', 'near', 4, 2]]) {
    assert.equal(frame(name, phase, QUIET).length, full, `${name} ${phase}`);
    assert.equal(frame(name, phase, QUIET, 0.5).length, half, `${name} ${phase} at half quality`);
  }
  const r = recorder();
  drawFlourishes(r.ctx, env(['stormsheet'], seek((s) => s.k > 0.3)), 'front');
  assert.equal(r.calls.filter(([k]) => k === 'fillRect').length, 1, 'one flat wash over the frame');
  assert.equal(frame('stormsheet', 'front', QUIET).length, 0);
  for (const c of frame('stormsun', 'sky', QUIET).slice(0, 4)) assert.ok(c.alpha <= 0.25 && c.comp === 'lighter', "the sun's beams are faint and additive");
  for (const c of frame('stormgusts', 'near', QUIET)) assert.ok(c.alpha <= 0.2 && c.comp === 'source-over', 'the scud is quiet and dark');
});

test('every flourish is a pure function of t, leaves the context as it found it, and bakes nothing once the fight is on', () => {
  warmStormFx();
  const warmed = made.length;
  warmStormFx();
  assert.equal(made.length, warmed, 'warming twice bakes nothing more');
  const t = seek((s) => s.k > 0.5 && s.bolt >= 0);
  for (const name of ['stormsheet', 'stormbolts', 'stormcurtains', 'stormsun', 'stormgusts']) {
    for (const phase of Object.keys(PHASE)) {
      const a = frame(name, phase, t).map((c) => [c.alpha, c.comp, c.box]);
      assert.deepEqual(frame(name, phase, t).map((c) => [c.alpha, c.comp, c.box]), a, `${name} ${phase}`);
      const ctx = stateful();
      drawFlourishes(ctx, env([name], t), phase, ...PHASE[phase]);
      assert.equal(ctx.globalAlpha, 1, `${name} ${phase} leaves the alpha`);
      assert.equal(ctx.globalCompositeOperation, 'source-over', `${name} ${phase} leaves the composite`);
    }
  }
  for (let q = 0; q < 300; q += 1.7) for (const name of look.flourish) for (const phase of Object.keys(PHASE)) frame(name, phase, q);
  assert.deepEqual(made.slice(warmed).filter((c) => c.width * c.height > 400).map((c) => `${c.width}x${c.height}`), [], 'nothing is painted once the fight is on');
});

test('stormrain strokes once a colour in the slant of the wind; staticglints flare now and then, additive, and are quiet', () => {
  const entry = look.ambient.find((a) => a.kind === 'stormrain' && a.phase === 'mid');
  const r = recorder();
  drawAmbient(r.ctx, { ...look, ambient: [entry] }, 'mid', { t: 3.3, drift: 0, wind: 0, world: {} });
  assert.equal(r.calls.filter(([k]) => k === 'stroke').length, entry.colors.length, 'one stroke a colour');
  assert.equal(r.calls.filter(([k]) => k === 'moveTo').length, entry.n, 'every drop a line');
  const slant = (wind) => {
    const q = recorder();
    AMBIENT10.stormrain(q.ctx, entry, 1, 0, wind);
    const [m, l] = [q.calls.find(([k]) => k === 'moveTo'), q.calls.find(([k]) => k === 'lineTo')];
    return (m[1] - l[1]) / (m[2] - l[2]);
  };
  assert.ok(slant(0) > 0.2 && slant(0) < 0.5, `rain leans with the gale: ${slant(0)}`);
  assert.ok(slant(300) > slant(0) && slant(-300) < slant(0), 'and more with the wind');
  const g = look.ambient.find((a) => a.kind === 'staticglints');
  let lit = 0;
  for (let i = 0; i < 400; i++) {
    const q = recorder();
    AMBIENT10.staticglints(q.ctx, g, i * 0.5, 0);
    const images = q.calls.filter(([k]) => k === 'drawImage');
    assert.ok(images.length <= g.n * 2, `${images.length} draws`);
    for (const c of images) assert.ok(c.alpha <= g.alpha + 1e-9, `alpha ${c.alpha}`);
    if (images.length) lit++;
  }
  assert.ok(lit > 40 && lit < 400, `sparks in ${lit} of 400 frames`);
});

test('a strike frame of every flourish costs a handful of draws and stays near the frame', () => {
  const t = seek((s) => s.k > 0.55 && s.bolt >= 0);
  const T = tracker();
  for (const phase of ['sky', 'far', 'mid', 'near', 'front']) drawFlourishes(T.ctx, env(look.flourish, t), phase, ...PHASE[phase]);
  assert.ok(T.calls.length <= 40, `${T.calls.length} draws in a strike frame`);
  assert.ok(T.bounds.y1 <= H + 700 && T.bounds.x0 > -1500, 'nothing wanders off');
});
