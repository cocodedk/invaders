// Your line (world 22, Leg 2 on) as the view draws it: the ink in course.line (core/course-line.js), a dark graphite stroke that fades as it ages.
//   Each run's path is stroked three times, widest first: turquoise (LINE_WIDTH + TEAL_EDGES * LINE_EDGE), gold (+ GOLD_EDGES * LINE_EDGE), graphite on top, all at the run's alpha.
//   drawCourseLine(ctx, course)   each segment is stroked at alpha 1 - t / LINE_LIFE, rounded to the middle of one of LINE_ALPHA_STEPS steps. The ink is
//                                 oldest first, so the steps come in runs: one path and one stroke style for each run, never a state change for
//                                 each segment (there are LINE_SEGS of them at most). Nothing here is drawn from a
//                                 clock: the age is the segment's own.
import { rgba } from './sprites.js';
import { lineLife } from '../core/course-line.js';
import { PAL } from './wander-kit.js';
import { star } from './sprites.js';

export const LINE_ALPHA_STEPS = 6; // the fade is drawn in this many alphas, a path each at most
export const LINE_WIDTH = 5; // px
export const LINE_EDGE = 1.5; // px: the gold ribbon edge shows this much each side of the graphite, the turquoise twice that
export const GOLD_EDGES = 2; // the gold ribbon edge is this many LINE_EDGEs each side of the graphite
export const TEAL_EDGES = 4; // and the turquoise this many
export const LINE_COLOUR = '#34302c'; // graphite, darker than the pencil of the ground (PAL.pencil) so it reads over the land

export const SPARKLE_EVERY = 6; // with the lasso, a star sits on one segment in this many
export const SPARKLE_SIZE = 22; // px radius of a star at its fullest
export const SPARKLE_TWINKLE = 9; // rad a second the stars swell and shrink, each from its own age and place
export const SPARKLE_FLOOR = 0.35; // the least a star swells to, of SPARKLE_SIZE
export const SPARKLE_DIM = 0.3; // the stars' alpha while the lasso recharges (course.lassoCool > 0)
export const SPARKLE_COLOUR = '#e08a00'; // deep amber: pale stars vanish on the parchment, so they are drawn in this, over it

const stepOf = (s, life) => Math.min(LINE_ALPHA_STEPS - 1, Math.floor((Math.max(0, s.t) / life) * LINE_ALPHA_STEPS));

// The glitter: a cached star on every SPARKLE_EVERY-th segment, drawn source-over (additive light does not show on cream), its swell from the segment's own age (no clock), its alpha the ink's.
function sparkle(ctx, line, life, cool) {
  const sprite = star(SPARKLE_COLOUR);
  for (let i = 0; i < line.length; i += SPARKLE_EVERY) {
    const s = line[i];
    const swell = SPARKLE_FLOOR + (1 - SPARKLE_FLOOR) * (0.5 + 0.5 * Math.sin(s.t * SPARKLE_TWINKLE + i));
    const fade = Math.max(0, 1 - s.t / life);
    const r = SPARKLE_SIZE * swell;
    ctx.globalAlpha = fade * (cool > 0 ? SPARKLE_DIM : 1);
    ctx.drawImage(sprite, (s.x1 + s.x2) / 2 - r, (s.y1 + s.y2) / 2 - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }
}

export function drawCourseLine(ctx, course) {
  const { line } = course;
  if (line.length === 0) return;
  const life = lineLife(course);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const inks = [[PAL.teal, TEAL_EDGES], [PAL.gold, GOLD_EDGES], [LINE_COLOUR, 0]]; // the ribbon, widest first
  const stroke = (alpha) => {
    for (const [colour, edges] of inks) {
      ctx.strokeStyle = rgba(colour, alpha);
      ctx.lineWidth = LINE_WIDTH + edges * LINE_EDGE;
      ctx.stroke();
    }
  };
  let alpha = 0; // the alpha of the path being laid
  let step = -1; // the alpha step of the path being laid
  let end = null; // where it has got to, the previous segment's far end
  for (const s of line) {
    const k = stepOf(s, life);
    if (k !== step) {
      if (step >= 0) stroke(alpha);
      ctx.beginPath();
      alpha = 1 - (k + 0.5) / LINE_ALPHA_STEPS;
      step = k;
      end = null;
    }
    if (end === null || end.x2 !== s.x1 || end.y2 !== s.y1) ctx.moveTo(s.x1, s.y1); // the ink is one stroke while it is whole; a bitten line has a gap
    ctx.lineTo(s.x2, s.y2);
    end = s;
  }
  stroke(alpha);
  if (course.abilities.includes('lasso')) sparkle(ctx, line, life, course.lassoCool);
  ctx.restore();
}
