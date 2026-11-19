import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, recorder } from './aliens-bath-kit.js';

// World 21's look (looks/w21.js) listed in LOOKS: the twenty-first entry, given to a level of world 21, and through the registries
// the game uses its sky body, three layers and ambient entries draw under stand-in canvases, its five roles have world 21's art and
// its music gives world 21's style.
const { LOOKS, lookFor } = await import('../../src/ui/looks/index.js');
const { default: w21 } = await import('../../src/ui/looks/w21.js');
const { ISLE_WORLD } = await import('../../src/ui/isle-kit.js');
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { buildSky } = await import('../../src/ui/sky.js');
const { buildLayers } = await import('../../src/ui/parallax.js');
const { drawAmbient } = await import('../../src/ui/ambient.js');
const { art } = await import('../../src/ui/aliens/bake.js');
const { default: w21art } = await import('../../src/ui/aliens/w21.js');
const { kitFor } = await import('../../src/ui/sound-data.js');

const look = LOOKS[ISLE_WORLD - 1];
const AMBIENT_TRIES = 20;

test("LOOKS has twenty-one entries, the twenty-first is world 21's look, and lookFor gives it to a level of world 21", () => {
  assert.equal(LOOKS.length, ISLE_WORLD);
  assert.deepEqual(look, { world: ISLE_WORLD, ...w21 });
  assert.equal(lookFor({ world: ISLE_WORLD }), look);
});

test("through the game's registries the look's body, layers and ambient draw, its roles have world 21's art and its music is the isle", () => {
  assert.equal(typeof BODIES[look.body], 'function', look.body);
  buildSky(look);
  assert.equal(buildLayers(look, 3).length, 3);
  for (const a of look.ambient) {
    let drawn = 0;
    for (let i = 0; i < AMBIENT_TRIES; i++) {
      const r = recorder();
      drawAmbient(r.ctx, { ...look, ambient: [a] }, a.phase, { t: i * 0.7, drift: 0, wind: 0, world: {} });
      drawn += r.calls.filter(([k]) => k === 'drawImage').length;
    }
    assert.ok(drawn > 0, `${a.kind} draws`);
  }
  const A = art(look);
  for (const role of ROLES) assert.equal(A[role], w21art[role], role);
  assert.equal(kitFor(look.music).style, 'isle');
});
