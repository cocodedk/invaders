import { EPS } from './kinds.js';
import { MAX_BULLETS, addBullets } from './aliens.js';
import { emitPattern } from './patterns.js';
import { makePickup, dropPickup } from './powerups.js';
import { awardPoints } from './scoring.js';
import { emit } from './util.js';
import { inView, hpFor, BOXES, THORN } from './course-kinds.js';

// Ground targets (world 22): objects on the ground that drift with the scroll (course.js sets their y), in
// course.ground as { id, kind, at, x, y, hp } and, by kind,
//   turret  + cool  s until its next shot; it counts down only while the turret is on screen (it starts full: the
//           first shot comes TURRET_COOL s after the turret appears, and one that is not seen never fires)
//   crate   + drop  the pickup it holds ('bomb' or 'life'), or null for the usual random drop (powerups.js dropPickup)
//   pillar, thorn  + w, h  (BOXES) the box's size, its (x, y) being the centre; it rams the ship while it stands (course-terrain.js). A thorn
//           piece is a bramble of the Hush's, one of a hedge across the band: a pillar's shape with little hp
//   checkpoint + grants, reached  the ability it grants ('seed' or null), and whether the ship has reached it (course-check.js)
//   gate    + holdId  the hold it belongs to, the index of its entry in the level's spawns (course-hold.js); it has hp and breaks like a turret
// A turret is an enemy, so its timer runs in the slowed enemy time of the tick (bullet time slows it), and it draws no
// rng: its shot is the heavy pattern, an aimed bullet, which does not. It says 'fire' { side: 'enemy', id, role: 'turret', x, y, pattern } as an alien does. Ground targets are low: the ship flies over them
// and nothing but a box (a pillar, a thorn piece) rams. Every kind that stands is shootable (the owner, 2026-11-22: "every kind of target and enemy structure
// and anything related to an enemy" - the stones asleep, the pillars, the turrets, the crates, the gates): the ship's shots and its
// beam hurt them (course-shots.js), as the seeds' bursts and the bomb do (course-seed.js), and all four come through hurtGround.
// A stone, a pillar and a thorn piece that come with no hp get GROUND_HP; a checkpoint (a lantern) has none and is never hurt, and neither
// are the valley's walls (the rock). A target that breaks (hp 0) stays on the list for the rest of the tick and course.js then drops it.

export const TURRET_COOL = 2.5; // s between a turret's shots
export const TURRET_PATTERN = 'heavy'; // what it fires, at the ship: a big slow bullet that takes several hits (course-cut.js)
export const GROUND_R = 36; // px: how far a round ground object reaches from its centre, for the seeds' bursts (course-seed.js) and the shots (course-shots.js)
export const GROUND_SCORE = { stone: 50, turret: 300, crate: 200, pillar: 200, gate: 500, [THORN]: 30 }; // points for breaking one, before the combo; the kinds that can be hurt
export const GROUND_HP = { stone: hpFor('stone'), pillar: hpFor('pillar'), [THORN]: hpFor(THORN) }; // hp of the kinds whose entry names none (a turret, a crate and a gate always do)

// A ground object of the course entry `e` (course.js hands it over on the tick its `at` comes up).
export function spawnGround(world, e) {
  const g = { id: world.nextId++, kind: e.kind, at: e.at, x: e.x, y: 0, hp: e.hp ?? GROUND_HP[e.kind] ?? null };
  if (e.kind === 'turret') g.cool = TURRET_COOL;
  if (e.kind === 'crate') g.drop = e.drop ?? null;
  if (BOXES.includes(e.kind)) Object.assign(g, { w: e.w, h: e.h });
  if (e.kind === 'checkpoint') Object.assign(g, { grants: e.grants ?? null, reached: false });
  if (e.kind === 'gate') g.holdId = e.holdId;
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
    emit(world, 'fire', { side: 'enemy', id: g.id, role: 'turret', x: g.x, y: g.y, pattern: TURRET_PATTERN }); // as an alien's shot says it (aliens.js fire)
  }
}

// `dmg` hp off a ground target. One that stands says 'groundHit' { kind, x, y }. At 0 it breaks: its points go on the score with
// the combo's rules (every kill within the window raises the multiplier, scoring.js), 'groundKill' { kind, x, y, score, mult } says so (the points
// it paid and the multiplier they came at, as a 'kill' does), and a crate drops what it holds. Anything that has no hp to lose (a checkpoint) or has broken already ignores the call.
export function hurtGround(world, g, dmg) {
  if (!Object.hasOwn(GROUND_SCORE, g.kind) || !(g.hp > 0)) return;
  g.hp = Math.max(0, g.hp - dmg);
  if (g.hp > 0) {
    emit(world, 'groundHit', { kind: g.kind, x: g.x, y: g.y });
    return;
  }
  const score = awardPoints(world, GROUND_SCORE[g.kind]);
  emit(world, 'groundKill', { kind: g.kind, x: g.x, y: g.y, score, mult: world.combo.mult }); // as a kill says them: the pop-up and the sound read them
  if (g.kind !== 'crate') return;
  if (g.drop) world.pickups.push(makePickup(g.drop, g.x, g.y));
  else dropPickup(world, g);
}
