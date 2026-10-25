import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, sink } from './dom-kit.js';

// The round-capped strokes of the sky (W7 tracers, W8 lensed stars and photon ring, W12 constellations) and every stroke
// of Sunset Armada's sky, water, propellers and balloons (W13) must leave the
// context's lineCap as they found it, or later strokes (the HUD's power ring) inherit round caps. Ember Carnival's
// (W14) fireworks, rides, strings and ambient must leave every piece of the context's state as they found it.
installCanvas();
const { FLOURISH2 } = await import('../../src/ui/flourish-2.js');
const { AMBIENT2 } = await import('../../src/ui/ambient-2.js');
const { FLOURISH6 } = await import('../../src/ui/flourish-6.js');
const { FLOURISH8 } = await import('../../src/ui/flourish-8.js');
const { FLOURISH9 } = await import('../../src/ui/flourish-9.js');
const { AMBIENT5 } = await import('../../src/ui/ambient-5.js');
const { FLOURISH10 } = await import('../../src/ui/flourish-10.js');
const { FLOURISH11 } = await import('../../src/ui/flourish-11.js');
const { AMBIENT6 } = await import('../../src/ui/ambient-6.js');
const { paintBloom, drawBloom } = await import('../../src/ui/burst-view.js');
const { paintFuse, drawShells } = await import('../../src/ui/shell-view.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { buildLayers } = await import('../../src/ui/parallax.js');

const context = () => new Proxy({ lineCap: 'butt' }, {
  get: (o, k) => (k in o ? o[k] : () => sink),
  set: (o, k, v) => ((o[k] = v), true),
});
const level = { world: 8, index: 1, waves: [] };
const layers = buildLayers(LOOKS[12], 5);
const env = (t) => ({ v: { look: LOOKS[12], layers, cache: {} }, world: { ship: { x: 960 } }, t });
const armada = { // Sunset Armada: the shafts, the gulls, the far ship, the cannon fire, the falls, the propellers, the balloons, the wisps and the ambient gulls
  godrays: (ctx) => FLOURISH8.godrays.sky(ctx, env(3)),
  birds: (ctx) => FLOURISH8.birds.sky(ctx, env(3.5)),
  farship: (ctx) => FLOURISH8.farship.sky(ctx, env(40)),
  cannonfire: (ctx) => FLOURISH8.cannonfire.far(ctx, env(7.2), -160, 380),
  falls: (ctx) => FLOURISH9.falls.far(ctx, env(3), -160, 380),
  props: (ctx) => FLOURISH9.props.mid(ctx, env(3), -160, 620),
  tether: (ctx) => FLOURISH9.tether.near(ctx, env(3)),
  wisps: (ctx) => AMBIENT5.wisps(ctx, { n: 9, speed: 14, size: [160, 320], alpha: 0.2, colors: ['#ffe0b8'] }, 3, 0),
  gulls: (ctx) => AMBIENT5.gulls(ctx, { n: 5, speed: 38, size: [22, 34], alpha: 0.9, colors: ['#fff6e8'] }, 3),
};

const carnivalLayers = buildLayers(LOOKS[13], 5);
const cenv = (t) => ({ v: { look: LOOKS[13], layers: carnivalLayers, cache: {} }, world: { ship: { x: 960 } }, t, quality: 1 });
const carnival = { // Ember Carnival: the shows, the searchlights, the lake, the coaster, the wheel, the strings, the balloons, the confetti and the lanterns
  fireworks: (ctx) => FLOURISH10.fireworks.sky(ctx, cenv(8.4)),
  rockets: (ctx) => FLOURISH10.rockets.sky(ctx, cenv(6.2)),
  sweep: (ctx) => FLOURISH10.sweep.sky(ctx, cenv(3)),
  reflect: (ctx) => FLOURISH10.fireworks.far(ctx, cenv(8.4), -160, 380),
  coaster: (ctx) => FLOURISH11.coaster.far(ctx, cenv(2.5), -160, 380),
  wheel: (ctx) => FLOURISH11.wheel.mid(ctx, cenv(4), -160, 620),
  strings: (ctx) => FLOURISH11.strings.near(ctx, cenv(3)),
  balloons: (ctx) => FLOURISH11.balloons.near(ctx, cenv(3)),
  confetti: (ctx) => AMBIENT6.confetti(ctx, { n: 22, speed: 40, size: [6, 11], alpha: 0.85, colors: ['#ff3fa0', '#ffc233'] }, 3, 0),
  lanterns: (ctx) => AMBIENT6.lanterns(ctx, { n: 7, speed: 16, size: [18, 28], alpha: 0.9, colors: ['#ffb04a', '#ff8a5a'] }, 3),
  // and the fireworks twist: the flower's painter and its drawing, the fuse's painter and the shells' lit fuses
  bloomPaint: (ctx) => paintBloom(ctx, '#ff3fa0', '#ff9ad0', 1),
  bloom: (ctx) => drawBloom(ctx, { x: 800, y: 400, r: 120, color: '#ff3fa0', life: 0.3, max: 0.85 }),
  fusePaint: (ctx) => paintFuse(ctx),
  shells: (ctx) => drawShells(ctx, [{ id: 1, role: 'gunner', shell: true, x: 600, y: 300 }], LOOKS[13], 2, (a) => ({ x: a.x, y: a.y, rot: 0.3, f: 1 })),
};

test('the sky\'s round-capped strokes leave lineCap at butt', () => {
  const world = { well: { x: 960, y: 300 }, level };
  const runs = {
    tracers: (ctx) => FLOURISH2.tracers.sky(ctx, { t: 0.2, world }),
    lens: (ctx) => FLOURISH2.lens.near(ctx, { t: 1, world }),
    lensed: (ctx) => AMBIENT2.lensed(ctx, { n: 20, speed: 1, size: [1, 3], alpha: 0.5, colors: ['#ffffff'] }, 1, 0, 0, world),
    constellation: (ctx) => FLOURISH6.constellation.sky(ctx, { t: 7 }),
    ...armada,
    ...carnival,
  };
  for (const [name, run] of Object.entries(runs)) {
    const ctx = context();
    run(ctx);
    assert.equal(ctx.lineCap, 'butt', name);
  }
});

// A context that keeps the state a painter may change, with a real save and restore, and hands everything else to the sink.
const stateful = () => {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const stack = [];
  return new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
};

test("Ember Carnival's flourishes and ambient leave the line caps and joins, widths, colours, alpha and blend mode as they found them", () => {
  for (const [name, run] of Object.entries(carnival)) {
    const ctx = stateful();
    const before = { ...ctx };
    run(ctx);
    assert.deepEqual({ ...ctx }, before, name);
  }
});
