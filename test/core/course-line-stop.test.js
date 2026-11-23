import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TICK } from '../../src/core/kinds.js';
import { LINE_STEP, LINE_BITE, lineStops, drawLine } from '../../src/core/course-line.js';
import { BULLET_HP } from '../../src/core/course-cut.js';
import { BULLET_R } from '../../src/core/patterns.js';
import { segDist2 } from '../../src/core/math.js';
import { step, at, drain, ofType, bulletAt } from './world-kit.js';
import { Y, lineWorld, hline } from './course-line-kit.js';

// What the line does to a bullet (world 22, Leg 2): one whose move this tick crosses a segment breaks, pays nothing, and rubs out
// LINE_BITE px of ink for each hit point it had around where it ended, the segment that stopped it always included. A laser passes.
const X0 = 200; // the stroke along the row starts here, 30 segments long
const SEGS = 30;
const MID = X0 + (SEGS / 2) * LINE_STEP;
const bullet = (world, pattern, o = {}) => {
  bulletAt(world, MID, Y - 2, 0, 600, BULLET_R);
  return Object.assign(world.bullets.at(-1), { pattern, ...o });
};
const dist = (s, p) => segDist2(s.x1, s.y1, s.x2, s.y2, p.x, p.y);

// A bullet of `pattern` put onto the stroke and one lineStops run: the world, the bullet, the ink there was and the score and events.
function crossed(pattern) {
  const world = lineWorld();
  hline(world, X0, SEGS);
  const before = [...world.course.line];
  const b = bullet(world, pattern);
  const score = world.score;
  drain(world);
  lineStops(world, TICK);
  return { world, b, before, score, events: drain(world) };
}
// None of the ink within `bite` px of the bullet is left, and all of what lay a step beyond it is.
function bitten({ world, before, b }, bite) {
  assert.equal(world.course.line.filter((s) => dist(s, b) <= bite ** 2).length, 0, 'no ink is left within the bite');
  for (const s of before.filter((o) => dist(o, b) > (bite + LINE_STEP) ** 2)) assert.ok(world.course.line.includes(s), 'the rest stands');
  assert.ok(world.course.line.length < before.length);
}

test('a bullet whose move crosses a segment breaks whatever its hp, pays nothing and says so once; the ink around it is rubbed out', () => {
  const run = crossed('aimed');
  const { world, b, score, events } = run;
  assert.equal(b.life, 0);
  assert.equal(b.near, true);
  assert.deepEqual(ofType(events, 'lineStop').map(({ x, y, pattern }) => ({ x, y, pattern })), [{ x: b.x, y: b.y, pattern: 'aimed' }]);
  assert.equal(events.length, 1);
  assert.equal(world.score, score);
  bitten(run, LINE_BITE * BULLET_HP.aimed);
});

test('a heavy bullet rubs out ink to its hp times the bite, a homing one in between', () => {
  const left = (pattern) => crossed(pattern).world.course.line.length;
  assert.ok(left('aimed') > left('homing') && left('homing') > left('heavy'));
  for (const pattern of ['homing', 'heavy']) bitten(crossed(pattern), LINE_BITE * BULLET_HP[pattern]);
});

test('a laser passes through the line, and so does a bullet that has already broken', () => {
  const world = lineWorld();
  hline(world, X0, SEGS);
  const laser = bullet(world, 'laser');
  const dead = bullet(world, 'aimed', { life: 0 });
  const before = world.course.line.length;
  drain(world);
  lineStops(world, TICK);
  assert.deepEqual([laser.life, dead.life, world.course.line.length, drain(world).length], [6, 0, before, 0]);
});

test('a bullet that does not reach the line is left alone', () => {
  const world = lineWorld();
  hline(world, X0, SEGS);
  const b = bullet(world, 'aimed', { y: Y - 3 * BULLET_R });
  lineStops(world, TICK);
  assert.equal(b.life, 6);
});

test('the sweep is over slow, the bullets\' own time of the tick: more of its path reaches the line, less of it does not', () => {
  const run = (slow) => {
    const world = lineWorld();
    hline(world, X0, SEGS);
    const speed = BULLET_R / TICK; // a radius a tick
    const b = bullet(world, 'aimed', { y: Y + 3 * BULLET_R, vy: speed });
    lineStops(world, slow);
    return b.life;
  };
  assert.equal(run(TICK), 6, 'a tick of flight ends too far past the line');
  assert.equal(run(4 * TICK), 0, 'four ticks of it began before the line');
});

test('the segment that stopped a bullet is always among those removed, whatever LINE_BITE is', () => {
  const world = lineWorld();
  hline(world, X0, SEGS);
  const k = SEGS / 2;
  const hit = world.course.line[k]; // the bullet crosses the middle of this one, and ends well past the bite of any ink
  const reach = 2 * LINE_BITE * BULLET_HP.aimed;
  const b = bullet(world, 'aimed', { x: hit.x1 + LINE_STEP / 2, y: Y + reach, vy: (2 * reach) / TICK, r: 1 });
  const before = [...world.course.line];
  lineStops(world, TICK);
  assert.equal(b.life, 0);
  assert.deepEqual(world.course.line, before.filter((s) => s !== hit), 'it alone went');
});

test('this tick\'s ink never shields this tick\'s move: a pointer jump straight through a bullet still costs a life', () => {
  const world = lineWorld();
  world.ship.invuln = 0;
  step(world, 1, at(300, Y)); // the pen is down
  bulletAt(world, 700, Y, 0, 0, BULLET_R);
  const lives = world.ship.lives;
  step(world, 1, at(1100, Y));
  assert.equal(world.ship.lives, lives - 1);
  assert.equal(ofType(drain(world), 'lineStop').length, 0);
  assert.ok(world.course.line.length > 0, 'the jump did draw');
});

test('a stroke laid before the tick does stop a bullet through stepWorld', () => {
  const world = lineWorld();
  hline(world, X0, SEGS);
  const b = bullet(world, 'aimed'); // it flies down across the row this tick
  step(world, 1, at(world.ship.x, world.ship.y));
  assert.equal(b.life, 0);
  assert.equal(ofType(drain(world), 'lineStop').length, 1);
});
