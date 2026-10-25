import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, sink } from './dom-kit.js';

// The round-capped strokes of the sky (W7 tracers, W8 lensed stars and photon ring, W12 constellations) and every stroke
// of Sunset Armada's sky, water, propellers and balloons (W13) must leave the
// context's lineCap as they found it, or later strokes (the HUD's power ring) inherit round caps.
installCanvas();
const { FLOURISH2 } = await import('../../src/ui/flourish-2.js');
const { AMBIENT2 } = await import('../../src/ui/ambient-2.js');
const { FLOURISH6 } = await import('../../src/ui/flourish-6.js');
const { FLOURISH8 } = await import('../../src/ui/flourish-8.js');
const { FLOURISH9 } = await import('../../src/ui/flourish-9.js');
const { AMBIENT5 } = await import('../../src/ui/ambient-5.js');
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

test('the sky\'s round-capped strokes leave lineCap at butt', () => {
  const world = { well: { x: 960, y: 300 }, level };
  const runs = {
    tracers: (ctx) => FLOURISH2.tracers.sky(ctx, { t: 0.2, world }),
    lens: (ctx) => FLOURISH2.lens.near(ctx, { t: 1, world }),
    lensed: (ctx) => AMBIENT2.lensed(ctx, { n: 20, speed: 1, size: [1, 3], alpha: 0.5, colors: ['#ffffff'] }, 1, 0, 0, world),
    constellation: (ctx) => FLOURISH6.constellation.sky(ctx, { t: 7 }),
    ...armada,
  };
  for (const [name, run] of Object.entries(runs)) {
    const ctx = context();
    run(ctx);
    assert.equal(ctx.lineCap, 'butt', name);
  }
});
