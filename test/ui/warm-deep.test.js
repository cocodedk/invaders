import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, sink } from './dom-kit.js';

// Lantern Deep bakes everything it draws from a sprite when the level's view is created (warm-deep.js), so that no
// frame of the fight pays for one: after warmDeep, drawing every flourish, ambient and power over a stretch of
// time makes no new canvas. Other worlds are left alone.
installCanvas(64);
let made = 0;
const stand = document.createElement;
document.createElement = (...a) => { made++; return stand(...a); };
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { warmDeep } = await import('../../src/ui/warm-deep.js');
const { buildLayers } = await import('../../src/ui/parallax.js');
const { drawFlourishes } = await import('../../src/ui/flourish.js');
const { drawAmbient } = await import('../../src/ui/ambient.js');
const { drawPearls } = await import('../../src/ui/ship-deep.js');
const { drawTridents } = await import('../../src/ui/shots-deep.js');

const look = LOOKS[14];

test('warming another world bakes nothing', () => {
  made = 0;
  for (const other of LOOKS.slice(0, 14)) warmDeep(other);
  assert.equal(made, 0);
});

test('after warmDeep nothing the world draws is baked mid-fight: the water, the creatures, the maelstrom, the pearls and the trident', () => {
  const layers = buildLayers(look, 5);
  made = 0;
  warmDeep(look);
  assert.ok(made >= 30, `${made} sprites baked up front`);
  made = 0;
  const world = { ship: { x: 960, y: 900, alive: true, power: { kind: 'pearls', left: 5 } }, well: { x: 960, y: 300 }, level: { world: 15 } };
  for (const t of [3, 17, 41, 77, 123]) {
    const env = { v: { look, layers, cache: {} }, world, t, quality: 1 };
    for (const phase of ['sky', 'far', 'mid', 'near', 'front', 'screen']) {
      drawFlourishes(sink, env, phase, -160, 300);
      drawAmbient(sink, look, phase, { t, drift: 0, wind: 0, world });
    }
    drawPearls(sink, world.ship, look, t, 1);
    drawTridents(sink, [{ x: 500, y: 500, vx: 0, vy: -1000, trident: true, pierced: [1] }], t);
  }
  assert.equal(made, 0, `${made} sprites baked while drawing`);
});
