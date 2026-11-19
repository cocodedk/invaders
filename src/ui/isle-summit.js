// The great palaces on the isle's three summits (parallax-isle-city.js), painted in true gold (the owner approved the sample,
// 2026-11-19): a stepped plinth of pale gold stone, an arcade of gold pillars with lamplight in its arches, three tiers of roofs whose eaves
// sweep up into flame finials, a banded spire under a ribbed crown, a pot and a needle, and a domed kiosk at each side, in the golds of
// isle-gold.js. Shadows go violet, not brown, and the brightest gold is kept to thin edges, so it stays under the sprites' gold; a palace
// behind the alien rows takes a palette sunk further into the dusk. Paint-time only; the same on every level.
import { hash, glow, addGlow, mix } from './sprites.js';
import { line, dot, crest, shape, paint, lit } from './isle-paint.js';
import { face, arch, eave, kiosk, spire, palette, GOLD } from './isle-gold.js';

// How many arches in its arcade, the chance one is lit, its lamps' glow (out of its height).
export const SUMMIT = { bays: 5, p: 0.55, glow: 0.08, flag: '#b8242c' }; // and the king's pennant on its needle, plain

// Paint it centred on x with its floor at base, s tall to its needle, lit toward u, in the palette P. Returns where its lamps glow.
export function summit(g, x, base, s, u, P = palette(0)) {
  for (let k = 2; k >= 0; k--) face(g, x - s * (0.62 + k * 0.08), base + k * s * 0.06, x + s * (0.62 + k * 0.08), base + (k + 1) * s * 0.06, P.stone, P); // the plinth
  for (const sx of [-1, 1]) kiosk(g, x + sx * s * 0.5, base, s * 0.2, u, P);
  const [hw, hh] = [s * 0.43, s * 0.27]; // the hall: its arcade under a frieze
  face(g, x - hw, base - hh, x + hw, base, P.gold, P);
  const lamps = [];
  for (let i = 0; i < SUMMIT.bays; i++) {
    const bx = x - hw + (2 * hw * (i + 0.18)) / SUMMIT.bays;
    const on = hash(i + 70) < SUMMIT.p || i === 2;
    arch(g, bx, base - 2, (2 * hw * 0.64) / SUMMIT.bays, hh * 0.62, on, P);
    if (on) lamps.push([bx + (hw / SUMMIT.bays) * 0.64, base - hh * 0.3]);
  }
  face(g, x - hw - 3, base - hh - s * 0.05, x + hw + 3, base - hh, P.deep, P);
  for (let i = 0; i < 13; i++) dot(g, x - hw + (2 * hw * (i + 0.5)) / 13, base - hh - s * 0.025, 1.3, P.lit); // its beads
  let y = base - hh - s * 0.05;
  for (let k = 0; k < 3; k++) { // three tiers of roofs, a wall of windows between
    const w = s * (1.0 - k * 0.22);
    eave(g, x, y, w, s * 0.045, u, P);
    y -= s * 0.065;
    if (k === 2) break;
    const ww = w * 0.62;
    face(g, x - ww / 2, y - s * 0.05, x + ww / 2, y, P.gold, P);
    for (let i = 0; i < 4 - k; i++) arch(g, x - ww / 2 + (ww * (i + 0.3)) / (4 - k), y - 1, s * 0.035, s * 0.04, hash(k * 9 + i + 80) < SUMMIT.p, P);
    y -= s * 0.05;
  }
  const sw = s * 0.1;
  crest(g, x - sw, y, x + sw, y, 6, s * 0.035, P.gold, u);
  spire(g, x, y, base - s * 0.86, base - s, sw, u, P);
  line(g, [[x + sw * 0.35, y], [x + sw * 0.2, base - s * 0.86]], P.lit, 1);
  const [fx, fy, fl] = [x, base - s * 0.98, s * 0.3]; // the pennant, streaming on the evening wind
  shape(g, [[fx, fy], [fx + fl * 0.5, fy - fl * 0.04], [fx + fl, fy + fl * 0.02], [fx + fl * 0.78, fy + fl * 0.1], [fx + fl * 0.96, fy + fl * 0.2], [fx + fl * 0.5, fy + fl * 0.16], [fx, fy + fl * 0.17]]);
  paint(g, lit(g, mix(SUMMIT.flag, GOLD.dusk, P.k), fx + fl / 2, fy + fl * 0.1, fl * 0.5, u), 0.8);
  for (const [lx, ly] of lamps) addGlow(g, glow(P.lamp), lx, ly, s * SUMMIT.glow, 0.25 * (1 - P.k));
  return lamps;
}
