import { EPS } from './kinds.js';
import { segDist2, segBoxDist2 } from './math.js';
import { MUZZLE } from './ship.js';
import { BEAM_W, BEAM_DPS } from './weapons.js';
import { inView, BOXES } from './course-kinds.js';
import { GROUND_R, GROUND_SCORE, hurtGround } from './course-ground.js';

// The ship's gun against the ground (world 22 only: stepPlay calls gunVsGround when the world has a course). The owner's rule
// (2026-11-22): every ground object that stands is an enemy's and can be shot, the stones asleep, the pillars and the thorns too, so the gun
// and the beam hurt each kind that is in GROUND_SCORE while it has hp and is on the screen, as the seeds and the bomb do (a
// target above the top edge, which the player cannot see, takes nothing). A lantern (a checkpoint) and the valley's walls are no
// enemy's: shots fly over them. Two things hurt a ground object, both through hurtGround:
//   a gun shot   every live ship shot that has not been spent on an air craft (collide.js, which runs first) is spent on the first
//                ground object its path touched this tick, nearest to where the path began, and deals its dmg (1 if it has none).
//                A round object is touched within GROUND_R of the path and the shot's own radius, a box (a pillar, a thorn piece) across its box. The trident's
//                bolt (world 15) is not spent: it hurts every one it crossed that it has not hurt before, once (s.pierced), as
//                collide.js pierceAliens does. Every other shot, the side guns' and the spread's included, is the same
//   the beam     while the laser power's beam is on (weapons.js stepBeam sets ship.beam this tick), every ground object in its column
//                above the muzzle collects BEAM_DPS a second in g.burn (damage.js drip does the same for aliens) and loses one hp for
//                each whole point. Nothing stops it: what stands in front does not shield what stands behind
// The ground's y is the one the last tick's scroll gave it (stepCourse places it after this), a tick of scroll, a few px, old.

const hurtable = (g) => Object.hasOwn(GROUND_SCORE, g.kind) && g.hp > 0 && inView(g);
const reachOf = (g) => (BOXES.includes(g.kind) ? { x: g.w / 2, y: g.h / 2 } : { x: GROUND_R, y: GROUND_R }); // how far it reaches from its centre

// Did the shot `s`, which flew from (px, py) to where it is this tick, touch the object `g`?
function touches(s, px, py, g) {
  if (BOXES.includes(g.kind)) return segBoxDist2(px, py, s.x, s.y, g.x, g.y, g.w, g.h) <= s.r ** 2;
  return segDist2(px, py, s.x, s.y, g.x, g.y) <= (GROUND_R + s.r) ** 2;
}

function shotsVsGround(world, dt) {
  const standing = world.course.ground.filter(hurtable);
  if (standing.length === 0) return;
  for (const s of world.shots) {
    if (s.life <= 0) continue;
    const px = s.x - s.vx * dt;
    const py = s.y - s.vy * dt;
    const far = (g) => (g.x - px) ** 2 + (g.y - py) ** 2;
    const reached = standing.filter((g) => g.hp > 0 && !s.pierced?.includes(g.id) && touches(s, px, py, g)).sort((a, b) => far(a) - far(b));
    if (!s.trident) {
      if (reached.length === 0) continue;
      s.life = 0;
      hurtGround(world, reached[0], s.dmg ?? 1);
      continue;
    }
    for (const g of reached) {
      s.pierced.push(g.id);
      hurtGround(world, g, s.dmg ?? 1);
    }
  }
}

function beamVsGround(world, dt) {
  const ship = world.ship;
  if (!ship.beam) return;
  const top = ship.y - MUZZLE;
  for (const g of world.course.ground) {
    if (!hurtable(g)) continue;
    const reach = reachOf(g);
    if (g.y - reach.y >= top || Math.abs(g.x - ship.x) > BEAM_W / 2 + reach.x) continue;
    g.burn = (g.burn ?? 0) + BEAM_DPS * dt;
    while (g.burn >= 1 - EPS && g.hp > 0) {
      g.burn -= 1;
      hurtGround(world, g, 1);
    }
  }
}

// One tick, after collide.js and before the course steps: the shots first, then the beam. `dt` is real time, the player's.
export function gunVsGround(world, dt) {
  shotsVsGround(world, dt);
  beamVsGround(world, dt);
}
