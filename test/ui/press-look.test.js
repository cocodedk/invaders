import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, recorder } from './aliens-bath-kit.js';

// World 20's look (looks/w20.js) listed in LOOKS (part 6 of 7): the twentieth entry, given to a level of world 20, and through the
// registries the game uses its sky body, three layers and ambient entries draw under stand-in canvases, its five roles have world
// 20's art and its music gives world 20's style.
const { LOOKS, lookFor } = await import('../../src/ui/looks/index.js');
const { default: w20 } = await import('../../src/ui/looks/w20.js');
const { PRESS_WORLD } = await import('../../src/ui/press-kit.js');
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { buildSky } = await import('../../src/ui/sky.js');
const { buildLayers } = await import('../../src/ui/parallax.js');
const { drawAmbient } = await import('../../src/ui/ambient.js');
const { art } = await import('../../src/ui/aliens/bake.js');
const { default: w20art } = await import('../../src/ui/aliens/w20.js');
const { kitFor } = await import('../../src/ui/sound-data.js');

const look = LOOKS[PRESS_WORLD - 1];
const AMBIENT_TRIES = 20;

test("LOOKS lists twenty-one looks, the twentieth is world 20's look, and lookFor gives it to a level of world 20", () => {
  assert.equal(LOOKS.length, 21);
  assert.deepEqual(look, { world: PRESS_WORLD, ...w20 });
  assert.equal(lookFor({ world: PRESS_WORLD }), look);
});

test("through the game's registries the look's body, layers and ambient draw, its roles have world 20's art and its music is the press", () => {
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
  for (const role of ROLES) assert.equal(A[role], w20art[role], role);
  assert.equal(kitFor(look.music).style, 'press');
});
