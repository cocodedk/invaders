import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recorder } from './dom-kit.js';
import { stateful } from './glass-env-kit.js';

// Glass Cathedral's light flourishes under stand-in canvases (glass-env-mover.test.js has the ones that move on the layers, and
// glass-env-ambient.test.js the ambient): the slanting shafts, the patches of window light and the generic low mist, with the
// registry, the sprite bakes and the draw budget of all six. Every one must stay quiet (the bullets, the pickups and the ship
// are the loudest things on screen), stay where it belongs, leave the context as it found it, and be a pure function of the
// time; nothing is baked once the fight is on.
const { made, look, W, PHASE, env, frame, rec, shows, drawFlourishes } = await import('./glass-env-fx-kit.js');
const { SHAFTS, PATCHES, shaftAt, FLOURISH_GLASS } = await import('../../src/ui/flourish-glass.js');
const { SHAFT, PATCH, FAN } = await import('../../src/ui/flourish-glass-sprites.js');
const { DOVE } = await import('../../src/ui/flourish-glass-sprites-2.js');
const { warmGlassEnv } = await import('../../src/ui/warm-glass-env.js');

test('warming first bakes everything the live flourishes draw: a long run after it makes no new large sprite', () => { // first, before any other test has baked a sprite
  warmGlassEnv(look);
  const warmed = made.length;
  assert.ok(warmed >= 10, `${warmed} sprites baked up front`);
  warmGlassEnv(look);
  assert.equal(made.length, warmed, 'warming twice bakes nothing more');
  for (let t = 0; t < 400; t += 1.9) {
    const r = recorder();
    for (const name of look.flourish) for (const phase of Object.keys(PHASE)) drawFlourishes(r.ctx, env([name], t), phase, ...PHASE[phase]); // the mist too
  }
  assert.deepEqual(made.slice(warmed).filter((c) => c.width * c.height > 400).map((c) => `${c.width}x${c.height}`), [], 'nothing is painted once the fight is on');
});

test('no sprite is cut off at its edge: the doves, the bell and the chandelier keep 1 px clear of every side, the shafts and fans fade out before theirs', () => {
  const sized = (w, h) => made.filter((c) => c.width === w && c.height === h && Number.isFinite(c.T.bounds.x0));
  const clear = (c, pad) => c.T.bounds.x0 >= pad && c.T.bounds.y0 >= pad && c.T.bounds.x1 <= c.width - pad && c.T.bounds.y1 <= c.height - pad;
  const dims = (c) => `${c.width}x${c.height}: ${['x0', 'y0', 'x1', 'y1'].map((k) => Math.round(c.T.bounds[k] * 10) / 10).join(',')}`;
  const doves = sized(DOVE.w, DOVE.h);
  assert.ok(doves.length >= DOVE.frames, `${doves.length} dove frames`);
  for (const c of [...doves, ...sized(48, 54), ...sized(104, 92)]) assert.ok(clear(c, 0.5), dims(c));
  const shafts = sized(SHAFT.w, SHAFT.h);
  assert.equal(shafts.length, 4);
  for (const c of shafts) assert.ok(c.T.bounds.x0 > 0 && c.T.bounds.x1 < c.width, `a shaft's wedge stays inside its box: ${dims(c)}`);
  assert.equal(sized(FAN.size, FAN.size).length, 1);
  assert.equal(sized(PATCH.w, PATCH.h).length, 4);
});

test('the registry has the six flourishes at the depths the layers draw them: shafts in the sky, patches near, doves, bell and fans far, chandeliers mid', () => {
  assert.deepEqual(Object.keys(FLOURISH_GLASS).sort(), ['belfry', 'chandeliers', 'glassdoves', 'glassshafts', 'lightpatches', 'rosefan']);
  const phases = Object.fromEntries(Object.entries(FLOURISH_GLASS).map(([k, v]) => [k, Object.keys(v)]));
  assert.deepEqual(phases, { glassshafts: ['sky'], lightpatches: ['near'], glassdoves: ['far'], belfry: ['far'], rosefan: ['far'], chandeliers: ['mid'] });
  assert.deepEqual(look.flourish.filter((n) => n !== 'mist').sort(), Object.keys(FLOURISH_GLASS).sort(), 'the look draws all six, and the generic low mist');
});

test('five shafts of coloured light, additive and faint, each swelling and fading on its own beat, leaning down and left, gone before the player zone', () => {
  const a = frame('glassshafts', 'sky', 10);
  assert.equal(a.length, SHAFTS.n);
  assert.ok(a.every((c) => c.comp === 'lighter' && c.alpha >= SHAFTS.alpha[0] - 1e-9 && c.alpha <= SHAFTS.alpha[1] + 1e-9), 'quiet');
  assert.equal(new Set(a.map((c) => c.img)).size, 4, 'four colours: rose, gilt, cobalt, violet');
  const b = frame('glassshafts', 'sky', 47);
  assert.notDeepEqual(a.map((c) => c.alpha), b.map((c) => c.alpha), 'out of step in time');
  assert.notDeepEqual(a.map((c) => c.box[0]), b.map((c) => c.box[0]), 'swaying');
  assert.ok(a.concat(b).every((c) => c.box[1] < 0 && c.box[3] < 760), 'from beyond the top of the frame down, gone short of the foot');
  assert.ok(a.every((c) => (c.box[0] + c.box[2]) / 2 > 100 && (c.box[0] + c.box[2]) / 2 < W + 150), 'heads over the frame, none leaning wholly out of it');
  assert.deepEqual(frame('glassshafts', 'sky', 10).map((c) => c.box), a.map((c) => c.box), 'the same frame twice');
  assert.equal(frame('glassshafts', 'sky', 10, 0.5).length, 3, 'every other one at low quality');
  const p = shaftAt(2, 31);
  assert.ok(p.strength >= 0 && p.strength <= 1 && p.rot > 0.2 && p.rot < 0.4 && p.scale >= 0.85 && p.scale <= 1.55, 'the shafts lean down and to the left and have a size');
  assert.ok(SHAFT.w * 1.55 < 400 && SHAFTS.alpha[1] <= 0.1);
});

test('six patches of window light on the floor, additive and faint, in four colours, sliding slowly at the foot of the frame, none on the ship', () => {
  const a = frame('lightpatches', 'near', 12);
  assert.equal(a.length, PATCHES.n);
  assert.ok(a.every((c) => c.comp === 'lighter' && c.alpha >= PATCHES.alpha[0] - 1e-9 && c.alpha <= PATCHES.alpha[1] + 1e-9));
  assert.equal(new Set(a.map((c) => c.img)).size, 4);
  assert.ok(a.every((c) => c.box[1] > 960 && c.box[3] < 1100), 'at the foot, below the ship zone (y 620-1040), on the floor');
  assert.ok(a.every((c) => (c.box[2] - c.box[0]) >= PATCH.w * 0.8 - 1e-6 && (c.box[2] - c.box[0]) <= PATCH.w * 1.6 + 1e-6));
  const b = frame('lightpatches', 'near', 13);
  const slid = a.filter((c, i) => b[i].box[0] > c.box[0]).length;
  assert.ok(slid >= 5, `${slid} of 6 slid to the right`);
  assert.ok(a.every((c, i) => Math.abs(b[i].box[0] - c.box[0]) < 14 || b[i].box[0] < c.box[0]), 'slowly: under 14 px a second (or wrapping round)');
  const seen = new Set();
  for (let t = 0; t < 400; t += 3) frame('lightpatches', 'near', t).forEach((c) => shows(c) && seen.add(Math.round((c.box[0] + c.box[2]) / 2 / 240)));
  assert.ok(seen.size >= 6, 'over time they cross the whole width');
  assert.equal(frame('lightpatches', 'near', 12, 0.5).length, 3);
});

test("the generic low mist (flourish.js) is tinted rose by the look and stays a faint bank over the floor: nine bands, each under a tenth, below the ship's zone's top", () => {
  const a = frame('mist', 'near', 14);
  assert.equal(a.length, 9);
  assert.ok(a.every((c) => c.alpha > 0 && c.alpha <= look.mistAlpha * 1.4 + 1e-9 && c.alpha < 0.1 && c.comp === 'source-over'), 'faint');
  assert.ok(a.every((c) => c.box[1] >= 750 && c.box[3] <= 1100), 'over the floor');
  assert.ok(a.some((c) => shows(c)), 'on the screen');
});

test('every flourish is a pure function of t, and leaves line caps and joins, widths, colours, alpha and blend mode as it found them', () => {
  for (const name of Object.keys(FLOURISH_GLASS)) {
    for (const phase of Object.keys(FLOURISH_GLASS[name])) {
      for (const t of [3, 17, 27.5, 61]) {
        const ctx = stateful();
        const before = { ...ctx };
        drawFlourishes(ctx, env([name], t), phase, ...PHASE[phase]);
        assert.deepEqual({ ...ctx }, before, `${name} ${phase} at ${t}`);
        assert.deepEqual(rec(name, phase, t).map((c) => c.slice(0, 3)), rec(name, phase, t).map((c) => c.slice(0, 3)), `${name} twice`);
      }
    }
  }
});

test('all six together stay inside the draw budget: at most 40 images a frame on average, at most 70 at the busiest, quieter at low quality', () => {
  const all = Object.keys(FLOURISH_GLASS).flatMap((name) => Object.keys(FLOURISH_GLASS[name]).map((phase) => [name, phase]));
  const count = (t, q = 1) => all.reduce((s, [name, phase]) => s + frame(name, phase, t, q).length, 0);
  let [most, sum, n] = [0, 0, 0];
  for (let t = 0; t < 120; t += 2.3) {
    const c = count(t);
    most = Math.max(most, c);
    sum += c;
    n++;
  }
  assert.ok(most <= 70, `${most} at the busiest`);
  assert.ok(sum / n <= 40, `${(sum / n).toFixed(1)} on average`);
  assert.ok(count(20, 0.5) < count(20), `${count(20, 0.5)} at low quality, ${count(20)} at full`);
});
