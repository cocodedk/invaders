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

const { pathAt, PATH } = await import('../../src/ui/course-land-wood.js');
const { PAL } = await import('../../src/ui/wander-kit.js');
const K = 14;
const run = (painted, k, c = WOOD.course) => {
  const r = recorder();
  const styles = new Set();
  const ctx = new Proxy(r.ctx, { set: (o, p, v) => { if (p === 'fillStyle' || p === 'strokeStyle') styles.add(v); o[p] = v; return true; } });
  paintStrip(ctx, painted, k, WOOD.seed, c);
  return { calls: r.calls, styles, sha: createHash('sha1').update(JSON.stringify(r.calls)).digest('hex') };
};

test('only Leg 2 carries the land key', () => {
  assert.equal(WOOD.course.land, LAND_WOOD);
  assert.equal(data.land, undefined, 'Leg 1 has no land key');
});

test('a wood strip bakes the same twice and differs from its neighbour', () => {
  for (const p of [false, true]) {
    assert.equal(run(p, K).sha, run(p, K).sha);
    assert.notEqual(run(p, K).sha, run(p, K + 1).sha);
  }
});

test('the path sways as a function of the row and runs on through the seam two strips share', () => {
  const seam = (K + 1) * STRIP_SPAN;
  const { x, w } = pathAt(seam);
  assert.ok(Math.abs(x - pathAt(seam + 600).x) > 1 || Math.abs(x - pathAt(seam + 1200).x) > 1, 'it sways');
  assert.ok(w > 0 && w <= PATH.width + PATH.swell);
  const edge = (k, y) => run(true, k).calls.filter(([n, px, py]) => n === 'lineTo' && py === y).map(([, px]) => px);
  assert.ok(edge(K, 0).includes(x - w), 'strip below draws the left edge on the seam row');
  assert.ok(edge(K + 1, STRIP_SPAN).includes(x - w), 'strip above draws it on the same row at the same x');
});

test('the painted wood uses canopy, bluebell and sand and none of river, poppy or field', () => {
  const { styles, calls } = run(true, K);
  for (const c of [PAL.canopy, PAL.canopyLight, PAL.bluebell, PAL.sand]) assert.ok(styles.has(c), c);
  for (const c of [PAL.river, PAL.riverDeep, PAL.poppy, PAL.field]) assert.ok(!styles.has(c), c);
  assert.equal(calls.filter(([n]) => n === 'strokeRect').length, 0);
});

test("the wood's edge is massed canopy: scallops in the rock's hole and no contour lines, the hole still cut along bandAt; Leg 1 keeps its contours", async () => {
  const { SCALLOP_R, CONTOUR_INK } = await import('../../src/ui/course-land-rock.js');
  const { mix } = await import('../../src/ui/sprites.js');
  const contour = mix(PAL.rock, PAL.pencil, CONTOUR_INK);
  const wood = run(false, K);
  const arcs = wood.calls.filter(([n, , , r]) => n === 'arc' && r === SCALLOP_R);
  assert.ok(arcs.length > 20, `${arcs.length} scallops`);
  assert.ok(!wood.styles.has(contour), 'no contour lines on the wood');
  const valley = (() => { const r = recorder(); const st = new Set(); const c = new Proxy(r.ctx, { set: (o, p, v) => { if (p === 'strokeStyle') st.add(v); o[p] = v; return true; } }); paintStrip(c, false, 27, level.seed, data); return { st, calls: r.calls }; })();
  assert.ok(valley.st.has(contour), 'Leg 1 keeps its contour lines');
  assert.equal(valley.calls.filter(([n, , , r]) => n === 'arc' && r === SCALLOP_R).length, 0, 'and has no scallops');
});

test('a canopy keeps off the path and inside the band', async () => {
  const { scatterWood } = await import('../../src/ui/course-land-wood.js');
  const { bandAt } = await import('../../src/core/course-terrain.js');
  let n = 0;
  for (let k = 2; k < 20; k++) {
    for (const t of scatterWood(WOOD.seed, k, WOOD.course).crowns) {
      const at = (k + 1) * STRIP_SPAN - t.y;
      const b = bandAt(WOOD.course, at);
      assert.ok(t.x - t.s > b.left && t.x + t.s < b.right);
      assert.ok(Math.abs(t.x - pathAt(at).x) > pathAt(at).w + t.s);
      n++;
    }
  }
  assert.ok(n > 0);
});
