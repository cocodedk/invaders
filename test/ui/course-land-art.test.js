import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recorder, paintStrip, scatter, riverAt, STRIP_SPAN, TREE_MARGIN, FIELD_MARGIN, bandAt, level, data } from './course-land-kit.js';

// World 22's land art (course-land-art.js): a strip is a function of its index, the seed and the level's walls alone.
const dump = (painted, k, seed = 7) => {
  const r = recorder();
  paintStrip(r.ctx, painted, k, seed, data);
  return JSON.stringify(r.calls);
};

test('a strip bakes the same twice, differently from its neighbour and from another seed, and the river runs on through the seam', () => {
  for (const painted of [false, true]) {
    assert.equal(dump(painted, 27), dump(painted, 27), 'the same index, the same strip');
    assert.notEqual(dump(painted, 27), dump(painted, 28));
    assert.notEqual(dump(painted, 27), dump(painted, 27, 8));
  }
  const edge = (27 + 1) * STRIP_SPAN; // the at where strip 27 ends and strip 28 begins: its top row, and the bottom row of strip 28
  const { x, w } = riverAt(edge);
  const bank = (k, y) => JSON.parse(dump(true, k)).some(([c, px, py]) => c === 'lineTo' && py === y && Math.abs(px - (x - w)) < 1e-9);
  assert.ok(bank(27, 0) && bank(28, STRIP_SPAN), 'both strips draw the river bank at the same x on the shared row');
});

test('the trees and fields lie whole inside their strip, in the band and off the river', () => {
  let seen = 0;
  for (const k of [-3, 0, 14, 27, 29, 40]) {
    const hi = (k + 1) * STRIP_SPAN;
    const { trees, fields } = scatter(level.seed, k, data);
    for (const [t, margin] of [...trees.map((t) => [t, TREE_MARGIN]), ...fields.map((f) => [f, FIELD_MARGIN])]) {
      const at = hi - t.y;
      const { left, right } = bandAt(data, at);
      const rv = riverAt(at);
      assert.ok(t.y >= margin && t.y <= STRIP_SPAN - margin, `strip ${k}: inside it`);
      assert.ok(t.x > left && t.x < right, `strip ${k}: in the band`);
      assert.ok(Math.abs(t.x - rv.x) > rv.w, `strip ${k}: off the river`);
      seen++;
    }
  }
  assert.ok(seen > 100, `${seen} things checked`);
});

test('the land reads marks from the course only, and has no dice, clock or shadow blur', () => {
  for (const file of ['course-land.js', 'course-land-art.js', 'course-view.js', 'course-objects.js']) {
    const src = readFileSync(new URL(`../../src/ui/${file}`, import.meta.url), 'utf8');
    assert.ok((src.match(/\w*\.marks\b/g) ?? []).every((m) => /^(course|land)\.marks$/.test(m)), `${file} reads marks from the course only`);
    assert.ok(src.split('\n').length < 200, `${file} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${file} uses no shadow blur, dice or clock`);
  }
});
