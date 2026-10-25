import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, sink } from './dom-kit.js';
import { createBunker, hitBunker, BUNKER } from '../../src/core/bunkers.js';

// What test/ui/line-cap.test.js asks of every world's drawing, for the player's props of Ash to Air (W17): the leaf wreath
// of the pickup rim, in every colour a power wears (pickups-view.js's own dashes are shared by every world), and the bunker view drawing the filter skin (fresh and worn), must leave
// every piece of the context's state (line caps and joins, widths, colours, alpha, blend mode) as they found it.
installCanvas(64);
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { leaves } = await import('../../src/ui/pickup-leaf.js');
const { FRAMES } = await import('../../src/ui/pickup-skins.js');
const { drawBunkers } = await import('../../src/ui/bunkers-view.js');

// A context that keeps the state a painter may change, with a real save and restore, and hands everything else to the sink.
const stateful = () => {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const stack = [];
  return new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
};

const look = LOOKS.find((l) => l.world === 17);
const worn = (hits) => {
  const b = createBunker(300, 560, BUNKER.w, BUNKER.h);
  for (let i = 0; i < hits; i++) hitBunker(b, 300 + 20 + ((i * 37) % 120), 560 + 6 + ((i * 17) % 50), 8);
  return b;
};
const runs = {
  ...Object.fromEntries(Object.entries(look.power).map(([kind, c]) => [`leaves ${kind}`, (ctx) => leaves(ctx, c)])),
  frame: (ctx) => FRAMES[17](ctx, look.power.spread),
  faded: (ctx) => { ctx.globalAlpha = 0.4; ctx.globalCompositeOperation = 'lighter'; leaves(ctx, look.power.life); },
  bunkerFresh: (ctx) => drawBunkers(ctx, { bunkers: [worn(0)] }, look),
  bunkerWorn: (ctx) => drawBunkers(ctx, { bunkers: [worn(3), worn(14)] }, look),
};

test("Ash to Air's leaf wreath and filter bunkers leave the line caps and joins, widths, colours, alpha and blend mode as they found them", () => {
  for (const [name, run] of Object.entries(runs)) {
    const ctx = stateful();
    const before = { ...ctx };
    run(ctx);
    if (name === 'faded') assert.deepEqual([ctx.globalAlpha, ctx.globalCompositeOperation], [0.4, 'lighter'], 'a fade the caller set stays');
    else assert.deepEqual({ ...ctx }, before, name);
  }
});
