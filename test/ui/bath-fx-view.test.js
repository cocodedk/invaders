import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { createFx } from '../../src/fx/fx.js';
import { makeRng } from '../../src/core/rng.js';
import { INK } from '../../src/ui/sprites.js';

// World 19's foam, drawn from the 'suds' particles of fx/react-bath.js (bath-fx-view.js, called by fx-view.js drawFx): an opaque round
// puff with an ink rim, or a little star turning as it flies. No glow sprite and no additive pass, so it reads on the pale waterline.
installCanvas(64);
const { drawFx } = await import('../../src/ui/fx-view.js');
const { RIM, POINTS, SPIN, SPIN_VX, TIP, WAIST, FLECK } = await import('../../src/ui/bath-fx-view.js');
const { applyEvent } = await import('../../src/fx/react.js');

const bath = { level: { world: 19, twist: 'bonk' } };
const paint = (fx) => {
  const { ctx, calls } = recorder();
  drawFx(ctx, fx);
  return { ctx, calls, count: (k) => calls.filter(([n]) => n === k).length };
};
const lone = (p) => ({ ...createFx(), particles: [{ x: 300, y: 200, vx: 40, vy: -90, size: 9, grow: -4, color: '#ffc928', kind: 'suds', additive: false, life: 0.6, max: 0.6, ...p }] });

test('a puff is one filled disc at its size with an ink rim and a fleck of light on it, drawn opaque', () => {
  const { ctx, calls, count } = paint(lone({}));
  const arcs = calls.filter(([n]) => n === 'arc');
  assert.deepEqual(arcs[0].slice(1, 4), [300, 200, 9]);
  assert.equal(arcs.length, 2, 'the puff and its fleck');
  assert.deepEqual(arcs[1].slice(1, 4), [300 - 9 * FLECK.at, 200 - 9 * FLECK.at, 9 * FLECK.r], 'a small fleck up and to the left');
  assert.equal(ctx.fillStyle, FLECK.color);
  assert.deepEqual([count('fill'), count('stroke'), count('drawImage')], [2, 1, 0], 'no glow sprite');
  assert.equal(arcs[0].alpha, 1, 'opaque while it is young');
  assert.equal(ctx.strokeStyle, INK);
  assert.equal(ctx.lineWidth, RIM);
  assert.equal(ctx.lineJoin, 'miter', 'the line join is put back for what draws next');
  assert.ok(!('shadowBlur' in ctx), 'no shadowBlur');
});

test('a puff fades in the last third of its life and a tiny one has no fleck', () => {
  const half = paint(lone({ life: 0.1, max: 0.6 })).calls.find(([n]) => n === 'arc').alpha;
  assert.ok(Math.abs(half - 0.5) < 1e-9, `a sixth of its life left: ${half}`);
  assert.equal(paint(lone({ size: FLECK.from })).count('arc'), 2, 'a puff of the fleck\'s size has one');
  assert.equal(paint(lone({ size: FLECK.from - 0.01 })).count('arc'), 1, 'and a smaller one has none');
});

test('a star is a five-point path in the particle colour with the same rim, turning with its age', () => {
  const draw = (life) => paint(lone({ star: true, life })).calls;
  const calls = draw(0.6);
  assert.deepEqual([calls.filter(([n]) => n === 'moveTo').length, calls.filter(([n]) => n === 'lineTo').length], [1, POINTS * 2 - 1]);
  assert.deepEqual([calls.filter(([n]) => n === 'arc').length, calls.filter(([n]) => n === 'stroke').length], [0, 1]);
  assert.equal(paint(lone({ star: true })).ctx.fillStyle, '#ffc928', 'in the particle colour');
  const tip = (cs) => cs.find(([n]) => n === 'moveTo').slice(1);
  const turn = (cs) => Math.atan2(tip(cs)[1] - 200, tip(cs)[0] - 300);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  assert.notDeepEqual(tip(draw(0.6)), tip(draw(0.3)), 'it has turned');
  assert.ok(Math.abs(wrap(turn(draw(0.3)) - turn(draw(0.6)) - 0.3 * SPIN)) < 1e-9, 'by SPIN a second');
  assert.ok(Math.abs(wrap(turn(draw(0.6)) - turn(paint(lone({ star: true, vx: 140 })).calls) + 100 * SPIN_VX)) < 1e-9, 'and faster off to the side');
  const radii = calls.filter(([n]) => n === 'lineTo').map(([, x, y]) => Math.hypot(x - 300, y - 200));
  const [tx, ty] = tip(calls);
  assert.ok(Math.abs(Math.hypot(tx - 300, ty - 200) - 9 * TIP) < 1e-9, 'its tips at TIP sizes');
  radii.forEach((r, i) => assert.ok(Math.abs(r - 9 * (i % 2 ? TIP : WAIST)) < 1e-9, `point ${i + 1}: tips and waists alternate`));
});

test('the foam the world 19 events make draws with no glow sprite at all', () => {
  const fx = createFx();
  for (const type of ['kill', 'explode', 'whack', 'bonk', 'bank', 'plop', 'fizzle']) applyEvent(fx, { type, x: 500, y: 300, role: 'grunt', dx: 0, dy: -1, ko: true, link: 1, score: 10, scored: true }, makeRng(1), bath);
  assert.ok(fx.particles.length > 10 && fx.particles.every((p) => p.kind === 'suds' && !p.additive));
  const { calls } = paint(fx);
  assert.ok(calls.filter(([n]) => n === 'arc' || n === 'lineTo').length >= fx.particles.length);
  assert.equal(calls.filter(([n]) => n === 'drawImage').length, 0, 'no glow: no flash, no spark, no soft puff');
});
