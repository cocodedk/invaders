import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';

// Every look's art direction resolves against the registries (a typo in a kind or a body name would
// otherwise show only on that world's screen), under stand-in canvases that swallow every call.
installCanvas(64);
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { buildSky } = await import('../../src/ui/sky.js');
const { buildLayers } = await import('../../src/ui/parallax.js');
const { drawAmbient } = await import('../../src/ui/ambient.js');
const { drawFlourishes } = await import('../../src/ui/flourish.js');

const PHASES = ['sky', 'far', 'mid', 'near', 'front', 'screen', 'neonfar', 'neonmid'];

function env(look, layers, t) {
  return { v: { look, layers, cache: {} }, world: { level: {} }, fx: { flashes: [], time: t }, t, quality: 1 };
}

test('every look has a sky body, three layers and ambient entries that exist and paint', () => {
  for (const look of LOOKS) {
    assert.ok(BODIES[look.body], `w${look.world} body ${look.body}`);
    buildSky(look);
    const layers = buildLayers(look, 3);
    assert.equal(layers.length, 3, `w${look.world} layers`);
    for (const phase of ['sky', 'mid', 'front', 'screen']) {
      drawAmbient(globalThis.document.createElement().getContext(), look, phase, { t: 2.7, drift: 40, wind: 0, world: {} });
    }
    for (const phase of PHASES) drawFlourishes(globalThis.document.createElement().getContext(), env(look, layers, 2.7), phase, 0, 600);
  }
});

test("Tidal Siege's far city is lit windows and red beacons only: no neon, no billboards", () => {
  const look = LOOKS[8];
  assert.equal(look.world, 9);
  const [far, mid, near] = buildLayers(look, 5);
  assert.ok(far.lights.length > 0 && far.lights.every((l) => l.color === '#ff3a3a'), 'beacons only');
  assert.equal(far.signs.length, 0);
  assert.ok(mid.lights.some((l) => l.color === look.layers[1].lamp), 'sodium lamps on the quay');
  assert.ok(near.lights.length > 0, 'glints on the water');
});

test("Tidal Siege's sheet lightning flashes now and then and is dark between", () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => { if (k === 'drawImage') calls.push(a); }), set: (o, k, v) => ((o[k] = v), true) });
  const look = LOOKS[8];
  assert.ok(look.flourish.includes('sheet'));
  let lit = 0;
  for (let i = 0; i < 1200; i++) {
    const before = calls.length;
    drawFlourishes(ctx, env(look, [], i * 0.05), 'sky');
    if (calls.length > before) lit++;
  }
  assert.ok(lit > 20 && lit < 300, `${lit} of 1200 frames lit`);
});
