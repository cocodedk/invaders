import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, sink } from './dom-kit.js';

// What test/ui/line-cap.test.js asks of every world's drawing, for the healing crossfades of world 17 (heal-view.js): the sky and a
// layer must leave the context's state as they found it at every h, or later strokes (the HUD's power ring) inherit it.
installCanvas(64);
const { drawHealSky, drawHealLayer } = await import('../../src/ui/heal-view.js');

const stateful = () => {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const stack = [];
  return new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
};

test('the healed sky and layer leave the line caps and joins, widths, colours, alpha and blend mode as they found them, at every h', () => {
  for (const h of [0, 0.1, 0.35, 0.5, 0.8, 1]) {
    const heal = { h, sky: {} };
    const L = { canvas: {}, clean: {}, over: {}, top: 380, heal };
    for (const [name, run] of Object.entries({ sky: (c) => drawHealSky(c, {}, heal), layer: (c) => drawHealLayer(c, L, -160) })) {
      const ctx = stateful();
      const before = { ...ctx };
      run(ctx);
      assert.deepEqual({ ...ctx }, before, `${name} at h ${h}`);
    }
  }
});
