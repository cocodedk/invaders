import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sink } from './dom-kit.js';
import { def, art, S, part, painter, boss } from './ray-kit.js';

// What test/ui/line-cap.test.js asks of every world's drawing, for The Squall Ray: the painters must leave every piece of the context's state (line caps and
// joins, widths, colours, alpha, blend mode, filter) as they found it, or later strokes inherit it. The hull, each part on a body and a lights context, the two
// rage layers, and the live extras.
const { fx } = await import('../../src/ui/bosses/ray-fx.js');
const { fork, strike } = await import('../../src/ui/bosses/ray-bolt.js');

// A context that keeps the state a painter may change, with a real save and restore, and hands everything else to the sink.
const stateful = (comp = 'source-over') => {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: comp, filter: 'none' };
  const stack = [];
  return new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
};

const entry = {
  hull: (b, l) => art.hull(b, l, S),
  rage1: (b) => art.rage[1](b, S),
  rage2: (b) => art.rage[2](b, S),
  bolt: (b, l) => strike(l, fork(3, 0, 0, 100, 40, 8, 6, 2), '#5cf0ff', 1.4, 0.8),
  ...Object.fromEntries(def.parts.map((p) => [p.id, (b, l) => painter(p.id)(b, l, part(p.id), S)])),
};

test("The Squall Ray's hull, parts and rage layers leave the line caps and joins, widths, colours, alpha, blend mode and filter as they found them", () => {
  for (const [name, run] of Object.entries(entry)) {
    const [b, l] = [stateful(), stateful()];
    const before = [{ ...b }, { ...l }];
    run(b, l);
    assert.deepEqual({ ...b }, before[0], `${name}: body`);
    assert.deepEqual({ ...l }, before[1], `${name}: lights`);
  }
});

test('and a fading part is not a problem: every part painted at a lowered alpha comes back to it', () => {
  for (const p of def.parts) {
    const [b, l] = [stateful(), stateful()];
    b.globalAlpha = 0.4;
    l.globalAlpha = 0.4;
    painter(p.id)(b, l, p, S);
    assert.equal(b.globalAlpha, 0.4, p.id);
    assert.equal(l.globalAlpha, 0.4, p.id);
  }
});

test('the live extras leave the context as they found it, in every phase and in both passes', () => {
  for (const phase of [0, 1, 2]) {
    for (const own of [false, true]) {
      const g = stateful('lighter');
      const before = { ...g };
      fx(g, boss(phase), 7.3, 1, own, 0);
      assert.deepEqual({ ...g }, before, `phase ${phase} own ${own}`);
    }
  }
});
