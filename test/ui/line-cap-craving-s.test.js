import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, sink } from './dom-kit.js';

// What test/ui/line-cap.test.js asks of every world's drawing, for the Craving's smoke (bosses/craving-puff.js, -blob, -wisp, -smoke,
// -figure, -paint, -thick, -frames, -ember, -fx): each painter must leave every piece of the context's state (line caps and joins, widths,
// colours, alpha, blend mode) as it found it, or later strokes (the HUD's power ring) inherit it.
installCanvas(64);
const { smokeMass, lay, puff } = await import('../../src/ui/bosses/craving-puff.js');
const { bump, grain } = await import('../../src/ui/bosses/craving-blob.js');
const { paintWisp, paintCurl } = await import('../../src/ui/bosses/craving-wisp.js');
const { tendril } = await import('../../src/ui/bosses/craving-smoke.js');
const { figure } = await import('../../src/ui/bosses/craving-figure.js');
const { paintBody, cutMouth, edges } = await import('../../src/ui/bosses/craving-paint.js');
const { spill, fadeSpill, coalStreams } = await import('../../src/ui/bosses/craving-spill.js');
const { plumes } = await import('../../src/ui/bosses/craving-plume.js');
const { paintThick } = await import('../../src/ui/bosses/craving-thick.js');
const { bodyOn } = await import('../../src/ui/bosses/craving-frames.js');
const { behind, fx } = await import('../../src/ui/bosses/craving-fx.js');
const { glows, breath, embers, rain, wisps } = await import('../../src/ui/bosses/craving-ember.js');
const { motion } = await import('../../src/ui/bosses/craving-motion.js');
const { BOSS_DEFS } = await import('../../src/core/bosses-data.js');

const def = BOSS_DEFS.find((d) => d.kind === 'craving');
const boss = (phase) => ({ x: 0, y: 0, phase, parts: def.parts.map((p) => ({ ...p, x: p.dx, y: p.dy, max: p.hp })) });

// A context that keeps the state a painter may change, with a real save and restore, and hands everything else to the sink.
const stateful = (comp = 'source-over') => {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: comp };
  const stack = [];
  return new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
};

const painters = {
  bump: (g) => bump(g, 50, 50, 40, 3, 1, 1, 1),
  grain: (g) => grain(g, 50, 50, 40, 8, 3),
  wisp: (g) => paintWisp(g, 144, 72, 1, false),
  wispLit: (g) => paintWisp(g, 144, 72, 2, true),
  curl: (g) => paintCurl(g, 104, 104, 1, false),
  curlLit: (g) => paintCurl(g, 104, 104, 2, true),
  lay: (g) => lay(g, 'billow', 0, 0, 144, 3, 5, 0.3, 6, -100),
  layNearTop: (g) => lay(g, 'cool', 0, -140, 200, 3, 5, 0.3, 6, -154),
  smokeMass: (g) => smokeMass(g, 0, 0, 120, 60, 5, { pose: 0.4, size: 1.5, top: -50 }),
  tendril: (g) => tendril(g, [0, 0, 60, -40, 120, 0], 30, 8, 3, { pose: 0.2 }),
  figure: (g) => figure(g, 0.3),
  paintBody: (g) => paintBody(g, 0.6),
  paintBodyFigure: (g) => paintBody(g, 0.6, 'body'),
  cutMouth: (g) => cutMouth(g),
  edges: (g) => edges(g),
  spill: (g) => spill(g, 0.3),
  fadeSpill: (g) => fadeSpill(g, 140),
  coalStreams: (g) => coalStreams(g, 0.3, -154),
  paintThick: (g) => paintThick(g, 0.5),
  bodyOn: (g) => bodyOn(g, 0.2),
};

test("the Craving's smoke painters leave the line caps and joins, widths, colours, alpha and blend mode as they found them", () => {
  for (const [name, run] of Object.entries(painters)) {
    const ctx = stateful();
    const before = { ...ctx };
    run(ctx);
    assert.deepEqual({ ...ctx }, before, name);
  }
  assert.ok(puff('curl', 72, 0));
});

test("the Craving's live smoke and embers, every phase, both passes and every part of them, leave the context as they found it", () => {
  for (const phase of [0, 1, 2]) {
    const b = boss(phase);
    const m = motion(b, 14, phase);
    const parts = {
      glows: (g) => glows(g, b, m, 14, 1),
      breath: (g) => breath(g, b, m, 1),
      embers: (g) => embers(g, b, m, 14, 1),
      rain: (g) => rain(g, m, 1),
      wisps: (g) => wisps(g, b, m, 1),
      plumes: (g) => plumes(g, b, m, 1),
      fxDark: (g) => fx(g, b, 14, 1, false, 9),
      fxOwn: (g) => fx(g, b, 14, 1, true, 9),
    };
    for (const [name, run] of Object.entries(parts)) {
      const ctx = stateful('lighter');
      const before = { ...ctx };
      run(ctx);
      assert.deepEqual({ ...ctx, globalAlpha: 1 }, { ...before, globalAlpha: 1 }, `${name}, phase ${phase}`);
    }
    const ctx = stateful();
    const before = { ...ctx };
    behind(ctx, b, 14);
    assert.deepEqual({ ...ctx }, before, `behind, phase ${phase}`);
  }
});
