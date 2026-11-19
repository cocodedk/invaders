// The far layer of Golden Isle (islecity): the city of gold on its three-peaked mountain (the owner asked for a finer one, 2026-11-19).
// The mountain is dark rock warmed on its sunward faces; walled terraces climb it, each crowded with palace halls under tiered roofs,
// domed halls, curved temple towers and many-storeyed mansions in true gold (isle-palace.js, isle-gold.js), their arches lamplit,
// gardens between them and gate towers on the walls, each terrace higher up sinking further into the dusk; a great gold palace crowns
// each peak (isle-summit.js). Some roofs burn (out.lights), where the sky's smoke rises (ISLE.fires). At the
// mountain's left foot lies the walled grove of the captive queen (isle-grove.js). The layout comes from ISLE.seed, so every level
// shows the same city.
import { H, rgba, mix, lin } from './sprites.js';
import { makeRng } from '../core/rng.js';
import { profile } from './parallax-kit.js';
import { PAL, ISLE, MARGIN, SUN, fireAt } from './isle-kit.js';
import { BUILD, GOLDS, WINDOW } from './isle-palace.js';
import { palette, face } from './isle-gold.js';
import { grove, GROVE } from './isle-grove.js';
import { summit } from './isle-summit.js';
import { toward, paint, lit, shape } from './isle-paint.js';

// The kinds in turn, a garden's chance, the gates' spacing, the summit palaces' heights and how far below the peak each stands, how far
// each terrace (near to far) and each summit palace sinks into the dusk (atmospheric perspective; the ones behind the alien rows most, so
// the city stays under the sprites), the grove's frame x.
export const CITY = { kinds: ['hall', 'domed', 'mansion', 'tower', 'hall', 'domed', 'tower', 'mansion'], garden: 0.16, gateEvery: 300, crowns: [120, 128, 96], seat: 14, depth: [0.4, 0.44, 0.48, 0.52, 0.56], crownDepth: [0.22, 0.4, 0.36], grove: 210 };

const U = toward(WINDOW.light); // the low sun's light on the city

// The mountain's top edge at frame x: the highest of the peaks' slopes, broken into crags.
export const ridge = (x) => ISLE.sea - Math.max(0, ...ISLE.peaks.map(([px, ph]) => ph * Math.max(0, 1 - Math.abs(x - px) / ISLE.spread) ** 1.25)) + 7 * Math.sin(x * 0.07) + 4 * Math.sin(x * 0.19 + 1);

// A terrace's wall from x0 to x1 standing on y: gold, crowned with pointed merlons, its coping gilded, its foot in shadow.
function wall(g, x0, x1, y, P) {
  face(g, x0, y - 14, x1, y + 2, P.deep, P);
  g.fillStyle = lin(g, x0, 0, x1, 0, [[0, mix(P.gold, PAL.smoke, 0.4)], [1, P.gold]]);
  for (let x = x0 + 3; x < x1 - 7; x += 11) { // pointed merlons
    g.beginPath();
    g.moveTo(x, y - 14);
    g.lineTo(x, y - 19);
    g.lineTo(x + 3.5, y - 23);
    g.lineTo(x + 7, y - 19);
    g.lineTo(x + 7, y - 14);
    g.fill();
  }
  g.fillStyle = rgba(P.lit, 0.5);
  g.fillRect(x0, y - 14, x1 - x0, 1.5);
  g.fillStyle = rgba(PAL.smoke, 0.55);
  g.fillRect(x0, y - 3, x1 - x0, 5);
}

// A garden between the buildings: three round trees, lit toward the sun.
function garden(g, x, base, tall, rng) {
  for (let i = 0; i < 3; i++) {
    const tx = x + (i - 1) * tall * 0.22;
    const r = tall * (0.16 + rng() * 0.08);
    shape(g, Array.from({ length: 7 }, (_, k) => [tx + Math.cos((k / 7) * 6.28) * r, base - r * 1.4 + Math.sin((k / 7) * 6.28) * r * 1.1]));
    paint(g, lit(g, '#2e5232', tx, base - r * 1.4, r, U), 0.7);
  }
}

// A burning roof: tongues of flame over the eaves, the glow flickering (the smoke is the sky's).
function burn(g, x, y, w, rng, out) {
  for (let k = 0; k < 7; k++) {
    const fx = x + (k - 3) * w * 0.12;
    const fh = w * (0.35 + rng() * 0.45) * (1 - Math.abs(k - 3) * 0.12);
    g.fillStyle = [PAL.crimson, PAL.ember, PAL.flame][k % 3];
    g.beginPath();
    g.moveTo(fx - 6, y);
    g.quadraticCurveTo(fx - 7, y - fh * 0.6, fx + (rng() - 0.5) * 6, y - fh);
    g.quadraticCurveTo(fx + 7, y - fh * 0.6, fx + 6, y);
    g.fill();
  }
  out.lights.push({ x, y: y - w * 0.2, r: w * 0.9, color: PAL.ember, mode: 'flicker', ph: rng(), a: 0.5 });
}

function tierRow(g, t, x0, x1, rng, out, X, Y) {
  const tall = ISLE.tall[t];
  const base = ISLE.tiers[t];
  const fires = ISLE.fires.filter(([, ft]) => ft === t).map(([fx]) => fx);
  const clear = (a, b) => fires.every((fx) => b < fx - tall * 0.4 || a > fx + tall * 0.4) && (t > 0 || b < CITY.grove || a > CITY.grove + GROVE.w);
  const tone = (k) => palette(CITY.depth[t], GOLDS[k % GOLDS.length]);
  let i = Math.floor(rng() * CITY.kinds.length);
  for (let x = x0 + 12 + rng() * 20; x < x1 - 12; i++) {
    const kind = CITY.kinds[i % CITY.kinds.length];
    const w = tall * { hall: 0.8, domed: 0.66, mansion: 0.74, tower: 0.42 }[kind];
    const h = tall * (0.8 + rng() * 0.45);
    if (clear(x - w / 2, x + w / 2)) {
      if (rng() < CITY.garden) garden(g, X(x), Y(base - 10), tall, rng);
      else BUILD[kind](g, X(x), Y(base - 10), w, h, tone(i), rng);
    }
    x += w * (0.62 + rng() * 0.3);
  }
  for (const fx of fires) {
    const w = tall * 0.8;
    BUILD.hall(g, X(fx), Y(base - 10), w, tall, tone(t + 1), rng);
    const [, fy] = fireAt([fx, t]);
    burn(g, X(fx), Y(fy + tall * 0.22), w, rng, out);
  }
  wall(g, X(x0), X(x1), Y(base), tone(i));
  for (let gx = x0 + CITY.gateEvery * (0.3 + rng() * 0.4); gx < x1 - 40; gx += CITY.gateEvery) {
    if (!clear(gx - 20, gx + 20)) continue;
    BUILD.gate(g, X(gx), Y(base + 2), tall * 0.42, tall * 0.8, tone(i + 2));
    out.lights.push({ x: X(gx), y: Y(base - tall * 0.12), r: 12, color: PAL.flame, mode: 'pulse', ph: rng(), a: 0.3 });
  }
}

export function islecity(g, w, h, _rng, L, out) {
  const rng = makeRng(ISLE.seed);
  const X = (x) => x + MARGIN; // frame x and y to this layer's
  const Y = (y) => y - (H - h);
  g.save();
  g.fillStyle = L.color;
  profile(g, w, h, (x) => Y(ridge(x - MARGIN)));
  g.globalCompositeOperation = 'source-atop'; // the faces toward the sun, warmed, and the rock's crags
  g.fillStyle = lin(g, 0, 0, w, 0, [[0, rgba(PAL.crimson, 0)], [0.45, rgba(PAL.crimson, 0.12)], [0.62, rgba(PAL.ember, 0.24)], [1, rgba(PAL.ember, 0.08)]]);
  g.fillRect(0, 0, w, h);
  for (const [px, ph] of ISLE.peaks) {
    g.fillStyle = rgba(PAL.smokeLit, 0.5);
    g.beginPath();
    g.moveTo(X(px), Y(ISLE.sea - ph + 4));
    g.lineTo(X(px + ISLE.spread * 0.55), Y(ISLE.sea));
    g.lineTo(X(px + ISLE.spread * 0.12), Y(ISLE.sea));
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  for (const [i, tall] of CITY.crowns.entries()) { // a great palace on each of the three peaks
    const px = ISLE.peaks[i][0];
    const top = ridge(px);
    summit(g, X(px), Y(top + CITY.seat), tall, toward(Math.atan2(SUN.y - top, SUN.x - px)), palette(CITY.crownDepth[i]));
  }
  for (let t = ISLE.tiers.length - 1; t >= 0; t--) {
    const ty = ISLE.tiers[t];
    let x0 = null;
    for (let x = -MARGIN; x <= w - MARGIN; x += 6) {
      const on = ridge(x) < ty - ISLE.tall[t] * 0.55;
      if (on && x0 === null) x0 = x;
      if ((!on || x > w - MARGIN - 6) && x0 !== null) {
        if (x - x0 > 70) tierRow(g, t, x0, x, rng, out, X, Y);
        x0 = null;
      }
    }
  }
  grove(g, X(CITY.grove), Y(ISLE.sea - 4), rng, GOLDS[0]);
  g.restore();
}
