import { ALIEN_R } from './kinds.js';
import { HUD_CLEAR } from './formations.js';

// World 19's dizzy bodies (R71, the twist 'bonk'): an alien or boss minion that hurtAlien brings to 0 hp
// leaves a knocked-out rubber toy where it fell. It hops, then tumbles down; bonk.js steps it and lets the
// ship bat it. The motion is called tumble, never gravity: it moves bodies only and bends no bullet.
//   body = { id, role, x, y, vx, vy, r, fly, link, banks, bonks, daze, t }   in world.twist.bodies, knock-out order
//   id, role  the alien's; r its radius (BODY_R); t seconds since it was knocked out (the drawing's stars)
//   fly       false while dizzy (it hops and sinks), true once batted (bonk.js); link the knock-outs before
//             it in its chain; banks the wall bounces it has left; bonks the rebounds it has landed; daze the
//             seconds left before a rebounded body can be batted again (bonk.js DAZE)
// No rng is drawn, and nothing here runs outside world 19.

export const HOP = 260; // px/s: a fresh or rebounding body's upward speed
export const TUMBLE_G = 520; // px/s^2: how fast the hop turns into a fall
export const SINK = 180; // px/s: the fall's top speed
export const BODY_MAX = 60; // live bodies at once: a safety bound play does not reach, not a rule of play
export const BODY_R = ALIEN_R;

// The hop's first speed from height y: -HOP, or 0 where the hop's peak would lift the body's centre above
// HUD_CLEAR, so no body hops behind the HUD or off the top.
export const hopFrom = (y) => (y - HOP ** 2 / (2 * TUMBLE_G) < HUD_CLEAR ? 0 : -HOP);

// The alien `a`, just brought to 0 hp, leaves its body (world 19 only). At BODY_MAX live bodies it simply
// dies. A body spent this tick (gone, not yet pruned) does not count, so a bowling chain is never cut.
export function knockOut(world, a) {
  if (world.level.twist !== 'bonk') return;
  const bodies = world.twist.bodies;
  let live = 0;
  for (const b of bodies) if (!b.gone) live++;
  if (live >= BODY_MAX) return;
  bodies.push({ id: a.id, role: a.role, x: a.x, y: a.y, vx: 0, vy: hopFrom(a.y), r: BODY_R, fly: false, link: 0, banks: 0, bonks: 0, daze: 0, t: 0 });
}
