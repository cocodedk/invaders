import { EPS, MID_X } from './kinds.js';
import { LIVES, INVULN, createShip } from './ship.js';
import { restoreScore } from './scoring.js';
import { emit } from './util.js';
import { lastHoldBroken } from './course-hold.js';

// Checkpoints and death in a course (world 22). A checkpoint is a ground object (course-ground.js); the tick its y
// reaches RESPAWN_Y it is reached: the course keeps a small record of that moment, course.check, never a copy of the world:
//   dist, next   how far the scroll had come, and how many of the level's spawn entries had come up
//   score, bombs, lives   what the run held; abilities the course held (copied, so a later grant cannot change it)
//   marks        how many bursts course.marks held; x where the checkpoint stands, which is where the ship respawns
// The level's start is checkpoint 0 (startCheck). A hit that leaves a life is ordinary (hitShip); a death is the last
// life lost. After RESPAWN_DELAY s the leg rebuilds from the record: the screen is cleared (a ground object, an air craft,
// a bullet, a shot, a pickup, a seed), dist and next go back, so every entry after the checkpoint spawns again as it was
// (a hold too, whole: one standing is let go, course.held null), the score, the bombs, the abilities and the marks go back,
// the power-up, the reserve and the combo are lost, and the ship stands at the checkpoint's x on RESPAWN_Y, blinking, with
// its lives refilled to the record's, never fewer than LIVES. Nothing earned since the checkpoint survives a death, so dying
// never pays. course.lit counts the checkpoints reached and a respawn keeps it: the last one stays lit. The respawn draws no
// rng and reads no input. A death after the leg's last hold has broken is no respawn at all (stepRespawn): the leg runs out and clears.

export const RESPAWN_DELAY = 1.2; // s from the last life lost to the leg rebuilding (the wreck's beat)
export const RESPAWN_Y = 900; // screen y of the respawn line: a checkpoint is reached there, and the ship is placed there

// Checkpoint 0: the level's start.
export const startCheck = (level) => ({
  dist: 0, next: 0, score: 0, bombs: createShip().bombs, lives: LIVES, abilities: [...(level.course.starts ?? [])], marks: 0, x: MID_X,
});

// A checkpoint on the ground that has come down to the respawn line is reached, once (its `reached`): it is announced,
// grants its ability if it has one, and becomes the record. A ship that is down reaches nothing: the checkpoint will
// come again after the respawn.
export function reachCheckpoints(world) {
  const { course, ship } = world;
  if (!ship.alive) return;
  for (const g of course.ground) {
    if (g.kind !== 'checkpoint' || g.reached || g.y < RESPAWN_Y) continue;
    g.reached = true;
    course.lit += 1;
    emit(world, 'checkpoint', { index: course.lit, x: g.x, y: g.y, grants: g.grants });
    if (g.grants && !course.abilities.includes(g.grants)) {
      course.abilities.push(g.grants);
      emit(world, 'ability', { kind: g.grants });
    }
    course.check = {
      dist: course.dist, next: course.next, score: world.score, bombs: ship.bombs, lives: ship.lives,
      abilities: [...course.abilities], marks: course.marks.length, x: g.x,
    };
  }
}

// Rebuild the leg from the record.
function respawn(world) {
  const { course, ship } = world;
  const c = course.check;
  if (ship.power) emit(world, 'power', { kind: ship.power.kind, on: false }); // cut short, not run out: it says so, as tickPower does (the reserve is lost without a word, as a displaced one is)
  for (const list of [world.aliens, world.bullets, world.shots, world.pickups, course.ground, course.seeds]) list.length = 0;
  course.marks.length = c.marks;
  Object.assign(course, { dist: c.dist, next: c.next, abilities: [...c.abilities], respawn: null, held: null });
  restoreScore(world, c.score);
  Object.assign(ship, {
    alive: true, x: c.x, y: RESPAWN_Y, fromX: c.x, fromY: RESPAWN_Y, vx: 0, vy: 0, pointed: false,
    lives: Math.max(LIVES, c.lives), bombs: c.bombs, invuln: INVULN, power: null, reserve: null, broadside: 0,
  });
  emit(world, 'respawn', { x: c.x, y: RESPAWN_Y });
}

// The last life lost starts the beat (course.respawn counts it down, and course.js does not scroll while it runs);
// when it is up the leg rebuilds. The tick of the death is not part of the beat. Once the leg's last hold has broken (course-hold.js
// lastHoldBroken) there is no beat, and one that runs is cancelled: the leg clears at its length (the run-out, with the ship down or alive),
// so a death on the tick of the break, during a beat the break ends, or in the run-out rewinds nothing. The clear wins, as the last
// alien's death wins over the last life lost (world-step.js won).
export function stepRespawn(world, dt) {
  const { course } = world;
  if (course.respawn === null && world.ship.alive) return;
  if (lastHoldBroken(world)) {
    course.respawn = null;
    return;
  }
  if (course.respawn === null) {
    course.respawn = RESPAWN_DELAY;
    return;
  }
  course.respawn -= dt;
  if (course.respawn <= EPS) respawn(world);
}
