import { HUD_BOTTOM, TICK } from './kinds.js';
import { SHOT_SPEED } from './ship.js';
import { emit } from './util.js';

// World 21's rule, the returning arrow (R73): every ship shot that reaches the top of the field (HUD_BOTTOM)
// turns back once and flies in a straight line at QUIVER_SPEED toward where the ship stood on that tick, its
// quiver point. On the way back it is still a ship shot in world.shots (marked `turned`), so it hurts, kills
// and scores as it did on the way up; no collision code tests ship shots against the ship or the pickups, so it
// never hurts the ship and collects nothing. Its life is set to the time the trip
// takes and one tick more, so its last stretch, up to and past the quiver point, is still tested against what it
// hits, and it ends on the tick after it reaches that point (or when it leaves the field, cull in world-step.js).
// A turned homing or rapid shot returns at QUIVER_SPEED too; a homing one stops seeking, so the line is straight.
// The laser beam and the bomb are not shots and are left alone. Each turn emits `arrowTurn` at the turn point, for its
// flash (fx/react-isle.js) and its chime (ui/sfx-isle.js).
// The state is the flag on the shot alone: no rng is drawn, and state-hash.js hashes it. The rule runs after the
// ship has moved (applyTwist).

export const QUIVER_SPEED = SHOT_SPEED; // px/s: the arrow comes back as fast as the base shot went up

export function quiver(world) {
  const { ship } = world;
  for (const s of world.shots) {
    if (s.turned || s.life <= 0 || s.y > HUD_BOTTOM) continue;
    const dx = ship.x - s.x;
    const dy = ship.y - s.y;
    const dist = Math.hypot(dx, dy) || 1; // the ship never stands on the line, but a zero must not divide
    s.turned = true;
    delete s.seek;
    s.vx = (dx / dist) * QUIVER_SPEED;
    s.vy = (dy / dist) * QUIVER_SPEED;
    s.life = dist / QUIVER_SPEED + TICK;
    emit(world, 'arrowTurn', { x: s.x, y: s.y });
  }
}
