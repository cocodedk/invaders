import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder, sink } from './dom-kit.js';

// Every look's art direction resolves against the registries (a typo in a kind or a body name would
// otherwise show only on that world's screen), under stand-in canvases that swallow every call.
installCanvas(64);
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { buildSky } = await import('../../src/ui/sky.js');
const { buildLayers } = await import('../../src/ui/parallax.js');
const { buildHealLayers } = await import('../../src/ui/heal-layers.js');
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
    const layers = look.heal ? buildHealLayers(look, 3, { h: 0 }) : buildLayers(look, 3); // world 17's layers are baked twice (createView)
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

test("Aurora Kingdom's castle windows burn pale gold, its spires and cliff lips follow the aurora, two ships keep a lantern lit, the lighthouse and the water are marked", () => {
  const look = LOOKS[10];
  assert.equal(look.world, 11);
  const [far, mid, near] = buildLayers(look, 5);
  assert.ok(far.lights.filter((l) => look.layers[0].window.includes(l.color)).length >= 14, 'windows lit in the castle');
  assert.ok(far.lights.filter((l) => l.mode === 'aurora').length >= 8, 'spires and peaks catch the aurora');
  assert.ok(mid.lights.filter((l) => l.mode === 'aurora').length >= 5, 'the cliff lips glow green with it');
  const lanterns = mid.lights.filter((l) => l.color === look.layers[1].lamp && l.r === 38);
  assert.equal(lanterns.length, 2, 'a lantern burning on two ships');
  assert.ok(near.signs.some((s) => s.water) && near.signs.some((s) => s.lamp), 'the water and the lantern are marked for the flourishes');
  assert.ok(near.lights.some((l) => l.r >= 50 && l.mode === 'steady'), "the lighthouse's lamp");
  assert.equal(far.signs.length, 0);
});

test("the aurora's curtains drift and fold for minutes without meeting themselves again", async () => {
  const { CURTAINS, sample, lightAt } = await import('../../src/ui/aurora-model.js');
  const hem = (c, t) => Array.from({ length: 24 }, (_, i) => sample(c, i * 80, t, { y: 0, h: 0, b: 0 }).y);
  const apart = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
  for (let c = 0; c < CURTAINS.length; c++) {
    const shots = [0, 20, 45, 90, 150, 240, 400, 700].map((t) => hem(c, t));
    for (let i = 0; i < shots.length; i++) for (let j = i + 1; j < shots.length; j++) assert.ok(apart(shots[i], shots[j]) > 2,`curtain ${c}: minute ${i} and ${j} alike`);
    assert.ok(Math.max(...shots[0]) - Math.min(...shots[0]) > 30, `curtain ${c} folds`);
  }
  for (let t = 0; t < 600; t += 7.3) for (let x = 0; x < 1920; x += 130) assert.ok(lightAt(x, t) >= 0 && lightAt(x, t) <= 1);
  const lights = Array.from({ length: 80 }, (_, i) => lightAt(300, i * 9));
  assert.ok(Math.max(...lights) - Math.min(...lights) > 0.35, 'bright patches come and go');
});

test('the aurora is a few hundred slices at full quality, fewer at half, and leaves the transform as it found it', () => {
  const look = LOOKS[10];
  const draw = (quality) => {
    const { ctx, calls } = recorder();
    drawFlourishes(ctx, { ...env(look, [], 33.3), quality }, 'sky');
    return { images: calls.filter(([k]) => k === 'drawImage').length, last: calls.filter(([k]) => k === 'setTransform').at(-1) };
  };
  const [full, half] = [draw(1), draw(0.5)];
  assert.ok(full.images >= 150 && full.images <= 420, `${full.images} drawImage calls`);
  assert.ok(half.images < full.images * 0.6, `${half.images} at half quality`);
  assert.equal(full.last[1], sink, 'the transform is set back to the one it started with');
});

test("the aurora's light shimmers on the water, the lighthouse beam sweeps and the snow squall comes only now and then", () => {
  const look = LOOKS[10];
  const layers = buildLayers(look, 5);
  const frames = (phase, n, dt, test) => {
    let hit = 0;
    for (let i = 0; i < n; i++) {
      const { ctx, calls } = recorder();
      drawFlourishes(ctx, env(look, layers, i * dt), phase);
      if (test(calls)) hit++;
    }
    return hit;
  };
  assert.ok(['aurora', 'auroraglint', 'lighthouse', 'squall'].every((f) => look.flourish.includes(f)));
  const water = frames('near', 400, 0.7, (c) => c.filter(([k]) => k === 'drawImage').length > 12);
  assert.ok(water > 40, `${water} of 400 frames with the aurora in the water`);
  const turned = new Set();
  for (let i = 0; i < 40; i++) {
    const { ctx, calls } = recorder();
    drawFlourishes(ctx, env(look, layers, i * 0.3), 'near');
    turned.add(calls.filter(([k]) => k === 'scale').map((c) => c[1].toFixed(2)).join());
  }
  assert.ok(turned.size > 12, `${turned.size} different beam angles over 12 s`);
  const squalls = frames('front', 3000, 0.1, (c) => c.some(([k]) => k === 'stroke'));
  assert.ok(squalls > 100 && squalls < 1200, `${squalls} of 3000 frames in a squall`);
});
