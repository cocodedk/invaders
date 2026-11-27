// Your line (world 22, Leg 2 on) as the view draws it: the ink in course.line (core/course-line.js), a dark graphite stroke that fades as it ages.
//   Each run's path is stroked three times, widest first: turquoise (LINE_WIDTH + 4 * LINE_EDGE), gold (+ 2 * LINE_EDGE), graphite on top, all at the run's alpha.
//   drawCourseLine(ctx, course)   each segment is stroked at alpha 1 - t / LINE_LIFE, rounded to the middle of one of LINE_ALPHA_STEPS steps. The ink is
//                                 oldest first, so the steps come in runs: one path and one stroke style for each run, never a state change for
//                                 each segment (there are LINE_SEGS of them at most). Nothing here is drawn from a
//                                 clock: the age is the segment's own.
import { rgba } from './sprites.js';
import { LINE_LIFE } from '../core/course-line.js';
import { PAL } from './wander-kit.js';

export const LINE_ALPHA_STEPS = 6; // the fade is drawn in this many alphas, a path each at most
export const LINE_WIDTH = 5; // px
export const LINE_EDGE = 1.5; // px: the gold ribbon edge shows this much each side of the graphite, the turquoise twice that
export const LINE_COLOUR = '#34302c'; // graphite, darker than the pencil of the ground (PAL.pencil) so it reads over the land

const stepOf = (s) => Math.min(LINE_ALPHA_STEPS - 1, Math.floor((Math.max(0, s.t) / LINE_LIFE) * LINE_ALPHA_STEPS));

export function drawCourseLine(ctx, { line }) {
  if (line.length === 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const inks = [[PAL.teal, 4], [PAL.gold, 2], [LINE_COLOUR, 0]]; // the ribbon, widest first
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
    const k = stepOf(s);
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
  ctx.restore();
}
