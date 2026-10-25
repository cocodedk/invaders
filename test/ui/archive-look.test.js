import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';

// Starlit Archive's look under stand-in canvases: what its layers light and mark, and how its flourishes
// come and go (looks.test.js has the other worlds').
installCanvas(64);
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { buildLayers } = await import('../../src/ui/parallax.js');
const { drawFlourishes } = await import('../../src/ui/flourish.js');
const { CONSTELLATIONS } = await import('../../src/ui/sky-bodies-4.js');

function env(look, layers, t) {
  return { v: { look, layers, cache: {} }, world: { level: {} }, fx: { flashes: [], time: t }, t, quality: 1 };
}

test("Starlit Archive's stacks burn warm, the hall's rose window glows gold with teal in it, the islands carry lit lamps, the rail has candles that flicker", () => {
  const look = LOOKS[11];
  assert.equal(look.world, 12);
  const [far, mid, near] = buildLayers(look, 5);
  assert.ok(far.lights.filter((l) => look.layers[0].window.includes(l.color)).length >= 20, `${far.lights.length} lights on the stacks`);
  assert.ok(far.lights.some((l) => l.color === look.layers[0].rose && l.mode === 'pulse' && l.r > 150), 'the rose window breathes');
  assert.ok(far.lights.some((l) => l.color === look.layers[0].accent), 'and its teal petals shine');
  assert.ok(mid.lights.filter((l) => l.color === look.layers[1].lamp && l.mode === 'pulse' && l.r === 44).length >= 4, 'a reading lamp lit on every island');
  assert.ok(mid.lights.some((l) => l.mode === 'flicker'), 'lanterns hanging under the islands');
  const flames = near.lights.filter((l) => l.color === look.layers[2].flame && l.mode === 'flicker');
  assert.ok(flames.length >= 30, `${flames.length} flames on the rail`);
  assert.equal(far.signs.length, 0);
  assert.equal(mid.signs.filter((s) => s.orrery).length, 1, 'the orrery is marked for its planets');
  assert.ok(near.signs.filter((s) => s.ink).length >= 6 && near.signs.filter((s) => s.book).length >= 3, 'the pools and the open books are marked');
});

test("the constellations draw themselves from star to star and fade again, each on a time of its own, so the sky is never bare and never all drawn at once", () => {
  const look = LOOKS[11];
  const lines = (t) => {
    const { ctx, calls } = recorder();
    drawFlourishes(ctx, env(look, [], t), 'sky');
    return calls.filter(([k]) => k === 'lineTo').length;
  };
  const cycle = Array.from({ length: 52 }, (_, i) => lines(i * 0.5));
  const links = CONSTELLATIONS.reduce((n, c) => n + c.links.length, 0);
  assert.ok(Math.min(...cycle) >= links / 3, `${Math.min(...cycle)} segments at the fewest`);
  assert.ok(Math.max(...cycle) < links + 4, `${Math.max(...cycle)} at the most, of ${links} links`);
  assert.ok(Math.max(...cycle) - Math.min(...cycle) >= 4, 'they grow and fade, they do not hold still');
  for (const c of CONSTELLATIONS) assert.ok(c.links.every(([a, b]) => c.stars[a] && c.stars[b] && a !== b), 'every line joins two of its own stars');
});

test("the comet, the paper cranes and the gust of pages each cross now and then, and the cranes more often than the comet", () => {
  const look = LOOKS[11];
  assert.ok(['comet', 'cranes', 'gust'].every((f) => look.flourish.includes(f)));
  const seen = { comet: 0, cranes: 0, gust: 0 };
  for (let i = 0; i < 3000; i++) {
    const sky = recorder();
    drawFlourishes(sky.ctx, env(look, [], i * 0.1), 'sky');
    if (sky.calls.some(([k, , , , w]) => k === 'drawImage' && w === 760)) seen.comet++; // the comet's long ion tail
    if (sky.calls.filter(([k]) => k === 'scale').length >= 3) seen.cranes++;
    const front = recorder();
    drawFlourishes(front.ctx, env(look, [], i * 0.1), 'front');
    if (front.calls.filter(([k]) => k === 'drawImage').length >= 5) seen.gust++;
  }
  assert.ok(seen.comet > 30 && seen.comet < 1500, `${seen.comet} of 3000 frames have the comet`);
  assert.ok(seen.cranes > 100 && seen.cranes < 1500, `${seen.cranes} frames have a flock`);
  assert.ok(seen.cranes > seen.comet, 'a flock is commoner than a comet');
  assert.ok(seen.gust > 30 && seen.gust < 1500, `${seen.gust} frames in a gust`);
});

test("the orrery's planets circle on their rings, the pools glint, and a page turns on an open book now and then", () => {
  const look = LOOKS[11];
  const layers = buildLayers(look, 5);
  const draw = (phase, t) => {
    const { ctx, calls } = recorder();
    drawFlourishes(ctx, env(look, layers, t), phase, 0, 600);
    return calls;
  };
  const at = (t) => draw('mid', t).filter(([k]) => k === 'drawImage').map((c) => c[2].toFixed(1)).join();
  assert.ok(draw('mid', 3).filter(([k]) => k === 'drawImage').length >= 12, 'four planets, each with a glow, a body and a highlight');
  assert.notEqual(at(3), at(3.7), 'they move');
  assert.ok(draw('near', 2.7).filter(([k]) => k === 'drawImage').length >= 3, 'stars on the ink');
  let turning = 0;
  for (let i = 0; i < 600; i++) if (draw('near', i * 0.1).some(([k]) => k === 'quadraticCurveTo')) turning++;
  assert.ok(turning > 20 && turning < 400, `${turning} of 600 frames with a page in the air`);
});
