// The things that stand on the ground of a course (world 22), drawn by course-view.js over the parchment and the rock and under the craft:
// standing stones (shut eye), turrets (a stone with its eye open), crates (a grey cage with the prize glimmering inside), pillars (the
// grey boxes that ram, drawn exactly as big as they are), the hold's gates (a stone ring round an eye that opens while the hold stands)
// and the lanterns (dull until reached, then brass with a gold light). Each is drawn about its own centre (course.ground, y from the
// scroll); the last lantern reached is drawn from course.check when it is not on the list, as it is after a respawn. Plain shapes, no
// gradients and no shadow blur: the shadow is a dark ellipse, the light a pair of translucent discs.
import { H, rgba } from './sprites.js';
import { TAU } from '../core/math.js';
import { RESPAWN_Y } from '../core/course-check.js';
import { GROUND_R } from '../core/course-ground.js';
import { PAL } from './wander-kit.js';

export const OFFSCREEN = 80; // px beyond the screen an object is still drawn (its half height counts too)
export const LANTERN_SCALE = 1.4; // the lantern stands this much bigger than its mockup, so that a checkpoint is seen from afar
export const LANTERN_TOL = 24; // px: a reached lantern on the list this near the check's place is that lantern
const SHADOW = 'rgba(40,40,50,0.18)';

// Where the last lantern reached stands now, from the record the course keeps of it (the checkpoint 0, the start, is no lantern).
export function lanternSpot(course) {
  if (!course.lit) return null;
  return { x: course.check.x, y: RESPAWN_Y + course.dist - course.check.dist };
}

function disc(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

// A standing stone about the origin: its shadow, its body, a lit patch. The eye is the caller's.
function stoneBody(ctx) {
  disc(ctx, 10, 16, 22, 12, SHADOW);
  disc(ctx, 0, 0, 20, 28, PAL.stone);
  ctx.lineWidth = 2;
  ctx.strokeStyle = PAL.stoneDark;
  ctx.stroke();
  disc(ctx, -6, -8, 7, 11, PAL.stoneLight);
}

function shut(ctx) {
  ctx.beginPath();
  ctx.arc(0, -3, 9, 0.3, Math.PI - 0.3);
  ctx.strokeStyle = PAL.stoneDark;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function open(ctx, t) {
  disc(ctx, 0, 0, 11, 6, '#f2efe6');
  disc(ctx, 0, 0, 4 + Math.sin(t * 6), 4 + Math.sin(t * 6), PAL.violet);
}

const stone = (ctx) => { stoneBody(ctx); shut(ctx); };
const turret = (ctx, g, t) => { stoneBody(ctx); open(ctx, t); };

function crate(ctx) {
  const h = GROUND_R * 0.65;
  ctx.fillStyle = SHADOW;
  ctx.fillRect(-h + 9, -h + 12, h * 2, h * 2);
  ctx.fillStyle = PAL.kite;
  ctx.fillRect(-h, -h, h * 2, h * 2);
  ctx.fillStyle = rgba(PAL.gold, 0.85); // the prize, seen through the bars
  ctx.fillRect(-7, -7, 14, 14);
  ctx.strokeStyle = PAL.kiteLine;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-h, -h, h * 2, h * 2);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const x of [-h / 2, 0, h / 2]) {
    ctx.moveTo(x, -h);
    ctx.lineTo(x, h);
  }
  ctx.stroke();
}

function pillar(ctx, g) {
  const { w, h } = g;
  ctx.fillStyle = SHADOW;
  ctx.fillRect(-w / 2 + 10, -h / 2 + 14, w, h);
  ctx.fillStyle = PAL.stone;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = PAL.stoneLight;
  ctx.fillRect(-w / 2, -h / 2, w / 5, h);
  ctx.strokeStyle = PAL.stoneDark;
  ctx.lineWidth = 3;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const k of [-0.25, 0.25]) { // the courses of stone
    ctx.moveTo(-w / 2, h * k);
    ctx.lineTo(w / 2, h * k);
  }
  ctx.stroke();
}

function gate(ctx, g, t, holdId) {
  disc(ctx, 10, 14, GROUND_R, GROUND_R * 0.6, SHADOW);
  ctx.beginPath();
  ctx.arc(0, 0, GROUND_R - 7, 0, TAU);
  ctx.lineWidth = 18;
  ctx.strokeStyle = PAL.stoneDark;
  ctx.stroke();
  ctx.lineWidth = 13;
  ctx.strokeStyle = PAL.stone;
  ctx.stroke();
  if (g.holdId === holdId) open(ctx, t);
  else shut(ctx);
}

function lantern(ctx, lit) { // callers have saved the context and moved to the foot of the post
  ctx.scale(LANTERN_SCALE, LANTERN_SCALE);
  if (lit) { // a gold light round the flame
    disc(ctx, 0, -42, 70, 70, rgba(PAL.gold, 0.14));
    disc(ctx, 0, -42, 40, 40, rgba(PAL.gold, 0.22));
  }
  ctx.fillStyle = PAL.post;
  ctx.fillRect(-7, -30, 14, 40);
  ctx.fillStyle = lit ? PAL.brass : PAL.kiteShade;
  ctx.fillRect(-13, -56, 26, 26);
  ctx.strokeStyle = PAL.stoneDark;
  ctx.lineWidth = 2;
  ctx.strokeRect(-7, -30, 14, 40);
  ctx.strokeRect(-13, -56, 26, 26);
  ctx.fillStyle = lit ? PAL.flame : PAL.stoneLight;
  ctx.fillRect(-7, -50, 14, 14);
}

const DRAW = { stone, turret, crate, pillar, gate, checkpoint: (ctx, g) => lantern(ctx, g.reached) };

export function drawObjects(ctx, world, t) {
  const { course } = world;
  const holdId = course.held?.holdId; // while the hold stands its gates are awake
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
  lantern(ctx, true);
  ctx.restore();
}
