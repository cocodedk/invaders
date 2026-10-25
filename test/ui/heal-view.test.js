import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { readFileSync } from 'node:fs';

// How the view crossfades world 17's baked smog and clean twins as h moves (src/ui/heal-view.js), and
// the healing files' purity. The h itself, its easing and its stages are heal.test.js.
installCanvas(64);
const { createHeal, stage } = await import('../../src/ui/heal.js');
const { drawHealSky, drawHealLayer, lightsK } = await import('../../src/ui/heal-view.js');

const near = (a, b, why) => assert.ok(Math.abs(a - b) < 1e-9, `${why}: ${a} vs ${b}`);

// Canvases whose context records what is drawn on them (a mix is composed into one of these), keyed by the canvas.
const recording = () => {
  globalThis.document.createElement = () => {
    const r = recorder();
    return { width: 64, height: 32, getContext: () => r.ctx, calls: r.calls };
  };
};
const draws = (calls) => calls.filter((c) => c[0] === 'drawImage').map((c) => [c[1].n ?? c[1].name, c.alpha]);
const lastCompose = (calls) => calls.slice(calls.findLastIndex((c) => c[0] === 'clearRect')); // what the latest composition drew
const sixtyFourths = (v) => Math.round(v * 64) * 0.015625;

test('the sky is drawn as it is at h 0 and, from then on, as one composed crossfade of the clean sky under the smog one', () => {
  recording();
  const sky = { name: 'smog' };
  const heal = createHeal();
  heal.sky = { name: 'clean' };
  const frame = (h) => {
    heal.h = h;
    heal.work = 0;
    const { ctx, calls } = recorder();
    ctx.globalAlpha = 1;
    drawHealSky(ctx, sky, heal);
    return calls.filter((c) => c[0] === 'drawImage').map((c) => c[1]);
  };
  assert.deepEqual(frame(0).map((i) => i.name), ['smog'], 'h 0: the smog sky itself, nothing composed');
  assert.equal(heal.mix, null);
  const mid = frame(0.5);
  assert.equal(mid.length, 1, 'one blit, whatever the mix');
  assert.equal(mid[0], heal.mix.canvas, 'the mix');
  const parts = draws(lastCompose(heal.mix.canvas.calls));
  assert.deepEqual(parts.map((d) => d[0]), ['clean', 'smog']);
  near(parts[1][1], sixtyFourths(1 - stage(0.5, 'smog')), 'the smog over the clean at its share (in 64ths)');
  const before = heal.mix.canvas.calls.length;
  frame(0.5);
  frame(0.5 + 0.001);
  assert.equal(heal.mix.canvas.calls.length, before, 'the same amounts compose nothing again');
  frame(0.9);
  assert.ok(heal.mix.canvas.calls.length > before, 'a new amount does');
  const end = frame(1);
  assert.equal(end[0], heal.mix.canvas);
  assert.deepEqual(draws(lastCompose(heal.mix.canvas.calls)).map((d) => d[0]), ['clean'], 'at h 1 the mix holds the clean sky alone');
});

test('a layer is drawn as it is at h 0, then as a composed mix of its clean twin, its smog twin and its green overlay', () => {
  recording();
  const heal = createHeal();
  const L = { canvas: { n: 'smog', width: 64, height: 32 }, clean: { n: 'clean' }, over: { n: 'over' }, top: 380, heal };
  const frame = (h) => {
    heal.h = h;
    heal.work = 0;
    const { ctx, calls } = recorder();
    ctx.globalAlpha = 1;
    drawHealLayer(ctx, L, -160);
    return calls.filter((c) => c[0] === 'drawImage');
  };
  const [d0] = frame(0);
  assert.equal(d0[1], L.canvas);
  assert.equal(L.mix, undefined, 'h 0: the layer itself, nothing composed');
  const mid = frame(0.6);
  assert.equal(mid.length, 1);
  assert.deepEqual(mid[0].slice(1, 4), [L.mix.canvas, -160, 380], "one blit of the mix at the layer's place");
  const parts = draws(lastCompose(L.mix.canvas.calls));
  assert.deepEqual(parts.map((d) => d[0]), ['clean', 'smog', 'over']);
  near(parts[1][1], sixtyFourths(1 - stage(0.6, 'smog')), 'smog share');
  near(parts[2][1], sixtyFourths(stage(0.6, 'green')), 'green share');
  frame(1);
  assert.deepEqual(draws(lastCompose(L.mix.canvas.calls)).map((d) => d[0]), ['clean', 'over'], 'at h 1: the clean twin and the greenery');
  L.over = null;
  L.mix = undefined;
  frame(1);
  assert.deepEqual(draws(lastCompose(L.mix.canvas.calls)).map((d) => d[0]), ['clean']);
  heal.h = 0;
  near(lightsK(L), 1, 'lights at full in the smog');
  heal.h = 1;
  near(lightsK(L), 0.25, 'and a quarter in the morning');
});

test('no frame composes more than one crossfade once the first is up: the sky and the three layers take their turns as h moves', () => {
  recording();
  const heal = createHeal();
  heal.sky = { name: 'clean' };
  const layers = [0, 1, 2].map((i) => ({ canvas: { n: `smog${i}`, width: 64, height: 32 }, clean: { n: 'c' }, over: { n: 'o' }, top: 0, heal }));
  const frame = (h) => {
    heal.h = h;
    heal.work = 0;
    const { ctx } = recorder();
    drawHealSky(ctx, {}, heal);
    for (const L of layers) drawHealLayer(ctx, L, 0);
    return heal.work;
  };
  assert.equal(frame(0.3), 4, 'the first frame composes all four (there is nothing yet to show)');
  assert.equal(frame(0.3), 0, 'the same h composes nothing');
  const works = [];
  for (let i = 0; i < 6; i++) works.push(frame(0.7));
  assert.deepEqual(works, [1, 1, 1, 1, 0, 0], 'a new h is taken up one mix a frame, in turn');
  const keys = [heal.mix, ...layers.map((L) => L.mix)].map((m) => m.key);
  assert.ok(keys.every((k) => k >= 0), 'and every mix ends up current');
});

test('the files stay pure: no clock, no dice, no shadow blur', () => {
  for (const f of ['heal.js', 'heal-view.js', 'heal-layers.js']) {
    const src = readFileSync(new URL(`../../src/ui/${f}`, import.meta.url), 'utf8');
    assert.ok(!/Math\.random|Date\.now|performance\.now|shadowBlur/.test(src), f);
    assert.ok(src.split('\n').length < 200, f);
  }
});
