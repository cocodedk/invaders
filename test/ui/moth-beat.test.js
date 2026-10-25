import { test } from 'node:test';
import assert from 'node:assert/strict';
import { star } from '../../src/ui/sprites.js';
import { canvases, look, def, art, HUD, PAD, f, boss, without, pass, count, sweepT, bodies, lightFrames, drawn } from './moth-kit.js';

// The Vesper Moth's wingbeat, live: the wings beat slowly (low in the first phase, held wide in the second, fast and full
// in the last), each living wing draws the frame for its pose, the right one the left mirrored, the next pose fading in
// over it; nothing jumps over a phase change; a damaged wing shows its cracks and a flash after a hit and a split wing
// hangs still; and glints twinkle on the glass at the front of the wave of light. The frames themselves are
// moth-wing.test.js.
const { FB, POSES, wingFrame, crackLayer, wingFlash } = await import('../../src/ui/bosses/moth-frames.js');
const { motion, BEAT, LO, HI } = await import('../../src/ui/bosses/moth-motion.js');

test('the wings beat slowly, low in the first phase, held wide in the second, fast and full in the last', () => {
  const range = (phase) => {
    const b = boss(phase);
    let [lo, hi] = [1, 0];
    for (let t = 3; t < 30; t += 1 / 60) {
      pass(b, t, true);
      const m = motion(b, t, phase);
      if (t > 8) [lo, hi] = [Math.min(lo, m.pose), Math.max(hi, m.pose)];
    }
    return [lo, hi];
  };
  const spans = [0, 1, 2].map(range);
  spans.forEach(([lo, hi], i) => {
    assert.ok(Math.abs(lo - LO[i]) < 0.03 && Math.abs(hi - HI[i]) < 0.03, `phase ${i} beats between ${lo.toFixed(2)} and ${hi.toFixed(2)}`);
  });
  assert.ok(spans[1][0] > spans[0][1] - 0.2 && spans[1][0] > 0.3, 'the hover phase holds the wings more open than the first ever does');
  assert.ok(spans[2][1] - spans[2][0] > spans[0][1] - spans[0][0] + 0.3, 'and the last beats fuller');
  assert.ok(BEAT[0] < BEAT[1] && BEAT[1] < BEAT[2], 'faster by each phase');
  assert.ok((2 * Math.PI) / BEAT[0] >= 3, 'the first beat takes three seconds or more: a slow wingbeat');
  const frames = (phase) => {
    const seen = new Set();
    const b = boss(phase);
    for (let t = 3; t < 30; t += 1 / 30) for (const c of drawn(pass(b, t, true).calls, bodies())) seen.add(bodies().indexOf(c.img));
    return seen;
  };
  assert.ok(frames(0).size >= 4 && frames(2).size === POSES - 1, 'the frames for the beat come in turn, all of them in the last phase');
});

test('each living wing draws the frame for its beat, the right one the left mirrored, the next pose fading in over it', () => {
  const b = boss(1);
  let crossfades = 0;
  for (let t = 3; t < 40; t += 0.13) {
    const calls = pass(b, t, true).calls;
    const solid = calls.filter((c) => c.comp === 'source-over');
    const wings = [-1, 1].map((s) => solid.filter((c) => Math.sign(c.box[0] + c.box[2]) === s || (Math.abs(c.box[0] + c.box[2]) < 1e-6 && s === -1)));
    assert.equal(wings[0].length, wings[1].length, 'both wings draw alike');
    const [l, r] = [solid.filter((c) => (c.box[0] + c.box[2]) / 2 < 0), solid.filter((c) => (c.box[0] + c.box[2]) / 2 > 0)];
    assert.equal(l.length, r.length);
    l.forEach((c, i) => {
      assert.ok(Math.abs(c.box[0] + r[i].box[2]) < 1e-6 && Math.abs(c.box[2] + r[i].box[0]) < 1e-6, `the right wing's frame is the left's mirrored: ${c.box} ${r[i].box}`);
      assert.equal(c.img, r[i].img, 'the same frame');
      assert.equal(c.alpha, r[i].alpha);
    });
    if (l.length === 2) {
      crossfades++;
      assert.ok(l[0].alpha === 1 && l[1].alpha > 0 && l[1].alpha < 1, 'the first frame is whole, the next fades in over it');
    }
  }
  assert.ok(crossfades > 15, `the poses cross-fade (${crossfades} frames of them)`);
});

test('the beat never jumps, over a phase change or inside a phase; a boss first seen in a phase is drawn in its steady state', () => {
  const b = boss(0);
  let prev = null;
  const worst = { pose: 0, rose: 0, spin: 0, breath: 0, blaze: 0, fall: 0, lo: 0, hi: 0, glow: 0 };
  for (let i = 0; i < 1200; i++) {
    const t = 3 + i / 60;
    b.phase = i < 400 ? 0 : i < 800 ? 1 : 2;
    pass(b, t, true, t);
    const m = { ...motion(b, t, b.phase) };
    if (prev) for (const k of Object.keys(worst)) worst[k] = Math.max(worst[k], Math.abs(m[k] - prev[k]));
    prev = m;
    if (i === 410) assert.ok(m.hi < 0.9 && m.lo < 0.35, `a sixth of a second into the hover phase the wings are not yet held open (${m.lo.toFixed(2)}..${m.hi.toFixed(2)})`);
    if (i === 780) assert.ok(m.lo > 0.36 && m.hi > 0.9, 'a few seconds on they are');
    if (i === 1190) assert.ok(m.fall > 0.9 && m.blaze > 0.95, 'the last phase has come up in full');
  }
  assert.ok(worst.pose < 0.045, `the pose moves ${worst.pose.toFixed(4)} a tick at most`);
  assert.ok(worst.rose < 0.011 && worst.spin < 0.042 && worst.breath < 0.052, `the clocks run on: ${JSON.stringify(worst)}`);
  assert.ok(worst.blaze < 0.03 && worst.fall < 0.03 && worst.lo < 0.03 && worst.hi < 0.03 && worst.glow < 0.005, `the eased amounts move gently, the rose window's light too: ${JSON.stringify(worst)}`);
  for (const phase of [0, 1, 2]) {
    const fresh = motion(boss(phase), 33, phase);
    assert.deepEqual([fresh.lo, fresh.hi, fresh.blaze, fresh.fall], [LO[phase], HI[phase], phase ? 1 : 0.25, phase === 2 ? 1 : 0], `a boss first seen in phase ${phase} is drawn finished`);
  }
});

test('a damaged wing draws its cracks and shattered panes (stage 1, then 2), flashes white for a moment after a hit, and is split and still once cracked', () => {
  const hurt = (hp, extra = {}) => { const b = boss(1); return { ...b, parts: b.parts.map((p) => (p.id === 'wingL' ? { ...p, hp: p.max * hp, ...extra } : p)) }; };
  const cracks = (b, t = 14) => [1, 2].map((s) => count(pass(b, t, true).calls, crackLayer(s)));
  assert.deepEqual(cracks(boss(1)), [0, 0], 'a whole wing has none');
  assert.deepEqual(cracks(hurt(0.7)), [1, 0], 'a hurt wing, stage 1');
  assert.deepEqual(cracks(hurt(0.3)), [0, 1], 'a wrecked one, stage 2');
  assert.deepEqual(count(pass(hurt(0.3), 14, false).calls, crackLayer(2)), 0, 'in the own pass only');
  assert.equal(count(pass(boss(1), 14, true).calls, wingFlash()), 0);
  const w = boss(1);
  pass(w, 20, true);
  w.parts.find((p) => p.id === 'wingL').hp -= 1; // the same part, as in the game, which keeps a memory of its hp
  const flash = (t) => pass(w, t, true).calls.filter((c) => c.img === wingFlash());
  assert.equal(flash(20.02).length, 1, 'a hit flashes the wing');
  assert.equal(flash(20.02)[0].alpha, 0.3, 'a nudge, not a blackout');
  assert.equal(flash(20.2).length, 0, 'for a moment only');
  for (const phase of [0, 1, 2]) {
    const cracked = () => ({ ...boss(phase), parts: boss(phase).parts.map((p) => (p.id === 'wingL' ? { ...p, cracked: true, hp: p.max * 0.4 } : p)) });
    const calls = pass(cracked(), 14, true).calls;
    assert.equal(calls.filter((c) => c.comp === 'source-over').length, 2, `phase ${phase}: a split wing hangs still, only the other draws its frame`);
    assert.ok(calls.every((c) => c.comp === 'lighter' || bodies().includes(c.img)));
  }
  const bare = pass(without(boss(1), 'wingL'), 14, true).calls;
  assert.equal(drawn(bare, [...bodies(), ...lightFrames()]).length < drawn(pass(boss(1), 14, true).calls, [...bodies(), ...lightFrames()]).length, true);
});

test('glints twinkle on the glass at the front of the wave of light, on every other pane of a row, and go with a wing that is destroyed or split', () => {
  const glints = (b, t = 14) => count(pass(b, t).calls, star('#fff0f8'));
  for (const phase of [0, 1, 2]) {
    assert.equal(glints(boss(phase)), 5, `phase ${phase}: three on the left wing, two on the right`);
    assert.equal(glints(without(boss(phase), 'wingL')), 2);
    assert.equal(glints(without(boss(phase), 'wingR')), 3);
    assert.equal(glints({ ...boss(phase), parts: boss(phase).parts.map((p) => (p.id === 'wingL' ? { ...p, cracked: true } : p)) }), 2, 'a split wing has none');
  }
  const b = boss(1);
  const at = [];
  for (let t = 3; t < 12; t += 0.2) at.push(pass(b, t).calls.filter((c) => c.img === star('#fff0f8')).map((c) => Math.round((c.box[0] + c.box[2]) / 2)).join(','));
  assert.ok(new Set(at).size > 8, 'they move with the wave');
  for (const c of pass(b, 14).calls.filter((x) => x.img === star('#fff0f8'))) assert.ok(c.alpha <= 0.7 && c.box[2] - c.box[0] <= 20, 'small and quiet');
});


test('each wing throws the coloured light of its rows on what lies under it, brightest as the wave passes, and takes it along when it goes', async () => {
  const { glow } = await import('../../src/ui/sprites.js');
  const lamps = ['#ff5fa2', '#a47cff', '#4fa8ff'].map((c) => glow(c));
  const patches = (b, t = 14) => pass(b, t).calls.filter((c) => lamps.includes(c.img));
  for (const phase of [0, 1, 2]) {
    assert.equal(patches(boss(phase)).length, 6, `phase ${phase}: three patches under each wing`);
    assert.equal(patches(without(boss(phase), 'wingL')).length, 3);
    assert.equal(patches({ ...boss(phase), parts: boss(phase).parts.map((p) => (p.id === 'wingR' ? { ...p, cracked: true } : p)) }).length, 3, 'a split wing throws none');
  }
  const alphas = [];
  const b = boss(2);
  for (let t = 3; t < 20; t += 0.05) alphas.push(...patches(b, t).map((c) => c.alpha));
  assert.ok(Math.min(...alphas) < 0.1 && Math.max(...alphas) > 0.2 && Math.max(...alphas) <= 0.3, 'they brighten as the wave of light passes their row, and are quiet');
  const c = patches(boss(1))[0];
  assert.ok(c.box[1] >= 0 && c.box[3] <= 110, 'under the wing, on the hindwing\'s top and the thorax\'s side');
});
