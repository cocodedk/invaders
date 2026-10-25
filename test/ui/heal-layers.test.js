import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, sink } from './dom-kit.js';

// heal-layers.js bakes world 17's parallax layers in three modes (smog, clean, over) from one registered painter, so the smog and
// clean twins can share a silhouette: the painter is called once per mode with a fresh rng of the same seed, lights and signs are
// kept from the smog pass alone, and the generic haze and rim are applied in each mode's own colours.
installCanvas(64);
// Canvases whose context keeps the fill style it was given (the shared sink forgets everything).
const keeping = () => new Proxy({ fillStyle: '' }, { get: (o, k) => (k in o ? o[k] : sink), set: (o, k, v) => ((o[k] = v), true) });
globalThis.document.createElement = () => ({ width: 64, height: 64, getContext: () => keeping() });
const { SMOG } = await import('../../src/ui/parallax-smog.js');
const { buildHealLayers } = await import('../../src/ui/heal-layers.js');
const { createView } = await import('../../src/ui/view.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { levelById } = await import('../../src/core/levels.js');

const calls = [];
SMOG.testlayer = (g, w, h, rng, L, out, mode = 'smog') => {
  calls.push({ mode, w, h, first: rng(), fill: g.fillStyle, out });
  out.lights.push({ x: 10, y: 10, r: 5, color: '#ffffff', mode: 'steady', ph: 0 });
  out.signs.push({ x: 1 });
};
const look = {
  haze: '#8a6a44', hazeClean: '#cde6f6',
  layers: [
    { kind: 'testlayer', color: '#111111', colorClean: '#eeeeee', height: 300, speed: 0.1, over: true },
    { kind: 'testlayer', color: '#111111', colorClean: '#eeeeee', height: 200, speed: 0.4 },
  ],
};

test('each layer is painted in smog, clean and (when asked for) over modes from the same seed', () => {
  calls.length = 0;
  const heal = { h: 0 };
  const layers = buildHealLayers(look, 7, heal);
  assert.equal(layers.length, 2);
  assert.deepEqual(calls.map((c) => c.mode), ['smog', 'clean', 'over', 'smog', 'clean']);
  for (const i of [0, 3]) assert.equal(calls[i].first, calls[i + 1].first, 'the twins draw one silhouette: same seed');
  assert.equal(calls[0].first, calls[2].first);
  assert.notEqual(calls[0].first, calls[3].first, 'each layer has its own seed');
  assert.equal(calls[0].w, 2240);
  assert.equal(calls[0].h, 300);
  assert.equal(calls[0].fill, '#111111', 'the smog pass starts in the smog colour');
  assert.equal(calls[1].fill, '#eeeeee', 'the clean pass in the clean colour');
});

test('a layer carries its twins, its overlay only when asked, the view\'s heal state, and the lights of the smog pass alone', () => {
  const heal = { h: 0.3 };
  const [a, b] = buildHealLayers(look, 7, heal);
  assert.ok(a.canvas && a.clean && a.over && !b.over);
  assert.equal(a.heal, heal);
  assert.equal(a.lights.length, 1);
  assert.equal(a.signs.length, 1);
  assert.ok(a.lights[0].sprite, 'the light has its glow sprite');
  assert.deepEqual([a.top, b.top, a.speed, a.far, b.far], [780, 880, 0.1, true, false]);
});

test('world 17 gets a heal state, and every other world none', () => {
  const canvas = { width: 64, height: 64, clientWidth: 64, clientHeight: 64, getContext: () => ({}) };
  const v17 = createView(canvas, levelById('w17-1'), false);
  const v16 = createView(canvas, levelById('w16-1'), false);
  assert.ok(v17.heal && v17.heal.sky, 'the clean sky is baked with the view');
  assert.equal(v16.heal, null);
  assert.ok(v17.layers.every((L) => L.heal === v17.heal && L.clean));
  assert.ok(v16.layers.every((L) => !L.heal));
  assert.equal(LOOKS[16].heal, true);
});

test("the bake is shared by every view of a look, whatever the level's seed; each view keeps its own heal state, records and mixes", () => {
  const [h1, h2] = [{ h: 0.3 }, { h: 0.6 }];
  const a = buildHealLayers(look, 7, h1);
  const b = buildHealLayers(look, 99, h2);
  a.forEach((A, i) => {
    for (const k of ['canvas', 'clean', 'over', 'lights', 'signs']) assert.equal(b[i][k], A[k], `layer ${i} ${k} is the one baked`);
    assert.notEqual(b[i], A, 'but the record is the view\'s');
    assert.deepEqual([A.heal, b[i].heal], [h1, h2]);
  });
  a[0].mix = { key: 3 };
  assert.equal(b[0].mix, undefined, 'a mix canvas is made per view');
  assert.notEqual(buildHealLayers({ ...look }, 7, h1)[0].canvas, a[0].canvas, 'another look bakes its own');
});

test('two views of world 17 share the two skies, and each has its own heal state', () => {
  const canvas = { width: 64, height: 64, clientWidth: 64, clientHeight: 64, getContext: () => ({}) };
  const [v1, v2] = [createView(canvas, levelById('w17-1'), false), createView(canvas, levelById('w17-4'), false)];
  assert.equal(v2.sky, v1.sky);
  assert.equal(v2.heal.sky, v1.heal.sky);
  assert.notEqual(v1.sky, v1.heal.sky, 'the smog sky and the clean one are two canvases');
  assert.notEqual(v2.heal, v1.heal);
  assert.equal(v2.layers[0].canvas, v1.layers[0].canvas);
});
