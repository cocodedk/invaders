import { test } from 'node:test';
import assert from 'node:assert/strict';
import { made, look, frame, env, PHASE, FAR_TOP, W, H, tracker, drawFlourishes, stateful, scribe } from './bath-kit.js';
import { recorder } from './dom-kit.js';

// World 19's backdrop under stand-in canvases, proven through buildSky, buildLayers, drawAmbient and drawFlourishes: the sky body, the
// three layers and their lights, the maker's plate, the ambient kinds and the flourishes on their timetables. Every flourish is a pure
// function of the time, quiet between its moments, within its draw budget at full and half quality, leaves the context as it found it,
// and nothing is baked once the fight is on (the far layer's painter bakes the sprites); the taps spurt only while a strike flash lives.
const { buildSky } = await import('../../src/ui/sky.js');
const { buildLayers, layerX, MARGIN } = await import('../../src/ui/parallax.js');
const { drawAmbient } = await import('../../src/ui/ambient.js');
const { HUD_BOTTOM } = await import('../../src/core/kinds.js');
const { ZONE } = await import('../../src/core/ship.js');
const { MAKER_MARK, FLOOR, WINDOW } = await import('../../src/ui/sky-bodies-11-kit.js');
const { MARGIN: BATH_MARGIN, TAPS, TAP, mouthOf, BEND } = await import('../../src/ui/parallax-bath-kit.js');
const { PLATE, INK, ROOM } = await import('../../src/ui/parallax-bath-plate.js');
const { CLEAR, PROPS, HEAPS, LEDGE } = await import('../../src/ui/parallax-bath-shelf.js');
const { drip, DRIP, bubble, BUBBLE, steamer, STEAMER, spurt, STRIKE } = await import('../../src/ui/flourish-bath-model.js');
const { CROWN_DROPS, RING_DROPS, SPRAY_DROPS, PUFFS, halved } = await import('../../src/ui/flourish-bath.js');
const { warmBathFx } = await import('../../src/ui/flourish-bath-sprites.js');
const { GLINTS } = await import('../../src/ui/ambient-11.js');
const { STRIKE_LIFE, STRIKE_FLASH } = await import('../../src/fx/react-bath.js');

const layers = buildLayers(look, 3);
const seek = (ok, from = 0) => { // the first t from `from` (on a 0.05 s grid) at which ok(t) holds
  for (let t = from; t < 4000; t += 0.05) if (ok(t)) return t;
  throw new Error('no such moment');
};
const strike = (life, max = STRIKE_LIFE, tag = STRIKE) => [{ ...STRIKE_FLASH, tag, life, max }]; // as fx/react-bath.js leaves one
const QUIET = seek((t) => !drip(t).phase && !bubble(t).on && !steamer(t).on);

test('the sky body paints, and the window is small and high in the top-left corner, under the HUD and clear of the far layer', () => {
  buildSky(look);
  assert.ok(WINDOW.y >= HUD_BOTTOM && WINDOW.x + WINDOW.w < W * 0.2, 'high in the corner, under the score panel');
  assert.ok(WINDOW.w * WINDOW.h < W * H * 0.03, 'small');
  assert.ok(WINDOW.y + WINDOW.h < FAR_TOP + TAP.top, 'above everything the far layer paints');
});

test('three layers, each carrying its lights; the far one bakes every flourish and ambient sprite', () => {
  assert.equal(layers.length, 3);
  assert.deepEqual(layers.map((l) => [l.top, l.speed, l.far]), look.layers.map((L, i) => [H - L.height, L.speed, i === 0]));
  assert.equal(JSON.stringify(buildLayers(look, 3)[2].lights), JSON.stringify(layers[2].lights), 'seeded, so a level always looks the same');
  assert.equal(BATH_MARGIN, MARGIN, "parallax.js's margin");
  for (const [i, l] of layers.entries()) {
    assert.ok(l.lights.length >= 3, `layer ${i} has lights`);
    for (const p of l.lights) {
      assert.ok(p.x >= 0 && p.x <= W + 2 * MARGIN && p.y >= 0 && p.y <= look.layers[i].height, `a light of layer ${i} lies in its band`);
      assert.ok(['pulse', 'flicker'].includes(p.mode) && p.a > 0 && p.a <= 0.3 && p.r <= 80, `dim and small: ${p.mode} a ${p.a} r ${p.r}`);
    }
  }
  assert.equal(layers[0].lights.length, TAPS.length * 2, "each tap's dome glints and its waterfall's foot flickers");
});

test("the middle layer leaves the waterfalls' feet clear, so the drips' crowns land in sight", () => {
  assert.deepEqual(CLEAR.at, TAPS.map((T) => mouthOf(T)[0] + T.dir * BEND), 'the gaps are at the feet (both layers share a margin)');
  for (const at of CLEAR.at) {
    for (const [kind, x, o] of PROPS) assert.ok(Math.abs(x - at) > CLEAR.half + (o.w ?? 80) / 2, `a ${kind} at ${x} stands in the gap at ${at}`);
    for (const [x, w, h] of HEAPS) if (Math.abs(x - at) < CLEAR.half + w / 2) assert.ok(LEDGE + 20 - h >= CLEAR.top, `a heap at ${x} rises into the gap`);
  }
});

test('the drip: a drop gathers on a lip, falls and lands in a crown, the two taps in turn, and nothing between', () => {
  const at = (phase, from = 0) => seek((t) => drip(t).phase === phase, from);
  const taps = new Set();
  for (let i = 0; i < 6; i++) taps.add(drip(i * DRIP.period + 0.1).tap);
  assert.deepEqual([...taps].toSorted(), [0, 1], 'both taps drip');
  assert.notEqual(drip(0.1).tap, drip(DRIP.period + 0.1).tap, 'in turn');
  for (const phase of ['swell', 'fall']) assert.equal(frame('bathdrip', 'far', at(phase)).length, 1, phase);
  const splash = at('splash');
  assert.equal(frame('bathdrip', 'far', splash).length, 1 + CROWN_DROPS);
  assert.equal(frame('bathdrip', 'far', splash, 0.5).length, 1 + halved(CROWN_DROPS, 0.5));
  assert.equal(frame('bathdrip', 'far', seek((t) => !drip(t).phase)).length, 0, 'quiet between drips');
  const [box] = frame('bathdrip', 'far', at('swell')).map((c) => c.box);
  const T = TAPS[drip(at('swell')).tap];
  const mx = PHASE.far[0] + mouthOf(T)[0];
  assert.ok(Math.abs((box[0] + box[2]) / 2 - mx) < 40 && Math.abs(box[1] - (FAR_TOP + TAP.mouth[1])) < 20, "it gathers at the dolphin's mouth");
});

test('the giant bubble drifts up across the room and pops into a ring of droplets, and is gone between', () => {
  const drifting = seek((t) => bubble(t).on && !bubble(t).popped);
  assert.equal(frame('bathbubble', 'near', drifting).length, 1);
  const pop = seek((t) => bubble(t).popped && bubble(t).k < 0.5);
  assert.equal(frame('bathbubble', 'near', pop).length, 1 + RING_DROPS);
  assert.equal(frame('bathbubble', 'near', pop, 0.5).length, 1 + halved(RING_DROPS, 0.5));
  assert.equal(frame('bathbubble', 'near', seek((t) => !bubble(t).on)).length, 0);
  for (let t = 0; t < 200; t += 0.7) if (bubble(t).on) assert.ok(Math.abs(bubble(t).y - (BUBBLE.from - BUBBLE.rise / 2)) <= BUBBLE.rise / 2 + 30, `y ${bubble(t).y}`);
});

test('the steamer crosses at the back, puffing, one way and then the other, and is away between crossings', () => {
  const on = seek((t) => steamer(t).on);
  assert.equal(frame('bathsteamer', 'mid', on).length, PUFFS + 2, 'smoke, the wake and the boat');
  assert.equal(frame('bathsteamer', 'mid', on, 0.5).length, halved(PUFFS, 0.5) + 2);
  assert.equal(frame('bathsteamer', 'mid', seek((t) => !steamer(t).on)).length, 0);
  assert.notEqual(steamer(1).dir, steamer(STEAMER.period + 1).dir);
});

test('the taps spurt only while a flash tagged strike lives', () => {
  for (const flashes of [[], strike(0), strike(-0.1), strike(0.5, STRIKE_LIFE, 'lightning')]) assert.equal(frame('bathspurt', 'far', QUIET, 1, flashes).length, 0, JSON.stringify(flashes));
  const jets = frame('bathspurt', 'far', QUIET, 1, strike(0.5));
  assert.equal(jets.length, TAPS.length * (1 + SPRAY_DROPS));
  assert.equal(frame('bathspurt', 'far', QUIET, 0.5, strike(0.5)).length, TAPS.length * (1 + halved(SPRAY_DROPS, 0.5)));
  const big = jets.filter((c) => c.img.width > 100);
  assert.equal(big.length, TAPS.length, 'one gush a tap');
  big.forEach((c, i) => {
    const [mx, my] = [PHASE.far[0] + mouthOf(TAPS[i])[0], FAR_TOP + TAP.mouth[1]];
    assert.ok(mx >= c.box[0] - 1 && mx <= c.box[2] + 1 && Math.abs(c.box[1] - my) < 20, `tap ${i}'s gush leaves its mouth`);
  });
  assert.equal(spurt({ flashes: [...strike(0.3), ...strike(0.6)] }).k, 0.6 / STRIKE_LIFE, 'the strongest strike drives it');
});

test('every flourish is a pure function of t, leaves the context as it found it, and bakes nothing once the fight is on', () => {
  warmBathFx();
  const warmed = made.length;
  warmBathFx();
  assert.equal(made.length, warmed, 'warming twice bakes nothing more');
  const busy = [seek((t) => drip(t).phase === 'splash'), seek((t) => bubble(t).popped), seek((t) => steamer(t).on)];
  for (const t of busy) for (const name of look.flourish) for (const phase of Object.keys(PHASE)) {
    const shot = () => frame(name, phase, t, 1, strike(0.4)).map((c) => [c.alpha, c.comp, c.box]);
    assert.deepEqual(shot(), shot(), `${name} ${phase}`);
    const ctx = stateful();
    drawFlourishes(ctx, env([name], t, 1, strike(0.4)), phase, ...PHASE[phase]);
    assert.deepEqual([ctx.globalAlpha, ctx.globalCompositeOperation], [1, 'source-over'], `${name} ${phase} leaves alpha and the blend`);
  }
  for (let q = 0; q < 300; q += 1.3) {
    for (const name of look.flourish) for (const phase of Object.keys(PHASE)) frame(name, phase, q, 1, strike(0.4));
    for (const phase of ['sky', 'mid', 'front']) drawAmbient(recorder().ctx, look, phase, { t: q, drift: q * 3, wind: 0, world: {} });
  }
  assert.deepEqual(made.slice(warmed).filter((c) => c.width * c.height > 400).map((c) => `${c.width}x${c.height}`), [], 'nothing is painted once the fight is on');
});

test('the ambient: a draw a bubble, quiet; the wisps rise and fade; the glints wink now and then in the waterline band', () => {
  for (const a of look.ambient) {
    let lit = 0;
    for (let i = 0; i < 200; i++) {
      const r = recorder();
      drawAmbient(r.ctx, { ...look, ambient: [a] }, a.phase, { t: i * 0.37, drift: 0, wind: 0, world: {} });
      const draws = r.calls.filter(([k]) => k === 'drawImage');
      assert.ok(draws.length <= a.n && draws.every((c) => c.alpha <= a.alpha + 1e-9), `${a.kind}: ${draws.length} draws`);
      if (a.kind === 'waterglints') for (const c of draws) assert.ok(c[3] + c[5] / 2 >= GLINTS.y0 && c[3] + c[5] / 2 <= GLINTS.y1, 'on the waterline');
      if (draws.length) lit++;
    }
    assert.ok(lit > 50, `${a.kind} shows in ${lit} of 200 frames`);
  }
});

test("the maker's plate: its text is drawn, in dark letters cut in brass, legible, under the fight, clear of the HUD and in view wherever the ship flies", () => {
  assert.equal(MAKER_MARK, 'Built with cc-fable-5.2 \u00b7 2026-11-15');
  const s = scribe();
  const built = buildLayers(look, 3);
  s.restore();
  const marks = s.texts.filter((x) => x.text === MAKER_MARK);
  assert.ok(marks.length >= 1, 'the plate is lettered');
  assert.ok(marks.every((x) => String(x.canvas) === String([W + 2 * MARGIN, look.layers[2].height])), 'on the near layer, which nothing but the playfield covers');
  const cut = marks.find((x) => x.fillStyle === INK);
  assert.ok(cut, 'in the dark of the cut');
  assert.ok(Number(/(\d+)px/.exec(cut.font)[1]) >= 18 && cut.textAlign === 'center' && cut.maxWidth === PLATE.w - ROOM, cut.font);
  const L = built[2];
  const y = L.top + cut.y;
  assert.ok(y - PLATE.h / 2 > HUD_BOTTOM && y - PLATE.h / 2 > FLOOR && y + PLATE.h / 2 < H, `at frame y ${y}`);
  for (const ship of [ZONE.x0, W / 2, ZONE.x1]) {
    const x = layerX(L, ship) + cut.x;
    assert.ok(x - PLATE.w / 2 >= 0 && x + PLATE.w / 2 <= W, `with the ship at ${ship} the plate spans ${x - PLATE.w / 2}..${x + PLATE.w / 2}`);
  }
});

test('a busy frame of every flourish costs a handful of draws and stays near the frame', () => {
  const t = seek((q) => drip(q).phase === 'splash' && steamer(q).on);
  const T = tracker();
  for (const phase of ['sky', 'far', 'mid', 'near', 'front']) drawFlourishes(T.ctx, env(look.flourish, t, 1, strike(0.5)), phase, ...PHASE[phase]);
  assert.ok(T.calls.length <= 40, `${T.calls.length} draws`);
  assert.ok(T.bounds.x0 > -600 && T.bounds.x1 < W + 600 && T.bounds.y1 <= H + 100, 'nothing wanders off');
});
