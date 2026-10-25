import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recorder } from './dom-kit.js';
import { tracker } from './smogenv2-kit.js';

// The dead trees of World 17's mid layer (parallax-smog-mid-tree.js) and the leaves that come back on them (parallax-smog-mid-leaves.js):
// a tree is grown once from a seed, the same every time, with a trunk that forks into limbs and twigs; the bare drawing and the
// crown share its branches; every tree and its crown stay in the band; the sapling of the near layer is the same grower, thin.
const { grow, bare, TREE_SHAPES } = await import('../../src/ui/parallax-smog-mid-tree.js');
const { crown, LEAF, BLOOM } = await import('../../src/ui/parallax-smog-mid-leaves.js');
const { TREES } = await import('../../src/ui/parallax-smog-mid-plan.js');
const { midPal } = await import('../../src/ui/parallax-smog-pal.js');
const { SAPLING } = await import('../../src/ui/parallax-smog-near-props.js');
const { PIT } = await import('../../src/ui/parallax-smog-near-plan.js');
const { hsl, magentaish } = await import('./smogenv2-kit.js');

test('a tree grows the same every time and differs from another seed; its trunk forks into many limbs with thinner and thinner wood', () => {
  const [a, b, c] = [grow(3, 400, 336, 176), grow(3, 400, 336, 176), grow(4, 400, 336, 176)];
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.segs, c.segs);
  assert.ok(a.segs.length >= 30 && a.tips.length >= 12, `${a.segs.length} segments, ${a.tips.length} tips`);
  const widths = a.segs.map((s) => s[4]);
  assert.ok(widths[0] > 8 && Math.min(...widths) >= 0.9 && widths[0] > Math.min(...widths) * 5, 'a thick trunk, fine twigs');
  assert.ok(a.segs.every(([x0, y0, x1, y1]) => [x0, y0, x1, y1].every(Number.isFinite)));
  assert.ok(Math.min(...a.segs.map((s) => s[3])) < 336 - 176 * 0.8, 'it reaches up');
});

test('every planned tree stands inside the mid band with room for its crown, and the bare drawing and the crown reach the same branches', () => {
  assert.equal(TREE_SHAPES.length, TREES.length);
  for (const [i, t] of TREE_SHAPES.entries()) {
    const ys = t.segs.flatMap((s) => [s[1], s[3]]);
    const xs = t.segs.flatMap((s) => [s[0], s[2]]);
    assert.ok(Math.min(...ys) > 60 && Math.max(...ys) < 345, `tree ${i}: y ${Math.min(...ys)}..${Math.max(...ys)}`);
    assert.ok(Math.min(...xs) > 90 && Math.max(...xs) < 2150, `tree ${i}: x`);
    const T = tracker();
    crown(T.ctx, t);
    assert.ok(T.bounds.y0 > 20 && T.bounds.y1 < 400 && T.bounds.x0 > 50 && T.bounds.x1 < 2200, `crown ${i}: ${JSON.stringify(T.bounds)}`);
    for (const [x, y] of t.tips.slice(0, 8)) assert.ok(x >= T.bounds.x0 && x <= T.bounds.x1 && y >= T.bounds.y0 && y <= T.bounds.y1, 'a twig tip inside the crown');
  }
});

test('a bare tree is drawn in the palette\'s wood, a crown in greens and a few muted blooms, none of it the bullets\' hot magenta', () => {
  const r = recorder();
  bare(r.ctx, midPal('smog'), TREE_SHAPES[0]);
  assert.ok(r.calls.filter(([k]) => k === 'stroke').length >= TREE_SHAPES[0].segs.length, 'a stroke for every limb');
  for (const c of [...Object.values(LEAF), ...BLOOM]) assert.ok(!magentaish(c), c);
  for (const c of Object.values(LEAF)) assert.ok(hsl(c).h > 70 && hsl(c).h < 150, `${c} is a leaf green`);
  for (const c of BLOOM) assert.ok(hsl(c).l > 0.6 && (hsl(c).h < 290 || hsl(c).h === -1), `${c} is a muted bloom`);
});

test('the sapling in the near layer\'s tree pit is the same grower, thin and short, standing in the pit', () => {
  assert.ok(SAPLING.segs[0][4] < 5 && SAPLING.segs.length >= 10);
  assert.ok(Math.abs(SAPLING.segs[0][0] - PIT.x) < 1);
  const ys = SAPLING.segs.flatMap((s) => [s[1], s[3]]);
  assert.ok(Math.max(...ys) - Math.min(...ys) < 90 && Math.min(...ys) > 100, 'about 70 px tall, below the fence top');
});
