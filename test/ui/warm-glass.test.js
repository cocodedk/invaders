import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, sink } from './dom-kit.js';

// The Glass Cathedral bakes everything it draws from a sprite when the level's view is created (warm-glass.js), so that
// no frame of the fight pays for one: after warmGlass (and the level's aliens, which warmAliens bakes) drawing every
// flourish, ambient, the twin, its bolts and the mending over a stretch of time makes no new canvas. Other worlds are
// left alone.
installCanvas(64);
let made = 0;
const stand = document.createElement;
document.createElement = (...a) => { made++; return stand(...a); };
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { warmGlass } = await import('../../src/ui/warm-glass.js');
const { warmAliens } = await import('../../src/ui/aliens/bake.js');
const { buildLayers } = await import('../../src/ui/parallax.js');
const { drawFlourishes } = await import('../../src/ui/flourish.js');
const { drawAmbient } = await import('../../src/ui/ambient.js');
const { drawTwin } = await import('../../src/ui/ship-glass.js');
const { drawMirrorShots } = await import('../../src/ui/shots-glass.js');
const { drawAliens } = await import('../../src/ui/aliens/index.js');
const { drawFx } = await import('../../src/ui/fx-view.js');
const { createFx } = await import('../../src/fx/fx.js');

const look = LOOKS[15];

test('warming another world bakes nothing', () => {
  made = 0;
  for (const other of LOOKS.slice(0, 15)) warmGlass(other);
  assert.equal(made, 0);
});

test('after warmGlass nothing the world draws is baked mid-fight: the backdrop, the twin, its bolts, the shards and the mending', () => {
  const layers = buildLayers(look, 5);
  warmAliens(look);
  made = 0;
  warmGlass(look);
  assert.ok(made >= 40, `${made} sprites baked up front`);
  made = 0;
  warmGlass(look);
  assert.equal(made, 0, 'warming twice bakes nothing more');
  const ship = { x: 960, y: 900, vx: 0, vy: 0, alive: true, power: { kind: 'mirror', left: 5 } };
  const world = { ship, level: { world: 16 }, aliens: [], saucer: null, wrecks: [0.2, 1.1, 1.9].map((age, i) => ({ x: 600 + i * 200, y: 320, left: 2 - age, slot: { row: i, col: 1 } })) };
  const fx = createFx();
  for (const kind of ['mend', 'scatter']) fx.rings.push({ kind, x: 800, y: 320, seed: 3, color: '#d8f4ff', life: 0.25, max: 0.5, r: 1 });
  for (const t of [3, 17, 41, 77, 123]) {
    const env = { v: { look, layers, cache: {} }, world, fx, t, quality: 1 };
    for (const phase of ['sky', 'far', 'mid', 'near', 'front', 'screen']) {
      drawFlourishes(sink, env, phase, -160, 300);
      drawAmbient(sink, look, phase, { t, drift: 0, wind: 0, world });
    }
    for (const left of [9.9, 5, 0.2]) drawTwin(sink, { ...ship, vx: t % 2 ? 500 : -500, power: { kind: 'mirror', left } }, look, t, 1);
    drawMirrorShots(sink, [{ x: 500, y: 500, vx: 0, vy: -1400, mirror: true }], t);
    drawAliens(sink, world, look, t);
    drawFx(sink, fx);
  }
  assert.equal(made, 0, `${made} sprites baked while drawing`);
});
