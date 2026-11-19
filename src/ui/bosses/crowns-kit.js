// What the Ten-Crowned King's painters share (World 21, Golden Isle; bosses/crowns*.js): its definition, read from the core's data so
// the art follows the hit boxes (bossDef('crowns') finds nothing until the boss is listed in BOSS_DEFS, so it is taken from
// bosses-data-8.js), its colours and the helpers it is drawn with. Coordinates are boss-local: the origin is its centre, x right, y down.
//   PART { [id]: { x, y, w, h } } its parts' rects (centre and size)
//   HEADS  the ids of its ten heads, the great one second
//   PAL    the look's boss colours (looks/w21.js palette.boss: a deep maroon skin, the masks' green, crimson weak points), gold and
//          the host's colours (aliens/w21-kit.js)
//   glow(l, x, y, r, c, a)   an additive bloom on the lights layer
//   skin(g, x0, y0, x1, y1)  the king's dark skin, lit from the upper left
//   neckOf(id)               [x, y, w] where a head's neck meets its chin, and its width; neckBase(id) the y it ends in the mantle
// Bake-time only; nothing here runs per frame.
import look from '../looks/w21.js';
import { BOSSES8 } from '../../core/bosses-data-8.js';
import { PAL as ISLE } from '../isle-kit.js';
import { bloom } from '../aliens/kit.js';
import { path, ink, lin, rad, line, rgba, shade, mix, ellipse, circle, both, TAU, GOLD, GOLD_D, GOLD_P, VERMILION, GREEN, BLACK, IVORY,
  gilt, lacquer, glint, petals, trim, mask, crown } from '../aliens/w21-kit.js';

export { path, ink, lin, rad, line, rgba, shade, mix, ellipse, circle, both, TAU, GOLD, GOLD_D, GOLD_P, VERMILION, GREEN, BLACK, IVORY,
  gilt, lacquer, glint, petals, trim, mask, crown };

export const DEF = BOSSES8.find((d) => d.kind === 'crowns');
export const PART = Object.fromEntries(DEF.parts.map((p) => [p.id, { x: p.dx, y: p.dy, w: p.w, h: p.h }]));
export const HEADS = DEF.parts.filter((p) => p.id.startsWith('head')).map((p) => p.id);

const { hull, plate, weak } = look.palette.boss;
export const PAL = {
  skin: shade(hull, 0.12), skinL: shade(hull, 0.38), skinD: mix(hull, BLACK, 0.55),
  green: plate, red: weak, redL: shade(weak, 0.45), ember: ISLE.ember, flame: ISLE.flame,
};


export { bloom as glow }; // an additive bloom on the lights layer

export const skin = (g, x0, y0, x1, y1) => lin(g, x0, y0, x1, y1, [[0, PAL.skinL], [0.45, PAL.skin], [1, PAL.skinD]]);

export const NECK = 0.35; // a neck's width, out of its head's box width

// Where a head's neck meets its chin (a quarter of its box below its centre) and how thick the neck is.
export function neckOf(id) {
  const p = PART[id];
  return [p.x, p.y + p.h * 0.25, p.w * NECK];
}

// The y where a head's neck ends down in the mantle (the head above the great one's runs down behind it).
export const neckBase = (id) => neckOf(id)[1] + (id === 'headT' ? 80 : 34);
