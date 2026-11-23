import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paintStrip, scatter, riverAt, STRIP_SPAN, FIELD_MARGIN, SPAWN_Y, SEED_R, WIDTH, level, data } from './course-land-kit.js';
import { sink } from './dom-kit.js';
import { rgba } from '../../src/ui/sprites.js';
import { SPECKS } from '../../src/ui/course-land-art.js';
import { landEnd, END_MARGIN, GUIDE_INK, LINE_INK, LINE_STEP } from '../../src/ui/course-land-end.js';
import { stopAt, HOLD_Y, GATE_DY_MAX } from '../../src/core/course-hold.js';
import { END_RUN } from '../../src/core/course-kinds.js';
import { PAL } from '../../src/ui/wander-kit.js';

// Where World 22's land runs out (course-land-end.js): a margin past the top target of the leg's last hold, so the land is whole through the gate,
// and past it blank parchment with the pencil line leading on, which the leg runs on into once the gate has fallen (END_RUN). Every strip is a
// function of its index, the seed and the level's data alone.
const HOLD = data.spawns.at(-1);
const END = landEnd(data);
const KEND = Math.floor(END / STRIP_SPAN); // the strip the land ends in
const hiOf = (k) => (k + 1) * STRIP_SPAN;
const SEED = 7;

// A context that notes the fill and the stroke each call was made under, and hands back the sink for what a call returns.
function tagged() {
  const calls = [];
  const ctx = new Proxy({}, {
    get: (o, k) => (k in o ? o[k] : (...a) => { calls.push({ op: k, a, fill: o.fillStyle, stroke: o.strokeStyle }); return sink; }),
    set: (o, k, v) => ((o[k] = v), true),
  });
  return { ctx, calls };
}
const paint = (painted, k) => {
  const { ctx, calls } = tagged();
  paintStrip(ctx, painted, k, SEED, data);
  return calls;
};
const GREENS = [PAL.paint, PAL.river, PAL.field, PAL.fieldLine, PAL.leaf, PAL.leafLight, PAL.poppy, PAL.riverDeep];
const LINE = rgba(PAL.pencil, LINE_INK);
const GUIDE = rgba(PAL.pencil, GUIDE_INK);
// the points of the one path stroked in the line's ink: the calls between its beginPath and its stroke
const lineOf = (calls) => {
  const end = calls.findIndex((c) => c.op === 'stroke' && c.stroke === LINE);
  const start = calls.slice(0, end).findLastIndex((c) => c.op === 'beginPath');
  return calls.slice(start + 1, end).map((c) => c.a);
};

test('the land stays whole through the gate, and the blank beyond it comes on the screen as the leg runs on past the hold', () => {
  assert.equal(HOLD.kind, 'hold');
  assert.equal(END_MARGIN, SEED_R, 'a seed that bursts on the top target colours a whole circle');
  for (const t of HOLD.targets) assert.ok(HOLD.at + t.dy + SEED_R <= END, `gate at dy ${t.dy}: a seed bursting on it lands wholly on the land`);
  assert.ok(GATE_DY_MAX + END_MARGIN <= HOLD_Y, 'a gate that may stand no higher than that has its margin on the screen at the stop: the screen\'s top is what ends the land');
  assert.equal(END, HOLD.at + HOLD_Y, 'and the land ends there, no further');
  assert.ok(stopAt(HOLD) + SPAWN_Y <= END, 'no blank on the screen while the hold stands');
  assert.equal(data.length, stopAt(HOLD) + END_RUN, 'the leg runs on past the stop');
  assert.ok(data.length + SPAWN_Y > END, 'blank on the screen as the leg clears');
});

test('the land ends past the last hold of the course, or, with no hold, at its length', () => {
  const hold = (at, ...dys) => ({ kind: 'hold', at, targets: dys.map((dy) => ({ dy })) });
  assert.equal(landEnd({ length: 9000, spawns: [hold(100, 10), hold(300, 5, 50, 20)] }), 300 + HOLD_Y, 'the last hold, the top of the screen at its stop');
  assert.equal(landEnd({ length: 9000, spawns: [hold(100, 10), hold(300, 5, HOLD_Y, 20)] }), 300 + HOLD_Y + END_MARGIN, 'or the margin past its highest target, if that is further');
  assert.equal(landEnd({ length: 9000, spawns: [{ kind: 'stone', at: 5000 }] }), 9000);
});

test('no tree or field stands past the end, and the land before it keeps its own', () => {
  let before = 0;
  for (let k = KEND - 4; k <= KEND + 3; k++) {
    const { trees, fields } = scatter(level.seed, k, data);
    for (const t of trees) {
      assert.ok(hiOf(k) - t.y < END, `strip ${k}: a tree before the end`);
      before++;
    }
    for (const f of fields) assert.ok(hiOf(k) - f.y + FIELD_MARGIN < END, `strip ${k}: a field whole before the end`);
    if (k * STRIP_SPAN >= END) assert.deepEqual([trees.length, fields.length], [0, 0], `strip ${k} lies past the end`);
  }
  assert.ok(before > 5, `${before} trees stand in the strips before it`);
});

test('the river runs out at the end, and a pencil line carries on from its middle, up through every strip', () => {
  const bankRows = (calls) => calls.filter((c) => c.op === 'lineTo' && c.stroke === PAL.riverDeep).map((c) => hiOf(KEND) - c.a[1]);
  const banks = bankRows(paint(true, KEND));
  assert.ok(banks.length > 0 && Math.max(...banks) === END, 'the banks stop on the last row of the land');
  for (const painted of [false, true]) {
    const calls = paint(painted, KEND);
    const [first] = lineOf(calls);
    assert.deepEqual(first, [riverAt(END).x, hiOf(KEND) - END], 'the line begins at the river\'s middle, on the last row');
  }
  for (const k of [KEND + 1, KEND + 2, KEND + 5]) {
    const pts = lineOf(paint(false, k));
    assert.ok(pts.length > STRIP_SPAN / LINE_STEP, `strip ${k} draws the line`);
    for (const [x, y] of pts) assert.equal(x, riverAt(hiOf(k) - y).x, 'the line is the river\'s middle, a function of the row');
    assert.ok(pts.some(([, y]) => y === 0) && pts.some(([, y]) => y === STRIP_SPAN), 'and runs on past both of the strip\'s edges, so no seam breaks it');
  }
});

test('past the end the strip is blank parchment, baked in colour as in pencil: nothing green anywhere', () => {
  for (const painted of [false, true]) {
    for (const k of [KEND + 1, KEND + 4]) {
      const calls = paint(painted, k);
      assert.ok(calls.every((c) => !GREENS.includes(c.fill) && !GREENS.includes(c.stroke)), `strip ${k} ${painted ? 'in colour' : 'in pencil'}`);
      assert.ok(calls.some((c) => c.op === 'fillRect' && c.fill === PAL.parchment && c.a[2] === WIDTH && c.a[3] === STRIP_SPAN), 'parchment over the whole strip');
    }
  }
  const land = paint(true, KEND);
  const blank = land.findIndex((c) => c.op === 'fillRect' && c.fill === PAL.parchment);
  const green = land.findIndex((c) => c.op === 'fillRect' && c.fill === PAL.paint);
  assert.ok(green >= 0 && blank > green, 'the strip the land ends in is green, then its top (the rows past the end) is parchment again');
  assert.deepEqual(land[blank].a, [0, 0, WIDTH, hiOf(KEND) - END]);
});

test('the blank is flecked as thick as the land: SPECKS to a whole strip, a share of them to the part of one', () => {
  const flecks = (k) => { // the 2 x 2 fills after the parchment laid over the strip's top
    const calls = paint(false, k);
    const blank = calls.findLastIndex((c) => c.op === 'fillRect' && c.fill === PAL.parchment && c.a[2] === WIDTH);
    return calls.slice(blank + 1).filter((c) => c.op === 'fillRect' && c.a[2] === 2 && c.a[3] === 2).length;
  };
  assert.equal(flecks(KEND + 1), SPECKS);
  assert.equal(flecks(KEND), Math.round(SPECKS * (hiOf(KEND) - END) / STRIP_SPAN));
});

test('the guide lines are faint, whole across the blank and nowhere else, and the strips bake the same twice', () => {
  const rows = (k) => paint(false, k).filter((c) => c.op === 'lineTo' && c.stroke === GUIDE && c.a[0] === WIDTH).map((c) => hiOf(k) - c.a[1]);
  assert.ok(rows(KEND + 1).length > 0 && rows(KEND + 1).every((at) => at >= END), 'guides on the blank rows');
  assert.equal(rows(KEND - 2).length, 0, 'none on the land');
  for (const painted of [false, true]) {
    assert.equal(JSON.stringify(paint(painted, KEND + 1)), JSON.stringify(paint(painted, KEND + 1)));
    assert.notEqual(JSON.stringify(paint(painted, KEND + 1)), JSON.stringify(paint(painted, KEND + 2)));
  }
});

test('the rock goes on past the gate: the walls there still ram, so they are still cut out of the blank', () => {
  const holes = (k) => paint(false, k).filter((c) => c.op === 'fill' && c.fill === '#000').length;
  assert.ok(holes(KEND + 1) > 0 && holes(KEND + 1) === holes(KEND - 1), 'the same two holes as any strip of the band');
});
