import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { look } from './deep-kit.js';

// Lantern Deep's pickup rim and power icons (art-deep.test.js has its bunkers): a ring of scallop shells and
// pearls, two icons that stay inside their boxes and cost a handful of path calls, and painters that put the
// context back as they found it.
installCanvas(64);
const { FRAMES, ICONS } = await import('../../src/ui/pickup-skins.js');
const { shells, ICONS15 } = await import('../../src/ui/pickup-deep.js');
const { drawIcon, drawPickups } = await import('../../src/ui/pickups-view.js');

const POWER_KINDS = Object.keys(look.power);
const NEW_POWERS = ['pearls', 'trident'];
// Every power the look tints, so the rim is tried on each colour of the world.
const COLOURS = POWER_KINDS.map((k) => look.power[k]);
const capsule = (paint) => {
  const T = tracker();
  T.ctx.translate(30, 30); // the 60 x 60 sprite's centre, as pickups-view.js bakes it
  paint(T.ctx);
  const { x0, y0, x1, y1 } = T.bounds;
  return { x0: x0 - 30, y0: y0 - 30, x1: x1 - 30, y1: y1 - 30 }; // about the centre
};

test("the pickup rim is a ring of scallop shells and pearls: eight shells, long and short, a pearl between each pair, on every tint, inside its 60 x 60 sprite", () => {
  assert.equal(FRAMES[15], shells);
  const { ctx, calls } = recorder();
  FRAMES[15](ctx, '#5af0ff');
  assert.equal(calls.filter(([k]) => k === 'rotate').length, 8, 'a turn for each shell');
  assert.equal(calls.filter(([k]) => k === 'save').length, calls.filter(([k]) => k === 'restore').length, 'balanced');
  assert.equal(calls.filter(([k]) => k === 'quadraticCurveTo').length, 8 * 5, 'five lobes on the lip of each shell');
  assert.equal(calls.filter(([k]) => k === 'createRadialGradient').length, 16, 'a gradient for each shell and each pearl');
  assert.equal(calls.filter(([k]) => k === 'arc').length, 1 + 16 + 1, 'the middle, two arcs a pearl, the ring');
  const reach = new Set();
  for (const color of COLOURS) {
    const b = capsule((g) => shells(g, color));
    assert.ok(b.x0 >= -30 && b.y0 >= -30 && b.x1 <= 30 && b.y1 <= 30, `${color}: ${[b.x0, b.y0, b.x1, b.y1].map(Math.round)} is inside the sprite`);
    assert.ok(Math.min(-b.x0, -b.y0, b.x1, b.y1) >= 26, `${color}: the rim reaches out like the other worlds' (${[b.x0, b.y0, b.x1, b.y1].map(Math.round)})`);
    reach.add(`${Math.round(b.x0)},${Math.round(b.y0)},${Math.round(b.x1)},${Math.round(b.y1)}`);
  }
  assert.equal(reach.size, 1, 'the same shape whatever the tint');
  assert.equal(Object.keys(FRAMES).length >= 15, true);
});

test("the pickup rim is tinted by the power's colour and keeps its dark middle", () => {
  const stops = (color) => {
    const seen = [];
    const g = new Proxy({}, { get: (o, k) => (k === 'createRadialGradient' ? () => ({ addColorStop: (at, c) => seen.push(c) }) : () => sink), set: () => true });
    FRAMES[15](g, color);
    return seen.join(' ');
  };
  assert.notEqual(stops('#5af0ff'), stops('#ffd45a'), 'the shells take the power as their colour');
  const { ctx, calls } = recorder();
  FRAMES[15](ctx, '#5af0ff');
  const first = calls.find(([k]) => k === 'arc');
  assert.deepEqual(first.slice(1, 4), [0, 0, 21], 'the dark middle comes first, round the origin');
});

test('the pearls and the trident each have an icon about 30 px across, centred, in plain paths', () => {
  assert.equal(ICONS[15], ICONS15);
  assert.deepEqual(Object.keys(ICONS15).sort(), NEW_POWERS.slice().sort());
  for (const kind of NEW_POWERS) {
    const b = capsule((g) => ICONS15[kind](g, look.power[kind]));
    const [w, h] = [b.x1 - b.x0, b.y1 - b.y0];
    assert.ok(w >= 24 && w <= 31 && h >= 24 && h <= 33, `${kind}: ${w.toFixed(1)} x ${h.toFixed(1)} px`);
    assert.ok(Math.abs(b.x0 + b.x1) < 2 && Math.abs(b.y0 + b.y1) < 5, `${kind} is centred: ${[b.x0, b.y0, b.x1, b.y1].map((v) => v.toFixed(1))}`);
    const { ctx, calls } = recorder();
    ICONS15[kind](ctx, look.power[kind]);
    assert.ok(calls.length > 8 && calls.length < 70, `${kind} is ${calls.length} calls: cheap enough for the HUD to draw every frame`);
    assert.ok(!calls.some(([k]) => /Gradient|drawImage|Pattern|filter|getImageData|createImageData/.test(k)), `${kind} makes no gradient, image or filter`);
    assert.ok(calls.filter(([k]) => k === 'stroke' || k === 'fill').length <= 24, `${kind} fills and strokes only a few paths`);
  }
  assert.ok(look.power.pearls && look.power.trident && look.power.pearls !== look.power.trident, 'a tint each');
  for (const kind of NEW_POWERS) assert.ok(!POWER_KINDS.slice(0, 6).some((k) => look.power[k] === look.power[kind]), `${kind}'s tint is its own`);
});

test('the pearls are three pearls on a ring with a comet tail behind each; the trident is three barbed tines, a crossbar and a long shaft', () => {
  const pearls = recorder();
  ICONS15.pearls(pearls.ctx, '#ffd8f0');
  assert.equal(pearls.calls.filter(([k]) => k === 'fill').length, 6, 'a pearl and its glint, three times over');
  assert.equal(pearls.calls.filter(([k]) => k === 'arc').length, 1 + 3 * 5, 'the ring, then per pearl two tails, the body, the shaded side and the glint');
  const trident = recorder();
  ICONS15.trident(trident.ctx, '#5af0ff');
  assert.equal(trident.calls.filter(([k]) => k === 'closePath').length, 3, 'three spearheads');
  assert.equal(trident.calls.filter(([k]) => k === 'quadraticCurveTo').length, 2, 'the crossbar is a U');
  assert.ok(trident.calls.some(([k]) => k === 'fillRect'), 'a collar on the shaft');
  const b = capsule((g) => ICONS15.trident(g, '#5af0ff'));
  assert.ok(b.y1 - b.y0 > b.x1 - b.x0, 'upright: taller than wide');
});

test('the capsule is baked and drawn for both new powers in this world, icon and rim together', () => {
  const t = tracker();
  const world = { pickups: NEW_POWERS.map((kind, i) => ({ kind, x: 500 + i * 100, y: 300 })) };
  drawPickups(t.ctx, world, look, 1.5);
  const sprites = t.calls.filter((c) => c.args.length === 2 && c.comp === 'source-over');
  assert.equal(sprites.length, 2, 'a capsule each');
  assert.ok(sprites.every((c) => c.img.width === 60 && c.img.height === 60), 'the 60 x 60 sprite');
});

// A context that keeps the state a painter may change, with a real save and restore, and hands everything else to the sink.
const stateful = () => {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const stack = [];
  return new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
};

test('the rim and both icons leave the line caps, joins, widths, colours, alpha and blend mode as they found them, and drawIcon too', () => {
  const runs = {
    frame: (g) => COLOURS.forEach((c) => shells(g, c)),
    pearls: (g) => ICONS15.pearls(g, look.power.pearls),
    trident: (g) => ICONS15.trident(g, look.power.trident),
    drawPearls: (g) => drawIcon(g, 'pearls', look.power.pearls, 15),
    drawTrident: (g) => drawIcon(g, 'trident', look.power.trident, 15),
    faded: (g) => { g.globalAlpha = 0.4; g.globalCompositeOperation = 'lighter'; ICONS15.pearls(g, '#ffd8f0'); },
  };
  for (const [name, run] of Object.entries(runs)) {
    const ctx = stateful();
    const before = { ...ctx };
    run(ctx);
    if (name === 'faded') assert.deepEqual([ctx.globalAlpha, ctx.globalCompositeOperation], [0.4, 'lighter'], 'a fade the caller set stays');
    else assert.deepEqual({ ...ctx }, before, name);
  }
});
