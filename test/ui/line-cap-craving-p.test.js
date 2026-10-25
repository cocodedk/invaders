import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sink } from './dom-kit.js';
import { def, art, S, part, painter } from './craving-parts-kit.js';

// What test/ui/line-cap.test.js asks of every world's drawing, for the Craving's throne and parts: the painters must leave
// every piece of the context's state (line caps and joins, widths, colours, alpha, blend mode, filter) as they found it, or later
// strokes inherit it. The hull, each part on a body and a lights context, and the two rage layers.

// A context that keeps the state a painter may change, with a real save and restore, and hands everything else to the sink.
const stateful = () => {
  const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over', filter: 'none' };
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
  ...Object.fromEntries(def.parts.map((p) => [p.id, (b, l) => painter(p.id)(b, l, part(p.id), S)])),
};

test("the Craving's hull, parts and rage layers leave the line caps and joins, widths, colours, alpha, blend mode and filter as they found them", () => {
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
