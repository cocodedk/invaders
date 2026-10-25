import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tracker } from './galleon-track.js';

// Glass Cathedral's flourishes that move on its layers, under stand-in canvases (glass-env-flourish.test.js has the light ones):
// the glass doves crossing the roofline, the bell in the belfry, the two fans of the rose window and the chandeliers swaying
// from the ribs. Each is found through the signs the layers left, stays dim, stays on the screen and is a function of t alone.
const { layers, look, W, PHASE, env, frame, rec, shows, drawFlourishes } = await import('./glass-env-fx-kit.js');
const { DOVES, TOLL, FANS, SWAY, BELL_SCALE, flockAt, bellAt } = await import('../../src/ui/flourish-glass-2.js');
const { FAN } = await import('../../src/ui/flourish-glass-sprites.js');
const { DOVE, FLAMES, WINGBEAT } = await import('../../src/ui/flourish-glass-sprites-2.js');

test('glass doves cross over the roofline in a flock of four now and then: one crossing a period, entering and leaving off screen, mirrored when flying left, wings beating', () => {
  const slots = new Map();
  for (let t = 0; t < DOVES.first + DOVES.period * 6; t += 0.25) {
    const f = flockAt(t);
    if (!f) continue;
    assert.deepEqual(f, flockAt(t));
    assert.ok(f.y >= DOVES.rows[0] && f.y <= DOVES.rows[1] && f.speed >= DOVES.speed[0] && f.speed <= DOVES.speed[1]);
    slots.set(f.slot, [...(slots.get(f.slot) ?? []), f]);
  }
  assert.deepEqual([...slots.keys()], [0, 1, 2, 3, 4, 5], 'one crossing in each period');
  assert.deepEqual(new Set([...slots.values()].map((l) => l[0].dir)), new Set([-1, 1]), 'both ways');
  for (const [slot, list] of slots) {
    assert.ok(list.length * 0.25 < DOVES.period - 5, `crossing ${slot} leaves a gap before the next`);
    const start = DOVES.first + slot * DOVES.period;
    const [first, last] = [frame('glassdoves', 'far', start + 1e-6), frame('glassdoves', 'far', start + list[0].dur - 1e-6)];
    assert.ok(first.length === 0 || first.every((c) => c.box[2] < 5 || c.box[0] > W - 5), `crossing ${slot} starts beyond the edge`);
    assert.ok(last.length <= DOVES.n);
    const r = rec('glassdoves', 'far', start + 8);
    assert.equal(Math.sign(r.find(([k]) => k === 'scale')[1]), list[0].dir, 'mirrored for a flock flying left');
  }
  const mid = DOVES.first + 10;
  const calls = frame('glassdoves', 'far', mid);
  assert.ok(calls.length >= 2 && calls.length <= DOVES.n, `${calls.length} birds`);
  assert.ok(calls.every((c) => c.alpha === DOVES.alpha && c.comp === 'source-over' && shows(c, 4)), 'dim, and only while on the screen');
  assert.ok(calls.every((c) => c.box[1] > 250 && c.box[3] < 640), 'over the roofline, in the sky');
  const imgs = new Set();
  for (let t = mid; t < mid + 4; t += 0.1) frame('glassdoves', 'far', t).forEach((c) => imgs.add(c.img));
  assert.ok(imgs.size >= 3, 'wings through at least three frames of the beat');
  assert.ok(WINGBEAT.every((f) => f >= 0 && f < DOVE.frames));
  assert.equal(frame('glassdoves', 'far', DOVES.first + DOVES.period - 1).length, 0, 'none between crossings');
  assert.equal(frame('glassdoves', 'far', 2).length, 0, 'nor before the first');
  assert.notDeepEqual(frame('glassdoves', 'far', mid).map((c) => c.box), frame('glassdoves', 'far', mid + 0.5).map((c) => c.box), 'they move');
  assert.equal(frame('glassdoves', 'far', mid, 0.5).length, DOVES.n / 2, 'every other bird at low quality');
});

test('the bell is tolled every so often and swings as it dies down: bounded, decaying, still between tollings, drawn from its sign', () => {
  const peak = (t0, t1) => { let m = 0; for (let t = t0; t < t1; t += 0.05) m = Math.max(m, Math.abs(bellAt(t).angle)); return m; };
  assert.ok(peak(0, 4) <= TOLL.swing + 1e-9 && peak(0, 4) > TOLL.swing * 0.5, `swings up to ${peak(0, 4).toFixed(2)} rad`);
  assert.ok(peak(5, 8) < peak(0, 3), 'dying down');
  assert.ok(peak(TOLL.ring + 1, TOLL.period - 0.5) < 0.02 && bellAt(TOLL.ring + 2).left === 0, 'at rest between tollings');
  assert.ok(bellAt(0).left === 0 && bellAt(0.2).left > 0, 'rung with a push');
  const sign = layers[0].signs.find((s) => s.bell);
  const swinging = rec('belfry', 'far', 1.3);
  assert.ok(swinging.filter(([k]) => k === 'drawImage').length >= 1);
  const rot = swinging.find(([k]) => k === 'rotate');
  assert.ok(Math.abs(rot[1] - bellAt(1.3, sign.x * 0.0003).angle) < 1e-9, 'rotated by the swing');
  assert.ok(swinging.some(([k, x]) => k === 'scale' && x === BELL_SCALE), 'drawn small enough for the opening');
  const [bell] = frame('belfry', 'far', 1.3);
  assert.ok(bell.box[0] > PHASE.far[0] + sign.x - 40 && bell.box[2] < PHASE.far[0] + sign.x + 40 && bell.box[1] >= PHASE.far[1] + sign.y - 40 && bell.box[3] < PHASE.far[1] + sign.y + 80, 'hangs in its opening');
  const empty = { v: { look: { ...look, flourish: ['belfry'] }, layers: [], cache: {} }, world: {}, fx: {}, t: 1, quality: 1 };
  const T = tracker();
  drawFlourishes(T.ctx, empty, 'far', 0, 0);
  assert.equal(T.calls.length, 0, 'no belfry, no bell');
});

test('the bell glints gold at its lip when it reaches the end of a swing and the clapper strikes, faintly, and not between strikes', () => {
  const sign = layers[0].signs.find((s) => s.bell);
  const tStrike = Math.PI / 2 / TOLL.omega - sign.x * 0.0003 * TOLL.period + TOLL.period; // the end of the first swing
  const [swung, between] = [frame('belfry', 'far', tStrike), frame('belfry', 'far', tStrike + 0.65)];
  assert.equal(swung.length, 2, 'a bell and a glint at the end of a swing');
  const [bell, glint] = swung;
  assert.ok(glint.comp === 'lighter' && glint.alpha > 0.05 && glint.alpha <= 0.4, `glint alpha ${glint.alpha}`);
  assert.ok(glint.box[3] > bell.box[1] + (bell.box[3] - bell.box[1]) * 0.5, 'low on the bell: at its lip');
  assert.ok(between.length === 1 || between[1].alpha < glint.alpha, 'gone between strikes');
});

test('the rose window throws two fans of coloured light, additive and faint, one turning each way, centred on the window and breathing a little', () => {
  const sign = layers[0].signs.find((s) => s.rose);
  const a = rec('rosefan', 'far', 20);
  assert.equal(a.filter(([k]) => k === 'drawImage').length, 2);
  const [tx, ty] = a.find(([k]) => k === 'translate').slice(1);
  assert.ok(Math.abs(tx - (PHASE.far[0] + sign.x)) < 1e-9 && Math.abs(ty - (PHASE.far[1] + sign.y)) < 1e-9, 'centred on the rose');
  const calls = frame('rosefan', 'far', 20);
  assert.ok(calls.every((c) => c.comp === 'lighter' && c.alpha > 0 && c.alpha <= FANS.alpha[1] + 1e-9), 'faint');
  const [r0, r1] = [rec('rosefan', 'far', 20).filter(([k]) => k === 'rotate'), rec('rosefan', 'far', 30).filter(([k]) => k === 'rotate')];
  assert.ok(r1[0][1] > r0[0][1] && r1[1][1] < r0[1][1], 'the large fan turns one way, the small one the other');
  assert.ok(Math.abs(r1[0][1] - r0[0][1]) < 0.6, 'slowly: under 0.6 rad in ten seconds');
  assert.equal(frame('rosefan', 'far', 20, 0.5).length, 1, 'one fan at low quality');
  assert.ok(FAN.size <= 800);
  assert.notEqual(calls[0].alpha, frame('rosefan', 'far', 25)[0].alpha, 'breathing');
});

test('two chandeliers swing on their chains from the ribs and flicker six small flames each, dim and additive, none drawn off screen', () => {
  const signs = layers[1].signs.filter((s) => s.chandelier);
  const a = frame('chandeliers', 'mid', 5);
  assert.equal(a.length, signs.length * (1 + FLAMES.length), 'a sprite and a glow a flame, each');
  const flames = a.filter((c) => c.comp === 'lighter');
  assert.equal(flames.length, signs.length * FLAMES.length);
  assert.ok(flames.every((c) => c.alpha >= 0 && c.alpha <= SWAY.flame + 1e-9), 'dim');
  const angles = new Set();
  for (let t = 0; t < 40; t += 0.7) rec('chandeliers', 'mid', t).filter(([k]) => k === 'rotate').forEach((c) => { angles.add(Math.sign(c[1])); assert.ok(Math.abs(c[1]) < 0.075, `swing ${c[1]}`); });
  assert.deepEqual(angles, new Set([-1, 1]), 'both ways');
  assert.notDeepEqual(frame('chandeliers', 'mid', 5).map((c) => c.box), frame('chandeliers', 'mid', 5.8).map((c) => c.box), 'swinging');
  assert.equal(frame('chandeliers', 'mid', 5, 0.5).length, signs.length * (1 + FLAMES.length / 2), 'half the flames at low quality');
  assert.ok(a.every((c) => shows(c, 120)), 'on the screen');
  const r = rec('chandeliers', 'mid', 5);
  assert.equal(r.filter(([k]) => k === 'stroke').length, signs.length, 'a chain is one stroke');
  assert.ok(Math.abs(r.find(([k]) => k === 'translate')[1] - (PHASE.mid[0] + signs[0].x)) < 1e-9, "hung from the rib's crown");
});
