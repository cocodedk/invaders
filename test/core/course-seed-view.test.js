import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPAWN_Y } from '../../src/core/course-kinds.js';
import { GROUND_R } from '../../src/core/course-ground.js';
import { SEED_FALL, SEED_R, SEED_DMG } from '../../src/core/course-seed.js';
import { step, gunTicks, FIRE } from './world-kit.js';
import { launched } from './course-kit.js';

// A seed bursts for ground objects on the screen only, as the bomb hurts only those (course-seed.js, R15): a turret
// still above the top edge may lie within its reach, and the player cannot see it, so it takes nothing. The course
// stands still (speed 0), so a seed and the ground keep the screen y they are given.
const HP = 3 * SEED_DMG;
const OFFSET = (SEED_R + GROUND_R) / 3; // px above and below the burst: well inside its reach, either side of the top edge
const turret = { kind: 'turret', at: 0, x: 900, hp: HP };
const put = (world, o, y) => { o.at = SPAWN_Y + world.course.dist - y; }; // a seed or a ground object at screen y

test('a burst on the top edge hurts the turret below the edge and spares the one above it, both within reach', () => {
  const world = launched([turret, turret], { speed: 0, starts: ['seed'] });
  world.ship.invuln = Infinity;
  step(world, 1, FIRE);
  const [seed] = world.course.seeds;
  const [above, below] = world.course.ground;
  put(world, seed, 0);
  Object.assign(above, { x: seed.x });
  Object.assign(below, { x: seed.x });
  put(world, above, -OFFSET);
  put(world, below, OFFSET);
  step(world, gunTicks(SEED_FALL));
  assert.equal(world.course.seeds.length, 0, 'it burst');
  assert.equal(below.hp, HP - SEED_DMG);
  assert.equal(above.hp, HP);
});
