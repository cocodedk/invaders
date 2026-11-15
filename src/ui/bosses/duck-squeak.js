// The Dowager Duck's squeaker (World 19, Rubber Regatta; bosses/duck*.js): the round squeaker set in her underneath, a weak point, peeping out
// below the foam crest across her waist. A fat lip of orange-red rubber (duck-shape.js SQUEAK, holding the part's box) round a cream plastic
// disc, seen a little from below: a ring of slots round a dark middle hole with the reed in it, catch-lights on the lip. She rings it at the ship
// (the ring of drops). The lights are the gloss on the lip and the disc. Part coordinates (the squeaker's centre is the origin).
//   squeak(b, l, p)
import { PAL, mix, rubber, rubberFill, ellipse, rgba, line, path, inked, shine, glint } from './duck-kit.js';
import { SQUEAK, supPts } from './duck-shape.js';

const LIP = supPts(SQUEAK);
const DISC = { rx: SQUEAK.a * 0.68, ry: SQUEAK.b * 0.62 };

export function squeak(b, l) {
  const red = mix(PAL.orange, PAL.coral, 0.55);
  b.save();
  rubber(b, LIP, red, { lw: 4.5, dark: PAL.coralD });
  ellipse(b, 0, 2, DISC.rx + 5, DISC.ry + 4); // the lip's inner shade
  b.fillStyle = rgba('#5a1010', 0.45);
  b.fill();
  ellipse(b, 0, 0, DISC.rx, DISC.ry);
  b.fillStyle = rubberFill(b, 0, 0, DISC.rx, DISC.ry, PAL.cream, { dark: PAL.creamD, light: '#ffffff' });
  b.fill();
  inked(b, 3);
  for (let i = 0; i < 10; i++) { // the slots, foreshortened round the disc
    const a = (i / 10) * Math.PI * 2 + 0.31;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    path(b, [[c * DISC.rx * 0.45, s * DISC.ry * 0.45], [c * DISC.rx * 0.78, s * DISC.ry * 0.78]], true);
    line(b, '#3a1418', 5);
  }
  ellipse(b, 0, 0, 13, 8);
  b.fillStyle = '#1a0a0c';
  b.fill();
  inked(b, 2);
  path(b, [[-7, 1], [7, -1]], true); // the reed across it
  line(b, rgba(PAL.creamD, 0.9), 2);
  glint(b, -40, -26, 18, 5, 0.75, -0.2);
  glint(b, 50, 22, 8, 3, 0.5, -0.4);
  b.restore();
  shine(l, -38, -24, 34, 10, 0.7, -0.2);
  shine(l, -18, -10, 20, 8, 0.4, -0.2);
  shine(l, 44, 26, 14, 5, 0.3);
}
