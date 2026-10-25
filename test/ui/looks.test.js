import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';

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
  const { ctx, calls } = recorder();
  const images = () => calls.filter(([k]) => k === 'drawImage').length;
  const look = LOOKS[8];
  assert.ok(look.flourish.includes('sheet'));
  let lit = 0;
  for (let i = 0; i < 1200; i++) {
    const before = images();
    drawFlourishes(ctx, env(look, [], i * 0.05), 'sky');
    if (images() > before) lit++;
  }
  assert.ok(lit > 20 && lit < 300, `${lit} of 1200 frames lit`);
});

test("Hollow Night's castle windows burn warm and one red, its trees hang green lanterns, its graveyard carries lit pumpkins", () => {
  const look = LOOKS[9];
  assert.equal(look.world, 10);
  const [far, mid, near] = buildLayers(look, 5);
  assert.ok(far.lights.length >= 14, `${far.lights.length} lights on the castle`);
  assert.ok(far.lights.some((l) => l.color === '#ff2a3a'), "the Count's window is red");
  assert.ok(far.lights.some((l) => look.layers[0].window.includes(l.color)), 'the rest are warm');
  assert.ok(mid.lights.some((l) => l.color === look.layers[1].lamp), 'green lanterns in the dead trees');
  const eyes = near.lights.filter((l) => l.color === '#ffb02e');
  assert.ok(eyes.length >= 15 && eyes.every((l) => l.mode === 'flicker'), `${eyes.length} carved-face lights, each flickering like a candle`);
  assert.ok(near.lights.some((l) => l.color === look.layers[2].lamp && l.r > 40), 'and the glow round each pumpkin');
  assert.equal(far.signs.length, 0);
});

test("Hollow Night's bats cross the moon now and then, and its witch more rarely", () => {
  const look = LOOKS[9];
  assert.ok(['bats', 'witch', 'bolt', 'mist'].every((f) => look.flourish.includes(f)));
  const seen = { bats: 0, witch: 0 };
  for (let i = 0; i < 3000; i++) {
    const { ctx, calls } = recorder();
    drawFlourishes(ctx, env(look, [], i * 0.1), 'sky');
    const images = calls.filter(([k]) => k === 'drawImage').length;
    if (calls.some(([k]) => k === 'rotate')) seen.witch++;
    else if (images >= 3) seen.bats++;
  }
  assert.ok(seen.bats > 300 && seen.bats < 2000, `${seen.bats} of 3000 frames have a flock`);
  assert.ok(seen.witch > 20 && seen.witch < seen.bats, `${seen.witch} frames have the witch: rarer than the bats`);
});

test("the thunder lights the sky behind the silhouettes only while lightning strikes, and flickers", () => {
  const look = LOOKS[9];
  const washes = (age) => {
    const { ctx, calls } = recorder();
    const e = env(look, [], 100);
    if (age != null) e.fx.flashes.push({ tag: 'lightning', life: 0.22 - age, max: 0.22, alpha: 0.8, full: true });
    drawFlourishes(ctx, e, 'sky');
    return calls.filter(([k]) => k === 'drawImage').map((c) => c.alpha);
  };
  assert.equal(washes(null).length, 0, 'quiet sky, quiet bats: nothing drawn');
  const [strike, stutter, glow] = [0.02, 0.1, 0.17].map((age) => Math.max(...washes(age)));
  assert.ok(strike > 0.5 && stutter < strike * 0.6 && glow > stutter, `strike, stutter, second glow: ${strike} ${stutter} ${glow}`);
  assert.ok(washes(0.215).every((a) => a < 0.3), 'and it dies away with the flash');
});
