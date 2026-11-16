// The Dowager Duck's feet (World 19, Rubber Regatta; bosses/duck*.js): orange webbed feet paddling under the foam, weak points, painted as the left
// one and mirrored for the right. A web of glossy orange rubber (duck-shape.js FOOT, holding the part's box), splayed out by TILT, from the ankle
// (hidden under the foam crest the live pass lays across her waist) down to three round toes with a scalloped edge between them; a ridge of shade
// and a ridge of light run down each toe, and the web between them is a little paler. The lights are the rubber's gloss, hot enough to shine as a
// weak point. Part coordinates (the foot's centre is the origin).
//   foot(b, l, p)
import { PAL, rubber, blob, inked, path, line, rgba, shine, glint } from './duck-kit.js';
import { FOOT, TILT } from './duck-shape.js';

const turn = ([x, y]) => [x * Math.cos(TILT) - y * Math.sin(TILT), x * Math.sin(TILT) + y * Math.cos(TILT)];
const TOES = [-64, 0, 64].map((x) => [turn([x * 0.25, -30]), turn([x * 0.75, 10]), turn([x, 58])]);

export function foot(b, l) {
  b.save();
  rubber(b, FOOT, PAL.orange, { lw: 0, dark: PAL.orangeD, light: PAL.orangeL });
  b.save();
  blob(b, FOOT);
  b.clip();
  for (const [a, m, z] of TOES) { // each toe: a ridge, shade down one side of it and light down the other
    path(b, [a, m, z], true);
    line(b, rgba(PAL.orangeD, 0.6), 12);
    path(b, [a, m, z].map(([x, y]) => [x - 5, y - 1]), true);
    line(b, rgba(PAL.orangeL, 0.75), 4);
    path(b, [a, m, z], true);
    line(b, rgba('#6a1e04', 0.6), 2.4);
  }
  b.restore();
  blob(b, FOOT);
  inked(b, 4.5);
  for (const [, , [x, y]] of TOES) glint(b, x - 6, y - 4, 7, 3.5, 0.75, 0.3);
  glint(b, -26, -10, 14, 5, 0.6, 0.6);
  b.restore();
  shine(l, -22, -6, 34, 14, 0.66, 0.5);
  for (const [, [x, y]] of TOES) shine(l, x - 5, y, 7, 14, 0.36, TILT);
}
