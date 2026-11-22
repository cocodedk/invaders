import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recorder, tracker, fileRules } from './aliens-bath-kit.js';
import { IDLE, TICK } from '../core/world-kit.js';
import { readFileSync } from 'node:fs';

// World 22's course as the view draws it (course-view.js, course-objects.js, view.js): the parchment in place of a sky, the rock where bandAt
// puts it, the marks the seeds have left, the things on the ground, the lantern last reached, all placed from the scroll. The levels, the
// constants and the world are the game's own, so the distances here come from stepping the real Leg 1 and reading its data.
const { createView, drawFrame } = await import('../../src/ui/view.js');
const { drawCourse, buildCourseView, wallRows, WALL_STEP } = await import('../../src/ui/course-view.js');
const { lanternSpot, LANTERN_TOL } = await import('../../src/ui/course-objects.js');
const { createWorld, stepWorld } = await import('../../src/core/world.js');
const { levelById } = await import('../../src/core/levels.js');
const { createFx } = await import('../../src/fx/fx.js');
const { bandAt, terrainHits } = await import('../../src/core/course-terrain.js');
const { SPAWN_Y } = await import('../../src/core/course-kinds.js');
const { RESPAWN_Y, RESPAWN_DELAY } = await import('../../src/core/course-check.js');
const { SEED_R } = await import('../../src/core/course-seed.js');
const { HEIGHT } = await import('../../src/core/kinds.js');
const { SHIP_R, hitShip } = await import('../../src/core/ship.js');

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

test('a whole frame of Leg 1 draws at its start, in its middle, after a respawn and at the hold, the parchment standing in for the sky', () => {
  const T = tracker();
  const canvas = { width: 1920, height: 1080, clientWidth: 1920, clientHeight: 1080, getContext: () => T.ctx };
  const v = createView(canvas, level, false);
  assert.equal(v.sky, null, 'no sky is baked');
  assert.deepEqual(v.layers, [], 'and no layers');
  assert.ok(v.ground.tile, 'the parchment is');
  const fx = createFx();
  const world = fresh();
  const frames = [() => world, () => fly(world, (w) => w.course.dist >= spawn('turret').at + 500), () => die(world), () => fly(world, (w) => w.course.held)];
  for (const [i, stage] of frames.entries()) {
    stage();
    T.calls.length = 0;
    drawFrame(v, world, fx, 1 + i);
    assert.ok(T.calls.some((c) => c.img === v.ground.tile), `stage ${i}: the parchment is drawn`);
  }
  assert.equal(createView(canvas, levelById('w1-1'), false).ground, null, 'no other world gets one');
});

test('the rock is drawn through the rows bandAt gives, so a ship whose disc just reaches a drawn edge is hit and one a pixel clear of it is not', () => {
  const keyframe = data.walls.find(([, left]) => left > 0);
  const world = fresh();
  world.course.dist = keyframe[0] - SPAWN_Y + HEIGHT / 2;
  const rows = wallRows(data, world.course.dist);
  assert.ok(rows[0].y < 0 && rows.at(-1).y > HEIGHT, 'the rows run past both ends of the screen');
  rows.forEach((r, i) => {
    if (i) assert.equal(r.y - rows[i - 1].y, WALL_STEP);
    assert.deepEqual([r.left, r.right], Object.values(bandAt(data, world.course.dist + SPAWN_Y - r.y)));
  });
  const rammed = (x, y) => {
    Object.assign(world.ship, { x, y, fromX: x, fromY: y, alive: true, invuln: 0, power: null, lives: 3 });
    terrainHits(world);
    world.events.length = 0;
    return world.ship.lives < 3;
  };
  let tried = 0;
  for (const r of rows.filter((row) => row.y > 100 && row.y < 900 && row.left > 0)) {
    assert.ok(rammed(r.left + SHIP_R - 1, r.y), `row ${r.y}: the disc is in the left rock`);
    assert.ok(!rammed(r.left + SHIP_R + 1, r.y), `row ${r.y}: and a pixel clear of it`);
    assert.ok(rammed(r.right - SHIP_R + 1, r.y), `row ${r.y}: the disc is in the right rock`);
    assert.ok(!rammed(r.right - SHIP_R - 1, r.y), `row ${r.y}: and a pixel clear of it`);
    tried++;
  }
  assert.ok(tried >= 5, `${tried} rows tried`);
  const { calls } = draws(world);
  const fill = calls.findIndex(([k]) => k === 'fill');
  const start = calls.findLastIndex(([k], i) => k === 'beginPath' && i < fill);
  const polygon = calls.slice(start + 1, fill).filter(([k]) => k === 'lineTo' || k === 'moveTo').map(([, x, y]) => [x, y]);
  assert.deepEqual(polygon.slice(1, -1), rows.map((r) => [r.left, r.y]), 'the left rock is filled out to those very points');
});

test("every mark that is on the screen is one arc of the burst's radius where the scroll has carried it, the rest are not drawn, and only world.course.marks is read", () => {
  const world = fresh();
  world.course.dist = 100; // the open land: no rock to draw
  const atOf = (y) => world.course.dist + SPAWN_Y - y;
  assert.equal(draws(world).calls.filter(([k]) => k === 'arc' || k === 'fill').length, 0, 'none, none drawn');
  world.marks = [{ x: 400, at: atOf(300), r: SEED_R }]; // a mark where the course does not keep them
  assert.equal(draws(world).calls.filter(([k]) => k === 'arc').length, 0);
  world.course.marks = [
    { x: 500, at: atOf(300), r: SEED_R }, { x: 900, at: atOf(700), r: SEED_R },
    { x: 700, at: atOf(-2 * SEED_R), r: SEED_R }, { x: 800, at: atOf(HEIGHT + 2 * SEED_R), r: SEED_R },
  ];
  const { calls } = draws(world);
  assert.deepEqual(calls.filter(([k]) => k === 'arc').map(([, x, y, r]) => [x, y, r]), [[500, 300, SEED_R], [900, 700, SEED_R]]);
  assert.equal(calls.filter(([k]) => k === 'fill').length, 1, 'one fill, so that overlaps do not stack');
  for (const file of ['course-view.js', 'course-objects.js']) {
    const src = readFileSync(new URL(`../../src/ui/${file}`, import.meta.url), 'utf8');
    assert.ok((src.match(/\.marks\b/g) ?? []).every((m) => src.includes(`course${m}`)), `${file} reads marks from the course only`);
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
  fileRules(assert, ['course-view.js', 'course-objects.js', 'wander-kit.js', 'view.js', 'pickup-kit.js', 'pickup-wander.js', 'pickup-skins.js']);
});
