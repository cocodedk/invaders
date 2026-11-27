import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canvases, createLand, drawLand, MAX_STRIPS, BAKES_PER_FRAME, SEAM, STRIP_SPAN, level, data, world, atOf, frame, settle, ops, stamps, onScreen, ready,
  BOMB_BLOOM_R, MID, SPAWN_Y, SEED_R, stepRespawn, RESPAWN_DELAY, WIDTH, HEIGHT,
} from './course-land-kit.js';

// World 22's land (course-land.js): the strips are tied to the scroll, stamped by the marks the seeds leave, and nothing is repainted unless a strip
// enters, a mark is new or the marks have gone back.
test('the strips tile the screen at whole pixels from the scroll alone, with the last row of each stretched over the seam', () => {
  const land = createLand(level.seed);
  const w = world();
  settle(land, w);
  const sketches = new Map([...land.slots.values()].map((s) => [s.sketch, s.k]));
  const blits = (dist) => {
    w.course.dist = dist;
    return frame(land, w).calls.filter(([k, img, , , wide]) => k === 'drawImage' && sketches.has(img) && wide === undefined);
  };
  const D = MID + 0.6; // not a whole pixel: the strips are still placed on one
  const at = blits(D);
  const top = Math.round(SPAWN_Y + D);
  assert.deepEqual(at.map(([, img]) => sketches.get(img)).sort((p, q) => p - q), onScreen(D), 'the strips on the screen, and no others');
  for (const [, img, x, y] of at) assert.deepEqual([x, y], [0, top - (sketches.get(img) + 1) * STRIP_SPAN]);
  const ys = at.map(([, , , y]) => y).sort((p, q) => p - q);
  assert.ok(ys[0] <= 0 && ys.at(-1) + STRIP_SPAN >= HEIGHT, 'from the top of the screen to its bottom');
  ys.forEach((y, i) => i && assert.equal(y - ys[i - 1], STRIP_SPAN, 'no gap and no overlap'));
  const slivers = frame(land, w).calls.filter(([k, img, , , wide]) => k === 'drawImage' && sketches.has(img) && wide !== undefined);
  assert.deepEqual(slivers.map(([, , sx, sy, sw, sh, dx, dy, dw, dh]) => [sx, sy, sw, sh, dx, dw, dh]), ys.map(() => [0, STRIP_SPAN - 1, WIDTH, 1, 0, WIDTH, 2 * SEAM + 1]), 'the last row of each strip, over the seam');
  assert.deepEqual(slivers.map((c) => c[7]).sort((p, q) => p - q), ys.map((y) => y + STRIP_SPAN - SEAM), "centred on the strip's bottom edge");
  assert.deepEqual(blits(D + 3).map(([, , , y]) => y).sort((p, q) => p - q), ys.map((y) => y + 3), 'three px of scroll, three px down');
});

test('a cold view bakes the whole screen in its first frame and nothing ahead; scrolling then bakes BAKES_PER_FRAME a frame, the screen first and the strip ahead last', () => {
  const land = createLand(level.seed);
  const w = world();
  const seen = onScreen(MID);
  frame(land, w);
  assert.deepEqual(ready(land), seen, 'a one-shot draw (the lobby\'s poster) shows all of it');
  frame(land, w);
  assert.deepEqual(ready(land), [...seen, seen.at(-1) + 1], 'the strip ahead is baked in the next frame');
  const had = new Set(ready(land));
  w.course.dist += 3 * STRIP_SPAN; // a jump: strips come in, and one more is wanted ahead
  const now = onScreen(w.course.dist);
  assert.equal(now.filter((k) => !had.has(k)).length, BAKES_PER_FRAME, 'as many strips come in as a frame bakes');
  frame(land, w);
  assert.ok(now.every((k) => land.slots.get(k).ready), 'the screen is whole after one frame');
  assert.ok(!land.slots.get(now.at(-1) + 1).ready, 'and the strip ahead waits: BAKES_PER_FRAME went to the screen');
  frame(land, w);
  assert.ok(land.slots.get(now.at(-1) + 1).ready, 'the next frame bakes it');
});

test('a mark is stamped once in each strip it touches, and a strip rebuilt from the marks shows it again', () => {
  const land = createLand(level.seed);
  const w = world();
  const k = Math.floor(atOf(w, 540) / STRIP_SPAN);
  const mark = { x: 700, at: k * STRIP_SPAN + STRIP_SPAN / 2, r: SEED_R };
  w.course.marks.push(mark);
  settle(land, w);
  const only = () => [...land.slots.values()].flatMap((s) => stamps(land, s.sketch));
  assert.equal(only().length, 1, 'one strip is touched');
  const d = 2 * SEED_R;
  assert.deepEqual(only()[0].slice(1), [land.scratch, 0, 0, d, d, mark.x - SEED_R, (k + 1) * STRIP_SPAN - mark.at - SEED_R, d, d], 'through a circle of its own radius, where it burst');
  settle(land, w);
  assert.equal(only().length, 1, 'not stamped again');
  w.course.marks.push({ x: 900, at: (k + 1) * STRIP_SPAN, r: SEED_R }); // on the seam: both strips
  settle(land, w);
  assert.equal(only().length, 3, 'the first stands, the one on the seam is stamped in both strips');
  w.course.dist += 5000;
  settle(land, w);
  assert.equal(land.slots.get(k), undefined, 'the strip has left');
  w.course.dist -= 5000;
  settle(land, w);
  assert.equal(stamps(land, land.slots.get(k).sketch).length, 2, 'it is back, baked again with both marks');
  assert.equal(only().length, 3);
});

test('after a respawn the strips are rebuilt from course.marks, and a world cloned every frame rebuilds nothing', () => {
  const land = createLand(level.seed);
  const w = world();
  const k = Math.floor(atOf(w, 540) / STRIP_SPAN); // two marks, in the middles of two strips on the screen
  const [kept, gone] = [{ x: 500, at: k * STRIP_SPAN + STRIP_SPAN / 2, r: SEED_R }, { x: 1300, at: (k + 1) * STRIP_SPAN + STRIP_SPAN / 2, r: SEED_R }];
  w.course.marks.push(kept, gone);
  settle(land, w);
  const strip = (m) => land.slots.get(Math.floor(m.at / STRIP_SPAN)).sketch;
  assert.equal(stamps(land, strip(kept)).length, 1);
  assert.equal(stamps(land, strip(gone)).length, 1);
  const before = ops();
  frame(land, structuredClone(w));
  assert.equal(ops(), before, 'equal marks in a fresh object are the same marks');
  Object.assign(w.course.check, { dist: MID, marks: 1 });
  w.ship.alive = false;
  stepRespawn(w, 0);
  stepRespawn(w, RESPAWN_DELAY);
  assert.deepEqual(w.course.marks, [kept], 'the respawn went back to one mark');
  settle(land, w);
  assert.equal(stamps(land, strip(kept)).length, 1, 'the kept one is shown');
  assert.equal(stamps(land, strip(gone)).length, 0, 'the one that is gone is not');
});

test('a bomb-sized mark is stamped within each strip: the scratch canvas is never bigger than a strip', () => {
  const land = createLand(level.seed);
  const w = world();
  w.course.marks.push({ x: WIDTH / 2, at: atOf(w, HEIGHT / 2), r: BOMB_BLOOM_R });
  settle(land, w);
  assert.ok(land.scratch.width <= WIDTH && land.scratch.height <= STRIP_SPAN);
  assert.ok(onScreen(w.course.dist).every((k) => stamps(land, land.slots.get(k).sketch).length === 1), 'every strip on the screen is stamped');
});

test('a frame with nothing to rebuild bakes nothing, and a whole leg runs on a bounded number of canvases of one size', () => {
  const land = createLand(level.seed);
  const w = world(Math.round(4 * STRIP_SPAN + STRIP_SPAN / 2 - SPAWN_Y)); // the middle of a strip sits at the top of the screen: three px of scroll cross no seam
  w.course.marks.push({ x: 700, at: atOf(w, 500), r: SEED_R });
  settle(land, w);
  const [before, made] = [ops(), canvases.length];
  for (const dist of [0, 1, 2, 3]) {
    const r = frame(land, Object.assign(w, { course: { ...w.course, dist: w.course.dist + dist } }));
    assert.ok(r.calls.every(([k]) => k === 'drawImage') && r.calls.length <= 2 * MAX_STRIPS, 'only blits');
  }
  assert.equal(ops(), before, 'no strip was touched');
  assert.equal(canvases.length, made);
  const run = world(0);
  const land2 = createLand(level.seed);
  const strip = (c) => c.width === WIDTH && c.height === STRIP_SPAN;
  for (let dist = 0; dist < data.length; dist += 41) {
    const seen = new Map(canvases.map((c) => [c, c.calls.length]));
    run.course.dist = dist;
    if (dist % 400 < 41) run.course.marks.push({ x: 960, at: atOf(run, 500), r: SEED_R });
    frame(land2, run);
    if (dist === 0) continue; // the cold first frame bakes the whole screen
    const touched = canvases.filter((c) => strip(c) && seen.get(c) !== undefined && c.calls.length !== seen.get(c));
    assert.ok(touched.length <= 2 * BAKES_PER_FRAME, `scroll ${dist}: ${touched.length} strip canvases touched`);
  }
  const mine = canvases.slice(made);
  assert.ok(mine.length <= 2 * MAX_STRIPS + 2, `${mine.length} canvases for the leg`);
  assert.ok(mine.filter(strip).length <= 2 * MAX_STRIPS + 1, 'the strips, and the scratch canvas, which is one strip big at most');
});

