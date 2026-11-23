import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recorder } from './aliens-bath-kit.js';
import { TICK } from '../core/world-kit.js';
import { rgba } from '../../src/ui/sprites.js';

// Your line as the view draws it (course-line-view.js, course-view.js): the ink in course.line, laid by the real drawLine as a ship flies, a dark
// stroke whose alpha follows the segment's age, a few paths a frame and no canvas state changed for each segment.
const { drawCourse, buildCourseView } = await import('../../src/ui/course-view.js');
const { drawCourseLine, LINE_ALPHA_STEPS, LINE_WIDTH, LINE_COLOUR } = await import('../../src/ui/course-line-view.js');
const { drawLine, LINE_LIFE, LINE_SEGS } = await import('../../src/core/course-line.js');
const { createWorld } = await import('../../src/core/world.js');
const { levelById } = await import('../../src/core/levels.js');

const level = levelById('w22-2');
const PATH_OPS = 'moveTo lineTo arc ellipse rect fillRect strokeRect roundRect'.split(' ');
const GLIDE = 3; // px a tick the ship drifts while it draws: slow, so the ink in the line spans the whole of its life

// A ship that has the line, flown along a bend for `ticks` ticks, laid by the core's own drawLine.
function inked(ticks) {
  const world = createWorld(level, level.seed);
  world.course.abilities.push('line');
  Object.assign(world.ship, { x: 300, y: 800, alive: true });
  for (let i = 0; i < ticks; i++) {
    world.ship.x += GLIDE;
    world.ship.y = 800 + 120 * Math.sin(i / 40);
    drawLine(world, TICK);
  }
  return world;
}

// A context that keeps, at each stroke, the style it had, where in the calls its path began and the points of it (a point for each moveTo and lineTo
// since beginPath), and counts every state it was given (a style, a width, a cap, a save).
function inkwell() {
  const r = recorder();
  const strokes = [];
  let path = [];
  let from = 0;
  let sets = 0;
  const ctx = new Proxy(r.ctx, {
    get: (o, k) => {
      if (k === 'beginPath') return () => { path = []; from = r.calls.length; };
      if (k === 'moveTo' || k === 'lineTo') return (x, y) => { path.push([k, x, y]); o[k](x, y); };
      if (k === 'save' || k === 'restore') return () => { sets++; o[k](); };
      if (k === 'stroke') return () => { strokes.push({ style: o.strokeStyle, width: o.lineWidth, path, from }); o.stroke(); };
      return o[k];
    },
    set: (o, k, v) => { sets++; o[k] = v; return true; },
  });
  return { ctx, calls: r.calls, strokes, sets: () => sets };
}
const INK = rgba(LINE_COLOUR, '').slice(0, -1); // a stroke style of the line, up to its alpha
const alphaOf = (style) => +/^rgba\([^)]*,\s*([\d.]+)\)$/.exec(style)[1];
const drawn = (world) => {
  const w = inkwell();
  drawCourseLine(w.ctx, world.course);
  return w;
};

test('the line is stroked when the course holds ink and not when it is empty, over the ground', () => {
  const world = inked(200);
  const { w, h } = level.course.spawns.find((e) => e.kind === 'pillar');
  world.course.ground = [{ id: 1, kind: 'pillar', at: 0, x: 700, y: 500, hp: null, w, h }]; // a thing on the ground, drawn last of the ground's own
  assert.ok(world.course.line.length > 0, 'the ship has drawn');
  const cv = buildCourseView(level.seed);
  const frame = (w) => {
    const r = inkwell();
    drawCourse(r.ctx, cv, w, 0);
    return r;
  };
  const inkOf = ({ strokes }) => strokes.filter(({ style }) => style.startsWith(INK));
  const [bare, withInk] = [frame(inked(0)), frame(world)];
  assert.equal(inkOf(bare).length, 0, 'no ink, no stroke of the line');
  assert.ok(inkOf(withInk).length > 0, 'ink, strokes of the line');
  assert.equal(drawn(inked(0)).calls.length, 0, 'an empty line draws nothing, not even a state change');
  const lastLand = withInk.calls.findLastIndex(([k]) => k === 'drawImage');
  assert.ok(withInk.calls.some(([k, img]) => k === 'drawImage' && img.width > w), 'the pillar is drawn');
  assert.ok(lastLand > 0 && inkOf(withInk).every(({ from }) => from > lastLand), 'it hangs over the land and the things on the ground: every strip and sprite is drawn before it');
});

test('every segment is drawn once, in a stroke whose alpha is its own 1 - t / LINE_LIFE to within half an alpha step, the oldest the faintest', () => {
  const world = inked(Math.ceil((2.5 * LINE_LIFE) / TICK)); // the oldest ink has aged out and been replaced
  const { line } = world.course;
  assert.ok(line.length > 3 * LINE_ALPHA_STEPS, `${line.length} segments, several to a step`);
  assert.ok(line[0].t > 0.8 * LINE_LIFE && line.at(-1).t < 0.1 * LINE_LIFE, 'its ink spans nearly the whole of its life');
  const { strokes } = drawn(world);
  assert.ok(strokes.length <= LINE_ALPHA_STEPS, `${strokes.length} strokes for ${LINE_ALPHA_STEPS} alpha steps`);
  assert.ok(strokes.length > 1, 'and it fades in steps');
  const alphas = strokes.map((s) => alphaOf(s.style));
  assert.ok(alphas.every((a, i) => i === 0 || a > alphas[i - 1]), 'oldest stroke first, each less faint than the one before');
  for (const s of line) {
    const hits = strokes.filter(({ path }) => path.some((p, i) => p[1] === s.x1 && p[2] === s.y1 && path[i + 1]?.[0] === 'lineTo' && path[i + 1][1] === s.x2 && path[i + 1][2] === s.y2 || (i > 0 && p[0] === 'lineTo' && p[1] === s.x2 && p[2] === s.y2 && path[i - 1][1] === s.x1 && path[i - 1][2] === s.y1)));
    assert.equal(hits.length, 1, `the segment at ${s.x1}, ${s.y1} is in one stroke`);
    assert.ok(Math.abs(alphaOf(hits[0].style) - (1 - s.t / LINE_LIFE)) <= 0.5 / LINE_ALPHA_STEPS + 1e-9, `its alpha ${alphaOf(hits[0].style)} follows its age ${s.t}`);
  }
  assert.ok(strokes.every((s) => s.width === LINE_WIDTH), 'one width');
});

test('a full line costs a few paths and no state change for each segment, no gradient, pattern or shadow blur', () => {
  const young = (n) => { // n segments all of one age: one alpha step
    const w = inked(0);
    w.course.line = Array.from({ length: n }, (_, i) => ({ x1: 100 + i * 10, y1: 500, x2: 110 + i * 10, y2: 500, t: 0 }));
    return drawn(w);
  };
  const [one, many] = [young(1), young(LINE_SEGS)];
  assert.equal(many.sets(), one.sets(), 'a long line sets the canvas no more than a short one');
  assert.equal(many.strokes.length, 1, 'one stroke for one alpha step');
  const w = drawn(inked(Math.ceil((2.5 * LINE_LIFE) / TICK)));
  assert.ok(w.calls.filter(([k]) => PATH_OPS.includes(k)).length <= LINE_SEGS + 2 * LINE_ALPHA_STEPS, 'about a path operation a segment');
  assert.ok(!w.calls.some(([k]) => /^create/.test(k)), 'nothing built per frame');
  assert.ok(!('shadowBlur' in w.ctx), 'no shadow blur');
});
