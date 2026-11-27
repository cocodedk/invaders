import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { LAND_WOOD } from '../../src/core/levels-8-kit.js';
import { WOOD } from '../../src/core/levels-8-wood.js';
import { recorder, paintStrip, STRIP_SPAN, level, data } from './course-land-kit.js';

// Leg 1's land is pinned: the calls paintStrip records for w22-1 (strips 0, 27 and the last, sketch and painted, the rock cut out of each included)
// hash to what they did before Leg 2 gave the land a look of its own. Regenerate with GOLDEN=print node --test test/ui/course-land-wood.test.js.
const LAST = Math.ceil(data.length / STRIP_SPAN);
const STRIPS = [0, 27, LAST];
const hash = (painted, k) => {
  const r = recorder();
  paintStrip(r.ctx, painted, k, level.seed, data);
  return createHash('sha1').update(JSON.stringify(r.calls)).digest('hex');
};
const GOLDEN = {
  '0:sketch': '01b154ac4ee68ee79b8ff743966a797fea2f94bc',
  '0:painted': '727f0ffddbbaa2fcdce0f057d1aa5bfb8728529b',
  '27:sketch': '5518bb0a8951d35f52893fa0b7b290ddf5088998',
  '27:painted': '620e7621efb58775e43ba09c30fbda3c2db21998',
  '60:sketch': 'eb2552e6131c48d699f2d2433abffa565d658d5e',
  '60:painted': 'f8262c8b396fc0da328a47e62aaf79a390c63bcf',
};

test('Leg 1 land golden: the strips paint exactly as they did', () => {
  const got = Object.fromEntries(STRIPS.flatMap((k) => [false, true].map((p) => [`${k}:${p ? 'painted' : 'sketch'}`, hash(p, k)])));
  if (process.env.GOLDEN === 'print') console.log(JSON.stringify(got, null, 1));
  assert.equal(Object.keys(GOLDEN).length, 6);
  assert.deepEqual(got, GOLDEN);
});

test('only Leg 2 carries the land key, and the wood paints no valley floor yet', () => {
  assert.equal(WOOD.course.land, LAND_WOOD);
  assert.equal(data.land, undefined, 'Leg 1 has no land key');
  const strokes = (c, painted) => { const r = recorder(); paintStrip(r.ctx, painted, 14, WOOD.seed, c); return r.calls.filter(([k]) => k === 'strokeRect' || k === 'arc').length; };
  assert.equal(strokes(WOOD.course, true), 0, 'no field or tree on the wood floor');
  assert.ok(strokes({ ...WOOD.course, land: undefined }, true) > 0, 'the valley floor paints them');
});
