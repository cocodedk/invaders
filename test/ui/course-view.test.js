import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recorder, tracker, fileRules } from './aliens-bath-kit.js';
import { IDLE, TICK } from '../core/world-kit.js';

// World 22's course as the view draws it (course-view.js, course-land.js, course-objects.js, view.js): the land in place of a sky, the rock where bandAt
// puts it, the marks the seeds have left, the things on the ground, the lantern last reached, all placed from the scroll. The levels, the
// constants and the world are the game's own, so the distances here come from stepping the real Leg 1 and reading its data.
const { createView, drawFrame } = await import('../../src/ui/view.js');
const { drawCourse, buildCourseView, wallRows, WALL_STEP, CONTOURS, CONTOUR_GAP } = await import('../../src/ui/course-view.js');
const { lanternSpot, LANTERN_TOL } = await import('../../src/ui/course-objects.js');
const { createWorld, stepWorld } = await import('../../src/core/world.js');
const { levelById } = await import('../../src/core/levels.js');
const { createFx } = await import('../../src/fx/fx.js');
const { bandAt, terrainHits } = await import('../../src/core/course-terrain.js');
const { SPAWN_Y } = await import('../../src/core/course-kinds.js');
const { RESPAWN_Y, RESPAWN_DELAY } = await import('../../src/core/course-check.js');
const { SEED_R } = await import('../../src/core/course-seed.js');
const { HEIGHT } = await import('../../src/core/kinds.js');
const { SHIP_R, LIVES, hitShip } = await import('../../src/core/ship.js');

const level = levelById('w22-1');
const { course: data } = level;
const spawn = (kind) => data.spawns.find((e) => e.kind === kind);
const FLY_MAX = 2 * Math.ceil(data.length / data.speed / TICK); // ticks: twice what the leg takes
const PATH_OPS = 'moveTo lineTo arc ellipse rect fillRect strokeRect roundRect'.split(' ');
const ops = (calls) => calls.filter(([k]) => PATH_OPS.includes(k)).length;
const BUDGET = 400; // path operations a frame of the ground may take: a few hundred, the rock being the bulk of them
const fresh = () => createWorld(level, level.seed);

// Fly Leg 1 with a ship nothing can hurt until `done` says so.
function fly(world, done) {
  for (let i = 0; i < FLY_MAX && !done(world); i++) {
    world.ship.invuln = 1;
    stepWorld(world, TICK, IDLE);
  }
  world.events.length = 0;
  assert.ok(done(world), 'the flight got there');
  return world;
}

// The last life lost, then the beat of the wreck, then the leg rebuilt from the last lantern.
function die(world) {
  Object.assign(world.ship, { invuln: 0, lives: 1 });
  hitShip(world, 'test');
  for (let i = 0, beat = false; i < Math.ceil(RESPAWN_DELAY / TICK) + 10 && !(beat && world.course.respawn === null); i++) {
    stepWorld(world, TICK, IDLE);
    beat ||= world.course.respawn !== null;
  }
  world.events.length = 0;
  assert.equal(world.course.respawn, null);
  return world;
}

const midLeg = () => fly(fresh(), (w) => w.course.dist >= spawn('turret').at + 500);
const draws = (world, cv = buildCourseView(level.seed)) => {
  const r = recorder();
  drawCourse(r.ctx, cv, world, 0);
  return r;
};

test('a whole frame of Leg 1 draws at its start, in its middle, after a respawn and at the hold, the land standing in for the sky', () => {
  const T = tracker();
  const canvas = { width: 1920, height: 1080, clientWidth: 1920, clientHeight: 1080, getContext: () => T.ctx };
  const v = createView(canvas, level, false);
  assert.equal(v.sky, null, 'no sky is baked');
  assert.deepEqual(v.layers, [], 'and no layers');
  assert.ok(v.ground.land, 'the land is');
  const fx = createFx();
  const world = fresh();
  const frames = [() => world, () => fly(world, (w) => w.course.dist >= spawn('turret').at + 500), () => die(world), () => fly(world, (w) => w.course.held)];
  for (const [i, stage] of frames.entries()) {
    stage();
    T.calls.length = 0;
    drawFrame(v, world, fx, 1 + i);
    assert.ok([...v.ground.land.slots.values()].some((s) => T.calls.some((c) => c.img === s.sketch)), `stage ${i}: the land is drawn`);
  }
  assert.equal(createView(canvas, levelById('w1-1'), false).ground, null, 'no other world gets one');
});

test('the rock is drawn through rows fixed to the course, one on every WALL_STEP of at and on every keyframe in view, so its corners hold still as the scroll carries them and it is the rock that rams', () => {
  const bend = (i) => { // how sharply the left edge turns at keyframe i, in px a px
    const slope = (a, b) => (data.walls[b][1] - data.walls[a][1]) / (data.walls[b][0] - data.walls[a][0]);
    return Math.abs(slope(i, i + 1) - slope(i - 1, i));
  };
  const corners = data.walls.map((key, i) => ({ key, i })).slice(1, -1).filter(({ key }) => key[1] > 0 && key[0] % WALL_STEP !== 0); // off the grid: no row there by chance
  const [keyAt, keyLeft, keyRight] = corners.sort((p, q) => bend(q.i) - bend(p.i))[0].key;
  const world = fresh();
  world.course.dist = keyAt - SPAWN_Y + HEIGHT / 2;
  const rows = wallRows(data, world.course.dist);
  const atOf = (row) => world.course.dist + SPAWN_Y - row.y;
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  assert.ok(rows[0].y < 0 && rows.at(-1).y > HEIGHT, 'the rows run past both ends of the screen');
  rows.forEach((r, i) => {
    if (i) assert.ok(r.y > rows[i - 1].y && r.y - rows[i - 1].y <= WALL_STEP + 1e-6, 'top to bottom, no gap wider than a step');
    assert.ok(near(atOf(r), Math.round(atOf(r) / WALL_STEP) * WALL_STEP) || data.walls.some(([at]) => near(at, atOf(r))), `row ${r.y} is on the grid or on a keyframe`);
    const band = bandAt(data, atOf(r));
    assert.ok(near(r.left, band.left) && near(r.right, band.right));
  });
  for (let d = world.course.dist - HEIGHT / 2; d < world.course.dist + HEIGHT / 2; d += 15.37) { // the keyframe's corner is a vertex all the way down the screen
    const row = wallRows(data, d).find((r) => near(d + SPAWN_Y - r.y, keyAt));
    assert.ok(row && near(row.left, keyLeft) && near(row.right, keyRight), `the corner at scroll ${d}`);
  }
  const rammed = (x, y) => {
    Object.assign(world.ship, { x, y, fromX: x, fromY: y, alive: true, invuln: 0, power: null, lives: LIVES });
    terrainHits(world);
    world.events.length = 0;
    return world.ship.lives < LIVES;
  };
  const probes = rows.flatMap((r, i) => (i ? [r, { y: (r.y + rows[i - 1].y) / 2, left: (r.left + rows[i - 1].left) / 2, right: (r.right + rows[i - 1].right) / 2 }] : [r]));
  const seen = probes.filter((p) => p.y > 100 && p.y < 900 && p.left > 0);
  for (const p of seen) { // on a row, and halfway between two rows, where only an exact polygon puts the edge where the collision does
    assert.ok(rammed(p.left + SHIP_R - 1, p.y), `row ${p.y}: the disc is in the left rock`);
    assert.ok(!rammed(p.left + SHIP_R + 1, p.y), `row ${p.y}: and a pixel clear of it`);
    assert.ok(rammed(p.right - SHIP_R + 1, p.y), `row ${p.y}: the disc is in the right rock`);
    assert.ok(!rammed(p.right - SHIP_R - 1, p.y), `row ${p.y}: and a pixel clear of it`);
  }
  assert.ok(seen.length >= 20, `${seen.length} places tried`);
  const { calls } = draws(world);
  const fill = calls.findIndex(([k]) => k === 'fill');
  const start = calls.findLastIndex(([k], i) => k === 'beginPath' && i < fill);
  const polygon = calls.slice(start + 1, fill).filter(([k]) => k === 'lineTo' || k === 'moveTo').map(([, x, y]) => [x, y]);
  assert.deepEqual(polygon.slice(1, -1), rows.map((r) => [r.left, r.y]), 'the left rock is filled out to those very points');
});

test('the open land is blits only, marks or none: the colour is in the strips (course-land.js), so it costs the frame no path', () => {
  const world = fresh();
  world.course.dist = 100; // the open land: no rock to draw
  const atOf = (y) => world.course.dist + SPAWN_Y - y;
  world.course.marks = [{ x: 500, at: atOf(300), r: SEED_R }, { x: 900, at: atOf(700), r: SEED_R }];
  const { calls } = draws(world);
  assert.ok(calls.length > 0 && calls.every(([k]) => k === 'drawImage'), 'strips and nothing else');
});

test('the rock carries CONTOURS pencilled lines CONTOUR_GAP apart, through every keyframe near the screen, so each is the edge shifted into the rock', () => {
  const [keyAt, keyLeft, keyRight] = data.walls.find(([at, left]) => at > 9000 && left > 0); // the gorge's mouth
  const world = fresh();
  for (const y of [HEIGHT / 2, -WALL_STEP - 2, HEIGHT + WALL_STEP + 2]) { // the keyframe on the screen, and just past each end of it, where wallRows leaves it out
    world.course.dist = keyAt - SPAWN_Y + y;
    const rows = wallRows(data, world.course.dist);
    if (y !== HEIGHT / 2) assert.ok(!rows.some((r) => r.at === keyAt) && keyAt < rows[0].at && keyAt > rows.at(-1).at, 'a keyframe in the gap between the last row and the end');
    const points = draws(world).calls.filter(([k]) => k === 'moveTo' || k === 'lineTo').map(([, x, py]) => [x, py].join());
    for (let k = 1; k <= CONTOURS; k++) {
      assert.ok(points.includes([keyLeft - k * CONTOUR_GAP, y].join()), `y ${y}, line ${k}, left`);
      assert.ok(points.includes([keyRight + k * CONTOUR_GAP, y].join()), `y ${y}, line ${k}, right`);
    }
  }
});

test('a pillar is drawn exactly as big as it is, about its centre', () => {
  const world = fresh();
  const { w, h } = spawn('pillar');
  world.course.ground = [{ id: 1, kind: 'pillar', at: 0, x: 700, y: 500, hp: null, w, h }];
  const { calls } = draws(world);
  assert.deepEqual(calls.find(([k]) => k === 'translate').slice(1), [700, 500]);
  assert.ok(calls.some(([k, ...a]) => k === 'strokeRect' && a.join() === [-w / 2, -h / 2, w, h].join()), 'its outline is the box that rams');
});

test('after a respawn the last lantern reached is drawn lit at the checkpoint from course.check, and a lantern still on the list is drawn once', () => {
  const world = fresh();
  fly(world, (w) => w.course.lit >= 1);
  const { x } = world.course.check;
  const spot = lanternSpot(world.course);
  const lanterns = (r) => r.calls.filter(([k, px, py]) => k === 'translate' && px === x && Math.abs(py - spot.y) < LANTERN_TOL);
  assert.ok(world.course.ground.some((g) => g.kind === 'checkpoint' && g.reached), 'it stands on the list, lit');
  assert.equal(lanterns(draws(world)).length, 1, 'and is drawn once');
  fly(world, (w) => w.course.dist >= spawn('turret').at + 500);
  die(world);
  assert.ok(!world.course.ground.some((g) => g.kind === 'checkpoint'), 'after the respawn the list holds no lantern');
  assert.deepEqual(draws(world).calls.filter(([k]) => k === 'translate').map(([, px, py]) => [px, py]), [[x, RESPAWN_Y]]);
  world.course.dist += 100;
  assert.deepEqual(draws(world).calls.filter(([k]) => k === 'translate').map(([, px, py]) => [px, py]), [[x, RESPAWN_Y + 100]], 'and the scroll carries it down');
  world.course.lit = 0;
  assert.equal(draws(world).calls.filter(([k]) => k === 'translate').length, 0, 'before the first lantern there is none');
});

test('the ground costs a few hundred path operations a frame at most and no gradient, pattern or shadow blur, in the gorge, at the hold and with seeds in the air', () => {
  const gorge = midLeg();
  gorge.course.abilities.push('seed');
  gorge.course.seeds.push({ x: gorge.ship.x, at: gorge.course.dist + SPAWN_Y - 400, t: 0.2 });
  for (const y of [200, 400, 600, 800]) gorge.course.marks.push({ x: gorge.ship.x, at: gorge.course.dist + SPAWN_Y - y, r: SEED_R });
  for (const world of [gorge, fly(fresh(), (w) => w.course.held)]) {
    const r = draws(world);
    assert.ok(ops(r.calls) <= BUDGET, `${ops(r.calls)} path operations`);
    assert.ok(!r.calls.some(([k]) => /^create/.test(k)), 'nothing built per frame');
    assert.ok(!('shadowBlur' in r.ctx), 'no shadow blur');
  }
});

test('the view files keep the sprite rules', () => {
  fileRules(assert, ['course-view.js', 'course-land.js', 'course-land-art.js', 'course-objects.js', 'wander-kit.js', 'view.js', 'pickup-kit.js', 'pickup-wander.js', 'pickup-skins.js']);
});
