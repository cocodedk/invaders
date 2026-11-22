import { EPS } from './kinds.js';
import { MAX_BULLETS, addBullets } from './aliens.js';
import { emitPattern } from './patterns.js';
import { makePickup, dropPickup } from './powerups.js';
import { awardPoints } from './scoring.js';
import { emit } from './util.js';
import { inView } from './course-kinds.js';

// Ground targets (world 22): objects on the ground that drift with the scroll (course.js sets their y), in
// course.ground as { id, kind, at, x, y, hp } and, by kind,
//   turret  + cool  s until its next shot; it counts down only while the turret is on screen (it starts full: the
//           first shot comes TURRET_COOL s after the turret appears, and one that is not seen never fires)
//   crate   + drop  the pickup it holds ('bomb' or 'life'), or null for the usual random drop (powerups.js dropPickup)
// A turret is an enemy, so its timer runs in the slowed enemy time of the tick (bullet time slows it), and it draws no
// rng: its shot is the aimed pattern, which does not. Ground targets are low: the ship flies over them and nothing
// rams, and no ship shot or beam touches them (collide.js knows nothing of the ground). Only hurtGround hurts one, and
// it is the ground weapon's and the bomb's to call (course-seed.js). Stones, pillars and checkpoints have no hp and
// are never hurt. A target that breaks (hp 0) stays on the list for the rest of the tick and course.js then drops it.

export const TURRET_COOL = 2.5; // s between a turret's shots
export const TURRET_PATTERN = 'aimed'; // what it fires, at the ship, at the speed of the world's bullets
export const GROUND_R = 36; // px: how far a ground object reaches from its centre, for the seeds' bursts (course-seed.js)
export const GROUND_SCORE = { turret: 300, crate: 200 }; // points for breaking one, before the combo; the kinds that can be hurt

// A ground object of the course entry `e` (course.js hands it over on the tick its `at` comes up).
export function spawnGround(world, e) {
  const g = { id: world.nextId++, kind: e.kind, at: e.at, x: e.x, y: 0, hp: e.hp ?? null };
  if (e.kind === 'turret') g.cool = TURRET_COOL;
  if (e.kind === 'crate') g.drop = e.drop ?? null;
  world.course.ground.push(g);
}

// One tick of the turrets, `dt` being the enemy time of the tick: each one on screen counts down and fires when
// its time is up. While the field holds MAX_BULLETS the shot is lost (an alien does not fire then either).
export function stepGround(world, dt) {
  for (const g of world.course.ground) {
    if (g.kind !== 'turret' || g.hp <= 0 || !inView(g)) continue;
    g.cool -= dt;
    if (g.cool > EPS) continue;
    g.cool += TURRET_COOL;
    if (world.bullets.length >= MAX_BULLETS) continue;
    addBullets(world, emitPattern(TURRET_PATTERN, g, world.ship, { speed: world.scale.bulletSpeed }, world.rng));
  }
}

// `dmg` hp off a ground target. At 0 it breaks: its points go on the score with the combo's rules (every kill
// within the window raises the multiplier, scoring.js), 'groundKill' says so, and a crate drops what it holds. Anything
// that has no hp to lose (a stone, a pillar, a checkpoint) or has broken already ignores the call.
export function hurtGround(world, g, dmg) {
  if (!Object.hasOwn(GROUND_SCORE, g.kind) || !(g.hp > 0)) return;
  g.hp = Math.max(0, g.hp - dmg);
  if (g.hp > 0) return;
  awardPoints(world, GROUND_SCORE[g.kind]);
  emit(world, 'groundKill', { kind: g.kind, x: g.x, y: g.y });
  if (g.kind !== 'crate') return;
  if (g.drop) world.pickups.push(makePickup(g.drop, g.x, g.y));
  else dropPickup(world, g);
}
