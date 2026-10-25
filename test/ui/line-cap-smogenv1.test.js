import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';

// What test/ui/line-cap.test.js asks of every world's drawing, for the sky, the far layer and the sky flourishes of world 17: the
// painters must leave every piece of the context's state (line caps and joins, widths, colours, alpha, blend mode) as they found it,
// or later strokes (the HUD's power ring) inherit it. Called here the way the game calls them: the two skies, the far layer in its
// three passes, and every flourish at several healings and times.
installCanvas(64);
const { stateful } = await import('./glass-env-kit.js');
const { default: w17 } = await import('../../src/ui/looks/w17.js');
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { SMOG } = await import('../../src/ui/parallax-smog.js');
const { FLOURISH_SKY } = await import('../../src/ui/flourish-smog-sky.js');
const { makeRng } = await import('../../src/core/rng.js');

const look = { world: 17, ...w17 };
const out = () => ({ lights: [], signs: [] });
const env = (h, t) => ({ v: { look, layers: [], cache: {}, heal: { h } }, world: { ship: { x: 960 } }, t, quality: 1 });
const HEALS = [0, 0.25, 0.5, 0.7, 1];
const backdrop = {
  smogsky: (ctx) => BODIES.smogsky(ctx, look, null),
  cleansky: (ctx) => BODIES.cleansky(ctx, look, null),
  ...Object.fromEntries(['smog', 'clean', 'over'].map((m) => [`far ${m}`, (ctx) => SMOG.smogcity(ctx, 2240, 700, makeRng(3), look.layers[0], out(), m)])),
  ...Object.fromEntries(Object.entries(FLOURISH_SKY).flatMap(([name, phases]) => Object.entries(phases).flatMap(([phase, f]) => HEALS.map((h) => [`${name} ${phase} h ${h}`, (ctx) => f(ctx, env(h, 11.3), -160, 380)])))),
};

test('the sky, the far layer and the sky flourishes of world 17 leave the line caps and joins, widths, colours, alpha and blend mode as they found them', () => {
  assert.ok(Object.keys(backdrop).length >= 22);
  for (const [name, run] of Object.entries(backdrop)) {
    const ctx = stateful();
    const before = { ...ctx };
    run(ctx);
    assert.deepEqual({ ...ctx }, before, name);
  }
});
