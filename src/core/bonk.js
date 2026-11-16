import { ALIEN_R, WIDTH, HEIGHT, EDGE, EPS } from './kinds.js';
import { SHIP_R, fromOf, pathDist2 } from './ship.js';
import { hurtAlien, firstAlien } from './aliens.js';
import { liveParts, hurtPart, firstPart } from './boss-hit.js';
import { emit, prune } from './util.js';
import { HOP, TUMBLE_G, SINK, BODY_R, hopFrom } from './tumble.js';

// World 19's rule (R71, the twist 'bonk'), run by applyTwist after collide, so the ship's path is final.
// Each dizzy body (tumble.js) hops and sinks; one the ship's path touches is batted (whack) and flies.
// A flying body is spent on the first live alien it crosses: a knock-out hands its flight on to the new
// body (the bowling chain), a survivor or a boss part sends it back where it was, dizzy again. Bodies
// never hurt the ship, block nothing and hold no wave open. No rng is drawn.
// Events: whack { id, role, x, y, dx, dy }; bonk { id, role, x, y, link, ko } (on a part role 'boss',
// part, and x, y the body's); bank { x, y }; strike { x, y, links }; plop { x, role }; fizzle { id, role, x, y }.
// A bonk on a part also sets the boss's `bonked` to the tick it landed on: the cue for her squash (ui/bosses/duck-bonk.js),
// so a bonk that finishes a part shows and a bomb does not. Nothing reads it in play, and it is not in the state hash.

export const WHACK_R = ALIEN_R + SHIP_R + 8; // the ship's reach
export const LAUNCH = 1000; // px/s: a batted body's speed
export const BONK = 2; // damage to an alien
export const BONK_BOSS = 21; // damage to a boss part, before its rule (at 15 a bot that bats cleared her less often)
export const BANKS = 1; // wall bounces a launch gets
export const BONK_MAX = 3; // bonks a body lands: the last one spends it instead of a rebound (BONK_MAX - 1 rebounds)
export const STRIKE_AT = 4; // knock-outs in one chain that make a strike
// s a rebounded body cannot be batted: as long as its hop rises, and as long again under the HUD, where it does
// not hop (hopFrom), so a ship parked where a body rebounds lands one bonk a bat there too
export const DAZE = HOP / TUMBLE_G;

// Launched from where the ship's move began through the body's centre, or straight up when they coincide.
// A rebounded body cannot be batted for DAZE, so a parked ship lands one bonk a bat.
function whack(world, b) {
  const s = world.ship;
  if (!s.alive || b.daze > EPS || pathDist2(s, b) > WHACK_R ** 2) return;
  const f = fromOf(s);
  let dx = b.x - f.x;
  let dy = b.y - f.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) { dx = 0; dy = -1; } else { dx /= d; dy /= d; }
  Object.assign(b, { vx: dx * LAUNCH, vy: dy * LAUNCH, fly: true, link: 0, banks: BANKS });
  emit(world, 'whack', { id: b.id, role: b.role, x: b.x, y: b.y, dx, dy });
}

// Back to `from` (where the move began: never past a wall), dizzy again and dazed; at BONK_MAX it is spent.
function rebound(world, b, from) {
  b.bonks += 1;
  if (b.bonks >= BONK_MAX) {
    b.gone = true;
    emit(world, 'fizzle', { id: b.id, role: b.role, x: b.x, y: b.y });
    return;
  }
  Object.assign(b, { x: from.x, y: from.y, fly: false, vx: 0, vy: hopFrom(from.y), link: 0, daze: DAZE });
}

// One bank, when this move crosses a wall from inside: a body knocked out beyond a wall flies on.
function bank(world, b, from) {
  const lo = EDGE + ALIEN_R;
  const hi = WIDTH - EDGE - ALIEN_R;
  if (b.banks <= 0 || !((b.x < lo && from.x >= lo) || (b.x > hi && from.x <= hi))) return;
  b.x = b.x < lo ? 2 * lo - b.x : 2 * hi - b.x;
  b.vx = -b.vx;
  b.banks -= 1;
  emit(world, 'bank', { x: b.x, y: b.y });
}

function fly(world, b, dt, parts) {
  const from = { x: b.x, y: b.y };
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  bank(world, b, from);
  const a = firstAlien(world, b, dt);
  if (a) {
    const bodies = world.twist.bodies;
    const ko = a.hp <= BONK;
    emit(world, 'bonk', { id: a.id, role: a.role, x: a.x, y: a.y, link: b.link, ko });
    if (!ko) {
      hurtAlien(world, a, BONK);
      rebound(world, b, from);
      return;
    }
    b.gone = true; // spent before the knock-out, so the cap never cuts the chain
    const n = bodies.length;
    hurtAlien(world, a, BONK);
    const nb = bodies[n];
    if (!nb) return;
    Object.assign(nb, { vx: b.vx, vy: b.vy, fly: true, link: b.link + 1, banks: b.banks });
    if (nb.link === STRIKE_AT) emit(world, 'strike', { x: a.x, y: a.y, links: nb.link });
    return;
  }
  const p = firstPart(parts, b, dt);
  if (!p) return;
  emit(world, 'bonk', { id: p.id, role: 'boss', part: p.id, x: b.x, y: b.y, link: b.link, ko: false });
  world.boss.bonked = world.tick;
  hurtPart(world, p, BONK_BOSS, b);
  rebound(world, b, from);
}

// A dizzy body sinks, then may be batted once its daze is over.
function tumble(world, b, dt) {
  b.daze = Math.max(0, b.daze - dt);
  b.vy = Math.min(SINK, b.vy + TUMBLE_G * dt);
  b.y += b.vy * dt;
  whack(world, b);
}

// A body made this tick (n is taken first) steps from the next; a spent one is skipped; then they are pruned.
export function bonk(world, dt) {
  const bodies = world.twist.bodies;
  const n = bodies.length;
  const parts = liveParts(world);
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    if (b.gone) continue;
    b.t += dt;
    if (b.fly) fly(world, b, dt, parts);
    else tumble(world, b, dt);
    if (b.gone) continue;
    if (b.y > HEIGHT + BODY_R) {
      b.gone = true;
      emit(world, 'plop', { x: b.x, role: b.role });
    } else if (b.x < -BODY_R || b.x > WIDTH + BODY_R || b.y < -BODY_R) b.gone = true;
  }
  prune(bodies, (b) => !b.gone);
}
