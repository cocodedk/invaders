// What the Night Editor's painters share (World 20, Midnight Press; bosses/editor*.js): its definition, read from the core's data so the
// art follows the hit boxes (bossDef('editor') finds nothing until the boss is listed in BOSS_DEFS, so it is taken from bosses-data-7.js),
// its colours and the helpers it is drawn with. Coordinates are boss-local: the origin is its centre, x right, y down.
//   PART { [id]: { x, y, w, h } } its parts' rects (centre and size)
//   PAL    the look's three boss colours (looks/w20.js palette.boss: ink-violet hull, eyeshade green, vermilion weak points) and its own
//   glow(l, x, y, r, c, a)   an additive bloom on the lights layer
//   skin(g, x0, y0, x1, y1)  the octopus's wet ink-violet skin, lit from the upper left
//   suckers(b, l, pts, r)    a row of pale suckers along an arm
// Bake-time only; nothing here runs per frame.
import look from '../looks/w20.js';
import { BOSSES7 } from '../../core/bosses-data-7.js';
import { PAL as PRESS } from '../press-kit.js';
import { path, ink, lin, rad, line, rgba, shade, ellipse, TAU } from './kit.js';
import { circle } from '../aliens/kit.js';
import { mix } from '../sprites.js';

export { path, ink, lin, rad, line, rgba, shade, ellipse, circle, mix, TAU };

const DEF = BOSSES7.find((d) => d.kind === 'editor');
export const PART = Object.fromEntries(DEF.parts.map((p) => [p.id, { x: p.dx, y: p.dy, w: p.w, h: p.h }]));

const { hull, plate, weak } = look.palette.boss;
export const PAL = {
  skin: hull, skinL: shade(hull, 0.35), skinD: mix(hull, PRESS.ink, 0.6),
  green: plate, greenL: shade(plate, 0.5), greenD: mix(plate, PRESS.ink, 0.5),
  red: weak, redL: shade(weak, 0.45), redD: mix(weak, PRESS.ink, 0.45),
  paper: PRESS.paper, paperD: PRESS.paperShade, ink: PRESS.ink, wood: '#e8c48a', lamp: PRESS.lamp,
};

export function glow(l, x, y, r, c, a) {
  l.save();
  l.globalCompositeOperation = 'lighter';
  l.fillStyle = rad(l, x, y, 0, r, [[0, rgba(c, a)], [0.3, rgba(c, a * 0.45)], [1, rgba(c, 0)]]);
  l.fillRect(x - r, y - r, r * 2, r * 2);
  l.restore();
}

export const skin = (g, x0, y0, x1, y1) => lin(g, x0, y0, x1, y1, [[0, PAL.skinL], [0.45, PAL.skin], [1, PAL.skinD]]);

export function suckers(b, l, pts, r) {
  pts.forEach(([x, y], i) => {
    const k = r * (1 - i * 0.06);
    ellipse(b, x, y, k, k * 0.8);
    ink(b, rad(b, x, y, 0, k, [[0, PAL.paperD], [0.55, PAL.paper], [1, mix(PAL.paper, PAL.skin, 0.5)]]), 1.4);
    ellipse(b, x, y, k * 0.45, k * 0.35);
    b.fillStyle = rgba(PAL.skinD, 0.7);
    b.fill();
    circle(l, x - k * 0.4, y - k * 0.4, k * 0.2);
    l.fillStyle = rgba('#ffffff', 0.6);
    l.fill();
  });
}
