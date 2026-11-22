// The things that stand on the ground of a course (world 22), drawn by course-view.js over the parchment and the rock and under the craft:
// standing stones (shut eye), turrets (a stone with its eye open), crates (a grey cage with the prize glimmering inside), pillars (the
// slatted boxes that ram, drawn exactly as big as they are), the hold's gates (a stone ring round an eye that opens while the hold stands)
// and the lanterns (dull until reached, then brass with a gold glow). Each is a baked sprite (course-sprites.js) blitted about its own centre
// (course.ground, y from the scroll); the awake eyes' pupils breathe and the lit lanterns' glow swells, live, each a cached sprite scaled. The
// last lantern reached is drawn from course.check when it is not on the list, as it is after a respawn. No path, no gradient and no shadow
// blur a frame.
import { H, glow, addGlow } from './sprites.js';
import { RESPAWN_Y } from '../core/course-check.js';
import { PAL } from './wander-kit.js';
import {
  OBJECT_SCALE, PILLAR_PAD, LANTERN, LANTERN_SCALE, PUPIL,
  stoneSprite, turretSprite, gateSprite, crateSprite, pillarSprite, lanternSprite, pupilSprite,
} from './course-sprites.js';

export const OFFSCREEN = 80; // px beyond the screen an object is still drawn (its half height counts too)
export const LANTERN_TOL = 24; // px: a reached lantern on the list this near the check's place is that lantern
export const PUPIL_RATE = 6; // rad/s: how fast an awake eye's pupil breathes (the mockup's)
export const GLOW = { r: 120, swell: 6, rate: 7, alpha: 0.5, y: -40 }; // a lit lantern's glow in the mockup's px: radius, swell, rad/s, strength, height over the foot

// Where the last lantern reached stands now, from the record the course keeps of it (the checkpoint 0, the start, is no lantern).
export function lanternSpot(course) {
  if (!course.lit) return null;
  return { x: course.check.x, y: RESPAWN_Y + course.dist - course.check.dist };
}

const blit = (ctx, sprite) => ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);

function pupil(ctx, t) { // the awake eye's violet pupil, breathing
  const d = (PUPIL.mid + Math.sin(t * PUPIL_RATE) * PUPIL.swell) * OBJECT_SCALE * 2;
  ctx.drawImage(pupilSprite(), -d / 2, -d / 2, d, d);
}

function lantern(ctx, lit, t) { // callers have saved the context and moved to the foot of the post
  ctx.drawImage(lanternSprite(lit), -LANTERN.ox, -LANTERN.oy);
  if (!lit) return;
  const r = (GLOW.r + Math.sin(t * GLOW.rate) * GLOW.swell) * LANTERN_SCALE;
  addGlow(ctx, glow(PAL.lamp), 0, GLOW.y * LANTERN_SCALE, r, GLOW.alpha);
}

const DRAW = {
  stone: (ctx) => blit(ctx, stoneSprite()),
  turret: (ctx, g, t) => { blit(ctx, turretSprite()); pupil(ctx, t); },
  crate: (ctx) => blit(ctx, crateSprite()),
  pillar: (ctx, { w, h }) => ctx.drawImage(pillarSprite(w, h), -PILLAR_PAD - w / 2, -PILLAR_PAD - h / 2),
  gate: (ctx, g, t, holdId) => { // awake while the hold stands
    const awake = g.holdId === holdId;
    blit(ctx, gateSprite(awake));
    if (awake) pupil(ctx, t);
  },
  checkpoint: (ctx, g, t) => lantern(ctx, g.reached, t),
};

export function drawObjects(ctx, world, t) {
  const { course } = world;
  const holdId = course.held?.holdId;
  for (const g of course.ground) {
    const draw = DRAW[g.kind];
    if (!draw || g.y < -OFFSCREEN - (g.h ?? 0) / 2 || g.y > H + OFFSCREEN + (g.h ?? 0) / 2) continue;
    ctx.save();
    ctx.translate(g.x, g.y);
    draw(ctx, g, t, holdId);
    ctx.restore();
  }
  const spot = lanternSpot(course);
  if (!spot || spot.y < -OFFSCREEN || spot.y > H + OFFSCREEN) return;
  const listed = course.ground.some((g) => g.kind === 'checkpoint' && g.reached && Math.abs(g.x - spot.x) < LANTERN_TOL && Math.abs(g.y - spot.y) < LANTERN_TOL);
  if (listed) return;
  ctx.save();
  ctx.translate(spot.x, spot.y);
  lantern(ctx, true, t);
  ctx.restore();
}
