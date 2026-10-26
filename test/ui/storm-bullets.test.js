import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// What world 18 (Anvil Sky) draws for its dragged bullets (bullets-dragged.js), the electric arcs of its fx (arc-fx-view.js, storm-bolt.js) and its
// pickup rim (pickup-storm.js). The shots, the ship's coils and the baking are test/ui/storm-shots.test.js; the fx that make the arcs are
// test/fx/react-storm.test.js. Worlds 1 to 17 draw what they always drew.
installCanvas(64);
const { drawBullets } = await import('../../src/ui/bullets-view.js');
const { drawArc } = await import('../../src/ui/arc-fx-view.js');
const { arcPath } = await import('../../src/ui/storm-bolt.js');
const { FRAMES } = await import('../../src/ui/pickup-skins.js');
const { glow } = await import('../../src/ui/sprites.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');

const look = LOOKS[17];
const w13 = LOOKS[12];
const seeker = (x, extra = {}) => ({ pattern: 'homing', x, y: 500, vx: 120, vy: 260, r: 10, life: 4, ...extra });
const drawn = (list, quality = 1, w = look) => {
  const T = tracker();
  drawBullets(T.ctx, { bullets: list }, w, 2, quality);
  return T.calls;
};

test("a dragged bullet is the ship's: a cyan glow, a turning ring of arcs, a comet of lights and a bright orb; an enemy seeker is still the rose orb", () => {
  const [cyan, rose] = [glow(look.palette.accent), glow(look.palette.enemy)];
  const mine = drawn([seeker(900, { dragged: true })]);
  assert.ok(!mine.some((c) => c.img === rose), "not lit in the enemy's colour");
  assert.equal(mine.filter((c) => c.img.width === 56).length, 1, 'one ring');
  assert.equal(mine.filter((c) => c.img.width === 36).length, 1, 'one orb');
  const lights = mine.filter((c) => c.img === cyan && c.comp === 'lighter');
  assert.equal(lights.length, 1 + 4, "the glow in the ship's colour and four lights of the comet");
  const comet = lights.slice(1);
  assert.ok(comet.every((c) => c.box[0] < 900 && c.box[1] < 500), 'behind it, along its own path (it flies down and right)');
  const alphas = comet.map((c) => c.alpha); // drawn from the far end in
  assert.deepEqual(alphas, alphas.toSorted((a, b) => a - b), 'fainter the further back');
  assert.ok(comet[0].box[2] - comet[0].box[0] < comet.at(-1).box[2] - comet.at(-1).box[0], 'and smaller');
  assert.equal(drawn([seeker(900, { dragged: true })], 0.5).filter((c) => c.comp === 'lighter').length, 0, 'at half quality the glow and the comet are skipped');
  const plain = drawn([seeker(900)]);
  assert.ok(plain.some((c) => c.img === rose), 'an enemy seeker glows rose');
  assert.ok(!plain.some((c) => c.img === cyan || c.img.width === 56 || c.img.width === 36), 'and has no ring, orb or comet');
  assert.equal(drawn([seeker(900, { dragged: true })], 1, w13).filter((c) => c.img.width === 56).length, 1, 'the field alone decides: no world check in the drawing');
});

test('a bullet drawn after a dragged one is drawn where it is, under the base transform', () => {
  const log = [];
  let at = null;
  const ctx = {
    globalAlpha: 1, globalCompositeOperation: 'source-over', getTransform: () => 'base', setTransform: () => { at = null; },
    translate: (x, y) => { at = { x, y }; }, rotate: () => {}, drawImage: () => log.push(at),
  };
  const orb = { pattern: 'aimed', x: 700, y: 500, vx: 0, vy: 300, r: 8, life: 6 };
  drawBullets(ctx, { bullets: [seeker(100, { dragged: true }), orb] }, look, 1, 1);
  assert.equal(log.at(-1), null, 'the orb that follows is drawn under the base transform');
  assert.ok(log.some((p) => p?.x === 100), 'and the ring was drawn turned about the dragged bullet');
});

const ring = (life, extra = {}) => ({ kind: 'arc', x: 400, y: 300, r: 40, maxR: 60, n: 5, ang: 0, spread: Math.PI, seed: 77, color: '#5cf0ff', life, max: 0.3, ...extra });
const strokeAlphas = (r) => {
  const seen = [];
  const { ctx } = recorder();
  const proxy = new Proxy(ctx, { get: (t, k) => (k === 'stroke' ? () => seen.push(t.globalAlpha) : t[k]), set: (t, k, v) => ((t[k] = v), true) });
  drawArc(proxy, r);
  return seen;
};

test('an arc ring draws n bolts of three strokes, fades with its age and leaves the context as it found it', () => {
  const r = recorder();
  drawArc(r.ctx, ring(0.15));
  assert.equal(r.calls.filter(([k]) => k === 'stroke').length, 15);
  assert.equal(r.calls.filter(([k]) => k === 'moveTo').length, 5);
  assert.ok(r.calls.filter(([k]) => k === 'lineTo').every(([, x, y]) => Number.isFinite(x) && Number.isFinite(y)));
  assert.deepEqual([r.ctx.globalAlpha, r.ctx.globalCompositeOperation], [1, 'source-over'], 'context restored');
  assert.ok(Math.max(...strokeAlphas(ring(0.29))) > Math.max(...strokeAlphas(ring(0.05))), 'brighter young, fainter old');
  assert.ok(Math.max(...strokeAlphas(ring(0.05))) > 0);
  const q = recorder();
  drawArc(q.ctx, ring(0.3, { r: 0 }));
  assert.ok(q.calls.filter(([k]) => k === 'lineTo').every(([, x, y]) => Number.isFinite(x) && Number.isFinite(y)), 'a bolt of no reach is still a number');
  const shape = (seed) => {
    const p = recorder();
    drawArc(p.ctx, ring(0.2, { seed }));
    return JSON.stringify(p.calls.filter(([k]) => k === 'lineTo').map(([, x, y]) => [x, y]));
  };
  assert.equal(shape(77), shape(77), 'the same seed, the same arcs');
  assert.notEqual(shape(77), shape(78));
});

test('arcPath is a jagged line from end to end in n segments, the same for the same seed', () => {
  const trace = (seed) => {
    const r = recorder();
    arcPath(r.ctx, 0, 0, 100, 0, 6, 8, seed);
    return r.calls.map(([k, x, y]) => [k, x, y]);
  };
  const a = trace(3);
  assert.deepEqual(a[0], ['moveTo', 0, 0]);
  assert.equal(a.length, 7);
  assert.deepEqual(a.at(-1), ['lineTo', 100, 0], 'ends where it was asked to');
  assert.ok(a.slice(1, -1).every(([, , y]) => Math.abs(y) <= 8 && y !== 0), 'thrown off the line, not past the jitter');
  assert.deepEqual(trace(3), a);
  assert.notDeepEqual(trace(4), a);
});

test('the pickup rim is a Tesla ring: its own frame, inside the 60 px sprite for every colour a power wears, with arcs of the power', () => {
  assert.equal(typeof FRAMES[18], 'function');
  for (const n of [17, 16, 15, 14, 13]) assert.ok(FRAMES[18] !== FRAMES[n], `not world ${n}'s`);
  for (const color of new Set(Object.values(look.power))) {
    const T = tracker();
    T.ctx.translate(30, 30);
    FRAMES[18](T.ctx, color);
    const b = T.bounds;
    assert.ok(b.x0 >= 1 && b.y0 >= 1 && b.x1 <= 59 && b.y1 <= 59, `${color}: ${[b.x0, b.y0, b.x1, b.y1].map((v) => v.toFixed(1))} lies inside the sprite`);
    assert.ok(b.x1 - b.x0 > 50 && b.y1 - b.y0 > 50, 'and fills it');
  }
  const r = recorder();
  FRAMES[18](r.ctx, look.power.laser);
  assert.ok(r.calls.filter(([k]) => k === 'moveTo').length >= 8 * 3 + 44, 'eight arcs of three strokes, and the coil\'s windings');
});

