import { TICK } from './kinds.js';
import { bolt, MUZZLE, SHOT_SPEED } from './ship.js';

// World 20's rule, the echo: the ship's carbon copy flies the ship's own path ECHO_DELAY late and fires a
// base shot on every tick the ship fired then. Its shots are ship shots (world.shots, marked `echo` for the
// drawing), so they hurt, kill and score as the ship's do. Nothing hits the copy and it collects nothing, so
// no collision code reads it. The state is plain data in world.twist, made for world 20 alone:
//   path  [{ x, y, fire }] the ship's place and trigger of each tick of play not yet flown by the copy
//   copy  { x, y } or null: where the copy stands, null for the first ECHO_DELAY of play
// While the ship is down nothing is recorded: the copy flies on until the path runs out, then waits for it.

export const ECHO_TICKS = 60; // the copy's lag in ticks, so it is one exact tick of the past
export const ECHO_DELAY = ECHO_TICKS * TICK; // s

export const echoState = () => ({ path: [], copy: null });

export function echo(world) {
  const { ship, twist } = world;
  const { path } = twist;
  if (ship.alive) path.push({ x: ship.x, y: ship.y, fire: ship.shotAt === world.tick });
  if (path.length <= (ship.alive ? ECHO_TICKS : 0)) return;
  const { x, y, fire } = path.shift();
  twist.copy = { x, y };
  if (fire) world.shots.push({ ...bolt(x, y - MUZZLE, 0, -SHOT_SPEED), echo: true });
}
