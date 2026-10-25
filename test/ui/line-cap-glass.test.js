import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, sink } from './dom-kit.js';

// What test/ui/line-cap.test.js asks of every world's drawing, for the Glass Cathedral (W16): the painters must leave
// every piece of the context's state (line caps and joins, widths, colours, alpha, blend mode) as they found it, or
// later strokes (the HUD's power ring) inherit it. Kept apart from that file to keep both under 200 lines. This first
// part is the player's side: the mirror twin (fading in, in between and fading out), its glass bolts, the mending (a
// wreck at three ages, the stand-up's flight and the scattering of a wreck shot down), the pickup rim and the icon.
installCanvas(64);
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { drawTwin } = await import('../../src/ui/ship-glass.js');
const { drawMirrorShots } = await import('../../src/ui/shots-glass.js');
const { drawMending } = await import('../../src/ui/mending-view.js');
const { drawMend, drawScatter } = await import('../../src/ui/mending-fx-view.js');
const { quatrefoil, ICONS16 } = await import('../../src/ui/pickup-glass.js');

// A context that keeps the state a painter may change, with a real save and restore, and hands everything else to the sink.
const stateful = () => {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const stack = [];
  return new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
};

const look = LOOKS[15];
const ship = (left) => ({ alive: true, x: 700, y: 820, vx: 300, vy: 0, power: { kind: 'mirror', left } });
const wreck = (age) => ({ x: 800, y: 300, left: 2 - age, slot: { row: 1, col: 2 } });
const ring = (life) => ({ x: 640, y: 300, seed: 5, color: '#d8f4ff', max: 0.5, life });
const player = {
  twinIn: (ctx) => drawTwin(ctx, ship(9.9), look, 3, 1),
  twin: (ctx) => drawTwin(ctx, ship(5), look, 3.4, 0.8),
  twinOut: (ctx) => drawTwin(ctx, ship(0.1), look, 3, 1),
  twinBlink: (ctx) => drawTwin(ctx, ship(1.5), look, 0.05, 0.3),
  bolts: (ctx) => drawMirrorShots(ctx, [{ x: 1200, y: 500, vx: 0, vy: -1400, mirror: true }, { x: 900, y: 600, vx: 200, vy: -1300, mirror: true }], 3),
  wreckNew: (ctx) => drawMending(ctx, wreck(0.1), look, 3),
  wreckHanging: (ctx) => drawMending(ctx, wreck(0.9), look, 3),
  wreckRising: (ctx) => drawMending(ctx, wreck(1.95), look, 3),
  mendStart: (ctx) => drawMend(ctx, ring(0.5)),
  mendFlash: (ctx) => drawMend(ctx, ring(0.12)),
  scatter: (ctx) => drawScatter(ctx, ring(0.3)),
  scatterStart: (ctx) => drawScatter(ctx, ring(0.49)),
  frame: (ctx) => quatrefoil(ctx, '#ffd45a'),
  icon: (ctx) => ICONS16.mirror(ctx, '#bfe8ff'),
};

test("the Glass Cathedral's twin, bolts, mending, pickup rim and icon leave the line caps and joins, widths, colours, alpha and blend mode as they found them", () => {
  for (const [name, run] of Object.entries(player)) {
    const ctx = stateful();
    const before = { ...ctx };
    run(ctx);
    assert.deepEqual({ ...ctx }, before, name);
  }
});

// The backdrop: the sky body, the three layers' painters, the flourishes and the ambient kinds of the look, and the five
// aliens' painters on a pair of contexts (body and lights), each on both frames.
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { GLASS } = await import('../../src/ui/parallax-glass.js');
const { FLOURISH_GLASS } = await import('../../src/ui/flourish-glass.js');
const { AMBIENT8 } = await import('../../src/ui/ambient-8.js');
const { buildLayers } = await import('../../src/ui/parallax.js');
const { makeRng } = await import('../../src/core/rng.js');
const { default: aliens } = await import('../../src/ui/aliens/w16.js');

const layers = buildLayers(look, 5);
const env = (t) => ({ v: { look, layers, cache: {} }, world: { ship: { x: 960 } }, t, quality: 1 });
const out = () => ({ lights: [], signs: [] });
const backdrop = {
  sky: (ctx) => BODIES.glassvault(ctx, look),
  far: (ctx) => GLASS.glassnave(ctx, 2240, 700, makeRng(3), look.layers[0], out()),
  mid: (ctx) => GLASS.glasscolumns(ctx, 2240, 460, makeRng(3), look.layers[1], out()),
  near: (ctx) => GLASS.glassfloor(ctx, 2240, 320, makeRng(3), look.layers[2], out()),
  glassshafts: (ctx) => FLOURISH_GLASS.glassshafts.sky(ctx, env(3)),
  lightpatches: (ctx) => FLOURISH_GLASS.lightpatches.near(ctx, env(4)),
  glassdoves: (ctx) => FLOURISH_GLASS.glassdoves.far(ctx, env(20), -160, 380),
  belfry: (ctx) => FLOURISH_GLASS.belfry.far(ctx, env(1.3), -160, 380),
  rosefan: (ctx) => FLOURISH_GLASS.rosefan.far(ctx, env(20), -160, 380),
  chandeliers: (ctx) => FLOURISH_GLASS.chandeliers.mid(ctx, env(5), -160, 620),
  ...Object.fromEntries(look.ambient.map((a, i) => [`${a.kind} ${a.phase} ${i}`, (ctx) => AMBIENT8[a.kind]?.(ctx, a, 3, 0, 0, { ship: { x: 960 } })])),
};

test("the Glass Cathedral's sky, layers, flourishes and ambient leave the line caps and joins, widths, colours, alpha and blend mode as they found them", () => {
  for (const [name, run] of Object.entries(backdrop)) {
    const ctx = stateful();
    const before = { ...ctx };
    run(ctx);
    assert.deepEqual({ ...ctx }, before, name);
  }
});

test("the Glass Cathedral's five aliens, on both frames, leave the body and lights contexts as they found them", () => {
  for (const role of ['grunt', 'diver', 'gunner', 'armored', 'carrier']) {
    for (const f of [0, 1]) {
      const [b, l] = [stateful(), stateful()];
      const before = [{ ...b }, { ...l }];
      aliens[role](b, l, f, look.palette.alien[role]);
      assert.deepEqual([{ ...b }, { ...l }], before, `${role} frame ${f}`);
    }
  }
});

// The Vesper Moth (W16's boss; bosses/moth*.js): its live pass is drawn by the game in 'lighter' and must leave every
// piece of the context as it found it, in every phase and both passes; each painter (the hull, the rage layers, every part,
// a forewing at rest and at full beat) leaves alpha and the blend mode at their defaults, as the angler's do.
test("the Vesper Moth's live pass and painters leave the context's state as they found it", async () => {
  const { BOSS_ART, painterFor } = await import('../../src/ui/bosses/bake.js');
  const { BOSS_DEFS } = await import('../../src/core/bosses-data.js');
  const art = BOSS_ART.moth;
  const def = BOSS_DEFS.find((d) => d.kind === 'moth');
  const boss = (phase) => ({ x: 0, y: 0, phase, parts: def.parts.map((p) => ({ ...p, max: p.hp, x: p.dx, y: p.dy })) });
  for (const phase of [0, 1, 2]) {
    for (const own of [false, true]) {
      const ctx = stateful();
      ctx.globalCompositeOperation = 'lighter';
      const before = { ...ctx };
      art.live(ctx, boss(phase), 14, 1, own, 9);
      assert.deepEqual({ ...ctx }, before, `live, phase ${phase}, own ${own}`);
    }
  }
  const S = { def, pal: look.palette.boss, look, W: def.size.w + 120, H: def.size.h + 120, pad: 60 };
  const painters = [['hull', (b, l) => art.hull(b, l, S)], ...art.rage.filter(Boolean).map((r, i) => [`rage ${i}`, (b, l) => r(l, S)]), ...def.parts.map((p) => [p.id, (b, l) => painterFor(art, p.id)[0](b, l, p, S)])];
  for (const [name, paint] of painters) {
    const [b, l] = [stateful(), stateful()];
    paint(b, l);
    for (const ctx of [b, l]) assert.deepEqual([ctx.globalAlpha, ctx.globalCompositeOperation], [1, 'source-over'], `${name} leaves alpha and the blend mode alone`);
  }
});
