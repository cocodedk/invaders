import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// World 17's pickup rim (pickup-leaf.js, FRAMES[17]): a wreath of fourteen fresh green leaves over a thin dark ring, round the
// capsule's dark middle, with each leaf's veins and a thread round the middle in the power's colour.
installCanvas(64);
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { FRAMES } = await import('../../src/ui/pickup-skins.js');
const { leaves } = await import('../../src/ui/pickup-leaf.js');
const { drawPickups } = await import('../../src/ui/pickups-view.js');
const { rgb } = await import('../../src/ui/sprites.js');

const look = LOOKS.find((l) => l.world === 17);
const KINDS = ['spread', 'laser', 'rapid', 'shield', 'homing', 'slow', 'bomb', 'life'];
const COLOURS = KINDS.map((k) => look.power[k]);
const rgbaOf = (hex) => `rgba(${rgb(hex).join(',')},0.9)`; // the thread round the middle
const count = (calls, name) => calls.filter(([k]) => k === name).length;

// A context that remembers every gradient stop (the leaves' greens) and every plain colour (veins, thread) it was given.
const painted = (color) => {
  const [stops, styles] = [[], []];
  const g = new Proxy({}, {
    get: (o, k) => (k === 'createLinearGradient' ? () => ({ addColorStop: (at, c) => stops.push(c) }) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), (k === 'strokeStyle' || k === 'fillStyle') && typeof v === 'string' && styles.push(v), true),
  });
  leaves(g, color);
  return { stops: stops.join(' '), styles: styles.join(' ') };
};

test('the pickup rim of world 17 is the wreath of leaves, not a borrowed one', () => {
  assert.equal(FRAMES[17], leaves);
  for (const w of [14, 15, 16]) assert.notEqual(FRAMES[17], FRAMES[w]);
});

test('the wreath is fourteen leaves in two layers, each a pointed blade with a midrib, side veins and a dew bead, and the calls are balanced', () => {
  const { ctx, calls } = recorder();
  leaves(ctx, look.power.spread);
  assert.equal(count(calls, 'bezierCurveTo'), 14 * 2, 'two curved sides to each of fourteen blades');
  assert.equal(count(calls, 'rotate'), 14 * 2, 'a turn to its place and a lean for each');
  assert.equal(count(calls, 'clip'), 14, 'the light rim is kept inside each blade');
  assert.equal(count(calls, 'ellipse'), 14, 'a bead of dew on each');
  assert.equal(count(calls, 'save'), count(calls, 'restore'), 'saves and restores balanced');
  assert.equal(count(calls, 'createLinearGradient'), 14 * 2, 'each blade shaded across, and darker at the stem');
});

test('the dark middle comes after every leaf, round the origin, with a thread of the colour inside it', () => {
  const { ctx, calls } = recorder();
  leaves(ctx, look.power.shield);
  const last = calls.map(([k], i) => (k === 'bezierCurveTo' ? i : -1)).reduce((a, b) => Math.max(a, b));
  const arcs = calls.map((c, i) => [c, i]).filter(([[k]]) => k === 'arc');
  assert.equal(arcs.length, 3, 'the ring under the leaves, the dark middle, the thread');
  const [ring, middle, thread] = arcs;
  assert.ok(ring[1] < calls.findIndex(([k]) => k === 'bezierCurveTo'), 'the ring goes down first');
  assert.deepEqual(middle[0].slice(1, 4), [0, 0, 17.4]);
  assert.ok(middle[1] > last, 'and the middle covers the leaves\' stems');
  assert.ok(thread[0][3] < middle[0][3] && thread[1] > middle[1]);
});

test('every power\'s colour tints the veins and the thread, and the leaves stay the same greens whatever the colour', () => {
  const seen = COLOURS.map(painted);
  assert.equal(new Set(seen.map((p) => p.styles)).size, new Set(COLOURS).size, 'a different set of veins for each colour');
  assert.equal(new Set(seen.map((p) => p.stops)).size, 1, 'the same shaded greens under all of them');
  for (const [i, c] of COLOURS.entries()) assert.ok(seen[i].styles.includes(rgbaOf(c)), `${c}'s thread is there`);
  const [one, two] = [recorder(), recorder()];
  leaves(one.ctx, '#ffd45a');
  leaves(two.ctx, '#8aa8ff');
  assert.equal(one.calls.length, two.calls.length, 'the same strokes whatever the tint');
});

test('the wreath lies inside its 60 x 60 sprite and fills it, for every colour a power wears', () => {
  for (const color of new Set(Object.values(look.power))) {
    const T = tracker();
    T.ctx.translate(30, 30);
    leaves(T.ctx, color);
    const b = T.bounds;
    assert.ok(b.x0 >= 1 && b.y0 >= 1 && b.x1 <= 59 && b.y1 <= 59, `${color}: ${[b.x0, b.y0, b.x1, b.y1].map((v) => v.toFixed(1))} lies inside the sprite`);
    assert.ok(b.x1 - b.x0 > 52 && b.y1 - b.y0 > 52, 'and reaches out as far as the other worlds\' rims');
  }
});

test('the capsule is baked for all eight powers, a 60 x 60 sprite each, drawn once with its icon', () => {
  const t = tracker();
  const world = { pickups: KINDS.map((kind, i) => ({ kind, x: 200 + i * 100, y: 300 })) };
  drawPickups(t.ctx, world, look, 1.5);
  const sprites = t.calls.filter((c) => c.args.length === 2 && c.comp === 'source-over');
  assert.equal(sprites.length, 8, 'a capsule each');
  assert.ok(sprites.every((c) => c.img.width === 60 && c.img.height === 60), 'the 60 x 60 sprite');
});
